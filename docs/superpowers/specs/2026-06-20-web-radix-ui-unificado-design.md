# Radix UI unificado no web

## Objetivo

Usar Radix UI como unica biblioteca de primitives do `apps/web`, por meio do pacote unificado `radix-ui`, sem `@base-ui/react` e sem pacotes individuais `@radix-ui/react-*`.

## Decisao

A migracao sera atomica. Todos os primitives compartilhados, imports diretos das features, configuracao do shadcn e dependencias serao convertidos no mesmo diff. Nao havera camada de compatibilidade nem periodo com duas bibliotecas.

## Arquitetura

- `apps/web/src/components/ui` permanece como camada compartilhada de primitives visuais.
- Todos os primitives acessiveis importam namespaces do pacote `radix-ui`.
- Features reutilizam os componentes em `src/components/ui` quando ja existir primitive compartilhado equivalente.
- `components.json` usa o estilo Radix atual do shadcn para que componentes futuros nao reintroduzam Base UI.
- Um teste arquitetural bloqueia `@base-ui/react` e `@radix-ui/react-*` no manifesto e no codigo-fonte.

## Compatibilidade

A API publica dos componentes locais sera preservada quando possivel. Pontos Base UI como `render` serao convertidos para a composicao Radix `asChild`. Estilos, textos e comportamento funcional existente devem permanecer equivalentes.

## Verificacao

A mudanca exige teste arquitetural em ciclo vermelho-verde, testes do web, typecheck, Biome e build. Os fluxos de dialogo existentes devem continuar cobertos pelos testes de componente.

## Referencias

- [shadcn/ui: Unified Radix UI Package](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
- [Radix Primitives: pacote unificado `radix-ui`](https://github.com/radix-ui/primitives/tree/main/packages/react/radix-ui)
