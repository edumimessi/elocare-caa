// ─────────────────────────────────────────────
// app/(tabs)/report.tsx
// Tela de relatório clínico — área do terapeuta
// ─────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useProfiles } from '@/hooks/useProfiles';
import { generateReport, exportReportAsText } from '@/lib/telemetry';
import { TelemetryReport } from '@/types';

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
];

export default function ReportScreen() {
  const colors = useColors();
  const { profiles, activeProfile } = useProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState(
    activeProfile?.id ?? null
  );
  const [period, setPeriod] = useState(30);
  const [report, setReport] = useState<TelemetryReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;
    const r = await generateReport(selectedProfileId, profile.name, period);
    setReport(r);
    setLoading(false);
  }, [selectedProfileId, period, profiles]);

  const handleShare = useCallback(async () => {
    if (!report) return;
    const text = await exportReportAsText(report);
    Share.share({ message: text, title: `Relatório ${report.profileName}` });
  }, [report]);

  const startDate = report
    ? new Date(report.periodStart).toLocaleDateString('pt-BR')
    : '';
  const endDate = report
    ? new Date(report.periodEnd).toLocaleDateString('pt-BR')
    : '';

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>📊 Relatório Clínico</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Seleção de paciente */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          PACIENTE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.chips}>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelectedProfileId(p.id)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedProfileId === p.id ? p.color : colors.surface,
                  borderColor: p.color,
                },
              ]}
            >
              <Text style={{
                color: selectedProfileId === p.id ? '#FFF' : p.color,
                fontWeight: '600', fontSize: 14,
              }}>
                {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Seleção de período */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          PERÍODO
        </Text>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setPeriod(opt.value)}
              style={[
                styles.periodChip,
                {
                  backgroundColor:
                    period === opt.value ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{
                color: period === opt.value ? '#FFF' : colors.foreground,
                fontWeight: '600', fontSize: 13,
              }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={loadReport}
          style={({ pressed }) => [
            styles.generateBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.generateBtnText}>
            {loading ? 'Gerando...' : '📋 Gerar Relatório'}
          </Text>
        </Pressable>

        {loading && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: 32 }}
          />
        )}

        {/* Resultados */}
        {report && !loading && (
          <>
            <Text style={[styles.periodInfo, { color: colors.muted }]}>
              {startDate} a {endDate} · {report.profileName}
            </Text>

            {/* Cards de métricas */}
            <View style={styles.metricsRow}>
              <MetricCard
                label="Sessões"
                value={report.totalSessions}
                color={colors.primary}
              />
              <MetricCard
                label="Cliques"
                value={report.totalClicks}
                color="#7C3AED"
              />
              <MetricCard
                label="Frases"
                value={report.totalSentences}
                color="#16A34A"
              />
            </View>

            {/* Top vocabulário */}
            {report.topCards.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  TOP VOCABULÁRIO
                </Text>
                {report.topCards.slice(0, 8).map((card, i) => (
                  <View
                    key={card.cardId}
                    style={[styles.rankRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.rankIndex, { color: colors.muted }]}>
                      {i + 1}
                    </Text>
                    <Text style={[styles.rankLabel, { color: colors.foreground }]}>
                      {card.label}
                    </Text>
                    <View style={[styles.rankBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.rankFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${Math.min(
                              (card.count / (report.topCards[0]?.count || 1)) * 100,
                              100
                            )}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.rankCount, { color: colors.muted }]}>
                      {card.count}x
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Top categorias */}
            {report.topCategories.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  CATEGORIAS
                </Text>
                {report.topCategories.map((cat) => (
                  <View
                    key={cat.categoryId}
                    style={[styles.rankRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.rankLabel, { color: colors.foreground }]}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.rankCount, { color: colors.muted }]}>
                      {cat.count} cliques
                    </Text>
                  </View>
                ))}
              </>
            )}

            {report.totalClicks === 0 && (
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Nenhum dado registrado neste período para este paciente.
              </Text>
            )}

            {/* Botão compartilhar */}
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.shareBtn,
                { borderColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.shareBtnText, { color: colors.primary }]}>
                📤 Compartilhar Relatório
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.metricCard, { borderColor: color + '33' }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  chips: { flexDirection: 'row' },
  chip: {
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  generateBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  periodInfo: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  rankIndex: {
    width: 20,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  rankLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rankBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rankFill: {
    height: '100%',
    borderRadius: 3,
  },
  rankCount: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 30,
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 32,
    fontStyle: 'italic',
  },
  shareBtn: {
    borderRadius: 24,
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
