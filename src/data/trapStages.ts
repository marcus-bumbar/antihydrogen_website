import type { TrapId } from "./traps";
import { musashiStages } from "./musashiStages";
import { cuspStages } from "./cuspStages";
import { sourceBgtStages } from "./sourceBgtStages";
import { stackerStages } from "./stackerStages";

export type TrapStage = {
  name: string;
  voltages: number[];
  description: string;
};

export const trapStagesByTrap = {
  musashi: musashiStages,
  cusp: cuspStages,
  sourceBgt: sourceBgtStages,
  stacker: stackerStages,
} satisfies Record<TrapId, Record<string, TrapStage>>;

export type TrapStageKeyByTrap = {
  [K in TrapId]: keyof (typeof trapStagesByTrap)[K];
};

export type AnyTrapStageKey = TrapStageKeyByTrap[TrapId];
