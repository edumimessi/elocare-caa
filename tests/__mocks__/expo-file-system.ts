// Mock de expo-file-system/legacy para ambiente de testes Node.js
export const documentDirectory = '/mock/documents/';
export const cacheDirectory = '/mock/cache/';

export const getInfoAsync = async (_uri: string) => ({ exists: false, isDirectory: false });
export const makeDirectoryAsync = async () => {};
export const readAsStringAsync = async (_uri: string) => '{}';
export const writeAsStringAsync = async () => {};
export const deleteAsync = async () => {};
export const copyAsync = async () => {};
export const moveAsync = async () => {};
export const downloadAsync = async () => ({ uri: '/mock/file.mp3', status: 200 });
