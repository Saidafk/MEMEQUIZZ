import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Règles WCAG 2.2 niveau AA (voir le skill a11y-wcag22). axe ne couvre qu'une partie des critères :
// les contrôles manuels (clavier, lecteur d'écran, zoom) restent nécessaires.
const TAGS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Critère de SCRUM-63 : aucune violation critique. On bloque aussi les « serious » (contraste,
// nom accessible manquant…), qui sont des non-conformités AA ; les « moderate » et « minor » sont
// joints au rapport sans faire échouer le test.
const IMPACTS_BLOQUANTS = new Set(["critical", "serious"]);

export async function verifierAccessibilite(page: Page, etape: string): Promise<void> {
  const resultat = await new AxeBuilder({ page })
    .withTags(TAGS_WCAG)
    // Surcouche de développement de Next (présente seulement avec `bun run dev`).
    .exclude("nextjs-portal")
    .analyze();

  const bloquantes = resultat.violations.filter((v) => IMPACTS_BLOQUANTS.has(v.impact ?? ""));
  const autres = resultat.violations.filter((v) => !IMPACTS_BLOQUANTS.has(v.impact ?? ""));
  if (autres.length > 0) {
    console.warn(
      `[axe] ${etape} : ${autres.length} violation(s) non bloquante(s)\n${decrire(autres)}`,
    );
  }

  expect(bloquantes, `Violations axe bloquantes (${etape}) :\n${decrire(bloquantes)}`).toEqual([]);
}

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

// Une ligne par règle, avec les sélecteurs des éléments en cause : le message d'échec suffit pour
// localiser le problème sans ouvrir le rapport HTML.
function decrire(violations: Violation[]): string {
  return violations
    .map((v) => {
      const cibles = v.nodes.map((n) => n.target.join(" ")).join(", ");
      return `- ${v.id} (${v.impact}) : ${v.help} → ${cibles}`;
    })
    .join("\n");
}
