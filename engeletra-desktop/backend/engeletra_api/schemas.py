from __future__ import annotations

from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClientIn(BaseModel):
    razao: str
    fantasia: str | None = None
    cnpj: str | None = None
    cidade: str | None = None
    estado: str | None = None
    responsavel: str | None = None
    telefone: str | None = None
    email: str | None = None
    sla: str = "Normal"
    historico: str | None = None


class EquipmentIn(BaseModel):
    client_id: int
    tipo: str
    serie: str | None = None
    potencia: str | None = None
    tensao: str | None = None
    fabricante: str | None = None
    ano: int | None = None
    localizacao: str | None = None
    ultima_manutencao: str | None = None
    proxima_manutencao: str | None = None


class QuoteIn(BaseModel):
    client_id: int
    pessoas: int = 1
    horas: float = 0
    km: float = 0
    veiculo: str = "Carro"
    valor_hora: float = 120
    valor_km: float = 3.5
    materiais: float = 0
    munck: float = 1500
    observacoes: str | None = None
    status: str = "Rascunho"


class ServiceOrderIn(BaseModel):
    client_id: int
    quote_id: int | None = None
    equipment_id: int | None = None
    obra_id: int | None = None
    tecnico: str | None = None
    status: str = "Aberto"
    data_agendada: str | None = None
    horas_reais: float = 0
    km_real: float = 0
    valor_real: float = 0
    checklist: str | None = None
    materiais: str | None = None


class StockItemIn(BaseModel):
    item: str
    categoria: str | None = None
    unidade: str = "un"
    saldo: float = 0
    minimo: float = 0
    custo: float = 0


class ObraIn(BaseModel):
    nome: str
    client_id: int | None = None
    status: str = "Em andamento"
    data_inicio: str | None = None
    data_previsao: str | None = None
    data_conclusao: str | None = None
    valor_contrato: float = 0
    descricao: str | None = None


class TecnicoIn(BaseModel):
    nome: str
    codigo: str | None = None
    cargo: str | None = None
    telefone: str | None = None
    email: str | None = None
    valor_hora: float = 0
    ativo: int = 1


class EnsaioIn(BaseModel):
    client_id: int
    obra_id: int | None = None
    service_order_id: int | None = None
    equipment_id: int | None = None
    tecnico: str | None = None
    data_ensaio: str | None = None
    tipo_ensaio: str | None = None
    fabricante: str | None = None
    numero_serie: str | None = None
    potencia: str | None = None
    tensao_at: str | None = None
    tensao_bt: str | None = None
    ano_fabricacao: int | None = None
    volume_oleo: float | None = None
    massa_total: float | None = None
    megger_at_terra: float | None = None
    megger_bt_terra: float | None = None
    megger_at_bt: float | None = None
    fp_at: float | None = None
    fp_bt: float | None = None
    ttr_tap: str | None = None
    ttr_relacao_teorica: float | None = None
    ttr_relacao_medida: float | None = None
    resistencia_at: float | None = None
    resistencia_bt: float | None = None
    resultado: str = "Pendente"
    observacoes: str | None = None
    conclusao: str | None = None


class VeiculoIn(BaseModel):
    placa: str
    modelo: str
    tipo: str = "Carro"
    km_atual: float = 0
    ano: int | None = None
    cor: str | None = None
    ativo: int = 1


class FrotaKmIn(BaseModel):
    veiculo_id: int
    data: str
    km_inicial: float = 0
    km_final: float = 0
    motorista: str | None = None
    obra_id: int | None = None
    abastecimento: float = 0
    observacao: str | None = None


class FornecedorIn(BaseModel):
    razao: str
    fantasia: str | None = None
    cnpj: str | None = None
    categoria: str | None = None
    telefone: str | None = None
    email: str | None = None
    contato: str | None = None
    observacao: str | None = None


class DespesaIn(BaseModel):
    descricao: str
    categoria: str = "Outros"
    valor: float = 0
    data: str
    data_vencimento: str | None = None
    data_pagamento: str | None = None
    status: str = "Pendente"
    obra_id: int | None = None
    fornecedor: str | None = None
    documento: str | None = None
    observacao: str | None = None


class ContaBancariaIn(BaseModel):
    banco: str
    agencia: str | None = None
    conta: str | None = None
    tipo: str = "Corrente"
    saldo_atual: float = 0
    ativo: int = 1


class PontoIn(BaseModel):
    tecnico_id: int
    data: str
    entrada: str | None = None
    almoco_saida: str | None = None
    almoco_volta: str | None = None
    saida: str | None = None
    tipo: str = "Normal"
    horas_extras: float = 0
    observacao: str | None = None


class FolhaIn(BaseModel):
    tecnico_id: int
    mes: int
    ano: int
    salario_base: float = 0
    horas_extras: float = 0
    valor_extras: float = 0
    total_bruto: float = 0
    descontos: float = 0
    total_liquido: float = 0
    status: str = "Pendente"
    observacao: str | None = None


class PedidoCompraIn(BaseModel):
    fornecedor: str | None = None
    data: str
    data_entrega: str | None = None
    status: str = "Rascunho"
    obra_id: int | None = None
    descricao: str | None = None
    valor_total: float = 0
    observacao: str | None = None


class FrotaManutIn(BaseModel):
    veiculo_id: int
    tipo: str = "Preventiva"
    data: str
    km: float = 0
    descricao: str | None = None
    valor: float = 0
    status: str = "Realizada"
    observacao: str | None = None


class CronogramaIn(BaseModel):
    tecnico_id: int
    obra_id: int | None = None
    data_inicio: str
    data_fim: str | None = None
    tipo: str = "Servico"
    descricao: str | None = None


class InvoiceUpdateIn(BaseModel):
    status: str
    numero_nf: str | None = None
    data_recebimento: str | None = None
