function extractIpsFromCandidate(candidate) {
  const ips = [];
  if (typeof candidate !== 'string') return ips;
  // Very lightweight IP extraction; good enough for leak checks.
  const ipv4 = candidate.match(/\b(\d{1,3}\.){3}\d{1,3}\b/g) || [];
  for (const ip of ipv4) ips.push(ip);
  return ips;
}

function isPrivateIpv4(ip) {
  if (typeof ip !== 'string') return false;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    return n >= 16 && n <= 31;
  }
  return false;
}

async function runWebrtcProbe({ report, profile, timeouts, pageProvider }) {
  // This probe needs a browser page context. In v1, we require a pageProvider
  // to avoid coupling to Puppeteer/Electron internals in this module.
  if (!pageProvider || typeof pageProvider.getPage !== 'function') {
    report.webrtc.status = 'unknown';
    report.webrtc.evidence.push('webrtc probe skipped: no pageProvider');
    return;
  }

  const page = await pageProvider.getPage(profile);
  const collectTimeoutMs = timeouts.perUrlCollectMs || 8000;

  const result = await page.evaluate(
    (timeoutMs) =>
      new Promise((resolve) => {
        const out = { candidates: [], error: null };
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve(out);
        };

        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.onicecandidate = (e) => {
            if (e && e.candidate && e.candidate.candidate) out.candidates.push(e.candidate.candidate);
            if (!e || !e.candidate) {
              try {
                pc.close();
              } catch (err) {}
              done();
            }
          };

          pc.createDataChannel('x');
          pc
            .createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false })
            .then((offer) => pc.setLocalDescription(offer))
            .catch((err) => {
              out.error = String(err && err.message ? err.message : err);
              done();
            });

          setTimeout(() => {
            try {
              pc.close();
            } catch (err) {}
            done();
          }, timeoutMs);
        } catch (err) {
          out.error = String(err && err.message ? err.message : err);
          done();
        }
      }),
    collectTimeoutMs
  );

  if (result && result.error) {
    report.webrtc.status = 'unknown';
    report.webrtc.evidence.push(`webrtc error: ${result.error}`);
    return;
  }

  const candidates = (result && Array.isArray(result.candidates) ? result.candidates : []).slice(0, 50);
  const ips = new Set();
  for (const c of candidates) {
    for (const ip of extractIpsFromCandidate(c)) ips.add(ip);
  }

  const localIps = [];
  const publicIps = [];
  for (const ip of ips) {
    if (isPrivateIpv4(ip)) localIps.push(ip);
    else publicIps.push(ip);
  }

  report.webrtc.localIps = localIps;
  report.webrtc.publicIps = publicIps;

  if (localIps.length > 0) {
    report.webrtc.status = 'leak';
    report.webrtc.evidence.push(`private ip exposed: ${localIps.slice(0, 5).join(', ')}`);
  } else {
    report.webrtc.status = 'ok';
  }
}

module.exports = {
  name: 'webrtc',
  run: runWebrtcProbe,
};

