import { TileData, SpecialTileType, SPECIAL_TILES, LETTER_POINTS } from './gameConstants';
import { MineType, MineData, MINE_PROPERTIES, VISUAL_REWARD_PROPERTIES } from './gameConstants';

/**
 * Boş oyun tahtasını oluştur
 */
export const createEmptyBoard = (): TileData[][] => {
  const board = [];
  for (let row = 0; row < 15; row++) {
    const rowData = [];
    for (let col = 0; col < 15; col++) {
      const key = `${row},${col}`;
      rowData.push({
        row,
        col,
        type: SPECIAL_TILES[key] || SpecialTileType.NONE,
        letter: '',
        isPlaced: false
      });
    }
    board.push(rowData);
  }
  return board;
};

/**
 * Diziyi karıştırmak için yardımcı fonksiyon
 */
export const shuffleArray = <T extends any>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Özel kare tipine göre arka plan rengini döndür
 */
export const getSpecialTileColor = (type: SpecialTileType): string => {
  switch (type) {
    case SpecialTileType.DL:
      return '#0096c7'; // Canlı mavi
    case SpecialTileType.TL:
      return '#d442f5'; // Canlı mor
    case SpecialTileType.DW:
      return '#48bf53'; // Canlı yeşil
    case SpecialTileType.TW:
      return '#e07c39'; // Turuncu-kahve
    case SpecialTileType.STAR:
      return '#ffbc0a'; // Altın sarısı
    case SpecialTileType.REGION_BAN:
      return '#d0dbff'; // Belirgin mavi tonu (bölge yasağı)
    case SpecialTileType.LETTER_BAN:
      return '#ffcce6'; // Belirgin pembe tonu (harf yasağı)
    case SpecialTileType.EXTRA_MOVE:
      return '#fff2bf'; // Belirgin sarı tonu (ekstra hamle)
    default:
      return '#f8f9fa'; // Beyaza yakın
  }
};

/**
 * Bir kelimenin puanını hesaplar 
 * 
 * @param tiles Kelimeyi oluşturan kareler
 * @param bonusBlocker Bonus engelleyici aktif mi? True ise, katsayılar uygulanmaz
 * @returns Toplam puan
 */
export const calculateWordScore = (tiles: TileData[], bonusBlocker: boolean = false): number => {
  let wordMultiplier = 1;
  let totalScore = 0;
  
  // Önce her harfin puanını hesapla
  for (const tile of tiles) {
    let letterScore = tile.letter !== '*' ? LETTER_POINTS[tile.letter] : 0;
    
    // Harf çarpanlarını uygula - eğer bonus engelleyici aktif değilse
    if (!bonusBlocker) {
      switch (tile.type) {
        case SpecialTileType.DL:
          letterScore *= 2;
          break;
        case SpecialTileType.TL:
          letterScore *= 3;
          break;
        case SpecialTileType.DW:
          wordMultiplier *= 2;
          break;
        case SpecialTileType.TW:
          wordMultiplier *= 3;
          break;
      }
    }
    
    totalScore += letterScore;
  }
  
  // Kelime çarpanını uygula - eğer bonus engelleyici aktif değilse
  if (!bonusBlocker) {
    totalScore *= wordMultiplier;
  }
  
  return totalScore;
};

// Oyun başlangıcında rastgele mayınlar yerleştir
export const placeMines = (): Map<string, MineData> => {
  const mines: Map<string, MineData> = new Map();
  const usedPositions: Set<string> = new Set();
  
  // Özel kareleri (DL, TL, DW, TW, STAR) konumlarını kullanılmış olarak işaretle
  Object.entries(SPECIAL_TILES).forEach(([pos]) => {
    usedPositions.add(pos);
  });
  
  console.log('Özel kareler kullanılmış olarak işaretlendi:', Array.from(usedPositions));
  
  // Önce puan bölünmesi mayınları yerleştir
  const divisionMineCount = MINE_PROPERTIES[MineType.POINT_DIVISION].count;
  console.log(`${divisionMineCount} adet puan bölünmesi mayını yerleştiriliyor...`);
  for (let i = 0; i < divisionMineCount; i++) {
    placeMineAtRandomPosition(mines, usedPositions, MineType.POINT_DIVISION);
  }
  
  // Sonra puan transferi mayınları yerleştir
  const transferMineCount = MINE_PROPERTIES[MineType.POINT_TRANSFER].count;
  console.log(`${transferMineCount} adet puan transferi mayını yerleştiriliyor...`);
  for (let i = 0; i < transferMineCount; i++) {
    placeMineAtRandomPosition(mines, usedPositions, MineType.POINT_TRANSFER);
  }
  
  // Harf kaybı mayınları yerleştir
  const letterLossMineCount = MINE_PROPERTIES[MineType.LETTER_LOSS].count;
  console.log(`${letterLossMineCount} adet harf kaybı mayını yerleştiriliyor...`);
  for (let i = 0; i < letterLossMineCount; i++) {
    placeMineAtRandomPosition(mines, usedPositions, MineType.LETTER_LOSS);
  }
  
  // Ekstra hamle engeli mayınları yerleştir
  const bonusBlockerMineCount = MINE_PROPERTIES[MineType.BONUS_BLOCKER].count;
  console.log(`${bonusBlockerMineCount} adet ekstra hamle engeli mayını yerleştiriliyor...`);
  for (let i = 0; i < bonusBlockerMineCount; i++) {
    placeMineAtRandomPosition(mines, usedPositions, MineType.BONUS_BLOCKER);
  }
  
  // Kelime iptali mayınları yerleştir
  const wordCancelMineCount = MINE_PROPERTIES[MineType.WORD_CANCEL].count;
  console.log(`${wordCancelMineCount} adet kelime iptali mayını yerleştiriliyor...`);
  for (let i = 0; i < wordCancelMineCount; i++) {
    placeMineAtRandomPosition(mines, usedPositions, MineType.WORD_CANCEL);
  }
  
  console.log('Tüm mayınlar yerleştirildi, toplam:', mines.size);
  return mines;
};

