# Changelog

Todas as mudanças relevantes do Muvit serão registradas neste arquivo.

## [0.2.0-beta.1] - 2026-07-30

Primeira prerelease formal do Muvit. Este marco registra a evolução técnica desde `v0.1.0-mvp`; ele não representa a conclusão da checklist de soft-launch.

### Destaques

- Migração integral da autenticação própria baseada em JWT e bcrypt para Better Auth, com sessões por cookie na API, web e mobile.
- Evolução do dashboard, da lista de alunos e do detalhe do estudante, incluindo avaliações, treinos ativos e histórico visual.
- Aplicação de fronteiras SOLID na API, web e mobile, com casos de uso e repositórios isolados.
- Ampliação dos testes e dos pisos de cobertura funcional, visual e arquitetural.
- Atualização do dashboard para Next.js 16, React 19 e Tailwind CSS 4.
- Separação segura do banco de integração e melhoria do seed de demonstração.
- Inicialização coordenada da API junto do dashboard no fluxo local de desenvolvimento.

### Operação

- Documentação de ambientes por workspace, banco de testes, backup e checklist de soft-launch.
- CI com Biome, build do monorepo e verificação TypeScript.
- A prontidão para produção continua acompanhada separadamente em `docs/operations/launch-checklist.md`.

[0.2.0-beta.1]: https://github.com/leonardoslima/muvit/compare/v0.1.0-mvp...v0.2.0-beta.1
