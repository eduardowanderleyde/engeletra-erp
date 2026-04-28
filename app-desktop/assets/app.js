const STORAGE_KEY = "engeletra_erp_local_v1";

const initialState = {
  settings: { valorHora: 120, valorKm: 3.5, munck: 1500, prazo: 15 },
  counters: { quote: 1, order: 1, invoice: 1, client: 1, equipment: 1, stock: 1 },
  clients: [],
  equipment: [],
  quotes: [],
  orders: [],
  stock: [],
  invoices: []
};

let state = loadState();
let currentView = "dashboard";

const viewCopy = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Visão executiva da operação técnica, comercial e financeira.",
    newLabel: "Novo registro"
  },
  orcamentos: {
    title: "Orçamentos",
    subtitle: "Propostas técnicas com cálculo de mão de obra, deslocamento, materiais e Munck.",
    newLabel: "Novo orçamento"
  },
  ordens: {
    title: "Ordens de Serviço",
    subtitle: "Planejamento, execução em campo, materiais, checklist e faturamento.",
    newLabel: "Nova OS"
  },
  clientes: {
    title: "Clientes",
    subtitle: "Carteira comercial, responsáveis, SLA e histórico de atendimento.",
    newLabel: "Novo cliente"
  },
  equipamentos: {
    title: "Equipamentos",
    subtitle: "Ativos dos clientes, dados técnicos e próximas manutenções.",
    newLabel: "Novo equipamento"
  },
  estoque: {
    title: "Estoque",
    subtitle: "Materiais, peças, EPIs, ferramentas e controle de estoque mínimo.",
    newLabel: "Novo item"
  },
  financeiro: {
    title: "Financeiro",
    subtitle: "Cobranças geradas por OS concluída, vencimentos e pagamentos.",
    newLabel: "Nova cobrança"
  },
  configuracoes: {
    title: "Configurações",
    subtitle: "Parâmetros padrão usados no cálculo de propostas e vencimentos.",
    newLabel: "Nova configuração"
  }
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialState);
  try {
    return { ...structuredClone(initialState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nextId(type, prefix) {
  const n = state.counters[type]++;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function clientName(id) {
  return state.clients.find(c => c.id === id)?.fantasia || state.clients.find(c => c.id === id)?.razao || "Cliente não informado";
}

function equipmentName(id) {
  const item = state.equipment.find(e => e.id === id);
  return item ? `${item.tipo} ${item.serie || item.fabricante || ""}`.trim() : "Sem equipamento";
}

function calcQuote(form) {
  const pessoas = Number(form.pessoas.value || 0);
  const horas = Number(form.horas.value || 0);
  const km = Number(form.km.value || 0);
  const valorHora = Number(form.valorHora.value || 0);
  const valorKm = Number(form.valorKm.value || 0);
  const materiais = Number(form.materiais.value || 0);
  const munck = form.veiculo.value === "Munck" ? Number(form.munck.value || 0) : 0;
  return (pessoas * horas * valorHora) + (km * valorKm) + materiais + munck;
}

function setView(view) {
  currentView = view;
  const copy = viewCopy[view];
  document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === view));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  document.querySelector("#pageTitle").textContent = copy.title;
  document.querySelector("#pageSubtitle").textContent = copy.subtitle;
  document.querySelector("#newRecord").textContent = copy.newLabel;
  document.querySelector("#newRecord").style.visibility = view === "dashboard" || view === "financeiro" ? "hidden" : "visible";
  render();
}

function fillSelects() {
  document.querySelectorAll('select[name="cliente"]').forEach(select => {
    const selected = select.value;
    select.innerHTML = `<option value="">Selecione</option>` + state.clients
      .map(c => `<option value="${c.id}">${escapeHtml(c.fantasia || c.razao)}</option>`).join("");
    select.value = selected;
  });

  const eqSelect = document.querySelector('#serviceOrderForm select[name="equipamento"]');
  const selectedEq = eqSelect.value;
  eqSelect.innerHTML = `<option value="">Selecione</option>` + state.equipment
    .map(e => `<option value="${e.id}">${escapeHtml(clientName(e.cliente))} - ${escapeHtml(e.tipo)} ${escapeHtml(e.serie || "")}</option>`).join("");
  eqSelect.value = selectedEq;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function statusChip(status) {
  const cls = ["Aprovado", "Concluído", "Pago"].includes(status) ? "ok" : ["Reprovado", "Cancelado", "Atrasado"].includes(status) ? "bad" : "warn";
  return `<span class="chip ${cls}">${escapeHtml(status)}</span>`;
}

function emptyState(title, text) {
  return `<div class="empty-state"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div></div>`;
}

function relatedClientRecords(clientId) {
  return [
    ["equipamento", state.equipment.filter(item => item.cliente === clientId).length],
    ["orçamento", state.quotes.filter(item => item.cliente === clientId).length],
    ["OS", state.orders.filter(item => item.cliente === clientId).length],
    ["fatura", state.invoices.filter(item => item.cliente === clientId).length]
  ].filter(([, count]) => count > 0);
}

function confirmDelete(label) {
  return window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`);
}

function renderDashboard() {
  const openOs = state.orders.filter(o => o.status === "Aberto").length;
  const progressOs = state.orders.filter(o => o.status === "Em andamento").length;
  const revenue = state.invoices.reduce((sum, i) => sum + Number(i.valor || 0), 0);
  const pending = state.quotes.filter(q => ["Rascunho", "Enviado"].includes(q.status)).length;
  document.querySelector("#kpiOpenOs").textContent = openOs;
  document.querySelector("#kpiProgressOs").textContent = progressOs;
  document.querySelector("#kpiRevenue").textContent = money(revenue);
  document.querySelector("#kpiQuotes").textContent = pending;
  document.querySelector("#fieldTeams").textContent = `${progressOs} equipes em campo`;

  const upcoming = [...state.orders]
    .filter(o => o.status !== "Concluído" && o.status !== "Cancelado")
    .sort((a, b) => String(a.dataAgendada).localeCompare(String(b.dataAgendada)))
    .slice(0, 8);
  document.querySelector("#agendaList").innerHTML = upcoming.length ? upcoming.map(o => `
    <div class="timeline-item">
      <strong>${escapeHtml(o.id)} - ${escapeHtml(clientName(o.cliente))}</strong>
      <span>${escapeHtml(o.dataAgendada || "Sem agenda")} · ${escapeHtml(o.tecnico || "Técnico a definir")}</span>
    </div>
  `).join("") : emptyState("Nenhuma OS aberta", "Quando um orçamento for aprovado, a OS aparecerá aqui.");

  const byClient = {};
  state.invoices.forEach(i => byClient[i.cliente] = (byClient[i.cliente] || 0) + Number(i.valor || 0));
  const rows = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  document.querySelector("#revenueBars").innerHTML = rows.length ? rows.map(([client, value]) => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(clientName(client))}</span><strong>${money(value)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, value / max * 100)}%"></div></div>
    </div>
  `).join("") : emptyState("Sem faturamento gerado", "Conclua uma OS para criar cobranças automaticamente.");
}

function renderQuotes() {
  const term = document.querySelector("#globalSearch").value.toLowerCase();
  const rows = state.quotes.filter(q => `${q.id} ${clientName(q.cliente)} ${q.status}`.toLowerCase().includes(term));
  document.querySelector("#quotesTable").innerHTML = rows.length ? rows.map(q => `
    <article class="row-card">
      <div class="row-top"><strong>${escapeHtml(q.id)} · ${escapeHtml(clientName(q.cliente))}</strong>${statusChip(q.status)}</div>
      <div class="row-meta"><span>${q.pessoas} pessoas</span><span>${q.horas}h</span><span>${q.km} km</span><span>${escapeHtml(q.veiculo)}</span><strong>${money(q.total)}</strong></div>
      <div class="row-actions">
        <button class="mini-btn primary-action" onclick="editQuote('${q.id}')">Editar</button>
        <button class="mini-btn" onclick="approveQuote('${q.id}')">Aprovar</button>
        <button class="mini-btn" onclick="printQuote('${q.id}')">PDF/Imprimir</button>
        <button class="mini-btn danger" onclick="deleteQuote('${q.id}')">Excluir</button>
      </div>
    </article>
  `).join("") : emptyState("Nenhum orçamento encontrado", "Cadastre uma proposta técnica para calcular preço e gerar OS.");
}

function renderOrders() {
  const term = document.querySelector("#globalSearch").value.toLowerCase();
  const rows = state.orders.filter(o => `${o.id} ${clientName(o.cliente)} ${o.status} ${o.tecnico}`.toLowerCase().includes(term));
  document.querySelector("#ordersTable").innerHTML = rows.length ? rows.map(o => `
    <article class="row-card">
      <div class="row-top"><strong>${escapeHtml(o.id)} · ${escapeHtml(clientName(o.cliente))}</strong>${statusChip(o.status)}</div>
      <div class="row-meta"><span>${escapeHtml(equipmentName(o.equipamento))}</span><span>${escapeHtml(o.tecnico || "Sem técnico")}</span><span>${escapeHtml(o.dataAgendada || "Sem agenda")}</span><strong>${money(o.valorReal || o.valorPrevisto || 0)}</strong></div>
      <div class="row-actions">
        <button class="mini-btn primary-action" onclick="editOrder('${o.id}')">Editar</button>
        <button class="mini-btn" onclick="finishOrder('${o.id}')">Concluir</button>
        <button class="mini-btn" onclick="printOrder('${o.id}')">Relatório</button>
        <button class="mini-btn danger" onclick="deleteOrder('${o.id}')">Excluir</button>
      </div>
    </article>
  `).join("") : emptyState("Nenhuma OS encontrada", "Aprove um orçamento ou crie uma OS manualmente.");
}

function renderClients() {
  document.querySelector("#clientCount").textContent = `${state.clients.length} clientes`;
  const term = document.querySelector("#globalSearch").value.toLowerCase();
  const rows = state.clients.filter(c => `${c.razao} ${c.fantasia} ${c.cnpj} ${c.cidade}`.toLowerCase().includes(term));
  document.querySelector("#clientsTable").innerHTML = rows.length ? rows.map(c => {
    const links = relatedClientRecords(c.id).reduce((sum, [, count]) => sum + count, 0);
    return `
      <article class="row-card">
        <div class="row-top"><strong>${escapeHtml(c.fantasia || c.razao)}</strong><span class="chip">${escapeHtml(c.sla || "Normal")}</span></div>
        <div class="row-meta"><span>${escapeHtml(c.razao)}</span><span>${escapeHtml(c.cnpj || "CNPJ não informado")}</span><span>${escapeHtml(c.cidade || "-")} / ${escapeHtml(c.estado || "-")}</span><span>${escapeHtml(c.telefone || "Sem telefone")}</span><span>${links} vínculo(s)</span></div>
        <div class="row-actions">
          <button class="mini-btn primary-action" onclick="editClient('${c.id}')">Editar</button>
          <button class="mini-btn danger" onclick="deleteClient('${c.id}')">Excluir</button>
        </div>
      </article>
    `;
  }).join("") : emptyState("Nenhum cliente encontrado", "Use o formulário para cadastrar razão social, contato e SLA.");
}

function renderEquipment() {
  document.querySelector("#equipmentTable").innerHTML = state.equipment.length ? state.equipment.map(e => {
    const due = e.proxima && new Date(e.proxima) <= new Date(Date.now() + 30 * 86400000);
    return `
      <article class="row-card">
        <div class="row-top"><strong>${escapeHtml(e.tipo)} · ${escapeHtml(e.serie || e.fabricante || "sem série")}</strong><span class="chip ${due ? "warn" : ""}">${due ? "Preventiva próxima" : "Ativo"}</span></div>
        <div class="row-meta"><span>${escapeHtml(clientName(e.cliente))}</span><span>${escapeHtml(e.potencia)}</span><span>${escapeHtml(e.tensao)}</span><span>Próxima: ${escapeHtml(e.proxima || "-")}</span></div>
        <div class="row-actions">
          <button class="mini-btn primary-action" onclick="editEquipment('${e.id}')">Editar</button>
          <button class="mini-btn danger" onclick="deleteEquipment('${e.id}')">Excluir</button>
        </div>
      </article>
    `;
  }).join("") : emptyState("Nenhum equipamento cadastrado", "Vincule transformadores, subestações, painéis ou motores aos clientes.");
}

function renderStock() {
  document.querySelector("#stockTable").innerHTML = state.stock.length ? state.stock.map(s => {
    const low = Number(s.saldo) <= Number(s.minimo);
    return `
      <article class="row-card">
        <div class="row-top"><strong>${escapeHtml(s.item)}</strong><span class="chip ${low ? "bad" : "ok"}">${low ? "Comprar" : "OK"}</span></div>
        <div class="row-meta"><span>${escapeHtml(s.categoria)}</span><span>Saldo: ${s.saldo} ${escapeHtml(s.unidade)}</span><span>Mínimo: ${s.minimo}</span><span>Custo: ${money(s.custo)}</span></div>
        <div class="row-actions">
          <button class="mini-btn primary-action" onclick="editStock('${s.id}')">Editar</button>
          <button class="mini-btn danger" onclick="deleteStock('${s.id}')">Excluir</button>
        </div>
      </article>
    `;
  }).join("") : emptyState("Nenhum item em estoque", "Cadastre materiais, EPIs, ferramentas e componentes elétricos.");
}

function renderInvoices() {
  document.querySelector("#invoiceTable").innerHTML = state.invoices.length ? state.invoices.map(i => `
    <article class="row-card">
      <div class="row-top"><strong>${escapeHtml(i.id)} · ${escapeHtml(clientName(i.cliente))}</strong>${statusChip(i.status)}</div>
      <div class="row-meta"><span>OS: ${escapeHtml(i.os)}</span><span>Emissão: ${escapeHtml(i.emissao)}</span><span>Vencimento: ${escapeHtml(i.vencimento)}</span><strong>${money(i.valor)}</strong></div>
      <div class="row-actions">
        <button class="mini-btn primary-action" onclick="markPaid('${i.id}')">Marcar pago</button>
        <button class="mini-btn danger" onclick="deleteInvoice('${i.id}')">Excluir</button>
      </div>
    </article>
  `).join("") : emptyState("Nenhuma fatura gerada", "As cobranças aparecem aqui quando uma OS é concluída.");
}

function renderSettings() {
  const form = document.querySelector("#settingsForm");
  form.valorHora.value = state.settings.valorHora;
  form.valorKm.value = state.settings.valorKm;
  form.munck.value = state.settings.munck;
  form.prazo.value = state.settings.prazo;
}

function render() {
  fillSelects();
  renderDashboard();
  renderQuotes();
  renderOrders();
  renderClients();
  renderEquipment();
  renderStock();
  renderInvoices();
  renderSettings();
}

function upsert(collection, item) {
  const index = state[collection].findIndex(row => row.id === item.id);
  if (index >= 0) state[collection][index] = item;
  else state[collection].push(item);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function hydrateForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
}

function resetQuoteDefaults() {
  const form = document.querySelector("#quoteForm");
  form.valorHora.value = state.settings.valorHora;
  form.valorKm.value = state.settings.valorKm;
  form.munck.value = state.settings.munck;
  document.querySelector("#quoteTotal").textContent = money(calcQuote(form));
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelector("#globalSearch").addEventListener("input", render);
document.querySelector("#newRecord").addEventListener("click", () => {
  const form = document.querySelector(`#${currentView} form`);
  if (form) {
    form.reset();
    form.elements.id && (form.elements.id.value = "");
    if (currentView === "orcamentos") resetQuoteDefaults();
  }
});

document.querySelector("#quoteForm").addEventListener("input", event => {
  document.querySelector("#quoteTotal").textContent = money(calcQuote(event.currentTarget));
});

document.querySelector("#quoteForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formData(form);
  const existing = state.quotes.find(q => q.id === data.id);
  const quote = {
    id: data.id || nextId("quote", "ORC"),
    cliente: data.cliente,
    status: data.status,
    pessoas: Number(data.pessoas || 0),
    horas: Number(data.horas || 0),
    km: Number(data.km || 0),
    veiculo: data.veiculo,
    valorHora: Number(data.valorHora || 0),
    valorKm: Number(data.valorKm || 0),
    materiais: Number(data.materiais || 0),
    munck: Number(data.munck || 0),
    observacoes: data.observacoes,
    total: calcQuote(form),
    os: existing?.os || ""
  };
  upsert("quotes", quote);
  saveState();
  if (quote.status === "Aprovado") approveQuote(quote.id, true);
  form.reset();
  resetQuoteDefaults();
  render();
  toast("Orçamento salvo.");
});

document.querySelector("#serviceOrderForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const order = {
    id: data.id || nextId("order", "OS"),
    cliente: data.cliente,
    equipamento: data.equipamento,
    tecnico: data.tecnico,
    status: data.status,
    dataAgendada: data.dataAgendada,
    horasReais: Number(data.horasReais || 0),
    kmReal: Number(data.kmReal || 0),
    valorReal: Number(data.valorReal || 0),
    checklist: data.checklist,
    materiais: data.materiais
  };
  upsert("orders", order);
  saveState();
  if (order.status === "Concluído") finishOrder(order.id, true);
  event.currentTarget.reset();
  render();
  toast("OS salva.");
});

