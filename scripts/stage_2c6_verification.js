import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUTPUT_DIR = path.resolve(process.cwd(), 'screenshots', 'stage_2c6');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

async function runStage2C6Suite() {
  console.log('>>> Launching Edge headless instance...');
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

  console.log('Connected to Edge via CDP.');
  await sendCDP(ws, 'Page.enable');
  await sendCDP(ws, 'Runtime.enable');
  await sendCDP(ws, 'DOM.enable');

  const report = {
    viewports: [],
    overflows: [],
    consoleErrors: [],
    todayFunctional: {},
    goalsFunctional: {},
    journeyFunctional: {},
    chaptersFunctional: {},
    persistence: {}
  };

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const type = data.params.type;
      const args = (data.params.args || []).map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      if (type === 'error') {
        report.consoleErrors.push(`[Console ERROR] ${args}`);
      }
    } else if (data.method === 'Runtime.exceptionThrown') {
      report.consoleErrors.push(`[Uncaught Exception] ${data.params.exceptionDetails.text}`);
    }
  });

  // 1. VISUAL ACCEPTANCE VIEWPORT AUDIT (5 viewports)
  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 900, mobile: false },
    { name: 'laptop_1280', width: 1280, height: 800, mobile: false },
    { name: 'tablet_768', width: 768, height: 1024, mobile: false },
    { name: 'mobile_390', width: 390, height: 844, mobile: true },
    { name: 'small_mobile_360', width: 360, height: 780, mobile: true }
  ];

  console.log('\n=== 1. AUDITING VIEWPORTS & OVERFLOWS ===');
  for (const vp of viewports) {
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });

    await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/today' });
    await new Promise(r => setTimeout(r, 1200));

    const check = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const hasOverflow = scrollW > docW;
        return { docW, scrollW, hasOverflow };
      })()`,
      returnByValue: true
    });

    const shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
    const filename = `today_${vp.name}.png`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(shot.data, 'base64'));

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): clientWidth=${check.result.value.docW}, scrollWidth=${check.result.value.scrollW}, hasOverflow=${check.result.value.hasOverflow}`);
    report.viewports.push({ ...vp, ...check.result.value });
    if (check.result.value.hasOverflow) {
      report.overflows.push(vp.name);
    }
  }

  // 2. CAPTURE ALL 4 ROUTES ON DESKTOP (1440px) AND MOBILE (390px)
  console.log('\n=== 2. CAPTURING 4 CORE WORKSPACES ===');
  const routes = [
    { name: 'today', path: '/today' },
    { name: 'goals', path: '/goals' },
    { name: 'journey', path: '/journey' },
    { name: 'chapters', path: '/chapters' }
  ];

  for (const r of routes) {
    // Desktop
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sendCDP(ws, 'Page.navigate', { url: `http://localhost:3000${r.path}` });
    await new Promise(r => setTimeout(r, 1500));
    let shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUTPUT_DIR, `${r.name}_desktop_1440.png`), Buffer.from(shot.data, 'base64'));

    // Mobile
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await sendCDP(ws, 'Page.navigate', { url: `http://localhost:3000${r.path}` });
    await new Promise(r => setTimeout(r, 1200));
    shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUTPUT_DIR, `${r.name}_mobile_390.png`), Buffer.from(shot.data, 'base64'));
    console.log(`Captured ${r.name} on Desktop (1440px) and Mobile (390px)`);
  }

  // 3. TODAY FUNCTIONAL VERIFICATION
  console.log('\n=== 3. TODAY FUNCTIONAL TESTING ===');
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/today' });
  await new Promise(r => setTimeout(r, 1500));

  // A. Check initial task counts
  const todayInitial = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const headerText = document.body.innerText;
      const match = headerText.match(/(\\d+)\\s+of\\s+(\\d+)\\s+completed/);
      return { match: match ? match[0] : null, completed: match ? parseInt(match[1]) : null, total: match ? parseInt(match[2]) : null };
    })()`,
    returnByValue: true
  });
  console.log('Today Initial Counts:', todayInitial.result.value);
  report.todayFunctional.initialCounts = todayInitial.result.value;

  // B. Toggle 3rd task (Go for a walk)
  console.log('Toggling 3rd task...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Find the button for 3rd task
      const buttons = Array.from(document.querySelectorAll('button[aria-label="Mark complete"]'));
      if (buttons[0]) {
        buttons[0].click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 600));

  const todayAfterToggle = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const headerText = document.body.innerText;
      const match = headerText.match(/(\\d+)\\s+of\\s+(\\d+)\\s+completed/);
      return { match: match ? match[0] : null, completed: match ? parseInt(match[1]) : null, total: match ? parseInt(match[2]) : null };
    })()`,
    returnByValue: true
  });
  console.log('Today After Toggle Counts:', todayAfterToggle.result.value);
  report.todayFunctional.afterToggle = todayAfterToggle.result.value;

  // C. Test Focus Timer (Start, Pause, Preset)
  console.log('Testing Focus Timer...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Focus'));
      if (startBtn) {
        startBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1200));

  const timerStatus = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const isPauseVisible = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Pause Focus'));
      const timeText = document.querySelector('.font-mono')?.innerText;
      return { isPauseVisible, timeText };
    })()`,
    returnByValue: true
  });
  console.log('Timer running check:', timerStatus.result.value);
  report.todayFunctional.timerRunning = timerStatus.result.value;

  // Pause timer
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const pauseBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Pause Focus'));
      if (pauseBtn) pauseBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  // Change preset to 50 min
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const p50 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '50 min');
      if (p50) p50.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  const timer50 = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `document.querySelector('.font-mono')?.innerText`,
    returnByValue: true
  });
  console.log('Timer after 50 min preset:', timer50.result.value);
  report.todayFunctional.timer50Min = timer50.result.value;

  // Reset back to 25 min
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const p25 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '25 min');
      if (p25) p25.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  // D. Daily Reflection
  console.log('Testing Daily Reflection...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'Stage 2C.6 Verification: Serene focus and deterministic clarity.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return { updated: true };
      }
      return { updated: false };
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // E. Test Browser Refresh & Persistence
  console.log('Testing Browser Refresh Persistence...');
  await sendCDP(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  const persistedToday = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const headerText = document.body.innerText;
      const match = headerText.match(/(\\d+)\\s+of\\s+(\\d+)\\s+completed/);
      const reflection = document.querySelector('textarea')?.value;
      const timer = document.querySelector('.font-mono')?.innerText;
      return {
        match: match ? match[0] : null,
        reflectionText: reflection,
        timerText: timer
      };
    })()`,
    returnByValue: true
  });
  console.log('Persisted Today after Refresh:', persistedToday.result.value);
  report.persistence.today = persistedToday.result.value;

  // 4. GOALS FUNCTIONAL VERIFICATION
  console.log('\n=== 4. GOALS FUNCTIONAL TESTING ===');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/goals' });
  await new Promise(r => setTimeout(r, 1500));

  const goalsState = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const projectCards = document.querySelectorAll('h3');
      const cardTitles = Array.from(projectCards).map(h => h.innerText);
      const metricsText = document.body.innerText;
      return {
        cardTitles: cardTitles.slice(0, 4),
        hasNewProjectBtn: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('New Project')))
      };
    })()`,
    returnByValue: true
  });
  console.log('Goals Workspace State:', goalsState.result.value);
  report.goalsFunctional = goalsState.result.value;

  // 5. JOURNEY FUNCTIONAL VERIFICATION
  console.log('\n=== 5. JOURNEY FUNCTIONAL TESTING ===');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/journey' });
  await new Promise(r => setTimeout(r, 1500));

  const journeyState = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const hasTimeline = text.includes('Evidence Timeline');
      const hasPeriodReview = text.includes('Period Review');
      const hasReflectionArchive = text.includes('Strictly Private Evidence') || text.includes('Local Reflection Journal');
      return { hasTimeline, hasPeriodReview, hasReflectionArchive };
    })()`,
    returnByValue: true
  });
  console.log('Journey State:', journeyState.result.value);
  report.journeyFunctional = journeyState.result.value;

  // 6. CHAPTERS FUNCTIONAL VERIFICATION
  console.log('\n=== 6. CHAPTERS FUNCTIONAL TESTING ===');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/chapters' });
  await new Promise(r => setTimeout(r, 1500));

  const chaptersState = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const hasDraftBtn = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Draft Chapter')));
      const hasReadyToReveal = text.includes('TIME CAPSULE READY TO OPEN') || text.includes('Ready to Reveal');
      const hasSealedVault = text.includes('Sealed Vault');
      return { hasDraftBtn, hasReadyToReveal, hasSealedVault };
    })()`,
    returnByValue: true
  });
  console.log('Chapters State:', chaptersState.result.value);
  report.chaptersFunctional = chaptersState.result.value;

  ws.close();
  edge.kill();

  console.log('\n========================================');
  console.log('STAGE 2C.6 AUDIT COMPLETE:');
  console.log(`Console Errors: ${report.consoleErrors.length}`);
  console.log(`Horizontal Overflows: ${report.overflows.length}`);
  console.log('========================================\n');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'stage_2c6_audit_report.json'),
    JSON.stringify(report, null, 2)
  );
}

runStage2C6Suite().catch(console.error);
