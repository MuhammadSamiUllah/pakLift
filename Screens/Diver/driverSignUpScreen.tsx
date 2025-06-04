import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Config from 'react-native-config';
const apiUrl = Config.API_URL;
export default function DriverSignUpScreen() {
  const navigation = useNavigation();
  const [driverName, setDriverName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handlePhoneChange = (text: string) => {
    const formattedText = text.replace(/[^0-9]/g, '').substring(0, 11);
    setPhone(formattedText);
  };

  const handleCnicChange = (text: string) => {
    const formattedText = text.replace(/[^0-9]/g, '').substring(0, 13);
    setCnic(formattedText);
  };

  const isFormValid = () => {
    return (
      driverName &&
      email &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      phone.length === 11 &&
      cnic.length === 13 &&
      password.length >= 6 &&
      password === confirmPassword
    );
  };

  const handleSignUp = async () => {
    if (!isFormValid()) {
      Alert.alert('Error', 'Please fill all fields correctly');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://172.17.241.75:3000/api/drivers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName,
          email,
          phone,
          cnic,
          password,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        Alert.alert('Success', 'Registered successfully. Enter the OTP sent to your email.');
        setOtpVisible(true);
      } else {
        Alert.alert('Error', data.message || 'Something went wrong');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server' + error.message);
    } finally {
      setLoading(false);
    }
  };

 const handleOtpSubmit = async () => {
  if (otpCode.length !== 6) {
    Alert.alert('Error', 'Please enter a valid 6-digit code');
    return;
  }

  setLoading(true);
 
  try {
    const response = await fetch(`http://172.17.241.75:3000/api/drivers/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email, // Using the email from form state
        code: otpCode,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      Alert.alert('Success', 'Account verified successfully!');
      navigation.navigate('DriverHomeScreen');
    } else {
      Alert.alert('Error', data.message || 'OTP verification failed');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to verify OTP: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={30} color="#1a8a4f" />
        </TouchableOpacity>

        <Text style={styles.title}>Register</Text>

        <TextInput
          style={styles.input}
          placeholder="Driver Name"
          value={driverName}
          onChangeText={setDriverName}
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (11 digits)"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={11}
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          placeholder="CNIC (13 digits)"
          value={cnic}
          onChangeText={handleCnicChange}
          keyboardType="number-pad"
          maxLength={13}
          placeholderTextColor="#888"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Icon
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={24}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Icon
              name={showConfirmPassword ? 'visibility-off' : 'visibility'}
              size={24}
              color="#888"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.signUpButton, !isFormValid() && styles.disabledButton]}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {/* OTP Overlay */}
      {otpVisible && (
        <View style={styles.otpOverlay}>
          <View style={styles.otpBox}>
            <Text style={styles.otpTitle}>Enter 6-digit OTP</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="******"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
            />
            <TouchableOpacity style={styles.otpButton} onPress={handleOtpSubmit}>
              <Text style={styles.otpButtonText}>Submit OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a8a4f',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  signUpButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1a8a4f',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#1a8a4f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  disabledButton: {
    backgroundColor: '#7dc49f',
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  otpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBox: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a8a4f',
  },
  otpInput: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 20,
    color: '#000',
  },
  otpButton: {
    backgroundColor: '#1a8a4f',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  otpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
