// Minimalny serwer WebSocket (RFC 6455) bez zależności, tylko do lokalnego `npm start`.
// Obsługuje to, czego potrzebuje gra: krótkie wiadomości tekstowe, ping i zamknięcie.

import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Przejmuje połączenie po żądaniu „Upgrade: websocket”.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:stream').Duplex} socket
 * @returns {{ send(text: string): void, close(): void, onmessage: ((text: string) => void) | null, onclose: (() => void) | null } | null}
 */
export function acceptWebSocket(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return null;
  }
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'),
  );
  /** @type {any} */ (socket).setNoDelay?.(true);

  let closed = false;
  const frame = (opcode, payload) => {
    const len = payload.length;
    let header;
    if (len < 126) header = Buffer.from([0x80 | opcode, len]);
    else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    if (socket.writable) socket.write(Buffer.concat([header, payload]));
  };

  const ws = {
    onmessage: null,
    onclose: null,
    send: (text) => frame(0x1, Buffer.from(text, 'utf8')),
    close: () => {
      if (closed) return;
      frame(0x8, Buffer.alloc(0));
      socket.end();
      finish();
    },
  };

  const finish = () => {
    if (closed) return;
    closed = true;
    ws.onclose?.();
  };

  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const opcode = buf[0] & 0x0f;
      const masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      const maskAt = off;
      if (masked) off += 4;
      if (buf.length < off + len) return;
      const payload = Buffer.from(buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= buf[maskAt + (i % 4)];
      buf = buf.subarray(off + len);

      if (opcode === 0x8) return ws.close();
      if (opcode === 0x9) frame(0xa, payload);
      else if (opcode === 0x1) ws.onmessage?.(payload.toString('utf8'));
    }
  });
  socket.on('close', finish);
  socket.on('error', finish);
  return ws;
}
