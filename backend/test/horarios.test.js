// backend/test/horarios.test.js
// "Meus horários": só o profissional logado lê e muda a própria agenda, e só configurações válidas entram.
//
// Roda sem PostgreSQL: usa o banco falso em memória (helpers/banco-falso.js). Dados fictícios.

process.env.JWT_SECRET ||= 'segredo-ficticio-so-para-teste'

const { randomUUID } = require('node:crypto')
const { criarBancoFalso } = require('./helpers/banco-falso')
const { proximo } = require('./helpers/datas')

const pro1 = randomUUID()
const pro2 = randomUUID()
const banco = criarBancoFalso({
  usuarios: [
    { id: 'u-pro', perfil: 'PROFISSIONAL', nome: 'Profissional Um', email: 'um@horarios.test' },
    { id: 'u-pro2', perfil: 'PROFISSIONAL', nome: 'Profissional Dois', email: 'dois@horarios.test' },
    { id: 'u-pac', perfil: 'PACIENTE', nome: 'Paciente Teste', email: 'paciente@horarios.test' }
  ],
  pacientes: [{ id: 'pac-1', usuarioId: 'u-pac' }],
  profissionais: [
    { id: pro1, usuarioId: 'u-pro', duracaoPadrao: 50, intervaloMin: 0, ativo: true },
    { id: pro2, usuarioId: 'u-pro2', duracaoPadrao: 50, intervaloMin: 0, ativo: true }
  ],
  disponibilidades: [
    { id: 'd1', profissionalId: pro1, diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '17:00', ativo: true },
    { id: 'd2', profissionalId: pro1, diaSemana: 'TERCA', horaInicio: '08:00', horaFim: '12:00', ativo: false },
    { id: 'd3', profissionalId: pro2, diaSemana: 'TERCA', horaInicio: '09:00', horaFim: '12:00', ativo: true }
  ]
})
globalThis.prisma = banco // src/prisma/client.js usa este banco no lugar do PostgreSQL

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const { subirApp, encerrarConexoes } = require('./helpers/ambiente')

const token = id => jwt.sign({ id }, process.env.JWT_SECRET)
const segunda = proximo(1)
const manha = { diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '12:00' }
const tarde = { diaSemana: 'SEGUNDA', horaInicio: '14:00', horaFim: '18:00' }
const sexta = { diaSemana: 'SEXTA', horaInicio: '08:00', horaFim: '14:00' }

