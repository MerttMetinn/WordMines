import { Dimensions } from 'react-native';

// Ekran genişliğini al
export const SCREEN_WIDTH = Dimensions.get('window').width;
// Kare boyutunu belirle (ekrana sığacak şekilde)
export const TILE_SIZE = Math.min(SCREEN_WIDTH / 15 - 2, 30);

// Türkçe harflerin puanları
export const LETTER_POINTS: Record<string, number> = {
  'A': 1, 'B': 3, 'C': 4, 'Ç': 4, 'D': 3, 'E': 1, 'F': 7, 'G': 5,
  'Ğ': 8, 'H': 5, 'I': 2, 'İ': 1, 'J': 10, 'K': 1, 'L': 1, 'M': 2,
  'N': 1, 'O': 2, 'Ö': 7, 'P': 5, 'R': 1, 'S': 2, 'Ş': 4, 'T': 1,
  'U': 2, 'Ü': 3, 'V': 7, 'Y': 3, 'Z': 4,
};

// Türkçe harflerin oyundaki adetleri
export const LETTER_COUNTS: Record<string, number> = {
  'A': 12, 'B': 2, 'C': 2, 'Ç': 2, 'D': 2, 'E': 8, 'F': 1, 'G': 1,
  'Ğ': 1, 'H': 1, 'I': 4, 'İ': 7, 'J': 1, 'K': 7, 'L': 7, 'M': 4,
  'N': 5, 'O': 3, 'Ö': 1, 'P': 1, 'R': 6, 'S': 3, 'Ş': 2, 'T': 5,
  'U': 3, 'Ü': 2, 'V': 1, 'Y': 2, 'Z': 2,
};

// Özel kare türleri
export enum SpecialTileType {
  NONE = 'none',
  DL = 'dl', // Double Letter (Harf 2 kat)
  TL = 'tl', // Triple Letter (Harf 3 kat)
  DW = 'dw', // Double Word (Kelime 2 kat)
  TW = 'tw', // Triple Word (Kelime 3 kat)
  STAR = 'star', // Başlangıç yıldızı
  REGION_BAN = 'region_ban', // Bölge Yasağı (Görsel ödül)
  LETTER_BAN = 'letter_ban', // Harf Yasağı (Görsel ödül)
  EXTRA_MOVE = 'extra_move' // Ekstra Hamle Jokeri (Görsel ödül)
}

// Her bir karenin bilgisini saklayan tip
export interface TileData {
  row: number;
  col: number;
  type: SpecialTileType;
  letter: string;
  isPlaced: boolean; // Bu tur yerleştirildi mi?
}

// Görsel ödül kareleri (işlevsiz)
export const VISUAL_REWARD_COORDINATES = {
  [SpecialTileType.REGION_BAN]: [
    [0, 0], [14, 14] // Köşelerde (2 adet)
  ],
  [SpecialTileType.LETTER_BAN]: [
    [0, 7], [7, 0], [14, 7] // Kenarların ortasında (3 adet)
  ],
  [SpecialTileType.EXTRA_MOVE]: [
    [0, 3], [14, 11] // Kenarların çeyreklerinde (2 adet)
  ]
};

// Görsel ödül özellikleri
export const VISUAL_REWARD_PROPERTIES = {
  [SpecialTileType.REGION_BAN]: {
    icon: '🚷', // Bölge yasağı simgesi
    color: '#3366cc',
    name: 'Bölge Yasağı'
  },
  [SpecialTileType.LETTER_BAN]: {
    icon: '🔤', // Harf yasağı simgesi
    color: '#ff3399',
    name: 'Harf Yasağı'
  },
  [SpecialTileType.EXTRA_MOVE]: {
    icon: '🎲', // Ekstra hamle simgesi
    color: '#ffcc00',
    name: 'Ekstra Hamle Jokeri'
  }
};

// Özel karelerin koordinatları
// Matris 15x15 olduğu için 0-14 arası koordinatlar
export const SPECIAL_TILES: Record<string, SpecialTileType> = {};

// Harf 2 kat (H²) kareleri
export const DL_COORDINATES = [
  [0, 5], [0, 9], [1, 6], [1, 8], [5, 0], [5, 5], 
  [5, 9], [5, 14], [6, 1], [6, 6], [6, 8], [6, 13], [8, 1], [8, 6], 
  [8, 8], [8, 13], [9, 0], [9, 5], [9, 9], [9, 14], [13, 6], [13, 8], 
  [14, 5], [14, 9]
];

