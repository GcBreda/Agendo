// backend/test/agenda.test.js
// Testes de unidade das regras da agenda (src/utils/agenda.js), sem banco.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const {
  gerarHorarios, sobrepoe, horariosDoDia, conferirNovaConsulta, errosDaConfiguracao, paraMinutos
} = require('../src/utils/agenda')

const manha = { diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '12:00' }
const tarde = { diaSemana: 'SEGUNDA', horaInicio: '14:00', horaFim: '18:00' }

describe('gerarHorarios', () => {
  test('sem intervalo: igual ao cálculo antigo (consultas coladas)', () => {
    assert.deepEqual(gerarHorarios([manha], 50), ['08:00', '08:50', '09:40', '10:30'])
  })

  test('com intervalo: 50 min de consulta + 10 de intervalo', () => {
    assert.deepEqual(gerarHorarios([manha], 50, 10), ['08:00', '09:00', '10:00', '11:00'])
  })

  test('duas faixas no dia (pausa para o almoço), em ordem mesmo se vierem trocadas', () => {
    assert.deepEqual(gerarHorarios([tarde, manha], 50, 10),
      ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])
  })

  test('só entra a consulta que termina dentro da faixa', () => {
    assert.deepEqual(gerarHorarios([{ horaInicio: '08:00', horaFim: '08:49' }], 50), [])
    assert.deepEqual(gerarHorarios([{ horaInicio: '08:00', horaFim: '08:50' }], 50), ['08:00'])
  })

  test('consultas curtas (15 min, como na clínica médica)', () => {
    assert.deepEqual(gerarHorarios([{ horaInicio: '07:00', horaFim: '08:00' }], 15), ['07:00', '07:15', '07:30', '07:45'])
  })

  test('faixas repetidas não duplicam horários', () => {
    assert.deepEqual(gerarHorarios([manha, manha], 60), ['08:00', '09:00', '10:00', '11:00'])
  })

  test('sem faixas, sem horários', () => {
    assert.deepEqual(gerarHorarios([], 50), [])
  })

  test('duração 0 ou intervalo negativo não travam: o dia fica sem horários', () => {
    assert.deepEqual(gerarHorarios([manha], 0, 0), [])
    assert.deepEqual(gerarHorarios([manha], 50, -50), [])
    assert.deepEqual(gerarHorarios([manha], undefined), [])
  })
})

describe('sobrepoe', () => {
  const m = paraMinutos
  test('encostar não é sobrepor', () => {
    assert.equal(sobrepoe(m('08:00'), 50, m('08:50'), 50), false)
    assert.equal(sobrepoe(m('08:50'), 50, m('08:00'), 50), false)
  })
  test('começar no meio de outra é sobrepor', () => {
    assert.equal(sobrepoe(m('08:30'), 50, m('08:00'), 50), true)
    assert.equal(sobrepoe(m('08:00'), 50, m('08:49'), 50), true)
  })
  test('uma dentro da outra é sobrepor', () => {
    assert.equal(sobrepoe(m('09:00'), 15, m('08:30'), 90), true)
  })
})

describe('horariosDoDia', () => {
  test('ocupado é o que encosta em consulta marcada, mesmo vinda de uma grade antiga', () => {
    // 09:00 já marcada; 14:50 foi marcada quando as consultas eram coladas (grade antiga)
    const ocupadas = [{ inicio: '09:00', duracaoMin: 50 }, { inicio: '14:50', duracaoMin: 50 }]
    const horarios = horariosDoDia({ faixas: [manha, tarde], duracaoMin: 50, intervaloMin: 10, ocupadas })
    const livres = horarios.filter(h => h.disponivel).map(h => h.hora)
    assert.deepEqual(livres, ['08:00', '10:00', '11:00', '14:00', '16:00', '17:00'])
  })
})

