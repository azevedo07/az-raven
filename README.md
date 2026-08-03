# AZ Raven

**"Toda arte em busca da perfeição."**

Transformar literatura em experiências cinematográficas com inteligência
artificial.

---

## O que é o AZ Raven

O AZ Raven é um estúdio cinematográfico movido por inteligência artificial.
Ele recebe uma obra literária — um poema, um conto, um roteiro — e conduz
essa obra por um pipeline de direção criativa e produção até chegar a uma
peça audiovisual pronta para publicação.

O Raven não é uma ferramenta de edição genérica nem um gerador de imagens
avulso. Ele é um diretor: interpreta a obra, decide o tom emocional, escolhe
a linguagem cinematográfica, monta o storyboard, audita a própria qualidade
e prepara a estratégia de publicação — sempre explicando o raciocínio por
trás de cada decisão.

## Objetivo

Dar a escritores, cineastas, criadores de conteúdo, professores, editores e
agências um caminho direto entre um texto e um filme — sem exigir que essas
pessoas dominem técnica cinematográfica para obter um resultado com
qualidade de estúdio.

## Empresa e produto

| | |
|---|---|
| **Empresa** | AZ |
| **Produto** | AZ Raven |
| **Slogan** | Toda arte em busca da perfeição. |
| **Missão** | Transformar literatura em experiências cinematográficas com inteligência artificial. |

## Filosofia

- **Elegância antes de excesso.** Cada decisão visual e de produto busca
  sofisticação, não decoração.
- **Explicabilidade.** Nenhum módulo de IA toma uma decisão criativa sem
  poder justificá-la — a mesma exigência que se faria a um diretor humano.
- **Duas camadas, uma fronteira rígida.** O produto (**Raven Studio**) e a
  infraestrutura (**Raven Core**) nunca se misturam. Quem usa o Raven vê um
  estúdio de cinema; nunca vê arquitetura, tokens ou documentação técnica.
  Ver `docs/PROJECT_RULES.md`.
- **Curadoria humana, sempre.** Módulos como o AZ Quality Director orientam
  e apontam melhorias — mas nunca substituem a aprovação final de um
  diretor humano.

## Arquitetura

O repositório é organizado em duas camadas conceituais:

- **Raven Studio** — a aplicação Next.js em `app/`, `components/`, `lib/` e
  `hooks/`. É tudo o que o cliente final utiliza.
- **Raven Core** — tudo que sustenta o Raven Studio sem nunca aparecer nele:
  documentação estratégica (`docs/`), base de conhecimento dos módulos de IA
  (`knowledge-core/`), templates de prompt (`prompts/`), scripts de
  automação (`scripts/`) e testes (`tests/`).

### Pipeline Core

O motor de produção do Raven (`lib/pipeline-core/`, `lib/pipeline-service/`,
`lib/repositories/`) segue uma arquitetura em camadas, documentada em
detalhe em `docs/architecture/` (diagramas Mermaid, ADRs e regras de
dependência):

- **Pipeline Engine** — máquina de estados **determinística**: as mesmas
  entradas sempre produzem a mesma saída, sem I/O, sem rede, sem banco.
  Não conhece Prisma, Repository, API nem UI.
- **Repository Pattern** — a persistência vive atrás de um contrato
  (`PipelineRepository`); só a implementação concreta
  (`PrismaPipelineRepository`) e o cliente do banco conhecem Prisma.
- **Dependency Injection** — o `PipelineService` recebe o Repository via
  construtor, nunca instanciando a implementação concreta na sua lógica
  — o que permite testar o Service com um repositório falso em memória.
- **Prisma + PostgreSQL** — camada de persistência real, escolhida após
  análise comparativa de bancos e ORMs (ver `docs/architecture/adr/ADR-0002.md`).
- **Server Components e Client Components** — código exclusivo de
  servidor (Prisma, `pg`) é isolado com `import "server-only"`, para o
  build falhar de forma clara caso algum Client Component tente
  importá-lo (ver `docs/architecture/adr/ADR-0005.md`).

Documentação completa: `docs/architecture/system-architecture.md`
(diagramas), `docs/architecture/dependency-rules.md` (regras) e
`docs/architecture/adr/` (decisões e seus porquês).

## Tecnologias

