"""Muestra local Piper/RVC, sin LLM, micrófono ni cambios en la aplicación."""
import argparse
import array
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import wave

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / ".rvc-qa"
OUT = BASE / "output"
PHRASE = "Hola, soy Cortana. Estoy lista para ayudarte. ¿Cuál es nuestra siguiente misión?"


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def audio_info(path):
    with wave.open(str(path), "rb") as audio:
        if audio.getsampwidth() != 2 or audio.getnframes() == 0:
            raise RuntimeError("Se esperaba un WAV PCM16 con muestras")
        samples = array.array("h", audio.readframes(audio.getnframes()))
        if sys.byteorder != "little":
            samples.byteswap()
        peak = max(abs(sample) for sample in samples) / 32768
        if peak == 0:
            raise RuntimeError("El audio generado contiene solo silencio")
        return {"seconds": audio.getnframes() / audio.getframerate(),
                "sample_rate": audio.getframerate(), "channels": audio.getnchannels(),
                "peak": peak, "rms": (sum(sample * sample for sample in samples) / len(samples)) ** 0.5 / 32768}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["base", "convert"])
    parser.add_argument("--model", type=Path)
    parser.add_argument("--index", type=Path)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    os.environ["XDG_CACHE_HOME"] = str(BASE / "cache")
    os.environ["NUMBA_CACHE_DIR"] = str(BASE / "cache/numba")
    if args.mode == "base":
        from piper import PiperVoice
        model = BASE / "piper-model/es_AR-daniela-high.onnx"
        started = time.perf_counter()
        voice = PiperVoice.load(str(model), use_cuda=False)
        loaded = time.perf_counter()
        path = OUT / "01-piper.wav"
        with wave.open(str(path), "wb") as output:
            voice.synthesize_wav(PHRASE, output)
        report = {"phrase": PHRASE, "engine": "Piper CPU", "model_sha256": digest(model),
                  "load_seconds": loaded - started, "synthesis_seconds": time.perf_counter() - loaded,
                  "audio": audio_info(path)}
        (OUT / "piper.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return

    if not args.model or not args.index or not args.model.is_file() or not args.index.is_file():
        parser.error("convert requiere --model y --index con archivos locales existentes")
    source = OUT / "01-piper.wav"
    if not source.is_file():
        parser.error("Primero ejecuta el modo base con el Python de Piper")
    import torch
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    # La voz descargada se abre con el cargador restringido de pesos.
    original_load = torch.load
    def restricted_voice_load(path, *positional, **kwargs):
        if isinstance(path, (str, os.PathLike)) and Path(path).resolve() == args.model.resolve():
            kwargs["weights_only"] = True
        return original_load(path, *positional, **kwargs)
    torch.load = restricted_voice_load
    import rvc_python.infer as inference
    # Solo modelos auxiliares del manifiesto verificado; sin descargas implícitas de RVC.
    def checked_models(lib_dir):
        manifest = json.loads((ROOT / "tools/rvc-qa-models.json").read_text())
        for file in manifest["files"]:
            path = Path(lib_dir) / "base_model" / file["name"]
            if not path.is_file() or digest(path) != file["sha256"]:
                raise RuntimeError("Modelo auxiliar ausente o hash incorrecto: " + file["name"])
    inference.download_rvc_models = checked_models
    started = time.perf_counter()
    rvc = inference.RVCInference(device="cpu", models_dir=str(BASE / "voices"),
                                  model_path=str(args.model.resolve()), index_path=str(args.index.resolve()), version="v2")
    rvc.set_params(f0method="rmvpe", f0up_key=0, index_rate=0.5, protect=0.33, rms_mix_rate=0.25)
    loaded = time.perf_counter()
    results = []
    # Primer pase incluye carga de HuBERT/RMVPE/JIT; segundo muestra el modelo caliente.
    for name in ["02-cortana.wav", "03-cortana-caliente.wav"]:
        begin = time.perf_counter()
        output = OUT / name
        rvc.infer_file(str(source), str(output))
        elapsed = time.perf_counter() - begin
        info = audio_info(output)
        if info["seconds"] <= 0:
            raise RuntimeError("La conversión no produjo audio")
        results.append({"file": name, "conversion_seconds": elapsed, "audio": info,
                        "real_time_factor": elapsed / info["seconds"]})
    report = {"engine": "RVC v2 CPU", "model_sha256": digest(args.model),
              "index_sha256": digest(args.index), "load_seconds": loaded - started,
              "parameters": {"pitch": 0, "index_rate": 0.5, "f0": "rmvpe", "speaker": 0},
              "results": results, "listening_evaluation": "Pendiente del propietario"}
    (OUT / "rvc.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
