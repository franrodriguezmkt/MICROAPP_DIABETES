import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const recipes = JSON.parse(
  readFileSync(new URL("../content/recipes/recipes.json", import.meta.url), "utf8"),
);
const draftSlugs = recipes
  .filter(({ publicationStatus }) => publicationStatus !== "approved")
  .map(({ slug }) => slug);
const assetRoot = fileURLToPath(new URL("../dist/client", import.meta.url));

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const publicAssets = collectFiles(assetRoot)
  .filter((path) => statSync(path).size > 0)
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
const leakedSlug = draftSlugs.find((slug) => publicAssets.includes(slug));

const serverOnlySecretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "HOTMART_HOTTOK",
  "ACCESS_RATE_LIMIT_PEPPER",
];
const configuredSecretValues = serverOnlySecretNames
  .map((name) => process.env[name])
  .filter((value) => typeof value === "string" && value.length >= 8);
const leakedSecretName = serverOnlySecretNames.find((name) =>
  publicAssets.includes(name),
);
const leakedSecretValue = configuredSecretValues.some((value) =>
  publicAssets.includes(value),
);

if (leakedSlug) {
  throw new Error(`El bundle de producción contiene una receta no aprobada: ${leakedSlug}`);
}

if (leakedSecretName || leakedSecretValue) {
  throw new Error(
    "El bundle del navegador contiene una referencia o valor reservado al servidor.",
  );
}

console.log(
  `Bundle verificado: ${draftSlugs.length} recetas no aprobadas excluidas y secretos del servidor ausentes.`,
);
