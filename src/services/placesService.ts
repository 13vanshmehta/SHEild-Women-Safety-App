import { Platform, Linking, Alert } from 'react-native';
import { API_CONFIG } from '../constants/api';
import locationService, { Location } from './locationService';

export interface Place {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
  };
  formatted_phone_number?: string;
  international_phone_number?: string;
  distance?: number;
  formattedDistance?: string;
}

export interface PlacesResponse {
  success: boolean;
  data?: Place[];
  message?: string;
}

class PlacesService {
  private apiKey: string = '';

  /**
   * Initialize with Geoapify Places API key
   * Note: In production, this should be stored securely and fetched from backend
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Get safe spots near current location
   * Safe spots include: restaurants, cafes, hotels, hospitals, police stations
   */
  async getSafeSpotsNearMe(
    location: Location,
    radius: number = 2000
  ): Promise<PlacesResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'Geoapify Places API key is not configured',
        };
      }

      // Define safe place types
      const safePlaceTypes = [
        'restaurant',
        'cafe',
        'lodging', // hotels
        'hospital',
        'pharmacy',
        'gas_station',
        'store',
        'shopping_mall',
      ];

      // We'll try increasing radii to make sure we get something in low-density areas
      const radiiToTry = [radius, Math.max(radius * 2, 3000), Math.max(radius * 4, 6000)];
      const allPlaces: Place[] = [];

      for (const r of radiiToTry) {
        for (const type of safePlaceTypes) {
          try {
            const places = await this.searchNearbyPlaces(
              location,
              type,
              r
            );
            if (places && places.length > 0) {
              allPlaces.push(...places);
            }
          } catch (error) {
            console.error(`Error fetching ${type} places (radius ${r}):`, error);
          }
        }

        // If we have a reasonable number of places, stop expanding radius
        if (allPlaces.length >= 10) {
          break;
        }
      }

      // Calculate distances and sort by distance
      const placesWithDistance = allPlaces.map((place) => {
        const distance = locationService.calculateDistance(
          location.latitude,
          location.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );
        return {
          ...place,
          distance,
          formattedDistance: locationService.formatDistance(distance),
        };
      });

      // Sort by distance and remove duplicates
      const uniquePlaces = this.removeDuplicatePlaces(placesWithDistance);
      uniquePlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      return {
        success: true,
        data: uniquePlaces.slice(0, 15), // Return top closest
      };
    } catch (error) {
      console.error('Error getting safe spots:', error);
      return {
        success: false,
        message: 'Failed to fetch safe spots',
      };
    }
  }

  /**
   * Get police stations near current location
   */
  async getPoliceStationsNearMe(
    location: Location,
    radius: number = 5000
  ): Promise<PlacesResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'Geoapify Places API key is not configured',
        };
      }

      // Try with increasing radii to improve chances of finding stations
      const radiiToTry = [radius, Math.max(radius * 2, 8000), Math.max(radius * 4, 15000)];
      let places: Place[] | null = null;

      for (const r of radiiToTry) {
        places = await this.searchNearbyPlaces(
          location,
          'police',
          r
        );
        if (places && places.length > 0) {
          break;
        }
      }

      if (!places || places.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Calculate distances
      const placesWithDetails = await Promise.all(
        places.map(async (place) => {
          const distance = locationService.calculateDistance(
            location.latitude,
            location.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          // Extra details are not needed with Geoapify; keep for compatibility
          const details = await this.getPlaceDetails(place.place_id);

          return {
            ...place,
            ...details,
            distance,
            formattedDistance: locationService.formatDistance(distance),
          };
        })
      );

      // Sort by distance
      placesWithDetails.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      return {
        success: true,
        data: placesWithDetails,
      };
    } catch (error) {
      console.error('Error getting police stations:', error);
      return {
        success: false,
        message: 'Failed to fetch police stations',
      };
    }
  }

  /**
   * Search nearby places using Geoapify Places API
   */
  private async searchNearbyPlaces(
    location: Location,
    type: string,
    radius: number
  ): Promise<Place[] | null> {
    try {
      const isPolice = type === 'police';

      // Map simplified types to Geoapify category filters
      const categoryMap: Record<string, string[]> = {
        restaurant: ['catering.restaurant'],
        cafe: ['catering.cafe'],
        lodging: ['accommodation.hotel', 'accommodation.motel', 'accommodation.guest_house'],
        hospital: ['healthcare.hospital'],
        pharmacy: ['healthcare.pharmacy'],
        gas_station: ['service.vehicle.gas_station'],
        store: ['commercial'],
        shopping_mall: ['commercial.shopping_mall'],
        police: ['service.police'],
      };

      const categories = categoryMap[type] || ['commercial'];

      // Geoapify expects: filter=circle:lon,lat,radius (radius in meters)
      const filter = `circle:${location.longitude},${location.latitude},${radius}`;
      const bias = `proximity:${location.longitude},${location.latitude}`;
      const limit = isPolice ? 20 : 30;

      const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(
        categories.join(',')
      )}&filter=${encodeURIComponent(filter)}&bias=${encodeURIComponent(
        bias
      )}&limit=${limit}&apiKey=${encodeURIComponent(this.apiKey)}`;

      const response = await fetch(url);
      const data = await response.json();


      if (!data || !data.features || !Array.isArray(data.features)) {
        return null;
      }

      // Transform Geoapify response into our Place model
      const places: Place[] = data.features.map((feature: any) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [location.longitude, location.latitude];
        const lon = typeof props.lon === 'number' ? props.lon : coords[0];
        const lat = typeof props.lat === 'number' ? props.lat : coords[1];

        const phoneFromContact = props.contact?.phone;
        const phone = Array.isArray(phoneFromContact)
          ? phoneFromContact[0]
          : phoneFromContact;

        const distanceKm = locationService.calculateDistance(
          location.latitude,
          location.longitude,
          lat,
          lon
        );

        const place: Place = {
          place_id: String(
            props.place_id || props.osm_id || `${lat},${lon},${props.name || ''}`
          ),
          name: props.name || props.address_line1 || props.formatted || 'Unknown place',
          vicinity: props.address_line2 || undefined,
          formatted_address: props.formatted || undefined,
          geometry: {
            location: {
              lat,
              lng: lon,
            },
          },
          types: Array.isArray(props.categories) ? props.categories : [],
          rating: typeof props.rating === 'number' ? props.rating : undefined,
          user_ratings_total:
            typeof props.rating_count === 'number' ? props.rating_count : undefined,
          opening_hours:
            props.opening_hours && typeof props.opening_hours === 'object'
              ? { open_now: !!props.opening_hours.open_now }
              : undefined,
          formatted_phone_number: phone || undefined,
          international_phone_number: phone || undefined,
          distance: distanceKm,
          formattedDistance: locationService.formatDistance(distanceKm),
        };

        return place;
      });

      return places;
    } catch (error) {
      console.error('Error searching nearby places (Geoapify):', error);
      return null;
    }
  }

  /**
   * Geoapify already returns rich place data in the main response,
   * so we don't need a separate details lookup. This is kept for
   * compatibility but simply returns an empty object.
   */
  private async getPlaceDetails(_placeId: string): Promise<Partial<Place>> {
    return {};
  }

  /**
   * Remove duplicate places based on place_id
   */
  private removeDuplicatePlaces(places: Place[]): Place[] {
    const seen = new Set<string>();
    return places.filter((place) => {
      if (seen.has(place.place_id)) {
        return false;
      }
      seen.add(place.place_id);
      return true;
    });
  }

  /**
   * Open maps with directions to a place
   */
  openMapsDirections(
    destinationLat: number,
    destinationLng: number,
    destinationName?: string
  ) {
    // Open the destination in OpenStreetMap so there is no Google Maps dependency.
    const mapUrl = `https://www.openstreetmap.org/?mlat=${destinationLat}&mlon=${destinationLng}#map=16/${destinationLat}/${destinationLng}`;

    Linking.openURL(mapUrl).catch((err) => {
      console.error('Error opening maps:', err);
      // Avoid showing Alert here because it can fire when no Activity is attached.
    });
  }

  /**
   * Make a phone call
   */
  makePhoneCall(phoneNumber: string) {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error making phone call:', err);
      Alert.alert('Error', 'Unable to make phone call');
    });
  }
}

export default new PlacesService();

