import { matchWakeWord } from './wake-word.js';

// Gramática cerrada: el LLM nunca decide ni ejecuta estas acciones.
const dances = new Map([
  ['gangnam style', 'gangnam_style'], ['gangnam', 'gangnam_style'],
  ['baile coreano', 'gangnam_style'],
  ['hip hop', 'hip_hop'], ['hip-hop', 'hip_hop'], ['hiphop', 'hip_hop'],
  ['macarena', 'macarena'], ['la macarena', 'macarena'],
  ['twerk', 'twerk'], ['twerking', 'twerk'],
  ['perreo', 'twerk'],
]);

export function parseCommand(message) {
  const wake = matchWakeWord(message);
  let text = (wake.matched ? wake.command : message).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  text = text.replace(/[.,!¡;:]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^por favor /, '').replace(/ por favor$/, '');
  if (wake.matched && !text) return { type: 'wake' };
  if (/^(?:para|detente|deten (?:el baile|la cancion|la musica|la actuacion)|deja de (?:bailar|cantar))$/.test(text)) return { type: 'stop' };
  if (/^(?:canta|cantar|canta una cancion|pon la cancion|reproduce la cancion)$/.test(text)) return { type: 'sing' };
  const dance = /^(?:baila|bailar|ponte a bailar)(?: (.+))?$/.exec(text);
  if (!dance) return null;
  if (!dance[1] || dance[1] === 'un baile') return { type: 'dance', animation: 'gangnam_style' };
  const animation = dances.get(dance[1].replace(/^(?:el baile de |el |la )/, ''));
  return animation ? { type: 'dance', animation } : { type: 'unknown-dance' };
}
