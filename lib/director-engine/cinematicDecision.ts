import { CinematicIntent } from "./cinematicIntent";

/**
 * Cinematic Decision (Task "Director Engine — Primeira Camada de
 * Decisão Cinematográfica Determinística"). Representa "qual decisão o
 * Director pode justificar com base no que o `CinematicIntent` informa"
 * — não "o que o Director acha que a cena precisa". `CinematicIntent`
 * já é "aquilo que a Scene realmente informa" (ver `cinematicIntent.ts`);
 * `CinematicDecision` é só isso, reorganizado por categoria, com um
 * status explícito para o que NÃO existe. Nenhuma informação nova é
 * produzida — cada valor presente aqui já estava em `CinematicIntent`.
 *
 * DADO -> INTENÇÃO -> DECISÃO. Ainda não vai até EXECUÇÃO (nenhuma
 * lente, posição de câmera, intensidade de luz, BPM ou qualquer
 * parâmetro técnico inventado).
 *
 * Princípio único desta Task: "quando existe evidência explícita,
 * preserve-a; quando não existe, declare ausência." Nenhuma heurística,
 * nenhum default, nenhuma palavra genérica ("cinematic"/"dramatic"/
 * "epic"/"dynamic"/"beautiful"/"immersive"), nenhuma interpretação de
 * texto livre (`camera: "close-up"` nunca vira `lens: "85mm"` — a
 * categoria CAMERA só reconhece QUE existe uma indicação de câmera,
 * preservando o texto exatamente como está, nunca decompondo/inferindo
 * parâmetros técnicos que o texto não contém).
 *
 * As 8 categorias abaixo são um mapeamento 1:1 com os únicos campos que
 * `CinematicIntent` realmente possui hoje — nenhuma categoria foi
 * criada "para o futuro". Se `CinematicIntent` ganhar um campo novo,
 * uma categoria nova pode ser adicionada então; não antes.
 *
 * Arquivo separado de `types.ts` pelo mesmo motivo de `cinematicIntent.ts`:
 * `types.ts` tem um teste de arquitetura que trava sua lista de imports
 * em exatamente uma linha — `createCinematicDecision`, sendo uma função
 * (ainda que pura), pertence junto do seu próprio tipo aqui.
 */

/**
 * Mapeamento 1:1 com os campos de `CinematicIntent`:
 * `NARRATIVE` <- `narrativeObjective`, `EMOTIONAL` <- `emotionalObjective`,
 * `CAMERA` <- `visualIntent.camera`, `LIGHTING` <- `visualIntent.lighting`,
 * `PALETTE` <- `visualIntent.palette`, `AUDIO` <- `audioIntent.sound`,
 * `PACING` <- `pacingIntent.duration`, `CONSTRAINTS` <- `constraints.approvalCriteria`.
 */
export type CinematicDecisionCategory =
  | "NARRATIVE"
  | "EMOTIONAL"
  | "CAMERA"
  | "LIGHTING"
  | "PALETTE"
  | "AUDIO"
  | "PACING"
  | "CONSTRAINTS";

/**
 * `AVAILABLE`: o campo de origem em `CinematicIntent` tinha um valor —
 * `value`/`source` estão preenchidos. `UNAVAILABLE`: o campo de origem
 * estava ausente (`undefined`) — `value`/`source` ficam ausentes,
 * NUNCA preenchidos com um valor inventado.
 */
export type CinematicDecisionStatus = "AVAILABLE" | "UNAVAILABLE";

/**
 * Uma decisão individual. Quando `status` é `"AVAILABLE"`: `value` é o
 * valor original de `CinematicIntent` (string ou lista de strings para
 * `PALETTE` — transcrito, nunca transformado) e `source` é o caminho do
 * campo de `CinematicIntent` que o originou (ex.: `"visualIntent.camera"`),
 * para que a decisão sempre consiga responder "qual dado justificou
 * isso?". Quando `status` é `"UNAVAILABLE"`: nem `value` nem `source`
 * aparecem — a ausência de evidência produz ausência de decisão, nunca
 * um valor substituto.
 */
export interface CinematicDecisionEntry {
  category: CinematicDecisionCategory;
  status: CinematicDecisionStatus;
  value?: string | readonly string[];
  source?: string;
}

/**
 * O contrato principal — puro, serializável (`JSON.stringify` sempre
 * seguro), determinístico, sem `Date`/`Map`/`Set`/`Buffer`/função/
 * classe/referência a infraestrutura. `decisions` sempre tem exatamente
 * 8 entradas (uma por categoria), na mesma ordem — mesmo quando TODAS
 * estão `UNAVAILABLE` (um `CinematicIntent` mínimo continua produzindo
 * um `CinematicDecision` estruturalmente completo, só com tudo marcado
 * como indisponível).
 */
export interface CinematicDecision {
  /** Ecoa `intent.sceneId`. */
  sceneId: string;
  decisions: CinematicDecisionEntry[];
}

const CATEGORY_ORDER: CinematicDecisionCategory[] = [
  "NARRATIVE",
  "EMOTIONAL",
  "CAMERA",
  "LIGHTING",
  "PALETTE",
  "AUDIO",
  "PACING",
  "CONSTRAINTS",
];

function decideFrom(
  category: CinematicDecisionCategory,
  source: string,
  value: string | readonly string[] | undefined
): CinematicDecisionEntry {
  if (value === undefined) {
    return { category, status: "UNAVAILABLE" };
  }
  return { category, status: "AVAILABLE", value, source };
}

/**
 * Constrói um `CinematicDecision` a partir de um `CinematicIntent` já
 * pronto. Pura e determinística: mesma entrada sempre produz a mesma
 * saída (nenhum `Date.now()`, `Math.random()`, UUID, nenhuma
 * aleatoriedade). Nunca modifica `intent`. Nenhuma análise semântica,
 * nenhum NLP, nenhuma inferência de emoção/câmera/iluminação a partir
 * de texto livre — cada categoria é preenchida (ou não) só por
 * presença/ausência do campo de origem correspondente.
 *
 * Não pertence a nenhuma outra camada (`Repository`/`SceneContextReader`/
 * Use Case/`container.ts`/`DirectorEngine`) — função livre, sem estado,
 * sem dependência injetada, porque não precisa de nenhuma: tudo que ela
 * usa já está no `CinematicIntent` recebido.
 */
export function createCinematicDecision(intent: CinematicIntent): CinematicDecision {
  const decisions = CATEGORY_ORDER.map((category) => {
    switch (category) {
      case "NARRATIVE":
        return decideFrom(category, "narrativeObjective", intent.narrativeObjective);
      case "EMOTIONAL":
        return decideFrom(category, "emotionalObjective", intent.emotionalObjective);
      case "CAMERA":
        return decideFrom(category, "visualIntent.camera", intent.visualIntent?.camera);
      case "LIGHTING":
        return decideFrom(category, "visualIntent.lighting", intent.visualIntent?.lighting);
      case "PALETTE":
        return decideFrom(category, "visualIntent.palette", intent.visualIntent?.palette);
      case "AUDIO":
        return decideFrom(category, "audioIntent.sound", intent.audioIntent?.sound);
      case "PACING":
        return decideFrom(category, "pacingIntent.duration", intent.pacingIntent?.duration);
      case "CONSTRAINTS":
        return decideFrom(category, "constraints.approvalCriteria", intent.constraints?.approvalCriteria);
    }
  });

  return { sceneId: intent.sceneId, decisions };
}
