import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'

const EMPTY = {
  client_id: '', tipo: '', serie: '', potencia: '', tensao: '',
  fabricante: '', ano: '', localizacao: '', ultima_manutencao: '', proxima_manutencao: '',
}

export default function Equipment() {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [eq, cl] = await Promise.all([api.equipment.list(), api.clients.list()])
      setItems(eq)
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
    setModal(true)
  }

  async function save() {
    if (!form.client_id) { alert('Selecione um cliente.'); return }
    if (!form.tipo.trim()) { alert('Tipo do equipamento é obrigatório.'); return }
    setSaving(true)
    try {
      await api.equipment.create({ ...form, client_id: Number(form.client_id), ano: form.ano ? Number(form.ano) : null })
      setModal(false)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Equipamentos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Equipamento</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Série</th>
              <th>Potência</th>
              <th>Tensão</th>
              <th>Fabricante</th>
              <th>Ano</th>
              <th>Cliente</th>
              <th>Localização</th>
              <th>Próx. Manutenção</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td-center">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum equipamento cadastrado.</td></tr>
            ) : items.map(eq => (
              <tr key={eq.id}>
                <td><strong>{eq.tipo}</strong></td>
                <td>{eq.serie || '—'}</td>
                <td>{eq.potencia || '—'}</td>
                <td>{eq.tensao || '—'}</td>
                <td>{eq.fabricante || '—'}</td>
                <td>{eq.ano || '—'}</td>
                <td>{clientName(eq.client_id)}</td>
                <td>{eq.localizacao || '—'}</td>
                <td>{eq.proxima_manutencao || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Novo Equipamento" onClose={() => setModal(false)} width={660}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <select className="form-input" value={form.client_id} onChange={set('client_id')}>
                <option value="">Selecione...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <input className="form-input" value={form.tipo} onChange={set('tipo')} placeholder="ex: Transformador" />
              </div>
              <div className="form-group">
                <label className="form-label">Número de Série</label>
                <input className="form-input" value={form.serie} onChange={set('serie')} />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Potência</label>
                <input className="form-input" value={form.potencia} onChange={set('potencia')} placeholder="ex: 150 kVA" />
              </div>
              <div className="form-group">
                <label className="form-label">Tensão</label>
                <input className="form-input" value={form.tensao} onChange={set('tensao')} placeholder="ex: 13,8 kV" />
              </div>
              <div className="form-group">
                <label className="form-label">Ano de Fabricação</label>
                <input className="form-input" type="number" value={form.ano} onChange={set('ano')} placeholder="ex: 2015" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fabricante</label>
                <input className="form-input" value={form.fabricante} onChange={set('fabricante')} />
              </div>
              <div className="form-group">
                <label className="form-label">Localização</label>
                <input className="form-input" value={form.localizacao} onChange={set('localizacao')} placeholder="ex: Subestação 1" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Última Manutenção</label>
                <input className="form-input" type="date" value={form.ultima_manutencao} onChange={set('ultima_manutencao')} />
              </div>
              <div className="form-group">
                <label className="form-label">Próxima Manutenção</label>
                <input className="form-input" type="date" value={form.proxima_manutencao} onChange={set('proxima_manutencao')} />
              </div>
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
