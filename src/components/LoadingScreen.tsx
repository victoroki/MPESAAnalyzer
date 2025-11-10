import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useEffect, useRef } from 'react';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Processing your transactions...' 
}) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const bounceValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation animation
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateValue, bounceValue]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounce = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.spinner,
            {
              transform: [{ rotate }],
            },
          ]}>
          <Text style={styles.spinnerText}>📱</Text>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.bounceContainer,
            {
              transform: [{ translateY: bounce }],
            },
          ]}>
          <Text style={styles.loadingText}>MPESA</Text>
        </Animated.View>
        
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: '75%' }]} />
        </View>
        
        <Text style={styles.percentage}>75%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  spinner: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  spinnerText: {
    fontSize: 50,
  },
  bounceContainer: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  progressBar: {
    width: width * 0.7,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0EA5E9',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default LoadingScreen;