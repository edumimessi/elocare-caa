// -------------------------------------------------------------
// lib/lgpd.ts
// Conformidade LGPD - Lei 13.709/2018
// Dados de saude de criancas: Art. 11 + Art. 14
// -------------------------------------------------------------
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { SECURE_SETTING_KEYS } from '@/lib/settings-store';

const KEYS = {
  CONSENT: 'elocare_lgpd_consent',
  RETENTION_DAYS: 90,
};

const CONSENT_VERSION = '1.0';
const ELOCARE_PREFIX = 'elocare_';
const AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}audio_cache/`;
const AUDIO_MANIFEST_PATH = `${FileSystem.documentDirectory}audio_manifest.json`;
const PROFILES_DIR = `${FileSystem.documentDirectory}profiles/`;
const EXPORT_PREFIX = 'elocare_export_';

// -------------------------------------------------------------
// CONSENTIMENTO
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// DIREITO AO ESQUECIMENTO (Art. 18, VI)
// -------------------------------------------------------------

async function deleteIfExists(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

async function deleteSecureSettings(): Promise<void> {
  await Promise.all(
    SECURE_SETTING_KEYS.map(async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // SecureStore may be unavailable on some runtimes.
      }
    })
  );
}

async function deleteExportFiles(): Promise<void> {
  try {
    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) return;

    const files = await FileSystem.readDirectoryAsync(documentDirectory);
    await Promise.all(
      files
        .filter((fileName) => fileName.startsWith(EXPORT_PREFIX))
        .map((fileName) =>
          FileSystem.deleteAsync(`${documentDirectory}${fileName}`, { idempotent: true })
        )
    );
  } catch {
    // Export cleanup is best-effort and should not block deletion.
  }
}

/**
 * Apaga TODOS os dados do app: perfis, telemetria, cache de audio, configuracoes e exports.
 * Irreversivel. Deve ser precedido de confirmacao do usuario.
 */
export async function deleteAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const elocareKeys = allKeys.filter((k) => k.startsWith(ELOCARE_PREFIX));
    if (elocareKeys.length > 0) {
      await AsyncStorage.multiRemove(elocareKeys);
    }

    await Promise.all([
      deleteSecureSettings(),
      deleteIfExists(AUDIO_CACHE_DIR),
      deleteIfExists(AUDIO_MANIFEST_PATH),
      deleteIfExists(PROFILES_DIR),
      deleteExportFiles(),
    ]);

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// -------------------------------------------------------------
// PORTABILIDADE (Art. 18, V)
// -------------------------------------------------------------

/**
 * Exporta todos os dados do usuario em formato JSON legivel.
 * Salva em documentDirectory para ser compartilhado via share sheet.
 */
export async function exportUserData(): Promise<{ fileUri: string } | { error: string }> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const elocareKeys = allKeys.filter((k) => k.startsWith(ELOCARE_PREFIX));
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

    const fileName = `${EXPORT_PREFIX}${Date.now()}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

    return { fileUri };
  } catch (err) {
    return { error: String(err) };
  }
}

// -------------------------------------------------------------
// RETENCAO AUTOMATICA (Art. 15)
// -------------------------------------------------------------

type StoredRecord = Record<string, unknown>;

function filterRecordsByDate(
  records: StoredRecord[],
  dateField: string,
  cutoffISO: string
): StoredRecord[] {
  return records.filter((record) => {
    const value = record[dateField];
    return typeof value === 'string' && value >= cutoffISO;
  });
}

async function trimArrayStorage(
  key: string,
  dateField: string,
  cutoffISO: string
): Promise<void> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return;

  try {
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) {
      await AsyncStorage.removeItem(key);
      return;
    }

    const filtered = filterRecordsByDate(records, dateField, cutoffISO);
    if (filtered.length === 0) {
      await AsyncStorage.removeItem(key);
    } else if (filtered.length !== records.length) {
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

async function trimLegacySingleSession(key: string, cutoffISO: string): Promise<void> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return;

  try {
    const session = JSON.parse(raw);
    if (!session?.startedAt || session.startedAt < cutoffISO) {
      await AsyncStorage.removeItem(key);
    }
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

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
    const tasks: Promise<void>[] = [];

    for (const key of allKeys) {
      if (key.startsWith('elocare_clicks_') || key === 'elocare_click_events') {
        tasks.push(trimArrayStorage(key, 'timestamp', cutoffISO));
      } else if (key.startsWith('elocare_sentences_') || key === 'elocare_sentence_events') {
        tasks.push(trimArrayStorage(key, 'spokenAt', cutoffISO));
      } else if (key.startsWith('elocare_sessions_')) {
        tasks.push(trimArrayStorage(key, 'startedAt', cutoffISO));
      } else if (key.startsWith('elocare_session_')) {
        tasks.push(trimLegacySingleSession(key, cutoffISO));
      }
    }

    await Promise.all(tasks);
  } catch {
    // Silencioso para nao interromper o startup do app.
  }
}

// -------------------------------------------------------------
// ANONIMIZACAO PARA RELATORIOS AGREGADOS
// -------------------------------------------------------------

/**
 * Retorna uma versao anonimizada do nome do perfil para relatorios externos.
 * Ex: "Maria Fernanda" -> "M.F." | "Joao" -> "J."
 */
export function anonymizeName(name: string): string {
  return name
    .split(' ')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + '.' : ''))
    .join('');
}
