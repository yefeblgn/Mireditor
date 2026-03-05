import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SplashScreen } from './src/screens/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { DraftScreen } from './src/screens/DraftScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { CustomTitleBar } from './src/components/CustomTitleBar';
import { View } from 'react-native';
import "./global.css";

const Stack = createStackNavigator();

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      <CustomTitleBar title="Mireditor" />
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            animationEnabled: true,
            gestureEnabled: false,
            cardStyle: { backgroundColor: 'transparent' }
          }}
          initialRouteName="Splash"
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Editor" component={EditorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
