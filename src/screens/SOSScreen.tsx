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
  Vibration,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';
import { apiService } from '../services/apiService';
import voiceSafetyService from '../services/voiceSafetyService';
import voiceStateService from '../services/voiceStateService';
import { useToast } from '../components/Toast';

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
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    checkEmergencyContacts();
    collectDeviceInfo();
    requestLocationPermission();

    // Load saved voice state and restore if it was enabled
    loadVoiceState();

    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup - DON'T stop voice service on unmount to keep it running across tabs
    return () => {
      subscription.remove();
      // Voice service continues running even when component unmounts
      // Only stop when user explicitly clicks "Stop Listening"
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

  // Restart voice listening when keywords change (only if actually changed by user)
  const prevKeywordsRef = useRef<string[]>(keywords);

  useEffect(() => {
    // Check if keywords actually changed (not just component remount)
    const keywordsChanged = JSON.stringify(prevKeywordsRef.current) !== JSON.stringify(keywords);

    if (isVoiceListening && keywords.length > 0 && keywordsChanged) {
      // Stop and restart with new keywords
      const restartListening = async () => {
        console.log('🔄 Restarting voice listening with new keywords:', keywords);
        await voiceSafetyService.stopListening();

        const started = await voiceSafetyService.startListening({
          keywords: keywords,
          locale: 'en-US',
          silent: true, // Auto-restart on keyword change is silent
          onKeywordDetected: (keyword, fullText) => {
            console.log('🚨 EMERGENCY KEYWORD DETECTED:', keyword);
            console.log('🚨 Full text:', fullText);
            console.log('🎤 SOS Triggered by Voice!');
            Vibration.vibrate(500);
            ReactNativeHapticFeedback.trigger('notificationError');
            triggerSOSAlert('voice_keyword');
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

    // Update previous keywords reference
    prevKeywordsRef.current = keywords;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords, isVoiceListening]);

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
    // Trigger Haptic Feedback
    ReactNativeHapticFeedback.trigger('impactHeavy', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

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

  const triggerSOSAlert = async (triggerMode: string = 'manual_button') => {
    setShowCountdown(false);
    setIsActivating(true);
    scaleAnim.setValue(1);

    try {
      // Get fresh location
      getCurrentLocation();
      await collectDeviceInfo();

      console.log('📤 Sending SOS alert via:', triggerMode, {
        location,
        deviceInfo,
      });

      const response = await apiService.post('/api/sos/trigger', {
        location: location || { latitude: 0, longitude: 0, address: 'Location unavailable' },
        deviceInfo,
        triggerMode: triggerMode,
      });

      console.log('📥 SOS response:', response);

      if (response.success) {
        // Show custom success modal instead of default alert
        setShowSuccessModal(true);
        setNotificationCount(response.notificationsSent || 0);
        showToast('SOS Alert Dispatch Successful! 🚨', 'success');

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
      // Check if voice service is already listening
      const isCurrentlyListening = voiceSafetyService.getIsListening();

      if (isCurrentlyListening) {
        // Voice is already running, just sync UI state
        const savedState = await voiceStateService.loadState();
        if (savedState && savedState.keywords.length > 0) {
          console.log('📂 Voice already listening, syncing UI state');
          setKeywords(savedState.keywords);
          setIsVoiceListening(true);
          startVoicePulseAnimation();
        }
      } else {
        // Voice not running, check if it should auto-start
        const savedState = await voiceStateService.loadState();
        if (savedState && savedState.isEnabled && savedState.keywords.length > 0) {
          console.log('📂 Restoring voice listening from saved state');
          setKeywords(savedState.keywords);
          // Auto-start voice listening with saved keywords (silent on mount)
          setTimeout(() => {
            startVoiceListeningWithKeywords(savedState.keywords, true);
          }, 1000); // Delay to ensure all components are mounted
        }
      }
    } catch (error) {
      console.error('Error loading voice state:', error);
    }
  };

  const startVoiceListeningWithKeywords = async (keywordsToUse: string[], silent: boolean = false) => {
    try {
      if (keywordsToUse.length === 0) {
        Alert.alert('No Keywords', 'Please add at least one keyword to listen for.');
        return;
      }

      // Request microphone permission on Android
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'SHEild needs access to your microphone for voice safety mode.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission Denied',
              'Microphone permission is required for voice safety mode. Please enable it in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings', onPress: () => {
                    // Try to open app settings
                    if (Platform.OS === 'android') {
                      const { Linking } = require('react-native');
                      Linking.openSettings();
                    }
                  }
                },
              ]
            );
            return;
          }

          console.log('🎤 Microphone permission granted');
        } catch (err) {
          console.error('Error requesting microphone permission:', err);
          Alert.alert('Error', 'Failed to request microphone permission');
          return;
        }
      }

      const started = await voiceSafetyService.startListening({
        keywords: keywordsToUse,
        locale: 'en-US',
        silent: silent,
        onKeywordDetected: (keyword, fullText) => {
          console.log('🚨 EMERGENCY KEYWORD DETECTED:', keyword);
          console.log('🚨 Full text:', fullText);
          console.log('🎤 SOS Triggered by Voice!');
          Vibration.vibrate(500);
          ReactNativeHapticFeedback.trigger('notificationError');
          triggerSOSAlert('voice_keyword');
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
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    await startVoiceListeningWithKeywords(keywords);
  };

  const stopVoiceListening = async () => {
    try {
      ReactNativeHapticFeedback.trigger('selection', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.mainContent}>
          {/* Header & Status Row */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Emergency Center</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: emergencyContactCount >= 2 ? Colors.success : Colors.warning }]} />
                <Text style={styles.statusBadgeText}>
                  {emergencyContactCount} Contacts
                </Text>
              </View>
            </View>

            {/* Quick Status Bar */}
            <View style={styles.statusBar}>
              <View style={styles.statusItem}>
                <Icon name={deviceInfo?.batteryLevel > 20 ? 'battery-70' : 'battery-20'} size={14} color={deviceInfo?.batteryLevel > 20 ? Colors.textSecondary : Colors.error} />
                <Text style={styles.statusItemText}>{deviceInfo?.batteryLevel || 0}%</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Icon name="signal" size={14} color={deviceInfo?.networkStatus === 'strong' ? Colors.success : Colors.textSecondary} />
                <Text style={styles.statusItemText}>{deviceInfo?.networkStatus || '...'} Signal</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Icon name="map-marker" size={14} color={location ? Colors.info : Colors.textSecondary} />
                <Text style={styles.statusItemText}>{location ? 'GPS Fixed' : 'GPS Locating'}</Text>
              </View>
            </View>
          </View>

          {/* Main SOS Trigger Area */}
          <View style={styles.sosHeroSection}>
            <Animated.View style={[styles.sosPulsarContainer, { transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.sosPulsarInner} />
              <View style={styles.sosPulsarOuter} />
              <TouchableOpacity
                style={styles.sosButtonCircle}
                onPress={handleSOSPress}
                disabled={isActivating}
                activeOpacity={0.7}
              >
                {isActivating ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <View style={styles.sosInnerContent}>
                    <Icon name="shield-alert" size={70} color="#FFFFFF" />
                    <Text style={styles.sosMainLabel}>SOS</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.instructionText}>HOLD OR TAP FOR INSTANT HELP</Text>
            <Text style={styles.subtext}>Your location & live telemetry will be sent to 10 nearest units and your personal circle.</Text>
          </View>

          {/* Dynamic Voice Safety Card */}
          <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <View style={styles.cardIconCircle}>
                  <Icon name="microphone" size={20} color={isVoiceListening ? '#FFF' : '#AAA'} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Voice Shield</Text>
                  <Text style={styles.cardSubtitle}>
                    {isVoiceListening ? 'Monitoring active keywords' : 'Off-line protection'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, isVoiceListening && styles.toggleButtonActive]}
                onPress={isVoiceListening ? stopVoiceListening : startVoiceListening}
              >
                <View style={[styles.toggleThumb, isVoiceListening && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            {isVoiceListening && (
              <Animated.View style={[styles.voiceActiveInfo, { opacity: voicePulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [0.7, 1] }) }]}>
                <Text style={styles.pulseText}>LISTENING FOR: "{keywords.join('", "').toUpperCase()}"</Text>
              </Animated.View>
            )}

            <View style={styles.keywordSection}>
              <View style={styles.keywordInputWrapper}>
                <TextInput
                  style={styles.elegantInput}
                  value={keywordInput}
                  onChangeText={setKeywordInput}
                  placeholder="Insert new keyword..."
                  placeholderTextColor="#444"
                  editable={!isVoiceListening}
                  onSubmitEditing={addKeyword}
                />
                <TouchableOpacity
                  onPress={addKeyword}
                  style={[styles.addBtn, (!keywordInput.trim() || isVoiceListening) && styles.addBtnDisabled]}
                  disabled={!keywordInput.trim() || isVoiceListening}
                >
                  <Icon name="plus" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.chipContainer}>
                {keywords.map((keyword, index) => (
                  <View key={index} style={styles.premiumChip}>
                    <Text style={styles.chipText}>{keyword}</Text>
                    {!isVoiceListening && (
                      <TouchableOpacity onPress={() => removeKeyword(keyword)} style={styles.chipClose}>
                        <Icon name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Countdown Modal - Enhanced */}
      <Modal visible={showCountdown} transparent animationType="fade">
        <View style={styles.glassModalOverlay}>
          <View style={styles.glassModalContent}>
            <View style={styles.emergencyIconContainer}>
              <Icon name="alert-decagram" size={60} color={Colors.error} />
            </View>
            <Text style={styles.modalAlertTitle}>EMERGENCY ALERT</Text>

            <Animated.View style={[styles.countdownWrapper, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.modalCountdownNum}>{countdown}</Text>
            </Animated.View>

            <Text style={styles.modalAlertSubtext}>Help is being summoned now.</Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={cancelSOS}>
                <Text style={styles.secondaryBtnText}>ABORT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={() => setCountdown(0)}>
                <Text style={styles.dangerBtnText}>SEND NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="slide">
        <View style={styles.glassModalOverlay}>
          <View style={styles.successCard}>
            <Icon name="shield-check" size={100} color={Colors.success} />
            <Text style={styles.successTitle}>ALERTS DISPATCHED</Text>
            <Text style={styles.successDetailedText}>
              Signals sent to <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{notificationCount}</Text> personal contacts and local authorities. Help is converging on your coordinates.
            </Text>
            <TouchableOpacity style={styles.successActionBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successBtnText}>ACKNOWLEDGE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Clean Error Modal */}
      <Modal visible={showErrorModal} transparent animationType="fade">
        <View style={styles.glassModalOverlay}>
          <View style={styles.errorCard}>
            <Icon name="alert-circle-outline" size={60} color={Colors.error} />
            <Text style={styles.errorTitle}>SYSTEM ERROR</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.errorBtn} onPress={() => setShowErrorModal(false)}>
              <Text style={styles.errorBtnText}>RETRY SYSTEM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ToastComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 140, // Increased to clear bottom navigation bar
  },
  mainContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  header: {
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#AAA',
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: '#09090B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#111',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusItemText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#222',
  },
  sosHeroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  sosPulsarContainer: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosPulsarOuter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 130,
    backgroundColor: Colors.error,
    opacity: 0.1,
  },
  sosPulsarInner: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 104,
    backgroundColor: Colors.error,
    opacity: 0.2,
  },
  sosButtonCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sosInnerContent: {
    alignItems: 'center',
  },
  sosMainLabel: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 2,
  },
  instructionText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    letterSpacing: 1,
    opacity: 0.9,
  },
  subtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    paddingHorizontal: 20,
    opacity: 0.6,
  },
  premiumCard: {
    backgroundColor: '#09090B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#18181B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  toggleButton: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111',
    padding: 3,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  toggleButtonActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#333',
  },
  toggleThumbActive: {
    backgroundColor: '#FFF',
    transform: [{ translateX: 22 }],
  },
  voiceActiveInfo: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  pulseText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  keywordSection: {
    marginTop: 10,
  },
  keywordInputWrapper: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  elegantInput: {
    flex: 1,
    backgroundColor: '#050505',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#111',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.3,
    backgroundColor: '#111',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  chipText: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: '600',
  },
  chipClose: {
    marginLeft: 8,
    padding: 2,
    backgroundColor: '#222',
    borderRadius: 10,
  },
  glassModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassModalContent: {
    backgroundColor: '#09090B',
    borderRadius: 30,
    padding: 40,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#18181B',
  },
  emergencyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAlertTitle: {
    color: Colors.error,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
  },
  countdownWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalCountdownNum: {
    color: '#FFF',
    fontSize: 60,
    fontWeight: '900',
  },
  modalAlertSubtext: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 15,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#111',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  dangerBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dangerBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successCard: {
    backgroundColor: '#000',
    borderRadius: 32,
    padding: 40,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  successTitle: {
    color: Colors.success,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 15,
  },
  successDetailedText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 35,
  },
  successActionBtn: {
    width: '100%',
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  successBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  errorCard: {
    backgroundColor: '#09090B',
    borderRadius: 24,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorTitle: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
  },
  errorBtn: {
    width: '100%',
    backgroundColor: Colors.error,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default SOSScreen;
