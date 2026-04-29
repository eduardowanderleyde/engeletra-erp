import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

const STATUS_OPTS = ['Rascunho', 'Aprovado', 'Comprado', 'Recebido', 'Cancelado']
const STATUS_NEXT = { Rascunho: 'Aprovado', Aprovado: 'Comprado', Comprado: 'Recebido' }

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { fornecedor: '', data: today(), data_entrega: '', status: 'Rascunho', obra_id: '', descricao: '', valor_total: 0, observacao: '' }

export default function Pedidos() {
  const [items, setItems]     = useState([])
  const [obras, setObras]     = useState([])
  const [filter, setFilter]   = useState('Todos')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [p, o] = await Promise.all([api.pedidos.list(), api.obras.list()])
      setItems(p); setObras(o)
    } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(i) { setForm({ ...EMPTY, ...i, obra_id: i.obra_id ?? '' }); setEditing(i); setModal(true) }

  async function save() {
    if (!form.data) { alert('Data é obrigatória.'); return }
    setSaving(true)
    try {
      const payload = { ...form, valor_total: Number(form.valor_total), obra_id: form.obra_id ? Number(form.obra_id) : null }
      editing ? await api.pedidos.update(editing.id, payload) : await api.pedidos.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function avancarStatus(item) {
    const prox = STATUS_NEXT[item.status]
    if (!prox) return
    if (!confirm(`Avançar para "${prox}"?`)) return
    try {
      await api.pedidos.update(item.id, { ...item, status: prox })
      loadAll()
    } catch (e) { alert(e.message) }
  }

  async function remove(item) {
    if (!confirm(`Excluir pedido ${item.code}?`)) return
    try { await api.pedidos.delete(item.id); loadAll() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const visible = filter === 'Todos' ? items : items.filter(i => i.status === filter)
  const obraName = id => obras.find(o => o.id === id)?.nome || '—'

  const emAberto = items.filter(i => ['Rascunho','Aprovado','Comprado'].includes(i.status)).length
  const totalCompras = items.filter(i => i.status !== 'Cancelado').reduce((s, i) => s + (i.valor_total || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pedidos de Compra</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Pedido</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{emAberto}</div>
          <div className="metric-label">Em Andamento</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{items.filter(i => i.status === 'Recebido').length}</div>
          <div className="metric-label">Recebidos</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{fmtMoney(totalCompras)}</div>
          <div className="metric-label">Total Compras</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{items.filter(i => i.status === 'Aprovado').length}</div>
          <div className="metric-label">Aguardando Compra</div>
        </div>
      </div>

      {/* Filtro de status como pipeline */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', width: 'fit-content' }}>
        {['Todos', ...STATUS_OPTS].map((s, i) => (
          <button
            key={s}
            style={{
              padding: '7px 16px',
              background: filter === s ? '#1d4ed8' : '#fff',
              color: filter === s ? '#fff' : '#475569',
              border: 'none',
              borderRight: i < STATUS_OPTS.length ? '1px solid #e2e8f0' : 'none',
              fontWeight: filter === s ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
            }}
            onClick={() => setFilter(s)}
          >{s}</button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Data</th>
              <th>Fornecedor</th>
              <th>Obra</th>
              <th>Descrição</th>
              <th>Entrega</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum pedido encontrado.</td></tr>
            ) : visible.map(item => (
              <tr key={item.id}>
                <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{item.code}</strong></td>
                <td>{fmtDate(item.data)}</td>
                <td>{item.fornecedor || '—'}</td>
                <td style={{ fontSize: 12 }}>{item.obra_id ? obraName(item.obra_id) : '—'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao || '—'}</td>
                <td>{fmtDate(item.data_entrega)}</td>
                <td><strong>{item.valor_total > 0 ? fmtMoney(item.valor_total) : '—'}</strong></td>
                <td><span className={`badge badge-${statusColor(item.status)}`}>{item.status}</span></td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {STATUS_NEXT[item.status] && (
                    <button className="btn btn-sm btn-ghost" style={{ color: '#1d4ed8' }} onClick={() => avancarStatus(item)}>
                      → {STATUS_NEXT[item.status]}
                    </button>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)}>Editar</button>
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(item)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? `Editar ${editing.code}` : 'Novo Pedido'} onClose={() => setModal(false)} width={640}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fornecedor</label>
                <input className="form-input" value={form.fornecedor} onChange={set('fornecedor')} placeholder="Nome do fornecedor" />
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
                <label className="form-label">Data *</label>
                <input className="form-input" type="date" value={form.data} onChange={set('data')} />
              </div>
              <div className="form-group">
                <label className="form-label">Previsão Entrega</label>
                <input className="form-input" type="date" value={form.data_entrega} onChange={set('data_entrega')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Total (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor_total} onChange={set('valor_total')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Obra / Projeto</label>
              <select className="form-input" value={form.obra_id} onChange={set('obra_id')}>
                <option value="">Sem vínculo</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.code} — {o.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição / Itens</label>
              <textarea className="form-input" rows={3} value={form.descricao} onChange={set('descricao')} placeholder="ex: 2x Disjuntor 100A, 10m Cabo 35mm²..." />
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
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
