import type { Response } from "express";

import { PipelineError } from "./services/pipeline.ts";

export function handlePipelineError(res: Response, error: unknown) {
  if (error instanceof PipelineError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  throw error;
}
