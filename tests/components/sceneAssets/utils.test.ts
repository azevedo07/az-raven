import { describe, expect, it } from "vitest";
import {
  defaultRoleForDisplayType,
  matchesPickerFilter,
  pickerFilterLabel,
  roleLabel,
  SCENE_ASSET_ROLES,
} from "../../../components/sceneAssets/utils";

describe("roleLabel", () => {
  it("traduz cada SceneAssetRole para um rótulo em português", () => {
    expect(roleLabel("REFERENCE_IMAGE")).toBe("Imagem Referência");
    expect(roleLabel("MODEL")).toBe("Modelo IA");
    expect(roleLabel("OUTRO")).toBe("Outro");
  });

  it("retorna o próprio valor quando o papel não é reconhecido", () => {
    expect(roleLabel("ALGO_DESCONHECIDO")).toBe("ALGO_DESCONHECIDO");
  });

  it("cobre todos os 13 papéis definidos na Sprint 2.0", () => {
    expect(SCENE_ASSET_ROLES).toHaveLength(13);
    for (const role of SCENE_ASSET_ROLES) {
      // "SFX" já é, coincidentemente, seu próprio rótulo em português.
      expect(roleLabel(role)).toBeTruthy();
    }
  });
});

describe("defaultRoleForDisplayType", () => {
  it("sugere um papel razoável a partir da categoria de exibição do Asset", () => {
    expect(defaultRoleForDisplayType("image")).toBe("REFERENCE_IMAGE");
    expect(defaultRoleForDisplayType("video")).toBe("REFERENCE_VIDEO");
    expect(defaultRoleForDisplayType("audio")).toBe("MUSIC");
    expect(defaultRoleForDisplayType("document")).toBe("DOCUMENT");
    expect(defaultRoleForDisplayType("ai-model")).toBe("MODEL");
    expect(defaultRoleForDisplayType("other")).toBe("OUTRO");
  });
});

describe("pickerFilterLabel", () => {
  it("traduz cada filtro do picker", () => {
    expect(pickerFilterLabel("all")).toBe("Todos");
    expect(pickerFilterLabel("prompt")).toBe("Prompts");
    expect(pickerFilterLabel("ai-model")).toBe("Modelos IA");
  });
});

describe("matchesPickerFilter", () => {
  it("'all' aceita qualquer asset", () => {
    expect(matchesPickerFilter({ type: "image", extension: "png" }, "all")).toBe(true);
    expect(matchesPickerFilter({ type: "other", extension: "zip" }, "all")).toBe(true);
  });

  it("filtra imagem/vídeo/áudio pelo type/extension real (via deriveDisplayType)", () => {
    expect(matchesPickerFilter({ type: "image", extension: "png" }, "image")).toBe(true);
    expect(matchesPickerFilter({ type: "video", extension: "mp4" }, "image")).toBe(false);
    expect(matchesPickerFilter({ type: "audio", extension: "mp3" }, "audio")).toBe(true);
  });

  it("'ai-model' usa a mesma heurística de extensão de deriveDisplayType", () => {
    expect(matchesPickerFilter({ type: "other", extension: "safetensors" }, "ai-model")).toBe(true);
    expect(matchesPickerFilter({ type: "other", extension: "zip" }, "ai-model")).toBe(false);
  });

  it("'prompt' só aceita documentos com extensão de texto comum", () => {
    expect(matchesPickerFilter({ type: "document", extension: "txt" }, "prompt")).toBe(true);
    expect(matchesPickerFilter({ type: "document", extension: "md" }, "prompt")).toBe(true);
    expect(matchesPickerFilter({ type: "document", extension: "pdf" }, "prompt")).toBe(false);
    expect(matchesPickerFilter({ type: "image", extension: "txt" }, "prompt")).toBe(false);
  });
});
