// Mock de expo-audio para ambiente de testes Node.js
export const createAudioPlayer = () => ({
  play: () => {},
  pause: () => {},
  remove: () => {},
  addListener: () => ({ remove: () => {} }),
  playing: false,
});

export const setAudioModeAsync = async () => {};
