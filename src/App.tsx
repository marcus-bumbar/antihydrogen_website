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
import {
  animationQueues,
  type ButtonLockId,
  type QueuedActionStep,
  type QueuedAnimation,
  type QueuedParticleMove,
} from "./data/animationQueues";

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
const autoTransferSettlingDelay = 120; // milliseconds
const electronKickRemovalFraction = 0.8;
const minMusashiToCuspTransferCount = 1;
const maxMusashiToCuspTransferCount = 5;

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

function clampedMusashiToCuspTransferCount(transferCount: number) {
  return Math.min(
    Math.max(Math.round(transferCount), minMusashiToCuspTransferCount),
    maxMusashiToCuspTransferCount
  );
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

function trapInternalRoute(
  trapId: TrapId,
  zStart: number,
  zEnd: number
): RouteSegment[] {
  return [
    {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      trapId,
      trapZStart: zStart,
      trapZEnd: zEnd,
      showOverlay: false,
    },
  ];
}

function repeatQueuedAnimation(
  animation: QueuedAnimation,
  repeatCount: number
): QueuedAnimation {
  const clampedRepeatCount = Math.min(
    Math.max(Math.round(repeatCount), 1),
    maxMusashiToCuspTransferCount
  );

  return {
    ...animation,
    steps: Array.from(
      { length: clampedRepeatCount },
      () => animation.steps
    ).flat(),
  };
}

function App() {
  const animationRefs = useRef<Set<number>>(new Set());
  const voltageAnimationRefs = useRef<Partial<Record<TrapId, number>>>({});
  const voltageValuesRef = useRef<TrapVoltages>(createInitialTrapVoltages());
  const sourceActivityIntervalRef = useRef<number | null>(null);
  const storedPopulationsRef = useRef<PopulationMap>(createEmptyPopulations());
  const autoTransferRunIdRef = useRef(0);

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
  const [musashiToCuspTransferCount, setMusashiToCuspTransferCount] = useState(1);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);

  const lockedButtonsRef = useRef<Set<ButtonLockId>>(new Set());
  const [lockedButtons, setLockedButtons] = useState<Set<ButtonLockId>>(
    () => new Set()
  );

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


  type QueuedRuntimeOptions = {
    particleRadiusBySpecies?: Partial<Record<Species, number>>;
    hiddenMoveSpecies?: Species[];
    onComplete?: () => void;
  };

  function isButtonLocked(buttonId: ButtonLockId) {
    return lockedButtons.has(buttonId);
  }

  function anyButtonLocked(buttonIds: readonly ButtonLockId[]) {
    return buttonIds.some((buttonId) =>
      lockedButtonsRef.current.has(buttonId)
    );
  }

  function setButtonLocks(
    buttonIds: readonly ButtonLockId[],
    shouldLock: boolean
  ) {
    const next = new Set(lockedButtonsRef.current);

    buttonIds.forEach((buttonId) => {
      if (shouldLock) {
        next.add(buttonId);
      } else {
        next.delete(buttonId);
      }
    });

    lockedButtonsRef.current = next;
    setLockedButtons(next);
  }

  async function runLockedQueuedAnimation(
    animation: QueuedAnimation,
    options: QueuedRuntimeOptions = {}
  ) {
    const lockedButtonIds = animation.lockedButtons ?? [];

    if (anyButtonLocked(lockedButtonIds)) return;

    setButtonLocks(lockedButtonIds, true);

    try {
      await runQueuedAction(animation.steps, options);
      options.onComplete?.();
    } finally {
      setButtonLocks(lockedButtonIds, false);
    }
  }

  async function runQueuedAction(
    steps: QueuedActionStep[],
    options: QueuedRuntimeOptions = {}
  ) {
    for (const step of steps) {
      if (step.type === "stage") {
        await runStageChange(step);
      }

      if (step.type === "move") {
        await runParallelParticleMove(step, options);
      }

      if (step.type === "moveStoredPopulation") {
        await runStoredPopulationMove(step);
      }

      if (step.type === "resetTrap") {
        await runTrapPopulationReset(step);
      }

      if (step.type === "removePopulationFraction") {
        removePopulationFractionFromQueue(step);
      }

      if (step.type === "wait") {
        await delay(step.duration);
      }

      if (step.type === "parallel") {
        await Promise.all(
          step.steps.map((parallelStep) =>
            runQueuedAction([parallelStep], options)
          )
        );
      }

      if (step.type === "sequence") {
        await runQueuedAction(step.steps, options);
      }
    }
  }

  function runStageChange({
    trapId,
    stageKey,
    duration,
  }: {
    trapId: TrapId;
    stageKey: string;
    duration: number;
  }) {
    return new Promise<void>((resolve) => {
      setTrapStageKeys((current) => ({
        ...current,
        [trapId]: stageKey,
      }));

      const nextStage = stageForTrap(trapId, stageKey);
      morphTrapVoltages(trapId, nextStage.voltages, duration);

      window.setTimeout(resolve, duration);
    });
  }

  function runParallelParticleMove(
    {
      particles,
      duration,
    }: {
      particles: QueuedParticleMove[];
      duration: number;
    },
    options: QueuedRuntimeOptions = {}
  ) {
    const visibleParticles = particles.filter(
      (particle) => !options.hiddenMoveSpecies?.includes(particle.species)
    );

    if (visibleParticles.length === 0) {
      return delay(duration);
    }

    return new Promise<void>((resolve) => {
      const movingIds = visibleParticles.map(
        (particle) =>
          particle.id ?? `${particle.species}-${crypto.randomUUID()}`
      );

      const initialBunches = visibleParticles.map((particle, index) =>
        bunchStateFromRoute(
          {
            id: movingIds[index],
            species: particle.species,
            color: speciesColors[particle.species],
            radius:
              particle.particleRadius ??
              options.particleRadiusBySpecies?.[particle.species] ??
              10,
            route: particle.route,
          },
          0
        )
      );

      setMovingBunches((current) => [...current, ...initialBunches]);

      const startTime = performance.now();

      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const nextBunches = visibleParticles.map((particle, index) =>
          bunchStateFromRoute(
            {
              id: movingIds[index],
              species: particle.species,
              color: speciesColors[particle.species],
              radius:
                particle.particleRadius ??
                options.particleRadiusBySpecies?.[particle.species] ??
                10,
              route: particle.route,
            },
            progress
          )
        );

        setMovingBunches((current) =>
          current.map((bunch) => {
            const replacement = nextBunches.find(
              (nextBunch) => nextBunch.id === bunch.id
            );

            return replacement ?? bunch;
          })
        );

        if (progress < 1) {
          const frameId = requestAnimationFrame(animate);
          animationRefs.current.add(frameId);
        } else {
          setMovingBunches((current) =>
            current.filter((bunch) => !movingIds.includes(bunch.id))
          );

          resolve();
        }
      }

      const frameId = requestAnimationFrame(animate);
      animationRefs.current.add(frameId);
    });
  }

