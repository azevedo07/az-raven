# AZ Raven — Master Specification
### Versão 1.0 · Documento consolidado de produto, marca e arquitetura

> **Status deste documento:** consolidação de todas as decisões aprovadas até a Sprint 0.2 + módulos 17–18. Serve como fonte única de referência antes do início da implementação de backend (Sprint 1).

---

## 1. Visão do Produto

**Empresa:** AZ — *"Toda arte em busca da perfeição."*
**Produto:** AZ Raven — *"Transformando literatura em experiências cinematográficas com inteligência artificial."*

O AZ Raven não é um painel administrativo. É um estúdio cinematográfico movido por IA: o usuário deve sentir que está **dirigindo um filme**, não operando um software de gestão. Toda decisão de produto — nomenclatura, navegação, hierarquia visual — se subordina a essa premissa.

### Filosofia de marca
Elegância · Precisão · Criatividade · Cinema · Literatura · Inovação · Sofisticação.
Nunca: aparência de painel administrativo, IDE ou explorador de arquivos na experiência principal.

### Quem é o cliente do Raven
O Raven Studio é desenhado para pessoas que querem **criar um filme**, não operar um software técnico. O cliente nunca é um desenvolvedor. As personas oficiais que definem toda decisão de interface são:

| Persona | O que ela busca no Raven |
|---|---|
| **Escritor** | Ver seu texto ganhar forma visual e emocional sem precisar entender cinema tecnicamente |
| **Cineasta** | Acelerar pré-produção — storyboard, direção de fotografia e trilha sugeridos automaticamente |
| **Criador de conteúdo** | Transformar textos/roteiros em vídeos prontos para YouTube, TikTok e Instagram |
| **Professor** | Ilustrar obras literárias de forma cinematográfica para uso educacional |
| **Editor** | Revisar e aprovar decisões criativas com clareza, sem precisar entender a IA por trás |
| **Agência** | Produzir múltiplos projetos em escala, mantendo qualidade e identidade consistentes |

**Nenhuma dessas personas quer ver Design Tokens, JSON, arquitetura ou qualquer artefato técnico.** Elas querem criar um filme. Essa é a régua definitiva por trás da pergunta "cliente ou desenvolvedor?" da Seção 2: se a resposta for "cliente", a tela é sempre pensada para uma destas seis pessoas — nunca para quem construiu o software.

### Ecossistema AZ (planejado)
| Produto | Status | Função |
|---|---|---|
| **AZ Raven** | Ativo (este documento) | Literatura → cinema com IA |
| AZ Vision | Planejado | Ferramentas visuais baseadas em IA |
| AZ Voice | Planejado | Vozes cinematográficas e narração |
| AZ Script | Planejado | Desenvolvimento de roteiros |
| AZ Flow | Planejado | Automação de pipelines criativos |

Todos os produtos futuros herdam o mesmo Brand System descrito na Seção 3.

---

## 2. Arquitetura de Camadas — Raven Studio × Raven Core

> **Regra arquitetural fundamental, sem exceções:** o Raven é composto por duas camadas completamente separadas. Esta separação não é uma preferência de organização — é uma regra de produto que nunca deve ser violada em nenhuma tela.

### Camada 1 — Raven Studio
A interface comercial. É tudo o que o cliente vê e usa.

- Único arquivo: `az-raven-prototype.html`.
- Contém exclusivamente experiência cinematográfica: Home, Biblioteca, os módulos de Direção Criativa e Produção, Configurações simples.
- **Nunca** exibe arquitetura, Design Tokens, Brand Kit, JSON, CSS, HTML cru, documentação técnica ou qualquer elemento que sinalize "isto é um software sendo construído". Nenhum link, botão ou atalho — visível ou escondido — pode dar acesso a esse tipo de conteúdo a partir do Raven Studio.
- Configurações do Raven Studio contém apenas preferências não-técnicas (tema, idioma, notificações, conta). Nunca chaves de API, endpoints ou logs.

### Camada 2 — Raven Core
Toda a infraestrutura do software. Totalmente invisível ao usuário comum.

