import { apiService } from './apiService';
import { connectSocket } from './socketService';
import Geolocation from 'react-native-geolocation-service';
import { Platform } from 'react-native';

export interface UserLocationData {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  profilePicture: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  lastUpdated: string;
  isOnline: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  platform?: string;
  osVersion?: string;
}

class UserLocationService {
  private locationUpdateInterval: number | null = null;
  private socket: any = null;

  /**
   * Update current user's location on the server
   */
  async updateLocation(locationData: LocationUpdate) {
    try {
      const response = await apiService.post('/api/location/update', locationData);
      return response;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Get all visible user locations for the map
   */
  async getVisibleLocations(): Promise<UserLocationData[]> {
    try {
      const response = await apiService.get('/api/location/visible');
      if (response && response.success && response.data) {
        return response.data.locations || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching visible locations:', error);
      return [];
    }
  }

  /**
   * Get specific user's location
   */
  async getUserLocation(userId: string): Promise<UserLocationData | null> {
    try {
      const response = await apiService.get(`/api/location/user/${userId}`);
      if (response && response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user location:', error);
      return null;
    }
  }

  /**
   * Update location sharing settings
   */
  async updateSharingSettings(settings: {
    isLocationVisible?: boolean;
    shareWith?: 'everyone' | 'groups' | 'emergency_contacts' | 'nobody';
    visibleToUsers?: string[];
    visibleToGroups?: string[];
  }) {
    try {
      const response = await apiService.put('/api/location/sharing-settings', settings);
      return response;
    } catch (error) {
      console.error('Error updating sharing settings:', error);
      throw error;
    }
  }

  /**
   * Update online status
   */
  async updateOnlineStatus(isOnline: boolean) {
    try {
      const response = await apiService.put('/api/location/online-status', { isOnline });
      return response;
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  }

  /**
   * Get current device location
   */
  async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
  } | null> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy: accuracy || undefined,
            altitude: altitude || undefined,
            speed: speed || undefined,
            heading: heading || undefined,
          });
        },
        (error) => {
          console.error('Error getting current location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Get reverse geocoded address from coordinates
   */
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Error fetching address:', error);
      return null;
    }
  }

  /**
   * Start automatic location updates (every 30 seconds when app is active)
   */
  async startLocationTracking(updateIntervalMs: number = 30000) {
    
    // Clear any existing interval
    this.stopLocationTracking();

    // Setup socket connection for real-time updates
    try {
      this.socket = await connectSocket();
    } catch (error) {
      console.error('❌ Failed to connect socket:', error);
    }

    // Update location immediately
    await this.updateCurrentLocation();

    // Set up periodic updates
    this.locationUpdateInterval = setInterval(async () => {
      await this.updateCurrentLocation();
    }, updateIntervalMs);

  }

  /**
   * Stop automatic location updates
   */
  stopLocationTracking() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  /**
   * Update current location to server
   */
  private async updateCurrentLocation() {
    try {
      const location = await this.getCurrentLocation();
      
      if (!location) {
        return;
      }

      const { latitude, longitude, accuracy, altitude, speed, heading } = location;

      // Get address (optional, can be slow)
      const address = await this.getAddressFromCoordinates(latitude, longitude);

      // Prepare location update
      const locationUpdate: LocationUpdate = {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        address: address || undefined,
        platform: Platform.OS,
      };

      // Send to server
      await this.updateLocation(locationUpdate);

    } catch (error) {
      console.error('❌ Error updating current location:', error);
    }
  }

  /**
   * Subscribe to real-time location updates from other users
   */
  subscribeToLocationUpdates(callback: (location: UserLocationData) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('userLocationUpdated', (data: any) => {
      callback({
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        profilePicture: data.profilePicture,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        address: data.address,
        lastUpdated: data.lastUpdated,
        isOnline: data.isOnline,
        batteryLevel: data.batteryLevel,
        isCharging: data.isCharging,
      });
    });
  }

  /**
   * Unsubscribe from location updates
   */
  unsubscribeFromLocationUpdates() {
    if (this.socket) {
      this.socket.off('userLocationUpdated');
    }
  }
}

export default new UserLocationService();
