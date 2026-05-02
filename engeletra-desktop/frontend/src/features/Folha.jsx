import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import { fmtMoney } from '../utils.js'

const MESES_NOME  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const STATUS_OPTS = ['Pendente', 'Pago', 'Parcial']

const n = v => Number(v) || 0

export default function Folha() {
  const [tecnicos, setTecnicos] = useState([])
  const [items, setItems]       = useState([])
  const [mes, setMes]           = useState(new Date().getMonth() + 1)
  const [ano, setAno]           = useState(new Date().getFullYear())
  const [rows, setRows]         = useState([])
  const [saving, setSaving]     = useState({})

  useEffect(() => { loadBase() }, [])
  useEffect(() => { buildRows() }, [mes, ano, tecnicos, items])

  async function loadBase() {
    try {
      const [f, t] = await Promise.all([api.folha.list(), api.tecnicos.list()])
      setItems(f); setTecnicos(t.filter(t => t.ativo))
    } catch (e) { alert(e.message) }
  }

  function buildRows() {
    setRows(tecnicos.map(tec => {
      const existing = items.find(i => i.tecnico_id === tec.id && i.mes === mes && i.ano === ano)
      return existing
        ? { ...existing, _tecnico: tec, _dirty: false }
        : {
            tecnico_id: tec.id, mes, ano,
            salario_base: tec.valor_hora > 0 ? tec.valor_hora * 220 : 0,
            horas_extras: 0, valor_extras: 0,
            total_bruto: tec.valor_hora > 0 ? tec.valor_hora * 220 : 0,
            descontos: 0, total_liquido: tec.valor_hora > 0 ? tec.valor_hora * 220 : 0,
            status: 'Pendente', observacao: '',
            _tecnico: tec, _new: true, _dirty: false,
          }
    }))
  }

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, [field]: value, _dirty: true }
      const bruto   = n(updated.salario_base) + n(updated.valor_extras)
      const liquido = bruto - n(updated.descontos)
      return { ...updated, total_bruto: bruto, total_liquido: liquido }
    }))
  }

  async function saveRow(idx) {
    const row = rows[idx]
    if (!row._dirty) return
    setSaving(prev => ({ ...prev, [idx]: true }))
    try {
      const payload = {
        tecnico_id:   row.tecnico_id,
        mes:          row.mes,
        ano:          row.ano,
        salario_base: n(row.salario_base),
        horas_extras: n(row.horas_extras),
        valor_extras: n(row.valor_extras),
        total_bruto:  n(row.total_bruto),
        descontos:    n(row.descontos),
        total_liquido: n(row.total_liquido),
        status:       row.status,
        observacao:   row.observacao || '',
      }
      if (row.id) {
        await api.folha.update(row.id, payload)
      } else {
        const created = await api.folha.create(payload)
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, id: created.id, _new: false, _dirty: false } : r))
        setSaving(prev => ({ ...prev, [idx]: false })); return
      }
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, _dirty: false } : r))
    } catch (e) { alert(e.message) }
    finally { setSaving(prev => ({ ...prev, [idx]: false })) }
  }

  function navMes(dir) {
    let m = mes + dir, a = ano
    if (m < 1) { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAno(a)
  }

  const totalBruto   = rows.reduce((s, r) => s + n(r.total_bruto), 0)
  const totalLiquido = rows.reduce((s, r) => s + n(r.total_liquido), 0)
  const pendentes    = rows.filter(r => r.status === 'Pendente').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Folha de Pagamento</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(-1)}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 180, textAlign: 'center' }}>{MESES_NOME[mes - 1]} / {ano}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(1)}>▶</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{rows.length}</div>
          <div className="metric-label">Funcionários</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{fmtMoney(totalBruto)}</div>
          <div className="metric-label">Total Bruto</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalLiquido)}</div>
          <div className="metric-label">Total Líquido</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{pendentes}</div>
          <div className="metric-label">A Pagar</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Nenhum funcionário ativo cadastrado.</div>
      ) : (
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Funcionário</th>
                <th style={{ minWidth: 110 }}>Salário Base (R$)</th>
                <th style={{ minWidth: 80 }}>H. Extras</th>
                <th style={{ minWidth: 110 }}>Valor Extras (R$)</th>
                <th style={{ minWidth: 110 }}>Descontos (R$)</th>
                <th style={{ minWidth: 110 }}>Total Bruto</th>
                <th style={{ minWidth: 110 }}>Total Líquido</th>
                <th style={{ minWidth: 100 }}>Status</th>
                <th style={{ minWidth: 80 }}>Salvar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row._tecnico.id} style={{ background: row._dirty ? '#fefce8' : undefined }}>
                  <td>
                    <strong>{row._tecnico.nome}</strong>
                    {row._new && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>novo</span>}
                    {row._tecnico.cargo && <div style={{ fontSize: 11, color: '#64748b' }}>{row._tecnico.cargo}</div>}
                  </td>
                  <td>
                    <input type="number" min={0} step={0.01} value={row.salario_base}
                      onChange={e => updateRow(idx, 'salario_base', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 13, width: 100 }} />
                  </td>
                  <td>
                    <input type="number" min={0} step={0.5} value={row.horas_extras}
                      onChange={e => updateRow(idx, 'horas_extras', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 13, width: 64 }} />
                  </td>
                  <td>
                    <input type="number" min={0} step={0.01} value={row.valor_extras}
                      onChange={e => updateRow(idx, 'valor_extras', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 13, width: 100 }} />
                  </td>
                  <td>
                    <input type="number" min={0} step={0.01} value={row.descontos}
                      onChange={e => updateRow(idx, 'descontos', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 13, width: 100, color: '#dc2626' }} />
                  </td>
                  <td><strong>{fmtMoney(n(row.total_bruto))}</strong></td>
                  <td><strong style={{ color: '#16a34a' }}>{fmtMoney(n(row.total_liquido))}</strong></td>
                  <td>
                    <select value={row.status} onChange={e => updateRow(idx, 'status', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, background: '#fff' }}>
                      {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => saveRow(idx)}
                      disabled={!row._dirty || saving[idx]}
                      style={{ opacity: row._dirty ? 1 : 0.35 }}
                    >
                      {saving[idx] ? '...' : '💾'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
