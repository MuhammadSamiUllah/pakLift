import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import Config from 'react-native-config';
const apiUrl = Config.API_URL;
export default function DriverHomeScreen() {

  const navigation = useNavigation();
  const [busImage, setBusImage] = useState(null);
  const [licenseNo, setLicenseNo] = useState('');
  const [numberOfSeats, setNumberOfSeats] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    busImage: false,
    licenseNo: false,
    numberOfSeats: false,
    numberPlate: false,
  });
 // const route = useRoute();
  const { driverEmail } = "samiullahmuhammad62@gmail.com";//  const { driverEmail } = route.params;
// Alert.alert("Driver email:", driverEmail);
  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to select image');
      } else if (response.assets?.[0]?.uri) {
        const image = response.assets[0];
        setBusImage({
          uri: image.uri,
          name: image.fileName || `bus-${Date.now()}.jpg`,
          type: image.type || 'image/jpeg',
        });
        setErrors(prev => ({ ...prev, busImage: false }));
      }
    });
  };

  const validateForm = () => {
    const newErrors = {
      busImage: !busImage,
      licenseNo: !licenseNo.trim(),
      numberOfSeats: !numberOfSeats || isNaN(numberOfSeats) || parseInt(numberOfSeats) <= 0,
      numberPlate: !numberPlate.trim(),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

const handleSubmit = async () => {
  if (!validateForm()) {
    Alert.alert('Error', 'Please fill all fields correctly');
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();
    formData.append('driverEmail', driverEmail);  // Just sending driverEmail, no verification here
    formData.append('licenseNo', licenseNo);
    formData.append('numberOfSeats', numberOfSeats);
    formData.append('numberPlate', numberPlate);
    formData.append('busImage', {
      uri: busImage.uri,
      name: busImage.name,
      type: busImage.type,
    });

    const response = await fetch(`http://172.17.241.75:3000/api/drivers/vehicle-details`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit details');
    }

    Alert.alert('Success', 'Vehicle details submitted successfully!');
    navigation.navigate('RouteSelectionScreen', { driverEmail: driverEmail });
  } catch (error) {
    console.error('Submission error:', error);
    Alert.alert('Error', error.message || 'Failed to connect to server');
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Vehicle Registration</Text>

          {/* Image Upload */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>
              Bus Photo {errors.busImage && <Text style={styles.errorText}>* Required</Text>}
            </Text>
            <TouchableOpacity
              style={[styles.uploadButton, errors.busImage && styles.errorBorder]}
              onPress={selectImage}
            >
              {busImage ? (
                <Image source={{ uri: busImage.uri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Icon name="add-a-photo" size={30} color="#666" />
                  <Text style={styles.uploadText}>Select Bus Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              License Number {errors.licenseNo && <Text style={styles.errorText}>* Required</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors.licenseNo && styles.errorBorder]}
              value={licenseNo}
              onChangeText={setLicenseNo}
              placeholder="DL-1234567890"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Number of Seats {errors.numberOfSeats && <Text style={styles.errorText}>* Valid number required</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors.numberOfSeats && styles.errorBorder]}
              value={numberOfSeats}
              onChangeText={text => setNumberOfSeats(text.replace(/[^0-9]/g, ''))}
              placeholder="e.g., 14"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Number Plate {errors.numberPlate && <Text style={styles.errorText}>* Required</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors.numberPlate && styles.errorBorder]}
              value={numberPlate}
              onChangeText={setNumberPlate}
              placeholder="LEA-1234"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit Details</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a8a4f',
    marginBottom: 30,
    textAlign: 'center',
  },
  uploadSection: {
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  uploadButton: {
    height: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 10,
    color: '#666',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1a8a4f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9abf7f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
  },
  errorBorder: {
    borderColor: 'red',
  },
});