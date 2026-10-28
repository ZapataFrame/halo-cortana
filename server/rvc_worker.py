"""Conversión local en memoria; stdout contiene exclusivamente marcos binarios."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import sys
import wave

from voice_protocol import read_request, write_response

model_path, index_path = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
manifest_path = Path(sys.argv[3]).resolve()
rvc = None


def initialize():
    global rvc
    import os
    import torch
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    original_load = torch.load
    def load(path, *args, **kwargs):
        if isinstance(path, (str, Path)) and Path(path).resolve() == model_path:
            kwargs["weights_only"] = True
        return original_load(path, *args, **kwargs)
    torch.load = load
    import rvc_python.infer as inference
    def verify(lib_dir):
        for file in json.loads(manifest_path.read_text())["files"]:
            path = Path(lib_dir) / "base_model" / file["name"]
            digest = hashlib.sha256()
            with path.open("rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
            if digest.hexdigest() != file["sha256"]:
                raise ValueError("INVALID_AUXILIARY")
    inference.download_rvc_models = verify
    rvc = inference.RVCInference(device="cpu", models_dir=str(model_path.parent),
                                 model_path=str(model_path), index_path=str(index_path), version="v2")
    if rvc.vc.version != "v2" or rvc.vc.tgt_sr != 48000 or rvc.vc.if_f0 != 1:
        raise ValueError("INVALID_MODEL")
    import faiss
    index = faiss.read_index(str(index_path))
    if index.d != 768 or index.ntotal == 0:
        raise ValueError("INVALID_INDEX")
    from rvc_python.modules.vc.utils import load_hubert
    rvc.vc.hubert_model = load_hubert(rvc.config, rvc.lib_dir)


while True:
    raw = read_request(12 * 1024 * 1024)
    if raw is None:
        break
    try:
        # Las bibliotecas RVC imprimen mensajes: enviarlos a stderr, nunca al protocolo.
        with contextlib.redirect_stdout(sys.stderr):
            import numpy as np
            from scipy.signal import resample_poly
            with wave.open(io.BytesIO(raw), "rb") as source:
                if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, 22050):
                    raise ValueError("INVALID_WAV")
                if not 0 < source.getnframes() <= 20 * 22050:
                    raise ValueError("INVALID_DURATION")
                audio = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(np.float32) / 32768
            audio = resample_poly(audio, 320, 441).astype(np.float32)
            maximum = np.abs(audio).max() / 0.95
            if maximum > 1:
                audio /= maximum
            if rvc is None:
                initialize()
            vc = rvc.vc
            converted = vc.pipeline.pipeline(vc.hubert_model, vc.net_g, 0, audio, "memory", [0, 0, 0],
                0, "rmvpe", str(index_path), 0.5, vc.if_f0, 3, vc.tgt_sr, 0, 0.25, "v2", 0.33)
            converted = resample_poly(converted.astype(np.float32) / 32768, 147, 320)
            if not np.isfinite(converted).all() or not np.abs(converted).max() > 0:
                raise ValueError("EMPTY_AUDIO")
            pcm = np.clip(np.rint(converted * 32768), -32768, 32767).astype("<i2")
            if not 0 < len(pcm) <= 20 * 22050:
                raise ValueError("INVALID_DURATION")
            output = io.BytesIO()
            with wave.open(output, "wb") as target:
                target.setnchannels(1)
                target.setsampwidth(2)
                target.setframerate(22050)
                target.writeframes(pcm.tobytes())
        write_response(output.getvalue())
    except Exception:
        write_response(b"TTS_UNAVAILABLE", ok=False)
        break
