import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Colors } from '../constants';
import { getGeoapifyMapUrl } from '../services/geoapifyMapService';

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
  const [mapLoading, setMapLoading] = React.useState(true);

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
      // Use Google Maps deep link for navigation and better UX
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${message.sender?.name || 'Location'})`,
        default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      });
      
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open Maps:', err);
        // Fallback to web URL
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      });
    };

    const mapUrl = getGeoapifyMapUrl(latitude, longitude, 260, 180, 15);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={openInMaps}
        style={styles.locationCard}
      >
        <View style={styles.locationMapContainer}>
          {mapLoading && (
            <View style={styles.locationLoadingOverlay}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.locationLoadingText}>Loading location...</Text>
            </View>
          )}
          <Image
            source={{ uri: mapUrl }}
            style={[styles.locationMap, mapLoading && { opacity: 0 }]}
            resizeMode="cover"
            onLoad={() => setMapLoading(false)}
          />
          {!mapLoading && (
            <View style={styles.locationPinOverlay}>
              <View style={styles.minimalPinContainer}>
                <View style={styles.minimalPinAvatar}>
                  <Text style={styles.minimalPinText}>
                    {(message.sender?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.minimalPinPointer} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.locationFooter}>
          <Icon name="google-maps" size={16} color={Colors.textSecondary} />
          <Text style={styles.locationFooterText}>View in Google Maps</Text>
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
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    width: 260,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationMapContainer: {
    width: 260,
    height: 180,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationMap: {
    width: 260,
    height: 180,
  },
  locationLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationLoadingText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 8,
    fontWeight: '600',
  },
  locationPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationFooterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
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
});

export default MessageItem;