document.querySelector("#clientForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  upsert("clients", { ...data, id: data.id || nextId("client", "CLI") });
  saveState();
  event.currentTarget.reset();
  render();
  toast("Cliente salvo.");
});

document.querySelector("#equipmentForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  upsert("equipment", { ...data, id: data.id || nextId("equipment", "EQP") });
  saveState();
  event.currentTarget.reset();
  render();
  toast("Equipamento salvo.");
});

document.querySelector("#stockForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  upsert("stock", { ...data, id: data.id || nextId("stock", "MAT") });
  saveState();
  event.currentTarget.reset();
  render();
  toast("Item salvo.");
});

document.querySelector("#settingsForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  state.settings = {
    valorHora: Number(data.valorHora || 0),
    valorKm: Number(data.valorKm || 0),
    munck: Number(data.munck || 0),
    prazo: Number(data.prazo || 15)
  };
  saveState();
  resetQuoteDefaults();
  render();
  toast("Configurações salvas.");
});

function approveQuote(id, silent = false) {
  const quote = state.quotes.find(q => q.id === id);
  if (!quote) return;
  quote.status = "Aprovado";
  if (!quote.os) {
    const order = {
      id: nextId("order", "OS"),
      quote: quote.id,
      cliente: quote.cliente,
      equipamento: "",
      tecnico: "",
      status: "Aberto",
      dataAgendada: "",
      horasPrevistas: quote.horas,
      kmPrevisto: quote.km,
      valorPrevisto: quote.total,
      valorReal: quote.total,
      tipoVeiculo: quote.veiculo,
      checklist: "",
      materiais: ""
    };
    state.orders.push(order);
    quote.os = order.id;
  }
  saveState();
  render();
  if (!silent) toast(`Orçamento aprovado e OS ${quote.os} criada.`);
}

