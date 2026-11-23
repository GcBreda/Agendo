// frontend/src/utils/pdfResumo.js
// PDF do resumo financeiro (do mês ou do ano), gerado no próprio navegador com a biblioteca jsPDF.
//
// - As bibliotecas só são baixadas quando alguém clica em "Baixar PDF" (import dinâmico).
// - O PDF é sempre claro (fundo branco), em qualquer tema da tela.
// - Não leva nome de paciente (LGPD, princípio da necessidade): só datas, tipos e valores.
// - Usa os mesmos números da tela, que vêm do servidor (GET /api/financeiro/resumo).
//
// Diferente da tela (HTML + Tailwind), aqui o desenho é feito em código:
// posições em milímetros, tamanho de letra, cores e tabelas.

const FUSO = 'America/Sao_Paulo'
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const TIPO_LABEL = {
  AVALIACAO_INICIAL: 'Avaliação inicial',
  ACOMPANHAMENTO:    'Acompanhamento',
  TCC:               'TCC',
  PSICANALISE:       'Psicanálise',
}

const MARGEM = 15         // mm, dos quatro lados
const ESPACO_RODAPE = 28  // mm reservados embaixo para o aviso e o número da página
const COR = {
  titulo:   [17, 24, 39],   // cinza bem escuro
  texto:    [55, 65, 81],
  suave:    [107, 114, 128],
  linha:    [229, 231, 235],
  zebra:    [249, 250, 251],
  total:    [243, 244, 246],
  destaque: [79, 70, 229]   // índigo do Agendô
}

// A fonte padrão do PDF não tem o espaço especial que o real formatado usa (R$ 180,00): vira espaço comum
const limpo = texto => String(texto).replace(/[  ]/g, ' ')
const moeda = valor => limpo(Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const emBrasilia = (data, opcoes) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opcoes }).format(new Date(data))
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
const porcentagem = (parte, todo) => Math.round((parte / todo) * 100)

export function nomeDoArquivo({ ano, mes, visao }) {
  return visao === 'ano' ? `resumo-financeiro-${ano}.pdf` : `resumo-financeiro-${ano}-${String(mes).padStart(2, '0')}.pdf`
}

// Comparação com o mês anterior, em palavras (a fonte do PDF não tem as setas ↑ ↓)
function comparacao(atual, anterior) {
  if (anterior === 0) return 'sem sessões para comparar'
  const variacao = porcentagem(atual - anterior, anterior)
  if (variacao === 0) return 'igual'
  return variacao > 0 ? `${variacao}% a mais` : `${Math.abs(variacao)}% a menos`
}

