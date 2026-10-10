"""Una transcripción local acotada, sin archivos, claves, URLs ni audio en logs."""
import io
import json
import sys

import av
import numpy as np
from faster_whisper import WhisperModel


def fail(code):
    print(json.dumps({"error": code}))
    sys.exit(2)


raw = sys.stdin.buffer.read(2 * 1024 * 1024 + 1)
if not raw or len(raw) > 2 * 1024 * 1024:
    fail("STT_INVALID_AUDIO")
samples = []
total = 0
try:
    with av.open(io.BytesIO(raw)) as container:
        stream = container.streams.audio[0]
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(stream):
            for converted in resampler.resample(frame):
                data = converted.to_ndarray().flatten()
                total += len(data)
                if total > 16000 * 16:
                    fail("STT_AUDIO_TOO_LONG")
                samples.append(data)
        for converted in resampler.resample(None):
            data = converted.to_ndarray().flatten()
            total += len(data)
            if total > 16000 * 16:
                fail("STT_AUDIO_TOO_LONG")
            samples.append(data)
except (av.error.FFmpegError, IndexError, ValueError):
    fail("STT_INVALID_AUDIO")
if total < 6400:
    fail("STT_NO_SPEECH")
audio = np.concatenate(samples).astype(np.float32) / 32768.0
if float(np.sqrt(np.mean(audio ** 2))) < 0.002:
    fail("STT_NO_SPEECH")
model = WhisperModel(sys.argv[1], device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
segments, _info = model.transcribe(audio, language="es", beam_size=5, temperature=0,
                                 condition_on_previous_text=False, vad_filter=True,
                                 vad_parameters={"min_silence_duration_ms": 400}, max_new_tokens=128)
text = " ".join(segment.text.strip() for segment in segments).strip()
if not text:
    fail("STT_NO_SPEECH")
if len(text) > 2000:
    fail("STT_AUDIO_TOO_LONG")
print(json.dumps({"text": text, "durationMs": round(total / 16)}, ensure_ascii=False))
