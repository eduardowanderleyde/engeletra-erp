import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtDate, statusColor } from '../utils.js'

const TIPOS_ENSAIO = [
  'Transformador 69kV',
  'Transformador 13,8kV',
  'Transformador AT/BT',
  'Subestação 69kV',
  'Subestação 13,8kV',
  'Disjuntor',
  'SPDA',
  'Cabo Subterrâneo',
  'Motor Elétrico',
  'Gerador',
  'Outro',
]

const RESULTADOS = ['Pendente', 'Aprovado', 'Reprovado', 'Condicional']

const today = () => new Date().toISOString().split('T')[0]

const EMPTY = {
  client_id: '', obra_id: '', service_order_id: '', equipment_id: '',
  tecnico: '', data_ensaio: today(), tipo_ensaio: 'Transformador 69kV',
  fabricante: '', numero_serie: '', potencia: '', tensao_at: '', tensao_bt: '',
  ano_fabricacao: '', volume_oleo: '', massa_total: '',
  megger_at_terra: '', megger_bt_terra: '', megger_at_bt: '',
  fp_at: '', fp_bt: '',
  ttr_tap: '', ttr_relacao_teorica: '', ttr_relacao_medida: '',
  resistencia_at: '', resistencia_bt: '',
  resultado: 'Pendente', observacoes: '', conclusao: '',
}

