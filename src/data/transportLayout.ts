import type { TrapId } from "./traps";

export type Point = {
  x: number;
  y: number;
};

export type RouteSegment = {
  start: Point;
  end: Point;
  trapId?: TrapId;
  trapZStart?: number;
  trapZEnd?: number;
  showOverlay: boolean;
};

export const transportLayout = {
  canvas: {
    width: 1500,
    height: 1500,
  },

  panels: {
    musashi: {
      left: 0,
      top: 0,
      width: 500,
    },
    cusp: {
      left: 1000,
      top: 0,
      width: 500,
    },
    stacker: {
      left: 650,
      top: 550,
      width: 300,
    },
    sourceBgt: {
      left: 1000,
      top: 550,
      width: 300,
    },
  } satisfies Record<TrapId, { left: number; top: number; width: number }>,


    source: {
    positron: {
      x: 1400,
      y: 675,
      width: 80,
      height: 80,
      label: "Positron source",
      labelOffsetY: -58,
    },
  },

  arrows: {

    antiproton: {
      color: "#2564eb6e",
      start: { x: 500, y: 130 },
      end: { x: 1000, y: 130 },
    },

    positronToStacker: {
      color: "#ef444463",
      start: { x: 1000, y: 675 },
      end: { x: 950, y: 675 },
    },

    positronToCusp: {
      color: "#ef444463",
      points: [
        { x: 650, y: 675 },
        { x: 610, y: 675 },
        { x: 610, y: 135 },
        { x: 1000, y: 135 },
      ],
    },
  },

 routes: {
    electronsIntoMusashi: [
      {
        start: { x: 500, y: 250 },
        end: { x: 250, y: 250 },
        trapId: "musashi",
        trapZStart: 300,
        trapZEnd: 140,
        showOverlay: false,
      },
    ],

    electronsOutOfMusashi: [
      {
        start: { x: 240, y: 250 },
        end: { x: 520, y: 250 },
        trapId: "musashi",
        trapZStart: 150,
        trapZEnd: 300,
        showOverlay: false,
      },

    ],

    antiprotonsIntoMusashi: [
      {
        start: { x: 120, y: 310 },
        end: { x: 280, y: 310 },
        trapId: "musashi",
        trapZStart: -60,
        trapZEnd: 140,
        showOverlay: false,
      },
    ],

    antiprotonsMusashiToCusp: [
      {
        start: { x: 520, y: 130 },
        end: { x: 960, y: 130 },
        trapId: "musashi",
        trapZStart: 160,
        trapZEnd: 260,
        showOverlay: false,
      },
      {
        start: { x: 520, y: 130 },
        end: { x: 1000, y: 130 },
        trapId: "musashi",
        trapZStart: 300,
        trapZEnd: 900,
        showOverlay: true,
      },
      {
        start: { x: 960, y: 250 },
        end: { x: 1120, y: 250 },
        trapId: "cusp",
        trapZStart: 20,
        trapZEnd: 110,
        showOverlay: false,
      },
    ],

    antiprotonsCuspToUs: [
      {
        start: { x: 1120, y: 130 },
        end: { x: 500, y: 130 },
        trapId: "cusp",
        trapZStart: 110,
        trapZEnd: -20,
        showOverlay: false,
      },
      {
        start: { x: 960, y: 130 },
        end: { x: 850, y: 130 },
        trapId: "cusp",
        trapZStart: 20,
        trapZEnd: -80,
        showOverlay: true,
      },
    ],

    electronsIntoCusp: [
      {
        start: { x: 960, y: 310 },
        end: { x: 1120, y: 310 },
        trapId: "cusp",
        trapZStart: 20,
        trapZEnd: 110,
        showOverlay: false,
      },
    ],

    electronsOutOfCuspToUs: [
      {
        start: { x: 1120, y: 330 },
        end: { x: 960, y: 330 },
        trapId: "cusp",
        trapZStart: 110,
        trapZEnd: -20,
        showOverlay: false,
      },
    ],

    positronsSourceToBgt: [
      {
        start: { x: 1400, y: 750 },
        end: { x: 1200, y: 750 },
        trapId: "sourceBgt",
        trapZStart: 167,
        trapZEnd: 10,
        showOverlay: false,
      },
    ],

    positronsBgtToStacker: [
      {
        start: { x: 520, y: 750 },
        end: { x: 460, y: 750 },
        trapId: "sourceBgt",
        trapZStart: 10,
        trapZEnd: -50,
        showOverlay: false,
      },
      {
        start: { x: 540, y: 750 },
        end: { x: 720, y: 750 },
        trapId: "stacker",
        trapZStart: 220,
        trapZEnd: 100,
        showOverlay: false,
      },
    ],
    positronsStackerToCusp: [
      {
        start: { x: 650, y: 750  },
        end: { x: 650, y: 750 },
        trapId: "stacker",
        trapZStart: 100,
        trapZEnd: 0,
        showOverlay: false,
      },
      { 
        start: { x: 610, y: 650 },
        end: { x: 610, y: 130 },
        trapId: "cusp",
        trapZStart: -100,
        trapZEnd: -50,
        showOverlay: true,
      },
     { 
        start: { x: 610, y: 130 },
        end: { x: 1000, y: 130 },
        trapId: "cusp",
        trapZStart: -100,
        trapZEnd: -40,
        showOverlay: true,
      },
      {
        start: { x: 900, y: 450 },
        end: { x: 650, y: 280 },
        trapId: "cusp",
        trapZStart: -40,
        trapZEnd: 200,
        showOverlay: false,
      },
    ],

    positronsCuspToUs: [
      {
        start: { x: 1120, y: 360 },
        end: { x: 960, y: 360 },
        trapId: "cusp",
        trapZStart: 110,
        trapZEnd: 20,
        showOverlay: false,
      },
      {
        start: { x: 960, y: 360 },
        end: { x: 850, y: 360 },
        trapId: "cusp",
        trapZStart: 20,
        trapZEnd: -80,
        showOverlay: true,
      },
    ],
  }
};