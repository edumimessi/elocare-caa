// app.config.ts — EloCare CAA
// Configuração Expo para produção — Clínica Mimessi
import type { ExpoConfig } from "expo/config";

// ── IDENTIDADE DO APP ─────────────────────────
// Altere estes valores antes de publicar nas lojas
const APP_CONFIG = {
  name:     "EloCare CAA",
  slug:     "elocare-caa",
  version:  "1.0.0",
  // Bundle ID permanente — NÃO pode ser alterado após publicação nas lojas
  // Formato: com.<empresa>.<produto>
  bundleId: "com.clinicamimessi.elocare",
  scheme:   "elocarecaa",
};

const config: ExpoConfig = {
  name:        APP_CONFIG.name,
  slug:        APP_CONFIG.slug,
  version:     APP_CONFIG.version,
  orientation: "portrait",
  icon:        "./assets/images/icon.png",
  scheme:      APP_CONFIG.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled:     true,

  // ── iOS ───────────────────────────────────────
  ios: {
    supportsTablet:   true,
    bundleIdentifier: APP_CONFIG.bundleId,
    infoPlist: {
      // Não usa criptografia proprietária
      ITSAppUsesNonExemptEncryption: false,
      // Permissão de câmera — obrigatório para profile-form.tsx
      NSCameraUsageDescription:
        "Usamos a câmera para adicionar a foto do paciente ao perfil.",
      // Permissão de galeria — obrigatório para profile-form.tsx
      NSPhotoLibraryUsageDescription:
        "Usamos a galeria para escolher a foto do paciente.",
      // Permissão de galeria (escrita) — iOS 14+
      NSPhotoLibraryAddUsageDescription:
        "Permitimos salvar imagens para os cartões personalizados do paciente.",
    },
  },

  // ── Android ──────────────────────────────────
  android: {
    versionCode: 3,
    adaptiveIcon: {
      backgroundColor:  "#1A56DB",
      foregroundImage:  "./assets/images/android-icon-foreground.png",
      backgroundImage:  "./assets/images/android-icon-background.png",
      monochromeImage:  "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled:             true,
    predictiveBackGestureEnabled:  false,
    package: APP_CONFIG.bundleId,
    permissions: [
      "POST_NOTIFICATIONS",
      // Câmera — profile-form.tsx
      "CAMERA",
      // Galeria — profile-form.tsx (Android < 13)
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      // Galeria — Android 13+
      "READ_MEDIA_IMAGES",
      // Manter tela ativa durante sessão terapêutica
      "WAKE_LOCK",
    ],
    intentFilters: [
      {
        action:   "VIEW",
        autoVerify: true,
        data: [{ scheme: APP_CONFIG.scheme, host: "*" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  // ── Web ───────────────────────────────────────
  web: {
    bundler: "metro",
    output:  "static",
    favicon: "./assets/images/favicon.png",
  },

  // ── Plugins ───────────────────────────────────
  plugins: [
    "expo-router",
    "expo-asset",
    [
      "expo-audio",
      {
        microphonePermission:
          "Permitir que o $(PRODUCT_NAME) acesse o microfone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture:   true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image:           "./assets/images/splash-icon.png",
        imageWidth:      200,
        resizeMode:      "contain",
        backgroundColor: "#1A56DB",
        dark: {
          backgroundColor: "#0F172A",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs:    ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],

  extra: {
    eas: {
      projectId: "874771ae-6e7b-4453-a04a-52d84ad395fd",
    },
  },

  experiments: {
    typedRoutes:    true,
    reactCompiler:  true,
  },
};

export default config;
