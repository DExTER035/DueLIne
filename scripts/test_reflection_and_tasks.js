import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

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

async function testInteractions() {
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
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  console.log('Connected to CDP');
  await sendCDP(ws, 'Page.enable');
  await sendCDP(ws, 'Runtime.enable');

  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/today' });
  await new Promise(r => setTimeout(r, 1500));

  // 1. TEST INLINE ADD TASK
  console.log('--- 1. Testing Inline Add Task ---');
  const addBtnClicked = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add task'));
      if (btn) { btn.click(); return true; }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Add task button clicked:', addBtnClicked.result.value);
  await new Promise(r => setTimeout(r, 500));

  // Type new task title and submit
  const addSubmitted = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input[placeholder="Enter new task..."]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'Stage 2C.6 Quality Gate Task');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          return true;
        }
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Add form submitted:', addSubmitted.result.value);
  await new Promise(r => setTimeout(r, 800));

  // Verify task count after add
  const countAfterAdd = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const headerText = document.body.innerText;
      const match = headerText.match(/(\\d+)\\s+of\\s+(\\d+)\\s+completed/);
      const hasNewTask = document.body.innerText.includes('Stage 2C.6 Quality Gate Task');
      return { match: match ? match[0] : null, hasNewTask };
    })()`,
    returnByValue: true
  });
  console.log('Counts after add:', countAfterAdd.result.value);

  // 2. TEST EDIT TASK
  console.log('--- 2. Testing Edit Task ---');
  const editStarted = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const editBtn = document.querySelector('button[title="Edit task"]');
      if (editBtn) { editBtn.click(); return true; }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Edit button clicked:', editStarted.result.value);
  await new Promise(r => setTimeout(r, 500));

  // Modify title and submit
  const editSaved = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input[placeholder="Task title..."]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'Edited Project Milestone Review');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          return true;
        }
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Edit form submitted:', editSaved.result.value);
  await new Promise(r => setTimeout(r, 800));

  const afterEdit = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `document.body.innerText.includes('Edited Project Milestone Review')`,
    returnByValue: true
  });
  console.log('Edited task title displayed:', afterEdit.result.value);

  // 3. TEST DAILY REFLECTION PERSISTENCE
  console.log('--- 3. Testing Reflection Entry & Persistence ---');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, 'Stage 2C.6: Reflection saved & verified.');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // 4. TEST RELOAD & PERSISTENCE
  console.log('--- 4. Testing Browser Reload & Persistence ---');
  await sendCDP(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  const afterReload = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const match = text.match(/(\\d+)\\s+of\\s+(\\d+)\\s+completed/);
      const hasAdded = text.includes('Stage 2C.6 Quality Gate Task');
      const hasEdited = text.includes('Edited Project Milestone Review');
      const reflectionVal = document.querySelector('textarea')?.value;
      return {
        match: match ? match[0] : null,
        hasAdded,
        hasEdited,
        reflectionVal
      };
    })()`,
    returnByValue: true
  });
  console.log('State After Reload:', afterReload.result.value);

  // Capture final desktop screenshot showing all functional changes
  const shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'screenshots', 'stage_2c6', 'today_after_functional_test.png'), Buffer.from(shot.data, 'base64'));

  ws.close();
  edge.kill();
  console.log('Finished testing interactions!');
}

testInteractions().catch(console.error);

