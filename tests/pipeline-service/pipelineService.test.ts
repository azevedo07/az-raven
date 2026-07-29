import { describe, expect, it } from "vitest";
import { getPipelineState } from "../../lib/pipeline-service/pipelineService";

describe("Pipeline Service — getPipelineState", () => {
  it("retorna o estado seedado do projeto de demonstração 'o-corvo'", () => {
    const state = getPipelineState("o-corvo");

    expect(state).toBeDefined();
    expect(state?.projectId).toBe("o-corvo");

    const modules = state!.modules;
    const doneModules = Object.values(modules).filter((module) => module.status === "done");
    expect(doneModules).toHaveLength(8);

    expect(modules["production"].status).toBe("active");
    expect(modules["quality-director"].status).toBe("pending");
    expect(modules["audience-intelligence"].status).toBe("pending");
    expect(modules["export"].status).toBe("pending");
  });

  it("retorna undefined para um projeto sem pipeline inicializado", () => {
    expect(getPipelineState("projeto-inexistente")).toBeUndefined();
  });
});