function runStoredPopulationMove({
  trapId,
  species,
  route,
  duration,
}: {
  trapId: TrapId;
  species: Species;
  route: RouteSegment[];
  duration: number;
}) {
  const startingPopulation = storedPopulationsRef.current[trapId][species];

  if (!startingPopulation) {
    return delay(duration);
  }

  return new Promise<void>((resolve) => {
    const startTime = performance.now();

    function setStoredPopulationZ(z: number) {
      const currentPopulation = storedPopulationsRef.current[trapId][species];

      if (!currentPopulation) return;

      const nextPopulations = {
        ...storedPopulationsRef.current,
        [trapId]: {
          ...storedPopulationsRef.current[trapId],
          [species]: {
            ...currentPopulation,
            z,
          },
        },
      };

      storedPopulationsRef.current = nextPopulations;
      setStoredPopulations(nextPopulations);
    }

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress =
        duration <= 0 ? 1 : Math.min(elapsed / duration, 1);

      const movingState = bunchStateFromRoute(
        {
          id: startingPopulation.id,
          species,
          color: startingPopulation.color,
          radius: startingPopulation.radius,
          route,
        },
        progress
      );

      if (movingState.trapZ !== null) {
        setStoredPopulationZ(movingState.trapZ);
      }

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        animationRefs.current.add(frameId);
      } else {
        resolve();
      }
    }

    const frameId = requestAnimationFrame(animate);
    animationRefs.current.add(frameId);
  });
}

function resetExitZForTrap(trapId: TrapId) {
  const leftEdge = Math.min(
    ...traps[trapId].electrodes.map((electrode) => electrode.left)
  );

  return leftEdge - 35;
}

