const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert/strict");
let catalog = { scrollTop: 0 },
  x = 0,
  y = 0,
  insertions = 0;
const nodes = {
  "#period": { value: "7" },
  "#range-start": { value: "" },
  "#range-end": { value: "" },
  "#title": {},
  "#notice": {},
};
nodes["#content"] = {
  set innerHTML(v) {
    insertions++;
    catalog = { scrollTop: 0 };
    y = 0;
  },
};
const context = {
  console,
  Date,
  Math,
  JSON,
  Number,
  String,
  Array,
  Set,
  URL,
  URLSearchParams,
  AbortSignal,
  location: { hash: "", pathname: "/" },
  history: { replaceState() {} },
  sessionStorage: { getItem() {}, setItem() {} },
  document: {
    addEventListener() {},
    querySelector: (s) => (s === ".title-catalog" ? catalog : nodes[s] || null),
    querySelectorAll: () => [],
    activeElement: null,
  },
  window: {
    get scrollX() {
      return x;
    },
    get scrollY() {
      return y;
    },
    scrollTo(a, b) {
      x = a;
      y = b;
    },
  },
  fetch: async () => ({
    ok: true,
    json: async () => ({ days: {}, goal: 120, weeklyGoal: 600 }),
  }),
  setInterval() {},
  setTimeout() {},
  DevlogLanguages: require("../../src/shared/languages"),
  DevlogAchievements: require("../../src/shared/achievements"),
};
vm.createContext(context);

// Load real ES modules, preserving live imports, in a small controlled DOM.
const path = require("node:path");
const modules = new Map();
function loadModule(filename) {
  if (modules.has(filename)) return modules.get(filename);
  const mod = new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
    context,
    identifier: filename,
  });
  modules.set(filename, mod);
  return mod;
}
(async () => {
  const app = loadModule(path.resolve(__dirname, "../../web/dashboard/app.js"));
  await app.link((specifier, referring) =>
    loadModule(path.resolve(path.dirname(referring.identifier), specifier)),
  );
  await app.evaluate();
  await new Promise((resolve) => setImmediate(resolve));
  const renderer = modules.get(
    path.resolve(__dirname, "../../web/dashboard/render.js"),
  ).namespace;
  renderer.render();
  catalog.scrollTop = 500;
  x = 8;
  y = 700;
  renderer.render();
  assert.equal(catalog.scrollTop, 500);
  assert.equal(y, 700);
  assert.equal(x, 8);
  context.fetch = async () => ({
    ok: true,
    json: async () => ({ days: {}, goal: 180 }),
  });
  await app.namespace.refresh();
  assert.equal(catalog.scrollTop, 500);
  assert.equal(y, 700);
  const before = insertions;
  await app.namespace.refresh();
  assert.equal(insertions, before);
  console.log(
    "Refresh preserves page and title scroll; unchanged data does not rebuild the DOM.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
