# Testes das implementações — branch `teste/implementacoes` (23/11/2026)

Esta branch junta o que foi feito depois do retorno da apresentação na Unimed, para o grupo testar no computador antes de publicar. Ela parte da `demo-online` (617c1ac) e tem 13 commits pequenos de código, mais este roteiro. O site de demonstração não muda com ela.

## O que entrou

| Parte | O que muda | Commits |
|---|---|---|
| Meus horários | O profissional escolhe dias, faixas, duração da consulta e intervalo. O paciente só marca horários da grade, sem cair por cima de outra consulta. As telas mostram a duração real (não mais "50 min" fixo). | 302c622, e353ef5, 8aaf767, 1b305ce |
| Rota de pagamentos | `GET /api/pagamentos` só para o perfil paciente e só com os próprios pagamentos. Teste-guarda contra filtro `undefined` no Prisma e regra no `CLAUDE.md`. | 9ec41aa, 703366d |
| Resumo financeiro | Cada consulta guarda o próprio valor. Rota do resumo por mês e por ano. Financeiro com visão Mês e Ano e botão "Baixar PDF". | a58c289, 65d1c50, 706d903, e42d217 |
| Dependências | axios, follow-redirects, form-data e React Router 7. O `npm audit` das dependências de produção do frontend não aponta vulnerabilidades. | a024478, a8f34da |
| Cartões cortados | Os cartões do painel não são mais espremidos: a tabela do Financeiro sumia no celular e a Agenda cortava o fim da semana. | ba614fe |

## Como preparar (PowerShell)

Precisa de Node 20 ou mais novo (confira com `node -v`), por causa do React Router 7.

```powershell
git fetch origin
git switch teste/implementacoes
cd backend
npm install
npx prisma migrate deploy --schema src/prisma/schema.prisma
npx prisma generate --schema src/prisma/schema.prisma
cd ..\frontend
npm install
```

As duas migrations novas só acrescentam colunas: `intervalo_min` em `profissionais` (começa em 0) e `valor` em `agendamentos` (as consultas que já existem recebem o valor atual do profissional de cada uma).

Depois, rode o backend (`npm run dev` em `backend`) e o frontend (`npm run dev` em `frontend`) e entre com as contas fictícias do seed (veja o README, seção "Como rodar localmente").

Para os testes automáticos, siga a seção "Testes" do README: aplique as migrations também no `agendo_test` e rode `npm test` dentro de `backend`.

## Roteiro de testes

### Profissional
- [ ] **Meus horários** (menu, logo depois de Agenda): mudar a duração e o intervalo, acrescentar uma faixa de tarde, usar "Copiar para terça a sexta" e salvar. Duas faixas que se sobrepõem devem ser recusadas, com a mensagem no próprio dia.
- [ ] **Financeiro → Mês**: valor das sessões realizadas (não mais R$ 180 fixo), comparação com o mês anterior e lista das sessões do mês.
- [ ] **Financeiro → Ano**: gráfico e tabela mês a mês com o total.
- [ ] **Baixar PDF** (Financeiro, canto de cima à direita), na visão Mês e na visão Ano: o arquivo abre, tem os mesmos números da tela e não mostra nome de paciente.
- [ ] Na **Agenda**, marcar uma sessão passada como Realizada e voltar ao Financeiro: o valor dela aparece no mês.

### Paciente
- [ ] **Agendar**: os horários seguem a grade salva em Meus horários; um horário já marcado aparece ocupado.
- [ ] **Minhas consultas** e **Histórico**: a duração mostrada é a da consulta.

### Em qualquer tela
- [ ] Celular (ou janela estreita) e letra maior (botão A+): nada cortado, nada saindo da tela.
- [ ] Tema escuro: textos legíveis; o PDF sai sempre claro.

## Ainda fora desta branch
Ajustes de segurança no backend que aguardam aprovação do grupo (atualização de dependências e validação de entrada), a trava no banco contra duas marcações no mesmo instante e o registro de pagamentos (valor recebido, particular × convênio).
