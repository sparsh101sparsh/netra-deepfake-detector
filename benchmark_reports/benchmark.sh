#!/bin/bash
# -------------------------------------------------------------
# NETRA Live Judge Benchmark One-Click Launcher
# -------------------------------------------------------------
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -f "$DIR/face_morph_env/bin/python" ]; then
    "$DIR/face_morph_env/bin/python" "$DIR/live_judge_benchmark.py" "$@"
else
    python3 "$DIR/live_judge_benchmark.py" "$@"
fi
