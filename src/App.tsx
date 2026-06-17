import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { traps, type TrapId } from "./data/traps";
import { transportLayout, type RouteSegment } from "./data/transportLayout";
import { actionSequences, type StageStep } from "./data/actionSequences";
import { trapStagesByTrap } from "./data/trapStages";
import {
  particleGrowthSettingsForTrap,
  populationId,
  populationMetricsForTrap,
  radiusFromParticleNumber,
  speciesColors,
  speciesLabels,
  type Species,
  type StoredPopulation,
  type TrapParticleMarker,
} from "./data/particles";
import { TrapPanel } from "./components/TrapPanel";
import {
  TransportOverlay,
  type OverlayParticle,
} from "./components/TransportOverlay";

const layoutSettings = {
  contentWidth: `${transportLayout.canvas.width}px`,
  plotLeftMargin: 60,
  plotRightMargin: 20,
  svgLeftPadding: 60,
  svgRightPadding: 20,
  svgScale: 1.0,
};

const particleSpeed = 300; // pixels per second
const stageOnlyDuration = 1800; // milliseconds
const voltageMorphDuration = 520; // milliseconds
const minSourceActivityGBq: number = 0;
const maxSourceActivityGBq: number = 1.85;
const minSourceIntervalSeconds: number = 0.5;
const maxSourceIntervalSeconds: number = 2;
const minBgtAccumulationTimeSeconds: number = 0.5;
const maxBgtAccumulationTimeSeconds: number = 8;
const minBgtStackCount: number = 1;
const maxBgtStackCount: number = 20;
const minAccumulatorToCuspTransferCount: number = 1;
const maxAccumulatorToCuspTransferCount: number = 10;
const autoTransferSettlingDelay = 120; // milliseconds
const electronKickRemovalFraction = 0.8;

const antiprotonMusashiTrapFractionWithoutElectrons = 0.1;
const antiprotonCuspTrapFractionWithoutElectrons = 0.3;
const antiprotonCuspTransferFractionWithManyElectrons = 0.5;
const cuspElectronThresholdForReducedAntiprotonTransfer = 100_000;

const positronBgtToAccumulatorTransferFraction = 1.0;
const positronAccumulatorToCuspTransferFraction = 1.0;

const minimumRemainingParticleNumber = 1;

function sourceIntervalFromActivityGBq(activityGBq: number) {
  const normalized =
    maxSourceActivityGBq === minSourceActivityGBq
      ? 0
      : (activityGBq - minSourceActivityGBq) /
        (maxSourceActivityGBq - minSourceActivityGBq);

  const clamped = Math.min(Math.max(normalized, 0), 1);

  return (
    maxSourceIntervalSeconds -
    clamped * (maxSourceIntervalSeconds - minSourceIntervalSeconds)
  );
}

type MovingBunch = {
  id: string;
  species: Species;
  color: string;
  radius: number;
  route: RouteSegment[];
  x: number;
  y: number;
  trapId: TrapId | null;
  trapZ: number | null;
  showOverlay: boolean;
};

type PopulationMap = Record<TrapId, Partial<Record<Species, StoredPopulation>>>;
type TrapStageKeys = Record<TrapId, string>;
type TrapVoltages = Record<TrapId, number[]>;

type ActionConfig = {
  sequence?: StageStep[];
  preSequence?: StageStep[];
  postSequence?: StageStep[];

  preDuration?: number;
  duration?: number;
  postDuration?: number;

  /**
   * Traps whose control buttons should be disabled while this action runs.
   */
  busyTrapIds?: TrapId[];

  route?: RouteSegment[];
  species?: Species;
  particleRadius?: number;

  source?: {
    trapId: TrapId;
    species: Species;
    amount?: number;
    particleFraction?: number;
  };

  destination?: {
    trapId: TrapId;
    species: Species;
    z: number;
    growthInput?: number;
    particleNumber?: number;
    radius?: number;
  };

  removePopulation?: {
    trapId: TrapId;
    species: Species;
  };

  onComplete?: () => void;
};

