import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

const IntroPage = ({navigation}) => {
  const [selectedRole, setSelectedRole] = useState<'driver' | 'customer'>('driver');

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to Roadway</Text>

      <Image 
        source={require('../assets/images/authImage/authBgDark.png')} 
        style={styles.image} 
        resizeMode="contain"
      />

      {/* Driver Button */}
      <TouchableOpacity
        style={[
          styles.button,
          selectedRole === 'driver' ? styles.selected : styles.unselected
        ]}
        onPress={() => {
          setSelectedRole('driver');
          navigation.navigate('driverLoginScreen');
        }}
      >
        <Text
          style={[
            styles.buttonText,
            selectedRole === 'driver' ? styles.selectedText : styles.unselectedText
          ]}
        >
          Driver
        </Text>
      </TouchableOpacity>

      {/* Customer Button */}
      <TouchableOpacity
        style={[
          styles.button,
          selectedRole === 'customer' ? styles.selected : styles.unselected
        ]}
        onPress={() => {
          setSelectedRole('customer');
          navigation.navigate('CustomerLoginScreen');
        }}
      >
        <Text
          style={[
            styles.buttonText,
            selectedRole === 'customer' ? styles.selectedText : styles.unselectedText
          ]}
        >
          Customer
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8', // Light gray background
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#1a8a4f', // Dark green text
  },

  image: {
    width: width * 0.9,
    height: 200,
    marginBottom: 50,
  },

  button: {
    width: width * 0.8,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#1a8a4f', // Green shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  selected: {
    backgroundColor: '#1a8a4f', // Dark green background
  },

  unselected: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1a8a4f', // Green border
  },

  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },

  selectedText: {
    color: '#ffffff', // White text for selected
  },

  unselectedText: {
    color: '#1a8a4f', // Green text for unselected
  },
});

export default IntroPage;