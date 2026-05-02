import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney, fmtDate, statusColor } from '../utils.js'

const EMPTY = {
  client_id: '', pessoas: 1, horas: 0, km: 0,
  veiculo: 'Carro', valor_hora: 120, valor_km: 3.5,
  materiais: 0, munck: 1500, observacoes: '', status: 'Rascunho',
}

const IMPOSTOS_PADRAO = [
  { nome: 'INSS',   percentual: 11.0  },
  { nome: 'ISS',    percentual: 5.0   },
  { nome: 'PIS',    percentual: 0.65  },
  { nome: 'COFINS', percentual: 3.0   },
  { nome: 'CSLL',   percentual: 1.0   },
  { nome: 'IRPJ',   percentual: 1.5   },
  { nome: 'SEGURO', percentual: 5.0   },
]

function calcTotal(f) {
  const labor = Number(f.pessoas) * Number(f.horas) * Number(f.valor_hora)
  const travel = Number(f.km) * Number(f.valor_km)
  const mats = Number(f.materiais)
  const munck = f.veiculo === 'Munck' ? Number(f.munck) : 0
  return labor + travel + mats + munck
}

export default function Quotes() {
  const [quotes, setQuotes]   = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [impostos, setImpostos] = useState([])
  const [selectImp, setSelectImp] = useState('')
  const [customNome, setCustomNome] = useState('')
  const [customPerc, setCustomPerc] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [saving, setSaving]   = useState(false)

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
    setImpostos([])
    setSelectImp('')
    setShowCustom(false)
    setModal(true)
  }

  function handleSelectImp(val) {
    setSelectImp(val)
    if (val === '__custom__') {
      setShowCustom(true)
      return
    }
    if (!val) return
    const padrao = IMPOSTOS_PADRAO.find(i => i.nome === val)
    if (!padrao) return
    if (impostos.find(i => i.nome === padrao.nome)) return // já existe
    addImposto(padrao.nome, padrao.percentual)
    setSelectImp('')
  }

  function addImposto(nome, percentual) {
    const total = calcTotal(form)
    const valor = round2(total * (Number(percentual) / 100))
    setImpostos(prev => [...prev, { nome: nome.trim().toUpperCase(), percentual: Number(percentual), valor }])
  }

  function addCustom() {
    if (!customNome.trim()) { alert('Informe o nome do imposto.'); return }
    if (!customPerc || isNaN(customPerc) || Number(customPerc) <= 0) { alert('Informe um percentual válido.'); return }
    if (impostos.find(i => i.nome === customNome.trim().toUpperCase())) { alert('Imposto já adicionado.'); return }
    addImposto(customNome, customPerc)
    setCustomNome('')
    setCustomPerc('')
    setShowCustom(false)
    setSelectImp('')
  }

  function removeImposto(nome) {
    setImpostos(prev => prev.filter(i => i.nome !== nome))
  }

  function updatePercImposto(nome, percStr) {
    const perc = parseFloat(percStr) || 0
    const total = calcTotal(form)
    setImpostos(prev => prev.map(i =>
      i.nome === nome
        ? { ...i, percentual: perc, valor: round2(total * (perc / 100)) }
        : i
    ))
  }

  // Recalculate imposto values whenever total changes
  function recalcImpostos(newForm) {
    const total = calcTotal(newForm)
    setImpostos(prev => prev.map(i => ({ ...i, valor: round2(total * (i.percentual / 100)) })))
  }

  function setField(k) {
    return e => {
      const newForm = { ...form, [k]: e.target.value }
      setForm(newForm)
      recalcImpostos(newForm)
    }
  }

  async function save() {
    if (!form.client_id) { alert('Selecione um cliente.'); return }
    setSaving(true)
    try {
      await api.quotes.create({
        ...form,
        client_id: Number(form.client_id),
        pessoas:   Number(form.pessoas),
        horas:     Number(form.horas),
        km:        Number(form.km),
        valor_hora: Number(form.valor_hora),
        valor_km:  Number(form.valor_km),
        materiais: Number(form.materiais),
        munck:     Number(form.munck),
        impostos:  impostos.length > 0 ? impostos : null,
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

  const total     = calcTotal(form)
  const totalImp  = impostos.reduce((s, i) => s + i.valor, 0)
  const liquido   = total - totalImp

  const nomesAdicionados = new Set(impostos.map(i => i.nome))

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
              <th>Total Bruto</th>
              <th>Impostos</th>
              <th>Valor Líquido</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="td-center">Carregando...</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={11} className="td-center">Nenhum orçamento cadastrado.</td></tr>
            ) : quotes.map(q => {
              const imps = q.impostos ? JSON.parse(q.impostos) : []
              const totalImps = imps.reduce((s, i) => s + i.valor, 0)
              return (
                <tr key={q.id}>
                  <td><strong>{q.code}</strong></td>
                  <td>{clientName(q.client_id)}</td>
                  <td>{q.pessoas}</td>
                  <td>{q.horas}h</td>
                  <td>{q.veiculo}</td>
                  <td><strong>{fmtMoney(q.total)}</strong></td>
                  <td>
                    {imps.length > 0
                      ? <span style={{ fontSize: 12, color: '#ef4444' }}>- {fmtMoney(totalImps)}</span>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    {imps.length > 0
                      ? <strong style={{ color: '#16a34a' }}>{fmtMoney(q.total - totalImps)}</strong>
                      : <strong>{fmtMoney(q.total)}</strong>}
                  </td>
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
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Novo Orçamento" onClose={() => setModal(false)} width={720}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Cliente *</label>
                <select className="form-input" value={form.client_id} onChange={setField('client_id')}>
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
                <input className="form-input" type="number" min={1} value={form.pessoas} onChange={setField('pessoas')} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas Previstas</label>
                <input className="form-input" type="number" min={0} step={0.5} value={form.horas} onChange={setField('horas')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor / Hora (R$)</label>
                <input className="form-input" type="number" min={0} step={1} value={form.valor_hora} onChange={setField('valor_hora')} />
              </div>
            </div>

            <div className="form-section">Deslocamento</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Veículo</label>
                <select className="form-input" value={form.veiculo} onChange={setField('veiculo')}>
                  <option>Carro</option>
                  <option>Caminhão</option>
                  <option>Munck</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">KM Rodado</label>
                <input className="form-input" type="number" min={0} value={form.km} onChange={setField('km')} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor / KM (R$)</label>
                <input className="form-input" type="number" min={0} step={0.1} value={form.valor_km} onChange={setField('valor_km')} />
              </div>
            </div>

            {form.veiculo === 'Munck' && (
              <div className="form-group">
                <label className="form-label">Adicional Munck (R$)</label>
                <input className="form-input" type="number" min={0} value={form.munck} onChange={setField('munck')} />
              </div>
            )}

            <div className="form-section">Materiais e observações</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Materiais Previstos (R$)</label>
                <input className="form-input" type="number" min={0} step={0.01} value={form.materiais} onChange={setField('materiais')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={setField('status')}>
                  <option>Rascunho</option>
                  <option>Enviado</option>
                  <option>Aprovado</option>
                  <option>Reprovado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={2} value={form.observacoes} onChange={setField('observacoes')} />
            </div>

            {/* ── Impostos ── */}
            <div className="form-section">Impostos / Retenções</div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              <select
                className="form-input"
                style={{ flex: 1, minWidth: 200 }}
                value={selectImp}
                onChange={e => handleSelectImp(e.target.value)}
              >
                <option value="">+ Adicionar imposto...</option>
                {IMPOSTOS_PADRAO.map(i => (
                  <option key={i.nome} value={i.nome} disabled={nomesAdicionados.has(i.nome)}>
                    {i.nome} — {i.percentual}%{nomesAdicionados.has(i.nome) ? ' (já adicionado)' : ''}
                  </option>
                ))}
                <option value="__custom__">Personalizado...</option>
              </select>
            </div>

            {showCustom && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                <input
                  className="form-input"
                  style={{ flex: 2 }}
                  placeholder="Nome (ex: ISS Municipal)"
                  value={customNome}
                  onChange={e => setCustomNome(e.target.value)}
                />
                <input
                  className="form-input"
                  style={{ width: 100 }}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="% alíquota"
                  value={customPerc}
                  onChange={e => setCustomPerc(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={addCustom}>Adicionar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowCustom(false); setSelectImp('') }}>Cancelar</button>
              </div>
            )}

            {impostos.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600 }}>Imposto</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>Alíquota</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>Valor (R$)</th>
                      <th style={{ padding: '6px 4px', width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {impostos.map((imp, idx) => (
                      <tr key={imp.nome} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : undefined }}>
                        <td style={{ padding: '6px 12px', fontWeight: 500 }}>{imp.nome}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={imp.percentual}
                              onChange={e => updatePercImposto(imp.nome, e.target.value)}
                              style={{ width: 72, textAlign: 'right', padding: '2px 6px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 4 }}
                            />
                            <span style={{ color: '#64748b', fontSize: 13 }}>%</span>
                          </div>
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>- {fmtMoney(imp.valor)}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <button
                            onClick={() => removeImposto(imp.nome)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1 }}
                            title="Remover"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Resumo financeiro ── */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginTop: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                <span>Total bruto</span>
                <span>{fmtMoney(total)}</span>
              </div>
              {impostos.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
                  <span>(−) Total de impostos</span>
                  <span>- {fmtMoney(totalImp)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                <span>Valor líquido</span>
                <span style={{ color: '#16a34a' }}>{fmtMoney(liquido)}</span>
              </div>
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

function round2(n) {
  return Math.round(n * 100) / 100
}
