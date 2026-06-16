import { traps } from "./traps";
import type { TrapStage } from "./trapStages";

export const cuspStages = {
  idle: {
    name: "Cusp idle",
    voltages: traps.cusp.initialVoltages,
    description: "Default Cusp potential.",
  },

  loadElectrons1: {
    name: "Load Cusp e− 1",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Open Cusp for electron loading.",
  },
  loadElectrons2: {
    name: "Load Cusp e− 2",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Compress electrons in the Cusp.",
  },
  loadElectrons3: {
    name: "Load Cusp e− 3",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Electrons are trapped in the Cusp.",
  },

  kickElectrons1: {
    name: "Kick Cusp e− 1",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Prepare Cusp electron ejection.",
  },
  kickElectrons2: {
    name: "Kick Cusp e− 2",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Lower one barrier.",
  },
  kickElectrons3: {
    name: "Kick Cusp e− 3",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Electrons leave the Cusp.",
  },

  receiveAntiprotons1: {
    name: "Receive p̄ 1",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Open Cusp entrance for antiprotons.",
  },
  receiveAntiprotons2: {
    name: "Receive p̄ 2",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Antiprotons enter the Cusp.",
  },
  receiveAntiprotons3: {
    name: "Receive p̄ 3",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Antiprotons are captured in the Cusp.",
  },

  receivePositrons1: {
    name: "Receive e+ 1",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Open Cusp for incoming positrons.",
  },
  receivePositrons2: {
    name: "Receive e+ 2",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Positrons enter the Cusp.",
  },
  receivePositrons3: {
    name: "Receive e+ 3",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Positrons are held for mixing.",
  },

  mix1: {
    name: "Mix 1",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Nested well is prepared.",
  },
  mix2: {
    name: "Mix 2",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Antiprotons and positrons overlap.",
  },
  mix3: {
    name: "Mix 3",
    voltages: [80, 30, 0, -10, -30, -10, 0, 10, 30, 80],
    description: "Antihydrogen production region.",
  },
} satisfies Record<string, TrapStage>;
