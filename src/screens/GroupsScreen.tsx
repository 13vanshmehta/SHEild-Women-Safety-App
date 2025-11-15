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
  Alert,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Clipboard from '@react-native-clipboard/clipboard';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
import { GEOAPIFY_API_KEY } from '../constants/api';

// Create Group Modal Component
const CreateGroupModal: React.FC<{ 
  visible: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  setSuccessModal: (modal: any) => void;
  shareJoinCode: (code: string, name: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ visible, onClose, onSuccess: _onSuccess, setSuccessModal, shareJoinCode: _shareJoinCode }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
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
        setGroupName('');
        setDescription('');
        
        // Show custom success modal
        setSuccessModal({
          visible: true,
          title: '🎉 Group Created!',
          message: `Your group "${createdGroupName}" has been created successfully!`,
          joinCode: joinCode,
          groupName: createdGroupName,
        });
      } else {
        Alert.alert('Error', response?.message || 'Failed to create group');
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create group';
      Alert.alert('Error', errorMessage);
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
}> = ({ visible, onClose, onSuccess }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
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
        Alert.alert('Error', response?.message || 'Invalid join code');
      }
    } catch (error: any) {
      console.error('Error joining group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to join group';
      Alert.alert('Unable to Join', errorMessage);
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

// Group Chat Screen Component - Rewritten with proper layout
const GroupChatScreen: React.FC<{ group: any; onBack: () => void; onOpenGroupDetails: () => void }> = ({ group, onBack, onOpenGroupDetails }) => {
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
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [inputHeight, setInputHeight] = useState(100); // Default height estimate

  useEffect(() => {
    // Clean up old cached media on chat mount
    cleanupOldMedia().catch((e) => console.warn('cleanupOldMedia failed', e));
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/groups/${group._id}/messages`);
      if (response && response.success && response.data && Array.isArray(response.data.messages)) {
        setMessages(response.data.messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
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

  // Audio: currently using a simple placeholder message; full recording/playback
  // will be integrated with a compatible native module in the future.

  const sendAudioPlaceholder = async () => {
    try {
      const socket = await connectSocket();
      socket.emit('sendGroupMessage', {
        groupId: group._id,
        messageType: 'audio',
        text: '🎤 Audio message',
      });
    } catch (error) {
      console.error('Error sending audio placeholder:', error);
    }
  };

  const requestMediaPermissionsIfNeeded = async (): Promise<boolean> => {
    try {
      const cameraStatus = await requestPermissionWithRationale('camera', {
        title: 'Camera access',
        message: 'SHEild needs camera access to take and send photos.',
        examples: ['Share photos with your trust circle'],
      });
      
      if (cameraStatus !== 'granted') {
        return false;
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
      console.log('No asset URI');
      return;
    }

    try {
      const formData = new FormData();
      const fileName = asset.fileName || `image-${Date.now()}.jpg`;
      const type = asset.type || 'image/jpeg';
      // @ts-ignore
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type,
      });
      formData.append('fileType', 'image');

      console.log('Uploading image to:', `/api/groups/${group._id}/media`);
      const uploadRes = await apiService.upload(`/api/groups/${group._id}/media`, formData);
      console.log('Upload response:', uploadRes);
      
      const mediaUrlRaw = uploadRes?.data?.mediaUrl;
      const mediaUrl = resolveMediaUrl(mediaUrlRaw);
      console.log('Resolved media URL:', mediaUrl);
      
      if (!mediaUrl) {
        Alert.alert('Error', 'Failed to upload image.');
        return;
      }

      const socket = await connectSocket();
      console.log('Sending image message via socket');
      socket.emit('sendGroupMessage', {
        groupId: group._id,
        messageType: 'image',
        mediaUrl,
      });
    } catch (error) {
      console.error('Error in uploadAndSendImage:', error);
      Alert.alert('Error', 'Failed to send image.');
    }
  };

  const handlePickImage = async () => {
    try {
      const hasPerm = await requestMediaPermissionsIfNeeded();
      if (!hasPerm) {
        Alert.alert('Permission required', 'Please allow camera and media access to send images.');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      await uploadAndSendImage(result.assets[0]);
    } catch (error) {
      console.error('Error picking/sending image:', error);
      Alert.alert('Error', 'Failed to send image.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const hasPerm = await requestMediaPermissionsIfNeeded();
      if (!hasPerm) {
        Alert.alert('Permission required', 'Please allow camera and media access to send images.');
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      await uploadAndSendImage(result.assets[0]);
    } catch (error) {
      console.error('Error capturing/sending image:', error);
      Alert.alert('Error', 'Failed to send captured image.');
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
          if (!message || message.groupId !== group._id) return;
          setMessages((prev) => [...prev, message]);
        };

        const handleSent = (message: any) => {
          if (!message || message.groupId !== group._id) return;
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
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  }, [messages.length]);

  // Filter messages for search
  const messagesToRender = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!isSearchMode || !normalized) {
      return messages;
    }
    return messages.filter((m: any) => {
      const text = (m.text || '').toLowerCase();
      const typeLabel = m.messageType || '';
      return text.includes(normalized) || typeLabel.includes(normalized);
    });
  }, [messages, isSearchMode, searchQuery]);

  // Auto-scroll to bottom when messages change (newest at bottom)
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

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

    Alert.alert(
      'Delete messages',
      `Are you sure you want to delete ${selectedMessageIds.length} message${
        selectedMessageIds.length > 1 ? 's' : ''
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
              Alert.alert('Error', 'Failed to delete some messages.');
            }
          },
        },
      ],
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
      Alert.alert('Error', 'Failed to delete message.');
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
      Alert.alert('Error', 'Message cannot be empty.');
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
      Alert.alert('Error', 'Failed to edit message.');
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
      Alert.alert('Error', 'Failed to load groups for forwarding.');
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
      Alert.alert('Error', 'Failed to forward message.');
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
    <SafeAreaView style={styles.chatContainer}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      
      {/* Chat Header - Purple theme like reference */}
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
            <Icon name="close" size={18} color={Colors.text} />
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
                Alert.alert('Leave group', 'Leaving group will be available in a future update from here.');
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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages - with bottom margin for input bar */}
        <View style={{ flex: 1, marginBottom: inputHeight }}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                // Scroll to bottom when content changes (new messages)
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {/* Render messages in normal order - old at top, new at bottom */}
              {messagesToRender.map((message, index) => {
                const isSelected = selectedMessageIds.includes(message._id);
                const previousMessage = index > 0 ? messagesToRender[index - 1] : null;
                const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                return (
                  <View key={message._id || index}>
                    {showDateSeparator && (
                      <View style={styles.dateSeparator}>
                        <Text style={styles.dateSeparatorText}>
                          {formatDate(message.timestamp)}
                        </Text>
                      </View>
                    )}
                    <View style={[
                      styles.messageWrapper,
                      message.isOwn ? styles.ownMessageWrapper : styles.otherMessageWrapper,
                    ]}>
                      {/* Sender name and timestamp header */}
                      <View style={styles.messageHeader}>
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
                          }
                        }}
                      >
                        {(message.messageType === 'location' || message.messageType === 'image') ? (
                          // Render media without wrapper View
                          <>
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
                            console.warn('Invalid location data:', message.location);
                            return (
                              <View style={styles.locationCard}>
                                <Text style={styles.messageText}>Invalid location data</Text>
                              </View>
                            );
                          }

                          const openInMaps = () => {
                            const url =
                              Platform.select({
                                ios: `maps://maps.apple.com/?q=${lat},${lng}`,
                                android: `geo:${lat},${lng}?q=${lat},${lng}`,
                              }) ||
                              `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

                            Linking.openURL(url).catch((err: any) => {
                              console.error('Failed to open maps for location message:', err);
                              // Fallback to web maps
                              Linking.openURL(
                                `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                              ).catch(() => {});
                            });
                          };

                          // Compute "live until" time (1 hour after message timestamp)
                          const messageDate = message.timestamp
                            ? new Date(message.timestamp)
                            : new Date();
                          const liveUntilDate = new Date(
                            messageDate.getTime() + 60 * 60 * 1000,
                          );
                          const liveUntil = liveUntilDate.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          });

                          const isLive = message.location?.isLive === true;

                          // Get Geoapify map URL WITHOUT marker
                          const style = 'osm-bright';
                          const mapUrl = `https://maps.geoapify.com/v1/staticmap?` +
                            `style=${style}` +
                            `&width=260` +
                            `&height=180` +
                            `&center=lonlat:${lng},${lat}` +
                            `&zoom=15` +
                            `&apiKey=${GEOAPIFY_API_KEY}`;

                          // Get sender info for avatar
                          const senderName = message.sender?.name || 'User';
                          const senderInitials = senderName.charAt(0).toUpperCase();
                          const senderProfilePicture = message.sender?.profilePicture || null;

                          return (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              delayLongPress={500}
                              onPress={openInMaps}
                              onLongPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                if (isSelectingMessages) {
                                  toggleMessageSelection(message._id);
                                } else {
                                  openMessageActions(message);
                                }
                              }}
                              style={styles.locationCard}
                            >
                              {/* Map without marker */}
                              <Image
                                source={{ uri: mapUrl }}
                                style={styles.locationMap}
                                resizeMode="cover"
                                onError={(error) => {
                                  console.warn('Failed to load Geoapify map:', error);
                                }}
                              />
                              {/* User profile photo as pin overlay */}
                              <View style={styles.locationPinContainer}>
                                {senderProfilePicture ? (
                                  <Image
                                    source={{ uri: senderProfilePicture }}
                                    style={styles.locationPinImage}
                                  />
                                ) : (
                                  <View style={styles.locationPinPlaceholder}>
                                    <Text style={styles.locationPinText}>{senderInitials}</Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        } catch (error) {
                          console.error('Error rendering location message:', error);
                          return (
                            <View style={styles.locationCard}>
                              <Text style={styles.messageText}>Unable to display location</Text>
                            </View>
                          );
                        }
                      })()
                    ) : message.messageType === 'audio' && message.mediaUrl ? (
                      (() => {
                        const duration = message.duration || 0;
                        const minutes = Math.floor(duration / 60);
                        const seconds = duration % 60;
                        const formattedDuration =
                          duration > 0
                            ? `${minutes}:${seconds.toString().padStart(2, '0')}`
                            : '0:00';

                        return (
                          <View style={styles.audioMessageContainer}>
                            <View
                              style={[
                                styles.audioPlayButton,
                                {
                                  backgroundColor: message.isOwn
                                    ? 'rgba(255,255,255,0.25)'
                                    : 'rgba(30,58,138,0.15)',
                                },
                              ]}
                            >
                              <Icon
                                name="microphone"
                                size={18}
                                color={message.isOwn ? '#FFFFFF' : Colors.primary}
                              />
                            </View>
                            <View style={styles.audioInfo}>
                              <Text
                                style={[
                                  styles.audioDuration,
                                  message.isOwn
                                    ? styles.ownMessageText
                                    : styles.otherMessageText,
                                ]}
                              >
                                {formattedDuration}
                              </Text>
                            </View>
                          </View>
                        );
                      })()
                    ) : message.messageType === 'image' && message.mediaUrl ? (
                      (() => {
                        const thumbUri = resolveMediaUrl(message.mediaUrl);
                        console.log('Image message - mediaUrl:', message.mediaUrl, 'resolved:', thumbUri);
                        if (!thumbUri) {
                          console.warn('No thumb URI for image');
                          return null;
                        }

                        const handleOpenViewer = async () => {
                          try {
                            setImageViewerLoading(true);
                            const remote = resolveMediaUrl(message.mediaUrl);
                            if (!remote) return;
                            const localPath = await getOrDownloadMedia(remote);
                            const finalUri = localPath.startsWith('file://')
                              ? localPath
                              : `file://${localPath}`;
                            setImageViewerUri(finalUri);
                            setImageViewerVisible(true);
                          } catch (e) {
                            console.error('Failed to open image viewer:', e);
                          } finally {
                            setImageViewerLoading(false);
                          }
                        };

                        console.log('Rendering image with URI:', thumbUri);
                        
                        return (
                          <TouchableOpacity
                            activeOpacity={0.9}
                            delayLongPress={500}
                            onPress={handleOpenViewer}
                            onLongPress={() => {
                              ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                              if (isSelectingMessages) {
                                toggleMessageSelection(message._id);
                              } else {
                                openMessageActions(message);
                              }
                            }}
                            style={styles.imageBubbleContainer}
                          >
                            <Image
                              source={{ uri: thumbUri }}
                              style={styles.imageBubble}
                              resizeMode="cover"
                              onError={(error) => {
                                console.error('Failed to load image:', error.nativeEvent.error);
                              }}
                              onLoad={() => {
                                console.log('Image loaded successfully');
                              }}
                            />
                          </TouchableOpacity>
                        );
                      })()
                    ) : null}
                          </>
                        ) : (
                          // Render text messages with styled View
                          <View
                            style={[
                              styles.messageBubble,
                              message.isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
                              isSelected && styles.selectedMessageBubble,
                            ]}
                          >
                            <Text
                              style={[
                                styles.messageText,
                                message.isOwn ? styles.ownMessageText : styles.otherMessageText,
                              ]}
                            >
                              {message.text}
                            </Text>
                          </View>
                        )}
                      </RNTouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
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
      <View 
        style={styles.messageInputContainer}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          setInputHeight(height);
        }}
      >
        <View style={styles.messageInputInner}>
          <TouchableOpacity
            style={styles.messageInputIconButton}
            onPress={async () => {
              const status: PermissionStatus = await requestPermissionWithRationale('microphone', {
                title: 'Microphone access',
                message:
                  'SHEild needs access to your microphone so you can record and send audio messages in group chats.',
                examples: ['Send a quick voice update to your trust circle'],
              });
              if (status === 'granted') {
                await sendAudioPlaceholder();
              }
            }}
          >
            <Icon
              name="microphone"
              size={20}
              color={Colors.textLight}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageInputIconButton} onPress={handlePickImage}>
            <Icon name="image" size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageInputIconButton} onPress={handleTakePhoto}>
            <Icon name="camera" size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageInputIconButton} onPress={sendLiveLocation}>
            <Icon name="map-marker" size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type here..."
            placeholderTextColor={Colors.textLight}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Icon name="send" size={20} color={Colors.background} />
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

