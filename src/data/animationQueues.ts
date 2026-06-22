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
            route: inTrapRoute("musashi", 240, 64),
          },
        ],
      },
      {
        type: "move",
        duration: 500,
        particles: [
          {
            species: "antiproton",
            route: inTrapRoute("musashi", 64, 240),
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
            route: inTrapRoute("musashi", 84, 200),
          },
        ],
      },
      {
        type: "move",
        duration: 1400,
        particles: [
          {
            species: "antiproton",
            route: inTrapRoute("musashi", 200, 120),
          },
        ],
      },
      {
        type: "move",
        duration: 2000,
        particles: [
          {
            species: "antiproton",
            route: inTrapRoute("musashi", 120, 170),
          },
        ],
      },
      {
        type: "stage",
        trapId: "musashi",
        stageKey: "trapAntiprotons3",
        duration: 180,
      },
        {
        type: "stage",
        trapId: "musashi",
        stageKey: "trapAntiprotons4",
        duration: 180,
      },
    ],
  },
} satisfies Record<string, QueuedAnimation>;
