// hooks/useTelemetry.ts
// Hook para registro e consulta de telemetria
// ─────────────────────────────────────────────
import { useCallback, useEffect } from 'react';
import {
  startSession,
  endSession,
  recordClick,
  recordSentence,
  generateReport,
  exportReportAsText,
} from '@/lib/telemetry';

export function useTelemetry(profileId: string | null) {
  // Inicia sessão quando o perfil é carregado, encerra ao desmontar
  useEffect(() => {
    if (!profileId) return;
    startSession(profileId);
    return () => {
      endSession();
    };
  }, [profileId]);

  const logClick = useCallback(
    (cardId: string, cardLabel: string, categoryId: string) => {
      if (!profileId) return;
      recordClick({ profileId, cardId, cardLabel, categoryId });
    },
    [profileId]
  );

  const logSentence = useCallback(
    (cardIds: string[], labels: string[]) => {
      if (!profileId) return;
      recordSentence({ profileId, cardIds, labels });
    },
    [profileId]
  );

  const getReport = useCallback(
    async (profileName: string, days = 30) => {
      if (!profileId) return null;
      return generateReport(profileId, profileName, days);
    },
    [profileId]
  );

  const exportReport = useCallback(async (profileName: string) => {
    if (!profileId) return '';
    const report = await generateReport(profileId, profileName);
    return exportReportAsText(report);
  }, [profileId]);

  return { logClick, logSentence, getReport, exportReport };
}
