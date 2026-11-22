// backend/src/prisma/seed-demo.js
// Dados FICTÍCIOS para a demonstração online: cinco pacientes e consultas da Dra. Ana Melo
// de duas semanas antes até duas semanas depois da data do primeiro deploy.
// Roda depois do seed.js e só cria as consultas se ainda não houver nenhuma,
// para não mexer no que for criado durante a demonstração.

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { instanteBrasilia } = require('../utils/fuso')

const prisma = new PrismaClient()

const PACIENTES = [
  { nome: 'Carlos Eduardo Nogueira', email: 'carlos@exemplo.com',  cpf: '333.333.333-33', planoSaude: 'Unimed' },
  { nome: 'Beatriz Santos',          email: 'beatriz@exemplo.com', cpf: '444.444.444-44', planoSaude: null },
  { nome: 'João Pedro Ramos',        email: 'joao@exemplo.com',    cpf: '555.555.555-55', planoSaude: 'Unimed' },
  { nome: 'Marina Alves',            email: 'marina@exemplo.com',  cpf: '666.666.666-66', planoSaude: null },
  { nome: 'Lucas Andrade',           email: 'lucas@exemplo.com',   cpf: '777.777.777-77', planoSaude: 'Unimed' },
]

// Semana típica, nos horários que a agenda oferece (sessões de 50 min a partir das 08:00).
// [dia (1 = segunda), hora em Brasília, paciente (F = Fernanda; número = índice acima), tipo]
const SEMANA = [
  [1, '08:50', 'F', 'ACOMPANHAMENTO'], [1, '13:00', 1, 'TCC'], [1, '15:30', 3, 'ACOMPANHAMENTO'],
  [2, '08:00', 0, 'TCC'], [2, '10:30', 2, 'ACOMPANHAMENTO'], [2, '14:40', 'F', 'TCC'],
  [3, '09:40', 4, 'ACOMPANHAMENTO'], [3, '11:20', 1, 'TCC'],
  [4, '13:00', 3, 'ACOMPANHAMENTO'], [4, '15:30', 0, 'TCC'],
  [5, '09:40', 2, 'TCC'],
]

// Data de hoje em Brasília (UTC−3), como 'AAAA-MM-DD' somando dias
function diaBrasilia(deslocamentoDias) {
  const d = new Date(Date.now() - 3 * 3600 * 1000 + deslocamentoDias * 86400 * 1000)
  return d.toISOString().slice(0, 10)
}

async function main() {
  const total = await prisma.agendamento.count()
  if (total > 0) {
    console.log(`Seed de demonstração: já existem ${total} consultas, nada a fazer.`)
    return
  }

  const prof = await prisma.profissional.findFirst({ where: { usuario: { email: 'ana.melo@agendo.app' } } })
  const fernanda = await prisma.paciente.findFirst({ where: { usuario: { email: 'fernanda@agendo.app' } } })
  if (!prof || !fernanda) throw new Error('Rode antes o seed.js (Dra. Ana Melo e Fernanda Lima).')

  // Pacientes fictícios: não fazem login, então recebem uma senha aleatória
  const pacientes = []
  for (const p of PACIENTES) {
    const senhaHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10)
    const u = await prisma.usuario.upsert({
      where:  { email: p.email },
      update: {},
      create: { nome: p.nome, email: p.email, cpf: p.cpf, senhaHash, perfil: 'PACIENTE',
        paciente: { create: { planoSaude: p.planoSaude } } },
      include: { paciente: true }
    })
    pacientes.push(u.paciente)
  }

  // Segunda-feira da semana atual, em Brasília
  const hoje = new Date(`${diaBrasilia(0)}T12:00:00Z`)
  const ateSegunda = (hoje.getUTCDay() + 6) % 7
  const agora = new Date()
  const dados = []
  let n = 0
  for (let semana = -2; semana <= 2; semana++) {
    for (const [dia, hora, quem, tipo] of SEMANA) {
      // Lucas é paciente novo: só aparece a partir desta semana, com avaliação inicial na primeira
      if (quem === 4 && semana < 0) continue
      const data = diaBrasilia(semana * 7 - ateSegunda + (dia - 1))
      const dataHora = instanteBrasilia(`${data}T${hora}:00`)
      const paciente = quem === 'F' ? fernanda : pacientes[quem]
      n += 1
      let status
      if (dataHora < agora) status = n % 13 === 0 ? 'CANCELADO' : 'REALIZADO'
      else status = n % 3 === 0 ? 'PENDENTE' : 'CONFIRMADO'
      dados.push({
        pacienteId: paciente.id, profissionalId: prof.id, dataHora, duracaoMin: 50, status,
        tipoSessao: quem === 4 && semana === 0 ? 'AVALIACAO_INICIAL' : tipo
      })
    }
  }
  await prisma.agendamento.createMany({ data: dados })
  console.log(`Seed de demonstração: ${pacientes.length} pacientes fictícios e ${dados.length} consultas criadas.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
