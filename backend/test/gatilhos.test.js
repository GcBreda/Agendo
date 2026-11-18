// backend/test/gatilhos.test.js
// Prova que o próprio banco recusa alterar ou apagar o histórico do prontuário (Tarefa 4).
//
// Como os dados são limpos: não são. Cada teste roda dentro de uma transação que é
// SEMPRE desfeita (ROLLBACK) no final, então nada chega a ser gravado no agendo_test.
// Isso dispensa DELETE e TRUNCATE, que os gatilhos passam a recusar.
// Todos os dados são fictícios (e-mail @gatilhos.test, IP de documentação 192.0.2.x).

const { exigirBancoDeTeste } = require('./helpers/ambiente')
exigirBancoDeTeste() // antes de qualquer consulta: o arquivo só roda em banco "_test"

const { test, describe, after } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { PrismaClient } = require('@prisma/client')

// Cliente próprio, sem log de consultas: o do app imprime cada SQL em desenvolvimento,
// o que esconderia o resultado dos testes.
const prisma = new PrismaClient({ log: ['warn'] })

after(async () => { await prisma.$disconnect() })

const DOMINIO = '@gatilhos.test'
const IP_TESTE = '192.0.2.10'     // faixa reservada para documentação (RFC 5737)
const OUTRO_IP = '192.0.2.99'
const OPCOES_TX = { timeout: 15000 }

// ── Ajudantes ───────────────────────────────────────────────

class Desfazer extends Error {}

// Para o que DEVE funcionar: roda fn e força o ROLLBACK no final.
// O teste só passa se terminar com Desfazer, ou seja, se nada dentro de fn falhou.
async function emTransacaoDesfeita(fn) {
  await assert.rejects(
    prisma.$transaction(async tx => {
      await fn(tx, await criarCenario(tx))
      throw new Desfazer()
    }, OPCOES_TX),
    Desfazer
  )
}

// Para o que DEVE ser recusado: monta os dados, tenta a ação e espera o erro do padrão.
// Se a ação não falhar, lança NAO_RECUSOU (que não bate com o padrão), e a transação
// é desfeita do mesmo jeito: nem um TRUNCATE sem gatilho chegaria a ser gravado.
async function esperarRecusa(acao, padrao) {
  await assert.rejects(
    prisma.$transaction(async tx => {
      await acao(tx, await criarCenario(tx))
      throw new Error('NAO_RECUSOU: a operação deveria ter sido recusada')
    }, OPCOES_TX),
    padrao
  )
}

// Bytes de enchimento no lugar do conteúdo cifrado: sem texto clínico, sem PRONTUARIO_KEY.
function blocoFicticio() {
  return { conteudoCifrado: Buffer.from('bytes-de-enchimento'), iv: Buffer.alloc(12), authTag: Buffer.alloc(16) }
}

async function criarUsuario(tx, perfil, extra) {
  const sufixo = randomUUID()
  return tx.usuario.create({
    data: {
      nome: `Pessoa Fictícia ${perfil}`,
      email: `${perfil.toLowerCase()}-${sufixo}${DOMINIO}`,
      senhaHash: 'nao-e-um-hash',
      cpf: `TESTE-${sufixo}`,
      perfil,
      ...extra
    },
    include: { profissional: true, paciente: true }
  })
}

// Profissional, dois pacientes, uma consulta e um prontuário (versão 1, sem linhas de versão).
async function criarCenario(tx) {
  const usuarioProf = await criarUsuario(tx, 'PROFISSIONAL', {
    profissional: { create: { crp: `TESTE-${randomUUID()}`, especialidade: 'PSICOLOGIA_CLINICA', valorSessao: '180.00' } }
  })
  const usuarioPac = await criarUsuario(tx, 'PACIENTE', { paciente: { create: {} } })
  const usuarioOutro = await criarUsuario(tx, 'PACIENTE', { paciente: { create: {} } })
  const profissional = usuarioProf.profissional
  const paciente = usuarioPac.paciente

  const agendamento = await tx.agendamento.create({
    data: {
      pacienteId: paciente.id,
      profissionalId: profissional.id,
      dataHora: new Date('2026-01-15T13:00:00Z'),
      tipoSessao: 'ACOMPANHAMENTO',
      status: 'REALIZADO'
    }
  })
  const prontuario = await tx.prontuario.create({
    data: {
      id: randomUUID(),
      agendamentoId: agendamento.id,
      profissionalId: profissional.id,
      pacienteId: paciente.id,
      versaoAtual: 1
    }
  })
  return { usuarioProf, profissional, paciente, outroPaciente: usuarioOutro.paciente, agendamento, prontuario }
}

