// backend/src/controllers/prontuario.controller.js
//
// TEMPORARIAMENTE DESATIVADO.
// O schema passou a guardar o prontuário cifrado e versionado (prontuarios + prontuario_versoes),
// e o código antigo gravava texto puro em colunas que não existem mais.
// Se ele continuasse ativo, o erro do Prisma repetiria o texto clínico enviado e o errorHandler
// o escreveria no log do servidor.
// A leitura volta na Tarefa 9 e a criação/edição na Tarefa 10, já com cifragem, vínculo,
// consentimento e log de acesso.

function indisponivel(req, res) {
  res.status(503).json({ error: 'Prontuário temporariamente indisponível.' })
}

const listarPorPaciente = indisponivel
const criar             = indisponivel
const atualizar         = indisponivel

module.exports = { listarPorPaciente, criar, atualizar }
