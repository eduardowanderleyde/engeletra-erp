import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [inv, cl] = await Promise.all([api.invoices.list(), api.clients.list()])
      setInvoices(inv)
      setClients(cl)
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function clientName(id) {
    const c = clients.find(c => c.id === id)
    return c ? (c.fantasia || c.razao) : '—'
  }

  const totalAberto = invoices.filter(i => i.status === 'Aberto').reduce((s, i) => s + i.valor, 0)
  const totalPago = invoices.filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Faturas</h1>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{invoices.length}</div>
          <div className="metric-label">Total de Faturas</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{fmtMoney(totalAberto)}</div>
          <div className="metric-label">Em Aberto</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalPago)}</div>
          <div className="metric-label">Recebido</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Emissão</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="td-center">Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="td-center">Nenhuma fatura. Conclua uma OS para gerar faturas automaticamente.</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id}>
                <td><strong>{inv.code}</strong></td>
                <td>{clientName(inv.client_id)}</td>
                <td><strong>{fmtMoney(inv.valor)}</strong></td>
                <td>{fmtDate(inv.emissao)}</td>
                <td>{fmtDate(inv.vencimento)}</td>
                <td><span className={`badge badge-${statusColor(inv.status)}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
