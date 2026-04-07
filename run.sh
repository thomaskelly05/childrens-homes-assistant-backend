#!/usr/bin/env bash
set -e

if [ -f ".venv/bin/activate" ]; then
  . .venv/bin/activate
fi

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

uvicorn app:app --reload --host 127.0.0.1 --port 8000
