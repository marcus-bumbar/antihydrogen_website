import { useEffect, useState } from "react";
import { transportLayout } from "../data/transportLayout";
import SourceSvg from "../assets/Source.svg?react";

export type OverlayParticle = {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  showOverlay: boolean;
};

type TransportOverlayProps = {
  particles: OverlayParticle[];
};

type SourceParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

/**
 * Manual source-particle settings
 *
 * sourceParticleMaxDistance:
 *   How far the particle travels from the center of Source.svg before it resets.
 *
 * sourceParticleSpeed:
 *   How fast the particle moves, in SVG units per second.
 *
 * sourceParticleRadius:
 *   Size of the red particle.
 */
const sourceParticleSettings = {
  sourceParticleMaxDistance: 100,
  sourceParticleSpeed: 250,
  sourceParticleRadius: 2,
};

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function createSourceParticle(
  x: number,
  y: number,
  speed: number
): SourceParticle {
  const angle = Math.random() * Math.PI * 2;

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

export function TransportOverlay({ particles }: TransportOverlayProps) {
  const { canvas, arrows, source } = transportLayout;
  const positronSource = source.positron;

  const {
    sourceParticleMaxDistance,
    sourceParticleSpeed,
    sourceParticleRadius,
  } = sourceParticleSettings;

  const [sourceParticle, setSourceParticle] = useState<SourceParticle>(() =>
    createSourceParticle(
      positronSource.x,
      positronSource.y,
      sourceParticleSpeed
    )
  );

  useEffect(() => {
    setSourceParticle(
      createSourceParticle(
        positronSource.x,
        positronSource.y,
        sourceParticleSpeed
      )
    );
  }, [positronSource.x, positronSource.y, sourceParticleSpeed]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    function animate(currentTime: number) {
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setSourceParticle((particle) => {
        const nextX = particle.x + particle.vx * deltaSeconds;
        const nextY = particle.y + particle.vy * deltaSeconds;

        const distanceFromSource = Math.hypot(
          nextX - positronSource.x,
          nextY - positronSource.y
        );

        if (distanceFromSource >= sourceParticleMaxDistance) {
          return createSourceParticle(
            positronSource.x,
            positronSource.y,
            sourceParticleSpeed
          );
        }

        return {
          ...particle,
          x: nextX,
          y: nextY,
        };
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    positronSource.x,
    positronSource.y,
    sourceParticleMaxDistance,
    sourceParticleSpeed,
  ]);

  return (
    <svg
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 3,
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="blueArrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 6 3 L 0 6 z" fill={arrows.antiproton.color} />
        </marker>

        <marker
          id="redArrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 6 3 L 0 6 z" fill={arrows.positronToCusp.color} />
        </marker>
      </defs>

      <line
        x1={arrows.antiproton.start.x}
        y1={arrows.antiproton.start.y}
        x2={arrows.antiproton.end.x}
        y2={arrows.antiproton.end.y}
        stroke={arrows.antiproton.color}
        strokeWidth="4"
        markerEnd="url(#blueArrow)"
      />

      <line
        x1={arrows.positronToStacker.start.x}
        y1={arrows.positronToStacker.start.y}
        x2={arrows.positronToStacker.end.x}
        y2={arrows.positronToStacker.end.y}
        stroke={arrows.positronToStacker.color}
        strokeWidth="4"
        markerEnd="url(#redArrow)"
      />

      <polyline
        points={pointsToString(arrows.positronToCusp.points)}
        fill="none"
        stroke={arrows.positronToCusp.color}
        strokeWidth="4"
        markerEnd="url(#redArrow)"
      />

      <text
        x={positronSource.x}
        y={positronSource.y + positronSource.labelOffsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#334155"
        fontSize="18"
        fontWeight="600"
      >
        {positronSource.label}
      </text>

      <SourceSvg
        x={positronSource.x - positronSource.width / 2}
        y={positronSource.y - positronSource.height / 2}
        width={positronSource.width}
        height={positronSource.height}
      />

      <circle
        cx={sourceParticle.x}
        cy={sourceParticle.y}
        r={sourceParticleRadius}
        fill="#ef4444"
      />

      {particles
        .filter((particle) => particle.showOverlay)
        .map((particle) => (
          <circle
            key={particle.id}
            cx={particle.x}
            cy={particle.y}
            r={particle.radius}
            fill={particle.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
    </svg>
  );
}