import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_STATE_KEY = '@voice_safety_state';

export interface VoiceState {
  isEnabled: boolean;
  keywords: string[];
}

class VoiceStateService {
  /**
   * Save voice listening state to persist across app restarts
   */
  async saveState(state: VoiceState): Promise<void> {
    try {
      await AsyncStorage.setItem(VOICE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving voice state:', error);
    }
  }

  /**
   * Load saved voice listening state
   */
  async loadState(): Promise<VoiceState | null> {
    try {
      const stateStr = await AsyncStorage.getItem(VOICE_STATE_KEY);
      if (stateStr) {
        const state = JSON.parse(stateStr);
        return state;
      }
      return null;
    } catch (error) {
      console.error('Error loading voice state:', error);
      return null;
    }
  }

  /**
   * Clear saved voice listening state
   */
  async clearState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VOICE_STATE_KEY);
    } catch (error) {
      console.error('Error clearing voice state:', error);
    }
  }
}

export default new VoiceStateService();
