import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { registerUser } from './utils/auth';
import { useAuth } from './context/auth';
import Toast from 'react-native-toast-message';

// E-posta validasyonu için gelişmiş regex
// Daha güçlü: domain ve TLD kontrolü eklenmiş
// .edu, .edu.tr gibi alanlar için ek destek
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|edu\.tr|[a-zA-Z]{2,})$/;

// E-posta örneği ve format bilgisi
const EMAIL_EXAMPLE = "yazlab2@kocaeli.edu.tr";
const EMAIL_FORMAT_INFO = "Örnek: kullanici@domain.com veya kullanici@universite.edu.tr";

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Email değiştiğinde kontrol et
  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Email boş değilse ve geçersizse hata göster
    if (text) {
      if (!emailRegex.test(text)) {
        setEmailError(true);
        // Formata göre hata mesajı belirle
        if (!text.includes('@')) {
          setEmailErrorMessage('E-posta @ karakteri içermelidir');
        } else if (!text.includes('.')) {
          setEmailErrorMessage('E-posta geçerli bir domain içermelidir');
        } else {
          setEmailErrorMessage(`Geçersiz e-posta formatı. ${EMAIL_FORMAT_INFO}`);
        }
      } else {
        setEmailError(false);
        setEmailErrorMessage('');
      }
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }
  };

  // Kullanıcı zaten giriş yapmışsa yönlendir - useEffect içinde yapalım
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      // Temel kontroller
      if (!username || !email || !password || !confirmPassword) {
        Toast.show({
          type: 'error',
          text1: 'Eksik Bilgi',
          text2: 'Lütfen tüm alanları doldurun',
          position: 'bottom',
        });
        setLoading(false);
        return;
      }
      
      // E-posta formatı kontrolü
      if (!emailRegex.test(email)) {
        Toast.show({
          type: 'error',
          text1: 'Geçersiz E-posta',
          text2: `Lütfen geçerli bir e-posta adresi girin. ${EMAIL_FORMAT_INFO}`,
          position: 'bottom',
          visibilityTime: 4000,
        });
        setLoading(false);
        setEmailError(true);
        setEmailErrorMessage(`Geçersiz e-posta formatı. ${EMAIL_FORMAT_INFO}`);
        return;
      }
      
      if (password !== confirmPassword) {
        Toast.show({
          type: 'error',
          text1: 'Şifre Hatası',
          text2: 'Şifreler eşleşmiyor',
          position: 'bottom',
        });
        setLoading(false);
        return;
      }
      
      // Kayıt işlemini gerçekleştir
      const newUser = await registerUser(username, email, password);
      
      // Kullanıcı oluşturma başarılıysa dashboard'a yönlendir
      if (newUser) {
        // Başarılı kayıt toast mesajı
        Toast.show({
          type: 'success',
          text1: 'Kayıt Başarılı',
          text2: `Hoş geldiniz, ${username}! Dashboard'a yönlendiriliyorsunuz.`,
          position: 'bottom',
          visibilityTime: 3000,
        });
        
        // Direkt olarak dashboard'a yönlendir
        router.replace('/dashboard');
      } else {
        // Sanırım bu duruma hiç düşmemeli, ama önlem amaçlı login sayfasına yönlendir
        Toast.show({
          type: 'success',
          text1: 'Kayıt Başarılı',
          text2: 'Hesabınız oluşturuldu. Lütfen giriş yapın.',
          position: 'bottom',
          visibilityTime: 3000,
        });
        
        // Kısa bir bekleme sonrası yönlendir
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error: any) {  // Tip belirtme eklendi
      // Hata mesajını kontrol et
      let errorMessage = 'Kayıt sırasında bir hata oluştu';
      
      // Kullanıcı adı hatası
      if (error.message === 'Bu kullanıcı adı zaten kullanılıyor') {
        errorMessage = `"${username}" kullanıcı adı başka bir kullanıcı tarafından kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.`;
        Toast.show({
          type: 'error',
          text1: 'Kullanıcı Adı Hatası',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
      // Email hatası
      else if (error.message.includes('e-posta') || error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda veya geçerli değil. Lütfen farklı bir e-posta adresi kullanın.';
        Toast.show({
          type: 'error',
          text1: 'E-posta Hatası',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 4000,
        });
        setEmailError(true);
      }
      // Şifre hatası
      else if (error.message.includes('Şifre')) {
        errorMessage = error.message;
        Toast.show({
          type: 'error',
          text1: 'Şifre Hatası',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
      // Firebase auth hatalarını kontrol et
      else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.';
        Toast.show({
          type: 'error',
          text1: 'Şifre Hatası',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
      else {
        Toast.show({
          type: 'error',
          text1: 'Kayıt Hatası',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 3000,
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Hesap Oluştur</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TextInput
          style={[
            styles.input, 
            emailError && styles.inputError
          ]}
          placeholder={`E-posta`}
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        
        {/* E-posta hata mesajı gösterimi */}
        {emailError && emailErrorMessage ? (
          <Text style={styles.helperText}>{emailErrorMessage}</Text>
        ) : null}
        
        <TextInput
          style={styles.input}
          placeholder="Şifre (en az 8 karakter, büyük/küçük harf ve rakam)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre Tekrar"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
          <Text style={styles.link}>Zaten bir hesabınız var mı? Giriş yapın</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/login')} disabled={loading}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#28a745',
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
  helperText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
}); 