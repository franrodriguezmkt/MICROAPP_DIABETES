declare module "virtual:resource-content" {
  import type { EducationalResource } from "./domain/resources/resource";

  const resources: ReadonlyArray<EducationalResource>;
  export default resources;
}
