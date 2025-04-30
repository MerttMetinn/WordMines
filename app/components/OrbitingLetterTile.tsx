import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  Easing 
} from 'react-native-reanimated';
import { LETTERS, randInt } from '../utils/animation';

// Yarıçaplar - her harf farklı mesafede
const radii = [90, 110, 130, 150, 170, 190, 210];

interface OrbitingLetterTileProps {
  index: number;
  opacity: Animated.SharedValue<number>;
  center: { x: number; y: number };
}

export const OrbitingLetterTile = ({
  index,
  opacity,
  center,
}: OrbitingLetterTileProps) => {
  const angle = useSharedValue(0);
  const r = radii[index];
  const fadeOut = useSharedValue(0);
  const bounce = useSharedValue(0);
  
  // Rastgele harf seç
  const letter = LETTERS[randInt(0, LETTERS.length - 1)];

  useEffect(() => {
    // Spiral içeri → sonra dışarı fade
    angle.value = withDelay(
      600 + index * 80, // kademeli giriş
      withTiming(2 * Math.PI, 
        { 
          duration: 600, 
          easing: Easing.out(Easing.exp) 
        }, 
        () => {
          // Hafif zıplama efekti
          bounce.value = withTiming(1, { duration: 100 }, () => {
            bounce.value = withTiming(0, { duration: 150 });
            // Ardından dağılıp kaybolma
            fadeOut.value = withDelay(
              400,
              withTiming(1, { duration: 300 })
            );
          });
        }
      )
    );
  }, []);

  const style = useAnimatedStyle(() => {
    // Spiral hareket
    const x = center.x + r * Math.cos(angle.value) - 28;
    const y = center.y + r * Math.sin(angle.value) - 28;
    
    // Zıplama efekti
    const bounceY = bounce.value * -5;
    
    return {
      position: 'absolute',
      top: y + bounceY,
      left: x,
      opacity: opacity.value * (1 - fadeOut.value),
      transform: [
        // Dağılma hareketi - hem X hem Y ekseni
        { translateX: fadeOut.value * (Math.random() > 0.5 ? 100 : -100) },
        { translateY: fadeOut.value * (Math.random() > 0.5 ? 100 : -100) },
        { scale: 1 - fadeOut.value * 0.3 },
        { rotate: `${fadeOut.value * (Math.random() > 0.5 ? 45 : -45)}deg` }
      ],
    };
  });

  return (
    <Animated.View style={[styles.tile, style]}>
      <Text style={styles.letter}>{letter}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#f9f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0d8c0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 5,
  },
  letter: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5d4524',
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
    textShadowColor: 'rgba(255,255,255,0.5)',
  },
}); 