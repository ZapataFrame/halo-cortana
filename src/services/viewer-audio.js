import { createClockedAudio, synchronizeClock } from './clocked-audio.js';

// getRandomValues también está disponible en un visor LAN servido por HTTP.
const viewerId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
export function createViewerAudio({ token, request = fetch, output = createClockedAudio(), onState = () => {}, uuid = viewerId } = {}) {
  let controller, prepared, preparing, heartbeat, offset = 0, run = 0;
  const clientId = uuid(), headers = { Authorization: `Bearer ${token}`, 'X-Voice-Client': clientId };
  async function notifyPlayback(speechId, playing, signal) {
    const response = await request('/api/voice/playback', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, speechId, playing }), signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) });
    if (!response.ok) throw new Error('Se perdió la sincronización del audio. Activa el sonido de nuevo.');
  }
  const report = (phase, detail) => onState({ phase, detail });
  function clear() { prepared = undefined; preparing = undefined; output.onplaying = output.onended = output.onerror = null; output.pause(); }
  function stop() { run++; clearInterval(heartbeat); controller?.abort(); controller = undefined; clear(); report('off', 'Sonido del visor desactivado.'); }
  async function receive(cue, ownRun, signal) {
    if (ownRun !== run || cue.phase === 'heartbeat') return;
    if (cue.phase === 'stopped') { clear(); report('ready', 'Sonido activado. Esperando una lectura del PC.'); return; }
    if (cue.phase === 'prepared') {
      clear(); const job = { id: cue.speechId }; preparing = job;
      report('preparing', 'Preparando la misma voz del PC…');
      const response = await request(`/api/voice/audio/${job.id}`, { headers, signal, cache: 'no-store' });
      if (!response.ok) throw new Error('La lectura fue cancelada o terminó.');
      const blob = await response.blob();
      if (preparing !== job || ownRun !== run) return;
      try { await output.prepare(blob, signal); }
      catch (error) { if (preparing !== job || ownRun !== run) return; throw error; }
      if (preparing !== job || ownRun !== run) return;
      prepared = job.id;
      const ready = await request('/api/voice/ready', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, speechId: prepared }), signal });
      if (!ready.ok) throw new Error('La lectura cambió. Espera la siguiente.');
    } else if (cue.phase === 'scheduled') {
      if (prepared !== cue.speechId) { report('ready', 'Conectado. La próxima lectura se reproducirá aquí.'); return; }
      output.onplaying = () => {
        report('playing', 'Cortana está reproduciendo audio.');
        notifyPlayback(cue.speechId, true, signal).catch(error => { if (ownRun === run && prepared === cue.speechId) { clear(); report('error', error.message); } });
      };
      output.onended = () => { clear(); report('ready', 'Audio terminado. Sonido del visor activado.'); notifyPlayback(cue.speechId, false, signal).catch(() => {}); };
      output.onerror = () => { clear(); report('error', 'El navegador suspendió el sonido. Actívalo de nuevo para la siguiente lectura.'); };
      await output.playAt(cue.startAt, offset);
    }
  }
  async function enable() {
    stop(); const ownRun = run;
    // Debe ejecutarse desde un gesto de usuario antes del primer await.
    try {
      await output.unlock();
      if (ownRun !== run) return;
      if (!token) throw new Error('Abre el enlace de visor con voz desde el control del PC.');
      controller = new AbortController(); const signal = controller.signal;
      offset = await synchronizeClock(request, headers);
      const response = await request('/api/voice/events', { headers, signal, cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo conectar la voz. Abre un enlace nuevo desde el PC.');
      heartbeat = setInterval(async () => {
        try { const response = await request('/api/voice/heartbeat', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }), signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) });
          if (!response.ok) throw new Error('HEARTBEAT');
        } catch { if (ownRun === run) { stop(); report('error', 'Se perdió la conexión de voz. Pulsa Activar sonido para reconectar.'); } }
      }, 5000);
      report('ready', 'Sonido activado. Esperando una lectura del PC.');
      const reader = response.body.getReader(), decoder = new TextDecoder(); let text = '', sequence = 0;
      // Las descargas se procesan en paralelo a la lectura del canal para aceptar cancelación inmediata.
      while (!signal.aborted) {
        const { value, done } = await reader.read(); if (done) break;
        text += decoder.decode(value, { stream: true });
        let end;
        while ((end = text.indexOf('\n\n')) >= 0) {
          const frame = text.slice(0, end); text = text.slice(end + 2);
          if (!frame.startsWith('data: ')) continue;
          const cue = JSON.parse(frame.slice(6));
          if (cue.phase === 'prepared' || cue.phase === 'stopped') sequence++;
          const ownSequence = sequence;
          receive(cue, ownRun, signal).catch(error => {
            if (ownRun === run && ownSequence === sequence && !signal.aborted) { clear(); report('error', `${error.message} Puedes esperar la siguiente lectura o reactivar el sonido.`); }
          });
        }
      }
      if (!signal.aborted) throw new Error('Se perdió la conexión de voz. Pulsa Activar sonido para reconectar.');
    } catch (error) {
      if (ownRun === run) { stop(); report('error', error.message || 'No se pudo activar el sonido del visor.'); }
    }
  }
  return { enable, stop, close() { stop(); output.close(); } };
}
