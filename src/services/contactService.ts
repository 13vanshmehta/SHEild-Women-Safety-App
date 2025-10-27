import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

export interface Contact {
  recordID: string;
  givenName: string;
  familyName: string;
  displayName: string;
  phoneNumbers: Array<{
    label: string;
    number: string;
  }>;
  emailAddresses: Array<{
    label: string;
    email: string;
  }>;
  thumbnailPath?: string;
  hasThumbnail: boolean;
}

// Re-export EmergencyContact from emergencyContactService to avoid type mismatches
export type { EmergencyContact } from './emergencyContactService';

class ContactService {
  private hasPermission: boolean = false;

  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contact Permission',
            message: 'SHEild needs access to your contacts to add emergency contacts.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS permission handling
        const permission = await Contacts.checkPermission();
        if (permission === 'undefined') {
          const requestPermission = await Contacts.requestPermission();
          this.hasPermission = requestPermission === 'authorized';
        } else {
          this.hasPermission = permission === 'authorized';
        }
      }

      if (!this.hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant contact permission to add emergency contacts from your contact book.',
          [{ text: 'OK' }]
        );
      }

      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting contact permission:', error);
      return false;
    }
  }

  async getContacts(): Promise<Contact[]> {
    try {
      if (!this.hasPermission) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
          throw new Error('Contact permission not granted');
        }
      }

      const contacts = await Contacts.getAll();
      return contacts.map(contact => ({
        recordID: contact.recordID,
        givenName: contact.givenName || '',
        familyName: contact.familyName || '',
        displayName: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
        phoneNumbers: contact.phoneNumbers || [],
        emailAddresses: contact.emailAddresses || [],
        thumbnailPath: contact.thumbnailPath,
        hasThumbnail: contact.hasThumbnail || false,
      }));
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  async searchContacts(query: string): Promise<Contact[]> {
    try {
      if (!this.hasPermission) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
          throw new Error('Contact permission not granted');
        }
      }

      const contacts = await Contacts.getContactsMatchingString(query);
      return contacts.map(contact => ({
        recordID: contact.recordID,
        givenName: contact.givenName || '',
        familyName: contact.familyName || '',
        displayName: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
        phoneNumbers: contact.phoneNumbers || [],
        emailAddresses: contact.emailAddresses || [],
        thumbnailPath: contact.thumbnailPath,
        hasThumbnail: contact.hasThumbnail || false,
      }));
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  convertContactToEmergencyContact(contact: Contact, selectedPhoneNumber?: string): EmergencyContact {
    const phoneNumber = selectedPhoneNumber || contact.phoneNumbers[0]?.number || '';
    
    return {
      name: contact.displayName,
      phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove non-digits
      email: contact.emailAddresses[0]?.email || undefined,
      relationship: 'friend', // Default relationship
      isPrimary: false, // Default to not primary
      isActive: true, // Default to active
      contactImage: contact.thumbnailPath || undefined,
      addedFrom: 'contact_book',
      emergencyPriority: 3, // Default priority
    };
  }

  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phoneNumber;
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
        this.hasPermission = granted;
      } else {
        const permission = await Contacts.checkPermission();
        this.hasPermission = permission === 'authorized';
      }
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking contact permission:', error);
      return false;
    }
  }
}

export default new ContactService();
