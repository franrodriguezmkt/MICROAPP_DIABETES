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

if (leakedSlug) {
  throw new Error(`El bundle de producción contiene una receta no aprobada: ${leakedSlug}`);
}

console.log(`Bundle editorial verificado: ${draftSlugs.length} recetas no aprobadas excluidas.`);
