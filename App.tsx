import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/components/AppNavigator';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const AppContent = () => {
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'SHEild needs access to your location for safety features',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Location permission granted');
        } else {
          console.log('❌ Location permission denied');
        }
      } catch (err) {
        console.warn('Error requesting location permission:', err);
      }
    } else {
      // iOS - Request permission through Geolocation
      Geolocation.requestAuthorization('whenInUse');
    }
  };

  return <AppNavigator />;
};

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
