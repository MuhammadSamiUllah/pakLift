import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

  import IntroPage from './Screens/IntroPage';
import DriverLoginScreen from './Screens/Diver/driverLoginScreen';
import DriverSignUpScreen from './Screens/Diver/driverSignUpScreen';
import CustomerLoginScreen from './Screens/Customer/CustomerLoginScreen';
import CustomerSignUpScreen from './Screens/Customer/CustomerSignUpScreen';
import DriverHomeScreen from './Screens/Diver/DriverHomeScreen';
import CustomerHomeScreen from './Screens/Customer/CustomerHomeScreen';
import RouteSelectionScreen from './Screens/Diver/RouteSelectionScreen';
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
         <Stack.Screen name="IntroPage" component={IntroPage} options={{ headerShown: false }} />
        <Stack.Screen name="driverLoginScreen" component={DriverLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="driverSignUpScreen" component={DriverSignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CustomerLoginScreen" component={CustomerLoginScreen} options={{ headerShown: false }} /> 
        <Stack.Screen name="CustomerSignUpScreen" component={CustomerSignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CustomerHomeScreen" component={CustomerHomeScreen} options={{ headerShown: false }} />
             <Stack.Screen name="RouteSelectionScreen" component={RouteSelectionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DriverHomeScreen" component={DriverHomeScreen} options={{ headerShown: false }} />
       
    
     
      </Stack.Navigator>
    </NavigationContainer>
  );
}