# Plano de melhorias — Agendô (10/11/2026)

Revisão feita sobre o código local em `C:\Users\Narra\Desktop\Agend-`, branch `feat/schema-prontuario` (último arquivo alterado em 03/11). Nenhum arquivo `.env` foi lido. Este plano complementa o `docs/plano.md` e tem três frentes: **A. Responsividade**, **B. Banco de dados** e **C. Correções que não podem esperar**. Cada tarefa traz o pedido pronto para colar no Claude Code.

Como usar: uma tarefa por vez, uma branch por tarefa a partir de `sprint-1-fundacao`, Plan Mode antes de tudo que mexe em banco, autenticação ou prontuário, e leitura do diff antes de aceitar. Sem `git push`.

---

## 1. O que a revisão encontrou

### Responsividade
Abri as 17 telas em largura de celular (375 px) com dados fictícios e medi cada uma.

- **Nenhuma tela tem breakpoint.** Não existe nenhuma classe `sm:`, `md:` ou `lg:` em todo o `frontend/src`.
- **A barra lateral nunca recolhe.** Em `DashboardLayout.jsx` ela é fixa em `w-56` (224 px). No celular sobram **151 px** para o conteúdo, e isso vale para as 13 telas logadas.
- **Conteúdo cortado em todas as telas logadas.** Exemplos de largura real do conteúdo dentro desses 151 px: Histórico 528 px, Pacientes 472 px, Configurações 396 px, Agendar 331 px.
- **A página inicial tem rolagem horizontal** (470 px de largura em tela de 375 px): o menu do topo e a grade de 4 números não cabem.
- **Login, Cadastro e Recuperar senha cabem** na tela, mas o Cadastro usa duas colunas apertadas.
- **Alvos de toque pequenos.** Várias telas têm botões e links com menos de 32 px de altura (até 7 por tela). O recomendado para toque é 44 px.
- **Texto pequeno.** O padrão das telas é `text-xs` (12 px), difícil de ler no celular.

Grades fixas que precisam de versão para celular:

| Arquivo | Grades (linha) |
|---|---|
| `LandingPage.jsx` | 3 colunas (62, 108), 4 colunas (86) |
| `auth/CadastroPage.jsx` | 2 colunas (164, 194, 211, 233) |
| `paciente/DashboardPage.jsx` | 3 colunas (40) |
| `paciente/AgendarPage.jsx` | 4 colunas (127) |
| `paciente/HistoricoPage.jsx` | 3 colunas (128) |
| `profissional/DashboardPage.jsx` | 4 colunas (64), 3 colunas (87) |
| `profissional/AgendaPage.jsx` | **7 colunas (109)** |
| `profissional/PacientesPage.jsx` | 3 colunas (66, 205), **12 colunas (246, 263)** |
| `profissional/ProntuariosPage.jsx` | 2 colunas (70), lista lateral fixa `w-56` (180) |
| `profissional/FinanceiroPage.jsx` | 4 colunas (104), 3 colunas (131) |
| `profissional/DsmPage.jsx` | 4 colunas (202) |
| `profissional/DocumentosCfpPage.jsx` | **5 colunas (203)** |
| `ConfiguracoesPage.jsx` | 2 colunas (92) |

### Banco de dados
O desenho do `schema.prisma` está bom: prontuário cifrado e versionado, anotações pessoais separadas, vínculo, consentimento e log sem chaves estrangeiras. O que falta:

- **A Tarefa 3 não foi concluída.** O schema e a migration `20261103120000_prontuario_cifrado_versionado` estão na branch, sem commit. A migration cria `versao_atual NOT NULL` em `prontuarios`, então ela falha se a tabela tiver linhas: o banco de desenvolvimento precisa ser recriado.
- **As tabelas "só inserção" ainda aceitam UPDATE e DELETE.** Os gatilhos (Tarefa 4) não existem.
- **O conflito de horário não é garantido pelo banco.** `agendamento.controller.js` consulta e depois grava, sem transação nem índice único. Dois pacientes podem marcar o mesmo horário ao mesmo tempo. O comentário no código diz "lock pelo banco", mas não há lock.
- **Faltam índices.** `agendamentos` não tem índice por profissional e data nem por paciente. O PostgreSQL não cria índice automático para chave estrangeira.
- **Faltam regras no banco:** nota da avaliação entre 1 e 5, duração e valor positivos, uma disponibilidade por dia para cada profissional, um vínculo ativo por par profissional e paciente.
- **O vínculo nunca é criado.** Não existe rota para o profissional confirmar a consulta. Hoje o status `CONFIRMADO` só acontece quando o paciente envia um `pagamentoId` no corpo do pedido.
- **O seed é mínimo:** um profissional e uma paciente, sem consulta, vínculo nem consentimento.
- **Não há documentação do banco** (diagrama entidade-relacionamento e descrição das tabelas), que o TAP promete no item 7 do Escopo.

