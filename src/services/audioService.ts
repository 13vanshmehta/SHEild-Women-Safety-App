import { Platform, PermissionsAndroid } from 'react-native';
import { Recorder, Player } from '@react-native-community/audio-toolkit';
import RNFS from 'react-native-fs';

class AudioService {
  private recorder: Recorder | null = null;
  private player: Player | null = null;
  private recordingPath: string | null = null;
  private recordingStartTime: number = 0;

  async requestAudioPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'SHEild needs access to your microphone to record audio messages.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Audio permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  }

  async startRecording(): Promise<string> {
    try {
      const hasPermission = await this.requestAudioPermission();
      if (!hasPermission) {
        throw new Error('Audio permission not granted');
      }

      // Generate unique filename
      const filename = `audio_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'mp4'}`;
      this.recordingPath = filename;

      // Create recorder instance
      this.recorder = new Recorder(filename, {
        bitrate: 128000,
        channels: 1,
        sampleRate: 44100,
        quality: 'high',
      });

      // Prepare and start recording
      await new Promise<void>((resolve, reject) => {
        this.recorder!.prepare((err) => {
          if (err) {
            console.error('Recorder prepare error:', err);
            reject(err);
          } else {
            this.recorder!.record((error) => {
              if (error) {
                console.error('Recorder start error:', error);
                reject(error);
              } else {
                this.recordingStartTime = Date.now();
                console.log('Recording started successfully');
                resolve();
              }
            });
          }
        });
      });

      return filename;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<{ path: string; duration: number }> {
    try {
      if (!this.recorder) {
        throw new Error('No active recording');
      }

      // Stop recording
      await new Promise<void>((resolve, reject) => {
        this.recorder!.stop((err) => {
          if (err) {
            console.error('Recorder stop error:', err);
            reject(err);
          } else {
            console.log('Recording stopped successfully');
            resolve();
          }
        });
      });

      // Calculate duration
      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

      // Get the full path
      const fullPath = this.recorder.fsPath;
      
      // Destroy recorder
      this.recorder.destroy();
      this.recorder = null;

      if (!this.recordingPath) {
        throw new Error('No recording path found');
      }

      return {
        path: fullPath,
        duration: duration > 0 ? duration : 1, // Minimum 1 second
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (this.recorder) {
        this.recorder.stop(() => {
          if (this.recorder) {
            this.recorder.destroy();
            this.recorder = null;
          }
        });
      }

      // Try to delete the recording file
      if (this.recordingPath) {
        try {
          const fullPath = Platform.select({
            ios: `${RNFS.DocumentDirectoryPath}/${this.recordingPath}`,
            android: `${RNFS.CachesDirectoryPath}/${this.recordingPath}`,
          });
          
          if (fullPath) {
            const exists = await RNFS.exists(fullPath);
            if (exists) {
              await RNFS.unlink(fullPath);
            }
          }
        } catch (deleteError) {
          console.warn('Error deleting recording file:', deleteError);
        }
        
        this.recordingPath = null;
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  }

  async playAudio(url: string): Promise<void> {
    try {
      // Stop any existing playback
      if (this.player) {
        this.player.destroy();
      }

      // Create new player
      this.player = new Player(url, {
        autoDestroy: false,
      });

      // Prepare and play
      await new Promise<void>((resolve, reject) => {
        this.player!.prepare((err) => {
          if (err) {
            console.error('Player prepare error:', err);
            reject(err);
          } else {
            this.player!.play((error) => {
              if (error) {
                console.error('Player play error:', error);
                reject(error);
              } else {
                console.log('Audio playback started');
                resolve();
              }
            });
          }
        });
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  async stopAudio(): Promise<void> {
    try {
      if (this.player) {
        this.player.stop(() => {
          if (this.player) {
            this.player.destroy();
            this.player = null;
          }
        });
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  async pauseAudio(): Promise<void> {
    try {
      if (this.player && this.player.isPlaying) {
        this.player.pause();
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  }

  async resumeAudio(): Promise<void> {
    try {
      if (this.player && !this.player.isPlaying) {
        this.player.play();
      }
    } catch (error) {
      console.error('Error resuming audio:', error);
    }
  }
}

export default new AudioService();
