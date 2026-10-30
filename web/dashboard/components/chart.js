import { state } from "../state.js";
function chart(keys) {
  const vals = keys.map((k) => (state.days[k]?.seconds || 0) / 3600),
    max = Math.max(1, ...vals) * 1.15,
    W = 760,
    H = 200;
  const points = vals.map(
    (v, i) =>
      `${45 + (i * (W - 65)) / Math.max(1, vals.length - 1)},${H - (v / max) * 165}`,
  );
  return /* HTML */ `<svg
    class="chart"
    viewBox="0 0 780 245"
    role="img"
    aria-label="Daily active coding time"
  >
    <defs>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#69c6a3" stop-opacity=".35" />
        <stop offset="100%" stop-color="#69c6a3" stop-opacity=".02" />
      </linearGradient>
    </defs>
    ${[0, 1, 2, 3].map((i) => /* HTML */ `<line x1="40" x2="760" y1="${H - i * 55}" y2="${H - i * 55}" stroke="#d0ddd6" stroke-dasharray="4 4" /><text x="0" y="${H - i * 55 + 4}">${((max * i) / 3).toFixed(1)}h</text>`).join("")}
    <polygon
      points="45,200 ${points.join(" ")} ${points.at(-1).split(",")[0]},200"
      fill="url(#chart-fill)"
    />
    <polyline
      pathLength="1"
      points="${points.join(" ")}"
      fill="none"
      stroke="#14956b"
      stroke-width="2.5"
    />
    ${points
      .map((p, i) => {
        const [x, y] = p.split(",");
        return /* HTML */ `<circle
            cx="${x}"
            cy="${y}"
            r="4"
            fill="#14956b"
          ></circle
          >${i % Math.ceil(keys.length / 7) === 0 ? /* HTML */ `<text x="${x}" y="230" text-anchor="middle">${new Date(keys[i] + "T12:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long" })}</text>` : ""}`;
      })
      .join("")}
  </svg>`;
}

export { chart };
