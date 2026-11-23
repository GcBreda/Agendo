// backend/src/app.js
// Monta o Express (middlewares e rotas) sem abrir porta.
// O server.js chama app.listen; os testes sobem o app numa porta livre.

const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const authRoutes         = require('./routes/auth.routes')
const agendamentoRoutes  = require('./routes/agendamento.routes')
const prontuarioRoutes   = require('./routes/prontuario.routes')
const pagamentoRoutes    = require('./routes/pagamento.routes')
const profissionalRoutes = require('./routes/profissional.routes')
const pacienteRoutes     = require('./routes/paciente.routes')
const financeiroRoutes   = require('./routes/financeiro.routes')
const { errorHandler }   = require('./middleware/error.middleware')

const app = express()

// Atrás de um proxy (Render, Vercel e afins), o IP de quem acessa vem no X-Forwarded-For.
// Sem isso, todos os acessos parecem vir do mesmo IP e dividem o mesmo limite de requisições.
app.set('trust proxy', 1)

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      process.env.RENDER_EXTERNAL_URL, // o próprio endereço, quando a API também serve o site
      'http://localhost:5173',
      'https://agendo-psi.vercel.app'
    ]
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

// Se o build do frontend existir (demonstração online), a própria API serve o site:
// um só endereço, sem CORS entre site e API. Os arquivos estáticos não contam no limite.
const distFrontend = path.join(__dirname, '../../frontend/dist')
const servirFrontend = fs.existsSync(path.join(distFrontend, 'index.html'))
if (servirFrontend) app.use(express.static(distFrontend))

// Limite geral por IP nas rotas da API.
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
}))

// Limite próprio do login, mais apertado, que conta só as tentativas que falham.
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
}))

app.use('/api/auth',         authRoutes)
app.use('/api/agendamentos', agendamentoRoutes)
app.use('/api/prontuarios',  prontuarioRoutes)
app.use('/api/pagamentos',   pagamentoRoutes)
app.use('/api/profissionais',profissionalRoutes)
app.use('/api/pacientes',    pacienteRoutes)
app.use('/api/financeiro',   financeiroRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Qualquer outra rota fora de /api abre o site, que cuida da própria navegação.
if (servirFrontend) {
  app.get(/^\/(?!api(\/|$)).*/, (req, res) => res.sendFile(path.join(distFrontend, 'index.html')))
}

app.use(errorHandler)

module.exports = app
