// frontend/src/components/TemaSwitch.jsx
import React from 'react'
import { useTema } from '../context/TemaContext'

const OPCOES = [
  { valor: 'claro',   rotulo: 'Tema claro',                          Icone: SolIcon },
  { valor: 'sistema', rotulo: 'Automático: segue o tema do sistema', Icone: AutoIcon },
  { valor: 'escuro',  rotulo: 'Tema escuro',                         Icone: LuaIcon }
]

const FOCO = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'

// Botão de tema do topo das telas: claro, automático (padrão) ou escuro.
// compacto: um botão só, que alterna entre claro e escuro, para onde falta espaço
// (o topo da página inicial no celular).
export default function TemaSwitch({ compacto = false }) {
  const { tema, escuro, setTema } = useTema()

  if (compacto) {
    const rotulo = escuro ? 'Usar tema claro' : 'Usar tema escuro'
    const Icone = escuro ? SolIcon : LuaIcon
    return (
      <button type="button" onClick={() => setTema(escuro ? 'claro' : 'escuro')}
        aria-label={rotulo} title={rotulo}
        className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 ${FOCO}`}>
        <Icone className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div role="group" aria-label="Tema" className="flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100">
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativo = tema === valor
        return (
          <button key={valor} type="button" onClick={() => setTema(valor)}
            aria-pressed={ativo} aria-label={rotulo} title={rotulo}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${FOCO}
              ${ativo ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            <Icone className="w-4 h-4" />
          </button>
        )
      })}
    </div>
  )
}

function SolIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function AutoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="currentColor"/>
    </svg>
  )
}

function LuaIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.6 9.7A5.6 5.6 0 0 1 6.3 2.4a5.6 5.6 0 1 0 7.3 7.3z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
