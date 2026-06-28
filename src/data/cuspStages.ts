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
    voltages: [0, 0, 0, 0, 0, 0, -100, 0, 0, 0],
    description: "Open Cusp for electron loading.",
  },
  loadElectrons2: {
    name: "Load Cusp e− 2",
    voltages: [-100, 0, 0, 0, 0, 0, -100, 0, 0, 0],
    description: "Compress electrons in the Cusp.",
  },
  loadElectrons3: {
    name: "Load Cusp e− 3",
    voltages: [-100, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Electrons are trapped in the Cusp.",
  },
  loadElectrons4: {
    name: "Load Cusp e− 3",
    voltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Electrons are trapped in the Cusp.",
  },


  kickElectrons1: {
    name: "Kick Cusp e− 1",
    voltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Prepare Cusp electron ejection.",
  },
  kickElectrons2: {
    name: "Kick Cusp e− 2",
    voltages: [-100, 0, 0, -100, 0, 0, -100, 0, 0, 0],
    description: "Electrons up",
  },
  kickElectrons3: {
    name: "Kick Cusp e− 3",
    voltages: [0, 0, 0, -100, 0, 0, -100, 0, 0, 0],
    description: "Electrons leave the Cusp.",
  },
    kickElectrons4: {
    name: "Kick Cusp e− 4",
    voltages: [-100, 0, 0, -100, 0, 0, -100, 0, 0, 0],
    description: "close pbar well",
  },
    kickElectrons5: {
    name: "Kick Cusp e− 5",
    voltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "close pbar well",
  },

  receiveAntiprotons1: {
    name: "Receive p̄ 1",
    voltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Open Cusp entrance for antiprotons.",
  },
  receiveAntiprotons2: {
    name: "Receive p̄ 2",
  voltages: [-100, 0, 0, 0, 0, 0, -100, 0, 0, 0],
    description: "Antiprotons enter the Cusp.",
  },
  receiveAntiprotons3: {
    name: "Receive p̄ 3",
    voltages: [-100, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Antiprotons are captured in the Cusp.",
  },
    receiveAntiprotons4: {
    name: "Receive p̄ 4",
    voltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Antiprotons are captured in the Cusp.",
  },

  receivePositrons1: {
    name: "Receive e+ 1",
    voltages: [80, 30, 30, 30, 30, 30, 0, 30, 30, 80],
    description: "Open Cusp for incoming positrons.",
  },
  receivePositrons2: {
    name: "Receive e+ 2",
    voltages: [30, 30, 30, 30, 30, 30, 0, 30, 30, 80],
    description: "Positrons enter the Cusp.",
  },
  receivePositrons3: {
    name: "Receive e+ 3",
    voltages: [80,80, 30, 30, 30, 30, -100, 30, 30, 80],
    description: "Positrons are held for mixing.",
  },
    receivePositrons4: {
    name: "Receive e+ 4",
    voltages: [0,0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Positrons are held for mixing.",
  },

  mix1: {
    name: "Mix 1",
    voltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    description: "Nested well is prepared.",
  },
  mix2: {
    name: "Mix 2",
    voltages: [0, 0, 50, 50, 0, 0, -100, 0, 0, 0],
    description: "Antiprotons and positrons overlap.",
  },
  mix3: {
    name: "Mix 3",
    voltages: [0, 0, 0, 50, 0, 0, -100, 0, 0, 0],
    description: "Antihydrogen production region.",
  },
  mix4: {
    name: "Mix 4",
    voltages: [0, 0, 0, 50, 50, 0, -100, 0, 0, 0],
    description: "Antihydrogen production region.",
  },
  mix5: {
    name: "Mix 5",
    voltages: [0, 0, 0, 0, 50, 0, -100, 0, 0, 0],
    description: "Antihydrogen production region.",
  },
  mix6: {
    name: "Mix 6",
    voltages: [0, 0, 0, 0, 50, 50, -100, 50, 0, 0],
    description: "Antihydrogen production region.",
  },
  mix7: {
    name: "Mix 7",
    voltages: [0, 0, 0, 0, 0, 50, -100, 50, 0, 0],
    description: "Antihydrogen production region.",
  },
mix8: {
    name: "Mix 8",
    voltages: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Antihydrogen production region.",
  },
} satisfies Record<string, TrapStage>;
