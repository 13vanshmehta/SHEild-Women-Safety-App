import Voice from '@react-native-voice/voice';
import { Alert, AppState, AppStateStatus, Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export interface VoiceSafetyConfig {
  keywords: string[];
  locale: string;
  onKeywordDetected: (keyword: string, fullText: string) => void;
  onError?: (error: any) => void;
  silent?: boolean;
}

class VoiceSafetyService {
  private isListening: boolean = false;
  private config: VoiceSafetyConfig | null = null;
  private detectedKeywords: Set<string> = new Set();
  private isInitialized: boolean = false;
  private appStateSubscription: any = null;
  private currentAppState: AppStateStatus = AppState.currentState;
  private heartbeatInterval: any = null;
  private isStarting: boolean = false;

  constructor() {
    // Initialize will be called when first needed
    this.setupAppStateListener();
  }

  /**
   * Setup app state listener for background handling
   */
  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Handle app state changes to maintain voice recognition in background
   */
  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('🎤 VoiceService: App State Changed:', this.currentAppState, '->', nextAppState);

    if (nextAppState === 'active') {
      // App came to foreground
      if (this.isListening && this.config) {
        console.log('🎤 VoiceService: Syncing voice recognition in foreground');
        this.ensureListening();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      if (this.isListening && this.config) {
        console.log('🎤 VoiceService: Entering background monitoring mode');
        this.startHeartbeat();
      }
    }

    this.currentAppState = nextAppState;
  }

  /**
   * Start a heartbeat timer to keep listening alive
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.isListening) {
        this.ensureListening();
      } else {
        this.stopHeartbeat();
      }
    }, 7000); // 7 second heartbeat
  }

  /**
   * Stop the heartbeat timer
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }



  /**
   * Ensure voice recognition is still running
   */
  private async ensureListening() {
    if (!this.isListening || !this.config) return;

    try {
      // Diagnostic Heartbeat
      const isRecognizing = await Voice.isRecognizing();
      // console.log('🎤 Voice Heartbeat - Recognized Status:', isRecognizing);

      if (!isRecognizing) {
        console.log('🎤 VoiceService: Voice stopped, auto-restarting...');
        await this.startVoiceEngine(true); // Auto-restart
      }
    } catch (error) {
      console.error('🎤 VoiceService: Error ensuring listening:', error);
    }
  }

  /**
   * Internal helper to start Voice engine with smart strategy
   */
  private async startVoiceEngine(isAutoRestart: boolean = false) {
    if (!this.config) return;
    if (this.isStarting) return;
    this.isStarting = true;

    const locale = this.config.locale || 'en-IN';

    try {
      // Strategy 1: System Default (Safest for modern devices like S24 Ultra)
      console.log(`🎤 Attempting Voice.start (${locale}) with SYSTEM DEFAULT engine...`);
      await Voice.start(locale, {
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: true
      });
      console.log('🎤 ✅ System Default engine initialization requested');
    } catch (defaultError) {
      console.warn('🎤 System default failed, trying forced GOOGLE strategy...', defaultError);
      try {
        // Strategy 2: Forced Google engine path (legacy/specific devices)
        await Voice.start(locale, {
          RECOGNIZER_ENGINE: 'GOOGLE',
          EXTRA_PARTIAL_RESULTS: true,
          REQUEST_PERMISSIONS_AUTO: true
        });
        console.log('🎤 ✅ Forced Google engine initialization requested');
      } catch (googleError) {
        console.error('🎤 ❌ All voice engine strategies failed:', googleError);
        throw googleError;
      }
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Initialize Voice event listeners
   */
  private async initializeVoice(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🎤 VoiceService: Starting initialization...');

      // Check if Voice module is available (properly linked)
      if (!Voice || typeof Voice.start !== 'function') {
        console.error('🎤 Voice module is not available - library may not be properly linked');
        return false;
      }

      console.log('🎤 Voice module loaded successfully');

      // On Android, we need to ensure Voice module is ready
      if (Platform.OS === 'android') {
        console.log('🎤 Android: Cleaning up any existing instance...');
        // Try to destroy any existing instance first and wait a bit
        try {
          await Voice.destroy();
          // Give Android time to clean up
          await new Promise<void>(resolve => setTimeout(resolve, 200));
        } catch {
          // Ignore destroy errors on first init
          console.log('🎤 No existing instance to destroy');
        }
      }

      // Set up Voice event listeners
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      Voice.onSpeechRecognized = (_e: any) => {
        // console.log('🎤 Speech recognition confirmed by engine');
      };
      Voice.onSpeechVolumeChanged = (_e: any) => {
        // Silenced volume logs
      };

      this.isInitialized = true;
      console.log('🎤 VoiceService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Voice:', error);
      return false;
    }
  }

  /**
   * Start listening for emergency keywords
   * Supports background listening via audio background mode
   */
  async startListening(config: VoiceSafetyConfig): Promise<boolean> {
    try {
      // Initialize Voice if not already done
      const initialized = await this.initializeVoice();
      if (!initialized) {
        const errorTitle = Platform.OS === 'android' ? 'Voice Recognition Setup Required' : 'Voice Recognition Not Available';
        const errorMessage = Platform.OS === 'android'
          ? 'To use voice recognition on Android, you need:\n\n' +
          '📱 Google App (Voice Search)\n' +
          '   • Open Play Store\n' +
          '   • Search "Google" (by Google LLC)\n' +
          '   • Install or Update\n\n' +
          'After installing:\n' +
          '   • Enable Google app in Settings\n' +
          '   • Restart SHEild app\n\n' +
          'The Google app provides voice recognition services for Android.'
          : 'Failed to initialize voice recognition. Please restart the app.';

        Alert.alert(errorTitle, errorMessage);
        return false;
      }

      // Check if speech recognition is available
      console.log('🎤 Checking speech recognition availability...');

      try {
        const availabilityResult = await Voice.isAvailable();
        console.log('🎤 Voice.isAvailable() returned:', availabilityResult, 'Type:', typeof availabilityResult);

        // Handle both null/undefined and boolean responses
        const available = availabilityResult === true || availabilityResult === 1;

        if (!available && Platform.OS !== 'android') {
          Alert.alert(
            'Not Available',
            'Speech recognition is not available on this device.'
          );
          return false;
        }

        // On Android, even if isAvailable returns false/null, we'll try to start anyway
        // because the actual availability is determined when we call start()
        console.log('🎤 Proceeding with voice recognition setup...');
      } catch (availError) {
        console.log('🎤 Voice.isAvailable() threw error:', availError);
        // Continue anyway - we'll let start() determine if it works
      }

      this.config = config;
      this.detectedKeywords.clear();

      // Start continuous recognition with background support
      try {
        await this.startVoiceEngine(false); // Explicit start
        if (!config.silent) {
          // Audio feedback removed to fix crashes
        }
        console.log('🎤 ✅ Voice engine started!');
      } catch (startError: any) {
        console.error('🎤 ❌ Voice.start() failed:');
        console.error('🎤 Error message:', startError?.message);
        console.error('🎤 Error code:', startError?.code);
        console.error('🎤 Full error:', JSON.stringify(startError, null, 2));

        // Re-throw with the original error for better debugging
        throw startError;
      }

      this.isListening = true;
      this.startHeartbeat();

      console.log('🎤 Voice Safety Mode: Started listening for keywords:', config.keywords);
      console.log('🎤 Background mode enabled - will continue when app is in background');
      return true;
    } catch (error: any) {
      console.error('🎤 ❌ Failed to start voice recognition:', error);

      // Show user-friendly error message
      const errorMsg = error?.message || String(error);
      const errorCode = error?.code || '';

      let title = 'Voice Recognition Error';
      let message = `Failed to start voice recognition.\n\nError: ${errorMsg}`;

      if (errorCode) {
        message += `\nCode: ${errorCode}`;
      }

      // Check for specific error patterns
      if (errorMsg.includes('permission') || errorCode.includes('PERMISSION')) {
        title = 'Microphone Permission Required';
        message = 'Please grant microphone permission in Settings to use voice recognition.';
      } else if (errorMsg.includes('network') || errorMsg.includes('CONNECTION')) {
        title = 'Network Error';
        message = 'Voice recognition requires an internet connection. Please check your network and try again.';
      } else if (errorMsg.includes('not available') || errorMsg.includes('not supported')) {
        title = 'Not Supported';
        message = 'Speech recognition is not available on this device.';
      }

      Alert.alert(title, message);

      this.config?.onError?.(error);
      return false;
    }
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    try {
      if (this.isListening) {
        this.isListening = false;
        this.stopHeartbeat();
        await Voice.cancel(); // Use cancel to minimize beeps
        await Voice.destroy();
        this.detectedKeywords.clear(); // Clear detected keywords on stop
        console.log('🛑 Voice Safety Mode: Stopped listening');
      }
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  /**
   * Cancel and cleanup
   */
  async cancel(): Promise<void> {
    try {
      this.isListening = false;
      this.stopHeartbeat();
      await Voice.cancel();
      await Voice.destroy();
      this.config = null;
      this.detectedKeywords.clear();

      // Cleanup app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
    } catch (error) {
      console.error('Error canceling voice recognition:', error);
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Event: Speech recognition started
   */
  private onSpeechStart(_event: any): void {
    // console.log('🎤 Speech started');
  }

  /**
   * Event: Speech recognition ended
   */
  private onSpeechEnd(_event: any): void {
    // console.log('🎤 Speech ended');

    // Auto-restart if still in listening mode
    if (this.isListening && this.config) {
      setTimeout(async () => {
        if (this.isListening && this.config) {
          try {
            // Check if already recognizing to avoid concurrent starts
            const isRecognizing = await Voice.isRecognizing();
            if (!isRecognizing) {
              await this.startVoiceEngine(true); // Auto-restart
            }
          } catch (e) {
            console.error('🎤 Voice: Error during auto-restart after end:', e);
          }
        }
      }, 500); // 500ms stable restart
    }
  }

  /**
   * Event: Final speech results
   */
  private onSpeechResults(event: any): void {
    if (!this.config) return;

    const results = event.value || [];
    // console.log('🎤 RAW SPEECH RESULTS (Final):', JSON.stringify(results));

    // Check all results for keywords
    for (const text of results) {
      this.checkForKeywords(text);
    }
  }


  /**
   * Event: Partial speech results (real-time)
   */
  private onSpeechPartialResults(event: any): void {
    if (!this.config) return;

    const results = event.value || [];
    // console.log('🎤 RAW SPEECH RESULTS (Partial):', JSON.stringify(results));

    // Check partial results for immediate keyword detection
    for (const text of results) {
      this.checkForKeywords(text);
    }
  }


  /**
   * Event: Speech recognition error
   */
  private onSpeechError(event: any): void {
    const errorMsg = event.error?.message || '';
    const errorCode = event.error?.code || String(event.error);

    // these are normal in continuous listening mode, so we just log them in DEBUG if needed.
    if (errorCode === '7' || errorCode === '10' || errorMsg.includes('No match') || errorMsg.includes('understand')) {
      // Quiet reset
    } else {
      console.error('🎤 Speech recognition error:', event.error);
    }

    // Auto-restart on certain errors
    if (this.isListening && this.config) {
      const errorMsg = event.error?.message || '';

      // Don't restart on permission errors
      if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
        this.config.onError?.(event.error);
        this.isListening = false;
        return;
      }

      // Restart on other errors with a longer delay to prevent rate-limiting
      setTimeout(async () => {
        if (this.isListening && this.config) {
          try {
            const isRecognizing = await Voice.isRecognizing();
            if (!isRecognizing) {
              await this.startVoiceEngine(true); // Auto-restart
            }
          } catch (e) {
            console.error('🎤 Voice: Error during auto-restart after error:', e);
          }
        }
      }, 3000); // 3 second backoff for recovery (S24 needs more time)
    }
  }

  /**
   * Check if text contains any emergency keywords
   */
  private checkForKeywords(text: string): void {
    if (!this.config) return;

    const lowerText = text.toLowerCase().trim();
    // Aggressive normalization: remove all punctuation and normalize spaces
    const normalizedText = lowerText.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ').replace(/\s{2,}/g, ' ').trim();

    // Split into words for exact matching
    const words = normalizedText.split(/\s+/);

    console.log('🔍 Checking text:', normalizedText);
    if (normalizedText !== lowerText) {
      console.log('🔍 Raw text was:', lowerText);
    }
    console.log('🔍 Looking for keywords:', this.config.keywords);

    for (const keyword of this.config.keywords) {
      const lowerKeyword = keyword.toLowerCase().trim();
      // Normalize keyword too just in case it has punctuation
      const normalizedKeyword = lowerKeyword.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ').replace(/\s{2,}/g, ' ').trim();

      // Check using regex on normalized text
      const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const isMatch = regex.test(normalizedText) || (normalizedText.includes(normalizedKeyword) && normalizedKeyword.length > 3);

      if (isMatch) {
        // Prevent duplicate triggers for same keyword
        if (!this.detectedKeywords.has(lowerKeyword)) {
          this.detectedKeywords.add(lowerKeyword);

          console.log('🚨 EMERGENCY KEYWORD DETECTED:', keyword);
          console.log('🚨 Full text:', text);

          // Physical Feedback (Audio removed to fix crashes)
          Vibration.vibrate([0, 200, 100, 200]); // Pulse
          ReactNativeHapticFeedback.trigger('notificationError');

          // Trigger callback
          this.config.onKeywordDetected(keyword, text);

          // Clear detected keywords after 10 seconds (restored old working delay)
          setTimeout(() => {
            this.detectedKeywords.delete(lowerKeyword);
            console.log('🔄 Reset detection for keyword:', lowerKeyword);
          }, 10000);
        } else {
          console.log('⏭️ Skipping duplicate detection for:', lowerKeyword);
        }
      }
    }
  }
}

export default new VoiceSafetyService();
