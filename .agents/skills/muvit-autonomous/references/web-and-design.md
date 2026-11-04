# QA web e design

- Para fluxos web, testar com navegador do Orca quando disponível e autorizado; usar interação real, não somente assertions de componentes.
- Subir API e banco próprios para operações autenticadas, CRUD e persistência. Registrar evidências de testes e regressões.
- QA visual testa a aplicação em execução, sem exigir comparação com design de referência. Usar Pen CLI para tarefas explícitas de leitura ou edição de arquivos `.pen`.
- Validar responsividade, erros, loading, vazios, estados de dados e acessibilidade pertinente ao card.
- Se o navegador não estiver disponível, registrar o QA visual pendente, sem aprovação presumida. Ausência da Pen CLI só impede a etapa que depender explicitamente de `.pen`.
- Evitar adicionar segunda biblioteca de UI/gerência de estado sem demanda explícita, e não implantar layout paralelo legado só para justificar a mudança.
