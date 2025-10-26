import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabNavigator from '../components/BottomTabNavigator';
import HomeScreen from './HomeScreen';
import TrackMeScreen from './TrackMeScreen';
import SOSScreen from './SOSScreen';
import GroupsScreen from './GroupsScreen';
import ProfileScreen from './ProfileScreen';
import { Colors } from '../constants/colors';

type Tab = 'Home' | 'TrackMe' | 'SOS' | 'Groups' | 'Profile';

const MainAppScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />;
      case 'TrackMe':
        return <TrackMeScreen />;
      case 'SOS':
        return <SOSScreen />;
      case 'Groups':
        return <GroupsScreen />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
      <BottomTabNavigator activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});

export default MainAppScreen;
