from __future__ import annotations

import frappe
from frappe.model.document import Document

from engeletra_erp.engeletra_erp.utils import money


class OrcamentoTecnico(Document):
    pass


def validate(doc, method=None):
    doc.valor_total_calculado = calculate_total(doc)


def on_update(doc, method=None):
    if doc.status == "Aprovado" and not doc.ordem_de_servico_gerada:
        service_order = create_service_order_from_quote(doc)
        doc.db_set("ordem_de_servico_gerada", service_order.name, update_modified=False)


def calculate_total(doc) -> float:
    labor = money(doc.quantidade_pessoas) * money(doc.horas_previstas) * money(doc.valor_hora_tecnica)
    travel = money(doc.km_rodado) * money(doc.valor_km)
    materials = money(doc.materiais_previstos)
    munck = money(doc.valor_adicional_munck) if doc.tipo_de_veiculo == "Munck" else 0
    return labor + travel + materials + munck


def create_service_order_from_quote(doc):
    existing = frappe.db.get_value("Ordem de Serviço", {"orcamento_vinculado": doc.name}, "name")
    if existing:
        return frappe.get_doc("Ordem de Serviço", existing)

    service_order = frappe.get_doc({
        "doctype": "Ordem de Serviço",
        "orcamento_vinculado": doc.name,
        "cliente": doc.cliente,
        "status": "Aberto",
        "km_previsto": doc.km_rodado,
        "horas_previstas": doc.horas_previstas,
        "valor_previsto": doc.valor_total_calculado,
        "tipo_de_veiculo": doc.tipo_de_veiculo,
    })
    service_order.insert(ignore_permissions=True)
    frappe.msgprint(f"Ordem de Serviço {service_order.name} criada a partir do orçamento aprovado.")
    return service_order