describe('conferirNovaConsulta', () => {
  const agenda = { faixas: [manha, tarde], duracaoMin: 50, intervaloMin: 10, ocupadas: [{ inicio: '14:50', duracaoMin: 50 }] }
  test('horário da grade e livre pode', () => {
    assert.equal(conferirNovaConsulta({ hora: '10:00', ...agenda }), null)
  })
  test('fora da grade não pode', () => {
    assert.equal(conferirNovaConsulta({ hora: '10:30', ...agenda }), 'FORA_DA_AGENDA') // entre dois horários
    assert.equal(conferirNovaConsulta({ hora: '12:00', ...agenda }), 'FORA_DA_AGENDA') // no almoço
    assert.equal(conferirNovaConsulta({ hora: '03:00', ...agenda }), 'FORA_DA_AGENDA') // de madrugada
  })
  test('por cima de outra consulta não pode', () => {
    assert.equal(conferirNovaConsulta({ hora: '15:00', ...agenda }), 'OCUPADO')
  })
  test('dia sem faixas não tem horário nenhum', () => {
    assert.equal(conferirNovaConsulta({ hora: '10:00', ...agenda, faixas: [] }), 'FORA_DA_AGENDA')
  })
})

describe('errosDaConfiguracao', () => {
  const valida = { duracaoMin: 50, intervaloMin: 10, faixas: [manha, tarde, { diaSemana: 'SEXTA', horaInicio: '08:00', horaFim: '14:00' }] }

  test('configuração certa não tem erro', () => {
    assert.deepEqual(errosDaConfiguracao(valida), [])
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: [] }), []) // pode não atender em dia nenhum
  })

  test('duração e intervalo: limites e de 5 em 5 minutos', () => {
    assert.equal(errosDaConfiguracao({ ...valida, duracaoMin: 5 }).length, 1)
    assert.equal(errosDaConfiguracao({ ...valida, duracaoMin: 52 }).length, 1)
    assert.equal(errosDaConfiguracao({ ...valida, duracaoMin: '50' }).length, 1)
    assert.equal(errosDaConfiguracao({ ...valida, intervaloMin: 7 }).length, 1)
    assert.equal(errosDaConfiguracao({ ...valida, intervaloMin: 125 }).length, 1)
    assert.deepEqual(errosDaConfiguracao({ ...valida, intervaloMin: 0 }), [])
  })

  test('faixa que termina antes de começar', () => {
    const erros = errosDaConfiguracao({ ...valida, faixas: [{ diaSemana: 'TERCA', horaInicio: '12:00', horaFim: '08:00' }] })
    assert.deepEqual(erros, ['Terça: a faixa 12:00–08:00 termina antes de começar.'])
  })

  test('faixa menor que uma consulta', () => {
    const erros = errosDaConfiguracao({ ...valida, faixas: [{ diaSemana: 'TERCA', horaInicio: '08:00', horaFim: '08:30' }] })
    assert.deepEqual(erros, ['Terça: a faixa 08:00–08:30 é menor que uma consulta de 50 min.'])
  })

  test('faixas do mesmo dia que se sobrepõem', () => {
    const erros = errosDaConfiguracao({ ...valida, faixas: [manha, { diaSemana: 'SEGUNDA', horaInicio: '11:00', horaFim: '15:00' }] })
    assert.deepEqual(erros, ['Segunda: as faixas 08:00–12:00 e 11:00–15:00 se sobrepõem.'])
  })

  test('a mesma faixa em dias diferentes não conflita', () => {
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: [manha, { ...manha, diaSemana: 'TERCA' }] }), [])
  })

  test('formato de hora, dia inválido, lista ausente e limite de faixas por dia', () => {
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: [{ diaSemana: 'SEGUNDA', horaInicio: '8:00', horaFim: '12:00' }] }),
      ['Segunda: use horários no formato HH:MM.'])
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: [{ diaSemana: 'SEGUNDA', horaInicio: ['08:00'], horaFim: '12:00' }] }),
      ['Segunda: use horários no formato HH:MM.']) // lista não é hora, mesmo com "08:00" dentro
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: [null] }), ['Dia da semana inválido.'])
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: [{ diaSemana: 'FERIADO', horaInicio: '08:00', horaFim: '12:00' }] }),
      ['Dia da semana inválido.'])
    assert.deepEqual(errosDaConfiguracao({ ...valida, faixas: undefined }), ['Envie a lista de faixas de atendimento.'])
    const cinco = ['07:00', '09:00', '11:00', '13:00', '15:00'].map((h, i) =>
      ({ diaSemana: 'QUARTA', horaInicio: h, horaFim: ['08:00', '10:00', '12:00', '14:00', '16:00'][i] }))
    assert.deepEqual(errosDaConfiguracao({ ...valida, duracaoMin: 60, faixas: cinco }), ['Quarta: no máximo 4 faixas por dia.'])
  })
})
