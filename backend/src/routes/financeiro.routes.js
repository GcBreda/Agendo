// backend/src/routes/financeiro.routes.js
// Financeiro do profissional logado. O profissional vem do token, nunca do que o site manda.

const { Router } = require('express')
const { query } = require('express-validator')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { resumo } = require('../controllers/financeiro.controller')

const router = Router()

router.use(authMiddleware, requireRole('PROFISSIONAL'))

// Só texto com 4 algarismos, de 2000 a 2100. Recusa "?ano=2026&ano=2027" (vira lista) e "?ano[contains]=20" (vira objeto).
const anoValido = valor => typeof valor === 'string' && /^\d{4}$/.test(valor) && Number(valor) >= 2000 && Number(valor) <= 2100

router.get('/resumo',
  [query('ano').custom(anoValido).withMessage('Informe o ano com 4 algarismos, de 2000 a 2100.')],
  validate,
  resumo
)

module.exports = router
