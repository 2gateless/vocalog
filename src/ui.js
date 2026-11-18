// --- UI 및 렌더링 모듈 (UI Module) ---

import {
  getWords,
  getWordById,
  upsertWord,
  removeWordById,
  findDuplicateWord,
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

// --- DOM Elements ---
const appMain = document.getElementById('main-content');
const viewTitle = document.getElementById('view-title');
const fabContainer = document.getElementById('fab-container');

// --- 검색어 상태 ---
let listSearchQuery = '';
let storageSearchQuery = '';

// --- Markdown & DOMPurify 지연 로딩 (초기 번들 경량화) ---
let cachedMarkdownParser = null;
let markdownParserPromise = null;

const loadMarkdownParser = () => {
  if (cachedMarkdownParser) return Promise.resolve(cachedMarkdownParser);
  if (!markdownParserPromise) {
    markdownParserPromise = Promise.all([
      import('marked'),
      import('dompurify')
    ]).then(([markedMod, purifyMod]) => {
      const markedLib = markedMod.marked;
      const DOMPurify = purifyMod.default;
      markedLib.setOptions({
        gfm: true,
        breaks: true
      });
      cachedMarkdownParser = { marked: markedLib, DOMPurify };
      return cachedMarkdownParser;
    }).catch((err) => {
      markdownParserPromise = null;
      throw err;
    });
  }
  return markdownParserPromise;
};

const MD_PATTERNS = [
  /^#+\s/m,                  // 제목
  /(\*\*|__)(.*?)\1/,        // 굵게
  /(\*|_)(.*?)\1/,           // 기울임
  /^\s*[-*+]\s/m,            // 순서 없는 목록
  /^\s*\d+\.\s/m,            // 순서 있는 목록
  /`[^`\n]+`/,               // 인라인 코드
  /```[^`]+```/,             // 코드 블록
  /\[([^\]]+)\]\(([^)]+)\)/, // 링크
  /^\s*>\s/m                 // 인용구
];

const isMarkdown = (text) => {
  if (!text) return false;
  return MD_PATTERNS.some((pattern) => pattern.test(text));
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

const renderPlainContent = (text) => {
  if (!text) return '-';
  return escapeHtml(text).replace(/\n/g, '<br>');
};

const parseMarkdownSync = (text, parser) => {
  try {
    return parser.DOMPurify.sanitize(parser.marked.parse(text));
  } catch (err) {
    console.error('마크다운 파싱 실패:', err);
    return renderPlainContent(text);
  }
};

// 캐시된 파서가 있으면 즉시 마크다운 렌더링, 없으면 평문 반환 후 비동기 업그레이드 표시
const renderContentInitial = (text) => {
  if (!text) return { html: '-', needsAsyncMd: false };
  if (isMarkdown(text)) {
    if (cachedMarkdownParser) {
      return { html: parseMarkdownSync(text, cachedMarkdownParser), needsAsyncMd: false };
    }
    return { html: renderPlainContent(text), needsAsyncMd: true };
  }
  return { html: renderPlainContent(text), needsAsyncMd: false };
};

// --- 아이콘 SVG 상수 ---
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

const searchIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
`;

const pinIconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.1 16.3l-2.8-2.8V7.5C18.3 5 16.5 3 12 3S5.7 5 5.7 7.5v6L2.9 16.3c-.3.3-.3.8 0 1.1.2.1.4.2.6.2h6v4c0 .6.4 1.1 1 1.4h3c.6-.3 1-.8 1-1.4v-4h6c.2 0 .5-.1.6-.2.3-.3.3-.8 0-1.1z"></path></svg>`;
const chevronRightIconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--mute);"><path d="M9 18l6-6-6-6"></path></svg>`;

// --- 발음 재생 헬퍼 ---
const speakWord = (word) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find((v) => v.lang === 'en-US') || voices.find((v) => v.lang.startsWith('en-'));
    if (usVoice) {
      utterance.voice = usVoice;
    }
    window.speechSynthesis.speak(utterance);
  } else {
    showToast('이 브라우저는 음성 재생을 지원하지 않습니다.', 'error');
  }
};

