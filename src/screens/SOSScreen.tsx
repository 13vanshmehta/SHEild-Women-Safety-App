import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';

const SOSScreen: React.FC = () => {
  const [isActivating, setIsActivating] = useState(false);

  const handleSOS = () => {
    Alert.alert(
      'EMERGENCY SOS',
      'Are you sure you want to activate SOS? Emergency services and your trusted contacts will be notified immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate SOS',
          style: 'destructive',
          onPress: async () => {
            setIsActivating(true);
            // Simulate API call
            setTimeout(() => {
              setIsActivating(false);
              Alert.alert('SOS Activated', 'Help is on the way!');
            }, 2000);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.sosButtonContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleSOS}
            disabled={isActivating}
          >
            {isActivating ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="alarm-light" size={100} color="#FFFFFF" />
                <Text style={styles.sosText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>Press and hold to activate SOS</Text>
        <Text style={styles.description}>
          Emergency services and your trusted contacts will be notified immediately.
        </Text>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name="shield-home" size={32} color={Colors.primary} />
            <Text style={styles.quickActionText}>Find Safe Zone</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name="account-group" size={32} color={Colors.primary} />
            <Text style={styles.quickActionText}>Trust Circle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sosButtonContainer: {
    marginBottom: 40,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
  },
  instruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.secondary,
    width: '45%',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 10,
  },
});

export default SOSScreen;