function finishOrder(id, silent = false) {
  const order = state.orders.find(o => o.id === id);
  if (!order) return;
  order.status = "Concluído";
  if (!state.invoices.some(i => i.os === order.id)) {
    const value = Number(order.valorReal || order.valorPrevisto || 0);
    const due = new Date();
    due.setDate(due.getDate() + Number(state.settings.prazo || 15));
    state.invoices.push({
      id: nextId("invoice", "FAT"),
      os: order.id,
      cliente: order.cliente,
      valor: value,
      emissao: todayDate(),
      vencimento: due.toISOString().slice(0, 10),
      status: "Aberto"
    });
  }
  saveState();
  render();
  if (!silent) toast("OS concluída e cobrança gerada.");
}

function markPaid(id) {
  const invoice = state.invoices.find(i => i.id === id);
  if (invoice) {
    invoice.status = "Pago";
    saveState();
    render();
    toast("Fatura marcada como paga.");
  }
}

function deleteClient(id) {
  const client = state.clients.find(c => c.id === id);
  if (!client) return;
  const related = relatedClientRecords(id);
  if (related.length) {
    const list = related.map(([name, count]) => `${count} ${name}${count > 1 && name !== "OS" ? "s" : ""}`).join(", ");
    toast(`Não é possível excluir: cliente possui ${list}.`);
    return;
  }
  if (!confirmDelete(client.fantasia || client.razao)) return;
  state.clients = state.clients.filter(c => c.id !== id);
  saveState();
  document.querySelector("#clientForm").reset();
  render();
  toast("Cliente excluído.");
}

