// ─────────────────────────────────────────────
// lib/telemetry.ts
// Registro de uso e geração de relatórios clínicos
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClickEvent, SentenceEvent, Session, TelemetryReport } from '@/types';
import { CATEGORIES } from '@/lib/caa-data';

const KEYS = {
  SESSIONS_PREFIX: 'elocare_sessions_',          // + profileId → Session[]
  CLICKS_PREFIX: 'elocare_clicks_',              // + profileId → ClickEvent[]
  SENTENCES_PREFIX: 'elocare_sentences_',        // + profileId → SentenceEvent[]
  ACTIVE_SESSION: 'elocare_active_session',
};

// Máximo de eventos por perfil antes de arquivar
const MAX_CLICKS_PER_PROFILE = 5000;
const MAX_SENTENCES_PER_PROFILE = 1000;

// ── SESSÕES ──────────────────────────────────

export async function startSession(profileId: string): Promise<Session> {
  const session: Session = {
    id: generateId(),
    profileId,
    startedAt: new Date().toISOString(),
    clickCount: 0,
    sentenceCount: 0,
  };

  await AsyncStorage.setItem(
    KEYS.ACTIVE_SESSION,
    JSON.stringify(session)
  );

  return session;
}

export async function endSession(): Promise<void> {
  const session = await getActiveSession();
  if (!session) return;

  const ended: Session = {
    ...session,
    endedAt: new Date().toISOString(),
  };

  // Persiste no histórico do perfil
  const sessions = await getSessions(session.profileId);
  sessions.push(ended);

  await AsyncStorage.setItem(
    KEYS.SESSIONS_PREFIX + session.profileId,
    JSON.stringify(sessions)
  );

  await AsyncStorage.removeItem(KEYS.ACTIVE_SESSION);
}

export async function getActiveSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function updateActiveSession(
  updates: Partial<Session>
): Promise<void> {
  const session = await getActiveSession();
  if (!session) return;
  await AsyncStorage.setItem(
    KEYS.ACTIVE_SESSION,
    JSON.stringify({ ...session, ...updates })
  );
}

