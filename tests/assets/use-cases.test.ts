import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { AssetService } from "../../lib/assets/assetService";
import { Asset } from "../../lib/assets/types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "../../lib/assets/repository";
import { StorageAdapter } from "../../lib/storage/storageAdapter";
import { DownloadResult, StorageMetadata, StorageProvider, UploadResult } from "../../lib/storage/types";
import { StorageFileNotFoundError } from "../../lib/storage/storageErrors";
import { CreateAssetUseCaseImpl } from "../../lib/assets/use-cases/createAssetUseCase";
import { GetAssetUseCaseImpl } from "../../lib/assets/use-cases/getAssetUseCase";
import { ListAssetsUseCaseImpl } from "../../lib/assets/use-cases/listAssetsUseCase";
import { UpdateAssetUseCaseImpl } from "../../lib/assets/use-cases/updateAssetUseCase";
import { DeleteAssetUseCaseImpl } from "../../lib/assets/use-cases/deleteAssetUseCase";
import { UploadAssetUseCaseImpl } from "../../lib/assets/use-cases/uploadAssetUseCase";
import { DownloadAssetUseCaseImpl } from "../../lib/assets/use-cases/downloadAssetUseCase";
import { DeleteStoredAssetUseCaseImpl } from "../../lib/assets/use-cases/deleteStoredAssetUseCase";

/** Repositório falso em memória — mesma técnica usada em `assetService.test.ts`. */
class FakeAssetRepository implements AssetRepository {
  private readonly assets = new Map<string, Asset>();
  private counter = 0;

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
    const existing = this.assets.get(assetId);
    if (!existing) {
      return undefined;
    }
    const updated: Asset = { ...existing, ...input, updatedAt: new Date() };
    this.assets.set(assetId, updated);
    return updated;
  }

  async deleteAsset(assetId: string): Promise<void> {
    const existing = this.assets.get(assetId);
    if (existing) {
      this.assets.set(assetId, { ...existing, status: "DELETED", updatedAt: new Date() });
    }
  }
}

/**
 * Storage falso em memória, sem injeção de falha — os cenários de
 * falha/rollback já são cobertos exaustivamente em
 * `assetService.test.ts`; aqui o que importa é confirmar que cada Use
 * Case repassa corretamente para o `AssetService`.
 */
class FakeStorageAdapter implements StorageAdapter {
  readonly provider: StorageProvider = "LOCAL";
  private readonly files = new Map<string, { data: Buffer; contentType: string; checksum: string; metadata?: StorageMetadata }>();

  async upload(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    options?: { contentType?: string; metadata?: StorageMetadata }
  ): Promise<UploadResult> {
    const buffer = Buffer.isBuffer(data) ? data : await this.toBuffer(data);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const contentType = options?.contentType ?? "application/octet-stream";
    this.files.set(key, { data: buffer, contentType, checksum, metadata: options?.metadata });
    return { key, provider: this.provider, contentType, size: buffer.length, checksum, metadata: options?.metadata, createdAt: new Date() };
  }

  async download(key: string): Promise<DownloadResult> {
    const file = this.files.get(key);
    if (!file) throw new StorageFileNotFoundError(key);
    return { key, provider: this.provider, ...file, size: file.data.length, createdAt: new Date() };
  }

