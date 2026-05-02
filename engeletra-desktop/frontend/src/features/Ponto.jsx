import { useState, useEffect } from 'react'
import { api } from '../api/index.js'

const TIPOS = ['Normal', 'Hora Extra', 'Falta', 'Atestado', 'Férias', 'Folga', 'Viagem']
const TIPO_COR = { Normal: '#16a34a', 'Hora Extra': '#1d4ed8', Falta: '#dc2626', Atestado: '#d97706', Férias: '#16a34a', Folga: '#64748b', Viagem: '#0891b2' }

const today = () => new Date().toISOString().slice(0, 10)

function calcHoras(entrada, saida, almSaida, almVolta) {
  if (!entrada || !saida) return 0
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const total = toMin(saida) - toMin(entrada)
  const almoco = (almSaida && almVolta) ? toMin(almVolta) - toMin(almSaida) : 60
  return Math.max(0, (total - almoco) / 60)
}

const DEFAULT_ROW = { entrada: '07:30', almoco_saida: '12:00', almoco_volta: '13:00', saida: '17:30', tipo: 'Normal', horas_extras: 0, observacao: '' }

export default function Ponto() {
  const [tecnicos, setTecnicos]   = useState([])
  const [records, setRecords]     = useState([])
  const [date, setDate]           = useState(today())
  const [rows, setRows]           = useState([])
  const [saving, setSaving]       = useState({})

  useEffect(() => { loadBase() }, [])
  useEffect(() => { buildRows() }, [date, tecnicos, records])

  async function loadBase() {
    try {
      const [t, p] = await Promise.all([api.tecnicos.list(), api.ponto.list()])
      setTecnicos(t.filter(t => t.ativo))
      setRecords(p)
    } catch (e) { alert(e.message) }
  }

  function buildRows() {
    setRows(tecnicos.map(tec => {
      const existing = records.find(r => r.tecnico_id === tec.id && r.data === date)
      return existing
        ? { ...existing, _tecnico: tec, _dirty: false }
        : { ...DEFAULT_ROW, tecnico_id: tec.id, data: date, _tecnico: tec, _new: true, _dirty: false }
    }))
  }

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r))
  }

  async function saveRow(idx) {
    const row = rows[idx]
    if (!row._dirty) return
    setSaving(prev => ({ ...prev, [idx]: true }))
    try {
      const payload = {
        tecnico_id:   row.tecnico_id,
        data:         row.data,
        entrada:      row.entrada,
        almoco_saida: row.almoco_saida,
        almoco_volta: row.almoco_volta,
        saida:        row.saida,
        tipo:         row.tipo,
        horas_extras: Number(row.horas_extras) || 0,
        observacao:   row.observacao || '',
      }
      if (row.id) {
        await api.ponto.update(row.id, payload)
      } else {
        const created = await api.ponto.create(payload)
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, id: created.id, _new: false, _dirty: false } : r))
        setSaving(prev => ({ ...prev, [idx]: false }))
        return
      }
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, _dirty: false } : r))
    } catch (e) { alert(e.message) }
    finally { setSaving(prev => ({ ...prev, [idx]: false })) }
  }

  const totalHoras = rows.reduce((s, r) => s + calcHoras(r.entrada, r.saida, r.almoco_saida, r.almoco_volta), 0)
  const presentes  = rows.filter(r => r.tipo !== 'Falta' && r.tipo !== 'Férias' && r.tipo !== 'Folga').length
  const faltas     = rows.filter(r => r.tipo === 'Falta').length

  function navDay(dir) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + dir)
    setDate(d.toISOString().slice(0, 10))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Controle de Ponto</h1>
      </div>

      {/* Filtro de data */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navDay(-1)}>◀</button>
        <input
          type="date"
          className="form-input"
          style={{ width: 180 }}
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => navDay(1)}>▶</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDate(today())}>Hoje</button>
      </div>

      {/* Métricas do dia */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{rows.length}</div>
          <div className="metric-label">Funcionários</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{presentes}</div>
          <div className="metric-label">Presentes</div>
        </div>
        <div className="metric-card metric-red">
          <div className="metric-value">{faltas}</div>
          <div className="metric-label">Faltas</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{totalHoras.toFixed(1)}h</div>
          <div className="metric-label">Total Horas</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Nenhum funcionário ativo cadastrado.</div>
      ) : (
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Funcionário</th>
                <th style={{ minWidth: 80 }}>Entrada</th>
                <th style={{ minWidth: 90 }}>Saída Almoço</th>
                <th style={{ minWidth: 90 }}>Volta Almoço</th>
                <th style={{ minWidth: 80 }}>Saída</th>
                <th style={{ minWidth: 60 }}>Horas</th>
                <th style={{ minWidth: 110 }}>Tipo</th>
                <th style={{ minWidth: 70 }}>H. Extra</th>
                <th style={{ minWidth: 140 }}>Observação</th>
                <th style={{ minWidth: 80 }}>Salvar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const h = calcHoras(row.entrada, row.saida, row.almoco_saida, row.almoco_volta)
                const isFalta = row.tipo === 'Falta' || row.tipo === 'Férias' || row.tipo === 'Folga'
                return (
                  <tr key={row._tecnico.id} style={{ background: row._dirty ? '#fefce8' : undefined }}>
                    <td>
                      <strong>{row._tecnico.nome}</strong>
                      {row._new && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>novo</span>}
                    </td>
                    <td>
                      <input type="time" value={row.entrada || ''} disabled={isFalta}
                        onChange={e => updateRow(idx, 'entrada', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, width: 72, background: isFalta ? '#f1f5f9' : undefined }} />
                    </td>
                    <td>
                      <input type="time" value={row.almoco_saida || ''} disabled={isFalta}
                        onChange={e => updateRow(idx, 'almoco_saida', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, width: 80, background: isFalta ? '#f1f5f9' : undefined }} />
                    </td>
                    <td>
                      <input type="time" value={row.almoco_volta || ''} disabled={isFalta}
                        onChange={e => updateRow(idx, 'almoco_volta', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, width: 80, background: isFalta ? '#f1f5f9' : undefined }} />
                    </td>
                    <td>
                      <input type="time" value={row.saida || ''} disabled={isFalta}
                        onChange={e => updateRow(idx, 'saida', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, width: 72, background: isFalta ? '#f1f5f9' : undefined }} />
                    </td>
                    <td>
                      <strong style={{ color: h > 0 ? '#16a34a' : '#94a3b8' }}>{h > 0 ? h.toFixed(1) + 'h' : '—'}</strong>
                    </td>
                    <td>
                      <select value={row.tipo} onChange={e => updateRow(idx, 'tipo', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, color: TIPO_COR[row.tipo] || '#334155', fontWeight: 600, background: '#fff' }}>
                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" min={0} step={0.5} value={row.horas_extras || 0}
                        onChange={e => updateRow(idx, 'horas_extras', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, width: 60 }} />
                    </td>
                    <td>
                      <input value={row.observacao || ''} onChange={e => updateRow(idx, 'observacao', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, width: '100%' }} />
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
