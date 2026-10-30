# Qualidade, evidências e gates

Antes de abrir PR e depois de cada push de correção:

- Cobrir todos os critérios do card; usar teste de regressão para comportamento novo (quando aplicável, RED → GREEN → REFACTOR do Superpowers), sem enfraquecer testes para obter aprovação.
- Rodar testes de unidade, integração e E2E aplicáveis, lint, typecheck, build e validação de migrations. Anotar o comando, resultado, ambiente e commit testado; não inventar sucesso.
- Se app conversa com backend, levantar API + banco de teste com seed e verificar o fluxo completo. Diferenciar teste mockado de fluxo integrado real.
- Validar estados vazios, inválidos, permissões, erro de rede, sessão e retorno; evitar mudanças incidentais fora do card.
- Conferir diff integrado e arquivos não versionados; verificar que nenhum segredo, dump, arquivo de ambiente ou dado privado entrou no PR.
- Sempre testar áreas afetadas de forma prática: mobile via adb (ver `mobile.md`), web com navegador Orca (ver `web-and-design.md`). Visual QA deve conferir alinhamento com `.pen` quando aplicável.
- Review independente não substitui checks determinísticos; report de um agente não prova que app abriu ou que API funcionou.

## Evidência mínima

Salvar capturas, vídeos, logs, exports e relatórios completos em `artifacts/<issue-ou-escopo>/<execucao>/`, conforme `docs/operations/qa-artifacts.md`. Não criar pastas paralelas em `docs/` nem forçar versionamento de artefatos. Testes/scripts/assets necessários à reprodução ficam versionados no diretório responsável. Antes de concluir, conferir UTF-8 literal nos arquivos alterados e corrigir escapes Unicode usados para acentuação.

`card`, `branch`, `HEAD`, `aceite_requisito`, `comando`, `resultado`, `ambiente`, `screenshots/logs` quando permitidos, `PR`, `pendências` e `riscos`.

Se qualquer gate obrigatório estiver incompleto: não afirmar pronto, registrar impedimento e instrução objetiva para retomada. Acordo do usuário para autonomia **não** autoriza bypass de CI ou recursos sem permissão.
