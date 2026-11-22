<div align="center">

<img src="docs/img/logo.svg" width="72" height="72" alt="">

# Agendô

**Agendamento e prontuário digital para clínicas de psicologia, com o sigilo do atendimento tratado como requisito desde o banco de dados.**

[![CI](https://github.com/GcBreda/Agendo/actions/workflows/ci.yml/badge.svg)](https://github.com/GcBreda/Agendo/actions/workflows/ci.yml)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-f59e0b)
![Node.js](https://img.shields.io/badge/Node.js-22.9%2B-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-087ea4?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)

[Sobre](#sobre) · [Telas](#telas) · [Funcionalidades](#funcionalidades) · [Segurança](#segurança-e-privacidade) · [Arquitetura](#arquitetura) · [Como rodar](#como-rodar-localmente) · [Roteiro](#roteiro) · [Equipe](#equipe) · [Licença](#licença)

<br>

<img src="docs/img/destaque.png" alt="Agenda semanal do profissional no computador e a mesma agenda no celular, com um seletor de dias" width="100%">

</div>

> [!IMPORTANT]
> Projeto acadêmico em desenvolvimento. Use somente dados fictícios: o sistema ainda não está pronto para guardar informações reais de pacientes.

## Sobre

O Agendô é o Projeto Integrador de um grupo de alunos do curso de Análise e Desenvolvimento de Sistemas da Universidade de Sorocaba (UNISO). A plataforma reúne a agenda da clínica e o prontuário do atendimento psicológico:

- **o paciente** escolhe o profissional, o dia e o horário, e acompanha as próprias consultas;
- **o psicólogo** organiza a semana, acompanha os pacientes e registra o atendimento.

O prontuário psicológico é dado de saúde, que a Lei Geral de Proteção de Dados classifica como dado pessoal sensível (LGPD, art. 5º, II). Por isso, sigilo, registro de acesso e consentimento são regras do próprio banco de dados, e não apenas cuidados de tela.

## Telas

Todas as telas abaixo usam dados fictícios.

| Paciente: escolha de data e horário | Profissional: lista de pacientes |
|---|---|
| <img src="docs/img/agendar.png" alt="Passo de escolha de data e horário no agendamento de consulta"> | <img src="docs/img/pacientes.png" alt="Lista de pacientes com sessões, próxima consulta e status"> |

No celular, o menu lateral vira uma gaveta e a agenda mostra um dia por vez:

<img src="docs/img/celular.png" alt="Três telas no celular: agenda com seletor de dias, menu aberto e escolha de horário" width="100%">

## Funcionalidades

| Para o paciente | Situação |
|---|---|
| Cadastro e login | Pronto |
| Agendamento: profissional, data, horário e tipo de sessão | Pronto |
| Minhas consultas, cancelamento e histórico com filtros | Pronto |
| Lembretes 3 dias, 1 dia e 2 horas antes da consulta | Parcial: a fila agenda os lembretes, mas o envio de e-mail ainda é simulado |
| Recuperação de senha | Simulado: o código aparece só no terminal do servidor |
| Pagamento online | Planejado |

| Para o profissional | Situação |
|---|---|
| Visão geral do dia e agenda semanal | Pronto |
| Marcar consulta como realizada | Pronto |
| Pacientes: busca, filtros e histórico de sessões | Pronto |
| Prontuário cifrado e versionado | Em construção: o banco está pronto e as rotas estão sendo escritas |
| Financeiro | Parcial: os números vêm das consultas, mas o valor da sessão ainda é fixo |
| Material de consulta: Código de Ética, DSM-5 e documentos do CFP | Pronto |
| Configurações | Simulado: a tela ainda não grava as alterações |

## Segurança e privacidade

A base de proteção do prontuário já está pronta no banco de dados e no módulo de cifragem. As rotas que vão usar essa base estão em construção (veja o [roteiro](#roteiro)).

- **Prontuário cifrado.** O conteúdo clínico é guardado cifrado com AES-256-GCM. A chave fica fora do código, do banco e do Git, e cada gravação usa um vetor de inicialização novo. Os dados autenticados adicionais (AAD) prendem cada bloco ao seu prontuário e à sua versão: um conteúdo copiado para outro registro não pode ser decifrado.
- **Histórico que não se apaga.** Cada edição do prontuário vira uma versão nova, e a anterior continua guardada.
- **Regras garantidas pelo PostgreSQL.** Gatilhos (*triggers*) recusam alterar ou apagar o histórico do prontuário, as anotações pessoais e o log de acesso. No consentimento, a única alteração aceita é registrar a revogação, uma única vez. O número da versão do prontuário só avança de um em um.
- **Log de acesso.** Uma tabela própria guarda cada leitura, criação, edição ou tentativa negada, e só aceita inserção.
- **Consentimento e vínculo.** O consentimento do paciente guarda a versão do termo, a base legal e a revogação. O vínculo entre profissional e paciente vai definir quem pode abrir cada prontuário.

No restante do sistema:

- **Autenticação.** Senhas com bcrypt, token de acesso de 15 minutos e token de renovação de 7 dias, validação de entrada com express-validator, limite de requisições e CORS com lista de origens permitidas.
- **Testes do que protege o dado.** Testes automatizados cobrem a cifragem e os gatilhos do banco. Uma trava impede que eles rodem em qualquer banco cujo nome não termine em `_test`.

O que ainda falta está registrado em [Limites conhecidos](docs/banco.md#6-limites-conhecidos) e no [roteiro](#roteiro). Para relatar uma vulnerabilidade, veja a [política de segurança](SECURITY.md).

## Arquitetura

```mermaid
flowchart LR
  subgraph Navegador
    F["Frontend<br/>React 18 · Vite · Tailwind CSS"]
  end
  subgraph API["API · Node.js + Express"]
    R["Rotas, autenticação<br/>e validação"]
    C["Cifragem do prontuário<br/>AES-256-GCM"]
    W["Worker de lembretes"]
  end
  F -- "JSON + JWT" --> R
  R --> C
  R -- Prisma --> P[("PostgreSQL<br/>tabelas e gatilhos")]
  C -- Prisma --> P
  R -- BullMQ --> Q[("Redis<br/>fila de lembretes")]
  Q --> W
  W -- Prisma --> P
```

O modelo de dados tem 15 tabelas. O diagrama entidade-relacionamento, o dicionário de dados e as regras de integridade estão em [`docs/banco.md`](docs/banco.md).

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, TanStack Query 5, Axios |
| Backend | Node.js, Express 4, express-validator, express-rate-limit, jsonwebtoken, bcryptjs |
| Dados | PostgreSQL, Prisma 5, gatilhos em PL/pgSQL |
| Fila | Redis, BullMQ |
| Testes | `node:test`, o executor de testes nativo do Node.js |

## Como rodar localmente

**Pré-requisitos:** Node.js 22.9 ou mais recente, PostgreSQL 16 ou mais recente e Redis em `localhost:6379` (no Windows, o [Memurai](https://www.memurai.com/) é compatível). Os comandos abaixo funcionam no PowerShell e no terminal do Linux ou do macOS.

**1. Clone o repositório e crie os dois bancos**

```bash
git clone https://github.com/GcBreda/Agendo.git
cd Agendo
psql -U postgres -c "CREATE DATABASE agendo_db;"
psql -U postgres -c "CREATE DATABASE agendo_test;"
```

Se preferir, crie os bancos `agendo_db` e `agendo_test` pelo pgAdmin.

**2. Configure o backend**

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `backend/.env` e preencha:

- `DATABASE_URL` com o seu usuário e a sua senha do PostgreSQL, apontando para `agendo_db`;
- `JWT_SECRET` e `JWT_REFRESH_SECRET` com dois valores longos e diferentes. Para gerar cada um:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Depois, gere a chave do prontuário. O script grava a chave direto no `.env`, sem exibi-la:

```bash
node scripts/gerar-chave-prontuario.js
```

> [!WARNING]
> Guarde uma cópia da `PRONTUARIO_KEY` em um gerenciador de senhas. Sem ela, os prontuários cifrados não podem ser lidos.

**3. Crie as tabelas, gere o cliente do banco e carregue os dados de exemplo**

```bash
npx prisma migrate deploy --schema src/prisma/schema.prisma
npx prisma generate --schema src/prisma/schema.prisma
npm run db:seed
npm run dev
```

A API sobe em `http://localhost:3001`. Confira em `http://localhost:3001/api/health`.

**4. Rode o frontend** em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173` e entre com uma das contas fictícias criadas pelo seed:

| Perfil | E-mail | Senha |
|---|---|---|
| Profissional | `ana.melo@agendo.app` | `senha123` |
| Paciente | `fernanda@agendo.app` | `senha123` |

Para apresentar sem instalar nada, há uma versão online com dados fictícios: veja [Demonstração online](docs/demo-online.md).

### Testes

Os testes do banco usam o `agendo_test` e recusam rodar em qualquer banco cujo nome não termine em `_test`. Crie o arquivo `backend/.env.test` com uma única linha:

```ini
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/agendo_test"
```

Depois, dentro de `backend`, aplique as migrations no banco de teste e rode os testes. O Redis precisa estar ligado.

```bash
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy --schema src/prisma/schema.prisma
npm test
```

## Estrutura

```text
Agendo/
├── backend/
│   ├── src/
│   │   ├── controllers/   regras de cada recurso
│   │   ├── routes/        rotas da API e validação de entrada
│   │   ├── middleware/    autenticação, validação e erros
│   │   ├── jobs/          fila de lembretes (BullMQ)
│   │   ├── utils/         cifragem do prontuário (AES-256-GCM)
│   │   └── prisma/        schema, migrations e seed
│   ├── scripts/           gerador da chave do prontuário
│   └── test/              testes com node:test
├── frontend/
│   └── src/
│       ├── pages/         telas de acesso, do paciente e do profissional
│       ├── components/    layout do painel
│       ├── context/       sessão do usuário
│       ├── hooks/         consultas à API
│       └── services/      cliente HTTP
└── docs/                  modelo de dados, planos e imagens
```

## Roteiro

- [x] Prontuário cifrado e versionado no banco, com consentimento, vínculo e log de acesso
- [x] Gatilhos que impedem alterar ou apagar o histórico
- [x] Painel responsivo: menu em gaveta, agenda com seletor de dias e lista de pacientes em cartões
- [ ] Rotas do prontuário: leitura, criação e edição, com registro de cada acesso
- [ ] Tela de consentimento no cadastro do paciente
- [ ] Confirmação da consulta pelo profissional, criando o vínculo
- [ ] Fuso horário único na agenda: UTC no banco e horário de Brasília na tela
- [ ] Garantia, no banco, de um só agendamento por horário de cada profissional
- [ ] Tokens em cookies `httpOnly` e token de renovação guardado com hash
- [ ] Recuperação de senha e lembretes por e-mail de verdade
- [ ] Backup cifrado do banco, com teste de restauração

O plano detalhado está em [`docs/plano-melhorias.md`](docs/plano-melhorias.md).

## Como o projeto é desenvolvido

- Cada tarefa tem a sua branch e entra por pull request, com commits pequenos.
- Mudanças em autenticação, banco e prontuário passam pela revisão do Q.A. antes de entrar na `main`.
- Testes automatizados rodam a cada pull request (GitHub Actions).
- Parte do código é escrita com apoio do Claude Code, seguindo as regras do [`CLAUDE.md`](CLAUDE.md): nenhum dado real, nenhum segredo no repositório e sigilo do prontuário em primeiro lugar. Toda mudança é lida e testada pela equipe antes de entrar.

## Equipe

Projeto Integrador do curso de Análise e Desenvolvimento de Sistemas da Universidade de Sorocaba (UNISO), 2026.

| Integrante | Papel |
|---|---|
| Giovanni Breda ([@GcBreda](https://github.com/GcBreda)) | Product Owner |
| Ketilyn Biason Silva | Desenvolvedora |
| Lucas Albino | Desenvolvedor |
| Mateus Alves | Desenvolvedor |
| Thiago Yamada | Desenvolvedor |
| Matheus Casaburi de Oliveira | Q.A. |

## Licença

Este repositório não tem licença de código aberto. O código está público para leitura e avaliação, mas todos os direitos são reservados aos autores. Para usar qualquer parte dele em outro projeto, fale com a equipe.
