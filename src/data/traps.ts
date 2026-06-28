import type { ComponentType, SVGProps } from "react";
import type { Electrode } from "./electrodes";

import MusashiSvg from "../assets/MUSASHI.svg?react";
import CuspSvg from "../assets/Cusp.svg?react";
import SourceBgtSvg from "../assets/BGT.svg?react";
import StackerSvg from "../assets/StackerMin.svg?react";

export type TrapId = "musashi" | "cusp" | "sourceBgt" | "stacker";

export type TrapConfig = {
  id: TrapId;
  name: string;
  Svg: ComponentType<SVGProps<SVGSVGElement>>;
  electrodes: Electrode[];
  initialVoltages: number[];
  potentialYAxis: {
    yMin: number;
    yMax: number;
  };
};

const musashiElectrodes: Electrode[] = [
  { name: "h13", left: 0.0, right: 55.0, initialVoltage: 0 },
  { name: "h12", left: 55.0, right: 80.0, initialVoltage: 0 },
  { name: "h11", left: 80.0, right: 105.0, initialVoltage: 0 },
  { name: "h10", left: 105.0, right: 126.0, initialVoltage: 0 },
  { name: "h9", left: 126.0, right: 155.0, initialVoltage: 0 },
  { name: "h8", left: 155.0, right: 180.0, initialVoltage: 0 },
  { name: "h7", left: 180.0, right: 230.0, initialVoltage: 0 },
  { name: "h6", left: 230.0, right: 255.0, initialVoltage: 0 },
  { name: "h5", left: 255.0, right: 300.0, initialVoltage: 0 },
  { name: "h4", left: 245.0, right: 300.0, initialVoltage: 0 },
];

const cuspElectrodes: Electrode[] = [
  { name: "u13", left: 0.0, right: 55.0, initialVoltage: 0 },
  { name: "u12", left: 55.0, right: 80.0, initialVoltage: 0 },
  { name: "u11", left: 80.0, right: 105.0, initialVoltage: 0 },
  { name: "u10", left: 105.0, right: 126.0, initialVoltage: 0 },
  { name: "u9", left: 126.0, right: 155.0, initialVoltage: 0 },
  { name: "u8", left: 155.0, right: 180.0, initialVoltage: 0 },
  { name: "u7", left: 180.0, right: 230.0, initialVoltage: 0 },
  { name: "u6", left: 230.0, right: 255.0, initialVoltage: 0 },
  { name: "u5", left: 255.0, right: 276.0, initialVoltage: 0 },
  { name: "u4", left: 276.0, right: 300.0, initialVoltage: 0 },
];

const sourceBgtElectrodes: Electrode[] = [
  { name: "s1", left: 0.0, right: 5.0, initialVoltage: 0 },
  { name: "s2", left: 5.0, right: 20.0, initialVoltage: 0 },
  { name: "s3", left: 20.0, right: 65.0, initialVoltage: 0 },
  { name: "s4", left: 65.0, right: 125.0, initialVoltage: 0 },
  { name: "s5", left: 125.0, right: 140.0, initialVoltage: 0 },
  { name: "s6", left: 125.0, right: 140.0, initialVoltage: 0 },
];


const stackerElectrodes: Electrode[] = [
  { name: "st1", left: 0.0, right: 40.0, initialVoltage: 0 },
  { name: "st2", left: 40.0, right: 80.0, initialVoltage: 0 },
  { name: "st3", left: 80.0, right: 120.0, initialVoltage: 0 },
  { name: "st4", left: 120.0, right: 160.0, initialVoltage: 0 },
  { name: "st5", left: 160.0, right: 200.0, initialVoltage: 0 },
];

export const traps: Record<TrapId, TrapConfig> = {
  musashi: {
    id: "musashi",
    name: "Antiproton trap",
    Svg: MusashiSvg,
    electrodes: musashiElectrodes,
    initialVoltages: [30, 30, 30, 30, 0, 30, 30, 30, 30, 120],
    potentialYAxis: {
      yMin: 80,
      yMax: -400,
    },
  },

  cusp: {
    id: "cusp",
    name: "Mixing trap",
    Svg: CuspSvg,
    electrodes: cuspElectrodes,
    initialVoltages: [0, 0, 50, 0, 0, 0, -100, 0, 0, 0],
    potentialYAxis: {
      yMin: -130,
      yMax: 130,
    },
  },

  sourceBgt: {
    id: "sourceBgt",
    name: "Positron system",
    Svg: SourceBgtSvg,
    electrodes: sourceBgtElectrodes,
    initialVoltages: [10, -18, -5, -5, 7,0],
    potentialYAxis: {
      yMin: -50,
      yMax: 50,
    },
  },

  stacker: {
    id: "stacker",
    name: "Accumulator",
    Svg: StackerSvg,
    electrodes: stackerElectrodes,
    initialVoltages: [30, 13, 15, 19, 30],
    potentialYAxis: {
      yMin: -50,
      yMax: 50,
    },
  },
};