function deleteEquipment(id) {
  const item = state.equipment.find(e => e.id === id);
  if (!item) return;
  const used = state.orders.some(o => o.equipamento === id);
  if (used) {
    toast("Não é possível excluir: equipamento vinculado a uma OS.");
    return;
  }
  if (!confirmDelete(`${item.tipo} ${item.serie || ""}`.trim())) return;
  state.equipment = state.equipment.filter(e => e.id !== id);
  saveState();
  render();
  toast("Equipamento excluído.");
}

function deleteQuote(id) {
  const quote = state.quotes.find(q => q.id === id);
  if (!quote) return;
  if (quote.os || state.orders.some(o => o.quote === id)) {
    toast("Não é possível excluir: orçamento já gerou uma OS.");
    return;
  }
  if (!confirmDelete(id)) return;
  state.quotes = state.quotes.filter(q => q.id !== id);
  saveState();
  render();
  toast("Orçamento excluído.");
}

function deleteOrder(id) {
  const order = state.orders.find(o => o.id === id);
  if (!order) return;
  if (state.invoices.some(i => i.os === id)) {
    toast("Não é possível excluir: OS já possui cobrança.");
    return;
  }
  if (!confirmDelete(id)) return;
  state.orders = state.orders.filter(o => o.id !== id);
  state.quotes.forEach(q => {
    if (q.os === id) q.os = "";
  });
  saveState();
  render();
  toast("OS excluída.");
}

