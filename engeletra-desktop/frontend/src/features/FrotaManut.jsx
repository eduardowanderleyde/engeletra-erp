import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate } from '../utils.js'

const TIPOS = ['Preventiva', 'Corretiva', 'Revisão', 'Pneu', 'Óleo/Filtro', 'Elétrica', 'Outros']
const STATUS_OPTS = ['Realizada', 'Pendente', 'Agendada']

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { veiculo_id: '', tipo: 'Preventiva', data: today(), km: 0, descricao: '', valor: 0, status: 'Realizada', observacao: '' }

export default function FrotaManut() {
  const [items, setItems]       = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [filter, setFilter]     = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [m, v] = await Promise.all([api.frotaManut.list(), api.veiculos.list()])
      setItems(m); setVeiculos(v)
    } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(i) { setForm({ ...EMPTY, ...i }); setEditing(i); setModal(true) }

  async function save() {
    if (!form.veiculo_id) { alert('Selecione o veículo.'); return }
    if (!form.data) { alert('Data é obrigatória.'); return }
    setSaving(true)
    try {
      const payload = { ...form, veiculo_id: Number(form.veiculo_id), km: Number(form.km), valor: Number(form.valor) }
      editing ? await api.frotaManut.update(editing.id, payload) : await api.frotaManut.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(i) {
    if (!confirm('Excluir registro?')) return
    try { await api.frotaManut.delete(i.id); loadAll() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const veiNome = id => {
    const v = veiculos.find(v => v.id === id)
    return v ? `${v.modelo} — ${v.placa}` : '—'
  }

  const visible = filter ? items.filter(i => i.veiculo_id === Number(filter)) : items
  const totalGasto = visible.reduce((s, i) => s + (i.valor || 0), 0)
  const pendentes = items.filter(i => i.status === 'Pendente' || i.status === 'Agendada').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manutenção de Frota</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{items.length}</div>
          <div className="metric-label">Total Manutenções</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{pendentes}</div>
          <div className="metric-label">Pendentes/Agendadas</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{fmtMoney(totalGasto)}</div>
          <div className="metric-label">Gasto Total</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{items.filter(i => i.tipo === 'Preventiva').length}</div>
          <div className="metric-label">Preventivas</div>
        </div>
      </div>

      {/* Filtro por veículo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('')}>Todos</button>
        {veiculos.map(v => (
          <button key={v.id} className={`btn btn-sm ${filter == v.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(String(v.id))}>
            {v.modelo}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Veículo</th>
              <th>Tipo</th>
              <th>KM</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhum registro.</td></tr>
            ) : visible.map(i => (
              <tr key={i.id}>
                <td>{fmtDate(i.data)}</td>
                <td><strong>{veiNome(i.veiculo_id)}</strong></td>
                <td>
                  <span style={{ fontSize: 12, background: '#f1f5f9', borderRadius: 4, padding: '2px 6px' }}>{i.tipo}</span>
                </td>
                <td style={{ fontFamily: 'monospace' }}>{i.km > 0 ? `${i.km.toLocaleString('pt-BR')} km` : '—'}</td>
                <td>{i.descricao || '—'}</td>
                <td>{i.valor > 0 ? fmtMoney(i.valor) : '—'}</td>
                <td>
                  <span className={`badge badge-${i.status === 'Realizada' ? 'green' : i.status === 'Agendada' ? 'blue' : 'yellow'}`}>
                    {i.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(i)}>Editar</button>
                  {' '}
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(i)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Manutenção' : 'Nova Manutenção'} onClose={() => setModal(false)} width={580}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Veículo *</label>
                <select className="form-input" value={form.veiculo_id} onChange={set('veiculo_id')}>
                  <option value="">Selecionar...</option>
                  {veiculos.map(v => <option key={v.id} value={v.id}>{v.modelo} — {v.placa}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.tipo} onChange={set('tipo')}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input className="form-input" type="date" value={form.data} onChange={set('data')} />
              </div>
              <div className="form-group">
                <label className="form-label">KM Atual</label>
                <input className="form-input" type="number" min={0} value={form.km} onChange={set('km')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor} onChange={set('valor')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Descrição / Serviço</label>
                <input className="form-input" value={form.descricao} onChange={set('descricao')} placeholder="ex: Troca de óleo 5W30 + filtro" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Observação</label>
                <input className="form-input" value={form.observacao} onChange={set('observacao')} />
              </div>
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
