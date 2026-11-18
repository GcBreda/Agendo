// backend/scripts/gerar-chave-prontuario.js
// Gera a PRONTUARIO_KEY (32 bytes aleatórios em base64) e grava no .env local SEM exibi-la.
//
// Uso (dentro de backend):  node scripts\gerar-chave-prontuario.js
// Opcional: caminho de outro arquivo .env como argumento.
//
// Se o arquivo já tiver uma PRONTUARIO_KEY preenchida, nada é alterado:
// trocar a chave tornaria ilegíveis os prontuários já cifrados.

const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')

const arquivo = process.argv[2] || path.join(__dirname, '..', '.env')
const nome    = path.basename(arquivo)

const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : ''

if (/^\s*PRONTUARIO_KEY\s*=\s*["']?[^"'\s]+/m.test(atual)) {
  console.log(`Já existe uma PRONTUARIO_KEY em ${nome}; nada foi alterado.`)
  process.exit(0)
}

const chave = crypto.randomBytes(32).toString('base64')
const linha = `PRONTUARIO_KEY="${chave}"`
const vazia = /^\s*PRONTUARIO_KEY\s*=\s*(""|'')?\s*$/m

if (vazia.test(atual)) {
  // Linha vazia copiada do .env.example: preenche no lugar, sem duplicar
  fs.writeFileSync(arquivo, atual.replace(vazia, linha), 'utf8')
} else {
  const prefixo = atual.length > 0 && !atual.endsWith('\n') ? '\n' : ''
  fs.appendFileSync(arquivo, `${prefixo}${linha}\n`, 'utf8')
}

console.log(`Chave criada em ${nome} (valor não exibido).`)
console.log('Guarde uma cópia num gerenciador de senhas: sem ela, os prontuários cifrados não podem ser lidos.')
