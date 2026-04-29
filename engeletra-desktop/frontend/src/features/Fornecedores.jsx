import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'

const CATEGORIAS = ['Elétrico', 'Ferramentas', 'EPI', 'Combustível', 'Transportadora', 'Serviços', 'Outros']

const EMPTY = {
  razao: '', fantasia: '', cnpj: '', categoria: '',
  telefone: '', email: '', contato: '', observacao: '',
}

export default function Fornecedores() {
  const [items, setItems]   = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try { setItems(await api.fornecedores.list()) } catch (e) { alert(e.message) }
  }

  function openNew()  { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(f){ setForm({ ...EMPTY, ...f }); setEditing(f); setModal(true) }

  async function save() {
    if (!form.razao.trim()) { alert('Razão social é obrigatória.'); return }
    setSaving(true)
    try {
      editing ? await api.fornecedores.update(editing.id, form) : await api.fornecedores.create(form)
      setModal(false); load()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(f) {
    if (!confirm(`Excluir "${f.fantasia || f.razao}"?`)) return
    try { await api.fornecedores.delete(f.id); load() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const visible = items.filter(f => {
    const q = search.toLowerCase()
    return !q || (f.razao + f.fantasia + f.cnpj + f.contato).toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fornecedores</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Fornecedor</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{items.length}</div>
          <div className="metric-label">Cadastrados</div>
        </div>
        {CATEGORIAS.slice(0, 2).map(cat => (
          <div key={cat} className="metric-card">
            <div className="metric-value">{items.filter(f => f.categoria === cat).length}</div>
            <div className="metric-label">{cat}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ maxWidth: 360 }}
          placeholder="Buscar por nome, CNPJ ou contato..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Razão / Fantasia</th>
              <th>CNPJ</th>
              <th>Categoria</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="td-center">Nenhum fornecedor encontrado.</td></tr>
            ) : visible.map(f => (
              <tr key={f.id}>
                <td>
                  <strong>{f.fantasia || f.razao}</strong>
                  {f.fantasia && <div style={{ fontSize: 12, color: '#64748b' }}>{f.razao}</div>}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{f.cnpj || '—'}</td>
                <td>{f.categoria || '—'}</td>
                <td>{f.contato || '—'}</td>
                <td>{f.telefone || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(f)}>Editar</button>
                  {' '}
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(f)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(false)} width={620}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Razão Social *</label>
                <input className="form-input" value={form.razao} onChange={set('razao')} placeholder="ex: Distribuidora Elétrica Nordeste Ltda" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome Fantasia</label>
                <input className="form-input" value={form.fantasia} onChange={set('fantasia')} />
              </div>
              <div className="form-group">
                <label className="form-label">CNPJ</label>
                <input className="form-input" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={form.categoria} onChange={set('categoria')}>
                  <option value="">Selecionar...</option>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contato</label>
                <input className="form-input" value={form.contato} onChange={set('contato')} placeholder="Nome do responsável" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={form.telefone} onChange={set('telefone')} />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={form.email} onChange={set('email')} />
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
