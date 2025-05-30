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
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function DriverHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [busImage, setBusImage] = useState(null);
  const [licenseNo, setLicenseNo] = useState('');
  const [cnic, setCnic] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    busImage: false,
    licenseNo: false,
    cnic: false,
    numberPlate: false,
  });

  // Only need to get the driverId to send to the backend
  const driverId = route.params?.driverId;

  useEffect(() => {
    if (!driverId) {
      Alert.alert('Error', 'Driver ID not found. Please sign in again.');
      navigation.goBack();
    }
  }, [driverId]);

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
        Alert.alert('Error', 'Failed to select image');
      } else if (response.assets && response.assets.length > 0) {
        const image = response.assets[0];
        setBusImage({
          uri: image.uri,
          name: image.fileName || `bus-${Date.now()}.jpg`,
          type: image.type || 'image/jpeg',
        });
        setErrors((prev) => ({ ...prev, busImage: false }));
      }
    });
  };

  const validateForm = () => {
    const newErrors = {
      busImage: !busImage,
      licenseNo: !licenseNo.trim(),
      cnic: !/^\d{13}$/.test(cnic),
      numberPlate: !numberPlate.trim(),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).includes(true);
  };

 const handleSubmit = async () => {
  if (!validateForm()) return;

  setLoading(true);

  try {
    const formData = new FormData();
    formData.append('driverId', driverId);
    formData.append('licenseNo', licenseNo);
    formData.append('cnic', cnic);
    formData.append('numberPlate', numberPlate);
    
    // Append image file with proper structure
    formData.append('busImage', {
      uri: busImage.uri,
      name: busImage.name,
      type: busImage.type,
    });

    const response = await fetch('http://192.168.1.3:3000/api/drivers/vehicle-details', {
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
    navigation.navigate('RouteSelectionScreen');
    
  } catch (error) {
    console.error('Submission error:', error);
    Alert.alert('Error', error.message || 'Failed to submit details. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Upload Your Vehicle Details</Text>

          {/* Bus Image Upload */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>
              Bus Photo {errors.busImage && <Text style={styles.errorText}>*</Text>}
            </Text>
            <TouchableOpacity
              style={[styles.uploadButton, errors.busImage && styles.errorBorder]}
              onPress={selectImage}
            >
              {busImage ? (
                <Image source={{ uri: busImage.uri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Icon name="photo-camera" size={40} color="#888" />
                  <Text style={styles.uploadText}>Tap to upload bus photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* License Number */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>
              License Number {errors.licenseNo && <Text style={styles.errorText}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors.licenseNo && styles.errorBorder]}
              placeholder="Enter license number"
              value={licenseNo}
              onChangeText={(text) => {
                setLicenseNo(text);
                setErrors((prev) => ({ ...prev, licenseNo: false }));
              }}
            />
          </View>

          {/* CNIC */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>
              CNIC {errors.cnic && <Text style={styles.errorText}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors.cnic && styles.errorBorder]}
              placeholder="Enter CNIC without dashes"
              keyboardType="numeric"
              maxLength={13}
              value={cnic}
              onChangeText={(text) => {
                setCnic(text.replace(/[^0-9]/g, ''));
                setErrors((prev) => ({ ...prev, cnic: false }));
              }}
            />
          </View>

          {/* Number Plate */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>
              Vehicle Number Plate {errors.numberPlate && <Text style={styles.errorText}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors.numberPlate && styles.errorBorder]}
              placeholder="Enter vehicle number plate"
              value={numberPlate}
              onChangeText={(text) => {
                setNumberPlate(text);
                setErrors((prev) => ({ ...prev, numberPlate: false }));
              }}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Documents</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a8a4f',
    marginBottom: 30,
    textAlign: 'center',
  },
  uploadSection: {
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  uploadButton: {
    height: 180,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#888',
    fontSize: 15,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#1a8a4f',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#9bd0b0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
  },
  errorBorder: {
    borderColor: 'red',
  },
});
