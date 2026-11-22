import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import TemaSwitch from '../TemaSwitch'
import TamanhoLetraControle from '../TamanhoLetraControle'
import TutorialComoUsar, { IconeAjuda } from '../TutorialComoUsar'

const navPaciente = [
  { path: '/paciente',           label: 'Início',           icon: GridIcon },
  { path: '/paciente/consultas', label: 'Minhas consultas', icon: CalIcon },
  { path: '/paciente/agendar',   label: 'Agendar consulta', icon: PlusIcon },
  { path: '/paciente/historico', label: 'Histórico',        icon: ClockIcon }
]

const navProfissional = [
  { path: '/profissional',              label: 'Visão geral',    icon: GridIcon },
  { path: '/profissional/agenda',       label: 'Agenda',         icon: CalIcon },
  { path: '/profissional/horarios',     label: 'Meus horários',  icon: ClockIcon },
  { path: '/profissional/pacientes',    label: 'Pacientes',      icon: UsersIcon },
  { path: '/profissional/prontuarios',  label: 'Prontuários',    icon: DocIcon },
  { path: '/profissional/financeiro',   label: 'Financeiro',     icon: CardIcon },
  { path: '/profissional/codigo-etica', label: 'Código de Ética', icon: BookIcon },
  { path: '/profissional/dsm5', label: 'DSM-5', icon: BrainIcon },
  { path: '/profissional/documentos-cfp', label: 'Documentos CFP', icon: FileIcon }
]

export default function DashboardLayout({ children, titulo }) {
  const { usuario, logout, isPaciente } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const nav = isPaciente ? navPaciente : navProfissional

  // Gaveta do menu em telas menores que lg (1024 px). A partir de lg a barra fica sempre visível.
  const [menuAberto, setMenuAberto] = useState(false)
  const botaoMenuRef = useRef(null)

  // Fecha ao navegar para outra página
  useEffect(() => {
    setMenuAberto(false)
  }, [location.pathname])

  // Fecha com Esc e devolve o foco ao botão de menu
  useEffect(() => {
    if (!menuAberto) return
    function aoApertarTecla(evento) {
      if (evento.key === 'Escape') {
        setMenuAberto(false)
        botaoMenuRef.current?.focus()
      }
    }
    document.addEventListener('keydown', aoApertarTecla)
    return () => document.removeEventListener('keydown', aoApertarTecla)
  }, [menuAberto])

  // Guia "Como usar": abre sozinho na primeira vez de cada perfil neste navegador e pelo botão "?".
  // A marca de "já viu" é por perfil (paciente ou profissional), e não por pessoa: assim o navegador
  // não guarda a lista de quem já entrou nele (importa em computador compartilhado).
  const chaveGuia = isPaciente ? 'agendo_tutorial_visto_paciente' : 'agendo_tutorial_visto_profissional'
  const [guiaAberto, setGuiaAberto] = useState(() => !jaViuGuia(chaveGuia))
  const botaoAjudaRef = useRef(null)

  function fecharGuia() {
    setGuiaAberto(false)
    try { localStorage.setItem(chaveGuia, '1') } catch { /* sem armazenamento: abre de novo na próxima entrada */ }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const iniciais = usuario?.nome
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div className="flex h-dvh bg-gray-50 overflow-hidden">
      {/* Fundo escurecido: só abaixo de lg e com a gaveta aberta. Tocar nele fecha. */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      {/* Abaixo de lg: gaveta fixa que desliza da esquerda. "invisible" tira os links do Tab quando fechada.
          A partir de lg: static e sempre visível, como antes. */}
      <aside
        id="menu-lateral"
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0
          transition-[transform,visibility] duration-200 ease-out
          lg:static lg:z-auto lg:translate-x-0 lg:visible lg:transition-none
          ${menuAberto ? 'translate-x-0 visible' : '-translate-x-full invisible'}`}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 16 16" fill="none">
              <path d="M8 5v3l2 1.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.2" opacity=".35"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">
            Agend<span className="text-indigo-600">ô</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {nav.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path} to={path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs mb-0.5 transition-colors
                  ${active
                    ? 'bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600 rounded-l-none'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 px-3 py-3">
          {/* Celular (abaixo de 640 px): o tamanho da letra fica aqui, porque no topo não cabe */}
          <div className="sm:hidden mb-3">
            <p className="text-xs text-gray-500 mb-1.5">Tamanho da letra</p>
            <TamanhoLetraControle largo />
          </div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center justify-center flex-shrink-0">
              {iniciais}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{usuario?.nome}</p>
              <p className="text-xs text-gray-400 truncate">{isPaciente ? 'Paciente' : 'Profissional'}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Link to="/configuracoes" className="flex-1 text-center text-xs text-gray-400 hover:text-gray-700 py-1.5 rounded-md hover:bg-gray-50">
              Config.
            </Link>
            <button onClick={handleLogout} className="flex-1 text-center text-xs text-gray-400 hover:text-red-600 py-1.5 rounded-md hover:bg-red-50">
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 h-12 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              ref={botaoMenuRef}
              type="button"
              onClick={() => setMenuAberto(aberto => !aberto)}
              className="lg:hidden -ml-2.5 p-2.5 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              aria-label="Menu de navegação"
              aria-expanded={menuAberto}
              aria-controls="menu-lateral"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <h1 className="text-sm font-medium text-gray-900 truncate">{titulo}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="hidden lg:block text-xs text-gray-400 mr-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <div className="hidden sm:block"><TamanhoLetraControle /></div>
            <TemaSwitch />
            <button
              ref={botaoAjudaRef}
              type="button"
              onClick={() => setGuiaAberto(true)}
              aria-label="Como usar o Agendô"
              title="Como usar o Agendô"
              aria-haspopup="dialog"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <IconeAjuda className="w-[1.125rem] h-[1.125rem]" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 flex flex-col gap-4">
          {children}
        </main>
      </div>

      {guiaAberto && (
        <TutorialComoUsar perfil={usuario?.perfil} aoFechar={fecharGuia} devolverFocoPara={botaoAjudaRef} />
      )}
    </div>
  )
}

// Sem acesso ao armazenamento do navegador, conta como "já viu": melhor do que abrir em toda tela
function jaViuGuia(chave) {
  try { return localStorage.getItem(chave) === '1' } catch { return true }
}

function GridIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity=".8"/>
      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity=".8"/>
      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity=".4"/>
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity=".4"/>
    </svg>
  )
}

function CalIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function UsersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M12 7l1.5 1.5L16 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DocIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function CardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 8h14" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
function BrainIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M8 2C5.8 2 4 3.8 4 6c0 1.1.4 2 1.1 2.7C4.4 9.2 4 10.1 4 11c0 1.7 1.3 3 3 3h2c1.7 0 3-1.3 3-3 0-.9-.4-1.8-1.1-2.3C11.6 8 12 7.1 12 6c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8 2v12M5 7h6M5 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
function FileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 1v4h4M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
