import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import { fmtMoney } from '../utils.js'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Carregando painel...</div>
  if (err) return (
    <div className="page-loading" style={{ color: '#dc2626' }}>
      Não foi possível conectar ao servidor.<br />
      <small>Verifique se o backend está rodando na porta 8787.</small>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Painel</h1>
        <span className="info-tag">Atualizado agora</span>
      </div>

      <div className="metrics-grid">
        <div className="metric-card metric-blue">
          <div className="metric-value">{data?.open_os ?? 0}</div>
          <div className="metric-label">OS Abertas</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{data?.progress_os ?? 0}</div>
          <div className="metric-label">OS em Andamento</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(data?.revenue ?? 0)}</div>
          <div className="metric-label">Receita Total</div>
        </div>
        <div className="metric-card metric-gray">
          <div className="metric-value">{data?.pending_quotes ?? 0}</div>
          <div className="metric-label">Orçamentos Pendentes</div>
        </div>
      </div>
    </div>
  )
}
