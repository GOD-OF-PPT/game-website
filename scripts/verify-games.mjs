import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const [baseArgument, output = 'release-output/runtime/online', ...selected] = process.argv.slice(2);
if (!baseArgument) throw new Error('Usage: node scripts/verify-games.mjs <play-base-url> [output] [game IDs...]');
const base = new URL(baseArgument);
const defaultEdge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.XSJ_BROWSER_PATH ?? (process.platform === 'win32' ? defaultEdge : undefined);
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const checks = {
  async starline(page) {
    await page.click('#v2-title-enter');
    await page.click('#v2-base-start-tut');
    await page.click('#btn-v2-autoplace');
    await page.click('#v2-btn-leave-arrange');
    assert.match(await page.locator('body').innerText(), /高能供能回路|巡逻靶舰/);
    return '装入能量电池并结束首航整备';
  },
  async 'chenyaun-v2'(page) {
    await page.click('#btn-start-new');
    await page.locator('#welcome-screen').waitFor({ state: 'hidden' });
    await page.keyboard.press('Enter');
    await page.keyboard.press('KeyD');
    assert.match(await page.locator('body').innerText(), /青岚破庙石坪/);
    return '新卷进入青岚破庙，发出移动输入';
  },
  async 'fire-zombie'(page) {
    await page.getByTestId('start-btn').click();
    await page.getByText('SCORE', { exact: true }).waitFor();
    await page.mouse.move(720, 540);
    await page.mouse.down();
    await page.mouse.move(820, 540, { steps: 8 });
    await page.mouse.up();
    return '光学干线进入战斗后拖动蜂群';
  },
  async 'kong-rpg'(page) {
    await page.click('#begin');
    await page.locator('#begin-relic').waitFor({ timeout: 150_000 });
    await page.click('#begin-relic');
    await page.click('#choose-wukong');
    await page.click('[data-relic="cloud"]');
    await page.keyboard.down('d');
    await page.keyboard.press('j');
    await page.keyboard.up('d');
    assert.match(await page.locator('body').innerText(), /孙悟空|生命|定力/);
    return '选择悟空和初始舍利，进入首关后移动和攻击';
  },
  async tdk(page) {
    await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__?.getSnapshot().mode === 'playing');
    const { x, y } = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getPadScreenCoordinates('pad_03'));
    await page.mouse.click(x, y);
    await page.click('#btn-card-mortar');
    await page.click('#btn-confirm-build');
    assert.equal(await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot().gold), 140);
    await page.click('#btn-start-wave');
    await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__.getSnapshot().waveInProgress);
    return '建造迫击炮并开始第一波防守';
  },
  async sanguo(page) {
    await page.waitForFunction(() => window.__KOV_APP__?.controller);
    await page.keyboard.press('5');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__KOV_APP__.controller.screenFlow.mode === 'BATTLE');
    await page.keyboard.press('j');
    return '模块化版本从街机标题进入战斗并发出连段输入';
  },
  async shie(page) {
    for (const key of ['5', 'd', 'Enter', 'Enter', 'j']) await page.keyboard.press(key);
    await page.waitForFunction(() => typeof screenFlow !== 'undefined' && screenFlow.mode === 'BATTLE');
    await page.keyboard.press('Tab');
    await page.locator('.chip-card .chip-btn').first().waitFor();
    await page.keyboard.press('Tab');
    return '单文件版本完成选人、开战并打开改装工坊';
  },
  async 'mota-xiyou'(page) {
    await page.click('#new-game', { timeout: 150_000 });
    await page.locator('#skill-inspect').waitFor();
    await page.keyboard.press('ArrowUp');
    assert.match(await page.locator('body').innerText(), /第 1 \/ 18 层/);
    return '新局进入第一层并发出方向键移动';
  },
  async 'sword-led'(page) {
    await page.click('#c12-start-btn');
    await page.click('#c12-begin-forge');
    assert.match(await page.locator('body').innerText(), /已敲\s*0\/2/);
    return '开启灯路并支付铁坯进入首站锻造';
  },
  async 'chenyuan-wendao'(page) {
    const launch = page.getByRole('button', { name: /踏入仙途/ }).first();
    await launch.waitFor({ timeout: 30_000 });
    await page.locator('input').first().fill('青云客');
    await launch.click();
    await page.waitForFunction(() => document.body.innerText.includes('青云客') && document.body.innerText.includes('引气入体'));
    return '创建本机人生，收取青岚山野首个引气目标';
  },
  async 'reborn-2020'(page) {
    const frame = page.frameLocator('iframe.v3-theater-frame');
    const scene = frame.locator('#prologueVnBox');
    await scene.waitFor();
    const before = await scene.innerText();
    await scene.locator('button').first().click();
    assert.notEqual(await scene.innerText(), before);
    await frame.getByRole('button', { name: /跳过序章/ }).click();
    for (const id of ['setupBgGrid', 'setupWishGrid', 'setupStyleGrid']) await frame.locator(`#${id} button`).first().click();
    await frame.getByRole('button', { name: /踏入第一幕战役/ }).click();
    await frame.locator('#btnAdvanceQuarter').waitFor();
    return 'v4 序章交互可用，完成定制后进入第一季';
  },
  async wizzard(page) {
    await page.getByRole('button', { name: /单人练习|练习/ }).first().click();
    const bid = page.getByRole('button', { name: /确认预测/ });
    await bid.waitFor({ timeout: 30_000 });
    await bid.click();
    await bid.waitFor({ state: 'hidden' });
    return '单人练习进入牌桌并确认第一轮预测';
  },
  async splendor(page) {
    await page.getByRole('button', { name: /创建房间/ }).first().click();
    await page.locator('input').first().fill('本站试玩验收');
    await page.getByRole('button', { name: '2 人房', exact: true }).click();
    await page.getByRole('spinbutton', { name: '初始 AI 数量' }).fill('1');
    await page.getByRole('button', { name: /创建并进入等待房/ }).click();
    await page.getByRole('button', { name: '准备', exact: true }).click({ timeout: 24_000 });
    await page.getByRole('button', { name: '开始游戏', exact: true }).click();
    await page.locator('.turn-pill').waitFor({ timeout: 24_000 });
    return '生产 PostgreSQL 房间服务创建真人加 AI 对局并进入回合';
  },
};

await mkdir(output, { recursive: true });
const report = [];
try {
  for (const id of selected.length ? selected : Object.keys(checks)) {
    if (!checks[id]) throw new Error(`Unknown game: ${id}`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(20_000);
      const errors = [], network = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) network.push({ url: response.url(), status: response.status() });
      });
      const url = new URL(`games/${id}/`, base).href;
      let result, failure;
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        assert.equal(response?.status(), 200);
        result = await checks[id](page);
        assert.deepEqual(errors, []);
      } catch (error) {
        failure = error.message.split('\n').slice(0, 5).join(' ').slice(0, 450);
      }
      const screenshot = join(output, `${id}.jpg`);
      await page.screenshot({ path: screenshot, type: 'jpeg', quality: 80 }).catch(() => {});
      const entry = { id, url, result, failure, errors, network, screenshot };
      report.push(entry);
      console.log(JSON.stringify(entry));
      await writeFile(join(output, 'results.json'), JSON.stringify(report, null, 2));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (report.some(entry => entry.failure)) process.exitCode = 1;
