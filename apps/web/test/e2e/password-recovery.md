# Recuperação de senha no navegador

Execute com API e Web locais da mesma worktree, banco de teste exclusivo e entrega de e-mail observável. Use somente contas e senhas descartáveis. Salve resultados e capturas em `artifacts/<escopo>/<execucao>/`, sem capturar tokens, cookies ou senhas. Os testes de UI em `src/app/(auth)/password-recovery.test.tsx` complementam este cenário; não substituem a integração real.

1. Sem sessão, abra `/login` e selecione **Esqueci minha senha**. Confirme a navegação para `/forgot-password`.
2. Solicite o link para uma conta existente. Confirme o estado **Enviando…**, botão desabilitado e confirmação genérica. Repita com endereço ausente: a mensagem deve ser a mesma.
3. Abra o link recebido no e-mail. Confirme `/reset-password` com os campos **Nova senha** e **Confirmar nova senha**, sem exigir login.
4. Informe menos de oito caracteres e depois senhas diferentes. Confirme a validação e que nenhuma troca ocorreu.
5. Informe senhas iguais com oito ou mais caracteres. Confirme **Redefinindo…** e sucesso. Use **Voltar para entrar**, autentique com a nova senha e confira que a senha anterior falha.
6. Abra novamente o mesmo link. Tente redefinir e confirme link inválido/expirado e ação **Solicitar novo link**. Repita com token expirado e token adulterado.
7. Abra `/reset-password` sem parâmetros e com `?error=INVALID_TOKEN`. Confirme o aviso de link inválido e ausência do formulário.
8. Com cookie de sessão presente, abra um link de recuperação válido. Confirme que a página continua acessível e não redireciona ao dashboard. Depois da troca, confirme revogação da sessão anterior na API, chamada de saída e remoção do cookie local. Use **Voltar para entrar** e confirme que `/login` permanece aberto, sem redirecionar ao dashboard. Se a saída falhar após a troca, a confirmação de senha redefinida deve permanecer visível.
9. Simule indisponibilidade da API ao solicitar e redefinir. Confirme erro legível, sem detalhe interno e possibilidade de tentar novamente.
10. Em viewport desktop e móvel, percorra por teclado: labels, ordem de foco, feedback acessível, ausência de overflow e retorno ao login.
