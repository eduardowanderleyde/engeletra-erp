import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'

const EMPTY = { placa: '', modelo: '', tipo: 'Carro', km_atual: 0, ano: '', cor: '', ativo: 1 }
const TIPOS = ['Carro', 'Caminhão', 'Munck', 'Van', 'Moto']

const TIPO_ICON = { Carro: '🚗', Caminhão: '🚛', Munck: '🏗️', Van: '🚐', Moto: '🏍️' }

export default function Veiculos() {
  const [veiculos, setVeiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try { setVeiculos(await api.veiculos.list()) }
    catch (e) { alert('Erro: ' + e.message) }
    finally { setLoading(false) }
  }

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(v) { setForm({ ...EMPTY, ...v }); setEditing(v); setModal(true) }

  async function save() {
    if (!form.placa.trim()) { alert('Placa é obrigatória.'); return }
    if (!form.modelo.trim()) { alert('Modelo é obrigatório.'); return }
    setSaving(true)
    try {
      const payload = { ...form, km_atual: Number(form.km_atual), ano: form.ano ? Number(form.ano) : null, ativo: Number(form.ativo) }
      editing
        ? await api.veiculos.update(editing.id, payload)
        : await api.veiculos.create(payload)
      setModal(false); load()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const ativos = veiculos.filter(v => v.ativo)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Veículos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Veículo</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{ativos.length}</div>
          <div className="metric-label">Veículos Ativos</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{veiculos.filter(v => v.tipo === 'Munck').length}</div>
          <div className="metric-label">Munck(s)</div>
        </div>
        <div className="metric-card metric-gray">
          <div className="metric-value">
            {ativos.length > 0
              ? Math.round(ativos.reduce((s, v) => s + v.km_atual, 0) / ativos.length).toLocaleString('pt-BR')
              : 0} km
          </div>
          <div className="metric-label">KM Médio</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Placa</th>
              <th>Modelo</th>
              <th>Ano</th>
              <th>Cor</th>
              <th>KM Atual</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td-center">Carregando...</td></tr>
            ) : veiculos.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhum veículo cadastrado.</td></tr>
            ) : veiculos.map(v => (
              <tr key={v.id} style={{ opacity: v.ativo ? 1 : 0.5 }}>
                <td>{TIPO_ICON[v.tipo] || '🚗'} {v.tipo}</td>
                <td><strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{v.placa}</strong></td>
                <td>{v.modelo}</td>
                <td>{v.ano || '—'}</td>
                <td>{v.cor || '—'}</td>
                <td>{v.km_atual?.toLocaleString('pt-BR')} km</td>
                <td><span className={`badge badge-${v.ativo ? 'green' : 'gray'}`}>{v.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(v)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Veículo' : 'Novo Veículo'} onClose={() => setModal(false)} width={560}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Placa *</label>
                <input className="form-input" value={form.placa} onChange={set('placa')} placeholder="SOE2E51" style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: 2 }} />
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
                <label className="form-label">Modelo *</label>
                <input className="form-input" value={form.modelo} onChange={set('modelo')} placeholder="ex: Fiat Strada" />
              </div>
              <div className="form-group">
                <label className="form-label">Ano</label>
                <input className="form-input" type="number" value={form.ano} onChange={set('ano')} placeholder="2022" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cor</label>
                <input className="form-input" value={form.cor} onChange={set('cor')} placeholder="Branca" />
              </div>
              <div className="form-group">
                <label className="form-label">KM Atual</label>
                <input className="form-input" type="number" min={0} value={form.km_atual} onChange={set('km_atual')} />
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
