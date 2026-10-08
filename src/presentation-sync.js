const PHASES = new Set(['idle', 'processing', 'responded', 'error']);
const ANIMATIONS = new Set(['idle', 'gangnam']);

export function validatePresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'animation,phase,revision,sessionId'
    || typeof value.sessionId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(value.sessionId)
    || !Number.isSafeInteger(value.revision) || value.revision < 0
    || !PHASES.has(value.phase) || !ANIMATIONS.has(value.animation)) {
    throw new Error('INVALID_PRESENTATION');
  }
  return Object.freeze({ sessionId: value.sessionId, revision: value.revision, phase: value.phase, animation: value.animation });
}

export function createPresentationTracker() {
  let last;
  return {
    accept(value) {
      const next = validatePresentation(value);
      if (last?.sessionId === next.sessionId && next.revision <= last.revision) {
        if (next.revision === last.revision && (next.phase !== last.phase || next.animation !== last.animation)) {
          throw new Error('INCONSISTENT_PRESENTATION');
        }
        return { state: last, changed: false };
      }
      last = next;
      return { state: last, changed: true };
    },
  };
}

async function readPresentation(signal) {
  const response = await fetch('/api/presentation', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('PRESENTATION_UNAVAILABLE');
  return response.json();
}

// Solo lee presentación. La reconexión nunca reenvía una conversación.
export function createPresentationSync({ read = readPresentation, onState, onConnection,
  interval = () => 1000, timeoutMs = 2500, schedule = setTimeout, unschedule = clearTimeout } = {}) {
  const tracker = createPresentationTracker();
  let running = false, epoch = 0, timer, active, connected;
  function connection(value) {
    if (connected === value) return;
    connected = value; onConnection(value);
  }
  async function poll(currentEpoch) {
    const controller = new AbortController();
    const job = { controller, deadline: setTimeout(() => controller.abort(), timeoutMs) };
    active = job;
    try {
      const raw = await read(controller.signal);
      if (!running || epoch !== currentEpoch || controller.signal.aborted) return;
      const result = tracker.accept(raw), recovered = connected !== true;
      connection(true);
      if (result.changed || recovered) onState(result.state);
    } catch {
      if (running && epoch === currentEpoch) connection(false);
    } finally {
      clearTimeout(job.deadline);
      if (active === job) active = undefined;
      if (running && epoch === currentEpoch) timer = schedule(() => poll(currentEpoch), interval());
    }
  }
  return {
    start() {
      if (running) return;
      running = true; poll(++epoch);
    },
    stop() {
      running = false; epoch++;
      unschedule(timer); timer = undefined;
      if (active) { clearTimeout(active.deadline); active.controller.abort(); active = undefined; }
    },
  };
}
