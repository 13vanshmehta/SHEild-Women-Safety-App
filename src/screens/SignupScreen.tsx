import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Pressable,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../constants';
import { authService } from '../services/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../contexts/AuthContext';

interface SignupScreenProps {
  onSignupSuccess: (email: string) => void;
  onNavigateToLogin: () => void;
  onNavigateToForgotPassword: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onSignupSuccess, onNavigateToLogin, onNavigateToForgotPassword: _onNavigateToForgotPassword }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Google Sign-In configuration
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '387247252263-fggkf3drod1j2fn9ms7sa9gruep1cpg0.apps.googleusercontent.com', // Web client ID
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Split full name into first and last name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName || !lastName) {
      Alert.alert('Error', 'Please enter your full name (first and last name)');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        firstName,
        lastName,
        email,
        password
      });

      if (response.success) {
        onSignupSuccess(email);
      } else {
        Alert.alert('Error', response.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      console.log('Google Sign-Up Response:', JSON.stringify(userInfo, null, 2));
      
      if (userInfo.data?.idToken) {
        // Get user info from Google API to extract user details
        const getUserInfo = async (accessToken: string) => {
          try {
            const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            return await response.json();
          } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
          }
        };

        // Get user details from Google
        const googleUserInfo = await getUserInfo(userInfo.data.serverAuthCode || userInfo.data.idToken);
        console.log('Google User Info:', googleUserInfo);
        
        // Try to register the user with Google (this will handle both new and existing users)
        const response = await authService.googleRegisterMobile(userInfo.data.idToken);
        
        if (response.success) {
          const { token, user } = response.data!;
          await login(token, user);
          
          // Directly navigate to main app without showing alert
          onSignupSuccess(user.email);
        } else {
          // Check if user already exists
          if (response.message?.includes('already exists') || 
              response.message?.includes('already registered') ||
              response.message?.includes('Account with this Google ID already exists') ||
              response.message?.includes('Account with this email already exists')) {
            Alert.alert(
              'Account Already Exists', 
              'This Google account is already registered. Please use the Sign In option instead.',
              [
                { text: 'Go to Sign In', onPress: () => onNavigateToLogin() },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          } else {
            Alert.alert('Error', response.message || 'Google registration failed');
          }
        }
      } else {
        console.error('No ID token in response:', userInfo);
        Alert.alert('Error', `Failed to get Google authentication token. Response: ${JSON.stringify(userInfo)}`);
      }
    } catch (error: any) {
      console.error('Google Sign-Up Error:', error);
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        // User cancelled the sign-in flow
        console.log('User cancelled Google sign-up');
      } else if (error.code === 'IN_PROGRESS') {
        Alert.alert('Error', 'Sign-up is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        Alert.alert('Error', 'Google sign-up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = () => {
    Alert.alert('Apple Signup', 'Apple signup functionality will be implemented with backend integration');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header/Logo */}
          <View style={styles.header}>
            <Image 
              source={require('../assets/images/Sheild-App-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>SHEild</Text>
            <Text style={styles.appSubtitle}>Stay Safe, Stay Connected</Text>
          </View>

          {/* Signup Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Join SHEild to start your safety journey</Text>

            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="user" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="envelope" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!isConfirmPasswordVisible}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                  <Icon 
                    name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </Pressable>
              </View>
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.signupButtonText}>
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Social Auth Options */}
            <View style={styles.socialContainer}>
              <Text style={styles.socialText}>Or register with</Text>
              
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={handleGoogleSignup}
                >
                  <Icon name="google" size={24} color="#4285F4" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignup}>
                  <Icon name="apple" size={24} color="#000000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  appSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
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
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  signupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.background,
  },
  socialContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  socialText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.secondary,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loginText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default SignupScreen;
