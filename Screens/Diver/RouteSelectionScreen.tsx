import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, PermissionsAndroid, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import Geolocation from 'react-native-geolocation-service';

const RouteSelectionScreen = () => {
  const [placeName, setPlaceName] = useState('');
  const [latitude, setLatitude] = useState(24.8607); // Default Karachi
  const [longitude, setLongitude] = useState(67.0011);
  const [isLoading, setIsLoading] = useState(false);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // For iOS, the permission is requested automatically by Geolocation
        return true;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsLoading(true);
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      Alert.alert('Permission denied', 'Location permission is required to use this feature');
      setIsLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        setIsLoading(false);
        Alert.alert('Success', 'Location updated successfully');
      },
      (error) => {
        Alert.alert('Error', error.message);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Get place name from coordinates
  const handleGetPlaceName = async () => {
    try {
      const apiKey = 'YOUR_GOOGLE_API_KEY'; // Replace with your Google API key
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

      const response = await axios.get(url);
      if (response.data?.results?.length > 0) {
        setPlaceName(response.data.results[0].formatted_address);
      } else {
        Alert.alert('Error', 'No location found.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location details.');
    }
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Get My Current Location" 
        onPress={getCurrentLocation} 
        disabled={isLoading}
      />
      
      <Button 
        title="Get Place Name" 
        onPress={handleGetPlaceName} 
        disabled={isLoading}
      />
      
      {placeName !== '' && (
        <Text style={styles.placeText}>Current Location: {placeName}</Text>
      )}
      
      <MapView
        style={styles.map}
        region={{
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        <Marker
          coordinate={{ latitude: latitude, longitude: longitude }}
          title="Your Location"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginTop: 20,
  },
});

export default RouteSelectionScreen;