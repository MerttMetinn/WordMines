import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/auth';
import { GameStatus, GameDurationType, cancelGame } from '../utils/gameUtils';
import Toast from 'react-native-toast-message';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import React from 'react';

// NodeJS.Timeout tipi için global tanım
declare global {
  interface NodeJS {
    Timeout: ReturnType<typeof setTimeout>;
  }
}

export default function WaitingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const gameId = params.gameId as string;
  const durationType = params.durationType as GameDurationType;
  
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  
  // Animasyon değeri
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // Zaman sayacı için
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Dönen animasyon stili
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ],
    };
  });
  
  useEffect(() => {
    // Animasyonları başlat
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000 }),
      -1, // sonsuz döngü
      false
    );
    
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1500 }),
      -1, // sonsuz döngü
      true // yönü tersine çevir
    );
    
    // Zaman sayacını başlat
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    
    return () => {
      // Temizlik işlemleri
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cancelAnimation(rotation);
      cancelAnimation(scale);
    };
  }, []);
  
  // Oyunun durumunu dinle
  useEffect(() => {
    if (!gameId) {
      setError('Oyun bilgisi bulunamadı');
      return;
    }
    
    console.log('🔍 Bekleme ekranında oyun verilerini dinliyoruz:', gameId);
    
    const unsubscribe = onSnapshot(
      doc(db, 'games', gameId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          
          console.log('🔍 Oyun durum değişikliği:', {
            gameId,
            status: data.status,
            creator: data.creator,
            opponent: data.opponent,
            buldukMu: found
          });
          
          // Eğer oyun aktif olmuşsa (eşleşme bulunmuşsa)
          if (data.status === GameStatus.ACTIVE) {
            // Eşleşme bulunduğu bilgisini göster
            setFound(true);
            
            // Temizlikleri yap
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            
            // Toast mesajı göster
            Toast.show({
              type: 'success',
              text1: 'Eşleşme Bulundu!',
              text2: 'Rakip oyuncu bulundu. Oyun başlatılıyor...',
              position: 'bottom',
              visibilityTime: 2000,
            });
            
            console.log('🔍 Eşleşme bulundu, oyuna yönlendirme yapılacak...');
            
            // Kısa bir beklemeden sonra oyun ekranına yönlendir
            setTimeout(() => {
              // Oyun sayfasına yönlendir
              console.log('🔍 Oyun sayfasına yönlendiriliyor:', gameId);
              router.replace({
                pathname: "/game/play",
                params: { gameId: gameId }
              });
            }, 2000);
          }
          // Eğer oyun iptal edilmişse
          else if (data.status === GameStatus.CANCELED) {
            setError('Oyun iptal edildi');
            // Temizlikleri yap
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          }
          
          setLoading(false);
        } else {
          setError('Oyun bulunamadı');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Oyun dinleme hatası:', error);
        setError('Oyun bilgisi alınamadı');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [gameId, router]);
  
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const handleCancel = async () => {
    if (!user || !gameId || isCanceling) return;
    
    try {
      setIsCanceling(true);
      
      // Oyunu iptal et
      await cancelGame(gameId, (user as any).uid);
      
      Toast.show({
        type: 'info',
        text1: 'Oyun İptal Edildi',
        text2: 'Ana sayfaya yönlendiriliyorsunuz.',
        position: 'bottom',
      });
      
      // Ana sayfaya dön
      router.replace("/dashboard");
    } catch (error) {
      console.error('İptal hatası:', error);
      
      Toast.show({
        type: 'error',
        text1: 'İptal Edilemedi',
        text2: 'Oyun iptal edilirken bir hata oluştu.',
        position: 'bottom',
      });
      
      setIsCanceling(false);
    }
  };
  
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.replace("/dashboard")}
        >
          <Text style={styles.buttonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rakip Aranıyor</Text>
      
      <Text style={styles.durationText}>
        Seçilen oyun süresi: {durationType}
      </Text>
      
      <View style={styles.animationContainer}>
        {!found ? (
          <Animated.View style={[styles.searchingIcon, animatedStyle]}>
            <Text style={styles.searchingIconText}>W</Text>
          </Animated.View>
        ) : (
          <View style={styles.foundContainer}>
            <ActivityIndicator size="large" color="#28a745" />
            <Text style={styles.foundText}>Eşleşme Bulundu!</Text>
            <Text style={styles.foundSubText}>Oyun başlatılıyor...</Text>
          </View>
        )}
      </View>
      
      {!found && (
        <>
          <Text style={styles.timeElapsedText}>
            Geçen süre: {formatTime(elapsed)}
          </Text>
          
          <Text style={styles.infoText}>
            Size uygun bir rakip bulunduğunda otomatik olarak eşleştirileceksiniz.
          </Text>
          
          <TouchableOpacity 
            style={[styles.cancelButton, isCanceling && styles.disabledButton]} 
            onPress={handleCancel}
            disabled={isCanceling}
          >
            <Text style={styles.cancelButtonText}>
              {isCanceling ? 'İptal Ediliyor...' : 'İptal Et'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#343a40',
  },
  durationText: {
    fontSize: 18,
    marginBottom: 30,
    color: '#495057',
    textAlign: 'center',
  },
  animationContainer: {
    height: 200,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  searchingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchingIconText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  timeElapsedText: {
    fontSize: 20,
    marginBottom: 20,
    color: '#6c757d',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#6c757d',
    maxWidth: '80%',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  foundContainer: {
    alignItems: 'center',
  },
  foundText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 20,
    marginBottom: 10,
  },
  foundSubText: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 