export async function getSessions(profileId: string): Promise<Session[]> {
  try {
    const raw = await AsyncStorage.getItem(
      KEYS.SESSIONS_PREFIX + profileId
    );
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── REGISTRO DE EVENTOS ──────────────────────

export async function recordClick(data: {
  profileId: string;
  cardId: string;
  cardLabel: string;
  categoryId: string;
}): Promise<void> {
  const session = await getActiveSession();

  const event: ClickEvent = {
    id: generateId(),
    profileId: data.profileId,
    sessionId: session?.id ?? 'no_session',
    cardId: data.cardId,
    cardLabel: data.cardLabel,
    categoryId: data.categoryId,
    timestamp: new Date().toISOString(),
  };

  const key = KEYS.CLICKS_PREFIX + data.profileId;
  const clicks = await getClicks(data.profileId);
  clicks.push(event);

  // Rotação: mantém só os últimos MAX_CLICKS_PER_PROFILE
  const trimmed = clicks.slice(-MAX_CLICKS_PER_PROFILE);
  await AsyncStorage.setItem(key, JSON.stringify(trimmed));

  // Atualiza contador da sessão ativa
  if (session) {
    await updateActiveSession({ clickCount: (session.clickCount ?? 0) + 1 });
  }
}

export async function recordSentence(data: {
  profileId: string;
  cardIds: string[];
  labels: string[];
}): Promise<void> {
  const session = await getActiveSession();

  const event: SentenceEvent = {
    id: generateId(),
    profileId: data.profileId,
    sessionId: session?.id ?? 'no_session',
    cardIds: data.cardIds,
    labels: data.labels,
    spokenAt: new Date().toISOString(),
  };

  const key = KEYS.SENTENCES_PREFIX + data.profileId;
  const sentences = await getSentences(data.profileId);
  sentences.push(event);

  const trimmed = sentences.slice(-MAX_SENTENCES_PER_PROFILE);
  await AsyncStorage.setItem(key, JSON.stringify(trimmed));

  if (session) {
    await updateActiveSession({
      sentenceCount: (session.sentenceCount ?? 0) + 1,
    });
  }
}

async function getClicks(profileId: string): Promise<ClickEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(
      KEYS.CLICKS_PREFIX + profileId
    );
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function getSentences(
  profileId: string
): Promise<SentenceEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(
      KEYS.SENTENCES_PREFIX + profileId
    );
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── RELATÓRIO CLÍNICO ────────────────────────

export async function generateReport(
  profileId: string,
  profileName: string,
  periodDays: number = 30
): Promise<TelemetryReport> {
  const now = new Date();
  const periodStart = new Date(
    now.getTime() - periodDays * 24 * 60 * 60 * 1000
  );

  const [allClicks, allSentences, allSessions] = await Promise.all([
    getClicks(profileId),
    getSentences(profileId),
    getSessions(profileId),
  ]);

  // Filtra pelo período
  const clicks = allClicks.filter(
    (e) => new Date(e.timestamp) >= periodStart
  );
  const sentences = allSentences.filter(
    (e) => new Date(e.spokenAt) >= periodStart
  );
  const sessions = allSessions.filter(
    (s) => new Date(s.startedAt) >= periodStart
  );

  // Top cartões
  const cardCount: Record<string, { label: string; count: number }> = {};
  for (const click of clicks) {
    if (!cardCount[click.cardId]) {
      cardCount[click.cardId] = { label: click.cardLabel, count: 0 };
    }
    cardCount[click.cardId].count++;
  }
  const topCards = Object.entries(cardCount)
    .map(([cardId, v]) => ({ cardId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top categorias
  const catCount: Record<string, number> = {};
  for (const click of clicks) {
    catCount[click.categoryId] = (catCount[click.categoryId] ?? 0) + 1;
  }
  const categoryMap = Object.fromEntries(
    CATEGORIES.map((c) => [c.id, c.label])
  );
  const topCategories = Object.entries(catCount)
    .map(([categoryId, count]) => ({
      categoryId,
      label: categoryMap[categoryId] ?? categoryId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Atividade diária
  const dailyMap: Record<string, { clicks: number; sentences: number }> = {};

  for (const click of clicks) {
    const date = click.timestamp.slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { clicks: 0, sentences: 0 };
    dailyMap[date].clicks++;
  }
  for (const sentence of sentences) {
    const date = sentence.spokenAt.slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { clicks: 0, sentences: 0 };
    dailyMap[date].sentences++;
  }

  const dailyActivity = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    profileId,
    profileName,
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    totalSessions: sessions.length,
    totalClicks: clicks.length,
    totalSentences: sentences.length,
    topCards,
    topCategories,
    dailyActivity,
  };
}

// ── EXPORT PARA TERAPEUTA ────────────────────
// Gera texto formatado para copiar / enviar

export async function exportReportAsText(
  report: TelemetryReport
): Promise<string> {
  const start = new Date(report.periodStart).toLocaleDateString('pt-BR');
  const end = new Date(report.periodEnd).toLocaleDateString('pt-BR');

  const topCardsText = report.topCards
    .slice(0, 5)
    .map((c, i) => `  ${i + 1}. ${c.label} — ${c.count}x`)
    .join('\n');

  const topCatText = report.topCategories
    .slice(0, 3)
    .map((c) => `  • ${c.label}: ${c.count} cliques`)
    .join('\n');

  return `
RELATÓRIO DE COMUNICAÇÃO — ${report.profileName}
Período: ${start} a ${end}
─────────────────────────────────
Sessões realizadas: ${report.totalSessions}
Total de cliques: ${report.totalClicks}
Frases construídas: ${report.totalSentences}

TOP 5 VOCABULÁRIO MAIS USADO:
${topCardsText}

CATEGORIAS MAIS ACESSADAS:
${topCatText}

Relatório gerado pelo EloCare CAA
  `.trim();
}

// ── LIMPEZA ──────────────────────────────────

export async function clearTelemetry(profileId: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.CLICKS_PREFIX + profileId),
    AsyncStorage.removeItem(KEYS.SENTENCES_PREFIX + profileId),
    AsyncStorage.removeItem(KEYS.SESSIONS_PREFIX + profileId),
  ]);
}

// ── HELPER ───────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