// Monta o documento e devolve o objeto do jsPDF (o teste lê o texto dele; a tela chama baixarResumoPdf)
export async function montarResumoPdf({ resumo, visao, mes, sessoes = [], agora = new Date() }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const largura = doc.internal.pageSize.getWidth()
  const altura = doc.internal.pageSize.getHeight()
  const periodo = visao === 'ano' ? `ano de ${resumo.ano}` : `${MESES[mes - 1].toLowerCase()} de ${resumo.ano}`
  doc.setProperties({ title: `Resumo financeiro — ${periodo}`, subject: 'Resumo gerencial de sessões', creator: 'Agendô' })

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COR.titulo)
  doc.text(`Resumo financeiro — ${periodo}`, MARGEM, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COR.texto)
  doc.text(limpo(`${resumo.profissional.nome} · CRP ${resumo.profissional.crp}`), MARGEM, 27)
  doc.setTextColor(...COR.suave)
  doc.text(`Gerado em ${emBrasilia(agora, { dateStyle: 'short' })} às ${emBrasilia(agora, { timeStyle: 'short' })} (horário de Brasília)`, MARGEM, 32)
  doc.setDrawColor(...COR.linha)
  doc.line(MARGEM, 36, largura - MARGEM, 36)

  // ── Peças de desenho ───────────────────────────────────────
  let y = 45 // onde escrever a próxima coisa, em mm a partir do topo
  const secao = texto => {
    if (y > altura - ESPACO_RODAPE - 20) { doc.addPage(); y = 20 } // título sozinho no fim da página: vai para a próxima
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...COR.titulo)
    doc.text(texto, MARGEM, y)
    y += 3
  }
  const margem = { top: MARGEM, left: MARGEM, right: MARGEM, bottom: ESPACO_RODAPE } // top vale nas páginas seguintes
  const depoisDaTabela = () => { y = doc.lastAutoTable.finalY + 10 }

  // Quadro de números principais: rótulo à esquerda, valor em negrito
  const quadro = linhas => {
    autoTable(doc, {
      startY: y, margin: margem, theme: 'plain', body: linhas,
      styles: { font: 'helvetica', fontSize: 10, textColor: COR.texto, cellPadding: { top: 1.6, bottom: 1.6, left: 0, right: 2 } },
      columnStyles: { 0: { cellWidth: 75 }, 1: { fontStyle: 'bold', textColor: COR.titulo } }
    })
    depoisDaTabela()
  }

  // Tabela com cabeçalho colorido, linhas alternadas e total; colunas numéricas alinhadas à direita
  const tabela = ({ cabecalho, linhas, total, numericas }) => {
    autoTable(doc, {
      startY: y, margin: margem, theme: 'grid', head: [cabecalho], body: linhas, foot: total ? [total] : undefined,
      showHead: 'everyPage', showFoot: 'lastPage',
      styles: { font: 'helvetica', fontSize: 9.5, textColor: COR.texto, cellPadding: 2.2, lineColor: COR.linha, lineWidth: 0.1 },
      headStyles: { fillColor: COR.destaque, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: COR.total, textColor: COR.titulo, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COR.zebra },
      didParseCell: ({ cell, column }) => { if (numericas.includes(column.index)) cell.styles.halign = 'right' }
    })
    depoisDaTabela()
  }

  // ── Conteúdo ───────────────────────────────────────────────
  if (visao === 'ano') {
    const { total, meses } = resumo
    const todas = total.realizadas + total.canceladas
    secao(`Resumo de ${resumo.ano}`)
    quadro([
      [`Valor das sessões realizadas em ${resumo.ano}`, moeda(total.valor)],
      ['Sessões realizadas', String(total.realizadas)],
      ['Sessões canceladas', todas ? `${total.canceladas} (${porcentagem(total.canceladas, todas)}% das sessões do ano)` : '0'],
      ['Valor atual da consulta', moeda(resumo.profissional.valorSessao)]
    ])
    secao('Mês a mês')
    tabela({
      cabecalho: ['Mês', 'Realizadas', 'Canceladas', 'Valor'],
      linhas: meses.map(m => [MESES[m.mes - 1], String(m.realizadas), String(m.canceladas), moeda(m.valor)]),
      total: ['Total', String(total.realizadas), String(total.canceladas), moeda(total.valor)],
      numericas: [1, 2, 3]
    })
  } else {
    const doMes = resumo.meses[mes - 1]
    const anterior = mes === 1 ? resumo.dezembroAnterior : resumo.meses[mes - 2]
    const nomeDoAnterior = MESES[(mes + 10) % 12].toLowerCase()
    const todas = doMes.realizadas + doMes.canceladas
    secao(`Resumo de ${MESES[mes - 1].toLowerCase()}`)
    quadro([
      ['Valor das sessões realizadas', moeda(doMes.valor)],
      [`Em relação a ${nomeDoAnterior}`, comparacao(doMes.valor, anterior.valor)],
      ['Sessões realizadas', String(doMes.realizadas)],
      ['Sessões canceladas', todas ? `${doMes.canceladas} (${porcentagem(doMes.canceladas, todas)}% das sessões do mês)` : '0'],
      ['Valor atual da consulta', moeda(resumo.profissional.valorSessao)]
    ])

    secao(`Sessões realizadas em ${MESES[mes - 1].toLowerCase()}`)
    const emOrdem = [...sessoes].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))
    if (emOrdem.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...COR.suave)
      doc.text('Nenhuma sessão realizada neste mês.', MARGEM, y + 5)
    } else {
      const centavos = emOrdem.reduce((soma, ag) => soma + Math.round(Number(ag.valor) * 100), 0)
      tabela({
        cabecalho: ['Data', 'Horário', 'Tipo de sessão', 'Valor'],
        linhas: emOrdem.map(ag => [
          emBrasilia(ag.dataHora, { day: '2-digit', month: '2-digit', year: 'numeric' }),
          emBrasilia(ag.dataHora, { hour: '2-digit', minute: '2-digit' }),
          TIPO_LABEL[ag.tipoSessao] ?? ag.tipoSessao,
          moeda(ag.valor)
        ]),
        total: ['Total', '', plural(emOrdem.length, 'sessão', 'sessões'), moeda(centavos / 100)],
        numericas: [3]
      })
    }
  }

  // ── Rodapé em todas as páginas ─────────────────────────────
  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina)
    doc.setDrawColor(...COR.linha)
    doc.line(MARGEM, altura - 22, largura - MARGEM, altura - 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COR.suave)
    doc.text([
      'Resumo gerencial gerado pelo Agendô. Não é recibo nem documento fiscal, e não identifica pacientes.',
      'Os valores somam as sessões realizadas, pelo preço do dia em que cada uma foi marcada; não são o valor recebido.'
    ], MARGEM, altura - 17)
    doc.text(`Página ${pagina} de ${paginas}`, largura - MARGEM, altura - 8, { align: 'right' })
  }

  return doc
}

// Monta e baixa o arquivo (ex.: resumo-financeiro-2026-11.pdf)
export async function baixarResumoPdf(dados) {
  const doc = await montarResumoPdf(dados)
  doc.save(nomeDoArquivo({ ano: dados.resumo.ano, mes: dados.mes, visao: dados.visao }))
}
