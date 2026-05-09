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

export default function MapView({
  center = [57.1959, -3.829],
  pickup = null,
  drop = null,
  driverPos = null,
  dark = false,
  height = "100%",
  interactive = true,
  fitBounds = true,
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef({});

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
    L.tileLayer(dark ? TILE_DARK : TILE_LIGHT, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    if (interactive) L.control.zoom({ position: "topright" }).addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // Update markers + route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L_ = window.L || L;
    Object.values(layersRef.current).forEach((l) => l && map.removeLayer(l));
    layersRef.current = {};

    if (pickup) {
      layersRef.current.pickup = L_.marker([pickup.lat, pickup.lng], { icon: pinIcon(dark ? "#DFFF00" : "#002FA7") })
        .addTo(map)
        .bindTooltip("Pickup");
    }
    if (drop) {
      layersRef.current.drop = L_.marker([drop.lat, drop.lng], { icon: pinIcon("#FF2B2B") })
        .addTo(map)
        .bindTooltip("Drop");
    }
    if (driverPos) {
      layersRef.current.driver = L_.marker([driverPos.lat, driverPos.lng], { icon: pinIcon("#00E676") })
        .addTo(map)
        .bindTooltip("Driver");
    }
    if (pickup && drop) {
      layersRef.current.line = L_.polyline(
        [
          [pickup.lat, pickup.lng],
          [drop.lat, drop.lng],
        ],
        { color: dark ? "#DFFF00" : "#002FA7", weight: 4, opacity: 0.9, dashArray: "6 8" }
      ).addTo(map);
    }

    if (fitBounds) {
      const pts = [pickup, drop, driverPos].filter(Boolean).map((p) => [p.lat, p.lng]);
      if (pts.length >= 2) {
        map.fitBounds(pts, { padding: [60, 60] });
      } else if (pts.length === 1) {
        map.setView(pts[0], 14);
      }
    }
  }, [pickup, drop, driverPos, dark, fitBounds]);

  return (
    <div
      ref={containerRef}
      data-testid="map-view"
      className={dark ? "dark-tiles" : ""}
      style={{ width: "100%", height }}
    />
  );
}
