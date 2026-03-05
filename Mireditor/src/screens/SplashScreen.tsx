import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

export default function SplashScreen() {
  const rotation = useSharedValue(0);
  const progress = useSharedValue(0);
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Spin logo
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // "ivmeli" easing
      }),
      -1,
      false
    );

    // Simulate Fake Progress for "checking updates"
    progress.value = withSequence(
      withTiming(40, { duration: 1000 }),
      withTiming(80, { duration: 1500 }),
      withTiming(100, { duration: 500 })
    );

    const timer = setTimeout(() => {
      // In real app, check if user is remembered
      navigation.replace('Auth'); 
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${rotation.value}deg` }],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
    };
  });

  return (
    <View className="flex-1 bg-[#1e1e2e] justify-center items-center">
      <Animated.Image 
        source={require('../../assets/icon-nobg.png')}
        style={[styles.logoPlaceholder, animatedLogoStyle]} 
        className="mb-8"
        resizeMode="contain"
      />
      <Text className="text-white text-lg font-medium mb-4">Güncellemeler kontrol ediliyor...</Text>
      
      {/* Progress Bar Container */}
      <View className="w-64 h-2 bg-[#313244] rounded-full overflow-hidden">
        <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoPlaceholder: {
    width: 100,
    height: 100,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#89b4fa',
    borderRadius: 9999,
  },
});
