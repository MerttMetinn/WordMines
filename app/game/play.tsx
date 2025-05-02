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
import { loadTurkishWordList } from '../utils/wordValidator';

// Bileşenler
import Board from '../components/game/Board';
import Rack from '../components/game/Rack';
import GameControls from '../components/game/GameControls';

// Yardımcılar
import { createEmptyBoard, shuffleArray, calculateWordScore } from '../utils/gameHelpers';
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
          
          // Oyun aktifse ve letterPool yoksa, oyunu başlat
          if (!gameData.letterPool || gameData.letterPool.length === 0) {
            console.log('🎮 Oyun başlatılacak - letterPool henüz oluşturulmamış');
            initializeGame();
            return; // Oyun başlatıldı, devam etmeye gerek yok
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
                  
            // Tahtayı güncelle - ancak oyuncunun sırası ve yerleştirdiği harfler varsa güncelleme
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
          board: {}  // Boş tahta
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
  
  // Yerleştirilen harflerden oluşan kelimeleri ve toplam puanı bul
  const findWords = (placedTiles: TileData[]): { words: TileData[][]; score: number } => {
    let totalScore = 0;
    const words: TileData[][] = [];
    
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
      while (startCol > 0 && board[startCol - 1][row].letter) {
        startCol--;
      }
      
      // Kelimenin sonunu bul (yerleştirilmiş harflerden sonraki bağlantılı harfler)
      let endCol = maxCol;
      while (endCol < 14 && board[endCol + 1][row].letter) {
        endCol++;
      }
      
      // Kelimeyi oluştur
      for (let col = startCol; col <= endCol; col++) {
        horizontalWord.push(board[row][col]);
      }
      
      // Kelime en az 2 harften oluşmalı
      if (horizontalWord.length >= 2) {
        words.push(horizontalWord);
        totalScore += calculateWordScore(horizontalWord);
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
          words.push(verticalWord);
          totalScore += calculateWordScore(verticalWord);
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
          words.push(verticalWord);
          totalScore += calculateWordScore(verticalWord);
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
            words.push(horizontalWord);
            totalScore += calculateWordScore(horizontalWord);
          }
        }
      }
    }
    
    return { words, score: totalScore };
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
      
      // Veritabanında sırayı güncelle
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        currentTurn: opponentId,
        lastMoveAt: serverTimestamp() // Hamle zamanını güncelle
      });
      
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
        text1: 'Geçersiz Hamle',
        text2: 'Lütfen en az bir harf yerleştirin veya Pas Geç butonunu kullanın',
        position: 'bottom',
      });
      return;
    }
    
    // İlk hamlede merkezi kareye yerleştirme kontrolü
    const isFirstMove = !hasPermanentLetter;
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
    
    // Oluşturulan kelime(ler)i bul
    const { words, score } = findWords(placedTiles);
    
    if (words.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Geçersiz Hamle',
        text2: 'Geçerli bir kelime oluşturulamadı',
        position: 'bottom',
      });
      return;
    }
    
    // Oyuncunun yeni puanını hesapla
    const userId = (user as any).uid;
    const newPlayerScore = (game.scores?.[userId] || 0) + score;
    
    console.log('🎮 Hamle puanı:', score);
    console.log('🎮 Toplam yeni puan:', newPlayerScore);
    
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
      
      // Rakip ID'sini al ve tip güvenliği sağla
      const opponentUserId = userId === game.creator ? game.opponent : game.creator;
      
      // Kontrol et: opponentUserId tanımlı mı?
      if (!opponentUserId) {
        throw new Error('Rakip bilgisi bulunamadı');
      }
      
      const playerRacks: Record<string, string[]> = { ...(game.playerRacks || {}) };
      playerRacks[userId] = newPlayerRack;
      
      // Puanları güncelle
      const updatedScores = { ...(game.scores || {}) };
      updatedScores[userId] = newPlayerScore;
      
      // Veritabanında güncelle
      await updateDoc(gameRef, {
        board: boardState,
        letterPool: tempLetterPool,
        playerRacks,
        currentTurn: opponentUserId,
        lastMoveAt: serverTimestamp(), // Hamle zamanını güncelle
        scores: updatedScores // Puanları güncelle
      });
      
      // Yerel durumu güncelle
      setLetterPool(tempLetterPool);
      setPlayerRack(newPlayerRack);
      setPlayerScore(newPlayerScore); // Oyuncunun puanını güncelle
      
      // Tüm yeni yerleştirilen harfleri kalıcı yap
      const newBoard = board.map(row => 
        row.map(tile => 
          tile.isPlaced ? { ...tile, isPlaced: false } : tile
        )
      );
      
      setBoard(newBoard);
      
      // Sırayı değiştir
      setIsMyTurn(false);
      
      Toast.show({
        type: 'success',
        text1: 'Hamle Tamamlandı',
        text2: `${score} puan kazandınız! Sıra rakibinize geçti`,
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