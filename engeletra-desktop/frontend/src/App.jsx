import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "http://127.0.0.1:8787";

function currency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function request(path, options) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail?.message || error.detail || "Erro na operação");
  }
  return response.json();
}

function App() {
  const [view, setView] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [stock, setStock] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [message, setMessage] = useState("");

  async function refresh() {
    const [clientsData, quotesData, ordersData, invoicesData, equipmentData, stockData, dashboardData] = await Promise.all([
      request("/clients"),
      request("/quotes"),
      request("/service-orders"),
      request("/invoices"),
      request("/equipment"),
      request("/stock"),
      request("/dashboard")
    ]);
    setClients(clientsData);
    setQuotes(quotesData);
    setOrders(ordersData);
    setInvoices(invoicesData);
    setEquipment(equipmentData);
    setStock(stockData);
    setDashboard(dashboardData);
  }

  useEffect(() => {
    refresh().catch(err => setMessage(err.message));
  }, []);

  function clientName(id) {
    const client = clients.find(item => item.id === id);
    return client?.fantasia || client?.razao || "Cliente não informado";
  }

  async function removeClient(id) {
    if (!window.confirm("Excluir cliente?")) return;
    try {
      await request(`/clients/${id}`, { method: "DELETE" });
      setMessage("Cliente excluído.");
      refresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function approveQuote(id) {
    await request(`/quotes/${id}/approve`, { method: "POST" });
    setMessage("Orçamento aprovado e OS criada.");
    refresh();
  }

  async function finishOrder(id) {
    await request(`/service-orders/${id}/finish`, { method: "POST" });
    setMessage("OS concluída e cobrança gerada.");
    refresh();
  }

  const nav = [
    ["dashboard", "Dashboard"],
    ["clients", "Clientes"],
    ["quotes", "Orçamentos"],
    ["orders", "Ordens de Serviço"],
    ["equipment", "Equipamentos"],
    ["stock", "Estoque"],
    ["finance", "Financeiro"]
  ];

  const quoteTotal = useMemo(() => quotes.reduce((sum, item) => sum + Number(item.total || 0), 0), [quotes]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">E</div>
          <div>
            <strong>Engeletra ERP</strong>
            <span>Desktop</span>
          </div>
        </div>
        <nav>
          {nav.map(([key, label]) => (
            <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>
          ))}
        </nav>
      </aside>

      <main>
        <header>
          <div>
            <p>Sistema local</p>
            <h1>{nav.find(([key]) => key === view)?.[1]}</h1>
          </div>
          {message && <div className="notice">{message}</div>}
        </header>

        {view === "dashboard" && (
          <>
            <section className="kpis">
              <article><span>OS abertas</span><strong>{dashboard.open_os || 0}</strong></article>
              <article><span>Em andamento</span><strong>{dashboard.progress_os || 0}</strong></article>
              <article><span>Faturamento</span><strong>{currency(dashboard.revenue || 0)}</strong></article>
              <article><span>Pipeline</span><strong>{currency(quoteTotal)}</strong></article>
            </section>
            <section className="panel">
              <h2>Próximas OS</h2>
              <RecordList rows={orders.slice(0, 8)} empty="Nenhuma OS cadastrada">
                {order => (
                  <div className="record" key={order.id}>
                    <strong>{order.code} · {clientName(order.client_id)}</strong>
                    <span>{order.status} · {order.tecnico || "Técnico a definir"}</span>
                  </div>
                )}
              </RecordList>
            </section>
          </>
        )}

        {view === "clients" && (
          <section className="grid">
            <ClientForm onSaved={refresh} />
            <section className="panel">
              <h2>Clientes</h2>
              <RecordList rows={clients} empty="Nenhum cliente cadastrado">
                {client => (
                  <div className="record" key={client.id}>
                    <strong>{client.fantasia || client.razao}</strong>
                    <span>{client.cnpj || "Sem CNPJ"} · {client.cidade || "-"} / {client.estado || "-"}</span>
                    <div className="actions">
                      <button className="danger" onClick={() => removeClient(client.id)}>Excluir</button>
                    </div>
                  </div>
                )}
              </RecordList>
            </section>
          </section>
        )}

        {view === "quotes" && (
          <section className="grid">
            <QuoteForm clients={clients} onSaved={refresh} />
            <section className="panel">
              <h2>Orçamentos</h2>
              <RecordList rows={quotes} empty="Nenhum orçamento cadastrado">
                {quote => (
                  <div className="record" key={quote.id}>
                    <strong>{quote.code} · {clientName(quote.client_id)}</strong>
                    <span>{quote.status} · {currency(quote.total)}</span>
                    <div className="actions">
                      <button onClick={() => approveQuote(quote.id)}>Aprovar</button>
                    </div>
                  </div>
                )}
              </RecordList>
            </section>
          </section>
        )}

        {view === "orders" && (
          <section className="panel">
            <h2>Ordens de Serviço</h2>
            <RecordList rows={orders} empty="Nenhuma OS cadastrada">
              {order => (
                <div className="record" key={order.id}>
                  <strong>{order.code} · {clientName(order.client_id)}</strong>
                  <span>{order.status} · {currency(order.valor_real)}</span>
                  <div className="actions">
                    <button onClick={() => finishOrder(order.id)}>Concluir</button>
                  </div>
                </div>
              )}
            </RecordList>
          </section>
        )}

        {view === "equipment" && (
          <section className="grid">
            <EquipmentForm clients={clients} onSaved={refresh} />
            <section className="panel">
              <h2>Equipamentos</h2>
              <RecordList rows={equipment} empty="Nenhum equipamento cadastrado">
                {item => (
                  <div className="record" key={item.id}>
                    <strong>{item.tipo} · {item.serie || "sem série"}</strong>
                    <span>{clientName(item.client_id)} · {item.potencia || "-"}</span>
                  </div>
                )}
              </RecordList>
            </section>
          </section>
        )}

        {view === "stock" && (
          <section className="panel">
            <h2>Estoque</h2>
            <RecordList rows={stock} empty="Nenhum item em estoque">
              {item => (
                <div className="record" key={item.id}>
                  <strong>{item.item}</strong>
                  <span>{item.categoria || "-"} · Saldo: {item.saldo} {item.unidade}</span>
                </div>
              )}
            </RecordList>
          </section>
        )}

        {view === "finance" && (
          <section className="panel">
            <h2>Financeiro</h2>
            <RecordList rows={invoices} empty="Nenhuma cobrança gerada">
              {invoice => (
                <div className="record" key={invoice.id}>
                  <strong>{invoice.code} · {clientName(invoice.client_id)}</strong>
                  <span>{invoice.status} · {currency(invoice.valor)} · Vence {invoice.vencimento}</span>
                </div>
              )}
            </RecordList>
          </section>
        )}
      </main>
    </div>
  );
}

function RecordList({ rows, empty, children }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return <div className="records">{rows.map(children)}</div>;
}

function ClientForm({ onSaved }) {
  const [form, setForm] = useState({ razao: "", fantasia: "", cnpj: "", cidade: "", estado: "", sla: "Normal" });
  async function submit(event) {
    event.preventDefault();
    await request("/clients", { method: "POST", body: JSON.stringify(form) });
    setForm({ razao: "", fantasia: "", cnpj: "", cidade: "", estado: "", sla: "Normal" });
    onSaved();
  }
  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Novo cliente</h2>
      <Input label="Razão social" value={form.razao} onChange={razao => setForm({ ...form, razao })} required />
      <Input label="Nome fantasia" value={form.fantasia} onChange={fantasia => setForm({ ...form, fantasia })} />
      <Input label="CNPJ" value={form.cnpj} onChange={cnpj => setForm({ ...form, cnpj })} />
      <div className="columns">
        <Input label="Cidade" value={form.cidade} onChange={cidade => setForm({ ...form, cidade })} />
        <Input label="UF" value={form.estado} onChange={estado => setForm({ ...form, estado })} />
      </div>
      <button className="primary">Salvar cliente</button>
    </form>
  );
}

function QuoteForm({ clients, onSaved }) {
  const [form, setForm] = useState({ client_id: "", pessoas: 2, horas: 8, km: 0, veiculo: "Carro", valor_hora: 120, valor_km: 3.5, materiais: 0, munck: 1500, status: "Rascunho" });
  async function submit(event) {
    event.preventDefault();
    await request("/quotes", { method: "POST", body: JSON.stringify({ ...form, client_id: Number(form.client_id) }) });
    onSaved();
  }
  const total = (Number(form.pessoas) * Number(form.horas) * Number(form.valor_hora)) + (Number(form.km) * Number(form.valor_km)) + Number(form.materiais) + (form.veiculo === "Munck" ? Number(form.munck) : 0);
  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Novo orçamento</h2>
      <label>Cliente<select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required><option value="">Selecione</option>{clients.map(c => <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>)}</select></label>
      <div className="columns">
        <Input label="Pessoas" type="number" value={form.pessoas} onChange={pessoas => setForm({ ...form, pessoas })} />
        <Input label="Horas" type="number" value={form.horas} onChange={horas => setForm({ ...form, horas })} />
      </div>
      <div className="columns">
        <Input label="KM" type="number" value={form.km} onChange={km => setForm({ ...form, km })} />
        <label>Veículo<select value={form.veiculo} onChange={e => setForm({ ...form, veiculo: e.target.value })}><option>Carro</option><option>Munck</option><option>Outros</option></select></label>
      </div>
      <div className="columns">
        <Input label="Valor hora" type="number" value={form.valor_hora} onChange={valor_hora => setForm({ ...form, valor_hora })} />
        <Input label="Valor KM" type="number" value={form.valor_km} onChange={valor_km => setForm({ ...form, valor_km })} />
      </div>
      <Input label="Materiais" type="number" value={form.materiais} onChange={materiais => setForm({ ...form, materiais })} />
      <div className="total">Total: <strong>{currency(total)}</strong></div>
      <button className="primary">Salvar orçamento</button>
    </form>
  );
}

function EquipmentForm({ clients, onSaved }) {
  const [form, setForm] = useState({ client_id: "", tipo: "Transformador", serie: "", potencia: "", tensao: "", fabricante: "" });
  async function submit(event) {
    event.preventDefault();
    await request("/equipment", { method: "POST", body: JSON.stringify({ ...form, client_id: Number(form.client_id) }) });
    onSaved();
  }
  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Novo equipamento</h2>
      <label>Cliente<select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required><option value="">Selecione</option>{clients.map(c => <option key={c.id} value={c.id}>{c.fantasia || c.razao}</option>)}</select></label>
      <label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option>Transformador</option><option>Subestação</option><option>Painel</option><option>Motor</option></select></label>
      <Input label="Número de série" value={form.serie} onChange={serie => setForm({ ...form, serie })} />
      <Input label="Potência" value={form.potencia} onChange={potencia => setForm({ ...form, potencia })} />
      <Input label="Classe de tensão" value={form.tensao} onChange={tensao => setForm({ ...form, tensao })} />
      <button className="primary">Salvar equipamento</button>
    </form>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return <label>{label}<input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} required={required} /></label>;
}

createRoot(document.getElementById("root")).render(<App />);
