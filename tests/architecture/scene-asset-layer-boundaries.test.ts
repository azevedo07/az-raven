import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da arquitetura do Asset Binding Engine (Sprint 2.0;
 * rotas migradas de `/api/scene-assets` para `/api/scenes/:sceneId/assets`
 * na Task "Scene Asset Binding"):
 *
 *   HTTP (app/api/scenes/[sceneId]/assets/*) -> lib/scene-assets/container.ts (sceneAssetUseCases)
 *     -> SceneAssetService -> SceneAssetRepository (interface) -> PrismaSceneAssetRepository -> Prisma
 *                           -> AssetService (lib/assets/container.ts — consumido, nunca reimplementado)
 *
 * Deliberadamente independente do Pipeline — nenhum arquivo em
 * `lib/scene-assets/` importa nada de `lib/pipeline-core/`,
 * `lib/repositories/`, `lib/pipeline-service/` ou `lib/application/`.
 *
 * A única dependência entre módulos é intencional e documentada:
 * `sceneAssetService.ts` importa o **tipo** `AssetService`
 * (`lib/assets/assetService.ts`) para tipar a injeção de dependência;
 * `container.ts` importa o **valor** `assetService` já composto de
 * `lib/assets/container.ts` — nunca `AssetRepository`/
 * `PrismaAssetRepository`/`StorageAdapter`/`LocalStorageAdapter`
 * diretamente.
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

const PIPELINE_NEEDLES = [
  "pipeline-core/",
  "pipeline-service/",
  "repositories/pipelineRepository",
  "repositories/types",
  "application/container",
  "application/use-cases",
];

const FORBIDDEN_ASSET_INTERNALS = [
  "assets/repository",
  "assets/prismaAssetRepository",
  "storage/storageAdapter",
  "storage/localStorageAdapter",
];

const INFRA_NEEDLES = ["@prisma/client", "generated/prisma", "next/server", "next/navigation", "react"];

describe("Fronteiras de arquitetura do Asset Binding Engine", () => {
  it("nenhum arquivo de lib/scene-assets/ importa nada do Pipeline", () => {
    const files = listSourceFiles(join(ROOT, "lib", "scene-assets"));
    expect(files.length).toBeGreaterThan(0);

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), PIPELINE_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo do Pipeline importa lib/scene-assets/", () => {
    const pipelineFiles = [
      ...listSourceFiles(join(ROOT, "lib", "pipeline-core")),
      ...listSourceFiles(join(ROOT, "lib", "repositories")),
      ...listSourceFiles(join(ROOT, "lib", "pipeline-service")),
      ...listSourceFiles(join(ROOT, "lib", "application")),
    ];

    const violations = pipelineFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["scene-assets"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/scene-assets/ nunca acessa AssetRepository/PrismaAssetRepository/StorageAdapter/LocalStorageAdapter diretamente — só AssetService", () => {
    const files = listSourceFiles(join(ROOT, "lib", "scene-assets"));

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), FORBIDDEN_ASSET_INTERNALS) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum Use Case do Asset Binding Engine importa outro Use Case", () => {
    const useCaseDir = join(ROOT, "lib", "scene-assets", "use-cases");
    const useCaseFiles = listSourceFiles(useCaseDir).filter(
      (file) => !file.endsWith("shared.ts") && !file.endsWith("index.ts")
    );
    expect(useCaseFiles.length).toBe(4);

    const otherNames = useCaseFiles.map((file) => toRepoPath(file).split("/").pop()!.replace(".ts", ""));

    const violations = useCaseFiles
      .map((file) => {
        const content = readFileSync(file, "utf-8");
        const ownName = toRepoPath(file).split("/").pop()!.replace(".ts", "");
        const hit = otherNames
          .filter((name) => name !== ownName)
          .find((name) => importLines(content).some((line) => line.includes(name)));
        return { file: toRepoPath(file), hit };
      })
      .filter((entry) => entry.hit);

    expect(violations).toEqual([]);
  });

  it("SceneAssetService e SceneAssetRepository (contrato) não importam Prisma, HTTP, Next.js ou React", () => {
    const files = [
      join(ROOT, "lib", "scene-assets", "sceneAssetService.ts"),
      join(ROOT, "lib", "scene-assets", "repository.ts"),
    ];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), INFRA_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("só lib/scene-assets/container.ts instancia PrismaSceneAssetRepository/SceneAssetService", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")),
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
    ];

    const importers = allFiles
      .filter((file) => {
        const content = readFileSync(file, "utf-8");
        return (
          importLines(content).some((line) => line.includes("prismaSceneAssetRepository")) ||
          /\bnew PrismaSceneAssetRepository\(/.test(content) ||
          /\bnew SceneAssetService\(/.test(content)
        );
      })
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/scene-assets/container.ts"]);
  });

  it("lib/scene-assets/container.ts é o único ponto (fora de lib/assets/) que importa lib/assets/container.ts", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")).filter((f) => !toRepoPath(f).startsWith("lib/assets/")),
      ...listSourceFiles(join(ROOT, "app")).filter((f) => !toRepoPath(f).startsWith("app/api/assets/")),
      ...listSourceFiles(join(ROOT, "components")).filter((f) => !toRepoPath(f).startsWith("components/assets/")),
    ];

    // Precisa do prefixo ".." (o import é relativo: "../assets/container")
    // — sem isso, "../scene-assets/container" bateria como falso
    // positivo (a substring "assets/container" existe dentro de
    // "scene-assets/container").
    const importers = allFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["../assets/container", "@/lib/assets/container"]) }))
      .filter((entry) => entry.hit !== false)
      .map((entry) => entry.file);

    expect(importers).toEqual(["lib/scene-assets/container.ts"]);
  });

  it("as rotas de /api/scenes/:sceneId/assets importam exclusivamente lib/scene-assets/container.ts (e o tipo de erro, para instanceof)", () => {
    const routeFiles = [
      join(ROOT, "app", "api", "scenes", "[sceneId]", "assets", "route.ts"),
      join(ROOT, "app", "api", "scenes", "[sceneId]", "assets", "[sceneAssetId]", "route.ts"),
    ];

    const forbidden = [
      "scene-assets/sceneAssetService",
      "scene-assets/repository",
      "scene-assets/prismaSceneAssetRepository",
      "scene-assets/use-cases/attach",
      "scene-assets/use-cases/detach",
      "scene-assets/use-cases/list",
      "scene-assets/use-cases/update",
      "assets/assetService",
      "assets/repository",
      "assets/prismaAssetRepository",
      "storage/storageAdapter",
      "storage/localStorageAdapter",
    ];

    for (const file of routeFiles) {
      const content = readFileSync(file, "utf-8");
      expect({ file: toRepoPath(file), hit: importsAnyOf(content, forbidden) }).toEqual({
        file: toRepoPath(file),
        hit: false,
      });
      expect(importsAnyOf(content, ["scene-assets/container"])).not.toBe(false);
    }
  });

  it("components/sceneAssets/ nunca importa lib/scene-assets/ ou lib/assets/ — só HTTP (fetch)", () => {
    const files = listSourceFiles(join(ROOT, "components", "sceneAssets"));
    expect(files.length).toBeGreaterThan(0);

    const forbidden = ["lib/scene-assets", "@/lib/scene-assets", "lib/assets", "@/lib/assets"];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), forbidden) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });
});
