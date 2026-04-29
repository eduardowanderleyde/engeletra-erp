import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import { fmtMoney, fmtDate } from '../utils.js'

const today = () => new Date().toISOString().slice(0, 10)

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function Previsao() {
  const [invoices, setInvoices] = useState([])
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [horizonte, setHorizonte] = useState(30)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [inv, dep] = await Promise.all([api.invoices.list(), api.despesas.list()])
      setInvoices(inv); setDespesas(dep)
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  const limite = addDays(horizonte)
  const hoje   = today()

  const receber = invoices
    .filter(i => i.status !== 'Recebido' && i.status !== 'Cancelado')
    .filter(i => !i.vencimento || i.vencimento <= limite)
    .sort((a, b) => (a.vencimento || '9999') > (b.vencimento || '9999') ? 1 : -1)

  const pagar = despesas
    .filter(d => d.status === 'Pendente')
    .filter(d => !d.data_vencimento || d.data_vencimento <= limite)
    .sort((a, b) => (a.data_vencimento || '9999') > (b.data_vencimento || '9999') ? 1 : -1)

  const totalReceber = receber.reduce((s, i) => s + (i.valor || 0), 0)
  const totalPagar   = pagar.reduce((s, d) => s + (d.valor || 0), 0)
  const saldo        = totalReceber - totalPagar

  const vencidoReceber = receber.filter(i => i.vencimento && i.vencimento < hoje).length
  const vencidoPagar   = pagar.filter(d => d.data_vencimento && d.data_vencimento < hoje).length

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Previsão de Pagamentos</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {[30, 60, 90].map(h => (
            <button key={h} className={`btn btn-sm ${horizonte === h ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setHorizonte(h)}>
              {h} dias
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalReceber)}</div>
          <div className="metric-label">A Receber ({receber.length})</div>
        </div>
        <div className="metric-card metric-red">
          <div className="metric-value">{fmtMoney(totalPagar)}</div>
          <div className="metric-label">A Pagar ({pagar.length})</div>
        </div>
        <div className={`metric-card ${saldo >= 0 ? 'metric-blue' : 'metric-red'}`}>
          <div className="metric-value">{fmtMoney(saldo)}</div>
          <div className="metric-label">Saldo Projetado</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{vencidoReceber + vencidoPagar}</div>
          <div className="metric-label">Vencidos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* A Receber */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span>A RECEBER</span>
            {vencidoReceber > 0 && <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 12 }}>{vencidoReceber} vencida(s)</span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fatura</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr>
              </thead>
              <tbody>
                {receber.length === 0 ? (
                  <tr><td colSpan={4} className="td-center" style={{ fontSize: 13 }}>Tudo em dia!</td></tr>
                ) : receber.map(inv => {
                  const vencido = inv.vencimento && inv.vencimento < hoje
                  return (
                    <tr key={inv.id} style={vencido ? { background: '#fff5f5' } : undefined}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.code}</td>
                      <td style={vencido ? { color: '#ef4444', fontWeight: 600 } : undefined}>
                        {fmtDate(inv.vencimento)}
                        {vencido && ' ⚠'}
                      </td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{fmtMoney(inv.valor)}</td>
                      <td><span className={`badge badge-${inv.status === 'Aberto' ? 'yellow' : 'gray'}`}>{inv.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* A Pagar */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span>A PAGAR</span>
            {vencidoPagar > 0 && <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 12 }}>{vencidoPagar} vencida(s)</span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Categ.</th></tr>
              </thead>
              <tbody>
                {pagar.length === 0 ? (
                  <tr><td colSpan={4} className="td-center" style={{ fontSize: 13 }}>Nada a pagar!</td></tr>
                ) : pagar.map(d => {
                  const vencido = d.data_vencimento && d.data_vencimento < hoje
                  return (
                    <tr key={d.id} style={vencido ? { background: '#fff5f5' } : undefined}>
                      <td>{d.descricao}</td>
                      <td style={vencido ? { color: '#ef4444', fontWeight: 600 } : undefined}>
                        {fmtDate(d.data_vencimento)}
                        {vencido && ' ⚠'}
                      </td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>{fmtMoney(d.valor)}</td>
                      <td style={{ fontSize: 11 }}>{d.categoria}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
