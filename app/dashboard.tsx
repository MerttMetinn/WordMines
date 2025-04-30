import { View, Text, StyleSheet, TouchableOpacity, BackHandler, ScrollView, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from './context/auth';
import { signOut } from './utils/auth';
import { useEffect, useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { createGame, getUserGameStats, GameDurationType } from './utils/gameUtils';

interface User {
  displayName: string | null;
  email: string | null;
  uid: string;
}

interface GameStats {
  totalGames: number;
  wonGames: number;
  successRate: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userName, setUserName] = useState('Kullanıcı');
  const [showGameOptions, setShowGameOptions] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  
  // Oyun istatistikleri
  const [gameStats, setGameStats] = useState<GameStats>({
    totalGames: 0,
    wonGames: 0,
    successRate: 0
  });

  // Kullanıcı bilgilerini yönetmek için state'i güncelleyen bir etki
  useEffect(() => {
    if (user) {
      // displayName değeri hemen güncellenemiyor olabilir, 
      // bu yüzden değeri kaydettiğimizde bir kez daha kontrol ediyoruz
      const userDisplayName = (user as unknown as User)?.displayName || 'Kullanıcı';
      setUserName(userDisplayName);
      
      // Kullanıcının oyun istatistiklerini getir
      fetchUserGameStats();
      
      // displayName güncellendiğinde bildirim göster
      if (userDisplayName !== 'Kullanıcı') {
        Toast.show({
          type: 'success',
          text1: 'Profil Güncellendi',
          text2: `Hoş geldiniz, ${userDisplayName}!`,
          position: 'bottom',
          visibilityTime: 2000,
        });
      }
    }
  }, [(user as unknown as User)?.displayName]); // displayName değiştiğinde çalışır

  // Kullanıcı giriş yapmamışsa ana sayfaya yönlendir
  useEffect(() => {
    if (!user && !loading) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Geri tuşuna basıldığında çıkışı engelle
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Toast.show({
          type: 'info',
          text1: 'Çıkış yapmak için',
          text2: 'Lütfen çıkış butonunu kullanın',
          position: 'bottom',
        });
        return true; // Geri gitmeyi engelle
      };

      // Geri tuşu işleyicisini ekle
      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Cleanup fonksiyonu
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  // Kullanıcının oyun istatistiklerini getir
  const fetchUserGameStats = async () => {
    try {
      if (!user) return;
      
      // Tip dönüşümünden önce uid kontrol edilmeli
      const uid = (user as unknown as User)?.uid;
      
      // uid undefined ise işlemi durdur
      if (!uid) {
        console.warn('Kullanıcı ID bulunamadı, istatistikler getirilemedi');
        return;
      }
      
      const stats = await getUserGameStats(uid);
      setGameStats(stats);
      
    } catch (error) {
      console.error('İstatistik getirme hatası:', error);
      
      // Bir hata olursa varsayılan değerler göster
      setGameStats({
        totalGames: 0,
        wonGames: 0,
        successRate: 0
      });
    }
  };

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      setIsSigningOut(false);
    }
  };

  const handleNewGame = () => {
    setShowGameOptions(true);
  };

  const handleActiveGames = () => {
    // Aktif oyunlar sayfasına yönlendir
    router.replace('/game/active-games');
  };

  const handleFinishedGames = () => {
    // Biten oyunlar sayfasına yönlendir
    router.replace('/game/finished-games');
    
  };

  const createNewGame = async (durationType: GameDurationType) => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Kullanıcı bilgisi bulunamadı.',
        text2: 'Lütfen tekrar giriş yapın.',
        position: 'bottom',
      });
      return;
    }
    
    try {
      setIsCreatingGame(true);
      
      // Kullanıcı id ve ismini al
      const userId = (user as any).uid;
      const userName = (user as any).displayName || 'Anonim';
      
      // Yeni oyun oluştur
      const newGame = await createGame(userId, durationType, userName);
      
      Toast.show({
        type: 'success',
        text1: 'Oyun Oluşturuldu',
        text2: 'Rakip aranıyor...',
        position: 'bottom',
      });
      
      // Waiting ekranına yönlendir
      router.push({
        pathname: '/game/waiting',
        params: { 
          gameId: newGame.id,
          durationType: durationType 
        }
      });
    } catch (error) {
      console.error('Oyun oluşturma hatası:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Oyun Oluşturma Hatası',
        text2: 'Bir sorun oluştu, lütfen tekrar deneyin.',
        position: 'bottom',
      });
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Yükleniyor durumu
  if (loading || !user) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Üst kısım - Kullanıcı bilgisi ve başarı yüzdesi */}
        <View style={styles.header}>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoName}>{userName}</Text>
            <Text style={styles.userInfoStats}>
              Başarı Oranı: %{gameStats.successRate}
            </Text>
            <Text style={styles.userInfoStats}>
              Toplam: {gameStats.totalGames} oyun | Kazanılan: {gameStats.wonGames} oyun
            </Text>
          </View>
        </View>
        
        {/* Oyun seçenekleri */}
        <View style={styles.menuContainer}>
          <Text style={styles.title}>WordMines</Text>
          
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={handleNewGame}
            disabled={isCreatingGame}
          >
            <Text style={styles.menuButtonText}>Yeni Oyun</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={handleActiveGames}
            disabled={isCreatingGame}
          >
            <Text style={styles.menuButtonText}>Aktif Oyunlar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={handleFinishedGames}
            disabled={isCreatingGame}
          >
            <Text style={styles.menuButtonText}>Biten Oyunlar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Çıkış butonu */}
        <TouchableOpacity 
          style={[styles.logoutButton, (isSigningOut || isCreatingGame) && styles.disabledButton]} 
          onPress={handleLogout}
          disabled={isSigningOut || isCreatingGame}
        >
          <Text style={styles.logoutButtonText}>
            {isSigningOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
          </Text>
        </TouchableOpacity>
        
        {/* Oyun süresi seçme modalı */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showGameOptions}
          onRequestClose={() => setShowGameOptions(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Oyun Süresi Seçin</Text>
              
              <Text style={styles.categoryTitle}>Hızlı Oyun:</Text>
              <TouchableOpacity 
                style={styles.gameOptionButton} 
                onPress={() => createNewGame(GameDurationType.MINUTES_2)}
                disabled={isCreatingGame}
              >
                <Text style={styles.gameOptionText}>2 dakika</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.gameOptionButton} 
                onPress={() => createNewGame(GameDurationType.MINUTES_5)}
                disabled={isCreatingGame}
              >
                <Text style={styles.gameOptionText}>5 dakika</Text>
              </TouchableOpacity>
              
              <Text style={styles.categoryTitle}>Genişletilmiş Oyun:</Text>
              <TouchableOpacity 
                style={styles.gameOptionButton} 
                onPress={() => createNewGame(GameDurationType.HOURS_12)}
                disabled={isCreatingGame}
              >
                <Text style={styles.gameOptionText}>12 saat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.gameOptionButton} 
                onPress={() => createNewGame(GameDurationType.HOURS_24)}
                disabled={isCreatingGame}
              >
                <Text style={styles.gameOptionText}>24 saat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowGameOptions(false)}
                disabled={isCreatingGame}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    minHeight: 650,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  userInfoContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 8,
  },
  userInfoStats: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#343a40',
    textAlign: 'center',
  },
  menuContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  menuButton: {
    backgroundColor: '#007bff',
    width: '80%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#343a40',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    color: '#495057',
  },
  gameOptionButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  gameOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 