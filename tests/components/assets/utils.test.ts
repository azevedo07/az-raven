import { describe, expect, it } from "vitest";
import {
  AssetRecord,
  backendTypeFromMime,
  deriveDisplayType,
  extensionFromFileName,
  formatBytes,
  statusLabel,
  statusTone,
} from "../../../components/assets/utils";

function buildAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: "asset-1",
    projectId: "projeto-1",
    type: "image",
    name: "poster.png",
    originalName: "poster.png",
    mimeType: "image/png",
    extension: "png",
    size: 1024,
    hash: null,
    storageKey: null,
    storageProvider: null,
    status: "READY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("formatBytes", () => {
  it("formata bytes, KB, MB e GB corretamente", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });
});

describe("deriveDisplayType", () => {
  it("usa o type persistido para image/video/audio/document", () => {
    expect(deriveDisplayType(buildAsset({ type: "image", extension: "png" }))).toBe("image");
    expect(deriveDisplayType(buildAsset({ type: "video", extension: "mp4" }))).toBe("video");
    expect(deriveDisplayType(buildAsset({ type: "audio", extension: "mp3" }))).toBe("audio");
    expect(deriveDisplayType(buildAsset({ type: "document", extension: "pdf" }))).toBe("document");
  });

  it("infere 'ai-model' pela extensão, mesmo quando o type persistido é 'other'", () => {
    expect(deriveDisplayType(buildAsset({ type: "other", extension: "safetensors" }))).toBe("ai-model");
    expect(deriveDisplayType(buildAsset({ type: "other", extension: "ckpt" }))).toBe("ai-model");
    expect(deriveDisplayType(buildAsset({ type: "other", extension: "onnx" }))).toBe("ai-model");
  });

  it("cai para 'other' quando o type não é reconhecido e a extensão não é de modelo de IA", () => {
    expect(deriveDisplayType(buildAsset({ type: "other", extension: "zip" }))).toBe("other");
  });
});

describe("backendTypeFromMime", () => {
  it("mapeia MIME types para uma das 5 categorias reais de backend", () => {
    expect(backendTypeFromMime("image/png")).toBe("image");
    expect(backendTypeFromMime("video/mp4")).toBe("video");
    expect(backendTypeFromMime("audio/mpeg")).toBe("audio");
    expect(backendTypeFromMime("application/pdf")).toBe("document");
    expect(backendTypeFromMime("application/octet-stream")).toBe("other");
  });
});

describe("extensionFromFileName", () => {
  it("extrai a extensão em minúsculas", () => {
    expect(extensionFromFileName("Poster Final.PNG")).toBe("png");
    expect(extensionFromFileName("modelo.safetensors")).toBe("safetensors");
  });

  it("retorna string vazia para um nome sem extensão", () => {
    expect(extensionFromFileName("semextensao")).toBe("");
  });
});

describe("statusLabel / statusTone", () => {
  it("traduz cada AssetStatus para um rótulo em português e um tom coerente", () => {
    expect(statusLabel("READY")).toBe("Pronto");
    expect(statusTone("READY")).toBe("success");
    expect(statusLabel("FAILED")).toBe("Falhou");
    expect(statusTone("FAILED")).toBe("danger");
    expect(statusLabel("PENDING")).toBe("Pendente");
    expect(statusTone("PENDING")).toBe("gold");
  });
});
