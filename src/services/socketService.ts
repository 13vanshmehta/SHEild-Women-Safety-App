import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './apiService';

let socket: Socket | null = null;

const getStoredToken = async (): Promise<string | null> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      token = await AsyncStorage.getItem('authToken');
    }
    return token;
  } catch (error) {
    console.error('Error reading auth token for socket:', error);
    return null;
  }
};

export const connectSocket = async (): Promise<Socket> => {
  if (socket && socket.connected) {
    return socket;
  }

  const token = await getStoredToken();

  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};