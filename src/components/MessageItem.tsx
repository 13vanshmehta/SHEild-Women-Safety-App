import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Colors } from '../constants';
import { GEOAPIFY_API_KEY } from '../constants/api';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface MessageItemProps {
  message: any;
  isOwn: boolean;
  isSelected: boolean;
  isSelectingMessages: boolean;
  onLongPress: () => void;
  onPress: () => void;
  onImagePress: (mediaUrl: string) => void;
  onAudioPress: (messageId: string, mediaUrl: string) => void;
  playingAudioId: string | null;
}

const MessageItem = React.memo<MessageItemProps>(({
  message,
  isOwn,
  isSelected,
  isSelectingMessages,
  onLongPress,
  onPress,
  onImagePress,
  onAudioPress,
  playingAudioId,
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderImageMessage = () => {
    if (!message.mediaUrl) return null;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        delayLongPress={500}
        onPress={() => onImagePress(message.mediaUrl)}
        onLongPress={() => {
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
          onLongPress();
        }}
        style={styles.imageBubbleContainer}
      >
        {!imageLoaded && (
          <View style={[styles.imageBubble, styles.imageLoading]}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        <Image
          source={{ uri: message.mediaUrl }}
          style={[styles.imageBubble, !imageLoaded && styles.imageHidden]}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => console.error('Image load error:', e.nativeEvent.error)}
        />
      </TouchableOpacity>
    );
  };

  const renderAudioMessage = () => {
    if (!message.mediaUrl) return null;

    const duration = message.duration || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const formattedDuration = duration > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : '0:00';

    const isPlaying = playingAudioId === message._id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onAudioPress(message._id, message.mediaUrl)}
        style={styles.audioMessageContainer}
      >
        <View
          style={[
            styles.audioPlayButton,
            {
              backgroundColor: isOwn
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(30,58,138,0.15)',
            },
          ]}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isOwn ? '#FFFFFF' : Colors.primary}
          />
        </View>
        <View style={styles.audioInfo}>
          <Text
            style={[
              styles.audioDuration,
              isOwn ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {formattedDuration}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocationMessage = () => {
    if (!message.location) return null;

    const { latitude, longitude } = message.location;
    
    const openInMaps = () => {
      const url = Platform.select({
        ios: `maps://maps.apple.com/?q=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      }) || `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      });
    };

    const mapUrl = `https://maps.geoapify.com/v1/staticmap?` +
      `style=osm-bright` +
      `&width=260` +
      `&height=180` +
      `&center=lonlat:${longitude},${latitude}` +
      `&zoom=15` +
      `&apiKey=${GEOAPIFY_API_KEY}`;

    const senderName = message.sender?.name || 'User';
    const senderInitials = senderName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={openInMaps}
        style={styles.locationCard}
      >
        <Image
          source={{ uri: mapUrl }}
          style={styles.locationMap}
          resizeMode="cover"
        />
        <View style={styles.locationPinContainer}>
          <View style={styles.locationPinPlaceholder}>
            <Text style={styles.locationPinText}>{senderInitials}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTextMessage = () => {
    return (
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
          isSelected && styles.selectedMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {message.text}
        </Text>
      </View>
    );
  };

  const renderMessageContent = () => {
    if (message.messageType === 'image') {
      return renderImageMessage();
    } else if (message.messageType === 'audio') {
      return renderAudioMessage();
    } else if (message.messageType === 'location') {
      return renderLocationMessage();
    } else {
      return renderTextMessage();
    }
  };

  return (
    <View
      style={[
        styles.messageWrapper,
        isOwn ? styles.ownMessageWrapper : styles.otherMessageWrapper,
      ]}
    >
      {/* Sender name and timestamp header */}
      <View style={styles.messageHeader}>
        {!isOwn && (
          <View style={styles.messageAvatar}>
            <Text style={styles.messageAvatarText}>
              {message.sender.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.messageSenderName,
            isOwn ? styles.ownSenderName : styles.otherSenderName,
          ]}
        >
          {isOwn ? 'You' : message.sender.name}
        </Text>
        <Text style={styles.messageHeaderTime}>
          {formatTime(message.timestamp)}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        delayLongPress={500}
        onLongPress={() => {
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
          onLongPress();
        }}
        onPress={() => {
          if (isSelectingMessages) {
            onPress();
          }
        }}
      >
        {renderMessageContent()}
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.mediaUrl === nextProps.message.mediaUrl &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectingMessages === nextProps.isSelectingMessages &&
    prevProps.playingAudioId === nextProps.playingAudioId
  );
});

const styles = StyleSheet.create({
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
  ownMessageBubble: {
    backgroundColor: '#5B7FFF',
    borderRadius: 16,
  },
  otherMessageBubble: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
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
  },
  imageLoading: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHidden: {
    position: 'absolute',
    opacity: 0,
  },
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
  audioDuration: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  locationCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    width: 260,
  },
  locationMap: {
    width: 260,
    height: 180,
  },
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
    overflow: 'hidden',
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
});

export default MessageItem;
