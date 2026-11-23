// backend/test/financeiro.test.js
// GET /api/financeiro/resumo: totais por mês do profissional logado, no calendário de Brasília,
// com o valor gravado em cada consulta e sem nenhum dado de paciente.
//
// Roda sem PostgreSQL: usa o banco falso em memória (helpers/banco-falso.js). Dados fictícios.

process.env.JWT_SECRET ||= 'segredo-ficticio-so-para-teste'

const { criarBancoFalso } = require('./helpers/banco-falso')
const { instanteBrasilia } = require('../src/utils/fuso')

let n = 0
const consulta = (profissionalId, quando, status, valor) =>
  ({ id: `a${++n}`, pacienteId: 'pac-1', profissionalId, dataHora: instanteBrasilia(quando), duracaoMin: 50, status, valor })

const banco = criarBancoFalso({
  usuarios: [
    { id: 'u-pro', perfil: 'PROFISSIONAL', nome: 'Dra. Ana Teste', email: 'ana@financeiro.test' },
    { id: 'u-pro2', perfil: 'PROFISSIONAL', nome: 'Dr. Outro Teste', email: 'outro@financeiro.test' },
    { id: 'u-pro-sem', perfil: 'PROFISSIONAL', nome: 'Sem cadastro', email: 'sem@financeiro.test' },
    { id: 'u-pac', perfil: 'PACIENTE', nome: 'Paciente Sigilosa', email: 'pac@financeiro.test' }
  ],
  pacientes: [{ id: 'pac-1', usuarioId: 'u-pac' }],
  profissionais: [
    // preço atual 200; as consultas de janeiro foram marcadas quando era 180
    { id: 'p1', usuarioId: 'u-pro', crp: '06/000001', valorSessao: 200, ativo: true },
    { id: 'p2', usuarioId: 'u-pro2', crp: '06/000002', valorSessao: 500, ativo: true }
  ],
  agendamentos: [
    consulta('p1', '2026-01-15T10:00', 'REALIZADO', 180),
    consulta('p1', '2026-01-20T10:00', 'REALIZADO', 180),
    consulta('p1', '2026-01-22T10:00', 'CANCELADO', 180),
    consulta('p1', '2026-03-31T22:30', 'REALIZADO', 200), // em UTC já é 1º de abril: conta em março
    consulta('p1', '2026-12-31T23:00', 'REALIZADO', 200), // em UTC já é 2027: conta em dezembro de 2026
    consulta('p1', '2025-12-10T10:00', 'REALIZADO', 150), // dezembro anterior, para comparar janeiro
    consulta('p1', '2025-11-10T10:00', 'REALIZADO', 150), // fora do período
    consulta('p1', '2027-01-01T00:30', 'REALIZADO', 200), // fora do período
    consulta('p1', '2026-05-05T10:00', 'PENDENTE', 200), // ainda não aconteceu: não conta
    consulta('p1', '2026-05-06T10:00', 'CONFIRMADO', 200), // idem
    consulta('p2', '2026-01-15T10:00', 'REALIZADO', 500) // de outro profissional: não conta
  ]
})
globalThis.prisma = banco // src/prisma/client.js usa este banco no lugar do PostgreSQL

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const { subirApp, encerrarConexoes } = require('./helpers/ambiente')

describe('GET /api/financeiro/resumo', () => {
  let servidor
  const pedir = (consultaUrl, quem) => fetch(`${servidor.url}/api/financeiro/resumo?${consultaUrl}`, {
    headers: quem ? { Authorization: `Bearer ${jwt.sign({ id: quem }, process.env.JWT_SECRET)}` } : {}
  })

  before(async () => { servidor = await subirApp(app) })
  after(async () => {
    await servidor.fechar()
    await encerrarConexoes()
  })

  test('sem login: 401; paciente: 403; profissional sem cadastro: 404', async () => {
    assert.equal((await pedir('ano=2026')).status, 401)
    assert.equal((await pedir('ano=2026', 'u-pac')).status, 403)
    assert.equal((await pedir('ano=2026', 'u-pro-sem')).status, 404)
  })

  test('ano inválido: 422 (inclusive lista e objeto na URL)', async () => {
    for (const q of ['', 'ano=abc', 'ano=20261', 'ano=1999', 'ano=2026&ano=2027', 'ano[contains]=20']) {
      const res = await pedir(q, 'u-pro')
      assert.equal(res.status, 422, q)
      assert.equal((await res.json()).errors[0].msg, 'Informe o ano com 4 algarismos, de 2000 a 2100.')
    }
  })

  test('totais por mês no calendário de Brasília, com o valor gravado em cada consulta', async () => {
    const res = await pedir('ano=2026', 'u-pro')
    assert.equal(res.status, 200)
    const corpo = await res.json()
    assert.equal(corpo.ano, 2026)
    assert.deepEqual(corpo.profissional, { nome: 'Dra. Ana Teste', crp: '06/000001', valorSessao: 200 })

    const porMes = Object.fromEntries(corpo.meses.filter(m => m.realizadas || m.canceladas).map(m => [m.mes, m]))
    assert.deepEqual(porMes, {
      1: { mes: 1, realizadas: 2, canceladas: 1, valor: 360 }, // 2 × 180, mesmo com o preço atual em 200
      3: { mes: 3, realizadas: 1, canceladas: 0, valor: 200 },
      12: { mes: 12, realizadas: 1, canceladas: 0, valor: 200 }
    })
    assert.equal(corpo.meses.length, 12)
    assert.deepEqual(corpo.total, { realizadas: 4, canceladas: 1, valor: 760 })
    assert.deepEqual(corpo.dezembroAnterior, { realizadas: 1, canceladas: 0, valor: 150 })
  })

  test('cada profissional vê só o próprio resumo, sem nenhum dado de paciente', async () => {
    const outro = await (await pedir('ano=2026', 'u-pro2')).json()
    assert.deepEqual(outro.total, { realizadas: 1, canceladas: 0, valor: 500 })
    const texto = JSON.stringify(await (await pedir('ano=2026', 'u-pro')).json())
    for (const dadoDePaciente of ['Paciente Sigilosa', 'pac-1', 'pacienteId', 'u-pac']) {
      assert.equal(texto.includes(dadoDePaciente), false, dadoDePaciente)
    }
  })

  test('ano sem consultas: tudo zerado', async () => {
    const corpo = await (await pedir('ano=2030', 'u-pro')).json()
    assert.deepEqual(corpo.total, { realizadas: 0, canceladas: 0, valor: 0 })
    assert.ok(corpo.meses.every(m => m.realizadas === 0 && m.canceladas === 0 && m.valor === 0))
  })
})
