import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
  PermissionsAndroid,
  ScrollView,
  TextInput,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';
import { apiService } from '../services/apiService';
import voiceSafetyService from '../services/voiceSafetyService';
import voiceStateService from '../services/voiceStateService';

// Lazy imports for native modules (will be null if not properly linked)
let NetInfo: any = null;
let DeviceInfo: any = null;
let Geolocation: any = null;

try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('NetInfo not available:', e);
}

try {
  DeviceInfo = require('react-native-device-info').default;
} catch (e) {
  console.warn('DeviceInfo not available:', e);
}

try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  console.warn('Geolocation not available:', e);
}

const SOSScreen: React.FC = () => {
  const [isActivating, setIsActivating] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [emergencyContactCount, setEmergencyContactCount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [keywords, setKeywords] = useState<string[]>(['help']);
  const [keywordInput, setKeywordInput] = useState('');
  
  const countdownTimerRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const voicePulseAnim = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkEmergencyContacts();
    collectDeviceInfo();
    requestLocationPermission();
    
    // Load saved voice state and restore if it was enabled
    loadVoiceState();
    
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Cleanup voice service on unmount
    return () => {
      subscription.remove();
      if (isVoiceListening) {
        // Save state before unmounting
        voiceStateService.saveState({
          isEnabled: true,
          keywords: keywords,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAppStateChange = (nextAppState: any) => {
    console.log('📱 App State Changed:', appState.current, '->', nextAppState);
    
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      console.log('📱 App came to FOREGROUND');
      if (isVoiceListening) {
        console.log('🎤 Voice listening was active, ensuring it continues...');
        // Voice service should continue, just log for monitoring
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      console.log('📱 App went to BACKGROUND');
      if (isVoiceListening) {
        console.log('🎤 Voice listening active - will continue in background with audio mode');
        // Keep voice listening active in background
      }
    }
    
    appState.current = nextAppState;
  };

  // Restart voice listening when keywords change
  useEffect(() => {
    if (isVoiceListening && keywords.length > 0) {
      // Stop and restart with new keywords
      const restartListening = async () => {
        console.log('🔄 Restarting voice listening with new keywords:', keywords);
        await voiceSafetyService.stopListening();
        
        const started = await voiceSafetyService.startListening({
          keywords: keywords,
          locale: 'en-US',
          onKeywordDetected: (keyword, fullText) => {
            console.log('🚨 EMERGENCY KEYWORD DETECTED:', keyword);
            console.log('🚨 Full text:', fullText);
            triggerSOSAlert();
          },
          onError: (error) => {
            console.error('Voice recognition error:', error);
            setIsVoiceListening(false);
            Alert.alert(
              'Voice Recognition Error',
              'Failed to start voice recognition. Please check microphone permissions in Settings.'
            );
          },
        });
        
        if (!started) {
          setIsVoiceListening(false);
        }
      };
      restartListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (showCountdown && countdown === 0) {
      triggerSOSAlert();
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [showCountdown, countdown]);

  const checkEmergencyContacts = async () => {
    try {
      const response = await apiService.get('/api/emergency-contacts');
      if (response.success && response.data && response.data.contacts) {
        // API returns data.contacts array
        const activeContacts = response.data.contacts.filter((c: any) => c.isActive);
        setEmergencyContactCount(activeContacts.length);
      } else {
        console.log('No emergency contacts found');
        setEmergencyContactCount(0);
      }
    } catch (error) {
      console.error('Error checking emergency contacts:', error);
      setEmergencyContactCount(0);
    }
  };

  const collectDeviceInfo = async () => {
    try {
      let batteryLevel = 0;
      let deviceModel = 'Unknown';
      let osVersion = 'Unknown';
      let networkStatus = 'unknown';

      if (DeviceInfo) {
        try {
          batteryLevel = await DeviceInfo.getBatteryLevel();
          deviceModel = DeviceInfo.getModel();
          osVersion = DeviceInfo.getSystemVersion();
        } catch (e) {
          console.warn('DeviceInfo error:', e);
        }
      }

      if (NetInfo) {
        try {
          const netInfo = await NetInfo.fetch();
          if (!netInfo.isConnected) {
            networkStatus = 'offline';
          } else {
            // Determine network strength based on connection details
            const details = netInfo.details as any;
            if (netInfo.type === 'wifi' && details?.strength) {
              // WiFi strength (0-100)
              const strength = details.strength;
              if (strength >= 70) networkStatus = 'strong';
              else if (strength >= 40) networkStatus = 'moderate';
              else networkStatus = 'weak';
            } else if (netInfo.type === 'cellular' && details?.cellularGeneration) {
              // Cellular generation (2g, 3g, 4g, 5g)
              const gen = details.cellularGeneration;
              if (gen === '5g' || gen === '4g') networkStatus = 'strong';
              else if (gen === '3g') networkStatus = 'moderate';
              else networkStatus = 'weak';
            } else {
              // Default to moderate if we can't determine
              networkStatus = 'moderate';
            }
          }
        } catch (e) {
          console.warn('NetInfo error:', e);
        }
      }

      setDeviceInfo({
        batteryLevel: Math.round(batteryLevel * 100),
        networkStatus,
        deviceModel,
        osVersion,
      });
    } catch (error) {
      console.error('Error collecting device info:', error);
      // Set default values if collection fails
      setDeviceInfo({
        batteryLevel: 0,
        networkStatus: 'unknown',
        deviceModel: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
        osVersion: Platform.Version.toString(),
      });
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'SHEild needs access to your location for SOS alerts',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } else {
        // iOS: Request location permission
        if (Geolocation) {
          try {
            const authStatus = await Geolocation.requestAuthorization('whenInUse');
            console.log('iOS Location authorization status:', authStatus);
            
            if (authStatus === 'granted' || authStatus === 'whenInUse') {
              getCurrentLocation();
            } else {
              console.warn('Location permission denied:', authStatus);
              Alert.alert(
                'Location Permission Required',
                'Please enable location services in Settings to use SOS features.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Settings', 
                    onPress: () => {
                      if (Geolocation?.openSettings) {
                        Geolocation.openSettings();
                      }
                    }
                  }
                ]
              );
            }
          } catch (error) {
            console.error('Error requesting iOS location permission:', error);
            getCurrentLocation(); // Try anyway
          }
        } else {
          getCurrentLocation();
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!Geolocation) {
      console.warn('Geolocation not available');
      Alert.alert(
        'Location Error',
        'Unable to access location services. Please check if location services are enabled in your device settings.'
      );
      // Set a default location for testing
      setLocation({
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 0,
      });
      return;
    }

    Geolocation.getCurrentPosition(
      (position: any) => {
        console.log('Location obtained successfully:', position.coords);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error: any) => {
        console.error('Error getting location:', error);
        
        let locationErrorMessage = 'Unable to get your current location.';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            locationErrorMessage = 'Location permission denied. Please enable location services in Settings.';
            break;
          case 2: // POSITION_UNAVAILABLE
            locationErrorMessage = 'Location information is unavailable. Please check your GPS settings.';
            break;
          case 3: // TIMEOUT
            locationErrorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            locationErrorMessage = error.message || 'Unable to get your current location. Please make sure location services are enabled.';
        }
        
        Alert.alert('Location Error', locationErrorMessage);
        
        // Set a default location if error
        setLocation({
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: 0,
        });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 20000, 
        maximumAge: 10000,
        showLocationDialog: true, // This helps on Android
        forceRequestLocation: true, // Force location request
      }
    );
  };

  const handleSOSPress = () => {
    // Check if user has at least 2 emergency contacts
    if (emergencyContactCount < 2) {
      Alert.alert(
        'Emergency Contacts Required',
        `You need to add at least 2 emergency contacts before using SOS. You currently have ${emergencyContactCount} contact(s).`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Add Contacts',
            onPress: () => {
              // Navigate to emergency contacts screen
              // navigation.navigate('EmergencyContacts');
            },
          },
        ]
      );
      return;
    }

    // Check if location is available
    if (!location) {
      Alert.alert(
        'Location Required',
        'Please enable location services to use SOS feature.',
        [{ text: 'OK' }]
      );
      getCurrentLocation();
      return;
    }

    // Start countdown
    setShowCountdown(true);
    setCountdown(5);
    startPulseAnimation();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const cancelSOS = () => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
    setShowCountdown(false);
    setCountdown(5);
    scaleAnim.setValue(1);
  };

  const triggerSOSAlert = async () => {
    setShowCountdown(false);
    setIsActivating(true);
    scaleAnim.setValue(1);

    try {
      // Get fresh location
      getCurrentLocation();
      await collectDeviceInfo();

      console.log('📤 Sending SOS alert...', {
        location,
        deviceInfo,
      });

      const response = await apiService.post('/api/sos/trigger', {
        location: location || { latitude: 0, longitude: 0, address: 'Location unavailable' },
        deviceInfo,
        triggerMode: 'manual_button',
      });

      console.log('📥 SOS response:', response);

      if (response.success) {
        // Show custom success modal instead of default alert
        setShowSuccessModal(true);
        setNotificationCount(response.notificationsSent || 0);

        // Start monitoring location for offline/online updates
        if (response.alertId) {
          startLocationMonitoring(response.alertId);
        }
      } else {
        // Show custom error modal
        setErrorMessage(response.message || 'Failed to send SOS alert');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error('Error triggering SOS:', error);
      // Show custom error modal
      setErrorMessage(error.message || 'Failed to send SOS alert. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsActivating(false);
    }
  };

  const startLocationMonitoring = (alertId: string) => {
    if (!NetInfo || !Geolocation) {
      console.warn('Location monitoring not available - native modules not linked');
      return;
    }

    try {
      let lastNetworkStatus: boolean | null = null;
      let offlineStartTime: number | null = null;
      const OFFLINE_THRESHOLD = 60000; // 1 minute offline before notifying

      // Monitor network status changes
      const unsubscribe = NetInfo.addEventListener((state: any) => {
        const isConnected = state.isConnected;
        
        // Only update if status actually changed
        if (lastNetworkStatus !== null && lastNetworkStatus !== isConnected) {
          if (!isConnected) {
            // Device went offline
            offlineStartTime = Date.now();
            console.log('📴 Device went offline');
            
            // Get last known location and send offline notification
            Geolocation.getCurrentPosition(
              (position: any) => {
                updateLocationStatus(alertId, true, {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                });
              },
              (error: any) => {
                console.error('Error getting offline location:', error);
                // Use last known location if available
                if (location) {
                  updateLocationStatus(alertId, true, location);
                }
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            );
          } else if (offlineStartTime) {
            // Device came back online
            const offlineDuration = Date.now() - offlineStartTime;
            
            // Only notify if device was offline for more than threshold
            if (offlineDuration >= OFFLINE_THRESHOLD) {
              console.log(`📶 Device back online (was offline for ${Math.round(offlineDuration / 1000)}s)`);
              
              // Get current location and send online notification
              Geolocation.getCurrentPosition(
                (position: any) => {
                  updateLocationStatus(alertId, false, {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                  });
                },
                (error: any) => console.error('Error getting online location:', error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
              );
            } else {
              console.log(`📶 Device back online (brief disconnect, no notification)`);
            }
            
            offlineStartTime = null;
          }
        }
        
        lastNetworkStatus = isConnected;
      });

      // Update location silently every 2 minutes (no notifications)
      // This is just for tracking, not for sending alerts
      const locationInterval = setInterval(() => {
        if (lastNetworkStatus === true) {
          // Only update if online, and don't send notifications
          Geolocation.getCurrentPosition(
            (position: any) => {
              // Just update local state, don't send to backend
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (error: any) => console.error('Location update error:', error),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        }
      }, 120000); // Every 2 minutes

      // Clean up after 1 hour
      setTimeout(() => {
        unsubscribe();
        clearInterval(locationInterval);
        console.log('🛑 Location monitoring stopped');
      }, 3600000);
      
      console.log('✅ Location monitoring started');
    } catch (error) {
      console.error('Error starting location monitoring:', error);
    }
  };

  const updateLocationStatus = async (
    alertId: string,
    isOffline: boolean,
    newLocation?: any
  ) => {
    try {
      await apiService.post('/api/sos/update-location', {
        alertId,
        location: newLocation || location,
        isOffline,
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed.toLowerCase())) {
      setKeywords([...keywords, trimmed.toLowerCase()]);
      setKeywordInput('');
    } else if (keywords.includes(trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This keyword already exists.');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const loadVoiceState = async () => {
    try {
      const savedState = await voiceStateService.loadState();
      if (savedState && savedState.isEnabled && savedState.keywords.length > 0) {
        console.log('📂 Restoring voice listening from saved state');
        setKeywords(savedState.keywords);
        // Auto-start voice listening with saved keywords
        setTimeout(() => {
          startVoiceListeningWithKeywords(savedState.keywords);
        }, 1000); // Delay to ensure all components are mounted
      }
    } catch (error) {
      console.error('Error loading voice state:', error);
    }
  };

  const startVoiceListeningWithKeywords = async (keywordsToUse: string[]) => {
    try {
      if (keywordsToUse.length === 0) {
        Alert.alert('No Keywords', 'Please add at least one keyword to listen for.');
        return;
      }

      const started = await voiceSafetyService.startListening({
        keywords: keywordsToUse,
        locale: 'en-US',
        onKeywordDetected: (keyword, fullText) => {
          console.log('🚨 EMERGENCY KEYWORD DETECTED:', keyword);
          console.log('🚨 Full text:', fullText);
          triggerSOSAlert();
        },
        onError: (error) => {
          console.error('Voice recognition error:', error);
          setIsVoiceListening(false);
          voiceStateService.clearState();
          Alert.alert(
            'Voice Recognition Error',
            'Failed to start voice recognition. Please check microphone permissions in Settings.'
          );
        },
      });

      if (started) {
        setIsVoiceListening(true);
        startVoicePulseAnimation();
        // Save state
        voiceStateService.saveState({
          isEnabled: true,
          keywords: keywordsToUse,
        });
      }
    } catch (error) {
      console.error('Error starting voice listening:', error);
      Alert.alert('Error', 'Failed to start voice recognition');
    }
  };

  const startVoiceListening = async () => {
    await startVoiceListeningWithKeywords(keywords);
  };

  const stopVoiceListening = async () => {
    try {
      await voiceSafetyService.stopListening();
      setIsVoiceListening(false);
      voicePulseAnim.setValue(1);
      // Clear saved state when user manually stops
      await voiceStateService.clearState();
      console.log('🛑 Voice listening stopped and state cleared');
    } catch (error) {
      console.error('Error stopping voice listening:', error);
    }
  };

  const startVoicePulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(voicePulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(voicePulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Emergency SOS</Text>
            <Text style={styles.headerSubtitle}>
              {emergencyContactCount >= 2
                ? `${emergencyContactCount} emergency contacts ready`
                : `Add ${2 - emergencyContactCount} more contact(s)`}
            </Text>
          </View>

        {/* Voice Safety Mode Section */}
        <View style={styles.voiceSafetySection}>
          <View style={styles.voiceSafetyHeader}>
            <Icon name="microphone" size={24} color={Colors.primary} />
            <Text style={styles.voiceSafetyTitle}>Voice Safety Mode</Text>
          </View>
          
          <Text style={styles.voiceSafetyDescription}>
            Add keywords that will trigger SOS when spoken
          </Text>

          {/* Keywords Chips Display */}
          <View style={styles.keywordsChipsContainer}>
            {keywords.map((keyword, index) => (
              <View key={index} style={styles.keywordChip}>
                <Text style={styles.keywordChipText}>{keyword}</Text>
                <TouchableOpacity 
                  onPress={() => removeKeyword(keyword)}
                  disabled={isVoiceListening}
                  style={styles.keywordRemoveButton}
                >
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Add Keyword Input */}
          <View style={styles.keywordInputContainer}>
            <TextInput
              style={styles.keywordInput}
              value={keywordInput}
              onChangeText={setKeywordInput}
              placeholder="Type a keyword..."
              placeholderTextColor={Colors.textSecondary}
              editable={!isVoiceListening}
              onSubmitEditing={addKeyword}
              returnKeyType="done"
            />
            <TouchableOpacity 
              onPress={addKeyword}
              disabled={!keywordInput.trim() || isVoiceListening}
              style={[
                styles.addKeywordButton,
                (!keywordInput.trim() || isVoiceListening) && styles.addKeywordButtonDisabled
              ]}
            >
              <Icon 
                name="send" 
                size={20} 
                color={!keywordInput.trim() || isVoiceListening ? '#CCC' : Colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {isVoiceListening && (
            <Text style={styles.activeKeywordsText}>
              🎤 Listening for: {keywords.join(', ')}
            </Text>
          )}

          <Animated.View style={{ transform: [{ scale: voicePulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isVoiceListening && styles.voiceButtonActive
              ]}
              onPress={isVoiceListening ? stopVoiceListening : startVoiceListening}
              activeOpacity={0.8}
            >
              <Icon 
                name={isVoiceListening ? 'microphone' : 'microphone-off'}
                size={32}
                color="#FFFFFF"
              />
              <Text style={styles.voiceButtonText}>
                {isVoiceListening ? 'Stop Listening' : 'Start Listening'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {isVoiceListening && (
            <View style={styles.listeningIndicator}>
              <View style={styles.listeningDot} />
              <Text style={styles.listeningText}>Actively listening for emergency keywords</Text>
            </View>
          )}
        </View>

        {/* SOS Button - Reduced Size */}
        <View style={styles.sosButtonContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleSOSPress}
            disabled={isActivating}
            activeOpacity={0.8}
          >
            {isActivating ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="alarm-light" size={60} color="#FFFFFF" />
                <Text style={styles.sosText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>Tap for instant SOS alert</Text>
        <Text style={styles.description}>
          Emergency services and your trusted contacts will be notified with your
          location and device information.
        </Text>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Icon name="battery" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>
              Battery: {deviceInfo?.batteryLevel || 0}%
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="signal" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>
              Network: {deviceInfo?.networkStatus || 'Unknown'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>
              Location: {location ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Countdown Modal */}
      <Modal
        visible={showCountdown}
        transparent
        animationType="fade"
        onRequestClose={cancelSOS}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Animated.View
              style={[
                styles.countdownCircle,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Text style={styles.countdownText}>{countdown}</Text>
            </Animated.View>

            <Text style={styles.modalTitle}>Sending SOS Alert</Text>
            <Text style={styles.modalDescription}>
              Emergency alert will be sent in {countdown} seconds
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelSOS}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.continueButton]}
                onPress={() => {
                  setCountdown(0);
                }}
              >
                <Text style={styles.continueButtonText}>Send Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Icon name="check-circle" size={80} color="#4CAF50" />
            </View>

            <Text style={styles.modalTitle}>SOS Alert Sent!</Text>
            <Text style={styles.modalDescription}>
              Emergency alert has been sent to {notificationCount} recipient(s).
              {'\n\n'}
              Your emergency contacts and trust circle groups have been notified.
              {'\n\n'}
              Help is on the way!
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.successButton]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.continueButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIcon}>
              <Icon name="alert-circle" size={80} color={Colors.error} />
            </View>

            <Text style={styles.modalTitle}>Alert Failed</Text>
            <Text style={styles.modalDescription}>
              {errorMessage}
              {'\n\n'}
              Please try again or contact emergency services directly.
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.continueButton]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.continueButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  voiceDescriptionContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  voiceDescriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  voiceSafetySection: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceSafetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceSafetyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 10,
  },
  voiceSafetyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  keywordsChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EAF6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  keywordChipText: {
    fontSize: 14,
    color: '#3F51B5',
    fontWeight: '600',
    marginRight: 8,
  },
  keywordRemoveButton: {
    padding: 2,
  },
  keywordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  keywordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  addKeywordButton: {
    padding: 8,
    marginLeft: 8,
  },
  addKeywordButtonDisabled: {
    opacity: 0.5,
  },
  activeKeywordsText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textSecondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#4CAF50',
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  listeningDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 10,
  },
  listeningText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
    flex: 1,
  },
  sosButtonContainer: {
    marginBottom: 24,
  },
  sosButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  instruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: Colors.secondary || '#E0E0E0',
  },
  continueButton: {
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successIcon: {
    marginBottom: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    width: '100%',
  },
});

export default SOSScreen;
