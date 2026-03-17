import * as http from 'http';
import * as os from 'os';
import { getSuccessfulCommands, insertCommand } from '../storage/database';
import { DAEMON_PORT } from '../config';

interface CommandPayload {
  command: string;
  cwd: string;
  exitCode: number;
  sessionId: string;
}

const daemonStartedAt = Date.now();

function recentEventLog(limit = 3): Array<{ timestamp: number; command: string; cwd: string }> {
  return getSuccessfulCommands(limit).map((record) => ({
    timestamp: record.timestamp,
    command: record.command,
    cwd: record.cwd,
  }));
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      // Guard against overly large payloads (32 KB limit)
      if (body.length > 32_768) {
        req.destroy(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function isValidPayload(p: unknown): p is CommandPayload {
  if (typeof p !== 'object' || p === null) return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.command === 'string' &&
    obj.command.trim().length > 0 &&
    typeof obj.cwd === 'string' &&
    typeof obj.exitCode === 'number' &&
    typeof obj.sessionId === 'string'
  );
}

export function createDaemonServer(): http.Server {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      const memoryMb = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
      res.end(
        JSON.stringify({
          status: 'ok',
          pid: process.pid,
          uptimeSec: Math.floor((Date.now() - daemonStartedAt) / 1000),
          memoryMb,
          events: recentEventLog(5),
        })
      );
      return;
    }

    // Record a command from a shell hook
    if (req.method === 'POST' && req.url === '/command') {
      let payload: unknown;
      try {
        const raw = await parseBody(req);
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      if (!isValidPayload(payload)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid payload' }));
        return;
      }

      insertCommand({
        command: payload.command.trim(),
        cwd: payload.cwd || os.homedir(),
        exit_code: payload.exitCode,
        timestamp: Date.now(),
        session_id: payload.sessionId,
      });

      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
}

export function startServer(port: number = DAEMON_PORT): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = createDaemonServer();
    server.on('error', reject);
    // Bind only to loopback — no external network exposure
    server.listen(port, '127.0.0.1', () => {
      console.log(`[traceenv] Daemon listening on 127.0.0.1:${port}`);
      resolve(server);
    });
  });
}
