# Plano de desenvolvimento — Agendô (nov/2026)

Objetivo: uma **fatia completa e segura** do sistema (login, paciente, agendamento, prontuário cifrado, log de acesso, consentimento), rodando localmente com dados fictícios, em vez de vários CRUDs pela metade.

Datas de referência: hoje é 01/11. Apresentação da disciplina de Infraestrutura: 05/12. Folga e ensaio: 30/11 a 04/12.

Como usar: cada sprint tem um checklist e um pedido para colar no Claude Code. **Use o Plan Mode** em tudo que mexe em banco, autenticação ou prontuário, e leia o diff antes de aceitar.

---

## Sprint 0 — Preparação (01–02/11)

- [x] Projeto clonado em `C:\Users\Narra\Desktop\Agend-`, branch `sprint-1-fundacao`
- [x] `.env` fora do Git, feed de notícias removido
- [x] **Revogar a chave do GNews** no painel do GNews (o repositório é público)
- [ ] **Trocar os segredos de produção** (adiado, não urgente): `JWT_SECRET` e `JWT_REFRESH_SECRET` no Render, e a senha do Redis no Upstash. Se o backend de produção não for mais usado, suspendê-lo no Render
- [x] Banco local `agendo_db` criado no PostgreSQL 18 (senha nova, fora do Git)
- [x] `backend\.env` local criado: `DATABASE_URL` para `localhost`, `REDIS_URL` local, `JWT_SECRET` e `JWT_REFRESH_SECRET` novos
- [x] `npm install` em `backend` e `frontend`
- [x] `npx prisma migrate dev` e seed rodados; login testado com `ana.melo@agendo.app` e `fernanda@agendo.app` (senha `senha123`)
- [ ] Conferir se `backend\.env.example` não contém a senha antiga (trocar por `SUA_SENHA`)
- [ ] Copiar `CLAUDE.md` para a raiz e este arquivo para `docs\plano.md`, e fazer o commit (sem push)
- [ ] Primeira conversa com o Claude Code, **só leitura** (pedido abaixo)

**Pedido ao Claude Code (Plan Mode, sem alterar nada):**
> Leia o projeto e me explique em português simples: a estrutura de pastas, o fluxo de login do clique até o banco, as entidades do `schema.prisma`, e o que hoje é simulado em vez de real. Não leia arquivos `.env`. Não altere nenhum arquivo.

---

## Sprint 1 — Fundação segura (02–08/11)

Entrega: banco local funcionando e as estruturas que protegem o prontuário.

- [ ] Model `Prontuario` com `pacienteId`, `profissionalId`, `conteudoCifrado`, `iv`, `authTag`, `versao`, `criadoEm`
- [ ] Model `Consentimento` com `pacienteId`, `versaoTermo`, `aceitoEm`, `ip`, `revogadoEm`
- [ ] Model `LogAcessoProntuario` com `prontuarioId`, `usuarioId`, `acao` (LEITURA, CRIACAO, EDICAO), `ip`, `ocorridoEm`. Só inserção
- [ ] Conferir se já existe vínculo profissional↔paciente; se não, criar
- [ ] Bug conhecido (bom exercício): "Próximas consultas" mostra datas passadas e "Em -61 dias" (seed com datas fixas e/ou falta de filtro de datas futuras); saudação do profissional mostra só "Dra."
- [ ] `backend/src/utils/crypto.js` com `encrypt()` e `decrypt()` (AES-256-GCM), chave em `PRONTUARIO_KEY` no `.env` local
- [ ] Teste: cifrar, gravar, ler e decifrar um prontuário de exemplo

**Pronto quando:** abrindo a tabela direto no banco o conteúdo está ilegível; `decrypt(encrypt(x))` devolve `x`; a chave não aparece em nenhum arquivo versionado.

**Pedido (Plan Mode primeiro):**
> Planeje, sem implementar, os models `Prontuario`, `Consentimento` e `LogAcessoProntuario` no `schema.prisma` e um módulo `backend/src/utils/crypto.js` com AES-256-GCM (chave em `PRONTUARIO_KEY`). Mostre o schema proposto, os riscos e o que muda no `prontuario.controller.js` existente. Não leia arquivos `.env`.

Depois de aprovar o plano:
> Implemente o plano, gere a migration e escreva um teste que cifra, grava, lê e decifra um prontuário. Explique cada arquivo alterado.

---

## Sprint 2 — Autenticação e CRUDs base (09–15/11)

- [ ] Tokens em cookies `httpOnly` + `Secure` + `SameSite` (saem do `localStorage`); refresh token com rotação
- [ ] Recuperação de senha com OTP validado no backend (expiração e limite de tentativas)
- [ ] CRUD de pacientes e profissionais, com exclusão lógica (soft-delete) e validação com express-validator
- [ ] CRUD de agendamentos, com regra de conflito de horário
- [ ] Remover o que é falso: "salvo!" das Configurações sem salvar, 2FA decorativo, valor de sessão fixo (R$180 vem do banco)

**Pedido:** um recurso por vez (login, depois pacientes, depois agendamentos), sempre com este final:
> Valide o payload com express-validator, aplique o controle de acesso por perfil e escreva testes de integração, incluindo um que prove que o profissional A não acessa o paciente do profissional B.

---

## Sprint 3 — Prontuário completo (16–22/11)

- [ ] Criar e consultar prontuário com versionamento (editar cria nova versão)
- [ ] Toda leitura e escrita grava em `LogAcessoProntuario`
- [ ] Leitura só com consentimento válido e profissional vinculado
- [ ] Anotações pessoais do psicólogo em campo separado
- [ ] Testes de autorização em todas as rotas de prontuário
- [ ] Revisão de segurança manual das rotas de prontuário, feita pelo QA

Use o **Opus** nesta sprint (criptografia e controle de acesso). **Pedido de revisão:**
> Atue como revisor de segurança. Audite todas as rotas de prontuário procurando falhas de autorização, injeção, vazamento em logs e ausência de checagem de consentimento. Liste o que achou, com arquivo e linha, e proponha correções. Não altere nada.

---

## Sprint 4 — LGPD, backup e fechamento (23–29/11)

- [ ] Tela de consentimento no cadastro do paciente
- [ ] Direito de acesso, exportação e exclusão dos próprios dados (art. 18 da LGPD)
- [ ] Política de retenção do prontuário (`RETENCAO_PRONTUARIO_ANOS`)
- [ ] Script de backup do banco, com o arquivo de backup cifrado (serve também à disciplina de Infraestrutura)
- [ ] Documentação curta: modelo de dados, fluxo de consentimento, como rodar localmente
- [ ] Ensaio da demonstração com dados fictícios

---

## 30/11 a 04/12 — Folga e ensaio

Ajustes de última hora, relatório final da disciplina e ensaio da apresentação de 05/12.

## Regras que valem em todas as sprints
- Uma tarefa pequena por vez, um commit por tarefa
- Ler o diff antes de aceitar; mudanças em autenticação e prontuário passam pelo QA
- Nada de dado real, nenhum segredo no Git (o repositório é público)
- Ao fim de cada sprint, salvar um arquivo curto em `docs/` com o que foi feito: vira texto para Resultados e Considerações Finais do relatório
