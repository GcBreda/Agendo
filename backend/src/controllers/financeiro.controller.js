// backend/src/controllers/financeiro.controller.js
// Resumo financeiro do profissional logado: totais de cada mês de um ano, no horário de Brasília.
// Só totais: nenhum dado de paciente sai daqui (LGPD, princípio da necessidade).
// A tela do Financeiro e o PDF usam estes mesmos números.

const { prisma } = require('../prisma/client')
const { instanteBrasilia, dataBrasilia } = require('../utils/fuso')

// Realizada conta sessão e valor; cancelada conta só quantas foram. Pendente e confirmada ainda não aconteceram.
const STATUS_DO_RESUMO = ['REALIZADO', 'CANCELADO']

// A soma é feita em centavos (números inteiros) para não acumular erro de arredondamento
const emCentavos = valor => Math.round(Number(valor) * 100)
const zerado = () => ({ realizadas: 0, canceladas: 0, centavos: 0 })
const emReais = ({ realizadas, canceladas, centavos }) => ({ realizadas, canceladas, valor: centavos / 100 })

// ── GET /api/financeiro/resumo?ano=2026 ──────────────────────
async function resumo(req, res, next) {
  try {
    const ano = Number(req.query.ano) // a rota já conferiu: texto de 4 algarismos
    const profissional = await prisma.profissional.findUnique({
      where: { usuarioId: req.user.id },
      select: { id: true, crp: true, valorSessao: true, usuario: { select: { nome: true } } }
    })
    if (!profissional) return res.status(404).json({ error: 'Cadastro de profissional não encontrado.' })

    // De 1º de dezembro do ano anterior (para comparar janeiro) até o último instante do ano, em Brasília
    const consultas = await prisma.agendamento.findMany({
      where: {
        profissionalId: profissional.id,
        status: { in: STATUS_DO_RESUMO },
        dataHora: { gte: instanteBrasilia(`${ano - 1}-12-01T00:00`), lt: instanteBrasilia(`${ano + 1}-01-01T00:00`) }
      },
      select: { dataHora: true, status: true, valor: true }
    })

    const meses = Array.from({ length: 12 }, zerado)
    const dezembroAnterior = zerado()
    for (const consulta of consultas) {
      // O mês é o do calendário de Brasília: 31/03 às 22h30 em Brasília já é 01/04 em UTC, mas conta em março
      const [anoDaConsulta, mes] = dataBrasilia(consulta.dataHora).split('-').map(Number)
      const alvo = anoDaConsulta === ano ? meses[mes - 1] : dezembroAnterior
      if (consulta.status === 'REALIZADO') {
        alvo.realizadas += 1
        alvo.centavos += emCentavos(consulta.valor)
      } else {
        alvo.canceladas += 1
      }
    }
    const total = meses.reduce((soma, m) => ({
      realizadas: soma.realizadas + m.realizadas,
      canceladas: soma.canceladas + m.canceladas,
      centavos: soma.centavos + m.centavos
    }), zerado())

    res.json({
      ano,
      profissional: { nome: profissional.usuario.nome, crp: profissional.crp, valorSessao: Number(profissional.valorSessao) },
      meses: meses.map((m, i) => ({ mes: i + 1, ...emReais(m) })),
      total: emReais(total),
      dezembroAnterior: emReais(dezembroAnterior)
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { resumo }
