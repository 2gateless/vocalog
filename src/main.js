// --- Global Error Handling for ChunkLoadError (Self-healing) ---
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
    console.warn('Vite ChunkLoadError detect: Reloading app to fetch latest version...');
    window.location.reload();
  }
}, true);

import './style.css'

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

const homeIconHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
`;

// --- Local Storage Integration ---

// --- Firebase Sync ---
let firebaseUrl = localStorage.getItem('firebase_url') || '';
let deletedWords = new Set(JSON.parse(localStorage.getItem('deleted_words') || '[]'));

const saveToLocal = () => {
  localStorage.setItem('voca_logs', JSON.stringify(words));
};

const saveAll = async () => {
  saveToLocal();
  if (firebaseUrl) {
    await uploadToFirebase();
  }
};

const promptFirebaseUrl = (onSave = () => {}) => {
  const modal = document.createElement('div');
  modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
  modal.innerHTML = `
    <div style="background:#fff; padding:1.5rem; border-radius:1rem; width:90%; max-width:400px; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      <h3 style="margin:0 0 1rem 0; font-size:1.2rem; color:#333;">Firebase 연동</h3>
      <p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">Firebase Realtime Database URL을 입력하세요.<br><small>(예: https://my-project.firebaseio.com/words.json)</small></p>
      <input type="url" id="url-input" value="${firebaseUrl}" placeholder="https://..." 
        style="width:100%; padding:0.75rem; border:1.5px solid #e5e7eb; border-radius:0.5rem; 
               font-size:0.85rem; box-sizing:border-box; margin-bottom:1rem;">
      <div style="display:flex; gap:0.75rem;">
        <button id="url-cancel" style="flex:1; padding:0.75rem; border:1.5px solid #d1d5db;
          border-radius:0.5rem; background:#fff; cursor:pointer; font-size:0.9rem;">취소</button>
        <button id="url-save" style="flex:2; padding:0.75rem; background:#a855f7; color:#fff;
          border:none; border-radius:0.5rem; cursor:pointer; font-size:0.9rem; font-weight:600;">저장 후 동기화</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = document.getElementById('url-input');
  input.focus();
  input.select();

  document.getElementById('url-cancel').onclick = () => modal.remove();
  document.getElementById('url-save').onclick = () => {
    const val = input.value.trim();
    if (!val) return;
    firebaseUrl = val;
    localStorage.setItem('firebase_url', firebaseUrl);
    modal.remove();
    onSave();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

const syncWithFirebase = async () => {
  if (!firebaseUrl) {
    promptFirebaseUrl(syncWithFirebase);
    return;
  }
  const statusEl = document.getElementById('sync-status');
  if (statusEl) statusEl.innerText = '동기화 중...';
  
  try {
    const response = await fetch(firebaseUrl);
    if (!response.ok) throw new Error('Network error');
    const remoteData = await response.json();
    
    if (remoteData) {
      const remoteWordsMap = new Map();
      Object.keys(remoteData).forEach(key => {
        const item = remoteData[key];
        remoteWordsMap.set(item.word, item);
      });
      
      // Merge: remote wins except for deleted words
      const mergedMap = new Map();
      words.forEach(w => {
        if (!deletedWords.has(w.word)) {
           mergedMap.set(w.word, w);
        }
      });
      remoteWordsMap.forEach((w, key) => {
        if (!deletedWords.has(key)) {
           mergedMap.set(key, w);
        }
      });
      
      words = Array.from(mergedMap.values());
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
    firebaseUrl = ''; // reset on fail
    localStorage.removeItem('firebase_url');
  }
};

const uploadToFirebase = async () => {
  if (!firebaseUrl) return;
  try {
    await fetch(firebaseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(words)
    });
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
    <button class="header-sync-btn" id="btn-sync" title="Firebase Sync">
      ${driveIconHTML}
    </button>
    <div id="sync-status" style="display:none"></div>
  `;
  document.getElementById('btn-sync').onclick = handleSyncClick;
  let html = '<div class="view voca-list">';
  if (words.length === 0) {
    html += `<div class="empty-state"><p>기록된 단어가 없습니다.</p></div>`;
  } else {
    words.forEach((w, index) => {
      html += `
        <div class="voca-item" onclick="window.navigateTo('detail', ${index})">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <div>
              <div class="voca-item-title">${w.word}</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); margin-top:4px;"><path d="M9 18l6-6-6-6"></path></svg>
          </div>
        </div>`;
    });
  }
  html += '</div>';
  appMain.innerHTML = html;
  renderFAB('add');
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
  const data = { word, etymology: document.getElementById('input-etymology').value, example: document.getElementById('input-example').value, translation: document.getElementById('input-translation').value };
  if (index !== null) words[index] = data; else words.unshift(data);
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
