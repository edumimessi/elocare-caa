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
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  CATEGORIES,
  getCardsByCategory,
  CAACard,
  CAACategory,
} from '@/lib/caa-data';
import { loadSettings, Settings } from '@/lib/settings-store';
import {
  removeCardImageOverride,
  saveCardImageOverride,
} from '@/lib/profiles-store';

// Módulos v2
import { useProfiles }    from '@/hooks/useProfiles';
import { useAudioCache }  from '@/hooks/useAudioCache';
import { useTelemetry }   from '@/hooks/useTelemetry';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { CacheStatusBar }  from '@/components/profiles/CacheStatusBar';

type Screen = 'categories' | 'board';

// Cartão estendido para suportar imagens reais de cartões customizados
type DisplayCard = CAACard & { imageUri?: string };

export default function HomeScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { width } = useWindowDimensions();

  const [screen, setScreen]             = useState<Screen>('categories');
  const [selectedCategory, setCategory] = useState<CAACategory | null>(null);
  const [sentence, setSentence]         = useState<DisplayCard[]>([]);
  const [pressedId, setPressedId]       = useState<string | null>(null);
  const [settings, setSettings]         = useState<Settings | null>(null);
  const [imageEditMode, setImageEditMode] = useState(false);
  const [photoActionCard, setPhotoActionCard] = useState<DisplayCard | null>(null);

  // ── Módulos
  const { profiles, activeProfile, switchProfile, reload: reloadProfiles } = useProfiles();

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

  useFocusEffect(
    useCallback(() => {
      reloadProfiles();
    }, [reloadProfiles])
  );

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

  const visibleCards: DisplayCard[] = selectedCategory
    ? [
        // Cartões padrão não ocultos
        ...getCardsByCategory(selectedCategory.id)
          .filter((c) => !hiddenIds.has(c.id))
          .map((c): DisplayCard => ({
            ...c,
            imageUri: activeProfile?.cardImageOverrides?.[c.id],
          })),
        // Cartões personalizados desta categoria
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

  // ── HANDLERS ──────────────────────────────

  const handleCategoryPress = useCallback((cat: CAACategory) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
    setSentence([]);
    setImageEditMode(false);
    setScreen('board');
  }, []);

  const handleCardPress = useCallback(async (card: DisplayCard) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setPressedId(card.id);
    setTimeout(() => setPressedId(null), 300);
    setSentence((prev) => [...prev, card]);

    // Reprodução com hierarquia: cache → API → TTS nativo
    await audio.play(
      card.id,
      card.label,
      settings?.useElevenLabs ?? false
    );

    // Telemetria
    telemetry.logClick(card.id, card.label, card.categoryId);
  }, [audio, telemetry, settings?.useElevenLabs]);

  const pickCardPhoto = useCallback(async (card: DisplayCard, source: 'camera' | 'gallery') => {
    if (!activeProfile) {
      Alert.alert(
        'Paciente necessario',
        'Selecione ou crie um paciente antes de salvar fotos nos cartoes.'
      );
      return;
    }

    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Permissao necessaria',
        source === 'camera'
          ? 'Ative a permissao de camera para trocar a foto do cartao.'
          : 'Ative a permissao da galeria para trocar a foto do cartao.'
      );
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.82,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          allowsMultipleSelection: false,
          quality: 0.82,
        });

    if (result.canceled || !result.assets[0]) return;

    await saveCardImageOverride(activeProfile.id, card.id, result.assets[0].uri);
    await reloadProfiles();
  }, [activeProfile, reloadProfiles]);

  const openPhotoActions = useCallback((card: DisplayCard) => {
    if (!activeProfile) {
      Alert.alert(
        'Paciente necessario',
        'Selecione ou crie um paciente antes de salvar fotos nos cartoes.'
      );
      return;
    }
    setPhotoActionCard(card);
  }, [activeProfile]);

  const handleRemoveCardPhoto = useCallback(async () => {
    if (!activeProfile || !photoActionCard) return;
    const card = photoActionCard;
    setPhotoActionCard(null);
    await removeCardImageOverride(activeProfile.id, card.id);
    await reloadProfiles();
  }, [activeProfile, photoActionCard, reloadProfiles]);

  const handlePickFromPhotoSheet = useCallback(async (source: 'camera' | 'gallery') => {
    if (!photoActionCard) return;
    const card = photoActionCard;
    setPhotoActionCard(null);
    await pickCardPhoto(card, source);
  }, [photoActionCard, pickCardPhoto]);

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
    setImageEditMode(false);
    setPhotoActionCard(null);
  }, []);

  const handleAddProfile = useCallback(() => {
    router.push('../profile-form' as any);
  }, [router]);

  const handleEditProfile = useCallback((profileId: string) => {
    router.push({ pathname: '/profile-form', params: { profileId } } as any);
  }, [router]);

  const handleEditCardImages = useCallback(() => {
    router.push('/card-images' as any);
  }, [router]);

  const renderCardVisual = (item: DisplayCard, isPressed = false) => {
    if (item.imageUri) {
      return (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.caaImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      );
    }

    return (
      <View style={[
        styles.emojiBubble,
        { backgroundColor: isPressed ? 'rgba(255,255,255,0.22)' : item.color + '18' },
      ]}>
        <Text style={styles.caaEmoji}>{item.emoji}</Text>
      </View>
    );
  };

  // ── RENDER ────────────────────────────────

  return (
    <ScreenContainer containerClassName="bg-background">

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {screen === 'board' && (
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          {screen === 'categories'
            ? (activeProfile ? `💬 ${activeProfile.name}` : '💬 EloCare CAA')
            : selectedCategory?.label ?? ''}
        </Text>
        {screen === 'board' && (
          <View style={styles.headerActions}>
            {selectedCategory && <Text style={styles.headerEmoji}>{selectedCategory.emoji}</Text>}
            <Pressable
              onPress={() => setImageEditMode((prev) => !prev)}
              style={[
                styles.editImagesToggle,
                { backgroundColor: imageEditMode ? '#FFFFFF' : 'rgba(255,255,255,0.18)' },
              ]}
            >
              <Text
                style={[
                  styles.editImagesToggleText,
                  { color: imageEditMode ? colors.primary : '#FFFFFF' },
                ]}
              >
                {imageEditMode ? 'Fotos ON' : 'Editar fotos'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {screen === 'board' && imageEditMode && (
        <View style={[styles.editModeBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.editModeBannerText, { color: colors.foreground }]}>
            Modo fotos ativo: toque em um cartao para escolher camera ou galeria.
          </Text>
        </View>
      )}

      {/* Seletor de perfil — só na tela de categorias */}
      {screen === 'categories' && (
        <ProfileSwitcher
          profiles={profiles}
          activeProfileId={activeProfile?.id ?? null}
          onSwitch={switchProfile}
          onAdd={handleAddProfile}
          onEdit={handleEditProfile}
        />
      )}

      {/* Frontpage / boas-vindas */}
      {screen === 'categories' && (
        <View style={styles.heroWrap}>
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
              <Text style={[styles.heroTitle, { color: colors.foreground }]}> 
                Comunicação mais simples, visual e acolhedora
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.muted }]}> 
                Escolha uma categoria, toque nos cartões e monte frases para fala assistida.
              </Text>
              {activeProfile && (
                <View style={styles.heroActions}>
                  <Pressable
                    onPress={handleEditCardImages}
                    style={({ pressed }) => [
                      styles.heroEditBtn,
                      { backgroundColor: activeProfile.color },
                      pressed && { opacity: 0.82 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Editar fotos dos cartoes"
                  >
                    <Text style={styles.heroEditBtnText}>Editar fotos dos cartoes</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleEditProfile(activeProfile.id)}
                    style={({ pressed }) => [
                      styles.heroSecondaryBtn,
                      { borderColor: activeProfile.color },
                      pressed && { opacity: 0.82 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Editar perfil"
                  >
                    <Text style={[styles.heroSecondaryBtnText, { color: activeProfile.color }]}>
                      Perfil
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Barra de status do cache — só quando ElevenLabs está ativo */}
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

      {/* Barra de frase montada */}
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
                    {card.imageUri ? '📷' : card.emoji} {card.label}
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

      {/* Grade de categorias */}
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
                <View style={[styles.categoryIconBubble, { backgroundColor: '#FFFFFFAA' }]}> 
                  <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                </View>
                <Text style={[styles.categoryLabel, { color: item.color }]}> 
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

      {/* Grade CAA */}
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
                onPress={() => {
                  if (imageEditMode && !item.id.startsWith('custom_')) {
                    openPhotoActions(item);
                    return;
                  }
                  handleCardPress(item);
                }}
                onLongPress={() => {
                  if (!item.id.startsWith('custom_')) openPhotoActions(item);
                }}
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
                {imageEditMode && !item.id.startsWith('custom_') && (
                  <View style={styles.editPhotoBadge}>
                    <Text style={styles.editPhotoBadgeText}>FOTO</Text>
                  </View>
                )}
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

      <Modal
        visible={!!photoActionCard}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoActionCard(null)}
      >
        <Pressable style={styles.photoSheetBackdrop} onPress={() => setPhotoActionCard(null)}>
          <Pressable style={[styles.photoSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.photoSheetTitle, { color: colors.foreground }]}>
              Foto do cartao
            </Text>
            <Text style={[styles.photoSheetSubtitle, { color: colors.muted }]}>
              {photoActionCard ? `Alterar foto de "${photoActionCard.label}"` : ''}
            </Text>
            <Pressable
              onPress={() => handlePickFromPhotoSheet('camera')}
              style={[styles.photoSheetButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.photoSheetPrimaryText}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={() => handlePickFromPhotoSheet('gallery')}
              style={[styles.photoSheetButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.photoSheetPrimaryText}>Galeria</Text>
            </Pressable>
            {!!photoActionCard?.imageUri && (
              <Pressable
                onPress={handleRemoveCardPhoto}
                style={[styles.photoSheetButton, styles.photoSheetRemoveButton]}
              >
                <Text style={styles.photoSheetRemoveText}>Remover foto</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setPhotoActionCard(null)}
              style={[styles.photoSheetButton, styles.photoSheetCancelButton]}
            >
              <Text style={[styles.photoSheetCancelText, { color: colors.foreground }]}>
                Cancelar
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  headerActions: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: { fontSize: 24 },
  backBtn: { position: 'absolute', left: 16, zIndex: 1 },
  backBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  editImagesToggle: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editImagesToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editModeBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editModeBannerText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
  },
  heroAvatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  heroTextBlock: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  heroEditBtn: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroEditBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  heroSecondaryBtn: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
    borderRadius: 22,
    borderWidth: 2,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 144,
    gap: 7,
  },
  categoryIconBubble: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  categoryEmoji: { fontSize: 42 },
  categoryLabel: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  categoryCount: { fontSize: 12, fontWeight: '600', opacity: 0.72 },
  caaCard: {
    flex: 1,
    margin: 5,
    borderRadius: 18,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 124,
    gap: 8,
  },
  editPhotoBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  editPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  photoSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  photoSheet: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  photoSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  photoSheetSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  photoSheetButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoSheetPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  photoSheetRemoveButton: {
    backgroundColor: '#DC2626',
  },
  photoSheetRemoveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  photoSheetCancelButton: {
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  photoSheetCancelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  emojiBubble: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caaImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
  },
  caaEmoji: { fontSize: 38 },
  caaLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
});