function runTrapPopulationReset({
  trapId,
  duration,
  preserveSpecies = [],
}: {
  trapId: TrapId;
  duration: number;
  preserveSpecies?: Species[];
}) {
  const preservedSpeciesSet = new Set<Species>(preserveSpecies);

  const populationsToReset = Object.values(
    storedPopulationsRef.current[trapId]
  ).filter(
    (population): population is StoredPopulation =>
      Boolean(population) && !preservedSpeciesSet.has(population.species)
  );

  if (populationsToReset.length === 0) {
    return Promise.resolve();
  }

  const particles: QueuedParticleMove[] = populationsToReset.map(
    (population) => ({
      id: `reset-${population.id}-${crypto.randomUUID()}`,
      species: population.species,
      particleRadius: population.radius,
      route: trapInternalRoute(
        trapId,
        population.z,
        resetExitZForTrap(trapId)
      ),
    })
  );

  const speciesToReset = new Set(
    populationsToReset.map((population) => population.species)
  );

  const currentPopulations = storedPopulationsRef.current;
  const nextTrapPopulations = { ...currentPopulations[trapId] };

  speciesToReset.forEach((species) => {
    delete nextTrapPopulations[species];
  });

  const nextPopulations = {
    ...currentPopulations,
    [trapId]: nextTrapPopulations,
  };

  storedPopulationsRef.current = nextPopulations;
  setStoredPopulations(nextPopulations);

  return runParallelParticleMove({
    particles,
    duration,
  });
}

