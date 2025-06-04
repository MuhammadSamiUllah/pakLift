import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Config from 'react-native-config';
const apiUrl = Config.API_URL;

export default function DriverLoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter both email and password');
    return;
  }

  setLoading(true);

  try {
    // First check internet connectivity
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      
      Alert.alert('Error', 'No internet connection');
      setLoading(false);
      return;
    }

    const response = await fetch('http://172.17.241.75:3000/api/drivers/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    //  timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(response);
    if (data.success || data.status === 'ok') {
      navigation.navigate('DriverHomeScreen', { driverEmail: email.trim().toLowerCase() });
    } else {
      Alert.alert('Error', data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Failed to connect to server';
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Network error - please check your connection';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout - server is not responding';
    }
    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
  }
};

// Add this helper function
const checkInternetConnection = async () => {
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={30} color="#1a8a4f" />
      </TouchableOpacity>

      <Text style={styles.title}>Driver Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
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

      <TouchableOpacity
        style={[styles.loginButton, (!email || !password) && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading || !email || !password}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => navigation.navigate('driverSignUpScreen')}
      >
        <Text style={styles.registerButtonText}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a8a4f',
    marginBottom: 30,
    textAlign: 'center',
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
  loginButton: {
    backgroundColor: '#1a8a4f',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#7dc49f',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#1a8a4f',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});