function deleteStock(id) {
  const item = state.stock.find(s => s.id === id);
  if (!item || !confirmDelete(item.item)) return;
  state.stock = state.stock.filter(s => s.id !== id);
  saveState();
  render();
  toast("Item excluído.");
}

function deleteInvoice(id) {
  const invoice = state.invoices.find(i => i.id === id);
  if (!invoice || !confirmDelete(id)) return;
  state.invoices = state.invoices.filter(i => i.id !== id);
  saveState();
  render();
  toast("Fatura excluída.");
}

function editQuote(id) { hydrateForm(document.querySelector("#quoteForm"), state.quotes.find(q => q.id === id)); setView("orcamentos"); document.querySelector("#quoteTotal").textContent = money(calcQuote(document.querySelector("#quoteForm"))); }
function editOrder(id) { hydrateForm(document.querySelector("#serviceOrderForm"), state.orders.find(o => o.id === id)); setView("ordens"); }
function editClient(id) { hydrateForm(document.querySelector("#clientForm"), state.clients.find(c => c.id === id)); setView("clientes"); }
function editEquipment(id) { hydrateForm(document.querySelector("#equipmentForm"), state.equipment.find(e => e.id === id)); setView("equipamentos"); }
function editStock(id) { hydrateForm(document.querySelector("#stockForm"), state.stock.find(s => s.id === id)); setView("estoque"); }

