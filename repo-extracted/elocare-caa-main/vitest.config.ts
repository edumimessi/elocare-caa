import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      // Mockar módulos nativos do Expo que não funcionam em Node.js
      'expo-audio': path.resolve(__dirname, 'tests/__mocks__/expo-audio.ts'),
      'expo-file-system/legacy': path.resolve(__dirname, 'tests/__mocks__/expo-file-system.ts'),
      'expo-speech': path.resolve(__dirname, 'tests/__mocks__/expo-speech.ts'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
