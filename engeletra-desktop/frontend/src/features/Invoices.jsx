import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

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

  function parseImpostos(inv) {
    if (inv.impostos) {
      try { return JSON.parse(inv.impostos) } catch { }
    }
    // backward compat: build from individual columns
    const list = []
    if (inv.inss   > 0) list.push({ nome: 'INSS',   percentual: 11.0,  valor: inv.inss   })
    if (inv.iss    > 0) list.push({ nome: 'ISS',    percentual: 5.0,   valor: inv.iss    })
    if (inv.pis    > 0) list.push({ nome: 'PIS',    percentual: 0.65,  valor: inv.pis    })
    if (inv.cofins > 0) list.push({ nome: 'COFINS', percentual: 3.0,   valor: inv.cofins })
    if (inv.csll   > 0) list.push({ nome: 'CSLL',   percentual: 1.0,   valor: inv.csll   })
    if (inv.irpj   > 0) list.push({ nome: 'IRPJ',   percentual: 1.5,   valor: inv.irpj   })
    return list
  }

  const totalAberto = invoices.filter(i => i.status === 'Aberto').reduce((s, i) => s + i.valor, 0)
  const totalPago   = invoices.filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0)
  const totalLiq    = invoices.reduce((s, i) => s + (i.valor_liquido || i.valor), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Faturas</h1>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{invoices.length}</div>
          <div className="metric-label">Total de Faturas</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{fmtMoney(totalAberto)}</div>
          <div className="metric-label">Em Aberto (bruto)</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalPago)}</div>
          <div className="metric-label">Recebido (bruto)</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: '#16a34a' }}>{fmtMoney(totalLiq)}</div>
          <div className="metric-label">Total Líquido</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Valor Bruto</th>
              <th>Impostos</th>
              <th>Valor Líquido</th>
              <th>Emissão</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td-center">Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhuma fatura. Conclua uma OS para gerar faturas automaticamente.</td></tr>
            ) : invoices.map(inv => {
              const imps      = parseImpostos(inv)
              const totalImps = imps.reduce((s, i) => s + i.valor, 0)
              const liquido   = inv.valor_liquido || (inv.valor - totalImps)
              const isOpen    = expanded === inv.id

              return (
                <>
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : inv.id)}>
                    <td><strong>{inv.code}</strong></td>
                    <td>{clientName(inv.client_id)}</td>
                    <td><strong>{fmtMoney(inv.valor)}</strong></td>
                    <td>
                      {totalImps > 0
                        ? <span style={{ color: '#ef4444', fontSize: 13 }}>- {fmtMoney(totalImps)}</span>
                        : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                    </td>
                    <td><strong style={{ color: '#16a34a' }}>{fmtMoney(liquido)}</strong></td>
                    <td>{fmtDate(inv.emissao)}</td>
                    <td>{fmtDate(inv.vencimento)}</td>
                    <td><span className={`badge badge-${statusColor(inv.status)}`}>{inv.status}</span></td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{isOpen ? '▲' : imps.length > 0 ? '▼' : ''}</td>
                  </tr>

                  {isOpen && imps.length > 0 && (
                    <tr key={`${inv.id}-detail`}>
                      <td colSpan={9} style={{ padding: 0, background: '#f8fafc' }}>
                        <div style={{ padding: '10px 24px 14px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                            Detalhamento de Impostos / Retenções — {inv.code}
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {imps.map(imp => (
                              <div key={imp.nome} style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: '6px 14px',
                                minWidth: 120,
                                textAlign: 'center',
                              }}>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{imp.nome} ({imp.percentual}%)</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>- {fmtMoney(imp.valor)}</div>
                              </div>
                            ))}
                            <div style={{
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: 8,
                              padding: '6px 14px',
                              minWidth: 140,
                              textAlign: 'center',
                              marginLeft: 'auto',
                            }}>
                              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>VALOR LÍQUIDO</div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>{fmtMoney(liquido)}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
