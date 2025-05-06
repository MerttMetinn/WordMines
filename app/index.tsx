import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/auth';
import { useEffect, useState, Fragment } from 'react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { IntroSequence } from './components/IntroSequence';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { loadTurkishWordList } from './utils/wordValidator';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [wordListLoaded, setWordListLoaded] = useState(false);

  // Türkçe kelime listesini yükle
  useEffect(() => {
    async function loadWordList() {
      try {
        const success = await loadTurkishWordList();
        setWordListLoaded(success);
        console.log(`📝 Kelime listesi yükleme ${success ? 'başarılı' : 'başarısız'}`);
      } catch (error) {
        console.error('❌ Kelime listesi yükleme hatası:', error);
        setWordListLoaded(false);
      }
    }
    
    loadWordList();
  }, []);

  // Kullanıcı giriş yapmış mı kontrol et - useEffect içinde yapalım
  useEffect(() => {
    if (user && !loading) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // İntro animasyonu bittiğinde içeriği göster
  const handleIntroFinish = () => {
    setShowContent(true);
    // Animasyon tamamen bittiğinde introdaki elemanları kaldır (performans için)
    setTimeout(() => {
      setIntroCompleted(true);
    }, 500);
  };

  // Yükleme durumunda basit bir gösterge
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      {/* Intro Animasyon Sekansı - sadece ilk render'da gösterilir */}
      {!introCompleted && (
        <IntroSequence onFinish={handleIntroFinish} />
      )}
      
      {/* Ana içerik - butonlar ve başlık */}
      <View style={styles.contentContainer}>
        {showContent ? (
          <Fragment>
            <Animated.Text 
              entering={FadeIn.delay(100).duration(400)}
              style={styles.title}
            >
              WordMines
            </Animated.Text>

            <Animated.Text 
              entering={FadeIn.delay(200).duration(400)}
              style={styles.subtitle}
            >
              Hoş Geldiniz
            </Animated.Text>
            
            {!wordListLoaded && (
              <Animated.Text 
                entering={FadeIn.delay(250).duration(400)}
                style={styles.loadingText}
              >
                Kelime listesi yükleniyor...
              </Animated.Text>
            )}
            
            <AnimatedTouchableOpacity 
              entering={SlideInUp.delay(300).duration(500).springify()}
              style={styles.button} 
              onPress={() => router.push('/login')}
            >
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </AnimatedTouchableOpacity>
            
            <AnimatedTouchableOpacity 
              entering={SlideInUp.delay(400).duration(500).springify()}
              style={[styles.button, styles.registerButton]} 
              onPress={() => router.push('/register')}
            >
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            </AnimatedTouchableOpacity>
          </Fragment>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#343a40',
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 40,
    color: '#495057',
  },
  loadingText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#6c757d',
    fontStyle: 'italic'
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