function printQuote(id) {
  const q = state.quotes.find(item => item.id === id);
  if (!q) return;
  openPrintWindow("Proposta Comercial", `
    <h1>Orçamento Técnico ${q.id}</h1>
    <p><strong>Cliente:</strong> ${escapeHtml(clientName(q.cliente))}</p>
    <p><strong>Equipe:</strong> ${q.pessoas} pessoa(s), ${q.horas} hora(s)</p>
    <p><strong>Deslocamento:</strong> ${q.km} km · ${escapeHtml(q.veiculo)}</p>
    <p><strong>Total:</strong> ${money(q.total)}</p>
    <h2>Observações</h2>
    <p>${escapeHtml(q.observacoes || "")}</p>
  `);
}

function printOrder(id) {
  const o = state.orders.find(item => item.id === id);
  if (!o) return;
  openPrintWindow("Relatório de OS", `
    <h1>Ordem de Serviço ${o.id}</h1>
    <p><strong>Cliente:</strong> ${escapeHtml(clientName(o.cliente))}</p>
    <p><strong>Equipamento:</strong> ${escapeHtml(equipmentName(o.equipamento))}</p>
    <p><strong>Técnico:</strong> ${escapeHtml(o.tecnico || "")}</p>
    <p><strong>Status:</strong> ${escapeHtml(o.status)}</p>
    <h2>Checklist</h2>
    <p>${escapeHtml(o.checklist || "")}</p>
    <h2>Materiais usados</h2>
    <p>${escapeHtml(o.materiais || "")}</p>
  `);
}

