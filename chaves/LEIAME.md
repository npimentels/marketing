# Controle de Chaves

Aplicativo mobile (PWA) para controlar a retirada e a devolução das chaves dos apartamentos.
Funciona offline e pode ser instalado na tela inicial do celular.

## Funções
- **Movimentos**: registre quem pegou (nome, empresa/função), quais chaves e observações.
  Marque o status direto no cartão: **Pendente**, **Entregue** ou **Não entregue**.
- **Chaves**: quadro por andar. Chaves fora ficam em preto; as "não entregues" ficam listradas.
  Toque numa chave para ver com quem ela está.
- **Relatório**: gera o PDF do dia escolhido (resumo, tabela de movimentações,
  pendências de dias anteriores, chaves fora do quadro e espaço para assinatura).
- **Ajustes**: nome do prédio, andares e apartamentos (gerados automaticamente ou editados à mão),
  backup/restauração dos dados.

## Como usar no celular
1. Publique a pasta `chaves/` em um endereço HTTPS (ex.: GitHub Pages).
2. Abra o endereço no celular:
   - **iPhone (Safari)**: Compartilhar → *Adicionar à Tela de Início*.
   - **Android (Chrome)**: menu ⋮ → *Instalar app* / *Adicionar à tela inicial*.

Os dados ficam salvos **somente no aparelho**. Use *Ajustes → Exportar* para fazer backup.
