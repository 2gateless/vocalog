// --- VocaLog 상태 관리 (State Store) ---

export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const normalizeWord = (item) => {
  if (!item || !item.word) return null;
  return {
    id: item.id || item.word,
    word: String(item.word),
    etymology: item.etymology ? String(item.etymology) : '',
    example: item.example ? String(item.example) : '',
    translation: item.translation ? String(item.translation) : '',
    pinned: Boolean(item.pinned),
    archived: Boolean(item.archived),
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0
  };
};

const safeParseJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Failed to parse localStorage key "${key}":`, err);
    return fallback;
  }
};

const rawWords = safeParseJSON('voca_logs', []);
let words = Array.isArray(rawWords) ? rawWords.map(normalizeWord).filter(Boolean) : [];
let deletedWords = new Set(safeParseJSON('deleted_words', []));
let currentView = 'list'; // 'list', 'add', 'edit', 'detail', 'storage'
let currentData = null;
let isAuthorized = false;
let currentUser = null;

// 로컬 스토리지 저장 헬퍼
export const saveToLocal = () => {
  localStorage.setItem('voca_logs', JSON.stringify(words));
};

const saveDeletedToLocal = () => {
  localStorage.setItem('deleted_words', JSON.stringify(Array.from(deletedWords)));
};

// 단어 정렬 (핀 고정된 단어가 상단으로)
export const sortWords = () => {
  words.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
};

// Getter 및 Setter 함수 정의
export const getWords = () => words;
export const setWords = (newWords) => {
  words = Array.isArray(newWords) ? newWords.map(normalizeWord).filter(Boolean) : [];
};

export const getWordById = (id) => words.find(w => w.id === id) || null;

export const getDeletedWords = () => deletedWords;
export const addDeletedWord = (key) => {
  if (!key) return;
  deletedWords.add(key);
  saveDeletedToLocal();
};
export const removeDeletedWord = (key) => {
  if (!key || !deletedWords.has(key)) return;
  deletedWords.delete(key);
  saveDeletedToLocal();
};

export const getCurrentView = () => currentView;
export const setCurrentView = (view) => {
  currentView = view;
};

export const getCurrentData = () => currentData;
export const setCurrentData = (data) => {
  currentData = data;
};

export const getAuthState = () => ({
  isAuthorized,
  currentUser
});

export const setAuthState = (authorized, user) => {
  isAuthorized = authorized;
  currentUser = user;
};
