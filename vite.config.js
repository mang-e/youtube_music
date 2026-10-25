import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'client',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      // ✅ @/ 를 client/src/ 로 연결
      '@': path.resolve(__dirname, './client/src')
    }
  },
  // ✅ 없는 환경변수 빈 값으로 처리
  define: {
    'import.meta.env.VITE_ANALYTICS_ENDPOINT': JSON.stringify(''),
    'import.meta.env.VITE_ANALYTICS_WEBSITE_ID': JSON.stringify('')
  }
});
