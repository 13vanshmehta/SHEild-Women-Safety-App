import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { Colors } from '../constants';
import Geolocation from 'react-native-geolocation-service';
import locationService from '../services/locationService';
import userLocationService from '../services/userLocationService';
import { useAuth } from '../contexts/AuthContext';

// Using CartoDB Voyager tiles - mobile-friendly, free, and open source
// No API key required, perfect for family tracking!
// CartoDB is more permissive than OpenStreetMap's main tile server for mobile apps

// --- TYPE DEFINITIONS ---
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface UserLocation {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string | null;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  isOnline: boolean;
}

// --- COMPONENT DEFINITIONS (Outside main component) ---
const MapViewComponent: React.FC<{ 
  coordinates: Coordinates | null;
  mapRef: React.RefObject<MapView | null>;
  otherUsers: UserLocation[];
  currentUserId: string;
}> = ({ coordinates, mapRef, otherUsers, currentUserId }) => {
  if (!coordinates) return null;
  const { latitude, longitude } = coordinates;

  // Using CartoDB tile server - mobile-friendly and doesn't require User-Agent
  // Alternative to OpenStreetMap's main server which blocks mobile apps
  const tileUrl = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation={true}
      showsMyLocationButton={false}
      showsCompass={true}
      showsBuildings={true}
      showsTraffic={false}
      loadingEnabled={true}
      pitchEnabled={false}
      rotateEnabled={true}
      scrollEnabled={true}
      zoomEnabled={true}
    >
      {/* CartoDB Voyager Tile Layer - Mobile-friendly, free, no API key needed */}
      <UrlTile
        urlTemplate={tileUrl}
        maximumZ={19}
        minimumZ={1}
        flipY={false}
        shouldReplaceMapContent={true}
        tileSize={256}
      />
      
      {/* Current User Location Marker */}
      <Marker
        coordinate={{ latitude, longitude }}
        title="Your Location"
        description={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
      >
        <View style={styles.customMarker}>
          <Icon name="account-circle" size={40} color={Colors.primary} />
        </View>
      </Marker>

      {/* Other Users Location Markers */}
      {otherUsers.map((user) => (
        <Marker
          key={user.userId}
          coordinate={{ latitude: user.latitude, longitude: user.longitude }}
          title={`${user.firstName} ${user.lastName}`}
          description={user.isOnline ? 'Online' : 'Last seen: ' + new Date(user.lastUpdated).toLocaleString()}
        >
          <View style={styles.otherUserMarker}>
            <View style={[styles.otherUserMarkerInner, !user.isOnline && styles.offlineMarker]}>
              <Icon name="account" size={24} color="#fff" />
            </View>
            {user.isOnline && <View style={styles.onlineIndicator} />}
          </View>
        </Marker>
      ))}
    </MapView>
  );
};

const LoadingSpinner: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Finding your location...</Text>
  </View>
);

const ErrorView: React.FC<{ error: string }> = ({ error }) => (
  <View style={styles.errorContainer}>
    <Icon name="alert-circle" size={48} color="#ef4444" />
    <Text style={styles.errorTitle}>Location Error</Text>
    <Text style={styles.errorMessage}>{error}</Text>
  </View>
);

