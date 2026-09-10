import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Listen on all network interfaces (0.0.0.0, localhost, 127.0.0.1)
    strictPort: false,
    open: false
  },
  optimizeDeps: {
    include: ['@mediapipe/pose', '@mediapipe/camera_utils', 'canvas-confetti', 'lucide-react']
  }
});