function criarVersao(tx, c) {
  return tx.prontuarioVersao.create({
    data: { prontuarioId: c.prontuario.id, numero: 1, autorId: c.profissional.id, ...blocoFicticio() }
  })
}

function criarAnotacao(tx, c, substituiId = null) {
  return tx.anotacaoPessoal.create({
    data: { id: randomUUID(), profissionalId: c.profissional.id, pacienteId: c.paciente.id, substituiId, ...blocoFicticio() }
  })
}

function criarLog(tx, c) {
  return tx.logAcessoProntuario.create({
    data: {
      usuarioId: c.usuarioProf.id,
      perfil: 'PROFISSIONAL',
      acao: 'LEITURA',
      recurso: 'PRONTUARIO',
      pacienteId: c.paciente.id,
      prontuarioId: c.prontuario.id,
      ip: IP_TESTE
    }
  })
}

// aceitoEm explícito: deixa as comparações de data independentes do fuso do servidor.
const ACEITO_EM = new Date('2026-06-01T12:00:00Z')
function criarConsentimento(tx, c) {
  return tx.consentimento.create({
    data: {
      pacienteId: c.paciente.id,
      versaoTermo: '1',
      finalidade: 'teste automatizado',
      baseLegal: 'CONSENTIMENTO',
      aceitoEm: ACEITO_EM,
      ip: IP_TESTE
    }
  })
}

// ── 1. Tabelas de só inserção ───────────────────────────────
// TRUNCATE com template fixo por tabela: nenhum SQL montado com string.

const tabelasSoInsercao = [
  {
    nome: 'prontuario_versoes',
    criar: criarVersao,
    buscar: (tx, r) => tx.prontuarioVersao.findUnique({ where: { id: r.id } }),
    alterar: (tx, r) => tx.prontuarioVersao.update({ where: { id: r.id }, data: { chaveId: 2 } }),
    apagar: (tx, r) => tx.prontuarioVersao.deleteMany({ where: { id: r.id } }),
    truncar: tx => tx.$executeRaw`TRUNCATE TABLE "prontuario_versoes"`
  },
  {
    nome: 'anotacoes_pessoais',
    criar: (tx, c) => criarAnotacao(tx, c),
    buscar: (tx, r) => tx.anotacaoPessoal.findUnique({ where: { id: r.id } }),
    alterar: (tx, r) => tx.anotacaoPessoal.update({ where: { id: r.id }, data: { chaveId: 2 } }),
    apagar: (tx, r) => tx.anotacaoPessoal.deleteMany({ where: { id: r.id } }),
    truncar: tx => tx.$executeRaw`TRUNCATE TABLE "anotacoes_pessoais"`
  },
  {
    nome: 'logs_acesso_prontuario',
    criar: criarLog,
    buscar: (tx, r) => tx.logAcessoProntuario.findUnique({ where: { id: r.id } }),
    alterar: (tx, r) => tx.logAcessoProntuario.update({ where: { id: r.id }, data: { ip: OUTRO_IP } }),
    apagar: (tx, r) => tx.logAcessoProntuario.deleteMany({ where: { id: r.id } }),
    truncar: tx => tx.$executeRaw`TRUNCATE TABLE "logs_acesso_prontuario"`
  }
]

for (const t of tabelasSoInsercao) {
  describe(`${t.nome} (só inserção)`, () => {
    test('INSERT funciona', async () => {
      await emTransacaoDesfeita(async (tx, c) => {
        const registro = await t.criar(tx, c)
        assert.ok(await t.buscar(tx, registro))
      })
    })

    test('UPDATE é recusado', async () => {
      await esperarRecusa(async (tx, c) => t.alterar(tx, await t.criar(tx, c)), /SO_INSERCAO: UPDATE/)
    })

    test('DELETE é recusado', async () => {
      await esperarRecusa(async (tx, c) => t.apagar(tx, await t.criar(tx, c)), /SO_INSERCAO: DELETE/)
    })

    test('TRUNCATE é recusado', async () => {
      await esperarRecusa(async (tx, c) => {
        await t.criar(tx, c)
        await t.truncar(tx)
      }, /SO_INSERCAO: TRUNCATE/)
    })
  })
}

// ── 2. Consentimentos ───────────────────────────────────────
// Os padrões usam ".+" no lugar das letras acentuadas, para não depender de como
// o Prisma escreve acentos na mensagem de erro.

