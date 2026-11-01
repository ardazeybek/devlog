// Empty-state markup: a small drawn icon and a line that says what to do next.

// Builds an empty-state block with the given message.
export function emptyState(message) {
  return /* HTML */ `<div class="empty">
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="17" stroke-dasharray="3 5" />
      <path d="M17 25l5 5 9-11" />
    </svg>
    <p>${message}</p>
  </div>`;
}
