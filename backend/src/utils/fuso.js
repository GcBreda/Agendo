// backend/src/utils/fuso.js
// Horário de Brasília na agenda, sem depender do fuso do servidor.
// O banco guarda instantes (UTC); a tela e as datas que chegam do site estão em Brasília.
// Brasília é UTC−3 o ano todo: o horário de verão acabou em 2019.

const FUSO = 'America/Sao_Paulo'
const DESLOCAMENTO = '-03:00'

// '2026-11-20T13:50' ou '2026-11-20T13:50:00' sem fuso = 13:50 em Brasília.
// Texto que já traz fuso (Z ou ±hh:mm) é respeitado.
function instanteBrasilia(texto) {
  if (typeof texto !== 'string') return new Date(NaN)
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(texto) ? new Date(texto) : new Date(`${texto}${DESLOCAMENTO}`)
}

// Dia da semana (0 = domingo) de uma data 'AAAA-MM-DD', pelo calendário.
function diaDaSemana(data) {
  const [ano, mes, dia] = String(data).split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

// Início e fim do dia 'AAAA-MM-DD' em Brasília, para filtrar consultas no banco.
function limitesDoDia(data) {
  return { gte: new Date(`${data}T00:00:00.000${DESLOCAMENTO}`), lte: new Date(`${data}T23:59:59.999${DESLOCAMENTO}`) }
}

// 'HH:MM' de um instante, em Brasília.
function horaBrasilia(instante) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instante)
}

// 'AAAA-MM-DD' de um instante, em Brasília (o formato en-CA já sai nessa ordem).
function dataBrasilia(instante) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante)
}

module.exports = { FUSO, instanteBrasilia, diaDaSemana, limitesDoDia, horaBrasilia, dataBrasilia }
