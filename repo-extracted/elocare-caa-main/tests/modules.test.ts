// ─────────────────────────────────────────────
// tests/profiles.test.ts
// Testes unitários — profiles-store
// ─────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock do AsyncStorage ─────────────────────
const store: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem:    async (k: string) => store[k] ?? null,
    setItem:    async (k: string, v: string) => { store[k] = v; },
    removeItem: async (k: string) => { delete store[k]; },
    multiSet:   async (pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => { store[k] = v; });
    },
  },
}));

// ── Mock do FileSystem ───────────────────────
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://documents/',
  getInfoAsync:    async () => ({ exists: false }),
  makeDirectoryAsync: async () => {},
  copyAsync:       async () => {},
  deleteAsync:     async () => {},
  writeAsStringAsync: async () => {},
  readAsStringAsync:  async () => '{}',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  cacheDirectory: 'file://cache/',
}));

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
    // Limpa o store entre testes
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('cria um perfil com campos obrigatórios', async () => {
    const p = await createProfile({ name: 'Maria' });
    expect(p.id).toBeTruthy();
    expect(p.name).toBe('Maria');
    expect(p.color).toBeTruthy();
    expect(p.createdAt).toBeTruthy();
    expect(p.customCards).toEqual([]);
    expect(p.hiddenCardIds).toEqual([]);
  });

  it('o primeiro perfil criado é ativado automaticamente', async () => {
    const p = await createProfile({ name: 'João' });
    const activeId = await getActiveProfileId();
    expect(activeId).toBe(p.id);
  });

  it('o segundo perfil criado NÃO muda o perfil ativo', async () => {
    const p1 = await createProfile({ name: 'Maria' });
    await createProfile({ name: 'João' });
    const activeId = await getActiveProfileId();
    expect(activeId).toBe(p1.id);
  });

  it('retorna todos os perfis criados', async () => {
    await createProfile({ name: 'Maria' });
    await createProfile({ name: 'João' });
    await createProfile({ name: 'Ana' });
    const all = await getAllProfiles();
    expect(all).toHaveLength(3);
    expect(all.map((p) => p.name)).toContain('Maria');
    expect(all.map((p) => p.name)).toContain('João');
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
    const p1 = await createProfile({ name: 'Maria' });
    const p2 = await createProfile({ name: 'João' });
    await setActiveProfile(p2.id);
    const activeId = await getActiveProfileId();
    expect(activeId).toBe(p2.id);
  });

  it('deleta o perfil e remove do índice', async () => {
    const p = await createProfile({ name: 'Maria' });
    await deleteProfile(p.id);
    const all = await getAllProfiles();
    expect(all).toHaveLength(0);
    const fromStore = await getProfile(p.id);
    expect(fromStore).toBeNull();
  });

  it('adiciona cartão customizado ao perfil', async () => {
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

  it('remove cartão customizado do perfil', async () => {
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

  it('oculta e reexibe cartão para o perfil', async () => {
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


// ─────────────────────────────────────────────
// tests/audio-cache.test.ts
// Testes unitários — audio-cache
// ─────────────────────────────────────────────
describe('audio-cache', () => {
  // Mock global fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    // Reset fetch mock
    global.fetch = originalFetch;
  });

  it('generateAudio retorna null se a API falhar', async () => {
    const { generateAudio } = await import('../lib/audio-cache');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const result = await generateAudio('Água', 'water', 'bad-key', 'voice-id');
    expect(result).toBeNull();
  });

  it('isCacheReady retorna false quando manifesto está vazio', async () => {
    const { isCacheReady } = await import('../lib/audio-cache');
    const ready = await isCacheReady('voice-id');
    expect(ready).toBe(false);
  });

  it('loadManifest retorna objeto vazio se não existir', async () => {
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


// ─────────────────────────────────────────────
// tests/telemetry.test.ts
// Testes unitários — telemetria clínica
// ─────────────────────────────────────────────
describe('telemetry', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('inicia e encerra uma sessão corretamente', async () => {
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
      cardLabel: 'Água',
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
      cardLabel: 'Água',
      categoryId: 'needs',
    });

    const { generateReport } = await import('../lib/telemetry');
    const report = await generateReport('profile-1', 'Maria', 30);

    expect(report.totalClicks).toBe(3);
    expect(report.topCards[0].cardId).toBe('water');
    expect(report.topCards[0].count).toBe(2);
  });

  it('registra frases corretamente', async () => {
    const { startSession, recordSentence, generateReport } =
      await import('../lib/telemetry');
    await startSession('profile-1');

    await recordSentence({
      profileId: 'profile-1',
      cardIds: ['want', 'water'],
      labels: ['Quero', 'Água'],
    });

    const report = await generateReport('profile-1', 'Maria', 30);
    expect(report.totalSentences).toBe(1);
  });

  it('relatório retorna zeros para período sem dados', async () => {
    const { generateReport } = await import('../lib/telemetry');
    const report = await generateReport('profile-sem-dados', 'Teste', 7);

    expect(report.totalClicks).toBe(0);
    expect(report.totalSentences).toBe(0);
    expect(report.totalSessions).toBe(0);
    expect(report.topCards).toHaveLength(0);
  });

  it('exportReportAsText gera texto formatado corretamente', async () => {
    const { startSession, recordClick, generateReport, exportReportAsText } =
      await import('../lib/telemetry');

    await startSession('profile-1');
    await recordClick({
      profileId: 'profile-1',
      cardId: 'water',
      cardLabel: 'Água',
      categoryId: 'needs',
    });

    const report = await generateReport('profile-1', 'Maria', 30);
    const text = await exportReportAsText(report);

    expect(text).toContain('RELATÓRIO DE COMUNICAÇÃO');
    expect(text).toContain('Maria');
    expect(text).toContain('Água');
    expect(text).toContain('EloCare CAA');
  });

  it('limpeza de telemetria remove todos os dados do perfil', async () => {
    const { startSession, recordClick, clearTelemetry, generateReport } =
      await import('../lib/telemetry');

    await startSession('profile-1');
    await recordClick({
      profileId: 'profile-1',
      cardId: 'water',
      cardLabel: 'Água',
      categoryId: 'needs',
    });
    await clearTelemetry('profile-1');

    const report = await generateReport('profile-1', 'Maria', 30);
    expect(report.totalClicks).toBe(0);
  });

  it('atividade diária agrupa por data corretamente', async () => {
    const { startSession, recordClick, generateReport } =
      await import('../lib/telemetry');

    await startSession('profile-1');
    // 3 cliques no mesmo dia (hoje)
    for (let i = 0; i < 3; i++) {
      await recordClick({
        profileId: 'profile-1',
        cardId: 'water',
        cardLabel: 'Água',
        categoryId: 'needs',
      });
    }

    const report = await generateReport('profile-1', 'Maria', 30);
    expect(report.dailyActivity).toHaveLength(1);
    expect(report.dailyActivity[0].clicks).toBe(3);
  });
});
