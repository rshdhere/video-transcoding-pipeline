type WorkerType = "transcoding" | "email_verification";

type WorkerState = {
  activePolls: number;
  shutdown: boolean;
  fallbackWorkerId: string | null;
};

const MAX_CONCURRENT_POLLS = 3;

const workerStates: Record<WorkerType, WorkerState> = {
  transcoding: {
    activePolls: 0,
    shutdown: false,
    fallbackWorkerId: null,
  },
  email_verification: {
    activePolls: 0,
    shutdown: false,
    fallbackWorkerId: null,
  },
};

export function beginWorkerPoll(type: WorkerType) {
  const state = workerStates[type];

  if (state.shutdown) {
    if (type === "email_verification" && state.fallbackWorkerId) {
      return { allowed: true as const, workerId: state.fallbackWorkerId };
    }

    return { allowed: false as const, reason: "WORKER_SHUTDOWN" as const };
  }

  if (state.activePolls >= MAX_CONCURRENT_POLLS) {
    return { allowed: false as const, reason: "POLL_LIMIT_EXCEEDED" as const };
  }

  state.activePolls += 1;
  return { allowed: true as const, workerId: crypto.randomUUID() };
}

export function endWorkerPoll(type: WorkerType) {
  const state = workerStates[type];
  state.activePolls = Math.max(0, state.activePolls - 1);
}

export function shutdownWorker(type: WorkerType) {
  const state = workerStates[type];
  state.shutdown = true;
  state.fallbackWorkerId = crypto.randomUUID();
}

export function resetWorkerRuntime() {
  for (const type of Object.keys(workerStates) as WorkerType[]) {
    workerStates[type] = {
      activePolls: 0,
      shutdown: false,
      fallbackWorkerId: null,
    };
  }
}

export function getWorkerRuntime(type: WorkerType) {
  return workerStates[type];
}
