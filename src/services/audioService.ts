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
        format: 'mp4',
        encoder: 'aac',
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
        }

        this.recordingPath = null;
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  }

  private isPlaying: boolean = false;

  async playAudio(url: string): Promise<void> {
    try {
      // 1. Force stop any existing playback before continuing
      if (this.player) {
        try {
          this.player.stop();
          this.player.destroy();
        } catch (e) { }
        this.player = null;
      }

      this.isPlaying = true;

      // 2. Create the player instance
      const newPlayer = new Player(url, {
        autoDestroy: true,
        continuesToPlayInBackground: true,
      });

      // 3. Store in class variable for global stop/pause control
      this.player = newPlayer;

      // 4. Prepare and play using LOCAL REFERENCE to avoid null crashes if this.player is reset elsewhere
      await new Promise<void>((resolve, reject) => {
        // Safe check for the constant reference
        if (!newPlayer) {
          this.isPlaying = false;
          return reject(new Error('Player creation failed'));
        }

        const timeout = setTimeout(() => {
          this.isPlaying = false;
          reject(new Error('Audio playback timeout'));
        }, 5000);

        newPlayer.prepare((err) => {
          if (err) {
            clearTimeout(timeout);
            this.isPlaying = false;
            console.error('Player prepare error:', err);
            reject(err);
          } else {
            // Re-verify instance still exists (though newPlayer is local, we check for logic sake)
            newPlayer.play((error) => {
              clearTimeout(timeout);
              this.isPlaying = false;
              if (error) {
                console.error('Player play error:', error);
                reject(error);
              } else {
                resolve();
              }
            });
          }
        });
      });
    } catch (error) {
      this.isPlaying = false;
      console.error('Error in playAudio workflow:', error);
    }
  }

  async stopAudio(): Promise<void> {
    try {
      if (this.player) {
        this.player.stop();
        this.player.destroy();
        this.player = null;
      }
      this.isPlaying = false;
    } catch (error) {
      this.isPlaying = false;
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
