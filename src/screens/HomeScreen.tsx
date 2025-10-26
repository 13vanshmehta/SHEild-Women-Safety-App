import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants';

interface SafeZone {
  id: string;
  name: string;
  distance: string;
  status: 'safe' | 'moderate' | 'unsafe';
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([
    { id: '1', name: 'Central Park', distance: '0.5 km', status: 'safe' },
    { id: '2', name: 'Local Cafe', distance: '1.2 km', status: 'safe' },
    { id: '3', name: 'Shopping Mall', distance: '2.3 km', status: 'moderate' },
  ]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="grid" size={24} color={Colors.text} />
        </View>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={styles.headerRight}>
          <Icon name="bell-outline" size={24} color={Colors.text} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hi {user?.firstName || 'User'}!</Text>
          <Text style={styles.greetingSubtext}>{greeting}</Text>
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome!</Text>
            <Text style={styles.welcomeDescription}>Your Safety is Our Priority</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Icon name="shield-check" size={80} color={Colors.primaryLight} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={handleSOS}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="alarm-light" size={32} color="#DC2626" />
              </View>
              <Text style={styles.actionTitle}>Emergency SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Icon name="map-marker" size={32} color="#2563EB" />
              </View>
              <Text style={styles.actionTitle}>Share Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Icon name="account-group" size={32} color="#059669" />
              </View>
              <Text style={styles.actionTitle}>Trust Circle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3F4F6' }]}>
                <Icon name="shield-home" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.actionTitle}>Safe Zones</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nearby Safe Zones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Safe Zones</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {safeZones.map((zone) => (
            <TouchableOpacity key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneInfo}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: zone.status === 'safe' ? Colors.success : zone.status === 'moderate' ? Colors.warning : Colors.error }
                ]} />
                <View style={styles.zoneDetails}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneDistance}>{zone.distance} away</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.tipCard}>
            <Icon name="lightbulb-on" size={24} color={Colors.warning} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Always Share Your Location</Text>
              <Text style={styles.tipDescription}>
                Keep your trusted contacts informed about your location when traveling alone.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Icon name="shield" size={24} color={Colors.primary} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Stay in Well-Lit Areas</Text>
              <Text style={styles.tipDescription}>
                Avoid dark alleys and deserted areas, especially at night.
              </Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 20,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
  },
  welcomeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  zoneCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: 10,
  },
  zoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  zoneDetails: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  zoneDistance: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: 10,
  },
  tipContent: {
    flex: 1,
    marginLeft: 15,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default HomeScreen;

