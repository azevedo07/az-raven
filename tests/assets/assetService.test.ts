import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { AssetService } from "../../lib/assets/assetService";
import { Asset, AssetDomainEvent } from "../../lib/assets/types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "../../lib/assets/repository";
import { StorageAdapter } from "../../lib/storage/storageAdapter";
import { DownloadResult, StorageMetadata, StorageProvider, UploadResult } from "../../lib/storage/types";
import {
  StorageDeleteError,
  StorageDownloadError,
  StorageFileNotFoundError,
  StorageUploadError,
} from "../../lib/storage/storageErrors";

/**
 * Repositório falso em memória — mesma técnica usada nos testes do
 * Pipeline Service. Ganhou `shouldFailUpdate`/`shouldFailDelete` na
 * Sprint 1.8, Task 2, para simular falhas do Repository nos testes de
 * rollback de `uploadAsset`/`deleteStoredAsset`.
 */
class FakeAssetRepository implements AssetRepository {
  private readonly assets = new Map<string, Asset>();
  private counter = 0;

  shouldFailUpdate = false;
  shouldFailDelete = false;

  async createAsset(input: CreateAssetInput): Promise<Asset> {
    this.counter += 1;
    const now = new Date();
    const asset: Asset = {
      id: `asset-${this.counter}`,
      projectId: input.projectId,
      type: input.type,
      name: input.name,
      originalName: input.originalName,
      mimeType: input.mimeType,
      extension: input.extension,
      size: input.size,
      hash: null,
      storageKey: null,
      storageProvider: null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  async findAsset(assetId: string): Promise<Asset | undefined> {
    return this.assets.get(assetId);
  }

  async listAssets(projectId: string): Promise<Asset[]> {
    return [...this.assets.values()].filter((asset) => asset.projectId === projectId);
  }

  async updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset | undefined> {
    if (this.shouldFailUpdate) {
      throw new Error("falha simulada do Repository em updateAsset");
    }
    const existing = this.assets.get(assetId);
    if (!existing) {
      return undefined;
    }
    const updated: Asset = { ...existing, ...input, updatedAt: new Date() };
    this.assets.set(assetId, updated);
    return updated;
  }

  async deleteAsset(assetId: string): Promise<void> {
    if (this.shouldFailDelete) {
      throw new Error("falha simulada do Repository em deleteAsset");
    }
    const existing = this.assets.get(assetId);
    if (existing) {
      this.assets.set(assetId, { ...existing, status: "DELETED", updatedAt: new Date() });
    }
  }
}

/**
 * Storage falso em memória, implementando o mesmo `StorageAdapter` que
 * `LocalStorageAdapter` implementa de verdade (testado à parte, com
 * Postgres/disco reais, em `tests/storage/`). Aqui o que importa é poder
 * injetar falhas sob comando (`shouldFailUpload`/`shouldFailDownload`/
 * `shouldFailDelete`) para testar os caminhos de rollback do
 * `AssetService` — algo muito mais difícil de forçar de forma
 * determinística contra o disco real.
 */
class FakeStorageAdapter implements StorageAdapter {
  readonly provider: StorageProvider = "LOCAL";
  private readonly files = new Map<string, { data: Buffer; contentType: string; checksum: string; metadata?: StorageMetadata }>();

  shouldFailUpload = false;
  shouldFailDownload = false;
  shouldFailDelete = false;
  deletedKeys: string[] = [];

  async upload(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    options?: { contentType?: string; metadata?: StorageMetadata }
  ): Promise<UploadResult> {
    if (this.shouldFailUpload) {
      throw new StorageUploadError(key, "falha simulada");
    }
    const buffer = await this.toBuffer(data);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const contentType = options?.contentType ?? "application/octet-stream";
    this.files.set(key, { data: buffer, contentType, checksum, metadata: options?.metadata });
    return { key, provider: this.provider, contentType, size: buffer.length, checksum, metadata: options?.metadata, createdAt: new Date() };
  }

  async download(key: string): Promise<DownloadResult> {
    if (this.shouldFailDownload) {
      throw new StorageDownloadError(key, "falha simulada");
    }
    const file = this.files.get(key);
    if (!file) {
      throw new StorageFileNotFoundError(key);
    }
    return { key, provider: this.provider, ...file, size: file.data.length, createdAt: new Date() };
  }

  async delete(key: string): Promise<void> {
    if (this.shouldFailDelete) {
      throw new StorageDeleteError(key, "falha simulada");
    }
    if (!this.files.has(key)) {
      throw new StorageFileNotFoundError(key);
    }
    this.files.delete(key);
    this.deletedKeys.push(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  getPublicUrl(key: string): string {
    return `fake://${key}`;
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    if (!this.files.has(key)) {
      throw new StorageFileNotFoundError(key);
    }
    return `fake://${key}?signed`;
  }

  private async toBuffer(data: Buffer | NodeJS.ReadableStream): Promise<Buffer> {
    if (Buffer.isBuffer(data)) return data;
    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

function buildCreateInput(overrides: Partial<CreateAssetInput> = {}): CreateAssetInput {
  return {
    projectId: "projeto-1",
    type: "image",
    name: "poster-final.png",
    originalName: "poster (1).png",
    mimeType: "image/png",
    extension: "png",
    size: 204800,
    ...overrides,
  };
}

function buildService(): { service: AssetService; repository: FakeAssetRepository; storage: FakeStorageAdapter } {
  const repository = new FakeAssetRepository();
  const storage = new FakeStorageAdapter();
  return { service: new AssetService(repository, storage), repository, storage };
}

describe("AssetService — createAsset", () => {
  it("cria um Asset com status inicial PENDING e emite AssetCreated", async () => {
    const { service } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    const asset = await service.createAsset(buildCreateInput());

    expect(asset.status).toBe("PENDING");
    expect(asset.hash).toBeNull();
    expect(asset.storageKey).toBeNull();
    expect(asset.projectId).toBe("projeto-1");

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "AssetCreated", assetId: asset.id, projectId: "projeto-1" });
  });
});

describe("AssetService — getAsset / listAssets", () => {
  it("busca um Asset existente e retorna undefined para um id desconhecido", async () => {
    const { service } = buildService();
    const asset = await service.createAsset(buildCreateInput());

    expect(await service.getAsset(asset.id)).toEqual(asset);
    expect(await service.getAsset("asset-fantasma")).toBeUndefined();
  });

  it("lista só os Assets do projeto informado", async () => {
    const { service } = buildService();
    await service.createAsset(buildCreateInput({ projectId: "projeto-1", name: "a.png" }));
    await service.createAsset(buildCreateInput({ projectId: "projeto-1", name: "b.png" }));
    await service.createAsset(buildCreateInput({ projectId: "projeto-2", name: "c.png" }));

    const assets = await service.listAssets("projeto-1");

    expect(assets).toHaveLength(2);
    expect(assets.every((a) => a.projectId === "projeto-1")).toBe(true);
  });
});

describe("AssetService — updateAsset", () => {
  it("atualiza campos parciais e emite AssetUpdated", async () => {
    const { service } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    const asset = await service.createAsset(buildCreateInput());
    const updated = await service.updateAsset(asset.id, {
      status: "READY",
      hash: "sha256:abc",
      storageKey: "assets/projeto-1/abc.png",
    });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("READY");
    expect(updated!.hash).toBe("sha256:abc");
    expect(updated!.storageKey).toBe("assets/projeto-1/abc.png");

    // O AssetCreated do createAsset também está na lista — só o último importa aqui.
    const updateEvent = events.find((e) => e.type === "AssetUpdated");
    expect(updateEvent).toEqual({ type: "AssetUpdated", assetId: asset.id, projectId: asset.projectId });
  });

  it("retorna undefined e não emite evento para um Asset inexistente", async () => {
    const { service } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    const result = await service.updateAsset("asset-fantasma", { status: "READY" });

    expect(result).toBeUndefined();
    expect(events).toHaveLength(0);
  });
});

describe("AssetService — deleteAsset", () => {
  it("remove (soft delete) um Asset existente e emite AssetDeleted", async () => {
    const { service } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    const asset = await service.createAsset(buildCreateInput());
    await service.deleteAsset(asset.id);

    const afterDelete = await service.getAsset(asset.id);
    expect(afterDelete?.status).toBe("DELETED");

    const deleteEvent = events.find((e) => e.type === "AssetDeleted");
    expect(deleteEvent).toEqual({ type: "AssetDeleted", assetId: asset.id, projectId: asset.projectId });
  });

  it("não emite evento ao tentar remover um Asset inexistente", async () => {
    const { service } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    await service.deleteAsset("asset-fantasma");

    expect(events).toHaveLength(0);
  });
});

describe("AssetService — subscribe", () => {
  it("permite cancelar a inscrição", async () => {
    const { service } = buildService();
    const events: AssetDomainEvent[] = [];
    const unsubscribe = service.subscribe((event) => events.push(event));

    unsubscribe();
    await service.createAsset(buildCreateInput());

    expect(events).toHaveLength(0);
  });
});

describe("AssetService — uploadAsset", () => {
  it("envia os bytes para o Storage e atualiza o Asset para READY com hash/storageKey/storageProvider", async () => {
    const { service, storage } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    const asset = await service.createAsset(buildCreateInput());
    const content = Buffer.from("conteúdo do arquivo");

    const updated = await service.uploadAsset(asset.id, content, { contentType: "image/png" });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("READY");
    expect(updated!.storageProvider).toBe("LOCAL");
    expect(updated!.storageKey).toBe(`assets/${asset.projectId}/${asset.id}.png`);
    expect(updated!.hash).toBe(createHash("sha256").update(content).digest("hex"));

    expect(await storage.exists(updated!.storageKey!)).toBe(true);

    const updateEvent = events.find((e) => e.type === "AssetUpdated");
    expect(updateEvent).toEqual({ type: "AssetUpdated", assetId: asset.id, projectId: asset.projectId });
  });

  it("aceita um ReadableStream, não só Buffer", async () => {
    const { service } = buildService();
    const asset = await service.createAsset(buildCreateInput());

    const { Readable } = await import("stream");
    const content = Buffer.from("via stream");
    const updated = await service.uploadAsset(asset.id, Readable.from(content));

    expect(updated!.status).toBe("READY");
  });

  it("usa asset.mimeType como contentType padrão quando nenhum é informado", async () => {
    const { service, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput({ mimeType: "image/webp" }));

    const updated = await service.uploadAsset(asset.id, Buffer.from("x"));
    const downloaded = await storage.download(updated!.storageKey!);

    expect(downloaded.contentType).toBe("image/webp");
  });

  it("retorna undefined para um Asset inexistente, sem tocar o Storage", async () => {
    const { service, storage } = buildService();

    const result = await service.uploadAsset("asset-fantasma", Buffer.from("x"));

    expect(result).toBeUndefined();
    expect(storage.deletedKeys).toHaveLength(0);
  });

  it("falha de upload: propaga o erro do Storage e marca o Asset como FAILED (nada fica órfão)", async () => {
    const { service, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    storage.shouldFailUpload = true;

    await expect(service.uploadAsset(asset.id, Buffer.from("x"))).rejects.toThrow(StorageUploadError);

    const afterFailure = await service.getAsset(asset.id);
    expect(afterFailure!.status).toBe("FAILED");
    expect(afterFailure!.storageKey).toBeNull(); // nada foi persistido além do status.
  });

  it("rollback quando o Repository falhar depois do Storage já ter gravado: remove o arquivo órfão do Storage", async () => {
    const { service, repository, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    repository.shouldFailUpdate = true;

    await expect(service.uploadAsset(asset.id, Buffer.from("x"))).rejects.toThrow(
      "falha simulada do Repository em updateAsset"
    );

    const expectedKey = `assets/${asset.projectId}/${asset.id}.png`;
    // O upload tinha sido bem-sucedido antes do Repository falhar — o
    // rollback precisa ter removido esse arquivo órfão.
    expect(await storage.exists(expectedKey)).toBe(false);
    expect(storage.deletedKeys).toContain(expectedKey);
  });
});

describe("AssetService — downloadAsset", () => {
  it("lê de volta exatamente o que foi enviado", async () => {
    const { service } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    const content = Buffer.from("conteúdo para baixar");
    await service.uploadAsset(asset.id, content, { contentType: "image/png" });

    const downloaded = await service.downloadAsset(asset.id);

    expect(downloaded).toBeDefined();
    expect(downloaded!.data.equals(content)).toBe(true);
    expect(downloaded!.contentType).toBe("image/png");
  });

  it("retorna undefined para um Asset inexistente", async () => {
    const { service } = buildService();
    expect(await service.downloadAsset("asset-fantasma")).toBeUndefined();
  });

  it("retorna undefined para um Asset que existe mas nunca terminou de subir (sem storageKey)", async () => {
    const { service } = buildService();
    const asset = await service.createAsset(buildCreateInput());

    expect(await service.downloadAsset(asset.id)).toBeUndefined();
  });

  it("falha de download: propaga o erro do Storage sem modificar nada", async () => {
    const { service, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    await service.uploadAsset(asset.id, Buffer.from("x"));
    storage.shouldFailDownload = true;

    await expect(service.downloadAsset(asset.id)).rejects.toThrow(StorageDownloadError);

    const stillThere = await service.getAsset(asset.id);
    expect(stillThere!.status).toBe("READY"); // download nunca muda o estado do Asset.
  });
});

describe("AssetService — deleteStoredAsset", () => {
  it("remove o registro (soft delete) e o arquivo do Storage, emitindo AssetDeleted", async () => {
    const { service, storage } = buildService();
    const events: AssetDomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    const asset = await service.createAsset(buildCreateInput());
    const uploaded = await service.uploadAsset(asset.id, Buffer.from("x"));

    await service.deleteStoredAsset(asset.id);

    const afterDelete = await service.getAsset(asset.id);
    expect(afterDelete!.status).toBe("DELETED");
    expect(await storage.exists(uploaded!.storageKey!)).toBe(false);

    const deleteEvent = events.find((e) => e.type === "AssetDeleted");
    expect(deleteEvent).toEqual({ type: "AssetDeleted", assetId: asset.id, projectId: asset.projectId });
  });

  it("não faz nada (idempotente) para um Asset inexistente", async () => {
    const { service, storage } = buildService();
    await expect(service.deleteStoredAsset("asset-fantasma")).resolves.toBeUndefined();
    expect(storage.deletedKeys).toHaveLength(0);
  });

  it("é seguro remover um Asset que nunca terminou de subir (sem storageKey) — não toca o Storage", async () => {
    const { service, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());

    await service.deleteStoredAsset(asset.id);

    const afterDelete = await service.getAsset(asset.id);
    expect(afterDelete!.status).toBe("DELETED");
    expect(storage.deletedKeys).toHaveLength(0);
  });

  it("falha de delete: propaga o erro do Storage", async () => {
    const { service, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    await service.uploadAsset(asset.id, Buffer.from("x"));
    storage.shouldFailDelete = true;

    await expect(service.deleteStoredAsset(asset.id)).rejects.toThrow(StorageDeleteError);
  });

  it("rollback quando o Storage falhar depois do Repository já ter marcado DELETED: reverte o status", async () => {
    const { service, repository, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    await service.uploadAsset(asset.id, Buffer.from("x"));
    storage.shouldFailDelete = true;

    await expect(service.deleteStoredAsset(asset.id)).rejects.toThrow(StorageDeleteError);

    const afterFailure = await repository.findAsset(asset.id);
    // O Repository já tinha marcado DELETED, mas o Storage falhou — o
    // rollback deve ter revertido para o status anterior (READY).
    expect(afterFailure!.status).toBe("READY");
  });

  it("rollback quando o Repository falhar: nunca chega a tocar o Storage", async () => {
    const { service, repository, storage } = buildService();
    const asset = await service.createAsset(buildCreateInput());
    await service.uploadAsset(asset.id, Buffer.from("x"));
    repository.shouldFailDelete = true;

    await expect(service.deleteStoredAsset(asset.id)).rejects.toThrow(
      "falha simulada do Repository em deleteAsset"
    );

    expect(storage.deletedKeys).toHaveLength(0);
  });
});
