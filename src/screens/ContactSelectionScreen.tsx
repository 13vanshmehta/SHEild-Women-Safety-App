import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/colors';
import contactService, { Contact } from '../services/contactService';
import emergencyContactService, { EmergencyContact } from '../services/emergencyContactService';
import { useToast } from '../components/Toast';

interface ContactSelectionScreenProps {
  onContactSelected?: (contact: EmergencyContact) => void | Promise<void>;
  onBack?: () => void;
  mode?: 'single' | 'multiple';
  selectedContacts?: EmergencyContact[];
}

const ContactSelectionScreen: React.FC<ContactSelectionScreenProps> = ({
  onContactSelected,
  onBack,
  mode = 'single',
  selectedContacts = []
}) => {
  const { showToast, ToastComponent } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [relationship, setRelationship] = useState<'family' | 'friend' | 'colleague' | 'neighbor' | 'other'>('friend');

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const permission = await contactService.checkPermission();
      setHasPermission(permission);

      if (!permission) {
        const granted = await contactService.requestPermission();
        setHasPermission(granted);
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please grant contact permission to add emergency contacts.',
            [{ text: 'OK', onPress: onBack }]
          );
          return;
        }
      }

      const contactList = await contactService.getContacts();
      setContacts(contactList);
      setFilteredContacts(contactList);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onBack]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(contact =>
        contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phoneNumbers.some(phone => 
          phone.number.replace(/\D/g, '').includes(searchQuery.replace(/\D/g, ''))
        )
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const handleContactSelect = (contact: Contact) => {
    if (mode === 'single') {
      // Show relationship picker first
      setSelectedContact(contact);
      setShowRelationshipPicker(true);
    } else {
      // Multiple selection mode
      const contactId = contact.recordID;
      if (selectedContactIds.includes(contactId)) {
        setSelectedContactIds(prev => prev.filter(id => id !== contactId));
      } else {
        setSelectedContactIds(prev => [...prev, contactId]);
      }
    }
  };

  const confirmAddContact = async () => {
    if (!selectedContact) return;

    try {
      console.log('========= ADDING CONTACT =========');
      console.log('Contact selected:', selectedContact.displayName);
      console.log('Phone numbers:', selectedContact.phoneNumbers);
      
      const emergencyContact = contactService.convertContactToEmergencyContact(selectedContact);
      emergencyContact.relationship = relationship; // Set the selected relationship
      
      console.log('Converted emergency contact:', JSON.stringify(emergencyContact, null, 2));
      
      console.log('Calling createEmergencyContact API...');
      const response = await emergencyContactService.createEmergencyContact(emergencyContact);
      console.log('API Response received:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('Contact added successfully!');
        
        // Show success toast
        showToast('Emergency contact added successfully!', 'success');
        
        // Call the callback to trigger refresh in parent component
        if (onContactSelected && response.data) {
          // Pass the saved contact from backend response
          const savedContact = Array.isArray(response.data) ? response.data[0] : response.data;
          onContactSelected(savedContact as EmergencyContact);
        }
        setShowRelationshipPicker(false);
        setSelectedContact(null);
        onBack?.();
      } else {
        console.log('Response not successful');
        showToast(response.message || 'Failed to add emergency contact. Please try again.', 'error');
        setShowRelationshipPicker(false);
        setSelectedContact(null);
      }
    } catch (error: any) {
      console.error('========= ERROR ADDING CONTACT =========');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      
      // Extract error message from various possible structures
      let errorMessage = 'Failed to add emergency contact. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
      setShowRelationshipPicker(false);
      setSelectedContact(null);
    }
  };

  const handleBulkAdd = async () => {
    if (selectedContactIds.length === 0) {
      Alert.alert('No Selection', 'Please select at least one contact.');
      return;
    }

    try {
      setLoading(true);
      const selectedContactsData = contacts.filter(contact => 
        selectedContactIds.includes(contact.recordID)
      );

      const emergencyContacts = selectedContactsData.map(contact =>
        contactService.convertContactToEmergencyContact(contact)
      );

      const response = await emergencyContactService.bulkImportContacts(emergencyContacts);
      
      Alert.alert(
        'Success',
        `Added ${response.data.imported.length} emergency contacts successfully!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (onContactSelected && response.data.imported[0]) {
                onContactSelected(response.data.imported[0]);
              }
              onBack?.();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error bulk adding contacts:', error);
      Alert.alert('Error', 'Failed to add emergency contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContact = ({ item: contact }: { item: Contact }) => {
    const isSelected = selectedContactIds.includes(contact.recordID);
    const primaryPhone = contact.phoneNumbers[0]?.number || '';

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && styles.selectedContactItem
        ]}
        onPress={() => handleContactSelect(contact)}
      >
        <View style={styles.contactInfo}>
          <View style={styles.contactImageContainer}>
            {contact.hasThumbnail && contact.thumbnailPath ? (
              <Image source={{ uri: contact.thumbnailPath }} style={styles.contactImage} />
            ) : (
              <View style={styles.defaultContactImage}>
                <Icon name="account" size={24} color={Colors.primary} />
              </View>
            )}
          </View>
          
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{contact.displayName}</Text>
            {primaryPhone && (
              <Text style={styles.contactPhone}>
                {contactService.formatPhoneNumber(primaryPhone)}
              </Text>
            )}
            {contact.emailAddresses[0]?.email && (
              <Text style={styles.contactEmail}>{contact.emailAddresses[0].email}</Text>
            )}
          </View>
        </View>

        {mode === 'multiple' && (
          <View style={styles.selectionIndicator}>
            <Icon
              name={isSelected ? 'check-circle' : 'circle-outline'}
              size={24}
              color={isSelected ? Colors.primary : Colors.textLight}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="account-search" size={64} color={Colors.textLight} />
      <Text style={styles.emptyStateTitle}>No Contacts Found</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery ? 'Try adjusting your search terms' : 'No contacts available'}
      </Text>
    </View>
  );

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
        <View style={styles.permissionContainer}>
          <Icon name="shield-account" size={64} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Contact Permission Required</Text>
          <Text style={styles.permissionMessage}>
            SHEild needs access to your contacts to add emergency contacts from your contact book.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={loadContacts}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'single' ? 'Add Emergency Contact' : 'Select Contacts'}
        </Text>
        {mode === 'multiple' && selectedContactIds.length > 0 && (
          <TouchableOpacity style={styles.addButton} onPress={handleBulkAdd}>
            <Text style={styles.addButtonText}>Add ({selectedContactIds.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Contact List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.recordID}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          contentContainerStyle={styles.contactList}
        />
      )}

      {/* Relationship Picker Modal */}
      <Modal
        visible={showRelationshipPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRelationshipPicker(false);
          setSelectedContact(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.relationshipModalContent}>
            <Text style={styles.relationshipModalTitle}>Select Relationship</Text>
            
            <Text style={styles.relationshipModalSubtitle}>
              How do you know {selectedContact?.displayName}?
            </Text>

            {['family', 'friend', 'colleague', 'neighbor', 'other'].map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[
                  styles.relationshipOption,
                  relationship === rel && styles.relationshipOptionSelected
                ]}
                onPress={() => setRelationship(rel as any)}
              >
                <Icon 
                  name={
                    rel === 'family' ? 'account-heart' :
                    rel === 'friend' ? 'account' :
                    rel === 'colleague' ? 'briefcase' :
                    rel === 'neighbor' ? 'home' : 'account-star'
                  }
                  size={24}
                  color={relationship === rel ? Colors.background : Colors.primary}
                />
                <Text
                  style={[
                    styles.relationshipOptionText,
                    relationship === rel && styles.relationshipOptionTextSelected
                  ]}
                >
                  {rel.charAt(0).toUpperCase() + rel.slice(1)}
                </Text>
                {relationship === rel && (
                  <Icon name="check-circle" size={20} color={Colors.background} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.relationshipModalButtons}>
              <TouchableOpacity
                style={[styles.relationshipModalButton, styles.relationshipModalButtonSecondary]}
                onPress={() => {
                  setShowRelationshipPicker(false);
                  setSelectedContact(null);
                }}
              >
                <Text style={styles.relationshipModalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.relationshipModalButton, styles.relationshipModalButtonPrimary]}
                onPress={confirmAddContact}
              >
                <Text style={styles.relationshipModalButtonTextPrimary}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <ToastComponent />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: Colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  contactList: {
    paddingHorizontal: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: Colors.surface,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedContactItem: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactImageContainer: {
    marginRight: 15,
  },
  contactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultContactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: Colors.textLight,
  },
  selectionIndicator: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relationshipModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
  },
  relationshipModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  relationshipModalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  relationshipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  relationshipOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  relationshipOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  relationshipOptionTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
  relationshipModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  relationshipModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  relationshipModalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  relationshipModalButtonSecondary: {
    backgroundColor: Colors.secondary,
  },
  relationshipModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  relationshipModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default ContactSelectionScreen;
