// backend/test/crypto.test.js
// Testes de unidade da cifragem do prontuário (sem banco).

const { test, describe, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const nodeCrypto = require('crypto')
const {
  carregarChave, aadProntuario, aadAnotacao, cifrar, decifrar
} = require('../src/utils/crypto')

// Conteúdo fictício
const CONTEUDO = {
  anotacoes: 'Paciente relata ansiedade antes de reuniões. Exercício de respiração 4-7-8.',
  cid:       'F41.1',
  lembretes: 'Revisar diário de pensamentos'
}
const ID = '7c1f0b2e-1111-4a4a-9b9b-000000000001'

let chaveOriginal
beforeEach(() => {
  chaveOriginal = process.env.PRONTUARIO_KEY
  process.env.PRONTUARIO_KEY = nodeCrypto.randomBytes(32).toString('base64')
})
afterEach(() => {
  if (chaveOriginal === undefined) delete process.env.PRONTUARIO_KEY
  else process.env.PRONTUARIO_KEY = chaveOriginal
})

describe('cifrar e decifrar', () => {
  test('decifrar(cifrar(x)) devolve x', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.deepEqual(decifrar(bloco, aadProntuario(ID, 1)), CONTEUDO)
  })

  test('o bloco tem IV de 12 bytes, authTag de 16 e chaveId 1', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.equal(bloco.iv.length, 12)
    assert.equal(bloco.authTag.length, 16)
    assert.equal(bloco.chaveId, 1)
  })

  test('cifrar o mesmo texto duas vezes gera IV e resultado diferentes', () => {
    const a = cifrar(CONTEUDO, aadProntuario(ID, 1))
    const b = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.notDeepEqual(a.iv, b.iv)
    assert.notDeepEqual(a.conteudoCifrado, b.conteudoCifrado)
  })

  test('o resultado cifrado não contém o texto original', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    const bruto = bloco.conteudoCifrado.toString('latin1')
    assert.ok(!bruto.includes('ansiedade'))
    assert.ok(!bruto.includes('F41.1'))
  })

  test('aceita Uint8Array (formato do Bytes em versões novas do Prisma)', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    const comoUint8 = {
      conteudoCifrado: new Uint8Array(bloco.conteudoCifrado),
      iv:              new Uint8Array(bloco.iv),
      authTag:         new Uint8Array(bloco.authTag)
    }
    assert.deepEqual(decifrar(comoUint8, aadProntuario(ID, 1)), CONTEUDO)
  })

  test('anotação pessoal usa AAD próprio', () => {
    const bloco = cifrar({ texto: 'Impressão pessoal' }, aadAnotacao(ID))
    assert.deepEqual(decifrar(bloco, aadAnotacao(ID)), { texto: 'Impressão pessoal' })
    assert.throws(() => decifrar(bloco, aadProntuario(ID, 1)), /Falha de integridade/)
  })
})

describe('integridade (o lacre acusa alterações)', () => {
  test('alterar 1 byte do conteúdo faz a decifragem falhar', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    bloco.conteudoCifrado[0] ^= 0x01
    assert.throws(() => decifrar(bloco, aadProntuario(ID, 1)), /Falha de integridade/)
  })

  test('alterar 1 byte do authTag faz a decifragem falhar', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    bloco.authTag[0] ^= 0x01
    assert.throws(() => decifrar(bloco, aadProntuario(ID, 1)), /Falha de integridade/)
  })

  test('alterar o IV faz a decifragem falhar', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    bloco.iv[0] ^= 0x01
    assert.throws(() => decifrar(bloco, aadProntuario(ID, 1)), /Falha de integridade/)
  })

  test('bloco movido para outro prontuário (outro id no AAD) não decifra', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    const outroId = '7c1f0b2e-1111-4a4a-9b9b-000000000002'
    assert.throws(() => decifrar(bloco, aadProntuario(outroId, 1)), /Falha de integridade/)
  })

  test('bloco da versão 1 usado como versão 2 não decifra', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.throws(() => decifrar(bloco, aadProntuario(ID, 2)), /Falha de integridade/)
  })

  test('chave diferente não decifra', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    process.env.PRONTUARIO_KEY = nodeCrypto.randomBytes(32).toString('base64')
    assert.throws(() => decifrar(bloco, aadProntuario(ID, 1)), /Falha de integridade/)
  })

  test('chaveId desconhecido é recusado', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.throws(() => decifrar({ ...bloco, chaveId: 2 }, aadProntuario(ID, 1)), /Chave de cifragem desconhecida/)
  })

  test('a mensagem de erro não contém conteúdo clínico', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.throws(
      () => decifrar(bloco, aadProntuario(ID, 2)),
      err => !err.message.includes('ansiedade') && !err.message.includes('F41.1')
    )
  })
})

describe('AAD obrigatório e válido', () => {
  test('cifrar sem AAD é recusado', () => {
    assert.throws(() => cifrar(CONTEUDO), /AAD obrigatório/)
    assert.throws(() => cifrar(CONTEUDO, Buffer.alloc(0)), /AAD obrigatório/)
  })

  test('decifrar sem AAD é recusado', () => {
    const bloco = cifrar(CONTEUDO, aadProntuario(ID, 1))
    assert.throws(() => decifrar(bloco), /AAD obrigatório/)
  })

  test('versão do AAD precisa ser inteiro >= 1', () => {
    assert.throws(() => aadProntuario(ID, 0), /AAD de prontuário inválido/)
    assert.throws(() => aadProntuario(ID, '1'), /AAD de prontuário inválido/)
    assert.throws(() => aadProntuario('', 1), /AAD de prontuário inválido/)
  })
})

describe('carregarChave (falha fechada)', () => {
  test('chave ausente lança erro', () => {
    delete process.env.PRONTUARIO_KEY
    assert.throws(() => carregarChave(), /PRONTUARIO_KEY ausente ou inválida/)
    assert.throws(() => cifrar(CONTEUDO, aadProntuario(ID, 1)), /PRONTUARIO_KEY ausente ou inválida/)
  })

  test('chave com tamanho errado lança erro', () => {
    process.env.PRONTUARIO_KEY = nodeCrypto.randomBytes(16).toString('base64')
    assert.throws(() => carregarChave(), /PRONTUARIO_KEY ausente ou inválida/)
  })

  test('a mensagem de erro não mostra o valor da chave', () => {
    const chaveCurta = nodeCrypto.randomBytes(16).toString('base64')
    process.env.PRONTUARIO_KEY = chaveCurta
    assert.throws(() => carregarChave(), err => !err.message.includes(chaveCurta))
  })

  test('chave válida devolve 32 bytes', () => {
    assert.equal(carregarChave().length, 32)
  })
})
