#!/usr/bin/env python3
"""Karve P3 local transcription adapter using faster-whisper."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from importlib import metadata
from pathlib import Path
from typing import Any

from faster_whisper import WhisperModel

PROJECT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def fail(message: str, code: int = 1) -> "NoReturn":
    print(f"ERROR: {message}", file=sys.stderr, flush=True)
    raise SystemExit(code)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Transcribe a persistent Karve P2 project with faster-whisper."
    )
    parser.add_argument("--project", required=True, help="Existing Karve project id")
    parser.add_argument(
        "--language",
        default="auto",
        help="Language code such as ar/en, or auto (default: auto)",
    )
    parser.add_argument(
        "--model",
        default="turbo",
        help="faster-whisper model id/size (default: turbo)",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        help="CTranslate2 device (default: cpu; CUDA is not a P3 requirement)",
    )
    parser.add_argument(
        "--compute-type",
        default="int8",
        help="CTranslate2 compute type (default: int8)",
    )
    parser.add_argument(
        "--cpu-threads",
        type=int,
        default=0,
        help="CTranslate2 CPU thread count; 0 lets the runtime choose (default: 0)",
    )
    parser.add_argument(
        "--beam-size", type=int, default=5, help="Whisper beam size (default: 5)"
    )
    parser.add_argument(
        "--vad",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Enable conservative Silero VAD filtering (default: enabled)",
    )
    parser.add_argument(
        "--force", action="store_true", help="Replace an existing transcript.json"
    )
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Cannot read JSON file {path}: {exc}")
    if not isinstance(value, dict):
        fail(f"Expected a JSON object in {path}")
    return value


def package_version(name: str) -> str:
    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:
        return "unknown"


def main() -> int:
    args = parse_args()

    if not PROJECT_RE.fullmatch(args.project):
        fail("Project id may contain only letters, numbers, dot, underscore, and dash")
    if args.cpu_threads < 0:
        fail("--cpu-threads must be 0 or greater")
    if args.beam_size < 1:
        fail("--beam-size must be at least 1")

    data_root = Path(os.environ.get("KARVE_DATA_ROOT", "/karve-data")).resolve()
    project_dir = data_root / "projects" / args.project
    source_path = project_dir / "source.json"
    audio_path = project_dir / "audio.wav"
    output_path = project_dir / "transcript.json"
    model_cache = data_root / "models" / "whisper"

    if not project_dir.is_dir():
        fail(f"Project does not exist: {project_dir}")
    if not source_path.is_file():
        fail(f"P2 metadata is missing: {source_path}")
    if not audio_path.is_file():
        fail(f"P2 normalized audio is missing: {audio_path}")
    if output_path.exists() and not args.force:
        fail(f"Transcript already exists: {output_path} (use --force to replace it)")

    source = read_json(source_path)
    try:
        audio_duration = float(source["source"]["duration_seconds"])
    except (KeyError, TypeError, ValueError):
        fail(f"source.json does not contain a valid source.duration_seconds: {source_path}")
    if audio_duration <= 0:
        fail("Source duration must be greater than zero")

    model_cache.mkdir(parents=True, exist_ok=True)
    requested_language = None if args.language.lower() == "auto" else args.language.lower()

    print(
        f"==> Loading faster-whisper model '{args.model}' "
        f"({args.device}/{args.compute_type})",
        flush=True,
    )
    print(f"==> Persistent model cache: {model_cache}", flush=True)
    load_started = time.monotonic()
    try:
        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type=args.compute_type,
            cpu_threads=args.cpu_threads,
            download_root=str(model_cache),
        )
    except Exception as exc:
        fail(f"Unable to load faster-whisper model '{args.model}': {exc}")
    model_load_seconds = time.monotonic() - load_started

    language_label = requested_language or "auto"
    print(
        f"==> Transcribing {audio_path.name} (language={language_label}, "
        f"word_timestamps=true, vad={str(args.vad).lower()})",
        flush=True,
    )

    transcription_started = time.monotonic()
    try:
        segment_iter, info = model.transcribe(
            str(audio_path),
            language=requested_language,
            task="transcribe",
            beam_size=args.beam_size,
            word_timestamps=True,
            vad_filter=args.vad,
            log_progress=True,
        )

        segments: list[dict[str, Any]] = []
        word_count = 0
        for segment in segment_iter:
            words: list[dict[str, Any]] = []
            for word in segment.words or []:
                text = word.word.strip()
                if not text:
                    continue
                words.append(
                    {
                        "start": round(float(word.start), 6),
                        "end": round(float(word.end), 6),
                        "text": text,
                        "probability": round(float(word.probability), 6),
                    }
                )
            word_count += len(words)
            segments.append(
                {
                    "id": int(segment.id),
                    "start": round(float(segment.start), 6),
                    "end": round(float(segment.end), 6),
                    "text": segment.text.strip(),
                    "avg_logprob": round(float(segment.avg_logprob), 6),
                    "no_speech_prob": round(float(segment.no_speech_prob), 6),
                    "words": words,
                }
            )
    except Exception as exc:
        fail(f"Transcription failed: {exc}")

    transcription_seconds = time.monotonic() - transcription_started
    full_text = " ".join(segment["text"] for segment in segments if segment["text"]).strip()

    result: dict[str, Any] = {
        "schema_version": 1,
        "project_id": args.project,
        "engine": {
            "name": "faster-whisper",
            "version": package_version("faster-whisper"),
            "ctranslate2_version": package_version("ctranslate2"),
            "model": args.model,
            "device": args.device,
            "compute_type": args.compute_type,
            "cpu_threads": args.cpu_threads,
            "beam_size": args.beam_size,
            "word_timestamps": True,
            "vad_filter": args.vad,
            "model_cache": str(model_cache),
        },
        "source": {
            "audio": "audio.wav",
            "source_metadata": "source.json",
            "duration_seconds": audio_duration,
        },
        "language": {
            "requested": requested_language or "auto",
            "detected": info.language,
            "probability": round(float(info.language_probability), 6),
        },
        "timing": {
            "audio_duration_seconds": round(float(info.duration), 6),
            "duration_after_vad_seconds": round(float(info.duration_after_vad), 6),
        },
        "metrics": {
            "segment_count": len(segments),
            "word_count": word_count,
        },
        "runtime": {
            "model_load_seconds": round(model_load_seconds, 3),
            "transcription_seconds": round(transcription_seconds, 3),
            "realtime_factor": round(transcription_seconds / audio_duration, 4),
        },
        "text": full_text,
        "segments": segments,
    }

    tmp_path = output_path.with_name(f".{output_path.name}.tmp-{os.getpid()}")
    try:
        with tmp_path.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp_path, output_path)
    except OSError as exc:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        fail(f"Cannot write transcript atomically to {output_path}: {exc}")

    print("", flush=True)
    print("P3 transcription: PASS", flush=True)
    print(f"Language: {info.language} ({float(info.language_probability):.3f})", flush=True)
    print(f"Segments: {len(segments)}", flush=True)
    print(f"Words: {word_count}", flush=True)
    print(f"Transcription time: {transcription_seconds:.2f}s", flush=True)
    print(f"Realtime factor: {transcription_seconds / audio_duration:.3f}", flush=True)
    print(f"Output: {output_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