// --- 검색 필터 헬퍼 ---
const filterWordsByQuery = (list, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((w) =>
    w.word.toLowerCase().includes(q) ||
    (w.translation && w.translation.toLowerCase().includes(q)) ||
    (w.etymology && w.etymology.toLowerCase().includes(q))
  );
};

// --- 공통 헤더 렌더러 ---
const handleSyncClick = async (btnEl) => {
  if (btnEl) btnEl.classList.add('syncing');
  try {
    await syncWithFirebase(() => {
      const view = getCurrentView();
      if (view !== 'add' && view !== 'edit') {
        navigateTo(view, getCurrentData(), true);
      }
    });
  } finally {
    const currentBtn = viewTitle.querySelector('.header-sync-btn');
    if (currentBtn) currentBtn.classList.remove('syncing');
  }
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

// --- 뷰 렌더러 ---
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
      console.error('Google 로그인 실패:', err);
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
      console.error('로그아웃 실패:', err);
    }
  });
};

// 목록 아이템만 생성 (검색 시 부분 렌더링에 재사용)
const buildListItemsHTML = (filteredWords, totalCount) => {
  if (totalCount === 0) {
    return `<div class="empty-state"><p>기록된 단어가 없습니다.</p></div>`;
  }
  if (filteredWords.length === 0) {
    return `<div class="empty-state"><p>검색 결과가 없습니다.</p></div>`;
  }
  return filteredWords.map((w) => `
    <div class="voca-item" data-action="detail" data-id="${escapeHtml(w.id)}">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div style="min-width:0;">
          <div class="voca-item-title">${escapeHtml(w.word)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          ${w.pinned ? pinIconHTML : ''}
          ${chevronRightIconHTML}
        </div>
      </div>
    </div>
  `).join('');
};

const formatCountLabel = (filteredCount, totalCount, query) => {
  if (query.trim()) return `${filteredCount} / ${totalCount}`;
  return `${totalCount}개`;
};

export const renderListView = () => {
  const words = getWords();
  renderHeader({ title: 'VocaLog', showStorage: true });

  const activeWords = words.filter((w) => w && w.word && !w.archived);
  const filteredWords = filterWordsByQuery(activeWords, listSearchQuery);

  const searchBarHTML = activeWords.length > 0
    ? `
      <div class="search-bar">
        <span class="search-icon" aria-hidden="true">${searchIconHTML}</span>
        <input type="search" id="list-search-input" class="search-input" placeholder="단어, 뜻, 어원 검색..." autocomplete="off" />
        <span class="word-count" id="list-word-count">${formatCountLabel(filteredWords.length, activeWords.length, listSearchQuery)}</span>
      </div>
    `
    : '';

  appMain.innerHTML = `
    <div class="view">
      ${searchBarHTML}
      <div class="voca-list" id="voca-list-items">
        ${buildListItemsHTML(filteredWords, activeWords.length)}
      </div>
    </div>
  `;

  const searchInput = document.getElementById('list-search-input');
  if (searchInput) {
    searchInput.value = listSearchQuery;
    searchInput.addEventListener('input', (e) => {
      listSearchQuery = e.target.value;
      const nextFiltered = filterWordsByQuery(activeWords, listSearchQuery);
      const listEl = document.getElementById('voca-list-items');
      const countEl = document.getElementById('list-word-count');
      if (listEl) listEl.innerHTML = buildListItemsHTML(nextFiltered, activeWords.length);
      if (countEl) countEl.textContent = formatCountLabel(nextFiltered.length, activeWords.length, listSearchQuery);
    });
  }

  renderFAB('add');
};

