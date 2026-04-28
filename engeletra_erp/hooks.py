app_name = "engeletra_erp"
app_title = "Engeletra ERP"
app_publisher = "Engeletra ERP Contributors"
app_description = "ERP vertical para manutencao eletrica industrial, transformadores, subestacoes e servicos externos."
app_email = "contato@engeletra-erp.local"
app_license = "MIT"

required_apps = ["frappe", "erpnext"]

doc_events = {
    "Orçamento Técnico": {
        "validate": "engeletra_erp.engeletra_erp.doctype.orcamento_tecnico.orcamento_tecnico.validate",
        "on_update": "engeletra_erp.engeletra_erp.doctype.orcamento_tecnico.orcamento_tecnico.on_update",
    },
    "Ordem de Serviço": {
        "validate": "engeletra_erp.engeletra_erp.doctype.ordem_de_servico.ordem_de_servico.validate",
        "on_update": "engeletra_erp.engeletra_erp.doctype.ordem_de_servico.ordem_de_servico.on_update",
    },
}

fixtures = [
    {
        "dt": "Role",
        "filters": [["role_name", "in", [
            "Engeletra Administrador",
            "Engeletra Comercial",
            "Engeletra Operacional",
            "Engeletra Tecnico",
            "Engeletra Financeiro",
        ]]],
    }
]
