import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Linking,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { GEOAPIFY_API_KEY } from '../constants/api';
import Skeleton, { SkeletonList } from '../components/Skeleton';
import locationService, { Location } from '../services/locationService';
import placesService, { Place } from '../services/placesService';
import emergencyContactService, { EmergencyContact } from '../services/emergencyContactService';
import recentContactService from '../services/recentContactService';
import SafeSpotsScreen from './SafeSpotsScreen';

interface SafetyCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface RecentContact {
  id: string;
  name: string;
  phoneNumber: string;
  contactImage: string | null;
  initials: string;
}

// Memory cache to prevent redundant API calls when tab switching
const HOME_CACHE = {
  places: {
    safeSpots: [] as Place[],
    policeStations: [] as Place[],
    location: null as Location | null,
    lastFetched: 0,
  },
  contacts: {
    recent: [] as RecentContact[],
    emergency: [] as EmergencyContact[],
    lastFetched: 0,
  }
};

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showSafeSpotsScreen, setShowSafeSpotsScreen] = useState(false);
  const [showAllPoliceStations, setShowAllPoliceStations] = useState(false);

  // Loading states - start true, will be set false quickly after data loads
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [safeSpots, setSafeSpots] = useState<Place[]>([]);
  const [policeStations, setPoliceStations] = useState<Place[]>([]);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const safetyCategories: SafetyCategory[] = [
    { id: '1', name: 'Emergency', icon: 'alarm-light', color: '#EF4444' },
    { id: '2', name: 'Safe Spots', icon: 'map-marker', color: '#3B82F6' },
    { id: '3', name: 'Trust Circle', icon: 'account-group', color: '#10B981' },
    { id: '4', name: 'Location Share', icon: 'share-variant', color: Colors.primary },
    { id: '5', name: 'Safety Tips', icon: 'shield-check', color: '#F59E0B' },
  ];

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

  // Get initials from name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Fetch recent contacts from app interaction history (not full contact book)
  const fetchRecentContacts = useCallback(async () => {
    try {
      setIsLoadingContacts(true);

      const stored = await recentContactService.getRecentContacts(5);
      const mapped: RecentContact[] = stored.map((entry) => {
        const name = entry.name || entry.phoneNumber;
        return {
          id: entry.id,
          name,
          phoneNumber: entry.phoneNumber,
          contactImage: entry.contactImage || null,
          initials: getInitials(name),
        };
      });

      setRecentContacts(mapped);

      // Update Cache
      HOME_CACHE.contacts.recent = mapped;
      HOME_CACHE.contacts.lastFetched = Date.now();
    } catch (error) {
      console.error('Error loading recent contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  const fetchEmergencyContacts = useCallback(async () => {
    try {
      const response = await emergencyContactService.getEmergencyContacts();
      let contacts: EmergencyContact[] = [];

      if (response.success) {
        if (Array.isArray(response.data)) {
          contacts = response.data;
        } else if ('contacts' in response.data && Array.isArray(response.data.contacts)) {
          contacts = response.data.contacts;
        }
      }

      setEmergencyContacts(contacts);

      // Update Cache
      HOME_CACHE.contacts.emergency = contacts;
      if (!HOME_CACHE.contacts.recent.length) {
        // If we don't have recent yet, we'll update timestamp when recent arrives
      } else {
        HOME_CACHE.contacts.lastFetched = Date.now();
      }
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  }, []);

  // Initialize location and fetch places
  const initializeLocationAndPlaces = useCallback(async () => {
    try {
      // Request location permission
      const hasPermission = await locationService.requestPermission();
      setLocationPermissionGranted(hasPermission);

      if (!hasPermission) {
        return;
      }

      // Get current location
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);

        // Initialize Geoapify Places API
        if (GEOAPIFY_API_KEY) {
          placesService.setApiKey(GEOAPIFY_API_KEY);

          // Fetch safe spots and police stations
          await fetchPlaces(location);
        } else {
          console.warn('Geoapify Places API key is not configured');
        }
      }
    } catch (error) {
      console.error('Error initializing location:', error);
    }
  }, []);

  useEffect(() => {
    // Check if we need to show skeletons or if we have cached data
    const now = Date.now();
    const hasPlacesCache = HOME_CACHE.places.lastFetched > 0 && (now - HOME_CACHE.places.lastFetched < CACHE_TTL);
    const hasContactsCache = HOME_CACHE.contacts.lastFetched > 0 && (now - HOME_CACHE.contacts.lastFetched < CACHE_TTL);

    setIsLoadingPlaces(!hasPlacesCache);
    setIsLoadingContacts(!hasContactsCache);

    // Initial data hydration from cache if available
    if (hasPlacesCache) {
      setSafeSpots(HOME_CACHE.places.safeSpots);
      setPoliceStations(HOME_CACHE.places.policeStations);
      setCurrentLocation(HOME_CACHE.places.location);
      setLocationPermissionGranted(true);
    }

    if (hasContactsCache) {
      setRecentContacts(HOME_CACHE.contacts.recent);
      setEmergencyContacts(HOME_CACHE.contacts.emergency);
    }

    // Set maximum skeleton display time - force hide as fallback
    const maxSkeletonTimeout = setTimeout(() => {
      setIsLoadingPlaces(false);
      setIsLoadingContacts(false);
    }, 5500);

    // Only fetch if cache is stale or missing
    if (!hasPlacesCache) {
      initializeLocationAndPlaces();
    }

    if (!hasContactsCache) {
      fetchRecentContacts();
      fetchEmergencyContacts();
    }

    return () => clearTimeout(maxSkeletonTimeout);
  }, [initializeLocationAndPlaces, fetchRecentContacts, fetchEmergencyContacts]);


  const fetchPlaces = async (location: Location) => {
    try {
      setIsLoadingPlaces(true);

      // Fetch safe spots and police stations in parallel
      const [safeSpotsResponse, policeStationsResponse] = await Promise.all([
        placesService.getSafeSpotsNearMe(location, 2000),
        placesService.getPoliceStationsNearMe(location, 5000),
      ]);

      if (safeSpotsResponse.success && safeSpotsResponse.data) {
        setSafeSpots(safeSpotsResponse.data);
      }

      if (policeStationsResponse.success && policeStationsResponse.data) {
        setPoliceStations(policeStationsResponse.data);
      }

      // Update Cache
      HOME_CACHE.places.safeSpots = safeSpotsResponse.data || [];
      HOME_CACHE.places.policeStations = policeStationsResponse.data || [];
      HOME_CACHE.places.location = location;
      HOME_CACHE.places.lastFetched = Date.now();
    } catch (error) {
      console.error('Error fetching places:', error);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Refresh all data in parallel
    await Promise.all([
      currentLocation ? fetchPlaces(currentLocation) : initializeLocationAndPlaces(),
      fetchRecentContacts(),
    ]);

    setRefreshing(false);
  }, [currentLocation, fetchRecentContacts, initializeLocationAndPlaces]);

  const handleSOS = () => {
    Alert.alert(
      'SOS Alert',
      'Emergency alert will be sent to your trusted contacts',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: () => console.log('SOS sent') },
      ]
    );
  };

  const handleSafeSpots = () => {
    // Navigate to dedicated Safe Spots screen
    setShowSafeSpotsScreen(true);
  };

  const openAllSafeSpots = () => {
    setShowSafeSpotsScreen(true);
  };

  const openAllPoliceStations = () => {
    setShowAllPoliceStations(true);
  };

  const handleCategoryPress = (categoryId: string) => {
    switch (categoryId) {
      case '1':
        handleSOS();
        break;
      case '2':
        handleSafeSpots();
        break;
      case '3':
        console.log('Open Trust Circle');
        break;
      case '4':
        console.log('Share Location');
        break;
      case '5':
        console.log('View Safety Tips');
        break;
      default:
        break;
    }
  };

  const handleContactCall = async (contact: RecentContact) => {
    try {
      await recentContactService.addRecentContact({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        contactImage: contact.contactImage || undefined,
      });
      fetchRecentContacts();

      const phoneNumber = contact.phoneNumber.replace(/\D/g, ''); // Remove formatting
      Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
        console.error('Error making phone call:', err);
        Alert.alert('Error', 'Unable to make phone call');
      });
    } catch (error) {
      console.error('Error updating recent contacts on call:', error);
    }
  };

  const handleContactText = async (contact: RecentContact) => {
    try {
      await recentContactService.addRecentContact({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        contactImage: contact.contactImage || undefined,
      });
      fetchRecentContacts();

      const phoneNumber = contact.phoneNumber.replace(/\D/g, ''); // Remove formatting
      Linking.openURL(`sms:${phoneNumber}`).catch((err) => {
        console.error('Error opening SMS:', err);
        Alert.alert('Error', 'Unable to open SMS');
      });
    } catch (error) {
      console.error('Error updating recent contacts on text:', error);
    }
  };

  const handlePlacePress = (place: Place) => {
    if (place.geometry?.location) {
      placesService.openMapsDirections(
        place.geometry.location.lat,
        place.geometry.location.lng,
        place.name
      );
    }
  };

  const handlePoliceStationCall = (place: Place, event: any) => {
    event.stopPropagation();
    const phoneNumber = place.formatted_phone_number || place.international_phone_number;
    if (phoneNumber) {
      placesService.makePhoneCall(phoneNumber);
    } else {
      Alert.alert('No Phone Number', 'Phone number is not available for this police station.');
    }
  };

  const isInEmergencyContacts = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!cleaned) return false;
    return emergencyContacts.some((contact) =>
      (contact.phoneNumber || '').replace(/\D/g, '') === cleaned,
    );
  };

  const handleAddToEmergency = async (contact: RecentContact) => {
    try {
      const cleaned = contact.phoneNumber.replace(/\D/g, '');
      const payload: Omit<EmergencyContact, '_id' | 'createdAt' | 'updatedAt'> = {
        name: contact.name,
        phoneNumber: cleaned,
        email: undefined,
        relationship: 'friend',
        isPrimary: false,
        isActive: true,
        addedFrom: 'contact_book',
        contactImage: contact.contactImage || undefined,
        notes: undefined,
        emergencyPriority: 3,
      };

      const response = await emergencyContactService.createEmergencyContact(payload);
      if (response.success) {
        Alert.alert('Added', `${contact.name} has been added to emergency contacts`);
        fetchEmergencyContacts();
      } else {
        Alert.alert('Error', response.message || 'Failed to add emergency contact');
      }
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      Alert.alert('Error', 'Unable to add to emergency contacts');
    }
  };

  const getPlaceIcon = (place: Place): string => {
    if (place.types?.some(type => type.includes('police'))) {
      return 'police-badge';
    }
    if (place.types?.some(type => type.includes('hospital'))) {
      return 'hospital-building';
    }
    if (place.types?.some(type => type.includes('restaurant') || type.includes('cafe'))) {
      return 'silverware-fork-knife';
    }
    if (place.types?.some(type => type.includes('lodging'))) {
      return 'hotel';
    }
    if (place.types?.some(type => type.includes('gas_station'))) {
      return 'gas-station';
    }
    return 'map-marker';
  };

  const getPlaceColor = (place: Place): string => {
    if (place.types?.some(type => type.includes('police'))) {
      return Colors.primary;
    }
    if (place.types?.some(type => type.includes('hospital'))) {
      return Colors.success;
    }
    if (place.types?.some(type => type.includes('restaurant') || type.includes('cafe'))) {
      return Colors.warning;
    }
    return Colors.info;
  };

  if (showSafeSpotsScreen) {
    return (
      <SafeSpotsScreen
        onBack={() => setShowSafeSpotsScreen(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Greeting Section */}
        <View style={styles.greetingContainer}>
          <View style={styles.greetingContent}>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingText}>Hello,</Text>
              <Text style={styles.userNameText}>{userName}!</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Icon name="bell-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="magnify" size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search safe spots, contacts..."
              placeholderTextColor={Colors.textLight}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Safety Categories */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {safetyCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Icon name={category.icon} size={24} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Police Stations (top 2) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="police-badge" size={20} color={Colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Police Stations</Text>
            </View>
            {locationPermissionGranted ? (
              <TouchableOpacity onPress={openAllPoliceStations}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={initializeLocationAndPlaces}>
                <Text style={styles.enableLocationText}>Enable Location</Text>
              </TouchableOpacity>
            )}
          </View>
          {isLoadingPlaces ? (
            <SkeletonList items={3} />
          ) : policeStations.length > 0 ? (
            <View style={styles.placesContainer}>
              {policeStations
                .slice(0, showAllPoliceStations ? policeStations.length : 2)
                .map((station) => (
                  <TouchableOpacity
                    key={station.place_id}
                    style={styles.placeCard}
                    onPress={() => handlePlacePress(station)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.placeIcon, { backgroundColor: Colors.primary + '20' }]}>
                      <Icon name="police-badge" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName} numberOfLines={1}>{station.name}</Text>
                      <Text style={styles.placeAddress} numberOfLines={1}>
                        {station.vicinity || station.formatted_address || 'Address not available'}
                      </Text>
                      <View style={styles.placeMeta}>
                        <Text style={styles.placeDistance}>{station.formattedDistance || 'Distance unknown'}</Text>
                        {station.opening_hours?.open_now !== undefined && (
                          <Text style={[styles.placeStatus, station.opening_hours.open_now && styles.placeStatusOpen]}>
                            {station.opening_hours.open_now ? 'Open Now' : 'Closed'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.placeActions}>
                      {station.formatted_phone_number || station.international_phone_number ? (
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={(e) => handlePoliceStationCall(station, e)}
                        >
                          <Icon name="phone" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      ) : null}
                      <Icon name="chevron-right" size={20} color={Colors.textLight} />
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          ) : locationPermissionGranted ? (
            <View style={styles.emptyState}>
              <Icon name="map-marker-off" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>No police stations found nearby</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="map-marker-question" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>Enable location to find police stations</Text>
              <TouchableOpacity style={styles.enableButton} onPress={initializeLocationAndPlaces}>
                <Text style={styles.enableButtonText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Safe Spots (top 5) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="shield-check" size={20} color={Colors.success} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Safe Spots</Text>
            </View>
            <TouchableOpacity onPress={openAllSafeSpots}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {isLoadingPlaces ? (
            <SkeletonList items={3} />
          ) : safeSpots.length > 0 ? (
            <View style={styles.placesContainer}>
              {safeSpots.slice(0, 5).map((spot) => (
                <TouchableOpacity
                  key={spot.place_id}
                  style={styles.placeCard}
                  onPress={() => handlePlacePress(spot)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.placeIcon, { backgroundColor: getPlaceColor(spot) + '20' }]}>
                    <Icon name={getPlaceIcon(spot)} size={24} color={getPlaceColor(spot)} />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName} numberOfLines={1}>{spot.name}</Text>
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {spot.vicinity || spot.formatted_address || 'Address not available'}
                    </Text>
                    <View style={styles.placeMeta}>
                      <Text style={styles.placeDistance}>{spot.formattedDistance || 'Distance unknown'}</Text>
                      {spot.opening_hours?.open_now !== undefined && (
                        <Text style={[styles.placeStatus, spot.opening_hours.open_now && styles.placeStatusOpen]}>
                          {spot.opening_hours.open_now ? 'Open Now' : 'Closed'}
                        </Text>
                      )}
                      {spot.rating && (
                        <View style={styles.ratingContainer}>
                          <Icon name="star" size={12} color={Colors.warning} />
                          <Text style={styles.ratingText}>{spot.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} color={Colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          ) : locationPermissionGranted ? (
            <View style={styles.emptyState}>
              <Icon name="map-marker-off" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>No safe spots found nearby</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="map-marker-question" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>Enable location to find safe spots</Text>
              <TouchableOpacity style={styles.enableButton} onPress={initializeLocationAndPlaces}>
                <Text style={styles.enableButtonText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Contacts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {isLoadingContacts ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <Skeleton width={60} height={60} borderRadius={30} style={styles.contactImageSkeleton} />
                    <View style={styles.contactInfo}>
                      <Skeleton width="80%" height={18} style={styles.contactNameSkeleton} />
                      <Skeleton width="90%" height={14} style={styles.contactPhoneSkeleton} />
                    </View>
                  </View>
                  <View style={styles.contactActions}>
                    <Skeleton width={40} height={40} borderRadius={20} style={styles.actionButtonSkeleton} />
                    <Skeleton width={80} height={32} borderRadius={16} style={styles.actionButtonSkeleton} />
                    <Skeleton width={40} height={40} borderRadius={20} style={styles.actionButtonSkeleton} />
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : recentContacts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
              {recentContacts.map((contact) => {
                const inEmergency = isInEmergencyContacts(contact.phoneNumber);
                return (
                  <TouchableOpacity key={contact.id} style={styles.contactCard}>
                    <View style={styles.contactHeader}>
                      <View style={styles.contactImageContainer}>
                        {contact.contactImage ? (
                          <Image source={{ uri: contact.contactImage }} style={styles.contactImage} />
                        ) : (
                          <View style={styles.contactInitialsContainer}>
                            <Text style={styles.contactInitials}>{contact.initials}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                        <Text style={styles.contactPhone} numberOfLines={1}>{contact.phoneNumber}</Text>
                      </View>
                    </View>
                    <View style={styles.contactActions}>
                      <TouchableOpacity
                        style={styles.contactCallButton}
                        onPress={() => handleContactCall(contact)}
                      >
                        <Icon name="phone" size={18} color="#FFFFFF" />
                      </TouchableOpacity>

                      {inEmergency ? (
                        <View style={styles.contactAddPlaceholder} />
                      ) : (
                        <TouchableOpacity
                          style={styles.contactAddButton}
                          onPress={() => handleAddToEmergency(contact)}
                        >
                          <Icon name="shield-plus" size={16} color={Colors.primary} />
                          <Text style={styles.contactAddButtonText}>Add</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.textButton}
                        onPress={() => handleContactText(contact)}
                      >
                        <Icon name="message-text" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="account-off" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>No contacts found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greetingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userNameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: -5,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  enableLocationText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  categoriesScroll: {
    marginBottom: 10,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  // Upcoming Safety Check-in (Nearest Police Station) Styles
  upcomingCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  upcomingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  upcomingDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 10,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  upcomingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upcomingMetaText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  upcomingPillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF20',
    gap: 6,
  },
  upcomingPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  upcomingPillSecondaryText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  upcomingCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  upcomingCallButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  upcomingDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  upcomingDirectionsButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  placesContainer: {
    gap: 12,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  placeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  placeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeDistance: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  placeStatus: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  placeStatusOpen: {
    color: Colors.success,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  placeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  enableButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enableButtonText: {
    color: Colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  contactsScroll: {
    marginBottom: 10,
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginRight: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 260,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  contactImageContainer: {
    marginRight: 12,
  },
  contactImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  contactInitialsContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    paddingTop: 4,
  },
  contactName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  contactCallButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  contactAddButton: {
    minWidth: 80,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 6,
  },
  contactAddButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  contactAddPlaceholder: {
    minWidth: 80,
    height: 32,
  },
  textButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: Colors.background,
  },
  fullScreenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  fullScreenSearchContainer: {
    marginBottom: 16,
  },
  // Skeleton styles
  contactImageSkeleton: {
    marginRight: 12,
  },
  contactNameSkeleton: {
    marginBottom: 8,
  },
  contactPhoneSkeleton: {
    marginBottom: 8,
  },
  actionButtonSkeleton: {
    marginRight: 12,
  },
});

export default HomeScreen;
