import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { Colors } from '../constants/colors';
import { apiService } from '../services/apiService';
import emergencyContactService from '../services/emergencyContactService';
import placesService from '../services/placesService';
import locationService from '../services/locationService';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
  const { user, token, logout, updateUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // New state for dynamic stats and modals
  const [safeZonesCount, setSafeZonesCount] = useState<number | string>('...');
  const [trustCircleCount, setTrustCircleCount] = useState<number | string>('...');
  const [daysSafe, setDaysSafe] = useState<number | string>('...');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        let groupsCount = 0;
        let contactsCount = 0;
        try {
          const groupsRes = await apiService.get('/api/groups');
          if (groupsRes.success && groupsRes.data) {
            groupsCount = groupsRes.data.length;
          }
        } catch (err) {}

        try {
          const contactsRes = await emergencyContactService.getEmergencyContacts();
          if (contactsRes?.success && contactsRes.data) {
            if (Array.isArray(contactsRes.data)) {
              contactsCount = contactsRes.data.length;
            } else if (contactsRes.data.contacts) {
              contactsCount = contactsRes.data.contacts.length;
            }
          }
        } catch (err) {}
        setTrustCircleCount(groupsCount + contactsCount);

        try {
          const loc = await locationService.getCurrentLocation();
          if (loc) {
            const spotsRes = await placesService.getSafeSpotsNearMe(loc, 2000);
            if (spotsRes.success && spotsRes.data) {
              setSafeZonesCount(spotsRes.data.length);
            } else {
              setSafeZonesCount(0);
            }
          } else {
            setSafeZonesCount('-');
          }
        } catch (err) { setSafeZonesCount('-'); }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    if (user?.createdAt) {
      const createdDate = new Date(user.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysSafe(diffDays);
    } else {
      setDaysSafe(1);
    }
  }, [user]);

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      if (token) {
        await authService.deleteAccount(token);
      }
      // Force logout after deletion
      await logout();
      setShowDeleteModal(false);
    } catch (error: any) {
      // You can add a toast notification here instead of alert
      console.error('Delete account error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowLogoutModal(false);
    } catch (error: any) {
      // You can add a toast notification here instead of alert
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEditProfile = () => {
    setEditFirstName(user?.firstName || '');
    setEditLastName(user?.lastName || '');
    setShowEditModal(true);
  };

  const updateProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert('Error', 'First and last name are required');
      return;
    }
    try {
      setIsUpdatingProfile(true);
      if (token) {
        const response = await authService.updateProfile(token, { 
          firstName: editFirstName.trim(),
          lastName: editLastName.trim()
        });
        if (response.success && response.data?.user) {
          updateUser(response.data.user);
          setShowEditModal(false);
          Alert.alert('Success', 'Profile updated successfully');
        } else {
          Alert.alert('Error', response.message || 'Failed to update profile');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePhoneNumberEdit = () => {
    // Extract number without +91 if present
    const currentPhone = user?.phoneNumber || '';
    const phoneWithoutPrefix = currentPhone.startsWith('+91')
      ? currentPhone.substring(3)
      : currentPhone;
    setPhoneNumber(phoneWithoutPrefix);
    setShowPhoneModal(true);
  };

  const updatePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    // Validate 10 digit number
    if (!/^\d{10}$/.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setIsUpdatingPhone(true);
      const fullPhoneNumber = `+91${phoneNumber}`;

      if (token) {
        const response = await authService.updateProfile(token, { phoneNumber: fullPhoneNumber });

        if (response.success && response.data?.user) {
          // Update the user context with the new data from backend
          updateUser(response.data.user);
          setShowPhoneModal(false);
          Alert.alert('Success', 'Phone number updated successfully');
        } else {
          Alert.alert('Error', response.message || 'Failed to update phone number');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update phone number');
    } finally {
      setIsUpdatingPhone(false);
    }
  };



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your account</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerToggleButton}
          onPress={() => setShowEditModal(true)}
        >
          <Icon name="pencil" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>


      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="account" size={50} color={Colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user ? `${user.firstName} ${user.lastName}` : 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{safeZonesCount}</Text>
              <Text style={styles.statLabel}>Safe Zones</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{trustCircleCount}</Text>
              <Text style={styles.statLabel}>Trust Circle</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{daysSafe}</Text>
              <Text style={styles.statLabel}>Days Safe</Text>
            </View>
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <TouchableOpacity style={styles.infoCard}>
            <Icon name="account-outline" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user ? `${user.firstName} ${user.lastName}` : 'N/A'}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoCard}>
            <Icon name="email-outline" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoCard} onPress={handlePhoneNumberEdit}>
            <Icon name="phone-outline" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>
                {user?.phoneNumber
                  ? (user.phoneNumber.startsWith('+91') ? user.phoneNumber : `+91${user.phoneNumber}`)
                  : 'Not set'}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.textLight} />
          </TouchableOpacity>

          {user?.isEmailVerified && (
            <View style={styles.verifiedBadge}>
              <Icon name="check-circle" size={20} color={Colors.success} />
              <Text style={styles.verifiedText}>Email Verified</Text>
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
            <Icon name="account-edit" size={24} color={Colors.primary} />
            <Text style={styles.settingText}>Edit Profile</Text>
            <Icon name="chevron-right" size={24} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowPrivacyModal(true)}>
            <Icon name="shield-check" size={24} color={Colors.success} />
            <Text style={styles.settingText}>Privacy & Security</Text>
            <Icon name="chevron-right" size={24} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openURL('mailto:support@sheild.app?subject=Support Request')}>
            <Icon name="help-circle" size={24} color={Colors.info} />
            <Text style={styles.settingText}>Help & Support</Text>
            <Icon name="chevron-right" size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={[styles.dangerButton, styles.deleteAccountButton]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Icon name="delete-forever" size={24} color={Colors.error} />
            )}
            <Text style={[styles.dangerButtonText, { color: Colors.error }]}>Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerButton, styles.logoutButton]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Icon name="logout" size={24} color={Colors.text} />
            )}
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="logout" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Logout</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to log out of your account?
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: Colors.error + '20' }]}>
                <Icon name="delete-forever" size={32} color={Colors.error} />
              </View>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Text style={styles.modalSubtitle}>
                This action cannot be undone. All your data will be permanently deleted.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phone Number Edit Modal */}
      <Modal
        visible={showPhoneModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: Colors.primary + '20' }]}>
                <Icon name="phone-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Update Phone Number</Text>
              <Text style={styles.modalSubtitle}>
                Enter your 10-digit phone number
              </Text>
            </View>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPhoneModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={updatePhoneNumber}
                disabled={isUpdatingPhone}
              >
                {isUpdatingPhone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: Colors.primary + '20' }]}>
                <Icon name="account-edit" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Edit Profile</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.textInput}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="Enter first name"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Enter last name"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={updateProfile}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy & Security Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: Colors.success + '20' }]}>
                <Icon name="shield-check" size={32} color={Colors.success} />
              </View>
              <Text style={styles.modalTitle}>Privacy & Security</Text>
            </View>

            <View style={styles.privacyInfoContainer}>
              <View style={styles.privacyItem}>
                <Icon name="lock" size={24} color={Colors.primary} />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyItemTitle}>End-to-End Encryption</Text>
                  <Text style={styles.privacyItemDesc}>Your location and messages are fully encrypted.</Text>
                </View>
              </View>
              <View style={styles.privacyItem}>
                <Icon name="map-marker-off" size={24} color={Colors.primary} />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyItemTitle}>Location Privacy</Text>
                  <Text style={styles.privacyItemDesc}>Your location is only shared with your Trust Circle when needed.</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Text style={styles.confirmButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 8 : 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Increased to clear bottom navigation bar
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: 10,
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  verifiedText: {
    fontSize: 14,
    color: Colors.success,
    marginLeft: 8,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: 10,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 15,
  },
  settingSubText: {
    fontSize: 14,
    marginLeft: 15,
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
  },
  deleteAccountButton: {
    borderColor: Colors.error + '40',
  },
  logoutButton: {
    borderColor: Colors.secondary,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: Colors.text,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    overflow: 'hidden',
  },
  countryCodeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primary + '10',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.secondary,
  },
  privacyInfoContainer: {
    marginBottom: 24,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.secondary + '50',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  privacyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  privacyItemDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default ProfileScreen;

