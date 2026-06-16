import { useMemo } from "react";
import type { TrapConfig } from "../data/traps";
import type { TrapParticleMarker } from "../data/particles";
import { computePotential } from "../physics/potentialModel";
import { ElectrodeStack } from "./ElectrodeStack";
import { PotentialPlot } from "./PotentialPlot";

type LayoutSettings = {
  plotLeftMargin: number;
  plotRightMargin: number;
  svgLeftPadding: number;
  svgRightPadding: number;
  svgScale: number;
};

type TrapPanelProps = {
  trap: TrapConfig;
  voltages: number[];
  stageName: string;
  stageDescription: string;
  particles: TrapParticleMarker[];
  layoutSettings: LayoutSettings;
};

export function TrapPanel({
  trap,
  voltages,
  stageName,
  stageDescription,
  particles,
  layoutSettings,
}: TrapPanelProps) {
  const zRange = useMemo(() => {
    const leftEdges = trap.electrodes.map((electrode) => electrode.left);
    const rightEdges = trap.electrodes.map((electrode) => electrode.right);

    return {
      zMin: Math.min(...leftEdges) - 2,
      zMax: Math.max(...rightEdges) + 2,
    };
  }, [trap.electrodes]);

  const zValues = useMemo(() => {
    const points = 500;

    return Array.from(
      { length: points },
      (_, i) =>
        zRange.zMin + ((zRange.zMax - zRange.zMin) * i) / (points - 1)
    );
  }, [zRange]);

  const potential = useMemo(() => {
    return computePotential(zValues, voltages, trap.electrodes);
  }, [zValues, voltages, trap.electrodes]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "1rem",
        background: "white",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>{trap.name}</h2>
      <div style={{ fontSize: "0.9rem", color: "#475569", minHeight: "2.6em" }}>
        <strong>{stageName}</strong>
        <br />
        {stageDescription}
      </div>

      <ElectrodeStack
        title="Electrode stack"
        Svg={trap.Svg}
        particles={particles}
        zRange={zRange}
        layoutSettings={layoutSettings}
      />

      <PotentialPlot
        title="Potential"
        zValues={zValues}
        potential={potential}
        particles={particles}
        voltages={voltages}
        electrodes={trap.electrodes}
        zRange={zRange}
        layoutSettings={layoutSettings}
      />
    </div>
  );
}
