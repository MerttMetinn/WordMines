import { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FallingLetter } from './FallingLetter';
import { COLORS, rand } from '../utils/animation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LETTERS = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

// Harflerin sayısı - performans için dikkatli ayarlayın
const LETTER_COUNT = 25;

// Daha düzenli bir dağılım için ekranı bölgelere ayırma
const getGridPosition = (index: number, total: number) => {
  // Ekranı total kadar eşit bölmeye bölüyoruz
  const segmentWidth = SCREEN_WIDTH / Math.ceil(Math.sqrt(total));
  const segmentHeight = SCREEN_HEIGHT;
  
  // Harfleri grid üzerinde dağıtıyoruz
  const col = index % Math.ceil(Math.sqrt(total));
  
  // Her segment içinde rastgele bir x pozisyonu
  return rand(col * segmentWidth, (col + 1) * segmentWidth - 40);
};

export const AnimatedBackground = () => {
  /** eleman listesi – yalnızca ilk render'da üret */
  const items = useMemo(
    () =>
      Array.from({ length: LETTER_COUNT }).map((_, i) => {
        // Farklı boyutlardaki harflere farklı özellikler
        const size = rand(32, 56);
        // Daha büyük harfler daha yavaş düşsün
        const speedFactor = interpolateSize(size, 32, 56, 1.2, 0.8);
        
        return {
          id: i,
          letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
          // Tüm harfler aynı anda görünmesin
          delay: rand(0, 6000),
          // Harfleri daha dengeli dağıt
          startX: getGridPosition(i, LETTER_COUNT),
          size,
          // Küçük harfler daha açık renkli olsun
          color: COLORS[Math.floor(rand(0, size > 45 ? COLORS.length : COLORS.length / 2))],
          // Her harf farklı hızda düşsün
          speedFactor,
        }
      }),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* pastel degrade arka-plan */}
      <LinearGradient
        colors={['#faf3e0', '#f8f2e6', '#fffdf8']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {items.map((it) => (
        <FallingLetter
          key={it.id}
          letter={it.letter}
          delay={it.delay}
          startX={it.startX}
          size={it.size}
          color={it.color}
          speedFactor={it.speedFactor}
        />
      ))}
    </View>
  );
};

// Boyut değerine göre başka bir değer döndürür (eşleme)
function interpolateSize(size: number, min: number, max: number, outMin: number, outMax: number): number {
  return outMin + ((size - min) / (max - min)) * (outMax - outMin);
} 