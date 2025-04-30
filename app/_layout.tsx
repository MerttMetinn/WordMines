import React, { useEffect, useState } from 'react';
import { Stack } from "expo-router";
import { AuthProvider } from "./context/auth";
import Toast, { BaseToast, ErrorToast, InfoToast, ToastProps } from 'react-native-toast-message';
import { View, Text } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import { loadTurkishWordList } from './utils/wordValidator';

// Özelleştirilmiş toast konfigürasyonu
const toastConfig = {
  success: (props: ToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#28a745', backgroundColor: '#f0f9f1' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  error: (props: ToastProps) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#dc3545', backgroundColor: '#fdf2f2' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
      text2NumberOfLines={3}
    />
  ),
  info: (props: ToastProps) => (
    <InfoToast
      {...props}
      style={{ borderLeftColor: '#007bff', backgroundColor: '#f0f7ff' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
};

// Splash ekranını otomatik kapanmayı engelle
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Uygulama başlangıcında kaynakları yükle
  useEffect(() => {
    async function prepareApp() {
      try {
        console.log('🔄 Uygulama kaynaklari yukleniyor...');
        
        // Kelime listesini yükle - tamamlanana kadar bekle
        const wordListLoaded = await loadTurkishWordList();
        if (!wordListLoaded) {
          console.warn('⚠️ Kelime listesi yuklenemedi!');
          // Kritik hata, kullanıcıya bildirim gösterilebilir
          // Yine de devam ediyoruz
        } else {
          console.log('✅ Kelime listesi başarıyla yüklendi');
        }
        
        // Diğer kaynakları yükleyebilirsiniz (örn. fontlar)
        // await Font.loadAsync({ ... });
        
        // Kısa bir gecikme ekleyerek splash'in görünmesini sağla
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn('❌ Uygulama hazirlama hatasi:', e);
      } finally {
        // Yükleme tamamlandı, hazır olduğunu bildir
        setAppIsReady(true);
      }
    }

    prepareApp();
  }, []);

  // Uygulama hazır olduğunda splash ekranını gizle
  useEffect(() => {
    if (appIsReady) {
      // Splash ekranını gizle
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Uygulama henüz hazır değilse boş bir ekran göster
  if (!appIsReady) {
    return null; // Splash ekranı gösteriliyor
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Giriş' }} />
        <Stack.Screen name="register" options={{ title: 'Kayıt Ol' }} />
        <Stack.Screen name="dashboard" options={{ 
          title: 'Ana Sayfa',
          headerBackVisible: false // Geri gitme butonunu kapat
        }} />
      </Stack>
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}
