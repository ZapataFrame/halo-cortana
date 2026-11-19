// Un AudioContext se desbloquea en el clic, antes de esperar síntesis/red.
export function createClockedAudio({ createContext = () => { if (!globalThis.AudioContext) throw new Error('Este navegador no admite audio sincronizado. Usa un navegador con Web Audio.'); return new AudioContext(); }, clock = Date.now } = {}) {
  let context, gain, buffer, source, timer, volume = .8, generation = 0;
  const audio = {
    onplaying: null, onended: null, onerror: null,
    async unlock() {
      context ||= createContext(); gain ||= context.createGain(); gain.connect(context.destination); gain.gain.value = volume;
      await context.resume();
      if (context.state !== 'running') throw Object.assign(new Error('Activa el sonido en este navegador.'), { name: 'NotAllowedError' });
    },
    async prepare(blob, signal) {
      const current = ++generation;
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      signal?.throwIfAborted();
      if (current !== generation) throw new DOMException('Audio descartado', 'AbortError');
      buffer = decoded;
    },
    async playAt(startAt, offset = 0) {
      if (!buffer || context?.state !== 'running') throw new Error('Activa el sonido y vuelve a intentar.');
      const delay = startAt - (clock() + offset);
      if (delay < -200) throw new Error('El audio llegó tarde. Espera la siguiente lectura.');
      source = context.createBufferSource(); source.buffer = buffer; source.connect(gain);
      source.onended = () => audio.onended?.();
      source.start(context.currentTime + Math.max(0, delay) / 1000);
      timer = setTimeout(() => {
        if (source && context.state === 'running') audio.onplaying?.();
        else { audio.pause(); audio.onerror?.(); }
      }, Math.max(0, delay));
    },
    pause() { generation++; clearTimeout(timer); if (source) { source.onended = null; source.stop(); source.disconnect(); source = undefined; } buffer = undefined; },
    removeAttribute() {}, load() {}, remove() {},
    async close() { audio.pause(); if (context && context.state !== 'closed') await context.close(); },
    get volume() { return volume; },
    set volume(value) { volume = value; if (gain) gain.gain.value = value; },
  };
  return audio;
}

export async function synchronizeClock(request, headers = {}, clock = Date.now) {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const before = clock();
    const response = await request('/api/voice/time', { headers, cache: 'no-store', signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error('El enlace de voz ya no es válido. Abre uno nuevo desde el PC.');
    const data = await response.json(), after = clock();
    if (!Number.isFinite(data.serverNow)) throw new Error('No se pudo sincronizar el reloj de voz.');
    samples.push({ rtt: after - before, offset: data.serverNow - (before + after) / 2 });
  }
  return samples.sort((a, b) => a.rtt - b.rtt)[0].offset;
}
