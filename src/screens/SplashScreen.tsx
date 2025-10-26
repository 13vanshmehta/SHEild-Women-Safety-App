import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../constants';
import { apiService } from '../services/apiService';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const checkServerAndProceed = useCallback(async () => {
    setIsCheckingServer(true);
    setServerError(null);
    
    try {
      const response = await apiService.checkServerHealth();
      
      if (response.status === 'success') {
        onAnimationComplete();
      } else {
        setServerError('Server not working, please try again later');
      }
    } catch {
      setServerError('Server not working, please try again later');
    } finally {
      setIsCheckingServer(false);
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    // Start the animation sequence
    const animationSequence = Animated.sequence([
      // Logo pop-up animation with bounce and rotation effect
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      // Text fade-in animation
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Hold for a longer moment
      Animated.delay(2000),
    ]);

    animationSequence.start(() => {
      // Start server check after animation completes
      checkServerAndProceed();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkServerAndProceed]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
      {/* Logo Container */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: logoScale }
            ],
            opacity: logoOpacity,
          }
        ]}
      >
        {/* App Logo with Glow Effect */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/Sheild-App-Logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Text Container */}
      <Animated.View 
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }
        ]}
      >
        <Text style={styles.mainTitle}>Women Safety</Text>
        <Text style={styles.tagline}>Your safety our priority</Text>
      </Animated.View>

      {/* Loading/Server Status at Bottom */}
      <View style={styles.statusContainer}>
        {isCheckingServer && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#E91E63" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
        
        {serverError && (
          <Text style={styles.errorText}>{serverError}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom: 30,
    // padding: 20,
    // backgroundColor: 'rgba(233, 30, 99, 0.05)',
  },
  logoImage: {
    width: 227,
    height: 227,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E91E63', // Vibrant pink
    marginBottom: 8,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#2196F3', // Medium blue
    textAlign: 'center',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SplashScreen;
