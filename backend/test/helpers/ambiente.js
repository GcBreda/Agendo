// backend/test/helpers/ambiente.js
// Utilitários compartilhados pelos testes.

// Trava de segurança: testes que mexem no banco só rodam num banco cujo nome termina em "_test".
// Evita apagar ou sujar o banco de desenvolvimento por engano.
// A mensagem de erro nunca mostra a URL, porque ela contém a senha do banco.
function exigirBancoDeTeste(url = process.env.DATABASE_URL) {
  let nomeBanco = ''
  try {
    nomeBanco = new URL(url).pathname.slice(1)
  } catch {
    // URL ausente ou inválida: cai na mensagem abaixo
  }
  if (!nomeBanco.endsWith('_test')) {
    throw new Error(
      'DATABASE_URL de teste ausente ou não aponta para um banco "_test". ' +
      'Crie backend\\.env.test com DATABASE_URL do banco agendo_test.'
    )
  }
}

// Sobe o app numa porta livre (porta 0 = o sistema escolhe) e devolve a URL base.
function subirApp(app) {
  return new Promise(resolve => {
    const servidor = app.listen(0, () => {
      const { port } = servidor.address()
      resolve({
        url: `http://127.0.0.1:${port}`,
        fechar: () => new Promise(r => {
          servidor.close(r)
          servidor.closeAllConnections() // derruba conexões keep-alive deixadas pelo fetch
        })
      })
    })
  })
}

// Fecha as conexões abertas ao carregar o app (Redis da fila de lembretes e Prisma),
// para o processo de teste terminar sozinho.
async function encerrarConexoes() {
  const { fecharNotificacoes } = require('../../src/jobs/notificacao.job')
  const { prisma } = require('../../src/prisma/client')
  await fecharNotificacoes()
  await prisma.$disconnect()
}

module.exports = { exigirBancoDeTeste, subirApp, encerrarConexoes }
