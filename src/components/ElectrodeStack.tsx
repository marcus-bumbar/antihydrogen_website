import type { SVGProps, ComponentType } from "react";
import type { TrapParticleMarker } from "../data/particles";

type ZRange = {
  zMin: number;
  zMax: number;
};

type LayoutSettings = {
  svgLeftPadding: number;
  svgRightPadding: number;
  svgScale: number;
};

type ElectrodeStackProps = {
  title: string;
  Svg: ComponentType<SVGProps<SVGSVGElement>>;
  particles: TrapParticleMarker[];
  zRange: ZRange;
  layoutSettings: LayoutSettings;
};

export function ElectrodeStack({
  title,
  Svg,
  particles,
  zRange,
  layoutSettings,
}: ElectrodeStackProps) {
  const drawableWidthExpression = `100% - ${
    layoutSettings.svgLeftPadding + layoutSettings.svgRightPadding
  }px`;

  return (
    <section style={{ marginBottom: "1rem" }}>
      <h3 style={{ marginBottom: "0.75rem" }}>{title}</h3>

      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          paddingLeft: `${layoutSettings.svgLeftPadding}px`,
          paddingRight: `${layoutSettings.svgRightPadding}px`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${layoutSettings.svgScale * 100}%`,
            transformOrigin: "left center",
          }}
        >
          <Svg
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {particles.map((particle) => {
          const xFraction =
            (particle.z - zRange.zMin) / (zRange.zMax - zRange.zMin);

          return (
            <div
              key={particle.id}
              title={particle.species}
              style={{
                position: "absolute",
                left: `calc(${layoutSettings.svgLeftPadding}px + (${drawableWidthExpression}) * ${xFraction})`,
                top: "50%",
                width: `${particle.radius * 2}px`,
                height: `${particle.radius * 2}px`,
                background: particle.color,
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                border: "2px solid white",
                boxSizing: "border-box",
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
