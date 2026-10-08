"""Proceso aislado: recibe texto por stdin y devuelve únicamente WAV por stdout."""
import io
import sys
import wave

from piper import PiperVoice

voice = PiperVoice.load(sys.argv[1], use_cuda=False)
text = sys.stdin.read(12001).strip()
if not text or len(text) > 4000:
    raise ValueError("INVALID_TEXT")
buffer = io.BytesIO()
with wave.open(buffer, "wb") as output:
    voice.synthesize_wav(text, output)
sys.stdout.buffer.write(buffer.getvalue())
