"""ORB Voice v2 TTS fallback marking when Katherine is requested."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from services.orb_voice_tts_service import ORBVoiceTTSResult, synthesize_spoken_reply


class OrbVoiceV2TtsFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_katherine_with_forced_openai_marks_fallback_true(self) -> None:
        fake_result = ORBVoiceTTSResult(
            audio_bytes=b"audio",
            content_type="audio/mpeg",
            voice_id="katherine",
            voice_style="calm_therapeutic",
            provider="openai",
            voice_name="Fallback voice (nova)",
            fallback_used=False,
        )

        with patch.dict(
            os.environ,
            {
                "ORB_TTS_ENABLED": "true",
                "ORB_TTS_PROVIDER": "openai",
                "OPENAI_API_KEY": "test-key",
            },
            clear=False,
        ), patch(
            "services.orb_voice_tts_service.generate_speech",
            return_value=fake_result,
        ), patch(
            "services.orb_voice_tts_service._provider_configured",
            return_value=True,
        ):
            final = await synthesize_spoken_reply(
                text="I can help you think that through.",
                voice_id="katherine",
                context="live_voice",
            )

        self.assertTrue(final.fallback_used)
        self.assertEqual(final.fallback_reason, "provider_forced_openai")
        self.assertEqual(final.provider, "openai")


if __name__ == "__main__":
    unittest.main()
