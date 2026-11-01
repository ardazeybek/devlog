import { state } from "./state.js";
import { duration, sum, groups } from "./analytics.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const number = (n) => Math.floor(n || 0).toLocaleString("en-US");
function dates(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - n + 1 + i);
    return key(d);
  });
}
function streak() {
  let n = 0,
    d = new Date();
  if ((state.days[key(d)]?.seconds || 0) < 900) d.setDate(d.getDate() - 1);
  while ((state.days[key(d)]?.seconds || 0) >= 900) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function bar(v, max, color = "") {
  return /* HTML */ `<div class="bar">
    <i
      style="width:${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%;${color ? `background:${color}` : ""}"
    ></i>
  </div>`;
}
function flame(lit) {
  return /* HTML */ `<svg
    class="flame ${lit ? "lit" : ""}"
    viewBox="0 0 32 38"
    aria-hidden="true"
  >
    <path
      class="flame-outer"
      d="M18 2c2 8-5 10-3 16 3-1 5-5 5-8 8 7 11 13 8 20-2 5-7 7-12 7C7 37 2 31 3 24c0-5 3-10 7-13-1 6 1 8 2 9C11 12 18 11 18 2Z"
    />
    <path
      class="flame-inner"
      d="M17 21c0 4-4 5-4 8 0 2 1 4 4 4s5-2 5-5c0-3-3-5-5-7Z"
    />
  </svg>`;
}

export {
  $,
  esc,
  key,
  duration,
  number,
  dates,
  sum,
  groups,
  streak,
  bar,
  flame,
};
