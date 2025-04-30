import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Türkçe kelimelerin listesi
let turkishWords: Set<string>;

// Global Promise - kelime listesi yükleme işlemi için
export let wordListReady: Promise<boolean> | undefined;

/**
 * Türkçe kelime listesini yükler - bir kere yükleyip paylaşır
 * 
 * @returns Promise<boolean> - Yükleme başarılı oldu mu?
 */
export const loadTurkishWordList = (): Promise<boolean> => {
  // Zaten yükleme başlatıldıysa, aynı Promise'ı döndür
  if (wordListReady) {
    return wordListReady;
  }

  // Yükleme Promise'ını oluştur ve başlat
  wordListReady = (async (): Promise<boolean> => {
    try {
      console.log('📝 Kelime listesi yukleniyor...');

      // Zaten yüklendiyse tekrar yükleme
      if (turkishWords) {
        console.log('📝 Kelime listesi zaten yuklu');
        return true;
      }

      // Asset'ten kelime listesini yükle - metro.config.js içinde .txt tanımlandı
      const asset = Asset.fromModule(require('../../assets/wordlist.txt'));
      await asset.downloadAsync();

      // OTA update veya web için uri kontrolü
      const uri = asset.localUri ?? asset.uri;
      if (!uri) {
        throw new Error('Asset uri yuklenemedi');
      }

      console.log('📝 Kelime listesi dosyasi okunuyor...');
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Satırlara böl, boş ve 1 karakterli satırları atla
      const wordArray = fileContent
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word && word.length > 1);

      // Set olarak kaydet
      turkishWords = new Set(wordArray);

      console.log(`📝 ${turkishWords.size} kelime yuklendi`);
      return true;
    } catch (error) {
      console.error('❌ Kelime listesi yukleme hatasi:', error);
      return false;
    }
  })();

  return wordListReady;
};

/**
 * Kelime geçerli mi kontrol eder
 * 
 * @param word Kontrol edilecek kelime
 * @returns Boolean - Kelime geçerli mi?
 */
export const isValidWord = (word: string): boolean => {
  if (!turkishWords) {
    console.warn('📝 Uyari: Kelime listesi yuklenmemis!');
    return false; // Üretimde false döndürerek hileyi engelle
  }
  
  const normalizedWord = word.trim().toLowerCase();
  return normalizedWord.length > 1 && turkishWords.has(normalizedWord);
};

/**
 * Türkçe karakter içeren kelimeleri tanıyabilmek için yardımcı fonksiyon
 * 
 * @param word Kontrol edilecek kelime
 * @returns Boolean - Kelime geçerli mi?
 */
export const isValidWordWithDiacritics = (word: string): boolean => {
  if (!turkishWords) {
    console.warn('📝 Uyari: Kelime listesi yuklenmemis!');
    return false; // Üretimde false döndürerek hileyi engelle
  }
  
  // Önce direkt kelimeyi kontrol et
  const originalWord = word.trim().toLowerCase();
  if (turkishWords.has(originalWord)) {
    return true;
  }
  
  // Türkçe karakterleri normalize et ve tekrar kontrol et
  const normalizedWord = originalWord
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
  
  return turkishWords.has(normalizedWord);
};

// Kelimeler için normalize fonksiyonu
export const normalizeWord = (word: string): string => {
  return word
    .trim()
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
};

export default {
  loadTurkishWordList,
  isValidWord,
  isValidWordWithDiacritics,
  wordListReady
}; 