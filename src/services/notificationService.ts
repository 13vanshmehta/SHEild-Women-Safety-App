import { getMessaging, getToken, requestPermission, onMessage, onNotificationOpenedApp, getInitialNotification, onTokenRefresh, AuthorizationStatus } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { Platform, PermissionsAndroid } from 'react-native';
import { apiService } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  private messaging() {
    return getMessaging(getApp());
  }

  /**
   * Request user permission for notifications
   */
  async requestUserPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Notification permission denied');
        return false;
      }
    }

    const authStatus = await requestPermission(this.messaging());
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      return true;
    }
    return false;
  }

  /**
   * Get FCM token and send it to the backend
   */
  async getFcmToken() {
    try {
      const savedToken = await AsyncStorage.getItem('fcmToken');
      const token = await getToken(this.messaging());

      if (token && token !== savedToken) {
        console.log('New FCM Token:', token);
        if (apiService) {
          const response = await apiService.post('/api/auth/fcm-token', { fcmToken: token });
          
          if (response && response.success) {
            await AsyncStorage.setItem('fcmToken', token);
          }
        }
      } else {
        console.log('FCM Token already up to date');
      }
      
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Initialize notification listeners
   */
  initListeners() {
    const messagingInstance = this.messaging();

    const unsubscribeOnMessage = onMessage(messagingInstance, async remoteMessage => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
    });

    onNotificationOpenedApp(messagingInstance, remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage.notification,
      );
    });

    getInitialNotification(messagingInstance)
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage.notification,
          );
        }
      });

    onTokenRefresh(messagingInstance, token => {
      console.log('FCM Token Refreshed:', token);
      if (apiService) {
        apiService.post('/api/auth/fcm-token', { fcmToken: token });
      }
      AsyncStorage.setItem('fcmToken', token);
    });

    return unsubscribeOnMessage;
  }
}

export default new NotificationService();



