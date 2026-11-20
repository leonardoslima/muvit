# Proteção de develop para a entrega autônoma

A configuração pertence ao mantenedor autorizado. Em 20/11/2026, `GET branches/develop/protection` retornou 404 (`Branch not protected`), `GET rules/branches/develop` e `GET rulesets?includes_parents=true` retornaram listas vazias. O repositório estava público, com squash habilitado e auto-merge nativo desabilitado. Os quatro contextos abaixo foram observados em `CI`, execução [43335534243](https://github.com/leonardoslima/muvit/actions/runs/43335534243), com a origem GitHub Actions (`15368`).

## Configurar

1. Use um mantenedor com permissão de administração do repositório. Para usar um token fine-grained na API de configuração, é necessária a permissão `Administration: write`. Confirme suporte a rulesets no plano/visibilidade e que squash continua habilitado. A conta da rodada usa permissão normal de escrita (`Contents: write` na API de merge), sem exceção no ruleset.
2. Releia proteções clássicas, regras efetivas e rulesets herdados. Preserve regras preexistentes, inclusive conflitos que exijam decisão do mantenedor. Confirme os nomes e a origem novamente em CI recente e bem-sucedido. Para a configuração na interface, os checks selecionáveis precisam ter sucesso registrado nos últimos sete dias.
3. Crie em **Settings → Rules → Rulesets → New branch ruleset** ou use `gh api --method POST repos/leonardoslima/muvit/rulesets --input <arquivo-json>` com o payload abaixo. Se já existir um ruleset equivalente, confira a configuração e atualize o ID existente somente quando necessário.

```json
{
  "name": "develop: PR e CI obrigatório",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {"ref_name": {"include": ["refs/heads/develop"], "exclude": []}},
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "pull_request", "parameters": {
      "required_approving_review_count": 0,
      "require_code_owner_review": false,
      "require_last_push_approval": false,
      "dismiss_stale_reviews_on_push": false,
      "required_review_thread_resolution": true,
      "allowed_merge_methods": ["squash"]
    }},
    {"type": "required_status_checks", "parameters": {
      "strict_required_status_checks_policy": true,
      "do_not_enforce_on_create": false,
      "required_status_checks": [
        {"context": "Check (Biome)", "integration_id": 15368},
        {"context": "Test (Turborepo)", "integration_id": 15368},
        {"context": "Build (Turborepo)", "integration_id": 15368},
        {"context": "TypeScript Check", "integration_id": 15368}
      ]
    }}
  ]
}
```

## Verificar após aplicar

- Com a conta do mantenedor, consulte `GET repos/leonardoslima/muvit/rulesets/<id>` e confirme regras, ausência de bypass (inclusive para admins) e inclusão exata da branch. Consulte `GET repos/leonardoslima/muvit/rules/branches/develop` e confirme PR e CI estrito efetivos com o mesmo `ruleset_id`. A consulta a proteções clássicas pode continuar retornando 404 porque o ruleset é um mecanismo distinto.
- Confira em um PR autorizado para `develop` que o GitHub lista os quatro checks obrigatórios, bloqueia merge com check pendente, base atrasada ou thread aberta, e libera quando os gates passam sem aprovações formais. Não faça merge ou push direto só para testar a proteção. Exigências adicionais de regras sobrepostas precisam ser reconciliadas antes do despacho.
- O merge síncrono do coordenador usa `PUT /pulls/{number}/merge` com `sha` e `merge_method=squash`. Ele funciona com `allow_auto_merge=false`; habilitar auto-merge nativo seria uma decisão operacional separada.
- Na configuração da integração Linear, confira que movimentações automáticas do GitHub não antecipam o fechamento verificado pelo coordenador. Na automação Orca desativada, sincronize o prompt salvo para invocar somente `muvit-dispatch`, repassar `hybrid_go` e aplicar nos coordenadores a política publicada em `origin/develop`. Remova instruções antigas de handoff humano ou proibição de merge do coordenador. Preserve o probe, limites, locks, worktree por card, modelo do despachante e estado desativado.

Fontes: [Rulesets na API](https://docs.github.com/en/rest/repos/rules?apiVersion=2022-11-28), [checks obrigatórios](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [merge de PR na API](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request).