function removePopulationFractionFromQueue({
  trapId,
  species,
  fraction,
}: {
  trapId: TrapId;
  species: Species;
  fraction: number;
}) {
  const nextPopulations = removePopulationFraction(
    storedPopulationsRef.current,
    trapId,
    species,
    fraction
  );

  storedPopulationsRef.current = nextPopulations;
  setStoredPopulations(nextPopulations);
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

    void runLockedQueuedAnimation(animationQueues.trapAntiprotonsInMusashi, {
      particleRadiusBySpecies: {
        antiproton: trappedRadius,
      },

      onComplete: () => {
        setStoredPopulations((current) =>
          addPopulation(
            current,
            "musashi",
            "antiproton",
            getLastTrapZ(routes.antiprotonsIntoMusashi, "musashi"),
            trappingFraction,
            {
              particleNumber: trappedParticleNumber,
              radius: trappedRadius,
            }
          )
        );
      },
    });
  }

  function kickElectronsFromMusashi() {
    const electronPopulation = storedPopulationsRef.current.musashi.electron;

    if (!electronPopulation) return;

    const kickedParticleNumber =
      electronPopulation.particleNumber * electronKickRemovalFraction;
    const kickedRadius = particleRadiusForTrapParticleNumber(
      kickedParticleNumber,
      "electron",
      "musashi"
    );

    void runLockedQueuedAnimation(animationQueues.kickElectronsOutOfMusashi, {
      particleRadiusBySpecies: {
        electron: kickedRadius,
      },
    });
  }

  async function transferAntiprotonsFromMusashiToCusp() {
    const sourcePopulation = storedPopulationsRef.current.musashi.antiproton;

    if (!sourcePopulation) return;

    const transferCount = clampedMusashiToCuspTransferCount(
      musashiToCuspTransferCount
    );
    const animation = animationQueues.transferAntiprotonsMusashiToCusp;
    const lockedButtonIds = animation.lockedButtons ?? [];

    if (anyButtonLocked(lockedButtonIds)) return;

    const particleNumberPerTransfer =
      sourcePopulation.particleNumber / transferCount;
    const growthInputPerTransfer = sourcePopulation.growthInput / transferCount;

    if (particleNumberPerTransfer <= minimumRemainingParticleNumber) return;

    const movingRadius = particleRadiusForTrapParticleNumber(
      particleNumberPerTransfer,
      "antiproton",
      "musashi"
    );
    const cuspChunkRadius = particleRadiusForTrapParticleNumber(
      particleNumberPerTransfer,
      "antiproton",
      "cusp"
    );

    setButtonLocks(lockedButtonIds, true);

    try {
      // Reset all non-antiproton populations in MUSASHI, but keep the
      // antiproton population visible while equal chunks are transferred.
      setStoredPopulations((current) => {
        const nextPopulations = {
          ...current,
          musashi: {
            antiproton: current.musashi.antiproton ?? sourcePopulation,
          },
        };

        storedPopulationsRef.current = nextPopulations;
        return nextPopulations;
      });

      for (let transferIndex = 0; transferIndex < transferCount; transferIndex += 1) {
        await runQueuedAction(animation.steps, {
          particleRadiusBySpecies: {
            antiproton: movingRadius,
          },
        });

        const transferredParticleNumber =
          particleNumberPerTransfer * (transferIndex + 1);
        const transferredGrowthInput =
          growthInputPerTransfer * (transferIndex + 1);
        const remainingParticleNumber = Math.max(
          sourcePopulation.particleNumber - transferredParticleNumber,
          0
        );
        const remainingGrowthInput = Math.max(
          sourcePopulation.growthInput - transferredGrowthInput,
          0
        );

        setStoredPopulations((current) => {
          const nextMusashiPopulations: Partial<
            Record<Species, StoredPopulation>
          > = {};

          if (
            remainingParticleNumber > minimumRemainingParticleNumber &&
            remainingGrowthInput > 0
          ) {
            nextMusashiPopulations.antiproton = {
              ...sourcePopulation,
              growthInput: remainingGrowthInput,
              particleNumber: remainingParticleNumber,
              radius: particleRadiusForTrapParticleNumber(
                remainingParticleNumber,
                "antiproton",
                "musashi"
              ),
            };
          }

          const withReducedMusashi = {
            ...current,
            musashi: nextMusashiPopulations,
          };

          const withCuspChunk = addPopulation(
            withReducedMusashi,
            "cusp",
            "antiproton",
            getLastTrapZ(routes.antiprotonsMusashiToCusp, "cusp"),
            growthInputPerTransfer,
            {
              particleNumber: particleNumberPerTransfer,
              radius: cuspChunkRadius,
            }
          );

          storedPopulationsRef.current = withCuspChunk;
          return withCuspChunk;
        });
      }
    } finally {
      setButtonLocks(lockedButtonIds, false);
    }
  }


  function runSourceToBgtPulse() {
    runAction({
      sequence: [],
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
async function runQueuedPopulationTransfer({
  animation,
  route,
  species,
  sourceTrapId,
  destinationTrapId,
  transferFraction = 1,
}: {
  animation: QueuedAnimation;
  route: RouteSegment[];
  species: Species;
  sourceTrapId: TrapId;
  destinationTrapId: TrapId;
  transferFraction?: number;
}) {
  const sourcePopulation = storedPopulationsRef.current[sourceTrapId][species];

  if (!sourcePopulation) {
    await runQueuedAction(animation.steps, {
      hiddenMoveSpecies: [species],
    });

    return false;
  }

  const clampedTransferFraction = clampFraction(transferFraction);

  const particleNumberToTransfer =
    sourcePopulation.particleNumber * clampedTransferFraction;
  const growthInputToTransfer =
    sourcePopulation.growthInput * clampedTransferFraction;

  if (particleNumberToTransfer <= minimumRemainingParticleNumber) {
    await runQueuedAction(animation.steps, {
      hiddenMoveSpecies: [species],
    });

    return false;
  }

  const movingRadius = particleRadiusForTrapParticleNumber(
    particleNumberToTransfer,
    species,
    sourceTrapId
  );

  const nextPopulations = removePopulationFraction(
    storedPopulationsRef.current,
    sourceTrapId,
    species,
    clampedTransferFraction
  );

  storedPopulationsRef.current = nextPopulations;
  setStoredPopulations(nextPopulations);

  await runQueuedAction(animation.steps, {
    particleRadiusBySpecies: {
      [species]: movingRadius,
    },
  });

  setStoredPopulations((current) => {
    const next = addPopulation(
      current,
      destinationTrapId,
      species,
      getLastTrapZ(route, destinationTrapId),
      growthInputToTransfer,
      {
        particleNumber: particleNumberToTransfer,
        radius: movingRadius,
      }
    );

    storedPopulationsRef.current = next;
    return next;
  });

  return true;
}

async function runLockedQueuedPopulationTransfer({
  animation,
  route,
  species,
  sourceTrapId,
  destinationTrapId,
  transferFraction = 1,
}: {
  animation: QueuedAnimation;
  route: RouteSegment[];
  species: Species;
  sourceTrapId: TrapId;
  destinationTrapId: TrapId;
  transferFraction?: number;
}) {
  const lockedButtonIds = animation.lockedButtons ?? [];

  if (anyButtonLocked(lockedButtonIds)) return false;

  setButtonLocks(lockedButtonIds, true);

  try {
    return await runQueuedPopulationTransfer({
      animation,
      route,
      species,
      sourceTrapId,
      destinationTrapId,
      transferFraction,
    });
  } finally {
    setButtonLocks(lockedButtonIds, false);
  }
}

async function transferPositronsFromBgtToStacker() {
  await runLockedQueuedPopulationTransfer({
    animation: animationQueues.transferPositronsSourceBgtToStacker,
    route: routes.positronsBgtToStacker,
    species: "positron",
    sourceTrapId: "sourceBgt",
    destinationTrapId: "stacker",
    transferFraction: positronBgtToAccumulatorTransferFraction,
  });
}

async function transferPositronsFromStackerToCusp() {
  await runLockedQueuedPopulationTransfer({
    animation: animationQueues.transferPositronsStackerToCusp,
    route: routes.positronsStackerToCusp,
    species: "positron",
    sourceTrapId: "stacker",
    destinationTrapId: "cusp",
    transferFraction: positronAccumulatorToCuspTransferFraction,
  });
}

async function runAutoBgtToStackerTransfers() {
  const animation = animationQueues.transferPositronsSourceBgtToStacker;
  const lockedButtonIds = animation.lockedButtons ?? [];

  if (autoTransferIsRunning || anyButtonLocked(lockedButtonIds)) return;

  const runId = autoTransferRunIdRef.current + 1;
  autoTransferRunIdRef.current = runId;

  setAutoTransferIsRunning(true);
  setButtonLocks(lockedButtonIds, true);

  try {
    for (let stackIndex = 0; stackIndex < bgtStackCount; stackIndex += 1) {
      if (autoTransferRunIdRef.current !== runId) break;

      await delay(bgtAccumulationTimeSeconds * 1000 + autoTransferSettlingDelay);

      if (autoTransferRunIdRef.current !== runId) break;

      await runQueuedPopulationTransfer({
        animation,
        route: routes.positronsBgtToStacker,
        species: "positron",
        sourceTrapId: "sourceBgt",
        destinationTrapId: "stacker",
        transferFraction: positronBgtToAccumulatorTransferFraction,
      });

      await delay(autoTransferSettlingDelay);
    }
  } finally {
    if (autoTransferRunIdRef.current === runId) {
      setAutoTransferIsRunning(false);
    }

    setButtonLocks(lockedButtonIds, false);
  }
}

  function clearAll() {
    autoTransferRunIdRef.current += 1;
    setAutoTransferIsRunning(false);
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

  function loadElectronsIntoCusp() {
    void runLockedQueuedAnimation(animationQueues.loadElectronsIntoCusp, {
      onComplete: () => {
        setStoredPopulations((current) => {
          const next = addPopulation(
            current,
            "cusp",
            "electron",
            getLastTrapZ(routes.electronsIntoCusp, "cusp")
          );

          storedPopulationsRef.current = next;
          return next;
        });
      },
    });
  }

  function kickElectronsFromCusp() {
    const electronPopulation = storedPopulationsRef.current.cusp.electron;

    if (!electronPopulation) return;

    const kickedParticleNumber =
      electronPopulation.particleNumber * electronKickRemovalFraction;
    const kickedRadius = particleRadiusForTrapParticleNumber(
      kickedParticleNumber,
      "electron",
      "cusp"
    );

    void runLockedQueuedAnimation(animationQueues.kickElectronsOutOfCusp, {
      particleRadiusBySpecies: {
        electron: kickedRadius,
      },
    });
  }

  function mixPositronsAndAntiprotons() {
    void runLockedQueuedAnimation(
      animationQueues.mixPositronsAndAntiprotonsInCusp,
      {
        onComplete: () => {
          setStoredPopulations((current) => {
            const afterAntiprotons = removePopulation(
              current,
              "cusp",
              "antiproton"
            );
            const afterPositrons = removePopulation(
              afterAntiprotons,
              "cusp",
              "positron"
            );

            storedPopulationsRef.current = afterPositrons;
            return afterPositrons;
          });
        },
      }
    );
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

    const hiddenMoveSpecies: Species[] = [];
    const particleRadiusBySpecies: Partial<Record<Species, number>> = {};

    if (antiprotonPopulation) {
      particleRadiusBySpecies.antiproton = antiprotonPopulation.radius;
    } else {
      hiddenMoveSpecies.push("antiproton");
    }

    if (positronPopulation) {
      particleRadiusBySpecies.positron = positronPopulation.radius;
    } else {
      hiddenMoveSpecies.push("positron");
    }

    const nextPopulations = {
      ...storedPopulationsRef.current,
      cusp: {},
    };

    storedPopulationsRef.current = nextPopulations;
    setStoredPopulations(nextPopulations);

    void runLockedQueuedAnimation(animationQueues.analyzeCuspPlasma, {
      hiddenMoveSpecies,
      particleRadiusBySpecies,
    });
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
              disabled={isButtonLocked("musashi.loadElectrons")}
              onClick={() =>
                void runLockedQueuedAnimation(animationQueues.loadElectronsIntoMusashi, {
                  onComplete: () => {
                    setStoredPopulations((current) =>
                      addPopulation(
                        current,
                        "musashi",
                        "electron",
                        getLastTrapZ(routes.electronsIntoMusashi, "musashi")
                      )
                    );
                  },
                })
              }
            >
              Load electrons
            </ActionButton>



            <ActionButton
              disabled={isButtonLocked("musashi.trapAntiprotons")}
              onClick={trapAntiprotonsInMusashi}
            >
              Trap antiprotons
            </ActionButton>

            <ActionButton
              disabled={isButtonLocked("musashi.kickElectrons")}
              onClick={kickElectronsFromMusashi}
            >
              Kick out electrons
            </ActionButton>

            <label
              style={{
                display: "grid",
                gap: "0.25rem",
                color: "#475569",
                fontSize: "0.85rem",
              }}
            >
              Antiproton transfers: {musashiToCuspTransferCount}
              <input
                type="range"
                min={minMusashiToCuspTransferCount}
                max={maxMusashiToCuspTransferCount}
                step="1"
                value={musashiToCuspTransferCount}
                onChange={(event) =>
                  setMusashiToCuspTransferCount(Number(event.target.value))
                }
              />
            </label>

            <ActionButton
              disabled={isButtonLocked("musashi.transferAntiprotons")}
              onClick={transferAntiprotonsFromMusashiToCusp}
            >
              Transfer antiprotons to the mixing trap
            </ActionButton>
          </ActionGroup>

          <ActionGroup title="Positron system">
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  color: "#475569",
                  fontSize: "0.85rem",
                  cursor: isButtonLocked("sourceBgt.transferPositrons")
                    ? "not-allowed"
                    : "pointer",
                  opacity: isButtonLocked("sourceBgt.transferPositrons")
                    ? 0.55
                    : 1,
                }}
              >
                <span>
                  {sourceIsActive
                    ? "Positron system on"
                    : "Positron system off"}
                </span>

                <input
                  type="checkbox"
                  checked={sourceIsActive}
                  disabled={isButtonLocked("sourceBgt.transferPositrons")}
                  onChange={toggleSourceToBgt}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                />

                <span
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    width: "44px",
                    height: "24px",
                    borderRadius: "999px",
                    background: sourceIsActive ? "#22c55e" : "#cbd5e1",
                    transition: "background 160ms ease",
                    boxShadow: "inset 0 1px 3px rgba(15, 23, 42, 0.22)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "3px",
                      left: sourceIsActive ? "23px" : "3px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "999px",
                      background: "#ffffff",
                      transition: "left 160ms ease",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.3)",
                    }}
                  />
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

            <ActionButton
              disabled={isButtonLocked("sourceBgt.transferPositrons")}
              onClick={() => void transferPositronsFromBgtToStacker()}
            >
              Positrons from Positron system to accumulator
            </ActionButton>

            <ActionButton
              disabled={
                autoTransferIsRunning ||
                isButtonLocked("sourceBgt.transferPositrons")
              }
              onClick={() => void runAutoBgtToStackerTransfers()}
            >
              {autoTransferIsRunning
                ? "Running transfers to Accumulator..."
                : "Auto transfer to Accumulator"}
            </ActionButton>
          </ActionGroup>

          <ActionGroup title="Accumulator">
            <ActionButton
              disabled={isButtonLocked("stacker.transferPositrons")}
              onClick={() => void transferPositronsFromStackerToCusp()}
            >
              Send positrons to the mixing trap
            </ActionButton>

          </ActionGroup>

          <ActionGroup title="Mixing trap">
            <ActionButton
              disabled={isButtonLocked("cusp.loadElectrons")}
              onClick={loadElectronsIntoCusp}
            >
              Load electrons
            </ActionButton>

            <ActionButton
              disabled={isButtonLocked("cusp.kickElectrons")}
              onClick={kickElectronsFromCusp}
            >
              Kick out electrons
            </ActionButton>

            <ActionButton
              disabled={isButtonLocked("cusp.mix")}
              onClick={mixPositronsAndAntiprotons}
            >
              Mix positrons and antiprotons
            </ActionButton>

            <ActionButton
              disabled={isButtonLocked("cusp.analyze")}
              onClick={analyzePlasma}
            >
              Analyze plasma
            </ActionButton>

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

export default App;