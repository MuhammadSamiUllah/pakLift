// config.js
export default {
  API_BASE_URL: process.env.API_BASE_URL || 'http://192.168.1.23:3000/api',
  MAPS_API_KEY: process.env.MAPS_API_KEY || 'YOUR_BACKEND_PROXIED_MAPS_KEY',
  DEFAULT_LOCATION: {
    latitude: 24.8607,
    longitude: 67.0011,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
};