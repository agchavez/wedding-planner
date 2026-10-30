import { isAllowedPlanUrl, type RoomLayer } from "@/lib/venueLibrary";
import { cn } from "@/lib/utils";

const EXITS = new Set(["door", "emergency-exit"]);

/**
 * Vista previa de una capa salón (contorno, elementos fijos y plano de fondo) en SVG. Sin estado:
 * sirve en el editor (biblioteca) y en la consola de administración. Colores del tema de la app.
 */
export function RoomPreview({
  layer,
  className,
}: {
  layer: Pick<RoomLayer, "roomShape" | "roomFixtures" | "canvasWidth" | "canvasHeight" | "backgroundImage">;
  className?: string;
}) {
  const { roomShape, roomFixtures, canvasWidth, canvasHeight, backgroundImage } = layer;
  const hasShape = roomShape.length >= 3;
  // Encuadre: el contorno (si hay) con un margen; si no, todo el lienzo.
  const xs = hasShape ? roomShape.map((p) => p.x) : [0, canvasWidth];
  const ys = hasShape ? roomShape.map((p) => p.y) : [0, canvasHeight];
  const pad = Math.max(canvasWidth, canvasHeight) * 0.03;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const height = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const stroke = Math.max(width, height) / 150;

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block h-full w-full", className)}
      role="img"
      aria-label="Vista previa del salón"
    >
      {hasShape ? (
        <polygon
          points={roomShape.map((p) => `${p.x},${p.y}`).join(" ")}
          className="fill-muted stroke-foreground/70"
          strokeWidth={stroke * 2}
          strokeLinejoin="miter"
        />
      ) : (
        <rect width={canvasWidth} height={canvasHeight} className="fill-muted stroke-border" strokeWidth={stroke} />
      )}
      {/* Solo planos subidos a la app: nunca se pide una imagen a un host externo (p. ej. datos viejos). */}
      {backgroundImage && isAllowedPlanUrl(backgroundImage.url) && (
        <image
          href={backgroundImage.url}
          x={backgroundImage.x}
          y={backgroundImage.y}
          width={backgroundImage.width}
          height={backgroundImage.height}
          opacity={backgroundImage.opacity}
          preserveAspectRatio="none"
        />
      )}
      {roomFixtures.map((f) =>
        f.type === "column-round" ? (
          <circle key={f.id} cx={f.x} cy={f.y} r={Math.max(f.width, f.height) / 2} className="fill-foreground/70" />
        ) : (
          <rect
            key={f.id}
            x={f.x - f.width / 2}
            y={f.y - f.height / 2}
            width={f.width}
            height={f.height}
            transform={`rotate(${f.rotation} ${f.x} ${f.y})`}
            className={cn(
              EXITS.has(f.type) ? "fill-primary" : f.type === "window" ? "fill-sky-500/60" : "fill-foreground/70"
            )}
          />
        )
      )}
    </svg>
  );
}
