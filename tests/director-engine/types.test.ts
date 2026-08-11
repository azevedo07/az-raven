import { describe, expect, it } from "vitest";
import { DirectorEngineDiagnostic, DirectorEngineResult } from "../../lib/director-engine/types";

/**
 * Testes de contrato do `DirectorEngineResult`/`DirectorEngineDiagnostic`
 * (Task "Director Engine Foundation, parte 2") — não testam nenhum
 * comportamento do `DirectorEngine` em si (isso é
 * `directorEngine.test.ts`), só a forma do contrato: pode ser
 * construído, é serializável, e os dois status possíveis são
 * representáveis.
 */

function buildResult(overrides: Partial<DirectorEngineResult> = {}): DirectorEngineResult {
  return {
    status: "PROCESSED",
    sceneId: "1",
    generatedAt: "2026-01-01T12:00:00.000Z",
    diagnostics: [],
    ...overrides,
  };
}

describe("DirectorEngineResult — contrato", () => {
  it("um resultado PROCESSED válido pode ser construído com diagnostics vazio", () => {
    const result = buildResult();

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("1");
    expect(result.diagnostics).toEqual([]);
  });

  it("um resultado INVALID_CONTEXT válido pode ser construído com diagnostics preenchido", () => {
    const diagnostic: DirectorEngineDiagnostic = { code: "MISSING_SCENE_ID", message: "sceneId é obrigatório." };
    const result = buildResult({ status: "INVALID_CONTEXT", sceneId: "", diagnostics: [diagnostic] });

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe("MISSING_SCENE_ID");
  });

  it("é seguro para JSON.stringify — round-trip preserva todos os campos", () => {
    const result = buildResult({
      status: "INVALID_CONTEXT",
      diagnostics: [
        { code: "MISSING_SCENE_ID", message: "sceneId é obrigatório." },
        { code: "INVALID_ASSETS", message: "assets deve ser um array." },
      ],
    });

    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped).toEqual(result);
  });

  it("não contém nenhum valor que não seja serializável (sem Date, sem BigInt, sem funções)", () => {
    const result = buildResult({ generatedAt: new Date().toISOString() });

    function assertPlainJson(value: unknown): void {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(assertPlainJson);
        return;
      }
      if (typeof value === "object") {
        expect(value?.constructor === Object || value?.constructor === undefined).toBe(true);
        Object.values(value as Record<string, unknown>).forEach(assertPlainJson);
        return;
      }
      throw new Error(`Valor não serializável encontrado: ${typeof value}`);
    }

    assertPlainJson(result);
  });
});
