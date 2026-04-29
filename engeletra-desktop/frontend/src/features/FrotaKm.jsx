import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtDate, fmtMoney } from '../utils.js'

const today = () => new Date().toISOString().split('T')[0]

const EMPTY = {
  veiculo_id: '', data: today(), km_inicial: 0, km_final: 0,
  motorista: '', obra_id: '', abastecimento: 0, observacao: '',
}

export default function FrotaKm() {
  const [registros, setRegistros] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [km, ve, ob] = await Promise.all([
        api.frotaKm.list(), api.veiculos.list(), api.obras.list(),
      ])
      setRegistros(km)
      setVeiculos(ve)
      setObras(ob)
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function veiculoLabel(id) {
    const v = veiculos.find(v => v.id === id)
    return v ? `${v.modelo} — ${v.placa}` : '—'
  }

  function obraLabel(id) {
    const o = obras.find(o => o.id === id)
    return o ? `${o.code} — ${o.nome}` : '—'
  }

  function openNew() { setForm(EMPTY); setModal(true) }

  async function save() {
    if (!form.veiculo_id) { alert('Selecione um veículo.'); return }
    if (!form.data) { alert('Data é obrigatória.'); return }
    if (Number(form.km_final) < Number(form.km_inicial)) {
      alert('KM final não pode ser menor que KM inicial.')
      return
    }
    setSaving(true)
    try {
      await api.frotaKm.create({
        ...form,
        veiculo_id: Number(form.veiculo_id),
        km_inicial: Number(form.km_inicial),
        km_final: Number(form.km_final),
        obra_id: form.obra_id ? Number(form.obra_id) : null,
        abastecimento: Number(form.abastecimento),
      })
      setModal(false)
      loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const kmPrev = Math.max(0, Number(form.km_final) - Number(form.km_inicial))

  const totalKmHoje = registros
    .filter(r => r.data === today())
    .reduce((s, r) => s + (r.km_rodado || 0), 0)

  const totalAbast = registros.reduce((s, r) => s + (r.abastecimento || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Controle Diário de KM</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Dia</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{totalKmHoje.toLocaleString('pt-BR')} km</div>
          <div className="metric-label">KM Rodado Hoje</div>
        </div>
        <div className="metric-card metric-gray">
          <div className="metric-value">{registros.length}</div>
          <div className="metric-label">Registros Totais</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{fmtMoney(totalAbast)}</div>
          <div className="metric-label">Total Abastecido</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Veículo</th>
              <th>Motorista</th>
              <th>KM Inicial</th>
              <th>KM Final</th>
              <th>KM Rodado</th>
              <th>Abastecimento</th>
              <th>Obra</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td-center">Carregando...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum registro de KM.</td></tr>
            ) : registros.map(r => (
              <tr key={r.id}>
                <td>{fmtDate(r.data)}</td>
                <td><strong>{veiculoLabel(r.veiculo_id)}</strong></td>
                <td>{r.motorista || '—'}</td>
                <td>{r.km_inicial?.toLocaleString('pt-BR')}</td>
                <td>{r.km_final?.toLocaleString('pt-BR')}</td>
                <td><strong style={{ color: '#1d4ed8' }}>{r.km_rodado?.toLocaleString('pt-BR')} km</strong></td>
                <td>{r.abastecimento > 0 ? fmtMoney(r.abastecimento) : '—'}</td>
                <td style={{ fontSize: 12 }}>{r.obra_id ? obraLabel(r.obra_id) : '—'}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{r.observacao || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Registrar Dia de Uso" onClose={() => setModal(false)} width={600}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Veículo *</label>
                <select className="form-input" value={form.veiculo_id} onChange={set('veiculo_id')}>
                  <option value="">Selecione...</option>
                  {veiculos.filter(v => v.ativo).map(v => (
                    <option key={v.id} value={v.id}>{v.modelo} — {v.placa}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input className="form-input" type="date" value={form.data} onChange={set('data')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">KM Inicial</label>
                <input className="form-input" type="number" min={0} value={form.km_inicial} onChange={set('km_inicial')} />
              </div>
              <div className="form-group">
                <label className="form-label">KM Final</label>
                <input className="form-input" type="number" min={0} value={form.km_final} onChange={set('km_final')} />
              </div>
            </div>

            {kmPrev > 0 && (
              <div className="calc-preview">
                <span className="calc-label">KM Rodado</span>
                <span className="calc-value">{kmPrev.toLocaleString('pt-BR')} km</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Motorista</label>
                <input className="form-input" value={form.motorista} onChange={set('motorista')} />
              </div>
              <div className="form-group">
                <label className="form-label">Abastecimento (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.abastecimento} onChange={set('abastecimento')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Obra / Destino</label>
              <select className="form-input" value={form.obra_id} onChange={set('obra_id')}>
                <option value="">Sem vínculo</option>
                {obras.filter(o => o.status === 'Em andamento').map(o => (
                  <option key={o.id} value={o.id}>{o.code} — {o.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Observação</label>
              <input className="form-input" value={form.observacao} onChange={set('observacao')} placeholder="ex: Visita técnica, busca de material..." />
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
