// --- Global Error Handling for ChunkLoadError (Self-healing) ---
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
    console.warn('Vite ChunkLoadError detect: Reloading app to fetch latest version...');
    window.location.reload();
  }
}, true);

import './style.css';
import { setAuthState, getCurrentView } from "./store.js";
import { onAuthChanged, syncWithFirebase } from "./firebase.js";
import { renderUnauthorizedView, renderLoginView } from "./ui.js";

// 브라우저 뒤로가기 버튼 처리
window.onpopstate = (event) => {
  if (event.state && event.state.view) {
    window.navigateTo(event.state.view, event.state.data, true);
  } else {
    window.navigateTo('list', null, true);
  }
};

// --- 앱 초기화 및 인증 이벤트 바인딩 ---
onAuthChanged((user) => {
  if (user) {
    if (user.email === '2gateless@gmail.com') {
      setAuthState(true, user);
      syncWithFirebase(() => {
        window.navigateTo(getCurrentView());
      });
      window.navigateTo(getCurrentView());
    } else {
      setAuthState(false, user);
      renderUnauthorizedView(user.email);
    }
  } else {
    setAuthState(false, null);
    renderLoginView();
  }
});
