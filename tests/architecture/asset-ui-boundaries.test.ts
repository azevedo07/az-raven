import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da arquitetura da Biblioteca de Assets (Sprint 2.0).
 *
 *   components/assets/* -> fetch("/api/assets*") (HTTP) -> ... (backend, congelado)
 *
 * A UI desta Sprint consome exclusivamente as rotas HTTP já existentes
 * (`app/api/assets/*`, congeladas) — nenhum arquivo em `components/assets/`
 * ou `app/assets/` importa `AssetService`, `AssetRepository`/
 * `PrismaAssetRepository`, `StorageAdapter`/`LocalStorageAdapter`, o
 * Composition Root (`lib/assets/container.ts`) ou Prisma diretamente.
 * Mesmo princípio já aplicado a `components/PipelineDashboard.tsx`/
 * `PipelineTimeline.tsx`/`PipelineVersions.tsx` para o Pipeline.
 */

const ROOT = join(__dirname, "..", "..");
const IGNORED_DIRS = new Set(["node_modules", ".next", ".git"]);

function listSourceFiles(startDir: string): string[] {
  const result: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (IGNORED_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const info = statSync(fullPath);
      if (info.isDirectory()) {
        walk(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        result.push(fullPath);
      }
    }
  };

  walk(startDir);
  return result;
}

function toRepoPath(filePath: string): string {
  return relative(ROOT, filePath).replace(/\\/g, "/");
}

function importLines(content: string): string[] {
  return content.split("\n").filter((line) => /^\s*(import|export)\b.*from\s+["']/.test(line));
}

function importsAnyOf(content: string, needles: string[]): string | false {
  const lines = importLines(content);
  for (const needle of needles) {
    if (lines.some((line) => line.includes(needle))) {
      return needle;
    }
  }
  return false;
}

const FORBIDDEN_NEEDLES = [
  // Asset Manager (Service/Repository/Composition Root)
  "assets/assetService",
  "assets/repository",
  "assets/prismaAssetRepository",
  "assets/container",
  "assets/use-cases",
  // Storage Layer
  "storage/storageAdapter",
  "storage/localStorageAdapter",
  // Prisma
  "@prisma/client",
  "generated/prisma",
  "db/client",
  // Pipeline (a Biblioteca de Assets não tem relação com o Pipeline)
  "pipeline-core/",
  "pipeline-service/",
  "repositories/pipelineRepository",
  "application/container",
];

describe("Fronteiras de arquitetura da Biblioteca de Assets (UI)", () => {
  it("nenhum arquivo de components/assets/ ou app/assets/ importa Service, Repository, Storage, Prisma ou Pipeline", () => {
    const uiFiles = [...listSourceFiles(join(ROOT, "components", "assets")), ...listSourceFiles(join(ROOT, "app", "assets"))];
    expect(uiFiles.length).toBeGreaterThan(0);

    const violations = uiFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), FORBIDDEN_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("components/assets/ tem os 9 componentes + utils pedidos pela Sprint 2.0", () => {
    const files = readdirSync(join(ROOT, "components", "assets")).sort();
    expect(files).toEqual([
      "AssetCard.tsx",
      "AssetFilters.tsx",
      "AssetGrid.tsx",
      "AssetLibrary.tsx",
      "AssetPreview.tsx",
      "AssetToolbar.tsx",
      "DeleteDialog.tsx",
      "DownloadButton.tsx",
      "UploadButton.tsx",
      "utils.ts",
    ]);
  });
});