const TrackMeScreen: React.FC = () => {
  const { user } = useAuth();
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const mapRef = React.useRef<MapView>(null);

  const fetchAddress = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'User-Agent': 'SHEild-App/1.0',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch address: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setAddress(data.display_name || 'Address not found.');
    } catch (err: any) {
      console.error('Error fetching address:', err);
      const errorMessage = err?.message || 'Unknown error';
      console.error('Address fetch error details:', errorMessage);
      setError('Could not retrieve address information.');
      // Set a fallback address instead of leaving it empty
      setAddress(`Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    }
  }, []);

  const fetchOtherUsersLocations = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const locations = await userLocationService.getVisibleLocations();
      
      // Filter out current user
      const filteredLocations = locations.filter(
        (loc) => loc.userId !== user?.id
      );
      
      setOtherUsers(filteredLocations);
      console.log(`📍 Loaded ${filteredLocations.length} other user locations`);
    } catch (err) {
      console.error('Error fetching other users locations:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.id]);

  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Request permission first
      const hasPermission = await locationService.requestPermission();
      
      if (!hasPermission) {
        setError('Location permission denied. Please enable it in Settings.');
        Alert.alert(
          'Permission Required',
          'Location permission is required to track your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        setLoading(false);
        return;
      }

      // Get current location
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });
          fetchAddress(latitude, longitude).finally(() => setLoading(false));
        },
        (geoError) => {
          console.error('Error getting location:', geoError);
          let errorMessage = 'Unable to get your current location.';
          
          switch (geoError.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Location permission denied. Please enable it in Settings.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Location information is unavailable. Please check your GPS settings.';
              break;
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = geoError.message || 'An unknown error occurred.';
          }
          
          setError(errorMessage);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 10000,
          showLocationDialog: true,
          forceRequestLocation: true,
        }
      );
    } catch (err) {
      console.error('Error in getCurrentLocation:', err);
      setError('Failed to get location. Please try again.');
      setLoading(false);
    }
  }, [fetchAddress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      getCurrentLocation(),
      fetchOtherUsersLocations()
    ]);
    setRefreshing(false);
  }, [getCurrentLocation, fetchOtherUsersLocations]);

  const recenterMap = useCallback(() => {
    if (coordinates && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [coordinates]);

  useEffect(() => {
    getCurrentLocation();
    fetchOtherUsersLocations();
    
    // Refresh other users' locations every 30 seconds
    const interval = setInterval(() => {
      fetchOtherUsersLocations();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [getCurrentLocation, fetchOtherUsersLocations]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Icon name="crosshairs-gps" size={48} color={Colors.primary} />
          <Text style={styles.title}>Track Me</Text>
          <Text style={styles.subtitle}>Your live location tracker</Text>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          {loading && <LoadingSpinner />}
          {error && !loading && <ErrorView error={error} />}
          {!loading && !error && coordinates && (
            <>
              <MapViewComponent 
                coordinates={coordinates} 
                mapRef={mapRef}
                otherUsers={otherUsers}
                currentUserId={user?.id || ''}
              />
              <TouchableOpacity
                style={styles.recenterButton}
                onPress={recenterMap}
              >
                <Icon name="crosshairs-gps" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openMapsFloatingButton}
                onPress={() => {
                  const url = `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;
                  Linking.openURL(url);
                }}
              >
                <Icon name="google-maps" size={20} color="#fff" />
                <Text style={styles.openMapsFloatingText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Retry Button - shown on error */}
        {error && !loading && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={getCurrentLocation}
          >
            <Icon name="refresh" size={20} color="#fff" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry Location</Text>
          </TouchableOpacity>
        )}

        {/* Location Details */}
        <View style={styles.detailsContainer}>
          {loading ? (
            <View style={styles.loadingDetailsContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingDetailsText}>Loading location details...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorDetailsText}>Could not load location details.</Text>
          ) : (
            <>
              {/* Current Coordinates */}
              <View style={styles.detailRow}>
                <View style={styles.iconCircle}>
                  <Icon name="map" size={24} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>GPS Coordinates</Text>
                  <Text style={styles.detailText}>
                    {coordinates?.latitude.toFixed(6) ?? 'N/A'}, {coordinates?.longitude.toFixed(6) ?? 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Current Address */}
              <View style={styles.detailRow}>
                <View style={[styles.iconCircle, styles.iconCirclePurple]}>
                  <Icon name="map-marker" size={24} color="#a855f7" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>Current Address</Text>
                  <Text style={styles.detailText}>
                    {address || 'Fetching address...'}
                  </Text>
                </View>
              </View>

              {/* Accuracy Info */}
              <View style={styles.infoBox}>
                <Icon name="information" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>
                  Pull down to refresh your location
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  mapContainer: {
    width: '100%',
    height: 350,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  openMapsFloatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  openMapsFloatingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  loadingDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingDetailsText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorDetailsText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCirclePurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  detailContent: {
    flex: 1,
    paddingTop: 2,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherUserMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherUserMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  offlineMarker: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default TrackMeScreen;

