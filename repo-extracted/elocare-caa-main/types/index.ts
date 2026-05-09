// ─────────────────────────────────────────────
// TIPOS COMPARTILHADOS — EloCare CAA
// ─────────────────────────────────────────────

// ── PERFIS ──────────────────────────────────
export type Profile = {
  id: string;                  // uuid
  name: string;                // "Maria", "João"
  photoUri?: string;           // foto local do dispositivo
  color: string;               // cor do avatar (#hex)
  therapistName?: string;      // "Dra. Ana Lima"
  diagnosis?: string;          // "TEA nível 2" — uso interno
  birthDate?: string;          // ISO date string
  createdAt: string;           // ISO datetime
  updatedAt: string;
  customCards?: CustomCard[];  // cartões personalizados do perfil
  hiddenCardIds?: string[];    // cartões desativados para este perfil
};

export type CustomCard = {
  id: string;
  label: string;
  imageUri: string;            // foto real do objeto/pessoa
  audioUri?: string;           // áudio pré-gerado ElevenLabs
  categoryId: string;
  color: string;
  createdAt: string;
};

// ── CACHE DE ÁUDIO ───────────────────────────
export type AudioCacheEntry = {
  cardId: string;
  voiceId: string;             // qual voz foi usada
  fileUri: string;             // caminho local
  generatedAt: string;         // ISO datetime
  sizeBytes: number;
};

// CORRIGIDO: chave é `${cardId}__${voiceId}`, não apenas cardId
export type AudioCacheManifest = {
  [cacheKey: string]: AudioCacheEntry;
};

export type PreGenerationStatus = {
  total: number;
  completed: number;
  failed: string[];            // ids dos cartões que falharam
  isRunning: boolean;
  lastRun?: string;
};

// ── TELEMETRIA ───────────────────────────────
export type ClickEvent = {
  id: string;
  profileId: string;
  sessionId: string;
  cardId: string;
  cardLabel: string;
  categoryId: string;
  timestamp: string;           // ISO datetime
};

export type SentenceEvent = {
  id: string;
  profileId: string;
  sessionId: string;
  cardIds: string[];
  labels: string[];
  spokenAt: string;
};

export type Session = {
  id: string;
  profileId: string;
  startedAt: string;
  endedAt?: string;
  clickCount: number;
  sentenceCount: number;
};

export type TelemetryReport = {
  profileId: string;
  profileName: string;
  periodStart: string;
  periodEnd: string;
  totalSessions: number;
  totalClicks: number;
  totalSentences: number;
  topCards: { cardId: string; label: string; count: number }[];
  topCategories: { categoryId: string; label: string; count: number }[];
  dailyActivity: { date: string; clicks: number; sentences: number }[];
};
