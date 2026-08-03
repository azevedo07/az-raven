# Storage Layer

Fundação de armazenamento do Raven Studio (Sprint 1.8, Task 1) — a base
que o Asset Manager (`lib/assets/`) vai usar no futuro para de fato
gravar e ler arquivos. Esta Task é **só a fundação**: contratos, tipos,
erros e um adapter local para desenvolvimento. Nenhum upload/download
real de produção, nenhuma rota HTTP, nenhuma UI, nenhuma integração com
`lib/assets/` ou com o Pipeline.

## Objetivo

Isolar completamente "onde os bytes de um arquivo moram" de tudo o mais
no sistema. Nenhum provedor de storage concreto (Amazon S3, Cloudflare
R2, MinIO, Google Cloud Storage, Azure, Backblaze) deve vazar para fora
de `lib/storage/` — quem quiser guardar ou ler um arquivo depende só da
interface `StorageAdapter`, nunca de um SDK de provedor específico.

## Arquitetura

```
lib/storage/
  types.ts              Tipos de domínio: StorageProvider, StorageMetadata,
                         StorageFile, UploadResult, DownloadResult
  storageAdapter.ts      A interface StorageAdapter (o contrato)
  storageErrors.ts        StorageError e as 5 subclasses específicas
  localStorageAdapter.ts  Implementação para desenvolvimento (disco local)
  README.md               Este arquivo
```

Nenhum arquivo aqui importa nada de `lib/pipeline-core/`,
`lib/repositories/`, `lib/pipeline-service/`, `lib/application/`,
`lib/assets/`, Prisma, Next.js, React ou qualquer SDK de nuvem — ver
`tests/architecture/storage-layer-boundaries.test.ts`. O Storage Layer
não sabe que Pipeline ou Asset Manager existem.

```
StorageAdapter (interface)
  ├── LocalStorageAdapter    (Sprint 1.8 — disco local, dev only)
  ├── S3StorageAdapter        (futuro)
  ├── R2StorageAdapter         (futuro)
  ├── MinioStorageAdapter       (futuro)
  ├── GoogleCloudStorageAdapter  (futuro)
  ├── AzureStorageAdapter        (futuro)
  └── BackblazeStorageAdapter     (futuro)
```

## Fluxo

Todo `StorageAdapter` fala a mesma linguagem: uma `key` (string opaca —
quem chama decide nomenclatura/namespacing, o adapter só a usa como
referência) entra, um `StorageFile` sai.

```
upload(key, data, options)          -> UploadResult   (grava)
download(key)                       -> DownloadResult (lê o arquivo inteiro)
exists(key)                         -> boolean         (nunca lança)
delete(key)                         -> void            (remove)
getPublicUrl(key)                   -> string           (síncrono, sem I/O)
getSignedDownloadUrl(key, options)  -> Promise<string>   (assíncrono — provedores reais assinam)
```

Falhas viram um dos 5 erros de `storageErrors.ts`
(`StorageFileNotFoundError`, `StorageUploadError`, `StorageDownloadError`,
`StorageDeleteError`, `StoragePermissionError`), todos derivando de
`StorageError` — quem chama pode capturar genericamente ou por tipo.

## `LocalStorageAdapter` (desenvolvimento)

Grava em `storage/uploads/` (relativo à raiz do projeto, configurável via
o construtor) — **nunca** em `public/` (isso serviria os arquivos
estaticamente pelo Next.js sem controle de acesso nenhum) e **nunca** no
banco (isso é papel do Prisma/`AssetRepository`; este adapter só move
bytes). Cada arquivo grava um `<key>.meta.json` ao lado do conteúdo, para
guardar `contentType`/`checksum`/metadados sem precisar de nenhum banco —
uma particularidade desta implementação, não do contrato.

Toda `key` é validada contra o diretório base antes de tocar o disco —
uma tentativa de path traversal (`"../../etc/passwd"`) lança
`StoragePermissionError`, nunca escreve/lê fora de `storage/uploads/`.

`getPublicUrl`/`getSignedDownloadUrl` devolvem URLs `file://` — não são
navegáveis por um browser sem uma rota HTTP dedicada (fora de escopo
desta Task) nem `getSignedDownloadUrl` é uma assinatura criptográfica de
verdade. Servem para que código que já espera essas duas chamadas
funcione contra o adapter local em desenvolvimento; um adapter de nuvem
real é quem faz a URL (e a assinatura) valerem alguma coisa.

## Como trocar de provedor

Nada no resto do sistema deve depender de qual `StorageAdapter` está em
uso — só do tipo `StorageAdapter`. Trocar de provedor é trocar **qual
classe é instanciada** no ponto de composição que vier a consumir este
módulo (uma Task futura, provavelmente algo como
`lib/assets/container.ts` passando a injetar um `StorageAdapter` no
`AssetService`, ou um `lib/storage/container.ts` próprio):

```ts
// Hoje (dev):
const storage: StorageAdapter = new LocalStorageAdapter();

// Amanhã (produção), sem mudar nenhum código que já usa `storage`:
const storage: StorageAdapter = new S3StorageAdapter({ bucket: "..." });
```

Nenhuma mudança de contrato é necessária — é exatamente para isso que a
interface existe.

## Como criar novos adapters

1. Criar `lib/storage/<provedor>StorageAdapter.ts`.
2. Implementar a interface `StorageAdapter` (os 6 métodos + `provider`).
3. Traduzir cada um dos 5 erros de `storageErrors.ts` a partir do que o
   SDK do provedor lançar (ex.: um S3 `NoSuchKey` vira
   `StorageFileNotFoundError`) — quem chama nunca deve precisar conhecer
   os erros nativos do SDK.
4. Adicionar o valor correspondente em `StorageProvider` (`types.ts`) se
   ainda não existir.
5. Escrever testes de integração reais contra o provedor (ou um emulador
   local, ex.: `minio` em Docker, ou `localstack` para S3) — mesmo
   princípio já usado em `tests/assets/prismaAssetRepository.test.ts`:
   sem mocks, contra o serviço de verdade.
6. **Não** alterar `storageAdapter.ts` a menos que o contrato em si
   precise crescer para todos os provedores (não só para o novo) — nesse
   caso, qualquer mudança deve ser aditiva (novo método opcional, nunca
   remover/renomear um existente), para não quebrar adapters já escritos.

## Próximos passos (fora de escopo desta Task)

- Um Composition Root que injete um `StorageAdapter` real no
  `AssetService` (`lib/assets/`).
- Rotas HTTP de upload/download.
- O primeiro adapter de nuvem de verdade (provavelmente S3 ou R2).