// Rastgele bir konuma mayın yerleştir
const placeMineAtRandomPosition = (
  mines: Map<string, MineData>, 
  usedPositions: Set<string>, 
  type: MineType
) => {
  let row, col, position;
  
  // Kullanılmamış bir rastgele konum bul
  do {
    row = Math.floor(Math.random() * 15); // 0-14 arası
    col = Math.floor(Math.random() * 15); // 0-14 arası
    position = `${row},${col}`;
  } while (usedPositions.has(position));
  
  // Mayın konumu şimdi kullanılmış olarak işaretle
  usedPositions.add(position);
  
  // Mayın nesnesini oluştur ve ekle
  const mine: MineData = {
    type,
    row,
    col,
    isActive: true,
    isRevealed: true // Başlangıçta görünür
  };
  
  mines.set(position, mine);
  console.log(`Mayın yerleştirildi: pozisyon=${position}, tip=${type}`);
};

// Bir harf yerleştirildiğinde mayın kontrolü
export const checkMines = (
  row: number,
  col: number,
  mines: Map<string, MineData>,
): MineData | null => {
  const position = `${row},${col}`;
  const mine = mines.get(position);
  
  if (mine && mine.isActive) {
    return mine;
  }
  
  return null;
};

// Mayın tipine göre puan hesapla
export const calculateScoreWithMines = (
  wordScore: number,
  wordTiles: TileData[],
  mines: Map<string, MineData>
): { 
  score: number, 
  transferScore: number, 
  activatedMines: MineData[], 
  letterLossActive: boolean,
  bonusBlockerActive: boolean,
  wordCancelActive: boolean
} => {
  let finalScore = wordScore;
  let transferScore = 0;
  let letterLossActive = false;
  let bonusBlockerActive = false;
  let wordCancelActive = false;
  const activatedMines: MineData[] = [];
  
  // Kelimedeki her harf için mayın kontrolü yap
  for (const tile of wordTiles) {
    const position = `${tile.row},${tile.col}`;
    const mine = mines.get(position);
    
    if (mine && mine.isActive) {
      activatedMines.push(mine);
      
      // Mayın tipine göre puan hesapla
      if (mine.type === MineType.POINT_DIVISION) {
        // Puanın %30'unu al
        finalScore = Math.floor(wordScore * MINE_PROPERTIES[MineType.POINT_DIVISION].factor);
      } 
      else if (mine.type === MineType.POINT_TRANSFER) {
        // Puanın tamamını transfer et
        transferScore = wordScore;
        finalScore = 0;
      }
      else if (mine.type === MineType.LETTER_LOSS) {
        // Puanları etkileme, sadece harf kaybı flag'ini aktifleştir
        letterLossActive = true;
        // Puanları normal bırak
        finalScore = wordScore;
      }
      else if (mine.type === MineType.BONUS_BLOCKER) {
        // Bonus engelleyici - katsayıları/çarpanları iptal et
        bonusBlockerActive = true;
        // Bunu işaretliyoruz, ama asıl puan hesabı calculateWordScore'da yapılacak
      }
      else if (mine.type === MineType.WORD_CANCEL) {
        // Kelime iptali - kelimenin puanını 0 yap
        wordCancelActive = true;
        finalScore = 0;
      }
      
      // Birden fazla mayın aktifse, en son etkileyeni kullan (basitlik için)
      break;
    }
  }
  
  return { 
    score: finalScore, 
    transferScore, 
    activatedMines, 
    letterLossActive,
    bonusBlockerActive,
    wordCancelActive
  };
}; 