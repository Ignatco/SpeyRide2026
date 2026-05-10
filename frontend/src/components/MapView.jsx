import { useEffect, useRef } from "react";
import L from "leaflet";

// Fix default icon URLs (CRA bundling)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTR = '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap';

const pinIcon = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

/**
 * MapView
 *
 * Props:
 *   center        – [lat, lng] default centre
 *   pickup        – { lat, lng } pickup pin
 *   drop          – { lat, lng } drop pin
 *   driverPos     – { lat, lng } driver pin (green)
 *   routeCoords   – OSRM [[lng, lat], ...] — real road route to draw
 *   dark          – bool, use dark tiles
 *   interactive   – bool
 *   fitBounds     – bool, auto-zoom to markers
 */
export default function MapView({
  center = [57.1959, -3.829],
  pickup = null,
  drop = null,
  driverPos = null,
  routeCoords = null,   // [[lng, lat], ...] from OSRM
  dark = false,
  height = "100%",
  interactive = true,
  fitBounds = true,
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef({});

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: true,
    });
    L.tileLayer(dark ? TILE_DARK : TILE_LIGHT, {
      attribution: ATTR,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    if (interactive) L.control.zoom({ position: "topright" }).addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // Update markers + route whenever props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear all previous layers
    Object.values(layersRef.current).forEach((l) => l && map.removeLayer(l));
    layersRef.current = {};

    const primaryColor = dark ? "#DFFF00" : "#002FA7";

    // Pickup marker
    if (pickup) {
      layersRef.current.pickup = L.marker([pickup.lat, pickup.lng], {
        icon: pinIcon(primaryColor),
      })
        .addTo(map)
        .bindTooltip("Pickup");
    }

    // Drop marker
    if (drop) {
      layersRef.current.drop = L.marker([drop.lat, drop.lng], {
        icon: pinIcon("#FF2B2B"),
      })
        .addTo(map)
        .bindTooltip("Drop");
    }

    // Driver marker
    if (driverPos) {
      layersRef.current.driver = L.marker([driverPos.lat, driverPos.lng], {
        icon: pinIcon("#00E676"),
      })
        .addTo(map)
        .bindTooltip("Driver");
    }

    // Route: prefer real OSRM road geometry, fall back to straight dashed line
    if (pickup && drop) {
      if (routeCoords && routeCoords.length >= 2) {
        // OSRM returns [[lng, lat], ...] — Leaflet wants [[lat, lng], ...]
        const latlngs = routeCoords.map(([lng, lat]) => [lat, lng]);

        // Subtle background casing for readability on both light/dark tiles
        layersRef.current.routeCasing = L.polyline(latlngs, {
          color: dark ? "#000000" : "#ffffff",
          weight: 8,
          opacity: 0.6,
        }).addTo(map);

        layersRef.current.route = L.polyline(latlngs, {
          color: primaryColor,
          weight: 4,
          opacity: 1,
        }).addTo(map);
      } else {
        // Fallback straight dashed line while route is loading or unavailable
        layersRef.current.line = L.polyline(
          [
            [pickup.lat, pickup.lng],
            [drop.lat, drop.lng],
          ],
          {
            color: primaryColor,
            weight: 3,
            opacity: 0.7,
            dashArray: "6 8",
          }
        ).addTo(map);
      }
    }

    // Auto-fit bounds
    if (fitBounds) {
      // Prefer fitting to the route shape when available
      if (routeCoords && routeCoords.length >= 2 && pickup && drop) {
        const latlngs = routeCoords.map(([lng, lat]) => [lat, lng]);
        map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [60, 60] });
      } else {
        const pts = [pickup, drop, driverPos]
          .filter(Boolean)
          .map((p) => [p.lat, p.lng]);
        if (pts.length >= 2) {
          map.fitBounds(pts, { padding: [60, 60] });
        } else if (pts.length === 1) {
          map.setView(pts[0], 14);
        }
      }
    }
  }, [pickup, drop, driverPos, routeCoords, dark, fitBounds]);

  return (
    <div
      ref={containerRef}
      data-testid="map-view"
      className={dark ? "dark-tiles" : ""}
      style={{ width: "100%", height }}
    />
  );
}
