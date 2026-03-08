import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';

type Tab = 'Home' | 'TrackMe' | 'SOS' | 'TrustCircle' | 'Profile';

interface BottomTabNavigatorProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const AnimatedIcon = ({ name, isActive, color }: { name: string; isActive: boolean; color: string }) => {
  const scale = useRef(new Animated.Value(isActive ? 1.15 : 1)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1.15 : 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, scale, opacity]);

  return (
    <View style={styles.iconWrapper}>
      <Animated.View style={[styles.activeHighlight, { opacity, transform: [{ scale }] }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={name} size={24} color={color} />
      </Animated.View>
      <Animated.View style={[styles.activeDot, { opacity, transform: [{ scale }] }]} />
    </View>
  );
};

const SOSButton = ({ onPress }: { onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation loop
    const createPulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    createPulse(pulse1, 0).start();
    createPulse(pulse2, 1000).start();
  }, [pulse1, pulse2]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      friction: 4,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
    onPress();
  };

  return (
    <View style={styles.sosButtonContainer}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
          },
        ]}
      />

      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.sosButton}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Icon name="alarm-light" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={[styles.wrapper, { backgroundColor: Colors.cardBackground, borderColor: Colors.border }]}>
      <View style={styles.navBarContainer}>
        <View style={styles.tabsContainer}>
          {/* Home Tab */}
          <TouchableOpacity style={styles.tab} onPress={() => onTabChange('Home')} activeOpacity={0.7}>
            <AnimatedIcon name="home-outline" isActive={activeTab === 'Home'} color={activeTab === 'Home' ? Colors.accent : Colors.textLight} />
            <Text style={[styles.label, { color: activeTab === 'Home' ? Colors.accent : Colors.textLight }]}>Home</Text>
          </TouchableOpacity>

          {/* Track Me Tab */}
          <TouchableOpacity style={styles.tab} onPress={() => onTabChange('TrackMe')} activeOpacity={0.7}>
            <AnimatedIcon name="map-marker-path" isActive={activeTab === 'TrackMe'} color={activeTab === 'TrackMe' ? Colors.accent : Colors.textLight} />
            <Text style={[styles.label, { color: activeTab === 'TrackMe' ? Colors.accent : Colors.textLight }]}>Track Me</Text>
          </TouchableOpacity>

          {/* Spacer for floating SOS button */}
          <View style={styles.sosSpacer} />

          {/* Trust Circle Tab */}
          <TouchableOpacity style={styles.tab} onPress={() => onTabChange('TrustCircle')} activeOpacity={0.7}>
            <AnimatedIcon name="account-group-outline" isActive={activeTab === 'TrustCircle'} color={activeTab === 'TrustCircle' ? Colors.accent : Colors.textLight} />
            <Text style={[styles.label, { color: activeTab === 'TrustCircle' ? Colors.accent : Colors.textLight }]}>Trust Circle</Text>
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity style={styles.tab} onPress={() => onTabChange('Profile')} activeOpacity={0.7}>
            <AnimatedIcon name="account-outline" isActive={activeTab === 'Profile'} color={activeTab === 'Profile' ? Colors.accent : Colors.textLight} />
            <Text style={[styles.label, { color: activeTab === 'Profile' ? Colors.accent : Colors.textLight }]}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Floating SOS Button */}
        <SOSButton onPress={() => onTabChange('SOS')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  navBarContainer: {
    height: 64,
    position: 'relative',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 16,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 36,
  },
  activeHighlight: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 58, 138, 0.15)', // Subtle blue accent tint background
  },
  activeDot: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sosSpacer: {
    width: 72,
  },
  sosButtonContainer: {
    position: 'absolute',
    left: '50%',
    top: -30,
    marginLeft: -36, // Half of button width
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  sosButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A8A', // Deep SHEild Blue for emergency
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#09090B', // Dark border to blend with premium theme
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(30, 58, 138, 0.4)', // Faded blue matching button
  },
});

export default BottomTabNavigator;
