from __future__ import annotations

import frappe


def get_settings():
    """Return singleton settings when available, otherwise a harmless empty object."""
    if frappe.db.exists("DocType", "Configuração Engeletra ERP"):
        return frappe.get_single("Configuração Engeletra ERP")
    return frappe._dict()


def money(value) -> float:
    return float(value or 0)


def get_default_income_account(company: str | None = None) -> str | None:
    filters = {"account_type": "Income Account", "is_group": 0}
    if company:
        filters["company"] = company
    return frappe.db.get_value("Account", filters, "name")