const buildStorageItemsHTML = (filteredWords, totalCount) => {
  if (totalCount === 0) {
    return `<div class="empty-state"><p>보관된 단어가 없습니다.</p></div>`;
  }
  if (filteredWords.length === 0) {
    return `<div class="empty-state"><p>검색 결과가 없습니다.</p></div>`;
  }
  const itemsHTML = filteredWords
    .map((w) => `
      <div class="storage-item" data-action="detail" data-id="${escapeHtml(w.id)}">
        <div class="storage-item-title">${escapeHtml(w.word)}</div>
      </div>`)
    .join('');
  return `<div class="storage-list">${itemsHTML}</div>`;
};

export const renderStorageView = () => {
  const words = getWords();
  renderHeader({ title: '단어창고', showHome: true });

  const archivedWords = words.filter((w) => w && w.word && w.archived);
  const filteredWords = filterWordsByQuery(archivedWords, storageSearchQuery);

  const searchBarHTML = archivedWords.length > 0
    ? `
      <div class="search-bar">
        <span class="search-icon" aria-hidden="true">${searchIconHTML}</span>
        <input type="search" id="storage-search-input" class="search-input" placeholder="창고 단어 검색..." autocomplete="off" />
        <span class="word-count" id="storage-word-count">${formatCountLabel(filteredWords.length, archivedWords.length, storageSearchQuery)}</span>
      </div>
    `
    : '';

  appMain.innerHTML = `
    <div class="view">
      ${searchBarHTML}
      <div id="storage-list-container">
        ${buildStorageItemsHTML(filteredWords, archivedWords.length)}
      </div>
    </div>
  `;

  const searchInput = document.getElementById('storage-search-input');
  if (searchInput) {
    searchInput.value = storageSearchQuery;
    searchInput.addEventListener('input', (e) => {
      storageSearchQuery = e.target.value;
      const nextFiltered = filterWordsByQuery(archivedWords, storageSearchQuery);
      const containerEl = document.getElementById('storage-list-container');
      const countEl = document.getElementById('storage-word-count');
      if (containerEl) containerEl.innerHTML = buildStorageItemsHTML(nextFiltered, archivedWords.length);
      if (countEl) countEl.textContent = formatCountLabel(nextFiltered.length, archivedWords.length, storageSearchQuery);
    });
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

  const etymologyRes = renderContentInitial(w.etymology);
  const exampleRes = renderContentInitial(w.example);
  const translationRes = renderContentInitial(w.translation);

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
      <div class="section"><div class="section-label">어원</div><div class="section-content etymology" id="detail-etymology">${etymologyRes.html}</div></div>
      <div class="section"><div class="section-label">예문</div><div class="section-content example" id="detail-example">${exampleRes.html}</div></div>
      <div class="section"><div class="section-label">번역</div><div class="section-content translation" id="detail-translation">${translationRes.html}</div></div>
      <div class="detail-actions">
        <button class="btn-archive" data-action="archive" data-id="${escapeHtml(w.id)}">${w.archived ? '단어장 복귀' : '창고로 이동'}</button>
        <button class="btn-pin" data-action="pin" data-id="${escapeHtml(w.id)}">${w.pinned ? '핀 해제' : '핀 고정'}</button>
        <button class="btn-edit" data-action="edit" data-id="${escapeHtml(w.id)}">수정하기</button>
        <button class="btn-delete" data-action="delete" data-id="${escapeHtml(w.id)}">삭제하기</button>
      </div>
    </div>`;
  renderFAB(null);

  // 마크다운 파서가 아직 로드되지 않은 경우에만 비동기 로드 후 해당 섹션 업그레이드
  if (etymologyRes.needsAsyncMd || exampleRes.needsAsyncMd || translationRes.needsAsyncMd) {
    loadMarkdownParser()
      .then((parser) => {
        // 비동기 로드 중 다른 화면으로 이동했다면 DOM 갱신 중단
        if (getCurrentView() !== 'detail' || getCurrentData() !== id) return;
        if (etymologyRes.needsAsyncMd) {
          const el = document.getElementById('detail-etymology');
          if (el) el.innerHTML = parseMarkdownSync(w.etymology, parser);
        }
        if (exampleRes.needsAsyncMd) {
          const el = document.getElementById('detail-example');
          if (el) el.innerHTML = parseMarkdownSync(w.example, parser);
        }
        if (translationRes.needsAsyncMd) {
          const el = document.getElementById('detail-translation');
          if (el) el.innerHTML = parseMarkdownSync(w.translation, parser);
        }
      })
      .catch((err) => {
        console.error('마크다운 모듈 로드 실패:', err);
      });
  }
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
    <div class="view form-view" id="word-form">
      <div class="form-group"><label for="input-word">영어 단어</label><input type="text" id="input-word" autocomplete="off"></div>
      <div class="form-group"><label for="input-etymology">어원</label><textarea id="input-etymology"></textarea></div>
      <div class="form-group"><label for="input-example">예문</label><textarea id="input-example"></textarea></div>
      <div class="form-group"><label for="input-translation">뜻</label><input type="text" id="input-translation"></div>
      <button class="btn-save" id="save-btn">저장하기</button>
    </div>`;

  // DOM 프로퍼티로 직접 값을 주입하여 따옴표/태그 이스케이프 문제 방지
  const wordInput = document.getElementById('input-word');
  const etymologyInput = document.getElementById('input-etymology');
  const exampleInput = document.getElementById('input-example');
  const translationInput = document.getElementById('input-translation');

  wordInput.value = w.word;
  etymologyInput.value = w.etymology;
  exampleInput.value = w.example;
  translationInput.value = w.translation;

  // 새 단어 추가 시 즉시 입력할 수 있도록 포커스
  if (!isEdit) {
    wordInput.focus();
  }

  const handleSave = () => saveWord(isEdit ? id : null);
  document.getElementById('save-btn').addEventListener('click', handleSave);

  // Ctrl+Enter 또는 Cmd+Enter로 빠른 저장
  document.getElementById('word-form').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  });

  renderFAB(null);
};

