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
// 삭제한 단어 추적 (동기화 시 Firebase에서 복원되지 않도록)
let deletedWords = new Set(JSON.parse(localStorage.getItem('deleted_words') || '[]'));

// --- DOM Elements (lazy getters to avoid null on early load) ---
const getAppMain = () => document.getElementById('main-content');
const getViewTitle = () => document.getElementById('view-title');
const getFabContainer = () => document.getElementById('fab-container');
// 하위 호환성을 위한 참조
let appMain, viewTitle, fabContainer;

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

// --- Storage ---
const saveToLocal = () => {
  localStorage.setItem('voca_logs', JSON.stringify(words));
};

// --- Firebase Sync (Netlify 프록시 경유 → CORS 없음) ---
// /firebase-proxy/* → https://vocalog-d61ef-default-rtdb.firebaseio.com/*  (public/_redirects)
const FIREBASE_ENDPOINT = '/firebase-proxy/vocaLog.json';

const syncWithFirebase = async () => {
  const btn = document.getElementById('btn-sync');
  if (btn) btn.style.opacity = '0.5';

  try {
    // 1. 클라우드에서 현재 데이터 읽기
    const getResp = await fetch(FIREBASE_ENDPOINT);
    if (!getResp.ok) throw new Error(`읽기 오류 (${getResp.status})\nFirebase 규칙 확인: .read = true`);
    const cloudData = await getResp.json();
    const cloudWords = Array.isArray(cloudData) ? cloudData : [];

    // 2. 양방향 병합 (삭제한 단어는 Firebase에서 복원하지 않음)
    const localMap = new Map(words.map(w => [w.word, w]));
    const newFromCloud = cloudWords.filter(w => !localMap.has(w.word) && !deletedWords.has(w.word));
    const merged = [...newFromCloud, ...words];

    // 3. 병합 결과 저장
    const putResp = await fetch(FIREBASE_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (!putResp.ok) throw new Error(`쓰기 오류 (${putResp.status})\nFirebase 규칙 확인: .write = true`);

    // 4. 로컬 업데이트 + 삭제 목록 초기화
    words = merged;
    saveToLocal();
    deletedWords.clear();
    localStorage.removeItem('deleted_words');
    renderListView();
    alert(`동기화 완료! (총 ${merged.length}개 단어)`);
  } catch (err) {
    console.error('Sync failed:', err);
    alert(`동기화 실패\n${err.message}`);
  } finally {
    const btn2 = document.getElementById('btn-sync');
    if (btn2) btn2.style.opacity = '1';
  }
};

const saveAll = () => {
  saveToLocal();
  // 단어 저장 시엔 로컬만 저장 (동기화는 수동 버튼으로)
};

const showUrlModal = (onSave) => {
  // 기존 모달 제거
  document.getElementById('url-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'url-modal';
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    display:flex; align-items:center; justify-content:center;
    z-index:999; padding:1.5rem;
  `;
  modal.innerHTML = `
    <div style="background:#fff; border-radius:1rem; padding:1.5rem; width:100%; max-width:420px; box-shadow:0 20px 40px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 0.5rem; font-size:1rem; color:#1e1b4b;">Firebase 동기화 URL 설정</h3>
      <p style="margin:0 0 1rem; font-size:0.8rem; color:#6b7280;">
        Firebase 콘솔 → Realtime Database → 데이터 탭 상단 URL<br>
        예) https://vocalog-xxxxx-default-rtdb.firebaseio.com
      </p>
      <input id="url-input" type="url" placeholder="https://..." value="${firebaseUrl}"
        style="width:100%; padding:0.75rem; border:1.5px solid #d1d5db; border-radius:0.5rem;
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

const handleSyncClick = () => {
  syncWithFirebase();
};

// --- Helper: Pronunciation ---
const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  const preferredNames = [
    'Google US English',
    'Microsoft David - English (United States)',
    'Microsoft Zira - English (United States)',
    'Samantha',
    'Alex'
  ];

  let selectedVoice = voices.find(v => preferredNames.some(p => v.name.includes(p)))
                   || voices.find(v => v.lang === 'en-US')
                   || voices.find(v => v.lang.startsWith('en-US'))
                   || voices.find(v => v.lang.startsWith('en'));

  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
};

// --- Views ---
const bindSyncButton = () => {
  const btn = document.getElementById('btn-sync');
  if (!btn) return;
  btn.title = '동기화';
  btn.onclick = handleSyncClick;
};

const renderListView = () => {
  viewTitle.innerHTML = `
    <div style="width: 10px;"></div>
    <div style="display:flex; align-items:center; justify-content:flex-start; flex:1; padding-left: 10px;">
      ${violetIconHTML}
      <span style="margin-left:10px;">VocaLog</span>
    </div>
    <button class="header-sync-btn" id="btn-sync" title="동기화">
      ${driveIconHTML}
    </button>
  `;
  bindSyncButton();

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
              <div class="voca-item-summary">${w.translation}</div>
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
    <button class="header-sync-btn" id="btn-sync" title="동기화">
      ${driveIconHTML}
    </button>
  `;
  bindSyncButton();
  appMain.innerHTML = `
    <div class="view detail-view">
      <div class="detail-header">
        <h2>${w.word}</h2>
        <button class="btn-pronounce" onclick="window.speak('${w.word}')">🔊</button>
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
    <button class="header-sync-btn" id="btn-sync" title="동기화">
      ${driveIconHTML}
    </button>
  `;
  bindSyncButton();
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
  if (!isBack) history.pushState({ view, data }, '', '');
  if (view === 'list') renderListView();
  else if (view === 'add' || view === 'edit') renderFormView(data);
  else if (view === 'detail') renderDetailView(data);
};

window.onpopstate = (event) => {
  if (event.state && event.state.view) {
    window.navigateTo(event.state.view, event.state.data, true);
  } else {
    window.navigateTo('list', null, true);
  }
};

window.saveWord = (index = null) => {
  const word = document.getElementById('input-word').value;
  if (!word) return alert('단어를 입력해주세요.');
  const data = {
    word,
    etymology: document.getElementById('input-etymology').value,
    example: document.getElementById('input-example').value,
    translation: document.getElementById('input-translation').value
  };
  if (index !== null) words[index] = data; else words.unshift(data);
  saveAll();
  window.navigateTo('list');
};

window.deleteWord = (index) => {
  if (confirm('삭제할까요?')) {
    deletedWords.add(words[index].word);
    localStorage.setItem('deleted_words', JSON.stringify([...deletedWords]));
    words.splice(index, 1);
    saveAll();
    window.navigateTo('list');
  }
};
window.speak = speak;

// --- Initialize ---
window.onload = () => {
  appMain = getAppMain();
  viewTitle = getViewTitle();
  fabContainer = getFabContainer();
  window.navigateTo('list');
};
