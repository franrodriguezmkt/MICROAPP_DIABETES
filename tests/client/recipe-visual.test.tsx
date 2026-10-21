import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecipeVisual } from "../../src/client/components/RecipeVisual";

describe("recipe visual", () => {
  it("renders_a_stable_category_placeholder_without_an_image", () => {
    const { container } = render(
      <RecipeVisual
        recipe={{
          slug: "yogur-con-frutos-rojos",
          title: "Yogur con frutos rojos",
          category: "snack",
        }}
        variant="card"
      />,
    );

    expect(container.querySelector('[data-category="snack"]')).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders_an_optimized_decorative_image_when_available", () => {
    const { rerender } = render(
      <RecipeVisual
        recipe={{
          slug: "yogur-con-frutos-rojos",
          title: "Yogur con frutos rojos",
          category: "snack",
          imagePath: "/recipes/yogur-con-frutos-rojos.webp",
        }}
        variant="card"
      />,
    );

    const cardImage = screen.getByRole("presentation");
    expect(cardImage).toHaveAttribute("alt", "");
    expect(cardImage).toHaveAttribute("decoding", "async");
    expect(cardImage).toHaveAttribute("loading", "lazy");

    rerender(
      <RecipeVisual
        recipe={{
          slug: "yogur-con-frutos-rojos",
          title: "Yogur con frutos rojos",
          category: "snack",
          imagePath: "/recipes/yogur-con-frutos-rojos.webp",
        }}
        variant="detail"
      />,
    );

    const detailImage = screen.getByRole("presentation");
    expect(detailImage).toHaveAttribute("loading", "eager");
    expect(detailImage).toHaveAttribute("fetchpriority", "high");
  });

  it("falls_back_to_the_category_placeholder_when_an_image_fails", () => {
    const { container, rerender } = render(
      <RecipeVisual
        recipe={{
          slug: "yogur-con-frutos-rojos",
          title: "Yogur con frutos rojos",
          category: "snack",
          imagePath: "/recipes/yogur-con-frutos-rojos.webp",
        }}
        variant="card"
      />,
    );

    fireEvent.error(screen.getByRole("presentation"));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".recipe-visual__placeholder")).toBeVisible();

    rerender(
      <RecipeVisual
        recipe={{
          slug: "chips-de-kale",
          title: "Chips de kale",
          category: "snack",
          imagePath: "/recipes/chips-de-kale.webp",
        }}
        variant="card"
      />,
    );

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/recipes/chips-de-kale.webp",
    );
  });
});
