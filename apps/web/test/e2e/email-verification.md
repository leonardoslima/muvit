# Confirmação de email

Execute com API e PostgreSQL exclusivos e callback de entrega injetado pelo harness de QA. Não imprima nem anexe tokens, cookies ou endereços pessoais. Use uma conta descartável e uma origem Web permitida; não dependa de entrega externa para este roteiro.

1. Cadastre uma conta trainer, confirme que a tela de confirmação aparece e que `/dashboard` retorna à confirmação enquanto a conta estiver pendente.
2. Solicite reenvio e confirme o texto genérico e o intervalo de espera. Tente enviar repetidamente e verifique o limite da API.
3. Abra o link válido capturado pelo harness, confirme que a sessão é consultada novamente e que o dashboard fica acessível. Confira a persistência de `emailVerified` na API.
4. Abra links inválidos e expirados e verifique o feedback, sem acesso privado indevido. Repita a confirmação sem sessão e com outra conta aberta.
5. Em perfil, solicite outro email e confira que o endereço antigo continua visível até confirmar. Com a mesma conta autenticada, abra o link de troca capturado e confirme novo email no perfil e no login; repita sem sessão e com conta diferente para conferir a rejeição.
6. Verifique recuperação de senha e logout com conta pendente. Teste rede indisponível, responsividade e navegação por teclado nos estados afetados.

Salve resultados e capturas sanitizadas em `artifacts/<escopo>/<execucao>/`; registre separadamente a entrega externa e não trate mocks como prova de caixa postal.
