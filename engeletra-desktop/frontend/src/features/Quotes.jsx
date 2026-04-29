import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

const EMPTY = {
  client_id: '', pessoas: 1, horas: 0, km: 0,
  veiculo: 'Carro', valor_hora: 120, valor_km: 3.5,
  materiais: 0, munck: 1500, observacoes: '', status: 'Rascunho',
}

function calcTotal(f) {
  const labor = Number(f.pessoas) * Number(f.horas) * Number(f.valor_hora)
  const travel = Number(f.km) * Number(f.valor_km)
  const mats = Number(f.materiais)
  const munck = f.veiculo === 'Munck' ? Number(f.munck) : 0
  return labor + travel + mats + munck
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [q, c] = await Promise.all([api.quotes.list(), api.clients.list()])
      setQuotes(q)
      setClients(c)
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
    setSaving(true)
    try {
      await api.quotes.create({
        ...form,
        client_id: Number(form.client_id),
        pessoas: Number(form.pessoas),
        horas: Number(form.horas),
        km: Number(form.km),
        valor_hora: Number(form.valor_hora),
        valor_km: Number(form.valor_km),
        materiais: Number(form.materiais),
        munck: Number(form.munck),
      })
      setModal(false)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function approve(q) {
    if (!confirm(`Aprovar orçamento ${q.code} e gerar Ordem de Serviço?`)) return
    try {
      await api.quotes.approve(q.id)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const num = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const total = calcTotal(form)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Orçamentos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Orçamento</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Pessoas</th>
              <th>Horas</th>
              <th>Veículo</th>
              <th>Total</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td-center">Carregando...</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum orçamento cadastrado.</td></tr>
            ) : quotes.map(q => (
              <tr key={q.id}>
                <td><strong>{q.code}</strong></td>
                <td>{clientName(q.client_id)}</td>
                <td>{q.pessoas}</td>
                <td>{q.horas}h</td>
                <td>{q.veiculo}</td>
                <td><strong>{fmtMoney(q.total)}</strong></td>
                <td><span className={`badge badge-${statusColor(q.status)}`}>{q.status}</span></td>
                <td>{fmtDate(q.created_at)}</td>
                <td>
                  {q.status !== 'Aprovado' && q.status !== 'Reprovado' && (
                    <button className="btn btn-sm btn-success" onClick={() => approve(q)}>
                      Aprovar
                    </button>
                  )}
                  {q.service_order_id && (
                    <span className="info-tag" style={{ marginLeft: 8 }}>OS gerada</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Novo Orçamento" onClose={() => setModal(false)} width={680}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Cliente *</label>
                <select className="form-input" value={form.client_id} onChange={set('client_id')}>
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section">Mão de obra</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Nº de Pessoas</label>
                <input className="form-input" type="number" min={1} value={form.pessoas} onChange={num('pessoas')} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas Previstas</label>
                <input className="form-input" type="number" min={0} step={0.5} value={form.horas} onChange={num('horas')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor / Hora (R$)</label>
                <input className="form-input" type="number" min={0} step={1} value={form.valor_hora} onChange={num('valor_hora')} />
              </div>
            </div>

            <div className="form-section">Deslocamento</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Veículo</label>
                <select className="form-input" value={form.veiculo} onChange={set('veiculo')}>
                  <option>Carro</option>
                  <option>Caminhão</option>
                  <option>Munck</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">KM Rodado</label>
                <input className="form-input" type="number" min={0} value={form.km} onChange={num('km')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor / KM (R$)</label>
                <input className="form-input" type="number" min={0} step={0.1} value={form.valor_km} onChange={num('valor_km')} />
              </div>
            </div>

            {form.veiculo === 'Munck' && (
              <div className="form-group">
                <label className="form-label">Adicional Munck (R$)</label>
                <input className="form-input" type="number" min={0} value={form.munck} onChange={num('munck')} />
              </div>
            )}

            <div className="form-section">Materiais e observações</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Materiais Previstos (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.materiais} onChange={num('materiais')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  <option>Rascunho</option>
                  <option>Enviado</option>
                  <option>Aprovado</option>
                  <option>Reprovado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={3} value={form.observacoes} onChange={set('observacoes')} />
            </div>

            <div className="calc-preview">
              <span className="calc-label">Total calculado</span>
              <span className="calc-value">{fmtMoney(total)}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Orçamento'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
