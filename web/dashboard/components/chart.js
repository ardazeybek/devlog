// Daily time chart: a smooth curve with soft area fill and rounded markers.
import { state } from "../state.js";

// Converts "x,y" points into a smooth cubic Bézier path (Catmull-Rom tension).
function smoothPath(points) {
  if (points.length < 2) return `M${points[0] || "0,0"}`;
  const pts = points.map((p) => p.split(",").map(Number));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2,
      t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t,
      c1y = p1[1] + (p2[1] - p0[1]) * t,
      c2x = p2[0] - (p3[0] - p1[0]) * t,
      c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// Builds the chart SVG for the selected keys.
function chart(keys) {
  const vals = keys.map((k) => (state.days[k]?.seconds || 0) / 3600),
    max = Math.max(1, ...vals) * 1.15,
    W = 760,
    H = 200;
  const points = vals.map(
    (v, i) =>
      `${(45 + (i * (W - 65)) / Math.max(1, vals.length - 1)).toFixed(1)},${(H - (v / max) * 165).toFixed(1)}`,
  );
  const line = smoothPath(points);
  const first = points[0]?.split(",")[0] || 45,
    last = points.at(-1)?.split(",")[0] || 45;
  const area = `${line} L${last},${H} L${first},${H} Z`;
  return /* HTML */ `<svg
    class="chart"
    viewBox="0 0 780 245"
    role="img"
    aria-label="Daily active coding time"
  >
    <defs>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#69c6a3" stop-opacity=".38" />
        <stop offset="100%" stop-color="#69c6a3" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="chart-line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4fb992" />
        <stop offset="100%" stop-color="#14956b" />
      </linearGradient>
    </defs>
    ${[0, 1, 2, 3].map((i) => /* HTML */ `<line x1="40" x2="760" y1="${H - i * 55}" y2="${H - i * 55}" stroke="#d0ddd6" stroke-opacity=".55" stroke-dasharray="2 6" stroke-linecap="round" /><text x="0" y="${H - i * 55 + 4}">${((max * i) / 3).toFixed(1)}h</text>`).join("")}
    <path class="chart-area" d="${area}" fill="url(#chart-fill)" />
    <path
      class="chart-line"
      pathLength="1"
      d="${line}"
      fill="none"
      stroke="url(#chart-line)"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    ${points
      .map((p, i) => {
        const [x, y] = p.split(",");
        return /* HTML */ `<circle
            cx="${x}"
            cy="${y}"
            tabindex="0"
            role="img"
            aria-label="${keys[i]}: ${((state.days[keys[i]]?.seconds || 0) / 60).toFixed(0)} minutes"
            r="4"
            fill="#ffffff"
            stroke="#14956b"
            stroke-width="2"
          ></circle
          >${i % Math.ceil(keys.length / 7) === 0 ? /* HTML */ `<text x="${x}" y="230" text-anchor="middle">${new Date(keys[i] + "T12:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}</text>` : ""}`;
      })
      .join("")}
  </svg>`;
}

export { chart };
