import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  deleteDoc,
  arrayUnion,
  increment,
  documentId,
  or,
  and
} from 'firebase/firestore';
import { db } from '../firebase';
import { MineType } from './gameConstants';

// Oyun türleri
export enum GameDurationType {
  MINUTES_2 = 'minutes_2',
  MINUTES_5 = 'minutes_5',
  HOURS_12 = 'hours_12',
  HOURS_24 = 'hours_24'
}

// Oyun durumu
export enum GameStatus {
  WAITING = 'waiting',    // Eşleşme bekleniyor
  ACTIVE = 'active',      // Oyun aktif
  COMPLETED = 'completed', // Tamamlandı
  ABANDONED = 'abandoned',  // İptal edildi
  TIMEOUT = 'timeout'      // Süre doldu
}

// Oyun veri yapısı
export interface Game {
  id?: string;
  creator: string;
  creatorName?: string;
  opponent?: string;
  opponentName?: string;
  status: GameStatus;
  createdAt: any; // Timestamp
  startTime?: any; // Timestamp
  endTime?: any; // Timestamp
  durationType: GameDurationType;
  winnerId?: string;
  scores?: Record<string, number>;
  // Oyun tahtası ve harf yönetimi için
  board?: Record<string, string>;
  letterPool?: string[];
  playerRacks?: Record<string, string[]>;
  currentTurn?: string;
  turnDuration: number;       // Her hamle için saniye cinsinden süre
  lastMoveAt?: Timestamp;     // Son hamle zamanı, serverTimestamp olarak
  winner?: string;
  loser?: string;
  winReason?: string;
  updatedAt?: any; // Timestamp
  lastPassedBy?: string | null; // Son pas geçen kullanıcı
  consecutivePassCount?: number; // Arka arkaya pas geçme sayacı
  mines?: Record<string, { 
    type: MineType; 
    isActive: boolean; 
    isRevealed: boolean; 
  }>;
}

/**
 * Yeni bir oyun oluşturur ve eşleşme bekler
 */
