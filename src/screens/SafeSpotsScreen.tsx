import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/colors';
import Skeleton, { SkeletonList } from '../components/Skeleton';
import locationService, { Location } from '../services/locationService';
import placesService, { Place } from '../services/placesService';

interface SafeSpotsScreenProps {
  onBack: () => void;
}

const SafeSpotsScreen: React.FC<SafeSpotsScreenProps> = ({ onBack }) => {
  const [safeSpots, setSafeSpots] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  const fetchSafeSpots = useCallback(
    async (location: Location) => {
      try {
        setIsLoading(true);
        const response = await placesService.getSafeSpotsNearMe(location, 2000);
        if (response.success && response.data) {
          setSafeSpots(response.data);
        } else {
          setSafeSpots([]);
        }
      } catch (error) {
        console.error('Error fetching safe spots (SafeSpotsScreen):', error);
        setSafeSpots([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const initialize = useCallback(async () => {
    try {
      const hasPermission = await locationService.requestPermission();
      if (!hasPermission) {
        return;
      }
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        await fetchSafeSpots(location);
      }
    } catch (error) {
      console.error('Error initializing SafeSpotsScreen:', error);
    }
  }, [fetchSafeSpots]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const onRefresh = useCallback(async () => {
    if (!currentLocation) {
      await initialize();
      return;
    }
    setRefreshing(true);
    await fetchSafeSpots(currentLocation);
    setRefreshing(false);
  }, [currentLocation, fetchSafeSpots, initialize]);

  const handlePlacePress = (place: Place) => {
    if (place.geometry?.location) {
      placesService.openMapsDirections(
        place.geometry.location.lat,
        place.geometry.location.lng,
        place.name,
      );
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

  const filterPlacesByQuery = (places: Place[], query: string): Place[] => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((place) => {
      const fields: (string | undefined)[] = [
        place.name,
        place.vicinity,
        place.formatted_address,
        ...(place.types || []),
      ];
      return fields.some((value) => value?.toLowerCase().includes(q));
    });
  };

  const filteredSafeSpots = filterPlacesByQuery(safeSpots, searchText);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Icon name="arrow-left" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>All Safe Spots Nearby</Text>
          </View>

          <View style={styles.fullScreenSearchContainer}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={20} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, category or area..."
                placeholderTextColor={Colors.textLight}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          </View>

          {isLoading ? (
            <SkeletonList items={4} />
          ) : filteredSafeSpots.length > 0 ? (
            <View style={styles.placesContainer}>
              {filteredSafeSpots.map((spot) => (
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
          ) : (
            <View style={styles.emptyState}>
              <Icon name="map-marker-off" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>No safe spots found nearby</Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
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
});

export default SafeSpotsScreen;
