// Theme tokens — Swiss / brutalist design system
export const colors = {
  // Rider (light)
  riderBg: '#FFFFFF',
  riderSurface: '#F4F4F5',
  riderText: '#0A0A0A',
  riderTextMuted: '#52525B',
  riderCta: '#002FA7',
  riderBorder: '#E4E4E7',

  // Driver (dark)
  driverBg: '#0A0A0A',
  driverSurface: '#18181B',
  driverText: '#FFFFFF',
  driverTextMuted: '#A1A1AA',
  driverCta: '#DFFF00',
  driverBorder: '#27272A',

  // Shared
  success: '#00E676',
  danger: '#FF2B2B',
  black: '#000000',
  white: '#FFFFFF',
};

export const fontFamily = {
  // System defaults — Outfit/IBM Plex would need expo-font setup; using stack fallback
  display: 'System',
  body: 'System',
  mono: 'Menlo',
};

export const radius = {
  none: 0,
  sm: 2,
  md: 4,
};

export const spacing = (n) => n * 4;