- Arquivos: `design-tokens.css`, `design-tokens.json`, `az-raven-brand-kit.html`, `az-raven-symbol-concepts.html`, `az-raven-mvp-demo.html`, `docs/MASTER_SPECIFICATION.md`.
- Existe apenas como documentação e ferramentas de apoio à equipe de desenvolvimento e design — nunca como uma tela, link ou botão dentro do Raven Studio.
- Um antigo "Developer Mode" (área técnica acessível por um link discreto no rodapé da sidebar) chegou a existir dentro do próprio `az-raven-prototype.html` e foi **removido por completo** — mesmo escondido atrás de um link, ele ainda era uma porta do Raven Core dentro do Raven Studio, o que viola esta arquitetura. Ver Seção 11 (Histórico de Alterações).

### Protocolo obrigatório antes de gerar qualquer tela
Antes de criar ou alterar qualquer tela, a primeira pergunta a se fazer — sempre, sem exceção — é:

> **"Esta tela será vista por um cliente ou por um desenvolvedor?"**

- **Se for cliente →** a tela pertence ao **Raven Studio**. Nunca deve conter elementos técnicos: sem arquitetura, Design Tokens, Brand Kit, JSON, CSS, HTML cru, documentação, logs, chaves de API ou qualquer sinal de "isto é um software sendo construído". "Cliente" significa uma das seis personas da Seção 1 (Escritor, Cineasta, Criador de conteúdo, Professor, Editor, Agência) — nunca a equipe técnica.
- **Se for desenvolvedor →** a tela pertence ao **Raven Core**. Todo o conteúdo técnico vai para lá — em arquivo separado, nunca dentro do `az-raven-prototype.html`, nunca atrás de um link escondido no produto comercial.

Esta pergunta substitui e formaliza a checagem anterior ("isto pertence à experiência de dirigir um filme, ou é sobre como o software foi construído?") como o primeiro passo obrigatório de todo pedido de tela nova.

---

## 3. Identidade Visual (Brand System v1.0)

