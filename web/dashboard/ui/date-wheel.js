// Replaces date inputs marked data-date-wheel with scroll-wheel day, month and year pickers.
const ROW = 40;
const FIRST_YEAR = 2000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Returns the number of days in a month (month is 1-based).
function daysIn(year, month) {
  return new Date(year, month, 0).getDate();
}

// Formats a value as a calendar key (YYYY-MM-DD).
function isoOf({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Parses a calendar key, falling back to today when it is empty or invalid.
function parseIso(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
  if (!match) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

// Builds one scrollable column; the value nearest the middle row is the selection.
function column(label, values, selected, onPick) {
  const wheel = document.createElement("div");
  wheel.className = "wheel";
  wheel.setAttribute("role", "listbox");
  wheel.setAttribute("aria-label", label);
  wheel.innerHTML = `<div class="wheel-pad"></div>${values
    .map(
      ([value, text]) =>
        `<button type="button" class="wheel-item" role="option" data-value="${value}">${text}</button>`,
    )
    .join("")}<div class="wheel-pad"></div>`;
  wheel.addEventListener("click", (event) => {
    const item = event.target.closest(".wheel-item");
    if (item) onPick(Number(item.dataset.value));
  });
  let timer;
  wheel.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const item =
        wheel.querySelectorAll(".wheel-item")[
          Math.round(wheel.scrollTop / ROW)
        ];
      if (item) onPick(Number(item.dataset.value));
    }, 140);
  });
  queueMicrotask(() => {
    const index = values.findIndex(([value]) => value === selected);
    if (index >= 0) wheel.scrollTop = index * ROW;
  });
  return wheel;
}

// Enhances one date input with a trigger button and a glass picker panel.
function enhance(input) {
  input.hidden = true;
  if (!input.value) {
    const date = new Date();
    date.setDate(date.getDate() + Number(input.dataset.dateOffset || 0));
    input.value = isoOf({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    });
  }
  const field = document.createElement("div");
  field.className = "date-wheel";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "date-trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  const panel = document.createElement("div");
  panel.className = "date-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  input.before(field);
  field.append(trigger, input, panel);

  const years = [];
  for (let y = FIRST_YEAR; y <= new Date().getFullYear() + 1; y++)
    years.push([y, String(y)]);
  let value = parseIso(input.value),
    dayWheel = null;

  // Shows the chosen date on the trigger and tells the page about a real change.
  function show(changed) {
    trigger.textContent = new Date(
      value.year,
      value.month - 1,
      value.day,
      12,
    ).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (changed) input.dispatchEvent(new Event("change"));
  }

  // Stores a new value; equal values are ignored so programmatic scrolling is silent.
  function commit(next) {
    const before = isoOf(value);
    value = next;
    input.value = isoOf(value);
    show(before !== isoOf(value));
  }

  // Builds the day column for the current month; it is rebuilt only when its length changes.
  function dayColumn() {
    const days = [];
    for (let d = 1; d <= daysIn(value.year, value.month); d++)
      days.push([d, String(d).padStart(2, "0")]);
    return column("Day", days, value.day, (day) => commit({ ...value, day }));
  }

  // Applies a month or year change, keeping the day inside the new month.
  function changeMonthOrYear(next) {
    const lengthBefore = daysIn(value.year, value.month);
    commit({
      ...next,
      day: Math.min(value.day, daysIn(next.year, next.month)),
    });
    if (daysIn(value.year, value.month) !== lengthBefore) {
      const fresh = dayColumn();
      dayWheel.replaceWith(fresh);
      dayWheel = fresh;
    }
  }

  // Opens the panel with all three columns and a Done button.
  function open() {
    dayWheel = dayColumn();
    const monthWheel = column(
      "Month",
      MONTHS.map((m, i) => [i + 1, m]),
      value.month,
      (month) => changeMonthOrYear({ ...value, month }),
    );
    const yearWheel = column("Year", years, value.year, (year) =>
      changeMonthOrYear({ ...value, year }),
    );
    const done = document.createElement("button");
    done.type = "button";
    done.className = "date-done";
    done.textContent = "Done";
    done.onclick = close;
    panel.replaceChildren(dayWheel, monthWheel, yearWheel, done);
    panel.hidden = false;
    panel.style.left = "0";
    panel.style.right = "auto";
    // Keep the panel inside the window by anchoring it to the trigger's right edge.
    if (panel.getBoundingClientRect().right > window.innerWidth - 12) {
      panel.style.left = "auto";
      panel.style.right = "0";
    }
    trigger.setAttribute("aria-expanded", "true");
  }

  // Closes the panel.
  function close() {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }
  trigger.onclick = () => (panel.hidden ? open() : close());
  document.addEventListener("click", (event) => {
    if (!field.contains(event.target)) close();
  });
  show(false);
}

// Enhances every marked date input in the document.
export function enhanceDateInputs(root = document) {
  root.querySelectorAll("input[data-date-wheel]").forEach(enhance);
}
