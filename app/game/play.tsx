import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, onSnapshot, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/auth';
import { Game, GameStatus, getDurationInSeconds } from '../utils/gameUtils';
import Toast from 'react-native-toast-message';
import { Timestamp } from 'firebase/firestore';
import { loadTurkishWordList, isValidWord, normalizeWord } from '../utils/wordValidator';

// Bileşenler
import Board from '../components/game/Board';
import Rack from '../components/game/Rack';
import GameControls from '../components/game/GameControls';

// Yardımcılar
import { createEmptyBoard, shuffleArray, calculateWordScore, placeMines, calculateScoreWithMines } from '../utils/gameHelpers';
import { TileData, LETTER_COUNTS, MineData, MineType } from '../utils/gameConstants';

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
  
  // Mayınlar
  const [mines, setMines] = useState<Map<string, MineData>>(new Map());
  
  // Zamanlayıcı için referans
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Kullanıcının yerleştirdiği taşları izlemek için ref
  const placedTilesRef = useRef<boolean>(false);
  
  // İlk hamle ve yerleştirilen harflerin durumunu izle
  const { hasPermanentLetter, placedThisTurn } = useMemo(() => {
    let perm = false, placed = false;
    board.forEach(row => row.forEach(t => {
      if (t.letter) {
        if (t.isPlaced) placed = true;
        else perm = true;
      }
    }));
    return { hasPermanentLetter: perm, placedThisTurn: placed };
  }, [board]);
  
  // Geri tuşunu yönet (donanım geri tuşu)
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Oyundan çıkmak istediğinden emin misin?
      Alert.alert(
          'Oyundan çıkmak üzeresiniz',
          'Oyundan çıkmak istediğinize emin misiniz?',
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Çık', onPress: () => router.replace('/dashboard') }
          ]
        );
        return true; // Geri tuşunun varsayılan davranışını engelle
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [router])
  );
  
  // Kelime listesini yükle
  useEffect(() => {
    // Kelime listesini yükle
    const loadWordList = async () => {
      try {
        const loaded = await loadTurkishWordList();
        if (loaded) {
          console.log('📝 Kelime listesi başarıyla yüklendi!');
          // Temel kelimeleri test et
          const testWords = ['kin', 'kın', 'ev', 'su', 'göz'];
          testWords.forEach(word => {
            console.log(`📝 Test kelimesi "${word}" geçerli mi:`, isValidWord(word));
          });
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
  
  // Kalan süreyi hesaplayan yardımcı fonksiyon
  const deriveRemaining = useCallback(
    (turnSec: number, last: Timestamp | undefined, isMyTurn: boolean): number => {
      if (!last) return turnSec; // lastMoveAt yoksa tam süreyi döndür
      
      return isMyTurn
        ? Math.max(0, turnSec - Math.floor((Date.now() - last.toMillis()) / 1000))
        : turnSec; // sıra rakipteyse tam süre
    },
    []
  );
  
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
          
          // Oyun nesnesini state'e kaydet
          setGame({
            ...gameData,
            id: docSnapshot.id
          });
          
          // Log oyun verileri
          console.log('🎮 Oyun verileri yüklendi:', {
            turnSirasi: gameData.currentTurn,
            sonPasGecen: gameData.lastPassedBy || 'Yok',
            status: gameData.status
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
            return; // Durumla ilgili işlem yaptık, devam etmeye gerek yok
          }
          
          // Oyun aktifse ve letterPool yoksa veya boşsa, sadece oluşturucu veya oluşturucu yoksa ilk rakip başlatsın
          if ((!gameData.letterPool || gameData.letterPool.length === 0) && user) {
            const userId = (user as any).uid;
            
            // Sadece oluşturucu (creator) veya oluşturucu yoksa rakip başlatsın
            if (userId === gameData.creator || (gameData.opponent === userId && !gameData.creator)) {
              console.log('🎮 Oyun başlatılacak - letterPool henüz oluşturulmamış');
              initializeGame();
              return; // Oyun başlatıldı, devam etmeye gerek yok
            } else {
              console.log('🎮 Oyun başlatması için diğer oyuncu bekleniyor');
            }
          }
          
          // Kullanıcı harflerini yerleştirdi mi kontrol et
          const hasPlacedTiles = board.some(row => row.some(t => t.isPlaced && t.letter));
          placedTilesRef.current = hasPlacedTiles;
          
          // Kullanıcı ID'lerini al
          if (user) {
            const userId = (user as any).uid;
            const isCreator = userId === gameData.creator;
            const opponentId = isCreator ? gameData.opponent : gameData.creator;
            
            // Sıranın kimde olduğunu kontrol et
            const isUserTurn = gameData.currentTurn === userId;
                  
            // Tahtayı güncelle - ancak oyuncunun sırası ve yerleştirilmiş harfler varsa güncelleme
            if (gameData.board && !(isUserTurn && placedTilesRef.current)) {
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
            if (gameData.playerRacks && gameData.playerRacks[userId] && !placedTilesRef.current) {
              setPlayerRack(gameData.playerRacks[userId]);
              setLetterPool(gameData.letterPool || []);
            }
            
            // Puanları güncelle
            if (gameData.scores) {
              setPlayerScore(gameData.scores[userId] || 0);
              setOpponentScore(gameData.scores[opponentId || ''] || 0);
            }
            
            // Sırayı güncelle - yerleştirilmiş harfler varsa ve bu kullanıcının sırası ise değiştirme
            if (!(isUserTurn && placedTilesRef.current)) {
              setIsMyTurn(isUserTurn);
            }
            
            // Kalan süreyi hesapla
            const turnDuration = gameData.turnDuration || 300; // Varsayılan olarak 5 dakika
            
            // Kullanıcının kalan süresini hesapla
            const playerRemaining = deriveRemaining(
              turnDuration, 
              gameData.lastMoveAt, 
              isUserTurn
            );
            
            // Rakibin kalan süresini hesapla
            const opponentRemaining = deriveRemaining(
              turnDuration,
              gameData.lastMoveAt,
              !isUserTurn
            );
            
            // Aktif oyuncunun kalan süresini güncelle
            setRemainingTime(isUserTurn ? playerRemaining : opponentRemaining);
            
            // Oyuncu ve rakip sürelerini güncelle
            setPlayerRemainingTime(isUserTurn ? playerRemaining : turnDuration);
            setOpponentRemainingTime(!isUserTurn ? opponentRemaining : turnDuration);
            
            // Süre kontrol et - eğer süre bittiyse oyunu bitir
            if (isUserTurn && playerRemaining === 0) {
              handleTimeout();
            }
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Oyun dinleme hatası:', error);
        setError('Oyun bilgisi alınamadı');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [gameId, user, router, deriveRemaining]);
  
  // Süre dolduğunda çağrılacak fonksiyon
  const handleTimeout = async () => {
    if (!user || !gameId || !game) return;
    
    try {
      console.log('⏱️ Süre doldu');
      
      // Sürenin sıfıra düştüğünü doğrula
      const userId = (user as any).uid;
      const opponentId = userId === game.creator ? game.opponent : game.creator;
      
      if (!opponentId) {
        throw new Error('Rakip bulunamadı');
      }
      
      // Lokal olarak sırayı değiştir
      setIsMyTurn(false);
      
      // Oyunu timeout ile bitir, rakibi kazanan olarak işaretle
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: GameStatus.TIMEOUT,
        winnerId: opponentId,
        endTime: serverTimestamp()
      });
      
      Toast.show({
        type: 'error',
        text1: 'Süre Doldu',
        text2: 'Süreniz doldu. Rakibiniz kazandı.',
        position: 'bottom',
      });
      
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
  
  // Zaman güncellemelerini işle - artık sadece local state güncellemesi yapılıyor, veritabanına yazma yok
  const handleTimeUpdate = (playerTime: number, opponentTime: number) => {
    if (playerTime !== playerRemainingTime) {
      setPlayerRemainingTime(playerTime);
    }
    
    if (opponentTime !== opponentRemainingTime) {
      setOpponentRemainingTime(opponentTime);
    }
    
    // Süre dolmuşsa ve sıra bendeyse timeout işlemi yap
    if (playerTime === 0 && isMyTurn) {
      handleTimeout();
    }
  };
  
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
      
      // Mayınları yerleştir
      const gameMines = placeMines();
      setMines(gameMines);
      
      console.log('🎮 Mayınlar yerleştirildi, map boyutu:', gameMines.size);
      console.log('Oluşturulan mayınlar:', Array.from(gameMines.entries()));
      
      // Mayınları JSON formatına dönüştür
      const minesJson: Record<string, { type: MineType, isActive: boolean, isRevealed: boolean }> = {};
      gameMines.forEach((mine, position) => {
        minesJson[position] = {
          type: mine.type,
          isActive: mine.isActive,
          isRevealed: mine.isRevealed
        };
        console.log(`Mayın JSON'a ekleniyor: pozisyon=${position}, tip=${mine.type}`);
      });
      
      console.log('JSON formatında mayınlar:', JSON.stringify(minesJson));
      
      // Oyun nesnesini güncelle
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);
      
      if (gameDoc.exists()) {
        const gameData = gameDoc.data() as Game;
        const player1Id = gameData.creator;
        const player2Id = gameData.opponent || '';
        
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
        
        // Sırayı rastgele belirle
        const startingPlayer = Math.random() < 0.5 ? player1Id : player2Id;
        
        // Başlangıç puanları
        const scores: Record<string, number> = {};
        scores[player1Id] = 0;
        if (player2Id) {
          scores[player2Id] = 0;
        }
        
        // Oyun süresini al
        const durationType = gameData.durationType;
        const gameTimeSeconds = getDurationInSeconds(durationType);
        
        // Süre bilgilerini yerel state'e ayarla
        setPlayerRemainingTime(gameTimeSeconds);
        setOpponentRemainingTime(gameTimeSeconds);
          setRemainingTime(gameTimeSeconds);
        
        // Veritabanında güncelle
        await updateDoc(gameRef, {
          letterPool: shuffledPool,
          playerRacks,
          currentTurn: startingPlayer,
          startTime: serverTimestamp(),
          lastMoveAt: serverTimestamp(), // Oyun başlangıç zamanı
          turnDuration: gameTimeSeconds, // Her hamle için süre sınırı
          scores,
          board: {},  // Boş tahta
          lastPassedBy: null, // İlk başlangıçta pas geçen kimse olmadığını belirt
          consecutivePassCount: 0, // Arka arkaya pas geçme sayacı sıfırla
          mines: minesJson // Mayınları ekle
        });
        
        console.log('🎮 Oyun verileri veritabanına kaydedildi');
        
        // Güncel oyun verilerini al ve state'leri güncelle
        const updatedGameDoc = await getDoc(gameRef);
        if (updatedGameDoc.exists()) {
          const updatedData = updatedGameDoc.data() as Game;
          setLetterPool(updatedData.letterPool || []);
          
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
    
    // Raftaki bir sonraki harfi bul ve seç
    const nextRackTileIndex = newPlayerRack.findIndex(l => l !== '');
    
    setBoard(newBoard);
    setPlayerRack(newPlayerRack);
    setSelectedTile(null);
    setSelectedRackTile(nextRackTileIndex === -1 ? null : nextRackTileIndex); // Otomatik olarak bir sonraki harfi seç
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
  
  // Yerel olarak, kelimenin geçerli olup olmadığını kontrol et
  const isWordValid = (tiles: TileData[]): boolean => {
    const word = tiles.map(tile => tile.letter).join('');
    
    // Kelimeyi ve harflerini loglayalım
    console.log(`\n🔍 Kelime kontrolü: '${word}'`);
    console.log(`🔍 Harfler ve kodları:`, Array.from(word).map(c => ({ char: c, code: c.charCodeAt(0) })));
    
    // Tanınan kelimeler için manuel kontrol ekleyelim
    const manualValidWords = ["kin", "kın", "KİN", "KIN", "Kin", "KİN"];
    
    // Manuel olarak tanınması gereken kelimeler
    if (word.toLowerCase() === "kin" || 
        normalizeWord(word) === "kin" ||
        manualValidWords.includes(word)) {
      console.log(`🔍 '${word}' kelimesi manuel olarak geçerli kabul edildi!`);
      return true;
    }
    
    // Normal doğrulama
    const isValid = isValidWord(word);
    console.log(`🔍 '${word}' kelimesi ${isValid ? 'geçerli ✅' : 'geçersiz ❌'}`);
    return isValid;
  };
  
  // Yerleştirilen harflerden oluşan kelimeleri ve toplam puanı bul
  const findWords = (placedTiles: TileData[]): { words: TileData[][]; score: number; } => {
    let totalScore = 0;
    const words: TileData[][] = [];
    const validWords: TileData[][] = [];
    
    // Mayın kontrolü yapıp, bonus engelleyici olup olmadığını kontrol et
    const hasBonusBlocker = (tiles: TileData[]): boolean => {
      for (const tile of tiles) {
        const position = `${tile.row},${tile.col}`;
        const mine = mines.get(position);
        if (mine && mine.isActive && mine.type === MineType.BONUS_BLOCKER) {
          return true;
        }
      }
      return false;
    };
    
    // Tüm yerleştirilmiş harfler aynı satırda mı? (yatay kelime)
    const allInSameRow = placedTiles.every(tile => tile.row === placedTiles[0].row);
    
    if (allInSameRow) {
      // Yatay kelimeyi bul
      const row = placedTiles[0].row;
      const cols = placedTiles.map(tile => tile.col).sort((a, b) => a - b);
      const minCol = cols[0];
      const maxCol = cols[cols.length - 1];
      
      // Kelimeyi oluştur (yerleştirilmiş ve kalıcı harfler birlikte)
      const horizontalWord: TileData[] = [];
      
      // Kelimenin başlangıcını bul (yerleştirilmiş harflerden önceki bağlantılı harfler)
      let startCol = minCol;
      while (startCol > 0 && board[row][startCol - 1].letter) {
        startCol--;
      }
      
      // Kelimenin sonunu bul (yerleştirilmiş harflerden sonraki bağlantılı harfler)
      let endCol = maxCol;
      while (endCol < 14 && board[row][endCol + 1].letter) {
        endCol++;
      }
      
      // Kelimeyi oluştur
      for (let col = startCol; col <= endCol; col++) {
        horizontalWord.push(board[row][col]);
      }
      
      // Kelime en az 2 harften oluşmalı
      if (horizontalWord.length >= 2) {
        // Kelimeyi geçerli kelimeler listesine ekle
        words.push(horizontalWord);
        
        // Kelimenin geçerli olup olmadığını kontrol et
        if (isWordValid(horizontalWord)) {
          validWords.push(horizontalWord);
          
          // Bonus engelleyici var mı kontrol et
          const bonusBlocked = hasBonusBlocker(horizontalWord);
          totalScore += calculateWordScore(horizontalWord, bonusBlocked);
        }
      }
      
      // Yerleştirilen her harften dikey kelimeler de oluşabilir
      for (const placedTile of placedTiles) {
        const verticalWord: TileData[] = [];
        const { row: tileRow, col: tileCol } = placedTile;
        
        // Kelimenin başlangıcını bul (yukarı doğru)
        let startRow = tileRow;
        while (startRow > 0 && board[startRow - 1][tileCol].letter) {
          startRow--;
        }
        
        // Kelimenin sonunu bul (aşağı doğru)
        let endRow = tileRow;
        while (endRow < 14 && board[endRow + 1][tileCol].letter) {
          endRow++;
        }
        
        // Kelimeyi oluştur
        for (let row = startRow; row <= endRow; row++) {
          verticalWord.push(board[row][tileCol]);
        }
        
        // Kelime en az 2 harften oluşmalı
        if (verticalWord.length >= 2) {
          // Kelimeyi geçerli kelimeler listesine ekle
          words.push(verticalWord);
          
          // Kelimenin geçerli olup olmadığını kontrol et
          if (isWordValid(verticalWord)) {
            validWords.push(verticalWord);
            
            // Bonus engelleyici var mı kontrol et
            const bonusBlocked = hasBonusBlocker(verticalWord);
            totalScore += calculateWordScore(verticalWord, bonusBlocked);
          }
        }
      }
    } else {
      // Tüm yerleştirilmiş harfler aynı sütunda mı? (dikey kelime)
      const allInSameCol = placedTiles.every(tile => tile.col === placedTiles[0].col);
      
      if (allInSameCol) {
        // Dikey kelimeyi bul
        const col = placedTiles[0].col;
        const rows = placedTiles.map(tile => tile.row).sort((a, b) => a - b);
        const minRow = rows[0];
        const maxRow = rows[rows.length - 1];
        
        // Kelimeyi oluştur (yerleştirilmiş ve kalıcı harfler birlikte)
        const verticalWord: TileData[] = [];
        
        // Kelimenin başlangıcını bul (yerleştirilmiş harflerden önceki bağlantılı harfler)
        let startRow = minRow;
        while (startRow > 0 && board[startRow - 1][col].letter) {
          startRow--;
        }
        
        // Kelimenin sonunu bul (yerleştirilmiş harflerden sonraki bağlantılı harfler)
        let endRow = maxRow;
        while (endRow < 14 && board[endRow + 1][col].letter) {
          endRow++;
        }
        
        // Kelimeyi oluştur
        for (let row = startRow; row <= endRow; row++) {
          verticalWord.push(board[row][col]);
        }
        
        // Kelime en az 2 harften oluşmalı
        if (verticalWord.length >= 2) {
          // Kelimeyi geçerli kelimeler listesine ekle
          words.push(verticalWord);
          
          // Kelimenin geçerli olup olmadığını kontrol et
          if (isWordValid(verticalWord)) {
            validWords.push(verticalWord);
            
            // Bonus engelleyici var mı kontrol et
            const bonusBlocked = hasBonusBlocker(verticalWord);
            totalScore += calculateWordScore(verticalWord, bonusBlocked);
          }
        }
        
        // Yerleştirilen her harften yatay kelimeler de oluşabilir
        for (const placedTile of placedTiles) {
          const horizontalWord: TileData[] = [];
          const { row: tileRow, col: tileCol } = placedTile;
          
          // Kelimenin başlangıcını bul (sola doğru)
          let startCol = tileCol;
          while (startCol > 0 && board[tileRow][startCol - 1].letter) {
            startCol--;
          }
          
          // Kelimenin sonunu bul (sağa doğru)
          let endCol = tileCol;
          while (endCol < 14 && board[tileRow][endCol + 1].letter) {
            endCol++;
          }
          
          // Kelimeyi oluştur
          for (let col = startCol; col <= endCol; col++) {
            horizontalWord.push(board[tileRow][col]);
          }
          
          // Kelime en az 2 harften oluşmalı
          if (horizontalWord.length >= 2) {
            // Kelimeyi geçerli kelimeler listesine ekle
            words.push(horizontalWord);
            
            // Kelimenin geçerli olup olmadığını kontrol et
            if (isWordValid(horizontalWord)) {
              validWords.push(horizontalWord);
              
              // Bonus engelleyici var mı kontrol et
              const bonusBlocked = hasBonusBlocker(horizontalWord);
              totalScore += calculateWordScore(horizontalWord, bonusBlocked);
            }
          }
        }
      }
    }
    
    return { words, score: totalScore };
  };
  
  // Pas geçme
  const passMove = async () => {
    if (!user || !gameId || !game || !isMyTurn) {
      console.log('🎮 Pas geçme başarısız - Kullanıcı, oyun ID, oyun verisi eksik veya sıra bizde değil');
      return;
    }
    
    try {
      const userId = (user as any).uid;
      const opponentId = userId === game.creator ? game.opponent : game.creator;
      
      console.log('🎮 Pas geçme işlemi başladı:', {
        oyuncuId: userId,
        rakipId: opponentId,
        oyunId: gameId,
        sonPasGecen: game.lastPassedBy || 'Hiç pas geçilmemiş',
        ardArda: game.consecutivePassCount || 0
      });
      
      if (!opponentId) {
        throw new Error('Rakip bulunamadı');
      }
      
      // Sırayı değiştir (yerel olarak)
      setIsMyTurn(false);
      
      const gameRef = doc(db, 'games', gameId);
      
      // Arka arkaya pas geçme sayacını kontrol et
      const currentPassCount = game.consecutivePassCount || 0;
      
      // Eğer pas geçme sayacı 2 ise (yani bu 3. pas geçme), oyunu bitir
      if (currentPassCount === 2) {
        console.log('🎮 Arka arkaya 3 pas geçildi, oyun bitiyor');
        
        // Puanları kontrol et, kim kazandı?
        const userScore = game.scores?.[userId] || 0;
        const opponentScore = game.scores?.[opponentId] || 0;
        const winnerId = userScore > opponentScore ? userId : opponentId;
        
        // Eğer puanlar eşitse, rakip kazansın (pas geçen son oyuncu kaybeder)
        const finalWinnerId = userScore === opponentScore ? opponentId : winnerId;
        
        // Oyun bitti, kazanan belirle
        await updateDoc(gameRef, {
          status: GameStatus.COMPLETED,
          endTime: serverTimestamp(),
          winnerId: finalWinnerId,
          winReason: 'consecutive_pass',
          lastPassedBy: userId,
          lastMoveAt: serverTimestamp(),
          consecutivePassCount: currentPassCount + 1
        });
        
        Toast.show({
          type: 'info',
          text1: 'Oyun Sona Erdi',
          text2: 'Arka arkaya 3 kez pas geçildiği için oyun bitti.',
          position: 'bottom',
        });
        
        Alert.alert(
          'Oyun Sona Erdi',
          `Arka arkaya 3 kez pas geçildiği için oyun sona erdi. ${finalWinnerId === userId ? 'Siz kazandınız!' : 'Rakibiniz kazandı!'}`,
          [
            { text: 'Ana Sayfaya Dön', onPress: () => router.replace('/dashboard') }
          ]
        );
        
        return; // İşlemi sonlandır
      }
      
      // Normal pas geçme işlemi - pas geçme sayacını artır
      const updateData = {
        currentTurn: opponentId,
        lastMoveAt: serverTimestamp(),
        lastPassedBy: userId, // Son pas geçen oyuncu bilgisini kaydet
        consecutivePassCount: currentPassCount + 1 // Pas geçme sayacını artır
      };
      
      console.log('🎮 Pas geçme verisi güncelleniyor:', updateData);
      
      await updateDoc(gameRef, updateData);
      
      console.log('⏭️ Pas geçildi, sıra rakibe geçti');
      
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
      const opponentId = userId === game.creator ? game.opponent : game.creator;
      
      if (!opponentId) {
        throw new Error('Rakip bulunamadı');
      }
      
      const gameRef = doc(db, 'games', gameId);
      
      // Teslim olma durumunda oyun durumunu güncelle
      await updateDoc(gameRef, {
        status: GameStatus.COMPLETED,
        endTime: serverTimestamp(),
        winnerId: opponentId,
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
  
  // Kalan süreyi kontrol eden timer - eğer süre bittiyse timeout yap
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    // Sadece benim sıramsa aktif oyuncunun süresini kontrol et
    if (isMyTurn && game?.lastMoveAt && game?.turnDuration) {
      timer = setInterval(() => {
        // Kalan süreyi hesapla
        const remaining = deriveRemaining(
          game.turnDuration,
          game.lastMoveAt,
          true
        );
        
        // Süre bittiyse oyunu bitir
        if (remaining <= 0) {
          handleTimeout();
          if (timer) clearInterval(timer);
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isMyTurn, game?.lastMoveAt, game?.turnDuration, deriveRemaining]);
  
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
    if (tile.letter) return false;
    
    // İlk hamlede merkezi kareye (*) yerleştirme zorunluluğu
    // Tahtada hiç kalıcı harf yoksa ilk hamledir
    if (!hasPermanentLetter && !placedThisTurn) {
      return tile.row === 7 && tile.col === 7;
    }
    
    // Komşu kareleri kontrol et (yatay ve dikey)
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // üst, alt, sol, sağ
    return dirs.some(([dr, dc]) => {
      const r = tile.row + dr;
      const c = tile.col + dc;
      // Tahta sınırları içinde mi ve komşu karede bir harf var mı?
      return r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].letter;
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
  
  // Hamleyi onayla ve sırayı rakibe geçir
  const confirmMove = async () => {
    if (!user || !gameId || !game) return;
    
    console.log('🎮 Hamle onayı başlıyor');
    
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
        text1: 'Hamle Yapılmadı',
        text2: 'Lütfen önce bir harf yerleştirin.',
        position: 'bottom',
      });
      return;
    }
    
    // Yerleştirilen harflerin doğru konumda olup olmadığını kontrol et
    if (!checkPlacementIsValid(placedTiles)) {
      Toast.show({
        type: 'error',
        text1: 'Geçersiz Hamle',
        text2: 'Harfler yatay veya dikey bir çizgide sıralı olmalı.',
        position: 'bottom',
      });
      return;
    }
    
    try {
      const userId = (user as any).uid;
      const opponentId = userId === game.creator ? game.opponent : game.creator;
      
      if (!opponentId) {
        throw new Error('Rakip bulunamadı');
      }
      
      // Tüm kelimeleri bul ve puanları hesapla
      const { words, score } = findWords(placedTiles);
      
      // Yeni kelimeleri biçimlendir (log için)
      const formattedWords = words.map(wordTiles => 
        wordTiles.map(tile => tile.letter).join('')
      ).join(', ');
      
      console.log(`🔤 Oluşturulan kelimeler: ${formattedWords}`);
      console.log(`🎯 Kazanılan puan: ${score}`);
      
      // Eğer puan 0 ise, geçerli kelime oluşturulmamış demektir
      if (score === 0) {
        console.log('❌ Geçerli bir kelime oluşturulmadı');
        Toast.show({
          type: 'error',
          text1: 'Geçersiz Kelime',
          text2: 'Yerleştirilen harflerle geçerli bir kelime oluşturulamadı.',
          position: 'bottom',
        });
        return;
      }
      
      // Rack'ta kalan harfleri belirle
      const remainingRack = [...playerRack];
      
      // Havuzdan yeni harfler çek
      const newLetters: string[] = [];
      const newPool = [...letterPool];
      
      // Her yerleştirilen harf için rack'tan kaldır
      placedTiles.forEach(tile => {
        const index = remainingRack.indexOf(tile.letter);
        if (index !== -1) {
          remainingRack[index] = '';
        }
      });
      
      // Boş slotları yeni harflerle doldur
      for (let i = 0; i < remainingRack.length; i++) {
        if (remainingRack[i] === '' && newPool.length > 0) {
          // Havuzdan rastgele bir harf al
          const randomIndex = Math.floor(Math.random() * newPool.length);
          const newLetter = newPool.splice(randomIndex, 1)[0];
          remainingRack[i] = newLetter;
          newLetters.push(newLetter);
        }
      }
      
      console.log(`🎲 Çekilen yeni harfler: ${newLetters.join(', ')}`);
      
      // Mayınlara göre puan hesapla - Tüm geçerli kelimeler için kontrol et
      let finalScore = score;
      let transferScore = 0;
      const activatedMines: MineData[] = [];
      
      // Her geçerli kelime için mayın kontrolü ve puan hesaplaması yap
      for (const wordTiles of words) {
        if (isWordValid(wordTiles)) {
          const wordScore = calculateWordScore(wordTiles);
          const mineResult = calculateScoreWithMines(wordScore, wordTiles, mines);
          
          // Puanı güncelle
          if (mineResult.activatedMines.length > 0) {
            finalScore = mineResult.score;
            transferScore = mineResult.transferScore;
            activatedMines.push(...mineResult.activatedMines);
            
            // Mayın aktivasyonunu bildir
            Toast.show({
              type: 'info',
              text1: 'Mayın Aktif!',
              text2: mineResult.transferScore > 0 
                ? 'Puanlarınız rakibe transfer edildi!' 
                : mineResult.letterLossActive
                  ? 'Elinizdeki tüm harfler değiştirilecek!'
                  : mineResult.bonusBlockerActive
                    ? 'Harf ve kelime katları engellenecek!'
                    : mineResult.wordCancelActive
                      ? 'Kelime geçersiz sayıldı, puan alamadınız!'
                      : 'Puanlarınızın %30\'unu alabildiniz!',
              position: 'bottom',
            });
            
            // Harf kaybı mayını işle
            if (mineResult.letterLossActive) {
              // Kalan tüm harfleri havuza geri koy
              remainingRack.forEach(letter => {
                if (letter) {
                  newPool.push(letter);
                }
              });
              
              // Boş bir raf oluştur
              for (let i = 0; i < remainingRack.length; i++) {
                remainingRack[i] = '';
              }
              
              // Yeni harfler çek
              for (let i = 0; i < 7; i++) {
                if (newPool.length > 0) {
                  // Havuzdan rastgele bir harf al
                  const randomIndex = Math.floor(Math.random() * newPool.length);
                  const newLetter = newPool.splice(randomIndex, 1)[0];
                  remainingRack[i] = newLetter;
                  newLetters.push(newLetter);
                }
              }
              
              console.log(`🔄 Harf kaybı mayını: Tüm harfler değiştirildi. Yeni harfler: ${newLetters.join(', ')}`);
            }
            
            break; // İlk mayın etkisini uygula ve çık (oyunu basit tutmak için)
          }
        }
      }
      
      // Önceki puanları al
      const prevUserScore = game.scores?.[userId] || 0;
      const prevOpponentScore = game.scores?.[opponentId] || 0;
      
      // Yeni puanları hesapla (mayın etkilerine göre)
      const newUserScore = prevUserScore + finalScore;
      const newOpponentScore = prevOpponentScore + transferScore;
      
      // Mayınları güncelle
      const updatedMines = new Map(mines);
      activatedMines.forEach(mine => {
        const position = `${mine.row},${mine.col}`;
        // Mayını pasif yap
        if (updatedMines.has(position)) {
          const updatedMine = { ...updatedMines.get(position)!, isActive: false };
          updatedMines.set(position, updatedMine);
        }
      });
      
      // Mayınları JSON'a dönüştür
      const minesJson: Record<string, { type: MineType, isActive: boolean, isRevealed: boolean }> = {};
      updatedMines.forEach((mine, position) => {
        minesJson[position] = {
          type: mine.type,
          isActive: mine.isActive,
          isRevealed: mine.isRevealed
        };
      });
      
      // Veritabanı güncellemesi için dönüştürülmüş tahta
      const boardData: Record<string, string> = {};
      
      // Tahtadaki tüm harfleri ekle
      board.forEach(row => {
        row.forEach(tile => {
          if (tile.letter) {
            boardData[`${tile.row},${tile.col}`] = tile.letter;
          }
        });
      });
      
      // Veritabanında güncellemeleri yap
      const gameRef = doc(db, 'games', gameId);
      
      await updateDoc(gameRef, {
        board: boardData,
        letterPool: newPool,
        [`playerRacks.${userId}`]: remainingRack,
        [`scores.${userId}`]: newUserScore,
        [`scores.${opponentId}`]: newOpponentScore,
        currentTurn: opponentId,
        lastMoveAt: serverTimestamp(),
        lastPassedBy: null, // Hamle yapıldığında pas geçme durumu sıfırlanır
        consecutivePassCount: 0, // Hamle yapıldığında arka arkaya pas geçme sayacı sıfırlanır
        mines: minesJson // Güncellenen mayınları kaydet
      });
      
      // Tahtadaki harflerin yerleştirildi bilgisini kaldır
      const updatedBoard = [...board];
      updatedBoard.forEach(row => {
        row.forEach(tile => {
          if (tile.isPlaced) {
            tile.isPlaced = false;
          }
        });
      });
      
      // Yereldeki durum değişkenlerini güncelle
      setBoard(updatedBoard);
      setPlayerRack(remainingRack);
      setLetterPool(newPool);
      setIsMyTurn(false);
      setSelectedTile(null);
      setSelectedRackTile(null);
      setPlayerScore(newUserScore);
      setOpponentScore(newOpponentScore);
      setMines(updatedMines);
      
      // Hamle tamamlandı bildirimi
      let scoreMessage = `${finalScore} puan kazandınız.`;
      if (transferScore > 0) {
        scoreMessage = `${transferScore} puan rakibinize transfer edildi!`;
      } else if (finalScore < score && activatedMines.some(mine => mine.type === MineType.POINT_DIVISION)) {
        scoreMessage = `Mayın etkisiyle ${finalScore} puan kazandınız.`;
      } else if (activatedMines.some(mine => mine.type === MineType.LETTER_LOSS)) {
        scoreMessage = `${finalScore} puan kazandınız ve harfleriniz yenilendi.`;
      } else if (activatedMines.some(mine => mine.type === MineType.BONUS_BLOCKER)) {
        scoreMessage = `${finalScore} puan kazandınız (harf ve kelime katları olmadan).`;
      } else if (activatedMines.some(mine => mine.type === MineType.WORD_CANCEL)) {
        scoreMessage = 'Kelime geçersiz sayıldı, puan alamadınız.';
      }
      
      Toast.show({
        type: 'success',
        text1: 'Hamle Tamamlandı',
        text2: scoreMessage + ' Sıra rakibinizde.',
        position: 'bottom',
      });
      
      // Hamle kaydını sıfırla
      placedTilesRef.current = false;
    } catch (error) {
      console.error('Hamle onaylama hatası:', error);
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: 'Hamle onaylanırken bir hata oluştu.',
        position: 'bottom',
      });
    }
  };
  
  // Mayınları Firebase'den al ve yerel state'e yükle
  useEffect(() => {
    console.log('Mayın yükleme useEffect çalıştı');
    
    if (game?.mines) {
      console.log('Firebase\'den alınan mayın verileri:', JSON.stringify(game.mines));
      
      if (Object.keys(game.mines).length > 0) {
        const loadedMines = new Map<string, MineData>();
        
        Object.entries(game.mines).forEach(([position, data]) => {
          console.log(`Mayın verisi işleniyor: pozisyon=${position}, veri=`, data);
          const [row, col] = position.split(',').map(Number);
          
          // data içinde doğru alanlar var mı kontrol et
          if (data && typeof data === 'object' && 'type' in data && 'isActive' in data && 'isRevealed' in data) {
            loadedMines.set(position, {
              // as MineType kullanarak tip güvenliği sağla
              type: data.type as MineType,
              row,
              col,
              isActive: Boolean(data.isActive),
              isRevealed: Boolean(data.isRevealed)
            });
            console.log(`Mayın ${position} yüklendi: tip=${data.type}, aktif=${data.isActive}, görünür=${data.isRevealed}`);
          } else {
            console.warn(`Geçersiz mayın verisi: ${position}`, data);
          }
        });
        
        if (loadedMines.size > 0) {
          setMines(loadedMines);
          console.log(`🎮 ${loadedMines.size} mayın başarıyla yüklendi`);
          console.log('Mines Map içeriği:', Array.from(loadedMines.entries()));
        } else {
          console.warn('Geçerli mayın verisi bulunamadı');
        }
      } else {
        console.log('Oyunda mayın yok veya mayın verisi boş');
      }
    } else {
      console.log('Oyun nesnesi veya mines alanı yok');
    }
  }, [game?.mines]);
  
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
          mines={mines}
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