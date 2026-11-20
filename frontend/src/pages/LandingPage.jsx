import React from 'react'
import { Link } from 'react-router-dom'
import TemaSwitch from '../components/TemaSwitch'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      {/* Celular: só logo, Entrar e Criar conta. "Funcionalidades" e "Planos" aparecem a partir de 640 px (sm). */}
      {/* flex-wrap: com a letra maior, os botões descem para uma segunda linha em vez de sair da tela */}
      <nav className="border-b border-gray-100 px-4 sm:px-8 min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.2" opacity=".4"/>
              <path d="M8 5v3l2 1.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-base font-medium text-gray-900">Agend<span className="text-indigo-600">ô</span></span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:inline text-sm text-gray-500 cursor-pointer hover:text-gray-800">Funcionalidades</span>
          <span className="hidden sm:inline text-sm text-gray-500 cursor-pointer hover:text-gray-800">Planos</span>
          {/* Tema: no celular, um botão só (claro/escuro); a partir de 640 px, as três opções */}
          <span className="sm:hidden"><TemaSwitch compacto /></span>
          <span className="hidden sm:block"><TemaSwitch /></span>
          <Link to="/login" className="whitespace-nowrap text-sm text-gray-700 border border-gray-200 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-50">Entrar</Link>
          <Link to="/cadastro" className="whitespace-nowrap text-sm text-white bg-indigo-600 px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700">Criar conta</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-indigo-600 px-4 sm:px-8 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-full px-4 py-1.5 mb-6">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-xs text-white">Plataforma para clínicas de psicologia</span>
        </div>
        <h1 className="text-4xl font-medium text-white max-w-xl mx-auto leading-tight mb-4">
          Sua saúde mental,{' '}
          <span className="text-indigo-200">no seu tempo</span>
        </h1>
        <p className="text-indigo-200 text-base max-w-md mx-auto mb-8">
          Agende consultas, acompanhe seu tratamento e mantenha contato com seu psicólogo — tudo em um só lugar.
        </p>
        {/* Celular: botões um embaixo do outro, na largura toda (mais fácil de tocar) */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cadastro" className="text-center px-6 py-3 bg-white text-indigo-700 font-medium rounded-lg text-sm hover:bg-indigo-50">
            Começar agora — é grátis
          </Link>
          <Link to="/login" className="text-center px-6 py-3 border border-white border-opacity-40 text-white rounded-lg text-sm hover:bg-white hover:bg-opacity-10">
            Já tenho conta
          </Link>
        </div>
        {/* Celular e tablet pequeno: números em 2 × 2. A partir de 768 px (md), numa linha só, como antes. */}
        <div className="grid grid-cols-2 gap-6 md:flex md:gap-10 justify-center mt-10 sm:mt-14 pt-8 sm:pt-10 border-t border-white border-opacity-20">
          {/* Só fatos que o sistema cumpre hoje (antes eram números inventados de pacientes e satisfação) */}
          <div><p className="text-xl font-medium text-white">24 h</p><p className="text-xs text-indigo-200 mt-1">para agendar online</p></div>
          <div><p className="text-xl font-medium text-white">50 min</p><p className="text-xs text-indigo-200 mt-1">por sessão</p></div>
          <div><p className="text-xl font-medium text-white">5</p><p className="text-xs text-indigo-200 mt-1">modelos de documento CFP</p></div>
          <div><p className="text-xl font-medium text-white">2</p><p className="text-xs text-indigo-200 mt-1">perfis: paciente e psicólogo</p></div>
        </div>
      </div>

      {/* Funcionalidades */}
      <div className="px-4 sm:px-8 py-12 sm:py-16 bg-gray-50">
        <div className="text-center mb-10">
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-2">Funcionalidades</p>
          <h2 className="text-2xl font-medium text-gray-900">Tudo que uma clínica precisa</h2>
        </div>
        {/* 1 coluna no celular, 2 no tablet, 3 a partir de 1024 px (lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
          {[
            { icon: '📅', title: 'Agendamento online', desc: 'Visualize horários em tempo real e reserve sessões em poucos cliques.' },
            { icon: '📋', title: 'Prontuário digital', desc: 'Anotações e lembretes organizados por paciente com histórico completo.' },
            { icon: '💳', title: 'Pagamento integrado', desc: 'Cartão, PIX ou convênio como garantia do horário agendado.' },
            { icon: '🔔', title: 'Lembretes automáticos', desc: 'Notificações por e-mail e SMS antes de cada consulta.' },
            { icon: '👥', title: 'Cadastro completo', desc: 'Pacientes, psicólogos e psiquiatras com perfis individualizados.' },
            { icon: '📊', title: 'Relatórios da clínica', desc: 'Acompanhe sessões realizadas e receita com painéis visuais.' },
          ].map((f, i) => (
            // Celular: ícone ao lado do texto, para o cartão ficar mais baixo. A partir de 640 px, ícone em cima.
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex gap-4 sm:block">
              <div className="text-2xl sm:mb-3 flex-shrink-0">{f.icon}</div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-900 mb-1 sm:mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Como funciona */}
      <div className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-2">Como funciona</p>
          <h2 className="text-2xl font-medium text-gray-900">Em 4 passos simples</h2>
        </div>
        {/* 2 × 2 no celular e no tablet; os 4 lado a lado a partir de 1024 px */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-6 max-w-3xl mx-auto">
          {[
            { n: '1', title: 'Crie sua conta', desc: 'Cadastre-se gratuitamente em menos de 2 minutos.' },
            { n: '2', title: 'Encontre um profissional', desc: 'Busque por especialidade e veja horários disponíveis.' },
            { n: '3', title: 'Reserve e pague', desc: 'Escolha o horário ideal e pague online para garantir.' },
            { n: '4', title: 'Vá à consulta', desc: 'Receba lembretes automáticos e compareça.' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-sm font-medium text-indigo-600 mx-auto mb-3">{s.n}</div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Planos */}
      <div className="px-4 sm:px-8 py-12 sm:py-16 bg-gray-50">
        <div className="text-center mb-10">
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-2">Planos</p>
          <h2 className="text-2xl font-medium text-gray-900">Simples e transparente</h2>
        </div>
        {/* Celular e tablet: um plano embaixo do outro, com largura limitada. 3 lado a lado a partir de 768 px (md). */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-sm md:max-w-3xl mx-auto">
          {[
            { name: 'Paciente', price: 'Grátis', sub: 'sempre', desc: 'Para quem busca atendimento', items: ['Agendamento online', 'Lembretes automáticos', 'Histórico de consultas'], featured: false },
            { name: 'Profissional', price: 'R$ 89', sub: '/ mês', desc: 'Para psicólogos e psiquiatras', items: ['Agenda completa', 'Prontuário digital', 'Pagamentos integrados', 'Relatórios e métricas'], featured: true },
            { name: 'Clínica', price: 'R$ 249', sub: '/ mês', desc: 'Para equipes e clínicas', items: ['Até 10 profissionais', 'Painel administrativo', 'Tudo do plano Profissional'], featured: false },
          ].map((p, i) => (
            <div key={i} className={`bg-white rounded-xl p-6 ${p.featured ? 'border-2 border-indigo-500' : 'border border-gray-200'}`}>
              {p.featured && <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full inline-block mb-3">Mais popular</div>}
              <h3 className="text-sm font-medium text-gray-900 mb-1">{p.name}</h3>
              <div className="mb-1"><span className="text-2xl font-medium text-gray-900">{p.price}</span><span className="text-sm text-gray-400"> {p.sub}</span></div>
              <p className="text-xs text-gray-400 mb-4">{p.desc}</p>
              {p.items.map((item, j) => (
                <div key={j} className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-green-600" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <span className="text-xs text-gray-600">{item}</span>
                </div>
              ))}
              <Link to="/cadastro" className={`block text-center mt-5 py-2.5 rounded-lg text-sm font-medium ${p.featured ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                {p.featured ? 'Teste grátis 14 dias' : 'Começar'}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 sm:px-8 py-12 sm:py-16 bg-indigo-50 text-center">
        <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-2">Comece hoje</p>
        <h2 className="text-2xl font-medium text-gray-900 mb-2">Pronto para simplificar sua clínica?</h2>
        <p className="text-sm text-gray-500 mb-7">Projeto acadêmico da UNISO, em teste com psicólogos.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cadastro" className="text-center px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Criar conta grátis</Link>
          <Link to="/login" className="text-center px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100">Já tenho conta</Link>
        </div>
      </div>

      {/* Footer: no celular, os três blocos ficam um embaixo do outro, centralizados */}
      <footer className="px-4 sm:px-8 py-6 border-t border-gray-100 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600"></div>
          <span className="text-sm font-medium text-gray-900">Agend<span className="text-indigo-600">ô</span></span>
        </div>
        <p className="text-xs text-gray-400">© 2026 Agendô · Projeto acadêmico</p>
        <div className="flex gap-4">
          <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Privacidade</span>
          <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Termos</span>
          <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Contato</span>
        </div>
      </footer>

    </div>
  )
}