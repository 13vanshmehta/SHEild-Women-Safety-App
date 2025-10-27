import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';

type Tab = 'Home' | 'TrackMe' | 'SOS' | 'TrustCircle' | 'Profile';

interface BottomTabNavigatorProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={[styles.wrapper, { backgroundColor: Colors.cardBackground, borderColor: Colors.border }]}>
      <View style={styles.navBarContainer}>
        {/* Regular tabs container */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('Home')}
            activeOpacity={0.7}
          >
              <Icon
                name="home-outline"
                size={22}
                color={activeTab === 'Home' ? Colors.primary : Colors.textLight}
              />
            <Text
              style={[
                styles.label,
                { color: activeTab === 'Home' ? Colors.primary : Colors.textLight },
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('TrackMe')}
            activeOpacity={0.7}
          >
            <Icon
              name="map-marker-path"
              size={22}
              color={activeTab === 'TrackMe' ? Colors.primary : Colors.textLight}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === 'TrackMe' ? Colors.primary : Colors.textLight },
              ]}
            >
              Track Me
            </Text>
          </TouchableOpacity>

          {/* Spacer for floating SOS button */}
          <View style={styles.sosSpacer} />

          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('TrustCircle')}
            activeOpacity={0.7}
          >
            <Icon
              name="account-group-outline"
              size={22}
              color={activeTab === 'TrustCircle' ? Colors.primary : Colors.textLight}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === 'TrustCircle' ? Colors.primary : Colors.textLight },
              ]}
            >
              Trust Circle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('Profile')}
            activeOpacity={0.7}
          >
            <Icon
              name="account-outline"
              size={22}
              color={activeTab === 'Profile' ? Colors.primary : Colors.textLight}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === 'Profile' ? Colors.primary : Colors.textLight },
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Floating SOS Button */}
        <View style={styles.sosButtonContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => onTabChange('SOS')}
            activeOpacity={0.8}
          >
            <Icon name="alarm-light" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderWidth: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  navBarContainer: {
    position: 'relative',
    height: 60,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  sosSpacer: {
    width: 60,
    height: 1,
  },
  sosButtonContainer: {
    position: 'absolute',
    left: '50%',
    top: -25,
    marginLeft: -30,
    zIndex: 10,
  },
  sosButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    // Enhanced shadow for deep effect
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default BottomTabNavigator;

