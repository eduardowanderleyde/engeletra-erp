import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

const STATUS_OPTS = ['Em andamento', 'Concluída', 'Pausada', 'Cancelada']

const EMPTY = {
  nome: '', client_id: '', status: 'Em andamento',
  data_inicio: '', data_previsao: '', data_conclusao: '',
  valor_contrato: 0, descricao: '',
}

export default function Obras() {
  const [obras, setObras] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [ob, cl] = await Promise.all([api.obras.list(), api.clients.list()])
      setObras(ob)
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

  function openNew() {
    setForm(EMPTY)
    setEditing(null)
    setModal(true)
  }

  function openEdit(o) {
    setForm({ ...EMPTY, ...o, client_id: o.client_id ?? '' })
    setEditing(o)
    setModal(true)
  }

  async function save() {
    if (!form.nome.trim()) { alert('Nome da obra é obrigatório.'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id ? Number(form.client_id) : null,
        valor_contrato: Number(form.valor_contrato),
      }
      editing
        ? await api.obras.update(editing.id, payload)
        : await api.obras.create(payload)
      setModal(false)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(o) {
    if (!confirm(`Excluir obra "${o.nome}"?`)) return
    try {
      await api.obras.delete(o.id)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const visible = filter === 'Todos' ? obras : obras.filter(o => o.status === filter)
  const totalContrato = obras.filter(o => o.status === 'Em andamento').reduce((s, o) => s + (o.valor_contrato || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Obras & Projetos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Obra</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{obras.filter(o => o.status === 'Em andamento').length}</div>
          <div className="metric-label">Em Andamento</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{obras.filter(o => o.status === 'Concluída').length}</div>
          <div className="metric-label">Concluídas</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{fmtMoney(totalContrato)}</div>
          <div className="metric-label">Contrato Ativo</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['Todos', ...STATUS_OPTS].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome da Obra</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Início</th>
              <th>Previsão</th>
              <th>Contrato</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td-center">Carregando...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhuma obra encontrada.</td></tr>
            ) : visible.map(o => (
              <tr key={o.id}>
                <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{o.code}</strong></td>
                <td><strong>{o.nome}</strong></td>
                <td>{clientName(o.client_id)}</td>
                <td><span className={`badge badge-${statusColor(o.status)}`}>{o.status}</span></td>
                <td>{fmtDate(o.data_inicio)}</td>
                <td>{fmtDate(o.data_previsao)}</td>
                <td>{o.valor_contrato > 0 ? fmtMoney(o.valor_contrato) : '—'}</td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(o)}>Editar</button>
                  {' '}
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(o)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Obra' : 'Nova Obra'} onClose={() => setModal(false)} width={660}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Nome da Obra *</label>
                <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="ex: Caruaru Shopping — Manutenção SE 69kV" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select className="form-input" value={form.client_id} onChange={set('client_id')}>
                  <option value="">Sem vínculo</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Data de Início</label>
                <input className="form-input" type="date" value={form.data_inicio} onChange={set('data_inicio')} />
              </div>
              <div className="form-group">
                <label className="form-label">Previsão de Término</label>
                <input className="form-input" type="date" value={form.data_previsao} onChange={set('data_previsao')} />
              </div>
              <div className="form-group">
                <label className="form-label">Conclusão Real</label>
                <input className="form-input" type="date" value={form.data_conclusao} onChange={set('data_conclusao')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Valor do Contrato (R$)</label>
              <input className="form-input" type="number" min={0} step={0.01} value={form.valor_contrato} onChange={set('valor_contrato')} />
            </div>

            <div className="form-group">
              <label className="form-label">Descrição / Escopo</label>
              <textarea className="form-input" rows={3} value={form.descricao} onChange={set('descricao')} />
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
