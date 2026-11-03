// backend/src/utils/crypto.js
// Cifragem do conteúdo clínico (prontuário e anotações pessoais) com AES-256-GCM.
//
// Regras:
// - a chave vem só de PRONTUARIO_KEY (32 bytes em base64), nunca do código, do banco ou do Git;
// - IV aleatório novo a cada cifragem;
// - o AAD liga o bloco ao registro (id e versão): um bloco copiado para outro lugar não decifra;
// - este módulo nunca escreve log e nenhuma mensagem de erro contém chave ou conteúdo.

const crypto = require('crypto')

const ALGORITMO      = 'aes-256-gcm'
const CHAVE_BYTES    = 32
const IV_BYTES       = 12 // tamanho recomendado para o GCM
const TAG_BYTES      = 16
const CHAVE_ID       = 1  // identifica a chave usada; permite trocar de chave no futuro
const VERSAO_FORMATO = 1  // versão do JSON guardado dentro do bloco

// ── Chave ────────────────────────────────────────────────────
// Lê e valida a chave a cada uso. Falha fechada: sem chave válida, nada é cifrado nem decifrado.
function carregarChave() {
  const base64 = process.env.PRONTUARIO_KEY
  const chave  = base64 ? Buffer.from(base64, 'base64') : null
  if (!chave || chave.length !== CHAVE_BYTES) {
    throw new Error('PRONTUARIO_KEY ausente ou inválida.')
  }
  return chave
}

// ── AAD (dados autenticados adicionais) ──────────────────────
// Não são cifrados, mas entram no lacre (authTag). Se mudarem, a decifragem falha.
function aadProntuario(prontuarioId, numeroVersao) {
  if (!prontuarioId || !Number.isInteger(numeroVersao) || numeroVersao < 1) {
    throw new Error('AAD de prontuário inválido.')
  }
  return Buffer.from(`agendo|prontuario|v1|${prontuarioId}|${numeroVersao}`, 'utf8')
}

function aadAnotacao(anotacaoId) {
  if (!anotacaoId) throw new Error('AAD de anotação inválido.')
  return Buffer.from(`agendo|anotacao|v1|${anotacaoId}`, 'utf8')
}

// ── Cifrar ───────────────────────────────────────────────────
// objeto: { anotacoes, cid, lembretes } (ou { texto } nas anotações pessoais)
// aad:    Buffer gerado por aadProntuario/aadAnotacao (obrigatório)
function cifrar(objeto, aad) {
  if (!Buffer.isBuffer(aad) || aad.length === 0) throw new Error('AAD obrigatório.')

  const chave  = carregarChave()
  const iv     = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITMO, chave, iv, { authTagLength: TAG_BYTES })
  cipher.setAAD(aad)

  const texto = JSON.stringify({ v: VERSAO_FORMATO, ...objeto })
  const conteudoCifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])

  return { conteudoCifrado, iv, authTag: cipher.getAuthTag(), chaveId: CHAVE_ID }
}

// ── Decifrar ─────────────────────────────────────────────────
// Qualquer problema (chave errada, bloco alterado, AAD de outro registro) vira o mesmo erro genérico.
function decifrar({ conteudoCifrado, iv, authTag, chaveId = CHAVE_ID }, aad) {
  if (!Buffer.isBuffer(aad) || aad.length === 0) throw new Error('AAD obrigatório.')
  if (chaveId !== CHAVE_ID) throw new Error('Chave de cifragem desconhecida.')

  const chave = carregarChave()
  try {
    const ivBuf  = Buffer.from(iv)
    const tagBuf = Buffer.from(authTag)
    if (ivBuf.length !== IV_BYTES || tagBuf.length !== TAG_BYTES) throw new Error()

    const decipher = crypto.createDecipheriv(ALGORITMO, chave, ivBuf, { authTagLength: TAG_BYTES })
    decipher.setAuthTag(tagBuf)
    decipher.setAAD(aad)

    const texto = Buffer.concat([decipher.update(Buffer.from(conteudoCifrado)), decipher.final()]).toString('utf8')
    const { v, ...objeto } = JSON.parse(texto)
    if (v !== VERSAO_FORMATO) throw new Error()
    return objeto
  } catch {
    throw new Error('Falha de integridade ao decifrar.')
  }
}

module.exports = { carregarChave, aadProntuario, aadAnotacao, cifrar, decifrar, CHAVE_ID }
