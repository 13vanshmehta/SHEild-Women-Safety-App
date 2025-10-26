import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import Skeleton, { SkeletonList } from '../components/Skeleton';

interface SafetyCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface UpcomingCheckIn {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  contactName: string;
  contactImage: string | null;
}

interface RecentContact {
  id: string;
  name: string;
  phoneNumber: string;
  lastContactType: 'call' | 'text';
  lastContactTime: string;
  contactImage: string | null;
  isInTrustCircle: boolean;
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const safetyCategories: SafetyCategory[] = [
    { id: '1', name: 'Emergency', icon: 'alarm-light', color: '#EF4444' },
    { id: '2', name: 'Safe Spots', icon: 'map-marker', color: '#3B82F6' },
    { id: '3', name: 'Trust Circle', icon: 'account-group', color: '#10B981' },
    { id: '4', name: 'Location Share', icon: 'share-variant', color: '#8B5CF6' },
    { id: '5', name: 'Safety Tips', icon: 'shield-check', color: '#F59E0B' },
  ];

  const upcomingCheckIn: UpcomingCheckIn = {
    id: '1',
    title: 'Sarah Johnson',
    description: 'Safety Check-in with Emergency Contact',
    date: 'Wed, 7 Sep 2024',
    time: '10:30 - 11:30 AM',
    contactName: 'Sarah Johnson',
    contactImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', // Sample profile image
  };

