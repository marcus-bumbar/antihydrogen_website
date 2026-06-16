import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import type { Electrode } from "../data/electrodes";
import type { TrapParticleMarker } from "../data/particles";
import { computePotentialAtZ } from "../physics/potentialModel";

type ZRange = {
  zMin: number;
  zMax: number;
};

type LayoutSettings = {
  plotLeftMargin: number;
  plotRightMargin: number;
};

type PotentialPlotProps = {
  title: string;
  zValues: number[];
  potential: number[];
  particles: TrapParticleMarker[];
  voltages: number[];
  electrodes: Electrode[];
  zRange: ZRange;
  layoutSettings: LayoutSettings;
};

export function PotentialPlot({
  title,
  zValues,
  potential,
  particles,
  voltages,
  electrodes,
  zRange,
  layoutSettings,
}: PotentialPlotProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!plotRef.current) return;

    const traces: any[] = [
      {
        x: zValues,
        y: potential,
        type: "scatter",
        mode: "lines",
        line: { color: "black" },
        showlegend: false,
      },
    ];

    if (particles.length > 0) {
      traces.push({
        x: particles.map((particle) => particle.z),
        y: particles.map((particle) =>
          computePotentialAtZ(particle.z, voltages, electrodes)
        ),
        text: particles.map((particle) => particle.species),
        type: "scatter",
        mode: "markers",
        marker: {
          size: particles.map((particle) => particle.radius * 1.6),
          color: particles.map((particle) => particle.color),
        },
        showlegend: false,
      });
    }

    Plotly.react(
      plotRef.current,
      traces,
      {
        height: 220,
        autosize: true,
        showlegend: false,
        uirevision: "fixed-layout",
        margin: {
          l: layoutSettings.plotLeftMargin,
          r: layoutSettings.plotRightMargin,
          t: 10,
          b: 50,
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          title: { text: "Axial position z [mm]" },
          range: [zRange.zMin, zRange.zMax],
          autorange: false,
          fixedrange: true,
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: "black",
          linewidth: 1,
          mirror: "allticks",
          ticks: "inside",
          ticklen: 7,
          tickwidth: 1,
          tickcolor: "black",
          minor: {
            ticks: "inside",
            ticklen: 4,
            tickwidth: 1,
            tickcolor: "black",
            showgrid: false,
          },
        },
        yaxis: {
          title: { text: "On Axis potential [V]" },
          range: [-130, 130],
          autorange: false,
          fixedrange: true,
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: "black",
          linewidth: 1,
          mirror: "allticks",
          ticks: "inside",
          ticklen: 7,
          tickwidth: 1,
          tickcolor: "black",
          minor: {
            ticks: "inside",
            ticklen: 4,
            tickwidth: 1,
            tickcolor: "black",
            showgrid: false,
          },
        },
      },
      {
        responsive: true,
        displayModeBar: false,
      }
    );
  }, [
    zValues,
    potential,
    particles,
    voltages,
    electrodes,
    zRange,
    layoutSettings,
  ]);

  return (
    <section>
      <h3 style={{ marginBottom: "0.75rem" }}>{title}</h3>
      <div ref={plotRef} style={{ width: "100%", height: "260px" }} />
    </section>
  );
}
