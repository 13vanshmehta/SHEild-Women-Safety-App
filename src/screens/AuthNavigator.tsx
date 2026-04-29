import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import OTPVerificationScreen from './OTPVerificationScreen';
import { useAuth } from '../contexts/AuthContext';

type AuthScreen = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'otp-verification';
// Tracks whether the user came to OTP from signup or from a failed login attempt
type OTPSource = 'signup' | 'login';

interface AuthNavigatorProps {
  onAuthSuccess: () => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [otpSource, setOtpSource] = useState<OTPSource>('signup');
  const { login } = useAuth();

  // --- Login flow ---
  const handleLoginSuccess = () => {
    onAuthSuccess();
  };

  // Called by LoginScreen when the user has an unverified account
  const handleUnverifiedUser = (email: string) => {
    setPendingEmail(email);
    setOtpSource('login'); // came from login, so "go back" = login screen
    setCurrentScreen('otp-verification');
  };

  // --- Signup flow ---
  const handleSignupSuccess = (email: string) => {
    setPendingEmail(email);
    setOtpSource('signup'); // came from signup, so "go back" = signup screen
    setCurrentScreen('otp-verification');
  };

  // --- OTP success ---
  const handleOTPVerificationSuccess = async (token: string, user: any) => {
    await login(token, user);
    onAuthSuccess();
  };

  // --- Navigation helpers ---
  const handleNavigateToSignup = () => setCurrentScreen('signup');
  const handleNavigateToLogin = () => setCurrentScreen('login');
  const handleNavigateToForgotPassword = () => setCurrentScreen('forgot-password');

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

  // Smart back: go to the screen they came from
  const handleGoBackFromOTP = () => {
    if (otpSource === 'login') {
      setCurrentScreen('login');
    } else {
      setCurrentScreen('signup');
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
            onUnverifiedUser={handleUnverifiedUser}
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
            onResendOTP={() => {}}
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
            onUnverifiedUser={handleUnverifiedUser}
          />
        );
    }
  };

  return renderCurrentScreen();
};

export default AuthNavigator;
