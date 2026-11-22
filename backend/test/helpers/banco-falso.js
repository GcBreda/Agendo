// backend/test/helpers/banco-falso.js
// Um "Prisma" em memória, só com o que as rotas da agenda usam, para testar as rotas sem PostgreSQL.
//
// Como entra no app: src/prisma/client.js reaproveita globalThis.prisma quando ele existe.
// O teste faz globalThis.prisma = criarBancoFalso(...) ANTES de carregar o app.
// Ele não substitui os testes com banco de verdade (gatilhos.test.js): só cobre regras de rota.
// Todos os dados usados com ele são fictícios.

const { randomUUID } = require('node:crypto')

// Aplica um "select" simples do Prisma: devolve só os campos pedidos com true
function escolher(obj, select) {
  if (!obj) return null
  if (!select) return { ...obj }
  const saida = {}
  for (const [campo, quer] of Object.entries(select)) if (quer === true) saida[campo] = obj[campo]
  return saida
}

function criarBancoFalso(inicial = {}) {
  const db = {
    usuarios: [], pacientes: [], profissionais: [], disponibilidades: [], agendamentos: [],
    ...structuredClone(inicial)
  }

  const disponibilidadesDe = (profissionalId, filtro = {}) =>
    db.disponibilidades.filter(d => d.profissionalId === profissionalId && (filtro.ativo === undefined || d.ativo === filtro.ativo))

  const acharProfissional = where =>
    db.profissionais.find(p => (where.id ? p.id === where.id : p.usuarioId === where.usuarioId)) || null

  return {
    _dados: db,

    usuario: {
      findUnique: async ({ where, select }) => escolher(db.usuarios.find(u => u.id === where.id), select)
    },

    paciente: {
      findUnique: async ({ where }) => db.pacientes.find(p => p.usuarioId === where.usuarioId) || null
    },

    profissional: {
      findUnique: async ({ where, include, select }) => {
        const p = acharProfissional(where)
        if (!p) return null
        if (include?.disponibilidades) return { ...p, disponibilidades: disponibilidadesDe(p.id).map(d => ({ ...d })) }
        const saida = escolher(p, select)
        if (select?.disponibilidades) {
          const pedido = select.disponibilidades
          saida.disponibilidades = disponibilidadesDe(p.id, pedido.where).map(d => escolher(d, pedido.select))
        }
        return saida
      },
      update: async ({ where, data }) => {
        const p = acharProfissional(where)
        Object.assign(p, data)
        return { ...p }
      }
    },

    disponibilidade: {
      deleteMany: async ({ where }) => {
        const antes = db.disponibilidades.length
        db.disponibilidades = db.disponibilidades.filter(d => d.profissionalId !== where.profissionalId)
        return { count: antes - db.disponibilidades.length }
      },
      createMany: async ({ data }) => {
        for (const d of data) db.disponibilidades.push({ id: randomUUID(), ativo: true, ...d })
        return { count: data.length }
      }
    },

    agendamento: {
      findMany: async ({ where, select }) => db.agendamentos
        .filter(a => a.profissionalId === where.profissionalId)
        .filter(a => !where.dataHora || (a.dataHora >= where.dataHora.gte && a.dataHora <= where.dataHora.lte))
        .filter(a => !where.status?.in || where.status.in.includes(a.status))
        .map(a => escolher(a, select)),
      create: async ({ data }) => {
        const novo = { id: randomUUID(), duracaoMin: 50, ...data }
        db.agendamentos.push(novo)
        return { ...novo }
      }
    },

    // Como no Prisma, o array de operações roda todo ou nada; aqui basta esperar todas
    $transaction: async operacoes => Promise.all(operacoes),
    $disconnect: async () => {}
  }
}

module.exports = { criarBancoFalso }