  async delete(key: string): Promise<void> {
    if (!this.files.has(key)) throw new StorageFileNotFoundError(key);
    this.files.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  getPublicUrl(key: string): string {
    return `fake://${key}`;
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    if (!this.files.has(key)) throw new StorageFileNotFoundError(key);
    return `fake://${key}?signed`;
  }

  private async toBuffer(data: NodeJS.ReadableStream): Promise<Buffer> {
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

function buildService(): AssetService {
  return new AssetService(new FakeAssetRepository(), new FakeStorageAdapter());
}

describe("CreateAssetUseCase", () => {
  it("cria um Asset via AssetService", async () => {
    const service = buildService();
    const asset = await new CreateAssetUseCaseImpl(service).execute(buildCreateInput());

    expect(asset.status).toBe("PENDING");
    expect(asset.name).toBe("poster-final.png");
  });
});

describe("GetAssetUseCase", () => {
  it("retorna o Asset existente", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());

    const asset = await new GetAssetUseCaseImpl(service).execute({ assetId: created.id });

    expect(asset).toEqual(created);
  });

  it("retorna undefined para um Asset inexistente", async () => {
    const service = buildService();
    const asset = await new GetAssetUseCaseImpl(service).execute({ assetId: "asset-fantasma" });

    expect(asset).toBeUndefined();
  });
});

describe("ListAssetsUseCase", () => {
  it("lista os Assets de um projeto", async () => {
    const service = buildService();
    await service.createAsset(buildCreateInput({ projectId: "projeto-1" }));
    await service.createAsset(buildCreateInput({ projectId: "projeto-2" }));

    const assets = await new ListAssetsUseCaseImpl(service).execute({ projectId: "projeto-1" });

    expect(assets).toHaveLength(1);
    expect(assets[0].projectId).toBe("projeto-1");
  });
});

describe("UpdateAssetUseCase", () => {
  it("atualiza campos parciais de um Asset existente", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());

    const updated = await new UpdateAssetUseCaseImpl(service).execute({
      assetId: created.id,
      data: { status: "READY", hash: "sha256:abc" },
    });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("READY");
    expect(updated!.hash).toBe("sha256:abc");
  });

  it("retorna undefined para um Asset inexistente", async () => {
    const service = buildService();

    const result = await new UpdateAssetUseCaseImpl(service).execute({
      assetId: "asset-fantasma",
      data: { status: "READY" },
    });

    expect(result).toBeUndefined();
  });
});

describe("DeleteAssetUseCase", () => {
  it("remove (soft delete) um Asset existente", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());

    await new DeleteAssetUseCaseImpl(service).execute({ assetId: created.id });

    const asset = await service.getAsset(created.id);
    expect(asset?.status).toBe("DELETED");
  });
});

describe("UploadAssetUseCase", () => {
  it("envia o conteúdo via AssetService e o Asset fica READY", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());

    const updated = await new UploadAssetUseCaseImpl(service).execute({
      assetId: created.id,
      data: Buffer.from("conteúdo"),
      contentType: "image/png",
    });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("READY");
    expect(updated!.storageKey).toBeTruthy();
  });

  it("retorna undefined para um Asset inexistente", async () => {
    const service = buildService();

    const result = await new UploadAssetUseCaseImpl(service).execute({
      assetId: "asset-fantasma",
      data: Buffer.from("x"),
    });

    expect(result).toBeUndefined();
  });
});

describe("DownloadAssetUseCase", () => {
  it("lê de volta o conteúdo via AssetService", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());
    const content = Buffer.from("conteúdo para baixar");
    await service.uploadAsset(created.id, content);

    const downloaded = await new DownloadAssetUseCaseImpl(service).execute({ assetId: created.id });

    expect(downloaded).toBeDefined();
    expect(downloaded!.data.equals(content)).toBe(true);
  });

  it("retorna undefined para um Asset sem storageKey (nunca terminou de subir)", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());

    const result = await new DownloadAssetUseCaseImpl(service).execute({ assetId: created.id });

    expect(result).toBeUndefined();
  });
});

describe("DeleteStoredAssetUseCase", () => {
  it("remove o registro e o arquivo do Storage via AssetService", async () => {
    const service = buildService();
    const created = await service.createAsset(buildCreateInput());
    await service.uploadAsset(created.id, Buffer.from("x"));

    await new DeleteStoredAssetUseCaseImpl(service).execute({ assetId: created.id });

    const asset = await service.getAsset(created.id);
    expect(asset?.status).toBe("DELETED");
  });

  it("é idempotente para um Asset inexistente", async () => {
    const service = buildService();
    await expect(
      new DeleteStoredAssetUseCaseImpl(service).execute({ assetId: "asset-fantasma" })
    ).resolves.toBeUndefined();
  });
});
