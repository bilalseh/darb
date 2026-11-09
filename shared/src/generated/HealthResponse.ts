/* Generated from the Pydantic models in api/. Do not edit; run `pnpm gen:schemas`. */

/**
 * Liveness payload returned by GET /api/health.
 */
export interface HealthResponse {
  status: "ok";
  version: string;
}
