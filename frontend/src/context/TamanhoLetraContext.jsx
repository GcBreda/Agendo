// frontend/src/context/TamanhoLetraContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Tamanho da letra escolhido pela pessoa (botões A− e A+ do topo).
//
// Como funciona: o Tailwind mede quase tudo em rem (letras, espaços, larguras), e 1 rem é o tamanho
// da letra do <html>. Mudando só esse valor, a tela inteira cresce ou diminui junto, sem a letra
// estourar a caixa. O valor vai em porcentagem (100% = o padrão do navegador, normalmente 16 px),
// e não em px, para somar com o ajuste de letra que a pessoa já tenha feito no próprio navegador.
//
// A escolha fica só no navegador (localStorage), como a do tema. Não é dado pessoal e não vai ao servidor.
// O script do index.html aplica o mesmo valor antes da primeira pintura, para a tela não "pular".
//
// Por que vai só até 125%: todas as telas foram conferidas de 87,5% a 150% no celular e no computador.
// Até 125% tudo cabe. A partir de 137,5%, várias telas precisariam ser reorganizadas (o celular
// passa a ter o espaço de uma tela de 260 px). Para mais do que isso, o zoom do navegador (Ctrl +)
// também reorganiza a página.
const CHAVE = 'agendo_tamanho_letra'
export const NIVEIS = [87.5, 100, 112.5, 125] // mesma lista do index.html
export const PADRAO = 100

// Só aceita um valor da lista: o que vier do armazenamento vai para o estilo da página.
function lerNivel() {
  try {
    const salvo = Number(localStorage.getItem(CHAVE))
    return NIVEIS.includes(salvo) ? salvo : PADRAO
  } catch {
    return PADRAO
  }
}

// "112,5%", no formato brasileiro
export const rotuloNivel = nivel => `${nivel.toLocaleString('pt-BR')}%`

const TamanhoLetraContext = createContext(null)

export function TamanhoLetraProvider({ children }) {
  const [nivel, setNivelEstado] = useState(lerNivel)

  // No padrão, tira o estilo e deixa o navegador decidir
  useEffect(() => {
    document.documentElement.style.fontSize = nivel === PADRAO ? '' : `${nivel}%`
  }, [nivel])

  const setNivel = useCallback(novo => {
    if (!NIVEIS.includes(novo)) return
    setNivelEstado(novo)
    try {
      if (novo === PADRAO) localStorage.removeItem(CHAVE)
      else localStorage.setItem(CHAVE, String(novo))
    } catch { /* sem armazenamento: a escolha vale até fechar a aba */ }
  }, [])

  const indice = NIVEIS.indexOf(nivel)
  const valor = {
    nivel,
    podeDiminuir: indice > 0,
    podeAumentar: indice < NIVEIS.length - 1,
    diminuir: () => setNivel(NIVEIS[Math.max(indice - 1, 0)]),
    aumentar: () => setNivel(NIVEIS[Math.min(indice + 1, NIVEIS.length - 1)]),
    restaurar: () => setNivel(PADRAO)
  }

  return <TamanhoLetraContext.Provider value={valor}>{children}</TamanhoLetraContext.Provider>
}

export function useTamanhoLetra() {
  const ctx = useContext(TamanhoLetraContext)
  if (!ctx) throw new Error('useTamanhoLetra deve ser usado dentro de <TamanhoLetraProvider>')
  return ctx
}
