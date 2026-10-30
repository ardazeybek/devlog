import { esc, duration, bar } from "../helpers.js";

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
                  ${bar(v, total)}`,
            )
            .join("")
        : '<div class="empty">No activity yet.</div>'
    }
  </article>`;

  return language;
}
