# Changelog

> Registro cronológico de todas as mudanças relevantes do projeto AZ Raven,
> por versão.

## Sprint 1.2 — Pipeline Service + API interna (2026-07-29)

- Criado o Pipeline Service (`lib/pipeline-service/pipelineService.ts`): camada de orquestração entre consumidores e o Pipeline Engine, dona do registro de engines por projeto.
- Criada a API interna `GET /api/pipeline/:projectId` (`app/api/pipeline/[projectId]/route.ts`) — a única interface para consumidores externos (browser, mobile, integrações futuras).
- `lib/pipeline-core/store.ts` deixou de instanciar o `PipelineEngine` diretamente; passou a ser um Server Adapter que consome o Pipeline Service, mantendo a UI existente (`app/production`) sem nenhuma mudança visual.
- Arquitetura de camadas formalizada e protegida por teste automatizado (`tests/architecture/layer-boundaries.test.ts`): `UI → store.ts (Server Adapter) → Pipeline Service → Pipeline Engine → Registry`; `API → Pipeline Service`.
- Vitest configurado como framework de testes oficial do projeto (`vitest.config.ts`); suíte inicial com 9 testes cobrindo o Pipeline Service, a rota da API e as fronteiras de arquitetura.

## Sprint 1.1 — Pipeline Core Foundation (2026-07-28)

- Criado o Pipeline Core (`lib/pipeline-core/`): contratos de tipo (`types.ts`), registry dos 12 módulos oficiais em cadeia linear de dependência (`registry.ts`), motor de execução com máquina de estados e eventos (`engine.ts`) e camada de estado por projeto (`store.ts`).
- `lib/data.ts` deixou de expor `pipelineModules` como array estático mockado — passou a ser derivado do estado real do `PipelineEngine`.
- Ambiente de desenvolvimento estabilizado: atualização para Node.js 24 LTS, resolvendo a incompatibilidade com Next.js 14.
- Repositório reconciliado com o histórico já existente no GitHub (LICENSE preservado via merge com `--allow-unrelated-histories`).
