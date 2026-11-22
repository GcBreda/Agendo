// frontend/src/components/TutorialComoUsar.jsx
import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TamanhoLetraControle from './TamanhoLetraControle'
import TemaSwitch from './TemaSwitch'

// Guia "Como usar o Agendô": uma janela com poucos passos, diferente para paciente e para profissional.
// Abre sozinho na primeira entrada de cada perfil neste navegador e de novo pelo botão "?" do topo
// (quem decide quando abrir é o DashboardLayout).
//
// Acessibilidade da janela:
// - role="dialog" + aria-modal: o leitor de tela anuncia que é uma janela e lê o título;
// - o resto da página fica "inert" enquanto ela está aberta: não recebe clique, Tab nem leitor de tela;
// - Tab circula só dentro da janela, Esc fecha, e o foco volta para o botão "?" ao fechar;
// - ao trocar de passo, o texto novo é anunciado (aria-live) sem tirar o foco do botão.
//
// Ao mudar uma tela do sistema, confira se o passo que fala dela continua certo.

const STATUS = [
  ['Pendente', 'bg-amber-50 text-amber-700'],
  ['Confirmada', 'bg-indigo-50 text-indigo-700'],
  ['Realizada', 'bg-green-50 text-green-700'],
  ['Cancelada', 'bg-red-50 text-red-600']
]

const PASSOS = {
  PACIENTE: [
    {
      titulo: 'Boas-vindas ao Agendô',
      topo: <Marca />,
      corpo: <>
        <p>Aqui você agenda suas consultas e acompanha suas sessões. Em 4 passos, este guia mostra o essencial.</p>
        <p>O menu fica à esquerda. No celular, ele abre no botão <NoTexto rotulo="Menu de navegação"><IconeMenu /></NoTexto>.</p>
        <p>Para ver este guia de novo, toque em <NoTexto rotulo="Como usar o Agendô"><IconeAjuda /></NoTexto> no topo da tela.</p>
      </>
    },
    {
      titulo: 'Agende uma consulta',
      corpo: (
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>No menu, abra <R>Agendar consulta</R>.</li>
          <li>Escolha o profissional e toque em <R>Continuar</R>.</li>
          <li>Escolha a data, um horário livre e o tipo de sessão. Os horários ocupados aparecem riscados.</li>
          <li>Confira o resumo e toque em <R>Confirmar</R>.</li>
        </ol>
      )
    },
    {
      titulo: 'Acompanhe suas consultas',
      corpo: <>
        <p>Em <R>Minhas consultas</R> ficam as próximas sessões. Se não puder ir, toque em <R>Cancelar</R> na consulta.</p>
        <p>No <R>Histórico</R> ficam as sessões que já passaram, com busca e filtro.</p>
        <LegendaStatus />
      </>
    },
    {
      titulo: 'Deixe do seu jeito',
      corpo: <>
        <p><R>A−</R> e <R>A+</R> mudam o tamanho da letra. O tema pode ser claro, escuro ou automático, que segue o do seu aparelho. No celular, o tamanho da letra fica dentro do menu.</p>
        <p>Em computador compartilhado, toque em <R>Sair</R> ao terminar.</p>
        <p>Experimente aqui:</p>
      </>,
      aoVivo: true
    }
  ],
  PROFISSIONAL: [
    {
      titulo: 'Boas-vindas ao Agendô',
      topo: <Marca />,
      corpo: <>
        <p>Aqui você organiza a agenda, acompanha seus pacientes e consulta material de apoio. Em 5 passos, este guia mostra o essencial.</p>
        <p>O menu fica à esquerda. Em telas menores, ele abre no botão <NoTexto rotulo="Menu de navegação"><IconeMenu /></NoTexto>.</p>
        <p>Para ver este guia de novo, clique em <NoTexto rotulo="Como usar o Agendô"><IconeAjuda /></NoTexto> no topo da tela.</p>
      </>
    },
    {
      titulo: 'Seu dia e sua semana',
      corpo: <>
        <p>A <R>Visão geral</R> mostra as consultas de hoje e as próximas.</p>
        <p>Na <R>Agenda</R>, use <R>‹</R> e <R>›</R> para trocar de semana e <R>Hoje</R> para voltar. Depois do horário da sessão, marque <R>Realizada</R>. Se ela não for acontecer, clique em <R>Cancelar</R>.</p>
        <p>Em <R>Meus horários</R>, escolha os dias e as faixas em que atende, a duração da consulta e o intervalo. Os pacientes só marcam nesses horários.</p>
        <LegendaStatus />
      </>
    },
    {
      titulo: 'Seus pacientes',
      corpo: <>
        <p>Em <R>Pacientes</R>, busque por nome ou e-mail e clique em <R>Ver</R> para abrir o histórico de sessões, a próxima consulta e o convênio, quando houver.</p>
        {/* Tirar este aviso quando a leitura e a gravação do prontuário voltarem (Tarefas 9 e 10) */}
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          O prontuário está em finalização nesta versão de teste: por enquanto, as anotações não ficam salvas.
        </p>
      </>
    },
    {
      titulo: 'Financeiro e material de apoio',
      corpo: <>
        <p>O <R>Financeiro</R> mostra a receita do mês e as sessões dos últimos 6 meses.</p>
        <p><R>Código de Ética</R>, <R>DSM-5</R> e <R>Documentos CFP</R> são consultas rápidas, com busca. Em Documentos CFP, cada documento tem um modelo pronto para copiar e preencher.</p>
      </>
    },
    {
      titulo: 'Deixe do seu jeito',
      corpo: <>
        <p><R>A−</R> e <R>A+</R> mudam o tamanho da letra. O tema pode ser claro, escuro ou automático, que segue o do seu computador. No celular, o tamanho da letra fica dentro do menu.</p>
        <p>Em computador compartilhado, clique em <R>Sair</R> ao terminar: os dados dos pacientes são sigilosos.</p>
        <p>Experimente aqui:</p>
      </>,
      aoVivo: true
    }
  ]
}

