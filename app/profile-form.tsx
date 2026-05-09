import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { CATEGORIES } from '@/lib/caa-data';
import {
  createProfile,
  updateProfile,
  getProfile,
  deleteProfile,
  saveProfilePhoto,
  addCustomCard,
  removeCustomCard,
  saveCustomCardImage,
} from '@/lib/profiles-store';
import { Profile } from '@/types';

const AVATAR_COLORS = [
  '#2563EB', '#DC2626', '#7C3AED', '#16A34A',
  '#D97706', '#0891B2', '#DB2777', '#65A30D',
  '#9333EA', '#EA580C',
];

type FormState = {
  name: string;
  therapistName: string;
  diagnosis: string;
  birthDate: string;
  color: string;
  photoUri: string | null;
};

const EMPTY_FORM: FormState = {
  name: '',
  therapistName: '',
  diagnosis: '',
  birthDate: '',
  color: AVATAR_COLORS[0],
  photoUri: null,
};

export default function ProfileFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const isEditing = !!params.profileId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState<Profile | null>(null);
  const [cardLabel, setCardLabel] = useState('');
  const [cardCategoryId, setCardCategoryId] = useState(CATEGORIES[0]?.id ?? 'needs');
  const [cardImageUri, setCardImageUri] = useState<string | null>(null);
  const [addingCard, setAddingCard] = useState(false);

  const loadProfile = useCallback(async (profileId: string) => {
    const profile = await getProfile(profileId);
    if (!profile) return;
    setExistingProfile(profile);
    setForm({
      name: profile.name,
      therapistName: profile.therapistName ?? '',
      diagnosis: profile.diagnosis ?? '',
      birthDate: profile.birthDate ?? '',
      color: profile.color,
      photoUri: profile.photoUri ?? null,
    });
  }, []);

  useEffect(() => {
    if (params.profileId) loadProfile(params.profileId);
  }, [params.profileId, loadProfile]);

  const update = useCallback(
    (field: keyof FormState, value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  const handleBirthDateChange = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    update('birthDate', masked);
  }, [update]);

  const pickImageFromGallery = useCallback(async (forCard = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a galeria para escolher a foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      if (forCard) setCardImageUri(result.assets[0].uri);
      else setForm((prev) => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  }, []);

  const takePhoto = useCallback(async (forCard = false) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a camera para tirar a foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      if (forCard) setCardImageUri(result.assets[0].uri);
      else setForm((prev) => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  }, []);

  const handlePhotoPress = useCallback(() => {
    Alert.alert('Foto do paciente', 'Como deseja adicionar a foto?', [
      { text: 'Camera', onPress: () => takePhoto(false) },
      { text: 'Galeria', onPress: () => pickImageFromGallery(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [takePhoto, pickImageFromGallery]);

  const handleCardPhotoPress = useCallback(() => {
    Alert.alert('Foto do cartao', 'Como deseja adicionar a foto?', [
      { text: 'Camera', onPress: () => takePhoto(true) },
      { text: 'Galeria', onPress: () => pickImageFromGallery(true) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [takePhoto, pickImageFromGallery]);

  const handleAddCard = useCallback(async () => {
    if (!existingProfile) return;
    if (!cardLabel.trim()) {
      Alert.alert('Nome obrigatorio', 'Informe o nome que sera falado no cartao.');
      return;
    }
    if (!cardImageUri) {
      Alert.alert('Foto obrigatoria', 'Adicione uma foto real para o cartao.');
      return;
    }

    const category = CATEGORIES.find((cat) => cat.id === cardCategoryId) ?? CATEGORIES[0];
    setAddingCard(true);
    try {
      const card = await addCustomCard(existingProfile.id, {
        label: cardLabel.trim(),
        imageUri: cardImageUri,
        categoryId: category.id,
        color: category.color,
      });
      if (card) {
        await saveCustomCardImage(existingProfile.id, card.id, cardImageUri);
      }
      setCardLabel('');
      setCardImageUri(null);
      await loadProfile(existingProfile.id);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel adicionar o cartao.');
    } finally {
      setAddingCard(false);
    }
  }, [existingProfile, cardLabel, cardImageUri, cardCategoryId, loadProfile]);

  const handleRemoveCard = useCallback((cardId: string, label: string) => {
    if (!existingProfile) return;
    Alert.alert('Excluir cartao', `Excluir o cartao "${label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removeCustomCard(existingProfile.id, cardId);
          await loadProfile(existingProfile.id);
        },
      },
    ]);
  }, [existingProfile, loadProfile]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Nome obrigatorio', 'Por favor, informe o nome do paciente.');
      return;
    }

    setSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      if (isEditing && existingProfile) {
        await updateProfile(existingProfile.id, {
          name: form.name.trim(),
          therapistName: form.therapistName.trim() || undefined,
          diagnosis: form.diagnosis.trim() || undefined,
          birthDate: form.birthDate.trim() || undefined,
          color: form.color,
        });

        if (
          form.photoUri &&
          form.photoUri !== existingProfile.photoUri &&
          form.photoUri.startsWith('file://')
        ) {
          await saveProfilePhoto(existingProfile.id, form.photoUri);
        }
      } else {
        const profile = await createProfile({
          name: form.name.trim(),
          therapistName: form.therapistName.trim() || undefined,
          diagnosis: form.diagnosis.trim() || undefined,
          birthDate: form.birthDate.trim() || undefined,
        });

        await updateProfile(profile.id, { color: form.color });
        if (form.photoUri) {
          await saveProfilePhoto(profile.id, form.photoUri);
        }
      }

      router.back();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, existingProfile, router]);

  const handleDelete = useCallback(() => {
    if (!existingProfile) return;
    Alert.alert(
      'Excluir perfil',
      `Tem certeza que deseja excluir o perfil de ${existingProfile.name}? Todos os dados de uso serao perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteProfile(existingProfile.id);
            router.back();
          },
        },
      ]
    );
  }, [existingProfile, router]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
        </Text>
        <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handlePhotoPress}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Adicionar foto do paciente"
            >
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={[styles.avatarLarge, { borderColor: form.color }]} />
              ) : (
                <View style={[styles.avatarLarge, styles.avatarEmpty, { backgroundColor: form.color + '22', borderColor: form.color }]}>
                  <Text style={[styles.avatarInitialLarge, { color: form.color }]}>
                    {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={[styles.photoEditBadge, { backgroundColor: form.color }]}>
                <Text style={styles.photoEditIcon}>+</Text>
              </View>
            </Pressable>
            <Text style={[styles.photoHint, { color: colors.muted }]}>Toque para adicionar foto</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>COR DO PERFIL</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => update('color', color)}
                style={[styles.colorDot, { backgroundColor: color }, form.color === color && styles.colorDotSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.color === color }}
              />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>NOME DO PACIENTE *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={form.name}
            onChangeText={(value) => update('name', value)}
            placeholder="Ex: Maria, Joao..."
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={40}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>TERAPEUTA RESPONSAVEL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={form.therapistName}
            onChangeText={(value) => update('therapistName', value)}
            placeholder="Ex: Dra. Ana Lima"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={60}
          />

          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>DIAGNOSTICO</Text>
            <Text style={[styles.fieldHint, { color: colors.muted }]}>uso interno</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={form.diagnosis}
            onChangeText={(value) => update('diagnosis', value)}
            placeholder="Ex: TEA nivel 2"
            placeholderTextColor={colors.muted}
            autoCapitalize="sentences"
            returnKeyType="next"
            maxLength={80}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>DATA DE NASCIMENTO</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={form.birthDate}
            onChangeText={handleBirthDateChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="done"
          />

          {isEditing && existingProfile ? (
            <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Cartoes personalizados</Text>
              <Text style={[styles.sectionHint, { color: colors.muted }]}>
                Use fotos reais do ambiente da crianca para criar cartoes familiares.
              </Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={cardLabel}
                onChangeText={setCardLabel}
                placeholder="Nome do cartao. Ex: Meu copo"
                placeholderTextColor={colors.muted}
                maxLength={32}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
                {CATEGORIES.map((category) => {
                  const selected = cardCategoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setCardCategoryId(category.id)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: selected ? category.color : colors.background,
                          borderColor: category.color,
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? '#FFFFFF' : category.color, fontWeight: '700' }}>
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                onPress={handleCardPhotoPress}
                style={[styles.cardPhotoPicker, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                {cardImageUri ? (
                  <Image source={{ uri: cardImageUri }} style={styles.cardPhotoPreview} />
                ) : (
                  <Text style={[styles.cardPhotoText, { color: colors.muted }]}>Adicionar foto do cartao</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleAddCard}
                disabled={addingCard}
                style={({ pressed }) => [
                  styles.addCardBtn,
                  { backgroundColor: colors.primary },
                  (pressed || addingCard) && { opacity: 0.75 },
                ]}
              >
                <Text style={styles.addCardBtnText}>
                  {addingCard ? 'Adicionando...' : 'Adicionar cartao'}
                </Text>
              </Pressable>

              {(existingProfile.customCards ?? []).map((card) => (
                <View key={card.id} style={[styles.customCardRow, { borderColor: colors.border }]}>
                  <Image source={{ uri: card.imageUri }} style={styles.customCardImage} />
                  <View style={styles.customCardInfo}>
                    <Text style={[styles.customCardLabel, { color: colors.foreground }]}>{card.label}</Text>
                    <Text style={[styles.customCardCategory, { color: colors.muted }]}>
                      {CATEGORIES.find((cat) => cat.id === card.categoryId)?.label ?? card.categoryId}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveCard(card.id, card.label)} style={styles.removeCardBtn}>
                    <Text style={[styles.removeCardText, { color: colors.error }]}>Excluir</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.lgpdBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.lgpdText, { color: colors.muted }]}>
                Salve o paciente primeiro. Depois toque em Editar para adicionar cartoes com fotos reais.
              </Text>
            </View>
          )}

          <View style={[styles.lgpdBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.lgpdText, { color: colors.muted }]}>
              Os dados e fotos ficam armazenados apenas neste dispositivo.
            </Text>
          </View>

          {isEditing && (
            <Pressable
              onPress={handleDelete}
              disabled={saving}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: colors.error },
                pressed && { opacity: 0.7 },
                saving && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>
                {saving ? 'Aguarde...' : 'Excluir perfil'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  cancelBtn: { minWidth: 64 },
  cancelBtnText: { color: '#FFFFFF', fontSize: 15, opacity: 0.85 },
  saveBtn: { minWidth: 64, alignItems: 'flex-end' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  content: {
    padding: 20,
    gap: 8,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialLarge: {
    fontSize: 42,
    fontWeight: '700',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditIcon: { fontSize: 18, color: '#FFFFFF', fontWeight: '800' },
  photoHint: { fontSize: 12 },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  cardSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  categoryPicker: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardPhotoPicker: {
    height: 124,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  cardPhotoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  addCardBtn: {
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addCardBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  customCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 10,
  },
  customCardImage: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  customCardInfo: {
    flex: 1,
  },
  customCardLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  customCardCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  removeCardBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lgpdBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  lgpdText: {
    fontSize: 12,
    lineHeight: 18,
  },
  deleteBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
