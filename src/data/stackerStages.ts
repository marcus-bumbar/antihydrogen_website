import { traps } from "./traps";
import type { TrapStage } from "./trapStages";

export const stackerStages = {
  idle: {
    name: "Stacker idle",
    voltages: traps.stacker.initialVoltages,
    description: "Stacker is waiting.",
  },

  receivePositrons1: {
    name: "Receive e+ 1",
    voltages: [30, 13, 15, 17, 17],
    description: "Open the Stacker to load.",
  },
  receivePositrons2: {
    name: "Receive e+ 2",
    voltages: [30, 13, 15, 17,30],
    description: "Trap positrons.",
  },
  receivePositrons3: {
    name: "Receive e+ 3",
    voltages: traps.stacker.initialVoltages,
    description: "Positrons are stacked.",
  },

  sendPositrons1: {
    name: "Send e+ 1",
    voltages: [40, 30, 30, 40, 40],
    description: "Extraction.",
  },
  sendPositrons2: {
    name: "Send e+ 2",
    voltages: [30, 30, 30, 40, 40],
    description: "Release positrons.",
  },
  sendPositrons3: {
    name: "Send e+ 3",
    voltages: traps.stacker.initialVoltages,
    description: "Return to initial.",
  },
} satisfies Record<string, TrapStage>;
