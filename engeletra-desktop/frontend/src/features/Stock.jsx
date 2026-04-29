import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtMoney } from '../utils.js'

const EMPTY = {
  item: '', categoria: '', unidade: 'un', saldo: 0, minimo: 0, custo: 0,
}

export default function Stock() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setItems(await api.stock.list())
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setForm(EMPTY)
    setModal(true)
  }

  async function save() {
    if (!form.item.trim()) { alert('Nome do item é obrigatório.'); return }
    setSaving(true)
    try {
      await api.stock.create({
        ...form,
        saldo: Number(form.saldo),
        minimo: Number(form.minimo),
        custo: Number(form.custo),
      })
      setModal(false)
      load()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const abaixoMinimo = items.filter(i => i.saldo <= i.minimo && i.minimo > 0).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Estoque</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Item</button>
      </div>

      {abaixoMinimo > 0 && (
        <div style={{
          background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, color: '#854d0e', fontSize: 13.5,
        }}>
          ⚠️ {abaixoMinimo} {abaixoMinimo === 1 ? 'item está abaixo' : 'itens estão abaixo'} do saldo mínimo.
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Categoria</th>
              <th>Unidade</th>
              <th>Saldo</th>
              <th>Mínimo</th>
              <th>Custo Unit.</th>
              <th>Valor Total</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td-center">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhum item no estoque.</td></tr>
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
                  <td>
                    <span className={`badge badge-${baixo ? 'red' : 'green'}`}>
                      {baixo ? 'Abaixo do mínimo' : 'OK'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Novo Item de Estoque" onClose={() => setModal(false)} width={560}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Item *</label>
                <input className="form-input" value={form.item} onChange={set('item')} placeholder="ex: Fusível 10A" />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <input className="form-input" value={form.categoria} onChange={set('categoria')} placeholder="ex: Proteção" />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Unidade</label>
                <select className="form-input" value={form.unidade} onChange={set('unidade')}>
                  <option value="un">un</option>
                  <option value="m">m</option>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="cx">cx</option>
                  <option value="par">par</option>
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
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