  const recentContacts: RecentContact[] = [
    {
      id: '1',
      name: 'Emma Davis',
      phoneNumber: '+1 (555) 123-4567',
      lastContactType: 'call',
      lastContactTime: '2 hours ago',
      contactImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isInTrustCircle: true,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      phoneNumber: '+1 (555) 234-5678',
      lastContactType: 'text',
      lastContactTime: '4 hours ago',
      contactImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isInTrustCircle: true,
    },
    {
      id: '3',
      name: 'Mike Wilson',
      phoneNumber: '+1 (555) 345-6789',
      lastContactType: 'call',
      lastContactTime: '1 day ago',
      contactImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isInTrustCircle: false,
    },
    {
      id: '4',
      name: 'Lisa Brown',
      phoneNumber: '+1 (555) 456-7890',
      lastContactType: 'text',
      lastContactTime: '2 days ago',
      contactImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      isInTrustCircle: false,
    },
  ];

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDataLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setIsDataLoading(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      setIsDataLoading(false);
    }, 1500);
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

  const handleSafeSpots = () => {
    // Navigate to safe spots screen or show nearby safe spots
    console.log('View safe spots near me');
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

  const handleContactCall = (contact: RecentContact) => {
    console.log(`Calling ${contact.name} at ${contact.phoneNumber}`);
    // Implement phone call functionality
  };

  const handleContactText = (contact: RecentContact) => {
    console.log(`Texting ${contact.name} at ${contact.phoneNumber}`);
    // Implement text message functionality
  };

  const handleAddToTrustCircle = (contact: RecentContact) => {
    console.log(`Adding ${contact.name} to Trust Circle`);
    // Implement add to trust circle functionality
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Greeting Section */}
        <View style={styles.greetingContainer}>
          <View style={styles.greetingContent}>
            <View style={styles.greetingTextContainer}>
              {isLoading ? (
                <View>
                  <Skeleton width={120} height={32} style={styles.greetingSkeleton} />
                  <Skeleton width={150} height={32} style={styles.userNameSkeleton} />
                </View>
              ) : (
                <>
                  <Text style={styles.greetingText}>Hello,</Text>
                  <Text style={styles.userNameText}>{userName}!</Text>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Icon name="bell-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          {isLoading ? (
            <Skeleton width="100%" height={48} borderRadius={12} />
          ) : (
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
          )}
        </View>

        {/* Safety Categories */}
        <View style={styles.section}>
          {isLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {Array.from({ length: 5 }).map((_, index) => (
                <View key={index} style={styles.categoryCard}>
                  <Skeleton width={60} height={60} borderRadius={15} style={styles.categoryIconSkeleton} />
                  <Skeleton width={60} height={16} borderRadius={4} style={styles.categoryNameSkeleton} />
                </View>
              ))}
            </ScrollView>
          ) : (
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
          )}
        </View>

        {/* Upcoming Safety Check-in */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Safety Check-in</Text>
          {isDataLoading ? (
            <View style={styles.upcomingCard}>
              <View style={styles.upcomingContent}>
                <View style={styles.upcomingHeader}>
                  <Skeleton width={60} height={60} borderRadius={30} style={styles.upcomingImageSkeleton} />
                  <View style={styles.upcomingDetails}>
                    <Skeleton width="80%" height={20} style={styles.upcomingTitleSkeleton} />
                    <Skeleton width="90%" height={16} style={styles.upcomingDescriptionSkeleton} />
                  </View>
                </View>
                <View style={styles.upcomingTime}>
                  <Skeleton width={120} height={16} style={styles.timeSkeleton} />
                  <Skeleton width={100} height={16} style={styles.timeSkeleton} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.upcomingCard}>
              <View style={styles.upcomingContent}>
                <View style={styles.upcomingHeader}>
                  <View style={styles.contactImageContainer}>
                    {upcomingCheckIn.contactImage ? (
                      <Image source={{ uri: upcomingCheckIn.contactImage }} style={styles.upcomingContactImage} />
                    ) : (
                      <View style={styles.skeletonProfileImage}>
                        <Icon name="account" size={24} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.upcomingDetails}>
                    <Text style={styles.upcomingTitle}>{upcomingCheckIn.contactName}</Text>
                    <Text style={styles.upcomingDescription}>{upcomingCheckIn.description}</Text>
                  </View>
                </View>
                <View style={styles.upcomingTime}>
                  <View style={styles.timeItem}>
                    <Icon name="calendar" size={16} color="#FFFFFF" />
                    <Text style={styles.timeText}>{upcomingCheckIn.date}</Text>
                  </View>
                  <View style={styles.timeItem}>
                    <Icon name="clock" size={16} color="#FFFFFF" />
                    <Text style={styles.timeText}>{upcomingCheckIn.time}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Safe Spots Near Me */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Safe Spots Near Me</Text>
            <TouchableOpacity onPress={handleSafeSpots}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {isDataLoading ? (
            <SkeletonList items={3} />
          ) : (
            <View style={styles.safeSpotsContainer}>
              <TouchableOpacity style={styles.safeSpotCard} onPress={handleSafeSpots}>
                <View style={styles.safeSpotIcon}>
                  <Icon name="hospital-building" size={24} color={Colors.success} />
                </View>
                <View style={styles.safeSpotInfo}>
                  <Text style={styles.safeSpotName}>City Hospital</Text>
                  <Text style={styles.safeSpotDistance}>0.3 km away</Text>
                  <Text style={styles.safeSpotStatus}>Open 24/7</Text>
                </View>
                <Icon name="chevron-right" size={20} color={Colors.textLight} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.safeSpotCard} onPress={handleSafeSpots}>
                <View style={styles.safeSpotIcon}>
                  <Icon name="police-badge" size={24} color={Colors.primary} />
                </View>
                <View style={styles.safeSpotInfo}>
                  <Text style={styles.safeSpotName}>Police Station</Text>
                  <Text style={styles.safeSpotDistance}>0.8 km away</Text>
                  <Text style={styles.safeSpotStatus}>Open 24/7</Text>
                </View>
                <Icon name="chevron-right" size={20} color={Colors.textLight} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.safeSpotCard} onPress={handleSafeSpots}>
                <View style={styles.safeSpotIcon}>
                  <Icon name="store" size={24} color={Colors.warning} />
                </View>
                <View style={styles.safeSpotInfo}>
                  <Text style={styles.safeSpotName}>Safe Zone Store</Text>
                  <Text style={styles.safeSpotDistance}>1.2 km away</Text>
                  <Text style={styles.safeSpotStatus}>Open until 10 PM</Text>
                </View>
                <Icon name="chevron-right" size={20} color={Colors.textLight} />
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
          {isDataLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <Skeleton width={50} height={50} borderRadius={25} style={styles.contactImageSkeleton} />
                    <View style={styles.contactInfo}>
                      <Skeleton width="80%" height={18} style={styles.contactNameSkeleton} />
                      <Skeleton width="90%" height={14} style={styles.contactPhoneSkeleton} />
                      <Skeleton width="60%" height={12} style={styles.contactMetaSkeleton} />
                      <Skeleton width="50%" height={20} borderRadius={10} style={styles.trustBadgeSkeleton} />
                    </View>
                  </View>
                  <View style={styles.contactActions}>
                    <Skeleton width={40} height={40} borderRadius={20} style={styles.actionButtonSkeleton} />
                    <Skeleton width={40} height={40} borderRadius={20} style={styles.actionButtonSkeleton} />
                    <Skeleton width={40} height={40} borderRadius={20} style={styles.actionButtonSkeleton} />
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
              {recentContacts.map((contact) => (
                <TouchableOpacity key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <View style={styles.contactImageContainer}>
                      {contact.contactImage ? (
                        <Image source={{ uri: contact.contactImage }} style={styles.contactImage} />
                      ) : (
                        <View style={styles.skeletonContactImage}>
                          <Icon name="account" size={20} color={Colors.primary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                      <View style={styles.contactMeta}>
                        <Icon 
                          name={contact.lastContactType === 'call' ? 'phone' : 'message-text'} 
                          size={12} 
                          color={Colors.textSecondary} 
                        />
                        <Text style={styles.contactTime}>{contact.lastContactTime}</Text>
                      </View>
                      {contact.isInTrustCircle && (
                        <View style={styles.trustCircleBadge}>
                          <Icon name="shield-check" size={12} color={Colors.success} />
                          <Text style={styles.trustCircleText}>Trust Circle</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => handleContactCall(contact)}
                    >
                      <Icon name="phone" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.textButton}
                      onPress={() => handleContactText(contact)}
                    >
                      <Icon name="message-text" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    {!contact.isInTrustCircle && (
                      <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => handleAddToTrustCircle(contact)}
                      >
                        <Icon name="plus" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  upcomingCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactImageContainer: {
    marginRight: 15,
  },
  upcomingContactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
  },
  skeletonProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  skeletonContactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  upcomingDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  upcomingTime: {
    flexDirection: 'row',
    gap: 20,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  contactsScroll: {
    marginBottom: 10,
  },
  contactCard: {
    backgroundColor: Colors.background,
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 220,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  contactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  contactInfo: {
    flex: 1,
    paddingTop: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  trustCircleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  trustCircleText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
    marginLeft: 2,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  textButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Safe Spots Styles
  safeSpotsContainer: {
    gap: 10,
  },
  safeSpotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  safeSpotIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  safeSpotInfo: {
    flex: 1,
  },
  safeSpotName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  safeSpotDistance: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 2,
  },
  safeSpotStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Skeleton styles
  greetingSkeleton: {
    marginBottom: 4,
  },
  userNameSkeleton: {
    marginTop: 4,
  },
  categoryIconSkeleton: {
    marginBottom: 8,
  },
  categoryNameSkeleton: {
    marginTop: 4,
  },
  upcomingImageSkeleton: {
    marginRight: 15,
  },
  upcomingTitleSkeleton: {
    marginBottom: 8,
  },
  upcomingDescriptionSkeleton: {
    marginBottom: 12,
  },
  timeSkeleton: {
    marginRight: 20,
  },
  contactImageSkeleton: {
    marginRight: 15,
  },
  contactNameSkeleton: {
    marginBottom: 6,
  },
  contactPhoneSkeleton: {
    marginBottom: 8,
  },
  contactMetaSkeleton: {
    marginBottom: 8,
  },
  trustBadgeSkeleton: {
    marginTop: 4,
  },
  actionButtonSkeleton: {
    marginRight: 8,
  },
});

export default HomeScreen;

