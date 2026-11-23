// frontend/src/pages/profissional/FinanceiroPage.jsx
// Financeiro do profissional: resumo do mês ou do ano.
// Os totais vêm do servidor (GET /api/financeiro/resumo), que soma o valor gravado em cada consulta
// no calendário de Brasília. A lista de sessões do mês vem das consultas do próprio profissional.
// "Baixar PDF" gera o arquivo no navegador (utils/pdfResumo.js), com os mesmos números da tela.
import React, { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAgendamentos } from '../../hooks/useAgendamentos'
import { useResumoFinanceiro } from '../../hooks/useFinanceiro'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const TIPO_LABEL = {
  AVALIACAO_INICIAL: 'Avaliação inicial',
  ACOMPANHAMENTO:    'Acompanhamento',
  TCC:               'TCC',
  PSICANALISE:       'Psicanálise',
}

const FUSO = 'America/Sao_Paulo'
const formatarMoeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
const porcentagem = (parte, todo) => Math.round((parte / todo) * 100)

// 'AAAA-MM' de uma data no calendário de Brasília: o mesmo critério do servidor no resumo
const mesDeBrasilia = data => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit' }).format(new Date(data))
const diaDeBrasilia = data => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric' }).format(new Date(data))
const horaDeBrasilia = data => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(data))

function hojeEmBrasilia() {
  const [ano, mes] = mesDeBrasilia(new Date()).split('-').map(Number)
  return { ano, mes }
}

