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
    useImage: true,
    image: require('../assets/images/Quick-Actions.png'),
  },
  {
    id: 3,
    title: "Stay Protected And Achieve Peace of Mind",
    description: "Connect with trusted contacts, share your location, and get help instantly with our emergency features.",
    useImage: true,
    image: require('../assets/images/Stay-Protected.png'),
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />


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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    lineHeight: 36,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
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
    display: 'none',
  },
  graphic2: {
    display: 'none',
  },
  graphic3: {
    display: 'none',
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
