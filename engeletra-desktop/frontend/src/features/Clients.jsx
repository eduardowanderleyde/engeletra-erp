import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'

const EMPTY = {
  razao: '', fantasia: '', cnpj: '', cidade: '', estado: '',
  responsavel: '', telefone: '', email: '', sla: 'Normal', historico: '',
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setClients(await api.clients.list())
    } catch (e) {
      alert('Erro ao carregar clientes: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setForm(EMPTY)
    setEditing(null)
    setModal(true)
  }

  function openEdit(c) {
    setForm({ ...EMPTY, ...c })
    setEditing(c)
    setModal(true)
  }

  async function save() {
    if (!form.razao.trim()) { alert('Razão Social é obrigatória.'); return }
    setSaving(true)
    try {
      editing
        ? await api.clients.update(editing.id, form)
        : await api.clients.create(form)
      setModal(false)
      load()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(c) {
    if (!confirm(`Excluir o cliente "${c.fantasia || c.razao}"?`)) return
    try {
      await api.clients.delete(c.id)
      load()
    } catch (e) {
      alert('Não foi possível excluir: ' + e.message)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const slaColor = s => s === 'Crítico' ? 'red' : s === 'Prioritário' ? 'yellow' : 'gray'

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Cliente</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome Fantasia</th>
              <th>Razão Social</th>
              <th>CNPJ</th>
              <th>Cidade / UF</th>
              <th>Responsável</th>
              <th>Telefone</th>
              <th>SLA</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td-center">Carregando...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhum cliente cadastrado.</td></tr>
            ) : clients.map(c => (
              <tr key={c.id}>
                <td><strong>{c.fantasia || '—'}</strong></td>
                <td>{c.razao}</td>
                <td>{c.cnpj || '—'}</td>
                <td>{c.cidade ? `${c.cidade}${c.estado ? ` / ${c.estado}` : ''}` : '—'}</td>
                <td>{c.responsavel || '—'}</td>
                <td>{c.telefone || '—'}</td>
                <td><span className={`badge badge-${slaColor(c.sla)}`}>{c.sla || 'Normal'}</span></td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(c)}>Editar</button>
                  {' '}
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(c)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Cliente' : 'Novo Cliente'}
          onClose={() => setModal(false)}
          width={660}
        >
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Razão Social *</label>
                <input className="form-input" value={form.razao} onChange={set('razao')} />
              </div>
              <div className="form-group">
                <label className="form-label">Nome Fantasia</label>
                <input className="form-input" value={form.fantasia} onChange={set('fantasia')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CNPJ</label>
                <input className="form-input" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" />
              </div>
              <div className="form-group">
                <label className="form-label">SLA</label>
                <select className="form-input" value={form.sla} onChange={set('sla')}>
                  <option>Normal</option>
                  <option>Prioritário</option>
                  <option>Crítico</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input className="form-input" value={form.cidade} onChange={set('cidade')} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <input className="form-input" value={form.estado} onChange={set('estado')} placeholder="CE" maxLength={2} style={{ textTransform: 'uppercase' }} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Responsável</label>
                <input className="form-input" value={form.responsavel} onChange={set('responsavel')} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={form.telefone} onChange={set('telefone')} placeholder="(85) 99999-9999" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} />
            </div>

            <div className="form-group">
              <label className="form-label">Histórico / Observações</label>
              <textarea className="form-input" rows={3} value={form.historico} onChange={set('historico')} />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
