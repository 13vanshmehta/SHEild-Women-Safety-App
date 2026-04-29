// API Service for SHEild Women Safety App
import { API_CONFIG } from '../constants/api';

const BASE_URL = API_CONFIG.BASE_URL;
export const API_BASE_URL = BASE_URL;

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
      const token = await AsyncStorage.getItem('auth_token');
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
      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  }

  async post(url: string, body?: any): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
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
      return await response.json();
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
      return await response.json();
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }

  async upload(url: string, formData: FormData): Promise<any> {
    try {
      const headers = await this.getHeaders();
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
      return await response.json();
    } catch (error) {
      console.error('UPLOAD request failed:', error);
      throw error;
    }
  }

  async checkServerHealth(): Promise<ServerResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/onboarding`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.text();
        return { status: 'success', message: data || 'Server is Working!' };
      }
      return { status: 'error', message: 'Server responded with error' };
    } catch (error) {
      console.error('Server health check failed:', error);
      return { status: 'error', message: 'Server is not working, please try again later' };
    }
  }

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
        return { status: 'success', message: data || 'Server is Working!' };
      }
      return { status: 'error', message: 'Server responded with error' };
    } catch (error) {
      console.error('Server status check failed:', error);
      return { status: 'error', message: 'Server is not working, please try again later' };
    }
  }
}

export const apiService = new ApiService();
