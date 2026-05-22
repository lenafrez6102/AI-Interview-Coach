#!/bin/bash

# Check if Ollama is already running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✓ Ollama is already running"
  # Keep the script running so concurrently doesn't exit
  tail -f /dev/null
else
  echo "Starting Ollama..."
  ollama serve
fi