- **Next.js** (App Router) — framework e roteamento
- **React** — componentes de interface
- **TypeScript** — tipagem em toda a base de código
- **Tailwind CSS** — estilização, com os tokens de marca da AZ configurados
  em `tailwind.config.ts`
- **Framer Motion** — animações e transições de interface

## Roadmap

O roadmap detalhado vive em `docs/ROADMAP.md`. Em linha geral, o projeto
avança em sprints incrementais: fundação do repositório → módulos de
direção criativa → pipeline de produção → auditoria de qualidade →
inteligência de audiência → escala e monetização.

## Como executar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — a aplicação
redireciona automaticamente para o Dashboard.

Build de produção:

```bash
npm run build
npm start
```

## Banco de dados (PostgreSQL via Docker)

O Pipeline Core (Sprint 1.3) persiste em PostgreSQL através do Prisma.
Ambiente local padronizado via Docker Compose — nenhuma instalação de
Postgres na máquina é necessária.

1. Copie o arquivo de variáveis de ambiente (se ainda não tiver um `.env`):

   ```bash
   cp .env.example .env
   ```

2. Suba o banco:

   ```bash
   docker compose up -d
   ```

3. Confirme que subiu e está saudável:

   ```bash
   docker compose ps
   ```

   O serviço `postgres` deve aparecer como `healthy` depois de alguns
   segundos.

4. Para parar o banco (mantendo os dados):

   ```bash
   docker compose stop
   ```

   Para parar e remover o container (os dados continuam no volume):

   ```bash
   docker compose down
   ```

   Para apagar também os dados (reset completo do banco local):

   ```bash
   docker compose down -v
   ```

Os dados do Postgres ficam num volume Docker nomeado
(`az_raven_postgres_data`), persistente entre `docker compose down`/`up` —
só é apagado com `-v` explícito.

Com o banco no ar, `DATABASE_URL` em `.env` já aponta para
`localhost:5432` com as credenciais definidas em `POSTGRES_USER`/
`POSTGRES_PASSWORD`/`POSTGRES_DB` (mesmas variáveis usadas pelo
`docker-compose.yml` para criar o banco). Migrations do Prisma (`prisma
migrate dev`) ainda não fazem parte deste passo — chegam numa Task
seguinte.

## Estrutura das pastas

```
app/                 rotas do Raven Studio (App Router — uma pasta por tela)
components/          componentes de interface reutilizáveis
  providers/         contextos React (toast, modo cinema, modais)
  ui/                primitivos de design system (Button, Card, Modal...)
hooks/               React hooks customizados e reutilizáveis
lib/                 camada de dados e tipos compartilhados
public/              arquivos estáticos servidos pelo Next.js
styles/              folhas de estilo globais complementares
docs/                documentação estratégica do projeto (Raven Core)
knowledge-core/      base de conhecimento dos módulos de IA
  emotion-ontology/    vocabulário emocional do Emotion Engine
  cinematic-language/  linguagem cinematográfica do Director Engine
  storytelling/        estruturas narrativas do Literary Director
  literary-rules/      diretrizes de interpretação de obras originais
  quality-standards/   critérios de auditoria do AZ Quality Director
  world-bibles/        modelos de universo sensorial do World Builder
prompts/             templates de prompt reutilizáveis pelos módulos de IA
assets/              ativos de marca em formato fonte (símbolo, paleta...)
tests/               testes automatizados
scripts/             scripts utilitários de desenvolvimento e automação
```

## Documentação

Toda a documentação estratégica do projeto vive em `docs/`:

- `MASTER_PLAN.md` — plano diretor do projeto
- `PRODUCT_VISION.md` — visão de produto
- `ROADMAP.md` — sequência de sprints e versões
- `CHANGELOG.md` — histórico de mudanças por versão
- `PROJECT_RULES.md` — regras não-negociáveis do projeto
- `GOVERNANCE.md` — como decisões são tomadas
- `SCALABILITY_ARCHITECTURE.md` — como o produto cresce
- `BUSINESS_MODEL.md` — como o AZ Raven gera valor
- `MONETIZATION_STRATEGY.md` — planos e estratégia de precificação
- `QUALITY_STANDARDS.md` — padrões mínimos de qualidade de entrega
- `SECURITY.md` — política de segurança
- `MASTER_SPECIFICATION.md` — a especificação consolidada de produto, marca
  e arquitetura até a data mais recente
