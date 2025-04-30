import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TileData, SpecialTileType, LETTER_POINTS, TILE_SIZE } from '../../utils/gameConstants';
import { getSpecialTileColor, calculateWordScore } from '../../utils/gameHelpers';
import { isValidWord } from '../../utils/wordValidator';

interface BoardProps {
  board: TileData[][];
  isMyTurn: boolean;
  onTilePress: (tile: TileData) => void;
  selectedTile: TileData | null;
  selectedRackTile?: number | null;
  isAllowedSquare?: (tile: TileData) => boolean;
}

// Yeni yatay ve dikey kelime kontrol yapısı
interface WordInfo {
  word: string;
  tiles: TileData[];
  score: number;
  isValid: boolean;
}

const Board: React.FC<BoardProps> = ({ board, isMyTurn, onTilePress, selectedTile, selectedRackTile, isAllowedSquare }) => {
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
  
  // Tahtadaki yatay kelimeleri bulan fonksiyon
  const findHorizontalWords = (): WordInfo[] => {
    const result: WordInfo[] = [];
    
    for (let row = 0; row < board.length; row++) {
      let currentWord = "";
      let currentTiles: TileData[] = [];
      
      for (let col = 0; col < board[row].length; col++) {
        const tile = board[row][col];
        
        if (tile.letter) {
          currentWord += tile.letter;
          currentTiles.push(tile);
        } else {
          // Kelime en az 2 harf içeriyorsa kaydet
          if (currentWord.length >= 2) {
            const wordScore = calculateWordScore(currentTiles);
            // const valid = isValidWord(currentWord);  // Kelime kontrolü devre dışı
            const valid = true;  // Geçici olarak tüm kelimeleri geçerli kabul et
            
            result.push({
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
        // const valid = isValidWord(currentWord);  // Kelime kontrolü devre dışı
        const valid = true;  // Geçici olarak tüm kelimeleri geçerli kabul et
        
        result.push({
          word: currentWord,
          tiles: [...currentTiles],
          score: wordScore,
          isValid: valid
        });
      }
    }
    
    return result;
  };
  
  // Tahtadaki dikey kelimeleri bulan fonksiyon
  const findVerticalWords = (): WordInfo[] => {
    const result: WordInfo[] = [];
    
    for (let col = 0; col < board[0].length; col++) {
      let currentWord = "";
      let currentTiles: TileData[] = [];
      
      for (let row = 0; row < board.length; row++) {
        const tile = board[row][col];
        
        if (tile.letter) {
          currentWord += tile.letter;
          currentTiles.push(tile);
        } else {
          // Kelime en az 2 harf içeriyorsa kaydet
          if (currentWord.length >= 2) {
            const wordScore = calculateWordScore(currentTiles);
            // const valid = isValidWord(currentWord);  // Kelime kontrolü devre dışı
            const valid = true;  // Geçici olarak tüm kelimeleri geçerli kabul et
            
            result.push({
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
        // const valid = isValidWord(currentWord);  // Kelime kontrolü devre dışı
        const valid = true;  // Geçici olarak tüm kelimeleri geçerli kabul et
        
        result.push({
          word: currentWord,
          tiles: [...currentTiles],
          score: wordScore,
          isValid: valid
        });
      }
    }
    
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
      
      if (inHorizontalWord || inVerticalWord) {
        // Kelime kontrolü devre dışı bırakıldığı için tüm kelimeler geçerli sayılacak
        // ve her zaman yeşil renk dönecek
        /*
        // Herhangi bir kelimede geçersizse kırmızı yap
        if ((inHorizontalWord && !inHorizontalWord.isValid) || 
            (inVerticalWord && !inVerticalWord.isValid)) {
          return '#ffcccc'; // Kırmızı (geçersiz)
        }
        */
        
        return '#ccffcc'; // Yeşil (geçerli)
      }
      
      return '#fff0cc'; // Sarı (henüz bir kelime parçası değil)
    }
    
    // Normal dolmuş kare
    return '#d1ecff';
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
                // İzin verilen kareleri seçilebilir hale getir
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
                getSpecialTileIcon(tile.type)
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
  }
});

export default Board; 