import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, string> = {};
const secureStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store[k] ?? null,
    setItem: async (k: string, v: string) => { store[k] = v; },
    removeItem: async (k: string) => { delete store[k]; },
    multiSet: async (pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => { store[k] = v; });
    },
    multiGet: async (keys: string[]) => keys.map((k) => [k, store[k] ?? null]),
    multiRemove: async (keys: string[]) => {
      keys.forEach((k) => { delete store[k]; });
    },
    getAllKeys: async () => Object.keys(store),
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => secureStore[k] ?? null,
  setItemAsync: async (k: string, v: string) => { secureStore[k] = v; },
  deleteItemAsync: async (k: string) => { delete secureStore[k]; },
}));

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://documents/',
  getInfoAsync: async () => ({ exists: false }),
  makeDirectoryAsync: async () => {},
  copyAsync: async () => {},
  deleteAsync: async () => {},
  writeAsStringAsync: async () => {},
  readAsStringAsync: async () => '{}',
  readDirectoryAsync: async () => ['elocare_export_1.json', 'other.txt'],
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  cacheDirectory: 'file://cache/',
}));

function clearStores() {
  Object.keys(store).forEach((k) => delete store[k]);
  Object.keys(secureStore).forEach((k) => delete secureStore[k]);
}

import {
  createProfile,
  getAllProfiles,
  getProfile,
  updateProfile,
  deleteProfile,
  setActiveProfile,
  getActiveProfileId,
  addCustomCard,
  removeCustomCard,
  toggleCardVisibility,
} from '@/lib/profiles-store';

describe('profiles-store', () => {
  beforeEach(() => {
    clearStores();
  });

  it('cria um perfil com campos obrigatorios', async () => {
    const p = await createProfile({ name: 'Maria' });
    expect(p.id).toBeTruthy();
    expect(p.name).toBe('Maria');
    expect(p.color).toBeTruthy();
    expect(p.createdAt).toBeTruthy();
    expect(p.customCards).toEqual([]);
    expect(p.hiddenCardIds).toEqual([]);
  });

  it('o primeiro perfil criado e ativado automaticamente', async () => {
    const p = await createProfile({ name: 'Joao' });
    const activeId = await getActiveProfileId();
    expect(activeId).toBe(p.id);
  });

  it('o segundo perfil criado nao muda o perfil ativo', async () => {
    const p1 = await createProfile({ name: 'Maria' });
    await createProfile({ name: 'Joao' });
    const activeId = await getActiveProfileId();
    expect(activeId).toBe(p1.id);
  });

  it('retorna todos os perfis criados', async () => {
    await createProfile({ name: 'Maria' });
    await createProfile({ name: 'Joao' });
    await createProfile({ name: 'Ana' });
    const all = await getAllProfiles();
    expect(all).toHaveLength(3);
    expect(all.map((p) => p.name)).toContain('Maria');
    expect(all.map((p) => p.name)).toContain('Joao');
  });

  it('atualiza campos do perfil', async () => {
    const p = await createProfile({ name: 'Maria' });
    const updated = await updateProfile(p.id, { name: 'Maria Clara' });
    expect(updated?.name).toBe('Maria Clara');
    expect(updated?.id).toBe(p.id);
    expect(updated?.createdAt).toBe(p.createdAt);

    const fromStore = await getProfile(p.id);
    expect(fromStore?.name).toBe('Maria Clara');
  });

  it('troca o perfil ativo corretamente', async () => {
    await createProfile({ name: 'Maria' });
    const p2 = await createProfile({ name: 'Joao' });
    await setActiveProfile(p2.id);
    const activeId = await getActiveProfileId();
    expect(activeId).toBe(p2.id);
  });

  it('deleta o perfil e remove do indice', async () => {
    const p = await createProfile({ name: 'Maria' });
    await deleteProfile(p.id);
    const all = await getAllProfiles();
    expect(all).toHaveLength(0);
    const fromStore = await getProfile(p.id);
    expect(fromStore).toBeNull();
  });

  it('adiciona cartao customizado ao perfil', async () => {
    const p = await createProfile({ name: 'Maria' });
    const card = await addCustomCard(p.id, {
      label: 'Boneca',
      imageUri: 'file://photo.jpg',
      categoryId: 'objects',
      color: '#D97706',
    });
    expect(card).not.toBeNull();
    expect(card?.label).toBe('Boneca');
    expect(card?.id.startsWith('custom_')).toBe(true);

    const updated = await getProfile(p.id);
    expect(updated?.customCards).toHaveLength(1);
  });

  it('remove cartao customizado do perfil', async () => {
    const p = await createProfile({ name: 'Maria' });
    const card = await addCustomCard(p.id, {
      label: 'Boneca',
      imageUri: 'file://photo.jpg',
      categoryId: 'objects',
      color: '#D97706',
    });
    await removeCustomCard(p.id, card!.id);
    const updated = await getProfile(p.id);
    expect(updated?.customCards).toHaveLength(0);
  });

  it('oculta e reexibe cartao para o perfil', async () => {
    const p = await createProfile({ name: 'Maria' });
    await toggleCardVisibility(p.id, 'water', true);
    let updated = await getProfile(p.id);
    expect(updated?.hiddenCardIds).toContain('water');

    await toggleCardVisibility(p.id, 'water', false);
    updated = await getProfile(p.id);
    expect(updated?.hiddenCardIds).not.toContain('water');
  });

  it('retorna null para perfil inexistente', async () => {
    const result = await getProfile('id_que_nao_existe');
    expect(result).toBeNull();
  });
});

