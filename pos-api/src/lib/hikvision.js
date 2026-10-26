const http  = require('http');
const https = require('https');
const crypto = require('crypto');

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function parseDigestChallenge(header) {
  const params = {};
  (header || '').replace(/(\w+)="([^"]+)"/g, (_, k, v) => { params[k] = v; });
  return params;
}

// Two-step HTTP Digest Authentication request
function digestRequest(opts, bodyStr) {
  const lib = opts.protocol === 'https:' ? https : http;

  function doRequest(authHeader) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;
      if (bodyStr)    headers['Content-Length'] = Buffer.byteLength(bodyStr);

      const req = lib.request(
        { hostname: opts.hostname, port: opts.port, path: opts.path, method: opts.method, headers },
        (res) => {
          let data = '';
          res.on('data', d => { data += d; });
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        }
      );
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  return doRequest(null).then(async (r1) => {
    if (r1.status !== 401) {
      try { return JSON.parse(r1.body); } catch { return r1.body; }
    }

    const ch = parseDigestChallenge(r1.headers['www-authenticate'] || '');
    const { realm, nonce, qop = 'auth' } = ch;
    const nc     = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');
    const ha1    = md5(`${opts.auth.username}:${realm}:${opts.auth.password}`);
    const ha2    = md5(`${opts.method}:${opts.path}`);
    const resp   = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    const authStr = [
      `Digest username="${opts.auth.username}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${opts.path}"`,
      `qop=${qop}`,
      `nc=${nc}`,
      `cnonce="${cnonce}"`,
      `response="${resp}"`,
    ].join(', ');

    const r2 = await doRequest(authStr);
    if (r2.status < 200 || r2.status >= 300) throw new Error(`Hikvision HTTP ${r2.status}: ${r2.body}`);
    try { return JSON.parse(r2.body); } catch { return r2.body; }
  });
}

/**
 * Fetch attendance events from a Hikvision device.
 * settings: { device_ip, port, username, password }
 * fromTime / toTime: ISO-8601 strings e.g. "2024-10-01T00:00:00+05:30"
 * Returns: [{ event_id, device_employee_id, punch_time, direction }]
 */
async function fetchEvents(settings, fromTime, toTime) {
  const body = JSON.stringify({
    AcsEventCond: {
      searchID:             String(Date.now()),
      searchResultPosition: 0,
      maxResults:           1000,
      major:                5,   // 5 = Access Control events; 0 may be ignored by some firmware
      minor:                0,
      startTime:            fromTime,
      endTime:              toTime,
    },
  });

  const data = await digestRequest({
    protocol: 'http:',
    hostname: settings.device_ip,
    port:     settings.port || 80,
    path:     '/ISAPI/AccessControl/AcsEvent?format=json',
    method:   'POST',
    auth:     { username: settings.username, password: settings.password },
  }, body);

  const list = data?.AcsEvent?.InfoList || [];
  return list.map(e => ({
    event_id:           String(e.serialNo),
    device_employee_id: String(e.employeeNoString || ''),
    // DS-K1A8503 uses 'time', older models use 'dateTime', some use 'happenTime'
    punch_time:         e.dateTime || e.time || e.happenTime || e.eventTime,
    direction:          e.inOutStatus === 'entry' ? 'in'
                      : e.inOutStatus === 'exit'  ? 'out'
                      : 'unknown',
  })).filter(e => e.device_employee_id && e.punch_time);
}

module.exports = { fetchEvents };