### Erro de fuso horário na agenda (confirmado)
Testei as duas contas de `horariosDisponiveis` com o relógio em horário de Brasília:

- `new Date('2026-11-10').getDay()` devolve **segunda-feira**, e 10/11/2026 é terça. A tela mostra a disponibilidade do dia anterior, e toda segunda-feira aparece sem horários.
- Uma consulta salva às 09:00 é comparada como **12:00**. O horário já ocupado continua aparecendo como livre.

### Outros pontos
- `pagamentoId` vem do corpo do pedido sem conferência: qualquer paciente confirma a própria consulta sem pagar.
- O limite de 100 requisições a cada 15 minutos vale para a API inteira. O uso normal do painel pode estourar esse limite, e o login não tem limite próprio.
- `GET /api/profissionais` é público e devolve o e-mail dos profissionais.
- A recuperação de senha é simulada (o código só aparece no terminal do servidor).
- A página inicial mostra números que não existem ("2.400+ pacientes ativos", "180 profissionais", "98% satisfação").
- Valor da sessão fixo em R$ 180 em `FinanceiroPage.jsx` (linha 45) e no cadastro do profissional.
- Tokens no `localStorage` e refresh token gravado sem hash (já previsto para a Sprint 2).

---

## 2. Frente A — Responsividade

Regra para todas as tarefas A: **só mudar classes e marcação de layout**. Nada de lógica, chamadas de API ou textos. Abordagem "celular primeiro": a classe sem prefixo vale para o celular, e `sm:`, `md:`, `lg:` ampliam. Usar os breakpoints padrão do Tailwind (640, 768, 1024). Uma branch `feat/responsivo`, um commit por tarefa.

### A1. Layout com menu recolhível (resolve as 13 telas logadas de uma vez)
- Abaixo de `lg`: barra lateral escondida, botão de menu no cabeçalho, menu abre como gaveta sobre a tela com fundo escurecido, fecha ao tocar fora, ao escolher um item e com a tecla Esc.
- A partir de `lg`: fica como é hoje.
- Trocar `h-screen` por `h-dvh` (a barra do navegador do celular corta o `h-screen`).
- Esconder a data por extenso do cabeçalho no celular. `main` com `p-4 lg:p-5`.

> **Pedido:** Em `frontend/src/components/layout/DashboardLayout.jsx`, torne o layout responsivo sem alterar lógica de autenticação nem os itens do menu. Abaixo do breakpoint `lg`, a barra lateral deve virar uma gaveta aberta por um botão no cabeçalho (com `aria-label`, `aria-expanded`, fechamento por Esc, por toque fora e ao navegar). A partir de `lg`, mantenha o visual atual. Troque `h-screen` por `h-dvh`. Mostre o plano antes e não toque em nenhum outro arquivo.

### A2. Grades simples
Trocar cada grade da tabela da seção 1 por uma versão progressiva. Padrão: 4 colunas vira `grid-cols-2 lg:grid-cols-4`; 3 colunas vira `grid-cols-1 sm:grid-cols-3`; 2 colunas de formulário vira `grid-cols-1 sm:grid-cols-2`. Fazer primeiro as telas do paciente (é quem mais usa o celular), depois as do profissional.

> **Pedido:** Aplique grades responsivas, celular primeiro, nas telas de `frontend/src/pages/paciente/` (DashboardPage, AgendarPage, HistoricoPage, ConsultasPage). Altere apenas `className`. Em 375 px não pode haver rolagem horizontal nem texto cortado. Liste cada linha alterada.

Repetir o pedido para `pages/profissional/` (Dashboard, Financeiro, DSM), depois `pages/auth/` e `ConfiguracoesPage.jsx`.

### A3. Telas que precisam de outro desenho no celular
- **Agenda (7 colunas):** no celular, mostrar um dia por vez com um seletor de dias da semana no topo. A grade de 7 colunas volta a partir de `md`.
- **Pacientes (12 colunas):** no celular, cada paciente vira um cartão empilhado. O cabeçalho da "tabela" some abaixo de `md`.
- **Prontuários (lista lateral de 224 px + detalhe):** no celular, lista em tela cheia e detalhe em outra visão, com botão de voltar. A tela está fora do ar (503) até as tarefas de prontuário, então aqui é só layout.
- **Documentos CFP (5 colunas):** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

> **Pedido (um por tela):** Em `AgendaPage.jsx`, a grade semanal de 7 colunas não cabe no celular. Proponha, em Plan Mode, uma versão para telas abaixo de `md` que mostre um dia por vez com seletor de dias, mantendo a grade atual a partir de `md`. Não mude os hooks nem as regras de "Realizada" e "Cancelar".

