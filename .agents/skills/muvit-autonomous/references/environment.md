# Ambiente de execução exclusivo por card

1. Garantir repositório correto, acesso ao remoto, branch base remota atualizada e status do Git. Reutilizar a worktree gerenciada atual quando pertencer à rodada; não criar outra nesse caso. Se precisar de nova, usar primeiro o gerenciador nativo do Codex App; em host Orca, seguir `orca-cli`. Git manual somente sem gerenciador disponível e permitido pelas regras locais. Usar branch/nome curto. Preservar alterações locais e **não apagar worktree alheia**. No Windows, conferir caminhos físicos longos antes do build.
2. Antes de setup, testes ou builds, copiar os `.env` locais ignorados da raiz original para os caminhos correspondentes da worktree, sem sobrescrever configuração própria da rodada; ajustar somente valores necessários ao isolamento. Se ausentes, usar templates/configuração autorizada e registrar variáveis faltantes. Não assumir herança de ambiente, commitar ou logar segredos.
3. Quando aceite ou verificações exigirem serviços, garantir Docker operacional conforme acesso disponível e infraestrutura isolada: nomes de projeto/containers, portas, volumes, PostgreSQL e banco próprios. Não usar banco mutável de dev/testes de outro card. Em mudança documental ou comportamento local sem serviço necessário, registrar a não aplicabilidade e executar os checks pertinentes, sem criar infraestrutura sem uso.
4. Subir **banco e API juntos** antes de testes de integração/E2E ou fluxos de UI dependentes. Verificar migrations, healthchecks e credenciais de seed; executar seeds existentes ou preparar credenciais de teste apropriadas, sem dados reais. API saudável e conectada ao banco fazem parte do gate.
5. Para paralelismo entre cards, separar portas, redes, containers e banco. Se não for possível garantir isolamento, rodadas conflitantes não começam juntas.
6. Quando backend for afetado, executar validação de esquema/migrations, testes e endpoints pertinentes; o build isolado não substitui checagem de comportamento.
7. Desligar/remover **somente** containers, volumes, emuladores e processos que a rodada criou, depois de salvar evidências. Não limpar estado necessário para review pendente ou retomada sem decisão segura. Nunca rodar `git clean`/`git reset` indiscriminadamente.
8. Não atribuir falhas de Docker, rede, dependência ou autenticação à capacidade do modelo. Resolver a causa técnica antes de escalonar effort.

## Cuidados específicos

- No Windows, build Android/CMake pode falhar com caminhos físicos longos mesmo se aliases com `SUBST` encurtarem o shell; documentar e corrigir na camada de path/toolchain.
- Testes não podem afirmar sucesso usando mock quando a aceitação exige API/DB reais. Se serviço indisponível, marcar `NOT_PROVEN` com motivo.
- Se os recursos não puderem subir por falta de permissão, bloqueio operacional documentado em vez de improvisar credenciais.
