import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../constants';

interface ResetPasswordScreenProps {
  email: string;
  onBackToLogin: () => void;
  onPasswordReset: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ 
  email, 
  onBackToLogin, 
  onPasswordReset 
}) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const onReset = async () => {
    const normalizedCode = code.trim();
    if (!email || !normalizedCode || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (normalizedCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement backend call to verify code and reset password
      // await authService.verifyResetCodeAndSetPassword(email, normalizedCode, password);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert('Success', 'Password has been reset. Please sign in.', [
        { text: 'OK', onPress: onPasswordReset },
      ]);
    } catch (err: any) {
      const msg = err?.message || 'Failed to reset password';
      console.error('Reset password error:', err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      // TODO: Implement backend call to resend code
      // await authService.sendPasswordResetEmail(email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('New code sent', 'Please check your inbox for the latest code. Use the newest code only.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to resend code';
      console.error('Resend code error:', err);
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
              <Icon name="arrow-right" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Enter code and new password</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to {email}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Email (read-only) */}
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { opacity: 0.8 }]}>
                <Icon name="envelope" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textSecondary}
                  value={email}
                  editable={false}
                />
              </View>
            </View>

            {/* Verification Code */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="key" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Verification code"
                  placeholderTextColor={Colors.textSecondary}
                  value={code}
                  onChangeText={(txt) => setCode(txt.replace(/\D/g, ''))}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor={Colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                  <Icon 
                    name={isPasswordVisible ? "eye-slash" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </Pressable>
              </View>
            </View>
            
            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!isConfirmPasswordVisible}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                  <Icon 
                    name={isConfirmPasswordVisible ? "eye-slash" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </Pressable>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={onReset} 
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Resetting...' : 'Reset password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendButton} onPress={onResend} disabled={loading}>
              <Text style={styles.resendButtonText}>Resend code</Text>
            </TouchableOpacity>
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
    paddingTop: 20,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
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
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.background,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;