export default function Ensaios() {
  const [ensaios, setEnsaios] = useState([])
  const [clients, setClients] = useState([])
  const [obras, setObras] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('identificacao')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [en, cl, ob, eq] = await Promise.all([
        api.ensaios.list(), api.clients.list(), api.obras.list(), api.equipment.list(),
      ])
      setEnsaios(en); setClients(cl); setObras(ob); setEquipment(eq)
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
    setForm(EMPTY); setEditing(null); setActiveTab('identificacao'); setModal(true)
  }

  function openEdit(e) {
    const f = { ...EMPTY }
    Object.keys(f).forEach(k => { if (e[k] !== null && e[k] !== undefined) f[k] = e[k] })
    setForm(f); setEditing(e); setActiveTab('identificacao'); setModal(true)
  }

  async function save() {
    if (!form.client_id) { alert('Cliente é obrigatório.'); return }
    setSaving(true)
    try {
      const toNum = v => (v === '' || v === null || v === undefined) ? null : Number(v)
      const payload = {
        ...form,
        client_id: Number(form.client_id),
        obra_id: form.obra_id ? Number(form.obra_id) : null,
        service_order_id: form.service_order_id ? Number(form.service_order_id) : null,
        equipment_id: form.equipment_id ? Number(form.equipment_id) : null,
        ano_fabricacao: toNum(form.ano_fabricacao),
        volume_oleo: toNum(form.volume_oleo),
        massa_total: toNum(form.massa_total),
        megger_at_terra: toNum(form.megger_at_terra),
        megger_bt_terra: toNum(form.megger_bt_terra),
        megger_at_bt: toNum(form.megger_at_bt),
        fp_at: toNum(form.fp_at),
        fp_bt: toNum(form.fp_bt),
        ttr_relacao_teorica: toNum(form.ttr_relacao_teorica),
        ttr_relacao_medida: toNum(form.ttr_relacao_medida),
        resistencia_at: toNum(form.resistencia_at),
        resistencia_bt: toNum(form.resistencia_bt),
      }
      editing
        ? await api.ensaios.update(editing.id, payload)
        : await api.ensaios.create(payload)
      setModal(false); loadAll()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const clientEquip = equipment.filter(eq => eq.client_id === Number(form.client_id))
  const aprovados   = ensaios.filter(e => e.resultado === 'Aprovado').length
  const reprovados  = ensaios.filter(e => e.resultado === 'Reprovado').length

  const TABS = [
    { id: 'identificacao', label: '1 — Identificação' },
    { id: 'equipamento',   label: '2 — Equipamento' },
    { id: 'medicoes',      label: '3 — Medições' },
    { id: 'resultado',     label: '4 — Resultado' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ensaios Elétricos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Ensaio</button>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="metric-card metric-blue">
          <div className="metric-value">{ensaios.length}</div>
          <div className="metric-label">Total de Ensaios</div>
        </div>
        <div className="metric-card metric-yellow">
          <div className="metric-value">{ensaios.filter(e => e.resultado === 'Pendente').length}</div>
          <div className="metric-label">Pendentes</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-value">{aprovados}</div>
          <div className="metric-label">Aprovados</div>
        </div>
        <div className="metric-card metric-red">
          <div className="metric-value">{reprovados}</div>
          <div className="metric-label">Reprovados</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Tipo de Ensaio</th>
              <th>Equipamento</th>
              <th>Nº Série</th>
              <th>Técnico</th>
              <th>Data</th>
              <th>Resultado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td-center">Carregando...</td></tr>
            ) : ensaios.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum ensaio registrado.</td></tr>
            ) : ensaios.map(e => (
              <tr key={e.id}>
                <td><strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.code}</strong></td>
                <td>{clientName(e.client_id)}</td>
                <td>{e.tipo_ensaio || '—'}</td>
                <td>{e.fabricante ? `${e.fabricante}` : '—'}{e.potencia ? ` ${e.potencia}` : ''}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.numero_serie || '—'}</td>
                <td>{e.tecnico || '—'}</td>
                <td>{fmtDate(e.data_ensaio)}</td>
                <td>
                  <span className={`badge badge-${resultColor(e.resultado)}`}>{e.resultado}</span>
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(e)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={editing ? `Editar Ensaio — ${editing.code}` : 'Novo Ensaio Elétrico'}
          onClose={() => setModal(false)}
          width={720}
        >
          {/* Abas */}
          <div className="ensaio-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`ensaio-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="modal-body">

            {/* ── Tab 1: Identificação ── */}
            {activeTab === 'identificacao' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <select className="form-input" value={form.client_id} onChange={set('client_id')}>
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Ensaio</label>
                    <select className="form-input" value={form.tipo_ensaio} onChange={set('tipo_ensaio')}>
                      {TIPOS_ENSAIO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Obra / Projeto</label>
                    <select className="form-input" value={form.obra_id} onChange={set('obra_id')}>
                      <option value="">Sem vínculo</option>
                      {obras.map(o => <option key={o.id} value={o.id}>{o.code} — {o.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Equipamento cadastrado</label>
                    <select className="form-input" value={form.equipment_id} onChange={set('equipment_id')}>
                      <option value="">Nenhum</option>
                      {clientEquip.map(eq => <option key={eq.id} value={eq.id}>{eq.tipo} — {eq.serie || 'S/N'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Técnico Responsável</label>
                    <input className="form-input" value={form.tecnico} onChange={set('tecnico')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data do Ensaio</label>
                    <input className="form-input" type="date" value={form.data_ensaio} onChange={set('data_ensaio')} />
                  </div>
                </div>
              </>
            )}

            {/* ── Tab 2: Equipamento ── */}
            {activeTab === 'equipamento' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fabricante</label>
                    <input className="form-input" value={form.fabricante} onChange={set('fabricante')} placeholder="ex: WEG, ABB, TUSA" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Número de Série</label>
                    <input className="form-input" value={form.numero_serie} onChange={set('numero_serie')} style={{ fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Potência</label>
                    <input className="form-input" value={form.potencia} onChange={set('potencia')} placeholder="ex: 5/6,25 MVA" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tensão AT (kV)</label>
                    <input className="form-input" value={form.tensao_at} onChange={set('tensao_at')} placeholder="ex: 69" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tensão BT (kV)</label>
                    <input className="form-input" value={form.tensao_bt} onChange={set('tensao_bt')} placeholder="ex: 13,8" />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Ano de Fabricação</label>
                    <input className="form-input" type="number" value={form.ano_fabricacao} onChange={set('ano_fabricacao')} placeholder="ex: 1995" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Volume de Óleo (L)</label>
                    <input className="form-input" type="number" step={0.1} value={form.volume_oleo} onChange={set('volume_oleo')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Massa Total (kg)</label>
                    <input className="form-input" type="number" step={0.1} value={form.massa_total} onChange={set('massa_total')} />
                  </div>
                </div>
              </>
            )}

            {/* ── Tab 3: Medições ── */}
            {activeTab === 'medicoes' && (
              <>
                <div className="form-section">Megger — Resistência de Isolamento (MΩ)</div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">AT — Terra</label>
                    <input className="form-input" type="number" step={0.01} value={form.megger_at_terra} onChange={set('megger_at_terra')} placeholder="MΩ" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">BT — Terra</label>
                    <input className="form-input" type="number" step={0.01} value={form.megger_bt_terra} onChange={set('megger_bt_terra')} placeholder="MΩ" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">AT — BT</label>
                    <input className="form-input" type="number" step={0.01} value={form.megger_at_bt} onChange={set('megger_at_bt')} placeholder="MΩ" />
                  </div>
                </div>

                <div className="form-section">Fator de Potência — FP (%)</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">FP — Enrolamento AT (%)</label>
                    <input className="form-input" type="number" step={0.001} value={form.fp_at} onChange={set('fp_at')} placeholder="%" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">FP — Enrolamento BT (%)</label>
                    <input className="form-input" type="number" step={0.001} value={form.fp_bt} onChange={set('fp_bt')} placeholder="%" />
                  </div>
                </div>

                <div className="form-section">TTR — Relação de Transformação</div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">TAP</label>
                    <input className="form-input" value={form.ttr_tap} onChange={set('ttr_tap')} placeholder="ex: 3" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relação Teórica</label>
                    <input className="form-input" type="number" step={0.0001} value={form.ttr_relacao_teorica} onChange={set('ttr_relacao_teorica')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relação Medida</label>
                    <input className="form-input" type="number" step={0.0001} value={form.ttr_relacao_medida} onChange={set('ttr_relacao_medida')} />
                  </div>
                </div>

                <div className="form-section">Resistência de Enrolamento (mΩ)</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Resistência AT (mΩ)</label>
                    <input className="form-input" type="number" step={0.0001} value={form.resistencia_at} onChange={set('resistencia_at')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resistência BT (mΩ)</label>
                    <input className="form-input" type="number" step={0.0001} value={form.resistencia_bt} onChange={set('resistencia_bt')} />
                  </div>
                </div>
              </>
            )}

            {/* ── Tab 4: Resultado ── */}
            {activeTab === 'resultado' && (
              <>
                <div className="form-group">
                  <label className="form-label">Resultado Geral</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    {RESULTADOS.map(r => (
                      <button
                        key={r}
                        type="button"
                        className={`resultado-btn resultado-${r.toLowerCase()}`}
                        style={{
                          flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px solid',
                          borderColor: form.resultado === r ? 'currentColor' : '#e2e8f0',
                          background: form.resultado === r ? resultBg(r) : 'white',
                          color: form.resultado === r ? resultFg(r) : '#94a3b8',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                        onClick={() => setForm(f => ({ ...f, resultado: r }))}
                      >
                        {resultIcon(r)} {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Observações Técnicas</label>
                  <textarea className="form-input" rows={4} value={form.observacoes} onChange={set('observacoes')} placeholder="Descreva as condições encontradas, anomalias, histórico..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Conclusão / Recomendações</label>
                  <textarea className="form-input" rows={4} value={form.conclusao} onChange={set('conclusao')} placeholder="Conclusão técnica e recomendações para o cliente..." />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {TABS.findIndex(t => t.id === activeTab) > 0 && (
                <button className="btn btn-ghost" onClick={() => {
                  const i = TABS.findIndex(t => t.id === activeTab)
                  setActiveTab(TABS[i - 1].id)
                }}>← Anterior</button>
              )}
              {TABS.findIndex(t => t.id === activeTab) < TABS.length - 1 && (
                <button className="btn btn-primary" onClick={() => {
                  const i = TABS.findIndex(t => t.id === activeTab)
                  setActiveTab(TABS[i + 1].id)
                }}>Próximo →</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : '💾 Salvar Ensaio'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function resultColor(r) {
  return { Aprovado: 'green', Reprovado: 'red', Condicional: 'yellow', Pendente: 'gray' }[r] || 'gray'
}
function resultBg(r) {
  return { Aprovado: '#dcfce7', Reprovado: '#fee2e2', Condicional: '#fef9c3', Pendente: '#f1f5f9' }[r] || '#f1f5f9'
}
function resultFg(r) {
  return { Aprovado: '#16a34a', Reprovado: '#dc2626', Condicional: '#a16207', Pendente: '#64748b' }[r] || '#64748b'
}
function resultIcon(r) {
  return { Aprovado: '✅', Reprovado: '❌', Condicional: '⚠️', Pendente: '🕐' }[r] || ''
}
