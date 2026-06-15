// --- Firebase 설정 및 연동 모듈 (Firebase Module) ---

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getWords, setWords, getDeletedWords, sortWords, saveToLocal, getAuthState } from "./store.js";
import { showToast } from "./toast.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Google 로그인
export const signInWithGoogle = async () => {
  return signInWithPopup(auth, googleProvider);
};

// 로그아웃
export const signOutUser = async () => {
  return signOut(auth);
};

// 인증 상태 변화 구독
export const onAuthChanged = (callback) => {
  onAuthStateChanged(auth, callback);
};

// Firebase로 데이터 업로드
export const uploadToFirebase = async () => {
  const { isAuthorized } = getAuthState();
  if (!isAuthorized) {
    console.warn('Upload blocked: User not authorized.');
    return;
  }
  try {
    const dbRef = ref(db, 'vocaLog');
    await set(dbRef, getWords());
  } catch (err) {
    console.error('Failed to upload to Firebase', err);
  }
};

// Firebase와 양방향 동기화
export const syncWithFirebase = async (onSyncSuccess) => {
  const { isAuthorized } = getAuthState();
  if (!isAuthorized) {
    console.warn('Sync blocked: User not authorized.');
    return;
  }
  showToast('동기화 중...', 'info');
  
  try {
    const dbRef = ref(db, 'vocaLog');
    const snapshot = await get(dbRef);
    const remoteData = snapshot.val();
    const deletedWords = getDeletedWords();
    let words = getWords();
    
    if (remoteData) {
      const remoteWordsMap = new Map();
      Object.keys(remoteData).forEach(key => {
        const item = remoteData[key];
        if (item && item.word) {
          remoteWordsMap.set(item.word, item);
        }
      });
      
      // 병합: 로컬 삭제 목록에 없는 것들만 병합 진행
      const mergedMap = new Map();
      words.forEach(w => {
        if (w && w.word && !deletedWords.has(w.word)) {
           mergedMap.set(w.word, w);
        }
      });
      remoteWordsMap.forEach((w, key) => {
        if (w && w.word && !deletedWords.has(key)) {
           mergedMap.set(key, w);
        }
      });
      
      const mergedWords = Array.from(mergedMap.values());
      setWords(mergedWords);
      sortWords();
      saveToLocal();
      
      await uploadToFirebase();
      
      showToast('동기화 완료', 'success');
      if (onSyncSuccess) onSyncSuccess();
    } else {
      await uploadToFirebase();
      showToast('동기화 완료', 'success');
    }
  } catch (err) {
    showToast('동기화 실패', 'error');
    console.error('Firebase Sync failed', err);
  }
};
