from __future__ import annotations

from pydantic import BaseModel


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
