# ORB Realtime Fix Note

The live debug log shows OpenAI Realtime rejects `response.modalities` on `response.create`.

The frontend client should use `response.output_modalities` for manual/fallback `response.create` events.
