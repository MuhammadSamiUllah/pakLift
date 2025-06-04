import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Dimensions, 
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';

import Config from 'react-native-config';
const apiUrl = Config.API_URL;
const { width, height } = Dimensions.get('window');

// Default coordinates for Karachi (fallback when backend is unavailable)
const DEFAULT_ORIGIN = {
  latitude: 24.8607,
  longitude: 67.0011,
  name: "Downtown Karachi"
};

const DEFAULT_DESTINATION = {
  latitude: 24.8934,
  longitude: 67.0281,
  name: "North Karachi"
};

const RideOptionCard = ({ type, time, duration, price, selected, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.rideOption, selected && styles.selectedRideOption]}
      onPress={onPress}
    >
      <View style={styles.rideInfo}>
        <Text style={styles.rideType}>{type}</Text>
        <Text style={styles.rideTime}>{time}</Text>
      </View>
      <View style={styles.rideDetails}>
        <Text style={styles.rideDuration}>{duration}</Text>
        <Text style={styles.ridePrice}>Rs {price}</Text>
      </View>
      <View style={styles.selectButton}>
        <Text style={styles.selectButtonText}>{selected ? 'Selected' : 'Select'}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function CustomerHomeScreen() {
  // Map state
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [busPosition, setBusPosition] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ride selection state
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRideSelection, setShowRideSelection] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [activeRides, setActiveRides] = useState([]);
  const [driverDetails, setDriverDetails] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [usingDefaultRoute, setUsingDefaultRoute] = useState(false);

  // Location input state
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const mapRef = useRef(null);

  // Sample ride options
  const rides = [
    { id: 1, type: 'Standard', time: '10:30 AM', duration: '5 min', price: '20.00' },
    { id: 2, type: 'Premium', time: '10:40 AM', duration: '15 min', price: '22.00' },
    { id: 3, type: 'Luxury', time: '10:50 AM', duration: '25 min', price: '52.00' },
  ];

  useEffect(() => {
    const fetchRidesAndRoute = async () => {
      try {
        // Try to fetch active rides from backend
        const response = await fetch(`http://172.17.241.75:3000/api/rides`);
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        setActiveRides(data);
        
        if (data.length > 0) {
          // Use the first available ride's coordinates
          const ride = data[0];
          const fromCoords = ride.from.coordinates;
          const toCoords = ride.to.coordinates;
          
          setOrigin({
            latitude: fromCoords.latitude,
            longitude: fromCoords.longitude,
            name: ride.from.name
          });
          
          setDestination({
            latitude: toCoords.latitude,
            longitude: toCoords.longitude,
            name: ride.to.name
          });
          
          await fetchRoute(fromCoords.latitude, fromCoords.longitude, toCoords.latitude, toCoords.longitude);
          setUsingDefaultRoute(false);
        } else {
          // No active rides available - use default route
          await useDefaultRoute();
        }
      } catch (error) {
        console.error('Failed to fetch rides:', error);
        // Fall back to default route when backend fails
        await useDefaultRoute();
        Alert.alert(
          'Connection Issue',
          'Showing demonstration route. Real-time data unavailable.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    const useDefaultRoute = async () => {
      setOrigin(DEFAULT_ORIGIN);
      setDestination(DEFAULT_DESTINATION);
      await fetchRoute(
        DEFAULT_ORIGIN.latitude,
        DEFAULT_ORIGIN.longitude,
        DEFAULT_DESTINATION.latitude,
        DEFAULT_DESTINATION.longitude
      );
      setUsingDefaultRoute(true);
    };

    fetchRidesAndRoute();
  }, []);

  const apiRequest = async (method, endpoint, data = null) => {
    try {
      const baseUrl = `http://172.17.241.75:3000/api`;
      const response = await axios({
        method,
        url: `${baseUrl}${endpoint}`,
        data,
      });
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  const fetchRoute = async (originLat, originLng, destLat, destLng) => {
    const apiKey = 'AIzaSyBT99TZreg7qNR4xmoRvGW6Tl7OIj2KSHw';
    const originStr = `${originLat},${originLng}`;
    const destinationStr = `${destLat},${destLng}`;
    
    try {
      // Try to get detailed route from Google Maps API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${apiKey}`
      );
      
      if (response.data.routes.length === 0) {
        throw new Error('No routes returned from API');
      }
      
      const points = response.data.routes[0].overview_polyline.points;
      const decoded = decodePolyline(points);
      setRouteCoordinates(decoded);
      setBusPosition(decoded[0]);
    } catch (error) {
      console.error('Failed to fetch detailed route:', error);
      // Fallback: create straight line between points
      const fallbackRoute = [
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng }
      ];
      setRouteCoordinates(fallbackRoute);
      setBusPosition(fallbackRoute[0]);
    }
  };

  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    
    while (index < len) {
      let b, shift = 0, result = 0;
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
      
      poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    
    return poly;
  };

  useEffect(() => {
    if (routeCoordinates.length === 0 || !busPosition) return;

    // Simulate bus movement along the route
    const interval = setInterval(() => {
      if (currentIndex < routeCoordinates.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setBusPosition(routeCoordinates[currentIndex + 1]);
      } else {
        setCurrentIndex(0);
        setBusPosition(routeCoordinates[0]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex, routeCoordinates, busPosition]);

  const handleConfirmRide = () => {
    if (selectedRide) {
      setShowConfirmationModal(true);
      setTimeout(() => {
        setShowConfirmationModal(false);
        setShowRideSelection(false);
        
        // Mock driver details when using default route
        setDriverDetails({
          driverName: usingDefaultRoute ? 'Demo Driver' : 'John Smith',
          vehicle: {
            model: usingDefaultRoute ? 'Demo Bus' : 'Toyota Hiace',
            numberPlate: usingDefaultRoute ? 'DEMO-123' : 'ABC-123'
          }
        });
        
        setEstimatedArrival(usingDefaultRoute ? '5' : '8');
      }, 2000);
    }
  };

  const getMapRegion = () => {
    if (selectedLocation) {
      return {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    // Calculate region that fits both origin and destination
    const minLat = Math.min(origin.latitude, destination.latitude);
    const maxLat = Math.max(origin.latitude, destination.latitude);
    const minLng = Math.min(origin.longitude, destination.longitude);
    const maxLng = Math.max(origin.longitude, destination.longitude);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5,
      longitudeDelta: (maxLng - minLng) * 1.5,
    };
  };

  // Handle location input change
  const handleLocationChange = async (text) => {
    setPickupLocation(text);
    
    if (text.length > 2) {
      setIsSuggestionsLoading(true);
      try {
        const apiKey = 'AIzaSyBT99TZreg7qNR4xmoRvGW6Tl7OIj2KSHw';
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${apiKey}&components=country:pk`
        );
        
        if (response.data.predictions) {
          setLocationSuggestions(response.data.predictions);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      } finally {
        setIsSuggestionsLoading(false);
      }
    } else {
      setLocationSuggestions([]);
    }
  };

  // Handle location selection from suggestions
  const handleSelectSuggestion = async (place) => {
    setPickupLocation(place.description);
    setLocationSuggestions([]);
    
    try {
      const apiKey = 'AIzaSyBT99TZreg7qNR4xmoRvGW6Tl7OIj2KSHw';
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${apiKey}`
      );
      
      if (response.data.result) {
        const location = response.data.result.geometry.location;
        const newLocation = {
          latitude: location.lat,
          longitude: location.lng,
          name: place.description
        };
        
        setSelectedLocation(newLocation);
        
        // Center map on selected location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  // Toggle location input visibility
  const toggleLocationInput = () => {
    setShowLocationInput(!showLocationInput);
    if (!showLocationInput) {
      setIsSelectingLocation(true);
    } else {
      setIsSelectingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Section */}
      <View style={[styles.mapContainer, !showRideSelection && styles.fullScreenMap]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a8a4f" />
            <Text>Loading route information...</Text>
          </View>
        ) : (
          <>
            {usingDefaultRoute && (
              <View style={styles.defaultRouteBanner}>
                <Text style={styles.defaultRouteText}>Demonstration Mode: Using sample route</Text>
              </View>
            )}
            
            {/* Location Input Toggle Button */}
            <TouchableOpacity 
              style={styles.locationToggleButton}
              onPress={toggleLocationInput}
            >
              <Text style={styles.locationToggleButtonText}>
                {showLocationInput ? 'Hide Location Input' : 'Set Pickup Location'}
              </Text>
            </TouchableOpacity>
            
            {/* Location Input Container */}
            {showLocationInput && (
              <View style={styles.locationInputContainer}>
                <View style={styles.locationInputWrapper}>
                  <TextInput
                    style={styles.locationInput}
                    placeholder="Enter pickup location"
                    value={pickupLocation}
                    onChangeText={handleLocationChange}
                    autoFocus={true}
                  />
                  
                  {isSuggestionsLoading && (
                    <View style={styles.suggestionLoading}>
                      <ActivityIndicator size="small" color="#1a8a4f" />
                    </View>
                  )}
                  
                  {locationSuggestions.length > 0 && (
                    <ScrollView style={styles.suggestionsContainer}>
                      {locationSuggestions.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <Text style={styles.suggestionText}>{item.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}
            
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={getMapRegion()}
              region={getMapRegion()}
            >
              {routeCoordinates.length > 0 && (
                <>
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#3498db"
                    strokeWidth={4}
                  />
                  
                  <Marker
                    coordinate={busPosition}
                    title={usingDefaultRoute ? "Demo Bus" : "Bus"}
                    description={usingDefaultRoute ? "Demonstration vehicle" : "Your ride"}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <Image 
                      source={require('../../assets/images/vehicles/bus-4-xxl.png')}
                      style={{ 
                        width: 30, 
                        height: 30, 
                        transform: [{ rotate: `${currentIndex * 15}deg` }] 
                      }}
                    />
                  </Marker>

                  <Marker
                    coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
                    title={origin.name}
                    pinColor="green"
                  />
                  <Marker
                    coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
                    title={destination.name}
                    pinColor="red"
                  />
                  
                  {/* Passenger Location Marker */}
                  {selectedLocation && (
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude
                      }}
                      title="Your Location"
                    >
                      <View style={styles.passengerMarker}>
                        <View style={styles.passengerMarkerInner}>
                          <Image 
                            source={require('../../assets/images/yellowMapIcon.jpg')}
                            style={{ width: 20, height: 20 }}
                          />
                        </View>
                      </View>
                    </Marker>
                  )}
                </>
              )}
            </MapView>
          </>
        )}
      </View>

      {/* Driver Info Card */}
      {driverDetails && !showRideSelection && (
        <View style={styles.driverInfoCard}>
          <View style={styles.driverHeader}>
            <Image 
              source={require('../../assets/images/vehicles/bus-4-xxl.png')} 
              style={styles.driverAvatar}
            />
            <View style={styles.driverText}>
              <Text style={styles.driverName}>{driverDetails.driverName}</Text>
              <Text style={styles.driverRating}>⭐ 4.8 (120 rides)</Text>
            </View>
          </View>
          
          {estimatedArrival && (
            <Text style={styles.arrivalText}>
              Estimated arrival: {estimatedArrival} minutes
            </Text>
          )}
          
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleText}>
              {driverDetails.vehicle.model} • {driverDetails.vehicle.numberPlate}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Contact Driver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ride Selection Section */}
      {showRideSelection && (
        <ScrollView style={styles.rideSelectionContainer}>
          <View style={styles.contentContainer}>
            <Text style={styles.header}>Select Ride</Text>
            
            <View style={styles.rideDetailsCard}>
              <Text style={styles.rideRouteText}>
                {origin.name} → {destination.name}
              </Text>
              <Text style={styles.rideDistanceText}>
                {usingDefaultRoute ? '5 km • 15 min' : 'Calculating...'}
              </Text>
              {selectedLocation && (
                <Text style={styles.pickupLocationText}>
                  Pickup: {selectedLocation.name}
                </Text>
              )}
            </View>
            
            <View style={styles.ridesContainer}>
              {rides.map((ride) => (
                <RideOptionCard
                  key={ride.id}
                  type={ride.type}
                  time={ride.time}
                  duration={ride.duration}
                  price={ride.price}
                  selected={selectedRide === ride.id}
                  onPress={() => setSelectedRide(ride.id)}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.confirmButton, selectedRide && styles.confirmButtonActive]}
              disabled={!selectedRide}
              onPress={handleConfirmRide}
            >
              <Text style={styles.confirmButtonText}>Select ride</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConfirmationModal}
        onRequestClose={() => {
          setShowConfirmationModal(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Ride Selected!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    height: 400,
    width: '100%',
  },
  fullScreenMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  defaultRouteBanner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,204,0,0.9)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
    alignItems: 'center',
  },
  defaultRouteText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rideSelectionContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  rideDetailsCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rideRouteText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rideDistanceText: {
    fontSize: 16,
    color: '#666',
  },
  pickupLocationText: {
    fontSize: 14,
    color: '#1a8a4f',
    marginTop: 8,
    fontStyle: 'italic',
  },
  ridesContainer: {
    marginBottom: 16,
  },
  rideOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedRideOption: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  rideInfo: {
    flex: 1,
  },
  rideType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rideTime: {
    fontSize: 16,
    color: '#666',
  },
  rideDetails: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 16,
  },
  rideDuration: {
    fontSize: 16,
    marginBottom: 4,
  },
  ridePrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectButton: {
    backgroundColor: '#1a8a4f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 3,
  },
  selectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#1a8a4f',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    opacity: 0.7,
  },
  confirmButtonActive: {
    opacity: 1,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a8a4f',
  },
  driverInfoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  driverText: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverRating: {
    fontSize: 14,
    color: '#666',
  },
  arrivalText: {
    fontSize: 16,
    color: '#1a8a4f',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vehicleInfo: {
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 16,
    color: '#333',
  },
  contactButton: {
    backgroundColor: '#1a8a4f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  locationInputContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  locationToggleButton: {
    position: 'absolute',
    top: 80,
    right: 10,
    backgroundColor: '#1a8a4f',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 2,
  },
  locationToggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  locationInputWrapper: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  suggestionItem: {
    padding: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
  },
  suggestionLoading: {
    padding: 5,
  },
  passengerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 138, 79, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerMarkerInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(26, 138, 79, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});