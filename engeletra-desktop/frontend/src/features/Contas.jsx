import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney } from '../utils.js'

const TIPOS = ['Corrente', 'Poupança', 'Aplicação', 'Caixa Interno']
const BANCOS = ['Banco do Brasil', 'BNB', 'Bradesco', 'Itaú', 'Caixa Econômica', 'Nubank', 'Outros']

const EMPTY = { banco: '', agencia: '', conta: '', tipo: 'Corrente', saldo_atual: 0, ativo: 1 }

export default function Contas() {
  const [items, setItems]     = useState([])
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try { setItems(await api.contas.list()) } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(c) { setForm({ ...EMPTY, ...c }); setEditing(c); setModal(true) }

  async function save() {
    if (!form.banco.trim()) { alert('Banco é obrigatório.'); return }
    setSaving(true)
    try {
      const payload = { ...form, saldo_atual: Number(form.saldo_atual) }
      editing ? await api.contas.update(editing.id, payload) : await api.contas.create(payload)
      setModal(false); load()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(c) {
    if (!confirm(`Excluir conta "${c.banco}"?`)) return
    try { await api.contas.delete(c.id); load() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const ativas = items.filter(c => c.ativo)
  const saldoTotal = ativas.reduce((s, c) => s + (c.saldo_atual || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contas Bancárias</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Conta</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(saldoTotal)}</div>
          <div className="metric-label">Saldo Total</div>
        </div>
        <div className="metric-card metric-blue">
          <div className="metric-value">{ativas.length}</div>
          <div className="metric-label">Contas Ativas</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{items.filter(c => !c.ativo).length}</div>
          <div className="metric-label">Inativas</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {ativas.map(c => (
          <div key={c.id} style={{
            background: '#fff', borderRadius: 12, padding: '20px 24px',
            border: '1px solid #e2e8f0', minWidth: 220, flex: '0 0 auto',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.tipo}</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 2px' }}>{c.banco}</div>
            {c.agencia && <div style={{ fontSize: 12, color: '#94a3b8' }}>Ag {c.agencia} · Cc {c.conta}</div>}
            <div style={{ fontSize: 22, fontWeight: 700, color: c.saldo_atual >= 0 ? '#16a34a' : '#ef4444', margin: '12px 0 12px' }}>
              {fmtMoney(c.saldo_atual)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => openEdit(c)}>Editar</button>
              <button className="btn btn-sm btn-danger-soft" onClick={() => remove(c)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {items.filter(c => !c.ativo).length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Inativas</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Banco</th><th>Tipo</th><th>Ag / Conta</th><th>Saldo</th><th>Ações</th></tr></thead>
              <tbody>
                {items.filter(c => !c.ativo).map(c => (
                  <tr key={c.id}>
                    <td>{c.banco}</td>
                    <td>{c.tipo}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.agencia} / {c.conta}</td>
                    <td>{fmtMoney(c.saldo_atual)}</td>
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
        </>
      )}

      {modal && (
        <Modal title={editing ? 'Editar Conta' : 'Nova Conta'} onClose={() => setModal(false)} width={520}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Banco *</label>
                <select className="form-input" value={form.banco} onChange={set('banco')}>
                  <option value="">Selecionar...</option>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.tipo} onChange={set('tipo')}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Agência</label>
                <input className="form-input" value={form.agencia} onChange={set('agencia')} placeholder="ex: 1234-5" />
              </div>
              <div className="form-group">
                <label className="form-label">Conta</label>
                <input className="form-input" value={form.conta} onChange={set('conta')} placeholder="ex: 00012345-6" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Saldo Atual (R$)</label>
                <input className="form-input" type="number" step={0.01} value={form.saldo_atual} onChange={set('saldo_atual')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: Number(e.target.value) }))}>
                  <option value={1}>Ativa</option>
                  <option value={0}>Inativa</option>
                </select>
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
