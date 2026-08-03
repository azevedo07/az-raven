import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { Readable } from "stream";
import { createHash } from "crypto";
import { LocalStorageAdapter } from "../../lib/storage/localStorageAdapter";
import {
  StorageDeleteError,
  StorageDownloadError,
  StorageFileNotFoundError,
  StoragePermissionError,
} from "../../lib/storage/storageErrors";

/**
 * Testes do `LocalStorageAdapter` (Sprint 1.8, Task 1) — direto contra o
 * sistema de arquivos real, sem mocks (mesmo princípio já usado nos
 * testes de integração do Repository: um adapter de armazenamento sem
 * testar I/O de verdade não prova nada). Usa um diretório temporário do
 * SO por execução (nunca `storage/uploads/` de verdade), removido ao
 * final.
 */
describe("LocalStorageAdapter", () => {
  let baseDir: string;
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "raven-storage-test-"));
    adapter = new LocalStorageAdapter(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  describe("upload", () => {
    it("grava um Buffer e devolve UploadResult com provider, tamanho e checksum corretos", async () => {
      const content = Buffer.from("conteúdo de teste");
      const result = await adapter.upload("arquivo.txt", content, { contentType: "text/plain" });

      expect(result.key).toBe("arquivo.txt");
      expect(result.provider).toBe("LOCAL");
      expect(result.contentType).toBe("text/plain");
      expect(result.size).toBe(content.length);
      expect(result.checksum).toBe(createHash("sha256").update(content).digest("hex"));
      expect(result.createdAt).toBeInstanceOf(Date);

      const onDisk = await readFile(path.join(baseDir, "arquivo.txt"));
      expect(onDisk.equals(content)).toBe(true);
    });

    it("aceita um ReadableStream, não só Buffer", async () => {
      const content = Buffer.from("conteúdo via stream");
      const stream = Readable.from(content);

      const result = await adapter.upload("via-stream.bin", stream);

      expect(result.size).toBe(content.length);
      const onDisk = await readFile(path.join(baseDir, "via-stream.bin"));
      expect(onDisk.equals(content)).toBe(true);
    });

    it("usa 'application/octet-stream' quando nenhum contentType é informado", async () => {
      const result = await adapter.upload("sem-content-type.bin", Buffer.from("x"));
      expect(result.contentType).toBe("application/octet-stream");
    });

    it("cria diretórios aninhados automaticamente para keys com '/'", async () => {
      const content = Buffer.from("aninhado");
      const result = await adapter.upload("projetos/abc/render.png", content);

      expect(result.key).toBe("projetos/abc/render.png");
      const onDisk = await readFile(path.join(baseDir, "projetos", "abc", "render.png"));
      expect(onDisk.equals(content)).toBe(true);
    });

    it("preserva metadata customizada no resultado", async () => {
      const result = await adapter.upload("com-metadata.txt", Buffer.from("x"), {
        metadata: { custom: { projectId: "projeto-1" } },
      });
      expect(result.metadata).toEqual({ custom: { projectId: "projeto-1" } });
    });

    it("recusa uma key que tenta escapar do diretório base (path traversal)", async () => {
      await expect(adapter.upload("../../etc/passwd", Buffer.from("x"))).rejects.toThrow(StoragePermissionError);

      // Confirma que nada foi escrito fora do baseDir.
      await expect(readFile(path.join(baseDir, "..", "..", "etc", "passwd"))).rejects.toThrow();
    });

    it("checksums de conteúdos idênticos são idênticos; de conteúdos diferentes são diferentes", async () => {
      const a = await adapter.upload("a.txt", Buffer.from("mesmo conteúdo"));
      const b = await adapter.upload("b.txt", Buffer.from("mesmo conteúdo"));
      const c = await adapter.upload("c.txt", Buffer.from("conteúdo diferente"));

      expect(a.checksum).toBe(b.checksum);
      expect(a.checksum).not.toBe(c.checksum);
    });
  });

  describe("download", () => {
    it("lê de volta exatamente o que foi gravado, com os mesmos metadados do upload", async () => {
      const content = Buffer.from("conteúdo para baixar");
      const uploaded = await adapter.upload("baixar.txt", content, { contentType: "text/plain" });

      const downloaded = await adapter.download("baixar.txt");

      expect(downloaded.data.equals(content)).toBe(true);
      expect(downloaded.contentType).toBe("text/plain");
      expect(downloaded.checksum).toBe(uploaded.checksum);
      expect(downloaded.size).toBe(uploaded.size);
      expect(downloaded.provider).toBe("LOCAL");
    });

    it("lança StorageFileNotFoundError para uma key que nunca foi gravada", async () => {
      await expect(adapter.download("nunca-existiu.txt")).rejects.toThrow(StorageFileNotFoundError);
    });

    it("lança StorageDownloadError se o sidecar de metadados estiver corrompido", async () => {
      await adapter.upload("corrompido.txt", Buffer.from("x"));
      const { writeFile } = await import("fs/promises");
      await writeFile(path.join(baseDir, "corrompido.txt.meta.json"), "{ isto não é json válido");

      await expect(adapter.download("corrompido.txt")).rejects.toThrow(StorageDownloadError);
    });
  });

  describe("delete", () => {
    it("remove o arquivo e o sidecar de metadados", async () => {
      await adapter.upload("remover.txt", Buffer.from("x"));

      await adapter.delete("remover.txt");

      expect(await adapter.exists("remover.txt")).toBe(false);
      await expect(readFile(path.join(baseDir, "remover.txt"))).rejects.toThrow();
      await expect(readFile(path.join(baseDir, "remover.txt.meta.json"))).rejects.toThrow();
    });

    it("lança StorageFileNotFoundError ao tentar remover uma key que não existe", async () => {
      await expect(adapter.delete("nunca-existiu.txt")).rejects.toThrow(StorageFileNotFoundError);
    });
  });

  describe("exists", () => {
    it("retorna true depois do upload e false antes dele / depois do delete", async () => {
      expect(await adapter.exists("presente.txt")).toBe(false);

      await adapter.upload("presente.txt", Buffer.from("x"));
      expect(await adapter.exists("presente.txt")).toBe(true);

      await adapter.delete("presente.txt");
      expect(await adapter.exists("presente.txt")).toBe(false);
    });

    it("nunca lança — retorna false para uma key inválida (path traversal)", async () => {
      await expect(adapter.exists("../../etc/passwd")).resolves.toBe(false);
    });
  });

  describe("getPublicUrl", () => {
    it("devolve uma URL file:// determinística, sem checar existência", () => {
      const url = adapter.getPublicUrl("nao-existe-ainda.txt");
      expect(url.startsWith("file://")).toBe(true);
      expect(url).toContain("nao-existe-ainda.txt");
    });

    it("lança StoragePermissionError para uma key que tenta escapar do diretório base", () => {
      expect(() => adapter.getPublicUrl("../../etc/passwd")).toThrow(StoragePermissionError);
    });
  });

  describe("getSignedDownloadUrl", () => {
    it("devolve uma URL com parâmetro de expiração para uma key existente", async () => {
      await adapter.upload("assinado.txt", Buffer.from("x"));

      const url = await adapter.getSignedDownloadUrl("assinado.txt", { expiresInSeconds: 60 });

      expect(url.startsWith("file://")).toBe(true);
      expect(url).toContain("expires=");
    });

    it("usa uma expiração padrão quando nenhuma é informada", async () => {
      await adapter.upload("assinado-padrao.txt", Buffer.from("x"));
      const url = await adapter.getSignedDownloadUrl("assinado-padrao.txt");
      expect(url).toMatch(/expires=\d+/);
    });

    it("lança StorageFileNotFoundError para uma key que não existe", async () => {
      await expect(adapter.getSignedDownloadUrl("nunca-existiu.txt")).rejects.toThrow(StorageFileNotFoundError);
    });
  });

  describe("erros — hierarquia e identidade", () => {
    it("todo erro do Storage Layer é instanceof StorageFileNotFoundError E do Error nativo, com o nome certo", async () => {
      let caught: unknown;
      try {
        await adapter.download("fantasma.txt");
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(caught).toBeInstanceOf(StorageFileNotFoundError);
      expect((caught as StorageFileNotFoundError).name).toBe("StorageFileNotFoundError");
      expect((caught as StorageFileNotFoundError).key).toBe("fantasma.txt");
    });

    it("StorageDeleteError carrega a key correta quando lançado manualmente", () => {
      const error = new StorageDeleteError("x.txt", "disco cheio");
      expect(error.key).toBe("x.txt");
      expect(error.message).toContain("x.txt");
      expect(error.message).toContain("disco cheio");
    });
  });
});
