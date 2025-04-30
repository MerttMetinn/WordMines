import { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/auth';
import { Game, GameStatus, getDurationInSeconds } from '../utils/gameUtils';
import Toast from 'react-native-toast-message';
import { Timestamp } from 'firebase/firestore';
import { loadTurkishWordList } from '../utils/wordValidator';

// Bileşenler
import Board from '../components/game/Board';
import Rack from '../components/game/Rack';
import GameControls from '../components/game/GameControls';

// Yardımcılar
import { createEmptyBoard, shuffleArray } from '../utils/gameHelpers';
import { TileData, LETTER_COUNTS } from '../utils/gameConstants';

export default function GamePlayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const gameId = params.gameId as string;
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<TileData[][]>(createEmptyBoard());
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [selectedRackTile, setSelectedRackTile] = useState<number | null>(null);
  const [currentLetter, setCurrentLetter] = useState('');
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [playerRemainingTime, setPlayerRemainingTime] = useState(0);
  const [opponentRemainingTime, setOpponentRemainingTime] = useState(0);
  const [error, setError] = useState('');
  
  // Kullanıcının elindeki harfler
  const [playerRack, setPlayerRack] = useState<string[]>([]);
  // Oyun havuzundaki kalan harfler
  const [letterPool, setLetterPool] = useState<string[]>([]);
  
  // Zamanlayıcı için referans
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Kelime listesini yükle
  useEffect(() => {
    // Kelime listesini yükle
    const loadWordList = async () => {
      try {
        const loaded = await loadTurkishWordList();
        if (loaded) {
          console.log('📝 Kelime listesi başarıyla yüklendi!');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Kelime Listesi Yüklenemedi',
            text2: 'Kelime doğrulama özelliği çalışmayabilir.',
            position: 'bottom',
          });
        }
      } catch (error) {
        console.error('❌ Kelime listesi yükleme hatası:', error);
      }
    };

    loadWordList();
  }, []);
  
  // Oyun havuzunu oluştur ve harfleri dağıt
  useEffect(() => {
    // ... Mevcut kod ...
  }, [game, loading, user]);
  
  // Zaman sayacı
  useEffect(() => {
    // ... Mevcut kod ...
  }, [isMyTurn, game]);
  
  // Yeni oyun başlatma - harf havuzu oluşturma
  const initializeGame = async () => {
    if (!user || !gameId) {
      console.error('🎮 HATA: Kullanıcı veya oyun ID yok!');
      return;
    }
    
    try {
      console.log('🎮 Oyun başlatılıyor - initializeGame çağrıldı');
      
      // Tüm harfleri havuza ekle
      const pool: string[] = [];
      Object.entries(LETTER_COUNTS).forEach(([letter, count]) => {
        for (let i = 0; i < count; i++) {
          pool.push(letter);
        }
      });
      
      console.log('🎮 Harf havuzu oluşturuldu:', pool.length);
      
      // Havuzu karıştır
      const shuffledPool = shuffleArray([...pool]);
      
      // İki oyuncu için 7'şer harf ayır
      const player1Rack = shuffledPool.splice(0, 7);
      const player2Rack = shuffledPool.splice(0, 7);
      
      console.log('🎮 Oyuncu harfleri oluşturuldu:', { 
        player1Harfleri: player1Rack,
        player2Harfleri: player2Rack
      });
      
      // Oyun nesnesini güncelle
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);
      
      if (gameDoc.exists()) {
        const gameData = gameDoc.data() as Game;
        const player1Id = gameData.creator;
        const player2Id = gameData.opponent || '';
        
        console.log('🎮 Oyuncular:', {
          player1Id,
          player2Id,
          bizimID: (user as any).uid
        });
        
        // Oyuncuların harflerini belirle
        const playerRacks: Record<string, string[]> = {};
        playerRacks[player1Id] = player1Rack;
        if (player2Id) {
          playerRacks[player2Id] = player2Rack;
        }
        
        // Kullanıcının rafını şimdi ayarla
        const userId = (user as any).uid;
        const userRack = userId === player1Id ? player1Rack : player2Rack;
        
        setPlayerRack(userRack);
        console.log('🎮 Kullanıcı harfleri ayarlandı:', {
          userId,
          harfler: userRack
        });
        
        // Sırayı rastgele belirle
        const startingPlayer = Math.random() < 0.5 ? player1Id : player2Id;
        
        console.log('🎮 Başlangıç oyuncusu:', {
          startingPlayer,
          bizMiyiz: startingPlayer === userId
        });
        
        // Başlangıç puanları
        const scores: Record<string, number> = {};
        scores[player1Id] = 0;
        if (player2Id) {
          scores[player2Id] = 0;
        }
        
        // Oyun süreleri
        const durationType = gameData.durationType;
        const gameTimeSeconds = getDurationInSeconds(durationType);
        
        // Her oyuncuya kendi süresi
        const playerTimes: Record<string, number> = {};
        playerTimes[player1Id] = gameTimeSeconds;
        if (player2Id) {
          playerTimes[player2Id] = gameTimeSeconds;
        }
        
        console.log('🎮 Oyun süreleri ayarlandı:', {
          durationType,
          gameTimeSeconds,
          playerTimes
        });
        
        // Süre bilgilerini yerel state'e ayarla
        setPlayerRemainingTime(gameTimeSeconds);
        setOpponentRemainingTime(gameTimeSeconds);
        
        // Aktif oyuncunun süresini göster
        if (startingPlayer === userId) {
          setRemainingTime(gameTimeSeconds);
        } else if (player2Id) {
          setRemainingTime(gameTimeSeconds);
        }
        
        // Veritabanında güncelle - playerTimes hariç
        await updateDoc(gameRef, {
          letterPool: shuffledPool,
          playerRacks,
          currentTurn: startingPlayer,
          startTime: Timestamp.now(),
          scores,
          board: {}  // Boş tahta
        });
        
        console.log('🎮 Oyun verileri veritabanına kaydedildi (süreler hariç)');
        
        // Güncel oyun verilerini al ve state'leri güncelle
        const updatedGameDoc = await getDoc(gameRef);
        if (updatedGameDoc.exists()) {
          const updatedData = updatedGameDoc.data() as Game;
          setLetterPool(updatedData.letterPool || []);
          
          console.log('🎮 Süre bilgileri sadece yerel olarak ayarlandı:', {
            playerTime: playerRemainingTime,
            opponentTime: opponentRemainingTime,
            remainingTime
          });
          
          setIsMyTurn(startingPlayer === userId);
          
          setGame({
            ...updatedData,
            id: updatedGameDoc.id
          });
          
          console.log('🎮 Oyun başlatma tamamlandı, state güncellemeleri yapıldı');
        }
      } else {
        console.error('🎮 HATA: Oyun belgesi bulunamadı!');
        setError('Oyun bulunamadı');
      }
    } catch (error) {
      console.error('🎮 Oyun başlatma hatası:', error);
      setError('Oyun başlatılamadı');
    }
  };
  
  // Harfi raftaki yerinden tahtaya yerleştir
  const placeLetterFromRack = (tile: TileData, rackIndex: number) => {
    if (!isMyTurn) return;
    
    const letter = playerRack[rackIndex];
    if (!letter) return;
    
    // Tahtayı güncelle
    const newBoard = [...board];
    newBoard[tile.row][tile.col] = {
      ...tile,
      letter,
      isPlaced: true
    };
    
    // Playerrack'ten harfi geçici olarak kaldır (boş string yap)
    const newPlayerRack = [...playerRack];
    newPlayerRack[rackIndex] = '';
    
    setBoard(newBoard);
    setPlayerRack(newPlayerRack);
    setSelectedTile(null);
    setSelectedRackTile(null);
  };
  
  // Yerleştirilmiş harfi geri al
  const takeBackLetter = (tile: TileData) => {
    if (!isMyTurn || !tile.isPlaced) return;
    
    // Harfi tahtadan kaldır
    const newBoard = [...board];
    newBoard[tile.row][tile.col] = {
      ...tile,
      letter: '',
      isPlaced: false
    };
    
    // Harfi rafa geri koy (ilk boş yere)
    const newPlayerRack = [...playerRack];
    const emptyIndex = newPlayerRack.findIndex(l => l === '');
    if (emptyIndex !== -1) {
      newPlayerRack[emptyIndex] = tile.letter;
    } else {
      newPlayerRack.push(tile.letter);
    }
    
    setBoard(newBoard);
    setPlayerRack(newPlayerRack);
  };
  
  // Oyun durumunu dinle
  useEffect(() => {
    if (!gameId) {
      setError('Oyun bilgisi bulunamadı');
      return;
    }
    
    console.log('🎮 Oyun verilerini dinliyoruz:', gameId);
    
    const unsubscribe = onSnapshot(
      doc(db, 'games', gameId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const gameData = docSnapshot.data() as Game;
          console.log('🎮 Oyun verileri alındı:', {
            status: gameData.status,
            playerRacksExists: !!gameData.playerRacks,
            playerRacksKeys: gameData.playerRacks ? Object.keys(gameData.playerRacks) : [],
            letterPoolLength: gameData.letterPool?.length,
            currentTurn: gameData.currentTurn,
            creatorId: gameData.creator,
            opponentId: gameData.opponent
          });
          
          // Oyun nesnesini state'e kaydet
          setGame({
            ...gameData,
            id: docSnapshot.id
          });
          
          // Oyun durumunu kontrol et
          if (gameData.status !== GameStatus.ACTIVE) {
            if (gameData.status === GameStatus.COMPLETED || gameData.status === GameStatus.TIMEOUT) {
              Alert.alert(
                'Oyun Sona Erdi',
                gameData.winnerId ? 'Kazanan belli oldu!' : 'Süre doldu!',
                [
                  { text: 'Ana Sayfaya Dön', onPress: () => router.replace('/dashboard') }
                ]
              );
            } else {
              setError('Bu oyun artık aktif değil');
            }
          } else {
            console.log('🎮 Oyun AKTIF durumdadır, oyun başlatılabilir.');
            
            // Oyun aktifse ve letterPool yoksa, oyunu başlat
            if (!gameData.letterPool || gameData.letterPool.length === 0) {
              console.log('🎮 Oyun başlatılacak - letterPool henüz oluşturulmamış');
              initializeGame();
            } else {
              console.log('🎮 Oyun zaten başlatılmış, veriler yükleniyor');
              
              // Kullanıcı ID'lerini al
              if (user) {
                const userId = (user as any).uid;
                const isCreator = userId === gameData.creator;
                const opponentId = isCreator ? gameData.opponent : gameData.creator;
                
                console.log('🎮 Oyuncu bilgileri:', {
                  userId,
                  isCreator,
                  opponentId,
                  raflarımızVar: gameData.playerRacks && gameData.playerRacks[userId]
                });

                // Sıranın kimde olduğunu güncelle (bunu öne aldık)
                const isUserTurn = gameData.currentTurn === userId;
                
                // ÖNEMLİ: Tahtaya yerleştirilmiş harfler var mı kontrol et
                // Eğer oyuncunun sırası ve tahtada yerleştirilmiş harfler varsa, tahtayı güncelleme
                const hasPlacedTiles = board.some(row => row.some(tile => tile.isPlaced));
                
                // Tahtayı güncelle - ancak oyuncunun sırası ve yerleştirdiği harfler varsa güncelleme
                if (gameData.board && !(isUserTurn && hasPlacedTiles)) {
                  const newBoard = createEmptyBoard();
                  Object.entries(gameData.board).forEach(([key, letter]) => {
                    const [row, col] = key.split(',').map(Number);
                    if (row >= 0 && row < 15 && col >= 0 && col < 15) {
                      newBoard[row][col].letter = letter;
                    }
                  });
                  setBoard(newBoard);
                }
                
                // Harfleri yükle - yerleştirilmiş harfler yoksa
                if (gameData.playerRacks && gameData.playerRacks[userId] && !(isUserTurn && hasPlacedTiles)) {
                  console.log('🎮 Oyuncu harfleri yükleniyor:', gameData.playerRacks[userId]);
                  setPlayerRack(gameData.playerRacks[userId]);
                  setLetterPool(gameData.letterPool || []);
                }
                
                // Puanları güncelle
                if (gameData.scores) {
                  setPlayerScore(gameData.scores[userId] || 0);
                  setOpponentScore(gameData.scores[opponentId || ''] || 0);
                }
                
                // Süre takibi
                if (gameData.playerTimes) {
                  setPlayerRemainingTime(gameData.playerTimes[userId] || 0);
                  setOpponentRemainingTime(gameData.playerTimes[opponentId || ''] || 0);
                }

                // Sırayı güncelle - yerleştirilmiş harfler varsa ve bu kullanıcının sırası ise değiştirme
                if (!(isUserTurn && hasPlacedTiles)) {
                  setIsMyTurn(isUserTurn);
                  console.log('🎮 Şu anki sıra:', {
                    isUserTurn,
                    currentTurnId: gameData.currentTurn
                  });
                }
                
                // Aktif oyuncunun süresini güncelle
                if (gameData.playerTimes) {
                  if (isUserTurn) {
                    setRemainingTime(gameData.playerTimes[userId] || 0);
                  } else {
                    setRemainingTime(gameData.playerTimes[opponentId || ''] || 0);
                  }
                }
              }
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
  }, [gameId, router, user, board]);
  
  // Süre dolduğunda çağrılacak fonksiyon
  const handleTimeout = async () => {
    if (!user || !gameId || !game) return;
    
    try {
      console.log('⏱️ Süre doldu:', {
        oyuncu: playerRemainingTime,
        rakip: opponentRemainingTime
      });
      
      // Süre dolunca yerel state güncelle
      setIsMyTurn(false);
      
      Toast.show({
        type: 'error',
        text1: 'Süre Doldu',
        text2: 'Süreniz doldu. Hamleniz iptal edildi.',
        position: 'bottom',
      });
      
      // Sadece loglamak ve ekrana mesaj göstermek için, veri tabanı güncellenmeyecek
      console.log('⏱️ Oyun sadece yerel olarak güncellendi: TIMEOUT');
      
      Alert.alert(
        'Süre Doldu',
        'Süreniz doldu. Oyun sona erdi.',
        [
          { text: 'Ana Sayfaya Dön', onPress: () => router.replace('/dashboard') }
        ]
      );
    } catch (error) {
      console.error('Süre doldurma hatası:', error);
    }
  };
  
  // Oyuncu sürelerini güncelle
  const handleTimeUpdate = async (playerTime: number, opponentTime: number) => {
    if (!gameId || !user || !game) return;
    
    try {
      const userId = (user as any).uid;
      
      // Veri tabanına kaydetmeyi kaldırdık, sadece yerel state'i güncelle
      setPlayerRemainingTime(playerTime);
      setOpponentRemainingTime(opponentTime);
      
      // Debug amaçlı log
      if (playerTime % 60 === 0 || playerTime <= 10) {
        console.log('⏱️ Sadece yerel süre güncellendi:', {
          oyuncu: playerTime,
          rakip: opponentTime
        });
      }
    } catch (error) {
      console.error('Süre güncelleme hatası:', error);
    }
  };
  
  // Hamleyi onayla ve sırayı rakibe geçir
  const confirmMove = async () => {
    if (!user || !gameId || !game) return;
    
    console.log('🎮 Hamle onayı başlıyor:', {
      oyuncuSüresi: playerRemainingTime,
      ekrandakiSüre: remainingTime
    });
    
    // Yerleştirilen harfleri bul
    const placedTiles: TileData[] = [];
    board.forEach(row => {
      row.forEach(tile => {
        if (tile.isPlaced) {
          placedTiles.push(tile);
        }
      });
    });
    
    // Hiç harf yerleştirilmemişse uyarı ver
    if (placedTiles.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Geçersiz Hamle',
        text2: 'Lütfen en az bir harf yerleştirin veya Pas Geç butonunu kullanın',
        position: 'bottom',
      });
      return;
    }
    
    // İlk hamlede merkezi kareye yerleştirme kontrolü
    const isFirstMove = !board.some(row => row.some(tile => tile.letter !== '' && !tile.isPlaced));
    const centerTile = board[7][7];
    
    if (isFirstMove && !placedTiles.some(tile => tile.row === 7 && tile.col === 7)) {
      Toast.show({
        type: 'error',
        text1: 'Geçersiz Hamle',
        text2: 'İlk hamle merkezdeki yıldızlı kareye yerleştirilmelidir',
        position: 'bottom',
      });
      return;
    }
    
    // İlk hamle değilse, yerleştirilen harflerin en az birinin mevcut harflere komşu olması gerekir
    if (!isFirstMove) {
      // Harflerin yerleştirildiği yerlerin etrafında zaten yerleştirilmiş harf var mı kontrol et
      const isConnectedToExistingTile = placedTiles.some(placedTile => {
        const { row, col } = placedTile;
        
        // Üst, alt, sağ, sol komşuları kontrol et
        const neighbors = [
          { row: row - 1, col }, // üst
          { row: row + 1, col }, // alt
          { row, col: col - 1 }, // sol
          { row, col: col + 1 }, // sağ
        ];
        
        // Herhangi bir komşuda önceden yerleştirilmiş harf var mı?
        return neighbors.some(neighbor => {
          // Tahta dışında mı?
          if (neighbor.row < 0 || neighbor.row >= 15 || neighbor.col < 0 || neighbor.col >= 15) {
            return false;
          }
          
          const neighborTile = board[neighbor.row][neighbor.col];
          return neighborTile.letter !== '' && !neighborTile.isPlaced;
        });
      });
      
      if (!isConnectedToExistingTile) {
        Toast.show({
          type: 'error',
          text1: 'Geçersiz Hamle',
          text2: 'Yerleştirilen harfler tahtadaki mevcut harflerden en az birine komşu olmalıdır',
          position: 'bottom',
        });
        return;
      }
    }
    
    // Yerleştirilen harflerin düzgün yerleşip yerleşmediğini kontrol et (yatay veya dikey olmalı)
    const isPlacementValid = checkPlacementIsValid(placedTiles);
    if (!isPlacementValid) {
      Toast.show({
        type: 'error',
        text1: 'Geçersiz Yerleştirme',
        text2: 'Harfler yatay veya dikey bir sıra oluşturmalıdır',
        position: 'bottom',
      });
      return;
    }
    
    /* 
    // Kelime kontrolü şimdilik devre dışı
    // TODO: Kelime geçerliliği kontrolü
    // TODO: Puanlama hesaplaması
    */
    
    try {
      // Harf havuzundan yeni harfler çek
      const newPlayerRack = [...playerRack];
      let tempLetterPool = [...letterPool];
      
      // Boş yerleri doldur
      for (let i = 0; i < newPlayerRack.length; i++) {
        if (newPlayerRack[i] === '' && tempLetterPool.length > 0) {
          // Havuzdan rastgele bir harf al
          const randomIndex = Math.floor(Math.random() * tempLetterPool.length);
          newPlayerRack[i] = tempLetterPool[randomIndex];
          tempLetterPool.splice(randomIndex, 1);
        }
      }
      
      // Oyun verisini güncelle
      const gameRef = doc(db, 'games', gameId);
      
      // Tahta durumunu kaydet
      const boardState: Record<string, string> = {};
      board.forEach(row => {
        row.forEach(tile => {
          if (tile.letter) {
            boardState[`${tile.row},${tile.col}`] = tile.letter;
          }
        });
      });
      
      // Kullanıcı ID'lerini al
      const userId = (user as any).uid;
      // Rakip ID'sini al ve tip güvenliği sağla
      const opponentUserId = userId === game.creator ? game.opponent : game.creator;
      
      // Kontrol et: opponentUserId tanımlı mı?
      if (!opponentUserId) {
        throw new Error('Rakip bilgisi bulunamadı');
      }
      
      const playerRacks: Record<string, string[]> = { ...(game.playerRacks || {}) };
      playerRacks[userId] = newPlayerRack;
      
      console.log('🎮 Veritabanında süreler güncellenmeyecek, sadece yerel durumda tutulacak:', {
        kullanıcıId: userId,
        güncelSüre: playerRemainingTime
      });
      
      // Veritabanında güncelle - süre bilgilerini dahil etmeyelim
      await updateDoc(gameRef, {
        board: boardState,
        letterPool: tempLetterPool,
        playerRacks,
        currentTurn: opponentUserId,
        lastMoveTime: Timestamp.now()
        // playerTimes alanını kaldırdık
      });
      
      // Yerel durumu güncelle
      setLetterPool(tempLetterPool);
      setPlayerRack(newPlayerRack);
      
      // Tüm yeni yerleştirilen harfleri kalıcı yap
      const newBoard = board.map(row => 
        row.map(tile => 
          tile.isPlaced ? { ...tile, isPlaced: false } : tile
        )
      );
      
      setBoard(newBoard);
      
      // Sırayı değiştir
      console.log('🎮 Hamle tamamlandı, sıra değişiyor:', {
        önceki: isMyTurn,
        sonraki: false,
        kime: opponentUserId
      });
      setIsMyTurn(false);
      
      Toast.show({
        type: 'success',
        text1: 'Hamle Tamamlandı',
        text2: 'Sıra rakibinize geçti',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Hamle gönderme hatası:', error);
      Toast.show({
        type: 'error',
        text1: 'Hamle Hatası',
        text2: 'Hamleniz kaydedilemedi. Lütfen tekrar deneyin.',
        position: 'bottom',
      });
    }
  };
  
  // Harflerin yatay veya dikey bir çizgide olup olmadığını kontrol et
  const checkPlacementIsValid = (placedTiles: TileData[]): boolean => {
    // Tek harf yerleştirilmişse her zaman geçerlidir
    if (placedTiles.length === 1) return true;
    
    // Tüm yerleştirilen harflerin aynı satırda olup olmadığını kontrol et (yatay kontrol)
    const allInSameRow = placedTiles.every(tile => tile.row === placedTiles[0].row);
    
    if (allInSameRow) {
      // Sıralı olup olmadıklarını kontrol et
      const cols = placedTiles.map(tile => tile.col).sort((a, b) => a - b);
      
      // Her sütun değerinin bir öncekinden sadece 1 fazla olmalı
      for (let i = 1; i < cols.length; i++) {
        if (cols[i] !== cols[i-1] + 1) {
          // Aralarında boşluk var, ancak bu boşlukta bir harf var mı kontrol et
          const row = placedTiles[0].row;
          const col = cols[i-1] + 1;
          if (col < cols[i] && board[row][col].letter === '') {
            return false; // Aralarında boş kare var, bu geçersiz bir yerleştirme
          }
        }
      }
      return true;
    }
    
    // Tüm yerleştirilen harflerin aynı sütunda olup olmadığını kontrol et (dikey kontrol)
    const allInSameCol = placedTiles.every(tile => tile.col === placedTiles[0].col);
    
    if (allInSameCol) {
      // Sıralı olup olmadıklarını kontrol et
      const rows = placedTiles.map(tile => tile.row).sort((a, b) => a - b);
      
      // Her satır değerinin bir öncekinden sadece 1 fazla olmalı
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] !== rows[i-1] + 1) {
          // Aralarında boşluk var, ancak bu boşlukta bir harf var mı kontrol et
          const row = rows[i-1] + 1;
          const col = placedTiles[0].col;
          if (row < rows[i] && board[row][col].letter === '') {
            return false; // Aralarında boş kare var, bu geçersiz bir yerleştirme
          }
        }
      }
      return true;
    }
    
    // Ne yatay ne de dikey bir çizgide değiller
    return false;
  };
  
  // Pas geçme
  const passMove = async () => {
    if (!user || !gameId || !game || !isMyTurn) {
      return;
    }
    
    try {
      const userId = (user as any).uid;
      const opponentId = userId === game.creator ? game.opponent : game.creator;
      
      if (!opponentId) {
        throw new Error('Rakip bulunamadı');
      }
      
      // Sırayı değiştir (yerel olarak)
      setIsMyTurn(false);
      
      // Veritabanında sadece sırayı güncelle, süre bilgilerini tutma
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        currentTurn: opponentId,
        lastMoveTime: Timestamp.now()
      });
      
      console.log('⏭️ Pas geçildi, sıra rakibe geçti', {
        şimdikiOyuncu: opponentId
      });
      
      Toast.show({
        type: 'info',
        text1: 'Pas Geçildi',
        text2: 'Sırayı rakibe devrettiniz',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Pas geçme hatası:', error);
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: 'Pas geçme işlemi yapılamadı',
        position: 'bottom',
      });
    }
  };
  
  // Oyundan çekilme
  const surrenderGame = async () => {
    if (!user || !gameId || !game) return;
    
    try {
      const userId = (user as any).uid;
      const gameRef = doc(db, 'games', gameId);
      
      // Teslim olma durumunda sadece oyun durumunu güncelle
      await updateDoc(gameRef, {
        status: GameStatus.COMPLETED,
        endTime: Timestamp.now(),
        loser: userId,
        winReason: 'surrender'
      });
      
      console.log('🏳️ Oyundan çekildiniz. Rakip kazandı.');
      
      Alert.alert(
        'Oyundan Çekildiniz',
        'Oyundan çekildiniz ve rakibiniz kazandı.',
        [
          { text: 'Ana Sayfaya Dön', onPress: () => router.replace('/dashboard') }
        ]
      );
    } catch (error) {
      console.error('Oyundan çekilme hatası:', error);
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: 'Oyundan çekilme işlemi yapılamadı',
        position: 'bottom',
      });
    }
  };
  
  // Hamleyi iptal et
  const cancelMove = () => {
    if (!isMyTurn) return;
    
    // Bu turda yerleştirilen tüm harfleri temizle ve raftaki yerlerine geri koy
    const newBoard = [...board];
    const newPlayerRack = [...playerRack];
    
    // Yerleştirilmiş her harfi bul ve rafa geri ekle
    board.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile.isPlaced) {
          // Harfi rafa geri koy (ilk boş yere)
          const emptyIndex = newPlayerRack.findIndex(l => l === '');
          if (emptyIndex !== -1) {
            newPlayerRack[emptyIndex] = tile.letter;
          } else {
            newPlayerRack.push(tile.letter);
          }
          
          // Tahtadaki harfi temizle
          newBoard[rowIndex][colIndex] = {
            ...tile,
            letter: '',
            isPlaced: false
          };
        }
      });
    });
    
    setBoard(newBoard);
    setPlayerRack(newPlayerRack);
    setSelectedTile(null);
    setSelectedRackTile(null);
    
    Toast.show({
      type: 'info',
      text1: 'Hamle İptal Edildi',
      text2: 'Harfleriniz geri alındı.',
      position: 'bottom',
    });
  };
  
  // İzin verilen karelerin belirginleştirilmesi için koşulları tanımla
  const isAllowedSquare = (tile: TileData): boolean => {
    // Eğer kare zaten doluysa, ona yerleştirilemez
    if (tile.letter !== '') return false;
    
    // İlk hamlede merkezi kareye (*) yerleştirme zorunluluğu
    const isFirstMove = !board.some(row => row.some(tile => tile.letter !== '' && !tile.isPlaced));
    if (isFirstMove) return tile.row === 7 && tile.col === 7;
    
    // İlk hamle değilse, mevcut harflere VEYA YENI YERLEŞTİRİLEN harflere komşu olan boş karelere izin ver
    // Komşuları kontrol et - Üst, alt, sağ, sol
    const neighbors = [
      { row: tile.row - 1, col: tile.col }, // üst
      { row: tile.row + 1, col: tile.col }, // alt
      { row: tile.row, col: tile.col - 1 }, // sol
      { row: tile.row, col: tile.col + 1 }, // sağ
    ];
    
    // Herhangi bir komşuda önceden yerleştirilmiş VEYA bu turda yerleştirilmiş harf var mı?
    return neighbors.some(neighbor => {
      // Tahta dışında mı?
      if (neighbor.row < 0 || neighbor.row >= 15 || neighbor.col < 0 || neighbor.col >= 15) {
        return false;
      }
      
      const neighborTile = board[neighbor.row][neighbor.col];
      // Önceden yerleştirilmiş VEYA bu turda yerleştirilmiş harfler
      return neighborTile.letter !== '' && (
        !neighborTile.isPlaced || // Önceki turlardan kalan
        neighborTile.isPlaced     // Bu turda yerleştirilmiş
      );
    });
  };
  
  // Bir kareye tıklandığında
  const handleTilePress = (tile: TileData) => {
    // Eğer benim turam değilse işlem yapma
    if (!isMyTurn) return;
    
    // Eğer kare boşsa ve bir raf harfi seçilmişse
    if (tile.letter === '' && selectedRackTile !== null) {
      placeLetterFromRack(tile, selectedRackTile);
    } 
    // Eğer kare doluysa ve bu tur yerleştirilmişse, harfi geri al
    else if (tile.isPlaced) {
      takeBackLetter(tile);
    }
  };
  
  // Raftaki bir harfe tıklandığında
  const handleRackTilePress = (index: number) => {
    if (!isMyTurn) return;
    
    // Harf yoksa işlem yapma
    if (!playerRack[index]) return;
    
    setSelectedRackTile(index);
  };
  
  // Yükleniyor durumu
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Oyun Yükleniyor...</Text>
      </View>
    );
  }
  
  // Hata durumu
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.replace('/dashboard')}
        >
          <Text style={styles.buttonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Oyun kontrolleri */}
        <GameControls 
          isMyTurn={isMyTurn}
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerRemainingTime={playerRemainingTime}
          opponentRemainingTime={opponentRemainingTime}
          remainingTime={remainingTime}
          letterPoolSize={letterPool.length}
          onConfirmMove={confirmMove}
          onCancelMove={cancelMove}
          onPassMove={passMove}
          onSurrenderGame={surrenderGame}
          onTimeUpdate={handleTimeUpdate}
        />
        
        {/* Oyun tahtası */}
        <Board 
          board={board}
          isMyTurn={isMyTurn}
          onTilePress={handleTilePress}
          selectedTile={selectedTile}
          selectedRackTile={selectedRackTile}
          isAllowedSquare={isAllowedSquare}
        />
        
        {/* Oyuncu harfleri */}
        <Rack 
          playerRack={playerRack}
          isMyTurn={isMyTurn}
          onRackTilePress={handleRackTilePress}
          selectedRackTile={selectedRackTile}
        />
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
    padding: 10,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});