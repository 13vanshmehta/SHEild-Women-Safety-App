import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';

const { height } = Dimensions.get('window');

interface OnboardingData {
  id: number;
  title: string;
  description?: string;
  icon?: string;
  image?: any;
  useImage?: boolean;
}

const onboardingData: OnboardingData[] = [
  {
    id: 1,
    title: "Empower Yourself With Safety Knowledge",
    description: "Learn essential safety tips and emergency procedures to protect yourself in any situation.",
    useImage: true,
    image: require('../assets/images/Sheild-App-Logo.png'),
  },
  {
    id: 2,
    title: "Elevate Your Safety With Quick Actions",
    description: "Get instant access to emergency contacts, location sharing, and safety alerts when you need them most.",
    icon: "warning",
    useImage: false,
  },
  {
    id: 3,
    title: "Stay Protected And Achieve Peace of Mind",
    description: "Connect with trusted contacts, share your location, and get help instantly with our emergency features.",
    useImage: true,
    image: require('../assets/images/Secure-Device.jpg'),
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentData = onboardingData[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      

      {/* Main Content */}
      <View style={styles.content}>
        {/* Icon/Image Area */}
        <View style={styles.iconContainer}>
          {currentData.useImage && currentData.image ? (
            <Image 
              source={currentData.image} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <Icon name="alert" size={120} color={Colors.primary} />
          )}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{currentData.title}</Text>
          {currentData.description && (
            <Text style={styles.description}>{currentData.description}</Text>
          )}
        </View>
      </View>

      {/* Background Graphics */}
      <View style={styles.backgroundGraphics}>
        <View style={styles.graphic1} />
        <View style={styles.graphic2} />
        <View style={styles.graphic3} />
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Icon name="arrow-right" size={20} color={Colors.background} />
        </TouchableOpacity>
      </View>

      {/* Page Indicators */}
      <View style={styles.indicators}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
          />
        ))}
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
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    lineHeight: 36,
    marginBottom: 16,
    textAlign: 'left',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'left',
  },
  backgroundGraphics: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
    zIndex: -1,
  },
  graphic1: {
    position: 'absolute',
    bottom: 0,
    right: -50,
    width: 200,
    height: 200,
    backgroundColor: Colors.primaryLight,
    opacity: 0.1,
    borderRadius: 100,
  },
  graphic2: {
    position: 'absolute',
    bottom: 50,
    right: 50,
    width: 150,
    height: 150,
    backgroundColor: Colors.primary,
    opacity: 0.05,
    borderRadius: 75,
  },
  graphic3: {
    position: 'absolute',
    bottom: 100,
    right: 100,
    width: 100,
    height: 100,
    backgroundColor: Colors.primaryDark,
    opacity: 0.08,
    borderRadius: 50,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: Colors.skip,
    fontWeight: '500',
  },
  nextButton: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textLight,
  },
  activeIndicator: {
    backgroundColor: Colors.primary,
    width: 24,
  },
});

export default OnboardingFlow;
