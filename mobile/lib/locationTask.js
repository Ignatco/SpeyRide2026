// Background location task for drivers — keeps streaming GPS to backend
// while the app is backgrounded / phone is locked.
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BG_LOCATION_TASK = 'spey-ride-driver-location';

TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data) return;
  const locations = data.locations || [];
  if (!locations.length) return;
  const last = locations[locations.length - 1];
  try {
    const token = await SecureStore.getItemAsync('taxi_token');
    if (!token) return;
    const base = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ride-ready-13.preview.emergentagent.com';
    await axios.post(
      `${base}/api/driver/location`,
      {
        lat: last.coords.latitude,
        lng: last.coords.longitude,
        heading: typeof last.coords.heading === 'number' && last.coords.heading >= 0 ? last.coords.heading : null,
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
    );
  } catch (_) {}
});

export async function startDriverBackgroundStream() {
  // Foreground first
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  // We attempt background. If denied, we fall back to foreground-only watcher in component.
  if (bg.status !== 'granted') return false;
  const running = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
  if (running) return true;
  await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 6000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Spey Ride',
      notificationBody: 'Sharing your location with the rider',
      notificationColor: '#DFFF00',
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
  });
  return true;
}

export async function stopDriverBackgroundStream() {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
    if (running) {
      await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
    }
  } catch (_) {}
}
