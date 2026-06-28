import type { Species } from "./particles";
import type { TrapId } from "./traps";
import { transportLayout, type RouteSegment } from "./transportLayout";

export type ButtonLockId =
    | "musashi.loadElectrons"
    | "musashi.kickElectrons"
    | "musashi.trapAntiprotons"
    | "musashi.transferAntiprotons"
    | "sourceBgt.transferPositrons"
    | "stacker.transferPositrons"
    | "cusp.loadElectrons"
    | "cusp.kickElectrons"
    | "cusp.mix"
    | "cusp.analyze";

export type QueuedParticleMove = {
    id?: string;
    species: Species;
    route: RouteSegment[];
    particleRadius?: number;
};

export type QueuedActionStep =
    | {
        type: "stage";
        trapId: TrapId;
        stageKey: string;
        duration: number;
    }
    | {
        type: "move";
        particles: QueuedParticleMove[];
        duration: number;
    }
    | {
        type: "moveStoredPopulation";
        trapId: TrapId;
        species: Species;
        route: RouteSegment[];
        duration: number;
    }
    | {
        type: "resetTrap";
        trapId: TrapId;
        duration: number;
        preserveSpecies?: Species[];
    }
    | {
        type: "removePopulationFraction";
        trapId: TrapId;
        species: Species;
        fraction: number;
    }
    | {
        type: "wait";
        duration: number;
    }
    | {
        type: "parallel";
        steps: QueuedActionStep[];
    }
    | {
        type: "sequence";
        steps: QueuedActionStep[];
    };

export type QueuedAnimation = {
    lockedButtons?: ButtonLockId[];
    steps: QueuedActionStep[];
};

const { routes } = transportLayout;

const musashiActionLocks: ButtonLockId[] = [
    "musashi.loadElectrons",
    "musashi.kickElectrons",
    "musashi.trapAntiprotons",
    "musashi.transferAntiprotons",
];

const cuspActionLocks: ButtonLockId[] = [
    "cusp.loadElectrons",
    "cusp.kickElectrons",
    "cusp.mix",
    "cusp.analyze",
];

const cuspButtonExecutionLocks: ButtonLockId[] = [
    ...cuspActionLocks,
    "stacker.transferPositrons",
    "musashi.transferAntiprotons",
];

const sourceBgtActionLocks: ButtonLockId[] = [
    "sourceBgt.transferPositrons",
];

const stackerActionLocks: ButtonLockId[] = [
    "stacker.transferPositrons",
];

const musashiToCuspTransferLocks: ButtonLockId[] = [
    ...musashiActionLocks,
    ...cuspActionLocks,
];

const sourceBgtToStackerTransferLocks: ButtonLockId[] = [
    ...sourceBgtActionLocks,
    ...stackerActionLocks,
];

const stackerToCuspTransferLocks: ButtonLockId[] = [
    ...stackerActionLocks,
    ...cuspActionLocks,
];

function inTrapRoute(
    trapId: TrapId,
    zStart: number,
    zEnd: number
): RouteSegment[] {
    return [
        {
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 },
            trapId,
            trapZStart: zStart,
            trapZEnd: zEnd,
            showOverlay: false,
        },
    ];
}

