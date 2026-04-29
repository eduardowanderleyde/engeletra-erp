import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import { fmtMoney, fmtDate } from '../utils.js'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Caixa() {
  const [invoices, setInvoices]   = useState([])
  const [despesas, setDespesas]   = useState([])
  const [contas, setContas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [mesAtual, setMesAtual]   = useState(new Date().getMonth())
  const [anoAtual, setAnoAtual]   = useState(new Date().getFullYear())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [inv, dep, con] = await Promise.all([
        api.invoices.list(), api.despesas.list(), api.contas.list()
      ])
      setInvoices(inv); setDespesas(dep); setContas(con)
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  const mesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`

  const receitasMes = invoices.filter(i =>
    i.status === 'Recebido' && i.data_recebimento?.startsWith(mesStr)
  )
  const despesasMes = despesas.filter(d =>
    d.status === 'Pago' && (d.data_pagamento || d.data)?.startsWith(mesStr)
  )

  const totalReceitas = receitasMes.reduce((s, i) => s + (i.valor || 0), 0)
  const totalDespesas = despesasMes.reduce((s, d) => s + (d.valor || 0), 0)
  const resultado = totalReceitas - totalDespesas
  const saldoBancos = contas.filter(c => c.ativo).reduce((s, c) => s + (c.saldo_atual || 0), 0)

  // Receitas pendentes / despesas pendentes para balanço
  const aReceber = invoices.filter(i => i.status !== 'Recebido' && i.status !== 'Cancelado')
    .reduce((s, i) => s + (i.valor || 0), 0)
  const aPagar = despesas.filter(d => d.status === 'Pendente')
    .reduce((s, d) => s + (d.valor || 0), 0)

  function navMes(dir) {
    let m = mesAtual + dir, a = anoAtual
    if (m < 0) { m = 11; a-- }
    if (m > 11) { m = 0; a++ }
    setMesAtual(m); setAnoAtual(a)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Caixa</h1>
      </div>

      {/* Saldo dos bancos */}
      <div style={{ background: '#1e293b', borderRadius: 14, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Saldo em Contas Bancárias</div>
          <div style={{ color: '#f8fafc', fontSize: 32, fontWeight: 700 }}>{fmtMoney(saldoBancos)}</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{contas.filter(c => c.ativo).length} conta(s) ativa(s)</div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4ade80', fontSize: 20, fontWeight: 700 }}>{fmtMoney(aReceber)}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>A Receber</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f87171', fontSize: 20, fontWeight: 700 }}>{fmtMoney(aPagar)}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>A Pagar</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: aReceber - aPagar >= 0 ? '#4ade80' : '#f87171', fontSize: 20, fontWeight: 700 }}>{fmtMoney(aReceber - aPagar)}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Projeção</div>
          </div>
        </div>
      </div>

      {/* Seletor de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(-1)}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 140, textAlign: 'center' }}>
          {MESES[mesAtual]} / {anoAtual}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(1)}>▶</button>
      </div>

      {/* Métricas do mês */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalReceitas)}</div>
          <div className="metric-label">Receitas Recebidas</div>
        </div>
        <div className="metric-card metric-red">
          <div className="metric-value">{fmtMoney(totalDespesas)}</div>
          <div className="metric-label">Despesas Pagas</div>
        </div>
        <div className={`metric-card ${resultado >= 0 ? 'metric-blue' : 'metric-red'}`}>
          <div className="metric-value">{fmtMoney(resultado)}</div>
          <div className="metric-label">Resultado do Mês</div>
        </div>
      </div>

      {/* Lançamentos do mês */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a', marginBottom: 10 }}>
            RECEITAS — {MESES[mesAtual]}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>OS</th><th>Valor</th></tr></thead>
              <tbody>
                {receitasMes.length === 0 ? (
                  <tr><td colSpan={3} className="td-center" style={{ fontSize: 13 }}>Nenhuma receita recebida.</td></tr>
                ) : receitasMes.map(inv => (
                  <tr key={inv.id}>
                    <td>{fmtDate(inv.data_recebimento)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.code}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{fmtMoney(inv.valor)}</td>
                  </tr>
                ))}
                {receitasMes.length > 0 && (
                  <tr style={{ fontWeight: 700, background: '#f0fdf4' }}>
                    <td colSpan={2}>Total</td>
                    <td style={{ color: '#16a34a' }}>{fmtMoney(totalReceitas)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626', marginBottom: 10 }}>
            DESPESAS — {MESES[mesAtual]}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead>
              <tbody>
                {despesasMes.length === 0 ? (
                  <tr><td colSpan={3} className="td-center" style={{ fontSize: 13 }}>Nenhuma despesa paga.</td></tr>
                ) : despesasMes.map(d => (
                  <tr key={d.id}>
                    <td>{fmtDate(d.data_pagamento || d.data)}</td>
                    <td>{d.descricao}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{fmtMoney(d.valor)}</td>
                  </tr>
                ))}
                {despesasMes.length > 0 && (
                  <tr style={{ fontWeight: 700, background: '#fff5f5' }}>
                    <td colSpan={2}>Total</td>
                    <td style={{ color: '#dc2626' }}>{fmtMoney(totalDespesas)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
