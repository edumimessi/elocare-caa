import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useProfiles } from '@/hooks/useProfiles';
import { CARDS, CATEGORIES, CAACard } from '@/lib/caa-data';
import {
  addCustomCard,
  removeCustomCard,
  removeCardImageOverride,
  saveCardImageOverride,
  saveCustomCardImage,
} from '@/lib/profiles-store';

type PhotoSource = 'camera' | 'gallery';

export default function CardImagesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeProfile, reload } = useProfiles();
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [photoActionCard, setPhotoActionCard] = useState<CAACard | null>(null);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [newCardLabel, setNewCardLabel] = useState('');
  const [newCardCategoryId, setNewCardCategoryId] = useState(CATEGORIES[0]?.id ?? 'needs');
  const [newCardImageUri, setNewCardImageUri] = useState<string | null>(null);
  const [creatingCard, setCreatingCard] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const groupedCards = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        cards: CARDS.filter((card) => card.categoryId === category.id),
        customCards: (activeProfile?.customCards ?? []).filter(
          (card) => card.categoryId === category.id
        ),
      })),
    [activeProfile?.customCards]
  );

  const requestPhoto = useCallback(async (source: PhotoSource) => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Permissao necessaria',
        source === 'camera'
          ? 'Ative a permissao de camera para usar fotos nos cartoes.'
          : 'Ative a permissao da galeria para usar fotos nos cartoes.'
      );
      return null;
    }

    const cameraOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    };

    const galleryOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.82,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(cameraOptions)
        : await ImagePicker.launchImageLibraryAsync(galleryOptions);

    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  }, []);

  const pickPhoto = useCallback(
    async (card: CAACard, source: PhotoSource) => {
      if (!activeProfile) {
        Alert.alert(
          'Paciente necessario',
          'Selecione ou crie um paciente antes de salvar fotos nos cartoes.'
        );
        return;
      }

      const uri = await requestPhoto(source);
      if (!uri) return;

      try {
        setSavingCardId(card.id);
        await saveCardImageOverride(activeProfile.id, card.id, uri);
        await reload();
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        Alert.alert('Erro', 'Nao foi possivel salvar a foto do cartao.');
      } finally {
        setSavingCardId(null);
      }
    },
    [activeProfile, reload, requestPhoto]
  );

  const removePhoto = useCallback(
    async (card: CAACard) => {
      if (!activeProfile) {
        Alert.alert(
          'Paciente necessario',
          'Selecione ou crie um paciente antes de remover fotos dos cartoes.'
        );
        return;
      }

      try {
        setSavingCardId(card.id);
        await removeCardImageOverride(activeProfile.id, card.id);
        await reload();
      } catch {
        Alert.alert('Erro', 'Nao foi possivel remover a foto do cartao.');
      } finally {
        setSavingCardId(null);
      }
    },
    [activeProfile, reload]
  );

  const openPhotoActions = useCallback(
    (card: CAACard) => {
      setPhotoActionCard(card);
    },
    []
  );

  const handlePickFromPhotoSheet = useCallback(
    async (source: PhotoSource) => {
      if (!photoActionCard) return;
      const card = photoActionCard;
      setPhotoActionCard(null);
      await pickPhoto(card, source);
    },
    [photoActionCard, pickPhoto]
  );

  const handleRemoveFromPhotoSheet = useCallback(
    async () => {
      if (!photoActionCard) return;
      const card = photoActionCard;
      setPhotoActionCard(null);
      await removePhoto(card);
    },
    [photoActionCard, removePhoto]
  );

  const pickNewCardPhoto = useCallback(async (source: PhotoSource) => {
    const uri = await requestPhoto(source);
    if (uri) setNewCardImageUri(uri);
  }, [requestPhoto]);

  const resetNewCardForm = useCallback(() => {
    setNewCardLabel('');
    setNewCardCategoryId(CATEGORIES[0]?.id ?? 'needs');
    setNewCardImageUri(null);
    setNewCardOpen(false);
  }, []);

  const handleCreateCustomCard = useCallback(async () => {
    if (!activeProfile) {
      Alert.alert('Paciente necessario', 'Selecione ou crie um paciente antes de criar cartoes.');
      return;
    }
    if (!newCardLabel.trim()) {
      Alert.alert('Nome obrigatorio', 'Digite o nome do novo cartao.');
      return;
    }
    if (!newCardImageUri) {
      Alert.alert('Foto obrigatoria', 'Escolha uma foto para o novo cartao.');
      return;
    }

    const category = CATEGORIES.find((item) => item.id === newCardCategoryId) ?? CATEGORIES[0];

    try {
      setCreatingCard(true);
      const card = await addCustomCard(activeProfile.id, {
        label: newCardLabel.trim(),
        imageUri: newCardImageUri,
        categoryId: category.id,
        color: category.color,
      });

      if (!card) throw new Error('Card not created');
      await saveCustomCardImage(activeProfile.id, card.id, newCardImageUri);
      await reload();
      resetNewCardForm();

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Erro', 'Nao foi possivel criar o cartao.');
    } finally {
      setCreatingCard(false);
    }
  }, [activeProfile, newCardCategoryId, newCardImageUri, newCardLabel, reload, resetNewCardForm]);

  const handleRemoveCustomCard = useCallback((cardId: string, label: string) => {
    if (!activeProfile) return;

    Alert.alert('Remover cartao', `Remover "${label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removeCustomCard(activeProfile.id, cardId);
          await reload();
        },
      },
    ]);
  }, [activeProfile, reload]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Editar fotos dos cartoes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!activeProfile ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Crie ou selecione um paciente primeiro.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              Paciente: {activeProfile.name}
            </Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              Toque em um cartao para trocar por uma foto real da camera ou galeria.
            </Text>
            <Pressable
              onPress={() => setNewCardOpen(true)}
              style={[styles.newCardButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.newCardButtonText}>Novo cartao</Text>
            </Pressable>
          </View>

          {groupedCards.map(({ category, cards, customCards }) => (
            <View key={category.id} style={styles.categoryBlock}>
              <Text style={[styles.categoryTitle, { color: category.color }]}>
                {category.label}
              </Text>

              {customCards.map((card) => (
                <View
                  key={card.id}
                  style={[
                    styles.cardRow,
                    styles.customCardRow,
                    { backgroundColor: colors.surface, borderColor: card.color },
                  ]}
                >
                  <Image source={{ uri: card.imageUri }} style={styles.cardImage} />
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardLabel, { color: colors.foreground }]}>
                      {card.label}
                    </Text>
                    <Text style={[styles.cardStatus, { color: colors.muted }]}>
                      Cartao criado por voce
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveCustomCard(card.id, card.label)}>
                    <Text style={styles.removeCustomText}>Remover</Text>
                  </Pressable>
                </View>
              ))}

              {cards.map((card) => {
                const imageUri = activeProfile.cardImageOverrides?.[card.id];
                const saving = savingCardId === card.id;

                return (
                  <Pressable
                    key={card.id}
                    onPress={() => openPhotoActions(card)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: imageUri ? card.color : colors.border,
                      },
                      pressed && { opacity: 0.82 },
                    ]}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardEmojiBox, { backgroundColor: card.color + '18' }]}>
                        <Text style={styles.cardEmoji}>{card.emoji}</Text>
                      </View>
                    )}

                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardLabel, { color: colors.foreground }]}>
                        {card.label}
                      </Text>
                      <Text style={[styles.cardStatus, { color: colors.muted }]}>
                        {saving ? 'Salvando...' : imageUri ? 'Foto personalizada' : 'Usando emoji'}
                      </Text>
                    </View>

                    <Text style={[styles.cardAction, { color: card.color }]}>
                      Trocar foto
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            ))}
          </ScrollView>
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
            {!!photoActionCard && !!activeProfile?.cardImageOverrides?.[photoActionCard.id] && (
              <Pressable
                onPress={handleRemoveFromPhotoSheet}
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

      <Modal
        visible={newCardOpen}
        transparent
        animationType="fade"
        onRequestClose={resetNewCardForm}
      >
        <Pressable style={styles.photoSheetBackdrop} onPress={resetNewCardForm}>
          <Pressable style={[styles.newCardSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.photoSheetTitle, { color: colors.foreground }]}>
              Novo cartao
            </Text>

            <TextInput
              value={newCardLabel}
              onChangeText={setNewCardLabel}
              placeholder="Nome do cartao"
              placeholderTextColor={colors.muted}
              style={[
                styles.newCardInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
            />

            <Text style={[styles.newCardSectionTitle, { color: colors.foreground }]}>
              Categoria
            </Text>
            <View style={styles.categoryPicker}>
              {CATEGORIES.map((category) => {
                const selected = category.id === newCardCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setNewCardCategoryId(category.id)}
                    style={[
                      styles.categoryPill,
                      {
                        borderColor: category.color,
                        backgroundColor: selected ? category.color : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: selected ? '#FFFFFF' : category.color },
                      ]}
                    >
                      {category.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.newCardSectionTitle, { color: colors.foreground }]}>
              Foto
            </Text>
            {newCardImageUri ? (
              <Image source={{ uri: newCardImageUri }} style={styles.newCardPreview} />
            ) : (
              <View style={[styles.newCardEmptyPreview, { borderColor: colors.border }]}>
                <Text style={[styles.cardStatus, { color: colors.muted }]}>
                  Escolha uma foto
                </Text>
              </View>
            )}

            <View style={styles.newCardPhotoActions}>
              <Pressable
                onPress={() => pickNewCardPhoto('camera')}
                style={[styles.newCardPhotoButton, { borderColor: colors.primary }]}
              >
                <Text style={[styles.newCardPhotoButtonText, { color: colors.primary }]}>
                  Camera
                </Text>
              </Pressable>
              <Pressable
                onPress={() => pickNewCardPhoto('gallery')}
                style={[styles.newCardPhotoButton, { borderColor: colors.primary }]}
              >
                <Text style={[styles.newCardPhotoButtonText, { color: colors.primary }]}>
                  Galeria
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleCreateCustomCard}
              disabled={creatingCard}
              style={[
                styles.photoSheetButton,
                { backgroundColor: colors.primary },
                creatingCard && { opacity: 0.65 },
              ]}
            >
              <Text style={styles.photoSheetPrimaryText}>
                {creatingCard ? 'Criando...' : 'Criar cartao'}
              </Text>
            </Pressable>

            <Pressable
              onPress={resetNewCardForm}
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
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  backButton: {
    minWidth: 62,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 62,
  },
  content: {
    padding: 14,
    paddingBottom: 44,
    gap: 18,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  newCardButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 8,
  },
  newCardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  categoryBlock: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  customCardRow: {
    borderWidth: 2,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  cardEmojiBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 34,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardStatus: {
    fontSize: 12,
    marginTop: 3,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '900',
  },
  removeCustomText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
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
  newCardSheet: {
    maxHeight: '92%',
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  newCardInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  newCardSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  newCardPreview: {
    width: 92,
    height: 92,
    borderRadius: 16,
    alignSelf: 'center',
  },
  newCardEmptyPreview: {
    width: 92,
    height: 92,
    borderRadius: 16,
    borderWidth: 1.5,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCardPhotoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  newCardPhotoButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  newCardPhotoButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