export const animationQueues: Record<string, QueuedAnimation> = {
    loadElectronsIntoMusashi: {
        lockedButtons: musashiActionLocks,

        steps: [
            {
                type: "resetTrap",
                trapId: "musashi",
                duration: 400,
                preserveSpecies: [],
            },
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "loadElectrons1",
                duration: 300,
            },
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "loadElectrons2",
                duration: 300,
            },
            {
                type: "move",
                duration: 500,
                particles: [
                    {
                        species: "electron",
                        route: inTrapRoute("musashi", 250, 52),
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "musashi",
                        stageKey: "loadElectrons3",
                        duration: 300,
                    },
                    {
                        type: "move",
                        duration: 300,
                        particles: [
                            {
                                species: "electron",
                                route: inTrapRoute("musashi", 64, 240),
                            },
                        ],
                    },
                ],
            },
            {
                type: "move",
                duration: 500,
                particles: [
                    {
                        species: "electron",
                        route: inTrapRoute("musashi", 240, 150),
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "musashi",
                        stageKey: "loadElectrons4",
                        duration: 300,
                    },
                    {
                        type: "move",
                        duration: 300,
                        particles: [
                            {
                                species: "electron",
                                route: inTrapRoute("musashi", 150, 166),
                            },
                        ],
                    },
                ],
            },
        ],
    },

    kickElectronsOutOfMusashi: {
        lockedButtons: musashiActionLocks,

        steps: [
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "kickElectrons1",
                duration: 100,
            },
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "kickElectrons2",
                duration: 520,
            },
            {
                type: "removePopulationFraction",
                trapId: "musashi",
                species: "electron",
                fraction: 0.99,
            },
            {
                type: "move",
                duration: 950,
                particles: [
                    {
                        species: "electron",
                        route: routes.electronsOutOfMusashi,
                    },
                ],
            },
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "kickElectrons3",
                duration: 180,
            },
        ],
    },

    trapAntiprotonsInMusashi: {
        lockedButtons: musashiActionLocks,

        steps: [
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "trapAntiprotons1",
                duration: 300,
            },
            {
                type: "move",
                duration: 500,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 0, 255),
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "musashi",
                        stageKey: "trapAntiprotons2",
                        duration: 100,
                    },
                    {
                        type: "move",
                        duration: 100,
                        particles: [
                            {
                                species: "antiproton",
                                route: inTrapRoute("musashi", 255, 255),
                            },
                        ],
                    },
                ],
            },
            {
                type: "move",
                duration: 400,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 255, 52),
                    },
                ],
            },
            {
                type: "move",
                duration: 500,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 52, 250),
                    },
                ],
            },
            {
                type: "move",
                duration: 600,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 220, 84),
                    },
                ],
            },
            {
                type: "move",
                duration: 700,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 110, 200),
                    },
                ],
            },
            {
                type: "move",
                duration: 1400,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 180, 145),
                    },
                ],
            },
            {
                type: "move",
                duration: 2000,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 145, 167),
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "musashi",
                        stageKey: "trapAntiprotons3",
                        duration: 300,
                    },
                    {
                        type: "move",
                        duration: 300,
                        particles: [
                            {
                                species: "antiproton",
                                route: inTrapRoute("musashi", 167, 167),
                            },
                        ],
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "musashi",
                        stageKey: "trapAntiprotons4",
                        duration: 300,
                    },
                    {
                        type: "move",
                        duration: 300,
                        particles: [
                            {
                                species: "antiproton",
                                route: inTrapRoute("musashi", 167, 167),
                            },
                        ],
                    },
                ],
            },
        ],
    },

    transferAntiprotonsMusashiToCusp: {
        lockedButtons: musashiToCuspTransferLocks,

        steps: [
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "musashi",
                        stageKey: "transferAntiprotons1",
                        duration: 300,
                    },
                    {
                        type: "stage",
                        trapId: "cusp",
                        stageKey: "receiveAntiprotons1",
                        duration: 300,
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "move",
                        duration: 1800,
                        particles: [
                            {
                                species: "antiproton",
                                route: routes.antiprotonsMusashiToCusp,
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "wait",
                                duration: 540,
                            },
                            {
                                type: "stage",
                                trapId: "musashi",
                                stageKey: "transferAntiprotons2",
                                duration: 120,
                            },
                            {
                                type: "wait",
                                duration: 330,
                            },
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "receiveAntiprotons1",
                                duration: 120,
                            },
                            {
                                type: "stage",
                                trapId: "musashi",
                                stageKey: "transferAntiprotons3",
                                duration: 120,
                            },
                            {
                                type: "wait",
                                duration: 420,
                            },
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "receiveAntiprotons3",
                                duration: 120,
                            },
                        ],
                    },
                ],
            },
        ],
    },

    transferPositronsSourceBgtToStacker: {
        lockedButtons: sourceBgtToStackerTransferLocks,

        steps: [
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "sourceBgt",
                        stageKey: "transferToStacker1",
                        duration: 500,
                    },
                    {
                        type: "stage",
                        trapId: "stacker",
                        stageKey: "receivePositrons1",
                        duration: 500,
                    },
                    {
                        type: "move",
                        duration: 500,
                        particles: [
                            {
                                species: "positron",
                                route: inTrapRoute("sourceBgt", 15, 15),
                            },
                        ],
                    },
                ],
            },

            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "sourceBgt",
                        stageKey: "transferToStacker2",
                        duration: 400,
                    },
                    {
                        type: "move",
                        duration: 500,
                        particles: [
                            {
                                species: "positron",
                                route: inTrapRoute("sourceBgt", 15, 15),
                            },
                        ],
                    },
                ],
            },

            {
                type: "sequence",
                steps: [
                    {
                        type: "move",
                        duration: 800,
                        particles: [
                            {
                                species: "positron",
                                route: routes.positronsBgtToStacker,
                            },
                        ],
                    },
                    {
                        type: "parallel",
                        steps: [
                            {
                                type: "stage",
                                trapId: "stacker",
                                stageKey: "receivePositrons2",
                                duration: 120,
                            },
                            {
                                type: "move",
                                duration: 120,
                                particles: [
                                    {
                                        species: "positron",
                                        route: inTrapRoute("stacker", 55, 55),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },

            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "sourceBgt",
                        stageKey: "loadPositrons1",
                        duration: 180,
                    },
                    {
                        type: "stage",
                        trapId: "stacker",
                        stageKey: "receivePositrons3",
                        duration: 180,
                    },
                    {
                        type: "move",
                        duration: 180,
                        particles: [
                            {
                                species: "positron",
                                route: inTrapRoute("stacker", 55, 55),
                            },
                        ],
                    },
                ],
            },
        ],
    },
transferPositronsStackerToCusp: {
        lockedButtons: stackerToCuspTransferLocks,

        steps: [
            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "stacker",
                        stageKey: "sendPositrons1",
                        duration: 180,
                    },
                    {
                        type: "resetTrap",
                        trapId: "cusp",
                        duration: 1,
                        preserveSpecies: ["positron"],
                    },
                    {
                        type: "stage",
                        trapId: "cusp",
                        stageKey: "receivePositrons1",
                        duration: 180,
                    },
                    {
                        type: "move",
                        duration: 180,
                        particles: [
                            {
                                species: "positron",
                                route: inTrapRoute("stacker", 55, 55),
                            },
                        ],
                    },
                ],
            },

            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "stacker",
                        stageKey: "sendPositrons2",
                        duration: 300,
                    },
                    {
                        type: "move",
                        duration: 300,
                        particles: [
                            {
                                species: "positron",
                                route: inTrapRoute("stacker", 55, 55),
                            },
                        ],
                    },
                ],
            },

            {
                type: "parallel",
                steps: [
                    {
                        type: "move",
                        duration: 4080,
                        particles: [
                            {
                                species: "positron",
                                route: routes.positronsStackerToCusp,
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "receivePositrons2",
                                duration: 180,
                            },
                            {
                                type: "wait",
                                duration: 2520,
                            },
                            {
                                type: "stage",
                                trapId: "stacker",
                                stageKey: "sendPositrons3",
                                duration: 300,
                            },
                            {
                                type: "wait",
                                duration: 1080,
                            },
                        ],
                    },
                ],
            },

            {
                type: "parallel",
                steps: [
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "move",
                                duration: 200,
                                particles: [
                                    {
                                        species: "positron",
                                        route: inTrapRoute("cusp", 210, 250),
                                    },
                                ],
                            },
                            {
                                type: "move",
                                duration: 200,
                                particles: [
                                    {
                                        species: "positron",
                                        route: inTrapRoute("cusp", 250, 150),
                                    },
                                ],
                            },
                            {
                                type: "move",
                                duration: 200,
                                particles: [
                                    {
                                        species: "positron",
                                        route: inTrapRoute("cusp", 150, 230),
                                    },
                                ],
                            },
                            {
                                type: "move",
                                duration: 200,
                                particles: [
                                    {
                                        species: "positron",
                                        route: inTrapRoute("cusp", 230, 200),
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "wait",
                                duration: 90,
                            },
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "receivePositrons3",
                                duration: 180,
                            },
                            {
                                type: "wait",
                                duration: 530,
                            },
                        ],
                    },
                ],
            },

            {
                type: "parallel",
                steps: [
                    {
                        type: "stage",
                        trapId: "cusp",
                        stageKey: "receivePositrons4",
                        duration: 180,
                    },
                    {
                        type: "move",
                        duration: 180,
                        particles: [
                            {
                                species: "positron",
                                route: inTrapRoute("cusp", 200, 200),
                            },
                        ],
                    },
                ],
            },
        ],
    },


