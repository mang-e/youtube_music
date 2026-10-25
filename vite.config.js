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
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared') // ✅ 이 줄 추가!
    }
  },
  define: {
    'import.meta.env.VITE_ANALYTICS_ENDPOINT': JSON.stringify(''),
    'import.meta.env.VITE_ANALYTICS_WEBSITE_ID': JSON.stringify('')
  }
});
