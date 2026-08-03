import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da arquitetura do Storage Layer (Sprint 1.8,
 * Task 1) — um terceiro módulo independente, junto do Pipeline e do
 * Asset Manager. Nenhum arquivo em `lib/storage/` importa Pipeline,
 * Asset Manager, Prisma, Next.js, React ou qualquer SDK de nuvem.
 *
 * A partir da Sprint 1.8, Task 2, o Asset Manager passou a consumir o
 * Storage Layer — de propósito, e só através de pontos exatos:
 * `lib/assets/assetService.ts` (a interface `StorageAdapter` + tipos),
 * `lib/assets/container.ts` (a única instanciação de
 * `LocalStorageAdapter` de todo o projeto) e
 * `lib/assets/use-cases/downloadAssetUseCase.ts` (o tipo `DownloadResult`,
 * pra tipar a saída do Use Case). Na Sprint 1.8, Task 3, as rotas de
 * download e de item (`app/api/assets/[assetId]/download/route.ts` e
 * `app/api/assets/[assetId]/route.ts`) importaram `StorageFileNotFoundError`
 * só para `instanceof` (traduzir o erro em 404/204) — nenhuma das duas
 * chama nenhum método de `StorageAdapter`. Nada além desses cinco
 * pontos — nem Pipeline, nem UI, nem nenhuma outra rota — deveria
 * importar `lib/storage/`.
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
  // Pipeline
  "pipeline-core/",
  "pipeline-service/",
  "repositories/pipelineRepository",
  "repositories/types",
  "application/container",
  "application/use-cases",
  // Asset Manager
  "lib/assets",
  "/assets/types",
  "/assets/repository",
  "/assets/assetService",
  "/assets/container",
  // Infraestrutura fora de escopo desta Task
  "@prisma/client",
  "db/client",
  "generated/prisma",
  "next/server",
  "next/navigation",
  "react",
  // SDKs de nuvem — nenhum deveria existir no projeto ainda, mas se
  // algum dia alguém instalar um e importar direto de lib/storage/, isto pega.
  "aws-sdk",
  "@aws-sdk",
  "@azure/storage",
  "@google-cloud/storage",
  "minio",
];

describe("Fronteiras de arquitetura do Storage Layer", () => {
  it("nenhum arquivo de lib/storage/ importa Pipeline, Asset Manager, Prisma, Next.js, React ou SDK de nuvem", () => {
    const storageFiles = listSourceFiles(join(ROOT, "lib", "storage"));
    expect(storageFiles.length).toBeGreaterThan(0);

    const violations = storageFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), FORBIDDEN_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("só 5 arquivos fora de lib/storage/ importam lib/storage/ — os pontos exatos de integração das Sprints 1.8 Task 2 e 3", () => {
    const allOtherFiles = [
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
      ...listSourceFiles(join(ROOT, "lib", "pipeline-core")),
      ...listSourceFiles(join(ROOT, "lib", "repositories")),
      ...listSourceFiles(join(ROOT, "lib", "pipeline-service")),
      ...listSourceFiles(join(ROOT, "lib", "application")),
      ...listSourceFiles(join(ROOT, "lib", "assets")),
    ];

    const importers = allOtherFiles
      .filter((file) => importsAnyOf(readFileSync(file, "utf-8"), ["lib/storage", "../storage", "../../storage"]) !== false)
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual([
      "app/api/assets/[assetId]/download/route.ts",
      "app/api/assets/[assetId]/route.ts",
      "lib/assets/assetService.ts",
      "lib/assets/container.ts",
      "lib/assets/use-cases/downloadAssetUseCase.ts",
    ]);
  });

  it("AssetRepository/PrismaAssetRepository e os demais Use Cases do Asset Manager não importam lib/storage/", () => {
    const filesThatShouldNotTouchStorage = [
      join(ROOT, "lib", "assets", "repository.ts"),
      join(ROOT, "lib", "assets", "prismaAssetRepository.ts"),
      join(ROOT, "lib", "assets", "use-cases", "createAssetUseCase.ts"),
      join(ROOT, "lib", "assets", "use-cases", "getAssetUseCase.ts"),
      join(ROOT, "lib", "assets", "use-cases", "listAssetsUseCase.ts"),
      join(ROOT, "lib", "assets", "use-cases", "updateAssetUseCase.ts"),
      join(ROOT, "lib", "assets", "use-cases", "deleteAssetUseCase.ts"),
    ];

    const violations = filesThatShouldNotTouchStorage
      .map((file) => ({
        file: toRepoPath(file),
        hit: importsAnyOf(readFileSync(file, "utf-8"), ["lib/storage", "../storage", "../../storage"]),
      }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhuma rota de API, componente ou Use Case existe para o Storage Layer nesta Task", () => {
    const forbiddenPaths = [
      join(ROOT, "app", "api", "storage"),
      join(ROOT, "components", "Storage.tsx"),
      join(ROOT, "lib", "storage", "use-cases"),
      join(ROOT, "lib", "storage", "container.ts"),
    ];

    for (const forbiddenPath of forbiddenPaths) {
      expect(existsSync(forbiddenPath)).toBe(false);
    }
  });

  it("lib/storage/ tem exatamente os 5 arquivos esperados desta Task", () => {
    const files = readdirSync(join(ROOT, "lib", "storage")).sort();
    expect(files).toEqual([
      "README.md",
      "localStorageAdapter.ts",
      "storageAdapter.ts",
      "storageErrors.ts",
      "types.ts",
    ]);
  });
});

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
