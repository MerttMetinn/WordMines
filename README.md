# WordMines

WordMines, kelime oluşturma ve stratejik düşünme becerilerini test eden, Türkçe dili için geliştirilmiş çevrimiçi bir kelime oyunudur. Scrabble/Kelime Avı tarzı mekaniklere sahip, kullanıcıların birbirleriyle rekabet ettiği bir mobil oyun uygulamasıdır.

## 💎 Özellikler

- **Çevrimiçi Çok Oyunculu Oyun**: Gerçek zamanlı olarak diğer oyuncularla oynayabilme
- **Kullanıcı Hesapları**: Kayıt olma, giriş yapma ve istatistikleri görüntüleme
- **Farklı Oyun Süreleri**: Kısa, normal veya uzun oyun süreleri arasında seçim yapabilme
- **Türkçe Kelime Desteği**: Türkçe alfabeye ve kelime dağarcığına uygun tasarım
- **Sürükleyici Arayüz**: Animasyonlar ve görsel efektlerle zenginleştirilmiş kullanıcı deneyimi
- **İstatistikler ve Sıralamalar**: Oyun istatistiklerini görme ve diğer oyuncularla karşılaştırma
- **Kelime Doğrulama**: Geçerli Türkçe kelimelerin otomatik kontrolü ve renkli geri bildirim
- **Puan Hesaplama**: Kelimeler için otomatik puan hesaplama ve gösterimi

## 📱 Ekran Görüntüleri
   Daha sonra eklenecek.
<!-- 
<div align="center">
   <table>
    <tr>
      <td align="center"><b>Giriş Ekranı</b></td>
      <td align="center"><b>Oyun Tahtası</b></td>
      <td align="center"><b>Skor Tablosu</b></td>
    </tr>
    <tr>
      <td><img src="docs/images/login.png" width="200"/></td>
      <td><img src="docs/images/game.png" width="200"/></td>
      <td><img src="docs/images/scores.png" width="200"/></td>
    </tr>
  </table>
</div>
-->

## 🎮 Nasıl Oynanır

1. Kayıt olun veya giriş yapın
2. Dashboard üzerinden "Yeni Oyun" seçeneğini kullanarak oyun başlatın
3. Oyun süresi seçeneğini belirleyin (kısa, normal, uzun)
4. Rakip bulma ekranında bekleyin 
5. Oyun başladığında size verilen 7 harften birini seçip tahtaya yerleştirin
6. Kelimeler oluşturmak için harfleri stratejik bir şekilde yerleştirin
7. Özel kareleri (H², H³, K², K³) kullanarak puanınızı artırın
8. Hamlenizi onaylamak için "ONAYLA" düğmesine basın
9. Sıra rakibinize geçecektir
10. Oyun, harfler bittiğinde veya her iki oyuncunun da süresi dolduğunda sona erer

## 📝 Kelime Yazma Kuralları

- Sıra sizde olduğunda, elinizdeki harflerle tahtada bulunan harflerden en az birine temas edecek şekilde kelime(ler) oluşturmalısınız
- Oluşturulan her yeni kelime birbirini takip eden harflerden oluşmalı ve yatay, dikey veya çapraz konumlandırılmalıdır
- Temas ettiğiniz komşu harflerle birden fazla anlamlı kelime oluşturabilirsiniz
- Yerleştirdiğiniz harflerle oluşturulan tüm kelimeler anlamlı olmalıdır:
  - **Geçerli kelimeler** yeşil renkle gösterilir
  - **Geçersiz kelimeler** kırmızı renkle gösterilir
- Kelimenin sağ altında, o kelimeden kazanacağınız toplam puan gösterilir

## 🌟 Özel Kare Tipleri

- **H²**: Harf puanını 2 katına çıkarır
- **H³**: Harf puanını 3 katına çıkarır
- **K²**: Kelime puanını 2 katına çıkarır
- **K³**: Kelime puanını 3 katına çıkarır
- **★**: Oyuna başlangıç noktası (ortadaki kare)

## 🚀 Kurulum

1. Depoyu klonlayın
   ```bash
   git clone https://github.com/username/wordmines.git
   cd wordmines
   ```

2. Bağımlılıkları yükleyin
   ```bash
   npm install
   ```

3. Uygulamayı başlatın
   ```bash
   npx expo start
   ```

## 🔧 Teknolojiler

- React Native / Expo
- TypeScript
- Firebase (Kimlik Doğrulama, Firestore)
- React Navigation / Expo Router
- Reanimated (Animasyonlar için)

## 📱 Desteklenen Platformlar

- Android
- iOS
- Web (Sınırlı Destek)

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Lütfen bir pull request göndermeden önce değişikliklerinizi tartışmak için bir issue açın.

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.

---

Wordmines Oyun Projesi © 2023-2024
