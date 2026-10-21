import { useEffect, useState } from "react";

import type { Recipe } from "../../domain/recipes/recipe";

type RecipeVisualRecipe = Pick<
  Recipe,
  "slug" | "title" | "category" | "imagePath"
>;

type RecipeVisualProps = {
  recipe: RecipeVisualRecipe;
  variant: "card" | "detail";
};

export function RecipeVisual({ recipe, variant }: RecipeVisualProps) {
  const isDetail = variant === "detail";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [recipe.imagePath]);

  return (
    <div
      className={`recipe-visual recipe-visual--${variant} recipe-visual--${recipe.category}`}
      data-testid="recipe-visual"
      data-category={recipe.category}
    >
      {recipe.imagePath && !imageFailed ? (
        <img
          src={recipe.imagePath}
          alt=""
          width={isDetail ? 1200 : 640}
          height={isDetail ? 800 : 480}
          loading={isDetail ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isDetail ? "high" : "auto"}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="recipe-visual__placeholder" aria-hidden="true">
          <span className="plate-motif" />
          <span className="leaf-motif" />
        </div>
      )}
    </div>
  );
}
