import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebaseConfig';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

import LoginScreen from './components/loginScreen';
import MainScreen from './components/mainScreen';
import SignupScreen from './components/signupScreen';
import ProductScreen from './components/productScreen';
import ProfileScreen from './components/profile';


const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // User is signed in
          <>
            <Stack.Screen 
              name="Main" 
              component={MainScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen 
              name="Product" 
              component={ProductScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          // User is NOT signed in
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen 
              name="Main" 
              component={MainScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen 
              name="Product" 
              component={ProductScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ animation: 'fade' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
});
