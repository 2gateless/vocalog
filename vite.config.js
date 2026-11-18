import { defineConfig } from 'vite';

export default defineConfig({
  base: '/vocalog/',
  build: {
    rollupOptions: {
      output: {
        // Firebase SDK를 Auth(초기 필수)와 Database(지연 로드) 벤더 청크로 분리
        manualChunks(id) {
          if (id.includes('node_modules/@firebase/database') || id.includes('node_modules/firebase/database')) {
            return 'firebase-db';
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-auth';
          }
        }
      }
    }
  }
});
