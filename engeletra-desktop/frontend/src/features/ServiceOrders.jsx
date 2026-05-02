import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

const EMPTY = {
  client_id: '', quote_id: '', equipment_id: '',
  tecnico: '', status: 'Aberto', data_agendada: '',
  horas_reais: 0, km_real: 0, valor_real: 0,
  checklist: '', materiais: '',
}

const STATUS_OPTS = ['Aberto', 'Em andamento', 'Concluído', 'Cancelado']

export default function ServiceOrders() {
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [quotes, setQuotes] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [os, cl, qt, eq] = await Promise.all([
        api.serviceOrders.list(),
        api.clients.list(),
        api.quotes.list(),
        api.equipment.list(),
      ])
      setOrders(os)
      setClients(cl)
      setQuotes(qt)
      setEquipment(eq)
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

  function filteredOrders() {
    if (filter === 'Todos') return orders
    return orders.filter(o => o.status === filter)
  }

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setModal(true)
  }

  function openEdit(o) {
    setEditing(o)
    setForm({
      client_id:    o.client_id,
      quote_id:     o.quote_id     ?? '',
      equipment_id: o.equipment_id ?? '',
      tecnico:      o.tecnico      ?? '',
      status:       o.status,
      data_agendada: o.data_agendada ?? '',
      horas_reais:  o.horas_reais,
      km_real:      o.km_real,
      valor_real:   o.valor_real,
      checklist:    o.checklist  ?? '',
      materiais:    o.materiais  ?? '',
    })
    setModal(true)
  }

  async function save() {
    if (!form.client_id) { alert('Selecione um cliente.'); return }
    setSaving(true)
    const payload = {
      ...form,
      client_id:    Number(form.client_id),
      quote_id:     form.quote_id     ? Number(form.quote_id)     : null,
      equipment_id: form.equipment_id ? Number(form.equipment_id) : null,
      horas_reais:  Number(form.horas_reais),
      km_real:      Number(form.km_real),
      valor_real:   Number(form.valor_real),
    }
    try {
      editing
        ? await api.serviceOrders.update(editing.id, payload)
        : await api.serviceOrders.create(payload)
      setModal(false)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function finish(o) {
    if (!confirm(`Concluir a OS ${o.code}? Isso irá gerar a fatura automaticamente.`)) return
    try {
      await api.serviceOrders.finish(o.id)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const clientQuotes = quotes.filter(q => q.client_id === Number(form.client_id) && q.status !== 'Reprovado')
  const clientEquip = equipment.filter(eq => eq.client_id === Number(form.client_id))

  const filters = ['Todos', ...STATUS_OPTS]
  const visible = filteredOrders()

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ordens de Serviço</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nova OS</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {filters.map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Técnico</th>
              <th>Status</th>
              <th>Agendado</th>
              <th>Horas Reais</th>
              <th>Valor Real</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td-center">Carregando...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhuma OS encontrada.</td></tr>
            ) : visible.map(o => (
              <tr key={o.id}>
                <td><strong>{o.code}</strong></td>
                <td>{clientName(o.client_id)}</td>
                <td>{o.tecnico || '—'}</td>
                <td><span className={`badge badge-${statusColor(o.status)}`}>{o.status}</span></td>
                <td>{fmtDate(o.data_agendada)}</td>
                <td>{o.horas_reais > 0 ? `${o.horas_reais}h` : '—'}</td>
                <td>{o.valor_real > 0 ? fmtMoney(o.valor_real) : '—'}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(o)}>Editar</button>
                  {o.status !== 'Concluído' && o.status !== 'Cancelado' && (
                    <button className="btn btn-sm btn-success" onClick={() => finish(o)}>Concluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? `Editar OS — ${editing.code}` : 'Nova Ordem de Serviço'} onClose={() => setModal(false)} width={680}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <select className="form-input" value={form.client_id} onChange={set('client_id')}>
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Orçamento vinculado</label>
                <select className="form-input" value={form.quote_id} onChange={set('quote_id')}>
                  <option value="">Nenhum</option>
                  {clientQuotes.map(q => (
                    <option key={q.id} value={q.id}>{q.code} — {fmtMoney(q.total)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Equipamento</label>
                <select className="form-input" value={form.equipment_id} onChange={set('equipment_id')}>
                  <option value="">Nenhum</option>
                  {clientEquip.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.tipo} {eq.serie ? `— ${eq.serie}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section">Execução</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Técnico Responsável</label>
                <input className="form-input" value={form.tecnico} onChange={set('tecnico')} />
              </div>
              <div className="form-group">
                <label className="form-label">Data Agendada</label>
                <input className="form-input" type="date" value={form.data_agendada} onChange={set('data_agendada')} />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Horas Realizadas</label>
                <input className="form-input" type="number" min={0} step={0.5} value={form.horas_reais} onChange={set('horas_reais')} />
              </div>
              <div className="form-group">
                <label className="form-label">KM Realizado</label>
                <input className="form-input" type="number" min={0} value={form.km_real} onChange={set('km_real')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Real (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor_real} onChange={set('valor_real')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={set('status')}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Checklist / Atividades</label>
              <textarea className="form-input" rows={3} value={form.checklist} onChange={set('checklist')} placeholder="Liste as atividades realizadas..." />
            </div>

            <div className="form-group">
              <label className="form-label">Materiais Utilizados</label>
              <textarea className="form-input" rows={2} value={form.materiais} onChange={set('materiais')} placeholder="Descreva os materiais usados..." />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Salvar OS'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
