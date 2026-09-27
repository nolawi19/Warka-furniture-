import styles from './DimensionDiagram.module.css';

/**
 * A drawn box with the piece's own measurements on it.
 *
 * Only the numbers the shop has entered are labelled — a dimension that is not
 * in the data gets no line and no figure. The box's proportions follow the
 * real numbers where there are some; where one is missing the shape falls back
 * to a neutral proportion, which is why that side carries no label: it is a
 * sketch of the known sizes, not a claim about the unknown one.
 */
export function DimensionDiagram({
  widthCm,
  depthCm,
  heightCm,
}: {
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
}) {
  // Neutral proportions for any side the data does not give.
  const W = widthCm ?? 100;
  const H = heightCm ?? Math.round(W * 0.55);
  const D = depthCm ?? Math.round(W * 0.45);

  // Oblique projection: depth goes back and up at a shallow angle.
  const depthX = 0.42;
  const depthY = 0.26;
  const scale = Math.min(170 / (W + D * depthX), 104 / (H + D * depthY));

  const w = W * scale;
  const h = H * scale;
  const dx = D * depthX * scale;
  const dy = D * depthY * scale;

  // Front face, bottom-left corner at (x0, y0).
  const x0 = 46;
  const y0 = 150;
  const top = y0 - h;

  const label = (n: number) => `${n} cm`;

  return (
    <svg className={styles.diagram} viewBox="0 0 280 190" role="img" aria-label={describe(widthCm, depthCm, heightCm)}>
      <g className={styles.box}>
        {/* top and side faces, then the front on top of them */}
        <path className={styles.faceTop} d={`M${x0} ${top}L${x0 + dx} ${top - dy}H${x0 + w + dx}L${x0 + w} ${top}Z`} />
        <path className={styles.faceSide} d={`M${x0 + w} ${top}L${x0 + w + dx} ${top - dy}V${y0 - dy}L${x0 + w} ${y0}Z`} />
        <rect className={styles.faceFront} x={x0} y={top} width={w} height={h} />
      </g>

      {widthCm !== null && (
        <g className={styles.measure}>
          <path d={`M${x0} ${y0 + 14}H${x0 + w}M${x0} ${y0 + 8}v12M${x0 + w} ${y0 + 8}v12`} />
          <text x={x0 + w / 2} y={y0 + 32} textAnchor="middle">
            {label(widthCm)}
          </text>
        </g>
      )}

      {heightCm !== null && (
        <g className={styles.measure}>
          <path d={`M${x0 - 14} ${top}V${y0}M${x0 - 20} ${top}h12M${x0 - 20} ${y0}h12`} />
          <text x={x0 - 20} y={top + h / 2} textAnchor="middle" transform={`rotate(-90 ${x0 - 20} ${top + h / 2})`} dy="-4">
            {label(heightCm)}
          </text>
        </g>
      )}

      {depthCm !== null && (
        <g className={styles.measure}>
          <path
            d={`M${x0 + w + 10} ${y0 + 4}L${x0 + w + dx + 10} ${y0 - dy + 4}M${x0 + w + 6} ${y0 + 8}l8 -8M${x0 + w + dx + 6} ${y0 - dy + 8}l8 -8`}
          />
          <text x={x0 + w + dx / 2 + 16} y={y0 - dy / 2 + 14}>
            {label(depthCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function describe(w: number | null, d: number | null, h: number | null) {
  const parts = [
    w !== null ? `${w} cm wide` : null,
    d !== null ? `${d} cm deep` : null,
    h !== null ? `${h} cm high` : null,
  ].filter(Boolean);
  return `Diagram of the piece: ${parts.join(', ')}`;
}
