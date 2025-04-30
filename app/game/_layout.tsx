import { Stack } from "expo-router";
import { useAuth } from "../context/auth";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function GameLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Kullanıcı giriş yapmamışsa ana sayfaya yönlendir
  useEffect(() => {
    if (!user && !loading) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return null; // Ana layout'taki yükleme ekranı gösterilecek
  }

  return (
    <Stack>
      <Stack.Screen name="waiting" options={{ headerShown: false, title: "Rakip Aranıyor" }} />
      <Stack.Screen name="play" options={{ headerShown: false, title: "WordMines - Oyun" }} />
      <Stack.Screen name="active-games" options={{ headerShown: false, title: "Aktif Oyunlar" }} />
      <Stack.Screen name="finished-games" options={{ headerShown: false, title: "Biten Oyunlar" }} />
    </Stack>
  );
} 