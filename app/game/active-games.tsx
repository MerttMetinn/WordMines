import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth';
import { getActiveGames, Game, GameStatus, GameDurationType } from '../utils/gameUtils';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ActiveGamesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    
    fetchActiveGames();
  }, [user]);

  // Oyun belgesini kullanıcı adıyla güncelle
  const updateGameWithOpponentName = async (game: Game, opponentId: string, opponentName: string) => {
    try {
      if (!game.id) {
        console.warn('Oyun ID eksik, güncelleme yapılamıyor');
        return game;
      }
      
      // Oyun belgesi referansını al
      const gameRef = doc(db, 'games', game.id);
      
      // Kullanıcı oyunun yaratıcısı mı yoksa rakibi mi, ona göre güncelleme yap
      const isCreator = game.creator === (user as any).uid;
      
      // Güncelleme nesnesini hazırla
      const updateData = isCreator ? 
        { opponentName: opponentName } : 
        { creatorName: opponentName };
      
      // Veritabanında güncelle
      await updateDoc(gameRef, updateData);
      
      console.log(`Oyun ${game.id} güncellendi, ${isCreator ? 'rakip' : 'yaratıcı'} adı: ${opponentName}`);
      
      // Oyun nesnesini de güncelle
      if (isCreator) {
        game.opponentName = opponentName;
      } else {
        game.creatorName = opponentName;
      }
      
      return game;
    } catch (error) {
      console.error('Oyun güncelleme hatası:', error);
      return game; // Hata olsa bile orijinal oyunu döndür
    }
  };

  const fetchActiveGames = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      const userId = (user as any).uid;
      const activeGames = await getActiveGames(userId);
      
      // Aktif oyunları ayarlamadan önce, her birinin rakip adını kontrol edelim
      const gamesWithUpdatedOpponents = await Promise.all(
        activeGames.map(async (game) => {
          // Oyuncunun rakip mi yoksa oluşturucu mu olduğunu kontrol et
          const isCreator = game.creator === userId;
          const opponentId = isCreator ? game.opponent : game.creator;
          
          // Eğer rakip adı yoksa veya "İsimsiz Rakip" ise, Firebase'den kullanıcı bilgisini al
          let opponentName = isCreator ? game.opponentName : game.creatorName;
          
          // Opponent ID tanımlı değilse, oyunu olduğu gibi bırak
          if (!opponentId) return game;
          
          if (!opponentName || opponentName === 'Anonim' || opponentName === 'İsimsiz Rakip') {
            try {
              // Kullanıcı belgesini al
              const userDoc = await getDoc(doc(db, 'users', opponentId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const newOpponentName = userData.displayName || userData.username || 'İsimsiz Rakip';
                
                // Oyun belgesini Firebase'de güncelle
                return await updateGameWithOpponentName(game, opponentId, newOpponentName);
              }
            } catch (userError) {
              console.error('Kullanıcı bilgisi alınamadı:', userError);
            }
          }
          
          return game;
        })
      );
      
      setGames(gamesWithUpdatedOpponents);
    } catch (error) {
      console.error('Aktif oyunları getirme hatası:', error);
      setError('Aktif oyunları getirirken bir hata oluştu.');
      
      Toast.show({
        type: 'error',
        text1: 'Veri Hatası',
        text2: 'Aktif oyunlar yüklenemedi. Lütfen tekrar deneyin.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.replace('/dashboard');
  };

  const handleContinueGame = (gameId: string) => {
    router.push({
      pathname: '/game/play',
      params: { gameId }
    });
  };

  // Oyun tipi adını formatla
  const formatGameType = (type: GameDurationType) => {
    switch (type) {
      case GameDurationType.MINUTES_2:
        return '2 dakika';
      case GameDurationType.MINUTES_5:
        return '5 dakika';
      case GameDurationType.HOURS_12:
        return '12 saat';
      case GameDurationType.HOURS_24:
        return '24 saat';
      default:
        return 'Bilinmeyen';
    }
  };

  // Rakibin ismini göster
  const getOpponentName = (game: Game) => {
    const userId = (user as any).uid;
    
    if (game.creator === userId) {
      return game.opponentName || 'İsimsiz Rakip';
    } else {
      return game.creatorName || 'İsimsiz Rakip';
    }
  };

  // Oyun tarihi formatla
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Bilinmeyen tarih';
    
    try {
      const date = timestamp.toDate();
      // Günü 2 basamaklı olarak formatla
      const day = String(date.getDate()).padStart(2, '0');
      // Ayı 2 basamaklı olarak formatla (JavaScript'te aylar 0'dan başlar)
      const month = String(date.getMonth() + 1).padStart(2, '0');
      // Yılı 4 basamaklı al
      const year = date.getFullYear();
      // Saati 2 basamaklı formatla
      const hours = String(date.getHours()).padStart(2, '0');
      // Dakikayı 2 basamaklı formatla
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // GÜN/AY/YIL SAAT:DAKİKA formatında döndür
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return 'Geçersiz tarih';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackToDashboard}
        >
          <Ionicons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Aktif Oyunlar</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchActiveGames}
        >
          <Ionicons name="refresh" size={24} color="#28a745" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Oyunlar yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchActiveGames}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="game-controller-outline" size={60} color="#6c757d" style={styles.noGamesIcon} />
          <Text style={styles.noGamesText}>Aktif oyun bulunamadı</Text>
          <TouchableOpacity 
            style={styles.newGameButton} 
            onPress={() => router.replace('/dashboard')}
          >
            <Text style={styles.newGameButtonText}>Yeni Oyun Başlat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {games.map(game => {
            const opponentName = getOpponentName(game);
            const isYourTurn = game.currentTurn === (user as any).uid;
            
            return (
              <TouchableOpacity 
                key={game.id} 
                style={styles.gameItem}
                onPress={() => handleContinueGame(game.id || '')}
              >
                <View style={styles.gameHeader}>
                  <View style={styles.gameInfoLeft}>
                    <Text style={styles.gameType}>
                      {formatGameType(game.durationType)}
                    </Text>
                    <Text style={styles.gameDate}>
                      Başlangıç: {formatDate(game.startTime)}
                    </Text>
                  </View>
                  
                  <View style={[styles.turnIndicator, isYourTurn ? styles.yourTurn : styles.opponentTurn]}>
                    <Text style={styles.turnText}>
                      {isYourTurn ? 'Sizin Turunuz' : 'Rakibin Turu'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.gameBody}>
                  <Text style={styles.opponentName}>
                    Rakip: <Text style={styles.opponentNameValue}>{opponentName}</Text>
                  </Text>
                  
                  <View style={styles.lastMoveContainer}>
                    <Text style={styles.lastMoveText}>
                      Son hamle: {formatDate(game.lastMoveAt || game.startTime)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.gameFooter}>
                  <TouchableOpacity 
                    style={styles.continueButton} 
                    onPress={() => handleContinueGame(game.id || '')}
                  >
                    <Text style={styles.continueButtonText}>Oyuna Devam Et</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C757D',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  noGamesIcon: {
    marginBottom: 20,
  },
  noGamesText: {
    fontSize: 18,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
  newGameButton: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
  },
  newGameButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  gameItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
  },
  gameInfoLeft: {
    flex: 1,
  },
  gameType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 4,
  },
  gameDate: {
    fontSize: 12,
    color: '#6C757D',
  },
  turnIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  yourTurn: {
    backgroundColor: '#28A745',
  },
  opponentTurn: {
    backgroundColor: '#6C757D',
  },
  turnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gameBody: {
    padding: 15,
  },
  opponentName: {
    fontSize: 15,
    color: '#343A40',
    marginBottom: 10,
  },
  opponentNameValue: {
    fontWeight: 'bold',
  },
  lastMoveContainer: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  lastMoveText: {
    fontSize: 13,
    color: '#6C757D',
  },
  gameFooter: {
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  continueButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 5,
  },
}); 