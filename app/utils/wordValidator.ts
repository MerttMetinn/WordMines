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
  
  // Harfleri görüntüle
  console.log(`📝 KONTROL: "${word}" - Harflerin kodları:`, Array.from(word).map(c => c.charCodeAt(0)));
  
  // Önce direkt kontrol et
  const originalWord = word.trim().toLowerCase();
  console.log(`📝 Orjinal kelime: "${originalWord}" (${originalWord.length} harf)`);
  
  // Kelime listesini kontrol et
  if (turkishWords.has(originalWord)) {
    console.log(`📝 Başarı! Kelime doğrudan bulundu: ${originalWord}`);
    return true;
  }
  
  // isValidWordWithDiacritics fonksiyonunu deneyelim
  if (isValidWordWithDiacritics(word)) {
    console.log(`📝 Başarı! isValidWordWithDiacritics ile bulundu: ${word}`);
    return true;
  }
  
  // Normalize edilmiş versiyonu deneyelim
  const normalizedWord = normalizeWord(originalWord);
  console.log(`📝 Normalize: "${normalizedWord}"`);
  
  // Normalize edilmiş hali kelime listesinde var mı?
  if (turkishWords.has(normalizedWord)) {
    console.log(`📝 Başarı! Normalize edilmiş haliyle bulundu: ${normalizedWord}`);
    return true;
  }
  
  // Farklı normalizasyon versiyonları deneyelim
  const altNormalized = originalWord
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/i̇/g, 'i') // gizli i işareti
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
  
  console.log(`📝 Alternatif normalize: "${altNormalized}"`);
  
  if (turkishWords.has(altNormalized)) {
    console.log(`📝 Başarı! Alternatif normalize ile bulundu: ${altNormalized}`);
    return true;
  }
  
  // Başarısız
  console.log(`📝 Başarısız! Kelime bulunamadı: ${word}`);
  
  return false;
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
  console.log(`📝 Diacritics kontrolü: "${originalWord}"`);
  
  if (turkishWords.has(originalWord)) {
    console.log(`📝 Diacritics - Doğrudan bulundu: ${originalWord}`);
    return true;
  }
  
  // Türkçe karakterleri normalize et ve tekrar kontrol et
  const normalizedWord = originalWord
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/i̇/g, 'i') // gizli i işareti
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
  
  console.log(`📝 Diacritics - Normalize: "${normalizedWord}"`);
  
  if (turkishWords.has(normalizedWord)) {
    console.log(`📝 Diacritics - Normalize ile bulundu: ${normalizedWord}`);
    return true;
  }
  
  return false;
};

// Kelimeler için normalize fonksiyonu
export const normalizeWord = (word: string): string => {
  return word
    .trim()
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/i̇/g, 'i') // gizli i işareti
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