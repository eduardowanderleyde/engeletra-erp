import { useState } from 'react'
import './styles/main.css'
import Dashboard from './features/Dashboard.jsx'
import Clients from './features/Clients.jsx'
import Quotes from './features/Quotes.jsx'
import ServiceOrders from './features/ServiceOrders.jsx'
import Equipment from './features/Equipment.jsx'
import Invoices from './features/Invoices.jsx'
import Stock from './features/Stock.jsx'
import Obras from './features/Obras.jsx'
import Tecnicos from './features/Tecnicos.jsx'
import Ensaios from './features/Ensaios.jsx'
import Veiculos from './features/Veiculos.jsx'
import FrotaKm from './features/FrotaKm.jsx'
import ComingSoon from './components/ComingSoon.jsx'

const NAV_GROUPS = [
  {
    id: 'operacional',
    label: 'OPERACIONAL',
    items: [
      { key: 'dashboard',      label: 'Painel',             icon: '📊' },
      { key: 'quotes',         label: 'Orçamentos',         icon: '📋' },
      { key: 'service-orders', label: 'Ordens de Serviço',  icon: '🔧' },
      { key: 'obras',          label: 'Obras & Projetos',   icon: '🏗️' },
      { key: 'ensaios',        label: 'Ensaios Elétricos',  icon: '⚡' },
      { key: 'relatorios',     label: 'Relatórios Técnicos',icon: '📄' },
    ],
  },
  {
    id: 'cadastros',
    label: 'CADASTROS',
    items: [
      { key: 'clients',    label: 'Clientes',     icon: '👤' },
      { key: 'fornecedores', label: 'Fornecedores', icon: '🤝' },
      { key: 'equipment',  label: 'Equipamentos', icon: '⚙️' },
      { key: 'tecnicos',   label: 'Técnicos',     icon: '👷' },
      { key: 'stock',      label: 'Estoque',      icon: '📦' },
    ],
  },
  {
    id: 'frota',
    label: 'FROTA',
    items: [
      { key: 'veiculos',      label: 'Veículos',          icon: '🚗' },
      { key: 'frota-km',      label: 'Controle Diário KM', icon: '📍' },
      { key: 'frota-manut',   label: 'Manutenção Frota',  icon: '🔩' },
    ],
  },
  {
    id: 'financeiro',
    label: 'FINANCEIRO',
    items: [
      { key: 'invoices',    label: 'Faturamento (NF)',     icon: '📃' },
      { key: 'caixa',       label: 'Caixa',               icon: '💰' },
      { key: 'contas',      label: 'Contas Bancárias',     icon: '🏦' },
      { key: 'previsao',    label: 'Previsão Pagamentos',  icon: '📅' },
      { key: 'despesas',    label: 'Despesas',             icon: '💸' },
    ],
  },
  {
    id: 'rh',
    label: 'RH',
    items: [
      { key: 'cronograma', label: 'Cronograma',        icon: '📆' },
      { key: 'ponto',      label: 'Controle de Ponto', icon: '⏰' },
      { key: 'folha',      label: 'Folha de Pagamento',icon: '💼' },
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
  dashboard:       Dashboard,
  clients:         Clients,
  quotes:          Quotes,
  'service-orders': ServiceOrders,
  equipment:       Equipment,
  invoices:        Invoices,
  stock:           Stock,
  obras:           Obras,
  tecnicos:        Tecnicos,
  ensaios:         Ensaios,
  veiculos:        Veiculos,
  'frota-km':      FrotaKm,
  relatorios:  () => <ComingSoon title="Relatórios Técnicos" desc="Laudos automáticos em PDF gerados a partir dos Ensaios Elétricos. Cada laudo seguirá o modelo R001 da Engeletra com dados do equipamento, resultados dos testes e conclusão técnica." />,
  fornecedores: () => <ComingSoon title="Fornecedores" desc="Cadastro de fornecedores com CNPJ, contatos, histórico de compras e condições de pagamento. Vinculado aos Pedidos de Compra." />,
  'frota-manut': () => <ComingSoon title="Manutenção de Frota" desc="Registro de manutenções preventivas e corretivas por veículo. Alertas automáticos por quilometragem ou data." />,
  caixa:        () => <ComingSoon title="Caixa" desc="Registro diário de entradas e saídas do caixa geral, por centro de custo e obra. Baseado no modelo Caixa 2026 da Engeletra." />,
  contas:       () => <ComingSoon title="Contas Bancárias" desc="Conciliação dos 3 bancos (BB, BNB, Bradesco) com lançamentos, amortizações de empréstimos e aplicações." />,
  previsao:     () => <ComingSoon title="Previsão de Pagamentos" desc="Planejamento de pagamentos dos próximos 30 dias: boletos, guias, faturas, seguros e obrigações fiscais." />,
  despesas:     () => <ComingSoon title="Despesas Realizadas" desc="Registro de despesas com fornecedor, data, documento, vencimento e pagamento. Inclui guias de imposto (DARF, GPS, ISS)." />,
  cronograma:   () => <ComingSoon title="Cronograma de Obras" desc="Alocação mensal de técnicos por obra, com controle de férias, atestados e ausências." />,
  ponto:        () => <ComingSoon title="Controle de Ponto" desc="Registro diário de entrada, almoço e saída por técnico. Cálculo automático de horas extras (1,34x) e noturnas (1,5x)." />,
  folha:        () => <ComingSoon title="Folha de Pagamento" desc="Consolidação mensal com salário base, horas extras, descontos e líquido por técnico." />,
  pedidos:      () => <ComingSoon title="Pedidos de Compra" desc="Emissão e controle de POs para fornecedores, vinculados a obras e ordens de serviço. Baseado no modelo Ped-008 da Engeletra." />,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [openGroups, setOpenGroups] = useState(
    new Set(['operacional', 'cadastros', 'frota', 'financeiro', 'rh', 'compras'])
  )

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

        <div className="sidebar-footer">v0.3.0</div>
      </aside>

      <div className="content-area">
        <Page />
      </div>
    </div>
  )
}
