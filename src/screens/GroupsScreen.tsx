import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Share,
  Linking,
  Image,
  TouchableOpacity as RNTouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Clipboard from '@react-native-clipboard/clipboard';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants';
import { API_BASE_URL } from '../services/apiService';
import { getOrDownloadMedia, cleanupOldMedia } from '../services/mediaCacheService';
import emergencyContactService, { EmergencyContact } from '../services/emergencyContactService';
import ContactSelectionScreen from './ContactSelectionScreen';
import { apiService } from '../services/apiService';
import SlideView from '../components/SlideView';
import { connectSocket } from '../services/socketService';
import locationService from '../services/locationService';
import { requestPermissionWithRationale, PermissionStatus } from '../services/permissionService';
import { getGeoapifyMapUrl } from '../services/geoapifyMapService';
import { useCustomAlert } from '../components/CustomAlert';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const LOCATION_PREVIEW_WIDTH = 260;
const LOCATION_PREVIEW_HEIGHT = 160;
const CHAT_BOTTOM_THRESHOLD = 120;

// Component to render text with clickable links
const LinkableText: React.FC<{
  text: string;
  style: any;
  isOwnMessage: boolean;
}> = ({ text, style, isOwnMessage }) => {
  // Improved URL regex pattern that handles more cases
  // Matches http(s) URLs and common patterns
  const urlPattern = /(https?:\/\/[^\s]+)/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  // Find all URLs in the text
  const regex = new RegExp(urlPattern);
  while ((match = regex.exec(text)) !== null) {
    let url = match[0];

    // Remove trailing punctuation that's not part of the URL
    // Common punctuation at end of sentences: . , ! ? ) ] }
    const trailingPunctuationPattern = /[.,!?)\]}>]+$/;
    const trailingMatch = url.match(trailingPunctuationPattern);
    let trailingPunctuation = '';

    if (trailingMatch) {
      // Check if the punctuation is actually part of the URL
      // Keep ) if there's a matching ( in the URL
      const openParens = (url.match(/\(/g) || []).length;
      const closeParens = (url.match(/\)/g) || []).length;

      if (closeParens > openParens) {
        // Remove extra closing parens
        const extraParens = closeParens - openParens;
        let tempUrl = url;
        for (let i = 0; i < extraParens; i++) {
          const lastParenIndex = tempUrl.lastIndexOf(')');
          if (lastParenIndex !== -1) {
            trailingPunctuation = tempUrl.substring(lastParenIndex) + trailingPunctuation;
            tempUrl = tempUrl.substring(0, lastParenIndex);
          }
        }
        url = tempUrl;
      }

      // Remove other trailing punctuation
      const otherPunctuation = url.match(/[.,!?>\]]+$/);
      if (otherPunctuation) {
        trailingPunctuation = otherPunctuation[0] + trailingPunctuation;
        url = url.substring(0, url.length - otherPunctuation[0].length);
      }
    }

    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the URL
    parts.push({
      type: 'link',
      content: url,
    });

    // Add trailing punctuation as text
    if (trailingPunctuation) {
      parts.push({
        type: 'text',
        content: trailingPunctuation,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // If no links found, return plain text
  if (parts.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <Text
              key={index}
              style={{
                color: isOwnMessage ? '#BFDBFE' : Colors.primary,
                textDecorationLine: 'underline',
              }}
              onPress={() => {
                Linking.openURL(part.content).catch((err) => {
                  console.error('Failed to open URL:', err);
                });
              }}
            >
              {part.content}
            </Text>
          );
        }
        return <Text key={index}>{part.content}</Text>;
      })}
    </Text>
  );
};

const buildOpenStreetMapEmbedUrl = (latitude: number, longitude: number) => {
  const latitudeOffset = 0.0035;
  const longitudeOffset = 0.0045;
  const bbox = [
    longitude - longitudeOffset,
    latitude - latitudeOffset,
    longitude + longitudeOffset,
    latitude + latitudeOffset,
  ].join(',');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
};

const LocationMessagePreview: React.FC<{
  latitude: number;
  longitude: number;
  isLive?: boolean;
  senderInitials?: string;
  profileImage?: string | null;
}> = ({ latitude, longitude, isLive, senderInitials, profileImage }) => {
  const [staticPreviewFailed, setStaticPreviewFailed] = useState(false);
  const [embedPreviewFailed, setEmbedPreviewFailed] = useState(false);

  const staticMapUrl = useMemo(
    () =>
      getGeoapifyMapUrl(
        latitude,
        longitude,
        LOCATION_PREVIEW_WIDTH,
        LOCATION_PREVIEW_HEIGHT,
        15,
      ),
    [latitude, longitude],
  );

  const embedUrl = useMemo(
    () => buildOpenStreetMapEmbedUrl(latitude, longitude),
    [latitude, longitude],
  );

  return (
    <View style={styles.locationCard}>
      {!staticPreviewFailed ? (
        <View style={styles.locationMapContainer}>
          <Image
            source={{ uri: staticMapUrl }}
            style={styles.locationMap}
            resizeMode="cover"
            onError={() => setStaticPreviewFailed(true)}
          />
          <View style={styles.locationPinOverlay}>
            <View style={styles.minimalPinContainer}>
              <View style={styles.minimalPinAvatar}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.minimalPinImage} />
                ) : (
                  <Text style={styles.minimalPinText}>{senderInitials || '?'}</Text>
                )}
              </View>
              <View style={styles.minimalPinPointer} />
            </View>
          </View>
        </View>
      ) : !embedPreviewFailed ? (
        <View style={styles.locationMapContainer} pointerEvents="none">
          <WebView
            originWhitelist={['*']}
            source={{ uri: embedUrl }}
            style={styles.locationMapWebView}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            onError={() => setEmbedPreviewFailed(true)}
          />
        </View>
      ) : (
        <View style={[styles.locationMapContainer, styles.locationFallback]}>
          <Icon name="map-marker-alert-outline" size={26} color={Colors.primary} />
          <Text style={styles.locationFallbackTitle}>
            {isLive ? 'Live location' : 'Location shared'}
          </Text>
          <Text style={styles.locationFallbackCoords}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>
      )}

      <View style={styles.locationFooter}>
        <View style={styles.locationFooterBadge}>
          <Icon
            name={isLive ? 'crosshairs-gps' : 'map-marker'}
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.locationFooterBadgeText}>
            {isLive ? 'Live location' : 'Location'}
          </Text>
        </View>
        <Text style={styles.locationFooterHint}>Tap to open</Text>
      </View>
    </View>
  );
};

// Create Group Modal Component
const CreateGroupModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  setSuccessModal: (modal: any) => void;
  shareJoinCode: (code: string, name: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  showAlert: (title: string, message: string, buttons?: any[], icon?: string, iconColor?: string) => void;
}> = ({ visible, onClose, onSuccess: _onSuccess, setSuccessModal, shareJoinCode: _shareJoinCode, showAlert }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal is closed
  useEffect(() => {
    if (!visible) {
      setGroupName('');
      setDescription('');
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showAlert('Error', 'Please enter a group name', undefined, 'alert-circle', '#EF4444');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating group with:', { name: groupName, description });
      const response = await apiService.post('/api/groups', {
        name: groupName.trim(),
        description: description.trim() || '',
      });
      console.log('Group creation response:', response);

      if (response && response.success) {
        const joinCode = response.data?.joinCode;
        const createdGroupName = response.data?.name || groupName;

        // Clear form fields
        setGroupName('');
        setDescription('');

        // Close the create group modal
        onClose();

        // Show custom success modal
        setSuccessModal({
          visible: true,
          title: '🎉 Group Created!',
          message: `Your group "${createdGroupName}" has been created successfully!`,
          joinCode: joinCode,
          groupName: createdGroupName,
        });
      } else {
        showAlert('Error', response?.message || 'Failed to create group', undefined, 'alert-circle', '#EF4444');
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create group';
      showAlert('Error', errorMessage, undefined, 'alert-circle', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.groupModalContent}>
          <View style={styles.groupModalHeader}>
            <Text style={styles.groupModalTitle}>Create New Group</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.groupModalLabel}>Group Name *</Text>
          <TextInput
            style={styles.groupModalInput}
            placeholder="Enter group name"
            placeholderTextColor={Colors.textLight}
            value={groupName}
            onChangeText={setGroupName}
            editable={!loading}
          />

          <Text style={styles.groupModalLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.groupModalInput, styles.groupModalTextArea]}
            placeholder="Enter group description"
            placeholderTextColor={Colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!loading}
          />

          <View style={styles.groupModalButtons}>
            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.groupModalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonPrimary]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.groupModalButtonTextPrimary}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Join Group Modal Component
const JoinGroupModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  showAlert: (title: string, message: string, buttons?: any[], icon?: string, iconColor?: string) => void;
}> = ({ visible, onClose, onSuccess, showAlert }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      showAlert('Error', 'Please enter a join code', undefined, 'alert-circle', '#EF4444');
      return;
    }

    try {
      setLoading(true);
      console.log('Joining group with code:', joinCode.toUpperCase());
      const response = await apiService.post('/api/groups/join', {
        joinCode: joinCode.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
      });
      console.log('Join group response:', response);

      if (response && response.success) {
        setJoinCode('');
        onSuccess();
      } else {
        showAlert('Error', response?.message || 'Invalid join code', undefined, 'alert-circle', '#EF4444');
      }
    } catch (error: any) {
      console.error('Error joining group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to join group';
      showAlert('Unable to Join', errorMessage, undefined, 'alert-circle', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.groupModalContent}>
          <View style={styles.groupModalHeader}>
            <Text style={styles.groupModalTitle}>Join Group</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.groupModalLabel}>Enter Join Code</Text>
          <TextInput
            style={styles.groupModalInput}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={Colors.textLight}
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            autoCapitalize="characters"
            editable={!loading}
          />

          <Text style={styles.groupModalHint}>
            Ask the group admin for the join code
          </Text>

          <View style={styles.groupModalButtons}>
            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.groupModalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonPrimary]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.groupModalButtonTextPrimary}>Join Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Image Message Component with lazy loading - only downloads when user clicks
