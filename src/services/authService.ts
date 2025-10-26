import { API_CONFIG } from '../constants/api';

const API_BASE_URL = API_CONFIG.BASE_URL;


export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface OTPVerification {
  email: string;
  otp: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  loginType: 'email' | 'google' | 'apple';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  };
}

export const authService = {
  // Register user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Verify OTP
  async verifyOTP(otpData: OTPVerification): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(otpData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Resend OTP
  async resendOTP(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Resend OTP error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Get user profile
  async getProfile(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Update user profile
  async updateProfile(token: string, updateData: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Delete user account
  async deleteAccount(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Google OAuth - Get auth URL
  async getGoogleAuthUrl(): Promise<{ success: boolean; data?: { authUrl: string } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/url`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get Google auth URL error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Google OAuth - Mobile callback (for login)
  async googleAuthMobile(accessToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Google auth mobile error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Google OAuth - Mobile registration
  async googleRegisterMobile(accessToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Google register mobile error:', error);
      throw new Error('Network error. Please try again.');
    }
  },

  // Logout user - expire JWT token
  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Network error. Please try again.');
    }
  },
};