// backend/test/gerar-chave.test.js
// Testa o script que gera a PRONTUARIO_KEY usando um arquivo .env TEMPORÁRIO (nunca o .env real).

const { test, describe, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const SCRIPT = path.join(__dirname, '..', 'scripts', 'gerar-chave-prontuario.js')

function rodar(arquivo) {
  return execFileSync(process.execPath, [SCRIPT, arquivo], { encoding: 'utf8' })
}

function lerChave(arquivo) {
  const m = fs.readFileSync(arquivo, 'utf8').match(/^PRONTUARIO_KEY="([^"]+)"$/m)
  return m && m[1]
}

describe('gerar-chave-prontuario.js', () => {
  let pasta, arquivo

  beforeEach(() => {
    pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'agendo-chave-'))
    arquivo = path.join(pasta, '.env')
  })
  afterEach(() => fs.rmSync(pasta, { recursive: true, force: true }))

  test('cria a chave com 32 bytes e não a exibe na saída', () => {
    fs.writeFileSync(arquivo, 'PORT=3001')
    const saida = rodar(arquivo)
    const chave = lerChave(arquivo)

    assert.ok(chave, 'a linha PRONTUARIO_KEY deveria existir')
    assert.equal(Buffer.from(chave, 'base64').length, 32)
    assert.ok(!saida.includes(chave), 'a saída não pode conter a chave')
    assert.match(fs.readFileSync(arquivo, 'utf8'), /^PORT=3001\nPRONTUARIO_KEY=/)
  })

  test('não troca uma chave que já existe', () => {
    fs.writeFileSync(arquivo, 'PRONTUARIO_KEY="chave-existente"\n')
    const saida = rodar(arquivo)
    assert.match(saida, /nada foi alterado/)
    assert.equal(fs.readFileSync(arquivo, 'utf8'), 'PRONTUARIO_KEY="chave-existente"\n')
  })

  test('preenche a linha vazia copiada do .env.example, sem duplicar', () => {
    fs.writeFileSync(arquivo, 'PORT=3001\nPRONTUARIO_KEY=""\nNODE_ENV="development"\n')
    rodar(arquivo)
    const texto = fs.readFileSync(arquivo, 'utf8')
    assert.equal(texto.match(/PRONTUARIO_KEY=/g).length, 1)
    assert.ok(lerChave(arquivo))
    assert.match(texto, /NODE_ENV="development"\n$/)
  })

  test('cria o arquivo se ele não existir', () => {
    rodar(arquivo)
    assert.ok(lerChave(arquivo))
  })
})
