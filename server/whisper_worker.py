"""Whisper local reutilizable, audio acotado en memoria, sin claves ni logs."""
import io
import os
import json
import sys

import av
import numpy as np
from faster_whisper import WhisperModel
from voice_protocol import read_request, write_response


model = None


def initialize():
    global model
    if model is None:
        model = WhisperModel(sys.argv[1], device=os.environ.get("STT_DEVICE", "cpu"),
                             compute_type=os.environ.get("STT_COMPUTE_TYPE", "int8"),
                             cpu_threads=int(os.environ.get("VOICE_CPU_THREADS", "2")), local_files_only=True)


def transcribe(raw):
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
                        raise ValueError("STT_AUDIO_TOO_LONG")
                    samples.append(data)
            for converted in resampler.resample(None):
                data = converted.to_ndarray().flatten()
                total += len(data)
                if total > 16000 * 16:
                    raise ValueError("STT_AUDIO_TOO_LONG")
                samples.append(data)
    except (av.error.FFmpegError, IndexError):
        raise ValueError("STT_INVALID_AUDIO") from None
    except ValueError as error:
        if str(error) == "STT_AUDIO_TOO_LONG":
            raise
        raise ValueError("STT_INVALID_AUDIO") from None
    if total < 6400:
        raise ValueError("STT_NO_SPEECH")
    audio = np.concatenate(samples).astype(np.float32) / 32768.0
    if float(np.sqrt(np.mean(audio ** 2))) < 0.002:
        raise ValueError("STT_NO_SPEECH")
    initialize()
    segments, _info = model.transcribe(audio, language="es", beam_size=int(os.environ.get("STT_BEAM_SIZE", "1")), temperature=0,
                                     initial_prompt="Hey Cortana. Ey Cortana. Baila, cantar, canta, Gangnam Style, Hip Hop, Macarena, Twerk, baile coreano, perreo. UNSC, investigación, ingeniería, demostración.",
                                     condition_on_previous_text=False, vad_filter=True,
                                     vad_parameters={"min_silence_duration_ms": 400}, max_new_tokens=128)
    text = " ".join(segment.text.strip() for segment in segments).strip()
    if not text:
        raise ValueError("STT_NO_SPEECH")
    if len(text) > 2000:
        raise ValueError("STT_AUDIO_TOO_LONG")
    return json.dumps({"text": text, "durationMs": round(total / 16)}, ensure_ascii=False).encode("utf-8")


while True:
    raw = read_request(2 * 1024 * 1024)
    if raw is None:
        break
    try:
        if raw == b"WARMUP":
            initialize()
            write_response(b'{"ready":true}')
        else:
            write_response(transcribe(raw))
    except ValueError as error:
        code = str(error)
        if code not in {"STT_AUDIO_TOO_LONG", "STT_INVALID_AUDIO", "STT_NO_SPEECH"}:
            write_response(b"STT_UNAVAILABLE", ok=False)
            break
        write_response(code.encode("ascii"), ok=False)
    except Exception:
        write_response(b"STT_UNAVAILABLE", ok=False)
        break
