import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import OTPVerificationScreen from './OTPVerificationScreen';
import { useAuth } from '../contexts/AuthContext';

type AuthScreen = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'otp-verification';

interface AuthNavigatorProps {
  onAuthSuccess: () => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const { login } = useAuth();

  const handleLoginSuccess = () => {
    onAuthSuccess();
  };

  const handleSignupSuccess = (email: string) => {
    setPendingEmail(email);
    setCurrentScreen('otp-verification');
  };

  const handleOTPVerificationSuccess = async (token: string, user: any) => {
    await login(token, user);
    onAuthSuccess();
  };

  const handleNavigateToSignup = () => {
    setCurrentScreen('signup');
  };

  const handleNavigateToLogin = () => {
    setCurrentScreen('login');
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen('forgot-password');
  };

  const handleNavigateToResetPassword = (email: string) => {
    setResetEmail(email);
    setCurrentScreen('reset-password');
  };

  const handlePasswordReset = () => {
    setCurrentScreen('login');
    setResetEmail('');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
    setResetEmail('');
  };

  const handleGoBackFromOTP = () => {
    setCurrentScreen('signup');
  };

  const handleResendOTP = () => {
    // This will be handled by the OTP screen itself
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            onSignupSuccess={handleSignupSuccess}
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
      case 'otp-verification':
        return (
          <OTPVerificationScreen
            email={pendingEmail}
            onVerificationSuccess={handleOTPVerificationSuccess}
            onResendOTP={handleResendOTP}
            onGoBack={handleGoBackFromOTP}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordScreen
            onBackToLogin={handleBackToLogin}
            onNavigateToResetPassword={handleNavigateToResetPassword}
          />
        );
      case 'reset-password':
        return (
          <ResetPasswordScreen
            email={resetEmail}
            onBackToLogin={handleBackToLogin}
            onPasswordReset={handlePasswordReset}
          />
        );
      default:
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
    }
  };

  return renderCurrentScreen();
};

export default AuthNavigator;
