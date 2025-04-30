import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth';
import { getCompletedGames, Game, GameStatus } from '../utils/gameUtils';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function FinishedGamesScreen() {
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
    
    fetchCompletedGames();
  }, [user]);

  const fetchCompletedGames = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      const userId = (user as any)?.uid;
      
      // userId undefined ise işlemi durdur
      if (!userId) {
        console.warn('Kullanıcı ID bulunamadı, tamamlanmış oyunlar getirilemedi');
        setError('Kullanıcı bilgileri alınamadı. Lütfen yeniden giriş yapın.');
        setLoading(false);
        return;
      }
      
      const completedGames = await getCompletedGames(userId);
      
      setGames(completedGames);
    } catch (error) {
      console.error('Biten oyunları getirme hatası:', error);
      setError('Biten oyunları getirirken bir hata oluştu.');
      
      Toast.show({
        type: 'error',
        text1: 'Veri Hatası',
        text2: 'Biten oyunlar yüklenemedi. Lütfen tekrar deneyin.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.replace('/dashboard');
  };

  // Oyunun durumunu görsel bir metin olarak göster
  const getGameResultText = (game: Game) => {
    const userId = (user as any)?.uid;
    
    // userId undefined ise varsayılan değer döndür
    if (!userId) return 'Bilinmiyor';
    
    if (game.winnerId) {
      const isWinner = game.winnerId === userId;
      return isWinner ? 'Kazandınız' : 'Kaybettiniz';
    } else {
      return 'Süre Doldu';
    }
  };

  // Oyunun durumunu görsel bir ikon olarak göster
  const getGameResultIcon = (game: Game) => {
    const userId = (user as any)?.uid;
    
    // userId undefined ise varsayılan ikon döndür
    if (!userId) return <Ionicons name="help-circle" size={24} color="#6C757D" />;
    
    if (game.winnerId) {
      const isWinner = game.winnerId === userId;
      return isWinner ? 
        <Ionicons name="trophy" size={24} color="#FFD700" /> : 
        <Ionicons name="close-circle" size={24} color="#DC3545" />;
    } else {
      return <Ionicons name="time" size={24} color="#6C757D" />;
    }
  };

  // Rakibin ismini göster
  const getOpponentName = (game: Game) => {
    const userId = (user as any)?.uid;
    
    // userId undefined ise varsayılan değer döndür
    if (!userId) return 'Bilinmiyor';
    
    if (game.creator === userId) {
      return game.opponentName || 'İsimsiz Rakip';
    } else {
      return game.creatorName || 'İsimsiz Rakip';
    }
  };

  // Kullanıcının ve rakibin puanlarını göster
  const getScores = (game: Game) => {
    if (!game.scores) return { userScore: 0, opponentScore: 0 };
    
    const userId = (user as any)?.uid;
    
    // userId undefined ise varsayılan değer döndür
    if (!userId) return { userScore: 0, opponentScore: 0 };
    
    const userScore = game.scores[userId] || 0;
    
    // Rakibin skorunu bulmak için tüm skorları döngüye alıp
    // kullanıcı ID'si olmayan skoru buluyoruz
    let opponentScore = 0;
    for (const playerId in game.scores) {
      if (playerId !== userId) {
        opponentScore = game.scores[playerId] || 0;
        break;
      }
    }
    
    return { userScore, opponentScore };
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
        <Text style={styles.title}>Biten Oyunlar</Text>
        <View style={styles.placeholder} />
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
            onPress={fetchCompletedGames}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noGamesText}>Tamamlanmış oyun bulunamadı</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {games.map(game => {
            const { userScore, opponentScore } = getScores(game);
            const opponentName = getOpponentName(game);
            
            return (
              <View key={game.id} style={styles.gameItem}>
                <View style={styles.gameInfo}>
                  <View style={styles.opponentInfo}>
                    <Text style={styles.opponentName}>Rakip: {opponentName}</Text>
                    <Text style={styles.gameDate}>
                      {game.endTime?.toDate().toLocaleDateString() || 'Bilinmeyen tarih'}
                    </Text>
                  </View>
                  
                  <View style={styles.resultContainer}>
                    {getGameResultIcon(game)}
                    <Text style={styles.resultText}>
                      {getGameResultText(game)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.scoreContainer}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Sizin Puanınız</Text>
                    <Text style={styles.scoreValue}>{userScore}</Text>
                  </View>
                  
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Rakibin Puanı</Text>
                    <Text style={styles.scoreValue}>{opponentScore}</Text>
                  </View>
                </View>
              </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  placeholder: {
    width: 40,
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
  noGamesText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  gameItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  opponentInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 3,
  },
  gameDate: {
    fontSize: 14,
    color: '#6C757D',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
    color: '#212529',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 3,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343A40',
  },
}); 