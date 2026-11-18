// --- Firebase 설정 및 연동 모듈 (Firebase Module) ---

import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import {
  getWords,
  setWords,
  getDeletedWords,
  normalizeWord,
  sortWords,
  saveToLocal,
  getAuthState
} from "./store.js";
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
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Realtime Database 모듈 지연 로딩 (초기 화면 렌더링 차단 방지)
let dbContextPromise = null;
const getDbContext = () => {
  if (!dbContextPromise) {
    dbContextPromise = import("firebase/database")
      .then((mod) => ({
        db: mod.getDatabase(app),
        ref: mod.ref,
        get: mod.get,
        set: mod.set
      }))
      .catch((err) => {
        dbContextPromise = null;
        throw err;
      });
  }
  return dbContextPromise;
};

// 중복 동기화 방지를 위한 진행 중 Promise
let activeSyncPromise = null;

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
    console.warn('업로드 차단됨: 인증되지 않은 사용자입니다.');
    return false;
  }
  try {
    const { db, ref, set } = await getDbContext();
    const dbRef = ref(db, 'vocaLog');
    await set(dbRef, getWords());
    return true;
  } catch (err) {
    console.error('Firebase 업로드 실패:', err);
    showToast('클라우드 저장 실패', 'error');
    return false;
  }
};

const isItemDeleted = (item, deletedWords) => {
  return deletedWords.has(item.id) || deletedWords.has(item.word);
};

// 두 단어 객체의 실질적 동일성 비교
const isWordEqual = (a, b) => {
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.word === b.word &&
    a.etymology === b.etymology &&
    a.example === b.example &&
    a.translation === b.translation &&
    a.pinned === b.pinned &&
    a.archived === b.archived &&
    a.updatedAt === b.updatedAt
  );
};

// 두 단어 배열(정규화된 상태)이 동일한지 비교
const areWordListsEqual = (listA, listB) => {
  if (listA.length !== listB.length) return false;
  const mapA = new Map(listA.map((w) => [w.id, w]));
  if (mapA.size !== listB.length) return false;
  for (const item of listB) {
    const counterpart = mapA.get(item.id);
    if (!isWordEqual(counterpart, item)) return false;
  }
  return true;
};

// Firebase와 양방향 동기화 (중복 호출 방지 + 변경 시에만 업로드/리렌더링)
export const syncWithFirebase = (onSyncSuccess, { silent = false } = {}) => {
  if (activeSyncPromise) return activeSyncPromise;

  const { isAuthorized } = getAuthState();
  if (!isAuthorized) {
    console.warn('동기화 차단됨: 인증되지 않은 사용자입니다.');
    return Promise.resolve({ changed: false, ok: false });
  }

  if (!silent) {
    showToast('동기화 중...', 'info');
  }

  activeSyncPromise = (async () => {
    try {
      const { db, ref, get } = await getDbContext();
      const dbRef = ref(db, 'vocaLog');
      const snapshot = await get(dbRef);
      const remoteData = snapshot.val();
      const deletedWords = getDeletedWords();
      const localWords = getWords();

      const remoteList = remoteData
        ? Object.keys(remoteData).map((key) => normalizeWord(remoteData[key])).filter(Boolean)
        : [];

      const mergedMap = new Map();

      localWords.forEach((raw) => {
        const item = normalizeWord(raw);
        if (item && !isItemDeleted(item, deletedWords)) {
          mergedMap.set(item.id, item);
        }
      });

      remoteList.forEach((item) => {
        if (isItemDeleted(item, deletedWords)) return;
        const existing = mergedMap.get(item.id);
        if (!existing || item.updatedAt >= existing.updatedAt) {
          mergedMap.set(item.id, item);
        }
      });

      const mergedWords = Array.from(mergedMap.values());
      const localChanged = !areWordListsEqual(localWords, mergedWords);
      const remoteChanged = !areWordListsEqual(remoteList, mergedWords);

      if (localChanged) {
        setWords(mergedWords);
        sortWords();
        saveToLocal();
      }

      let ok = true;
      if (remoteChanged) {
        ok = await uploadToFirebase();
      }

      if (ok) {
        if (!silent) {
          showToast(localChanged || remoteChanged ? '동기화 완료' : '이미 최신 상태입니다', 'success');
        } else if (localChanged) {
          showToast('최신 데이터 동기화 완료', 'success');
        }

        if (localChanged && onSyncSuccess) {
          onSyncSuccess({ changed: true });
        }
      }

      return { changed: localChanged, ok };
    } catch (err) {
      showToast('동기화 실패', 'error');
      console.error('Firebase 동기화 실패:', err);
      return { changed: false, ok: false };
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
};
