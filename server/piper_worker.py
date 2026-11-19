"""Piper local reutilizable: texto por stdin, WAV en memoria y modelo único."""
import io
import os
import json
from pathlib import Path
import onnxruntime
from piper.config import PiperConfig
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
            options = onnxruntime.SessionOptions()
            options.intra_op_num_threads = int(os.environ.get("VOICE_CPU_THREADS", "2"))
            options.inter_op_num_threads = 1
            voice = PiperVoice(
                config=PiperConfig.from_dict(json.loads(Path(sys.argv[1] + ".json").read_text())),
                session=onnxruntime.InferenceSession(sys.argv[1], sess_options=options, providers=["CPUExecutionProvider"]),
                download_dir=Path(sys.argv[1]).parent)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as output:
            voice.synthesize_wav(text, output)
        write_response(buffer.getvalue())
    except Exception:
        write_response(b"TTS_UNAVAILABLE", ok=False)
        break