### 2.1 Símbolo oficial
**Conceito aprovado:** *"Corvo em Repouso"* (concepção #05 da exploração de 20 conceitos).

- Silhueta de um corvo pousado, construída em curvas orgânicas (`viewBox 0 0 100 100`).
- Gradiente dourado `#E8CB6B → #AD8524` no corpo.
- Olho: círculo escuro (`#0B0D10`).
- Bico: triângulo dourado sólido.
- Acento: uma pena solta caindo da asa (traço dourado curvo), representando o pilar "Literatura".
- Os três pilares conceituais da marca — **A** (origem AZ), **Corvo** (inteligência/direção) e **Pena** (literatura) — estão todos presentes: o corpo do corvo hospeda visualmente uma leitura de A quando reduzido, o corvo é a forma dominante, e a pena caindo fecha a narrativa da marca.
- Aplicado em: favicon, sidebar (`brand-mark`), Hero da Home, Splash Screen, Loading Screen.

Demais 19 conceitos explorados (estrutural, silhueta, pena protagonista, espaço negativo, monoline/geométrico) permanecem documentados em `az-raven-symbol-concepts.html` como registro de decisão, caso a marca precise revisitar a escolha no futuro.

### 2.2 Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0B0D10` | Fundo principal |
| `--color-panel` | `#151A22` | Painéis, sidebar |
| `--color-card` | `#202733` | Cards |
| `--color-text-primary` | `#FFFFFF` | Texto principal |
| `--color-text-secondary` | `#AAB2BF` | Texto secundário |
| `--color-text-tertiary` | `#6B7280` | Texto terciário/legendas |
| `--color-accent` | `#D4AF37` | Destaque dourado da marca |
| `--color-success` | `#4CAF7D` | Estados de sucesso |
| `--color-warning` | `#E0A458` | Estados de atenção |
| `--color-danger` | `#E0605A` | Estados de erro/destrutivo |

Tema único: **Cinematic Dark**. Não há modo claro na v1.0 (planejado para versão futura, já reservado como opção desabilitada em Configurações).

### 2.3 Tipografia
- **Sora** (300–800) — toda a interface, títulos e corpo de texto.
- **JetBrains Mono** (400–500) — prompts, dados técnicos, timestamps, código de tokens.

### 2.4 Design Tokens
Fonte única de verdade centralizada em:
- `design-tokens.css` — custom properties para consumo direto em CSS.
- `design-tokens.json` — mesma informação em formato estruturado para tooling/engenharia.

Categorias tokenizadas: cor, tipografia, espaçamento (base 4px), raio (`sm` 7px / `md` 10px / `lg` 16px / `pill` 100px), sombra (2 níveis de elevação), motion (easing único `cubic-bezier(.4,0,.2,1)` + durações por contexto), iconografia (stroke 1.7–2px, grid 24px) e identidade sonora.

### 2.5 Motion System
Uma única linguagem de movimento aplicada a 8 contextos: Card Hover, Button Hover, Page Transition, Progress Animation, Loading Animation, Logo Reveal, Modal Animation, Toast Animation. Nenhuma animação deve competir visualmente com o conteúdo.

**Splash Screen (abertura):** partícula dourada → desenha o símbolo → brilho discreto → nome "AZ RAVEN" → slogan da empresa → slogan do produto → fade para a Home. Duração total ~5,2s, com botão "Pular introdução" disponível após 1s.

**Loading Screen (carregamento contextual):** símbolo girando + barra de progresso + mensagens cíclicas ("Analisando a narrativa…", "Organizando o storyboard…", "Preparando a direção cinematográfica…", "Finalizando a produção…").

### 2.6 Identidade sonora
4 sons discretos gerados via Web Audio API (osciladores senoidais, sem arquivos externos):
| Evento | Frequências | Duração |
|---|---|---|
| Etapa concluída | 880Hz → 1320Hz | 160ms |
| Nova notificação | 660Hz | 120ms |
| Erro | 220Hz → 180Hz | 200ms |
| Projeto salvo / Exportação concluída | 520 · 780 · 1040Hz | 140ms |

---

## 4. Arquitetura de Navegação (Interface do Produto)

> **Nota de implementação:** o Raven Studio deixou de ser um protótipo estático (`az-raven-prototype.html`) e passou a ser uma aplicação Next.js real (`raven-studio/`). As rotas de arquivo vivem em `app/` com nomes em inglês (`dashboard`, `projects`, `library`, `production`, `director`, `settings`, `export`, etc.) — o mapeamento abaixo mostra a intenção de produto; para o caminho de arquivo exato de cada tela, ver o `README.md` do projeto Next.js.

A sidebar organiza os módulos em 4 grupos, refletindo o fluxo real de produção — não a arquitetura técnica:

```
Estúdio
├── Home                      (dashboard)
└── Biblioteca                (projetos)

Direção Criativa
├── Literary Director         (literary)
├── Emotion Engine            (emotion)
├── Storyboard                (storyboard)
├── Director Engine           (director)
└── Prompt Builder            (prompts)

Produção
├── Produção                  (producao)   — pipeline cinematográfico
├── Timeline                  (timeline)   — edição com painel lateral
├── Assets                    (assets)
├── AZ Quality Director       (quality)    — auditoria antes da exportação
├── Audience Intelligence     (audience)   — preparação para publicação
└── Exportação                (export)

Sistema
└── Configurações             (settings)
```

O Raven Studio não possui nenhum link, botão ou atalho para infraestrutura técnica — a Camada 2 (Raven Core) vive inteiramente fora deste arquivo (ver Seção 2).

**Modo Cinema:** ao abrir um projeto, a sidebar recolhe visualmente (opacidade reduzida até hover), o Storyboard ganha destaque de tela cheia e os cards aumentam — ativado automaticamente ao abrir um projeto pela Home ou manualmente via toggle na topbar.

---

## 5. Pipeline de Produção — 11 Módulos Oficiais (v1.0)

Ordem de execução real do pipeline, exibida na tela **Produção**:

| # | Módulo | Função | Status na interface |
|---|---|---|---|
| 1 | **Literary Director** | Análise literária profunda: tema, personagens, conflito, estrutura, símbolos | ✅ Implementado |
| 2 | **Emotion Engine** | Curva de intensidade emocional cena a cena, com gráfico | ✅ Implementado |
| 3 | **Storyboard** | Cards cinematográficos por cena (miniatura, câmera, luz, som, status) | ✅ Implementado |
| 4 | **Director Engine** | Linguagem cinematográfica: lentes, movimento, iluminação, composição, atmosfera | ✅ Implementado |
| 5 | **Prompt Builder** | Geração de prompts por categoria (imagem, vídeo, áudio, narração, trilha) | ✅ Implementado |
| 6 | **Assets** | Biblioteca visual de ativos gerados | ✅ Implementado |
| 7 | **Produção** | Visão consolidada do pipeline com progresso geral | ✅ Implementado |
| 8 | **Renderização** | Vídeo e mixagem de áudio final | ⏳ Representado no pipeline, sem tela própria |
| 9 | **AZ Quality Director** | Auditoria cinematográfica de 10 categorias antes da exportação | ✅ Implementado |
| 10 | **Audience Intelligence Engine** | Análise de retenção/ritmo + estratégia de publicação por plataforma | ✅ Implementado |
| 11 | **Exportação** | Empacotamento final (Markdown/JSON/ZIP/Projeto completo + formatos sociais) | ✅ Implementado |

> **Nota de ordenação:** o AZ Quality Director roda **antes** do Audience Intelligence Engine — não faz sentido preparar estratégia de publicação para uma obra que ainda pode não estar aprovada em qualidade.

### 4.1 Módulos adicionais documentados (demonstrados, não implementados como tela interativa)
Estes módulos foram especificados e demonstrados em profundidade no documento `az-raven-mvp-demo.html`, mas ainda não possuem tela navegável própria no protótipo interativo — ficam registrados aqui como parte da arquitetura pretendida para v1.0/v1.1:

| Módulo | Função pretendida |
|---|---|
| **Character Engine** | Ficha de direção completa por personagem (objetivo, conflito, personalidade, transformação, linguagem corporal, tom de voz, visual) |
| **World Builder** | World Bible sensorial completa (local, época, clima, luz, sons, texturas, referências fílmicas) |
| **Scene Planner** | Divisão automática da obra em cenas com início/clímax/fim e ligação entre elas |
| **Preview** | Montagem cinematográfica projetada antes da renderização final |
| **Relatório Final** | Relatório automático de qualidade e desempenho da produção |

**Recomendação:** promover Character Engine, World Builder e Scene Planner a telas de primeira classe na Sprint 1, posicionadas entre Emotion Engine e Storyboard no fluxo de Direção Criativa — completando a leitura do pipeline de 11 para 16 módulos com tela própria.

---

## 6. Detalhamento por Módulo Implementado

### 6.1 Home
Hero com símbolo, slogan da empresa, descrição do produto e 3 CTAs (Novo Projeto / Continuar Projeto / Biblioteca). Seção **"Continue de onde parou"** com spotlight do último projeto (pôster, progresso, botão Continuar Produção). Grade de pôsteres de "Projetos recentes" — nunca lista ou tabela.

### 6.2 Biblioteca
Catálogo de produções em formato de pôster de cinema (não lista/tabela). Busca por título/autor/idioma + filtros por status (Todas / Em produção / Em revisão / Concluídas).

### 6.3 Literary Director
Resumo da obra, tema principal, temas secundários, personagens, conflito central, ponto de virada, símbolos, ritmo/tom, clima, e conclusão explícita da IA orientando os módulos seguintes.

### 6.4 Emotion Engine
Emoção dominante, emoções secundárias, intensidade (escala), gráfico de curva emocional (SVG), explicação contextual por momento da narrativa.

### 6.5 Storyboard
Cards cinematográficos por cena: miniatura, número, objetivo emocional, objetivo narrativo, duração, som ambiente, iluminação, movimento de câmera, paleta, status, botões **Abrir Cena / Editar / Gerar Prompt**.

### 6.6 Director Engine
Para cada cena: justificativa de câmera, lente, iluminação, paleta, ritmo, enquadramento e referências fílmicas — decisão sempre conectada de volta ao objetivo emocional do Emotion Engine.

### 6.7 Prompt Builder
Prompts organizados por categoria (Imagem, Vídeo, Áudio, Narração, Trilha), com botão "Copiar" por categoria.

### 6.8 Produção (Pipeline)
Visão consolidada dos 11 módulos com nó visual, status (concluído/em andamento/pendente), progresso percentual e tempo estimado.

### 6.9 Timeline
Fita horizontal de blocos de cena + lista completa + painel lateral fixo que atualiza ao clicar em qualquer cena — comportamento de ferramenta de edição profissional.

### 6.10 Assets
Biblioteca visual de ativos (imagens, vídeos, áudios) com filtro por tipo.

### 6.11 AZ Quality Director
Auditoria de 10 categorias (Narrativa, Emoção, Fotografia, Continuidade, Ritmo, Iluminação, Direção, Identidade Visual, Áudio, Experiência Geral), cada uma com nota e observação, nota geral consolidada, e lista de melhorias sugeridas antes da exportação. **Nunca bloqueia a exportação sozinho** — a decisão final é do diretor humano.

### 6.12 Audience Intelligence Engine
Análise de retenção (gancho inicial, momentos de maior impacto, pontos de risco) e de ritmo. Estratégias específicas por plataforma (YouTube, YouTube Shorts, TikTok, Instagram Reels) via abas interativas. Thumbnail Studio com 3 conceitos (composição, iluminação, emoção, tipografia, motivo de curiosidade). Checklist de publicação com item de revisão humana sempre pendente por padrão. **Objetivo explícito: nunca manipular algoritmo — apenas apresentar melhor o conteúdo.**

### 6.13 Exportação
Opções de entrega: Markdown, JSON, ZIP, Projeto completo, além dos formatos sociais mapeados pelo Audience Intelligence Engine (YouTube, Shorts, TikTok, Reels, Master).

### 6.14 Configurações
Preferências simples e não-técnicas: tema, idioma, notificações de produção, dados de conta. Nenhuma configuração de API, chave de integração ou log técnico — esse tipo de conteúdo não existe no Raven Studio em nenhuma tela (ver Seção 2).

### 6.15 Raven Core (não existe no Raven Studio)
Não há mais uma tela ou modo de acesso à infraestrutura dentro de `az-raven-prototype.html`. Tudo que antes vivia em um "Developer Mode" (design tokens, Brand Kit, biblioteca de componentes, estrutura de dados mockada) agora existe **apenas** como documentação separada da Camada 2 — ver Seção 2 e o inventário de arquivos na Seção 9. Esta subseção permanece no documento apenas para registrar a mudança arquitetural; nenhuma implementação correspondente deve ser reintroduzida no protótipo.

---

## 7. Design System — Componentes

Componentes reutilizáveis, cada um com estados Normal / Hover / Focus / Disabled / Loading (onde aplicável):

Botões (primary/secondary/ghost/danger) · Cards (padrão/flat/hover) · Sidebar · Navbar (topbar) · Inputs · Textareas · Selects/Dropdowns · Checkboxes · Badges (gold/success/warning/danger/neutral) · Progress Bars · Modais · Alertas (info/success/warning) · Toasts · Tabelas · Tooltips · Pill buttons (filtros) · Scene Cards (cinematográficos) · Poster Cards · Pipeline Steps · Timeline Blocks · Quality Audit Items · Thumbnail Concept Cards · Publication Checklist Items.

Todos consomem os Design Tokens da Seção 3.4 — nenhuma cor, raio ou sombra deve ser declarada diretamente em um componente.

---

## 8. Dados de Demonstração

Projeto oficial de demonstração: **"O Corvo"**, de Edgar Allan Poe, tradução de Milton Amado, Português (Brasil).

> Nota de conformidade: toda a análise textual usada nas demonstrações (Literary Director, Emotion Engine, Character Engine, etc.) foi construída em linguagem própria a partir do enredo de domínio público da obra — nenhum verso da tradução de Milton Amado é reproduzido literalmente em nenhum artefato deste projeto.

6 cenas mapeadas: *Meia-noite tenebrosa* · *A batida na porta* · *A janela se abre* · *O pouso no busto de Palas* · *O interrogatório* · *"Nunca mais" final*.

---

## 9. Inventário de Arquivos do Projeto

| Arquivo | Conteúdo |
|---|---|
| `az-raven-prototype.html` | Protótipo navegável do produto — única fonte de verdade da experiência do usuário |
| `az-raven-brand-kit.html` | Manual de marca completo: símbolo, 11 versões do logotipo, motion system, identidade sonora |
| `az-raven-symbol-concepts.html` | Exploração de 20 conceitos de símbolo (registro de decisão) |
| `az-raven-mvp-demo.html` | Demonstração narrativa completa dos 18 módulos usando "O Corvo" como projeto guia |
| `design-tokens.css` | Custom properties para consumo direto em CSS |
| `design-tokens.json` | Tokens estruturados para tooling/engenharia |
| `docs/MASTER_SPECIFICATION.md` | Este documento — consolidação de todas as decisões |

---

## 10. Roadmap Honesto

### Pronto para impressionar hoje
- Pipeline de 11 módulos com raciocínio explicado em cada etapa — nenhuma "caixa preta".
- Coerência entre Literary Director → Emotion Engine → Director Engine → AZ Quality Director.
- Experiência cinematográfica real na interface (Modo Cinema, Timeline, pôsteres) — sem nenhum traço de infraestrutura visível.

### Faltando para a v1.0 real
- Integração com motor de geração de imagem/vídeo/voz/música (hoje 100% simulado).
- Autenticação e persistência real de projetos (hoje mockado em memória/arrays JS).
- Telas próprias para Character Engine, World Builder e Scene Planner (hoje só documentados).
- Mecanismo de correção manual quando a IA erra uma decisão criativa.

### Sugestões para v1.1
- Colaboração multiusuário com comentários por cena.
- Histórico de versões do storyboard.
- Biblioteca de referências fílmicas pesquisável dentro do Director Engine.
- Exportação para editores profissionais (XML/EDL), além dos formatos sociais.

---

## 11. Histórico de Alterações

> **Regra de manutenção:** a partir desta versão, toda alteração de produto, marca ou arquitetura aprovada no projeto AZ Raven é registrada nesta seção antes de qualquer outra coisa — este documento é a fonte única e viva da verdade. Nenhuma mudança deve existir apenas em um arquivo isolado sem também estar refletida aqui.

| Data/Sprint | Alteração | Arquivos afetados |
|---|---|---|
| Sprint 0 · Project Foundation | Fundação oficial do repositório GitHub: estrutura completa de pastas (`hooks/`, `public/`, `styles/`, `knowledge-core/` com 6 subpastas, `prompts/`, `assets/`, `tests/`, `scripts/`); 11 documentos estratégicos criados em `docs/` (Master Plan, Product Vision, Roadmap, Changelog, Project Rules, Governance, Scalability Architecture, Business Model, Monetization Strategy, Quality Standards, Security); README.md reescrito por completo. Nenhuma tela, componente ou lógica existente foi alterada. | `raven-studio/` (estrutura de repositório) |
| — | **Raven Studio migrado para aplicação Next.js real** (React + TypeScript + Tailwind + Framer Motion). Nenhuma tela é mais imagem/mockup — 21 rotas reais, incluindo `/projects/[id]` dinâmica. Estrutura de pastas oficial adotada: `dashboard, projects, library, storyboard, production, director, settings` + módulos adicionais (`literary-director, emotion-engine, character-engine, world-builder, prompt-builder, assets, timeline, quality-director, audience-intelligence, export`). Pipeline de Produção expandido para 12 módulos com Character Engine e World Builder incluídos. Transições de página, modal e toasts animados com Framer Motion. | `raven-studio/` (projeto Next.js completo) |
| — | **Reafirmação explícita:** todo protótipo deve ser apresentado exclusivamente do ponto de vista do usuário final; Raven Core permanece invisível na interface principal em qualquer circunstância. Elementos técnicos, quando necessários, existem apenas em documentação interna (Raven Core) — nunca na interface do produto. Nenhuma alteração de código foi necessária: a regra já estava em vigor desde a remoção do Developer Mode; esta entrada apenas formaliza a reafirmação recebida. | `docs/MASTER_SPECIFICATION.md` |
| — | **Personas oficiais do cliente definidas:** Escritor, Cineasta, Criador de conteúdo, Professor, Editor, Agência — nenhuma delas é técnica. Passam a ser a régua concreta da pergunta "cliente ou desenvolvedor?" da Seção 2. Nova subseção "Quem é o cliente do Raven" na Seção 1. | `docs/MASTER_SPECIFICATION.md` |
| — | **Protocolo obrigatório instituído:** toda tela nova deve primeiro responder "cliente ou desenvolvedor?" — cliente vai para o Raven Studio sem nenhum elemento técnico; desenvolvedor vai inteiramente para o Raven Core. Regra registrada na Seção 2. | `docs/MASTER_SPECIFICATION.md` |
| — | **Arquitetura de camadas formalizada:** Raven Studio (interface comercial) × Raven Core (infraestrutura, totalmente oculta). O "Developer Mode" foi removido por completo do protótipo — CSS, HTML e JS do overlay e do link no rodapé da sidebar — por violar a separação de camadas mesmo estando escondido atrás de um link discreto. Nova Seção 2 criada neste documento com a regra arquitetural. | `az-raven-prototype.html`, `docs/MASTER_SPECIFICATION.md` |
| Sprint 0 | Protótipo inicial navegável — 10 telas, design system base, paleta e tipografia definidas | `az-raven-prototype.html` |
| Sprint 0 · Revisão 1 | Refinamento cinematográfico: Hero Section, Storyboard como card cinematográfico, Pipeline de produção, Timeline, Modo Cinema, Painel de Projeto | `az-raven-prototype.html` |
| Sprint 0 · Brand System v1.0 | Símbolo A+Corvo+Pena inicial, Brand Kit completo (11 versões), Design Tokens, Splash e Loading Screens, identidade sonora | `az-raven-brand-kit.html`, `design-tokens.css`, `design-tokens.json`, `az-raven-prototype.html` |
| Sprint 0.2 · Experience First | Remoção de artefatos técnicos da experiência principal; Home reconstruída (Continue de onde parou + pôsteres); Projetos → Biblioteca; Emotion Engine adicionado; Pipeline expandido para 9 módulos; Configurações simplificada; Developer Mode criado | `az-raven-prototype.html` |
| — | 20 conceitos de símbolo explorados e documentados | `az-raven-symbol-concepts.html` |
| — | Símbolo oficial definido: conceito #05 "Corvo em Repouso", aplicado em toda a interface | `az-raven-prototype.html` |
| — | Demonstração completa do MVP 1.0 (16 módulos) usando "O Corvo" como projeto guia | `az-raven-mvp-demo.html` |
| — | Módulo 17 — Audience Intelligence Engine adicionado (análise de retenção/ritmo, estratégia por plataforma, Thumbnail Studio, checklist de publicação) | `az-raven-mvp-demo.html`, `az-raven-prototype.html` |
| — | Módulo 18 — AZ Quality Director adicionado (auditoria de 10 categorias antes da exportação); Pipeline expandido para 11 módulos | `az-raven-mvp-demo.html`, `az-raven-prototype.html` |
| — | Consolidação: criação deste Master Specification | `docs/MASTER_SPECIFICATION.md` |

*Novas linhas devem ser adicionadas ao topo da tabela (mais recente primeiro) a partir daqui.*

---

*Documento gerado como consolidação das Sprints 0, 0.2 e dos módulos 17–18. Última atualização formaliza a arquitetura de duas camadas (Raven Studio × Raven Core) e remove definitivamente qualquer traço de infraestrutura técnica do protótipo comercial.*
