import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';
import { useEffect, useRef } from 'react';

const AVIEMORE = { latitude: 57.1959, longitude: -3.829, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function Map({ pickup, drop, driverPos, dark = false, height, showsUserLocation = true }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const pts = [pickup, drop, driverPos].filter(Boolean).map((p) => ({ latitude: p.lat, longitude: p.lng }));
    if (pts.length >= 2) {
      ref.current.fitToCoordinates(pts, {
        edgePadding: { top: 60, bottom: 60, left: 60, right: 60 },
        animated: true,
      });
    } else if (pts.length === 1) {
      ref.current.animateToRegion({ ...AVIEMORE, latitude: pts[0].latitude, longitude: pts[0].longitude }, 500);
    }
  }, [pickup, drop, driverPos]);

  return (
    <View style={[styles.container, height ? { height } : { flex: 1 }]}>
      <MapView
        ref={ref}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle={dark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
        initialRegion={AVIEMORE}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {pickup && (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            pinColor={dark ? '#DFFF00' : colors.riderCta}
            title="Pickup"
          />
        )}
        {drop && (
          <Marker
            coordinate={{ latitude: drop.lat, longitude: drop.lng }}
            pinColor={colors.danger}
            title="Drop"
          />
        )}
        {driverPos && (
          <Marker
            coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
            pinColor={colors.success}
            title="Driver"
          />
        )}
        {pickup && drop && (
          <Polyline
            coordinates={[
              { latitude: pickup.lat, longitude: pickup.lng },
              { latitude: drop.lat, longitude: drop.lng },
            ]}
            strokeColor={dark ? '#DFFF00' : colors.riderCta}
            strokeWidth={4}
            lineDashPattern={[6, 8]}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden' },
});
