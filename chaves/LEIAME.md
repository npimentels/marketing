# Controle de Chaves

Aplicativo mobile (PWA) para controlar a retirada e a devolução das chaves dos apartamentos.
Funciona offline e pode ser instalado na tela inicial do celular.

## Funções
- **Início**: cartão de resumo (chaves fora + % no quadro) e **com quem estão as chaves**, em duas visões:
  *Pessoas* (cartão por pessoa com as chaves em destaque) e *Chaves* (lista "chave → pessoa" em ordem de andar).
  Devolução com um toque (com **Desfazer**), devolução parcial no detalhe, busca e filtros
  Com chaves · Atrasadas · Devolvidas. O sino leva direto às atrasadas.
- **Quadro**: todas as chaves por andar com o nome de quem está com cada uma; barra de andares fixa
  que acompanha a rolagem. Azul = em uso, vermelho = atrasada.
- **Relatório**: calendário do mês, agenda do dia com a linha "agora" e PDF (baixar ou compartilhar).
- **Ajustes**: nome do prédio, andares/apartamentos, backup e restauração.
- Botão **+** no centro da barra inferior para registrar uma retirada em 3 etapas.

Numeração padrão: andar + apartamento — 1º andar 11–18 · 10º andar 101–108 · 16º andar 161–168.
Dados antigos na numeração 101/102… são convertidos automaticamente (101 → 11, 702 → 72, 1205 → 125).

Status: **Em uso** (chave fora), **Devolvida**, **Atrasada** (não voltou no mesmo dia ou marcada à mão).

## Organização do código
```
index.html              estrutura (barra inferior e área das telas)
css/fonts.css           fonte Poppins embutida (base64, funciona offline e no APK)
css/tokens.css          variáveis de tema: cores, fontes, espaçamentos, raios, sombras, curvas de animação
css/base.css            reset e utilitários
css/layout.css          tela, cabeçalho, barra inferior e botão +
css/components.css      botões, cartões, segmentado, quadro de chaves, agenda, folhas, diálogos, avisos
css/motion.css          animações (entradas, transições de tela, pulsos)
js/core/                regras e dados (sem DOM): dates, domain, storage (+ migrações), store
js/ui/                  dom (helpers/ícones), overlays (folhas arrastáveis, diálogo, toast),
                        motion (cascata, FLIP, contadores, anel), components
js/sheets/              nova retirada, detalhe da retirada, detalhe da chave
js/screens/             início, quadro, relatório, ajustes
js/report/              gerador de PDF e relatório diário
js/platform.js          salvar/compartilhar (ponte do APK ou navegador)
js/actions.js           ações com retorno visual e "Desfazer"
js/main.js              navegação, modos de animação e inicialização
fonts/                  arquivos originais da fonte + licença
```
Sem etapa de build: os arquivos são carregados em ordem pelo `index.html` e compartilham o objeto `App`.
As animações usam só `transform`/`opacity` e respeitam a opção "reduzir movimento" do aparelho.

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
