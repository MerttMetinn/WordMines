import { TileData, SpecialTileType, SPECIAL_TILES, LETTER_POINTS } from './gameConstants';

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
    default:
      return '#f8f9fa'; // Beyaza yakın
  }
};

/**
 * Bir kelimenin puanını hesaplar 
 * 
 * @param tiles Kelimeyi oluşturan kareler
 * @returns Toplam puan
 */
export const calculateWordScore = (tiles: TileData[]): number => {
  let wordMultiplier = 1;
  let totalScore = 0;
  
  // Önce her harfin puanını hesapla
  for (const tile of tiles) {
    let letterScore = tile.letter !== '*' ? LETTER_POINTS[tile.letter] : 0;
    
    // Harf çarpanlarını uygula
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
    
    totalScore += letterScore;
  }
  
  // Kelime çarpanını uygula
  totalScore *= wordMultiplier;
  
  return totalScore;
}; 