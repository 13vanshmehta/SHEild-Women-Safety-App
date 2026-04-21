import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/api';
import { authService } from '../services/authService';
import userLocationService from '../services/userLocationService';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  loginType: 'email' | 'google' | 'apple';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Check authentication status on app start
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken && storedUser) {
        // Verify token with backend
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setToken(storedToken);
            setUser(data.data.user);

            // Start location tracking for existing session
            console.log('🌍 Resuming location tracking for existing session...');
            setTimeout(() => {
              userLocationService.startLocationTracking(30000);
            }, 2000);
          } else {
            // Token is invalid, clear storage
            await AsyncStorage.multiRemove(['auth_token', 'user_data']);
            setToken(null);
            setUser(null);
          }
        } else {
          // Token is invalid, clear storage
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear storage on error
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (newToken: string, newUser: User) => {
    try {
      await AsyncStorage.multiSet([
        ['auth_token', newToken],
        ['user_data', JSON.stringify(newUser)],
      ]);
      setToken(newToken);
      setUser(newUser);
      
      // Start location tracking after successful login
      console.log('🌍 Starting location tracking after login...');
      setTimeout(() => {
        userLocationService.startLocationTracking(30000); // Update every 30 seconds
      }, 2000); // Delay to ensure app is fully loaded
    } catch (error) {
      console.error('Login storage error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Stop location tracking
      console.log('🛑 Stopping location tracking before logout...');
      userLocationService.stopLocationTracking();
      
      // Call backend to logout (expire JWT token)
      if (token) {
        await authService.logout(token);
      }
      
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout storage error:', error);
      // Even if backend call fails, clear local storage
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setToken(null);
      setUser(null);
    }
  };

  // Update user function
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    // Update stored user data
    AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
