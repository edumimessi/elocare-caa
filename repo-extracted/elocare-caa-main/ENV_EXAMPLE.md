# EloCare CAA — Configuração de Ambiente

Este projeto **não requer variáveis de ambiente** para funcionar.

A chave da API do ElevenLabs é configurada diretamente pelo usuário dentro do app:
`Configurações → Ativar ElevenLabs → Inserir API Key e Voice ID`

A chave é armazenada com segurança no dispositivo usando `expo-secure-store`
e nunca é enviada para servidores externos além da API do ElevenLabs.

## Para desenvolvimento local

```bash
# Instalar dependências
pnpm install

# Instalar pacotes nativos do Expo
npx expo install expo-image-picker expo-sharing expo-secure-store

# Iniciar servidor de desenvolvimento
pnpm dev
```
