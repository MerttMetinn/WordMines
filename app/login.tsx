import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from './utils/auth';
import { useAuth } from './context/auth';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Kullanıcı zaten giriş yapmışsa yönlendir - useEffect içinde yapalım
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      
      if (!username || !password) {
        Toast.show({
          type: 'error',
          text1: 'Gerekli Alanlar',
          text2: 'Lütfen kullanıcı adı ve şifrenizi girin',
          position: 'bottom',
        });
        return;
      }
      
      // Giriş işlemini gerçekleştir
      await signIn(username, password);
      
      // Başarılı toast mesajı göster
      Toast.show({
        type: 'success',
        text1: 'Giriş Başarılı',
        text2: 'Hoş geldiniz! Yönlendiriliyorsunuz...',
        position: 'bottom',
        visibilityTime: 2000,
      });
      
      // Giriş başarılı, kontrol paneline yönlendir
      router.replace('/dashboard');
    } catch (error: any) {  // Tip belirtme eklendi
      // Hata mesajını kontrol et
      let errorMessage = 'Giriş sırasında bir hata oluştu';
      let toastType = 'error';
      
      // Kullanıcı bulunamadığında
      if (error.message === 'Kullanıcı bulunamadı') {
        errorMessage = `Kullanıcı adı "${username}" bulunamadı. Lütfen kullanıcı adınızı kontrol edin veya yeni bir hesap oluşturun.`;
        
        // Kayıt seçeneği sunan özel Toast göster
        Toast.show({
          type: 'error',
          text1: 'Kullanıcı Bulunamadı',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 4000,
          onPress: () => {
            Toast.hide();
            router.push('/register');
          },
        });
        
        // Kayıt ol seçeneği için ikinci bir toast
        setTimeout(() => {
          Toast.show({
            type: 'info',
            text1: 'Yeni hesap oluşturmak için dokunun',
            position: 'bottom',
            visibilityTime: 3000,
            onPress: () => {
              Toast.hide();
              router.push('/register');
            },
          });
        }, 4500);
      }
      // Yanlış şifre
      else if (error.code === 'auth/wrong-password' || error.message.includes('password')) {
        errorMessage = 'Şifre hatalı. Lütfen tekrar deneyin.';
        Toast.show({
          type: 'error',
          text1: 'Giriş Hatası',
          text2: errorMessage,
          position: 'bottom',
        });
      }
      // Firebase auth hatalarını kontrol et
      else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
        Toast.show({
          type: 'error',
          text1: 'Giriş Engellendi',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
      else {
        Toast.show({
          type: 'error',
          text1: 'Giriş Hatası',
          text2: errorMessage,
          position: 'bottom',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Yükleme durumu
  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Kullanıcı Adı"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.disabledButton]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
        <Text style={styles.link}>Hesabınız yok mu? Kayıt olun</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')} disabled={loading}>
        <Text style={styles.backButtonText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#007bff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6c757d',
    fontSize: 14,
  },
}); 