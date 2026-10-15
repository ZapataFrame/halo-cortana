"""Whisper local reutilizable, audio acotado en memoria, sin claves ni logs."""
import io
import json
import sys

import av
import numpy as np
from faster_whisper import WhisperModel
from voice_protocol import read_request, write_response


model = None


def transcribe(raw):
    global model
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
    if model is None:
        model = WhisperModel(sys.argv[1], device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
    segments, _info = model.transcribe(audio, language="es", beam_size=5, temperature=0,
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
