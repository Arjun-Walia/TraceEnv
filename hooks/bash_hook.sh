#!/usr/bin/env bash
# TraceEnv Bash Hook
# Source this file in your ~/.bashrc:
#   source /path/to/TraceEnv/hooks/bash_hook.sh

TRACEENV_PORT=${TRACEENV_PORT:-7842}
export TRACEENV_SESSION_ID=${TRACEENV_SESSION_ID:-$(date +%s%N)-$$}

_traceenv_precmd() {
  local _exit=$?
  local _cmd
  _cmd=$(HISTTIMEFORMAT='' history 1 2>/dev/null | sed 's/^[[:space:]]*[0-9]*[[:space:]]*//')
  [ -z "$_cmd" ] && return

  curl -s -X POST "http://127.0.0.1:${TRACEENV_PORT}/command" \
    -H 'Content-Type: application/json' \
    --data-binary "{\"command\":\"${_cmd//\"/\\\"}\",\"cwd\":\"${PWD//\"/\\\"}\",\"exitCode\":${_exit},\"sessionId\":\"${TRACEENV_SESSION_ID}\"}" \
    2>/dev/null &
}

PROMPT_COMMAND="_traceenv_precmd${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
