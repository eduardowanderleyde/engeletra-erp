import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'

const EMPTY = { username: '', password: '' }

export default function GerenciarContas() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setUsers(await api.users.list())
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!form.username.trim()) { alert('Usuário é obrigatório.'); return }
    if (form.password.length < 6) { alert('Senha deve ter ao menos 6 caracteres.'); return }
    setSaving(true)
    try {
      await api.users.create({ username: form.username.trim(), password: form.password })
      setModal(false)
      setForm(EMPTY)
      load()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(u) {
    if (!confirm(`Excluir usuário "${u.username}"?`)) return
    try {
      await api.users.delete(u.id)
      load()
    } catch (e) {
      alert('Erro: ' + e.message)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gerenciar Contas</h1>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}>
          + Nova Conta
        </button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{users.length}</div>
          <div className="metric-label">Total de Usuários</div>
        </div>
        <div className="metric-card metric-gray">
          <div className="metric-value">{users.filter(u => u.role === 'admin').length}</div>
          <div className="metric-label">Administradores</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="td-center">Carregando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="td-center">Nenhum usuário encontrado.</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td><strong>{u.username}</strong></td>
                <td>
                  <span className={`badge badge-${u.role === 'admin' ? 'blue' : 'green'}`}>
                    {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </td>
                <td>{u.created_at ? u.created_at.slice(0, 10) : '—'}</td>
                <td>
                  {u.role !== 'admin' && (
                    <button className="btn btn-sm btn-danger-soft" onClick={() => remove(u)}>
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Nova Conta" onClose={() => setModal(false)} width={420}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nome de usuário *</label>
              <input
                className="form-input"
                value={form.username}
                onChange={set('username')}
                placeholder="ex: joao.silva"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha *</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>
              Este usuário terá acesso a todos os módulos do sistema, exceto Gerenciar Contas.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
