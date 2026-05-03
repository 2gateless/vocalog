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

// --- Google Drive Sync ---
const CLIENT_ID = '323291505088-ngturlrabjrghami7gnc3shhkdlhhjvp.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let tokenClient;
let accessToken = null;
let googleFileId = null;

const saveToLocal = () => {
  localStorage.setItem('voca_logs', JSON.stringify(words));
};

const saveAll = async () => {
  saveToLocal();
  if (accessToken) {
    await uploadToDrive();
  }
};

// --- Drive API Helpers ---

const initGoogleAuth = () => {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (resp) => {
      if (resp.error) return;
      accessToken = resp.access_token;
      localStorage.setItem('google_access_token', accessToken);
      document.getElementById('sync-status').innerText = '동기화 중...';
      await syncWithDrive();
    },
  });
};

const handleAuthClick = () => {
  tokenClient.requestAccessToken({ prompt: '' });
};

const syncWithDrive = async () => {
  try {
    const fileId = await findVocaFile();
    if (fileId) {
      googleFileId = fileId;
      const driveData = await downloadFromDrive(fileId);
      if (driveData && Array.isArray(driveData)) {
        // Merge strategy: Drive data prepends to local if not present
        const localWordsMap = new Map(words.map(w => [w.word, w]));
        const newWords = driveData.filter(dw => !localWordsMap.has(dw.word));
        words = [...newWords, ...words];
        saveToLocal();
        renderListView();
      }
    }
    document.getElementById('sync-status').innerText = '동기화 완료';
  } catch (err) {
    console.error('Sync failed', err);
    document.getElementById('sync-status').innerText = '동기화 실패';
  }
};

const findVocaFile = async () => {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='voca_logs.json' and trashed=false`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await resp.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
};

const downloadFromDrive = async (fileId) => {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return await resp.json();
};

const uploadToDrive = async () => {
  const metadata = { name: 'voca_logs.json', mimeType: 'application/json' };
  const file = new Blob([JSON.stringify(words)], { type: 'application/json' });
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (googleFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${googleFileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const resp = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });
  const data = await resp.json();
  if (!googleFileId) googleFileId = data.id;
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
    <button class="header-sync-btn" id="btn-sync" title="Google Drive Sync">
      ${driveIconHTML}
    </button>
    <div id="sync-status" style="display:none"></div>
  `;
  document.getElementById('btn-sync').onclick = handleAuthClick;
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
    <button class="header-sync-btn" id="btn-sync" title="Google Drive Sync">
      ${driveIconHTML}
    </button>
  `;
  document.getElementById('btn-sync').onclick = handleAuthClick;
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
    <button class="header-sync-btn" id="btn-sync" title="Google Drive Sync">
      ${driveIconHTML}
    </button>
  `;
  document.getElementById('btn-sync').onclick = handleAuthClick;
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
window.deleteWord =  (index) => { if (confirm('삭제할까요?')) { words.splice(index, 1); saveAll(); window.navigateTo('list'); } };

// --- Initialize ---
window.navigateTo('list');

// Google API 비동기 로드 확인 및 초기화
const checkAndInitGoogle = () => {
  if (window.google) {
    initGoogleAuth();
  } else {
    setTimeout(checkAndInitGoogle, 500);
  }
};
checkAndInitGoogle();
