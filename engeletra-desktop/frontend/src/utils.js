export function fmtMoney(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

export function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

export function statusColor(status) {
  const map = {
    Rascunho: 'gray',
    Enviado: 'blue',
    Aprovado: 'green',
    Reprovado: 'red',
    Aberto: 'blue',
    'Em andamento': 'yellow',
    'Concluído': 'green',
    Cancelado: 'red',
    Pago: 'green',
    Vencido: 'red',
  }
  return map[status] || 'gray'
}
