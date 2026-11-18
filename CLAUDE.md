# CLAUDE.md — Agendô

Sistema de agendamento e prontuário digital para clínicas de psicologia. Projeto de estudantes de ADS (UNISO, Projeto Integrador). Prontuário é **dado de saúde, logo dado pessoal sensível**: segurança e sigilo vêm antes de velocidade e de funcionalidade.

## Contexto e modo de uso
- Uso atual: testes **locais** com psicólogos e um professor da UNISO. A decisão entre rodar local ou online ainda está em aberto. Por isso: desenvolver e testar tudo localmente, e tratar deploy como último passo opcional.
- Todos os dados são **fictícios** (seed e testes). Nunca usar, colar ou gerar dados reais de pacientes.
- **O repositório (GcBreda/Agend-) é PÚBLICO.** Tudo que for commitado fica visível para qualquer pessoa.

## Ambiente de desenvolvimento
- Windows + PowerShell + VS Code. O PowerShell não aceita `&&`: use comandos em linhas separadas ou `;`. Caminhos usam `\`.
- PostgreSQL 18 e Memurai (Redis) instalados como serviços do Windows.
- Redis: `backend/src/jobs/notificacao.job.js` usa `REDIS_URL` se existir; se estiver vazia, cai em `localhost:6379`. No modo local, deixar `REDIS_URL` vazia.
- Comandos (confirmar os nomes dos scripts em cada `package.json`): backend `npm run dev` (nodemon); frontend `npm run dev` e `npm run build`.
- Git: `main` dispara deploy. **Nunca trabalhar na `main`.** Uma branch por tarefa, a partir da branch da sprint. Commits pequenos (`feat:`, `fix:`, `chore:`). **Não fazer `git push` sem eu pedir.**

## Estrutura (resumo)
- `backend/src/`: `controllers/` (agendamento, auth, prontuario), `routes/` (agendamento, auth, paciente, pagamento, profissional, prontuario), `middleware/` (auth, error, validate), `jobs/notificacao.job.js` (BullMQ), `prisma/` (`schema.prisma`, `client.js`, `seed.js`, `migrations/`), `server.js`.
- `frontend/src/`: `pages/` (auth, paciente, profissional), `components/layout/DashboardLayout.jsx`, `context/AuthContext.jsx`, `hooks/`, `services/api.js` (usa `VITE_API_URL`), `App.jsx`.
- Dependências do backend já instaladas: Prisma 5, bcryptjs, jsonwebtoken, bullmq, ioredis, express-rate-limit, **express-validator**, nodemailer, stripe.
- Validação de entrada: usar o **express-validator** que já existe (`validate.middleware.js`). Não adicionar Zod sem eu aprovar.

## Segredos e arquivos `.env` (regra mais importante)
- **Nunca ler, abrir, exibir, copiar ou editar arquivos `.env`.** Só o `.env.example`, que contém valores fictícios. Nunca commitar segredos.
- Os `.env` saíram do versionamento no commit `654b6fd` e estão no `.gitignore`. O histórico do Git ainda contém os `.env` antigos e uma chave de API exposta: tratar como vazado e **rotacionar**, apagar não basta.
- Segredos novos (JWT, `PRONTUARIO_KEY`) são gerados com `crypto.randomBytes` e ficam só no `.env` local.
- Serviços de e-mail (SendGrid), pagamento (Stripe) e SMS (Twilio) têm só valores de exemplo: tratar como **simulados**.

## Regras inegociáveis (LGPD e CFP)

Se uma tarefa pedida conflitar com qualquer regra abaixo, **pare, avise e proponha alternativa**. Não implemente em silêncio.

### Prontuário
1. O conteúdo clínico é sempre armazenado **cifrado** (AES-256-GCM, IV aleatório por registro, auth tag guardada). A chave vem da variável de ambiente `PRONTUARIO_KEY`, nunca do código, do banco ou do Git.
2. Dados cadastrais (nome, contato) e conteúdo clínico ficam em **tabelas separadas**.
3. Prontuário **nunca é sobrescrito**: toda edição cria uma nova versão ligada ao histórico.
4. **Toda leitura, criação e edição** grava em `LogAcessoProntuario` (quem, quando, ação, IP). Essa tabela só aceita inserção: sem update e sem delete.
5. Só lê o prontuário o **profissional vinculado àquele paciente**, e só com **consentimento válido** (não revogado). A verificação é no backend, em toda rota, nunca só no frontend.
6. O paciente nunca acessa por ID o prontuário de outro paciente. Tratar IDs vindos do cliente como não confiáveis.
7. Anotações pessoais do psicólogo ficam em campo separado, não exibido ao paciente.

### LGPD (Lei 13.709/2018)
- Art. 5º, II: dado de saúde é sensível. Art. 6º: finalidade, necessidade e segurança. Coletar só o necessário.
- Art. 7º e 11: base legal do tratamento. O sistema registra o consentimento (versão do termo, data, IP, revogação) e a base legal usada.
- Art. 18: o titular pode acessar, corrigir, exportar e pedir eliminação dos dados.
- Art. 16: a eliminação pode ser negada quando há obrigação legal de guarda (ver retenção).
- Art. 37: manter registro das operações de tratamento (é o papel do log de acesso).
- Art. 46: medidas técnicas de segurança. Art. 48: incidente de segurança precisa ser comunicado; manter um plano simples de resposta.
- Logs da aplicação **nunca** contêm conteúdo de prontuário, senha, token ou documento de paciente.

### CFP
- Código de Ética Profissional do Psicólogo (Res. CFP 010/2005): sigilo é dever. O sistema existe para proteger esse sigilo.
- Res. CFP 001/2009 (registro documental) e Res. CFP 006/2019 (documentos psicológicos): guarda mínima de **5 anos**.
- Lei 13.787/2018 (prontuário eletrônico): referência de **20 anos** a partir do último registro.
- **Retenção:** valor configurável (`RETENCAO_PRONTUARIO_ANOS`), sem exclusão física antes do prazo. Até validação com o CRP ou orientação jurídica, adotar o **maior** prazo (20 anos).
- **Pendente de confirmação pelo grupo:** versão vigente do Código de Ética e prazo final de retenção, nos sites do CFP e do CRP. Este projeto não substitui parecer jurídico. Em dúvida legal, sinalize em vez de decidir.

## Regras de segurança no código
- Tokens em cookies `httpOnly` + `Secure` + `SameSite`; não guardar token em `localStorage`.
- Prisma sempre com parâmetros; nada de SQL montado com string.
- Senha com bcrypt. OTP de recuperação validado no backend, com expiração e limite de tentativas.
- Rotas sensíveis com autenticação, autorização por perfil e checagem de vínculo profissional↔paciente.
- Mensagens de erro ao cliente genéricas; detalhes só no log do servidor.

## Pendências conhecidas
- **Feito:** feed de notícias removido (commit `38649fc`), `.env` fora do Git.
- **Fora do código, a cargo do grupo:** revogar a chave do GNews que está no histórico; trocar os segredos de JWT e Redis usados em produção.
- Configurações ("salvo!" sem salvar), recuperação de senha, 2FA, lembretes, e-mail e pagamento ainda são simulados: não tratar como funcionando.
- Valor de sessão hardcoded (R$180): deve vir do banco.
- Sem testes automatizados ainda.

## Como trabalhar comigo (estilo de colaboração)
Quem usa este projeto é **estudante de 2º semestre de ADS** e quer **aprender**, não só receber código.

- Responda sempre em **português**, em linguagem simples. Se usar um termo técnico, explique em uma frase na primeira vez.
- Em tarefas que mexem em autenticação, banco ou prontuário: **primeiro um plano** (arquivos afetados, riscos, alternativas) e só implemente depois da minha aprovação.
- Faça **uma tarefa pequena por vez**. Evite mudanças grandes e misturadas.
- Depois de escrever código, explique **o que cada parte faz e por quê**, citando os arquivos alterados.
- Quando eu pedir, ensine: faça perguntas para testar meu entendimento antes de dar a resposta, ou me guie com dicas em vez de apontar o erro direto.
- Aponte riscos de segurança ou de LGPD que eu não tenha percebido, mesmo que eu não tenha perguntado.
- Se não souber ou não tiver certeza (lei, norma, comportamento de biblioteca), diga isso em vez de supor. Não invente funções, pacotes ou números de lei: verifique no código ou na documentação.

## Definição de "pronto"
1. O código roda, os **testes passam** e há teste novo cobrindo a mudança.
2. Rotas de prontuário têm teste de autorização: profissional A não acessa paciente do profissional B, e paciente sem consentimento não é lido.
3. Nenhum segredo ou dado real foi para o Git ou para os logs.
4. As mudanças foram explicadas e o commit é pequeno, com mensagem clara.
5. Mudanças em autenticação ou prontuário foram revisadas por outro integrante (sugestão: o QA).

## Fora de escopo por enquanto
Alta disponibilidade e redundância, certificações (ISO 27001), múltiplas unidades da clínica, TypeScript, e-mail real, pagamento real, 2FA e migração para Supabase. Não sugerir, a menos que eu pergunte.
