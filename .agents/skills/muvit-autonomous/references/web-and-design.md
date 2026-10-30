# QA web e design

- Para fluxos web, testar com navegador do Orca quando disponível e autorizado; usar interação real, não somente assertions de componentes.
- Subir API e banco próprios para operações autenticadas, CRUD e persistência. Registrar evidências de testes e regressões.
- Para telas com arquivos `.pen`, usar Pen CLI instalada e verificar telas/estados especificados; preferir referência pertinente do design, não um palpite visual.
- Validar responsividade, erros, loading, vazios, estados de dados e acessibilidade pertinente ao card.
- Se o navegador ou a Pen CLI não estiverem disponíveis, marcar o que ficou sem verificar, não substituir por aprovação presumida.
- Evitar adicionar segunda biblioteca de UI/gerência de estado sem demanda explícita, e não implantar layout paralelo legado só para justificar a mudança.