### A4. Página inicial e cadastro
- Menu do topo: no celular, manter logotipo e "Entrar"; "Funcionalidades" e "Planos" somem ou vão para um menu.
- Números: `grid-cols-2 sm:grid-cols-4`. **Trocar os números inventados** por texto verdadeiro (por exemplo, o que a plataforma faz) ou marcar como ilustrativos.
- Cadastro: os dois cartões "Paciente / Profissional" podem ficar lado a lado, e os campos em uma coluna.

### A5. Toque, leitura e janelas
- Botões, links de menu e campos com altura mínima de 44 px no celular.
- Texto base `text-sm` no celular; `text-xs` só para legendas.
- Campos de formulário com fonte de 16 px no celular (o iPhone dá zoom sozinho em campo com fonte menor).
- As três janelas modais (`fixed inset-0` em Pacientes, Prontuários e Histórico): `max-h-[90dvh]` com rolagem interna.

### A6. Conferência (feito = tudo abaixo)
Testar no modo de dispositivo do navegador (F12) em 360, 390, 768, 1024 e 1280 px, com as duas contas:
- [ ] Nenhuma tela com rolagem horizontal
- [ ] Menu abre e fecha no celular, e some a gaveta ao navegar
- [ ] Agendar uma consulta inteira pelo celular, do profissional até a confirmação
- [ ] Agenda, Pacientes e Prontuários legíveis em 360 px
- [ ] Nada mudou em 1280 px

---

## 3. Frente B — Banco de dados

### B1. Fechar a Tarefa 3 (schema e migration)
1. Claude Code lista os comandos SQL da migration e as regras `ON DELETE`.
2. Aplicar em `agendo_test` (conferir que o nome do banco termina em `_test`).
3. Você para o backend e roda `npx prisma migrate reset` e `npm run db:seed` em `agendo_db`.
4. `npm test`, commit em `feat/schema-prontuario`, merge em `sprint-1-fundacao`.

> **Pedido:** Retome a Tarefa 3. Antes de rodar qualquer coisa, liste cada comando SQL da migration `20261103120000_prontuario_cifrado_versionado` e a regra ON DELETE de cada chave estrangeira. Depois aplique somente no banco de teste, confirmando antes que o nome do banco termina em `_test`. Não rode nada em `agendo_db`. Não leia arquivos `.env`.

### B2. Gatilhos de "só inserção" (Tarefa 4)
- `prontuario_versoes`, `anotacoes_pessoais` e `logs_acesso_prontuario`: gatilho que recusa UPDATE, DELETE e TRUNCATE.
- `consentimentos`: único UPDATE permitido é preencher `revogado_em` quando ele está vazio.
- Testes que provam a recusa.

> **Pedido (Plan Mode):** Planeje uma migration SQL com gatilhos PostgreSQL que recusem UPDATE, DELETE e TRUNCATE em `prontuario_versoes`, `anotacoes_pessoais` e `logs_acesso_prontuario`, e que em `consentimentos` permitam apenas preencher `revogado_em` uma única vez. Inclua testes com `node --test` que tentem alterar e apagar e esperem erro. Mostre o SQL completo antes de criar o arquivo.

### B3. Integridade da agenda
- Índice único parcial: um horário ativo por profissional (`profissional_id, data_hora` onde o status é PENDENTE ou CONFIRMADO). O Prisma não descreve índice parcial no schema, então vai em SQL na migration.
- O controller passa a tratar o erro de duplicidade (P2002) como 409 "Horário já ocupado".
- Índices: `agendamentos(profissional_id, data_hora)`, `agendamentos(paciente_id, data_hora)`, `notificacoes(usuario_id)`, `pagamentos(paciente_id)`, `refresh_tokens(usuario_id)`.
- Regras CHECK: nota entre 1 e 5, `duracao_min > 0`, `valor >= 0`, `fim_em > inicio_em` no vínculo.
- Único `(profissional_id, dia_semana)` em `disponibilidades`.

> **Pedido (Plan Mode):** Hoje o conflito de horário em `agendamento.controller.js` é "consulta e depois grava", sem garantia do banco. Planeje uma migration com índice único parcial para horários ativos por profissional, os índices e as regras CHECK listados no `docs/plano-melhorias.md` (B3), e o ajuste no controller para devolver 409. Inclua um teste que dispare dois agendamentos simultâneos para o mesmo horário e espere um 201 e um 409.

### B4. Fuso horário
- Decisão: gravar em UTC (`timestamptz`) e converter para `America/Sao_Paulo` na entrada e na saída.
- Corrigir o dia da semana e a comparação de horários ocupados em `horariosDisponiveis`.
- O frontend envia a data e a hora com fuso explícito.

