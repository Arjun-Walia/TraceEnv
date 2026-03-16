#!/usr/bin/env zsh
# TraceEnv Zsh Hook
# Source this file in your ~/.zshrc:
#   source /path/to/TraceEnv/hooks/zsh_hook.zsh

TRACEENV_PORT=${TRACEENV_PORT:-7842}
export TRACEENV_SESSION_ID=${TRACEENV_SESSION_ID:-$(date +%s%N)-$$}

_traceenv_precmd() {
  local _exit=$?
  local _cmd
  _cmd=$(fc -ln -1 2>/dev/null)
  [ -z "$_cmd" ] && return

  curl -s -X POST "http://127.0.0.1:${TRACEENV_PORT}/command" \
    -H 'Content-Type: application/json' \
    --data-binary "{\"command\":\"${_cmd//\"/\\\"}\",\"cwd\":\"${PWD//\"/\\\"}\",\"exitCode\":${_exit},\"sessionId\":\"${TRACEENV_SESSION_ID}\"}" \
    2>/dev/null &
}

autoload -Uz add-zsh-hook
add-zsh-hook precmd _traceenv_precmd
