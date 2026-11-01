import { esc, duration, bar } from "../helpers.js";
import { emptyState } from "./empty.js";
import { colorFor } from "../analytics.js";

export function languageCard({ langs, total }) {
  const language = /* HTML */ `<article class="card">
    <h2>Time by language</h2>
    ${
      langs.length
        ? langs
            .map(
              ([l, v]) =>
                /* HTML */ `<div class="row">
                    <strong
                      >${DevlogLanguages.icon(l)}${esc(DevlogLanguages.name(l))}</strong
                    ><span>${duration(v)}</span>
                  </div>
                  ${bar(v, total, colorFor(l))}`,
            )
            .join("")
        : emptyState("No activity yet. Your languages appear here.")
    }
  </article>`;

  return language;
}
