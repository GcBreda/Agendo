// frontend/src/utils/agenda.js
// Regras da agenda para a tela "Meus horários": mostram os horários e os erros enquanto a pessoa edita.
// É uma cópia das regras do servidor (backend/src/utils/agenda.js). Quem decide é sempre o servidor,
// que confere tudo de novo ao salvar; esta cópia só evita surpresa. Mudou uma regra lá, mude aqui também.
//
// Horários em "HH:MM" (Brasília); as contas são feitas em minutos desde 00:00.

export const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']
export const NOME_DO_DIA = {
  DOMINGO: 'Domingo', SEGUNDA: 'Segunda', TERCA: 'Terça', QUARTA: 'Quarta',
  QUINTA: 'Quinta', SEXTA: 'Sexta', SABADO: 'Sábado'
}
export const LIMITES = { faixasPorDia: 4 }

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

export function paraMinutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export function paraHora(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

// Horários de início do dia: em cada faixa, uma consulta atrás da outra, com o intervalo entre elas;
// só entra a consulta que termina dentro da faixa. Igual ao servidor.
export function gerarHorarios(faixas, duracaoMin, intervaloMin = 0) {
  if (!(duracaoMin > 0) || !(intervaloMin >= 0)) return []
  const inicios = new Set()
  for (const faixa of faixas) {
    const fim = paraMinutos(faixa.horaFim)
    for (let t = paraMinutos(faixa.horaInicio); t + duracaoMin <= fim; t += duracaoMin + intervaloMin) {
      inicios.add(t)
    }
  }
  return [...inicios].sort((a, b) => a - b).map(paraHora)
}

// Erros das faixas de um dia. Cada erro traz as posições das faixas envolvidas, para a tela marcar os campos.
// Os textos são os do servidor sem o nome do dia na frente; com ele, ficam iguais aos do servidor.
// Só "preencha" é daqui: campo de hora vazio, que o servidor recusaria como formato errado.
export function errosDoDia(faixas, duracaoMin) {
  const erros = []
  const validas = []
  faixas.forEach(({ horaInicio, horaFim }, i) => {
    if (!horaInicio || !horaFim) {
      erros.push({ texto: 'preencha o início e o fim da faixa.', faixas: [i] })
      return
    }
    if (!HORA_VALIDA.test(horaInicio) || !HORA_VALIDA.test(horaFim)) {
      erros.push({ texto: 'use horários no formato HH:MM.', faixas: [i] })
      return
    }
    const inicio = paraMinutos(horaInicio)
    const fim = paraMinutos(horaFim)
    const texto = `${horaInicio}–${horaFim}`
    if (fim <= inicio) {
      erros.push({ texto: `a faixa ${texto} termina antes de começar.`, faixas: [i] })
      return
    }
    if (fim - inicio < duracaoMin) {
      erros.push({ texto: `a faixa ${texto} é menor que uma consulta de ${duracaoMin} min.`, faixas: [i] })
    }
    validas.push({ inicio, fim, texto, i })
  })

  if (validas.length > LIMITES.faixasPorDia) {
    erros.push({ texto: `no máximo ${LIMITES.faixasPorDia} faixas por dia.`, faixas: [] })
  }
  validas.sort((a, b) => a.inicio - b.inicio)
  for (let k = 1; k < validas.length; k++) {
    if (validas[k].inicio < validas[k - 1].fim) {
      erros.push({
        texto: `as faixas ${validas[k - 1].texto} e ${validas[k].texto} se sobrepõem.`,
        faixas: [validas[k - 1].i, validas[k].i]
      })
    }
  }
  return erros
}
