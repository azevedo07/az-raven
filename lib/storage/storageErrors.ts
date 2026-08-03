/**
 * Storage Layer — erros de domínio (Sprint 1.8, Task 1).
 *
 * Um tipo de erro por falha possível de `StorageAdapter`, todos
 * derivando de `StorageError` (mesmo padrão de `PipelineTransitionError`/
 * `PipelineRegistryError` em `lib/pipeline-core/engine.ts`/`registry.ts`:
 * `extends Error`, `name` próprio, mensagem clara). Quem chama pode
 * capturar `StorageError` genericamente ou um tipo específico
 * (`instanceof StorageFileNotFoundError`) quando precisar reagir
 * diferente a cada caso.
 */

/** Base de todo erro do Storage Layer. Carrega `key` quando o erro é sobre um arquivo específico. */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly key?: string
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/** O arquivo referenciado por `key` não existe no provedor. */
export class StorageFileNotFoundError extends StorageError {
  constructor(key: string) {
    super(`Arquivo não encontrado no storage: "${key}".`, key);
    this.name = "StorageFileNotFoundError";
  }
}

/** Falha ao gravar um arquivo novo (ex.: disco cheio, escrita interrompida, key inválida). */
export class StorageUploadError extends StorageError {
  constructor(key: string, reason?: string) {
    super(`Falha ao enviar arquivo para o storage: "${key}"${reason ? ` — ${reason}` : ""}.`, key);
    this.name = "StorageUploadError";
  }
}

/** Falha ao ler um arquivo que deveria existir (diferente de "não encontrado" — ex.: corrompido, leitura interrompida). */
export class StorageDownloadError extends StorageError {
  constructor(key: string, reason?: string) {
    super(`Falha ao baixar arquivo do storage: "${key}"${reason ? ` — ${reason}` : ""}.`, key);
    this.name = "StorageDownloadError";
  }
}

/** Falha ao remover um arquivo (diferente de "não encontrado" — ex.: sem permissão do sistema de arquivos). */
export class StorageDeleteError extends StorageError {
  constructor(key: string, reason?: string) {
    super(`Falha ao remover arquivo do storage: "${key}"${reason ? ` — ${reason}` : ""}.`, key);
    this.name = "StorageDeleteError";
  }
}

/**
 * A operação foi recusada por motivo de permissão/segurança — ex.: uma
 * `key` que tenta escapar do diretório sandboxed do `LocalStorageAdapter`
 * (path traversal, tipo `"../../etc/passwd"`). Não é um erro de "arquivo
 * não existe": é "esta operação não é permitida", mesmo que o alvo exista.
 */
export class StoragePermissionError extends StorageError {
  constructor(key: string, reason?: string) {
    super(`Operação não permitida no storage: "${key}"${reason ? ` — ${reason}` : ""}.`, key);
    this.name = "StoragePermissionError";
  }
}
