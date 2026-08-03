import { createHash } from "crypto";
import { access, mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { StorageAdapter } from "./storageAdapter";
import { DownloadResult, StorageMetadata, StorageProvider, UploadResult } from "./types";
import {
  StorageDeleteError,
  StorageDownloadError,
  StorageError,
  StorageFileNotFoundError,
  StoragePermissionError,
  StorageUploadError,
} from "./storageErrors";

interface StoredMeta {
  contentType: string;
  size: number;
  checksum: string;
  createdAt: string;
  metadata: StorageMetadata | null;
}

/**
 * Implementação local do `StorageAdapter`, só para desenvolvimento
 * (Sprint 1.8, Task 1). Grava em `storage/uploads/` (relativo à raiz do
 * projeto por padrão) — nunca em `public/` (isso tornaria os arquivos
 * servíveis estaticamente pelo Next.js sem nenhum controle de acesso) e
 * nunca no banco (isso é exatamente o que `AssetRepository`/Prisma já
 * cobrem para metadados; este adapter só move bytes).
 *
 * Cada arquivo grava um sidecar `<key>.meta.json` ao lado do conteúdo —
 * é assim que este adapter guarda `contentType`/`checksum`/`metadata`
 * sem precisar de nenhum banco de dados (um arquivo cru no disco não
 * carrega isso sozinho). Cada `StorageAdapter` real (S3, R2…) resolve
 * esse mesmo problema do jeito nativo do seu provedor (ex.: metadados de
 * objeto do S3) — o sidecar é uma particularidade desta implementação,
 * não do contrato.
 *
 * Toda `key` é resolvida e validada contra o diretório base antes de
 * qualquer operação de disco — uma `key` como `"../../etc/passwd"`
 * nunca escreve/lê fora de `storage/uploads/` (`StoragePermissionError`).
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly provider: StorageProvider = "LOCAL";

  constructor(private readonly baseDir: string = path.join(process.cwd(), "storage", "uploads")) {}

  async upload(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    options?: { contentType?: string; metadata?: StorageMetadata }
  ): Promise<UploadResult> {
    const filePath = this.resolvePath(key);

    try {
      const buffer = await this.toBuffer(data);
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const contentType = options?.contentType ?? "application/octet-stream";
      const createdAt = new Date();

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, buffer);

      const stored: StoredMeta = {
        contentType,
        size: buffer.length,
        checksum,
        createdAt: createdAt.toISOString(),
        metadata: options?.metadata ?? null,
      };
      await writeFile(this.metaPath(filePath), JSON.stringify(stored));

      return {
        key,
        provider: this.provider,
        contentType,
        size: buffer.length,
        checksum,
        metadata: options?.metadata,
        createdAt,
      };
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageUploadError(key, error instanceof Error ? error.message : String(error));
    }
  }

  async download(key: string): Promise<DownloadResult> {
    const filePath = this.resolvePath(key);
    const meta = await this.readMeta(filePath, key);

    try {
      const data = await readFile(filePath);
      return {
        key,
        provider: this.provider,
        contentType: meta.contentType,
        size: meta.size,
        checksum: meta.checksum,
        metadata: meta.metadata ?? undefined,
        createdAt: new Date(meta.createdAt),
        data,
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        throw new StorageFileNotFoundError(key);
      }
      throw new StorageDownloadError(key, error instanceof Error ? error.message : String(error));
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);

    if (!(await this.pathExists(filePath))) {
      throw new StorageFileNotFoundError(key);
    }

    try {
      await rm(filePath, { force: true });
      await rm(this.metaPath(filePath), { force: true });
    } catch (error) {
      throw new StorageDeleteError(key, error instanceof Error ? error.message : String(error));
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.pathExists(this.resolvePath(key));
    } catch {
      // Uma key inválida (ex.: tentativa de path traversal) não "existe"
      // do ponto de vista de quem chama — exists() nunca lança.
      return false;
    }
  }

  getPublicUrl(key: string): string {
    const filePath = this.resolvePath(key);
    // Não há servidor HTTP expondo storage/uploads/ (de propósito — ver
    // o comentário da classe). O esquema file:// é a resposta honesta
    // para "onde este recurso estaria publicamente" num adapter local:
    // não é uma URL navegável por um browser sem uma rota dedicada
    // (fora de escopo desta Task).
    return `file://${this.toPosixPath(filePath)}`;
  }

  async getSignedDownloadUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string> {
    const filePath = this.resolvePath(key);

    if (!(await this.pathExists(filePath))) {
      throw new StorageFileNotFoundError(key);
    }

    // Não é uma assinatura criptográfica de verdade — não há como
    // "assinar" acesso a um arquivo local sem uma rota HTTP validando o
    // token (fora de escopo desta Task). Isto só preenche o contrato
    // com uma forma estruturalmente equivalente (URL + expiração), para
    // que código que já espera `getSignedDownloadUrl()` funcione contra
    // este adapter em desenvolvimento; um adapter real de nuvem é quem
    // faz a assinatura valer alguma coisa.
    const expiresInSeconds = options?.expiresInSeconds ?? 3600;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    return `file://${this.toPosixPath(filePath)}?expires=${expiresAt}`;
  }

  /** Resolve `key` para um caminho absoluto dentro de `baseDir`, recusando qualquer tentativa de escapar dele. */
  private resolvePath(key: string): string {
    const resolved = path.resolve(this.baseDir, key);
    const relative = path.relative(this.baseDir, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new StoragePermissionError(key, "a key tenta acessar um caminho fora do diretório de storage");
    }
    return resolved;
  }

  private metaPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  private toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join("/");
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private isNotFound(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as NodeJS.ErrnoException).code === "ENOENT";
  }

  private async readMeta(filePath: string, key: string): Promise<StoredMeta> {
    try {
      const raw = await readFile(this.metaPath(filePath), "utf-8");
      return JSON.parse(raw) as StoredMeta;
    } catch (error) {
      if (this.isNotFound(error)) {
        throw new StorageFileNotFoundError(key);
      }
      throw new StorageDownloadError(key, "metadados do arquivo corrompidos ou ilegíveis");
    }
  }

  private async toBuffer(data: Buffer | NodeJS.ReadableStream): Promise<Buffer> {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
