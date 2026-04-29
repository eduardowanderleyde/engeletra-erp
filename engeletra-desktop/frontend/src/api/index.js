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

  invoices: {
    list: () => req('GET', '/invoices'),
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
}
