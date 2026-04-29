import { useState, useEffect } from 'react'
import { api } from '../api/index.js'
import Modal from '../components/Modal.jsx'
import { fmtDate } from '../utils.js'

export default function Relatorios() {
  const [ensaios, setEnsaios]   = useState([])
  const [clients, setClients]   = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')
  const [filterRes, setFilterRes] = useState('Todos')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [e, c] = await Promise.all([api.ensaios.list(), api.clients.list()])
      setEnsaios(e); setClients(c)
    } catch (err) { alert(err.message) }
  }

  const clientName = id => clients.find(c => c.id === id)?.fantasia || clients.find(c => c.id === id)?.razao || '—'

  const resCores = { Aprovado: '#16a34a', Reprovado: '#dc2626', Condicional: '#d97706', Pendente: '#64748b' }

  const visible = ensaios.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || (e.code + clientName(e.client_id) + (e.tipo_ensaio || '') + (e.numero_serie || '')).toLowerCase().includes(q)
    const matchRes = filterRes === 'Todos' || e.resultado === filterRes
    return matchSearch && matchRes
  })

  function printLaudo() { window.print() }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Relatórios Técnicos</h1>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {['Aprovado','Reprovado','Condicional','Pendente'].map(res => (
          <div key={res} className="metric-card" style={{ cursor: 'pointer', border: filterRes === res ? '2px solid #1d4ed8' : undefined }}
               onClick={() => setFilterRes(filterRes === res ? 'Todos' : res)}>
            <div className="metric-value" style={{ color: resCores[res] }}>{ensaios.filter(e => e.resultado === res).length}</div>
            <div className="metric-label">{res}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ flex: 1, maxWidth: 400 }}
          placeholder="Buscar por código, cliente, tipo ou série..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {filterRes !== 'Todos' && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilterRes('Todos')}>Limpar filtro</button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Tipo de Ensaio</th>
              <th>Nº Série</th>
              <th>Técnico</th>
              <th>Resultado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="td-center">Nenhum ensaio encontrado.</td></tr>
            ) : visible.map(e => (
              <tr key={e.id}>
                <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{e.code}</strong></td>
                <td>{fmtDate(e.data_ensaio)}</td>
                <td>{clientName(e.client_id)}</td>
                <td>{e.tipo_ensaio || '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.numero_serie || '—'}</td>
                <td>{e.tecnico || '—'}</td>
                <td>
                  <span style={{
                    background: resCores[e.resultado] + '22',
                    color: resCores[e.resultado],
                    borderRadius: 5,
                    padding: '2px 10px',
                    fontWeight: 700,
                    fontSize: 12,
                  }}>{e.resultado}</span>
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => setSelected(e)}>Visualizar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Laudo — ${selected.code}`} onClose={() => setSelected(null)} width={800}>
          <div className="modal-body" id="laudo-print">
            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>ENGELETRA</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Manutenção Elétrica Industrial</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10 }}>LAUDO DE ENSAIO ELÉTRICO — {selected.code}</div>
            </div>

            {/* Identificação */}
            <Section title="1. IDENTIFICAÇÃO">
              <Row label="Cliente" value={clientName(selected.client_id)} />
              <Row label="Data do Ensaio" value={fmtDate(selected.data_ensaio)} />
              <Row label="Tipo de Ensaio" value={selected.tipo_ensaio} />
              <Row label="Técnico Responsável" value={selected.tecnico} />
            </Section>

            {/* Equipamento */}
            <Section title="2. DADOS DO EQUIPAMENTO">
              <Row label="Fabricante" value={selected.fabricante} />
              <Row label="Nº de Série" value={selected.numero_serie} />
              <Row label="Potência" value={selected.potencia} />
              <Row label="Tensão AT / BT" value={`${selected.tensao_at || '—'} / ${selected.tensao_bt || '—'}`} />
              <Row label="Ano de Fabricação" value={selected.ano_fabricacao} />
              <Row label="Volume de Óleo" value={selected.volume_oleo ? `${selected.volume_oleo} L` : null} />
              <Row label="Massa Total" value={selected.massa_total ? `${selected.massa_total} kg` : null} />
            </Section>

            {/* Medições */}
            <Section title="3. MEDIÇÕES">
              {(selected.megger_at_terra || selected.megger_bt_terra || selected.megger_at_bt) && (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 6 }}>Resistência de Isolamento (Megger) — MΩ</div>
                  <Row label="AT — Terra" value={selected.megger_at_terra} />
                  <Row label="BT — Terra" value={selected.megger_bt_terra} />
                  <Row label="AT — BT" value={selected.megger_at_bt} />
                </>
              )}
              {(selected.fp_at || selected.fp_bt) && (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 10 }}>Fator de Potência — %</div>
                  <Row label="Enrolamento AT" value={selected.fp_at} />
                  <Row label="Enrolamento BT" value={selected.fp_bt} />
                </>
              )}
              {selected.ttr_tap && (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 10 }}>Relação de Transformação (TTR)</div>
                  <Row label="TAP" value={selected.ttr_tap} />
                  <Row label="Relação Teórica" value={selected.ttr_relacao_teorica} />
                  <Row label="Relação Medida" value={selected.ttr_relacao_medida} />
                </>
              )}
              {(selected.resistencia_at || selected.resistencia_bt) && (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 10 }}>Resistência de Enrolamento — mΩ</div>
                  <Row label="Enrolamento AT" value={selected.resistencia_at} />
                  <Row label="Enrolamento BT" value={selected.resistencia_bt} />
                </>
              )}
            </Section>

            {/* Resultado */}
            <Section title="4. RESULTADO">
              <div style={{
                background: resCores[selected.resultado] + '18',
                border: `2px solid ${resCores[selected.resultado]}`,
                borderRadius: 10,
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: resCores[selected.resultado] }}>{selected.resultado?.toUpperCase()}</span>
              </div>
              {selected.observacoes && <Row label="Observações" value={selected.observacoes} />}
              {selected.conclusao && <Row label="Conclusão" value={selected.conclusao} />}
            </Section>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Fechar</button>
            <button className="btn btn-primary" onClick={printLaudo}>Imprimir / PDF</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', background: '#f1f5f9', borderRadius: 6, padding: '6px 12px', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ paddingLeft: 8 }}>{children}</div>
    </div>
  )
}

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#64748b', minWidth: 180 }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
