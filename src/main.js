// --- ChunkLoadError 전역 복구 핸들러 ---
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
    console.warn('Vite ChunkLoadError 감지: 최신 버전을 불러오기 위해 새로고침합니다.');
    window.location.reload();
  }
}, true);

import './style.css';
import { setAuthState, getCurrentView, getCurrentData } from "./store.js";
import { onAuthChanged, syncWithFirebase } from "./firebase.js";
import { navigateTo, renderUnauthorizedView, renderLoginView } from "./ui.js";

// 브라우저 뒤로가기 버튼 처리
window.onpopstate = (event) => {
  if (event.state && event.state.view) {
    navigateTo(event.state.view, event.state.data, true);
  } else {
    navigateTo('list', null, true);
  }
};

// --- 앱 초기화 및 인증 이벤트 바인딩 ---
onAuthChanged((user) => {
  if (user) {
    if (user.email === '2gateless@gmail.com') {
      setAuthState(true, user);
      // 로컬 캐시 데이터로 즉시 첫 화면 렌더링
      navigateTo(getCurrentView(), getCurrentData(), true);

      // 백그라운드 동기화: 변경사항이 있고 폼 입력 중이 아닐 때만 화면 갱신
      syncWithFirebase(() => {
        const view = getCurrentView();
        if (view !== 'add' && view !== 'edit') {
          navigateTo(view, getCurrentData(), true);
        }
      }, { silent: true });
    } else {
      setAuthState(false, user);
      renderUnauthorizedView(user.email);
    }
  } else {
    setAuthState(false, null);
    renderLoginView();
  }
});
