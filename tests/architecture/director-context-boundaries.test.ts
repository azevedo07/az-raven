import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da fronteira do Director Context (Task "Director
 * Engine Foundation"):
 *
 *   Scene (lib/data.ts, mock) -\
 *                                +-> SceneContextReaderImpl -> DirectorContext
 *   sceneAssetService (lib/scene-assets) -/
 *
 * O contrato puro (`types.ts`, `sceneContextReader.ts`) não importa
 * NADA — nem Prisma, nem Next.js, nem React, nem Storage, nem Pipeline.
 * Só a implementação concreta (`sceneContextReaderImpl.ts`) e o
 * Composition Root (`container.ts`) têm dependências reais, e mesmo
 * essas são limitadas a `lib/scene-assets/` e `lib/data.ts` — nunca
 * Prisma/Next.js/React diretamente, nunca `lib/pipeline-core/`,
 * `lib/repositories/`, `lib/pipeline-service/` ou `lib/application/`.
 *
 * Mesmo padrão (helpers duplicados, não compartilhados) de
 * `tests/architecture/scene-asset-layer-boundaries.test.ts` e
 * `tests/architecture/layer-boundaries.test.ts`.
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

const INFRA_NEEDLES = [
  "@prisma/client",
  "generated/prisma",
  "next/server",
  "next/navigation",
  "next/",
  "react",
  "storage/storageAdapter",
  "storage/localStorageAdapter",
];

const PIPELINE_NEEDLES = ["pipeline-core/", "pipeline-service/", "repositories/", "application/"];

describe("Fronteiras de arquitetura do Director Context", () => {
  it("lib/director-context/types.ts (o contrato) não tem NENHUM import — nem Prisma, Next.js, React, Storage ou Pipeline", () => {
    const file = join(ROOT, "lib", "director-context", "types.ts");
    const content = readFileSync(file, "utf-8");
    expect(importLines(content)).toEqual([]);
  });

  it("lib/director-context/sceneContextReader.ts (a porta) só importa ./types — nenhuma infraestrutura", () => {
    const file = join(ROOT, "lib", "director-context", "sceneContextReader.ts");
    const content = readFileSync(file, "utf-8");
    const imports = importLines(content).map((line) => line.trim());
    expect(imports).toEqual(['import { DirectorContext } from "./types";']);
  });

  it("nenhum arquivo de lib/director-context/ importa Prisma, Next.js, React ou Storage diretamente", () => {
    const files = listSourceFiles(join(ROOT, "lib", "director-context"));
    expect(files.length).toBeGreaterThan(0);

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), INFRA_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo de lib/director-context/ importa Pipeline (pipeline-core/pipeline-service/repositories/application)", () => {
    const files = listSourceFiles(join(ROOT, "lib", "director-context"));

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), PIPELINE_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo do Pipeline importa lib/director-context/ (sem dependência circular)", () => {
    const pipelineFiles = [
      ...listSourceFiles(join(ROOT, "lib", "pipeline-core")),
      ...listSourceFiles(join(ROOT, "lib", "repositories")),
      ...listSourceFiles(join(ROOT, "lib", "pipeline-service")),
      ...listSourceFiles(join(ROOT, "lib", "application")),
    ];

    const violations = pipelineFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-context"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/scene-assets/ não importa lib/director-context/ (a dependência só vai numa direção: director-context -> scene-assets)", () => {
    const files = listSourceFiles(join(ROOT, "lib", "scene-assets"));

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-context"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/assets/ e lib/storage/ não importam lib/director-context/", () => {
    const files = [...listSourceFiles(join(ROOT, "lib", "assets")), ...listSourceFiles(join(ROOT, "lib", "storage"))];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-context"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum componente React (components/, app/) importa lib/director-context/sceneContextReaderImpl ou lib/director-context/container diretamente", () => {
    const files = [...listSourceFiles(join(ROOT, "components")), ...listSourceFiles(join(ROOT, "app"))];

    const violations = files
      .map((file) => ({
        file: toRepoPath(file),
        hit: importsAnyOf(readFileSync(file, "utf-8"), [
          "director-context/sceneContextReaderImpl",
          "director-context/container",
        ]),
      }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum componente React (components/, app/) importa lib/director-context/ de forma alguma — esta Task não cria UI nem rotas", () => {
    const files = [...listSourceFiles(join(ROOT, "components")), ...listSourceFiles(join(ROOT, "app"))];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-context"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("só lib/director-context/container.ts instancia SceneContextReaderImpl", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")),
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
    ].filter((f) => !toRepoPath(f).startsWith("tests/"));

    const importers = allFiles
      .filter((file) => {
        const content = readFileSync(file, "utf-8");
        return /\bnew SceneContextReaderImpl\(/.test(content);
      })
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/director-context/container.ts"]);
  });

  it("lib/director-context/sceneContextReaderImpl.ts só depende de SceneAssetService (valor/tipo) e Scene (tipo) — nenhum Repository/Prisma direto", () => {
    const file = join(ROOT, "lib", "director-context", "sceneContextReaderImpl.ts");
    const forbidden = [
      "scene-assets/repository",
      "scene-assets/prismaSceneAssetRepository",
      "assets/repository",
      "assets/prismaAssetRepository",
      "assets/container",
      "storage/storageAdapter",
      "storage/localStorageAdapter",
      "@prisma/client",
      "generated/prisma",
    ];

    const content = readFileSync(file, "utf-8");
    expect(importsAnyOf(content, forbidden)).toBe(false);
  });
});
