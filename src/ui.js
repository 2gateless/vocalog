// --- UI 및 렌더링 모듈 (UI Module) ---

import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  getWords,
  getWordById,
  getAuthState,
  getCurrentView,
  setCurrentView,
  getCurrentData,
  setCurrentData,
  generateId,
  sortWords,
  saveToLocal,
  addDeletedWord,
  removeDeletedWord
} from "./store.js";
import {
  signInWithGoogle,
  signOutUser,
  syncWithFirebase,
  uploadToFirebase
} from "./firebase.js";
import { showToast } from "./toast.js";

// Markdown 옵션 1회 설정
marked.setOptions({
  gfm: true,
  breaks: true
});

// --- DOM Elements ---
const appMain = document.getElementById('main-content');
const viewTitle = document.getElementById('view-title');
const fabContainer = document.getElementById('fab-container');

// --- Markdown & Content Helpers ---
const isMarkdown = (text) => {
  if (!text) return false;
  const mdPatterns = [
    /^#+\s/m,                  // headers
    /(\*\*|__)(.*?)\1/,        // bold
    /(\*|_)(.*?)\1/,           // italic
    /^\s*[-*+]\s/m,            // unordered lists
    /^\s*\d+\.\s/m,            // ordered lists
    /`[^`\n]+`/,               // inline code
    /```[^`]+```/,             // code blocks
    /\[([^\]]+)\]\(([^)]+)\)/, // links
    /^\s*>\s/m                 // blockquotes
  ];
  return mdPatterns.some(pattern => pattern.test(text));
};

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const renderContent = (text) => {
  if (!text) return '-';
  if (isMarkdown(text)) {
    try {
      return DOMPurify.sanitize(marked.parse(text));
    } catch (err) {
      console.error('Failed to parse markdown:', err);
    }
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
};

// --- Helper Icons (HTML Strings) ---
const violetIconHTML = `
  <svg class="violet-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 18 20 12C20 6 12 2 12 2C12 2 4 6 4 12C4 18 12 22 12 22Z" fill="var(--primary)" fill-opacity="0.1"/>
    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="rgba(79, 157, 105, 0.15)" stroke="var(--primary)" stroke-width="1.5"/>
    <path d="M12 12C12 14.2091 10.2091 16 8 16C5.79086 16 4 14.2091 4 12C4 9.79086 5.79086 8 8 8C10.2091 8 12 9.79086 12 12Z" fill="rgba(79, 157, 105, 0.15)" stroke="var(--primary)" stroke-width="1.5"/>
    <path d="M12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12Z" fill="rgba(79, 157, 105, 0.15)" stroke="var(--primary)" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="2.5" fill="var(--primary)"/>
    <path d="M12 22V16" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const driveIconHTML = `
  <svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
`;

const archiveIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
  </svg>
`;

const homeIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
`;

const googleIconHTML = `
  <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
`;

const logoutIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
`;

// --- Pronunciation Helper ---
const speakWord = (word) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en-'));
    if (usVoice) {
      utterance.voice = usVoice;
    }
    window.speechSynthesis.speak(utterance);
  } else {
    showToast('이 브라우저는 음성 재생을 지원하지 않습니다.', 'error');
  }
};

// --- Shared Header Renderer ---
const handleSyncClick = () => {
  syncWithFirebase(() => {
    navigateTo(getCurrentView(), getCurrentData(), true);
  });
};

const renderHeader = ({ title, showHome = false, showStorage = false, homeTitle = 'Home' }) => {
  const leftHTML = showHome
    ? `
      <button class="header-home-btn" data-action="home" title="${escapeHtml(homeTitle)}" style="padding:0; margin:0;">
        ${homeIconHTML}
      </button>
      <span style="font-weight:700;">${escapeHtml(title)}</span>
    `
    : `
      ${violetIconHTML}
      <span style="font-weight:700;">${escapeHtml(title)}</span>
    `;

  const storageBtnHTML = showStorage
    ? `
      <button class="header-storage-btn" data-action="storage" title="단어창고">
        ${archiveIconHTML}
      </button>
    `
    : '';

  viewTitle.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; flex:1;">
      ${leftHTML}
    </div>
    <div style="display:flex; align-items:center; gap:4px;">
      ${storageBtnHTML}
      <button class="header-sync-btn" data-action="sync" title="Firebase Sync">
        ${driveIconHTML}
      </button>
      <button class="header-logout-btn" data-action="logout" title="로그아웃">
        ${logoutIconHTML}
      </button>
    </div>
  `;
};

const renderCenteredHeader = () => {
  viewTitle.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; flex:1; gap:8px;">
      ${violetIconHTML}
      <span>VocaLog</span>
    </div>
  `;
};

