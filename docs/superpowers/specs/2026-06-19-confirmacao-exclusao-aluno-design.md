# Confirmação de exclusão de aluno

## Objetivo

Impedir a exclusão imediata de um aluno ao clicar no ícone de lixeira da página de detalhes, exigindo uma confirmação explícita antes de enviar a ação existente.

## Design

- Reutilizar o componente `Dialog` existente em `apps/web/src/components/ui/dialog.tsx`.
- Extrair o controle interativo para um componente cliente pequeno, mantendo a página de detalhes como Server Component.
- O ícone atual abre o modal sem executar a exclusão.
- O modal exibe o título `Excluir aluno?`, identifica o aluno pelo nome e informa que a ação não pode ser desfeita.
- O botão `Cancelar` fecha o modal sem enviar o formulário.
- O botão destrutivo `Excluir aluno` envia o formulário para `deleteStudentAction`, preservando o contrato e o redirecionamento atuais.
- O fechamento pelo botão superior, tecla Escape ou clique fora segue o comportamento acessível já fornecido pelo `Dialog` existente.

## Tratamento de estado e erros

A confirmação não cria estado de domínio nem altera o contrato da API. O estado de abertura permanece encapsulado pelo `Dialog`. O fluxo de erro da Server Action não será ampliado nesta mudança, pois o objetivo é somente impedir exclusões acidentais e preservar o comportamento atual após a confirmação.

## Testes

Adicionar teste de interface com Vitest, Testing Library e jsdom para verificar que:

1. clicar no ícone abre o diálogo acessível;
2. cancelar fecha o diálogo sem chamar a ação;
3. confirmar envia a ação de exclusão com o identificador correto.

Os testes devem usar texto visível em pt-BR e seletores acessíveis.
