// backend/src/controllers/agendamento.controller.js
const { prisma }  = require('../prisma/client')
const { agendarNotificacoes } = require('../jobs/notificacao.job')
const { instanteBrasilia, diaDaSemana, limitesDoDia, horaBrasilia, dataBrasilia } = require('../utils/fuso')
const { DIAS_SEMANA, horariosDoDia, conferirNovaConsulta } = require('../utils/agenda')

// Consultas que ocupam horário na agenda
const STATUS_QUE_OCUPAM = ['PENDENTE', 'CONFIRMADO']

// Faixas de atendimento do profissional num dia 'AAAA-MM-DD' e as consultas já marcadas nele
// (cada uma com a própria duração, para conferir sobreposição).
async function agendaDoDia(profissional, data) {
  const diaSemana = DIAS_SEMANA[diaDaSemana(data)]
  const faixas = profissional.disponibilidades.filter(d => d.diaSemana === diaSemana && d.ativo)
  const marcadas = await prisma.agendamento.findMany({
    where: {
      profissionalId: profissional.id,
      dataHora: limitesDoDia(data),
      status: { in: STATUS_QUE_OCUPAM }
    },
    select: { dataHora: true, duracaoMin: true }
  })
  return {
    faixas,
    duracaoMin: profissional.duracaoPadrao,
    intervaloMin: profissional.intervaloMin ?? 0,
    ocupadas: marcadas.map(a => ({ inicio: horaBrasilia(a.dataHora), duracaoMin: a.duracaoMin }))
  }
}

