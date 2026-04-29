import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney } from '../utils.js'

const EMPTY = {
  nome: '', codigo: '', cargo: 'Técnico Eletricista',
  telefone: '', email: '', valor_hora: 0, ativo: 1,
}

const CARGOS = ['Técnico Eletricista', 'Eletricista', 'Engenheiro Eletricista', 'Motorista', 'Encarregado', 'Administrativo']

export default function Tecnicos() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setTecnicos(await api.tecnicos.list())
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(t) { setForm({ ...EMPTY, ...t }); setEditing(t); setModal(true) }

  async function save() {
    if (!form.nome.trim()) { alert('Nome é obrigatório.'); return }
    setSaving(true)
    try {
      const payload = { ...form, valor_hora: Number(form.valor_hora), ativo: Number(form.ativo) }
      editing
        ? await api.tecnicos.update(editing.id, payload)
        : await api.tecnicos.create(payload)
      setModal(false)
      load()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(t) {
    if (!confirm(`Excluir técnico "${t.nome}"?`)) return
    try { await api.tecnicos.delete(t.id); load() }
    catch (e) { alert('Erro: ' + e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const ativos = tecnicos.filter(t => t.ativo)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Técnicos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Técnico</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{ativos.length}</div>
          <div className="metric-label">Técnicos Ativos</div>
        </div>
        <div className="metric-card metric-gray">
          <div className="metric-value">{tecnicos.length - ativos.length}</div>
          <div className="metric-label">Inativos</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Cargo</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Valor/Hora</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td-center">Carregando...</td></tr>
            ) : tecnicos.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhum técnico cadastrado.</td></tr>
            ) : tecnicos.map(t => (
              <tr key={t.id} style={{ opacity: t.ativo ? 1 : 0.5 }}>
                <td><code style={{ fontSize: 12 }}>{t.codigo || '—'}</code></td>
                <td><strong>{t.nome}</strong></td>
                <td>{t.cargo || '—'}</td>
                <td>{t.telefone || '—'}</td>
                <td>{t.email || '—'}</td>
                <td>{t.valor_hora > 0 ? fmtMoney(t.valor_hora) + '/h' : '—'}</td>
                <td>
                  <span className={`badge badge-${t.ativo ? 'green' : 'gray'}`}>
                    {t.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}>Editar</button>
                  {' '}
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(t)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Técnico' : 'Novo Técnico'} onClose={() => setModal(false)} width={580}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input className="form-input" value={form.nome} onChange={set('nome')} />
              </div>
              <div className="form-group">
                <label className="form-label">Código / Matrícula</label>
                <input className="form-input" value={form.codigo} onChange={set('codigo')} placeholder="ex: ADL-01" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cargo</label>
                <select className="form-input" value={form.cargo} onChange={set('cargo')}>
                  {CARGOS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor por Hora (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor_hora} onChange={set('valor_hora')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={form.telefone} onChange={set('telefone')} placeholder="(85) 99999-9999" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={set('email')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Situação</label>
              <select className="form-input" value={form.ativo} onChange={set('ativo')}>
                <option value={1}>Ativo</option>
                <option value={0}>Inativo</option>
              </select>
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