> **Pedido (Plan Mode):** Em `horariosDisponiveis`, `new Date(data).getDay()` devolve o dia anterior no fuso de Brasília, e os horários ocupados são comparados em UTC contra horários locais. Planeje a correção com uma política única de fuso (UTC no banco, `America/Sao_Paulo` na borda), incluindo o que muda no envio de `dataHora` em `AgendarPage.jsx`. Escreva testes que rodem com `TZ=America/Sao_Paulo` e com `TZ=UTC` e passem nos dois.

### B5. Confirmação da consulta e vínculo
- Nova rota `PATCH /api/agendamentos/:id/confirmar`, só para o profissional da consulta.
- Na mesma transação: status vira CONFIRMADO e, se não houver vínculo ativo, cria o vínculo.
- Índice único parcial em `vinculos(profissional_id, paciente_id)` onde `fim_em` é nulo.
- Remover a confirmação por `pagamentoId` vindo do corpo do pedido.

### B6. Seed completo, só com dados fictícios
Dois profissionais, três pacientes, consultas com datas relativas a "hoje" (passadas e futuras), um vínculo e um consentimento. Prontuário de exemplo só depois das tarefas de cifragem. Rodar duas vezes não pode duplicar nada.

### B7. Usuário do banco com privilégio mínimo
Criar no pgAdmin um usuário `agendo_app` só com SELECT, INSERT, UPDATE e DELETE nas tabelas comuns, e **sem** UPDATE nem DELETE nas tabelas de só inserção. A senha fica apenas no `backend\.env`, escrita por você. As migrations continuam com o usuário administrador. Isso também vira conteúdo de segurança para o relatório de Infraestrutura.

### B8. Documentação do banco (serve ao TAP e à disciplina de Banco de Dados)
- `docs/banco.md` com o diagrama entidade-relacionamento (Mermaid `erDiagram`), a descrição de cada tabela e campo, as chaves e as regras.
- Um parágrafo sobre normalização e sobre por que o log não tem chave estrangeira.
- Esse arquivo vira o **Anexo A** do relatório.

> **Pedido:** Gere `docs/banco.md` a partir do `schema.prisma` atual: diagrama em Mermaid `erDiagram`, dicionário de dados por tabela (campo, tipo, obrigatório, chave, descrição) e as regras de integridade. Só documentação, nenhum código alterado.

### B9. Backup (Sprint 4)
Script de `pg_dump` com arquivo cifrado e teste de restauração em um banco vazio. Um backup que nunca foi restaurado não conta.

---

## 4. Frente C — Correções que não podem esperar

| # | Problema | Correção |
|---|---|---|
| C1 | Limite global de 100 requisições por 15 min | Limite folgado para a API e um limite próprio e baixo para login, cadastro e recuperação de senha |
| C2 | `GET /api/profissionais` expõe e-mail | Devolver só nome, especialidade, CRP, bio e valor |
| C3 | Números inventados na página inicial | Trocar por texto verdadeiro (junto com A4) |
| C4 | Valor da sessão fixo em R$ 180 | Ler `valorSessao` do profissional |
| C5 | Erro de digitação "sessõões" e saudação "Dra." | Corrigir os textos |

Ficam para a Sprint 2, como já planejado: cookies `httpOnly`, hash do refresh token, recuperação de senha de verdade, "salvo!" falso das Configurações.

---

## 5. Ordem e datas

A Sprint 1 terminava em 08/11 e a Tarefa 3 ainda está aberta, então o calendário do `docs/plano.md` atrasou cerca de uma semana. Proposta até a apresentação de 05/12:

| Período | O que fazer |
|---|---|
| 10–12/11 | B1, B2 e B8 (fecha o banco e gera o Anexo A a tempo do relatório, que vence dia 12) |
| 13–16/11 | A1, A2 e A6 parcial (o sistema já fica usável no celular) e B4 |
| 17–20/11 | A3, A4, A5 e as correções C |
| 21–27/11 | B3, B5, B6 e as rotas de prontuário cifrado (leitura, criação, log) |
| 28–29/11 | B7, B9, tela de consentimento, conferência A6 completa |
| 30/11–04/12 | Folga e ensaio |

Se faltar tempo, o que sai primeiro: A5 parcial, C4, B7. O que não pode sair: B1, B2, B4, A1 e as rotas de prontuário.

## 6. Regras do Claude Code que continuam valendo
- Nunca ler, abrir ou editar arquivos `.env`. Nenhuma senha ou chave no chat.
- Nunca trabalhar na `main` e nunca dar `git push` sem pedido.
- Nenhuma migration em `agendo_db` sem a sua aprovação. Testes só em banco terminado em `_test`.
- Só dados fictícios. O repositório é público.
- "Manually approve edits" ligado. Plan Mode em banco, autenticação e prontuário.
- Pronto significa: testes passando, diff lido, commit pequeno, e uma linha em `docs/` dizendo o que foi feito.