const ImageMessageBubble: React.FC<{
  message: any;
  groupId: string;
  onOpenViewer: (uri: string) => void;
  onLongPress: () => void;
}> = ({ message, groupId, onOpenViewer, onLongPress }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Check if image is already available (base64 in message or cached)
  useEffect(() => {
    const checkAvailability = async () => {
      // If mediaData exists (base64), image is already available
      if (message.mediaData && message.mediaData.startsWith('data:image/')) {
        setImageUri(message.mediaData);
        setIsDownloaded(true);
        return;
      }

      // Check if we have it cached locally
      const cacheKey = `image_${message._id}`;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && cached.startsWith('data:image/')) {
          setImageUri(cached);
          setIsDownloaded(true);
          return;
        }
      } catch (e) {
        console.warn('Failed to check cache:', e);
      }

      // If no mediaData and no cache, this is an old message - show as unavailable
      if (!message.hasMediaData && !message.mediaData) {
        setImageError(true);
      }
    };

    checkAvailability();
  }, [message._id, message.mediaData, message.hasMediaData]);

  const downloadImage = async () => {
    if (isDownloaded || imageLoading) return;

    try {
      setImageLoading(true);
      setImageError(false);

      // Try to get from server
      const response = await apiService.get(`/api/groups/${groupId}/messages/${message._id}/media`);

      if (response && response.success && response.data && response.data.mediaData) {
        const mediaData = response.data.mediaData;

        // Cache it locally
        const cacheKey = `image_${message._id}`;
        try {
          await AsyncStorage.setItem(cacheKey, mediaData);
        } catch (e) {
          console.warn('Failed to cache image:', e);
        }

        setImageUri(mediaData);
        setIsDownloaded(true);
      } else {
        setImageError(true);
      }
    } catch (e) {
      console.error('Failed to download image:', e);
      setImageError(true);
    } finally {
      setImageLoading(false);
    }
  };

  const handlePress = () => {
    if (isDownloaded && imageUri) {
      onOpenViewer(imageUri);
    } else {
      downloadImage();
    }
  };

  const handleImageError = (error: any) => {
    console.log('📷 Image render error:', error?.nativeEvent?.error);
    setImageError(true);
  };

  // Get image dimensions and calculate display size
  const getImageDimensions = (uri: string) => {
    Image.getSize(
      uri,
      (width, height) => {
        // Calculate display dimensions
        // Max width: 80% of screen width (leave room for chat bubble padding)
        // Max height: 400px (reasonable for chat)
        const maxWidth = SCREEN_WIDTH * 0.7;
        const maxHeight = 400;

        let displayWidth = width;
        let displayHeight = height;

        // Scale down if too wide
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          displayWidth = maxWidth;
          displayHeight = height * ratio;
        }

        // Scale down if too tall
        if (displayHeight > maxHeight) {
          const ratio = maxHeight / displayHeight;
          displayWidth = displayWidth * ratio;
          displayHeight = maxHeight;
        }

        // Minimum size for very small images
        const minSize = 100;
        if (displayWidth < minSize && displayHeight < minSize) {
          const scale = minSize / Math.max(displayWidth, displayHeight);
          displayWidth *= scale;
          displayHeight *= scale;
        }

        setImageDimensions({ width: Math.round(displayWidth), height: Math.round(displayHeight) });
      },
      (error) => {
        console.warn('Failed to get image dimensions:', error);
        // Fallback to default size
        setImageDimensions({ width: 250, height: 250 });
      }
    );
  };

  // Get dimensions when image URI changes
  useEffect(() => {
    if (imageUri && isDownloaded) {
      getImageDimensions(imageUri);
    }
  }, [imageUri, isDownloaded]);

  // Show download prompt if not downloaded (only if hasMediaData is true)
  if (!isDownloaded && !imageLoading && !imageError) {
    // Only show download button if the message has media data available
    if (message.hasMediaData) {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={downloadImage}
          onLongPress={onLongPress}
          style={[styles.imageBubbleContainer, {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.05)',
            minHeight: 150,
          }]}
        >
          <Icon name="download" size={40} color={Colors.primary} />
          <Text style={[styles.messageText, {
            color: Colors.primary,
            marginTop: 8,
            fontSize: 14,
            fontWeight: '600',
          }]}>
            Tap to download image
          </Text>
          <Text style={[styles.messageText, {
            color: Colors.textLight,
            marginTop: 4,
            fontSize: 11,
          }]}>
            Save data by downloading only when needed
          </Text>
        </TouchableOpacity>
      );
    }
    // If no media data available, fall through to error state
  }

  // Show loading state
  if (imageLoading) {
    return (
      <View style={[styles.imageBubbleContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={[styles.messageText, {
          color: Colors.textLight,
          marginTop: 8,
          fontSize: 12,
        }]}>
          Downloading...
        </Text>
      </View>
    );
  }

  // Show error state
  if (imageError || (!imageUri && !imageLoading)) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={onLongPress}
        style={[styles.imageBubbleContainer, {
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.05)',
          minHeight: 150,
        }]}
      >
        <Icon name="image-off" size={40} color={Colors.textLight} />
        <Text style={[styles.messageText, {
          color: Colors.textLight,
          marginTop: 8,
          fontSize: 12,
          textAlign: 'center',
        }]}>
          {message.hasMediaData ? 'Failed to load image' : 'Image no longer available'}
        </Text>
        <Text style={[styles.messageText, {
          color: Colors.textLight,
          marginTop: 4,
          fontSize: 10,
          textAlign: 'center',
        }]}>
          {message.hasMediaData ? 'Tap to retry' : 'Old message before storage update'}
        </Text>
        {message.hasMediaData && (
          <TouchableOpacity onPress={downloadImage} style={{ marginTop: 8 }}>
            <Icon name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Show downloaded image with dynamic dimensions
  const imageStyle = imageDimensions
    ? {
      width: imageDimensions.width,
      height: imageDimensions.height,
      borderRadius: 12,
    }
    : styles.imageBubble; // Fallback to default style while loading dimensions

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      delayLongPress={500}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[styles.imageBubbleContainer, imageDimensions && {
        width: imageDimensions.width,
        height: imageDimensions.height,
      }]}
    >
      {!imageDimensions ? (
        // Show loading while getting dimensions
        <View style={{ justifyContent: 'center', alignItems: 'center', minHeight: 150, minWidth: 150 }}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <>
          <Image
            source={{ uri: imageUri || undefined }}
            style={imageStyle}
            resizeMode="cover"
            onError={handleImageError}
          />
          {/* Downloaded indicator */}
          <View style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 12,
            padding: 4,
          }}>
            <Icon name="check-circle" size={16} color="#4ade80" />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

// Group Chat Screen Component - Rewritten with proper layout
const GroupChatScreen: React.FC<{
  group: any;
  onBack: () => void;
  onOpenGroupDetails: () => void;
  showAlert: (title: string, message: string, buttons?: any[], icon?: string, iconColor?: string) => void;
}> = ({ group, onBack, onOpenGroupDetails, showAlert }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSelectingMessages, setIsSelectingMessages] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isMessageActionsVisible, setIsMessageActionsVisible] = useState(false);
  const [activeMessage, setActiveMessage] = useState<any | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editText, setEditText] = useState('');
  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false);
  const [forwardGroups, setForwardGroups] = useState<any[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);

  // In-app image viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);
  const [imageViewerLoading, setImageViewerLoading] = useState(false);

  // Layout & scroll state
  const flatListRef = useRef<FlatList | null>(null);
  const [inputHeight, setInputHeight] = useState(100); // Default height estimate
  const initialUnreadCountRef = useRef(
    Math.max(typeof group.unreadCount === 'number' ? group.unreadCount : 0, 0),
  );
  const previousMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(initialUnreadCountRef.current === 0);
  const isInitialScrollInProgressRef = useRef(false);
  const [isInitialScrollComplete, setIsInitialScrollComplete] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(
    initialUnreadCountRef.current > 0,
  );
  const [pendingNewMessages, setPendingNewMessages] = useState(0);

  useEffect(() => {
    // Clean up old cached media on chat mount
    cleanupOldMedia().catch((e) => console.warn('cleanupOldMedia failed', e));
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📥 Loading messages for group:', group._id);
      const response = await apiService.get(`/api/groups/${group._id}/messages`);
      console.log('📥 Messages response:', JSON.stringify(response, null, 2));
      if (response && response.success && response.data && Array.isArray(response.data.messages)) {
        setIsInitialScrollComplete(false);
        console.log('📥 Setting', response.data.messages.length, 'messages to state');
        console.log('📥 First 3 messages:', response.data.messages.slice(0, 3));
        setMessages(response.data.messages);
      } else {
        console.log('📥 No messages in response, setting empty array');
        setIsInitialScrollComplete(true);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setIsInitialScrollComplete(true);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [group._id]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const socket = await connectSocket();
      console.log('📤 Sending message:', { groupId: group._id, text, messageType: 'text' });
      socket.emit('sendGroupMessage', { groupId: group._id, text, messageType: 'text' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendLiveLocation = async () => {
    try {
      const currentLocation = await locationService.getCurrentLocation();
      if (!currentLocation) return;

      const socket = await connectSocket();
      socket.emit('sendGroupMessage', {
        groupId: group._id,
        messageType: 'location',
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          isLive: true,
        },
      });
    } catch (error) {
      console.error('Error sending live location:', error);
    }
  };

  const openLocationInMaps = useCallback((latitude: number, longitude: number) => {
    const label = 'Live Location';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    
    Linking.openURL(url).catch((error) => {
      console.error('Failed to open location in maps:', error);
    });
  }, []);



  const requestMediaPermissionsIfNeeded = async (): Promise<boolean> => {
    try {
      // On iOS, react-native-image-picker handles permissions automatically
      // Only need to request permissions on Android
      if (Platform.OS === 'android') {
        const cameraStatus = await requestPermissionWithRationale('camera', {
          title: 'Camera access',
          message: 'SHEild needs camera access to take and send photos.',
          examples: ['Share photos with your trust circle'],
        });

        if (cameraStatus !== 'granted') {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      return false;
    }
  };

  // Normalize media URL so both absolute and relative paths work on device
  const resolveMediaUrl = (url: string | undefined | null): string | null => {
    if (!url) {
      console.log('resolveMediaUrl: No URL provided');
      return null;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('resolveMediaUrl: Already absolute URL:', url);
      return url;
    }
    // Treat as server-relative path (e.g. /uploads/...) and prefix API base URL
    const resolved = `${API_BASE_URL}${url}`;
    console.log('resolveMediaUrl: Resolved relative URL:', url, '→', resolved);
    return resolved;
  };

  const uploadAndSendImage = async (asset: any) => {
    if (!asset.uri) {
      console.log('❌ No asset URI provided');
      return;
    }

    try {
      console.log('📦 Preparing image upload:', {
        uri: asset.uri,
        fileName: asset.fileName,
        type: asset.type,
        fileSize: asset.fileSize,
      });

      // Compress large images before upload
      let fileUri = asset.uri;
      let fileSize = asset.fileSize || 0;

      // If image is larger than 500KB, we'll use quality 0.7 for compression
      const maxSize = 500 * 1024; // 500KB
      const quality = fileSize > maxSize ? 0.7 : 0.8;

      console.log(`📦 Image size: ${Math.round(fileSize / 1024)}KB, using quality: ${quality}`);

      const formData = new FormData();
      const fileName = asset.fileName || `photo-${Date.now()}.jpg`;
      const type = asset.type || 'image/jpeg';

      // Normalize URI for both platforms
      // iOS: Handle both file:// and assets-library:// URIs
      if (Platform.OS === 'ios') {
        // iOS camera photos usually start with file://
        if (!fileUri.startsWith('file://') && !fileUri.startsWith('assets-library://')) {
          fileUri = `file://${fileUri}`;
        }
      } else {
        // Android: Ensure file:// prefix
        if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
          fileUri = `file://${fileUri}`;
        }
      }

      console.log('📤 Upload details:', {
        originalUri: asset.uri,
        normalizedUri: fileUri,
        fileName: fileName,
        fileType: type,
        platform: Platform.OS,
        quality: quality,
      });

      // @ts-ignore - React Native FormData accepts this format
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: type,
      });
      formData.append('fileType', 'image');

      console.log('📡 Uploading to:', `/api/groups/${group._id}/media`);

      // Add timeout handling
      const uploadPromise = apiService.upload(`/api/groups/${group._id}/media`, formData);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout - please try again')), 30000)
      );

      const uploadRes = await Promise.race([uploadPromise, timeoutPromise]) as any;
      console.log('✅ Upload response:', uploadRes);

      // For images, use blob data; for audio, use URL
      const mediaUrl = uploadRes?.data?.mediaUrl;
      const mediaData = uploadRes?.data?.mediaData;

      console.log('📦 Media response:', {
        hasUrl: !!mediaUrl,
        hasData: !!mediaData,
        dataLength: mediaData?.length
      });

      // Prefer blob data for images, fall back to URL
      const finalMediaUrl = mediaData || mediaUrl;

      if (!finalMediaUrl) {
        showAlert('Error', 'Failed to upload image - no data received.', undefined, 'alert-circle', '#EF4444');
        return;
      }

      const socket = await connectSocket();
      console.log('📨 Sending image message via socket...');
      socket.emit('sendGroupMessage', {
        groupId: group._id,
        messageType: 'image',
        mediaUrl: finalMediaUrl,
        mediaData: mediaData, // Send blob data separately
      });
      console.log('✅ Image message sent successfully');
    } catch (error: any) {
      console.error('❌ Error in uploadAndSendImage:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
      });

      // Provide more helpful error messages
      let errorMessage = 'Failed to send image';
      if (error?.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (error?.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showAlert('Error', errorMessage, undefined, 'alert-circle', '#EF4444');
    }
  };

  const handlePickImage = async () => {
    try {
      const hasPerm = await requestMediaPermissionsIfNeeded();
      if (!hasPerm) {
        showAlert('Permission Required', 'Please allow camera and media access to send images.', undefined, 'camera', '#F59E0B');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7, // Reduced quality to decrease file size
        maxWidth: 1920, // Limit max dimensions
        maxHeight: 1920,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      await uploadAndSendImage(result.assets[0]);
    } catch (error) {
      console.error('Error picking/sending image:', error);
      showAlert('Error', 'Failed to send image.', undefined, 'alert-circle', '#EF4444');
    }
  };

  const handleTakePhoto = async () => {
    try {
      console.log('📷 Camera button pressed - platform:', Platform.OS);

      // On Android, request permissions first
      // On iOS, react-native-image-picker handles permissions automatically
      if (Platform.OS === 'android') {
        const hasPerm = await requestMediaPermissionsIfNeeded();
        if (!hasPerm) {
          console.log('❌ Camera permission denied');
          showAlert('Permission Required', 'Please allow camera access to take photos.', undefined, 'camera', '#F59E0B');
          return;
        }
      }

      console.log('✅ Launching camera...');
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7, // Reduced quality to decrease file size
        maxWidth: 1920, // Limit max dimensions
        maxHeight: 1920,
        saveToPhotos: false,
        cameraType: 'back',
        includeBase64: false,
      });

      console.log('📷 Camera result:', {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        assetsCount: result.assets?.length || 0,
      });

      if (result.didCancel) {
        console.log('📷 User cancelled camera');
        return;
      }

      if (result.errorCode) {
        console.error('📷 Camera error:', result.errorCode, result.errorMessage);

        // Handle specific error codes
        if (result.errorCode === 'camera_unavailable') {
          showAlert('Camera Unavailable', 'Your device camera is not available.', undefined, 'alert-circle', '#EF4444');
        } else if (result.errorCode === 'permission') {
          showAlert('Permission Denied', 'Camera permission is required to take photos. Please enable it in Settings.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ], 'camera', '#F59E0B');
        } else {
          showAlert('Camera Error', result.errorMessage || 'Failed to open camera', undefined, 'alert-circle', '#EF4444');
        }
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('📷 No image captured');
        return;
      }

      console.log('📤 Uploading captured image...');
      await uploadAndSendImage(result.assets[0]);
    } catch (error: any) {
      console.error('Error capturing/sending image:', error);
      showAlert('Error', `Failed to capture image: ${error?.message || 'Unknown error'}`, undefined, 'alert-circle', '#EF4444');
    }
  };

  useEffect(() => {
    let isMounted = true;
    let socketInstance: any;

    const setupSocket = async () => {
      try {
        socketInstance = await connectSocket();
        if (!isMounted) return;

        socketInstance.emit('joinGroup', { groupId: group._id });

        const handleIncoming = (message: any) => {
          console.log('📨 Received groupMessage:', message);
          if (!message || message.groupId !== group._id) {
            console.log('📨 Ignoring message - wrong group or null');
            return;
          }
          console.log('📨 Adding incoming message to state');
          setMessages((prev) => [...prev, message]);
        };

        const handleSent = (message: any) => {
          console.log('📤 Received messageSent:', message);
          if (!message || message.groupId !== group._id) {
            console.log('📤 Ignoring message - wrong group or null');
            return;
          }
          console.log('📤 Adding sent message to state');
          setMessages((prev) => [...prev, message]);
        };

        const handleError = (payload: any) => {
          console.error('Group socket error:', payload);
        };

        socketInstance.on('groupMessage', handleIncoming);
        socketInstance.on('messageSent', handleSent);
        socketInstance.on('groupError', handleError);

        return () => {
          if (socketInstance) {
            socketInstance.emit('leaveGroup', { groupId: group._id });
            socketInstance.off('groupMessage', handleIncoming);
            socketInstance.off('messageSent', handleSent);
            socketInstance.off('groupError', handleError);
          }
        };
      } catch (error) {
        console.error('Error setting up socket:', error);
      }
    };

    setupSocket();
    loadMessages();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.emit('leaveGroup', { groupId: group._id });
      }
    };
  }, [group._id, loadMessages]);

  // Scroll to bottom helper (newest messages at bottom)
  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  }, [messages.length]);

  const jumpToLatest = useCallback(() => {
    isNearBottomRef.current = true;
    setPendingNewMessages(0);
    setShowJumpToLatest(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  const handleMessagesScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const isNearBottom = distanceFromBottom <= CHAT_BOTTOM_THRESHOLD;

      isNearBottomRef.current = isNearBottom;

      if (isNearBottom) {
        setPendingNewMessages(0);
        setShowJumpToLatest(false);
      } else if (isInitialScrollComplete) {
        setShowJumpToLatest(true);
      }
    },
    [isInitialScrollComplete],
  );

  // Filter messages for search
  const messagesToRender = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    let filtered = messages;
    
    if (isSearchMode && normalized) {
      filtered = messages.filter((m: any) => {
        const text = (m.text || '').toLowerCase();
        const typeLabel = m.messageType || '';
        return text.includes(normalized) || typeLabel.includes(normalized);
      });
    }

    return [...filtered].reverse();
  }, [messages, isSearchMode, searchQuery]);

  // Initial anchor + new message scroll behavior
  useEffect(() => {
    if (messages.length === 0) {
      previousMessageCountRef.current = 0;
      isNearBottomRef.current = true;
      setPendingNewMessages(0);
      setShowJumpToLatest(false);
      setIsInitialScrollComplete(true);
      return;
    }

    const previousCount = previousMessageCountRef.current;
    const addedCount = messages.length - previousCount;

    if (previousCount === 0) {
      const unreadCount = initialUnreadCountRef.current;
      const targetIndex = null; // Prioritize scrolling to bottom as requested

      isInitialScrollInProgressRef.current = true;
      setIsInitialScrollComplete(false);
      setPendingNewMessages(0);

      setTimeout(() => {
        try {
          if (targetIndex !== null && messages.length > targetIndex) {
            console.log(
              `📜 Opening chat at first unread message index ${targetIndex} (unreadCount: ${unreadCount})`,
            );
            flatListRef.current?.scrollToIndex({
              index: targetIndex,
              animated: false,
              viewPosition: 0,
            });
            isNearBottomRef.current = false;
            setShowJumpToLatest(true);
            isInitialScrollInProgressRef.current = false;
            setIsInitialScrollComplete(true);
          } else {
            console.log('📜 All messages are read, waiting for content size to scroll to bottom');
            // We'll let onContentSizeChange handle the scroll to bottom
            // so we don't snap to the top while items are still rendering
            isNearBottomRef.current = true;
          }
        } catch (error) {
          console.warn('Initial scroll attempt failed:', error);
          isInitialScrollInProgressRef.current = false;
          setIsInitialScrollComplete(true);
          flatListRef.current?.scrollToEnd({ animated: false });
        }
      }, 50);
    } else if (addedCount > 0) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.isOwn || isNearBottomRef.current) {
        scrollToBottom(true);
        setPendingNewMessages(0);
        setShowJumpToLatest(false);
      } else {
        setPendingNewMessages((current) => current + addedCount);
        setShowJumpToLatest(true);
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, scrollToBottom]);

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds(prev =>
      prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId],
    );
  };

  const clearMessageSelection = () => {
    setIsSelectingMessages(false);
    setSelectedMessageIds([]);
  };

  const handleDeleteSelectedMessages = () => {
    if (selectedMessageIds.length === 0) {
      clearMessageSelection();
      return;
    }

    showAlert(
      'Delete Messages',
      `Are you sure you want to delete ${selectedMessageIds.length} message${selectedMessageIds.length > 1 ? 's' : ''
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedMessageIds) {
                try {
                  await apiService.delete(`/api/groups/${group._id}/messages/${id}`);
                } catch (err) {
                  console.error('Error deleting message in bulk:', err);
                }
              }
              setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m._id)));
              clearMessageSelection();
            } catch (error) {
              console.error('Bulk delete error:', error);
              showAlert('Error', 'Failed to delete some messages.', undefined, 'alert-circle', '#EF4444');
            }
          },
        },
      ],
      'delete',
      '#EF4444',
    );
  };

  const openMessageActions = (message: any) => {
    setActiveMessage(message);
    setIsMessageActionsVisible(true);
  };

  const handleDeleteActiveMessage = async () => {
    if (!activeMessage) return;
    try {
      await apiService.delete(`/api/groups/${group._id}/messages/${activeMessage._id}`);
      setMessages(prev => prev.filter((m) => m._id !== activeMessage._id));
    } catch (error) {
      console.error('Error deleting message:', error);
      showAlert('Error', 'Failed to delete message.', undefined, 'alert-circle', '#EF4444');
    } finally {
      setIsMessageActionsVisible(false);
      setActiveMessage(null);
    }
  };

  const handleStartEditActiveMessage = () => {
    if (!activeMessage || activeMessage.messageType !== 'text' || !activeMessage.isOwn) {
      return;
    }
    setIsMessageActionsVisible(false);
    setEditText(activeMessage.text || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEditedMessage = async () => {
    if (!activeMessage) return;
    const trimmed = editText.trim();
    if (!trimmed) {
      showAlert('Error', 'Message cannot be empty.', undefined, 'alert-circle', '#EF4444');
      return;
    }
    try {
      const response = await apiService.put(
        `/api/groups/${group._id}/messages/${activeMessage._id}`,
        { text: trimmed },
      );
      const updated = response && response.data ? response.data : null;
      setMessages(prev =>
        prev.map((m) => (m._id === activeMessage._id ? { ...m, text: trimmed } : m)),
      );
    } catch (error) {
      console.error('Error editing message:', error);
      showAlert('Error', 'Failed to edit message.', undefined, 'alert-circle', '#EF4444');
    } finally {
      setIsEditModalVisible(false);
      setActiveMessage(null);
    }
  };

  const loadForwardGroups = useCallback(async () => {
    try {
      setForwardLoading(true);
      const response = await apiService.get('/api/groups');
      if (response && response.success && response.data && Array.isArray(response.data.groups)) {
        setForwardGroups(response.data.groups);
      } else {
        setForwardGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups for forward:', error);
      setForwardGroups([]);
    } finally {
      setForwardLoading(false);
    }
  }, []);

  const handleForwardActiveMessage = async () => {
    if (!activeMessage) return;
    try {
      if (forwardGroups.length === 0) {
        await loadForwardGroups();
      }
      setIsMessageActionsVisible(false);
      setIsForwardModalVisible(true);
    } catch (error) {
      console.error('Error preparing forward:', error);
      showAlert('Error', 'Failed to load groups for forwarding.', undefined, 'alert-circle', '#EF4444');
    }
  };

  const handleForwardToGroup = async (targetGroupId: string) => {
    if (!activeMessage) return;
    try {
      const socket = await connectSocket();
      const base: any = {
        groupId: targetGroupId,
        messageType: activeMessage.messageType,
      };
      if (activeMessage.messageType === 'location' && activeMessage.location) {
        base.location = activeMessage.location;
      } else if (
        (activeMessage.messageType === 'audio' || activeMessage.messageType === 'image') &&
        activeMessage.mediaUrl
      ) {
        base.mediaUrl = activeMessage.mediaUrl;
        if (activeMessage.duration) {
          base.duration = activeMessage.duration;
        }
      } else {
        base.text = activeMessage.text;
        base.messageType = 'text';
      }
      socket.emit('sendGroupMessage', base);
      setIsForwardModalVisible(false);
      setActiveMessage(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
      showAlert('Error', 'Failed to forward message.', undefined, 'alert-circle', '#EF4444');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'TODAY';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).toUpperCase();
    }
  };

  const shouldShowDateSeparator = (currentMessage: any, previousMessage: any | null): boolean => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const previousDate = new Date(previousMessage.timestamp).toDateString();
    return currentDate !== previousDate;
  };

  return (
    <View style={styles.chatOuterWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />
      <View style={styles.chatContainer}>
        {/* Chat Header - Glassmorphism */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => {
              if (isSelectingMessages) {
                clearMessageSelection();
              } else {
                onBack();
              }
            }}
            style={styles.backButton}
          >
            <Icon name={isSelectingMessages ? 'close' : 'arrow-left'} size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Tappable group info (avatar + name) */}
          <TouchableOpacity
            style={styles.chatHeaderInfo}
            onPress={() => {
              if (!isSelectingMessages) {
                onOpenGroupDetails();
              }
            }}
          >
            <View style={styles.chatHeaderAvatar}>
              {group.groupImage ? (
                <Image source={{ uri: group.groupImage }} style={styles.chatHeaderAvatarImage} />
              ) : (
                <Text style={styles.chatHeaderAvatarText}>
                  {(group.name || 'GP').substring(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.chatHeaderTextContainer}>
              {isSelectingMessages ? (
                <>
                  <Text style={styles.chatGroupName} numberOfLines={1}>
                    {selectedMessageIds.length} selected
                  </Text>
                  <Text style={styles.chatGroupMembers} numberOfLines={1}>
                    Tap messages to select
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.chatGroupName} numberOfLines={1}>{group.name}</Text>
                  <View style={styles.chatGroupStatus}>
                    <View style={styles.onlineIndicator} />
                    <Text style={styles.chatGroupMembers} numberOfLines={1}>
                      {group.members?.length || 0} members
                    </Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Header actions */}
          {isSelectingMessages ? (
            <TouchableOpacity
              style={styles.chatMenuButton}
              onPress={handleDeleteSelectedMessages}
            >
              <Icon name="delete" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.chatHeaderActions}>
              <TouchableOpacity style={styles.chatActionButton}>
                <Icon name="phone" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatActionButton}>
                <Icon name="video" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatMenuButton}
                onPress={() => setIsMenuVisible(true)}
              >
                <Icon name="dots-vertical" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isSearchMode && (
          <View style={styles.chatSearchBar}>
            <Icon name="magnify" size={18} color={Colors.textLight} />
            <TextInput
              style={styles.chatSearchInput}
              placeholder="Find messages..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.chatSearchClose}
              onPress={() => {
                setIsSearchMode(false);
                setSearchQuery('');
              }}
            >
              <Icon name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Chat actions menu */}
        <Modal
          visible={isMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <View style={styles.chatMenuOverlay}>
            <View style={styles.chatMenuContent}>
              <TouchableOpacity
                style={styles.chatMenuItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  onOpenGroupDetails();
                }}
              >
                <Icon name="account-group" size={20} color={Colors.text} />
                <Text style={styles.chatMenuItemText}>Group info</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatMenuItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsSelectingMessages(true);
                  setSelectedMessageIds([]);
                }}
              >
                <Icon name="check-circle" size={22} color={Colors.text} />
                <Text style={styles.chatMenuItemText}>Select messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatMenuItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsSearchMode(true);
                }}
              >
                <Icon name="magnify" size={22} color={Colors.text} />
                <Text style={styles.chatMenuItemText}>Find messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chatMenuItem, styles.chatMenuItemDestructive]}
                onPress={() => {
                  setIsMenuVisible(false);
                  showAlert('Leave Group', 'Leaving group will be available in a future update from here.', undefined, 'information', Colors.primary);
                }}
              >
                <Icon name="logout" size={20} color="#EF4444" />
                <Text style={[styles.chatMenuItemText, styles.chatMenuItemDestructiveText]}>Leave group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Message actions modal (delete / edit / forward) */}
        {isMessageActionsVisible && activeMessage ? (
          <Modal
            visible={isMessageActionsVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setIsMessageActionsVisible(false);
              setActiveMessage(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageActionsContent}>
                <Text style={styles.messageActionsTitle}>Message options</Text>

                {activeMessage.isOwn && activeMessage.messageType === 'text' && (
                  <TouchableOpacity
                    style={styles.messageActionsItem}
                    onPress={handleStartEditActiveMessage}
                  >
                    <Icon name="pencil" size={20} color={Colors.text} />
                    <Text style={styles.messageActionsItemText}>Edit message</Text>
                  </TouchableOpacity>
                )}

                {/* Enter selection mode from long-press menu */}
                <TouchableOpacity
                  style={styles.messageActionsItem}
                  onPress={() => {
                    setIsMessageActionsVisible(false);
                    setIsSelectingMessages(true);
                    if (activeMessage && !selectedMessageIds.includes(activeMessage._id)) {
                      setSelectedMessageIds(prev => [...prev, activeMessage._id]);
                    }
                  }}
                >
                  <Icon name="check-circle" size={20} color={Colors.text} />
                  <Text style={styles.messageActionsItemText}>Select messages</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageActionsItem}
                  onPress={handleForwardActiveMessage}
                >
                  <Icon name="share" size={20} color={Colors.text} />
                  <Text style={styles.messageActionsItemText}>Forward</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageActionsItem}
                  onPress={handleDeleteActiveMessage}
                >
                  <Icon name="delete" size={20} color="#EF4444" />
                  <Text
                    style={[styles.messageActionsItemText, styles.messageActionsItemDestructive]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageActionsCancel}
                  onPress={() => {
                    setIsMessageActionsVisible(false);
                    setActiveMessage(null);
                  }}
                >
                  <Text style={styles.messageActionsCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : null}

        {/* Edit message modal */}
        {isEditModalVisible && activeMessage ? (
          <Modal
            visible={isEditModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsEditModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editMessageContent}>
                <Text style={styles.editMessageTitle}>Edit message</Text>
                <TextInput
                  style={styles.editMessageInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  placeholder="Update your message..."
                  placeholderTextColor={Colors.textLight}
                />
                <View style={styles.editMessageButtonsRow}>
                  <TouchableOpacity
                    style={styles.editMessageButtonSecondary}
                    onPress={() => setIsEditModalVisible(false)}
                  >
                    <Text style={styles.editMessageButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editMessageButtonPrimary}
                    onPress={handleSaveEditedMessage}
                  >
                    <Text style={styles.editMessageButtonPrimaryText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : null}

        {/* Forward message modal */}
        {isForwardModalVisible && activeMessage ? (
          <Modal
            visible={isForwardModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsForwardModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.forwardModalContent}>
                <Text style={styles.forwardModalTitle}>Forward to...</Text>
                {forwardLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </View>
                ) : forwardGroups.length > 0 ? (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {forwardGroups.map((g: any) => (
                      <TouchableOpacity
                        key={g._id}
                        style={styles.forwardGroupItem}
                        onPress={() => handleForwardToGroup(g._id)}
                      >
                        <View style={styles.forwardGroupAvatar}>
                          <Text style={styles.forwardGroupAvatarText}>
                            {(g.name || 'GP').substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.forwardGroupInfo}>
                          <Text style={styles.forwardGroupName}>{g.name}</Text>
                          {!!g.lastMessagePreview && (
                            <Text style={styles.forwardGroupSubtitle} numberOfLines={1}>
                              {g.lastMessagePreview}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.forwardEmptyText}>No groups available.</Text>
                )}

                <TouchableOpacity
                  style={styles.messageActionsCancel}
                  onPress={() => setIsForwardModalVisible(false)}
                >
                  <Text style={styles.messageActionsCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : null}

        {/* Messages and Input - Wrapped in KeyboardAvoidingView */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          <View style={styles.messagesWrapper}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <>
                <FlatList
                  ref={flatListRef}
                  data={messagesToRender}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  inverted
                  onScroll={handleMessagesScroll}
                  scrollEventThrottle={16}
                  renderItem={({ item: message, index }) => {
                    const isSelected = selectedMessageIds.includes(message._id);
                    const previousMessage = index < messagesToRender.length - 1 ? messagesToRender[index + 1] : null;
                    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                    return (
                      <View>
                        {showDateSeparator && (
                          <View style={styles.dateSeparator}>
                            <View style={styles.dateSeparatorLine} />
                            <Text style={styles.dateSeparatorText}>
                              {formatDate(message.timestamp)}
                            </Text>
                            <View style={styles.dateSeparatorLine} />
                          </View>
                        )}
                        <View style={[
                          styles.messageWrapper,
                          message.isOwn ? styles.ownMessageWrapper : styles.otherMessageWrapper,
                        ]}>
                          {/* Sender name and timestamp header */}
                          <View style={[styles.messageHeader, message.isOwn && { justifyContent: 'flex-end' }]}>
                            {!message.isOwn && (
                              <View style={styles.messageAvatar}>
                                <Text style={styles.messageAvatarText}>
                                  {message.sender.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text style={[
                              styles.messageSenderName,
                              message.isOwn ? styles.ownSenderName : styles.otherSenderName
                            ]}>
                              {message.isOwn ? 'You' : message.sender.name}
                            </Text>
                            <Text style={styles.messageHeaderTime}>
                              {formatTime(message.timestamp)}
                            </Text>
                          </View>

                          <RNTouchableOpacity
                            activeOpacity={0.7}
                            delayLongPress={500}
                            onLongPress={() => {
                              ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                              if (isSelectingMessages) {
                                toggleMessageSelection(message._id);
                              } else {
                                openMessageActions(message);
                              }
                            }}
                            onPress={() => {
                              if (isSelectingMessages) {
                                toggleMessageSelection(message._id);
                              } else if (
                                message.messageType === 'location' &&
                                typeof message.location?.latitude === 'number' &&
                                typeof message.location?.longitude === 'number'
                              ) {
                                openLocationInMaps(
                                  message.location.latitude,
                                  message.location.longitude,
                                );
                              }
                            }}
                          >
                            {message.messageType === 'location' && message.location ? (
                              (() => {
                                try {
                                  const lat = message.location?.latitude;
                                  const lng = message.location?.longitude;

                                  // Validate location data
                                  if (
                                    typeof lat !== 'number' ||
                                    typeof lng !== 'number' ||
                                    isNaN(lat) ||
                                    isNaN(lng) ||
                                    lat < -90 ||
                                    lat > 90 ||
                                    lng < -180 ||
                                    lng > 180
                                  ) {
                                    return (
                                      <View style={styles.locationCard}>
                                        <Text style={styles.messageText}>Invalid location data</Text>
                                      </View>
                                    );
                                  }

                                  return (
                                    <LocationMessagePreview
                                    latitude={lat}
                                    longitude={lng}
                                    isLive={!!message.location?.isLive}
                                    senderInitials={message.sender?.name?.charAt(0).toUpperCase()}
                                    profileImage={resolveMediaUrl(message.sender?.profileImage)}
                                  />
                                  );
                                } catch { return null; }
                              })()
                            ) : message.messageType === 'audio' && message.mediaUrl ? (
                              <View style={[styles.audioMessageContainer, message.isOwn ? styles.ownMessageBubble : styles.otherMessageBubble]}>
                                <View style={styles.audioPlayButton}>
                                  <Icon name="microphone" size={18} color="#FFFFFF" />
                                </View>
                                <View style={styles.audioInfo}>
                                  <Text style={[styles.audioDuration, { color: '#FFFFFF' }]}>Audio Message</Text>
                                </View>
                              </View>
                            ) : message.messageType === 'image' ? (
                              <ImageMessageBubble
                                message={message}
                                groupId={group._id}
                                onOpenViewer={(uri) => {
                                  setImageViewerUri(uri);
                                  setImageViewerVisible(true);
                                }}
                                onLongPress={() => {
                                  ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                  if (isSelectingMessages) {
                                    toggleMessageSelection(message._id);
                                  } else {
                                    openMessageActions(message);
                                  }
                                }}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.messageBubble,
                                  message.isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
                                  isSelected && styles.selectedMessageBubble,
                                ]}
                              >
                                <LinkableText
                                  text={message.text}
                                  style={[
                                    styles.messageText,
                                    message.isOwn ? styles.ownMessageText : styles.otherMessageText,
                                  ]}
                                  isOwnMessage={message.isOwn}
                                />
                              </View>
                            )}
                          </RNTouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              {showJumpToLatest && !loading ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.jumpToBottomFAB}
                  onPress={jumpToLatest}
                >
                  <Icon name="chevron-down" size={24} color="#FFFFFF" />
                  {pendingNewMessages > 0 && (
                    <View style={styles.jumpToBottomBadge}>
                      <Text style={styles.jumpToBottomBadgeText}>
                        {pendingNewMessages > 99 ? '99+' : pendingNewMessages}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
              </>
            )}
          </View>

          {/* In-app image viewer */}
          <Modal
            visible={imageViewerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setImageViewerVisible(false);
              setImageViewerUri(null);
            }}
          >
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerCloseButton}
                onPress={() => {
                  setImageViewerVisible(false);
                  setImageViewerUri(null);
                }}
              >
                <Icon name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.imageViewerContent}>
                {imageViewerLoading && (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                )}
                {imageViewerUri && !imageViewerLoading && (
                  <Image
                    source={{ uri: imageViewerUri }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </View>
          </Modal>

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <View style={styles.messageInputInner}>
              <TouchableOpacity style={styles.messageInputIconButton} onPress={handlePickImage}>
                <Icon name="attachment" size={22} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              {newMessage.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={sendMessage}
                >
                  <Icon name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity style={styles.messageInputIconButton} onPress={handleTakePhoto}>
                    <Icon name="camera" size={22} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.messageInputIconButton} onPress={sendLiveLocation}>
                    <Icon name="map-marker" size={22} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

// Add Member Modal Component
interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  emergencyContacts: EmergencyContact[];
  existingMembers: any[];
  onMemberAdded: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  showAlert: (title: string, message: string, buttons?: any[], icon?: string, iconColor?: string) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  visible,
  onClose,
  groupId,
  emergencyContacts,
  existingMembers,
  onMemberAdded,
  showToast,
  showAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // Filter out contacts who are already members
  const availableContacts = emergencyContacts.filter(contact =>
    !existingMembers.some(member =>
      member.phoneNumber === contact.phoneNumber
    )
  );

  // Search filter
  const filteredContacts = availableContacts.filter(contact => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (contact.name || '').toLowerCase();
    const phone = contact.phoneNumber || '';
    return name.includes(query) || phone.includes(query);
  });

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedContacts.length === 0) {
      showAlert('No Selection', 'Please select at least one contact to add', undefined, 'account-alert', '#F59E0B');
      return;
    }

    try {
      setAdding(true);

      // Get selected contacts data
      const contactsToAdd = emergencyContacts.filter(c => c._id && selectedContacts.includes(c._id));

      // Add each contact to the group
      const promises = contactsToAdd.map(contact =>
        apiService.post(`/api/groups/${groupId}/members`, {
          phoneNumber: contact.phoneNumber,
          name: contact.name || 'Contact',
        })
      );

      const results = await Promise.all(promises);

      // Check if all succeeded
      const allSuccess = results.every(r => r?.success);

      if (allSuccess) {
        showToast(`${selectedContacts.length} member(s) added successfully!`, 'success');
        setSelectedContacts([]);
        setSearchQuery('');
        onMemberAdded();
        onClose();
      } else {
        const failed = results.filter(r => !r?.success);
        showAlert('Partial Success', `Some members could not be added. ${failed.length} failed.`, undefined, 'alert-circle', '#F59E0B');
      }
    } catch (error: any) {
      console.error('Error adding members:', error);
      showAlert('Error', error?.message || 'Failed to add members', undefined, 'alert-circle', '#EF4444');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.addMemberModalContent}>
          {/* Header */}
          <View style={styles.addMemberModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.addMemberModalTitle}>Add Members</Text>
            <TouchableOpacity
              onPress={handleAddMembers}
              disabled={adding || selectedContacts.length === 0}
            >
              <Text style={[
                styles.addMemberModalDone,
                (adding || selectedContacts.length === 0) && styles.addMemberModalDoneDisabled
              ]}>
                {adding ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected count */}
          {selectedContacts.length > 0 && (
            <View style={styles.addMemberSelectedBanner}>
              <Text style={styles.addMemberSelectedText}>
                {selectedContacts.length} selected
              </Text>
            </View>
          )}

          {/* Search */}
          <View style={styles.addMemberSearchContainer}>
            <Icon name="magnify" size={20} color={Colors.textLight} />
            <TextInput
              style={styles.addMemberSearchInput}
              placeholder="Search emergency contacts..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!adding}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Contacts list */}
          <ScrollView style={styles.addMemberList}>
            {availableContacts.length === 0 ? (
              <View style={styles.addMemberEmptyContainer}>
                <Icon name="account-off" size={48} color={Colors.textLight} />
                <Text style={styles.addMemberEmptyText}>No available contacts</Text>
                <Text style={styles.addMemberEmptySubtext}>
                  All your emergency contacts are already members of this group
                </Text>
              </View>
            ) : filteredContacts.length === 0 ? (
              <View style={styles.addMemberEmptyContainer}>
                <Icon name="account-search" size={48} color={Colors.textLight} />
                <Text style={styles.addMemberEmptyText}>No contacts found</Text>
                <Text style={styles.addMemberEmptySubtext}>
                  Try searching with a different name or number
                </Text>
              </View>
            ) : (
              filteredContacts.map((contact) => {
                const contactId = contact._id || contact.phoneNumber;
                const isSelected = selectedContacts.includes(contactId);
                const displayName = contact.name || 'Unknown';
                const phoneNumber = contact.phoneNumber || '';

                return (
                  <TouchableOpacity
                    key={contactId}
                    style={[styles.addMemberContactItem, isSelected && styles.addMemberContactItemSelected]}
                    onPress={() => toggleContact(contactId)}
                    disabled={adding}
                  >
                    <View style={styles.addMemberContactAvatar}>
                      <Text style={styles.addMemberContactAvatarText}>
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.addMemberContactInfo}>
                      <Text style={styles.addMemberContactName}>{displayName}</Text>
                      <Text style={styles.addMemberContactPhone}>{phoneNumber}</Text>
                    </View>
                    <View style={[
                      styles.addMemberCheckbox,
                      isSelected && styles.addMemberCheckboxSelected
                    ]}>
                      {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface GroupDetailsModalProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onShareJoinCode: (code: string, name: string) => void;
  emergencyContacts: EmergencyContact[];
  showToast: (message: string, type: 'success' | 'error') => void;
  showAlert: (title: string, message: string, buttons?: any[], icon?: string, iconColor?: string) => void;
}

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  visible,
  groupId,
  onClose,
  onShareJoinCode,
  emergencyContacts,
  showToast,
  showAlert
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is admin
  const currentUserMember = useMemo(() => 
    group?.members?.find((m: any) => m.user === user?.id || (m.phoneNumber === user?.phoneNumber && m.phoneNumber)),
    [group?.members, user]
  );
  const isUserAdmin = group?.createdBy === user?.id || currentUserMember?.role === 'admin';

  useEffect(() => {
    const fetchDetails = async () => {
      if (!visible || !groupId) return;
      try {
        setLoading(true);
        const response = await apiService.get(`/api/groups/${groupId}`);
        if (response && response.success && response.data) {
          setGroup(response.data);
        } else {
          setGroup(null);
        }
      } catch (error) {
        console.error('Error loading group details:', error);
        setGroup(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [visible, groupId]);

  const handleShareCode = () => {
    if (group?.joinCode && group?.name) {
      onShareJoinCode(group.joinCode, group.name);
    }
  };

  const handleCopyCode = () => {
    if (group?.joinCode) {
      Clipboard.setString(group.joinCode);
      onShareJoinCode(group.joinCode, group.name); // Use the toast instead
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    showAlert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              setRemovingMemberId(memberId);
              const response = await apiService.delete(`/api/groups/${groupId}/members/${memberId}`);

              if (response && response.success) {
                showToast('Member removed successfully', 'success');

                // Refresh group details
                const detailsResponse = await apiService.get(`/api/groups/${groupId}`);
                if (detailsResponse && detailsResponse.success && detailsResponse.data) {
                  setGroup(detailsResponse.data);
                }
              } else {
                showToast(response?.message || 'Failed to remove member', 'error');
              }
            } catch (error: any) {
              console.error('Error removing member:', error);
              showToast(error?.message || 'Failed to remove member', 'error');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ],
      'alert-circle',
      '#EF4444'
    );
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === group?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsUpdating(true);
      const response = await apiService.put(`/api/groups/${groupId}`, { name: newName.trim() });
      if (response && response.success) {
        setGroup({ ...group, name: newName.trim() });
        showToast('Group name updated', 'success');
        setIsEditingName(false);
        loadGroups();
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to update name', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeaveGroup = async () => {
    showAlert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLeaving(true);
              const response = await apiService.post(`/api/groups/${groupId}/leave`);
              if (response && response.success) {
                showToast('You left the group', 'success');
                onClose();
                loadGroups();
              }
            } catch (error: any) {
              showToast(error?.message || 'Failed to leave group', 'error');
            } finally {
              setIsLeaving(false);
            }
          }
        }
      ],
      'logout',
      '#EF4444'
    );
  };

  const handleDeleteGroup = async () => {
    showAlert(
      'Delete Group',
      'Are you sure you want to delete this group for everyone? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const response = await apiService.delete(`/api/groups/${groupId}`);
              if (response && response.success) {
                showToast('Group deleted', 'success');
                onClose();
                loadGroups();
              }
            } catch (error: any) {
              showToast(error?.message || 'Failed to delete group', 'error');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ],
      'delete',
      '#EF4444'
    );
  };

  const renderMemberRole = (member: any) => {
    if (member.role === 'admin') {
      return 'Admin';
    }
    return 'Member';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.groupDetailsOverlay}>
        <View style={styles.groupDetailsContent}>
          <View style={styles.groupDetailsHeader}>
            <TouchableOpacity onPress={onClose} style={styles.groupDetailsBackButton}>
              <Icon name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.groupDetailsTitle}>Group info</Text>
          </View>

          {loading ? (
            <View style={styles.groupDetailsLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : group ? (
            <ScrollView contentContainerStyle={styles.groupDetailsScrollContent}>
              {/* Group avatar + basic info */}
              <View style={styles.groupDetailsHeaderInfo}>
                <TouchableOpacity 
                  style={styles.groupDetailsAvatar}
                  onPress={() => showToast('Update image functionality coming soon', 'success')}
                >
                  <Text style={styles.groupDetailsAvatarText}>
                    {(group.name || 'GP').substring(0, 2).toUpperCase()}
                  </Text>
                  <View style={styles.avatarEditIcon}>
                    <Icon name="camera" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                
                {isEditingName ? (
                  <View style={styles.groupNameEditRow}>
                    <TextInput
                      style={styles.groupNameEditInput}
                      value={newName}
                      onChangeText={setNewName}
                      autoFocus
                      maxLength={30}
                    />
                    <TouchableOpacity onPress={handleUpdateName} disabled={isUpdating}>
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Icon name="check" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.groupNameRow}>
                    <Text style={styles.groupDetailsName}>{group.name}</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setNewName(group.name);
                        setIsEditingName(true);
                      }}
                    >
                      <Icon name="pencil" size={16} color={Colors.textSecondary} style={{marginLeft: 8}} />
                    </TouchableOpacity>
                  </View>
                )}

                {!!group.description && (
                  <Text style={styles.groupDetailsDescription}>{group.description}</Text>
                )}
              </View>

              {/* Join code section */}
              <View style={styles.groupDetailsSection}>
                <Text style={styles.groupDetailsSectionLabel}>Joining code</Text>
                <View style={styles.groupDetailsJoinRow}>
                  <View style={styles.groupDetailsJoinCodeBox}>
                    <Text style={styles.groupDetailsJoinCodeText}>{group.joinCode || '- - - -'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.groupDetailsIconButton}
                    onPress={handleCopyCode}
                  >
                    <Icon name="content-copy" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.groupDetailsIconButton}
                    onPress={handleShareCode}
                  >
                    <Icon name="share-variant" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Members list */}
              <View style={styles.groupDetailsSection}>
                <View style={styles.groupDetailsSectionHeader}>
                  <Text style={styles.groupDetailsSectionLabel}>
                    Members ({Array.isArray(group.members) ? group.members.filter((m: any) => m.isActive !== false).length : 0})
                  </Text>
                  <TouchableOpacity
                    style={styles.addMemberButton}
                    onPress={() => setShowAddMember(true)}
                  >
                    <Icon name="account-plus" size={20} color={Colors.primary} />
                    <Text style={styles.addMemberButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {Array.isArray(group.members) && group.members.length > 0 ? (
                  group.members
                    .filter((m: any) => m.isActive !== false)
                    .map((member: any) => {
                      const isRemoving = removingMemberId === member.user;
                      return (
                        <View key={member._id || member.phoneNumber} style={styles.groupDetailsMemberRow}>
                          <View style={styles.groupDetailsMemberAvatar}>
                            <Text style={styles.groupDetailsMemberAvatarText}>
                              {(member.name || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.groupDetailsMemberInfo}>
                            <Text style={styles.groupDetailsMemberName}>{member.name}</Text>
                            <Text style={styles.groupDetailsMemberMeta}>
                              {member.phoneNumber}
                              {member.role ? ` • ${renderMemberRole(member)}` : ''}
                            </Text>
                          </View>
                          {member.user && (
                            <TouchableOpacity
                              style={styles.removeMemberButton}
                              onPress={() => handleRemoveMember(member.user, member.name)}
                              disabled={isRemoving}
                            >
                              {isRemoving ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <Icon name="close-circle" size={24} color="#EF4444" />
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                ) : (
                  <Text style={styles.groupDetailsEmptyText}>No active members found.</Text>
                )}
              </View>

              {/* Group Actions Section */}
              <View style={styles.groupActionsSection}>
                <TouchableOpacity 
                  style={styles.groupDetailsActionRow} 
                  onPress={handleLeaveGroup}
                  disabled={isLeaving || isDeleting}
                >
                  <Icon name="logout" size={20} color="#EF4444" />
                  <Text style={[styles.groupDetailsActionText, {color: '#EF4444'}]}>
                    {isLeaving ? 'Leaving...' : 'Leave Group'}
                  </Text>
                </TouchableOpacity>

                {isUserAdmin && (
                  <TouchableOpacity 
                    style={[styles.groupDetailsActionRow, {borderBottomWidth: 0}]} 
                    onPress={handleDeleteGroup}
                    disabled={isLeaving || isDeleting}
                  >
                    <Icon name="delete" size={20} color="#EF4444" />
                    <Text style={[styles.groupDetailsActionText, {color: '#EF4444'}]}>
                      {isDeleting ? 'Deleting...' : 'Delete Group'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.groupDetailsLoadingContainer}>
              <Text style={styles.groupDetailsEmptyText}>Unable to load group details.</Text>
            </View>
          )}
        </View>
      </View>

      {/* Add Member Modal */}
      {group && (
        <AddMemberModal
          visible={showAddMember}
          onClose={() => setShowAddMember(false)}
          groupId={groupId}
          emergencyContacts={emergencyContacts}
          existingMembers={group.members || []}
          onMemberAdded={() => {
            // Refresh group details
            const fetchDetails = async () => {
              try {
                const response = await apiService.get(`/api/groups/${groupId}`);
                if (response && response.success && response.data) {
                  setGroup(response.data);
                }
              } catch (error) {
                console.error('Error refreshing group:', error);
              }
            };
            fetchDetails();
          }}
          showToast={showToast}
          showAlert={showAlert}
        />
      )}
    </Modal>
  );
};

const GroupsScreen: React.FC<{ onChatStateChange?: (isOpen: boolean) => void }> = ({ onChatStateChange }) => {
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showToast: showToastNotification, ToastComponent } = useToast();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactSelection, setShowContactSelection] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; message: string; joinCode?: string; groupName?: string }>({ visible: false, title: '', message: '' });
  const [activeTab, setActiveTab] = useState<'groups' | 'emergency'>('groups');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat' | 'contactSelection'>('main');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuth();

  // Group details modal state
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [groupDetailsId, setGroupDetailsId] = useState<string | null>(null);

  // Long-press / selection state for groups
  const [groupActionsVisible, setGroupActionsVisible] = useState(false);
  const [actionGroup, setActionGroup] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Emergency contact actions
  const [contactActionsVisible, setContactActionsVisible] = useState(false);
  const [actionContact, setActionContact] = useState<any | null>(null);
  const isDeletingContactRef = useRef(false);

  const [tabIndex, setTabIndex] = useState(0);
  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(searchAnim, {
      toValue: showSearch ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [showSearch]);
  const loadEmergencyContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await emergencyContactService.getEmergencyContacts();

      if (response && response.success) {
        // Handle paginated response structure from backend
        if (response.data && typeof response.data === 'object' && 'contacts' in response.data) {
          // Backend returns { data: { contacts: [...], pagination: {...} } }
          const contacts = (response.data as any).contacts;
          setEmergencyContacts(Array.isArray(contacts) ? contacts : []);
        } else if (Array.isArray(response.data)) {
          // Direct array response
          setEmergencyContacts(response.data);
        } else {
          // No contacts - normal empty state
          setEmergencyContacts([]);
        }
      } else {
        // If response is not successful, check if it's a genuine error
        // Only show error if there's a message indicating a real problem
        if (response && response.message && response.message !== 'No contacts found') {
          console.error('Failed to load emergency contacts:', response.message);
          // For now, just set empty array - user can retry if needed
          setEmergencyContacts([]);
        } else {
          // Normal empty state, no contacts yet
          setEmergencyContacts([]);
        }
      }
    } catch (error: any) {
      console.error('Error loading emergency contacts:', error);

      // Only log detailed error info, don't show alert
      // This prevents showing error alerts when user has no contacts yet
      // or when it's a network/server issue (which is expected during development)
      setEmergencyContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      console.log('Loading groups...');
      const response = await apiService.get('/api/groups');
      console.log('Groups response:', response);

      if (response && response.success && response.data) {
        // Backend returns { success: true, data: { groups: [...], pagination: {...} } }
        const groupsList = response.data.groups || [];
        console.log('Groups list:', groupsList);
        setGroups(Array.isArray(groupsList) ? groupsList : []);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEmergencyContacts(), loadGroups()]);
    setRefreshing(false);
  }, [loadEmergencyContacts, loadGroups]);

  useEffect(() => {
    loadEmergencyContacts();
    loadGroups();

    // Set up socket listeners for real-time group updates
    let socketInstance: any;
    const setupSocketListeners = async () => {
      try {
        socketInstance = await connectSocket();

        // Listen for new messages in any group
        const handleGroupMessage = (message: any) => {
          console.log('Received group message, refreshing groups list');
          // Refresh groups to update last message preview
          loadGroups();
        };

        const handleMessageSent = (message: any) => {
          console.log('Message sent, refreshing groups list');
          // Refresh groups to update last message preview
          loadGroups();
        };

        socketInstance.on('groupMessage', handleGroupMessage);
        socketInstance.on('messageSent', handleMessageSent);

        return () => {
          if (socketInstance) {
            socketInstance.off('groupMessage', handleGroupMessage);
            socketInstance.off('messageSent', handleMessageSent);
          }
        };
      } catch (error) {
        console.error('Error setting up socket listeners:', error);
      }
    };

    setupSocketListeners();

    return () => {
      if (socketInstance) {
        socketInstance.off('groupMessage');
        socketInstance.off('messageSent');
      }
    };
  }, [loadEmergencyContacts, loadGroups]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    showToastNotification(message, type);
  }, [showToastNotification]);

  const shareGroupCode = useCallback((code: string, name: string) => {
    const shareMessage = `Join my group "${name}" on SHEild!\n\nJoin Code: ${code}\n\nUse this code to join my group and stay safe together!`;

    Share.share({
      message: shareMessage,
      title: 'Join my SHEild Group',
    }).then(() => {
      showToast('Share initiated!', 'success');
    }).catch(() => {
      // User canceled
    });
  }, [showToast]);


  const handleAddFromContacts = () => {
    setShowAddModal(false);
    setCurrentScreen('contactSelection');
  };

  const handleCreateGroup = () => {
    setShowAddModal(false);
    setShowCreateGroup(true);
  };

  const handleJoinGroup = () => {
    setShowAddModal(false);
    setShowJoinGroup(true);
  };

  const handleCreateGroupPress = () => {
    // In selection mode, FAB is reserved for future bulk actions; ignore create.
    if (selectionMode) return;

    if (activeTab === 'groups') {
      setShowAddModal(true);
    } else {
      // Emergency contacts tab: open contact book directly
      setCurrentScreen('contactSelection');
    }
  };

  const handleTabSwitch = (tab: 'groups' | 'emergency') => {
    setActiveTab(tab);
    setTabIndex(tab === 'groups' ? 0 : 1);
  };

  const handleDeleteContact = async () => {
    if (!actionContact) return;

    try {
      await emergencyContactService.deleteEmergencyContact(actionContact._id);
      setEmergencyContacts(prev => prev.filter(c => c._id !== actionContact._id));
      setContactActionsVisible(false);
      setActionContact(null);
      showToast('Emergency contact deleted', 'success');
    } catch (error) {
      console.error('Error deleting contact:', error);
      showToast('Failed to delete contact', 'error');
    }
  };

  const handleGroupPress = (group: any) => {
    // Capture unread count before we potentially clear it in state
    const groupToOpen = { ...group };
    setSelectedGroup(groupToOpen);
    
    // Reset unread count locally for this group
    setGroups((prev) =>
      prev.map((g) => (g._id === group._id ? { ...g, unreadCount: 0 } : g)),
    );
    
    setCurrentScreen('chat');
    onChatStateChange?.(true);
  };

  const handleBackToMain = () => {
    setCurrentScreen('main');
    setSelectedGroup(null);
    onChatStateChange?.(false);
    loadGroups();
  };

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      if (showGroupDetails) {
        setShowGroupDetails(false);
        return true;
      }
      if (showAddModal) {
        setShowAddModal(false);
        return true;
      }
      if (currentScreen === 'chat') {
        handleBackToMain();
        return true;
      }
      if (currentScreen === 'contactSelection') {
        setCurrentScreen('main');
        return true;
      }
      if (showSearch) {
        setShowSearch(false);
        setSearchQuery('');
        return true;
      }
      if (selectionMode) {
        clearSelection();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showGroupDetails, showAddModal, currentScreen, showSearch, selectionMode, searchQuery, handleBackToMain]);

  // Selection helpers for groups
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedGroupIds([]);
  };

  const startSelectionMode = (group: any) => {
    if (!group || !group._id) return;
    setSelectionMode(true);
    setSelectedGroupIds((prev) => (prev.includes(group._id) ? prev : [...prev, group._id]));
    setGroupActionsVisible(false);
  };

  const confirmDeleteSelectedGroups = () => {
    if (selectedGroupIds.length === 0) {
      clearSelection();
      return;
    }

    showAlert(
      'Delete Groups',
      `Are you sure you want to delete ${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedGroupIds) {
                try {
                  await apiService.delete(`/api/groups/${id}`);
                } catch (error: any) {
                  console.error('Error deleting group', id, error);
                }
              }
              showToast('Selected groups deleted', 'success');
              clearSelection();
              loadGroups();
            } catch (error) {
              console.error('Error deleting selected groups:', error);
              showToast('Failed to delete some groups', 'error');
            }
          },
        },
      ],
      'delete',
      '#EF4444',
    );
  };

  const handleContactSelected = async (contact: EmergencyContact) => {
    console.log('handleContactSelected called with contact:', contact);
    setCurrentScreen('main');
    console.log('Loading emergency contacts to refresh...');

    // Refresh the list after adding a contact
    try {
      await loadEmergencyContacts();
      console.log('Emergency contacts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing contacts:', error);
      // Silently fail - user can manually refresh if needed
    }
  };



  // Search filtering per-tab
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const groupsToRender =
    !normalizedQuery || activeTab !== 'groups'
      ? groups
      : groups.filter((group) => {
        const name = (group.name || '').toLowerCase();
        const preview = (group.lastMessagePreview || '').toLowerCase();
        return name.includes(normalizedQuery) || preview.includes(normalizedQuery);
      });

  const emergencyContactsToRender =
    !normalizedQuery || activeTab !== 'emergency'
      ? emergencyContacts
      : emergencyContacts.filter((contact) => {
        const name = (contact.name || '').toLowerCase();
        const phone = (contact.phoneNumber || '').toLowerCase();
        const relationship = (contact.relationship || '').toLowerCase();
        return (
          name.includes(normalizedQuery) ||
          phone.includes(normalizedQuery) ||
          relationship.includes(normalizedQuery)
        );
      });

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Group Options</Text>

          <TouchableOpacity style={styles.modalOption} onPress={handleCreateGroup}>
            <Icon name="account-multiple-plus" size={24} color={Colors.primary} />
            <View style={styles.modalOptionText}>
              <Text style={styles.modalOptionTitle}>Create Group</Text>
              <Text style={styles.modalOptionSubtitle}>Create a new group chat</Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={handleJoinGroup}>
            <Icon name="login" size={24} color={Colors.primary} />
            <View style={styles.modalOptionText}>
              <Text style={styles.modalOptionTitle}>Join Group</Text>
              <Text style={styles.modalOptionSubtitle}>Join group with code</Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowAddModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const openGroupDetails = (group: any) => {
    if (!group || !group._id) return;
    setGroupDetailsId(group._id);
    setShowGroupDetails(true);
  };

  if (currentScreen === 'contactSelection') {
    return (
      <ContactSelectionScreen
        // @ts-ignore - compatible shape
        onContactSelected={handleContactSelected as any}
        onBack={() => setCurrentScreen('main')}
        mode="single"
      />
    );
  }

  // If we're in chat screen, render the chat component
  if (currentScreen === 'chat' && selectedGroup) {
    return (
      <>
        <GroupChatScreen
          key={selectedGroup._id}
          group={selectedGroup}
          onBack={handleBackToMain}
          onOpenGroupDetails={() => openGroupDetails(selectedGroup)}
          showAlert={showAlert}
        />
        {showGroupDetails && groupDetailsId && (
          <GroupDetailsModal
            visible={showGroupDetails}
            groupId={groupDetailsId}
            onClose={() => setShowGroupDetails(false)}
            onShareJoinCode={shareGroupCode}
            emergencyContacts={emergencyContacts}
            showToast={showToastNotification}
            showAlert={showAlert}
          />
        )}
        <AlertComponent />
      </>
    );
  }

  // Otherwise render the main screen
  return (
    <View style={styles.screenWrapper}>
      {/* Header */}
      <View style={styles.header}>
        {selectionMode ? (
          <View style={styles.selectionHeaderRow}>
            <TouchableOpacity onPress={clearSelection} style={styles.selectionHeaderIconButton}>
              <Icon name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedGroupIds.length} selected</Text>
            <TouchableOpacity
              onPress={confirmDeleteSelectedGroups}
              style={styles.selectionHeaderIconButton}
            >
              <Icon name="delete" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Trust Circle</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              style={styles.headerIconButton}
            >
              <Icon name={showSearch ? "close" : "magnify"} size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Segmented tabs - Groups / Emergency */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBackground}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
            onPress={() => handleTabSwitch('groups')}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'emergency' && styles.activeTab]}
            onPress={() => handleTabSwitch('emergency')}
          >
            <Text style={[styles.tabText, activeTab === 'emergency' && styles.activeTabText]}>Emergency Contacts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Search bar */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchAnim,
            zIndex: 2000,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          }
        ]}
      >
        <TouchableOpacity 
          style={{ padding: 8, marginLeft: -8 }} 
          onPress={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Icon name="magnify" size={20} color="rgba(255, 255, 255, 0.4)" />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'groups' ? 'Search groups...' : 'Search emergency contacts...'}
          placeholderTextColor={Colors.textLight}
          autoFocus={showSearch}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </Animated.View>

      <SlideView currentIndex={tabIndex} onIndexChange={setTabIndex} style={styles.slideViewContainer}>
        {/* Groups Tab Content */}
        <ScrollView
          style={[styles.scrollView, { width: SCREEN_WIDTH }]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={styles.groupListContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading groups...</Text>
              </View>
            ) : groupsToRender.length > 0 ? (
              groupsToRender.map((group) => {
                const avatarColors = ['#546E7A', '#5C6BC0', '#7E57C2', '#42A5F5', '#26A69A', '#66BB6A', '#FFA726', '#EF5350'];
                const avatarColor = avatarColors[group.name?.charCodeAt(0) % avatarColors.length || 0];
                const unreadCount = typeof group.unreadCount === 'number' ? group.unreadCount : 0;

                // Format last message preview based on message type
                let lastMessagePreview = '';
                let lastMessageIcon: string | null = null;

                if (group.lastMessage) {
                  // Show "You" if current user sent it, otherwise show sender name
                  const isOwnMessage = group.lastMessage.isOwn === true;
                  // Backend sends senderName directly, not nested in sender object
                  const fullSenderName = group.lastMessage.senderName || 'Someone';
                  const senderFirstName = fullSenderName.split(' ')[0] || fullSenderName;
                  const senderName = isOwnMessage ? 'You' : senderFirstName;
                  const messageType = group.lastMessage.messageType;

                  if (messageType === 'image') {
                    lastMessagePreview = `${senderName}: sent an image`;
                    lastMessageIcon = 'image';
                  } else if (messageType === 'location') {
                    lastMessagePreview = `${senderName}: sent a live location`;
                    lastMessageIcon = 'map-marker';
                  } else if (messageType === 'audio') {
                    lastMessagePreview = `${senderName}: sent an audio`;
                    lastMessageIcon = 'microphone';
                  } else {
                    // Text message
                    const messageText = group.lastMessage.text || '';
                    lastMessagePreview = `${senderName}: ${messageText}`;
                  }
                } else {
                  lastMessagePreview = group.lastMessagePreview ||
                    group.description ||
                    (group.joinCode ? `Join Code: ${group.joinCode}` : 'Start conversation');
                }

                const lastActivityTime = group.lastMessageAt || group.lastActivity || group.createdAt;
                const timeLabel = lastActivityTime
                  ? new Date(lastActivityTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                  : '';

                const handleGroupLongPress = () => {
                  ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                  setActionGroup(group);
                  setGroupActionsVisible(true);
                };

                const isSelected = selectedGroupIds.includes(group._id);

                return (
                  <TouchableOpacity
                    key={group._id}
                    style={styles.groupListItem}
                    onPress={() => (selectionMode ? toggleGroupSelection(group._id) : handleGroupPress(group))}
                    onLongPress={handleGroupLongPress}
                    delayLongPress={250}
                  >
                    {/* Group Avatar */}
                    <View style={styles.groupAvatarContainer}>
                      <View style={[styles.groupAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.groupAvatarText}>
                          {group.name?.substring(0, 2).toUpperCase() || 'GP'}
                        </Text>
                        {selectionMode && (
                          <View style={styles.groupCheckboxOverlay}>
                            <Icon
                              name={isSelected ? 'check-circle' : 'circle-outline'}
                              size={18}
                              color={isSelected ? Colors.primary : '#FFFFFF'}
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Group Info */}
                    <View style={styles.groupInfo}>
                      <View style={styles.groupHeader}>
                        <Text style={styles.groupName} numberOfLines={1}>
                          {group.name}
                        </Text>
                        <View style={styles.groupRightColumn}>
                          {!!timeLabel && (
                            <Text style={styles.groupTime}>{timeLabel}</Text>
                          )}
                          {unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadText}>{unreadCount}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.groupSubtitle}>
                        <View style={styles.groupLastMessageRow}>
                          {lastMessageIcon && (
                            <Icon
                              name={lastMessageIcon}
                              size={14}
                              color={Colors.textLight}
                              style={styles.groupLastMessageIcon}
                            />
                          )}
                          <Text style={styles.groupLastMessage} numberOfLines={1}>
                            {lastMessagePreview}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="account-group" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No groups yet</Text>
                <Text style={styles.emptyStateMessage}>
                  Create your first group to start chatting with friends
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleCreateGroupPress}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyStateButtonText}>Create Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Emergency Contact Tab Content */}
        <ScrollView
          style={[styles.scrollView, { width: SCREEN_WIDTH }]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={styles.emergencyListContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : emergencyContactsToRender.length > 0 ? (
              emergencyContactsToRender.map((contact) => {
                const avatarColors = ['#546E7A', '#5C6BC0', '#7E57C2', '#42A5F5', '#26A69A', '#66BB6A', '#FFA726', '#EF5350'];
                const avatarColor = avatarColors[contact.name?.charCodeAt(0) % avatarColors.length || 0];

                return (
                  <TouchableOpacity
                    key={contact._id}
                    style={styles.contactListItem}
                    delayLongPress={500}
                    onLongPress={() => {
                      ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                      setActionContact(contact);
                      setContactActionsVisible(true);
                    }}
                  >
                    {/* Contact Avatar */}
                    <View style={styles.contactAvatarContainer}>
                      <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.contactAvatarText}>
                          {contact.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    </View>

                    {/* Contact Info */}
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeader}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        {contact.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Icon name="star" size={12} color="#FFD700" />
                            <Text style={styles.primaryText}>Primary</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.contactSubtitle}>
                        <Text style={styles.contactLastMessage} numberOfLines={1}>
                          {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)} • {emergencyContactService.formatPhoneNumber(contact.phoneNumber)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="account-search" size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No emergency contacts</Text>
                <Text style={styles.emptyStateMessage}>
                  Add your first emergency contact to get started
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyStateButtonText}>Add Contact</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SlideView>

      {/* Group long-press actions modal */}
      {groupActionsVisible && actionGroup && (
        <Modal
          visible={groupActionsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGroupActionsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.groupActionsContent}>
              <Text style={styles.groupActionsTitle}>{actionGroup.name}</Text>

              <TouchableOpacity
                style={styles.groupActionsItem}
                onPress={() => {
                  setGroupActionsVisible(false);
                  showAlert('Edit Group', 'Editing group details will be available in a future update.', undefined, 'information', Colors.primary);
                }}
              >
                <Icon name="pencil" size={20} color={Colors.text} />
                <Text style={styles.groupActionsItemText}>Edit Group</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.groupActionsItem}
                onPress={() => {
                  setGroupActionsVisible(false);
                  showAlert(
                    'Delete Group',
                    'Are you sure you want to delete this group?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await apiService.delete(`/api/groups/${actionGroup._id}`);
                            showToast('Group deleted', 'success');
                            loadGroups();
                          } catch (error) {
                            console.error('Error deleting group:', error);
                            showToast('Failed to delete group', 'error');
                          }
                        },
                      },
                    ],
                    'delete',
                    '#EF4444',
                  );
                }}
              >
                <Icon name="delete" size={20} color="#EF4444" />
                <Text style={[styles.groupActionsItemText, { color: '#EF4444' }]}>Delete Group</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.groupActionsItem}
                onPress={() => {
                  startSelectionMode(actionGroup);
                }}
              >
                <Icon name="check-circle" size={20} color={Colors.text} />
                <Text style={styles.groupActionsItemText}>Select Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Emergency Contact Actions Modal */}
      {contactActionsVisible && actionContact && (
        <Modal
          visible={contactActionsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setContactActionsVisible(false);
            setActionContact(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setContactActionsVisible(false);
              setActionContact(null);
            }}
          >
            <View style={styles.groupActionsContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.groupActionsTitle}>{actionContact.name}</Text>

              <TouchableOpacity
                style={styles.groupActionsItem}
                onPress={() => {
                  // Prevent multiple presses
                  if (isDeletingContactRef.current) {
                    console.log('Already processing delete, ignoring');
                    return;
                  }

                  isDeletingContactRef.current = true;
                  const contactToDelete = actionContact;
                  setContactActionsVisible(false);
                  setActionContact(null);

                  // Small delay to ensure modal is closed before showing alert
                  setTimeout(() => {
                    showAlert(
                      'Delete Contact',
                      `Are you sure you want to delete ${contactToDelete.name} from your emergency contacts?`,
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                          onPress: () => {
                            isDeletingContactRef.current = false;
                          }
                        },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await emergencyContactService.deleteEmergencyContact(contactToDelete._id);
                              setEmergencyContacts(prev => prev.filter(c => c._id !== contactToDelete._id));
                              showToast('Emergency contact deleted', 'success');
                            } catch (error) {
                              console.error('Error deleting contact:', error);
                              showToast('Failed to delete contact', 'error');
                            } finally {
                              isDeletingContactRef.current = false;
                            }
                          }
                        }
                      ],
                      'delete',
                      '#EF4444',
                    );
                  }, 150);
                }}
              >
                <Icon name="delete" size={20} color="#EF4444" />
                <Text style={[styles.groupActionsItemText, { color: '#EF4444' }]}>Delete Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setContactActionsVisible(false);
                  setActionContact(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Floating action button for creating group, like Tolki new chat button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={handleCreateGroupPress}
        activeOpacity={0.85}
      >
        <Icon name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Group details modal when opened from main screen */}
      {showGroupDetails && groupDetailsId && (
        <GroupDetailsModal
          visible={showGroupDetails}
          groupId={groupDetailsId}
          onClose={() => setShowGroupDetails(false)}
          onShareJoinCode={shareGroupCode}
          emergencyContacts={emergencyContacts}
          showToast={showToastNotification}
          showAlert={showAlert}
        />
      )}

      {/* Modals */}
      {renderAddModal()}


      {showCreateGroup && (
        <CreateGroupModal
          visible={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onSuccess={() => {
            setShowCreateGroup(false);
            loadGroups();
          }}
          setSuccessModal={setSuccessModal}
          shareJoinCode={shareGroupCode}
          showToast={showToast}
          showAlert={showAlert}
        />
      )}

      {showJoinGroup && (
        <JoinGroupModal
          visible={showJoinGroup}
          onClose={() => setShowJoinGroup(false)}
          onSuccess={() => {
            setShowJoinGroup(false);
            loadGroups();
          }}
          showToast={showToast}
          showAlert={showAlert}
        />
      )}

      {/* Custom Alert Component */}
      <AlertComponent />


      {/* Toast Notification */}
      <ToastComponent />

      {/* Beautiful Success Modal */}
      {successModal.visible && (
        <Modal visible={successModal.visible} transparent animationType="fade">
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successModalIcon}>
                <Icon name="check-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.successModalTitle}>{successModal.title}</Text>
              <Text style={styles.successModalMessage}>{successModal.message}</Text>

              {successModal.joinCode && (
                <View style={styles.joinCodeContainer}>
                  <Text style={styles.joinCodeLabel}>Join Code:</Text>
                  <View style={styles.joinCodeBox}>
                    <Text style={styles.joinCodeText}>{successModal.joinCode}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => {
                        Clipboard.setString(successModal.joinCode || '');
                        showToast('Code copied to clipboard!', 'success');
                      }}
                    >
                      <Icon name="content-copy" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.successModalButtons}>
                {successModal.joinCode && (
                  <TouchableOpacity
                    style={styles.successModalButtonSecondary}
                    onPress={() => {
                      if (successModal.joinCode) {
                        shareGroupCode(successModal.joinCode, successModal.groupName || '');
                      }
                    }}
                  >
                    <Icon name="share-variant" size={20} color={Colors.primary} />
                    <Text style={styles.successModalButtonTextSecondary}>Share Code</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.successModalButtonPrimary}
                  onPress={() => {
                    setSuccessModal({ visible: false, title: '', message: '' });
                    loadGroups();
                  }}
                >
                  <Text style={styles.successModalButtonTextPrimary}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#09090B',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerIconButton: {
    padding: 8,
    marginRight: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  selectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionHeaderIconButton: {
    padding: 8,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
    paddingVertical: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  groupListContainer: {
    paddingTop: 8,
  },
  groupListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupAvatarContainer: {
    marginRight: 15,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  groupAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  groupCheckboxOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#09090B',
    borderRadius: 12,
    padding: 2,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  groupRightColumn: {
    alignItems: 'flex-end',
  },
  groupTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  groupSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupLastMessageIcon: {
    marginRight: 4,
  },
  groupLastMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalOptionText: {
    flex: 1,
    marginLeft: 15,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  modalCancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#09090B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  selectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionHeaderIconButton: {
    padding: 4,
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#09090B',
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 35, 0.98)',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  slideViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Increased to clear bottom navigation bar
  },
  emergencyListContainer: {
    backgroundColor: 'transparent',
  },
  contactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  contactAvatarContainer: {
    marginRight: 14,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  contactTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  },
  contactSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactLastMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
    fontWeight: '400',
  },
  groupListContainer: {
    backgroundColor: 'transparent',
  },
  groupListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupAvatarContainer: {
    marginRight: 12,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCheckboxOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupRightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginLeft: 8,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  groupTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  groupSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  groupLastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupLastMessageIcon: {
    marginRight: 4,
  },
  groupLastMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chatListContainer: {
    backgroundColor: '#09090B',
  },
  infoCard: {
    backgroundColor: Colors.primaryLight + '10',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  primaryText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpSection: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
  // New Modal Styles
  createGroupModalContent: {
    backgroundColor: '#09090B',
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  createGroupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  createGroupModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createGroupModalNext: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  createGroupForm: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  groupNameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupNameInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  groupImageUpload: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  participantsScroll: {
    marginTop: 8,
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  removeParticipant: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantModalContent: {
    backgroundColor: '#09090B',
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  participantModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  participantModalNext: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  participantSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  selectedParticipantsScroll: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  selectedParticipantItem: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  selectedParticipantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedParticipantAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedParticipantName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  removeSelectedParticipant: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipantsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addParticipantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  participantsList: {
    flex: 1,
  },
  participantListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  participantListItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantListItemAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantListItemName: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  participantCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupActionsContent: {
    padding: 20,
    marginHorizontal: 40,
    width: '80%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupActionsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupDetailsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupDetailsActionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  groupNameEditInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 8,
    minWidth: 150,
    textAlign: 'center',
  },
  groupActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  groupActionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  groupActionsItemText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalOptionText: {
    flex: 1,
    marginLeft: 15,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Message actions modal styles
  messageActionsContent: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  messageActionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  messageActionsItemText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text,
  },
  messageActionsItemDestructive: {
    color: '#EF4444',
  },
  messageActionsCancel: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  messageActionsCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  // Edit message modal styles
  editMessageContent: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  editMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  editMessageInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  editMessageButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  editMessageButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  editMessageButtonSecondaryText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  editMessageButtonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  editMessageButtonPrimaryText: {
    fontSize: 14,
    color: Colors.background,
    fontWeight: '600',
  },

  // Forward modal styles
  forwardModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 420,
  },
  forwardModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  forwardGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  forwardGroupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  forwardGroupAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forwardGroupInfo: {
    flex: 1,
  },
  forwardGroupName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  forwardGroupSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  forwardEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
  },

  modalCancelButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  groupModalContent: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  groupModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  groupModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  groupModalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupModalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  groupModalHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 5,
    fontStyle: 'italic',
  },
  groupModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  groupModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  groupModalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  groupModalButtonSecondary: {
    backgroundColor: Colors.secondary,
  },
  groupModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  groupModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastSuccess: {
    backgroundColor: '#10B981',
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successModalIcon: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  joinCodeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  joinCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  joinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  joinCodeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  successModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successModalButtonPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  successModalButtonSecondary: {
    flex: 1,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  successModalButtonTextPrimary: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  successModalButtonTextSecondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Chat Screen Styles - Reference design
  chatOuterWrapper: {
    flex: 1,
    backgroundColor: '#000000', // OLED black
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#000000', // OLED black
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#000000', // OLED black
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: '#000000', // OLED black
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark translucent for glassmorphism
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatHeaderAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  chatHeaderAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  chatHeaderTextContainer: {
    flex: 1,
  },
  chatGroupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatGroupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  chatGroupMembers: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  chatMenuButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginLeft: 4,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatActionButton: {
    padding: 8,
    marginLeft: 10,
  },
  chatMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  chatMenuContent: {
    marginTop: 60,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: '#18181B',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    minWidth: 200,
  },
  chatMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  chatMenuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  chatMenuItemDestructive: {
    marginTop: 4,
  },
  chatMenuItemDestructiveText: {
    color: '#EF4444',
  },
  chatSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#18181B',
    gap: 8,
  },
  chatSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  chatSearchClose: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#000000', // OLED black
  },
  messagesContainerHidden: {
    opacity: 0,
  },
  messagesContent: {
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  jumpToBottomFAB: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  jumpToBottomBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: Colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#1F2937',
  },
  jumpToBottomBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  ownMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  ownSenderName: {
    color: Colors.primary,
  },
  otherSenderName: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageHeaderTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  messageAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  mediaBubble: {
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    maxWidth: '100%',
  },
  ownMessageBubble: {
    backgroundColor: 'rgba(100, 100, 255, 0.2)', // Translucent primary for glassmorphism
    borderRadius: 20,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 255, 0.3)', // Subtle border
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  otherMessageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Translucent white for glassmorphism
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)', // Subtle border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: Colors.textSecondary,
  },
  selectedMessageBubble: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  imageBubbleContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    // Width and height will be set dynamically based on image dimensions
  },
  imageBubble: {
    // Default fallback dimensions (used while calculating actual size)
    width: 250,
    height: 250,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  // Audio message styles - Reference design
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
    maxWidth: 280,
    paddingVertical: 4,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  audioInfo: {
    flex: 1,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
    marginBottom: 2,
    gap: 2,
  },
  audioWaveBar: {
    width: 2.5,
    borderRadius: 1.5,
    minHeight: 4,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Recording indicator styles
  recordingButton: {
    backgroundColor: Colors.error + '20',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },


  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },

  // Location card styles - Square shape
  locationCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: LOCATION_PREVIEW_WIDTH,
  },
  locationMapContainer: {
    width: LOCATION_PREVIEW_WIDTH,
    height: LOCATION_PREVIEW_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  locationMap: {
    width: LOCATION_PREVIEW_WIDTH,
    height: LOCATION_PREVIEW_HEIGHT,
  },
  locationMapWebView: {
    width: LOCATION_PREVIEW_WIDTH,
    height: LOCATION_PREVIEW_HEIGHT,
    backgroundColor: '#E5E7EB',
  },
  locationFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  locationFallbackTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  locationFallbackCoords: {
    marginTop: 4,
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  locationFooterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationFooterBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  locationFooterHint: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  locationPinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimalPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalPinAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  minimalPinImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  minimalPinText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  minimalPinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -2,
  },

  messageInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark translucent for glassmorphism
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageInputIconButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Group details modal styles
  groupDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  groupDetailsContent: {
    maxHeight: '90%',
    backgroundColor: '#09090B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupDetailsBackButton: {
    padding: 6,
    marginRight: 8,
  },
  groupDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupDetailsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  groupDetailsHeaderInfo: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  groupDetailsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupDetailsAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  groupDetailsName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  groupDetailsDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  groupDetailsSection: {
    marginTop: 16,
  },
  groupDetailsSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  groupDetailsJoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDetailsJoinCodeBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupDetailsJoinCodeText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.primary,
  },
  groupDetailsIconButton: {
    padding: 8,
    marginLeft: 6,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
  },
  groupDetailsMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  groupDetailsMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  groupDetailsMemberAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  groupDetailsMemberInfo: {
    flex: 1,
  },
  groupDetailsMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groupDetailsMemberMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  removeMemberButton: {
    padding: 8,
    marginLeft: 8,
  },
  groupDetailsEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  groupDetailsLoadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupDetailsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(100, 100, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 255, 0.3)',
  },
  addMemberButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 4,
  },
  // Add Member Modal Styles
  addMemberModalContent: {
    width: '100%',
    height: '90%',
    backgroundColor: '#09090B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  addMemberModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  addMemberModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addMemberModalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addMemberModalDoneDisabled: {
    color: Colors.textLight,
  },
  addMemberSelectedBanner: {
    backgroundColor: Colors.primaryLight || '#E0E7FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addMemberSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  addMemberSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addMemberSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
    paddingVertical: 0,
  },
  addMemberList: {
    flex: 1,
  },
  addMemberEmptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  addMemberEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  addMemberEmptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  addMemberContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#09090B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  addMemberContactItemSelected: {
    backgroundColor: 'rgba(100, 100, 255, 0.1)',
  },
  addMemberContactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addMemberContactAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addMemberContactInfo: {
    flex: 1,
  },
  addMemberContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  addMemberContactPhone: {
    fontSize: 14,
    color: Colors.textLight,
  },
  addMemberCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMemberCheckboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  fabButton: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99,
  },
});

export default GroupsScreen;
