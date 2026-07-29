# tests/

Testes automatizados do Raven Studio, usando [Vitest](https://vitest.dev/)
(configurado em `vitest.config.ts`, na raiz do projeto).

## Como rodar

```bash
npm test
```

## Estrutura

- `pipeline-service/` — testes do Pipeline Service (`lib/pipeline-service`),
  a camada de orquestração entre consumidores e o Pipeline Engine.
- `api/` — testes das rotas internas do Pipeline (`app/api/pipeline`),
  chamando o route handler diretamente, sem subir servidor.
- `architecture/` — testes de fronteira de arquitetura: garantem que a UI
  (`app/`, exceto `app/api`, e `components/`) nunca importa o Pipeline
  Engine, o Registry ou o Pipeline Service diretamente, e que a API nunca
  importa Engine/Registry diretamente — só o Pipeline Service.
