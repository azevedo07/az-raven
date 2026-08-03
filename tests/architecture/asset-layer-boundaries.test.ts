import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da arquitetura do Asset Manager (Sprint 1.6, Task 1;
 * persistência real e Composition Root próprio chegaram na Sprint 1.7;
 * integração com o Storage Layer chegou na Sprint 1.8, Task 2; API HTTP
 * chegou na Sprint 1.8, Task 3):
 *
 *   HTTP (app/api/assets/*) -> lib/assets/container.ts (assetUseCases) -> AssetService
 *     -> AssetRepository (interface) -> PrismaAssetRepository -> Prisma (lib/db/client.ts)
 *     -> StorageAdapter (interface) -> LocalStorageAdapter
 *
 * Módulo deliberadamente independente do Pipeline — nenhum arquivo em
 * `lib/assets/` importa nada de `lib/pipeline-core/`, `lib/repositories/`,
 * `lib/pipeline-service/` ou `lib/application/`, e nada fora de
 * `lib/assets/` importa de lá. Os dois módulos compartilham só
 * infraestrutura genérica (`lib/db/client.ts`, o cliente Prisma
 * singleton) — nunca um conhecimento de domínio um do outro.
 *
 * `AssetService` conhece `StorageAdapter` (a interface, `lib/storage/`)
 * mas nunca `LocalStorageAdapter` (a implementação concreta) — toda
 * dependência é invertida, e só `lib/assets/container.ts` decide qual
 * implementação injetar.
 *
 * As rotas de `app/api/assets/*` importam exclusivamente
 * `lib/assets/container.ts` (os Use Cases já montados) — nunca
 * `AssetService`, `AssetRepository`/`PrismaAssetRepository` ou
 * `StorageAdapter`/`LocalStorageAdapter` diretamente.
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

const PIPELINE_MODULE_NEEDLES = [
  "pipeline-core/",
  "pipeline-service/",
  "repositories/pipelineRepository",
  "repositories/types",
  "application/container",
  "application/use-cases",
];

const INFRA_NEEDLES = ["@prisma/client", "db/client", "generated/prisma", "next/server", "next/navigation", "react"];

describe("Fronteiras de arquitetura do Asset Manager", () => {
  it("nenhum arquivo de lib/assets/ importa nada do Pipeline (pipeline-core, repositories, pipeline-service, application)", () => {
    const assetFiles = listSourceFiles(join(ROOT, "lib", "assets"));
    expect(assetFiles.length).toBeGreaterThan(0);

    const violations = assetFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), PIPELINE_MODULE_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo do Pipeline (lib/pipeline-core, lib/repositories, lib/pipeline-service, lib/application) importa lib/assets/", () => {
    const pipelineFiles = [
      ...listSourceFiles(join(ROOT, "lib", "pipeline-core")),
      ...listSourceFiles(join(ROOT, "lib", "repositories")),
      ...listSourceFiles(join(ROOT, "lib", "pipeline-service")),
      ...listSourceFiles(join(ROOT, "lib", "application")),
    ];

    const violations = pipelineFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["lib/assets", "/assets/"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo de app/ ou components/ importa lib/assets/, exceto as 4 rotas de /api/assets (Sprint 1.8, Task 3)", () => {
    const uiFiles = [...listSourceFiles(join(ROOT, "app")), ...listSourceFiles(join(ROOT, "components"))];
    const allowedAssetRoutes = new Set([
      "app/api/assets/route.ts",
      "app/api/assets/[assetId]/route.ts",
      "app/api/assets/[assetId]/upload/route.ts",
      "app/api/assets/[assetId]/download/route.ts",
      // Só importa AssetType/AssetStatus (tipos de domínio puros) para
      // validar entrada HTTP — não acessa Service/Repository/Storage.
      "app/api/assets/_lib/validation.ts",
    ]);

    const violations = uiFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["lib/assets"]) }))
      .filter((entry) => entry.hit !== false)
      .filter((entry) => !allowedAssetRoutes.has(entry.file));

    expect(violations).toEqual([]);
  });

  it("nenhum componente React importa lib/assets/ (mesmo as 4 rotas permitidas acima são só de app/api)", () => {
    const componentFiles = listSourceFiles(join(ROOT, "components"));

    const violations = componentFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["lib/assets"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("as 4 rotas de /api/assets importam exclusivamente lib/assets/container.ts — nunca AssetService, Repository, StorageAdapter ou Use Cases diretamente", () => {
    const routeFiles = [
      join(ROOT, "app", "api", "assets", "route.ts"),
      join(ROOT, "app", "api", "assets", "[assetId]", "route.ts"),
      join(ROOT, "app", "api", "assets", "[assetId]", "upload", "route.ts"),
      join(ROOT, "app", "api", "assets", "[assetId]", "download", "route.ts"),
    ];

    const forbiddenNeedles = [
      "assetService",
      "/assets/repository",
      "prismaAssetRepository",
      "use-cases/create",
      "use-cases/get",
      "use-cases/list",
      "use-cases/update",
      "use-cases/delete",
      "use-cases/upload",
      "use-cases/download",
      "storageAdapter",
      "localStorageAdapter",
    ];

    for (const file of routeFiles) {
      const content = readFileSync(file, "utf-8");
      const hit = importsAnyOf(content, forbiddenNeedles);
      expect({ file: toRepoPath(file), hit }).toEqual({ file: toRepoPath(file), hit: false });
      // E cada rota de fato importa o container — não é só "não importa o resto".
      expect(importsAnyOf(content, ["assets/container"])).not.toBe(false);
    }
  });

  it("nenhum Use Case do Asset Manager importa outro Use Case", () => {
    const useCaseDir = join(ROOT, "lib", "assets", "use-cases");
    const useCaseFiles = listSourceFiles(useCaseDir).filter(
      (file) => !file.endsWith("shared.ts") && !file.endsWith("index.ts")
    );
    expect(useCaseFiles.length).toBe(8);

    const otherUseCaseNames = useCaseFiles.map((file) => toRepoPath(file).split("/").pop()!.replace(".ts", ""));

    const violations = useCaseFiles
      .map((file) => {
        const content = readFileSync(file, "utf-8");
        const ownName = toRepoPath(file).split("/").pop()!.replace(".ts", "");
        const hit = otherUseCaseNames
          .filter((name) => name !== ownName)
          .find((name) => importLines(content).some((line) => line.includes(name)));
        return { file: toRepoPath(file), hit };
      })
      .filter((entry) => entry.hit);

    expect(violations).toEqual([]);
  });

  it("AssetService e AssetRepository (contrato) não importam Prisma, HTTP, Next.js ou React", () => {
    const files = [join(ROOT, "lib", "assets", "assetService.ts"), join(ROOT, "lib", "assets", "repository.ts")];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), INFRA_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/assets/ não está referenciado em lib/application/container.ts (Composition Root do Pipeline intocado)", () => {
    const containerContent = readFileSync(join(ROOT, "lib", "application", "container.ts"), "utf-8");
    expect(importsAnyOf(containerContent, ["lib/assets", "/assets/"])).toBe(false);
  });

  it("só lib/assets/container.ts instancia PrismaAssetRepository/AssetService (Composition Root do Asset Manager)", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")),
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
    ];

    const importers = allFiles
      .filter((file) => {
        const content = readFileSync(file, "utf-8");
        return (
          importLines(content).some((line) => line.includes("prismaAssetRepository")) ||
          /\bnew PrismaAssetRepository\(/.test(content) ||
          /\bnew AssetService\(/.test(content)
        );
      })
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/assets/container.ts"]);
  });

  it("lib/db/client.ts (o Prisma Client compartilhado) é a única infraestrutura em comum entre os dois módulos", () => {
    const assetFiles = listSourceFiles(join(ROOT, "lib", "assets"));
    const sharedInfraImports = assetFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["db/client"]) }))
      .filter((entry) => entry.hit !== false);

    // Só prismaAssetRepository.ts deveria tocar o cliente Prisma compartilhado.
    expect(sharedInfraImports.map((entry) => entry.file)).toEqual(["lib/assets/prismaAssetRepository.ts"]);
  });

  it("AssetService importa StorageAdapter (a interface), nunca LocalStorageAdapter (a implementação concreta)", () => {
    const content = readFileSync(join(ROOT, "lib", "assets", "assetService.ts"), "utf-8");
    const lines = importLines(content);

    expect(lines.some((line) => line.includes("storage/storageAdapter"))).toBe(true);
    expect(lines.some((line) => line.includes("localStorageAdapter"))).toBe(false);
  });

  it("só lib/assets/container.ts instancia LocalStorageAdapter (Composition Root decide a implementação, nunca o Service)", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")),
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
    ];

    const importers = allFiles
      .filter((file) => {
        const content = readFileSync(file, "utf-8");
        return (
          importLines(content).some((line) => line.includes("localStorageAdapter")) ||
          /\bnew LocalStorageAdapter\(/.test(content)
        );
      })
      .map(toRepoPath)
      .sort();

    // lib/storage/localStorageAdapter.ts é a própria definição da classe
    // (não uma "importação" dela) — o teste de fronteira do Storage
    // Layer (tests/architecture/storage-layer-boundaries.test.ts) já
    // cobre esse arquivo; aqui o que importa é confirmar que, entre
    // quem *consome* a classe, só o Composition Root do Asset Manager o faz.
    expect(importers.filter((file) => file !== "lib/storage/localStorageAdapter.ts")).toEqual([
      "lib/assets/container.ts",
    ]);
  });

  it("nenhum Repository fala com Storage e nenhum Storage fala com Repository — só o Service conhece os dois", () => {
    const repositoryContent = readFileSync(join(ROOT, "lib", "assets", "prismaAssetRepository.ts"), "utf-8");
    expect(importsAnyOf(repositoryContent, ["lib/storage", "../storage"])).toBe(false);

    const storageFiles = listSourceFiles(join(ROOT, "lib", "storage"));
    const violations = storageFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["lib/assets", "../assets"]) }))
      .filter((entry) => entry.hit !== false);
    expect(violations).toEqual([]);
  });
});
