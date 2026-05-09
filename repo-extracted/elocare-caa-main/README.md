# EloCare CAA

App de Comunicação Aumentativa e Alternativa (CAA) para crianças não-verbais com TEA.

Desenvolvido por Dr. Eduardo D'Angelo Mimessi — Clínica Mimessi, Taubaté/SP.

## Stack

- **Framework:** Expo (React Native) com Expo Router
- **Linguagem:** TypeScript
- **Voz:** ElevenLabs API + fallback TTS nativo
- **Storage:** AsyncStorage (local, offline-first)
- **Testes:** Vitest

## Estrutura

```
app/
  (tabs)/
    _layout.tsx       ← Navegação por abas
    index.tsx         ← Tela principal (CAA)
    report.tsx        ← Relatório clínico
    settings.tsx      ← Configurações + LGPD
  _layout.tsx         ← Root layout + guard LGPD
  consent.tsx         ← Consentimento do responsável
  profile-form.tsx    ← Criação/edição de perfil

lib/
  caa-data.ts         ← 54 cartões e 6 categorias
  audio-cache.ts      ← Cache offline ElevenLabs
  profiles-store.ts   ← Multi-perfil de pacientes
  telemetry.ts        ← Registro de uso clínico
  lgpd.ts             ← Conformidade LGPD (Lei 13.709/2018)
  settings-store.ts   ← Configurações persistentes
  voice-service.ts    ← TTS (ElevenLabs + nativo)

hooks/
  useProfiles.ts      ← Hook de perfis
  useAudioCache.ts    ← Hook de cache de áudio
  useTelemetry.ts     ← Hook de telemetria

components/
  profiles/
    ProfileSwitcher.tsx  ← Chips de troca de paciente
    CacheStatusBar.tsx   ← Status do cache de voz

types/
  index.ts            ← Tipos compartilhados

tests/
  caa.test.ts         ← Testes dos dados CAA
  modules.test.ts     ← Testes dos módulos principais
```

## Instalação

```bash
npm install
npx expo install expo-image-picker expo-sharing expo-secure-store
npx expo start
```

## Testes

```bash
npx vitest run
```

## Configuração

1. Abra o app e aceite os termos (LGPD)
2. Vá em **Configurações → PIN** e altere o PIN padrão `1234`
3. Ative **ElevenLabs** e insira sua API key e Voice ID
4. Toque em **Preparar voz offline** para gerar o cache

## Conformidade LGPD

- Consentimento do responsável legal antes do primeiro uso
- Dados armazenados apenas no dispositivo
- Retenção automática de 90 dias
- Exportação e exclusão de dados disponíveis em Configurações

## Licença

Proprietário — Clínica Mimessi © 2026
