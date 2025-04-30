import { useEffect } from 'react';
import { StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, rand } from '../utils/animation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  letter: string;
  delay: number;
  startX: number;
  size: number;
  color: string;
  speedFactor?: number;
}

export const FallingLetter = ({ 
  letter, 
  delay, 
  startX, 
  size, 
  color,
  speedFactor = 1 
}: Props) => {
  // konum değerleri
  const y = useSharedValue(-size - rand(0, 100));
  const r = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  
  // hesaplanan X değeri - hafif sallantı için
  const xOffset = useSharedValue(0);

  // mount
  useEffect(() => {
    // Yavaşça görünür ol
    opacity.value = withDelay(
      delay, 
      withTiming(1, { 
        duration: 800, 
        easing: Easing.bezierFn(0.16, 1, 0.3, 1) 
      })
    );
      
    // Hafif bir giriş animasyonu
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 300 })
      )
    );
    
    /** düşüş animasyonu - daha yumuşak */
    y.value = withDelay(
      delay,
      withRepeat(
        withTiming(
          SCREEN_HEIGHT + size,
          {
            // Speed factor ile düşüş hızını ayarla (büyük harfler daha yavaş)
            duration: rand(15000, 20000) * speedFactor,
            easing: Easing.bezierFn(0.22, 0.61, 0.36, 1), // daha doğal düşüş
          },
        ),
        -1,
        false, // repeatReverse = false
        () => { y.value = -size; }, // tepeye sıçra
      ),
    );
    
    // Daha doğal, rastgele X salınımı
    xOffset.value = withRepeat(
      withSequence(
        withTiming(rand(-20, 20), { 
          duration: rand(3000, 6000),
          easing: Easing.bezierFn(0.25, 0.1, 0.25, 1)
        }),
        withTiming(rand(-20, 20), { 
          duration: rand(3000, 6000),
          easing: Easing.bezierFn(0.25, 0.1, 0.25, 1)
        }),
      ),
      -1,
      true // reverses
    );

    /** hafif dönme-salınım - daha doğal */
    r.value = withRepeat(
      withSpring(rand(-20, 20), { 
        mass: 0.8, 
        damping: 15,
        stiffness: 90,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }),
      -1,
      true // reverse
    );
  }, []);

  /** stiller */
  const style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: y.value },
        { translateX: startX + xOffset.value },
        { rotate: `${r.value}deg` },
        { scale: scale.value }
      ],
      opacity: interpolate(
        y.value, 
        [-size, 0, SCREEN_HEIGHT * 0.8, SCREEN_HEIGHT + size],
        [0, 0.4, 0.4, 0]
      ), // fade in/out harfi ekranın üst ve altına yaklaştıkça
      shadowOpacity: interpolate(
        y.value,
        [0, SCREEN_HEIGHT * 0.4, SCREEN_HEIGHT],
        [0.02, 0.08, 0.02]
      ), // düşerken değişen gölge
    };
  });

  return (
    <Animated.View style={[styles.box, { width: size, height: size, backgroundColor: color }, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.6 }]}>{letter}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { height: 2, width: 0 },
    elevation: 3,
  },
  letter: {
    fontWeight: '700',
    color: '#6e4f1f',
  },
}); 