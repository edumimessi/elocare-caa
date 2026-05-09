// ─────────────────────────────────────────────
// app/(tabs)/index.tsx — VERSÃO FINAL
// Multi-perfil + cache de áudio + telemetria integrados
// Frontpage otimizada + suporte visual a fotos dos cartões
// ─────────────────────────────────────────────
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  CATEGORIES,
  CARDS,
  getCardsByCategory,
  getPhotoUri,
  CAACard,
  CAACategory,
} from '@/lib/caa-data';
import { loadSettings, Settings } from '@/lib/settings-store';

// Módulos v2
import { useProfiles }    from '@/hooks/useProfiles';
import { useAudioCache }  from '@/hooks/useAudioCache';
import { useTelemetry }   from '@/hooks/useTelemetry';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { CacheStatusBar }  from '@/components/profiles/CacheStatusBar';

type Screen = 'categories' | 'board';

type DisplayCard = CAACard & { imageUri?: string };

const QUICK_CARD_IDS = ['water', 'bathroom', 'pain', 'help', 'yes', 'no', 'want', 'food_need'];

export default function HomeScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { width } = useWindowDimensions();

  const [screen, setScreen]             = useState<Screen>('categories');
  const [selectedCategory, setCategory] = useState<CAACategory | null>(null);
  const [sentence, setSentence]         = useState<DisplayCard[]>([]);
  const [pressedId, setPressedId]       = useState<string | null>(null);
  const [settings, setSettings]         = useState<Settings | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // ── Módulos
  const { profiles, activeProfile, switchProfile } = useProfiles();

  const audio = useAudioCache(
    settings?.elevenLabsApiKey   ?? '',
    settings?.elevenLabsVoiceId  ?? ''
  );

  const telemetry = useTelemetry(activeProfile?.id ?? null);

  const boardColumns = useMemo(() => {
    if (width >= 900) return 5;
    if (width >= 640) return 4;
    return 3;
  }, [width]);

  const categoryColumns = useMemo(() => {
    if (width >= 760) return 3;
    return 2;
  }, [width]);

  // Carrega settings uma vez
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  // Verifica cache ao carregar settings com ElevenLabs ativo
  useEffect(() => {
    if (settings?.useElevenLabs && settings?.elevenLabsApiKey) {
      audio.checkCache();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.elevenLabsApiKey, settings?.useElevenLabs, audio.checkCache]);

  // ── CARTÕES VISÍVEIS ───────────────────────

  const hiddenIds    = new Set(activeProfile?.hiddenCardIds ?? []);
  const customCards  = activeProfile?.customCards ?? [];

  const quickCards = useMemo(
    () => QUICK_CARD_IDS
      .map((id) => CARDS.find((card) => card.id === id))
      .filter((card): card is CAACard => !!card && !hiddenIds.has(card.id)),
    [hiddenIds]
  );

  const visibleCards: DisplayCard[] = selectedCategory
    ? [
        ...getCardsByCategory(selectedCategory.id)
          .filter((c) => !hiddenIds.has(c.id)),
        ...customCards
          .filter((c) => c.categoryId === selectedCategory.id)
          .map((c): DisplayCard => ({
            id:         c.id,
            label:      c.label,
            emoji:      '📷',
            color:      c.color,
            categoryId: c.categoryId,
            imageUri:   c.imageUri,
          })),
      ]
    : [];

  // ── IMAGENS ────────────────────────────────

  const markImageFailed = useCallback((key: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const getCardImageUri = useCallback((item: DisplayCard | CAACard) => {
    if ('imageUri' in item && item.imageUri) return item.imageUri;
    if (item.imageQuery) return getPhotoUri(item.imageQuery, item.id);
    return null;
  }, []);

  const getCategoryImageUri = useCallback((item: CAACategory) => {
    if (!item.imageQuery) return null;
    return getPhotoUri(item.imageQuery, `category-${item.id}`);
  }, []);

  // ── HANDLERS ───────────────────────────────

  const speakCard = useCallback(async (card: DisplayCard | CAACard) => {
    setPressedId(card.id);
    setTimeout(() => setPressedId(null), 300);

    await audio.play(
      card.id,
      card.label,
      settings?.useElevenLabs ?? false
    );

    telemetry.logClick(card.id, card.label, card.categoryId);
  }, [audio, telemetry, settings?.useElevenLabs]);

  const handleCategoryPress = useCallback((cat: CAACategory) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
    setSentence([]);
    setScreen('board');
  }, []);

  const handleCardPress = useCallback(async (card: DisplayCard) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setSentence((prev) => [...prev, card]);
    await speakCard(card);
  }, [speakCard]);

  const handleQuickPress = useCallback(async (card: CAACard) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await speakCard(card);
  }, [speakCard]);

  const handleSpeakSentence = useCallback(async () => {
    if (sentence.length === 0) return;
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const text = sentence.map((c) => c.label).join(' ');
    await audio.play(
      `sentence_${Date.now()}`,
      text,
      settings?.useElevenLabs ?? false
    );

    telemetry.logSentence(
      sentence.map((c) => c.id),
      sentence.map((c) => c.label)
    );
  }, [sentence, audio, telemetry, settings?.useElevenLabs]);

  const handleClearSentence = useCallback(() => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSentence([]);
  }, []);

  const handleBack = useCallback(() => {
    setScreen('categories');
    setCategory(null);
    setSentence([]);
  }, []);

  const handleAddProfile = useCallback(() => {
    router.push('../profile-form' as any);
  }, [router]);

  const renderCardVisual = (item: DisplayCard | CAACard, isPressed = false, compact = false) => {
    const imageUri = getCardImageUri(item);
    const imageKey = `card-${item.id}`;

    return (
      <View style={compact ? styles.quickPhotoWrap : styles.caaPhotoWrap}>
        {imageUri && !failedImages.has(imageKey) ? (
          <Image
            source={{ uri: imageUri }}
            style={compact ? styles.quickPhoto : styles.caaImage}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => markImageFailed(imageKey)}
          />
        ) : (
          <View style={[
            compact ? styles.quickEmojiBubble : styles.emojiBubble,
            { backgroundColor: isPressed ? 'rgba(255,255,255,0.22)' : item.color + '18' },
          ]}>
            <Text style={compact ? styles.quickEmoji : styles.caaEmoji}>{item.emoji}</Text>
          </View>
        )}
        <View style={[styles.photoBadge, { backgroundColor: item.color }]}> 
          <Text style={styles.photoBadgeText}>{item.emoji}</Text>
        </View>
      </View>
    );
  };

  // ── RENDER ────────────────────────────────

  return (
    <ScreenContainer containerClassName="bg-background">

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}> 
        {screen === 'board' && (
          <Pressable onPress={handleBack} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backBtnText}>← Voltar</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          {screen === 'categories'
            ? (activeProfile ? `💬 ${activeProfile.name}` : '💬 EloCare CAA')
            : selectedCategory?.label ?? ''}
        </Text>
        {screen === 'board' && selectedCategory && (
          <Text style={styles.headerEmoji}>{selectedCategory.emoji}</Text>
        )}
      </View>

      {screen === 'categories' && (
        <ProfileSwitcher
          profiles={profiles}
          activeProfileId={activeProfile?.id ?? null}
          onSwitch={switchProfile}
          onAdd={handleAddProfile}
        />
      )}

      {screen === 'categories' && (
        <View style={styles.frontpage}> 
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            {activeProfile?.photoUri ? (
              <Image
                source={{ uri: activeProfile.photoUri }}
                style={[styles.heroAvatarImage, { borderColor: activeProfile.color }]}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.heroAvatar, { backgroundColor: (activeProfile?.color ?? colors.primary) + '20' }]}> 
                <Text style={[styles.heroAvatarText, { color: activeProfile?.color ?? colors.primary }]}> 
                  {activeProfile?.name?.charAt(0).toUpperCase() ?? 'E'}
                </Text>
              </View>
            )}
            <View style={styles.heroTextBlock}>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>Toque para falar</Text>
              <Text style={[styles.heroSubtitle, { color: colors.muted }]}>Fotos reais ajudam a reconhecer ações, pessoas e objetos mais rápido.</Text>
            </View>
          </View>

          {quickCards.length > 0 && (
            <View style={styles.quickSection}> 
              <Text style={[styles.quickTitle, { color: colors.muted }]}>AÇÕES RÁPIDAS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickList}>
                {quickCards.map((card) => {
                  const isPressed = pressedId === card.id;
                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => handleQuickPress(card)}
                      style={({ pressed }) => [
                        styles.quickCard,
                        {
                          backgroundColor: isPressed ? card.color : colors.surface,
                          borderColor: card.color,
                        },
                        (pressed || isPressed) && { transform: [{ scale: 0.96 }] },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Falar ${card.label}`}
                    >
                      {renderCardVisual(card, isPressed, true)}
                      <Text
                        style={[styles.quickLabel, { color: isPressed ? '#FFFFFF' : colors.foreground }]}
                        numberOfLines={1}
                      >
                        {card.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {screen === 'categories' && settings?.useElevenLabs && (
        <CacheStatusBar
          cacheReady={audio.cacheReady}
          generating={audio.generating}
          progress={audio.progress}
          onStartGeneration={() =>
            audio.startPreGeneration(activeProfile ?? null)
          }
        />
      )}

      {screen === 'board' && (
        <View style={[
          styles.sentenceBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sentenceScroll}
          >
            {sentence.length === 0 ? (
              <Text style={[styles.sentencePlaceholder, { color: colors.muted }]}> 
                Toque nos cartões para montar uma frase...
              </Text>
            ) : (
              sentence.map((card, i) => (
                <View
                  key={`${card.id}-${i}`}
                  style={[styles.sentenceChip, { backgroundColor: card.color }]}
                >
                  <Text style={styles.sentenceChipText}>
                    {card.imageUri || card.imageQuery ? '📷' : card.emoji} {card.label}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {sentence.length > 0 && (
            <View style={styles.sentenceActions}>
              <Pressable
                onPress={handleSpeakSentence}
                style={({ pressed }) => [
                  styles.speakBtn,
                  { backgroundColor: colors.success },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.speakBtnText}>🔊 Falar</Text>
              </Pressable>
              <Pressable
                onPress={handleClearSentence}
                style={({ pressed }) => [
                  styles.clearBtn,
                  { backgroundColor: colors.error },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Limpar frase"
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {screen === 'categories' && (
        <FlatList
          key={`categories-${categoryColumns}`}
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={categoryColumns}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const count = getCardsByCategory(item.id)
              .filter((c) => !hiddenIds.has(c.id)).length
              + customCards.filter((c) => c.categoryId === item.id).length;
            const imageUri = getCategoryImageUri(item);
            const imageKey = `category-${item.id}`;

            return (
              <Pressable
                onPress={() => handleCategoryPress(item)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { backgroundColor: item.bgColor, borderColor: item.color },
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Categoria ${item.label}, ${count} cartões`}
              >
                <View style={styles.categoryPhotoWrap}> 
                  {imageUri && !failedImages.has(imageKey) ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.categoryPhoto}
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                      onError={() => markImageFailed(imageKey)}
                    />
                  ) : (
                    <View style={[styles.categoryIconBubble, { backgroundColor: '#FFFFFFAA' }]}> 
                      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                    </View>
                  )}
                  <View style={[styles.categoryBadge, { backgroundColor: item.color }]}> 
                    <Text style={styles.categoryBadgeText}>{item.emoji}</Text>
                  </View>
                </View>
                <Text style={[styles.categoryLabel, { color: item.color }]} numberOfLines={1}> 
                  {item.label}
                </Text>
                <Text style={[styles.categoryCount, { color: item.color }]}> 
                  {count} cartões
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {screen === 'board' && (
        <FlatList
          key={`board-${boardColumns}`}
          data={visibleCards}
          keyExtractor={(item) => item.id}
          numColumns={boardColumns}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const isPressed = pressedId === item.id;
            return (
              <Pressable
                onPress={() => handleCardPress(item)}
                style={({ pressed }) => [
                  styles.caaCard,
                  {
                    backgroundColor: isPressed ? item.color : colors.surface,
                    borderColor: item.color,
                  },
                  (pressed || isPressed) && {
                    transform: [{ scale: 0.94 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {renderCardVisual(item, isPressed)}
                <Text
                  style={[
                    styles.caaLabel,
                    { color: isPressed ? '#FFFFFF' : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerEmoji: { fontSize: 24 },
  backBtn: { position: 'absolute', left: 16, zIndex: 1 },
  backBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  frontpage: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  heroAvatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 2,
  },
  heroAvatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  heroTextBlock: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  quickSection: {
    gap: 8,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  quickList: {
    gap: 8,
    paddingRight: 10,
  },
  quickCard: {
    width: 98,
    minHeight: 116,
    borderRadius: 16,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  quickPhotoWrap: {
    width: 74,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  quickPhoto: {
    width: '100%',
    height: '100%',
  },
  quickEmojiBubble: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmoji: {
    fontSize: 34,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  sentenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 60,
    gap: 8,
  },
  sentenceScroll: { flex: 1 },
  sentencePlaceholder: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  sentenceChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    alignSelf: 'center',
  },
  sentenceChipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sentenceActions: { flexDirection: 'row', gap: 6 },
  speakBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  speakBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  clearBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  grid: { padding: 12, gap: 10, paddingBottom: 28 },
  categoryCard: {
    flex: 1,
    margin: 5,
    borderRadius: 18,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 154,
    gap: 7,
  },
  categoryPhotoWrap: {
    width: '100%',
    height: 86,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF80',
  },
  categoryPhoto: {
    width: '100%',
    height: '100%',
  },
  categoryIconBubble: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 42 },
  categoryBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 16,
  },
  categoryLabel: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  categoryCount: { fontSize: 12, fontWeight: '600', opacity: 0.72 },
  caaCard: {
    flex: 1,
    margin: 5,
    borderRadius: 18,
    borderWidth: 2,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 148,
    gap: 8,
  },
  caaPhotoWrap: {
    width: '100%',
    height: 92,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  caaImage: {
    width: '100%',
    height: '100%',
  },
  emojiBubble: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadgeText: {
    fontSize: 16,
  },
  caaEmoji: { fontSize: 38 },
  caaLabel: { fontSize: 15, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
});