loadElectronsIntoCusp: {
    lockedButtons: cuspButtonExecutionLocks,

        steps: [
            {
                type: "parallel",
                steps: [
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "loadElectrons1",
                                duration: 200,
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "resetTrap",
                                trapId: "cusp",
                                duration: 400,
                                preserveSpecies: ["positron"]
                            },

                            {
                                type: "move",
                                duration: 650,
                                particles: [
                                    {
                                        species: "electron",
                                        route: inTrapRoute("cusp", -10, 180),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "loadElectrons2",
                                duration: 200,
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "move",
                                duration: 600,
                                particles: [
                                    {
                                        species: "electron",
                                        route: inTrapRoute("cusp", 180, 50),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "loadElectrons3",
                                duration: 200,
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "move",
                                duration: 850,
                                particles: [
                                    {
                                        species: "electron",
                                        route: inTrapRoute("cusp", 50, 120),
                                    },
                                ],
                            },
                            {
                                type: "move",
                                duration: 1000,
                                particles: [
                                    {
                                        species: "electron",
                                        route: inTrapRoute("cusp", 120, 93),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                type: "parallel",
                steps: [
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "loadElectrons4",
                                duration: 200,
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "move",
                                duration: 200,
                                particles: [
                                    {
                                        species: "electron",
                                        route: inTrapRoute("cusp", 93, 93),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },

        ],
    },

kickElectronsOutOfCusp: {
    lockedButtons: cuspButtonExecutionLocks,

        steps: [
            {
                type: "stage",
                trapId: "cusp",
                stageKey: "kickElectrons1",
                duration: 400,
            },
            {
                type: "stage",
                trapId: "cusp",
                stageKey: "kickElectrons2",
                duration: 400,
            },
            {
                type: "sequence",
                steps: [
                    {
                        type: "stage",
                        trapId: "cusp",
                        stageKey: "kickElectrons3",
                        duration: 120,
                    },
                    {
                        type: "move",
                        duration: 200,
                        particles: [
                            {
                                species: "electron",
                                route: inTrapRoute("cusp", 93, -10),
                            },
                        ],
                    },
                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "kickElectrons4",
                                duration: 180,
                            },
                        ],
                    },


                    {
                        type: "sequence",
                        steps: [
                            {
                                type: "stage",
                                trapId: "cusp",
                                stageKey: "kickElectrons5",
                                duration: 180,
                            },
                        ],
                    },
                ],
            },
            {
                type: "removePopulationFraction",
                trapId: "cusp",
                species: "electron",
                fraction: 0.99,
            },
        ],
    },

mixPositronsAndAntiprotonsInCusp: {
  lockedButtons: cuspButtonExecutionLocks,

  steps: [
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix1",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 88, 88),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 88, 88),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix2",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 88, 110),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 88, 110),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix3",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 110, 120),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 110, 120),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix4",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 120, 135),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 120, 135),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix5",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 135, 140),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 135, 140),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix6",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 140, 160),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 140, 160),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix7",
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 160, 160),
          duration: 600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 160, 160),
          duration: 600,
        },
      ],
    },
    {
      type: "parallel",
      steps: [
        {
          type: "stage",
          trapId: "cusp",
          stageKey: "mix8",
          duration: 2600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "positron",
          route: inTrapRoute("cusp", 210, 210),
          duration: 2600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "antiproton",
          route: inTrapRoute("cusp", 160, 165),
          duration: 2600,
        },
        {
          type: "moveStoredPopulation",
          trapId: "cusp",
          species: "electron",
          route: inTrapRoute("cusp", 160, 165),
          duration: 2600,
        },
      ],
    },
  ],
},

analyzeCuspPlasma: {
    lockedButtons: cuspButtonExecutionLocks,

        steps: [
            {
                type: "parallel",
                steps: [
                    {
                        type: "move",
                        duration: 2400,
                        particles: [
                            {
                                species: "antiproton",
                                route: routes.antiprotonsCuspToUs,
                            },
                        ],
                    },
                    {
                        type: "move",
                        duration: 900,
                        particles: [
                            {
                                species: "positron",
                                route: routes.positronsCuspToUs,
                            },
                        ],
                    },
                ],
            },
        ],
    },

};
