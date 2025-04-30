import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Şifre validasyonu için regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// E-posta validasyonu için regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kullanıcı türü tanımlaması
export interface UserData {
  username: string;
  email: string;
  uid: string;
  createdAt: Date;
}

// Kullanıcı adının benzersiz olup olmadığını kontrol et
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty;
  } catch (error) {
    throw error;
  }
};

// Kayıt ol
export const registerUser = async (username: string, email: string, password: string): Promise<FirebaseUser> => {
  try {
    // Form validasyonu
    if (!username || !email || !password) {
      throw new Error("Tüm alanları doldurun");
    }

    // Kullanıcı adı kontrolü
    const isAvailable = await isUsernameAvailable(username);
    if (!isAvailable) {
      throw new Error("Bu kullanıcı adı zaten kullanılıyor");
    }

    // E-posta formatı kontrolü
    if (!emailRegex.test(email)) {
      throw new Error("Geçerli bir e-posta adresi girin");
    }

    // Şifre kontrolü
    if (!passwordRegex.test(password)) {
      throw new Error("Şifre en az 8 karakter uzunluğunda olmalı, büyük/küçük harf ve rakam içermelidir");
    }

    // Firebase Auth ile kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Kullanıcı profilini güncelle
    await updateProfile(user, {
      displayName: username
    });

    // Firestore'a ek kullanıcı bilgilerini kaydet
    await setDoc(doc(db, 'users', user.uid), {
      username,
      email,
      uid: user.uid,
      createdAt: new Date()
    });

    return user;
  } catch (error) {
    throw error;
  }
};

// Giriş yap
export const signIn = async (username: string, password: string): Promise<FirebaseUser> => {
  try {
    // Username ile kullanıcıyı Firestore'dan bul
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("Kullanıcı bulunamadı");
    }
    
    // Kullanıcının email'ini al
    const userDoc = querySnapshot.docs[0].data() as UserData;
    const email = userDoc.email;
    
    // Email ve şifre ile giriş yap
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Çıkış yap
export const signOut = async (): Promise<boolean> => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
}; 