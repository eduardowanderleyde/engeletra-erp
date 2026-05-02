import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney } from '../utils.js'

// ─── Equipamentos ─────────────────────────────────────────────────────────────

const EQ_EMPTY = {
  client_id: '', tipo: '', serie: '', potencia: '', tensao: '',
  fabricante: '', ano: '', localizacao: '', ultima_manutencao: '', proxima_manutencao: '',
}

function TabEquipamentos() {
  const [items, setItems]   = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]     = useState(EQ_EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [eq, cl] = await Promise.all([api.equipment.list(), api.clients.list()])
      setItems(eq); setClients(cl)
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  const clientName = id => clients.find(c => c.id === id)?.fantasia || clients.find(c => c.id === id)?.razao || '—'

  function openNew()  { setEditing(null); setForm(EQ_EMPTY); setModal(true) }
  function openEdit(eq) {
    setEditing(eq)
    setForm({ ...EQ_EMPTY, ...eq, ano: eq.ano ?? '', client_id: eq.client_id })
    setModal(true)
  }

  async function save() {
    if (!form.tipo.trim()) { alert('Tipo do equipamento é obrigatório.'); return }
    setSaving(true)
    try {
      const payload = { ...form, client_id: form.client_id ? Number(form.client_id) : null, ano: form.ano ? Number(form.ano) : null }
      editing ? await api.equipment.update(editing.id, payload) : await api.equipment.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Equipamento</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome do Equipamento</th><th>Série</th><th>Potência</th><th>Tensão</th>
              <th>Fabricante</th><th>Ano</th><th>Cliente</th><th>Localização</th>
              <th>Próx. Manutenção</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="td-center">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} className="td-center">Nenhum equipamento cadastrado.</td></tr>
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
                <td><button className="btn btn-sm btn-ghost" onClick={() => openEdit(eq)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Equipamento' : 'Novo Equipamento'} onClose={() => setModal(false)} width={660}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome do Equipamento *</label>
                <input className="form-input" value={form.tipo} onChange={set('tipo')} placeholder="ex: Transformador 150 kVA" />
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
                <input className="form-input" type="number" value={form.ano} onChange={set('ano')} />
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
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Estoque ──────────────────────────────────────────────────────────────────

const ST_EMPTY = { item: '', categoria: '', unidade: 'un', saldo: 0, minimo: 0, custo: 0 }

function TabEstoque() {
  const [items, setItems]         = useState([])
  const [equipList, setEquipList] = useState([])
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(ST_EMPTY)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')
  const [showDrop, setShowDrop]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [st, eq, cl] = await Promise.all([api.stock.list(), api.equipment.list(), api.clients.list()])
      setItems(st); setEquipList(eq); setClients(cl)
    }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  const clientName = id => clients.find(c => c.id === id)?.fantasia || clients.find(c => c.id === id)?.razao || ''

  function equipLabel(eq) {
    const parts = [eq.tipo]
    if (eq.serie) parts.push(`Série ${eq.serie}`)
    if (eq.potencia) parts.push(eq.potencia)
    const cli = clientName(eq.client_id)
    if (cli) parts.push(`— ${cli}`)
    return parts.join(' ')
  }

  const filteredEquip = search.trim()
    ? equipList.filter(eq => equipLabel(eq).toLowerCase().includes(search.toLowerCase()))
    : equipList

  function selectEquip(eq) {
    setForm(f => ({ ...f, item: equipLabel(eq) }))
    setSearch(equipLabel(eq))
    setShowDrop(false)
  }

  function openNew() {
    setEditing(null); setForm(ST_EMPTY); setSearch(''); setShowDrop(false); setModal(true)
  }
  function openEdit(it) {
    setEditing(it); setForm({ ...ST_EMPTY, ...it }); setSearch(it.item); setShowDrop(false); setModal(true)
  }

  async function save() {
    if (!form.item.trim()) { alert('Nome do item é obrigatório.'); return }
    setSaving(true)
    try {
      const payload = { ...form, saldo: Number(form.saldo), minimo: Number(form.minimo), custo: Number(form.custo) }
      editing ? await api.stock.update(editing.id, payload) : await api.stock.create(payload)
      setModal(false); load()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const abaixoMinimo = items.filter(i => i.saldo <= i.minimo && i.minimo > 0).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Item</button>
      </div>

      {abaixoMinimo > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#854d0e', fontSize: 13.5 }}>
          ⚠️ {abaixoMinimo} {abaixoMinimo === 1 ? 'item está abaixo' : 'itens estão abaixo'} do saldo mínimo.
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Categoria</th><th>Unidade</th><th>Saldo</th>
              <th>Mínimo</th><th>Custo Unit.</th><th>Valor Total</th><th>Situação</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td-center">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="td-center">Nenhum item no estoque.</td></tr>
            ) : items.map(it => {
              const baixo = it.minimo > 0 && it.saldo <= it.minimo
              return (
                <tr key={it.id}>
                  <td><strong>{it.item}</strong></td>
                  <td>{it.categoria || '—'}</td>
                  <td>{it.unidade}</td>
                  <td>{it.saldo}</td>
                  <td>{it.minimo}</td>
                  <td>{fmtMoney(it.custo)}</td>
                  <td>{fmtMoney(it.saldo * it.custo)}</td>
                  <td><span className={`badge badge-${baixo ? 'red' : 'green'}`}>{baixo ? 'Abaixo do mínimo' : 'OK'}</span></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => openEdit(it)}>Editar</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Item' : 'Novo Item de Estoque'} onClose={() => setModal(false)} width={560}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Equipamento *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true); setForm(f => ({ ...f, item: e.target.value })) }}
                  onFocus={() => setShowDrop(true)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                  placeholder="Buscar equipamento cadastrado..."
                  autoComplete="off"
                />
                {showDrop && filteredEquip.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxHeight: 220, overflowY: 'auto',
                  }}>
                    {filteredEquip.map(eq => (
                      <div
                        key={eq.id}
                        onMouseDown={() => selectEquip(eq)}
                        style={{
                          padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                          borderBottom: '1px solid #f1f5f9',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <div style={{ fontWeight: 600 }}>{eq.tipo}{eq.serie ? ` — Série ${eq.serie}` : ''}</div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          {[eq.potencia, eq.fabricante, clientName(eq.client_id)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showDrop && search.trim() && filteredEquip.length === 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '10px 14px', fontSize: 13, color: '#94a3b8',
                  }}>
                    Nenhum equipamento encontrado.
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="form-input" value={form.categoria} onChange={set('categoria')} placeholder="ex: Proteção" />
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Unidade</label>
                <select className="form-input" value={form.unidade} onChange={set('unidade')}>
                  <option value="un">un</option><option value="m">m</option>
                  <option value="kg">kg</option><option value="L">L</option>
                  <option value="cx">cx</option><option value="par">par</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Saldo Inicial</label>
                <input className="form-input" type="number" min={0} value={form.saldo} onChange={set('saldo')} />
              </div>
              <div className="form-group">
                <label className="form-label">Saldo Mínimo</label>
                <input className="form-input" type="number" min={0} value={form.minimo} onChange={set('minimo')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Custo Unitário (R$)</label>
              <input className="form-input" type="number" min={0} step={0.01} value={form.custo} onChange={set('custo')} />
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

// ─── Página combinada ─────────────────────────────────────────────────────────

export default function EquipEstoque() {
  const [tab, setTab] = useState('equipamentos')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Equipamentos & Estoque</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {[
          { key: 'equipamentos', label: 'Equipamentos' },
          { key: 'estoque',      label: 'Estoque'      },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 14,
              background: 'none',
              borderBottom: tab === t.key ? '2px solid #1d4ed8' : '2px solid transparent',
              color: tab === t.key ? '#1d4ed8' : '#64748b',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'equipamentos' ? <TabEquipamentos /> : <TabEstoque />}
    </div>
  )
}
