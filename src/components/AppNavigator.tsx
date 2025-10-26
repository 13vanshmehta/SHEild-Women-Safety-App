import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import OnboardingFlow from '../screens/OnboardingFlow';
import AuthNavigator from '../screens/AuthNavigator';
import MainAppScreen from '../screens/MainAppScreen';

const AppNavigator: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const { isAuthenticated, user, checkAuthStatus } = useAuth();

  useEffect(() => {
    // Check authentication status when app starts
    const initializeApp = async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
  };

  const handleAuthSuccess = () => {
    // Authentication is handled by the AuthContext
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  // Route based on authentication status
  if (isAuthenticated && user) {
    // User is logged in, go directly to main app
    return <MainAppScreen />;
  } else if (!isOnboardingComplete) {
    // User is not logged in and onboarding not complete, show onboarding flow
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  } else {
    // User is not logged in but onboarding is complete, show auth screens
    return <AuthNavigator onAuthSuccess={handleAuthSuccess} />;
  }
};

export default AppNavigator;
