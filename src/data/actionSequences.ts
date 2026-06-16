import type { TrapId } from "./traps";

export type StageStep = {
  trapId: TrapId;
  stageKey: string;
  at: number; // normalized action progress: 0 to 1
};

export const actionSequences = {
  loadElectronsIntoMusashi: [
    { trapId: "musashi", stageKey: "loadElectrons1", at: 0.0 },
    { trapId: "musashi", stageKey: "loadElectrons2", at: 0.3 },
    { trapId: "musashi", stageKey: "loadElectrons3", at: 0.6 },
    { trapId: "musashi", stageKey: "loadElectrons4", at: 1.0 },
  ],

  kickElectronsFromMusashi: [
    { trapId: "musashi", stageKey: "kickElectrons1", at: 0.0 },
    { trapId: "musashi", stageKey: "kickElectrons2", at: 0.5 },
    { trapId: "musashi", stageKey: "kickElectrons3", at: 1.0 },
  ],

  trapAntiprotonsInMusashi: [
    { trapId: "musashi", stageKey: "trapAntiprotons1", at: 0.0 },
    { trapId: "musashi", stageKey: "trapAntiprotons2", at: 0.0 },
    { trapId: "musashi", stageKey: "trapAntiprotons3", at: 0.66 },
    { trapId: "musashi", stageKey: "trapAntiprotons4", at: 1.0 },
  ],

  transferAntiprotonsToCusp: [
    { trapId: "musashi", stageKey: "transferAntiprotons1", at: 0.0 },
    { trapId: "cusp", stageKey: "receiveAntiprotons1", at: 0.0 },
    { trapId: "musashi", stageKey: "transferAntiprotons2", at: 0.3 },
    { trapId: "cusp", stageKey: "receiveAntiprotons2", at: 0.55 },
    { trapId: "musashi", stageKey: "transferAntiprotons3", at: 0.7 },
    { trapId: "cusp", stageKey: "receiveAntiprotons3", at: 1.0 },
  ],

  loadPositronsIntoSourceBgt: [
    { trapId: "sourceBgt", stageKey: "loadPositrons1", at: 0.0 },
    { trapId: "sourceBgt", stageKey: "loadPositrons2", at: 0.5 },
    { trapId: "sourceBgt", stageKey: "loadPositrons3", at: 1.0 },
  ],

  transferPositronsToStacker: [
    { trapId: "sourceBgt", stageKey: "transferToStacker1", at: 0.0 },
    { trapId: "stacker", stageKey: "receivePositrons1", at: 0.0 },
    { trapId: "sourceBgt", stageKey: "transferToStacker2", at: 0.45 },
    { trapId: "stacker", stageKey: "receivePositrons2", at: 0.7 },
    { trapId: "sourceBgt", stageKey: "transferToStacker3", at: 1.0 },
    { trapId: "stacker", stageKey: "receivePositrons3", at: 1.0 },
  ],

  sendPositronsToCusp: [
    { trapId: "stacker", stageKey: "sendPositrons1", at: 0.0 },
    { trapId: "cusp", stageKey: "receivePositrons1", at: 0.0 },
    { trapId: "stacker", stageKey: "sendPositrons2", at: 0.35 },
    { trapId: "cusp", stageKey: "receivePositrons2", at: 0.65 },
    { trapId: "stacker", stageKey: "sendPositrons3", at: 1.0 },
    { trapId: "cusp", stageKey: "receivePositrons3", at: 1.0 },
  ],

  loadElectronsIntoCusp: [
    { trapId: "cusp", stageKey: "loadElectrons1", at: 0.0 },
    { trapId: "cusp", stageKey: "loadElectrons2", at: 0.5 },
    { trapId: "cusp", stageKey: "loadElectrons3", at: 1.0 },
  ],

  kickElectronsFromCusp: [
    { trapId: "cusp", stageKey: "kickElectrons1", at: 0.0 },
    { trapId: "cusp", stageKey: "kickElectrons2", at: 0.5 },
    { trapId: "cusp", stageKey: "kickElectrons3", at: 1.0 },
  ],

  mixPositronsAndAntiprotons: [
    { trapId: "cusp", stageKey: "mix1", at: 0.0 },
    { trapId: "cusp", stageKey: "mix2", at: 0.5 },
    { trapId: "cusp", stageKey: "mix3", at: 1.0 },
  ],
} satisfies Record<string, StageStep[]>;
