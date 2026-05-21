from __future__ import annotations


class LifeEchoWaveformGenerator:
    """Generates lightweight waveform structures for voice memory playback."""

    @staticmethod
    def generate(samples: list[int]) -> dict:
        peak = max(samples) if samples else 0

        return {
            "peak": peak,
            "samples": samples,
            "normalised": [
                round(sample / peak, 3) if peak else 0
                for sample in samples
            ],
        }
