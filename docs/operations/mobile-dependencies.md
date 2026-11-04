# Auditoria e atualização de dependências mobile

Data da auditoria: 23 de outubro de 2026. O baseline é o commit 6c98af86a2174a00a38249757979502f2f78afa2, anterior à execução MUV-45.

## Decisões

Mantivemos Expo SDK 54, React Native 0.81.5, React 19.1.0, Expo Router 6, NativeWind 4.2.7 e Better Auth 1.6.23. Atualizamos o patch do Expo para 54.0.38, as bibliotecas Navigation para um conjunto compatível com Expo Doctor e ferramentas/runtime selecionados dentro das linhas existentes. 14 de 53 dependências diretas tiveram especificador de manifesto alterado; a tabela mostra a faixa do manifesto e a versão resolvida no lockfile antes e depois. Algumas faixas foram apenas estreitadas para alinhar com o catálogo do SDK, sem alteração da versão resolvida.

A dependência compartilhada Zod migrou de 3.25.76 para 4.6.7 em mobile, validators e API, com fastify-type-provider-zod 6.1.0. A migração preserva defaults de PATCH, IP IPv4/IPv6, datas serializadas como ISO e tipos OpenAPI; testes específicos protegem esses contratos. Os transforms de `Date` para ISO declaram saída `z.string()` para manter os campos de data tipados no OpenAPI. A API substitui o removedor .ip() por união IPv4/IPv6. O formato de UUID usa .guid() onde o contrato legado aceita valores que Zod 4 .uuid() passou a rejeitar. Consulte o [guia oficial de migração do Zod 4](https://zod.dev/v4/changelog).

O lockfile fixa tar 7.5.22 somente na cadeia @expo/cli@54.0.28, dentro da faixa upstream ^7.5.2. Isso remove a versão 7.5.15 afetada pelo [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw); a seleção é documentada pelo mecanismo de [overrides do pnpm](https://pnpm.io/settings/dependency-resolution).

## Inventário direto mobile

Cada célula informa faixa do manifesto / versão resolvida. O pacote compartilhado aparece com o especificador `workspace:*` e o alvo `link:../../packages/validators`. Casos com uma única versão repetida foram preservados sem mudanças diretas.

| Pacote | Uso | Baseline | Atual |
| --- | --- | --- | --- |
| @better-auth/expo | runtime | 1.6.23 / 1.6.23 | 1.6.23 / 1.6.23 |
| @expo-google-fonts/dm-sans | runtime | 0.4.2 / 0.4.2 | 0.4.2 / 0.4.2 |
| @expo-google-fonts/inter | runtime | ^0.4.2 / 0.4.2 | ^0.4.2 / 0.4.2 |
| @expo-google-fonts/space-grotesk | runtime | ^0.4.1 / 0.4.1 | ^0.4.1 / 0.4.1 |
| @expo/metro-runtime | runtime | ~6.1.2 / 6.1.2 | ~6.1.2 / 6.1.2 |
| @expo/vector-icons | runtime | 15.1.1 / 15.1.1 | 15.1.1 / 15.1.1 |
| @muvit/validators | runtime | workspace:* / link:../../packages/validators | workspace:* / link:../../packages/validators |
| @react-native-async-storage/async-storage | runtime | ^2.2.0 / 2.2.0 | ^2.2.0 / 2.2.0 |
| @react-navigation/bottom-tabs | runtime | 7.16.0 / 7.16.0 | ^7.4.0 / 7.21.0 |
| @react-navigation/elements | runtime | 2.9.17 / 2.9.17 | 2.9.45 / 2.9.45 |
| @react-navigation/native | runtime | ^7.1.8 / 7.2.4 | ^7.1.8 / 7.5.1 |
| @tanstack/react-query | runtime | ^5.100.9 / 5.100.9 | ^5.104.5 / 5.104.5 |
| @types/react-dom | runtime | ~19.1.0 / 19.1.11 | ~19.1.0 / 19.1.11 |
| better-auth | runtime | 1.6.23 / 1.6.23 | 1.6.23 / 1.6.23 |
| clsx | runtime | ^2.1.1 / 2.1.1 | ^2.1.1 / 2.1.1 |
| expo | runtime | ~54.0.37 / 54.0.37 | ~54.0.38 / 54.0.38 |
| expo-application | runtime | ~7.0.8 / 7.0.8 | ~7.0.8 / 7.0.8 |
| expo-constants | runtime | ~18.0.14 / 18.0.14 | ~18.0.14 / 18.0.14 |
| expo-dev-client | runtime | ~6.0.21 / 6.0.21 | ~6.0.21 / 6.0.21 |
| expo-device | runtime | ~8.0.10 / 8.0.10 | ~8.0.10 / 8.0.10 |
| expo-font | runtime | ~14.0.12 / 14.0.12 | ~14.0.12 / 14.0.12 |
| expo-image | runtime | ~3.0.11 / 3.0.11 | ~3.0.11 / 3.0.11 |
| expo-image-picker | runtime | ^17.0.11 / 17.0.11 | ~17.0.11 / 17.0.11 |
| expo-linking | runtime | ~8.0.12 / 8.0.12 | ~8.0.12 / 8.0.12 |
| expo-network | runtime | ~8.0.8 / 8.0.8 | ~8.0.8 / 8.0.8 |
| expo-router | runtime | ~6.0.24 / 6.0.24 | ~6.0.24 / 6.0.24 |
| expo-secure-store | runtime | ^15.0.8 / 15.0.8 | ~15.0.8 / 15.0.8 |
| expo-status-bar | runtime | ~3.0.9 / 3.0.9 | ~3.0.9 / 3.0.9 |
| expo-video | runtime | ~3.0.16 / 3.0.16 | ~3.0.16 / 3.0.16 |
| lucide-react-native | runtime | ^1.54.0 / 1.54.0 | ^1.61.0 / 1.61.0 |
| nativewind | runtime | 4.2.7 / 4.2.7 | 4.2.7 / 4.2.7 |
| react | runtime | 19.1.0 / 19.1.0 | 19.1.0 / 19.1.0 |
| react-dom | runtime | 19.1.0 / 19.1.0 | 19.1.0 / 19.1.0 |
| react-native | runtime | 0.81.5 / 0.81.5 | 0.81.5 / 0.81.5 |
| react-native-css-interop | runtime | 0.2.7 / 0.2.7 | 0.2.7 / 0.2.7 |
| react-native-gesture-handler | runtime | ~2.28.0 / 2.28.0 | ~2.28.0 / 2.28.0 |
| react-native-reanimated | runtime | ~4.1.7 / 4.1.7 | ~4.1.7 / 4.1.7 |
| react-native-safe-area-context | runtime | ~5.6.2 / 5.6.2 | ~5.6.2 / 5.6.2 |
| react-native-screens | runtime | ~4.16.0 / 4.16.0 | ~4.16.0 / 4.16.0 |
| react-native-svg | runtime | 15.12.1 / 15.12.1 | 15.12.1 / 15.12.1 |
| react-native-worklets | runtime | 0.5.1 / 0.5.1 | 0.5.1 / 0.5.1 |
| tailwind-merge | runtime | 2.6.0 / 2.6.0 | 2.6.1 / 2.6.1 |
| zod | runtime | ^3.24.1 / 3.25.76 | ^4.6.7 / 4.6.7 |
| @babel/plugin-transform-react-jsx | desenvolvimento | 7.28.6 / 7.28.6 | 7.29.7 / 7.29.7 |
| @testing-library/react-native | desenvolvimento | 13.3.3 / 13.3.3 | 13.3.3 / 13.3.3 |
| @types/react | desenvolvimento | ~19.1.0 / 19.1.17 | ~19.1.0 / 19.1.17 |
| @vitest/coverage-v8 | desenvolvimento | ^4.1.5 / 4.1.5 | ^4.1.12 / 4.1.12 |
| babel-preset-expo | desenvolvimento | ~54.0.0 / 54.0.12 | ~54.0.0 / 54.0.12 |
| expo-doctor | desenvolvimento | ^1.18.22 / 1.18.22 | ^1.21.5 / 1.21.5 |
| react-test-renderer | desenvolvimento | 19.1.0 / 19.1.0 | 19.1.0 / 19.1.0 |
| tailwindcss | desenvolvimento | 3.4.17 / 3.4.17 | 3.4.19 / 3.4.19 |
| typescript | desenvolvimento | ~5.9.2 / 5.9.3 | ~5.9.2 / 5.9.3 |
| vitest | desenvolvimento | ^4.1.5 / 4.1.5 | ^4.1.12 / 4.1.12 |

## Resultado da auditoria transitiva

A análise percorreu o grafo do importador apps/mobile no pnpm-lock.yaml, incluindo o link do pacote validators e todas as dependências de produção; a visão completa também inclui as dependências de desenvolvimento. Aliases npm são resolvidos para o nome e a versão publicados; pares opcionais são ignorados quando são apenas peers opcionais. As versões são comparadas com as faixas vulneráveis retornadas pelo endpoint bulk de advisories do registry npm.

- Baseline: 690 nomes / 785 versões de produção e 97 registros de advisories; no grafo completo, 760 / 859 e 107 registros.
- Atual: 691 nomes / 827 versões de produção e 42 registros; severidade: 4 low, 12 moderate, 26 high e 0 critical. No grafo completo: 761 / 904 e 49 registros.
- Nenhum identificador novo de advisory apareceu no grafo de produção ao comparar com o baseline. O advisory de Zod GHSA-mrhx-c7xc-m3w5 deixou de aparecer no grafo mobile depois da migração.
- Permanecem registros para estes pacotes de produção: @babel/core, baseline-browser-mapping, browserslist, compression, decode-uri-component, fast-uri, image-size, js-yaml, nanoid, node-forge, postcss, postcss-selector-parser, source-map-js, undici, ws. Isso não representa uma auditoria global limpa; as cadeias e versões afetadas estão no relatório JSON de execução em artifacts/muv-45/2026-10-23T2100-isolated-db/.

O comando padrão pnpm audit (com e sem --prod) não concluiu neste ambiente Windows devido ao crescimento de memória do processo Node. O resultado acima é uma comparação independente com o endpoint bulk do registry npm e não é apresentado como uma execução bem-sucedida do pnpm audit. A análise é limitada ao grafo mobile descrito; os proprietários diretos Zod da web e do pacote db continuam em Zod 3 e não foram atualizados neste escopo.
