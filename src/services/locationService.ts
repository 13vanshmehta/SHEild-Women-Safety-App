import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

export interface Location {
  latitude: number;
  longitude: number;
}

class LocationService {
  private hasPermission: boolean = false;

  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (hasPermission) {
          this.hasPermission = true;
          return true;
        }

        // Request permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'SHEild needs access to your location to find safe spots and police stations near you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;

        if (!this.hasPermission) {
          Alert.alert(
            'Permission Required',
            'Location permission is required to find safe spots near you. Please enable it in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
        }

        return this.hasPermission;
      } else {
        // iOS permission handling - use Geolocation.requestAuthorization
        try {
          const authStatus = await Geolocation.requestAuthorization('whenInUse');
          console.log('iOS Location authorization status:', authStatus);
          
          // Check if permission was granted
          // Possible values: 'granted', 'denied', 'disabled', 'restricted'
          this.hasPermission = authStatus === 'granted';
          
          if (!this.hasPermission) {
            Alert.alert(
              'Permission Required',
              'Location permission is required to find safe spots near you. Please enable it in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
          }
          
          return this.hasPermission;
        } catch (error) {
          console.error('Error requesting iOS location permission:', error);
          this.hasPermission = false;
          return false;
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        this.hasPermission = granted;
        return granted;
      } else {
        // iOS - Geolocation library handles this automatically
        this.hasPermission = true;
        return true;
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location | null> {
    try {
      const hasPermission = await this.checkPermission();
      
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            Alert.alert(
              'Location Error',
              'Unable to get your current location. Please make sure location services are enabled.',
              [{ text: 'OK' }]
            );
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      });
    } catch (error) {
      console.error('Error in getCurrentLocation:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m away`;
    }
    return `${distanceKm} km away`;
  }
}

export default new LocationService();

