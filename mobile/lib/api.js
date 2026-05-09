import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Hardcoded fallback so the app works even if .env isn't loaded by Expo.
// Override via EXPO_PUBLIC_BACKEND_URL when needed.
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://ride-ready-13.preview.emergentagent.com';

export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('taxi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const tokenStore = {
  async set(token) {
    await SecureStore.setItemAsync('taxi_token', token);
  },
  async get() {
    return SecureStore.getItemAsync('taxi_token');
  },
  async clear() {
    await SecureStore.deleteItemAsync('taxi_token');
  },
};
