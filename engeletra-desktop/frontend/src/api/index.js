const BASE = 'http://127.0.0.1:8787'

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = err.detail
    const msg =
      typeof detail === 'string'
        ? detail
        : detail?.message ?? JSON.stringify(detail) ?? res.statusText
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  dashboard: () => req('GET', '/dashboard'),

  clients: {
    list:   ()       => req('GET',    '/clients'),
    create: d        => req('POST',   '/clients', d),
    update: (id, d)  => req('PUT',    `/clients/${id}`, d),
    delete: id       => req('DELETE', `/clients/${id}`),
  },

  equipment: {
    list:   ()  => req('GET',  '/equipment'),
    create: d   => req('POST', '/equipment', d),
  },

  quotes: {
    list:    ()   => req('GET',  '/quotes'),
    create:  d    => req('POST', '/quotes', d),
    approve: id   => req('POST', `/quotes/${id}/approve`),
  },

  serviceOrders: {
    list:   ()   => req('GET',  '/service-orders'),
    create: d    => req('POST', '/service-orders', d),
    finish: id   => req('POST', `/service-orders/${id}/finish`),
  },

  stock: {
    list:   ()  => req('GET',  '/stock'),
    create: d   => req('POST', '/stock', d),
  },

  obras: {
    list:   ()       => req('GET',    '/obras'),
    create: d        => req('POST',   '/obras', d),
    update: (id, d)  => req('PUT',    `/obras/${id}`, d),
    delete: id       => req('DELETE', `/obras/${id}`),
  },

  tecnicos: {
    list:   ()       => req('GET',    '/tecnicos'),
    create: d        => req('POST',   '/tecnicos', d),
    update: (id, d)  => req('PUT',    `/tecnicos/${id}`, d),
    delete: id       => req('DELETE', `/tecnicos/${id}`),
  },

  ensaios: {
    list:   ()       => req('GET',   '/ensaios'),
    create: d        => req('POST',  '/ensaios', d),
    update: (id, d)  => req('PUT',   `/ensaios/${id}`, d),
  },

  veiculos: {
    list:   ()       => req('GET',   '/veiculos'),
    create: d        => req('POST',  '/veiculos', d),
    update: (id, d)  => req('PUT',   `/veiculos/${id}`, d),
  },

  frotaKm: {
    list:   () => req('GET',  '/frota-km'),
    create: d  => req('POST', '/frota-km', d),
  },

  invoices: {
    list:   ()       => req('GET',  '/invoices'),
    update: (id, d)  => req('PUT',  `/invoices/${id}`, d),
  },

  fornecedores: {
    list:   ()       => req('GET',    '/fornecedores'),
    create: d        => req('POST',   '/fornecedores', d),
    update: (id, d)  => req('PUT',    `/fornecedores/${id}`, d),
    delete: id       => req('DELETE', `/fornecedores/${id}`),
  },

  despesas: {
    list:   ()       => req('GET',    '/despesas'),
    create: d        => req('POST',   '/despesas', d),
    update: (id, d)  => req('PUT',    `/despesas/${id}`, d),
    delete: id       => req('DELETE', `/despesas/${id}`),
  },

  contas: {
    list:   ()       => req('GET',    '/contas-bancarias'),
    create: d        => req('POST',   '/contas-bancarias', d),
    update: (id, d)  => req('PUT',    `/contas-bancarias/${id}`, d),
    delete: id       => req('DELETE', `/contas-bancarias/${id}`),
  },

  ponto: {
    list:   ()       => req('GET',    '/ponto'),
    create: d        => req('POST',   '/ponto', d),
    update: (id, d)  => req('PUT',    `/ponto/${id}`, d),
    delete: id       => req('DELETE', `/ponto/${id}`),
  },

  folha: {
    list:   ()       => req('GET',    '/folha'),
    create: d        => req('POST',   '/folha', d),
    update: (id, d)  => req('PUT',    `/folha/${id}`, d),
    delete: id       => req('DELETE', `/folha/${id}`),
  },

  pedidos: {
    list:   ()       => req('GET',    '/pedidos-compra'),
    create: d        => req('POST',   '/pedidos-compra', d),
    update: (id, d)  => req('PUT',    `/pedidos-compra/${id}`, d),
    delete: id       => req('DELETE', `/pedidos-compra/${id}`),
  },

  frotaManut: {
    list:   ()       => req('GET',    '/frota-manutencao'),
    create: d        => req('POST',   '/frota-manutencao', d),
    update: (id, d)  => req('PUT',    `/frota-manutencao/${id}`, d),
    delete: id       => req('DELETE', `/frota-manutencao/${id}`),
  },

  cronograma: {
    list:   ()       => req('GET',    '/cronograma'),
    create: d        => req('POST',   '/cronograma', d),
    update: (id, d)  => req('PUT',    `/cronograma/${id}`, d),
    delete: id       => req('DELETE', `/cronograma/${id}`),
  },
}
