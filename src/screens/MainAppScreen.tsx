import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabNavigator from '../components/BottomTabNavigator';
import HomeScreen from './HomeScreen';
import TrackMeScreen from './TrackMeScreen';
import SOSScreen from './SOSScreen';
import GroupsScreen from './GroupsScreen';
import ProfileScreen from './ProfileScreen';
import { Colors } from '../constants/colors';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

type Tab = 'Home' | 'TrackMe' | 'SOS' | 'TrustCircle' | 'Profile';

const MainAppScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  React.useEffect(() => {
    // Show welcome toast on mount (after login/splash)
    if (user) {
      const name = user.firstName || 'User';
      setTimeout(() => {
        showToast(`Welcome to SHEild, ${name}! ✨`, 'success');
      }, 500);
    }
  }, []);

  const handleChatStateChange = (isOpen: boolean) => {
    setIsChatOpen(isOpen);
  };

  const handleTabChange = (newTab: Tab) => {
    // Animate slide when changing tabs
    Animated.timing(slideAnim, {
      toValue: activeTabIndex(newTab),
      duration: 300,
      useNativeDriver: true,
    }).start();

    setActiveTab(newTab);
  };

  const activeTabIndex = (tab: Tab) => {
    const tabOrder: Tab[] = ['Home', 'TrackMe', 'SOS', 'TrustCircle', 'Profile'];
    return tabOrder.indexOf(tab) * width;
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />;
      case 'TrackMe':
        return <TrackMeScreen />;
      case 'SOS':
        return <SOSScreen />;
      case 'TrustCircle':
        return <GroupsScreen onChatStateChange={handleChatStateChange} />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>
        {!isChatOpen && <BottomTabNavigator activeTab={activeTab} onTabChange={handleTabChange} />}
      </SafeAreaView>
      <ToastComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});

export default MainAppScreen;