function openPrintWindow(title, content) {
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(`<!doctype html><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#17211f}h1{color:#0f6b55}p{line-height:1.5}</style>${content}<script>window.print()<\/script>`);
  win.document.close();
}

document.querySelector("#seedDemo").addEventListener("click", () => {
  state = structuredClone(initialState);
  state.clients = [
    { id: "CLI-0001", razao: "Caruaru Shopping Ltda", fantasia: "Caruaru Shopping", cnpj: "00.000.000/0001-00", cidade: "Caruaru", estado: "PE", responsavel: "Operação", telefone: "", email: "", sla: "Contrato", historico: "Cliente com subestação e transformadores." },
    { id: "CLI-0002", razao: "Neoenergia Pernambuco", fantasia: "Neoenergia", cnpj: "", cidade: "Recife", estado: "PE", responsavel: "", telefone: "", email: "", sla: "24h", historico: "" }
  ];
  state.equipment = [
    { id: "EQP-0001", cliente: "CLI-0001", tipo: "Transformador", serie: "110879", potencia: "5/6,25 MVA", tensao: "69 kV", fabricante: "WEG", ano: "1995", localizacao: "SE principal", ultima: "2026-01-07", proxima: "2026-07-07" }
  ];
  state.stock = [
    { id: "MAT-0001", item: "Óleo isolante", categoria: "Óleo isolante", unidade: "L", saldo: 120, minimo: 80, custo: 18 },
    { id: "MAT-0002", item: "Fusível NH", categoria: "Fusíveis", unidade: "un", saldo: 6, minimo: 10, custo: 95 }
  ];
  state.quotes = [
    { id: "ORC-0001", cliente: "CLI-0001", status: "Enviado", pessoas: 2, horas: 8, km: 120, veiculo: "Munck", valorHora: 120, valorKm: 3.5, materiais: 800, munck: 1500, observacoes: "Manutenção preventiva em subestação.", total: 4640, os: "" }
  ];
  state.counters = { quote: 2, order: 1, invoice: 1, client: 3, equipment: 2, stock: 3 };
  saveState();
  resetQuoteDefaults();
  render();
  toast("Dados demonstrativos carregados.");
});

document.querySelector("#exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `engeletra-erp-dados-${todayDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

resetQuoteDefaults();
render();
