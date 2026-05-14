// --- Global Error Handling for ChunkLoadError (Self-healing) ---
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
    console.warn('Vite ChunkLoadError detect: Reloading app to fetch latest version...');
    window.location.reload();
  }
}, true);

import './style.css'
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

// --- State Management ---
let words = JSON.parse(localStorage.getItem('voca_logs')) || [];
let currentView = 'list'; // 'list', 'add', 'edit', 'detail'

// --- DOM Elements ---
const appMain = document.getElementById('main-content');
const viewTitle = document.getElementById('view-title');
const fabContainer = document.getElementById('fab-container');

// --- Helper Icons ---
const violetIconHTML = `
  <svg class="violet-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 18 20 12C20 6 12 2 12 2C12 2 4 6 4 12C4 18 12 22 12 22Z" fill="#a855f7" fill-opacity="0.1"/>
    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.5"/>
    <path d="M12 12C12 14.2091 10.2091 16 8 16C5.79086 16 4 14.2091 4 12C4 9.79086 5.79086 8 8 8C10.2091 8 12 9.79086 12 12Z" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.5"/>
    <path d="M12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12Z" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.5"/>
    <path d="M12 12C9.79086 12 8 13.7909 8 16C8 18.2091 9.79086 20 12 20C14.2091 20 16 18.2091 16 16C16 13.7909 14.2091 12 12 12Z" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="2.5" fill="#a855f7"/>
    <path d="M12 22V16" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const driveIconHTML = `
  <svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="30" height="30" style="color: white;">
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
`;

const archiveIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26" style="color: white;">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
  </svg>
`;

const homeIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
`;

// --- Firebase Sync ---
const firebaseConfig = {
  apiKey: "AIzaSyAAyr9JDbO2a5bWGACqg2RKwY2cI_lWv0E",
  authDomain: "vocalog-d61ef.firebaseapp.com",
  databaseURL: "https://vocalog-d61ef-default-rtdb.firebaseio.com",
  projectId: "vocalog-d61ef",
  storageBucket: "vocalog-d61ef.firebasestorage.app",
  messagingSenderId: "546039240333",
  appId: "1:546039240333:web:ce58ecb9d910cf055834c4",
  measurementId: "G-KLK0YPR58Y"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let deletedWords = new Set(JSON.parse(localStorage.getItem('deleted_words') || '[]'));

const saveToLocal = () => {
  localStorage.setItem('voca_logs', JSON.stringify(words));
};

const sortWords = () => {
  words.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
};

const saveAll = async () => {
  saveToLocal();
  await uploadToFirebase();
};

const syncWithFirebase = async () => {
  const statusEl = document.getElementById('sync-status');
  if (statusEl) statusEl.innerText = '동기화 중...';
  
  try {
    const dbRef = ref(db, 'vocaLog');
    const snapshot = await get(dbRef);
    const remoteData = snapshot.val();
    
    if (remoteData) {
      const remoteWordsMap = new Map();
      Object.keys(remoteData).forEach(key => {
        const item = remoteData[key];
        if (item && item.word) {
          remoteWordsMap.set(item.word, item);
        }
      });
      
      // Merge: remote wins except for deleted words
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
      
      words = Array.from(mergedMap.values());
      sortWords();
      saveToLocal();
      
      // Push back up
      await uploadToFirebase();
      
      if (statusEl) statusEl.innerText = '동기화 완료';
      renderListView();
    } else {
      // Remote empty, just push
      await uploadToFirebase();
      if (statusEl) statusEl.innerText = '동기화 완료';
    }
  } catch (err) {
    if (statusEl) statusEl.innerText = '동기화 실패';
    console.error('Firebase Sync failed', err);
  }
};

const uploadToFirebase = async () => {
  try {
    const dbRef = ref(db, 'vocaLog');
    await set(dbRef, words);
  } catch (err) {
    console.error('Failed to upload to Firebase', err);
  }
};

const handleSyncClick = () => {
  syncWithFirebase();
};

// --- Helper: Pronunciation ---
// Removed

// --- Views ---

const renderListView = () => {
  viewTitle.innerHTML = `
    <div style="width: 10px;"></div> <!-- Reduced left placeholder to shift title left -->
    <div style="display:flex; align-items:center; justify-content:flex-start; flex:1; padding-left: 10px;">
      ${violetIconHTML}
      <span style="margin-left:10px;">VocaLog</span>
    </div>
    <button class="header-storage-btn" onclick="window.navigateTo('storage')" title="단어창고">
      ${archiveIconHTML}
    </button>
    <button class="header-sync-btn" id="btn-sync" title="Firebase Sync">
      ${driveIconHTML}
    </button>
    <div id="sync-status" style="display:none"></div>
  `;
  document.getElementById('btn-sync').onclick = handleSyncClick;
  let html = '<div class="view voca-list">';
  if (words.length === 0 || !words.some(w => w && w.word && !w.archived)) {
    html += `<div class="empty-state"><p>기록된 단어가 없습니다.</p></div>`;
  } else {
    words.forEach((w, index) => {
      if (!w || !w.word || w.archived) return;
      html += `
        <div class="voca-item" onclick="window.navigateTo('detail', ${index})">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <div>
              <div class="voca-item-title">${w.word}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
              ${w.pinned ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.1 16.3l-2.8-2.8V7.5C18.3 5 16.5 3 12 3S5.7 5 5.7 7.5v6L2.9 16.3c-.3.3-.3.8 0 1.1.2.1.4.2.6.2h6v4c0 .6.4 1.1 1 1.4h3c.6-.3 1-.8 1-1.4v-4h6c.2 0 .5-.1.6-.2.3-.3.3-.8 0-1.1z"></path></svg>' : ''}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><path d="M9 18l6-6-6-6"></path></svg>
            </div>
          </div>
        </div>`;
    });
  }
  html += '</div>';
  appMain.innerHTML = html;
  renderFAB('add');
};

const renderStorageView = () => {
  viewTitle.innerHTML = `
    <button class="header-home-btn" onclick="window.navigateTo('list')" title="Home">
      ${homeIconHTML}
    </button>
    <div style="display:flex; align-items:center; justify-content:center; flex:1;">
      ${archiveIconHTML}
      <span style="margin-left:10px;">단어창고</span>
    </div>
    <button class="header-sync-btn" id="btn-sync" title="Firebase Sync">
      ${driveIconHTML}
    </button>
  `;
  document.getElementById('btn-sync').onclick = handleSyncClick;
  let html = '<div class="view storage-list">';
  let hasArchived = false;
  words.forEach((w, index) => {
    if (!w || !w.word || !w.archived) return;
    hasArchived = true;
    html += `
      <div class="storage-item" onclick="window.navigateTo('detail', ${index})">
        <div class="storage-item-title">${w.word}</div>
      </div>`;
  });
  if (!hasArchived) {
    html = '<div class="view"><div class="empty-state"><p>보관된 단어가 없습니다.</p></div></div>';
  } else {
    html += '</div>';
  }
  appMain.innerHTML = html;
  renderFAB(null);
};

const renderDetailView = (index) => {
  const w = words[index];
  viewTitle.innerHTML = `
    <button class="header-home-btn" onclick="window.navigateTo('list')" title="Home">
      ${homeIconHTML}
    </button>
    <div style="display:flex; align-items:center; justify-content:center; flex:1;">
      ${violetIconHTML}
      <span style="margin-left:10px;">단어정보</span>
    </div>
    <button class="header-sync-btn" id="btn-sync" title="Firebase Sync">
      ${driveIconHTML}
    </button>
  `;
  document.getElementById('btn-sync').onclick = handleSyncClick;
  appMain.innerHTML = `
    <div class="view detail-view">
      <div class="detail-header">
        <h2>${w.word}</h2>
      </div>
      <div class="section"><div class="section-label">어원</div><div class="section-content etymology">${w.etymology || '-'}</div></div>
      <div class="section"><div class="section-label">예문</div><div class="section-content example">${w.example || '-'}</div></div>
      <div class="section"><div class="section-label">번역</div><div class="section-content translation">${w.translation || '-'}</div></div>
      <div class="detail-actions">
        <button class="btn-archive" onclick="window.toggleArchive(${index})">${w.archived ? '단어장 복귀' : '창고로 이동'}</button>
        <button class="btn-pin" onclick="window.togglePin(${index})">${w.pinned ? '핀 해제' : '핀 고정'}</button>
        <button class="btn-edit" onclick="window.navigateTo('edit', ${index})">수정하기</button>
        <button class="btn-delete" onclick="window.deleteWord(${index})">삭제하기</button>
      </div>
    </div>`;
  renderFAB(null);
};

const renderFormView = (index = null) => {
  const isEdit = index !== null;
  const w = isEdit ? words[index] : { word: '', etymology: '', example: '', translation: '' };
  viewTitle.innerHTML = `
    <button class="header-home-btn" onclick="window.navigateTo('list')" title="Cancel">
      ${homeIconHTML}
    </button>
    <div style="display:flex; align-items:center; justify-content:center; flex:1;">
      ${violetIconHTML}
      <span style="margin-left:10px;">${isEdit ? '수정하기' : '추가하기'}</span>
    </div>
    <button class="header-sync-btn" id="btn-sync" title="Firebase Sync">
      ${driveIconHTML}
    </button>
  `;
  document.getElementById('btn-sync').onclick = handleSyncClick;
  appMain.innerHTML = `
    <div class="view form-view">
      <div class="form-group"><label>영어 단어</label><input type="text" id="input-word" value="${w.word}"></div>
      <div class="form-group"><label>어원</label><textarea id="input-etymology">${w.etymology}</textarea></div>
      <div class="form-group"><label>예문</label><textarea id="input-example">${w.example}</textarea></div>
      <div class="form-group"><label>뜻</label><input type="text" id="input-translation" value="${w.translation}"></div>
      <button class="btn-save" id="save-btn">저장하기</button>
    </div>`;
  document.getElementById('save-btn').onclick = () => window.saveWord(index);
  renderFAB(null);
};

const renderFAB = (type) => {
  fabContainer.innerHTML = type === 'add' ? `<div class="fab" id="fab-add">+</div>` : '';
  if (type === 'add') document.getElementById('fab-add').onclick = () => window.navigateTo('add');
};

window.navigateTo = (view, data = null, isBack = false) => { 
  currentView = view; 
  
  // Update browser history
  if (!isBack) {
    history.pushState({ view, data }, '', '');
  }

  if (view === 'list') renderListView(); 
  else if (view === 'storage') renderStorageView();
  else if (view === 'add' || view === 'edit') renderFormView(data); 
  else if (view === 'detail') renderDetailView(data); 
};

// Handle browser back button
window.onpopstate = (event) => {
  if (event.state && event.state.view) {
    window.navigateTo(event.state.view, event.state.data, true);
  } else {
    window.navigateTo('list', null, true);
  }
};
window.saveWord =  (index = null) => {
  const word = document.getElementById('input-word').value;
  if (!word) return alert('단어를 입력해주세요.');
  const data = {
    word,
    etymology: document.getElementById('input-etymology').value,
    example: document.getElementById('input-example').value,
    translation: document.getElementById('input-translation').value
  };
  if (index !== null) {
    data.pinned = words[index].pinned || false;
    data.archived = words[index].archived || false;
    words[index] = data;
  } else {
    data.pinned = false;
    data.archived = false;
    words.unshift(data);
  }
  sortWords();
  saveAll();
  window.navigateTo('list');
};

window.toggleArchive = (index) => {
  words[index].archived = !words[index].archived;
  if (words[index].archived) words[index].pinned = false;
  sortWords();
  saveAll();
  window.navigateTo(words[index].archived ? 'storage' : 'list');
};

window.togglePin = (index) => {
  words[index].pinned = !words[index].pinned;
  sortWords();
  saveAll();
  window.navigateTo('list');
};
window.deleteWord =  (index) => {
  if (confirm('삭제할까요?')) {
    deletedWords.add(words[index].word);
    localStorage.setItem('deleted_words', JSON.stringify([...deletedWords]));
    words.splice(index, 1);
    saveAll();
    window.navigateTo('list');
  }
};

// --- Initialize ---
window.navigateTo('list');
syncWithFirebase();
