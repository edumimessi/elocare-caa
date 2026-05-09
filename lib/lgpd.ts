// ─────────────────────────────────────────────
// lib/lgpd.ts
// Conformidade LGPD — Lei 13.709/2018
// Dados de saúde de crianças: Art. 11 + Art. 14
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const KEYS = {
  CONSENT: 'elocare_lgpd_consent',         // { accepted: bool, timestamp: string, version: string }
  RETENTION_DAYS: 90,                        // máximo de dias para dados de telemetria
};

const CONSENT_VERSION = '1.0'; // incrementar quando a política mudar

// ── CONSENTIMENTO ────────────────────────────

export type ConsentRecord = {
  accepted: boolean;
  timestamp: string;
  version: string;
  responsibleName?: string;
};

export async function getConsent(): Promise<ConsentRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CONSENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function hasValidConsent(): Promise<boolean> {
  const consent = await getConsent();
  return !!(consent?.accepted && consent.version === CONSENT_VERSION);
}

export async function grantConsent(responsibleName?: string): Promise<void> {
  const record: ConsentRecord = {
    accepted: true,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
    responsibleName,
  };
  await AsyncStorage.setItem(KEYS.CONSENT, JSON.stringify(record));
}

export async function revokeConsent(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.CONSENT);
}

// ── DIREITO AO ESQUECIMENTO (Art. 18, VI) ────

/**
 * Apaga TODOS os dados do app: perfis, telemetria, cache de áudio, configurações.
 * Irreversível. Deve ser precedido de confirmação do usuário.
 */
export async function deleteAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Apagar todas as chaves do AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    const elocareKeys = allKeys.filter((k) => k.startsWith('elocare_'));
    if (elocareKeys.length > 0) {
      await AsyncStorage.multiRemove(elocareKeys);
    }

    // 2. Apagar cache de áudio
    const cacheDir = `${FileSystem.documentDirectory}audio_cache/`;
    const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
    if (cacheInfo.exists) {
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    }

    // 3. Apagar fotos de perfis
    const profilesDir = `${FileSystem.documentDirectory}profiles/`;
    const profilesInfo = await FileSystem.getInfoAsync(profilesDir);
    if (profilesInfo.exists) {
      await FileSystem.deleteAsync(profilesDir, { idempotent: true });
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── PORTABILIDADE (Art. 18, V) ───────────────

/**
 * Exporta todos os dados do usuário em formato JSON legível.
 * Salva em documentDirectory para ser compartilhado via share sheet.
 */
export async function exportUserData(): Promise<{ fileUri: string } | { error: string }> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const elocareKeys = allKeys.filter((k) => k.startsWith('elocare_'));
    const pairs = await AsyncStorage.multiGet(elocareKeys);

    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      lgpdVersion: CONSENT_VERSION,
      data: {},
    };

    for (const [key, value] of pairs) {
      try {
        (exportData.data as Record<string, unknown>)[key] = value ? JSON.parse(value) : null;
      } catch {
        (exportData.data as Record<string, unknown>)[key] = value;
      }
    }

    const fileName = `elocare_export_${Date.now()}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

    return { fileUri };
  } catch (err) {
    return { error: String(err) };
  }
}

// ── RETENÇÃO AUTOMÁTICA (Art. 15) ────────────

/**
 * Remove eventos de telemetria com mais de RETENTION_DAYS dias.
 * Deve ser chamado no startup do app.
 */
export async function enforceDataRetention(): Promise<void> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - KEYS.RETENTION_DAYS);
    const cutoffISO = cutoff.toISOString();

    const allKeys = await AsyncStorage.getAllKeys();

    // Limpar sessões antigas
    const sessionKeys = allKeys.filter((k) => k.startsWith('elocare_session_'));
    for (const key of sessionKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      try {
        const session = JSON.parse(raw);
        if (session.startedAt < cutoffISO) {
          await AsyncStorage.removeItem(key);
        }
      } catch {
        // Dado corrompido — remover
        await AsyncStorage.removeItem(key);
      }
    }

    // Limpar eventos de clique antigos
    const clickKey = 'elocare_click_events';
    const clickRaw = await AsyncStorage.getItem(clickKey);
    if (clickRaw) {
      const events: { timestamp: string }[] = JSON.parse(clickRaw);
      const filtered = events.filter((e) => e.timestamp >= cutoffISO);
      await AsyncStorage.setItem(clickKey, JSON.stringify(filtered));
    }

    // Limpar eventos de frase antigos
    const sentenceKey = 'elocare_sentence_events';
    const sentenceRaw = await AsyncStorage.getItem(sentenceKey);
    if (sentenceRaw) {
      const events: { spokenAt: string }[] = JSON.parse(sentenceRaw);
      const filtered = events.filter((e) => e.spokenAt >= cutoffISO);
      await AsyncStorage.setItem(sentenceKey, JSON.stringify(filtered));
    }
  } catch {
    // Silencioso — não interromper o startup do app
  }
}

// ── ANONIMIZAÇÃO PARA RELATÓRIOS AGREGADOS ───

/**
 * Retorna uma versão anonimizada do nome do perfil para relatórios externos.
 * Ex: "Maria Fernanda" → "M.F." | "João" → "J."
 */
export function anonymizeName(name: string): string {
  return name
    .split(' ')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + '.' : ''))
    .join('');
}
