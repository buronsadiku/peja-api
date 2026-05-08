import type { JobsOptions } from 'bullmq';
import { DEFAULT_JOB_OPTIONS } from './queue.constants.js';

export function jobOptions(overrides?: Partial<JobsOptions>): JobsOptions {
  return { ...DEFAULT_JOB_OPTIONS, ...overrides };
}

export function delayedJobOptions(
  delaySec: number,
  overrides?: Partial<JobsOptions>,
): JobsOptions {
  return { ...DEFAULT_JOB_OPTIONS, delay: delaySec * 1000, ...overrides };
}

export function renderJobOptions(
  overrides?: Partial<JobsOptions>,
): JobsOptions {
  return {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2,
    backoff: { type: 'exponential', delay: 60_000 },
    ...overrides,
  };
}