function segmentLength(segment: RouteSegment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function totalRouteLength(route: RouteSegment[]) {
  return route.reduce((sum, segment) => sum + segmentLength(segment), 0);
}

function bunchStateFromRoute(
  bunch: Pick<MovingBunch, "id" | "species" | "color" | "radius" | "route">,
  progress: number
): MovingBunch {
  const route = bunch.route;
  const totalLength = totalRouteLength(route);

  if (route.length === 0) {
    return {
      ...bunch,
      x: 0,
      y: 0,
      trapId: null,
      trapZ: null,
      showOverlay: false,
    };
  }

  if (totalLength === 0) {
    const first = route[0];

    return {
      ...bunch,
      x: first.start.x,
      y: first.start.y,
      trapId: first.trapId ?? null,
      trapZ: first.trapZStart ?? null,
      showOverlay: first.showOverlay,
    };
  }

  const targetDistance = progress * totalLength;
  let cumulative = 0;

  for (const segment of route) {
    const length = segmentLength(segment);

    if (targetDistance <= cumulative + length) {
      const localDistance = targetDistance - cumulative;
      const f = length === 0 ? 0 : localDistance / length;

      const x = segment.start.x + (segment.end.x - segment.start.x) * f;
      const y = segment.start.y + (segment.end.y - segment.start.y) * f;

      let trapId: TrapId | null = null;
      let trapZ: number | null = null;

      if (
        segment.trapId &&
        segment.trapZStart !== undefined &&
        segment.trapZEnd !== undefined
      ) {
        trapId = segment.trapId;
        trapZ =
          segment.trapZStart + (segment.trapZEnd - segment.trapZStart) * f;
      }

      return {
        ...bunch,
        x,
        y,
        trapId,
        trapZ,
        showOverlay: segment.showOverlay,
      };
    }

    cumulative += length;
  }

  const last = route[route.length - 1];

  return {
    ...bunch,
    x: last.end.x,
    y: last.end.y,
    trapId: last.trapId ?? null,
    trapZ: last.trapZEnd ?? null,
    showOverlay: last.showOverlay,
  };
}

function createEmptyPopulations(): PopulationMap {
  return {
    musashi: {},
    cusp: {},
    sourceBgt: {},
    stacker: {},
  };
}

function addPopulation(
  populations: PopulationMap,
  trapId: TrapId,
  species: Species,
  z: number,
  growthInput = 1,
  preserved?: { particleNumber: number; radius: number }
): PopulationMap {
  const existing = populations[trapId][species];
  const settings = particleGrowthSettingsForTrap(species, trapId);

  let nextGrowthInput = (existing?.growthInput ?? 0) + growthInput;
  let nextParticleNumber: number;
  let nextRadius: number;

  if (preserved) {
    nextParticleNumber = (existing?.particleNumber ?? 0) + preserved.particleNumber;
    nextRadius = existing
      ? radiusFromParticleNumber(nextParticleNumber, settings)
      : preserved.radius;
  } else {
    const metrics = populationMetricsForTrap(nextGrowthInput, species, trapId);
    nextParticleNumber = metrics.particleNumber;
    nextRadius = metrics.radius;
  }

  return {
    ...populations,
    [trapId]: {
      ...populations[trapId],
      [species]: existing
        ? {
            ...existing,
            growthInput: nextGrowthInput,
            particleNumber: nextParticleNumber,
            z,
            radius: nextRadius,
          }
        : {
            id: populationId(trapId, species),
            species,
            trapId,
            z,
            growthInput: nextGrowthInput,
            particleNumber: nextParticleNumber,
            radius: nextRadius,
            color: speciesColors[species],
          },
    },
  };
}

function removePopulation(
  populations: PopulationMap,
  trapId: TrapId,
  species: Species,
  growthInput = Infinity
): PopulationMap {
  const existing = populations[trapId][species];
  if (!existing) return populations;

  const nextGrowthInput = existing.growthInput - growthInput;
  const nextTrapPopulations = { ...populations[trapId] };

  if (nextGrowthInput > 0) {
    const metrics = populationMetricsForTrap(nextGrowthInput, species, trapId);

    nextTrapPopulations[species] = {
      ...existing,
      growthInput: nextGrowthInput,
      particleNumber: metrics.particleNumber,
      radius: metrics.radius,
    };
  } else {
    delete nextTrapPopulations[species];
  }

  return {
    ...populations,
    [trapId]: nextTrapPopulations,
  };
}

function clampFraction(fraction: number) {
  return Math.min(Math.max(fraction, 0), 1);
}

function removePopulationFraction(
  populations: PopulationMap,
  trapId: TrapId,
  species: Species,
  fractionToRemove: number
): PopulationMap {
  const existing = populations[trapId][species];
  if (!existing) return populations;

  const clampedFraction = clampFraction(fractionToRemove);
  const remainingParticleNumber =
    existing.particleNumber * (1 - clampedFraction);
  const remainingGrowthInput = existing.growthInput * (1 - clampedFraction);
  const nextTrapPopulations = { ...populations[trapId] };

  if (
    remainingParticleNumber <= minimumRemainingParticleNumber ||
    remainingGrowthInput <= 0
  ) {
    delete nextTrapPopulations[species];
  } else {
    const settings = particleGrowthSettingsForTrap(species, trapId);

    nextTrapPopulations[species] = {
      ...existing,
      growthInput: remainingGrowthInput,
      particleNumber: remainingParticleNumber,
      radius: radiusFromParticleNumber(remainingParticleNumber, settings),
    };
  }

  return {
    ...populations,
    [trapId]: nextTrapPopulations,
  };
}

function preservedPopulationPayload(
  particleNumber: number,
  species: Species,
  trapId: TrapId
) {
  const settings = particleGrowthSettingsForTrap(species, trapId);

  return {
    particleNumber,
    radius: radiusFromParticleNumber(particleNumber, settings),
  };
}

function stageForTrap(trapId: TrapId, stageKey: string) {
  const stages = trapStagesByTrap[trapId] as Record<
    string,
    { name: string; voltages: number[]; description: string }
  >;

  return stages[stageKey] ?? stages.idle;
}

function createInitialTrapVoltages(): TrapVoltages {
  return {
    musashi: stageForTrap("musashi", "idle").voltages,
    cusp: stageForTrap("cusp", "idle").voltages,
    sourceBgt: stageForTrap("sourceBgt", "idle").voltages,
    stacker: stageForTrap("stacker", "idle").voltages,
  };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolateVoltageArrays(
  from: number[],
  to: number[],
  progress: number
) {
  const length = Math.max(from.length, to.length);
  const result: number[] = [];

  for (let index = 0; index < length; index += 1) {
    const start = from[index] ?? from[from.length - 1] ?? 0;
    const end = to[index] ?? to[to.length - 1] ?? 0;
    result.push(start + (end - start) * progress);
  }

  return result;
}

function getLastTrapZ(route: RouteSegment[], trapId: TrapId) {
  for (let i = route.length - 1; i >= 0; i -= 1) {
    const segment = route[i];

    if (segment.trapId === trapId && segment.trapZEnd !== undefined) {
      return segment.trapZEnd;
    }
  }

  return 0;
}

function App() {
  const animationRefs = useRef<Set<number>>(new Set());
  const voltageAnimationRefs = useRef<Partial<Record<TrapId, number>>>({});
  const voltageValuesRef = useRef<TrapVoltages>(createInitialTrapVoltages());
  const sourceActivityIntervalRef = useRef<number | null>(null);
  const storedPopulationsRef = useRef<PopulationMap>(createEmptyPopulations());
  const autoTransferRunIdRef = useRef(0);
  const autoAccumulatorToCuspRunIdRef = useRef(0);

  const { canvas, panels, routes } = transportLayout;

  const [movingBunches, setMovingBunches] = useState<MovingBunch[]>([]);
  const [storedPopulations, setStoredPopulations] = useState<PopulationMap>(() =>
    createEmptyPopulations()
  );
  const [sourceIsActive, setSourceIsActive] = useState(false);
  const [sourceActivityGBq, setSourceActivityGBq] = useState(0.5);
  const [bgtAccumulationTimeSeconds, setBgtAccumulationTimeSeconds] = useState(2);
  const [bgtStackCount, setBgtStackCount] = useState(5);
  const [autoTransferIsRunning, setAutoTransferIsRunning] = useState(false);
  const [autoAccumulatorToCuspIsRunning, setAutoAccumulatorToCuspIsRunning] =
    useState(false);
  const [accumulatorToCuspTransferCount, setAccumulatorToCuspTransferCount] =
    useState(3);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);

  const sourceActivityIntervalSeconds = sourceIntervalFromActivityGBq(sourceActivityGBq);

  const [trapStageKeys, setTrapStageKeys] = useState<TrapStageKeys>({
    musashi: "idle",
    cusp: "idle",
    sourceBgt: "idle",
    stacker: "idle",
  });

  const [trapVoltages, setTrapVoltages] = useState<TrapVoltages>(() =>
    createInitialTrapVoltages()
  );

  useEffect(() => {
    storedPopulationsRef.current = storedPopulations;
  }, [storedPopulations]);

  useEffect(() => {
    return () => {
      animationRefs.current.forEach((frameId) => cancelAnimationFrame(frameId));
      animationRefs.current.clear();

      autoTransferRunIdRef.current += 1;
      autoAccumulatorToCuspRunIdRef.current += 1;

      if (sourceActivityIntervalRef.current !== null) {
        window.clearInterval(sourceActivityIntervalRef.current);
        sourceActivityIntervalRef.current = null;
      }


      (
        Object.values(voltageAnimationRefs.current) as Array<number | undefined>
      ).forEach((frameId) => {
        if (frameId !== undefined) cancelAnimationFrame(frameId);
      });

      voltageAnimationRefs.current = {};
    };
  }, []);

  useEffect(() => {
    if (!sourceIsActive) return;

    runSourceToBgtPulse();

    const intervalId = window.setInterval(
      runSourceToBgtPulse,
      sourceActivityIntervalSeconds * 1000
    );

    sourceActivityIntervalRef.current = intervalId;

    return () => {
      window.clearInterval(intervalId);

      if (sourceActivityIntervalRef.current === intervalId) {
        sourceActivityIntervalRef.current = null;
      }
    };
  }, [sourceIsActive, sourceActivityIntervalSeconds]);

  function setTrapVoltageArray(trapId: TrapId, voltages: number[]) {
    voltageValuesRef.current = {
      ...voltageValuesRef.current,
      [trapId]: voltages,
    };

    setTrapVoltages((current) => ({
      ...current,
      [trapId]: voltages,
    }));
  }

  function morphTrapVoltages(
    trapId: TrapId,
    targetVoltages: number[],
    duration = voltageMorphDuration
  ) {
    const existingFrameId = voltageAnimationRefs.current[trapId];

    if (existingFrameId !== undefined) {
      cancelAnimationFrame(existingFrameId);
    }

    const startVoltages = voltageValuesRef.current[trapId] ?? targetVoltages;
    const startTime = performance.now();

    function animateVoltageMorph(currentTime: number) {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(rawProgress);

      const nextVoltages = interpolateVoltageArrays(
        startVoltages,
        targetVoltages,
        easedProgress
      );

      setTrapVoltageArray(trapId, nextVoltages);

      if (rawProgress < 1) {
        const nextFrameId = requestAnimationFrame(animateVoltageMorph);
        voltageAnimationRefs.current[trapId] = nextFrameId;
      } else {
        setTrapVoltageArray(trapId, targetVoltages);
        delete voltageAnimationRefs.current[trapId];
      }
    }

    const frameId = requestAnimationFrame(animateVoltageMorph);
    voltageAnimationRefs.current[trapId] = frameId;
  }

  function setStageStep(step: StageStep) {
    setTrapStageKeys((current) => ({
      ...current,
      [step.trapId]: step.stageKey,
    }));

    const nextStage = stageForTrap(step.trapId, step.stageKey);
    morphTrapVoltages(step.trapId, nextStage.voltages);
  }

 async function runAction(config: ActionConfig) {
  const busyTrapIds = config.busyTrapIds ?? [];

  if (anyTrapBusy(busyTrapIds)) return;

  setTrapsBusy(busyTrapIds, true);

  try {
    const transportDuration =
      config.duration ??
      (config.route
        ? Math.max((totalRouteLength(config.route) / particleSpeed) * 1000, 1)
        : stageOnlyDuration);

    const preDuration = config.preDuration ?? voltageMorphDuration;
    const postDuration = config.postDuration ?? voltageMorphDuration;

    function applyStageSequence(sequence: StageStep[] = []) {
      const sortedSequence = [...sequence].sort((a, b) => a.at - b.at);

      sortedSequence.forEach((step) => {
        setStageStep(step);
      });
    }

    async function runStageOnlyPhase(
      sequence: StageStep[] | undefined,
      duration: number
    ) {
      if (!sequence || sequence.length === 0) return;

      applyStageSequence(sequence);

      await delay(duration);
    }

    function runTransportPhase() {
      return new Promise<void>((resolve) => {
        const sequence = [...(config.sequence ?? [])].sort((a, b) => a.at - b.at);
        const completedSteps = new Set<number>();
        const startTime = performance.now();

        let movingBunchId: string | null = null;

        if (config.route && config.species) {
          movingBunchId = `${config.species}-${crypto.randomUUID()}`;

          const initialBunch = bunchStateFromRoute(
            {
              id: movingBunchId,
              species: config.species,
              color: speciesColors[config.species],
              radius: config.particleRadius ?? 10,
              route: config.route,
            },
            0
          );

          setMovingBunches((current) => [...current, initialBunch]);
        }

        if (config.source) {
          setStoredPopulations((current) => {
            if (config.source!.particleFraction !== undefined) {
              return removePopulationFraction(
                current,
                config.source!.trapId,
                config.source!.species,
                config.source!.particleFraction
              );
            }

            return removePopulation(
              current,
              config.source!.trapId,
              config.source!.species,
              config.source!.amount ?? 1
            );
          });
        }

        function animate(currentTime: number) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / transportDuration, 1);

          sequence.forEach((step, index) => {
            if (!completedSteps.has(index) && progress >= step.at) {
              completedSteps.add(index);
              setStageStep(step);
            }
          });

          if (movingBunchId && config.route && config.species) {
            const nextBunch = bunchStateFromRoute(
              {
                id: movingBunchId,
                species: config.species,
                color: speciesColors[config.species],
                radius: config.particleRadius ?? 10,
                route: config.route,
              },
              progress
            );

            setMovingBunches((current) =>
              current.map((bunch) =>
                bunch.id === movingBunchId ? nextBunch : bunch
              )
            );
          }

          if (progress < 1) {
            const frameId = requestAnimationFrame(animate);
            animationRefs.current.add(frameId);
          } else {
            if (movingBunchId) {
              setMovingBunches((current) =>
                current.filter((bunch) => bunch.id !== movingBunchId)
              );
            }

            if (config.destination) {
              setStoredPopulations((current) =>
                addPopulation(
                  current,
                  config.destination!.trapId,
                  config.destination!.species,
                  config.destination!.z,
                  config.destination!.growthInput ?? 1,
                  config.destination!.particleNumber !== undefined &&
                    config.destination!.radius !== undefined
                    ? {
                        particleNumber: config.destination!.particleNumber,
                        radius: config.destination!.radius,
                      }
                    : undefined
                )
              );
            }

            if (config.removePopulation) {
              setStoredPopulations((current) =>
                removePopulation(
                  current,
                  config.removePopulation!.trapId,
                  config.removePopulation!.species
                )
              );
            }

            resolve();
          }
        }

        const frameId = requestAnimationFrame(animate);
        animationRefs.current.add(frameId);
      });
    }

    await runStageOnlyPhase(config.preSequence, preDuration);
    await runTransportPhase();
    await runStageOnlyPhase(config.postSequence, postDuration);

    config.onComplete?.();
  } finally {
    setTrapsBusy(busyTrapIds, false);
  }
}

  function toggleSourceToBgt() {
    setSourceIsActive((current) => !current);
  }

  function delay(milliseconds: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }
  function anyTrapBusy(trapIds: TrapId[]) {
      return trapIds.some((trapId) => busyTraps[trapId]);
    }

    function setTrapsBusy(trapIds: TrapId[], isBusy: boolean) {
      setBusyTraps((current) => {
        const next = { ...current };

        trapIds.forEach((trapId) => {
          next[trapId] = isBusy;
        });

        return next;
      });
    }

    function runActionOnlyIfPopulationExists({
      trapId,
      species,
      action,
    }: {
      trapId: TrapId;
      species: Species;
      action: () => void;
    }) {
      const population = storedPopulationsRef.current[trapId][species];

      if (!population) return;

      action();
    }

  function particleRadiusForTrapParticleNumber(
    particleNumber: number,
    species: Species,
    trapId: TrapId
  ) {
    return radiusFromParticleNumber(
      particleNumber,
      particleGrowthSettingsForTrap(species, trapId)
    );
  }

  function musashiAntiprotonTrappingFraction() {
    const electronsInMusashi =
      storedPopulationsRef.current.musashi.electron?.particleNumber ?? 0;

    return electronsInMusashi > 0
      ? 1
      : antiprotonMusashiTrapFractionWithoutElectrons;
  }

  function cuspAntiprotonTransferFraction() {
    const electronsInCusp =
      storedPopulationsRef.current.cusp.electron?.particleNumber ?? 0;

    if (electronsInCusp <= 0) {
      return antiprotonCuspTrapFractionWithoutElectrons;
    }

    if (electronsInCusp >= cuspElectronThresholdForReducedAntiprotonTransfer) {
      return antiprotonCuspTransferFractionWithManyElectrons;
    }

    return 1;
  }

  function trapAntiprotonsInMusashi() {
    const trappingFraction = musashiAntiprotonTrappingFraction();
    const fullMetrics = populationMetricsForTrap(1, "antiproton", "musashi");
    const trappedParticleNumber =
      fullMetrics.particleNumber * trappingFraction;
    const trappedRadius = particleRadiusForTrapParticleNumber(
      trappedParticleNumber,
      "antiproton",
      "musashi"
    );

    runAction({
      preSequence: actionSequences.trapAntiprotonsInMusashi.slice(0, 2),
      sequence: actionSequences.trapAntiprotonsInMusashi.slice(2),
      route: routes.antiprotonsIntoMusashi,
      species: "antiproton",
      particleRadius: trappedRadius,
      destination: {
        trapId: "musashi",
        species: "antiproton",
        z: getLastTrapZ(routes.antiprotonsIntoMusashi, "musashi"),
        growthInput: trappingFraction,
        particleNumber: trappedParticleNumber,
        radius: trappedRadius,
      },
    });
  }

  function transferAntiprotonsFromMusashiToCusp() {
    runTransferOnlyIfSourceHasParticles({
      preSequence: actionSequences.transferAntiprotonsToCusp.slice(0, 2),
      sequence: actionSequences.transferAntiprotonsToCusp.slice(2),
      route: routes.antiprotonsMusashiToCusp,
      species: "antiproton",
      sourceTrapId: "musashi",
      destinationTrapId: "cusp",
      transferFraction: cuspAntiprotonTransferFraction(),
    });
  }


  function runSourceToBgtPulse() {
    runAction({
      sequence: actionSequences.loadPositronsIntoSourceBgt,
      route: routes.positronsSourceToBgt,
      species: "positron",
      particleRadius: populationMetricsForTrap(
        1,
        "positron",
        "sourceBgt"
      ).radius,
      destination: {
        trapId: "sourceBgt",
        species: "positron",
        z: getLastTrapZ(routes.positronsSourceToBgt, "sourceBgt"),
      },
    });
  }

