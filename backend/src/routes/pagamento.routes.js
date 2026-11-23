// backend/src/routes/pagamento.routes.js
// Pagamentos do paciente logado: só o perfil PACIENTE, e só os próprios pagamentos.

const { Router } = require('express')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const { prisma } = require('../prisma/client')

const router = Router()

router.use(authMiddleware, requireRole('PACIENTE'))

router.get('/', async (req, res, next) => {
  try {
    const paciente = await prisma.paciente.findUnique({ where: { usuarioId: req.user.id }, select: { id: true } })
    // Sem cadastro de paciente, não há o que mostrar. Nunca filtrar com "paciente?.id": se ele não existir,
    // o valor vira undefined, o Prisma ignora o filtro e devolve os pagamentos de todos os pacientes.
    if (!paciente) return res.status(404).json({ error: 'Cadastro de paciente não encontrado.' })

    const pagamentos = await prisma.pagamento.findMany({
      where: { pacienteId: paciente.id },
      orderBy: { criadoEm: 'desc' }
    })
    res.json({ pagamentos })
  } catch (err) { next(err) }
})

module.exports = router
