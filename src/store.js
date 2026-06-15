// --- VocaLog 상태 관리 (State Store) ---

let words = JSON.parse(localStorage.getItem('voca_logs')) || [];
let deletedWords = new Set(JSON.parse(localStorage.getItem('deleted_words') || '[]'));
let currentView = 'list'; // 'list', 'add', 'edit', 'detail', 'storage'
let isAuthorized = false;
let currentUser = null;

// 로컬 스토리지 저장 헬퍼
export const saveToLocal = () => {
  localStorage.setItem('voca_logs', JSON.stringify(words));
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
  words = newWords;
};

export const getDeletedWords = () => deletedWords;
export const addDeletedWord = (word) => {
  deletedWords.add(word);
  localStorage.setItem('deleted_words', JSON.stringify(Array.from(deletedWords)));
};

export const getCurrentView = () => currentView;
export const setCurrentView = (view) => {
  currentView = view;
};

export const getAuthState = () => ({
  isAuthorized,
  currentUser
});

export const setAuthState = (authorized, user) => {
  isAuthorized = authorized;
  currentUser = user;
};