describe('Meus horários', () => {
  let servidor
  const pedir = (caminho, { quem, metodo = 'GET', corpo } = {}) => fetch(`${servidor.url}/api${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(quem ? { Authorization: `Bearer ${token(quem)}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  })
  const salvar = (corpo, quem = 'u-pro') => pedir('/profissionais/me/horarios', { quem, metodo: 'PUT', corpo })
  const faixasNoBanco = id => banco._dados.disponibilidades.filter(d => d.profissionalId === id)
    .map(({ diaSemana, horaInicio, horaFim }) => `${diaSemana} ${horaInicio}–${horaFim}`).sort()

  before(async () => { servidor = await subirApp(app) })
  after(async () => {
    await servidor.fechar()
    await encerrarConexoes()
  })

  test('sem login: 401; paciente: 403', async () => {
    assert.equal((await pedir('/profissionais/me/horarios')).status, 401)
    assert.equal((await pedir('/profissionais/me/horarios', { quem: 'u-pac' })).status, 403)
    assert.equal((await salvar({ duracaoMin: 50, intervaloMin: 0, faixas: [] }, 'u-pac')).status, 403)
  })

  test('o profissional lê a própria agenda (só as faixas ativas)', async () => {
    const res = await pedir('/profissionais/me/horarios', { quem: 'u-pro' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), {
      duracaoMin: 50, intervaloMin: 0,
      faixas: [{ diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '17:00' }]
    })
  })

  test('salva faixas, duração e intervalo, e os horários do paciente mudam junto', async () => {
    const res = await salvar({ duracaoMin: 50, intervaloMin: 10, faixas: [sexta, tarde, manha] })
    assert.equal(res.status, 200)
    assert.deepEqual((await res.json()).faixas, [manha, tarde, sexta]) // em ordem de dia e de horário
    assert.equal(banco._dados.profissionais[0].intervaloMin, 10)
    assert.deepEqual(faixasNoBanco(pro1), ['SEGUNDA 08:00–12:00', 'SEGUNDA 14:00–18:00', 'SEXTA 08:00–14:00'])

    const livres = await pedir(`/agendamentos/disponiveis?profissionalId=${pro1}&data=${segunda}`, { quem: 'u-pac' })
    assert.deepEqual((await livres.json()).horarios.map(h => h.hora),
      ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])
  })

  test('mexe só no próprio cadastro, mesmo que o site mande outro id ou outros campos', async () => {
    const res = await salvar({
      profissionalId: pro2, duracaoMin: 60, intervaloMin: 0,
      faixas: [{ ...manha, profissionalId: pro2, ativo: false, id: 'd3' }]
    })
    assert.equal(res.status, 200)
    assert.deepEqual(faixasNoBanco(pro1), ['SEGUNDA 08:00–12:00'])
    assert.ok(banco._dados.disponibilidades.filter(d => d.profissionalId === pro1).every(d => d.ativo === true))
    assert.deepEqual(faixasNoBanco(pro2), ['TERCA 09:00–12:00']) // o outro profissional não mudou
    assert.equal(banco._dados.profissionais[1].duracaoPadrao, 50)
  })

  test('aceita números em texto e pode não atender em dia nenhum', async () => {
    const res = await salvar({ duracaoMin: '45', intervaloMin: '15', faixas: [] })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { duracaoMin: 45, intervaloMin: 15, faixas: [] })
    const livres = await pedir(`/agendamentos/disponiveis?profissionalId=${pro1}&data=${segunda}`, { quem: 'u-pac' })
    assert.deepEqual((await livres.json()).horarios, [])
  })

  test('recusa configuração inválida com a mensagem da regra, sem mudar nada', async () => {
    await salvar({ duracaoMin: 50, intervaloMin: 10, faixas: [manha] })
    const casos = [
      [{ duracaoMin: 52, intervaloMin: 0, faixas: [manha] }, 'A duração da consulta deve ser de 10 a 240 minutos, de 5 em 5.'],
      [{ duracaoMin: 50.5, intervaloMin: 0, faixas: [manha] }, 'A duração da consulta deve ser de 10 a 240 minutos, de 5 em 5.'],
      [{ duracaoMin: [50], intervaloMin: 0, faixas: [manha] }, 'A duração da consulta deve ser de 10 a 240 minutos, de 5 em 5.'],
      // textos que viram outro número na conversão: "0x32" seria gravado como 0, e "1e2" como 1
      [{ duracaoMin: '0x32', intervaloMin: 0, faixas: [manha] }, 'A duração da consulta deve ser de 10 a 240 minutos, de 5 em 5.'],
      [{ duracaoMin: '1e2', intervaloMin: 0, faixas: [manha] }, 'A duração da consulta deve ser de 10 a 240 minutos, de 5 em 5.'],
      [{ duracaoMin: 50, intervaloMin: 7, faixas: [manha] }, 'O intervalo entre consultas deve ser de 0 a 120 minutos, de 5 em 5.'],
      [{ duracaoMin: 50, intervaloMin: '', faixas: [manha] }, 'O intervalo entre consultas deve ser de 0 a 120 minutos, de 5 em 5.'],
      [{ duracaoMin: 50, faixas: [manha] }, 'O intervalo entre consultas deve ser de 0 a 120 minutos, de 5 em 5.'],
      [{ duracaoMin: 50, intervaloMin: 0, faixas: [{ ...manha, horaInicio: ['08:00'] }] }, 'Segunda: use horários no formato HH:MM.'],
      [{ duracaoMin: 50, intervaloMin: 0, faixas: 'segunda' }, 'Envie a lista de faixas de atendimento, com até 4 por dia.'],
      [{ duracaoMin: 50, intervaloMin: 0, faixas: [manha, { ...manha, horaInicio: '11:00', horaFim: '15:00' }] },
        'Segunda: as faixas 08:00–12:00 e 11:00–15:00 se sobrepõem.'],
      [{ duracaoMin: 50, intervaloMin: 0, faixas: [{ ...manha, horaInicio: '12:00', horaFim: '08:00' }] },
        'Segunda: a faixa 12:00–08:00 termina antes de começar.'],
      [{ duracaoMin: 50, intervaloMin: 0, faixas: [{ ...manha, horaFim: '8:30' }] }, 'Segunda: use horários no formato HH:MM.']
    ]
    for (const [corpo, mensagem] of casos) {
      const res = await salvar(corpo)
      assert.equal(res.status, 422, JSON.stringify(corpo))
      assert.ok((await res.json()).errors.some(e => e.msg === mensagem), mensagem)
    }
    assert.deepEqual(faixasNoBanco(pro1), ['SEGUNDA 08:00–12:00'])
    assert.equal(banco._dados.profissionais[0].intervaloMin, 10)
  })
})
