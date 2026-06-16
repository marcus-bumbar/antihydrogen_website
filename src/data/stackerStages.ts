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
    voltages: [50, 20, -10, 0, 0],
    description: "Open the Stacker to load.",
  },
  receivePositrons2: {
    name: "Receive e+ 2",
    voltages: [50, 20, -40, 20, 50],
    description: "Trap positrons.",
  },
  receivePositrons3: {
    name: "Receive e+ 3",
    voltages: traps.stacker.initialVoltages,
    description: "Positrons are stacked.",
  },

  sendPositrons1: {
    name: "Send e+ 1",
    voltages: [0, 30, 30, 30, 60],
    description: "Extraction.",
  },
  sendPositrons2: {
    name: "Send e+ 2",
    voltages: [60, 30, 30, 30, 60],
    description: "Release positrons.",
  },
  sendPositrons3: {
    name: "Send e+ 3",
    voltages: traps.stacker.initialVoltages,
    description: "Return to initial.",
  },
} satisfies Record<string, TrapStage>;
