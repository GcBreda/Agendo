// backend/test/agendamento-horarios.test.js
// Horários livres e agendamento seguindo a agenda do profissional: várias faixas no dia,
// duração, intervalo e sobreposição. O servidor confere tudo, sem confiar no que o site manda.
//
// Roda sem PostgreSQL: usa o banco falso em memória (helpers/banco-falso.js). Dados fictícios.

process.env.JWT_SECRET ||= 'segredo-ficticio-so-para-teste'

const { randomUUID } = require('node:crypto')
const { criarBancoFalso } = require('./helpers/banco-falso')
const { proximo } = require('./helpers/datas')
const { instanteBrasilia } = require('../src/utils/fuso')

const segunda = proximo(1)
const domingo = proximo(0)

const profissionalId = randomUUID()
const banco = criarBancoFalso({
  usuarios: [
    { id: 'u-pac', perfil: 'PACIENTE', nome: 'Paciente Teste', email: 'paciente@agenda.test' },
    { id: 'u-pro', perfil: 'PROFISSIONAL', nome: 'Profissional Teste', email: 'profissional@agenda.test' }
  ],
  pacientes: [{ id: 'pac-1', usuarioId: 'u-pac' }],
  profissionais: [{ id: profissionalId, usuarioId: 'u-pro', duracaoPadrao: 50, intervaloMin: 10, ativo: true }],
  disponibilidades: [
    { id: 'd1', profissionalId, diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '12:00', ativo: true },
    { id: 'd2', profissionalId, diaSemana: 'SEGUNDA', horaInicio: '14:00', horaFim: '18:00', ativo: true }
  ],
  agendamentos: [
    { id: 'a1', pacienteId: 'pac-1', profissionalId, dataHora: instanteBrasilia(`${segunda}T09:00`), duracaoMin: 50, status: 'PENDENTE' },
    // marcada quando as consultas eram coladas (grade antiga): ocupa 14:50–15:40
    { id: 'a2', pacienteId: 'pac-1', profissionalId, dataHora: instanteBrasilia(`${segunda}T14:50`), duracaoMin: 50, status: 'CONFIRMADO' },
    // cancelada não ocupa horário
    { id: 'a3', pacienteId: 'pac-1', profissionalId, dataHora: instanteBrasilia(`${segunda}T16:00`), duracaoMin: 50, status: 'CANCELADO' }
  ]
})
globalThis.prisma = banco // src/prisma/client.js usa este banco no lugar do PostgreSQL

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const { subirApp, encerrarConexoes } = require('./helpers/ambiente')

const tokenPaciente = jwt.sign({ id: 'u-pac' }, process.env.JWT_SECRET)

describe('agenda do profissional nos horários livres e no agendamento', () => {
  let servidor
  const pedir = (caminho, opcoes = {}) => fetch(`${servidor.url}/api${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${tokenPaciente}`, 'Content-Type': 'application/json', ...opcoes.headers }
  })
  const livres = async data => {
    const res = await pedir(`/agendamentos/disponiveis?profissionalId=${profissionalId}&data=${data}`)
    assert.equal(res.status, 200)
    return (await res.json()).horarios
  }
  const agendar = hora => pedir('/agendamentos', {
    method: 'POST',
    body: JSON.stringify({ profissionalId, dataHora: `${segunda}T${hora}`, tipoSessao: 'ACOMPANHAMENTO' })
  })

  before(async () => { servidor = await subirApp(app) })
  after(async () => {
    await servidor.fechar()
    await encerrarConexoes()
  })

  test('usa as duas faixas, a duração e o intervalo; ocupado é o que encosta em consulta marcada', async () => {
    const horarios = await livres(segunda)
    assert.deepEqual(horarios.map(h => h.hora), ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])
    assert.deepEqual(horarios.filter(h => !h.disponivel).map(h => h.hora), ['09:00', '15:00'])
  })

  test('dia sem faixa de atendimento não tem horário', async () => {
    assert.deepEqual(await livres(domingo), [])
  })

  test('agenda num horário livre da grade e grava a duração do profissional', async () => {
    const res = await agendar('10:00:00')
    assert.equal(res.status, 201)
    const { agendamento } = await res.json()
    assert.equal(agendamento.duracaoMin, 50)
    assert.equal((await livres(segunda)).find(h => h.hora === '10:00').disponivel, false)
  })

  test('recusa horário fora da grade: entre dois horários, no almoço, de madrugada ou com segundos', async () => {
    for (const hora of ['10:30:00', '12:00:00', '03:00:00', '11:00:30']) {
      const res = await agendar(hora)
      assert.equal(res.status, 400, hora)
      assert.deepEqual(await res.json(), { error: 'Esse horário não está na agenda do profissional.' })
    }
  })

  test('recusa horário por cima de outra consulta, mesmo sem começar no mesmo minuto', async () => {
    assert.equal((await agendar('09:00:00')).status, 409)
    assert.equal((await agendar('15:00:00')).status, 409) // a das 14:50 vai até 15:40
  })

  test('consulta cancelada não ocupa: 16:00 continua livre', async () => {
    assert.equal((await agendar('16:00:00')).status, 201)
  })

  test('profissional que não existe ou está inativo', async () => {
    const res = await pedir('/agendamentos', {
      method: 'POST',
      body: JSON.stringify({ profissionalId: randomUUID(), dataHora: `${segunda}T10:00:00`, tipoSessao: 'ACOMPANHAMENTO' })
    })
    assert.equal(res.status, 404)
    banco._dados.profissionais[0].ativo = false
    assert.deepEqual(await livres(segunda), [])
    assert.equal((await agendar('11:00:00')).status, 404)
    banco._dados.profissionais[0].ativo = true
  })
})