// --- View Renderers ---
export const renderLoginView = () => {
  renderCenteredHeader();
  fabContainer.innerHTML = '';

  appMain.innerHTML = `
    <div class="auth-view">
      <div class="auth-card">
        <div class="auth-logo">
          ${violetIconHTML}
        </div>
        <h2 class="auth-title">VocaLog</h2>
        <p class="auth-subtitle">영어 어원 메모장</p>
        <button class="btn-google" id="btn-login-google">
          ${googleIconHTML}
          <span>Google 계정으로 로그인</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-login-google').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-in failed', err);
      alert('로그인 실패 상세 정보:\n\n에러 코드: ' + err.code + '\n에러 메시지: ' + err.message);
    }
  });
};

export const renderUnauthorizedView = (email) => {
  renderCenteredHeader();
  fabContainer.innerHTML = '';

  appMain.innerHTML = `
    <div class="auth-view">
      <div class="unauthorized-card">
        <svg class="auth-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="56" height="56">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h2>접근 권한 없음</h2>
        <div class="unauthorized-text">
          <strong>2gateless@gmail.com</strong> 계정으로 로그인한 사용자만 이 단어장을 읽고 쓸 수 있습니다.<br><br>
          현재 로그인 계정:<br>
          <span style="word-break: break-all; color: #ef4444; font-weight: 600;">${escapeHtml(email)}</span>
        </div>
        <button class="btn-auth-secondary" id="btn-switch-account">다른 계정으로 로그인</button>
      </div>
    </div>
  `;

  document.getElementById('btn-switch-account').addEventListener('click', async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed', err);
    }
  });
};

export const renderListView = () => {
  const words = getWords();
  renderHeader({ title: 'VocaLog', showStorage: true });

  const activeWords = words.filter(w => w && w.word && !w.archived);
  let html = '<div class="view voca-list">';

  if (activeWords.length === 0) {
    html += `<div class="empty-state"><p>기록된 단어가 없습니다.</p></div>`;
  } else {
    activeWords.forEach((w) => {
      html += `
        <div class="voca-item" data-action="detail" data-id="${escapeHtml(w.id)}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="voca-item-title">${escapeHtml(w.word)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${w.pinned ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.1 16.3l-2.8-2.8V7.5C18.3 5 16.5 3 12 3S5.7 5 5.7 7.5v6L2.9 16.3c-.3.3-.3.8 0 1.1.2.1.4.2.6.2h6v4c0 .6.4 1.1 1 1.4h3c.6-.3 1-.8 1-1.4v-4h6c.2 0 .5-.1.6-.2.3-.3.3-.8 0-1.1z"></path></svg>' : ''}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--mute);"><path d="M9 18l6-6-6-6"></path></svg>
            </div>
          </div>
        </div>`;
    });
  }
  html += '</div>';
  appMain.innerHTML = html;
  renderFAB('add');
};

export const renderStorageView = () => {
  const words = getWords();
  renderHeader({ title: '단어창고', showHome: true });

  const archivedWords = words.filter(w => w && w.word && w.archived);
  if (archivedWords.length === 0) {
    appMain.innerHTML = '<div class="view"><div class="empty-state"><p>보관된 단어가 없습니다.</p></div></div>';
  } else {
    const itemsHTML = archivedWords
      .map(w => `
        <div class="storage-item" data-action="detail" data-id="${escapeHtml(w.id)}">
          <div class="storage-item-title">${escapeHtml(w.word)}</div>
        </div>`)
      .join('');
    appMain.innerHTML = `<div class="view storage-list">${itemsHTML}</div>`;
  }
  renderFAB(null);
};

export const renderDetailView = (id) => {
  const w = getWordById(id);
  if (!w) {
    navigateTo('list', null, true);
    return;
  }

  renderHeader({ title: '단어정보', showHome: true });

  appMain.innerHTML = `
    <div class="view detail-view">
      <div class="detail-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h2>${escapeHtml(w.word)}</h2>
        <button class="btn-speak" data-action="speak" data-id="${escapeHtml(w.id)}" title="미국식 발음 듣기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
      </div>
      <div class="section"><div class="section-label">어원</div><div class="section-content etymology">${renderContent(w.etymology)}</div></div>
      <div class="section"><div class="section-label">예문</div><div class="section-content example">${renderContent(w.example)}</div></div>
      <div class="section"><div class="section-label">번역</div><div class="section-content translation">${renderContent(w.translation)}</div></div>
      <div class="detail-actions">
        <button class="btn-archive" data-action="archive" data-id="${escapeHtml(w.id)}">${w.archived ? '단어장 복귀' : '창고로 이동'}</button>
        <button class="btn-pin" data-action="pin" data-id="${escapeHtml(w.id)}">${w.pinned ? '핀 해제' : '핀 고정'}</button>
        <button class="btn-edit" data-action="edit" data-id="${escapeHtml(w.id)}">수정하기</button>
        <button class="btn-delete" data-action="delete" data-id="${escapeHtml(w.id)}">삭제하기</button>
      </div>
    </div>`;
  renderFAB(null);
};

export const renderFormView = (id = null) => {
  const isEdit = id !== null && id !== undefined;
  const existing = isEdit ? getWordById(id) : null;
  if (isEdit && !existing) {
    navigateTo('list', null, true);
    return;
  }

  const w = existing || { word: '', etymology: '', example: '', translation: '' };
  renderHeader({ title: isEdit ? '수정하기' : '추가하기', showHome: true, homeTitle: 'Cancel' });

  appMain.innerHTML = `
    <div class="view form-view">
      <div class="form-group"><label>영어 단어</label><input type="text" id="input-word"></div>
      <div class="form-group"><label>어원</label><textarea id="input-etymology"></textarea></div>
      <div class="form-group"><label>예문</label><textarea id="input-example"></textarea></div>
      <div class="form-group"><label>뜻</label><input type="text" id="input-translation"></div>
      <button class="btn-save" id="save-btn">저장하기</button>
    </div>`;

  // DOM 프로퍼티로 직접 값을 주입하여 따옴표/태그 이스케이프 문제 방지
  document.getElementById('input-word').value = w.word;
  document.getElementById('input-etymology').value = w.etymology;
  document.getElementById('input-example').value = w.example;
  document.getElementById('input-translation').value = w.translation;
  document.getElementById('save-btn').addEventListener('click', () => saveWord(isEdit ? id : null));

  renderFAB(null);
};

export const renderFAB = (type) => {
  fabContainer.innerHTML = type === 'add' ? `<div class="fab" id="fab-add">+</div>` : '';
  if (type === 'add') {
    document.getElementById('fab-add').addEventListener('click', () => navigateTo('add'));
  }
};

// --- Navigation Controller ---
export const navigateTo = (view, data = null, isBack = false) => {
  const { isAuthorized, currentUser } = getAuthState();
  if (!isAuthorized) {
    if (currentUser) {
      renderUnauthorizedView(currentUser.email);
    } else {
      renderLoginView();
    }
    return;
  }

  setCurrentView(view);
  setCurrentData(data);

  if (!isBack) {
    history.pushState({ view, data }, '', '');
  }

  if (view === 'list') renderListView();
  else if (view === 'storage') renderStorageView();
  else if (view === 'add' || view === 'edit') renderFormView(data);
  else if (view === 'detail') renderDetailView(data);
};

// --- Action Helpers ---
const saveWord = (id = null) => {
  const words = getWords();
  const word = document.getElementById('input-word').value.trim();
  if (!word) {
    alert('단어를 입력해주세요.');
    return;
  }

  const now = Date.now();
  const etymology = document.getElementById('input-etymology').value;
  const example = document.getElementById('input-example').value;
  const translation = document.getElementById('input-translation').value;

  if (id !== null) {
    const idx = words.findIndex(w => w.id === id);
    if (idx === -1) {
      navigateTo('list');
      return;
    }
    words[idx] = {
      ...words[idx],
      word,
      etymology,
      example,
      translation,
      updatedAt: now
    };
    removeDeletedWord(id);
    removeDeletedWord(word);
  } else {
    const newId = generateId();
    words.unshift({
      id: newId,
      word,
      etymology,
      example,
      translation,
      pinned: false,
      archived: false,
      updatedAt: now
    });
    removeDeletedWord(word);
  }

  sortWords();
  saveToLocal();
  uploadToFirebase();
  navigateTo('list');
};

const toggleArchive = (id) => {
  const w = getWordById(id);
  if (!w) return;
  w.archived = !w.archived;
  if (w.archived) w.pinned = false;
  w.updatedAt = Date.now();

  sortWords();
  saveToLocal();
  uploadToFirebase();
  navigateTo(w.archived ? 'storage' : 'list');
};

const togglePin = (id) => {
  const w = getWordById(id);
  if (!w) return;
  w.pinned = !w.pinned;
  w.updatedAt = Date.now();

  sortWords();
  saveToLocal();
  uploadToFirebase();
  navigateTo('list');
};

const deleteWord = (id) => {
  const words = getWords();
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return;

  if (confirm('삭제할까요?')) {
    const target = words[idx];
    addDeletedWord(target.id);
    addDeletedWord(target.word);
    words.splice(idx, 1);

    saveToLocal();
    uploadToFirebase();
    navigateTo('list');
  }
};

// --- Event Delegation ---
viewTitle.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  if (action === 'home') navigateTo('list');
  else if (action === 'storage') navigateTo('storage');
  else if (action === 'sync') handleSyncClick();
  else if (action === 'logout') signOutUser();
});

appMain.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const { action, id } = target.dataset;
  if (action === 'detail') navigateTo('detail', id);
  else if (action === 'speak') {
    const w = getWordById(id);
    if (w) speakWord(w.word);
  } else if (action === 'archive') toggleArchive(id);
  else if (action === 'pin') togglePin(id);
  else if (action === 'edit') navigateTo('edit', id);
  else if (action === 'delete') deleteWord(id);
});
