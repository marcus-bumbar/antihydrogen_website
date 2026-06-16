import type { Electrode } from "../data/electrodes";

const smoothingLength = 4.0;

export function electrodeInfluence(
  z: number,
  left: number,
  right: number
) {
  return (
    (Math.atan((z - left) / smoothingLength) -
      Math.atan((z - right) / smoothingLength)) /
    Math.PI
  );
}

export function computePotential(
  zValues: number[],
  voltages: number[],
  electrodes: Electrode[]
) {
  return zValues.map((z) =>
    computePotentialAtZ(z, voltages, electrodes)
  );
}

export function computePotentialAtZ(
  z: number,
  voltages: number[],
  electrodes: Electrode[]
) {
  return electrodes.reduce((sum, electrode, i) => {
    return (
      sum +
      voltages[i] *
        electrodeInfluence(z, electrode.left, electrode.right)
    );
  }, 0);
}