export default function FinanceiroPage() {
  const atual = hojeEmBrasilia()
  const [visao, setVisao] = useState('mes') // 'mes' ou 'ano'
  const [ano, setAno] = useState(atual.ano)
  const [mes, setMes] = useState(atual.mes) // 1 a 12
  const { data: resumo, isLoading, isError, refetch } = useResumoFinanceiro(ano)
  const { data: agendamentos = [], isLoading: carregandoConsultas } = useAgendamentos()
  const [pdf, setPdf] = useState('parado') // 'parado', 'gerando' ou 'erro'

  // Sessões realizadas do mês escolhido, no calendário de Brasília: a lista da tela e a tabela do PDF
  const chaveDoMes = `${ano}-${String(mes).padStart(2, '0')}`
  const sessoesDoMes = agendamentos
    .filter(ag => ag.status === 'REALIZADO' && mesDeBrasilia(ag.dataHora) === chaveDoMes)
    .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
  const periodo = visao === 'ano' ? String(ano) : `${MESES[mes - 1].toLowerCase()} de ${ano}`

  async function baixarPdf() {
    setPdf('gerando')
    try {
      // Import dinâmico: o código do PDF (e a biblioteca jsPDF) só é baixado quando alguém clica
      const { baixarResumoPdf } = await import('../../utils/pdfResumo')
      await baixarResumoPdf({ resumo, visao, mes, sessoes: sessoesDoMes })
      setPdf('parado')
    } catch {
      setPdf('erro') // por exemplo, sem internet para baixar a biblioteca do PDF
    }
  }

  // Anda um mês (ou um ano) para trás (-1) ou para frente (+1)
  function andar(passo) {
    if (visao === 'ano') return setAno(a => a + passo)
    const indice = ano * 12 + (mes - 1) + passo
    setAno(Math.floor(indice / 12))
    setMes((indice % 12) + 1)
  }
  const ehOAtual = visao === 'ano' ? ano === atual.ano : ano === atual.ano && mes === atual.mes

  return (
    <DashboardLayout titulo="Financeiro">

      {/* Mês ou ano, e qual período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Ver o resumo por" className="inline-flex p-1 bg-gray-100 rounded-lg">
          {[['mes', 'Mês'], ['ano', 'Ano']].map(([valor, rotulo]) => (
            <button key={valor} type="button" aria-pressed={visao === valor} onClick={() => setVisao(valor)}
              className={`min-h-[40px] md:min-h-0 px-4 py-1.5 text-xs font-medium rounded-md transition-colors
                ${visao === valor ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {rotulo}
            </button>
          ))}
        </div>

        {/* flex-wrap: no celular com letra grande, "Mês atual" desce para a linha de baixo */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => andar(-1)} aria-label={visao === 'ano' ? 'Ano anterior' : 'Mês anterior'}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            ‹
          </button>
          <h2 aria-live="polite" className="min-w-[7.5rem] sm:min-w-[9.5rem] text-center text-sm font-medium text-gray-900">
            {visao === 'ano' ? ano : `${MESES[mes - 1]} de ${ano}`}
          </h2>
          <button type="button" onClick={() => andar(1)} aria-label={visao === 'ano' ? 'Próximo ano' : 'Próximo mês'}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            ›
          </button>
          <button type="button" onClick={() => { setAno(atual.ano); setMes(atual.mes) }}
            className={`min-h-[40px] md:min-h-0 px-3 py-1.5 text-xs rounded-lg border transition-colors
              ${ehOAtual ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {visao === 'ano' ? 'Ano atual' : 'Mês atual'}
          </button>
          <button type="button" onClick={baixarPdf} disabled={!resumo || isError || carregandoConsultas || pdf === 'gerando'}
            className="min-h-[40px] md:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50">
            <IconeBaixar className="w-3.5 h-3.5" />
            {pdf === 'gerando' ? 'Gerando PDF...' : <>Baixar PDF<span className="sr-only"> do resumo de {periodo}</span></>}
          </button>
        </div>
      </div>
      {pdf === 'erro' && (
        <p role="alert" className="text-xs text-red-600">Não foi possível gerar o PDF. Confira a conexão e tente de novo.</p>
      )}

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
          Carregando o resumo...
        </div>
      ) : isError ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center">
          <p className="text-sm text-gray-600">Não foi possível carregar o resumo.</p>
          <button type="button" onClick={() => refetch()}
            className="mt-3 text-xs text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50">
            Tentar de novo
          </button>
        </div>
      ) : visao === 'ano' ? (
        <VisaoAno resumo={resumo} mesEmDestaque={ano === atual.ano ? atual.mes : null} />
      ) : (
        <VisaoMes resumo={resumo} mes={mes} sessoes={sessoesDoMes} />
      )}

    </DashboardLayout>
  )
}

// ── Um mês: cartões e a lista das sessões realizadas ─────────
function VisaoMes({ resumo, mes, sessoes }) {
  const doMes = resumo.meses[mes - 1]
  const anterior = mes === 1 ? resumo.dezembroAnterior : resumo.meses[mes - 2]
  const nomeDoMes = MESES[mes - 1].toLowerCase()
  const nomeDoAnterior = MESES[(mes + 10) % 12].toLowerCase()
  const doMesTodas = doMes.realizadas + doMes.canceladas

  return (
    <>
      <Cartoes>
        <Cartao rotulo="Valor das sessões realizadas" valor={formatarMoeda(doMes.valor)}
          {...comparacao(doMes.valor, anterior.valor, nomeDoAnterior)} />
        <Cartao rotulo="Sessões realizadas" valor={doMes.realizadas} detalhe={`em ${nomeDoMes}`} />
        <Cartao rotulo="Sessões canceladas" valor={doMes.canceladas}
          detalhe={doMesTodas ? `${porcentagem(doMes.canceladas, doMesTodas)}% das sessões do mês` : 'nenhuma sessão no mês'} />
        <Cartao rotulo="Valor atual da consulta" valor={formatarMoeda(resumo.profissional.valorSessao)} detalhe="o do seu cadastro" />
      </Cartoes>
      <AvisoDoValor />

      <section aria-labelledby="titulo-sessoes" className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="titulo-sessoes" className="text-sm font-medium text-gray-900">Sessões realizadas em {nomeDoMes}</h2>
          <span className="text-xs text-gray-400">{plural(sessoes.length, 'sessão', 'sessões')}</span>
        </div>
        {sessoes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">Nenhuma sessão realizada neste mês.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessoes.map(ag => (
              <li key={ag.id} className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="w-10 flex-shrink-0 text-center">
                  <p className="text-sm font-medium text-gray-900 tabular-nums">{diaDeBrasilia(ag.dataHora)}</p>
                  <p className="text-xs text-gray-400">{MESES[mes - 1].slice(0, 3)}</p>
                </div>
                <div className="flex-1 min-w-[9rem]">
                  <p className="text-sm font-medium text-gray-900 truncate">{ag.paciente?.usuario?.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TIPO_LABEL[ag.tipoSessao] ?? ag.tipoSessao} · {horaDeBrasilia(ag.dataHora)}
                  </p>
                </div>
                <p className="ml-auto text-sm font-medium text-gray-900 tabular-nums">{formatarMoeda(ag.valor)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

// ── Um ano: cartões, gráfico e a tabela mês a mês ────────────
function VisaoAno({ resumo, mesEmDestaque }) {
  const { ano, meses, total } = resumo
  const todas = total.realizadas + total.canceladas
  const maior = Math.max(1, ...meses.map(m => m.realizadas))

  return (
    <>
      <Cartoes>
        <Cartao rotulo={`Valor das sessões em ${ano}`} valor={formatarMoeda(total.valor)} />
        <Cartao rotulo="Sessões realizadas" valor={total.realizadas} detalhe={`em ${ano}`} />
        <Cartao rotulo="Sessões canceladas" valor={total.canceladas}
          detalhe={todas ? `${porcentagem(total.canceladas, todas)}% das sessões do ano` : 'nenhuma sessão no ano'} />
      </Cartoes>
      <AvisoDoValor />

      <section aria-labelledby="titulo-grafico" className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
        <h2 id="titulo-grafico" className="text-sm font-medium text-gray-900">Sessões realizadas por mês</h2>
        {/* Para leitor de tela, o gráfico é uma imagem com descrição; os números estão na tabela */}
        <div role="img" aria-label={`Gráfico de barras das sessões realizadas por mês em ${ano}. Os números estão na tabela Mês a mês.`}
          className="mt-4 flex items-end gap-1 sm:gap-2">
          {meses.map(m => (
            <div key={m.mes} className="flex-1 min-w-0 flex flex-col items-center gap-1">
              <span className="text-[0.6875rem] text-gray-400 tabular-nums h-4">{m.realizadas || ''}</span>
              <div className="w-full h-20 flex items-end">
                <div className={`w-full rounded-t-md ${m.mes === mesEmDestaque ? 'bg-indigo-600' : 'bg-indigo-100'}`}
                  style={{ height: `${(m.realizadas / maior) * 100}%`, minHeight: m.realizadas ? '3px' : 0 }} />
              </div>
              <span className="text-[0.6875rem] text-gray-400">
                <span className="sm:hidden">{MESES[m.mes - 1][0]}</span>
                <span className="hidden sm:inline">{MESES[m.mes - 1].slice(0, 3)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-tabela" className="bg-white border border-gray-200 rounded-xl">
        <h2 id="titulo-tabela" className="px-4 sm:px-5 py-4 border-b border-gray-100 text-sm font-medium text-gray-900">Mês a mês</h2>
        {/* No celular a tabela precisa caber inteira, com o Valor à vista: mês com 3 letras e sem a coluna
            Canceladas (o total de canceladas está no cartão). A rolagem para o lado fica só de reserva. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Sessões e valor por mês em {ano}</caption>
            <thead>
              <tr className="text-xs text-gray-500">
                <th scope="col" className="text-left font-medium pl-4 pr-2 sm:px-5 py-2.5">Mês</th>
                <th scope="col" className="text-right font-medium px-2 sm:px-3 py-2.5">
                  <span className="sm:hidden" aria-hidden="true">Sessões</span>
                  <span className="max-sm:sr-only">Realizadas</span>
                </th>
                <th scope="col" className="hidden sm:table-cell text-right font-medium px-3 py-2.5">Canceladas</th>
                <th scope="col" className="text-right font-medium pl-2 pr-4 sm:px-5 py-2.5">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 border-t border-gray-100">
              {meses.map(m => (
                <tr key={m.mes} className={m.realizadas || m.canceladas ? 'text-gray-900' : 'text-gray-400'}>
                  <th scope="row" className="text-left font-normal pl-4 pr-2 sm:px-5 py-2.5">
                    <span className="sm:hidden" aria-hidden="true">{MESES[m.mes - 1].slice(0, 3)}</span>
                    <span className="max-sm:sr-only">{MESES[m.mes - 1]}</span>
                  </th>
                  <td className="text-right tabular-nums px-2 sm:px-3 py-2.5">{m.realizadas}</td>
                  <td className="hidden sm:table-cell text-right tabular-nums px-3 py-2.5">{m.canceladas}</td>
                  <td className="text-right tabular-nums pl-2 pr-4 sm:px-5 py-2.5 whitespace-nowrap">{formatarMoeda(m.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 text-gray-900 font-medium">
                <th scope="row" className="text-left pl-4 pr-2 sm:px-5 py-3">Total</th>
                <td className="text-right tabular-nums px-2 sm:px-3 py-3">{total.realizadas}</td>
                <td className="hidden sm:table-cell text-right tabular-nums px-3 py-3">{total.canceladas}</td>
                <td className="text-right tabular-nums pl-2 pr-4 sm:px-5 py-3 whitespace-nowrap">{formatarMoeda(total.valor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  )
}

// ── Peças ────────────────────────────────────────────────────

// Mesmos cartões de antes: até 1024 px, no máximo 2 colunas (1 quando o cartão ficaria estreito demais);
// depois, quantas colunas de 9,5rem couberem. Em rem, para acompanhar o tamanho da letra.
function Cartoes({ children }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(max(min(100%,8.5rem),calc((100%_-_0.75rem)/2_-_1px)),1fr))] lg:grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-3">
      {children}
    </div>
  )
}

function Cartao({ rotulo, valor, detalhe, tom = 'text-gray-400' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{rotulo}</p>
      <p className="text-lg sm:text-xl font-semibold text-gray-900 tabular-nums">{valor}</p>
      {detalhe && <p className={`text-xs mt-1 ${tom}`}>{detalhe}</p>}
    </div>
  )
}

// O valor é o das sessões, não o dinheiro que entrou: o sistema ainda não registra pagamentos
function AvisoDoValor() {
  return (
    <p className="text-xs text-gray-500 max-w-3xl">
      Os valores somam as sessões realizadas, pelo preço do dia em que cada uma foi marcada.
      Ainda não é o valor recebido: o sistema não registra pagamentos.
    </p>
  )
}

function IconeBaixar({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5v7.5M4.75 7l3.25 3.25L11.25 7M3 12.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Comparação com o mês anterior, em porcentagem
function comparacao(atual, anterior, nomeDoAnterior) {
  if (anterior === 0) return { detalhe: `sem sessões em ${nomeDoAnterior} para comparar` }
  const variacao = porcentagem(atual - anterior, anterior)
  if (variacao === 0) return { detalhe: `igual a ${nomeDoAnterior}` }
  return variacao > 0
    ? { detalhe: `↑ ${variacao}% em relação a ${nomeDoAnterior}`, tom: 'text-green-600' }
    : { detalhe: `↓ ${Math.abs(variacao)}% em relação a ${nomeDoAnterior}`, tom: 'text-red-600' }
}
