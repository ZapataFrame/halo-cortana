// Detección local de palabra de activación («Ey Cortana») sin servicios externos.
const stripAccents = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Acepta prefijos de saludo comunes en español/inglés o «Cortana» al inicio exacto de la frase,
// evitando falsos positivos cuando se menciona el nombre en medio de una conversación normal.
const NAME = '(?:cortan[ao]|cortanna|kortana)';
const PREFIXED = new RegExp(`(?:^|[\\s,.;:!?¿¡"'()\\-])(?:ey|hey|ei|eh|oye|hola|hay|ay|ai|oiga)\\s*[,.!?]?\\s*${NAME}\\b`, 'i');
const LEADING = new RegExp(`^[\\s,.;:!?¿¡"'()\\-]*${NAME}\\b`, 'i');

export function matchWakeWord(transcript) {
  if (typeof transcript !== 'string') return { matched: false, command: '' };
  const raw = transcript.normalize('NFC').trim();
  if (!raw) return { matched: false, command: '' };
  const normalized = stripAccents(raw);
  const match = PREFIXED.exec(normalized) || LEADING.exec(normalized);
  if (!match) return { matched: false, command: '' };
  // Con NFC, stripAccents preserva la longitud 1:1 en español/inglés.
  const tail = raw.slice(match.index + match[0].length).replace(/^[\s,.;:!?\-–—]+/, '').trim();
  const meaningful = stripAccents(tail).replace(/[^a-z0-9]/gi, '');
  return { matched: true, command: meaningful.length >= 2 ? tail : '' };
}
