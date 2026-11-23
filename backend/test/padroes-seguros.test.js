// backend/test/padroes-seguros.test.js
// Teste-guarda: procura no código padrões que já causaram falha de segurança neste projeto.
// Roda junto com o "npm test" e no CI, então o erro é barrado antes de juntar o código.
//
// "?." dentro de um filtro do Prisma (where). Se o registro não existir, o valor vira undefined,
// o Prisma IGNORA o filtro e a consulta pega todas as linhas; num deleteMany, apagaria todas.
// Foi o caso de GET /api/pagamentos, que devolvia os pagamentos de todos os pacientes.
// O certo: buscar o registro, responder 403/404 se ele não existir e só então filtrar (regra no CLAUDE.md).

const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const PASTA_SRC = path.join(__dirname, '../src')

function arquivosJs(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap(item => {
    const caminho = path.join(pasta, item.name)
    if (item.isDirectory()) return item.name === 'node_modules' ? [] : arquivosJs(caminho)
    return item.name.endsWith('.js') ? [caminho] : []
  })
}

// Cada bloco "where: { ... }" (com as chaves de dentro) e a linha em que ele começa
function blocosWhere(codigo) {
  const blocos = []
  const inicio = /\bwhere\s*:\s*\{/g
  let achado
  while ((achado = inicio.exec(codigo))) {
    let i = achado.index + achado[0].length
    for (let nivel = 1; i < codigo.length && nivel > 0; i++) {
      if (codigo[i] === '{') nivel++
      else if (codigo[i] === '}') nivel--
    }
    blocos.push({ texto: codigo.slice(achado.index, i), linha: codigo.slice(0, achado.index).split('\n').length })
  }
  return blocos
}

const usaInterrogacaoPonto = texto => texto.includes('?.')

test('o próprio teste-guarda reconhece o padrão perigoso (em uma ou em várias linhas)', () => {
  const umaLinha = blocosWhere('prisma.pagamento.findMany({ where: { pacienteId: paciente?.id } })')
  const variasLinhas = blocosWhere('prisma.x.deleteMany({\n  where: {\n    dono: { id: usuario?.id }\n  }\n})')
  const seguro = blocosWhere('prisma.pagamento.findMany({ where: { pacienteId: paciente.id } })')
  assert.equal(usaInterrogacaoPonto(umaLinha[0].texto), true)
  assert.equal(usaInterrogacaoPonto(variasLinhas[0].texto), true)
  assert.equal(usaInterrogacaoPonto(seguro[0].texto), false)
})

test('nenhum filtro do Prisma (where) usa "?." em backend/src', () => {
  const problemas = []
  for (const arquivo of arquivosJs(PASTA_SRC)) {
    const codigo = fs.readFileSync(arquivo, 'utf8')
    for (const { texto, linha } of blocosWhere(codigo)) {
      if (usaInterrogacaoPonto(texto)) {
        problemas.push(`${path.relative(path.join(__dirname, '..'), arquivo)}:${linha}  ${texto.replace(/\s+/g, ' ').slice(0, 90)}`)
      }
    }
  }
  assert.deepEqual(problemas, [],
    'Filtro com "?." pode virar undefined e o Prisma ignora o filtro. Busque o registro, responda 403/404 se ' +
    'ele não existir e só então filtre (regra em CLAUDE.md, "Regras de segurança no código").')
})
