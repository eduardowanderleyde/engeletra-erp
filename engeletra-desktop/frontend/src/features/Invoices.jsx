import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

const today = () => new Date().toISOString().slice(0, 10)
const in30   = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) }

const EMPTY = { client_id: '', valor: 0, emissao: today(), vencimento: in30(), numero_nf: '', status: 'Aberto' }
const STATUS_OPTS = ['Aberto', 'Pago', 'Cancelado']

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [inv, cl] = await Promise.all([api.invoices.list(), api.clients.list()])
      setInvoices(inv); setClients(cl)
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setLoading(false) }
  }

  const clientName = id => {
    const c = clients.find(c => c.id === id)
    return c ? (c.fantasia || c.razao) : '—'
  }

  function openNew() {
    setEditing(null); setForm(EMPTY); setModal(true)
  }

  function openEdit(inv) {
    setEditing(inv)
    setForm({
      client_id:  inv.client_id,
      valor:      inv.valor,
      emissao:    inv.emissao,
      vencimento: inv.vencimento,
      numero_nf:  inv.numero_nf || '',
      status:     inv.status,
      data_recebimento: inv.data_recebimento || '',
    })
    setModal(true)
  }

  async function save() {
    if (!form.client_id) { alert('Selecione um cliente.'); return }
    if (!form.valor || Number(form.valor) <= 0) { alert('Informe o valor.'); return }
    setSaving(true)
    try {
      const payload = { ...form, client_id: Number(form.client_id), valor: Number(form.valor) }
      if (editing) {
        await api.invoices.update(editing.id, payload)
      } else {
        await api.invoices.create(payload)
      }
      setModal(false); loadAll()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  function parseImpostos(inv) {
    if (inv.impostos) { try { return JSON.parse(inv.impostos) } catch {} }
    const list = []
    if (inv.inss   > 0) list.push({ nome: 'INSS',   percentual: 11.0,  valor: inv.inss   })
    if (inv.iss    > 0) list.push({ nome: 'ISS',    percentual: 5.0,   valor: inv.iss    })
    if (inv.pis    > 0) list.push({ nome: 'PIS',    percentual: 0.65,  valor: inv.pis    })
    if (inv.cofins > 0) list.push({ nome: 'COFINS', percentual: 3.0,   valor: inv.cofins })
    if (inv.csll   > 0) list.push({ nome: 'CSLL',   percentual: 1.0,   valor: inv.csll   })
    if (inv.irpj   > 0) list.push({ nome: 'IRPJ',   percentual: 1.5,   valor: inv.irpj   })
    return list
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const totalAberto = invoices.filter(i => i.status === 'Aberto').reduce((s, i) => s + i.valor, 0)
  const totalPago   = invoices.filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0)
  const totalLiq    = invoices.reduce((s, i) => s + (i.valor_liquido || i.valor), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contas a Receber</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Faturamento</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{invoices.length}</div>
          <div className="metric-label">Total de Faturas</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{fmtMoney(totalAberto)}</div>
          <div className="metric-label">Em Aberto (bruto)</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{fmtMoney(totalPago)}</div>
          <div className="metric-label">Recebido (bruto)</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: '#16a34a' }}>{fmtMoney(totalLiq)}</div>
          <div className="metric-label">Total Líquido</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Cliente</th><th>NF</th><th>Valor Bruto</th>
              <th>Impostos</th><th>Valor Líquido</th><th>Emissão</th>
              <th>Vencimento</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="td-center">Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={10} className="td-center">Nenhuma fatura cadastrada.</td></tr>
            ) : invoices.map(inv => {
              const imps      = parseImpostos(inv)
              const totalImps = imps.reduce((s, i) => s + i.valor, 0)
              const liquido   = inv.valor_liquido || (inv.valor - totalImps)
              const isOpen    = expanded === inv.id
              return (
                <>
                  <tr key={inv.id}>
                    <td><strong>{inv.code}</strong></td>
                    <td>{clientName(inv.client_id)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.numero_nf || '—'}</td>
                    <td><strong>{fmtMoney(inv.valor)}</strong></td>
                    <td>
                      {totalImps > 0
                        ? <span style={{ color: '#ef4444', fontSize: 13, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : inv.id)}>- {fmtMoney(totalImps)} {isOpen ? '▲' : '▼'}</span>
                        : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                    </td>
                    <td><strong style={{ color: '#16a34a' }}>{fmtMoney(liquido)}</strong></td>
                    <td>{fmtDate(inv.emissao)}</td>
                    <td>{fmtDate(inv.vencimento)}</td>
                    <td><span className={`badge badge-${statusColor(inv.status)}`}>{inv.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(inv)}>Editar</button>
                    </td>
                  </tr>
                  {isOpen && imps.length > 0 && (
                    <tr key={`${inv.id}-d`}>
                      <td colSpan={10} style={{ padding: 0, background: '#f8fafc' }}>
                        <div style={{ padding: '10px 24px 14px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Detalhamento — {inv.code}</div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {imps.map(imp => (
                              <div key={imp.nome} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', minWidth: 120, textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{imp.nome} ({imp.percentual}%)</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>- {fmtMoney(imp.valor)}</div>
                              </div>
                            ))}
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 14px', minWidth: 140, textAlign: 'center', marginLeft: 'auto' }}>
                              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>VALOR LÍQUIDO</div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>{fmtMoney(liquido)}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? `Editar Faturamento — ${editing.code}` : 'Novo Faturamento'} onClose={() => setModal(false)} width={600}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Cliente *</label>
                <select className="form-input" value={form.client_id} onChange={set('client_id')}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.valor} onChange={set('valor')} />
              </div>
              <div className="form-group">
                <label className="form-label">Nº NF</label>
                <input className="form-input" value={form.numero_nf} onChange={set('numero_nf')} placeholder="ex: 00123" />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Emissão *</label>
                <input className="form-input" type="date" value={form.emissao} onChange={set('emissao')} />
              </div>
              <div className="form-group">
                <label className="form-label">Vencimento *</label>
                <input className="form-input" type="date" value={form.vencimento} onChange={set('vencimento')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {editing && (
              <div className="form-group">
                <label className="form-label">Data de Recebimento</label>
                <input className="form-input" type="date" value={form.data_recebimento || ''} onChange={set('data_recebimento')} />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Faturamento'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
