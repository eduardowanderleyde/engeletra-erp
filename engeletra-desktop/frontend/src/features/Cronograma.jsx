import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtDate } from '../utils.js'

const TIPOS = ['Servico', 'Obra', 'Ferias', 'Atestado', 'Treinamento', 'Folga']
const TIPO_COR = { Servico: '#1d4ed8', Obra: '#7c3aed', Ferias: '#16a34a', Atestado: '#dc2626', Treinamento: '#d97706', Folga: '#64748b' }
const TIPO_LABEL = { Servico: 'Serviço', Obra: 'Obra', Ferias: 'Férias', Atestado: 'Atestado', Treinamento: 'Treinamento', Folga: 'Folga' }

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY = { tecnico_id: '', obra_id: '', data_inicio: today(), data_fim: '', tipo: 'Servico', descricao: '' }

export default function Cronograma() {
  const [items, setItems]       = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [obras, setObras]       = useState([])
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [mes, setMes]           = useState(new Date().getMonth())
  const [ano, setAno]           = useState(new Date().getFullYear())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [c, t, o] = await Promise.all([api.cronograma.list(), api.tecnicos.list(), api.obras.list()])
      setItems(c); setTecnicos(t); setObras(o)
    } catch (e) { alert(e.message) }
  }

  function openNew()   { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(i) { setForm({ ...EMPTY, ...i, tecnico_id: i.tecnico_id, obra_id: i.obra_id ?? '' }); setEditing(i); setModal(true) }

  async function save() {
    if (!form.tecnico_id) { alert('Selecione o técnico.'); return }
    if (!form.data_inicio) { alert('Data de início é obrigatória.'); return }
    setSaving(true)
    try {
      const payload = { ...form, tecnico_id: Number(form.tecnico_id), obra_id: form.obra_id ? Number(form.obra_id) : null }
      editing ? await api.cronograma.update(editing.id, payload) : await api.cronograma.create(payload)
      setModal(false); loadAll()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(i) {
    if (!confirm('Excluir alocação?')) return
    try { await api.cronograma.delete(i.id); loadAll() } catch (e) { alert(e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`
  const visiveis = items.filter(i =>
    (i.data_inicio?.startsWith(mesStr)) ||
    (i.data_fim && i.data_fim >= mesStr + '-01' && i.data_inicio <= mesStr + '-31')
  )

  function navMes(dir) {
    let m = mes + dir, a = ano
    if (m < 0) { m = 11; a-- }
    if (m > 11) { m = 0; a++ }
    setMes(m); setAno(a)
  }

  const tecNome = id => tecnicos.find(t => t.id === id)?.nome || '—'
  const obraNome = id => obras.find(o => o.id === id)?.nome || '—'

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cronograma</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Alocação</button>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.entries(TIPO_LABEL).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: TIPO_COR[k], display: 'inline-block' }} />
            {v}
          </span>
        ))}
      </div>

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(-1)}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 140, textAlign: 'center' }}>{MESES[mes]} / {ano}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navMes(1)}>▶</button>
        <span style={{ color: '#64748b', fontSize: 13 }}>{visiveis.length} alocação(ões)</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Técnico</th>
              <th>Tipo</th>
              <th>Obra / Projeto</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 ? (
              <tr><td colSpan={7} className="td-center">Nenhuma alocação para {MESES[mes]}/{ano}.</td></tr>
            ) : visiveis.map(i => (
              <tr key={i.id}>
                <td><strong>{tecNome(i.tecnico_id)}</strong></td>
                <td>
                  <span style={{
                    background: TIPO_COR[i.tipo] + '20',
                    color: TIPO_COR[i.tipo],
                    borderRadius: 5,
                    padding: '2px 8px',
                    fontWeight: 600,
                    fontSize: 12,
                  }}>{TIPO_LABEL[i.tipo] || i.tipo}</span>
                </td>
                <td>{i.obra_id ? obraNome(i.obra_id) : '—'}</td>
                <td>{fmtDate(i.data_inicio)}</td>
                <td>{fmtDate(i.data_fim)}</td>
                <td style={{ color: '#64748b', fontSize: 13 }}>{i.descricao || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(i)}>Editar</button>
                  {' '}
                  <button className="btn btn-sm btn-danger-soft" onClick={() => remove(i)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Alocação' : 'Nova Alocação'} onClose={() => setModal(false)} width={560}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Técnico *</label>
                <select className="form-input" value={form.tecnico_id} onChange={set('tecnico_id')}>
                  <option value="">Selecionar...</option>
                  {tecnicos.filter(t => t.ativo).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.tipo} onChange={set('tipo')}>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Obra / Projeto</label>
              <select className="form-input" value={form.obra_id} onChange={set('obra_id')}>
                <option value="">Sem vínculo</option>
                {obras.filter(o => o.status === 'Em andamento').map(o => <option key={o.id} value={o.id}>{o.code} — {o.nome}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data Início *</label>
                <input className="form-input" type="date" value={form.data_inicio} onChange={set('data_inicio')} />
              </div>
              <div className="form-group">
                <label className="form-label">Data Fim</label>
                <input className="form-input" type="date" value={form.data_fim} onChange={set('data_fim')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição / Local</label>
              <input className="form-input" value={form.descricao} onChange={set('descricao')} placeholder="ex: Subestação Caruaru Shopping" />
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
