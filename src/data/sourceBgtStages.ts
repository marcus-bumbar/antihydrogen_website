import { traps } from "./traps";
import type { TrapStage } from "./trapStages";

export const sourceBgtStages = {
  idle: {
    name: "Source/BGT idle",
    voltages: traps.sourceBgt.initialVoltages,
    description: "Default source and buffer-gas-trap configuration.",
  },

  loadPositrons1: {
    name: "Load e+ Source/BGT 1",
    voltages: [10, -18, -5, -5, 7,0],
    description: "Prepare the source and buffer gas trap for positron loading.",
  },
  loadPositrons2: {
    name: "Load e+ Source/BGT 2",
    voltages: [10, -18, -5, -5, 7,0],
    description: "Accumulate positrons in the buffer gas trap.",
  },
  loadPositrons3: {
    name: "Load e+ Source/BGT 3",
    voltages: [10, -18, -5, -5, 7, 0],
    description: "Loaded positrons are held in the buffer gas trap.",
  },

  transferToStacker1: {
    name: "Transfer to Stacker 1",
    voltages: [30, 18, 25, 25, 27, 0],
    description: "Prepare extraction from the buffer gas trap.",
  },
  transferToStacker2: {
    name: "Transfer to Stacker 2",
    voltages: [0, 18, 25, 25, 27,0],
    description: "Lower the downstream barrier toward the Stacker.",
  },
  transferToStacker3: {
    name: "Transfer to Stacker 3",
    voltages: traps.sourceBgt.initialVoltages,
    description: "Source/BGT returns to idle after transfer.",
  },
} satisfies Record<string, TrapStage>;
