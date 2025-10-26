import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const GroupsScreen: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: '1', name: 'John Doe', phone: '+1 234 567 8900', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', phone: '+1 234 567 8901', email: 'jane@example.com' },
    { id: '3', name: 'Mom', phone: '+1 234 567 8902' },
  ]);

  const handleAddContact = () => {
    Alert.alert('Add Contact', 'This feature will allow you to add trusted contacts to your safety network.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trust Circle</Text>
        <TouchableOpacity onPress={handleAddContact}>
          <Icon name="plus-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Icon name="shield-check" size={40} color={Colors.primary} />
          <Text style={styles.infoTitle}>Your Trust Circle</Text>
          <Text style={styles.infoDescription}>
            These are your trusted contacts who will be notified in case of an emergency.
            Make sure to keep this list updated with people who can help you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts ({contacts.length})</Text>
          
          {contacts.map((contact) => (
            <TouchableOpacity key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  {contact.email && (
                    <Text style={styles.contactEmail}>{contact.email}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity>
                <Icon name="chevron-right" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.helpSection}>
          <Icon name="information" size={24} color={Colors.info} />
          <Text style={styles.helpText}>
            Your Trust Circle members will receive real-time location updates and SOS alerts when activated.
          </Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: Colors.primaryLight + '10',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  contactCard: {
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
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
  helpSection: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default GroupsScreen;

