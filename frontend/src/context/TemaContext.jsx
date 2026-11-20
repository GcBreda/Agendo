// frontend/src/context/TemaContext.jsx
import React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Três opções de tema:
// - 'sistema': segue o tema do celular ou do computador (é o padrão) e muda junto com ele;
// - 'claro' e 'escuro': a escolha da pessoa, que vale mesmo se o sistema mudar.
// A escolha fica só neste navegador (localStorage). Não é dado pessoal sensível nem vai para o servidor.
const CHAVE = 'agendo_tema'
const consultaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)')

const TemaContext = createContext(null)

function lerEscolha() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo === 'claro' || salvo === 'escuro' ? salvo : 'sistema'
  } catch {
    return 'sistema' // navegador sem armazenamento (ex.: janela privada com bloqueio)
  }
}

export function TemaProvider({ children }) {
  const [tema, setTemaEstado] = useState(lerEscolha)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => consultaEscuro().matches)

  // Se a pessoa troca o tema do sistema com o site aberto, o modo automático acompanha na hora
  useEffect(() => {
    const consulta = consultaEscuro()
    const aoMudar = evento => setSistemaEscuro(evento.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  const escuro = tema === 'escuro' || (tema === 'sistema' && sistemaEscuro)

  // A classe "dark" no <html> liga as cores de src/tema-escuro.css
  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
  }, [escuro])

  const setTema = useCallback(novo => {
    setTemaEstado(novo)
    try {
      if (novo === 'sistema') localStorage.removeItem(CHAVE)
      else localStorage.setItem(CHAVE, novo)
    } catch { /* sem armazenamento: a escolha vale só até fechar a página */ }
  }, [])

  return (
    <TemaContext.Provider value={{ tema, escuro, setTema }}>
      {children}
    </TemaContext.Provider>
  )
}

export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema deve ser usado dentro de <TemaProvider>')
  return ctx
}
