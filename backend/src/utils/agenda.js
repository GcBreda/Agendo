// backend/src/utils/agenda.js
// Regras da agenda do profissional, sem banco: geram os horários do dia e conferem uma consulta nova.
// Usadas pela rota de horários livres, pelo agendamento e pela rota "Meus horários".
// A tela "Meus horários" tem uma cópia de gerarHorarios e das mensagens (frontend/src/utils/agenda.js):
// mudou uma regra aqui, mude lá também.
//
// Horários em "HH:MM" (Brasília); as contas são feitas em minutos desde 00:00.
// Uma faixa é um período de atendimento num dia da semana: { diaSemana, horaInicio, horaFim }.

const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']
const NOME_DO_DIA = {
  DOMINGO: 'Domingo', SEGUNDA: 'Segunda', TERCA: 'Terça', QUARTA: 'Quarta',
  QUINTA: 'Quinta', SEXTA: 'Sexta', SABADO: 'Sábado'
}
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

const LIMITES = {
  duracao:   { min: 10, max: 240 }, // minutos de cada consulta
  intervalo: { min: 0, max: 120 },  // minutos livres entre uma consulta e a próxima
  passo: 5,                         // duração e intervalo andam de 5 em 5 minutos
  faixasPorDia: 4
}

function paraMinutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function paraHora(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

// Horários de início do dia. Em cada faixa, uma consulta atrás da outra, com o intervalo entre elas;
// só entra a consulta que termina dentro da faixa. Ex.: 08:00–12:00, 50 min + 10 min → 08:00, 09:00, 10:00, 11:00.
function gerarHorarios(faixas, duracaoMin, intervaloMin = 0) {
  const inicios = new Set()
  for (const faixa of faixas) {
    const fim = paraMinutos(faixa.horaFim)
    for (let t = paraMinutos(faixa.horaInicio); t + duracaoMin <= fim; t += duracaoMin + intervaloMin) {
      inicios.add(t)
    }
  }
  return [...inicios].sort((a, b) => a - b).map(paraHora)
}

// Duas consultas se sobrepõem quando uma começa antes de a outra terminar.
// Encostar não conta: uma termina às 08:50 e a outra começa às 08:50.
function sobrepoe(inicioA, duracaoA, inicioB, duracaoB) {
  return inicioA < inicioB + duracaoB && inicioB < inicioA + duracaoA
}

// ocupadas: consultas já marcadas no dia, [{ inicio: 'HH:MM', duracaoMin }].
// Um horário fica ocupado se encostar em qualquer parte de uma delas, e não só se começar no mesmo minuto
// (importa quando o profissional muda a duração e a grade nova não bate com as consultas antigas).
function estaOcupado(hora, duracaoMin, ocupadas) {
  const inicio = paraMinutos(hora)
  return ocupadas.some(o => sobrepoe(inicio, duracaoMin, paraMinutos(o.inicio), o.duracaoMin))
}

// Horários do dia para o paciente escolher, cada um com "disponivel".
function horariosDoDia({ faixas, duracaoMin, intervaloMin = 0, ocupadas = [] }) {
  return gerarHorarios(faixas, duracaoMin, intervaloMin).map(hora => ({
    hora,
    disponivel: !estaOcupado(hora, duracaoMin, ocupadas)
  }))
}

// Confere uma consulta nova. Devolve null se pode marcar, ou o motivo:
// 'FORA_DA_AGENDA' (não é um horário da grade do dia) ou 'OCUPADO' (sobrepõe outra consulta).
function conferirNovaConsulta({ hora, faixas, duracaoMin, intervaloMin = 0, ocupadas = [] }) {
  if (!gerarHorarios(faixas, duracaoMin, intervaloMin).includes(hora)) return 'FORA_DA_AGENDA'
  if (estaOcupado(hora, duracaoMin, ocupadas)) return 'OCUPADO'
  return null
}

function noPasso(valor, { min, max }) {
  return Number.isInteger(valor) && valor >= min && valor <= max && valor % LIMITES.passo === 0
}

// Erros de uma configuração de "Meus horários", em mensagens para a pessoa ler. Lista vazia = pode salvar.
function errosDaConfiguracao({ duracaoMin, intervaloMin, faixas }) {
  const erros = []
  const duracaoOk = noPasso(duracaoMin, LIMITES.duracao)
  if (!duracaoOk) {
    erros.push(`A duração da consulta deve ser de ${LIMITES.duracao.min} a ${LIMITES.duracao.max} minutos, de 5 em 5.`)
  }
  if (!noPasso(intervaloMin, LIMITES.intervalo)) {
    erros.push(`O intervalo entre consultas deve ser de ${LIMITES.intervalo.min} a ${LIMITES.intervalo.max} minutos, de 5 em 5.`)
  }
  if (!Array.isArray(faixas)) {
    erros.push('Envie a lista de faixas de atendimento.')
    return erros
  }

  const validasPorDia = {}
  for (const faixa of faixas) {
    const { diaSemana, horaInicio, horaFim } = faixa || {}
    if (!DIAS_SEMANA.includes(diaSemana)) {
      erros.push('Dia da semana inválido.')
      continue
    }
    const dia = NOME_DO_DIA[diaSemana]
    if (!HORA_VALIDA.test(horaInicio) || !HORA_VALIDA.test(horaFim)) {
      erros.push(`${dia}: use horários no formato HH:MM.`)
      continue
    }
    const inicio = paraMinutos(horaInicio)
    const fim = paraMinutos(horaFim)
    if (fim <= inicio) {
      erros.push(`${dia}: a faixa ${horaInicio}–${horaFim} termina antes de começar.`)
      continue
    }
    if (duracaoOk && fim - inicio < duracaoMin) {
      erros.push(`${dia}: a faixa ${horaInicio}–${horaFim} é menor que uma consulta de ${duracaoMin} min.`)
    }
    if (!validasPorDia[diaSemana]) validasPorDia[diaSemana] = []
    validasPorDia[diaSemana].push({ inicio, fim, texto: `${horaInicio}–${horaFim}` })
  }

  for (const diaSemana of DIAS_SEMANA) {
    const doDia = (validasPorDia[diaSemana] || []).sort((a, b) => a.inicio - b.inicio)
    const dia = NOME_DO_DIA[diaSemana]
    if (doDia.length > LIMITES.faixasPorDia) {
      erros.push(`${dia}: no máximo ${LIMITES.faixasPorDia} faixas por dia.`)
    }
    for (let i = 1; i < doDia.length; i++) {
      if (doDia[i].inicio < doDia[i - 1].fim) {
        erros.push(`${dia}: as faixas ${doDia[i - 1].texto} e ${doDia[i].texto} se sobrepõem.`)
      }
    }
  }
  return erros
}

module.exports = {
  DIAS_SEMANA, NOME_DO_DIA, HORA_VALIDA, LIMITES,
  paraMinutos, paraHora, gerarHorarios, sobrepoe, horariosDoDia, conferirNovaConsulta, errosDaConfiguracao
}