// ── GET /api/agendamentos/disponiveis ────────────────────────
// Query: profissionalId, data (YYYY-MM-DD)
async function horariosDisponiveis(req, res, next) {
  try {
    const { profissionalId, data } = req.query
    if (!profissionalId || !data) {
      return res.status(400).json({ error: 'profissionalId e data são obrigatórios.' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ error: 'data deve estar no formato AAAA-MM-DD.' })
    }

    const profissional = await prisma.profissional.findUnique({
      where: { id: profissionalId },
      include: { disponibilidades: true }
    })
    if (!profissional) return res.status(404).json({ error: 'Profissional não encontrado.' })
    if (!profissional.ativo) return res.json({ horarios: [] })

    // Todas as faixas do dia, com a duração e o intervalo escolhidos pelo profissional
    // (utils/agenda.js); ocupado = encosta em alguma consulta já marcada.
    res.json({ horarios: horariosDoDia(await agendaDoDia(profissional, data)) })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/agendamentos ───────────────────────────────────
async function criar(req, res, next) {
  try {
    const { profissionalId, dataHora, tipoSessao, observacoes, pagamentoId } = req.body
    const pacienteId = req.user.id // vem do JWT — nunca do body

    // Busca o paciente pelo usuário autenticado
    const paciente = await prisma.paciente.findUnique({
      where: { usuarioId: pacienteId }
    })
    if (!paciente) return res.status(403).json({ error: 'Apenas pacientes podem agendar.' })

    // O site manda o horário escolhido em Brasília, sem fuso
    const instante = instanteBrasilia(dataHora)
    if (Number.isNaN(instante.getTime())) {
      return res.status(400).json({ error: 'Data e horário inválidos.' })
    }
    if (instante <= new Date()) {
      return res.status(400).json({ error: 'Não é possível agendar em data ou horário passado.' })
    }

    const profissional = await prisma.profissional.findUnique({
      where: { id: profissionalId },
      include: { disponibilidades: true }
    })
    if (!profissional || !profissional.ativo) {
      return res.status(404).json({ error: 'Profissional não encontrado.' })
    }

    // O servidor confere o horário de novo: o que vem do site não é confiável.
    // Precisa ser um horário da grade do profissional (minuto cheio) e não pode encostar em outra consulta.
    // Falta ainda uma trava no próprio banco para dois pedidos no mesmo instante (outra migration, a aprovar).
    const data = dataBrasilia(instante)
    const minutoCheio = instante.getUTCSeconds() === 0 && instante.getUTCMilliseconds() === 0
    const motivo = minutoCheio
      ? conferirNovaConsulta({ hora: horaBrasilia(instante), ...(await agendaDoDia(profissional, data)) })
      : 'FORA_DA_AGENDA'
    if (motivo === 'FORA_DA_AGENDA') {
      return res.status(400).json({ error: 'Esse horário não está na agenda do profissional.' })
    }
    if (motivo === 'OCUPADO') return res.status(409).json({ error: 'Horário já ocupado.' })

    const agendamento = await prisma.agendamento.create({
      data: {
        pacienteId:    paciente.id,
        profissionalId,
        pagamentoId:   pagamentoId || null,
        dataHora:      instante,
        duracaoMin:    profissional.duracaoPadrao,
        valor:         profissional.valorSessao, // fica gravado: mudar o preço depois não muda esta consulta
        tipoSessao:    tipoSessao.toUpperCase(),
        observacoes,
        status:        pagamentoId ? 'CONFIRMADO' : 'PENDENTE'
      },
      include: {
        profissional: { include: { usuario: { select: { nome: true } } } },
        paciente:     { include: { usuario: { select: { nome: true } } } }
      }
    })

    // Dispara jobs de lembrete assíncronos
    await agendarNotificacoes(agendamento)

    res.status(201).json({ agendamento })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/agendamentos ────────────────────────────────────
async function listar(req, res, next) {
  try {
    const usuario = req.user

    // Monta o filtro baseado no perfil — nunca confia em ID da query
    let where = {}
    if (usuario.perfil === 'PACIENTE') {
      const paciente = await prisma.paciente.findUnique({ where: { usuarioId: usuario.id } })
      where = { pacienteId: paciente.id }
    } else {
      const profissional = await prisma.profissional.findUnique({ where: { usuarioId: usuario.id } })
      where = { profissionalId: profissional.id }
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        profissional: { include: { usuario: { select: { nome: true, email: true } } } },
        paciente:     { include: { usuario: { select: { nome: true } } } },
        pagamento:    { select: { valor: true, status: true, metodo: true } }
      },
      orderBy: { dataHora: 'desc' }
    })

    res.json({ agendamentos })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/agendamentos/:id/cancelar ─────────────────────
async function cancelar(req, res, next) {
  try {
    const { id } = req.params
    const usuario = req.user

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: { paciente: true, profissional: true }
    })
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado.' })

    // Só o próprio paciente ou profissional podem cancelar
    const autorizado =
      agendamento.paciente.usuarioId     === usuario.id ||
      agendamento.profissional.usuarioId === usuario.id

    if (!autorizado) return res.status(403).json({ error: 'Sem permissão para cancelar.' })

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data:  { status: 'CANCELADO' }
    })

    res.json({ agendamento: atualizado })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/agendamentos/:id/realizar ─────────────────────
async function realizar(req, res, next) {
  try {
    const { id } = req.params
    const usuario = req.user

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: { profissional: true }
    })
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado.' })

    // Só o profissional da consulta pode marcá-la como realizada
    if (agendamento.profissional.usuarioId !== usuario.id) {
      return res.status(403).json({ error: 'Sem permissão para alterar esta consulta.' })
    }
    if (!['PENDENTE', 'CONFIRMADO'].includes(agendamento.status)) {
      return res.status(400).json({ error: 'Apenas consultas pendentes ou confirmadas podem ser marcadas como realizadas.' })
    }
    if (agendamento.dataHora > new Date()) {
      return res.status(400).json({ error: 'A consulta ainda não aconteceu.' })
    }

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data:  { status: 'REALIZADO' }
    })

    res.json({ agendamento: atualizado })
  } catch (err) {
    next(err)
  }
}

module.exports = { horariosDisponiveis, criar, listar, cancelar, realizar }
