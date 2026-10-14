import { Hono } from "hono";

export function createWorkerApp(): Hono<WorkerBindings> {
  const app = new Hono<WorkerBindings>();

  app.get("/api/health", (context) =>
    context.json({ ok: true, service: "recipe-app" }),
  );

  return app;
}
