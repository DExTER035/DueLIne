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

async function capture() {
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

  console.log('Connected to CDP');
  await sendCDP(ws, 'Page.enable');
  await sendCDP(ws, 'DOM.enable');

  const configs = [
    { url: 'http://localhost:3000/today', name: 'today_desktop.png', width: 1440, height: 900, mobile: false },
    { url: 'http://localhost:3000/today', name: 'today_mobile_390.png', width: 390, height: 844, mobile: true },
    { url: 'http://localhost:3000/today', name: 'today_mobile_360.png', width: 360, height: 780, mobile: true },
    { url: 'http://localhost:3000/goals', name: 'goals_desktop.png', width: 1440, height: 900, mobile: false },
    { url: 'http://localhost:3000/goals', name: 'goals_mobile_390.png', width: 390, height: 844, mobile: true },
    { url: 'http://localhost:3000/journey', name: 'journey_desktop.png', width: 1440, height: 900, mobile: false },
    { url: 'http://localhost:3000/journey', name: 'journey_mobile_390.png', width: 390, height: 844, mobile: true },
    { url: 'http://localhost:3000/chapters', name: 'chapters_desktop.png', width: 1440, height: 900, mobile: false },
    { url: 'http://localhost:3000/chapters', name: 'chapters_mobile_390.png', width: 390, height: 844, mobile: true },
  ];

  for (const c of configs) {
    console.log(`Setting up ${c.name} (${c.width}x${c.height}, mobile=${c.mobile})`);
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: c.width,
      height: c.height,
      deviceScaleFactor: 1,
      mobile: c.mobile,
    });

    await sendCDP(ws, 'Page.navigate', { url: c.url });
    await new Promise(r => setTimeout(r, 1500));

    // Check for overflow
    const overflowCheck = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const docW = document.documentElement.clientWidth;
        const pageHasOverflow = document.documentElement.scrollWidth > docW;
        const overflowing = [];
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          const isScrollContainer = style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'hidden';
          if (!isScrollContainer && el.scrollWidth > docW + 2) {
            overflowing.push({ tag: el.tagName, class: el.className, scrollW: el.scrollWidth, docW });
          }
        });
        return JSON.stringify({ pageHasOverflow, docW, scrollW: document.documentElement.scrollWidth, uncontainedOverflow: overflowing.slice(0, 5) });
      })()`
    });
    console.log(`Overflow report for ${c.name}:`, overflowCheck.result.value);

    const shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(SCREENSHOT_DIR, c.name);
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${filePath} (${Math.round(shot.data.length / 1024)} KB)`);
  }

  ws.close();
  edge.kill();
  console.log('Finished capturing all screenshots!');
}

capture().catch(console.error);
