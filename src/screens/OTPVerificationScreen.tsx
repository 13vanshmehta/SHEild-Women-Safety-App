import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Colors } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_CONFIG } from '../constants/api';

interface OTPVerificationScreenProps {
  email: string;
  onVerificationSuccess: (token: string, user: any) => void;
  onResendOTP: () => void;
  onGoBack: () => void;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  email,
  onVerificationSuccess,
  onGoBack,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailWarning, setEmailWarning] = useState(true); // Show warning about email delay

  const inputRefs = useRef<TextInput[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    triggerShake();
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleOtpChange = (value: string, index: number) => {
    setErrorMsg('');

    if (value.length > 1) {
      const pastedOtp = value.replace(/\D/g, '').split('').slice(0, 6);
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(pastedOtp.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      showError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Email verified! Logging you in...');
        setTimeout(() => onVerificationSuccess(data.data.token, data.data.user), 800);
      } else {
        showError(data.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      showError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setEmailWarning(false);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('A new OTP has been sent! Check your inbox and spam folder.');
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        showError(data.message || 'Failed to resend OTP. Please try again.');
      }
    } catch {
      showError('Network error. Could not resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  const isOtpComplete = otp.every(d => d !== '');
  const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0A0A1A" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

            {/* Back Button */}
            <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
              <Icon name="arrow-left" size={18} color="#E0E0E0" />
            </TouchableOpacity>

            {/* Shield Icon */}
            <View style={styles.iconWrapper}>
              <View style={styles.iconOuter}>
                <View style={styles.iconInner}>
                  <Icon name="shield-alt" size={32} color="#E91E8C" />
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to
            </Text>
            <Text style={styles.emailText}>{maskedEmail}</Text>

            {/* Email Warning Banner */}
            {emailWarning && (
              <View style={styles.warningBanner}>
                <Icon name="clock" size={13} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Email may take 1-2 minutes. Check your spam folder too.
                </Text>
                <TouchableOpacity onPress={() => setEmailWarning(false)}>
                  <Icon name="times" size={12} color="#F59E0B" />
                </TouchableOpacity>
              </View>
            )}

            {/* Error / Success Feedback */}
            {errorMsg !== '' && (
              <Animated.View
                style={[styles.feedbackBanner, styles.errorBanner, { transform: [{ translateX: shakeAnim }] }]}
              >
                <Icon name="exclamation-circle" size={14} color="#FF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            )}
            {successMsg !== '' && (
              <View style={[styles.feedbackBanner, styles.successBanner]}>
                <Icon name="check-circle" size={14} color="#10B981" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            {/* OTP Boxes */}
            <Animated.View style={[styles.otpContainer, { transform: [{ translateX: shakeAnim }] }]}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => { if (ref) inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    errorMsg ? styles.otpBoxError : null,
                  ]}
                  value={digit}
                  onChangeText={val => handleOtpChange(val, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                  selectTextOnFocus
                  caretHidden
                  cursorColor="#E91E8C"
                />
              ))}
            </Animated.View>

            {/* Resend */}
            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendLoading}
                  style={styles.resendBtn}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#E91E8C" />
                  ) : (
                    <>
                      <Icon name="redo" size={12} color="#E91E8C" style={styles.resendIcon} />
                      <Text style={styles.resendActiveText}>Resend OTP</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.countdownText}>
                  Resend available in{' '}
                  <Text style={styles.countdownNum}>{countdown}s</Text>
                </Text>
              )}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyBtn, (!isOtpComplete || loading) && styles.verifyBtnDisabled]}
              onPress={handleVerifyOTP}
              disabled={!isOtpComplete || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="check-circle" size={16} color="#fff" style={styles.btnIcon} />
                  <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Help */}
            <Text style={styles.helpText}>
              Didn't get the email? Check your spam folder or tap{' '}
              <Text style={styles.helpLink} onPress={canResend ? handleResendOTP : undefined}>
                Resend OTP
              </Text>
              {' '}after the timer ends.
            </Text>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  content: { flex: 1 },

  backButton: {
    marginTop: 16,
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapper: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  iconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(233,30,140,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(233,30,140,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(233,30,140,0.4)',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 15,
    color: '#E91E8C',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F59E0B',
    lineHeight: 17,
  },

  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderColor: 'rgba(255,68,68,0.3)',
  },
  successBanner: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  errorText: { flex: 1, fontSize: 13, color: '#FF6B6B', lineHeight: 18 },
  successText: { flex: 1, fontSize: 13, color: '#10B981', lineHeight: 18 },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  otpBox: {
    width: 48,
    height: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  otpBoxFilled: {
    borderColor: '#E91E8C',
    backgroundColor: 'rgba(233,30,140,0.12)',
  },
  otpBoxError: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255,68,68,0.1)',
  },

  resendRow: {
    alignItems: 'center',
    marginBottom: 28,
    height: 36,
    justifyContent: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(233,30,140,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,140,0.3)',
    gap: 6,
  },
  resendIcon: { marginRight: 2 },
  resendActiveText: { fontSize: 14, color: '#E91E8C', fontWeight: '600' },
  countdownText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  countdownNum: { color: '#E91E8C', fontWeight: '600' },

  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E8C',
    borderRadius: 14,
    paddingVertical: 17,
    marginBottom: 20,
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    gap: 8,
  },
  verifyBtnDisabled: { opacity: 0.45 },
  btnIcon: {},
  verifyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  helpText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  helpLink: { color: '#E91E8C', fontWeight: '600' },
});

export default OTPVerificationScreen;
