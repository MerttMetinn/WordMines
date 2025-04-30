import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { LogoTile } from './LogoTile';
import { OrbitingLetterTile } from './OrbitingLetterTile';

const { width, height } = Dimensions.get('window');

interface IntroSequenceProps {
  onFinish: () => void;
}

export const IntroSequence = ({ onFinish }: IntroSequenceProps) => {
  /** merkezi logo için ölçek ve opaklık */
  const logoScale = useSharedValue(0);
  const logoY = useSharedValue(0);
  const lettersOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  /** mount */
  useEffect(() => {
    // Arka plan fade-in
    logoOpacity.value = withTiming(1, { duration: 200 });

    // LOGO POP-IN
    logoScale.value = withDelay(
      200,
      withSpring(1.2, { mass: 0.6, damping: 9, stiffness: 95 }, () => {
        logoScale.value = withSpring(1, { mass: 0.6, damping: 8 });
      })
    );

    // 7 HARF TAŞI
    lettersOpacity.value = withDelay(600,
      withTiming(1, { duration: 300 })
    );

    // BUTONLARIN AÇILMASI
    logoY.value = withDelay(1500,
      withTiming(-height * 0.15, { duration: 400 }, () =>
        runOnJS(onFinish)()   // animasyon biter bitmez statik katman aç
      )
    );
  }, []);

  /** stiller */
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoY.value }, 
      { scale: logoScale.value }
    ],
    opacity: logoOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents="none">
      {/* merkezi logo */}
      <Animated.View style={[styles.logo, logoStyle]}>
        <LogoTile letter="W" size={84} />
      </Animated.View>

      {/* orbiting 7 letter tiles */}
      {Array.from({ length: 7 }).map((_, i) => (
        <OrbitingLetterTile
          key={i}
          index={i}
          opacity={lettersOpacity}
          center={{ x: width / 2, y: height / 2 }}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  logo: { 
    position: 'absolute', 
    top: '45%', 
    left: '50%', 
    marginLeft: -42,
    marginTop: -42, 
  },
}); 