describe('audio-cache', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearStores();
    global.fetch = originalFetch;
  });

  it('generateAudio retorna null se a API falhar', async () => {
    const { generateAudio } = await import('../lib/audio-cache');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const result = await generateAudio('Agua', 'water', 'bad-key', 'voice-id');
    expect(result).toBeNull();
  });

  it('isCacheReady retorna false quando manifesto esta vazio', async () => {
    const { isCacheReady } = await import('../lib/audio-cache');
    const ready = await isCacheReady('voice-id');
    expect(ready).toBe(false);
  });

  it('loadManifest retorna objeto vazio se nao existir', async () => {
    const { loadManifest } = await import('../lib/audio-cache');
    const manifest = await loadManifest();
    expect(manifest).toEqual({});
  });

  it('getCacheStats retorna zeros para cache vazio', async () => {
    const { getCacheStats } = await import('../lib/audio-cache');
    const stats = await getCacheStats();
    expect(stats.totalFiles).toBe(0);
    expect(stats.totalSizeMB).toBe(0);
  });
});

describe('telemetry', () => {
  beforeEach(() => {
    clearStores();
  });

  it('inicia e encerra uma sessao corretamente', async () => {
    const { startSession, endSession, getSessions, getActiveSession } =
      await import('../lib/telemetry');

    const session = await startSession('profile-1');
    expect(session.profileId).toBe('profile-1');
    expect(session.startedAt).toBeTruthy();
    expect(session.endedAt).toBeUndefined();

    const active = await getActiveSession();
    expect(active?.id).toBe(session.id);

    await endSession();
    const activeAfter = await getActiveSession();
    expect(activeAfter).toBeNull();

    const sessions = await getSessions('profile-1');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].endedAt).toBeTruthy();
  });

  it('registra cliques e acumula corretamente', async () => {
    const { startSession, recordClick } = await import('../lib/telemetry');
    await startSession('profile-1');

    await recordClick({
      profileId: 'profile-1',
      cardId: 'water',
      cardLabel: 'Agua',
      categoryId: 'needs',
    });
    await recordClick({
      profileId: 'profile-1',
      cardId: 'happy',
      cardLabel: 'Feliz',
      categoryId: 'feelings',
    });
    await recordClick({
      profileId: 'profile-1',
      cardId: 'water',
      cardLabel: 'Agua',
      categoryId: 'needs',
    });

    const { generateReport } = await import('../lib/telemetry');
    const report = await generateReport('profile-1', 'Maria', 30);

    expect(report.totalClicks).toBe(3);
    expect(report.topCards[0].cardId).toBe('water');
    expect(report.topCards[0].count).toBe(2);
  });

  it('registra frases corretamente', async () => {
    const { startSession, recordSentence, generateReport } = await import('../lib/telemetry');
    await startSession('profile-1');

    await recordSentence({
      profileId: 'profile-1',
      cardIds: ['want', 'water'],
      labels: ['Quero', 'Agua'],
    });

    const report = await generateReport('profile-1', 'Maria', 30);
    expect(report.totalSentences).toBe(1);
  });

  it('relatorio retorna zeros para periodo sem dados', async () => {
    const { generateReport } = await import('../lib/telemetry');
    const report = await generateReport('profile-sem-dados', 'Teste', 7);

    expect(report.totalClicks).toBe(0);
    expect(report.totalSentences).toBe(0);
    expect(report.totalSessions).toBe(0);
    expect(report.topCards).toHaveLength(0);
  });

  it('exportReportAsText gera texto formatado corretamente', async () => {
    const { startSession, recordClick, generateReport, exportReportAsText } = await import('../lib/telemetry');

    await startSession('profile-1');
    await recordClick({
      profileId: 'profile-1',
      cardId: 'water',
      cardLabel: 'Agua',
      categoryId: 'needs',
    });

    const report = await generateReport('profile-1', 'Maria', 30);
    const text = await exportReportAsText(report);

    expect(text).toContain('RELAT');
    expect(text).toContain('Maria');
    expect(text).toContain('Agua');
    expect(text).toContain('EloCare CAA');
  });

  it('limpeza de telemetria remove todos os dados do perfil', async () => {
    const { startSession, recordClick, clearTelemetry, generateReport } = await import('../lib/telemetry');

    await startSession('profile-1');
    await recordClick({
      profileId: 'profile-1',
      cardId: 'water',
      cardLabel: 'Agua',
      categoryId: 'needs',
    });
    await clearTelemetry('profile-1');

    const report = await generateReport('profile-1', 'Maria', 30);
    expect(report.totalClicks).toBe(0);
  });

  it('atividade diaria agrupa por data corretamente', async () => {
    const { startSession, recordClick, generateReport } = await import('../lib/telemetry');

    await startSession('profile-1');
    for (let i = 0; i < 3; i++) {
      await recordClick({
        profileId: 'profile-1',
        cardId: 'water',
        cardLabel: 'Agua',
        categoryId: 'needs',
      });
    }

    const report = await generateReport('profile-1', 'Maria', 30);
    expect(report.dailyActivity).toHaveLength(1);
    expect(report.dailyActivity[0].clicks).toBe(3);
  });
});

