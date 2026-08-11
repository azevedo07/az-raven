import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da fronteira do Director Engine (Task "Director
 * Engine Foundation, parte 2"; Use Case de orquestração adicionado na
 * Task "Director Engine — Orquestração"):
 *
 *   DirectorContext (lib/director-context/types.ts)
 *   SceneContextReader (lib/director-context/sceneContextReader.ts, porta pura)
 *         ↓ (únicas dependências permitidas do Use Case)
 *   ProcessSceneWithDirectorUseCase (lib/director-engine/use-cases/)
 *         ↓
 *   DirectorEngine (lib/director-engine/)
 *
 * Nunca o inverso — `lib/director-context/` não pode depender de
 * `lib/director-engine/`. O Director Engine (incluindo o Use Case) não
 * conhece `Scene`, Repository, `AssetService`/`SceneAssetService`,
 * Prisma, Storage, Next.js, React ou Pipeline — e nunca importa
 * `SceneContextReaderImpl`/`lib/director-context/container.ts`
 * diretamente (só a porta `SceneContextReader`). Só
 * `lib/director-engine/container.ts` (o Composition Root) tem licença
 * para importar implementações concretas e outros `container.ts`.
 *
 * Mesmo padrão (helpers duplicados, não compartilhados) de
 * `tests/architecture/director-context-boundaries.test.ts`.
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
  "prisma",
  "@prisma",
  "next/",
  "react",
  "storage/storageAdapter",
  "storage/localStorageAdapter",
  "scene-assets/repository",
  "assets/repository",
  "assets/prismaAssetRepository",
  "assets/assetService",
  "scene-assets/sceneAssetService",
  "pipeline-core/",
  "pipeline-service/",
  "repositories/",
  "application/",
];

/**
 * Needle à parte (não em `FORBIDDEN_NEEDLES`): `"../types"` só
 * significa `lib/types.ts` (`Scene`) quando o arquivo está diretamente
 * em `lib/director-engine/` — dentro de `use-cases/`, `"../types"`
 * resolve para `lib/director-engine/types.ts` (permitido, é o próprio
 * contrato do módulo). Por isso esta checagem é isolada e só varre os
 * arquivos de nível superior, nunca `use-cases/`.
 */
const SCENE_TYPE_NEEDLES = ["../types", "@/lib/types"];