export default function TutorialComoUsar({ perfil, aoFechar, devolverFocoPara }) {
  const passos = PASSOS[perfil] || PASSOS.PACIENTE
  const [i, setI] = useState(0)
  const janelaRef = useRef(null)
  const principalRef = useRef(null)
  const idTitulo = useId()
  const idCorpo = useId()

  const passo = passos[i]
  const primeiro = i === 0
  const ultimo = i === passos.length - 1

  // Ao abrir: o resto da página fica inerte e o foco vai para o botão principal.
  // Ao fechar: a página volta ao normal e o foco volta para o botão "?".
  useEffect(() => {
    const raiz = document.getElementById('root')
    raiz?.setAttribute('inert', '')
    principalRef.current?.focus()
    return () => {
      raiz?.removeAttribute('inert')
      devolverFocoPara?.current?.focus()
    }
  }, [devolverFocoPara])

  // Esc fecha; Tab e Shift+Tab dão a volta dentro da janela
  useEffect(() => {
    function aoApertarTecla(evento) {
      if (evento.key === 'Escape') { evento.preventDefault(); aoFechar(); return }
      if (evento.key !== 'Tab' || !janelaRef.current) return
      const focaveis = [...janelaRef.current.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.disabled && el.getClientRects().length > 0)
      if (!focaveis.length) return
      const [inicio, fim] = [focaveis[0], focaveis[focaveis.length - 1]]
      const dentro = janelaRef.current.contains(document.activeElement)
      if (evento.shiftKey && (!dentro || document.activeElement === inicio)) { evento.preventDefault(); fim.focus() }
      else if (!evento.shiftKey && (!dentro || document.activeElement === fim)) { evento.preventDefault(); inicio.focus() }
    }
    document.addEventListener('keydown', aoApertarTecla)
    return () => document.removeEventListener('keydown', aoApertarTecla)
  }, [aoFechar])

  // Quando o botão que tinha o foco some (o "Voltar" no 1º passo), o foco vai para o botão principal
  useEffect(() => {
    if (janelaRef.current && !janelaRef.current.contains(document.activeElement)) principalRef.current?.focus()
  }, [i])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-3 sm:p-4">
      <div ref={janelaRef} role="dialog" aria-modal="true" aria-labelledby={idTitulo} aria-describedby={idCorpo}
        tabIndex={-1}
        className="flex w-full max-w-md max-h-[90dvh] flex-col rounded-xl border border-gray-100 bg-white shadow-xl focus:outline-none motion-safe:animate-surgir">

        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-4 pt-3 sm:px-5">
          <p id={idTitulo} className="text-xs font-medium text-indigo-600">Como usar o Agendô</p>
          <button type="button" onClick={aoFechar} aria-label="Fechar o guia" title="Fechar o guia"
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">
          {/* aria-live: ao avançar, o leitor de tela lê o passo novo */}
          <div aria-live="polite" aria-atomic="true">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden="true">
                {passos.map((_, n) => (
                  <span key={n} className={`h-1.5 rounded-full ${n === i ? 'w-5 bg-indigo-600' : 'w-1.5 bg-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs tabular-nums text-gray-500">{i + 1} de {passos.length}</span>
            </div>
            {passo.topo}
            <h2 className="text-base font-medium text-gray-900">{passo.titulo}</h2>
            <div id={idCorpo} className="mt-2 space-y-3 text-sm leading-relaxed text-gray-600">{passo.corpo}</div>
          </div>
          {passo.aoVivo && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <TamanhoLetraControle />
              <TemaSwitch />
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
          {/* key diferente: sem ela o React reaproveitaria o mesmo botão, e quem apertou "Voltar"
              com o teclado ficaria com o foco num "Pular" (que fecha o guia) */}
          {primeiro ? (
            <button key="pular" type="button" onClick={aoFechar}
              className="-ml-2 mr-auto rounded-lg px-2 py-2 text-sm text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              Pular
            </button>
          ) : (
            <button key="voltar" type="button" onClick={() => setI(n => n - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              Voltar
            </button>
          )}
          <button ref={principalRef} type="button" onClick={ultimo ? aoFechar : () => setI(n => n + 1)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
            {ultimo ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Nome de botão ou de item do menu, como aparece na tela
function R({ children }) {
  return <span className="whitespace-nowrap rounded bg-gray-100 px-1 py-0.5 font-medium text-gray-800">{children}</span>
}

// Ícone no meio do texto, com o mesmo nome que o botão de verdade tem para o leitor de tela
function NoTexto({ rotulo, children }) {
  return (
    <span role="img" aria-label={rotulo}
      className="inline-flex h-[1.5em] w-[1.5em] items-center justify-center rounded bg-gray-100 align-middle text-gray-700">
      {children}
    </span>
  )
}

function LegendaStatus() {
  return (
    <div>
      <p className="mb-2 text-xs text-gray-500">A cor mostra a situação de cada consulta:</p>
      <ul className="flex flex-wrap gap-1.5">
        {STATUS.map(([rotulo, cores]) => (
          <li key={rotulo} className={`rounded-full px-2.5 py-1 text-xs font-medium ${cores}`}>{rotulo}</li>
        ))}
      </ul>
    </div>
  )
}

function Marca() {
  return (
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600" aria-hidden="true">
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="none">
        <path d="M8 5v3l2 1.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.2" opacity=".35" />
      </svg>
    </div>
  )
}

function IconeMenu({ className = 'h-[0.9em] w-[0.9em]' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Também usado no botão "?" do topo (DashboardLayout)
export function IconeAjuda({ className = 'h-[0.95em] w-[0.95em]' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.2 6.3a1.85 1.85 0 0 1 3.6.6c0 1.2-1.8 1.5-1.8 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r=".85" fill="currentColor" />
    </svg>
  )
}