describe('lgpd', () => {
  beforeEach(() => {
    clearStores();
  });

  it('remove registros de telemetria com mais de 90 dias usando as chaves reais por perfil', async () => {
    const { enforceDataRetention } = await import('../lib/lgpd');
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();

    store.elocare_clicks_profile1 = JSON.stringify([
      { id: 'old-click', timestamp: oldDate },
      { id: 'new-click', timestamp: recentDate },
    ]);
    store.elocare_sentences_profile1 = JSON.stringify([
      { id: 'old-sentence', spokenAt: oldDate },
      { id: 'new-sentence', spokenAt: recentDate },
    ]);
    store.elocare_sessions_profile1 = JSON.stringify([
      { id: 'old-session', startedAt: oldDate },
      { id: 'new-session', startedAt: recentDate },
    ]);

    await enforceDataRetention();

    expect(JSON.parse(store.elocare_clicks_profile1)).toEqual([{ id: 'new-click', timestamp: recentDate }]);
    expect(JSON.parse(store.elocare_sentences_profile1)).toEqual([{ id: 'new-sentence', spokenAt: recentDate }]);
    expect(JSON.parse(store.elocare_sessions_profile1)).toEqual([{ id: 'new-session', startedAt: recentDate }]);
  });

  it('deleteAllData remove dados locais e chaves seguras', async () => {
    const { deleteAllData } = await import('../lib/lgpd');

    store.elocare_patient_name = 'Maria';
    store.elocare_elevenlabs_api_key = 'legacy-key';
    secureStore.elocare_elevenlabs_api_key = 'secure-key';
    secureStore.elocare_therapist_pin = '1234';

    const result = await deleteAllData();

    expect(result.success).toBe(true);
    expect(store.elocare_patient_name).toBeUndefined();
    expect(store.elocare_elevenlabs_api_key).toBeUndefined();
    expect(secureStore.elocare_elevenlabs_api_key).toBeUndefined();
    expect(secureStore.elocare_therapist_pin).toBeUndefined();
  });
});