function runTransferOnlyIfSourceHasParticles({
  preSequence,
  sequence,
  postSequence,
  route,
  species,
  sourceTrapId,
  destinationTrapId,
  transferFraction = 1,
}: {
  preSequence?: StageStep[];
  sequence?: StageStep[];
  postSequence?: StageStep[];
  route: RouteSegment[];
  species: Species;
  sourceTrapId: TrapId;
  destinationTrapId: TrapId;
  transferFraction?: number;
}) {
    const sourcePopulation = storedPopulationsRef.current[sourceTrapId][species];

    if (!sourcePopulation) return;

    const clampedTransferFraction = clampFraction(transferFraction);

    const particleNumberToTransfer =
      sourcePopulation.particleNumber * clampedTransferFraction;
    const growthInputToTransfer =
      sourcePopulation.growthInput * clampedTransferFraction;

    if (particleNumberToTransfer <= minimumRemainingParticleNumber) return;

    const movingRadius = particleRadiusForTrapParticleNumber(
      particleNumberToTransfer,
      species,
      sourceTrapId
    );

    runAction({
      preSequence,
      sequence,
      postSequence,
      route,
      species,
      particleRadius: movingRadius,
      source: {
        trapId: sourceTrapId,
        species,
        particleFraction: clampedTransferFraction,
      },
      destination: {
        trapId: destinationTrapId,
        species,
        z: getLastTrapZ(route, destinationTrapId),
        growthInput: growthInputToTransfer,
        particleNumber: particleNumberToTransfer,
        radius: movingRadius,
      },
    });
  }

  function transferPositronsFromBgtToStacker() {
    runTransferOnlyIfSourceHasParticles({
      sequence: actionSequences.transferPositronsToStacker,
      route: routes.positronsBgtToStacker,
      species: "positron",
      sourceTrapId: "sourceBgt",
      destinationTrapId: "stacker",
      transferFraction: positronBgtToAccumulatorTransferFraction,
    });
  }

  function transferPositronsFromStackerToCusp() {
    runTransferOnlyIfSourceHasParticles({
      sequence: actionSequences.sendPositronsToCusp,
      route: routes.positronsStackerToCusp,
      species: "positron",
      sourceTrapId: "stacker",
      destinationTrapId: "cusp",
      transferFraction: positronAccumulatorToCuspTransferFraction,
    });
  }

  async function runAutoBgtToStackerTransfers() {
    if (autoTransferIsRunning) return;

    const runId = autoTransferRunIdRef.current + 1;
    autoTransferRunIdRef.current = runId;
    setAutoTransferIsRunning(true);

    const transferDuration = Math.max(
      (totalRouteLength(routes.positronsBgtToStacker) / particleSpeed) * 1000,
      1
    );

    for (let stackIndex = 0; stackIndex < bgtStackCount; stackIndex += 1) {
      if (autoTransferRunIdRef.current !== runId) break;

      await delay(bgtAccumulationTimeSeconds * 1000 + autoTransferSettlingDelay);

      if (autoTransferRunIdRef.current !== runId) break;

      transferPositronsFromBgtToStacker();

      await delay(transferDuration + autoTransferSettlingDelay);
    }

    if (autoTransferRunIdRef.current === runId) {
      setAutoTransferIsRunning(false);
    }
  }

  function stopAutoBgtToStackerTransfers() {
    autoTransferRunIdRef.current += 1;
    setAutoTransferIsRunning(false);
  }

  function toggleAutoBgtToStackerTransfers() {
    if (autoTransferIsRunning) {
      stopAutoBgtToStackerTransfers();
      return;
    }

    runAutoBgtToStackerTransfers();
  }

  async function runAutoAccumulatorToCuspTransfers() {
    if (autoAccumulatorToCuspIsRunning) return;

    const runId = autoAccumulatorToCuspRunIdRef.current + 1;
    autoAccumulatorToCuspRunIdRef.current = runId;
    setAutoAccumulatorToCuspIsRunning(true);

    const transferDuration = Math.max(
      (totalRouteLength(routes.positronsStackerToCusp) / particleSpeed) * 1000,
      1
    );

    for (
      let transferIndex = 0;
      transferIndex < accumulatorToCuspTransferCount;
      transferIndex += 1
    ) {
      if (autoAccumulatorToCuspRunIdRef.current !== runId) break;

      await delay(bgtAccumulationTimeSeconds * 1000 + autoTransferSettlingDelay);

      if (autoAccumulatorToCuspRunIdRef.current !== runId) break;

      transferPositronsFromStackerToCusp();

      await delay(transferDuration + autoTransferSettlingDelay);
    }

    if (autoAccumulatorToCuspRunIdRef.current === runId) {
      setAutoAccumulatorToCuspIsRunning(false);
    }
  }

  function stopAutoAccumulatorToCuspTransfers() {
    autoAccumulatorToCuspRunIdRef.current += 1;
    setAutoAccumulatorToCuspIsRunning(false);
  }

  function toggleAutoAccumulatorToCuspTransfers() {
    if (autoAccumulatorToCuspIsRunning) {
      stopAutoAccumulatorToCuspTransfers();
      return;
    }

    runAutoAccumulatorToCuspTransfers();
  }
  function clearAll() {
    autoTransferRunIdRef.current += 1;
    autoAccumulatorToCuspRunIdRef.current += 1;
    setAutoTransferIsRunning(false);
    setAutoAccumulatorToCuspIsRunning(false);
    setSourceIsActive(false);

    if (sourceActivityIntervalRef.current !== null) {
      window.clearInterval(sourceActivityIntervalRef.current);
      sourceActivityIntervalRef.current = null;
    }


    animationRefs.current.forEach((frameId) => cancelAnimationFrame(frameId));
    animationRefs.current.clear();

    (
      Object.values(voltageAnimationRefs.current) as Array<number | undefined>
    ).forEach((frameId) => {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
    });

    voltageAnimationRefs.current = {};

    const initialVoltages = createInitialTrapVoltages();
    voltageValuesRef.current = initialVoltages;

    setMovingBunches([]);
    setStoredPopulations(createEmptyPopulations());
    setAnalysisReport(null);

    setTrapStageKeys({
      musashi: "idle",
      cusp: "idle",
      sourceBgt: "idle",
      stacker: "idle",
    });

    setTrapVoltages(initialVoltages);
  }

  function mixPositronsAndAntiprotons() {
    runAction({
      sequence: actionSequences.mixPositronsAndAntiprotons,
      duration: stageOnlyDuration,
      onComplete: () => {
        setStoredPopulations((current) => {
          const afterAntiprotons = removePopulation(current, "cusp", "antiproton");
          return removePopulation(afterAntiprotons, "cusp", "positron");
        });
      },
    });
  }

  function analyzePlasma() {
    const cuspPopulations = (
      Object.values(storedPopulationsRef.current.cusp) as StoredPopulation[]
    ).filter(Boolean);

    if (cuspPopulations.length === 0) {
      setAnalysisReport("No plasma stored in the mixing trap.");
      return;
    }

    const reportLines = cuspPopulations.map(
      (population) =>
        `${speciesLabels[population.species]}: ${Math.round(
          population.particleNumber
        ).toLocaleString()} particles`
    );

    setAnalysisReport(reportLines.join("\n"));

    const antiprotonPopulation = cuspPopulations.find(
      (population) => population.species === "antiproton"
    );

    const positronPopulation = cuspPopulations.find(
      (population) => population.species === "positron"
    );

    setStoredPopulations((current) => ({
      ...current,
      cusp: {},
    }));

    if (antiprotonPopulation) {
      runAction({
        sequence: actionSequences.analyzeCuspPlasma,
        route: routes.antiprotonsCuspToUs,
        species: "antiproton",
        particleRadius: antiprotonPopulation.radius,
      });
    }

    if (positronPopulation) {
      runAction({
        sequence: actionSequences.analyzeCuspPlasma,
        route: routes.positronsCuspToUs,
        species: "positron",
        particleRadius: positronPopulation.radius,
      });
    }
  }


  const [busyTraps, setBusyTraps] = useState<Record<TrapId, boolean>>({
  musashi: false,
  cusp: false,
  sourceBgt: false,
  stacker: false,
});


  const trapParticles = useMemo<Record<TrapId, TrapParticleMarker[]>>(() => {
    const result: Record<TrapId, TrapParticleMarker[]> = {
      musashi: [],
      cusp: [],
      sourceBgt: [],
      stacker: [],
    };

    (Object.keys(storedPopulations) as TrapId[]).forEach((trapId) => {
      (Object.values(storedPopulations[trapId]) as StoredPopulation[]).forEach(
        (population) => {
          if (!population) return;

          result[trapId].push({
            id: population.id,
            species: population.species,
            z: population.z,
            color: population.color,
            radius: population.radius,
          });
        }
      );
    });

    movingBunches.forEach((bunch) => {
      if (bunch.trapId && bunch.trapZ !== null) {
        result[bunch.trapId].push({
          id: bunch.id,
          species: bunch.species,
          z: bunch.trapZ,
          color: bunch.color,
          radius: bunch.radius,
        });
      }
    });

    return result;
  }, [storedPopulations, movingBunches]);

  const overlayParticles = useMemo<OverlayParticle[]>(() => {
    return movingBunches.map((bunch) => ({
      id: bunch.id,
      x: bunch.x,
      y: bunch.y,
      color: bunch.color,
      radius: bunch.radius,
      showOverlay: bunch.showOverlay,
    }));
  }, [movingBunches]);

  return (
    <main
      style={{
        maxWidth: layoutSettings.contentWidth,
        margin: "0 auto",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section style={{ marginBottom: "1rem", textAlign: "center" }}>
        <h1 style={{ marginBottom: "0.75rem" }}>
          Antihydrogen transport sequence
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(230px, 1fr))",
            gap: "1rem",
            textAlign: "left",
            marginBottom: "1rem",
          }}
        >
          <ActionGroup title="Antiproton trap">
            <ActionButton
              onClick={() =>
                runAction({
                preSequence: actionSequences.loadElectronsIntoMusashi.slice(0, 2),
                sequence: actionSequences.loadElectronsIntoMusashi.slice(2),
                route: routes.electronsIntoMusashi,
                species: "electron",
                destination: {
                  trapId: "musashi",
                  species: "electron",
                  z: getLastTrapZ(routes.electronsIntoMusashi, "musashi"),
                },
              })
              }
            >
              Load electrons
            </ActionButton>



            <ActionButton onClick={trapAntiprotonsInMusashi}>
              Trap antiprotons
            </ActionButton>

            <ActionButton
              onClick={() =>
                runActionOnlyIfPopulationExists({
                  trapId: "musashi",
                  species: "electron",
                  action: () =>
                    runAction({
                      preSequence: actionSequences.kickElectronsFromMusashi.slice(0, 2),
                      sequence: actionSequences.kickElectronsFromMusashi.slice(2),
                      route: routes.electronsOutOfMusashi,
                      species: "electron",
                      source: {
                        trapId: "musashi",
                        species: "electron",
                        particleFraction: electronKickRemovalFraction,
                      },
                    }),
                })
              }
            >
              Kick out electrons
            </ActionButton>

            <ActionButton onClick={transferAntiprotonsFromMusashiToCusp}>
              Transfer antiprotons to the mixing trap
            </ActionButton>
          </ActionGroup>

          <ActionGroup title="Positron system">
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <ToggleSwitch
                checked={sourceIsActive}
                onChange={toggleSourceToBgt}
              >
                Turn on positron system
              </ToggleSwitch>

              <label
                style={{
                  display: "grid",
                  gap: "0.25rem",
                  color: "#475569",
                  fontSize: "0.85rem",
                }}
              >
                source activity: {sourceActivityGBq.toFixed(2)} GBq
                <input
                  type="range"
                  min={minSourceActivityGBq}
                  max={maxSourceActivityGBq}
                  step="0.01"
                  value={sourceActivityGBq}
                  onChange={(event) =>
                    setSourceActivityGBq(Number(event.target.value))
                  }
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: "0.25rem",
                  color: "#475569",
                  fontSize: "0.85rem",
                }}
              >
                Cycle time: {bgtAccumulationTimeSeconds.toFixed(1)} s
                <input
                  type="range"
                  min={minBgtAccumulationTimeSeconds}
                  max={maxBgtAccumulationTimeSeconds}
                  step="0.5"
                  value={bgtAccumulationTimeSeconds}
                  onChange={(event) =>
                    setBgtAccumulationTimeSeconds(Number(event.target.value))
                  }
                />
                <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  cycles to accumulator
                </span>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: "0.25rem",
                  color: "#475569",
                  fontSize: "0.85rem",
                }}
              >
                Accumulator: {bgtStackCount}
                <input
                  type="range"
                  min={minBgtStackCount}
                  max={maxBgtStackCount}
                  step="1"
                  value={bgtStackCount}
                  onChange={(event) =>
                    setBgtStackCount(Number(event.target.value))
                  }
                />
              </label>
            </div>

            <ActionButton onClick={transferPositronsFromBgtToStacker}>
              Positrons from Positron system to accumulator
            </ActionButton>

          <ToggleSwitch
            checked={autoTransferIsRunning}
            onChange={toggleAutoBgtToStackerTransfers}
          >
            Auto transfer to Accumulator
          </ToggleSwitch>
          </ActionGroup>

          <ActionGroup title="Accumulator">
            <ActionButton onClick={transferPositronsFromStackerToCusp}>
              Send positrons to the mixing trap
            </ActionButton>

            <label
              style={{
                display: "grid",
                gap: "0.25rem",
                color: "#475569",
                fontSize: "0.85rem",
              }}
            >
              Transfers to mixing trap: {accumulatorToCuspTransferCount}
              <input
                type="range"
                min={minAccumulatorToCuspTransferCount}
                max={maxAccumulatorToCuspTransferCount}
                step="1"
                value={accumulatorToCuspTransferCount}
                onChange={(event) =>
                  setAccumulatorToCuspTransferCount(Number(event.target.value))
                }
              />
            </label>

            <ToggleSwitch
              checked={autoAccumulatorToCuspIsRunning}
              onChange={toggleAutoAccumulatorToCuspTransfers}
            >
              Auto transfer to mixing trap
            </ToggleSwitch>
          </ActionGroup>

          <ActionGroup title="Mixing trap">
            <ActionButton
              onClick={() =>
                runAction({
                  sequence: actionSequences.loadElectronsIntoCusp,
                  route: routes.electronsIntoCusp,
                  species: "electron",
                  destination: {
                    trapId: "cusp",
                    species: "electron",
                    z: getLastTrapZ(routes.electronsIntoCusp, "cusp"),
                  },
                })
              }
            >
              Load electrons
            </ActionButton>

            <ActionButton
              onClick={() =>
                runActionOnlyIfPopulationExists({
                  trapId: "cusp",
                  species: "electron",
                  action: () =>
                    runAction({
                      sequence: actionSequences.kickElectronsFromCusp,
                      route: routes.electronsOutOfCuspToUs,
                      species: "electron",
                      source: {
                        trapId: "cusp",
                        species: "electron",
                        particleFraction: electronKickRemovalFraction,
                      },
                    }),
                })
              }
            >
              Kick out electrons
            </ActionButton>

            <ActionButton onClick={mixPositronsAndAntiprotons}>
              Mix positrons and antiprotons
            </ActionButton>

            <ActionButton onClick={analyzePlasma}>Analyze plasma</ActionButton>

            {analysisReport && (
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0.55rem 0.7rem",
                  background: "white",
                  color: "#334155",
                  fontSize: "0.85rem",
                  whiteSpace: "pre-line",
                }}
              >
                {analysisReport}
              </div>
            )}
          </ActionGroup>
        </div>

        <div style={{ display: "inline-flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <ActionButton onClick={clearAll}>Clear</ActionButton>
        </div>
      </section>

      <div
        style={{
          position: "relative",
          width: `${canvas.width}px`,
          height: `${canvas.height}px`,
          margin: "0 auto",
        }}
      >
        <TransportOverlay particles={overlayParticles} />

        {(Object.keys(panels) as TrapId[]).map((trapId) => (
          <div
            key={trapId}
            style={{
              position: "absolute",
              left: `${panels[trapId].left}px`,
              top: `${panels[trapId].top}px`,
              width: `${panels[trapId].width}px`,
              zIndex: 2,
            }}
          >
            <TrapPanel
              trap={traps[trapId]}
              voltages={trapVoltages[trapId]}
              particles={trapParticles[trapId]}
              layoutSettings={layoutSettings}
            />
          </div>
        ))}
      </div>
    </main>
  );
}

function ActionGroup({
  title,
  status,
  children,
}: {
  title: string;
  status?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "0.75rem",
        background: "#f8fafc",
      }}
    >
      <h2 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>{title}</h2>

      {status && (
        <div
          style={{
            color: "#475569",
            fontSize: "0.9rem",
            marginBottom: "0.75rem",
          }}
        >
          Stored: {status}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.5rem" }}>{children}</div>
    </section>
  );
}

function ActionButton({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.65rem 0.85rem",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: disabled ? "#f1f5f9" : "white",
        color: disabled ? "#94a3b8" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.65rem 0.85rem",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: checked ? "#fee2e2" : "white",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          flex: "0 0 auto",
          width: "38px",
          height: "22px",
          borderRadius: "999px",
          background: checked ? "#ef4444" : "#cbd5e1",
          transition: "background 160ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "19px" : "3px",
            width: "16px",
            height: "16px",
            borderRadius: "999px",
            background: "white",
            transition: "left 160ms ease",
          }}
        />
      </span>
    </button>
  );
}

export default App;