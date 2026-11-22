// frontend/src/components/TamanhoLetraControle.jsx
import React from 'react'
import { useTamanhoLetra, rotuloNivel, PADRAO } from '../context/TamanhoLetraContext'

const FOCO = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'

// Botões A− e A+ do topo das telas. O número do meio mostra o tamanho atual;
// tocar nele volta ao padrão (100%).
// largo: ocupa a largura toda, com botões mais altos, para o menu do celular.
export default function TamanhoLetraControle({ largo = false }) {
  const { nivel, podeDiminuir, podeAumentar, diminuir, aumentar, restaurar } = useTamanhoLetra()
  const atual = rotuloNivel(nivel)
  const tamanhoBotao = largo ? 'flex-1 h-9' : 'w-7 h-7'

  return (
    <div role="group" aria-label="Tamanho da letra"
      className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 ${largo ? 'w-full' : ''}`}>
      <Botao rotulo="Diminuir a letra" desativado={!podeDiminuir} apagado={!podeDiminuir} onClick={diminuir}
        className={tamanhoBotao}>
        <span className="text-[0.7rem] font-semibold leading-none">A−</span>
      </Botao>
      {/* No padrão, o número fica legível (é informação), só não faz nada ao tocar */}
      <Botao
        rotulo={nivel === PADRAO ? 'Tamanho da letra: 100%, o padrão' : `Tamanho da letra: ${atual}. Voltar ao padrão`}
        desativado={nivel === PADRAO} onClick={restaurar}
        className={`${largo ? 'h-9 px-2' : 'h-7 px-1'} min-w-[2.75rem] text-xs tabular-nums`}>
        {atual}
      </Botao>
      <Botao rotulo="Aumentar a letra" desativado={!podeAumentar} apagado={!podeAumentar} onClick={aumentar}
        className={tamanhoBotao}>
        <span className="text-sm font-semibold leading-none">A+</span>
      </Botao>
      {/* O botão apertado continua com o mesmo nome; isto avisa o leitor de tela do tamanho novo */}
      <span className="sr-only" aria-live="polite">Letra em {atual}</span>
    </div>
  )
}

// aria-disabled em vez de disabled: no fim da escala o botão continua com o foco do teclado
// (um botão desativado perde o foco, e quem usa Tab ficaria "perdido" na página).
// apagado: aparência de desativado (A− no menor tamanho, A+ no maior).
function Botao({ rotulo, desativado, apagado = false, onClick, className, children }) {
  return (
    <button type="button" onClick={desativado ? undefined : onClick}
      aria-label={rotulo} title={rotulo} aria-disabled={desativado || undefined}
      className={`flex items-center justify-center rounded-md transition-colors ${FOCO} ${className}
        ${desativado ? 'cursor-default' : 'hover:bg-white hover:text-gray-800'}
        ${apagado ? 'text-gray-500 opacity-40' : 'text-gray-600'}`}>
      {children}
    </button>
  )
}
