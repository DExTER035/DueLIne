import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function verify() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--hide-scrollbars',
    'http://localhost:3000/today'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    console.error('No page target found');
    edge.kill();
    return;
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  console.log('Connected to CDP on Edge');
  await sendCDP(ws, 'Page.enable');
  await sendCDP(ws, 'Runtime.enable');
  await sendCDP(ws, 'Log.enable');

  const capturedErrors = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const type = data.params.type;
      const args = (data.params.args || []).map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      if (type === 'error' || type === 'warn') {
        if (args.includes('Hydration') || args.includes('hydration') || args.includes('script tag') || args.includes('Error')) {
          capturedErrors.push(`[Console ${type.toUpperCase()}] ${args}`);
        }
      }
    } else if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
      capturedErrors.push(`[Uncaught Exception] ${desc}`);
    }
  });

  const routes = [
    { name: 'today', url: 'http://localhost:3000/today' },
    { name: 'goals', url: 'http://localhost:3000/goals' },
    { name: 'journey', url: 'http://localhost:3000/journey' },
    { name: 'chapters', url: 'http://localhost:3000/chapters' }
  ];

  for (const route of routes) {
    console.log(`\n--- Auditing Route: ${route.url} ---`);
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await sendCDP(ws, 'Page.navigate', { url: route.url });
    await new Promise(r => setTimeout(r, 2000));

    // Check DOM for Next.js error overlay or error text
    const domCheck = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const nextOverlay = document.querySelector('nextjs-portal');
        const dialogOverlay = document.querySelector('[data-nextjs-dialog-overlay]');
        const bodyText = document.body.innerText;
        const hasHydrationText = bodyText.includes('Hydration failed') || bodyText.includes('Encountered a script tag');
        const title = document.title;
        return {
          title,
          hasErrorOverlay: Boolean(nextOverlay || dialogOverlay),
          hasHydrationText,
          bodySnippet: bodyText.slice(0, 100).replace(/\\n/g, ' ')
        };
      })()`,
      returnByValue: true
    });

    console.log(`Route Result for ${route.name}:`, domCheck.result.value);

    // Capture screenshot
    const shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(SCREENSHOT_DIR, `verified_${route.name}.png`);
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  }

  // Mobile check for Today
  console.log(`\n--- Auditing Mobile Viewport (390px): http://localhost:3000/today ---`);
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/today' });
  await new Promise(r => setTimeout(r, 1500));
  const mobileShot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'verified_today_mobile_390.png'), Buffer.from(mobileShot.data, 'base64'));

  ws.close();
  edge.kill();

  console.log('\n========================================');
  console.log('RUNTIME & HYDRATION AUDIT SUMMARY:');
  console.log(`Target Errors Count: ${capturedErrors.length}`);
  if (capturedErrors.length > 0) {
    capturedErrors.forEach(err => console.error(err));
  } else {
    console.log('>>> ZERO RUNTIME OR HYDRATION ERRORS DETECTED! <<<');
  }
  console.log('========================================\n');
}

verify().catch(console.error);

