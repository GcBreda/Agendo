// backend/test/fuso.test.js
// Testes de unidade do horário de Brasília na agenda (sem banco).
// Os resultados não podem depender do fuso do servidor: rode também com TZ=UTC e TZ=America/Sao_Paulo.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { instanteBrasilia, diaDaSemana, limitesDoDia, horaBrasilia } = require('../src/utils/fuso')

describe('horário de Brasília na agenda', () => {
  test('horário sem fuso vindo do site é lido como Brasília', () => {
    assert.equal(instanteBrasilia('2026-11-20T13:50:00').toISOString(), '2026-11-20T16:50:00.000Z')
    assert.equal(instanteBrasilia('2026-11-20T13:50').toISOString(), '2026-11-20T16:50:00.000Z')
  })

  test('horário que já traz fuso é respeitado', () => {
    assert.equal(instanteBrasilia('2026-11-20T16:50:00Z').toISOString(), '2026-11-20T16:50:00.000Z')
    assert.equal(instanteBrasilia('2026-11-20T13:50:00-03:00').toISOString(), '2026-11-20T16:50:00.000Z')
  })

  test('texto inválido vira data inválida, sem erro', () => {
    assert.ok(Number.isNaN(instanteBrasilia('amanhã').getTime()))
    assert.ok(Number.isNaN(instanteBrasilia(undefined).getTime()))
  })

  test('dia da semana sai do calendário, não do fuso do servidor', () => {
    assert.equal(diaDaSemana('2026-11-23'), 1) // segunda-feira
    assert.equal(diaDaSemana('2026-11-20'), 5) // sexta-feira
    assert.equal(diaDaSemana('2026-11-22'), 0) // domingo
  })

  test('limites do dia cobrem o dia inteiro em Brasília', () => {
    const { gte, lte } = limitesDoDia('2026-11-20')
    assert.equal(gte.toISOString(), '2026-11-20T03:00:00.000Z')
    assert.equal(lte.toISOString(), '2026-11-21T02:59:59.999Z')
  })

  test('hora mostrada em Brasília bate com o horário escolhido', () => {
    assert.equal(horaBrasilia(instanteBrasilia('2026-11-20T13:50')), '13:50')
    assert.equal(horaBrasilia(new Date('2026-11-21T02:30:00Z')), '23:30')
    assert.equal(horaBrasilia(new Date('2026-11-20T03:05:00Z')), '00:05')
  })
})
