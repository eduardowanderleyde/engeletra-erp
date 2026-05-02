import { useState, useEffect } from 'react'
import './styles/main.css'
import { auth } from './api/index.js'
import Login from './features/Login.jsx'

import Dashboard    from './features/Dashboard.jsx'
import Clients      from './features/Clients.jsx'
import Quotes       from './features/Quotes.jsx'
import ServiceOrders from './features/ServiceOrders.jsx'
import Equipment    from './features/Equipment.jsx'
import Invoices     from './features/Invoices.jsx'
import Stock        from './features/Stock.jsx'
import Obras        from './features/Obras.jsx'
import Tecnicos     from './features/Tecnicos.jsx'
import Ensaios      from './features/Ensaios.jsx'
import Veiculos     from './features/Veiculos.jsx'
import FrotaKm      from './features/FrotaKm.jsx'
import FrotaManut   from './features/FrotaManut.jsx'
import Fornecedores from './features/Fornecedores.jsx'
import Despesas     from './features/Despesas.jsx'
import Contas       from './features/Contas.jsx'
import Caixa        from './features/Caixa.jsx'
import Previsao     from './features/Previsao.jsx'
import Relatorios   from './features/Relatorios.jsx'
import Cronograma   from './features/Cronograma.jsx'
import Ponto        from './features/Ponto.jsx'
import Folha        from './features/Folha.jsx'
import Pedidos          from './features/Pedidos.jsx'
import GerenciarContas  from './features/GerenciarContas.jsx'

const NAV_GROUPS = [
  {
    id: 'operacional',
    label: 'OPERACIONAL',
    items: [
      { key: 'dashboard',      label: 'Painel',              icon: '📊' },
      { key: 'quotes',         label: 'Orçamentos',          icon: '📋' },
      { key: 'service-orders', label: 'Ordens de Serviço',   icon: '🔧' },
      { key: 'ensaios',        label: 'Ensaios Elétricos',   icon: '⚡' },
      { key: 'relatorios',     label: 'Relatórios Técnicos', icon: '📄' },
    ],
  },
  {
    id: 'cadastros',
    label: 'CADASTROS',
    items: [
      { key: 'clients',       label: 'Clientes',      icon: '👤' },
      { key: 'fornecedores',  label: 'Fornecedores',  icon: '🤝' },
      { key: 'equipment',     label: 'Equipamentos',  icon: '⚙️' },
      { key: 'tecnicos',      label: 'Técnicos',      icon: '👷' },
      { key: 'stock',         label: 'Estoque',       icon: '📦' },
    ],
  },
  {
    id: 'frota',
    label: 'FROTA',
    items: [
      { key: 'veiculos',     label: 'Veículos',           icon: '🚗' },
      { key: 'frota-km',     label: 'Controle Diário KM', icon: '📍' },
      { key: 'frota-manut',  label: 'Manutenção Frota',   icon: '🔩' },
    ],
  },
  {
    id: 'financeiro',
    label: 'FINANCEIRO',
    items: [
      { key: 'invoices',  label: 'Faturamento (NF)',    icon: '📃' },
      { key: 'caixa',     label: 'Caixa',               icon: '💰' },
      { key: 'contas',    label: 'Contas Bancárias',    icon: '🏦' },
      { key: 'previsao',  label: 'Previsão Pagamentos', icon: '📅' },
      { key: 'despesas',  label: 'Despesas',            icon: '💸' },
    ],
  },
  {
    id: 'rh',
    label: 'RH',
    items: [
      { key: 'cronograma', label: 'Cronograma',         icon: '📆' },
      { key: 'ponto',      label: 'Controle de Ponto',  icon: '⏰' },
      { key: 'folha',      label: 'Folha de Pagamento', icon: '💼' },
    ],
  },
  {
    id: 'compras',
    label: 'COMPRAS',
    items: [
      { key: 'pedidos', label: 'Pedidos de Compra', icon: '🛒' },
    ],
  },
]

const PAGES = {
  dashboard:        Dashboard,
  clients:          Clients,
  quotes:           Quotes,
  'service-orders': ServiceOrders,
  equipment:        Equipment,
  invoices:         Invoices,
  stock:            Stock,
  obras:            Obras,
  tecnicos:         Tecnicos,
  ensaios:          Ensaios,
  veiculos:         Veiculos,
  'frota-km':       FrotaKm,
  'frota-manut':    FrotaManut,
  fornecedores:     Fornecedores,
  despesas:         Despesas,
  contas:           Contas,
  caixa:            Caixa,
  previsao:         Previsao,
  relatorios:       Relatorios,
  cronograma:       Cronograma,
  ponto:            Ponto,
  folha:            Folha,
  pedidos:          Pedidos,
  'gerenciar-contas': GerenciarContas,
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => !!auth.getToken())
  const [role, setRole] = useState(() => auth.getRole())
  const [page, setPage] = useState('dashboard')
  const [openGroups, setOpenGroups] = useState(
    new Set(['operacional', 'cadastros', 'frota', 'financeiro', 'rh', 'compras'])
  )

  useEffect(() => {
    function onLogout() { setAuthenticated(false) }
    window.addEventListener('engeletra:logout', onLogout)
    return () => window.removeEventListener('engeletra:logout', onLogout)
  }, [])

  if (!authenticated) {
    return <Login onLogin={() => { setAuthenticated(true); setRole(auth.getRole()) }} />
  }

  function toggleGroup(id) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const Page = PAGES[page] || Dashboard

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚡</span>
          <div>
            <div className="brand-name">Engeletra</div>
            <div className="brand-sub">ERP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.id} className="nav-group">
              <button
                className="nav-group-header"
                onClick={() => toggleGroup(group.id)}
              >
                <span>{group.label}</span>
                <span className="nav-group-arrow">
                  {openGroups.has(group.id) ? '▾' : '▸'}
                </span>
              </button>

              {openGroups.has(group.id) && (
                <div className="nav-group-items">
                  {group.items.map(item => (
                    <button
                      key={item.key}
                      className={`nav-btn ${page === item.key ? 'active' : ''}`}
                      onClick={() => setPage(item.key)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {role === 'admin' && (
          <div style={{ padding: '0 8px 8px' }}>
            <button
              className={`nav-btn ${page === 'gerenciar-contas' ? 'active' : ''}`}
              onClick={() => setPage('gerenciar-contas')}
              style={{ width: '100%' }}
            >
              <span className="nav-icon">👥</span>
              <span>Gerenciar Contas</span>
            </button>
          </div>
        )}

        <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>v0.4.0</span>
          <button
            onClick={() => auth.logout()}
            title="Sair"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}
          >
            ⏻
          </button>
        </div>
      </aside>

      <div className="content-area">
        <Page />
      </div>
    </div>
  )
}
