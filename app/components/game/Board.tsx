import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TileData, SpecialTileType, LETTER_POINTS, TILE_SIZE, MineType, MineData, MINE_PROPERTIES, VISUAL_REWARD_PROPERTIES } from '../../utils/gameConstants';
import { getSpecialTileColor, calculateWordScore } from '../../utils/gameHelpers';
import { isValidWord, normalizeWord } from '../../utils/wordValidator';

interface BoardProps {
  board: TileData[][];
  isMyTurn: boolean;
  onTilePress: (tile: TileData) => void;
  selectedTile: TileData | null;
  selectedRackTile?: number | null;
  isAllowedSquare?: (tile: TileData) => boolean;
  mines?: Map<string, MineData>;  // Mayın bilgisi
}

// Yeni yatay ve dikey kelime kontrol yapısı
interface WordInfo {
  word: string;
  tiles: TileData[];
  score: number;
  isValid: boolean;
}

// Bazı manuel kelimeler 
const MANUAL_VALID_WORDS = ['kin', 'kın', 'at', 'el', 'göz', 'dil', 'kız'];

const Board: React.FC<BoardProps> = ({ board, isMyTurn, onTilePress, selectedTile, selectedRackTile, isAllowedSquare, mines }) => {
  // Tahtadaki kelimeler
  const [horizontalWords, setHorizontalWords] = useState<WordInfo[]>([]);
  const [verticalWords, setVerticalWords] = useState<WordInfo[]>([]);
  
  // Özel kare tipi ikonunu döndür
  const getSpecialTileIcon = (type: SpecialTileType): JSX.Element | null => {
    switch (type) {
      case SpecialTileType.DL:
        return <Text style={styles.specialTileText}>H²</Text>;
      case SpecialTileType.TL:
        return <Text style={styles.specialTileText}>H³</Text>;
      case SpecialTileType.DW:
        return <Text style={styles.specialTileText}>K²</Text>;
      case SpecialTileType.TW:
        return <Text style={styles.specialTileText}>K³</Text>;
      case SpecialTileType.STAR:
        return <Text style={styles.starTileText}>★</Text>;
      case SpecialTileType.REGION_BAN:
        return <Text style={[styles.rewardTileText, {color: VISUAL_REWARD_PROPERTIES[type].color}]}>{VISUAL_REWARD_PROPERTIES[type].icon}</Text>;
      case SpecialTileType.LETTER_BAN:
        return <Text style={[styles.rewardTileText, {color: VISUAL_REWARD_PROPERTIES[type].color}]}>{VISUAL_REWARD_PROPERTIES[type].icon}</Text>;
      case SpecialTileType.EXTRA_MOVE:
        return <Text style={[styles.rewardTileText, {color: VISUAL_REWARD_PROPERTIES[type].color}]}>{VISUAL_REWARD_PROPERTIES[type].icon}</Text>;
      default:
        return null;
    }
  };
  
  // Tahtadaki tüm anlamlı kelimeleri bul
  useEffect(() => {
    if (!isMyTurn) return; // Sadece bizim sıramızda kelime analizi yap
    
    // Tahta üzerindeki tüm kelimeleri bul
    findAllWords();
  }, [board, isMyTurn]);
  
  // Kelimeyi doğrula - özel manuel kontrolü de ekle
  const validateWord = (word: string): boolean => {
    // Kelimeyi loglayalım
    console.log(`📋 Tahta kelime kontrolü: "${word}"`);
    
    // Manuel kontrol
    if (MANUAL_VALID_WORDS.includes(word.toLowerCase()) || 
        MANUAL_VALID_WORDS.includes(normalizeWord(word))) {
      console.log(`📋 "${word}" manuel olarak geçerli kabul edildi!`);
      return true;
    }
    
    // Normal kontrol
    const result = isValidWord(word);
    console.log(`📋 "${word}" kontrol sonucu: ${result ? 'GEÇERLI ✓' : 'GEÇERSİZ ✗'}`);
    return result;
  };
  
  // Tahtadaki yatay kelimeleri bulan fonksiyon
  const findHorizontalWords = (): WordInfo[] => {
    const result: WordInfo[] = [];
    const candidateWords: WordInfo[] = []; // Aday kelimeleri saklayacak array
    
    for (let row = 0; row < board.length; row++) {
      let currentWord = "";
      let currentTiles: TileData[] = [];
      
      for (let col = 0; col < board[row].length; col++) {
        const tile = board[row][col];
        
        if (tile.letter) {
          currentWord += tile.letter;
          currentTiles.push(tile);
        } else {
          // Kelime en az 2 harf içeriyorsa aday olarak sakla
          if (currentWord.length >= 2) {
            const wordScore = calculateWordScore(currentTiles);
            const valid = validateWord(currentWord);
            
            candidateWords.push({
              word: currentWord,
              tiles: [...currentTiles],
              score: wordScore,
              isValid: valid
            });
          }
          
          // Sıfırla
          currentWord = "";
          currentTiles = [];
        }
      }
      
      // Satır sonundaki kelimeyi kontrol et
      if (currentWord.length >= 2) {
        const wordScore = calculateWordScore(currentTiles);
        const valid = validateWord(currentWord);
        
        candidateWords.push({
          word: currentWord,
          tiles: [...currentTiles],
          score: wordScore,
          isValid: valid
        });
      }
    }
    
    // Aday kelimeleri gruplandır (Aynı konumda başlayan kelimeler)
    const wordGroups: { [key: string]: WordInfo[] } = {};
    
    candidateWords.forEach(wordInfo => {
      if (wordInfo.tiles.length > 0) {
        const firstTile = wordInfo.tiles[0];
        const key = `${firstTile.row},${firstTile.col}`;
        
        if (!wordGroups[key]) {
          wordGroups[key] = [];
        }
        
        wordGroups[key].push(wordInfo);
      }
    });
    
    // Her grup için en uzun geçerli kelimeyi veya en uzun geçersiz kelimeyi seç
    Object.values(wordGroups).forEach(group => {
      if (group.length > 0) {
        // Uzunluğa göre sırala (en uzun başta)
        group.sort((a, b) => b.word.length - a.word.length);
        
        // Değişiklik: Tüm geçerli kelimeleri ekle
        const validWords = group.filter(w => w.isValid);
        
        if (validWords.length > 0) {
          // Tüm geçerli kelimeleri sonuç listesine ekle
          validWords.forEach(validWord => {
            result.push(validWord);
          });
        } else {
          // Geçerli kelime yoksa, en uzun geçersiz kelimeyi ekle
          result.push(group[0]);
        }
      }
    });
    
    return result;
  };
  
  // Tahtadaki dikey kelimeleri bulan fonksiyon
  const findVerticalWords = (): WordInfo[] => {
    const result: WordInfo[] = [];
    const candidateWords: WordInfo[] = []; // Aday kelimeleri saklayacak array
    
    for (let col = 0; col < board[0].length; col++) {
      let currentWord = "";
      let currentTiles: TileData[] = [];
      
      for (let row = 0; row < board.length; row++) {
        const tile = board[row][col];
        
        if (tile.letter) {
          currentWord += tile.letter;
          currentTiles.push(tile);
        } else {
          // Kelime en az 2 harf içeriyorsa aday olarak sakla
          if (currentWord.length >= 2) {
            const wordScore = calculateWordScore(currentTiles);
            const valid = validateWord(currentWord);
            
            candidateWords.push({
              word: currentWord,
              tiles: [...currentTiles],
              score: wordScore,
              isValid: valid
            });
          }
          
          // Sıfırla
          currentWord = "";
          currentTiles = [];
        }
      }
      
      // Sütun sonundaki kelimeyi kontrol et
      if (currentWord.length >= 2) {
        const wordScore = calculateWordScore(currentTiles);
        const valid = validateWord(currentWord);
        
        candidateWords.push({
          word: currentWord,
          tiles: [...currentTiles],
          score: wordScore,
          isValid: valid
        });
      }
    }
    
    // Aday kelimeleri gruplandır (Aynı konumda başlayan kelimeler)
    const wordGroups: { [key: string]: WordInfo[] } = {};
    
    candidateWords.forEach(wordInfo => {
      if (wordInfo.tiles.length > 0) {
        const firstTile = wordInfo.tiles[0];
        const key = `${firstTile.row},${firstTile.col}`;
        
        if (!wordGroups[key]) {
          wordGroups[key] = [];
        }
        
        wordGroups[key].push(wordInfo);
      }
    });
    
    // Her grup için en uzun geçerli kelimeyi veya en uzun geçersiz kelimeyi seç
    Object.values(wordGroups).forEach(group => {
      if (group.length > 0) {
        // Uzunluğa göre sırala (en uzun başta)
        group.sort((a, b) => b.word.length - a.word.length);
        
        // Değişiklik: Tüm geçerli kelimeleri ekle
        const validWords = group.filter(w => w.isValid);
        
        if (validWords.length > 0) {
          // Tüm geçerli kelimeleri sonuç listesine ekle
          validWords.forEach(validWord => {
            result.push(validWord);
          });
        } else {
          // Geçerli kelime yoksa, en uzun geçersiz kelimeyi ekle
          result.push(group[0]);
        }
      }
    });
    
    return result;
  };
  
  // Tüm kelimeleri bul ve state'i güncelle
  const findAllWords = () => {
    const hWords = findHorizontalWords();
    const vWords = findVerticalWords();
    
    // Değişiklik varsa veya kelime sayısı değiştiyse loglama
    const wordsChanged = 
      horizontalWords.length !== hWords.length || 
      verticalWords.length !== vWords.length ||
      JSON.stringify(horizontalWords) !== JSON.stringify(hWords) ||
      JSON.stringify(verticalWords) !== JSON.stringify(vWords);
    
    setHorizontalWords(hWords);
    setVerticalWords(vWords);
    
    // Sadece kelimeler değiştiğinde log
    if (wordsChanged) {
      console.log(`📝 ${hWords.length} yatay, ${vWords.length} dikey kelime bulundu`);
    }
  };
  
  // Kare bir kelimeye ait mi? 
  const isTileInWord = (tile: TileData, words: WordInfo[]): { isValid: boolean, score: number } | null => {
    for (const wordInfo of words) {
      const tileInWord = wordInfo.tiles.find(t => t.row === tile.row && t.col === tile.col);
      if (tileInWord) {
        return { 
          isValid: wordInfo.isValid,
          score: wordInfo.score
        };
      }
    }
    return null;
  };
  
  // Karenin rengini belirle (geçerli/geçersiz kelime renklendirmesi)
  const getTileColor = (tile: TileData) => {
    if (!tile.letter) {
      // Boş kare - özel kare rengini kullan ama izin verilen kareyse belirgin yap
      const baseColor = getSpecialTileColor(tile.type);
      
      // İzin verilen kareleri belirginleştir
      if (isMyTurn && isAllowedSquare && isAllowedSquare(tile)) {
        // Daha parlak ve belirgin bir renk tonu
        return tile.type === SpecialTileType.STAR 
          ? '#ffe0a6' // Yıldız için özel renk
          : '#e6ffe6'; // Diğer izin verilen kareler için yeşilimsi renk
      }
      
      return baseColor;
    }
    
    // Bu kare yeni yerleştirilmiş mi?
    if (tile.isPlaced) {
      // Kare bir kelimeye ait mi kontrol et
      const inHorizontalWord = isTileInWord(tile, horizontalWords);
      const inVerticalWord = isTileInWord(tile, verticalWords);
      
      // Bir harfin ait olduğu TÜM kelimeleri kontrol edelim
      const allWordsWithTile = [...horizontalWords, ...verticalWords].filter(wordInfo => {
        return wordInfo.tiles.some(t => t.row === tile.row && t.col === tile.col);
      });
      
      // Değişiklik: Bir harf, en az bir geçerli kelimeye ait olduğunda geçerli kabul edilir
      const atLeastOneValidWord = allWordsWithTile.some(w => w.isValid);
      
      if (allWordsWithTile.length > 0) {
        // Kelimeler bulundu, geçerli mi kontrol et
        if (atLeastOneValidWord) {
          return '#ccffcc'; // Yeşil (geçerli)
        } else {
          return '#ffcccc'; // Kırmızı (geçersiz) - hiç geçerli kelime yok
        }
      }
      
      return '#fff0cc'; // Sarı (henüz bir kelime parçası değil)
    }
    
    // Normal dolmuş kare
    return '#d1ecff';
  };
  
  // Mayın ikonunu döndür
  const getMineIcon = (row: number, col: number): JSX.Element | null => {
    if (!mines) {
      console.log('Mines prop is undefined');
      return null;
    }
    
    const position = `${row},${col}`;
    const mine = mines.get(position);
    
    // Debug bilgisi ekleyelim - hangi mayının nerede olduğunu görelim
    if (mine) {
      console.log(`[${row},${col}] koordinatında ${mine.type} tipinde mayın var. Aktif: ${mine.isActive}, Görünür: ${mine.isRevealed}`);
    }
    
    if (mine && mine.isRevealed) {
      console.log(`Mayın gösteriliyor: ${position}, tip=${mine.type}`);
      
      // Mayın tipi için özellikler mevcut mu kontrol et
      if (mine.type !== MineType.NONE && MINE_PROPERTIES[mine.type]) {
        const mineProps = MINE_PROPERTIES[mine.type];
        return (
          <View style={[styles.mineContainer, { backgroundColor: mineProps.color }]}>
            <Text style={styles.mineIcon}>{mineProps.icon}</Text>
          </View>
        );
      } else {
        console.error(`Bilinmeyen mayın tipi: ${mine.type}`);
      }
    }
    
    return null;
  };

  return (
    <View style={styles.boardContainer}>
      {/* Kelime puanı göstergesi */}
      {isMyTurn && horizontalWords.length + verticalWords.length > 0 && (
        <View style={styles.wordScoreInfo}>
          {horizontalWords.filter(w => w.isValid).map((word, index) => (
            <Text key={`h-${index}`} style={[
              styles.wordScoreText,
              word.isValid ? styles.validWordText : styles.invalidWordText
            ]}>
              {word.word}: {word.score} puan
            </Text>
          ))}
          {verticalWords.filter(w => w.isValid).map((word, index) => (
            <Text key={`v-${index}`} style={[
              styles.wordScoreText,
              word.isValid ? styles.validWordText : styles.invalidWordText
            ]}>
              {word.word}: {word.score} puan
            </Text>
          ))}
        </View>
      )}
      
      {/* Tahta */}
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.boardRow}>
          {row.map((tile) => (
            <TouchableOpacity
              key={`tile-${tile.row}-${tile.col}`}
              style={[
                styles.tile,
                { backgroundColor: getTileColor(tile) },
                selectedTile?.row === tile.row && selectedTile?.col === tile.col && styles.selectedTile,
                isMyTurn && 
                selectedRackTile !== null && 
                isAllowedSquare && 
                isAllowedSquare(tile) && 
                styles.allowedTile
              ]}
              onPress={() => onTilePress(tile)}
              disabled={!isMyTurn || (selectedRackTile !== null && isAllowedSquare && !isAllowedSquare(tile))}
            >
              {tile.letter ? (
                <View style={styles.letterContainer}>
                  <Text style={styles.letterText}>{tile.letter}</Text>
                  <Text style={styles.pointText}>
                    {tile.letter !== '*' ? LETTER_POINTS[tile.letter] : 0}
                  </Text>
                </View>
              ) : (
                <>
                  {getMineIcon(tile.row, tile.col) || getSpecialTileIcon(tile.type)}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  boardRow: {
    flexDirection: 'row',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  filledTile: {
    backgroundColor: '#d1ecff',
    borderColor: '#99c2ff',
  },
  placedTile: {
    backgroundColor: '#bfe5ff',
    borderColor: '#1a85ff',
    borderWidth: 2,
  },
  selectedTile: {
    borderWidth: 2,
    borderColor: '#1a85ff',
  },
  allowedTile: {
    borderWidth: 2,
    borderColor: '#28a745',
    borderStyle: 'dashed',
  },
  letterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  letterText: {
    fontSize: TILE_SIZE * 0.5,
    fontWeight: 'bold',
    color: '#222',
  },
  pointText: {
    fontSize: TILE_SIZE * 0.3,
    color: '#444',
    position: 'absolute',
    bottom: 1,
    right: 2,
  },
  specialTileText: {
    fontSize: TILE_SIZE * 0.4,
    fontWeight: 'bold',
    color: '#333',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  starTileText: {
    fontSize: TILE_SIZE * 0.7,
    fontWeight: 'bold',
    color: '#ff6600',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  rewardTileText: {
    fontSize: TILE_SIZE * 0.6,
    fontWeight: 'bold',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  wordScoreInfo: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  wordScoreText: {
    fontSize: 12,
    marginBottom: 2,
  },
  validWordText: {
    color: '#28a745',
  },
  invalidWordText: {
    color: '#dc3545',
  },
  mineContainer: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    opacity: 0.7,
  },
  mineIcon: {
    fontSize: TILE_SIZE * 0.5,
    fontWeight: 'bold',
  },
});

export default Board; 