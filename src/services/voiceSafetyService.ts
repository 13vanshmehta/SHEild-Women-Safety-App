import Voice from '@react-native-voice/voice';
import { Alert, AppState, AppStateStatus } from 'react-native';

export interface VoiceSafetyConfig {
  keywords: string[];
  locale: string;
  onKeywordDetected: (keyword: string, fullText: string) => void;
  onError?: (error: any) => void;
}

class VoiceSafetyService {
  private isListening: boolean = false;
  private config: VoiceSafetyConfig | null = null;
  private detectedKeywords: Set<string> = new Set();
  private isInitialized: boolean = false;
  private appStateSubscription: any = null;
  private currentAppState: AppStateStatus = 'active';

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
    
    if (this.currentAppState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (this.isListening && this.config) {
        console.log('🎤 VoiceService: Resuming voice recognition in foreground');
        // Voice should continue automatically, but restart if needed
        this.ensureListening();
      }
    }
    
    this.currentAppState = nextAppState;
  }

  /**
   * Ensure voice recognition is still running
   */
  private async ensureListening() {
    if (!this.isListening || !this.config) return;
    
    try {
      // Check if voice is still available
      const isRecognizing = await Voice.isRecognizing();
      if (!isRecognizing) {
        console.log('🎤 VoiceService: Voice stopped, restarting...');
        await Voice.start(this.config.locale || 'en-US');
      }
    } catch (error) {
      console.error('🎤 VoiceService: Error ensuring listening:', error);
    }
  }

  /**
   * Initialize Voice event listeners
   */
  private initializeVoice() {
    if (this.isInitialized) return;
    
    try {
      // Set up Voice event listeners
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      
      this.isInitialized = true;
      console.log('🎤 VoiceService: Initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Voice:', error);
    }
  }

  /**
   * Start listening for emergency keywords
   * Supports background listening via audio background mode
   */
  async startListening(config: VoiceSafetyConfig): Promise<boolean> {
    try {
      // Initialize Voice if not already done
      this.initializeVoice();
      
      // Check if speech recognition is available
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert(
          'Not Available',
          'Speech recognition is not available on this device.'
        );
        return false;
      }

      this.config = config;
      this.detectedKeywords.clear();
      
      // Start continuous recognition with background support
      await Voice.start(config.locale || 'en-US');
      this.isListening = true;
      
      console.log('🎤 Voice Safety Mode: Started listening for keywords:', config.keywords);
      console.log('🎤 Background mode enabled - will continue when app is in background');
      return true;
    } catch (error) {
      console.error('Error starting voice recognition:', error);
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
        await Voice.stop();
        await Voice.destroy();
        this.isListening = false;
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
      await Voice.cancel();
      await Voice.destroy();
      this.isListening = false;
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
    console.log('🎤 Speech started');
  }

  /**
   * Event: Speech recognition ended
   */
  private onSpeechEnd(_event: any): void {
    console.log('🎤 Speech ended');
    
    // Auto-restart if still in listening mode
    if (this.isListening && this.config) {
      setTimeout(() => {
        if (this.isListening && this.config) {
          Voice.start(this.config.locale || 'en-US').catch(console.error);
        }
      }, 100);
    }
  }

  /**
   * Event: Final speech results
   */
  private onSpeechResults(event: any): void {
    if (!this.config) return;

    const results = event.value || [];
    console.log('🎤 Speech results:', results);

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
    console.log('🎤 Partial results:', results);

    // Check partial results for immediate keyword detection
    for (const text of results) {
      this.checkForKeywords(text);
    }
  }

  /**
   * Event: Speech recognition error
   */
  private onSpeechError(event: any): void {
    console.error('🎤 Speech recognition error:', event.error);
    
    // Auto-restart on certain errors
    if (this.isListening && this.config) {
      const errorMsg = event.error?.message || '';
      
      // Don't restart on permission errors
      if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
        this.config.onError?.(event.error);
        this.isListening = false;
        return;
      }

      // Restart on other errors
      setTimeout(() => {
        if (this.isListening && this.config) {
          Voice.start(this.config.locale || 'en-US').catch(console.error);
        }
      }, 500);
    }
  }

  /**
   * Check if text contains any emergency keywords
   */
  private checkForKeywords(text: string): void {
    if (!this.config) return;

    const lowerText = text.toLowerCase().trim();
    // Split text into words for exact matching
    const words = lowerText.split(/\s+/);
    
    console.log('🔍 Checking text:', lowerText);
    console.log('🔍 Words detected:', words);
    console.log('🔍 Looking for keywords:', this.config.keywords);
    
    for (const keyword of this.config.keywords) {
      const lowerKeyword = keyword.toLowerCase().trim();
      
      // Check if keyword matches exactly as a word or phrase
      // For multi-word keywords, check if they appear as a phrase
      const isMatch = lowerKeyword.includes(' ') 
        ? lowerText.includes(lowerKeyword)
        : words.includes(lowerKeyword);
      
      console.log(`🔍 Checking "${lowerKeyword}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
      
      if (isMatch) {
        // Prevent duplicate triggers for same keyword
        if (!this.detectedKeywords.has(lowerKeyword)) {
          this.detectedKeywords.add(lowerKeyword);
          
          console.log('🚨 EMERGENCY KEYWORD DETECTED:', keyword);
          console.log('🚨 Full text:', text);
          
          // Trigger callback
          this.config.onKeywordDetected(keyword, text);
          
          // Clear detected keywords after 5 seconds to allow re-detection
          // Increased from 2 to 5 seconds to prevent accidental re-triggers
          setTimeout(() => {
            this.detectedKeywords.delete(lowerKeyword);
            console.log('� Reset detection for keyword:', lowerKeyword);
          }, 5000);
        } else {
          console.log('⏭️ Skipping duplicate detection for:', lowerKeyword);
        }
      }
    }
  }
}

export default new VoiceSafetyService();
