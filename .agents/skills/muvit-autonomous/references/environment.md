# Ambiente de execução exclusivo por card

1. Garantir repositório correto, acesso ao remoto, branch base remota atualizada e status do Git. Criar branch/worktree curta por card. Preservar alterações locais e **não apagar worktree alheia**. Cuidado com caminhos enormes no Windows: preferir diretórios de worktree curtos; use mitigação específica após conferir o problema.
2. Configurar `.env` ou variáveis essenciais exclusivamente nessa worktree a partir de template/configuração autorizada. Worktrees novas podem não possuir `.env`; não assumir que scripts de build herdam ambiente do checkout original. Não commitar/logar segredos.
3. Docker deve estar operacional; se instalado mas parado, iniciar conforme acesso disponível. Cada card usa infraestrutura isolada: nomes de projeto/containers, portas, volumes, PostgreSQL e banco próprios. Não usar banco de dev/testes de outro card.
4. Subir **banco e API juntos** antes de testes de integração/E2E ou fluxos de UI dependentes. Verificar migrations, healthchecks e credenciais de seed; executar seeds existentes ou preparar credenciais de teste apropriadas, sem dados reais. API saudável e conectada ao banco fazem parte do gate.
5. Para paralelismo entre cards, separar portas, redes, containers e banco. Se não for possível garantir isolamento, rodadas conflitantes não começam juntas.
6. Executar validação de backend: esquema/migrations, comandos de tests e endpoints reais; o build isolado não substitui checagem de comportamento.
7. Desligar/remover **somente** containers, volumes, emuladores e processos que a rodada criou, depois de salvar evidências. Não limpar estado necessário para review pendente ou retomada sem decisão segura. Nunca rodar `git clean`/`git reset` indiscriminadamente.
8. Não atribuir falhas de Docker, rede, dependência ou autenticação à capacidade do modelo. Investigar a causa técnica preservando os perfis fixos; mudanças que invalidem o plano voltam ao planejador.

## Cuidados específicos

- No Windows, build Android/CMake pode falhar com caminhos físicos longos mesmo se aliases com `SUBST` encurtarem o shell; documentar e corrigir na camada de path/toolchain.
- Testes não podem afirmar sucesso usando mock quando a aceitação exige API/DB reais. Se serviço indisponível, marcar `NOT_PROVEN` com motivo.
- Se os recursos não puderem subir por falta de permissão, bloqueio operacional documentado em vez de improvisar credenciais.
