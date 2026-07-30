# Confirmação de ações destrutivas

## Status

Design aprovado em 20 de junho de 2026. Este documento amplia a confirmação pontual de exclusão de aluno para todas as ações destrutivas visíveis no dashboard web.

## Contexto e princípios

O padrão segue as páginas do Notion [Rocketseat — Conteúdos, padrões e práticas](https://app.notion.com/p/38254a606c378171b06cc0f56dd1224f), [Front-end e React](https://app.notion.com/p/38254a606c37814abfcbf2120cda0d60) e [IA no desenvolvimento](https://app.notion.com/p/38554a606c37813b950df640b426c337): componentes devem ter responsabilidade clara, comportamentos realmente compartilhados não devem ficar espalhados e arquivos `AGENTS.md` devem transformar decisões recorrentes em instruções locais, diretas e verificáveis.

## Decisão arquitetural

`apps/web/src/components/ui/dialog.tsx` permanece como o único primitive e padrão visual de diálogo. Ele continua responsável por portal, sobreposição, foco, acessibilidade, estrutura e estilos básicos.

Será criada a composição `apps/web/src/components/confirmation-dialog.tsx`. Ela não define outro sistema de modal nem conhece entidades do domínio; sua única responsabilidade é coordenar o comportamento compartilhado de uma confirmação: abrir, apresentar a consequência, cancelar, executar a ação confirmada, indicar processamento e fechar após sucesso.

As telas consumidoras permanecem responsáveis por:

- fornecer o gatilho visual;
- definir título, descrição e texto do botão de confirmação;
- fornecer a ação concreta;
- fornecer campos ocultos serializáveis quando a ação utilizar `FormData`.

## Contrato conceitual

```tsx
<ConfirmationDialog
  trigger={<Button aria-label="Excluir aluno">...</Button>}
  title="Excluir aluno?"
  description="Esta ação não pode ser desfeita."
  confirmLabel="Excluir aluno"
  pendingLabel="Excluindo..."
  confirmAction={deleteStudentAction}
  hiddenFields={{ id: student.id }}
/>
```

`confirmAction` aceita uma função compatível com `FormData`. Server Actions recebem os campos ocultos normalmente; callbacks locais podem ignorar o argumento e executar a alteração de estado correspondente.

## Fluxos cobertos

- Exclusão persistente de aluno.
- Exclusão persistente de exercício criado pelo trainer.
- Remoção local de um dia durante a edição de treino.
- Remoção local de um exercício durante a edição de treino.

Novas ações destrutivas visíveis ao usuário devem reutilizar a mesma composição. Operações internas, como remoção de cookies, não fazem parte deste padrão de interface.

## Estado e erros

O diálogo permanece aberto enquanto a ação está pendente e desabilita uma segunda confirmação. Ele fecha somente depois que a ação termina sem erro. Erros de domínio ou API continuam sendo traduzidos pela borda responsável e não devem ser incorporados ao primitive `Dialog`.

## Alterações previstas

- Criar `apps/web/src/components/confirmation-dialog.tsx` e seu teste.
- Remover `apps/web/src/app/(app)/students/[id]/_delete-student-dialog.tsx` e seu teste específico.
- Migrar aluno, exercícios e editor de treino para a composição compartilhada.
- Incluir a composição no gate de cobertura visual crítica.
- Preservar as Server Actions e contratos de API existentes.

## Testes e verificação

- Testar abertura, cancelamento, confirmação, campos ocultos, estado pendente e fechamento após sucesso no componente compartilhado.
- Atualizar os testes do editor para provar que dia e exercício só são removidos após confirmação.
- Cobrir a integração de aluno e exercício com textos e identificadores corretos.
- Executar testes web, cobertura visual crítica, typecheck e Biome.
- Verificar no navegador pelo menos um fluxo persistente e um fluxo local sem confirmar exclusões reais de dados persistidos.
