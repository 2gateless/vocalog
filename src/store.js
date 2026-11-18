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
    console.error(`로컬 스토리지 키("${key}") 파싱 실패:`, err);
    return fallback;
  }
};

const rawWords = safeParseJSON('voca_logs', []);
let words = Array.isArray(rawWords) ? rawWords.map(normalizeWord).filter(Boolean) : [];
// O(1) 조회를 위한 ID 인덱스 맵
let wordMap = new Map(words.map((w) => [w.id, w]));

let deletedWords = new Set(safeParseJSON('deleted_words', []));
let currentView = 'list'; // 'list', 'add', 'edit', 'detail', 'storage'
let currentData = null;
let isAuthorized = false;
let currentUser = null;

// 인덱스 맵 재구성 헬퍼
const rebuildWordMap = () => {
  wordMap = new Map(words.map((w) => [w.id, w]));
};

// 로컬 스토리지 저장 헬퍼 (용량 초과 등 예외 방어)
export const saveToLocal = () => {
  try {
    localStorage.setItem('voca_logs', JSON.stringify(words));
  } catch (err) {
    console.error('단어 목록 로컬 저장 실패:', err);
  }
};

const saveDeletedToLocal = () => {
  try {
    localStorage.setItem('deleted_words', JSON.stringify(Array.from(deletedWords)));
  } catch (err) {
    console.error('삭제 목록 로컬 저장 실패:', err);
  }
};

// 단어 정렬 (핀 고정 우선, 동일 그룹 내에서는 최신 수정순)
export const sortWords = () => {
  words.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
};

// Getter 및 Setter 함수 정의
export const getWords = () => words;

export const setWords = (newWords) => {
  words = Array.isArray(newWords) ? newWords.map(normalizeWord).filter(Boolean) : [];
  rebuildWordMap();
};

export const getWordById = (id) => wordMap.get(id) || null;

// 단어 추가 또는 갱신 시 배열과 인덱스 맵을 함께 동기화
export const upsertWord = (wordObj) => {
  const normalized = normalizeWord(wordObj);
  if (!normalized) return null;

  const idx = words.findIndex((w) => w.id === normalized.id);
  if (idx !== -1) {
    words[idx] = normalized;
  } else {
    words.unshift(normalized);
  }
  wordMap.set(normalized.id, normalized);
  return normalized;
};

// ID로 단어 삭제 시 배열과 인덱스 맵을 함께 동기화
export const removeWordById = (id) => {
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;

  const [removed] = words.splice(idx, 1);
  wordMap.delete(id);
  return removed;
};

// 대소문자 구분 없이 중복 단어 검색
export const findDuplicateWord = (wordText, excludeId = null) => {
  const target = String(wordText || '').trim().toLowerCase();
  if (!target) return null;
  return words.find((w) => w.id !== excludeId && w.word.trim().toLowerCase() === target) || null;
};

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