describe('consentimentos (só a revogação, uma vez)', () => {
  const revogar = (tx, id, revogadoEm) => tx.consentimento.update({ where: { id }, data: { revogadoEm } })

  test('revogar uma vez funciona', async () => {
    await emTransacaoDesfeita(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      const revogado = await revogar(tx, consentimento.id, new Date())
      assert.ok(revogado.revogadoEm)
    })
  })

  test('revogar de novo é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      await revogar(tx, consentimento.id, new Date())
      await revogar(tx, consentimento.id, new Date())
    }, /consentimento j.+ revogado/)
  })

  test('desfazer a revogação (data para nulo) é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      await revogar(tx, consentimento.id, new Date())
      await revogar(tx, consentimento.id, null)
    }, /consentimento j.+ revogado/)
  })

  test('revogar com data anterior ao aceite é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      await revogar(tx, consentimento.id, new Date('2026-05-01T12:00:00Z'))
    }, /anterior a aceito_em/)
  })

  test('alterar outro campo é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      await tx.consentimento.update({ where: { id: consentimento.id }, data: { ip: OUTRO_IP } })
    }, /permitido preencher revogado_em/)
  })

  test('revogar e alterar outro campo juntos é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      await tx.consentimento.update({ where: { id: consentimento.id }, data: { revogadoEm: new Date(), ip: OUTRO_IP } })
    }, /permitido preencher revogado_em/)
  })

  test('DELETE é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      const consentimento = await criarConsentimento(tx, c)
      await tx.consentimento.delete({ where: { id: consentimento.id } })
    }, /CONSENTIMENTO: DELETE/)
  })

  test('TRUNCATE é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      await criarConsentimento(tx, c)
      await tx.$executeRaw`TRUNCATE TABLE "consentimentos"`
    }, /CONSENTIMENTO: TRUNCATE/)
  })
})

// ── 3. Anotações pessoais: substituição (pendência da Tarefa 3) ─

describe('anotacoes_pessoais (substituição)', () => {
  test('substituir a mesma anotação duas vezes é recusado (índice único)', async () => {
    await esperarRecusa(async (tx, c) => {
      const original = await criarAnotacao(tx, c)
      await criarAnotacao(tx, c, original.id)
      await criarAnotacao(tx, c, original.id)
    }, { code: 'P2002' })
  })

  test('substituiId apontando para anotação inexistente é recusado (chave estrangeira)', async () => {
    await esperarRecusa(async (tx, c) => {
      await criarAnotacao(tx, c, randomUUID())
    }, { code: 'P2003' })
  })
})

// ── 4. prontuarios (o ponteiro) ─────────────────────────────

describe('prontuarios (só avança a versão)', () => {
  test('avançar versaoAtual de 1 para 2 funciona (como a edição da Tarefa 10)', async () => {
    await emTransacaoDesfeita(async (tx, c) => {
      const { count } = await tx.prontuario.updateMany({
        where: { id: c.prontuario.id, versaoAtual: 1 },
        data: { versaoAtual: 2 }
      })
      assert.equal(count, 1)
    })
  })

  test('diminuir versaoAtual é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      await tx.prontuario.update({ where: { id: c.prontuario.id }, data: { versaoAtual: 0 } })
    }, /de 1 em 1/)
  })

  test('pular versão (1 para 3) é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      await tx.prontuario.update({ where: { id: c.prontuario.id }, data: { versaoAtual: 3 } })
    }, /de 1 em 1/)
  })

  test('trocar pacienteId é recusado', async () => {
    await esperarRecusa(async (tx, c) => {
      await tx.prontuario.update({ where: { id: c.prontuario.id }, data: { pacienteId: c.outroPaciente.id } })
    }, /permitido avan.+ar versao_atual/)
  })

  test('DELETE é recusado (prontuário sem versões: só o gatilho pode barrar)', async () => {
    await esperarRecusa(async (tx, c) => {
      await tx.prontuario.delete({ where: { id: c.prontuario.id } })
    }, /PRONTUARIO: DELETE/)
  })
})

// ── 5. Nada ficou gravado ───────────────────────────────────

describe('limpeza', () => {
  test('nenhum dado dos testes ficou no banco', async () => {
    const [usuarios, logs, consentimentos] = await Promise.all([
      prisma.usuario.count({ where: { email: { endsWith: DOMINIO } } }),
      prisma.logAcessoProntuario.count({ where: { ip: { startsWith: '192.0.2.' } } }),
      prisma.consentimento.count({ where: { ip: { startsWith: '192.0.2.' } } })
    ])
    assert.deepEqual({ usuarios, logs, consentimentos }, { usuarios: 0, logs: 0, consentimentos: 0 })
  })
})