interface GroupDetailsModalProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onShareJoinCode: (code: string, name: string) => void;
}

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ visible, groupId, onClose, onShareJoinCode }) => {
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any | null>(null);

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
      Alert.alert('Copied', 'Joining code copied to clipboard.');
    }
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
              <Icon name="arrow-left" size={22} color={Colors.text} />
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
                <View style={styles.groupDetailsAvatar}>
                  <Text style={styles.groupDetailsAvatarText}>
                    {(group.name || 'GP').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.groupDetailsName}>{group.name}</Text>
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
                <Text style={styles.groupDetailsSectionLabel}>
                  Members ({Array.isArray(group.members) ? group.members.filter((m: any) => m.isActive !== false).length : 0})
                </Text>

                {Array.isArray(group.members) && group.members.length > 0 ? (
                  group.members
                    .filter((m: any) => m.isActive !== false)
                    .map((member: any) => (
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
                      </View>
                    ))
                ) : (
                  <Text style={styles.groupDetailsEmptyText}>No active members found.</Text>
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
    </Modal>
  );
};

const GroupsScreen: React.FC<{ onChatStateChange?: (isOpen: boolean) => void }> = ({ onChatStateChange }) => {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactSelection, setShowContactSelection] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; message: string; joinCode?: string; groupName?: string }>({ visible: false, title: '', message: '' });
  const [activeTab, setActiveTab] = useState<'groups' | 'emergency'>('groups');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat' | 'contactSelection'>('main');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

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
  
  const [tabIndex, setTabIndex] = useState(0);
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
  }, [loadEmergencyContacts, loadGroups]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  }, []);

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
    // Reset unread count locally for this group as soon as user opens it
    setGroups((prev) =>
      prev.map((g) => (g._id === group._id ? { ...g, unreadCount: 0 } : g)),
    );
    setSelectedGroup(group);
    setCurrentScreen('chat');
    onChatStateChange?.(true);
  };

  const handleBackToMain = () => {
    setCurrentScreen('main');
    setSelectedGroup(null);
    onChatStateChange?.(false);
    // Refresh groups so unread counts and last message previews reflect
    // messages marked as read on the server while viewing the chat.
    loadGroups();
  };

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

    Alert.alert(
      'Delete groups',
      `Are you sure you want to delete ${selectedGroupIds.length} group${
        selectedGroupIds.length > 1 ? 's' : ''
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
          group={selectedGroup}
          onBack={handleBackToMain}
          onOpenGroupDetails={() => openGroupDetails(selectedGroup)}
        />
        {showGroupDetails && groupDetailsId && (
          <GroupDetailsModal
            visible={showGroupDetails}
            groupId={groupDetailsId}
            onClose={() => setShowGroupDetails(false)}
            onShareJoinCode={shareGroupCode}
          />
        )}
      </>
    );
  }

  // Otherwise render the main screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
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
          <Text style={styles.headerTitle}>Trust Circle</Text>
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

      {/* Search bar below tabs, filters within active tab */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'groups' ? 'Search groups...' : 'Search emergency contacts...'}
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

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
                  const senderName = isOwnMessage ? 'You' : (group.lastMessage.sender?.name || 'Someone');
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
                  Alert.alert('Edit group', 'Editing group details will be available in a future update.');
                }}
              >
                <Icon name="pencil" size={20} color={Colors.text} />
                <Text style={styles.groupActionsItemText}>Edit Group</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.groupActionsItem}
                onPress={() => {
                  setGroupActionsVisible(false);
                  Alert.alert(
                    'Delete group',
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
          onRequestClose={() => setContactActionsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.groupActionsContent}>
              <Text style={styles.groupActionsTitle}>{actionContact.name}</Text>
              
              <TouchableOpacity
                style={styles.groupActionsItem}
                onPress={() => {
                  setContactActionsVisible(false);
                  Alert.alert(
                    'Delete Contact',
                    `Are you sure you want to delete ${actionContact.name} from your emergency contacts?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: handleDeleteContact
                      }
                    ]
                  );
                }}
              >
                <Icon name="delete" size={20} color="#EF4444" />
                <Text style={[styles.groupActionsItemText, { color: '#EF4444' }]}>Delete Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setContactActionsVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
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
        />
      )}


      {/* Toast Notification */}
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Icon 
            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'} 
            size={24} 
            color="#FFFFFF" 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Main Trust Circle screen background
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
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
    paddingBottom: 8,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#E4E7FF',
    borderRadius: 999,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FB',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 0,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text,
  },
  slideViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emergencyListContainer: {
    backgroundColor: 'transparent',
  },
  contactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#4B5563',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  contactAvatarContainer: {
    marginRight: 12,
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
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  contactTime: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '400',
  },
  contactSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactLastMessage: {
    fontSize: 14,
    color: Colors.textLight,
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
    paddingVertical: 12,
    marginBottom: 4, // small space between groups
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
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
    color: Colors.textLight,
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
    fontWeight: '600',
  },
  chatListContainer: {
    backgroundColor: '#FFFFFF',
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
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
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
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: Colors.textLight,
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
    color: Colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
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
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  createGroupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createGroupModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupNameInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000000',
  },
  groupImageUpload: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#000000',
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
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  participantModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  participantModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  participantModalNext: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  participantSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000000',
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
    color: '#000000',
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
    color: '#000000',
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
    color: '#000000',
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
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
  },
  groupActionsContent: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 40,
    width: '80%',
    maxWidth: 340,
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
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 420,
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
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 420,
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
    color: Colors.text,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
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
  chatContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary, // Purple/blue theme
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chatHeaderAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  chatHeaderAvatarText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderTextContainer: {
    flex: 1,
  },
  chatGroupName: {
    fontSize: 17,
    fontWeight: '600',
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
    color: 'rgba(255,255,255,0.9)',
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
    borderRadius: 12,
    backgroundColor: Colors.background,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 190,
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
    color: Colors.text,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
    backgroundColor: Colors.background,
    gap: 8,
  },
  chatSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  chatSearchClose: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesContent: {
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  ownMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  messageSenderName: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  ownSenderName: {
    color: Colors.primary,
  },
  otherSenderName: {
    color: Colors.text,
  },
  messageHeaderTime: {
    fontSize: 11,
    color: Colors.textSecondary,
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
    backgroundColor: '#5B7FFF', // Blue for sent messages
    borderRadius: 16,
  },
  otherMessageBubble: {
    backgroundColor: '#F0F0F0', // Light gray for received messages
    borderRadius: 16,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: Colors.text,
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
  },
  imageBubble: {
    width: 260,
    height: 180,
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
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginRight: 6,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
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
    width: 260,
  },
  locationMapContainer: {
    width: 260,
    height: 180,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  locationMap: {
    width: 260,
    height: 180,
  },
  // User profile photo as pin overlay (centered on map)
  locationPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    marginLeft: -25,
    marginTop: -25,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    overflow: 'hidden',
  },
  locationPinImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  locationPinPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPinText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  messageInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.primary, // Purple/blue theme
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  messageInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  messageInputIconButton: {
    padding: 6,
    marginHorizontal: 2,
  },
  messageInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fabButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },

  // Group details modal styles
  groupDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  groupDetailsContent: {
    maxHeight: '90%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  groupDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  },
  groupDetailsBackButton: {
    padding: 6,
    marginRight: 8,
  },
  groupDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
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
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  groupDetailsDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  groupDetailsSection: {
    marginTop: 16,
  },
  groupDetailsSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  groupDetailsJoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDetailsJoinCodeBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  groupDetailsJoinCodeText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
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
    fontWeight: '500',
    color: Colors.text,
  },
  groupDetailsMemberMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
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
});

export default GroupsScreen;