describe("Fronteiras de arquitetura do Director Engine", () => {
  it("lib/director-engine/types.ts só importa DirectorContext (lib/director-context/types) — nenhuma outra dependência", () => {
    const file = join(ROOT, "lib", "director-engine", "types.ts");
    const content = readFileSync(file, "utf-8");
    const imports = importLines(content).map((line) => line.trim());
    expect(imports).toEqual(['import { DirectorContext } from "../director-context/types";']);
  });

  it("nenhum arquivo de nível superior de lib/director-engine/ (fora de use-cases/) importa Scene (lib/types.ts)", () => {
    const files = readdirSync(join(ROOT, "lib", "director-engine"))
      .filter((entry) => /\.ts$/.test(entry))
      .map((entry) => join(ROOT, "lib", "director-engine", entry));

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), SCENE_TYPE_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo de lib/director-engine/ importa Prisma, Next.js, React, Storage, Repository, Service ou Pipeline", () => {
    const files = listSourceFiles(join(ROOT, "lib", "director-engine"));
    expect(files.length).toBeGreaterThan(0);

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), FORBIDDEN_NEEDLES) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo de lib/director-engine/ importa Scene ou qualquer tipo de lib/scene-assets/ diretamente", () => {
    const files = listSourceFiles(join(ROOT, "lib", "director-engine"));

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["scene-assets/"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo de lib/director-engine/, exceto container.ts, importa SceneContextReaderImpl ou lib/director-context/container.ts — só a porta (SceneContextReader)", () => {
    const files = listSourceFiles(join(ROOT, "lib", "director-engine")).filter(
      (f) => toRepoPath(f) !== "lib/director-engine/container.ts"
    );

    const violations = files
      .map((file) => ({
        file: toRepoPath(file),
        hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-context/sceneContextReaderImpl", "director-context/container"]),
      }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/director-engine/use-cases/processSceneWithDirectorUseCase.ts importa só as duas portas necessárias (SceneContextReader e DirectorEngine/DirectorEngineResult)", () => {
    const file = join(ROOT, "lib", "director-engine", "use-cases", "processSceneWithDirectorUseCase.ts");
    const content = readFileSync(file, "utf-8");
    const imports = importLines(content).map((line) => line.trim());
    expect(imports).toEqual([
      'import { SceneContextReader } from "../../director-context/sceneContextReader";',
      'import { DirectorEngine, DirectorEngineResult } from "../types";',
    ]);
  });

  it("lib/director-engine/ só depende de lib/director-context/types — nunca do contrário (director-context não importa director-engine)", () => {
    const contextFiles = listSourceFiles(join(ROOT, "lib", "director-context"));

    const violations = contextFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-engine"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum arquivo do Pipeline importa lib/director-engine/ (sem dependência circular, e o Pipeline não passou a depender do Director Engine nesta Task)", () => {
    const pipelineFiles = [
      ...listSourceFiles(join(ROOT, "lib", "pipeline-core")),
      ...listSourceFiles(join(ROOT, "lib", "repositories")),
      ...listSourceFiles(join(ROOT, "lib", "pipeline-service")),
      ...listSourceFiles(join(ROOT, "lib", "application")),
    ];

    const violations = pipelineFiles
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-engine"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/assets/, lib/storage/ e lib/scene-assets/ não importam lib/director-engine/", () => {
    const files = [
      ...listSourceFiles(join(ROOT, "lib", "assets")),
      ...listSourceFiles(join(ROOT, "lib", "storage")),
      ...listSourceFiles(join(ROOT, "lib", "scene-assets")),
    ];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-engine"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("nenhum componente React (components/, app/) importa lib/director-engine/ de forma alguma — esta Task não cria UI nem rotas", () => {
    const files = [...listSourceFiles(join(ROOT, "components")), ...listSourceFiles(join(ROOT, "app"))];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-engine"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("só lib/director-engine/container.ts instancia DirectorEngineImpl", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")),
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
    ].filter((f) => !toRepoPath(f).startsWith("tests/"));

    const importers = allFiles
      .filter((file) => {
        const content = readFileSync(file, "utf-8");
        return /\bnew DirectorEngineImpl\(/.test(content);
      })
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/director-engine/container.ts"]);
  });

  it("só lib/director-engine/container.ts instancia ProcessSceneWithDirectorUseCaseImpl", () => {
    const allFiles = [
      ...listSourceFiles(join(ROOT, "lib")),
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
    ].filter((f) => !toRepoPath(f).startsWith("tests/"));

    const importers = allFiles
      .filter((file) => {
        const content = readFileSync(file, "utf-8");
        return /\bnew ProcessSceneWithDirectorUseCaseImpl\(/.test(content);
      })
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/director-engine/container.ts"]);
  });

  it("nenhum componente React (components/, app/) importa lib/director-engine/use-cases/ (internals do Use Case) diretamente", () => {
    const files = [...listSourceFiles(join(ROOT, "components")), ...listSourceFiles(join(ROOT, "app"))];

    const violations = files
      .map((file) => ({ file: toRepoPath(file), hit: importsAnyOf(readFileSync(file, "utf-8"), ["director-engine/use-cases"]) }))
      .filter((entry) => entry.hit !== false);

    expect(violations).toEqual([]);
  });

  it("lib/director-engine/directorEngine.ts (a implementação) também respeita a fronteira — mesma checagem, isolada", () => {
    const file = join(ROOT, "lib", "director-engine", "directorEngine.ts");
    const content = readFileSync(file, "utf-8");
    const imports = importLines(content).map((line) => line.trim());
    expect(imports).toEqual([
      'import { DirectorContext } from "../director-context/types";',
      'import { DirectorEngine, DirectorEngineDiagnostic, DirectorEngineResult } from "./types";',
    ]);
  });
});
