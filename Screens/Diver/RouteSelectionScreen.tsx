import React, { useEffect, useState, useRef, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  PermissionsAndroid, 
  Alert, 
  Platform, 
  TextInput, 
  Button, 
  FlatList, 
  TouchableOpacity, 
  Text,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

import axios from 'axios';
import Config from 'react-native-config';
const apiUrl = Config.API_URL;
//import { AuthContext } from '../context/AuthContext'; 

const GOOGLE_API_KEY = 'AIzaSyBT99TZreg7qNR4xmoRvGW6Tl7OIj2KSHw';
const BASE_FUEL_PRICE = 10; // Base fuel price per km in rupees
const API_BASE_URL = `http://172.17.241.75:3000/api`; // Replace with your server URL

export default function RouteSelectionScreen() {
  // Refs
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const rideIdRef = useRef(null);

  // Context
  //const { userToken, userInfo } = useContext(AuthContext);

  // States
  const [location, setLocation] = useState({
    latitude: 24.8607,
    longitude: 67.0011,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seats, setSeats] = useState('1');
  const [fare, setFare] = useState(null);
  const [fuelPrice, setFuelPrice] = useState(BASE_FUEL_PRICE.toString());
  const [showFareDetails, setShowFareDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize
  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Calculate fare whenever relevant values change
  useEffect(() => {
    if (distance && seats && fuelPrice) {
      calculateFare();
    }
  }, [distance, seats, fuelPrice]);

  // API request helper with auth headers
  const apiRequest = async (method, endpoint, data = {}) => {
    try {
      const response = await axios({
        method,
        url: `${API_BASE_URL}${endpoint}`,
        data,
        headers: {
       //   'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
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
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => updateLocation(position),
      (error) => console.log(error.code, error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const startLiveTracking = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      (position) => updateLocation(position),
      (error) => console.log(error.code, error.message),
      { 
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000
      }
    );
    setIsTracking(true);
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const updateLocation = (position) => {
    const { latitude, longitude } = position.coords;
    setCurrentPosition({ latitude, longitude });
    
    if (isTracking && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
      
      // Update live location in database if we have a ride ID
      if (rideIdRef.current) {
        updateLiveLocation(rideIdRef.current, { latitude, longitude });
      }
    }
  };

const updateLiveLocation = async (rideId, location) => {
  try {
    // Debug before sending
    console.log('Attempting location update for ride:', rideId, 'with location:', {
      lat: location.latitude.toFixed(6),
      lng: location.longitude.toFixed(6),
      timestamp: Date.now()
    });

    const response = await apiRequest('patch', `/rides/${rideId}/location`, {
      latitude: location.latitude.toFixed(6),  // Ensures consistent decimal places
      longitude: location.longitude.toFixed(6),
      timestamp: Date.now(),  // Adds server timestamp in milliseconds
      accuracy: location.accuracy || null,    // Optional: include accuracy if available
      speed: location.speed || null           // Optional: include speed if available
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Debug': 'LocationUpdate',
        'X-Request-Time': Date.now()  // Additional header for network timing
      },
      timeout: 3000  // 3 second timeout
    });

    console.log('Location update successful:', {
      rideId,
      response: response.data,
      serverTime: response.headers?.date,
      latency: Date.now() - parseInt(response.config.headers['X-Request-Time'])
    });
    
    return true;
  } catch (error) {
    console.error('Location update failed:', {
      rideId,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: Date.now(),
      lastLocation: {
        lat: location?.latitude,
        lng: location?.longitude
      }
    });
    
    return false;
  }
};

const saveRideData = async () => {
  if (!from || !to || !fare || !fromLocation || !toLocation) {
    Alert.alert('Error', 'Please complete the ride details first');
    return null;
  }

  setIsSubmitting(true);
  try {
    const distanceValue = distance.split(' ')[0];
    
    const rideData = {
      from: {
        name: from,
        coordinates: {
          longitude: fromLocation.lng,
          latitude: fromLocation.lat
        }
      },
      to: {
        name: to,
        coordinates: {
          longitude: toLocation.lng,
          latitude: toLocation.lat
        }
      },
      totalFare: fare,
      seats: parseInt(seats),
      distance: distance,
      duration: duration,
   //   driver: "current_user_id" // You'll need to get this from your auth context
    };

    const response = await apiRequest('post', '/rides', rideData);
    Alert.alert('Success', 'Ride started successfully');
    return response._id;
  } catch (error) {
    Alert.alert('Error', `Failed to start ride: ${error.response?.data?.message || error.message}`);
    console.error('Error saving ride:', error);
    return null;
  } finally {
    setIsSubmitting(false);
  }
};

const endRide = async (rideId) => {
  try {
    console.log('Attempting to end ride:', rideId);
    const response = await apiRequest('patch', `/rides/${rideId}/end`);
    console.log('End ride response:', response);
    Alert.alert('Success', 'Ride ended successfully');
  } catch (error) {
    console.error('Full error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    
    Alert.alert(
      'Error', 
      `Failed to end ride: ${error.response?.data?.message || error.message}`
    );
  }
};

  const fetchSuggestions = async (input, isFromField) => {
    if (input.length < 3) {
      isFromField ? setFromSuggestions([]) : setToSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_API_KEY}`
      );

      const suggestions = response.data.predictions.map(prediction => ({
        id: prediction.place_id,
        description: prediction.description,
      }));

      isFromField ? setFromSuggestions(suggestions) : setToSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSuggestionSelect = async (suggestion, isFromField) => {
    Keyboard.dismiss();
    isFromField ? setFrom(suggestion.description) : setTo(suggestion.description);
    isFromField ? setFromSuggestions([]) : setToSuggestions([]);
    
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?placeid=${suggestion.id}&key=${GOOGLE_API_KEY}`
      );
      
      const location = response.data.result.geometry.location;
      
      if (isFromField) {
        setFromLocation(location);
      } else {
        setToLocation(location);
      }

      if ((isFromField && toLocation) || (!isFromField && fromLocation)) {
        drawRoute();
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  const drawRoute = async () => {
    if (!fromLocation || !toLocation) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLocation.lat},${fromLocation.lng}&destination=${toLocation.lat},${toLocation.lng}&key=${GOOGLE_API_KEY}`
      );

      if (response.data.routes.length === 0) {
        Alert.alert('Error', 'No route found between these locations');
        return;
      }

      const route = response.data.routes[0];
      const points = route.overview_polyline.points;
      const coordinates = decodePolyline(points);
      setRouteCoordinates(coordinates);

      let totalDistance = 0;
      let totalDuration = 0;
      
      route.legs.forEach(leg => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });

      setDistance(totalDistance < 1000 ? 
        `${totalDistance} meters` : 
        `${(totalDistance / 1000).toFixed(1)} km`);
      
      setDuration(totalDuration < 3600 ? 
        `${Math.round(totalDuration / 60)} mins` : 
        `${Math.floor(totalDuration / 3600)}h ${Math.round((totalDuration % 3600) / 60)}m`);

      setLocation({
        latitude: (fromLocation.lat + toLocation.lat) / 2,
        longitude: (fromLocation.lng + toLocation.lng) / 2,
        latitudeDelta: Math.abs(fromLocation.lat - toLocation.lat) * 1.5,
        longitudeDelta: Math.abs(fromLocation.lng - toLocation.lng) * 1.5,
      });

    } catch (error) {
      Alert.alert('Error', 'Could not find route. Please check your locations and try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const decodePolyline = (encoded) => {
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    const array = [];
    
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      array.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5
      });
    }
    
    return array;
  };

  const toggleTracking = async () => {
    if (isTracking) {
      stopLiveTracking();
      if (rideIdRef.current) {
        await endRide(rideIdRef.current);
        rideIdRef.current = null;
      }
    } else {
      if (!fromLocation || !toLocation) {
        Alert.alert('Error', 'Please select both From and To locations first');
        return;
      }
      
      const rideId = await saveRideData();
      if (rideId) {
        rideIdRef.current = rideId;
        startLiveTracking();
       //  navigation.navigate('CustomerHomeScreen', { rideId });
      }
    }
  };

  const calculateFare = () => {
    try {
      const distanceValue = parseFloat(distance.split(' ')[0]);
      const seatsValue = parseInt(seats) || 1;
      const fuelPriceValue = parseFloat(fuelPrice) || BASE_FUEL_PRICE;
      
      // Fare calculation: (fuel price × distance) / seats
      const calculatedFare = (fuelPriceValue * distanceValue) / seatsValue;
      
      setFare(calculatedFare.toFixed(2));
      setShowFareDetails(true);
    } catch (error) {
      console.error('Error calculating fare:', error);
    }
  };

  const handleSeatsChange = (text) => {
    if (/^\d*$/.test(text) && (text === '' || (parseInt(text) >= 1 && parseInt(text) <= 100))) {
      setSeats(text);
    }
  };

  const handleFuelPriceChange = (text) => {
    if (/^\d*\.?\d*$/.test(text)) {
      setFuelPrice(text);
    }
  };
  

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="From"
            value={from}
            onChangeText={(text) => {
              setFrom(text);
              fetchSuggestions(text, true);
            }}
            onFocus={() => setFromSuggestions([])}
          />
          {fromSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={fromSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(item, true)}
                  >
                    <Text>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="To"
            value={to}
            onChangeText={(text) => {
              setTo(text);
              fetchSuggestions(text, false);
            }}
            onFocus={() => setToSuggestions([])}
          />
          {toSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={toSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(item, false)}
                  >
                    <Text>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {(distance && duration) && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Number of seats (1-10)"
                value={seats}
                onChangeText={handleSeatsChange}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={`Fuel price per km (RS${BASE_FUEL_PRICE})`}
                value={fuelPrice}
                onChangeText={handleFuelPriceChange}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {(distance && duration) && (
          <View style={styles.routeInfoContainer}>
            <Text style={styles.routeInfoText}>Distance: {distance}</Text>
            <Text style={styles.routeInfoText}>Time: {duration}</Text>
            <Text style={styles.routeInfoText}>Seats: {seats}</Text>
            {fare && (
              <Text style={[styles.routeInfoText, styles.fareText]}>
                Fare per person: Rs{fare}
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button 
            title="Search Route" 
            onPress={drawRoute} 
            disabled={!fromLocation || !toLocation || loading}
          />
          <View style={styles.trackingButton}>
            <Button
              title={isTracking ? "Stop Ride" : "Start Ride"}
              onPress={toggleTracking}
              color={isTracking ? "#ff3b30" : "#34C759"}
              disabled={!fromLocation || !toLocation || isSubmitting}
            />
          </View>
        </View>
      </View>
      
      <MapView
        ref={mapRef}
        style={styles.map}
        region={location}
        showsUserLocation={true}
        followsUserLocation={isTracking}
        showsMyLocationButton={true}
      >
        {fromLocation && (
          <Marker
            coordinate={{
              latitude: fromLocation.lat,
              longitude: fromLocation.lng
            }}
            title="Starting Point"
            pinColor="#1a8a4f"
          />
        )}
        
        {toLocation && (
          <Marker
            coordinate={{
              latitude: toLocation.lat,
              longitude: toLocation.lng
            }}
            title="Destination"
            pinColor="#ff0000"
          />
        )}
        
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0000FF"
            strokeWidth={4}
          />
        )}

        {currentPosition && isTracking && (
          <Marker
            coordinate={currentPosition}
            title="Your Location"
            pinColor="#007AFF"
          />
        )}
      </MapView>

      {(loading || isSubmitting) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          {isSubmitting && <Text style={styles.loadingText}>Saving ride data...</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    maxHeight: 150,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    zIndex: 10,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 10,
  },
  trackingButton: {
    marginTop: 5,
    backgroundColor:'#1a8a4f'
  },
  routeInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  routeInfoText: {
    fontSize: 16,
    marginVertical: 2,
  },
  fareText: {
    fontWeight: 'bold',
    color: '#2ecc71',
    fontSize: 18,
    marginTop: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});





