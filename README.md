# Engeletra ERP

ERP vertical open-source e personalizavel para empresas de manutencao eletrica industrial, transformadores, subestacoes, obras tecnicas e servicos externos.

O projeto foi desenhado como um app para ERPNext/Frappe. A primeira versao entrega a base estrutural do produto: DocTypes, regras de calculo, automacoes e documentacao tecnica para evoluir como SaaS.

## Objetivo

Digitalizar o fluxo completo da operacao:

1. Cliente solicita servico.
2. Comercial cria um Orcamento Tecnico.
3. O sistema calcula mao de obra, deslocamento, materiais e veiculo especial.
4. Orcamento aprovado gera Ordem de Servico automaticamente.
5. Operacional agenda tecnico, equipe, veiculo e equipamento.
6. Tecnico registra execucao, horas, KM, checklist, fotos e materiais.
7. OS concluida gera baixa de estoque e faturamento.
8. Gestao acompanha indicadores financeiros, operacionais e comerciais.

## Modulos

- Comercial
- Ordem de Servico
- Equipamentos do Cliente
- Obras e Centros de Custo
- Estoque e Materiais
- Frota e Munck
- Financeiro e Faturamento
- Relatorios Tecnicos
- RH Tecnico e Horas
- Dashboard Executivo

## DocTypes iniciais

- `Orçamento Técnico`
- `Ordem de Serviço`
- `Equipamento`
- `Equipe Técnica`
- `Equipe OS Item`
- `Material OS Item`
- `Checklist OS Item`
- `Configuração Engeletra ERP`

## Automacoes iniciais

- Calculo automatico do valor total do orcamento.
- Aprovacao de orcamento cria OS automaticamente.
- Conclusao de OS prepara faturamento e movimentacao de estoque.
- Configuracoes globais para valor hora, valor KM, Munck, almoxarifado e item de servico padrao.

## Instalacao em um bench Frappe

```bash
cd frappe-bench
bench get-app /caminho/para/engeletra_erp
bench --site seu-site.local install-app engeletra_erp
bench --site seu-site.local migrate
```

## Licenca

MIT. A empresa pode usar, modificar, hospedar, vender servicos, criar versoes internas e transformar em SaaS.

## Roadmap recomendado

1. Validar DocTypes no Frappe.
2. Criar fixtures de permissoes por perfil.
3. Criar dashboards nativos.
4. Criar print formats de proposta, OS e relatorio tecnico.
5. Migrar planilhas reais da Engeletra para modelos importaveis.
6. Criar app mobile/PWA para tecnico em campo.
7. Adicionar multiempresa e parametrizacao SaaS.
