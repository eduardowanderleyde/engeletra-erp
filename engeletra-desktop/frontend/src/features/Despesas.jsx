import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate } from '../utils.js'

const CATEGORIAS = ['Combustível', 'Material Elétrico', 'Ferramentas/EPI', 'Alimentação/Hospedagem',
  'Aluguel', 'Manutenção', 'Salários/RH', 'Impostos/Guias', 'Telefone/Internet', 'Outros']

const STATUS_OPTS = ['Pendente', 'Pago', 'Vencido']

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  descricao: '', categoria: 'Outros', valor: 0,
  data: today(), data_vencimento: '', data_pagamento: '',
  status: 'Pendente', obra_id: '', fornecedor: '', documento: '', observacao: '',
}

export default function Despesas() {
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
      const [d, o] = await Promise.all([api.despesas.list(), api.obras.list()])
      setItems(d); setObras(o)
    } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(d) { setForm({ ...EMPTY, ...d, obra_id: d.obra_id ?? '' }); setEditing(d); setModal(true) }

  async function save() {
    if (!form.descricao.trim()) { alert('Descrição é obrigatória.'); return }
    if (!form.data) { alert('Data é obrigatória.'); return }
    setSaving(true)
    try {
      const payload = { ...form, valor: Number(form.valor), obra_id: form.obra_id ? Number(form.obra_id) : null }
      editing ? await api.despesas.update(editing.id, payload) : await api.despesas.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function marcarPago(item) {
    try {
      await api.despesas.update(item.id, { ...item, status: 'Pago', data_pagamento: today() })
      loadAll()
    } catch (e) { alert(e.message) }
  }

  async function remove(item) {
    if (!confirm(`Excluir "${item.descricao}"?`)) return
    try { await api.despesas.delete(item.id); loadAll() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const visible = filter === 'Todos' ? items : items.filter(i => i.status === filter)
  const pendente = items.filter(i => i.status === 'Pendente').reduce((s, i) => s + i.valor, 0)
  const pagoMes  = items.filter(i => i.status === 'Pago' && i.data_pagamento?.slice(0, 7) === today().slice(0, 7))
                        .reduce((s, i) => s + i.valor, 0)
  const vencidos = items.filter(i => i.status === 'Pendente' && i.data_vencimento && i.data_vencimento < today()).length

  const obraName = id => obras.find(o => o.id === id)?.nome || '—'

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Despesas</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Despesa</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{fmtMoney(pendente)}</div>
          <div className="metric-label">A Pagar</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(pagoMes)}</div>
          <div className="metric-label">Pago este Mês</div>
        </div>
        <div className="metric-card metric-red">
          <div className="metric-value">{vencidos}</div>
          <div className="metric-label">Vencidas</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{items.length}</div>
          <div className="metric-label">Total Lançamentos</div>
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
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Fornecedor</th>
              <th>Obra</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhuma despesa encontrada.</td></tr>
            ) : visible.map(item => {
              const vencida = item.status === 'Pendente' && item.data_vencimento && item.data_vencimento < today()
              return (
                <tr key={item.id} style={vencida ? { background: '#fff5f5' } : undefined}>
                  <td>{fmtDate(item.data)}</td>
                  <td><strong>{item.descricao}</strong></td>
                  <td><span style={{ fontSize: 12, background: '#f1f5f9', borderRadius: 4, padding: '2px 6px' }}>{item.categoria}</span></td>
                  <td>{item.fornecedor || '—'}</td>
                  <td>{item.obra_id ? obraName(item.obra_id) : '—'}</td>
                  <td style={vencida ? { color: '#ef4444', fontWeight: 600 } : undefined}>
                    {fmtDate(item.data_vencimento)}
                    {vencida && ' ⚠'}
                  </td>
                  <td><strong>{fmtMoney(item.valor)}</strong></td>
                  <td>
                    <span className={`badge badge-${item.status === 'Pago' ? 'green' : item.status === 'Vencido' || vencida ? 'red' : 'yellow'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {item.status !== 'Pago' && (
                      <button className="btn btn-sm btn-ghost" style={{ color: '#16a34a' }} onClick={() => marcarPago(item)}>Pago</button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)}>Editar</button>
                    <button className="btn btn-sm btn-danger-soft" onClick={() => remove(item)}>Excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Despesa' : 'Nova Despesa'} onClose={() => setModal(false)} width={660}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Descrição *</label>
              <input className="form-input" value={form.descricao} onChange={set('descricao')} placeholder="ex: DARF Simples Nacional 03/2026" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={form.categoria} onChange={set('categoria')}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor} onChange={set('valor')} />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Data Emissão *</label>
                <input className="form-input" type="date" value={form.data} onChange={set('data')} />
              </div>
              <div className="form-group">
                <label className="form-label">Vencimento</label>
                <input className="form-input" type="date" value={form.data_vencimento} onChange={set('data_vencimento')} />
              </div>
              <div className="form-group">
                <label className="form-label">Pagamento</label>
                <input className="form-input" type="date" value={form.data_pagamento} onChange={set('data_pagamento')} />
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
                <label className="form-label">Fornecedor</label>
                <input className="form-input" value={form.fornecedor} onChange={set('fornecedor')} placeholder="Nome ou razão social" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Obra / Projeto</label>
                <select className="form-input" value={form.obra_id} onChange={set('obra_id')}>
                  <option value="">Sem vínculo</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.code} — {o.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nº Documento / NF</label>
                <input className="form-input" value={form.documento} onChange={set('documento')} placeholder="ex: NF 00547" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={2} value={form.observacao} onChange={set('observacao')} />
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
