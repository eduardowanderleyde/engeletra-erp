import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtDate } from '../utils.js'

const TIPOS = ['Normal', 'Hora Extra', 'Falta', 'Atestado', 'Férias', 'Folga', 'Viagem']
const TIPO_COR = { Normal: 'green', 'Hora Extra': 'blue', Falta: 'red', Atestado: 'yellow', Férias: 'green', Folga: 'gray', Viagem: 'blue' }
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { tecnico_id: '', data: today(), entrada: '07:30', almoco_saida: '12:00', almoco_volta: '13:00', saida: '17:30', tipo: 'Normal', horas_extras: 0, observacao: '' }

function calcHoras(entrada, saida, almSaida, almVolta) {
  if (!entrada || !saida) return 0
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const total = toMin(saida) - toMin(entrada)
  const almoco = (almSaida && almVolta) ? toMin(almVolta) - toMin(almSaida) : 60
  return Math.max(0, (total - almoco) / 60)
}

export default function Ponto() {
  const [items, setItems]       = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [filterTec, setFilterTec] = useState('')
  const [mes, setMes]           = useState(new Date().getMonth())
  const [ano, setAno]           = useState(new Date().getFullYear())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [p, t] = await Promise.all([api.ponto.list(), api.tecnicos.list()])
      setItems(p); setTecnicos(t)
    } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(i) { setForm({ ...EMPTY, ...i, tecnico_id: i.tecnico_id }); setEditing(i); setModal(true) }

  async function save() {
    if (!form.tecnico_id) { alert('Selecione o técnico.'); return }
    if (!form.data) { alert('Data é obrigatória.'); return }
    setSaving(true)
    try {
      const payload = { ...form, tecnico_id: Number(form.tecnico_id), horas_extras: Number(form.horas_extras) }
      editing ? await api.ponto.update(editing.id, payload) : await api.ponto.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(i) {
    if (!confirm('Excluir registro de ponto?')) return
    try { await api.ponto.delete(i.id); loadAll() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`
  let visible = items.filter(i => i.data?.startsWith(mesStr))
  if (filterTec) visible = visible.filter(i => i.tecnico_id === Number(filterTec))

  const tecNome = id => tecnicos.find(t => t.id === id)?.nome || '—'
  const totalHoras = visible.reduce((s, i) => s + calcHoras(i.entrada, i.saida, i.almoco_saida, i.almoco_volta), 0)
  const faltas = visible.filter(i => i.tipo === 'Falta').length
  const extras = visible.filter(i => i.tipo === 'Hora Extra' || i.horas_extras > 0).reduce((s, i) => s + Number(i.horas_extras || 0), 0)

  function navMes(dir) {
    let m = mes + dir, a = ano
    if (m < 0) { m = 11; a-- }
    if (m > 11) { m = 0; a++ }
    setMes(m); setAno(a)
  }

  const hTrab = calcHoras(form.entrada, form.saida, form.almoco_saida, form.almoco_volta)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Controle de Ponto</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(-1)}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 140, textAlign: 'center' }}>{MESES[mes]} / {ano}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(1)}>▶</button>
        <select className="form-input" style={{ width: 200 }} value={filterTec} onChange={e => setFilterTec(e.target.value)}>
          <option value="">Todos os técnicos</option>
          {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      {/* Métricas */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{visible.length}</div>
          <div className="metric-label">Registros</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{totalHoras.toFixed(1)}h</div>
          <div className="metric-label">Horas Trabalhadas</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{extras.toFixed(1)}h</div>
          <div className="metric-label">Horas Extras</div>
        </div>
        <div className="metric-card metric-red">
          <div className="metric-value">{faltas}</div>
          <div className="metric-label">Faltas</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Técnico</th>
              <th>Entrada</th>
              <th>Almoço</th>
              <th>Saída</th>
              <th>Horas</th>
              <th>Tipo</th>
              <th>Extras</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum registro para {MESES[mes]}/{ano}.</td></tr>
            ) : visible.map(i => {
              const h = calcHoras(i.entrada, i.saida, i.almoco_saida, i.almoco_volta)
              return (
                <tr key={i.id}>
                  <td>{fmtDate(i.data)}</td>
                  <td><strong>{tecNome(i.tecnico_id)}</strong></td>
                  <td style={{ fontFamily: 'monospace' }}>{i.entrada || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                    {i.almoco_saida && i.almoco_volta ? `${i.almoco_saida}–${i.almoco_volta}` : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{i.saida || '—'}</td>
                  <td><strong>{h > 0 ? h.toFixed(1) + 'h' : '—'}</strong></td>
                  <td><span className={`badge badge-${TIPO_COR[i.tipo] || 'gray'}`}>{i.tipo}</span></td>
                  <td>{i.horas_extras > 0 ? `+${Number(i.horas_extras).toFixed(1)}h` : '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(i)}>Editar</button>
                    {' '}
                    <button className="btn btn-sm btn-danger-soft" onClick={() => remove(i)}>Excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Ponto' : 'Registrar Ponto'} onClose={() => setModal(false)} width={580}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Técnico *</label>
                <select className="form-input" value={form.tecnico_id} onChange={set('tecnico_id')}>
                  <option value="">Selecionar...</option>
                  {tecnicos.filter(t => t.ativo).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input className="form-input" type="date" value={form.data} onChange={set('data')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.tipo} onChange={set('tipo')}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Horas Extras</label>
                <input className="form-input" type="number" min={0} step={0.5} value={form.horas_extras} onChange={set('horas_extras')} />
              </div>
            </div>
            {form.tipo !== 'Falta' && form.tipo !== 'Férias' && form.tipo !== 'Folga' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Entrada</label>
                    <input className="form-input" type="time" value={form.entrada} onChange={set('entrada')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Saída Almoço</label>
                    <input className="form-input" type="time" value={form.almoco_saida} onChange={set('almoco_saida')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Volta Almoço</label>
                    <input className="form-input" type="time" value={form.almoco_volta} onChange={set('almoco_volta')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Saída</label>
                    <input className="form-input" type="time" value={form.saida} onChange={set('saida')} />
                  </div>
                </div>
                {hTrab > 0 && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 12 }}>
                    Total calculado: <strong>{hTrab.toFixed(2)} horas</strong>
                  </div>
                )}
              </>
            )}
            <div className="form-group">
              <label className="form-label">Observação</label>
              <input className="form-input" value={form.observacao} onChange={set('observacao')} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