// Harf 3 kat (H³) kareleri
export const TL_COORDINATES = [
  [1, 1], [1, 13], [4, 4], [4, 10], [10, 4], [10, 10], [13, 1], [13, 13]
];

// Kelime 2 kat (K²) kareleri
export const DW_COORDINATES = [
  [2, 7], [3, 3], [3, 11], [7, 2], [7, 7], [7, 12], [11, 3], [11, 11], [12, 7]
];

// Kelime 3 kat (K³) kareleri
export const TW_COORDINATES = [
  [0, 2], [0, 12], [2, 0], [2, 14], [12, 0], [12, 14], [14, 2], [14, 12]
];

// Yıldız (başlangıç) karesi
export const STAR_COORDINATE = [7, 7];

// Özel kare koordinatlarını kaydet
DL_COORDINATES.forEach(([row, col]) => {
  SPECIAL_TILES[`${row},${col}`] = SpecialTileType.DL;
});

TL_COORDINATES.forEach(([row, col]) => {
  SPECIAL_TILES[`${row},${col}`] = SpecialTileType.TL;
});

DW_COORDINATES.forEach(([row, col]) => {
  SPECIAL_TILES[`${row},${col}`] = SpecialTileType.DW;
});

TW_COORDINATES.forEach(([row, col]) => {
  SPECIAL_TILES[`${row},${col}`] = SpecialTileType.TW;
});

SPECIAL_TILES[`${STAR_COORDINATE[0]},${STAR_COORDINATE[1]}`] = SpecialTileType.STAR;

// Görsel ödül karelerini ekle
Object.entries(VISUAL_REWARD_COORDINATES).forEach(([type, coordinates]) => {
  coordinates.forEach(([row, col]) => {
    SPECIAL_TILES[`${row},${col}`] = type as SpecialTileType;
  });
});

// Mayın türleri
export enum MineType {
  NONE = 'NONE',
  POINT_DIVISION = 'POINT_DIVISION', // Puan Bölünmesi - puanın %30'unu alır
  POINT_TRANSFER = 'POINT_TRANSFER', // Puan Transferi - puanı rakibe verir
  LETTER_LOSS = 'LETTER_LOSS', // Harf Kaybı - elindeki harfleri kaybet ve yeni 7 harf al
  BONUS_BLOCKER = 'BONUS_BLOCKER', // Ekstra Hamle Engeli - harf ve kelime katlarını iptal eder
  WORD_CANCEL = 'WORD_CANCEL', // Kelime İptali - kelimeden hiç puan alınmaz
}

export interface MineData {
  type: MineType;
  row: number;
  col: number;
  isActive: boolean; // Mayın aktif mi?
  isRevealed: boolean; // Mayın görünür mü?
}

// Mayın özellikleri
export const MINE_PROPERTIES = {
  [MineType.POINT_DIVISION]: {
    count: 5, // Oyun başına 5 adet
    factor: 0.3, // Puanın %30'unu alır
    icon: '💥', // Puan bölünmesi simgesi
    color: '#ff6666',
  },
  [MineType.POINT_TRANSFER]: {
    count: 4, // Oyun başına 4 adet
    factor: 0, // Hiç puan almaz, transfer eder
    icon: '⚡', // Puan transferi simgesi
    color: '#ff9900',
  },
  [MineType.LETTER_LOSS]: {
    count: 3, // Oyun başına 3 adet (istenildiği gibi)
    factor: 1, // Puanın tamamını al
    icon: '🔄', // Harf yenileme simgesi
    color: '#9900ff',
  },
  [MineType.BONUS_BLOCKER]: {
    count: 2, // Oyun başına 2 adet (istenildiği gibi)
    factor: 1, // Puanın tamamını al (katsız)
    icon: '❌', // Engelleme simgesi
    color: '#33cc33',
  },
  [MineType.WORD_CANCEL]: {
    count: 2, // Oyun başına 2 adet (istenildiği gibi)
    factor: 0, // Hiç puan almaz
    icon: '🚫', // İptal simgesi
    color: '#cc0000',
  },
}; 