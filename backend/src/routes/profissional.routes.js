 const { Router } = require('express')
const { body } = require('express-validator')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { prisma } = require('../prisma/client')
const { meusHorarios, salvarMeusHorarios } = require('../controllers/horarios.controller')
const {
  DIAS_SEMANA, LIMITES, MENSAGEM_DURACAO, MENSAGEM_INTERVALO,
  duracaoValida, intervaloValido, errosDasFaixas
} = require('../utils/agenda')

const router = Router()

// ── "Meus horários" do profissional logado ───────────────────
// Vêm antes de "/:id"; senão "me" seria lido como o id de um profissional.

// Aceita 50 ou "50"; recusa 50.5, "", "1e2", "0x32", lista e objeto. Só depois de conferir vira número (toInt).
// Texto só vale com algarismos: assim a conferência (Number) e a conversão (toInt) leem o mesmo número.
// Sem isso, "0x32" passava na conferência como 50 e era gravado como 0.
const SO_ALGARISMOS = /^\d+$/
const numero = regra => valor =>
  (typeof valor === 'number' || (typeof valor === 'string' && SO_ALGARISMOS.test(valor))) && regra(Number(valor))

const regrasDosHorarios = [
  body('duracaoMin').custom(numero(duracaoValida)).withMessage(MENSAGEM_DURACAO).bail().toInt(),
  body('intervaloMin').custom(numero(intervaloValido)).withMessage(MENSAGEM_INTERVALO).bail().toInt(),
  // As faixas: uma lista e, juntas, as regras da tela (utils/agenda.js): dia da semana, formato HH:MM,
  // fim depois do início, tamanho de pelo menos uma consulta, até 4 por dia e sem sobreposição no dia
  body('faixas')
    .isArray({ max: DIAS_SEMANA.length * LIMITES.faixasPorDia })
    .withMessage(`Envie a lista de faixas de atendimento, com até ${LIMITES.faixasPorDia} por dia.`)
    .bail()
    .custom((faixas, { req }) => {
      const [primeiro] = errosDasFaixas(faixas, req.body.duracaoMin)
      if (primeiro) throw new Error(primeiro)
      return true
    })
]

router.get('/me/horarios', authMiddleware, requireRole('PROFISSIONAL'), meusHorarios)
router.put('/me/horarios', authMiddleware, requireRole('PROFISSIONAL'), regrasDosHorarios, validate, salvarMeusHorarios)

router.get('/', async (req, res, next) => {
  try {
    const profissionais = await prisma.profissional.findMany({
      where: { ativo: true },
      include: { usuario: { select: { nome: true, email: true } } }
    })
    res.json({ profissionais })
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const profissional = await prisma.profissional.findUnique({
      where: { id: req.params.id },
      include: { usuario: { select: { nome: true, email: true } }, disponibilidades: true }
    })
    if (!profissional) return res.status(404).json({ error: 'Profissional não encontrado.' })
    res.json({ profissional })
  } catch (err) { next(err) }
})

module.exports = router