export const renderFAB = (type) => {
  fabContainer.innerHTML = type === 'add'
    ? `<button class="fab" type="button" data-action="add" aria-label="새 단어 추가">+</button>`
    : '';
};

// --- 네비게이션 컨트롤러 ---
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

// --- 액션 헬퍼 ---
const saveWord = (id = null) => {
  const word = document.getElementById('input-word').value.trim();
  if (!word) {
    showToast('단어를 입력해주세요.', 'error');
    document.getElementById('input-word').focus();
    return;
  }

  // 중복 단어 등록 확인
  const duplicate = findDuplicateWord(word, id);
  if (duplicate) {
    const locationLabel = duplicate.archived ? '단어창고' : '단어장';
    if (!confirm(`"${duplicate.word}" 단어는 이미 ${locationLabel}에 등록되어 있습니다. 그래도 저장할까요?`)) {
      return;
    }
  }

  const now = Date.now();
  const etymology = document.getElementById('input-etymology').value;
  const example = document.getElementById('input-example').value;
  const translation = document.getElementById('input-translation').value;

  if (id !== null) {
    const existing = getWordById(id);
    if (!existing) {
      navigateTo('list');
      return;
    }
    upsertWord({
      ...existing,
      word,
      etymology,
      example,
      translation,
      updatedAt: now
    });
    removeDeletedWord(id);
    removeDeletedWord(word);
  } else {
    const newId = generateId();
    upsertWord({
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
  const target = getWordById(id);
  if (!target) return;

  if (confirm('삭제할까요?')) {
    addDeletedWord(target.id);
    addDeletedWord(target.word);
    removeWordById(id);

    saveToLocal();
    uploadToFirebase();
    navigateTo('list');
  }
};

// --- 이벤트 위임 ---
viewTitle.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  if (action === 'home') navigateTo('list');
  else if (action === 'storage') navigateTo('storage');
  else if (action === 'sync') handleSyncClick(btn);
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

fabContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="add"]');
  if (btn) navigateTo('add');
});
