import type { TrapId } from "./traps";

export type Species = "antiproton" | "electron" | "positron";

export type StoredPopulation = {
  id: string;
  species: Species;
  trapId: TrapId;
  z: number;
  /**
   * Internal growth coordinate. For source loading this is the accumulated
   * number of loading pulses/events. It is not shown directly to the user.
   */
  growthInput: number;
  /**
   * Hidden particle amount. This is the number that Analyze plasma can report.
   */
  particleNumber: number;
  /**
   * Visible marker size in the trap/transport graphics.
   */
  radius: number;
  color: string;
};

export type TrapParticleMarker = {
  id: string;
  species: Species;
  z: number;
  color: string;
  radius: number;
};

export const speciesColors: Record<Species, string> = {
  antiproton: "#2563eb",
  electron: "#22c55e",
  positron: "#ef4444",
};

export const speciesLabels: Record<Species, string> = {
  antiproton: "p̄",
  electron: "e−",
  positron: "e+",
};

export type ParticleGrowthSettings = {
  minRadius: number;
  maxRadius: number;
  /** Maximum hidden particle number for this species/trap combination. */
  nMax: number;
  /** Folding coordinate in the growth model N(x)=Nmax*(1-exp(-x/Nfold)). */
  nFold: number;
};

export const defaultParticleGrowthSettings: Record<Species, ParticleGrowthSettings> = {
  antiproton: { minRadius: 8, maxRadius: 30, nMax: 1_000, nFold: 4 },
  electron: { minRadius: 5, maxRadius: 18, nMax: 5_000, nFold: 5 },
  positron: { minRadius: 4, maxRadius: 30, nMax: 100_000, nFold: 8 },
};

export const trapParticleGrowthSettings: Record<
  TrapId,
  Partial<Record<Species, Partial<ParticleGrowthSettings>>>
> = {
  sourceBgt: {
    positron: {
      minRadius: 2,
      maxRadius: 6,
      nMax: 100_000,
      nFold: 2,
    },
  },

  stacker: {
    positron: {
      minRadius: 8,
      maxRadius: 20,
      nMax: 10_000_000,
      nFold: 15,
    },
  },

  cusp: {
    positron: {
      minRadius: 8,
      maxRadius: 30,
      nMax: 300_000_000,
      nFold: 6,
    },
    antiproton: {
      minRadius: 5,
      maxRadius: 10,
      nMax: 5_000_000,
      nFold: 5,
    },
    electron: {
      minRadius: 2,
      maxRadius: 20,
      nMax: 1_000_000_000,
      nFold: 1,
    },
  },

  musashi: {
    antiproton: {
      minRadius: 4,
      maxRadius: 20,
      nMax: 10_000_000,
      nFold: 5,
    },
    electron: {
      minRadius: 2,
      maxRadius: 20,
      nMax: 1_000_000_000,
      nFold: 1,
    },
  },
};

export function particleGrowthSettingsForTrap(
  species: Species,
  trapId: TrapId
): ParticleGrowthSettings {
  return {
    ...defaultParticleGrowthSettings[species],
    ...(trapParticleGrowthSettings[trapId][species] ?? {}),
  };
}

export function particleNumberFromGrowthInput(
  x: number,
  { nMax, nFold }: ParticleGrowthSettings
) {
  const safeNFold = Math.max(nFold, 0.000001);
  const clampedX = Math.max(x, 0);

  return nMax * (1 - Math.exp(-clampedX / safeNFold));
}

export function radiusFromParticleNumber(
  particleNumber: number,
  { minRadius, maxRadius, nMax }: ParticleGrowthSettings
) {
  const safeNMax = Math.max(nMax, 0.000001);
  const normalized = Math.min(Math.max(particleNumber / safeNMax, 0), 1);

  return minRadius + (maxRadius - minRadius) * normalized;
}

export function populationMetricsFromGrowthInput(
  growthInput: number,
  settings: ParticleGrowthSettings
) {
  const particleNumber = particleNumberFromGrowthInput(growthInput, settings);
  const radius = radiusFromParticleNumber(particleNumber, settings);

  return { particleNumber, radius };
}

export function populationMetricsForTrap(
  growthInput: number,
  species: Species,
  trapId: TrapId
) {
  return populationMetricsFromGrowthInput(
    growthInput,
    particleGrowthSettingsForTrap(species, trapId)
  );
}

export function populationId(trapId: TrapId, species: Species) {
  return `${trapId}-${species}`;
}
