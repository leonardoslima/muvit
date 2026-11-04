# Migrations após integração da área web

A sequência 0000–0008 publicada em `develop` permanece intacta. As migrations ainda não integradas da branch web (`0005_cheerful_justin_hammer`, `0006_gifted_nova` e `0007_dizzy_doctor_faustus`) foram substituídas por `0009_charming_nocturne`, gerada pelo Drizzle contra o snapshot 0008.

Bancos que seguem `develop` aplicam normalmente a migration 0009 após a 0008. Ambientes locais descartáveis que já executaram as antigas migrations da branch web precisam ser recriados antes de aplicar esta sequência; executar 0009 sobre esse schema criaria objetos já existentes. Bancos com dados que precisam ser preservados exigem reconciliação específica do schema e do histórico antes da atualização.
