import { z } from "zod";

const resourceIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const resourceBaseSchema = z.object({
  id: resourceIdSchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  kind: z.enum(["guide", "planner"]),
});

const pendingResourceSchema = resourceBaseSchema.extend({
  publicationStatus: z.literal("pending"),
  downloadPath: z.never().optional(),
});

const approvedResourceSchema = resourceBaseSchema.extend({
  publicationStatus: z.literal("approved"),
  downloadPath: z
    .string()
    .regex(/^\/resources\/[a-z0-9]+(?:-[a-z0-9]+)*\.pdf$/),
});

export const educationalResourceSchema = z.discriminatedUnion(
  "publicationStatus",
  [pendingResourceSchema, approvedResourceSchema],
);

export const educationalResourceCollectionSchema = z
  .array(educationalResourceSchema)
  .superRefine((resources, context) => {
    const seen = new Set<string>();
    resources.forEach((resource, index) => {
      if (seen.has(resource.id)) {
        context.addIssue({
          code: "custom",
          message: "El id del recurso debe ser único.",
          path: [index, "id"],
        });
      }
      seen.add(resource.id);
    });
  });

export function parseEducationalResources(input: unknown) {
  return educationalResourceCollectionSchema.parse(input);
}

export type EducationalResource = z.infer<typeof educationalResourceSchema>;
