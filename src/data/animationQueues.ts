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
        type: "resetTrap";
        trapId: TrapId;
        duration: number;
        preserveSpecies?: Species[];
    }
    | {
        type: "wait";
        duration: number;
    }
    | {
        type: "parallel";
        steps: QueuedActionStep[];
    };

export type QueuedAnimation = {
    lockedButtons?: ButtonLockId[];
    steps: QueuedActionStep[];
};

const { routes } = transportLayout;

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

export const animationQueues = {
    loadElectronsIntoMusashi: {
        lockedButtons: [
            "musashi.loadElectrons",
            "musashi.kickElectrons",
            "musashi.trapAntiprotons",
            "musashi.transferAntiprotons",
        ],

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
        lockedButtons: [
            "musashi.loadElectrons",
            "musashi.kickElectrons",
            "musashi.trapAntiprotons",
            "musashi.transferAntiprotons",
        ],

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
                fraction: 0.8,
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
        lockedButtons: [
            "musashi.loadElectrons",
            "musashi.kickElectrons",
            "musashi.trapAntiprotons",
            "musashi.transferAntiprotons",
        ],

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
                        route: routes.antiprotonsIntoMusashi,
                    },
                ],
            },
            {
                type: "stage",
                trapId: "musashi",
                stageKey: "trapAntiprotons2",
                duration: 100,
            },
            {
                type: "move",
                duration: 400,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 250, 52),
                    },
                ],
            },
            {
                type: "move",
                duration: 500,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 64, 250),
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
                        route: inTrapRoute("musashi", 180, 120),
                    },
                ],
            },
            {
                type: "move",
                duration: 2000,
                particles: [
                    {
                        species: "antiproton",
                        route: inTrapRoute("musashi", 120, 160),
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
                                stageKey: "receiveAntiprotons2",
                                duration: 120,
                            },
                            {
                                type: "wait",
                                duration: 150,
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
} satisfies Record<string, QueuedAnimation>;
