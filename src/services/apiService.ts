// API Service for SHEild Women Safety App
import Config from 'react-native-config';

// Use environment variable or fallback to default
const BASE_URL = Config.API_BASE_URL || 'http://192.168.29.17:8000';
export const API_BASE_URL = BASE_URL;

console.log('API Base URL:', BASE_URL);

export interface ServerResponse {
  status: 'success' | 'error';
  message: string;
}

class ApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = BASE_URL;
  }

  private async getToken(): Promise<string | null> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // Try both possible key formats
      let token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      console.log('Retrieved token from storage:', token ? 'Token exists' : 'No token');
      if (!token) {
        console.log('Available AsyncStorage keys:', await AsyncStorage.getAllKeys());
      }
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Authorization header set with token');
    } else {
      console.log('No token available, request will not include Authorization header');
    }
    
    return headers;
  }

  async get(url: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  }

  async post(url: string, body?: any): Promise<any> {
    try {
      const headers = await this.getHeaders();
      console.log(`POST request to: ${this.baseUrl}${url}`);
      console.log('Request headers:', headers);
      console.log('Request body:', body);
      
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  }

  async put(url: string, body?: any): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  }

  async delete(url: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }

  // Multipart upload (for audio/image files)
  async upload(url: string, formData: FormData): Promise<any> {
    try {
      const headers = await this.getHeaders();
      // Let fetch/React Native set the correct multipart boundary
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete headers['Content-Type'];

      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('UPLOAD request failed:', error);
      throw error;
    }
  }

  // Check server health
  async checkServerHealth(): Promise<ServerResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/onbaording`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.text();
        return {
          status: 'success',
          message: data || 'Server is Working!'
        };
      } else {
        return {
          status: 'error',
          message: 'Server responded with error'
        };
      }
    } catch (error) {
      console.error('Server health check failed:', error);
      return {
        status: 'error',
        message: 'Server is not working, please try again later'
      };
    }
  }

  // Get server status
  async getServerStatus(): Promise<ServerResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.text();
        return {
          status: 'success',
          message: data || 'Server is Working!'
        };
      } else {
        return {
          status: 'error',
          message: 'Server responded with error'
        };
      }
    } catch (error) {
      console.error('Server status check failed:', error);
      return {
        status: 'error',
        message: 'Server is not working, please try again later'
      };
    }
  }
}

export const apiService = new ApiService();
