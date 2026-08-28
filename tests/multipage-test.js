const puppeteer = require('puppeteer-core');
const path = require('path');

const APP_DIR = '/home/NAMPD/taphoa';
const PAGES = [
  ['index.html', 'dash', () => `loadDash()`],
  ['ton-kho.html', 'tk', () => `loadTK()`],
  ['nhap-hang.html', 'nh', () => `loadNH()`],
  ['xep-hang.html', 'xh', () => `loadXH()`],
  ['do-gian-hang.html', 'ghk', () => `loadGHK()`],
  ['kiem-ke.html', 'kk', () => `loadKK()`],
  ['bestseller.html', 'best', () => `loadBestseller()`],
  ['bao-cao.html', 'bc', () => `openBC()`],
  ['nhat-ky.html', 'log', () => `loadLog()`],
  ['cai-dat.html', 'setting', () => `loadCaiDat();loadUser();loadNCC();loadGH();loadLoai();`],
];

const results = [];
function check(page, name, pass, detail) { results.push({ page, name, pass, detail: detail || '' }); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  for (const [file, key, initExpr] of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (req) => { if (req.url().startsWith('file://')) req.continue(); else req.abort(); });
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

    await page.goto('file://' + path.join(APP_DIR, file), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof bootPage === 'function', { timeout: 5000 });

    // Stub network-dependent bits + inject realistic data, then simulate the "đã đăng nhập" branch by hand
    await page.evaluate((key, initCall) => {
      window.__apiPostCalls = [];
      const SHEET_MAP = { TonKho: 'TK', NhapHang: 'NH', XepHang: 'XH', NhaCungCap: 'NCC', GianHang: 'GH', LoaiHang: 'LOAI', User: 'USER', KiemKe: 'KK', GianHangKho: 'GHK', Log: 'LOG' };
      window.apiGet = async function (sheet) { const k = SHEET_MAP[sheet]; return (k && C[k]) || []; };
      window.apiPost = async function (data) { window.__apiPostCalls.push(data); return true; };

      C.TK = [
        ['Bia Tiger', 0, 'lon', 18000, 20000, '2026-09-10', '2026-01-01', 10, 'NCC A', 'SP0001', 3, 30, 7, 'Đồ uống'],
        ['Nuoc ngot Coca', 2, 'chai', 9000, 12000, '2026-08-30', '2026-01-01', 10, 'NCC A', 'SP0002', 3, 30, 7, 'Đồ uống'],
        ['Mi tom Hao Hao', 50, 'goi', 3000, 4000, '', '2026-01-01', 10, 'NCC B', 'SP0003', 3, 30, 7, 'Thực phẩm'],
      ];
      C.NCC = [['NCC A', '', '', '', ''], ['NCC B', '', '', '', '']];
      C.GH = [['D5'], ['D6']];
      C.LOAI = [['Đồ uống'], ['Thực phẩm']];
      C.USER = [['NV1', '', '', 'nv1@taphoa.com', '', '']];
      C.NH = [['Bia Tiger', 100, 18000, 'NCC A', '2026-08-01', '', 'NV1', '', 'Đồ uống', 'SP0001']];
      C.XH = [['Bia Tiger', 50, 'D5', '2026-08-15', '', 'SP0001']];
      C.KK = [
        ['2026-08-10', 'SP0001', 'Bia Tiger', 0, 20, 20, '', 'NV1', 'D5', 'dau'],
        ['2026-08-23', 'SP0001', 'Bia Tiger', 0, 10, 10, '', 'NV1', 'D5', 'cuoi'],
      ];
      C.GHK = [];

      document.getElementById('login-mount').innerHTML = '';
      renderShell(key);
      document.getElementById('sb').style.display = 'flex';
      document.getElementById('main').style.display = 'flex';
      document.getElementById('acts').innerHTML = '';
      try { eval(initCall); } catch (e) { window.__initError = e.message + '\\n' + e.stack; }
    }, key, initExpr());

    await new Promise((r) => setTimeout(r, 200));

    const info = await page.evaluate(() => ({
      title: document.getElementById('ptitle')?.textContent,
      navCount: document.querySelectorAll('#sb nav a').length,
      activeNav: document.querySelector('#sb nav a.on')?.getAttribute('href'),
      contentLen: document.getElementById('content')?.textContent.trim().length,
      initError: window.__initError || null,
      // Bắt đúng lớp bug đã gặp thật khi tách trang: nội dung CÓ trong DOM (textContent không rỗng) nhưng
      // bị CSS ẩn đi (thiếu class .sec.on → display:none) — textContent không phát hiện được việc này.
      secVisible: (() => {
        const sec = document.querySelector('#content .sec');
        return sec ? getComputedStyle(sec).display !== 'none' : false;
      })(),
    }));

    check(file, 'bootstrap không lỗi JS', consoleErrors.length === 0 && !info.initError, (consoleErrors[0] || info.initError || ''));
    check(file, 'Sidebar hiện đủ 10 mục điều hướng', info.navCount === 10, `got ${info.navCount}`);
    check(file, 'Đúng mục sidebar được active', info.activeNav === file, `active=${info.activeNav}`);
    check(file, `Tiêu đề topbar đúng`, !!info.title, info.title);
    check(file, 'Nội dung màn được render (không trống)', (info.contentLen || 0) > 30, `len=${info.contentLen}`);
    check(file, 'Khối .sec thực sự HIỂN THỊ (không bị display:none)', info.secVisible, `visible=${info.secVisible}`);

    await page.close();
  }

  await browser.close();

  let pass = 0, fail = 0;
  console.log('\n========== MULTI-PAGE SMOKE TEST ==========\n');
  let curPage = null;
  for (const r of results) {
    if (r.page !== curPage) { curPage = r.page; console.log(`▶ ${curPage}`); }
    const mark = r.pass ? '✅' : '❌';
    if (r.pass) pass++; else fail++;
    console.log(`  ${mark} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`);
  }
  console.log(`\nTỔNG: ${pass + fail} kiểm tra — ${pass} PASS, ${fail} FAIL\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('CRASHED:', e); process.exit(2); });
