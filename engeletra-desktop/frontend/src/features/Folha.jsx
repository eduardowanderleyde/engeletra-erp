import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney } from '../utils.js'

const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const STATUS_OPTS = ['Pendente', 'Pago', 'Parcial']

const EMPTY = {
  tecnico_id: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear(),
  salario_base: 0, horas_extras: 0, valor_extras: 0,
  total_bruto: 0, descontos: 0, total_liquido: 0,
  status: 'Pendente', observacao: '',
}

export default function Folha() {
  const [items, setItems]       = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [mes, setMes]           = useState(new Date().getMonth() + 1)
  const [ano, setAno]           = useState(new Date().getFullYear())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [f, t] = await Promise.all([api.folha.list(), api.tecnicos.list()])
      setItems(f); setTecnicos(t)
    } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm({ ...EMPTY, mes, ano }); setEditing(null); setModal(true) }
  function openEdit(i) { setForm({ ...EMPTY, ...i }); setEditing(i); setModal(true) }

  async function save() {
    if (!form.tecnico_id) { alert('Selecione o técnico.'); return }
    setSaving(true)
    try {
      const n = f => Number(f) || 0
      const bruto = n(form.salario_base) + n(form.valor_extras)
      const liquido = bruto - n(form.descontos)
      const payload = {
        ...form,
        tecnico_id: Number(form.tecnico_id),
        mes: Number(form.mes),
        ano: Number(form.ano),
        salario_base: n(form.salario_base),
        horas_extras: n(form.horas_extras),
        valor_extras: n(form.valor_extras),
        total_bruto: bruto,
        descontos: n(form.descontos),
        total_liquido: liquido,
      }
      editing ? await api.folha.update(editing.id, payload) : await api.folha.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function marcarPago(i) {
    try {
      await api.folha.update(i.id, { ...i, status: 'Pago' })
      loadAll()
    } catch (e) { alert(e.message) }
  }

  async function remove(i) {
    if (!confirm('Excluir registro de folha?')) return
    try { await api.folha.delete(i.id); loadAll() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const visible = items.filter(i => i.mes === mes && i.ano === ano)
  const totalBruto = visible.reduce((s, i) => s + (i.total_bruto || 0), 0)
  const totalLiquido = visible.reduce((s, i) => s + (i.total_liquido || 0), 0)
  const pendentes = visible.filter(i => i.status === 'Pendente').length

  function navMes(dir) {
    let m = mes + dir, a = ano
    if (m < 1) { m = 12; a-- }
    if (m > 12) { m = 1; a++ }
    setMes(m); setAno(a)
  }

  const tecNome = id => tecnicos.find(t => t.id === id)?.nome || '—'

  // Auto-calc no form
  const brutoCalc = (Number(form.salario_base) || 0) + (Number(form.valor_extras) || 0)
  const liquidoCalc = brutoCalc - (Number(form.descontos) || 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Folha de Pagamento</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar</button>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(-1)}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 180, textAlign: 'center' }}>{MESES_NOME[mes - 1]} / {ano}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(1)}>▶</button>
      </div>

      {/* Totais */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{visible.length}</div>
          <div className="metric-label">Técnicos</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{fmtMoney(totalBruto)}</div>
          <div className="metric-label">Total Bruto</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalLiquido)}</div>
          <div className="metric-label">Total Líquido</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{pendentes}</div>
          <div className="metric-label">A Pagar</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Técnico</th>
              <th>Salário Base</th>
              <th>H. Extras</th>
              <th>Valor Extras</th>
              <th>Total Bruto</th>
              <th>Descontos</th>
              <th>Líquido</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum lançamento para {MESES_NOME[mes - 1]}/{ano}.</td></tr>
            ) : visible.map(i => (
              <tr key={i.id}>
                <td><strong>{tecNome(i.tecnico_id)}</strong></td>
                <td>{fmtMoney(i.salario_base)}</td>
                <td>{i.horas_extras > 0 ? `${i.horas_extras}h` : '—'}</td>
                <td>{i.valor_extras > 0 ? fmtMoney(i.valor_extras) : '—'}</td>
                <td style={{ fontWeight: 600 }}>{fmtMoney(i.total_bruto)}</td>
                <td style={{ color: '#dc2626' }}>{i.descontos > 0 ? fmtMoney(i.descontos) : '—'}</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>{fmtMoney(i.total_liquido)}</td>
                <td>
                  <span className={`badge badge-${i.status === 'Pago' ? 'green' : i.status === 'Parcial' ? 'yellow' : 'red'}`}>
                    {i.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {i.status !== 'Pago' && (
                    <button className="btn btn-sm btn-ghost" style={{ color: '#16a34a' }} onClick={() => marcarPago(i)}>Pago</button>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(i)}>Editar</button>
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(i)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Folha' : 'Novo Lançamento'} onClose={() => setModal(false)} width={580}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Técnico *</label>
                <select className="form-input" value={form.tecnico_id} onChange={set('tecnico_id')}>
                  <option value="">Selecionar...</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Competência</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-input" value={form.mes} onChange={set('mes')}>
                    {MESES_CURTO.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                  <input className="form-input" type="number" value={form.ano} onChange={set('ano')} style={{ width: 90 }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Salário Base (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.salario_base} onChange={set('salario_base')} />
              </div>
              <div className="form-group">
                <label className="form-label">H. Extras (qtd)</label>
                <input className="form-input" type="number" min={0} step={0.5} value={form.horas_extras} onChange={set('horas_extras')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Extras (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor_extras} onChange={set('valor_extras')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Descontos (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.descontos} onChange={set('descontos')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* Calculado em tempo real */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 12, display: 'flex', gap: 24 }}>
              <span>Bruto: <strong>{fmtMoney(brutoCalc)}</strong></span>
              <span>Descontos: <strong style={{ color: '#dc2626' }}>{fmtMoney(Number(form.descontos) || 0)}</strong></span>
              <span>Líquido: <strong style={{ color: '#16a34a' }}>{fmtMoney(liquidoCalc)}</strong></span>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <input className="form-input" value={form.observacao} onChange={set('observacao')} />
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
