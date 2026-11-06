import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUTPUT_DIR = path.resolve(process.cwd(), 'screenshots', 'stage_2c6');

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

async function testAllWorkspaces() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--hide-scrollbars',
    'http://localhost:3000/goals'
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

  // ==========================================
  // 1. GOALS WORKSPACE
  // ==========================================
  console.log('\n=== 1. TESTING GOALS WORKSPACE ===');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/goals' });
  await new Promise(r => setTimeout(r, 1500));

  // A. Click "New Project"
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('New Project'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // B. Fill Project Name & Submit
  const projectCreated = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const nameInput = document.querySelector('input[placeholder="e.g. DueLine Platform Core"]');
      if (nameInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(nameInput, 'Stage 2C.6 Architectural Assurance');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        const form = nameInput.closest('form');
        if (form) {
          const submitBtn = Array.from(form.querySelectorAll('button')).find(b => b.innerText.includes('Create Project') || b.innerText.includes('Save'));
          if (submitBtn) { submitBtn.click(); return true; }
        }
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Goals: Project form submitted:', projectCreated.result.value);
  await new Promise(r => setTimeout(r, 1000));

  const projectVerified = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `document.body.innerText.includes('Stage 2C.6 Architectural Assurance')`,
    returnByValue: true
  });
  console.log('Goals: New project verified in overview:', projectVerified.result.value);

  // Capture screenshot of goals with new project
  let shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'goals_with_new_project.png'), Buffer.from(shot.data, 'base64'));

  // ==========================================
  // 2. JOURNEY WORKSPACE
  // ==========================================
  console.log('\n=== 2. TESTING JOURNEY WORKSPACE ===');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/journey' });
  await new Promise(r => setTimeout(r, 1500));

  // Enter reflection in ReflectionArchive
  const journeyReflectionSaved = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, 'Journey Journal: Evidence timeline verified across all filters.');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Reflection'));
        if (saveBtn) { saveBtn.click(); return true; }
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Journey: Reflection saved:', journeyReflectionSaved.result.value);
  await new Promise(r => setTimeout(r, 800));

  shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'journey_with_reflection.png'), Buffer.from(shot.data, 'base64'));

  // ==========================================
  // 3. CHAPTERS WORKSPACE
  // ==========================================
  console.log('\n=== 3. TESTING CHAPTERS WORKSPACE ===');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:3000/chapters' });
  await new Promise(r => setTimeout(r, 1500));

  // A. Click "Break Seal & Reveal Chapter" on spotlight
  const revealSpotlightClicked = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Break Seal & Reveal Chapter'));
      if (btn) { btn.click(); return true; }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Chapters: Spotlight Break Seal clicked (opens detail modal):', revealSpotlightClicked.result.value);
  await new Promise(r => setTimeout(r, 800));

  // B. Click "Break Seal & Reveal Chapter" inside modal
  const innerRevealClicked = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        const btn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Break Seal & Reveal Chapter'));
        if (btn) { btn.click(); return true; }
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Chapters: Inner Modal Break Seal clicked:', innerRevealClicked.result.value);
  await new Promise(r => setTimeout(r, 1200));

  // Verify that confidential payload is revealed!
  const revealedCheck = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { revealed: false, text: null };
      const text = modal.innerText;
      const hasConfidence = text.includes('If you\'re reading this, the time has arrived') || text.includes('deterministic risk');
      const hasReflectionField = text.includes('Present-Day Revisit Reflection') || Boolean(modal.querySelector('textarea'));
      return { revealed: hasConfidence, hasReflectionField, snippet: text.slice(0, 120) };
    })()`,
    returnByValue: true
  });
  console.log('Chapters: Revealed payload check:', revealedCheck.result.value);

  // Capture screenshot of revealed modal
  shot = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'chapters_revealed_modal.png'), Buffer.from(shot.data, 'base64'));

  ws.close();
  edge.kill();
  console.log('\n>>> All Workspace Verification Complete! <<<');
}

testAllWorkspaces().catch(console.error);