export const createGame = async (
  userId: string, 
  durationType: GameDurationType,
  userName?: string
): Promise<Game> => {
  try {
    // Yeni oyun verisi
    const newGame: Game = {
      createdAt: Timestamp.now(),
      creator: userId,
      durationType,
      status: GameStatus.WAITING,
      creatorName: userName || 'Anonim',
      scores: { [userId]: 0 },
      board: {},
      letterPool: [],
      playerRacks: { [userId]: [] },
      currentTurn: userId,
      turnDuration: getDurationInSeconds(durationType)
    };
    
    // Önce aynı süre seçeneğiyle bekleyen eşleşme var mı kontrol et
    const waitingGamesQuery = query(
      collection(db, 'games'),
      where('status', '==', GameStatus.WAITING),
      where('durationType', '==', durationType),
      where('creator', '!=', userId), // Kendimizle eşleşmeyelim
      orderBy('createdAt'),
      limit(1)
    );
    
    const waitingGamesSnapshot = await getDocs(waitingGamesQuery);
    
    // Bekleyen bir eşleşme varsa
    if (!waitingGamesSnapshot.empty) {
      // İlk bekleyen oyunu al
      const waitingGame = waitingGamesSnapshot.docs[0];
      const waitingGameData = waitingGame.data() as Game;
      
      // Eşleşme yap ve oyunu güncelle - kullanıcı adını da ekleyelim
      await updateDoc(doc(db, 'games', waitingGame.id), {
        opponent: userId,
        opponentName: userName || 'Anonim',
        status: GameStatus.ACTIVE
      });
      
      // Güncellenmiş veriyi döndür
      return {
        ...waitingGameData,
        id: waitingGame.id,
        opponent: userId,
        opponentName: userName || 'Anonim',
        status: GameStatus.ACTIVE
      };
    }
    
    // Bekleyen eşleşme yoksa yeni oyun oluştur
    const docRef = await addDoc(collection(db, 'games'), newGame);
    
    // Oluşturulan oyunu döndür
    return {
      ...newGame,
      id: docRef.id
    };
  } catch (error) {
    console.error('Oyun oluşturma hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcının aktif oyunlarını getirir
 */
export const getActiveGames = async (userId: string): Promise<Game[]> => {
  try {
    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef, 
      and(
        or(
          where('creator', '==', userId),
          where('opponent', '==', userId)
        ),
        where('status', '==', GameStatus.ACTIVE)
      )
    );
    
    const querySnapshot = await getDocs(q);
    const games: Game[] = [];
    
    querySnapshot.forEach(doc => {
      const gameData = doc.data() as Game;
      games.push({
        ...gameData,
        id: doc.id
      });
    });
    
    // Sırala: Önce sırası bize gelen oyunlar, sonra en son hamle yapılan oyunlar
    return games.sort((a, b) => {
      // Önce kimin sırası olduğuna göre sırala
      if (a.currentTurn === userId && b.currentTurn !== userId) return -1;
      if (a.currentTurn !== userId && b.currentTurn === userId) return 1;
      
      // İkisi de aynı durumda ise, son hamle zamanına göre sırala (en yeni üstte)
      const aTime = a.lastMoveAt || a.startTime;
      const bTime = b.lastMoveAt || b.startTime;
      
      return bTime.toMillis() - aTime.toMillis();
    });
  } catch (error) {
    console.error('Aktif oyunları getirme hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcının tamamlanmış oyunlarını getirir
 */
export const getCompletedGames = async (userId: string): Promise<Game[]> => {
  try {
    // Kullanıcının oluşturduğu tamamlanmış oyunları getir
    const creatorGamesQuery = query(
      collection(db, 'games'),
      where('status', 'in', [GameStatus.COMPLETED, GameStatus.TIMEOUT]),
      where('creator', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    // Kullanıcının rakip olduğu tamamlanmış oyunları getir
    const opponentGamesQuery = query(
      collection(db, 'games'),
      where('status', 'in', [GameStatus.COMPLETED, GameStatus.TIMEOUT]),
      where('opponent', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    // Her iki sorguyu çalıştır
    const [creatorSnapshot, opponentSnapshot] = await Promise.all([
      getDocs(creatorGamesQuery),
      getDocs(opponentGamesQuery)
    ]);
    
    // Sonuçları birleştir
    const creatorGames = creatorSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Game));
    
    const opponentGames = opponentSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Game));
    
    // Tüm oyunları birleştir ve yeni bir dizi oluştur
    return [...creatorGames, ...opponentGames];
  } catch (error) {
    console.error('Tamamlanmış oyunları getirme hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcı istatistiklerini getirir (toplam oyun, kazanılan, başarı oranı)
 */
export const getUserGameStats = async (userId: string) => {
  try {
    // Kullanıcının oluşturduğu tamamlanmış oyunları getir
    const creatorGamesQuery = query(
      collection(db, 'games'),
      where('creator', '==', userId),
      where('status', 'in', [GameStatus.COMPLETED, GameStatus.TIMEOUT])
    );
    
    // Kullanıcının rakip olduğu tamamlanmış oyunları getir
    const opponentGamesQuery = query(
      collection(db, 'games'),
      where('opponent', '==', userId),
      where('status', 'in', [GameStatus.COMPLETED, GameStatus.TIMEOUT])
    );
    
    // Her iki sorguyu çalıştır
    const [creatorSnapshot, opponentSnapshot] = await Promise.all([
      getDocs(creatorGamesQuery),
      getDocs(opponentGamesQuery)
    ]);
    
    // İstatistikleri hesapla
    let totalGames = creatorSnapshot.size + opponentSnapshot.size;
    let wonGames = 0;
    
    // Oluşturucu olarak kazanılan oyunları say
    creatorSnapshot.forEach(doc => {
      const game = doc.data() as Game;
      if (game.winnerId === userId) {
        wonGames++;
      }
    });
    
    // Rakip olarak kazanılan oyunları say
    opponentSnapshot.forEach(doc => {
      const game = doc.data() as Game;
      if (game.winnerId === userId) {
        wonGames++;
      }
    });
    
    // Başarı oranını hesapla
    const successRate = totalGames > 0 ? Math.round((wonGames / totalGames) * 100) : 0;
    
    return {
      totalGames,
      wonGames,
      successRate
    };
  } catch (error) {
    console.error('Kullanıcı istatistiklerini getirme hatası:', error);
    throw error;
  }
};

/**
 * Oyunu iptal eder
 */
export const cancelGame = async (gameId: string, userId: string): Promise<boolean> => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error('Oyun bulunamadı');
    }
    
    const gameData = gameDoc.data() as Game;
    
    // Sadece oyunu oluşturan kullanıcı iptal edebilir
    if (gameData.creator !== userId) {
      throw new Error('Bu oyunu iptal etme yetkiniz yok');
    }
    
    // Oyun zaten aktifse iptal edilemez
    if (gameData.status === GameStatus.ACTIVE) {
      throw new Error('Aktif oyun iptal edilemez');
    }
    
    // Oyun bekliyor durumdaysa iptal et
    if (gameData.status === GameStatus.WAITING) {
      await updateDoc(gameRef, {
        status: GameStatus.ABANDONED,
        updatedAt: Timestamp.now()
      });
      
      return true;
    }
    
    // Oyun süresi dolduysa, sonucu hesapla
    if (gameData.endTime && gameData.endTime.toMillis() < Timestamp.fromDate(new Date()).toMillis()) {
      // Süre doldu - puanı yüksek olan kazanır
      if (gameData.opponent && gameData.currentTurn && gameData.scores) {
        const winner = gameData.scores[gameData.currentTurn] > gameData.scores[gameData.opponent] 
          ? gameData.currentTurn 
          : gameData.opponent;
        const loser = winner === gameData.currentTurn ? gameData.opponent : gameData.currentTurn;
        
        await updateDoc(gameRef, {
          status: GameStatus.ABANDONED,
          winner,
          loser,
          updatedAt: Timestamp.now()
        });
        
        return true;
      }
    }
    
    // Eğer sıra bu kullanıcıdaysa ve süre dolduysa, kullanıcı kaybeder
    if (gameData.turnDuration && gameData.lastMoveAt && gameData.currentTurn) {
      // Geçen süreyi hesapla (şu anki zaman - son hamle zamanı)
      const elapsedSeconds = (Timestamp.now().toMillis() - gameData.lastMoveAt.toMillis()) / 1000;
      
      // Eğer geçen süre hamle süresini aştıysa, sıradaki oyuncu kaybeder
      if (elapsedSeconds > gameData.turnDuration && gameData.opponent) {
        const winner = gameData.opponent;
        const loser = gameData.currentTurn;
        
        await updateDoc(gameRef, {
          status: GameStatus.ABANDONED,
          winner,
          loser,
          updatedAt: Timestamp.now()
        });
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Oyun iptal hatası:', error);
    throw error;
  }
};

// Oyun süresini saniye cinsinden hesaplar
export const getDurationInSeconds = (durationType: GameDurationType): number => {
  switch(durationType) {
    case GameDurationType.MINUTES_2:
      return 2 * 60; // 2 dakika
    case GameDurationType.MINUTES_5:
      return 5 * 60; // 5 dakika
    case GameDurationType.HOURS_12:
      return 12 * 60 * 60; // 12 saat
    case GameDurationType.HOURS_24:
      return 24 * 60 * 60; // 24 saat
    default:
      return 5 * 60; // Varsayılan 5 dakika
  }
}; 