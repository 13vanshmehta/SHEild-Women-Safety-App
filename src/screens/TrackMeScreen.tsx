import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants';
import Geolocation from 'react-native-geolocation-service';
import locationService from '../services/locationService';
import userLocationService from '../services/userLocationService';
import emergencyContactService, { EmergencyContact } from '../services/emergencyContactService';
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
  phoneNumber?: string | null;
  profilePicture: string | null;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  isOnline: boolean;
}

interface EmergencyContactLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  matchedUserId: string;
  matchedBy: 'email' | 'phone';
}

// --- COMPONENT DEFINITIONS (Outside main component) ---
const MapViewComponent: React.FC<{
  coordinates: Coordinates | null;
  otherUsers: UserLocation[];
  emergencyContactLocations: EmergencyContactLocation[];
  userAvatar: string | null;
  onInteractionChange: (isInteracting: boolean) => void;
}> = ({ coordinates, otherUsers, emergencyContactLocations, userAvatar, onInteractionChange }) => {
  if (!coordinates) return null;

  // Resolve the local avatar image
  const defaultAvatarUri = Image.resolveAssetSource(require('../assets/images/map-avatar.jpg')).uri;

  const mapDataJson = JSON.stringify({
    current: coordinates,
    otherUsers,
    emergencyContactLocations,
    defaultAvatarUri,
    userAvatar
  });

  const mapHtml = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />',
    '<style>',
    'html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #111827; }',
    '.leaflet-container { background: #111827; }',
    '.marker-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }',
    '.avatar-pin { width: 44px; height: 44px; border-radius: 22px; position: relative; background: #fff; border: 2.5px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 2; display: flex; align-items: center; justify-content: center; }',
    '.avatar-pin::after { content: ""; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #fff; z-index: 1; }',
    '.avatar-pin.self { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }',
    '.avatar-pin.self::after { border-top-color: #3b82f6; }',
    '.avatar-pin.offline { opacity: 0.7; filter: grayscale(0.3); }',
    '.avatar-pin.group { border-color: #f59e0b; box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); }',
    '.avatar-pin.group::after { border-top-color: #f59e0b; }',
    '.avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }',
    '.group-badge { position: absolute; top: -10px; right: -10px; background: #f59e0b; color: #fff; font-size: 11px; font-weight: 900; width: 22px; height: 22px; border-radius: 11px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 5; }',
    '.marker-label { margin-top: 10px; display: flex; gap: 4px; z-index: 3; }',
    '.tag { padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #fff; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); text-transform: uppercase; letter-spacing: 0.5px; }',
    '.tag.online { background: rgba(34, 197, 94, 0.9); }',
    '.tag.offline { background: rgba(100, 116, 139, 0.9); }',
    '.tag.self { background: rgba(59, 130, 246, 0.9); }',
    '.online-dot { width: 12px; height: 12px; border-radius: 6px; background: #22c55e; border: 2.5px solid #fff; position: absolute; top: 0; right: 0; z-index: 4; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }',
    '</style>',
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
    '</head>',
    '<body>',
    '<div id="map"></div>',
    '<script>',
    'try {',
    'var mapData = ' + mapDataJson + ';',
    "var map = L.map('map', { zoomControl: false, attributionControl: true });",
    "L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);",
    'var interactionTimer = null;',
    "function notifyInteraction(active) { if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(active ? 'MAP_INTERACTION_START' : 'MAP_INTERACTION_END'); } }",
    'function startInteraction() { if (interactionTimer) { clearTimeout(interactionTimer); interactionTimer = null; } notifyInteraction(true); }',
    'function stopInteractionSoon() { if (interactionTimer) { clearTimeout(interactionTimer); } interactionTimer = setTimeout(function () { notifyInteraction(false); }, 180); }',
    "function formatDateTime(dateStr) { if(!dateStr) return ''; var date = new Date(dateStr); var d = date.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' }); var t = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); return d + ', ' + t; }",
    "function createMarkerHtml(avatarUrl, label, isOnline, isSelf, count) { " +
    "  var avatar = (avatarUrl && avatarUrl.trim() !== '') ? avatarUrl : mapData.defaultAvatarUri; " +
    "  var html = '<div class=\"marker-wrap\">'; " +
    "  if (count > 1) { " +
    "    html += '<div class=\"avatar-pin group' + (isSelf ? ' self' : '') + '\">'; " +
    "    html += '<img src=\"' + avatar + '\" class=\"avatar-img\" />'; " +
    "    html += '<div class=\"group-badge\">' + count + '</div>'; " +
    "    html += '</div>'; " +
    "  } else { " +
    "    html += '<div class=\"avatar-pin' + (isSelf ? ' self' : '') + (!isOnline && !isSelf ? ' offline' : '') + '\">'; " +
    "    html += '<img src=\"' + avatar + '\" class=\"avatar-img\" />'; " +
    "    if (isOnline) html += '<div class=\"online-dot\"></div>'; " +
    "    html += '</div>'; " +
    "  } " +
    "  if (label) html += '<div class=\"marker-label\">' + label + '</div>'; " +
    "  html += '</div>'; " +
    "  return html; " +
    "}",
    "function addMarker(lat, lng, html, popupText, isSelf) { var icon = L.divIcon({ className: '', html: html, iconSize: [44, 70], iconAnchor: [22, 52], popupAnchor: [0, -50] }); var marker = L.marker([lat, lng], { icon: icon, zIndexOffset: isSelf ? 1000 : 0 }).addTo(map); if (popupText) { marker.bindPopup(popupText); } return marker; }",
    'var points = []; var clusters = {};',
    'var currentLat = parseFloat(mapData.current.latitude); var currentLng = parseFloat(mapData.current.longitude);',
    'var selfKey = currentLat.toFixed(4) + \",\" + currentLng.toFixed(4);',
    'clusters[selfKey] = [{ type: \"self\", data: mapData.current }];',
    'if (mapData.otherUsers) { for (var i=0; i<mapData.otherUsers.length; i++) { var u = mapData.otherUsers[i]; var uLat = parseFloat(u.latitude); var uLng = parseFloat(u.longitude); var key = uLat.toFixed(4) + \",\" + uLng.toFixed(4); if (!clusters[key]) clusters[key] = []; clusters[key].push({ type: \"user\", data: u }); } }',
    'if (mapData.emergencyContactLocations) { for (var j=0; j<mapData.emergencyContactLocations.length; j++) { var c = mapData.emergencyContactLocations[j]; var cLat = parseFloat(c.latitude); var cLng = parseFloat(c.longitude); var key = cLat.toFixed(4) + \",\" + cLng.toFixed(4); if (!clusters[key]) clusters[key] = []; clusters[key].push({ type: \"contact\", data: c }); } }',
    'for (var k in clusters) { ' +
    '  var items = clusters[k]; var pos = k.split(\",\"); var lat = parseFloat(pos[0]); var lng = parseFloat(pos[1]); points.push([lat, lng]); ' +
    '  var isSelf = false; var primaryItem = items[0]; var anyOnline = false; var onlineCount = 0; var offlineCount = 0; ' +
    '  for (var m=0; m<items.length; m++) { ' +
    '    var isItemOnline = (items[m].type === \"self\" || (items[m].data && items[m].data.isOnline)); ' +
    '    if (isItemOnline) { onlineCount++; anyOnline = true; } else { offlineCount++; } ' +
    '    if (items[m].type === \"self\") { isSelf = true; primaryItem = items[m]; } ' +
    '  } ' +
    '  if (items.length > 1) { ' +
    '    var label = \"\"; ' +
    '    if (onlineCount > 0) label += \"<div class=\'tag online\'>\" + onlineCount + \" Online</div>\"; ' +
    '    if (offlineCount > 0) label += \"<div class=\'tag offline\'>\" + offlineCount + \" Offline</div>\"; ' +
    '    var html = createMarkerHtml(isSelf ? mapData.userAvatar : primaryItem.data.profilePicture, label, anyOnline, isSelf, items.length); ' +
    '    var popupHtml = \"<div style=\'min-width:120px\'><b>\" + items.length + \" People here:</b><hr style=\'margin:5px 0;opacity:0.2\'/>\"; ' +
    '    for (var n=0; n<items.length; n++) { ' +
    '      var item = items[n]; var name = item.type === \"self\" ? \"You\" : (item.data.firstName || item.data.name || \"User\"); ' +
    '      var isOnline = (item.type === \"self\" || (item.data && item.data.isOnline)); ' +
    '      var timeStr = formatDateTime(item.data.lastUpdated || item.data.lastActiveAt); ' +
    '      var statusText = isOnline ? \"<span style=\'color:#22c55e\'>● Online</span>\" : \"<span style=\'color:#64748b\'>Last seen: \" + timeStr + \"</span>\"; ' +
    '      popupHtml += \"<div style=\'margin-bottom:4px\'>\" + name + \" \" + statusText + \"</div>\"; ' +
    '    } ' +
    '    popupHtml += \"</div>\"; ' +
    '    addMarker(lat, lng, html, popupHtml, isSelf); ' +
    '  } else { ' +
    '    if (primaryItem.type === \"self\") { ' +
    '      addMarker(lat, lng, createMarkerHtml(mapData.userAvatar, \"<div class=\'tag self\'>You</div>\", true, true, 1), \"<b>Your Location</b>\", true); ' +
    '    } else if (primaryItem.type === \"user\") { ' +
    '      var u = primaryItem.data; var timeStr = formatDateTime(u.lastUpdated || u.lastActiveAt); ' +
    '      var statusText = u.isOnline ? \"<span style=\'color:#22c55e\'>● Online</span>\" : \"<span style=\'color:#64748b\'>Last seen: \" + timeStr + \"</span>\"; ' +
    '      var tagClass = u.isOnline ? \"online\" : \"offline\"; ' +
    '      addMarker(lat, lng, createMarkerHtml(u.profilePicture, \"<div class=\'tag \" + tagClass + \"\'>\" + u.firstName + \"</div>\", u.isOnline, false, 1), \"<b>\" + u.firstName + \"</b><br/>\" + statusText, false); ' +
    '    } else { ' +
    '      var c = primaryItem.data; ' +
    '      addMarker(lat, lng, createMarkerHtml(null, c.name, false, false, 1), \"<b>\" + c.name + \"</b> (Emergency)\", false); ' +
    '    } ' +
    '  } ' +
    '}',
    'if (points.length > 1) { map.fitBounds(points, { padding: [36, 36] }); } else { map.setView([currentLat, currentLng], 15); }',
    '[\"dragstart\", \"zoomstart\", \"movestart\"].forEach(function (eventName) { map.on(eventName, startInteraction); });',
    '[\"dragend\", \"zoomend\", \"moveend\"].forEach(function (eventName) { map.on(eventName, stopInteractionSoon); });',
    'var mapElement = document.getElementById(\"map\");',
    'mapElement.addEventListener(\"touchstart\", startInteraction, { passive: true });',
    'mapElement.addEventListener(\"touchend\", stopInteractionSoon, { passive: true });',
    '} catch (err) { if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(\"MAP_ERROR: \" + err.message); } }',
    '</script>',
    '</body>',
    '</html>',
  ].join('');

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: mapHtml }}
      style={styles.map}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      onLoadEnd={() => onInteractionChange(false)}
      onMessage={(event) => {
        const message = event.nativeEvent.data;
        if (message === 'MAP_INTERACTION_START') {
          onInteractionChange(true);
        } else if (message === 'MAP_INTERACTION_END') {
          onInteractionChange(false);
        } else if (message.startsWith('MAP_ERROR:')) {
          console.error('🔴 ' + message);
        }
      }}
      startInLoadingState={true}
      renderLoading={() => <View style={styles.mapLoadingOverlay} />}
    />
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
  const [_isMapInteracting, setIsMapInteracting] = useState<boolean>(false);
  const [showDetailsToggle, setShowDetailsToggle] = useState<boolean>(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState<boolean>(false);
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const screenFadeAnim = React.useRef(new Animated.Value(0)).current;
  const screenTranslateAnim = React.useRef(new Animated.Value(14)).current;
  const popupOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const popupScaleAnim = React.useRef(new Animated.Value(0.92)).current;

  const openDetailsPopup = useCallback(() => {
    setShowDetailsPopup(true);
    setShowDetailsToggle(true);

    Animated.parallel([
      Animated.timing(popupOpacityAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(popupScaleAnim, {
        toValue: 1,
        damping: 16,
        stiffness: 210,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [popupOpacityAnim, popupScaleAnim]);

  const closeDetailsPopup = useCallback(() => {
    Animated.parallel([
      Animated.timing(popupOpacityAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(popupScaleAnim, {
        toValue: 0.92,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDetailsPopup(false);
      setShowDetailsToggle(false);
    });
  }, [popupOpacityAnim, popupScaleAnim]);

  const normalizePhone = useCallback((value?: string | null) => {
    if (!value) return '';
    return value.replace(/\D/g, '');
  }, []);

  const emergencyContactLocations = React.useMemo<EmergencyContactLocation[]>(() => {
    if (otherUsers.length === 0 || emergencyContacts.length === 0) return [];

    const results: EmergencyContactLocation[] = [];
    const seenUserIds = new Set<string>();

    for (const contact of emergencyContacts) {
      const contactEmail = (contact.email || '').trim().toLowerCase();
      const contactPhone = normalizePhone(contact.phoneNumber);

      const matchedUser = otherUsers.find((locationUser) => {
        if (seenUserIds.has(locationUser.userId)) return false;

        const userEmail = (locationUser.email || '').trim().toLowerCase();
        const userPhone = normalizePhone(locationUser.phoneNumber);

        if (contactEmail && userEmail && contactEmail === userEmail) {
          return true;
        }

        if (contactPhone && userPhone && contactPhone === userPhone) {
          return true;
        }

        return false;
      });

      if (matchedUser) {
        seenUserIds.add(matchedUser.userId);
        const matchedBy: 'email' | 'phone' =
          contactEmail && matchedUser.email && contactEmail === matchedUser.email.trim().toLowerCase()
            ? 'email'
            : 'phone';

        results.push({
          id: contact._id || `${matchedUser.userId}-${contact.name}`,
          name: contact.name,
          latitude: matchedUser.latitude,
          longitude: matchedUser.longitude,
          matchedUserId: matchedUser.userId,
          matchedBy,
        });
      }
    }

    return results;
  }, [otherUsers, emergencyContacts, normalizePhone]);

  const nonEmergencyOtherUsers = React.useMemo(() => {
    if (emergencyContactLocations.length === 0) return otherUsers;
    const emergencyUserIds = new Set(emergencyContactLocations.map((c) => c.matchedUserId));
    return otherUsers.filter((locationUser) => !emergencyUserIds.has(locationUser.userId));
  }, [otherUsers, emergencyContactLocations]);

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
      const locations = await userLocationService.getVisibleLocations();

      const currentUserId = user?.id;
      const filteredLocations = locations.filter(
        (loc) => loc.userId !== currentUserId
      );

      setOtherUsers(filteredLocations);
    } catch (err) {
      console.error('Error fetching other users locations:', err);
    }
  }, [user?.id]);

  const fetchEmergencyContacts = useCallback(async () => {
    try {
      const response = await emergencyContactService.getEmergencyContacts({ page: 1, limit: 200 });

      if (!response?.success || !response.data) {
        setEmergencyContacts([]);
        return;
      }

      if (Array.isArray(response.data)) {
        setEmergencyContacts(response.data);
        return;
      }

      if ('contacts' in response.data && Array.isArray(response.data.contacts)) {
        setEmergencyContacts(response.data.contacts);
        return;
      }

      setEmergencyContacts([]);
    } catch (err) {
      console.error('Error fetching emergency contacts for Track Me:', err);
      setEmergencyContacts([]);
    }
  }, []);

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
      fetchOtherUsersLocations(),
      fetchEmergencyContacts(),
    ]);
    setRefreshing(false);
  }, [getCurrentLocation, fetchOtherUsersLocations, fetchEmergencyContacts]);

  const recenterMap = useCallback(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    getCurrentLocation();
    fetchOtherUsersLocations();
    fetchEmergencyContacts();

    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Subscribe to real-time updates
    userLocationService.subscribeToLocationUpdates((updatedLoc) => {
      setOtherUsers((prev) => {
        const index = prev.findIndex((u) => u.userId === updatedLoc.userId);
        if (index !== -1) {
          const newUsers = [...prev];
          newUsers[index] = updatedLoc;
          return newUsers;
        }
        return [...prev, updatedLoc];
      });
    });

    // Refresh other users' locations every 30 seconds (fallback)
    const interval = setInterval(() => {
      fetchOtherUsersLocations();
    }, 30000);

    return () => {
      clearInterval(interval);
      userLocationService.unsubscribeFromLocationUpdates();
    };
  }, [getCurrentLocation, fetchOtherUsersLocations, fetchEmergencyContacts, screenFadeAnim, screenTranslateAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.screenAnimWrap,
          {
            opacity: screenFadeAnim,
            transform: [{ translateY: screenTranslateAnim }],
          },
        ]}
      >
        <View style={styles.mapContainer}>
          {loading && <LoadingSpinner />}
          {error && !loading && <ErrorView error={error} />}
          {!loading && !error && coordinates && (
            <>
              <MapViewComponent
                coordinates={coordinates}
                otherUsers={nonEmergencyOtherUsers}
                emergencyContactLocations={emergencyContactLocations}
                userAvatar={user?.profilePicture || null}
                onInteractionChange={setIsMapInteracting}
              />
              <View style={styles.mapTopOverlay}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <View style={styles.overlayStatPill}>
                  <Text style={styles.overlayStatNumber}>{nonEmergencyOtherUsers.length}</Text>
                  <Text style={styles.overlayStatText}>Visible</Text>
                </View>
                <View style={[styles.overlayStatPill, styles.overlayStatPillEmergency]}>
                  <Text style={styles.overlayStatNumber}>{emergencyContactLocations.length}</Text>
                  <Text style={styles.overlayStatText}>Emergency</Text>
                </View>
              </View>

              <View style={styles.interactionHint}>
                <Icon name="gesture-pinch" size={14} color="#0f172a" />
                <Text style={styles.interactionHintText}>Pinch/drag map without screen scroll</Text>
              </View>

              <TouchableOpacity
                style={styles.recenterButton}
                onPress={recenterMap}
              >
                <Icon name="crosshairs-gps" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.headerBar}>
            <View>
              <Text style={styles.title}>Track Me</Text>
              <Text style={styles.subtitle}>Live location intelligence</Text>
            </View>
            <TouchableOpacity
              style={styles.headerToggleButton}
              onPress={() => {
                if (showDetailsPopup) {
                  closeDetailsPopup();
                } else {
                  openDetailsPopup();
                }
              }}
            >
              <Icon name={showDetailsToggle ? 'close' : 'tune-variant'} size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.floatingRefreshButton} onPress={onRefresh}>
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon name="refresh" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>

          {error && !loading && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={getCurrentLocation}
            >
              <Icon name="refresh" size={20} color="#fff" style={styles.retryIcon} />
              <Text style={styles.retryText}>Retry Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {showDetailsPopup && (
          <View style={styles.popupLayer}>
            <Pressable style={styles.popupBackdrop} onPress={closeDetailsPopup} />
            <Animated.View
              style={[
                styles.detailsPopup,
                {
                  opacity: popupOpacityAnim,
                  transform: [{ scale: popupScaleAnim }],
                },
              ]}
            >
              <View style={styles.detailsDropdownHeader}>
                <Text style={styles.detailsDropdownTitle}>Track Details</Text>
                <TouchableOpacity style={styles.dropdownRefreshButton} onPress={onRefresh}>
                  <Icon name="refresh" size={16} color={Colors.primary} />
                  <Text style={styles.dropdownRefreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingDetailsContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingDetailsText}>Loading location details...</Text>
                </View>
              ) : error ? (
                <Text style={styles.errorDetailsText}>Could not load location details.</Text>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                      <Icon name="map" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailTitle}>GPS Coordinates</Text>
                      <Text style={styles.detailText}>
                        {coordinates?.latitude.toFixed(6) ?? 'N/A'}, {coordinates?.longitude.toFixed(6) ?? 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={[styles.iconCircle, styles.iconCirclePurple]}>
                      <Icon name="map-marker" size={20} color="#a855f7" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailTitle}>Current Address</Text>
                      <Text style={styles.detailText}>{address || 'Fetching address...'}</Text>
                    </View>
                  </View>

                  <View style={styles.footerMetaRow}>
                    <View style={styles.metaChip}>
                      <Icon name="information-outline" size={14} color="#475569" />
                      <Text style={styles.metaChipText}>Pull to refresh</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Icon name="shield-account" size={14} color="#ef4444" />
                      <Text style={styles.metaChipText}>Emergency linked: {emergencyContactLocations.length}</Text>
                    </View>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  screenAnimWrap: {
    flex: 1,
  },
  headerBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  headerToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  popupLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 72,
    paddingHorizontal: 12,
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  detailsPopup: {
    width: '92%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
  },
  detailsDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsDropdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  dropdownRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dropdownRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  mapTopOverlay: {
    position: 'absolute',
    top: 88,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ecfeff',
    letterSpacing: 0.6,
  },
  overlayStatPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  overlayStatPillEmergency: {
    backgroundColor: 'rgba(254,242,242,0.95)',
  },
  overlayStatNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  overlayStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  interactionHint: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(241,245,249,0.92)',
  },
  interactionHintText: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
  },
  recenterButton: {
    position: 'absolute',
    top: 86,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingRefreshButton: {
    position: 'absolute',
    bottom: 90,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
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
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
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
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
});

export default TrackMeScreen;

