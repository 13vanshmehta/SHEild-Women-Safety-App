import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Pressable,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OTPVerificationScreenProps {
  email: string;
  onVerificationSuccess: (token: string, user: any) => void;
  onResendOTP: () => void;
  onGoBack: () => void;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  email,
  onVerificationSuccess,
  onResendOTP,
  onGoBack,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.split('').slice(0, 6);
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      
      // Focus on the last filled input
      const lastFilledIndex = pastedOtp.length - 1;
      if (lastFilledIndex < 5) {
        inputRefs.current[lastFilledIndex + 1]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { API_CONFIG } = require('../constants/api');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpString,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Email verified successfully!', [
          { text: 'OK', onPress: () => onVerificationSuccess(data.data.token, data.data.user) }
        ]);
      } else {
        Alert.alert('Error', data.message || 'OTP verification failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const { API_CONFIG } = require('../constants/api');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'OTP sent successfully!');
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.log(error);
    } finally {
      setResendLoading(false);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onGoBack} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Verify Email</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/Sheild-App-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to
            </Text>
            <Text style={styles.email}>{email}</Text>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendLoading}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendText}>
                    {resendLoading ? 'Sending...' : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.countdownText}>
                  Resend OTP in {countdown}s
                </Text>
              )}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isOtpComplete || loading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyOTP}
              disabled={!isOtpComplete || loading}
            >
              <Text style={styles.verifyButtonText}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>

            {/* Help Text */}
            <Text style={styles.helpText}>
              Didn't receive the code? Check your spam folder or try resending.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  resendContainer: {
    marginBottom: 32,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resendText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.background,
  },
  helpText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OTPVerificationScreen;
