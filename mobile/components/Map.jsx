import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View, Text } from 'react-native';
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

  const driverHeading = typeof driverPos?.heading === 'number' && driverPos.heading >= 0 ? driverPos.heading : 0;

  return (
    <View style={[styles.container, height ? { height } : { flex: 1 }]}>
      <MapView
        ref={ref}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle={dark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
        initialRegion={AVIEMORE}
        showsUserLocation={showsUserLocation && !driverPos}
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
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={driverHeading}
            title="Driver"
          >
            <View style={styles.driverMarker}>
              <View style={[styles.driverCore, { backgroundColor: dark ? '#DFFF00' : colors.success }]}>
                <Text style={[styles.driverArrow, { color: dark ? colors.black : colors.white }]}>▲</Text>
              </View>
              <View style={[styles.driverHalo, { borderColor: dark ? '#DFFF00' : colors.success }]} />
            </View>
          </Marker>
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
  driverMarker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  driverCore: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  driverArrow: { fontSize: 16, fontWeight: '900', marginTop: -2 },
  driverHalo: {
    position: 'absolute',
    width: 44, height: 44,
    borderWidth: 2, borderRadius: 22,
    opacity: 0.35,
  },
});
