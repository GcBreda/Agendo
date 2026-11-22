// backend/test/helpers/datas.js
// Datas dos testes da agenda, sempre no futuro e no calendário de Brasília.

const { instanteBrasilia, dataBrasilia, diaDaSemana } = require('../../src/utils/fuso')

// Próximo dia da semana pedido (0 = domingo, 1 = segunda…), 'AAAA-MM-DD', com pelo menos 2 dias de folga:
// uma consulta só pode ser marcada no futuro.
function proximo(diaAlvo) {
  const meioDiaDeHoje = instanteBrasilia(`${dataBrasilia(new Date())}T12:00`)
  for (let i = 2; i < 10; i++) {
    const data = dataBrasilia(new Date(meioDiaDeHoje.getTime() + i * 864e5))
    if (diaDaSemana(data) === diaAlvo) return data
  }
}

module.exports = { proximo }
