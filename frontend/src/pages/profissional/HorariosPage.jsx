// frontend/src/pages/profissional/HorariosPage.jsx
// "Meus horários": o profissional escolhe os dias e as faixas em que atende, a duração da consulta
// e o intervalo entre uma e outra. Daqui saem os horários que o paciente vê ao agendar.
// A tela mostra os horários e os erros enquanto a pessoa edita (utils/agenda.js);
// o servidor confere tudo de novo ao salvar.
import React, { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useMeusHorarios, useSalvarMeusHorarios } from '../../hooks/useMeusHorarios'
import { DIAS_SEMANA, NOME_DO_DIA, LIMITES, paraMinutos, paraHora, gerarHorarios, errosDoDia } from '../../utils/agenda'

// Segunda primeiro, como a semana de trabalho costuma ser lida
const DIAS_NA_TELA = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO']
const TERCA_A_SEXTA = ['TERCA', 'QUARTA', 'QUINTA', 'SEXTA']
const DURACOES = [15, 20, 30, 40, 45, 50, 60, 90, 120]
const INTERVALOS = [0, 5, 10, 15, 20, 30, 45, 60]
const TOM = { ok: 'text-green-600', erro: 'text-red-600', info: 'text-gray-600', pendente: 'text-amber-700' }

export default function HorariosPage() {
  const { data: salvo, isLoading, isError, refetch } = useMeusHorarios()

  return (
    <DashboardLayout titulo="Meus horários">
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-400">
          Carregando seus horários...
        </div>
      ) : isError ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center">
          <p className="text-sm text-gray-600">Não foi possível carregar seus horários.</p>
          <button type="button" onClick={() => refetch()}
            className="mt-3 text-xs text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50">
            Tentar de novo
          </button>
        </div>
      ) : (
        <Editor salvo={salvo} />
      )}
    </DashboardLayout>
  )
}

