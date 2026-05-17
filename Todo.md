# Vivi Gourmet — TODO

> Atualizado em 17/05/2026. MVP concluído.
> Ver `STATUS.md` para diagnóstico completo do projeto.

## A — Correções pendentes
- [ ] `migrate resolve` para migration `20260517100000_add_soft_delete_to_menu` — falha por advisory lock do Neon; rodar quando o DB estiver disponível

## B — Deploy / Produção
- [ ] Provisionar banco PostgreSQL gerenciado (Railway ou Render)
- [ ] Configurar deploy da API (Railway ou Render)
- [ ] Configurar variáveis de ambiente de produção na Vercel (web): `NEXT_PUBLIC_API_URL`
- [ ] Configurar `WEB_ORIGIN` no ambiente de produção da API
- [ ] Rodar `prisma migrate deploy` em produção
- [ ] Testar fluxo completo em produção

## C — Relatórios e Exportação
- [ ] Exportar lista de ingredientes (CSV)
- [ ] Exportar receitas com custos (PDF)
- [ ] Exportar histórico de despesas por período (CSV/PDF)
- [ ] Exportar perfil financeiro de cliente (PDF)
- [ ] Relatório mensal de custos vs. receita operacional

## D — Auditoria de Testes
- [ ] Revisar cobertura de `auth.service.spec.ts`
- [ ] Revisar cobertura de `ingredients.service.spec.ts`
- [ ] Revisar cobertura de `recipes.service.spec.ts`
- [ ] Revisar cobertura de `products.service.spec.ts`
- [ ] Revisar cobertura de `expenses.service.spec.ts`
- [ ] Revisar cobertura de `menus.service.spec.ts`
- [ ] Revisar cobertura de `customers.service.spec.ts`
- [ ] Adicionar testes para `dashboard.service`

## Backlog futuro
- [ ] Drag-and-drop visual no painel de itens do cardápio (atualmente usa botões de ordem)
- [ ] Upload de foto/avatar do cliente
- [ ] Relatório de ponto de equilíbrio (break-even)
- [ ] Múltiplos usuários por empresa com controle de permissão na UI
- [ ] Configurações de conta/empresa
- [ ] Notificações
- [ ] App mobile
- [ ] `@@unique([companyId, orderNumber])` no schema + mover leitura do `orderNumber` para dentro do `$transaction` em `customers.service.ts`
