import { DirectorContext } from "../director-context/types";

/**
 * Cinematic Intent (Task "Director Engine — Cinematic Intent, primeiro
 * contrato cinematográfico"). Representa "qual intenção cinematográfica
 * pode ser expressa a partir do que já sabemos sobre a cena"
 * (`DirectorContext`) — não "como filmar a cena". Nenhuma decisão de
 * câmera/lente/movimento/iluminação física/enquadramento/trilha/efeitos
 * pertence aqui; isso é responsabilidade de uma camada de decisão
 * cinematográfica futura, ainda não implementada.
 *
 * DADO -> INTENÇÃO. Não vai até DECISÃO nem EXECUÇÃO.
 *
 * Arquivo separado de `types.ts` de propósito: `types.ts` já tem um
 * teste de arquitetura que trava sua lista de imports em exatamente uma
 * linha (`DirectorContext`) — `createCinematicIntent`, sendo uma
 * função (ainda que pura), pertence junto do seu próprio tipo aqui,
 * mesmo princípio de `directorEngine.ts` (implementação ao lado do
 * contrato que ela produz), sem precisar tocar em `types.ts`.
 *
 * TUDO aqui é opcional exceto `sceneId` — uma Scene pode não ter
 * objetivo emocional, narrativo, câmera, luz, som, paleta, critério ou
 * duração. Nenhum valor é inventado para preencher a ausência (nada de
 * "cinematic"/"dramatic"/"epic" como default) — ausência no
 * `DirectorContext` vira ausência (`undefined`) aqui, nunca um texto
 * genérico substituto.
 *
 * Nenhum campo aqui interpreta o texto livre da Scene além de
 * transcrevê-lo: se `Scene.emo` diz "medo", `emotionalObjective` também
 * diz "medo" — nunca "low-key lighting" ou qualquer inferência
 * cinematográfica derivada.
 */

/**
 * Intenção visual — transcrição direta de `luz`/`cam`/`paleta`
 * (`DirectorSceneCreativeBrief.lighting`/`camera`/`palette`), texto
 * livre já autoral, nunca parâmetros técnicos (lente, movimento,
 * exposição) derivados/inventados a partir dele.
 */
export interface CinematicVisualIntent {
  lighting?: string;
  camera?: string;
  palette?: readonly string[];
}

/** Intenção de áudio — transcrição direta de `som` (`DirectorSceneCreativeBrief.sound`); nenhuma trilha/efeito/mixagem inventados. */
export interface CinematicAudioIntent {
  sound?: string;
}

/** Intenção de ritmo — transcrição direta de `duration` (`DirectorSceneIdentity.duration`, texto livre tipo "45s"); nenhum BPM ou segundos estruturados inventados. */
export interface CinematicPacingIntent {
  duration?: string;
}

/** Restrições já existentes na Scene — hoje, só o critério de aprovação (`DirectorSceneCreativeBrief.approvalCriteria`); nenhuma restrição nova é inventada. */
export interface CinematicConstraints {
  approvalCriteria?: string;
}

/**
 * O contrato principal — puro, serializável (`JSON.stringify` sempre
 * seguro), determinístico, sem `Date`/`Map`/`Set`/`Buffer`/função/
 * classe/referência a infraestrutura. Cada campo, exceto `sceneId`, é
 * opcional — ausência de dado na Scene vira ausência aqui, nunca um
 * valor substituto.
 */
export interface CinematicIntent {
  /** Ecoa `context.scene.sceneId` — igual ao mesmo campo em `DirectorEngineResult`. */
  sceneId: string;
  /** `DirectorContext.creativeBrief?.narrativeGoal` — texto original preservado, nunca interpretado. */
  narrativeObjective?: string;
  /** `DirectorContext.creativeBrief?.emotionalGoal` — texto original preservado, nunca interpretado. */
  emotionalObjective?: string;
  /** Ausente quando `context.creativeBrief` está ausente. */
  visualIntent?: CinematicVisualIntent;
  /** Ausente quando `context.creativeBrief` está ausente. */
  audioIntent?: CinematicAudioIntent;
  /** Ausente quando `context.scene.duration` está ausente (não depende de `creativeBrief` — `duration` vive em `DirectorSceneIdentity`). */
  pacingIntent?: CinematicPacingIntent;
  /** Ausente quando `context.creativeBrief?.approvalCriteria` está ausente. */
  constraints?: CinematicConstraints;
}

/**
 * Constrói um `CinematicIntent` a partir de um `DirectorContext` já
 * pronto. Pura e determinística: mesma entrada sempre produz a mesma
 * saída (nenhum `Date.now()`, `Math.random()`, UUID — se uma auditoria
 * futura precisar de timestamp, isso pertence ao resultado de um
 * processamento, não a este contrato de intenção). Nunca modifica
 * `context`.
 *
 * Não pertence a nenhuma outra camada (`Repository`/`SceneContextReader`/
 * Use Case/`container.ts`) — função livre, sem estado, sem dependência
 * injetada, porque não precisa de nenhuma: tudo que ela usa já está no
 * `DirectorContext` recebido.
 */
export function createCinematicIntent(context: DirectorContext): CinematicIntent {
  const { scene, creativeBrief } = context;

  return {
    sceneId: scene.sceneId,
    narrativeObjective: creativeBrief?.narrativeGoal,
    emotionalObjective: creativeBrief?.emotionalGoal,
    visualIntent: creativeBrief
      ? {
          lighting: creativeBrief.lighting,
          camera: creativeBrief.camera,
          palette: creativeBrief.palette,
        }
      : undefined,
    audioIntent: creativeBrief ? { sound: creativeBrief.sound } : undefined,
    pacingIntent: scene.duration !== undefined ? { duration: scene.duration } : undefined,
    constraints: creativeBrief?.approvalCriteria !== undefined ? { approvalCriteria: creativeBrief.approvalCriteria } : undefined,
  };
}
