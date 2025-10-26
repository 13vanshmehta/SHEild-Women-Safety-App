// API Service for SHEild Women Safety App
const BASE_URL = 'http://192.168.29.17:8000'; // Update this with your actual IP

export interface ServerResponse {
  status: 'success' | 'error';
  message: string;
}

export const apiService = {
  // Check server health
  async checkServerHealth(): Promise<ServerResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${BASE_URL}/onbaording`, {
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
  },

  // Get server status
  async getServerStatus(): Promise<ServerResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${BASE_URL}/`, {
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
};