// Só aparece com a agenda salva já carregada: ela vira o ponto de partida do rascunho
function Editor({ salvo }) {
  // Rascunho: o que está na tela. Só vale para os pacientes depois de "Salvar horários".
  const [rascunho, setRascunho] = useState(() => paraRascunho(salvo))
  const [aviso, setAviso] = useState(null) // { tom: 'ok' | 'erro' | 'info', texto }
  const { mutateAsync: salvar, isPending: salvando } = useSalvarMeusHorarios()

  const envio = paraEnvio(rascunho)
  const alterado = assinatura(envio) !== assinatura(salvo)
  const errosPorDia = useMemo(
    () => Object.fromEntries(DIAS_SEMANA.map(dia => [dia, errosDoDia(rascunho.porDia[dia], rascunho.duracaoMin)])),
    [rascunho]
  )
  const temErro = DIAS_SEMANA.some(dia => errosPorDia[dia].length > 0)
  const totalSemana = DIAS_SEMANA.reduce((soma, dia) => soma + (errosPorDia[dia].length > 0 ? 0
    : gerarHorarios(rascunho.porDia[dia], rascunho.duracaoMin, rascunho.intervaloMin).length), 0)

  // Fechar ou recarregar a aba com alteração não salva: o navegador pergunta antes
  useEffect(() => {
    if (!alterado) return
    const perguntar = evento => { evento.preventDefault(); evento.returnValue = '' }
    window.addEventListener('beforeunload', perguntar)
    return () => window.removeEventListener('beforeunload', perguntar)
  }, [alterado])

  // Toda edição apaga o aviso anterior ("salvo", "erro"...); algumas já trazem um aviso novo
  function editar(mudanca, avisoNovo = null) {
    setRascunho(mudanca)
    setAviso(avisoNovo)
  }

  function copiarSegundaParaTercaASexta() {
    editar(r => {
      const porDia = { ...r.porDia }
      for (const dia of TERCA_A_SEXTA) porDia[dia] = r.porDia.SEGUNDA.map(f => ({ ...f, id: novoId() }))
      return { ...r, porDia }
    }, { tom: 'info', texto: 'Horário de segunda copiado para terça a sexta. Falta salvar.' })
  }

  async function aoSalvar() {
    if (temErro) {
      setAviso({ tom: 'erro', texto: 'Corrija os horários marcados em vermelho antes de salvar.' })
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    try {
      await salvar(envio)
      setAviso({ tom: 'ok', texto: 'Horários salvos. As próximas marcações já seguem a agenda nova.' })
    } catch (erro) {
      // 422: o servidor recusou alguma regra e diz qual. Outros erros: mensagem geral, sem detalhe técnico.
      const doServidor = erro.response?.status === 422 ? (erro.response.data?.errors || []).map(e => e.msg) : []
      setAviso({
        tom: 'erro',
        texto: doServidor.length > 0 ? doServidor.join(' ') : 'Não foi possível salvar. Confira a conexão e tente de novo.'
      })
    }
  }

  // "Salvo" só aparece se nada mudou depois de salvar
  const status = alterado && (!aviso || aviso.tom === 'ok')
    ? { tom: 'pendente', texto: 'Alterações ainda não salvas.' }
    : aviso

  return (
    <>
      <p className="text-sm text-gray-600 max-w-2xl">
        Os pacientes só conseguem marcar consulta nos horários definidos aqui.
        Mudar esta agenda não altera as consultas já marcadas.
      </p>

      <section aria-labelledby="titulo-consultas" className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
        <h2 id="titulo-consultas" className="text-sm font-medium text-gray-900 mb-4">Consultas</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          <Seletor id="duracao-consulta" rotulo="Duração da consulta" valor={rascunho.duracaoMin} opcoes={DURACOES}
            texto={m => `${m} min`} aoMudar={v => editar(r => ({ ...r, duracaoMin: v }))} />
          <Seletor id="intervalo-consultas" rotulo="Intervalo entre consultas" valor={rascunho.intervaloMin} opcoes={INTERVALOS}
            texto={m => (m === 0 ? 'Sem intervalo' : `${m} min`)} aoMudar={v => editar(r => ({ ...r, intervaloMin: v }))} />
        </div>
        <p className="text-xs text-gray-500 mt-3">{ritmo(rascunho)}</p>
      </section>

      {/* Sem overflow-hidden de propósito: dentro do <main> (coluna flex de altura fixa),
          um cartão com overflow-hidden pode encolher e cortar o próprio conteúdo */}
      <section aria-labelledby="titulo-dias" className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="titulo-dias" className="text-sm font-medium text-gray-900">Dias e horários de atendimento</h2>
          <p className="text-xs text-gray-500">
            {totalSemana === 1 ? '1 horário' : `${totalSemana} horários`} de consulta por semana
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {DIAS_NA_TELA.map(dia => (
            <Dia key={dia} dia={dia} faixas={rascunho.porDia[dia]} erros={errosPorDia[dia]}
              duracaoMin={rascunho.duracaoMin} intervaloMin={rascunho.intervaloMin}
              aoMudar={faixas => editar(r => ({ ...r, porDia: { ...r.porDia, [dia]: faixas } }))}
              aoCopiar={dia === 'SEGUNDA' ? copiarSegundaParaTercaASexta : null} />
          ))}
        </div>
      </section>

      {/* Fica presa embaixo enquanto a página rola: o botão de salvar está sempre à mão.
          O "bottom" negativo desconta o espaçamento do <main> (p-4 / lg:p-5); sem ele sobra uma fresta embaixo. */}
      <div className="sticky -bottom-4 lg:-bottom-5 z-10 mt-auto -mx-4 -mb-4 lg:-mx-5 lg:-mb-5 px-4 lg:px-5 py-3 bg-white border-t border-gray-200
        flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <p aria-live="polite" className={`mr-auto text-xs ${TOM[status?.tom] || ''}`}>{status?.texto}</p>
        <button type="button" onClick={aoSalvar} disabled={salvando}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar horários'}
        </button>
      </div>
    </>
  )
}

// Um dia da semana: as faixas, os erros e os horários que os pacientes vão ver
function Dia({ dia, faixas, erros, duracaoMin, intervaloMin, aoMudar, aoCopiar }) {
  const nome = NOME_DO_DIA[dia]
  const idTitulo = `dia-${dia}`
  const idErros = `erros-${dia}`
  const comErro = new Set(erros.flatMap(e => e.faixas))
  const horarios = erros.length > 0 ? [] : gerarHorarios(faixas, duracaoMin, intervaloMin)
  const podeAdicionar = faixas.length < LIMITES.faixasPorDia
  const podeCopiar = aoCopiar && faixas.length > 0

  const mudarFaixa = (i, campo, valor) => aoMudar(faixas.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)))

  return (
    <div role="group" aria-labelledby={idTitulo} className="px-4 sm:px-5 py-4 grid gap-x-4 gap-y-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <h3 id={idTitulo} className="text-sm font-medium text-gray-900">{nome}</h3>

      <div className="min-w-0 flex flex-col gap-3">
        {faixas.length === 0 ? (
          <p className="text-xs text-gray-400">Não atende neste dia.</p>
        ) : (
          // Tabelinha Início | Fim | remover. Os títulos ficam em cima (e não um "até" entre os campos)
          // para sobrar largura para a hora no celular com letra grande.
          <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,8rem)_auto] items-center gap-2">
            <span aria-hidden="true" className="text-xs text-gray-500">Início</span>
            <span aria-hidden="true" className="text-xs text-gray-500">Fim</span>
            <span aria-hidden="true" />
            {faixas.map((f, i) => {
              const qual = `${i + 1}ª faixa de ${nome.toLowerCase()}`
              const invalido = comErro.has(i)
              return (
                <React.Fragment key={f.id}>
                  <CampoHora valor={f.horaInicio} rotulo={`Início da ${qual}`} invalido={invalido} idErros={idErros}
                    aoMudar={v => mudarFaixa(i, 'horaInicio', v)} />
                  <CampoHora valor={f.horaFim} rotulo={`Fim da ${qual}`} invalido={invalido} idErros={idErros}
                    aoMudar={v => mudarFaixa(i, 'horaFim', v)} />
                  <button type="button" onClick={() => aoMudar(faixas.filter((_, j) => j !== i))}
                    aria-label={`Remover a ${qual}`} title="Remover faixa"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <IconeRemover className="w-4 h-4" />
                  </button>
                </React.Fragment>
              )
            })}
          </div>
        )}

        {erros.length > 0 && (
          <ul id={idErros} className="text-xs text-red-600 space-y-1">
            {erros.map((e, k) => <li key={k}>{maiuscula(e.texto)}</li>)}
          </ul>
        )}

        {(podeAdicionar || podeCopiar) && (
          <div className="flex flex-wrap gap-2">
            {podeAdicionar && (
              <button type="button" onClick={() => aoMudar([...faixas, novaFaixa(faixas)])}
                className="text-xs text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50">
                + Adicionar faixa de horário
              </button>
            )}
            {podeCopiar && (
              <button type="button" onClick={aoCopiar}
                className="text-xs text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
                Copiar para terça a sexta
              </button>
            )}
          </div>
        )}

        {horarios.length > 0 && (
          <div>
            <p id={`previa-${dia}`} className="text-xs text-gray-500 mb-1.5">
              {horarios.length === 1 ? '1 horário' : `${horarios.length} horários`} para os pacientes:
            </p>
            <ul aria-labelledby={`previa-${dia}`} className="flex flex-wrap gap-1.5">
              {horarios.map(h => (
                <li key={h} className="text-xs tabular-nums px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">{h}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// Abaixo de 640 px, sem o ícone de relógio do Chrome de computador: celular não mostra esse ícone,
// e numa janela estreita ele tomava o lugar dos minutos. Digitar a hora continua funcionando.
function CampoHora({ valor, rotulo, invalido, idErros, aoMudar }) {
  return (
    <input type="time" step="300" value={valor} onChange={e => aoMudar(e.target.value)}
      aria-label={rotulo} aria-invalid={invalido || undefined} aria-describedby={invalido ? idErros : undefined}
      className={`w-full min-w-0 px-2.5 py-2 text-sm tabular-nums border rounded-lg focus:outline-none focus:border-indigo-500
        max-sm:[&::-webkit-calendar-picker-indicator]:hidden ${invalido ? 'border-red-400' : 'border-gray-200'}`} />
  )
}

function Seletor({ id, rotulo, valor, opcoes, texto, aoMudar }) {
  // Valor salvo que não está na lista (definido por outro caminho) entra nela: a tela mostra o valor real
  const lista = opcoes.includes(valor) ? opcoes : [...opcoes, valor].sort((a, b) => a - b)
  return (
    <div className="flex-1 min-w-[11rem] sm:flex-none sm:w-52">
      <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1">{rotulo}</label>
      <select id={id} value={valor} onChange={e => aoMudar(Number(e.target.value))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
        {lista.map(m => <option key={m} value={m}>{texto(m)}</option>)}
      </select>
    </div>
  )
}

// ── Conversões e textos ──────────────────────────────────────

let ultimoId = 0
// Chave de cada faixa na lista: o React precisa dela para não trocar os campos de lugar ao remover uma
const novoId = () => ++ultimoId

// Do formato do servidor (uma lista só) para o da tela (uma lista por dia)
function paraRascunho({ duracaoMin, intervaloMin, faixas }) {
  const porDia = Object.fromEntries(DIAS_SEMANA.map(dia => [dia, []]))
  for (const { diaSemana, horaInicio, horaFim } of faixas) {
    porDia[diaSemana]?.push({ id: novoId(), horaInicio, horaFim })
  }
  return { duracaoMin, intervaloMin, porDia }
}

// Da tela para o servidor: só o que a rota espera
function paraEnvio({ duracaoMin, intervaloMin, porDia }) {
  return {
    duracaoMin,
    intervaloMin,
    faixas: DIAS_SEMANA.flatMap(dia => porDia[dia].map(({ horaInicio, horaFim }) => ({ diaSemana: dia, horaInicio, horaFim })))
  }
}

// Resumo da configuração em texto, para comparar o rascunho com o que está salvo
function assinatura({ duracaoMin, intervaloMin, faixas }) {
  const faixa = f => `${DIAS_SEMANA.indexOf(f.diaSemana)} ${f.horaInicio} ${f.horaFim}`
  return JSON.stringify([duracaoMin, intervaloMin, faixas.map(faixa).sort()])
}

// Faixa nova: 08:00–12:00 no dia vazio; senão, começa 1 hora depois da última e vai até 4 horas
function novaFaixa(faixas) {
  const fins = faixas.map(f => f.horaFim).filter(Boolean).map(paraMinutos).filter(Number.isFinite)
  if (fins.length === 0) return { id: novoId(), horaInicio: '08:00', horaFim: '12:00' }
  const inicio = Math.min(Math.max(...fins) + 60, 22 * 60)
  const fim = Math.min(inicio + 4 * 60, 23 * 60 + 55)
  return { id: novoId(), horaInicio: paraHora(inicio), horaFim: paraHora(fim) }
}

// De quanto em quanto tempo começa uma consulta
function ritmo({ duracaoMin, intervaloMin }) {
  if (intervaloMin === 0) return `Um horário a cada ${duracaoMin} min, uma consulta logo depois da outra.`
  return `Um horário a cada ${duracaoMin + intervaloMin} min: ${duracaoMin} de consulta e ${intervaloMin} de intervalo.`
}

const maiuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1)

function IconeRemover({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8l.6-8.5" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
