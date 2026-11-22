// backend/src/controllers/horarios.controller.js
// "Meus horários": o profissional lê e salva a própria agenda (faixas por dia, duração e intervalo).
// Sempre sobre o cadastro de quem está logado: o profissional vem do token, nunca do que o site manda.

const { prisma } = require('../prisma/client')
const { DIAS_SEMANA } = require('../utils/agenda')

// Faixas em ordem de dia da semana (domingo = 0) e de horário
function emOrdem(faixas) {
  return [...faixas].sort((a, b) =>
    DIAS_SEMANA.indexOf(a.diaSemana) - DIAS_SEMANA.indexOf(b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio))
}

// ── GET /api/profissionais/me/horarios ───────────────────────
async function meusHorarios(req, res, next) {
  try {
    const profissional = await prisma.profissional.findUnique({
      where: { usuarioId: req.user.id },
      select: {
        duracaoPadrao: true,
        intervaloMin: true,
        disponibilidades: { where: { ativo: true }, select: { diaSemana: true, horaInicio: true, horaFim: true } }
      }
    })
    if (!profissional) return res.status(404).json({ error: 'Cadastro de profissional não encontrado.' })

    res.json({
      duracaoMin: profissional.duracaoPadrao,
      intervaloMin: profissional.intervaloMin,
      faixas: emOrdem(profissional.disponibilidades)
    })
  } catch (err) {
    next(err)
  }
}

// ── PUT /api/profissionais/me/horarios ───────────────────────
// Corpo já conferido pelas regras da rota (express-validator + utils/agenda.js).
async function salvarMeusHorarios(req, res, next) {
  try {
    const profissional = await prisma.profissional.findUnique({
      where: { usuarioId: req.user.id },
      select: { id: true }
    })
    if (!profissional) return res.status(404).json({ error: 'Cadastro de profissional não encontrado.' })

    const { duracaoMin, intervaloMin } = req.body
    // Só os campos esperados de cada faixa: o resto do que vier do site é ignorado
    const faixas = emOrdem(req.body.faixas.map(f => ({
      diaSemana: f.diaSemana, horaInicio: f.horaInicio, horaFim: f.horaFim
    })))

    // Tudo ou nada: a configuração nova inteira entra junta, ou nada muda
    const operacoes = [
      prisma.profissional.update({
        where: { id: profissional.id },
        data: { duracaoPadrao: duracaoMin, intervaloMin }
      }),
      prisma.disponibilidade.deleteMany({ where: { profissionalId: profissional.id } })
    ]
    if (faixas.length > 0) { // sem faixas (não atende em dia nenhum), não há o que inserir
      operacoes.push(prisma.disponibilidade.createMany({
        data: faixas.map(f => ({ ...f, profissionalId: profissional.id }))
      }))
    }
    await prisma.$transaction(operacoes)

    res.json({ duracaoMin, intervaloMin, faixas })
  } catch (err) {
    next(err)
  }
}

module.exports = { meusHorarios, salvarMeusHorarios }
