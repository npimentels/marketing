# Controle de Chaves

Aplicativo mobile (PWA) para controlar a retirada e a devolução das chaves dos apartamentos.
Funciona offline e pode ser instalado na tela inicial do celular.

## Funções
- **Início**: quem está com quais chaves agora, organizado por pessoa (mais antigas primeiro).
  Devolução com um toque (com **Desfazer**), devolução parcial no detalhe, busca por nome ou nº da chave
  e filtros: Com chaves · Atrasadas · Devolvidas · Tudo do dia.
- **Quadro**: todas as chaves por andar, com o primeiro nome de quem está com cada uma.
  Preto = em uso, vermelho = atrasada. Toque numa chave para ver detalhes e histórico.
- **Relatório**: PDF do dia (resumo, retiradas, pendências anteriores, chaves fora agrupadas por pessoa e assinatura).
- **Ajustes**: nome do prédio, andares/apartamentos, backup e restauração.

Status: **Em uso** (chave fora), **Devolvida**, **Atrasada** (não voltou no mesmo dia ou marcada à mão).

## Organização do código
```
index.html              estrutura (abas e áreas das telas)
css/tokens.css          variáveis de tema: cores, fontes, espaçamentos, raios
css/base.css            reset e utilitários
css/layout.css          tela, cabeçalho, abas, botão principal
css/components.css      botões, chips, cards, quadro de chaves, folhas, diálogos, avisos
js/core/                regras e dados (sem DOM): dates, domain, storage (+ migração), store
js/ui/                  dom (helpers/ícones), overlays (folhas, diálogo, toast), components
js/sheets/              nova retirada, detalhe da retirada, detalhe da chave
js/screens/             início, quadro, relatório, ajustes
js/report/              gerador de PDF e relatório diário
js/platform.js          salvar/compartilhar (ponte do APK ou navegador)
js/actions.js           ações com retorno visual e "Desfazer"
js/main.js              navegação e inicialização
```
Sem etapa de build: os arquivos são carregados em ordem pelo `index.html` e compartilham o objeto `App`.

## Como usar no celular
1. Publique a pasta `chaves/` em um endereço HTTPS (ex.: GitHub Pages).
2. Abra o endereço no celular:
   - **iPhone (Safari)**: Compartilhar → *Adicionar à Tela de Início*.
   - **Android (Chrome)**: menu ⋮ → *Instalar app* / *Adicionar à tela inicial*.

Os dados ficam salvos **somente no aparelho**. Use *Ajustes → Exportar* para fazer backup.

## App Android (APK)
O código do app Android fica em `android/`. Ele embute esta pasta e funciona offline.
Para gerar o APK (Ubuntu/Debian):

```bash
sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 openjdk-17-jdk zip python3-pil
./android/build.sh     # gera android/dist/ControleDeChaves.apk
```

A chave de assinatura é criada em `android/keystore/` (fora do git). Para instalar uma
versão nova por cima da antiga sem perder dados, assine sempre com a mesma chave.
