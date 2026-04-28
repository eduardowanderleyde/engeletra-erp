from __future__ import annotations

import frappe
from frappe.model.document import Document

from engeletra_erp.engeletra_erp.utils import get_default_income_account, get_settings, money


class OrdemDeServico(Document):
    pass


def validate(doc, method=None):
    if doc.data_inicio and doc.data_fim and doc.data_fim < doc.data_inicio:
        frappe.throw("Data fim nao pode ser anterior a data inicio.")


def on_update(doc, method=None):
    if doc.status == "Concluído":
        if not doc.estoque_baixado:
            create_stock_issue(doc)
            doc.db_set("estoque_baixado", 1, update_modified=False)
        if not doc.fatura_gerada:
            invoice_name = create_sales_invoice(doc)
            if invoice_name:
                doc.db_set("fatura_gerada", invoice_name, update_modified=False)


def create_stock_issue(doc):
    settings = get_settings()
    if not doc.materiais_usados:
        return
    if not getattr(settings, "almoxarifado_padrao", None):
        frappe.throw("Configure o Almoxarifado Padrão em Configuração Engeletra ERP.")

    stock_entry = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Issue",
        "company": getattr(doc, "company", None),
        "remarks": f"Baixa automática da {doc.name}",
        "items": [],
    })

    for row in doc.materiais_usados:
        stock_entry.append("items", {
            "item_code": row.item,
            "qty": row.quantidade,
            "uom": row.uom,
            "s_warehouse": row.almoxarifado or settings.almoxarifado_padrao,
            "basic_rate": row.valor_unitario or 0,
        })

    stock_entry.insert(ignore_permissions=True)
    stock_entry.submit()


def create_sales_invoice(doc) -> str | None:
    settings = get_settings()
    item_code = getattr(settings, "item_de_servico_padrao", None)
    if not item_code:
        frappe.msgprint("OS concluida, mas sem Item de Serviço Padrão para gerar fatura.")
        return None

    valor = money(doc.valor_real) or money(doc.valor_previsto)
    if not valor:
        frappe.msgprint("OS concluida sem valor previsto ou real. Fatura nao criada.")
        return None

    income_account = get_default_income_account(getattr(doc, "company", None))
    invoice = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": doc.cliente,
        "company": getattr(doc, "company", None),
        "due_date": frappe.utils.add_days(frappe.utils.today(), int(getattr(settings, "prazo_padrao_vencimento", 15) or 15)),
        "items": [{
            "item_code": item_code,
            "qty": 1,
            "rate": valor,
            "income_account": income_account,
            "description": f"Serviços técnicos executados na {doc.name}",
        }],
    })
    invoice.insert(ignore_permissions=True)
    return invoice.name
