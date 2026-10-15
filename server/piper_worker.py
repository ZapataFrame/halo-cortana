"""Piper local reutilizable: texto por stdin, WAV en memoria y modelo único."""
import io
import sys
import wave

from piper import PiperVoice
from voice_protocol import read_request, write_response

voice = None
while True:
    raw = read_request(16000)
    if raw is None:
        break
    try:
        text = raw.decode("utf-8").strip()
        if not text or len(text) > 4000:
            raise ValueError("INVALID_TEXT")
        if voice is None:
            voice = PiperVoice.load(sys.argv[1], use_cuda=False)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as output:
            voice.synthesize_wav(text, output)
        write_response(buffer.getvalue())
    except Exception:
        write_response(b"TTS_UNAVAILABLE", ok=False)
        break
