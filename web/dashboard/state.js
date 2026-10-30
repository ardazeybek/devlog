// Dashboard session and current API snapshot. Never writes activity data.
let current =
    new URLSearchParams(location.search || "").get("tab") === "awards"
      ? "awards"
      : "overview",
  state = { days: {}, goal: 120 },
  token = location.hash.slice(1);
if (token) {
  sessionStorage.setItem("devlog-token", token);
  history.replaceState(null, "", location.pathname);
}
token = token || sessionStorage.getItem("devlog-token");

export function setCurrent(tab) {
  current = tab;
}
export function setState(value) {
  state = value;
}
export { current, state, token };
