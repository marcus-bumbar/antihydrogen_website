import { traps } from "./traps";
import type { TrapStage } from "./trapStages";

export const musashiStages = {
  idle: {
    name: "MUSASHI idle",
    voltages: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Default MUSASHI holding configuration.",
  },

  loadElectrons1: {
    name: "Load e− 1",
    voltages: [-50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Open MUSASHI for electron loading.",
  },
  loadElectrons2: {
    name: "Load e− 2",
    voltages: [-50, -10, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Guide electrons toward the central well.",
  },
  loadElectrons3: {
    name: "Load e− 3",
    voltages: [-80, -30, 0, 0, 0, 30, 0, 0, -30, -80],
    description: "Raise barriers around the electron plasma.",
  },
  loadElectrons4: {
    name: "Load e− 4",
    voltages: [-120, -120, -20, -20, -20, 50, -20, -20, -120, -120],
    description: "Electrons are trapped in MUSASHI.",
  },

  kickElectrons1: {
    name: "Kick e− 1",
    voltages: [-120, -120, -20, -20, -20, -20, -20, -20, -20, -120],
    description: "Prepare to eject electrons.",
  },
  kickElectrons2: {
    name: "Kick e− 2",
    voltages: [-120, -120, -20, -20, -20, -20, -20, -20, -20, -20],
    description: "Lower the downstream barrier.",
  },
  kickElectrons3: {
    name: "Kick e− 3",
    voltages: [-120, -120, -20, -20, -20, 50, -20, -20, -120, -120],
    description: "Electrons left MUSASHI.",
  },

  trapAntiprotons1: {
    name: "Trap p̄ 1",
    voltages: [-40, -40, -40, -40, -40, 80, -40, -40, -40, -500],
    description: "Open entrance for antiprotons.",
  },
  trapAntiprotons2: {
    name: "Trap p̄ 2",
    voltages: [-500, -40, -40, -40, -40, 80, -40, -40, -40, -500],
    description: "Raise upstream barrier..",
  },
  trapAntiprotons3: {
    name: "Trap p̄ 3",
    voltages: [-500, -40, -40, -40, -40, 80, -40, -40, -40, -500],
    description: "Raise upstream barrier.",
  },
  trapAntiprotons4: {
    name: "Trap p̄ 4",
    voltages: [-120, -20, -20, -20, -20, 80, -20, -20, -20, -120],
    description: "Antiprotons are trapped in MUSASHI.",
  },

  transferAntiprotons1: {
    name: "Transfer p̄ 1",
    voltages: [-120, -40, -20, -20, -20, -20, -20, 0, 0, 0],
    description: "Prepare antiproton extraction.",
  },
  transferAntiprotons2: {
    name: "Transfer p̄ 2",
    voltages: [-120, -40, -20, -20, -20, -20, -20, 0, 0, 0],
    description: "Lower the exit barrier.",
  },
  transferAntiprotons3: {
    name: "Transfer p̄ 3",
    voltages: [-120, -20, -20, -20, 50, -20, -20, -20, -120, -120],
    description: "Antiprotons leave MUSASHI.",
  },
} satisfies Record<string, TrapStage>;
