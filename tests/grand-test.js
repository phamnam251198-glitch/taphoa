// GRAND TEST — kiểm thử tổng hợp cho app Tạp Hóa (chạy trực tiếp trên các file .html/app.js/style.css
// thật, KHÔNG đụng Firebase thật: mọi request mạng bị chặn, apiGet/apiPost bị stub lại trong từng trang).
// App giờ là NHIỀU TRANG (mỗi màn hình 1 file .html riêng, xem PROJECT_CONTEXT.md) nên mỗi nhóm kiểm tra
// dưới đây mở ĐÚNG trang sở hữu logic cần test, thay vì gọi go('...') như bản SPA cũ.
const puppeteer = require('puppeteer-core');
const path = require('path');

const APP_DIR = '/home/NAMPD/taphoa';
const results = []; // {area, name, pass, detail}
function check(area, name, pass, detail) { results.push({ area, name, pass, detail: detail || '' }); }

const SHEET_MAP_SRC = `{TonKho:'TK',NhapHang:'NH',XepHang:'XH',NhaCungCap:'NCC',GianHang:'GH',LoaiHang:'LOAI',User:'USER',KiemKe:'KK',GianHangKho:'GHK',Log:'LOG'}`;

let browser;
const allConsoleErrors = [];

async function openPage(file, key) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (req) => { if (req.url().startsWith('file://')) req.continue(); else req.abort(); });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) allConsoleErrors.push(`[${file}] ` + msg.text());
  });
  page.on('pageerror', (err) => allConsoleErrors.push(`[${file}] pageerror: ` + err.message));

  await page.goto('file://' + path.join(APP_DIR, file), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof bootPage === 'function', { timeout: 5000 });

  // Bypass đăng nhập thủ công (giống nhánh "đã đăng nhập" trong app.js) + stub apiGet/apiPost để không
  // đụng Firebase thật; apiGet PHẢI đọc/ghi đúng biến C hiện có (không phải mảng rỗng cố định) vì nhiều
  // hàm load...() ghi đè thẳng C.XXX = await apiGet(...).
  await page.evaluate((key, sheetMapSrc) => {
    window.__apiPostCalls = [];
    const SHEET_MAP = eval('(' + sheetMapSrc + ')');
    window.apiGet = async function (sheet) { const k = SHEET_MAP[sheet]; return (k && C[k]) || []; };
    window.apiPost = async function (data) { window.__apiPostCalls.push(JSON.parse(JSON.stringify(data))); return true; };
    document.getElementById('login-mount').innerHTML = '';
    renderShell(key);
    document.getElementById('sb').style.display = 'flex';
    document.getElementById('main').style.display = 'flex';
    document.getElementById('acts').innerHTML = '';
  }, key, SHEET_MAP_SRC);

  return page;
}

// Bộ dữ liệu giả lập dùng chung — mỗi trang tự set C.* của riêng nó qua page.evaluate với object này
const SEED = {
  TK: [
    ['Bia Tiger', 0, 'lon', 18000, 20000, '2026-09-10', '2026-01-01', 10, 'NCC A', 'SP0001', 3, 30, 7, 'Đồ uống'],
    ['Nuoc ngot Coca', 2, 'chai', 9000, 12000, '2026-08-30', '2026-01-01', 10, 'NCC A', 'SP0002', 3, 30, 7, 'Đồ uống'],
    ['Mi tom Hao Hao', 50, 'goi', 3000, 4000, '', '2026-01-01', 10, 'NCC B', 'SP0003', 3, 30, 7, 'Thực phẩm'],
    ['Xuc xich', 20, 'goi', 15000, 20000, '2026-01-01', '2026-01-01', 10, 'NCC B', 'SP0004', 3, 30, 7, 'Thực phẩm'],
    ...Array.from({ length: 25 }, (_, i) => ['SP test ' + (i + 5), 10, 'cai', 1000, 1500, '', '2026-01-01', 10, '', 'SP' + String(i + 5).padStart(4, '0'), 3, 30, 7, 'Khác']),
  ],
  NCC: Array.from({ length: 25 }, (_, i) => ['NCC ' + (i + 1), '0900000' + i, '', '', '']),
  GH: [['D5'], ['D6']],
  LOAI: [['Đồ uống'], ['Thực phẩm'], ['Khác']],
  USER: [['NV1', '', '', '', '', '']],
  NH: [
    ['Bia Tiger', 100, 18000, 'NCC A', '2026-08-01', '', 'NV1', '', 'Đồ uống', 'SP0001'],
    ['Nuoc ngot Coca', 50, 9000, 'NCC A', '2026-08-05', '', 'NV1', '', 'Đồ uống', 'SP0002'],
    ['Nuoc ngot Coca', 30, 9000, 'NCC A', '2026-08-16', '', 'NV1', '', 'Đồ uống', 'SP0002'],
    ['Mi tom Hao Hao', 20, 3000, 'NCC B', '2026-08-06', '', 'NV1', '', 'Thực phẩm', 'SP0003'],
  ],
  XH: [
    ['Bia Tiger', 50, 'D5', '2026-08-15', '', 'SP0001'],
    ['Bia Tiger', 30, 'D6', '2026-08-15', '', 'SP0001'],
    ['Nuoc ngot Coca', 20, 'D5', '2026-08-16', '', 'SP0002'],
  ],
  KK: [
    ['2026-08-10', 'SP0001', 'Bia Tiger', 0, 20, 20, '', 'NV1', 'D5', 'dau'],
    ['2026-08-10', 'SP0002', 'Nuoc ngot Coca', 0, 0, 0, '', 'NV1', 'D5', 'dau'],
    ['2026-08-23', 'SP0001', 'Bia Tiger', 0, 10, 10, '', 'NV1', 'D5', 'cuoi'],
    ['2026-08-23', 'SP0002', 'Nuoc ngot Coca', 0, 80, 80, '', 'NV1', 'D5', 'cuoi'],
    ['2026-08-20', 'SP0004', 'Xuc xich', 25, 20, -5, '', 'NV1', ''],
    ['2026-08-05', 'SP0003', 'Mi tom Hao Hao', 40, 40, 0, '', 'NV1', ''],
  ],
  GHK: [],
};

async function seed(page, keys) {
  await page.evaluate((seed, keys) => { for (const k of keys) C[k] = JSON.parse(JSON.stringify(seed[k])); }, SEED, keys);
}

(async () => {
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  // ══ A+B+G. TỒN KHO (ton-kho.html) — Mã SP linking, phân trang, bug dấu nháy đơn ══
  {
    const page = await openPage('ton-kho.html', 'tk');
    await seed(page, ['TK', 'LOAI']);
    const aRes = await page.evaluate(async () => {
      await loadTK();
      const out = {};
      out.genNext = genNextMaSP();
      out.nhIdxByMa = nhTKIndex(['Bia Tiger', 10, 18000, '', '', '', '', '', '', 'SP0001']);
      out.nhIdxByNameFallback = nhTKIndex(['Nuoc ngot Coca', 10, 0, '', '', '', '', '', '', '']);
      out.xhIdxByMa = xhTKIndex(['Bia Tiger', 5, 'D5', '', '', 'SP0001']);
      return out;
    });
    check('Mã SP', 'genNextMaSP() sinh đúng mã kế tiếp', aRes.genNext === 'SP0030', `got ${aRes.genNext}, expect SP0030`);
    check('Mã SP', 'nhTKIndex() tra theo Mã SP', aRes.nhIdxByMa === 0, `got ${aRes.nhIdxByMa}`);
    check('Mã SP', 'nhTKIndex() dự phòng theo tên khi thiếu mã', aRes.nhIdxByNameFallback === 1, `got ${aRes.nhIdxByNameFallback}`);
    check('Mã SP', 'xhTKIndex() tra theo Mã SP', aRes.xhIdxByMa === 0, `got ${aRes.xhIdxByMa}`);

    const bRes = await page.evaluate(() => {
      fTK();
      const khacGroup = [...document.querySelectorAll('#tk-tbl .acc-group')].find((d) => d.querySelector('summary').textContent.includes('Khác'));
      const rows = khacGroup ? khacGroup.querySelectorAll('tbody tr').length : -1;
      const pagerText = khacGroup ? khacGroup.querySelector('.pager span')?.textContent : '';
      return { rows, pagerText, hasPager: !!(khacGroup && khacGroup.querySelector('.pager')) };
    });
    check('Tồn kho', 'Khối "Khác" (25 SP) chỉ hiện 20 dòng/trang', bRes.rows === 20, `got ${bRes.rows} rows`);
    check('Tồn kho', 'Có thanh phân trang khi > 20 SP', bRes.hasPager, bRes.pagerText);

    const bRes2 = await page.evaluate(() => {
      gotoTKPage('Khác', 2);
      const khacGroup = [...document.querySelectorAll('#tk-tbl .acc-group')].find((d) => d.querySelector('summary').textContent.includes('Khác'));
      return khacGroup.querySelectorAll('tbody tr').length;
    });
    check('Tồn kho', 'Trang 2 của "Khác" hiện 5 SP còn lại (25-20)', bRes2 === 5, `got ${bRes2}`);

    const gRes = await page.evaluate(() => {
      C.TK.push(["Bánh Chinsu's Deli", 5, 'goi', 1000, 1500, '', '2026-01-01', 10, '', 'SP9999', 3, 30, 7, 'Thực phẩm']);
      fTK();
      const btns = [...document.querySelectorAll('#tk-tbl button')].filter((b) => b.textContent.trim() === 'Xóa');
      const target = btns.find((b) => b.getAttribute('onclick').includes('delSP('));
      return { onclickAttr: target ? target.getAttribute('onclick') : null, hasQuoteInOnclick: target ? target.getAttribute('onclick').includes('Chinsu') : false };
    });
    check('Bảo mật/ổn định', 'Nút Xóa SP tên có dấu nháy đơn không nhúng tên vào onclick (chỉ truyền row)', gRes.onclickAttr && !gRes.hasQuoteInOnclick, gRes.onclickAttr);
    await page.close();
  }

  // ══ C. DASHBOARD (index.html) — popup trạng thái + Bestseller (giờ dùng ĐÚNG công thức, chung với
  // màn Bestseller riêng — không còn là ước tính thô theo SL xếp hàng nữa) ══
  {
    const page = await openPage('index.html', 'dash');
    await seed(page, ['TK', 'XH', 'KK']);
    const cRes = await page.evaluate(() => {
      dashHet = C.TK.filter((r) => stTK(r) === 'het');
      dashLow = C.TK.filter((r) => Number(r[1] || 0) <= getSapHet(r));
      dashExp = C.TK.filter((r) => r[5]);
      openDashList('het');
      const rowsHet = [...document.querySelectorAll('#dash-list-tbl .simple-row')].map((r) => r.textContent.trim());
      renderDashBest();
      const bestText = document.getElementById('d-best').textContent;
      return { rowsHet, bestText, dashHetLen: dashHet.length };
    });
    check('Dashboard', 'openDashList("het") liệt kê đúng SP hết hàng', cRes.dashHetLen === 1 && cRes.rowsHet[0].includes('Bia Tiger'), JSON.stringify(cRes.rowsHet));
    check('Dashboard', 'Card Bestseller dùng ĐÚNG công thức Đã bán (Bia Tiger=90), không phải SL xếp hàng thô (80)', cRes.bestText.includes('Bia Tiger') && cRes.bestText.includes('90') && !cRes.bestText.includes('lần xếp'), cRes.bestText.slice(0, 250));
    check('Dashboard', 'Card Bestseller xếp Coca sau Bia Tiger vì Coca ra số ÂM (-60) theo đúng công thức', cRes.bestText.indexOf('Bia Tiger') < cRes.bestText.indexOf('Coca'), cRes.bestText.slice(0, 250));
    await page.close();
  }

  // ══ D. NHẬP HÀNG (nhap-hang.html) — Top sản phẩm nhập ══
  {
    const page = await openPage('nhap-hang.html', 'nh');
    await seed(page, ['NH']);
    const dRes = await page.evaluate(() => {
      const groups = groupNHByDate(C.NH);
      rNH(groups);
      return document.getElementById('nh-top').textContent;
    });
    check('Nhập hàng', 'Top sản phẩm gộp đúng theo Mã SP (Coca 50+30=80)', dRes.includes('Nuoc ngot Coca') && dRes.includes('80'), dRes.slice(0, 200));
    await page.close();
  }

  // ══ E. KIỂM KÊ (kiem-ke.html) — kkBuildList, kkHasLaterActivity, kkRevertOne ══
  {
    const page = await openPage('kiem-ke.html', 'kk');
    await seed(page, ['TK', 'NH', 'XH', 'KK', 'GHK']);
    const eRes = await page.evaluate(() => {
      const listKhoTong = kkBuildList('');
      const listD5 = kkBuildList('D5');
      const rXucXich = C.KK.find((r) => r[2] === 'Xuc xich');
      const safeXucXich = !kkHasLaterActivity(rXucXich, C.KK.indexOf(rXucXich));
      const rMiTom = C.KK.find((r) => r[2] === 'Mi tom Hao Hao');
      const unsafeMiTom = kkHasLaterActivity(rMiTom, C.KK.indexOf(rMiTom));
      return { khoTongCount: listKhoTong.length, d5Names: listD5.map((x) => x.label).sort(), safeXucXich, unsafeMiTom };
    });
    check('Kiểm kê', 'kkBuildList("") liệt kê đủ mọi SP Tồn kho', eRes.khoTongCount === 29, `got ${eRes.khoTongCount}`);
    check('Kiểm kê', 'kkBuildList("D5") chỉ gồm SP từng xếp vào D5', JSON.stringify(eRes.d5Names) === JSON.stringify(['Bia Tiger', 'Nuoc ngot Coca']), JSON.stringify(eRes.d5Names));
    check('Kiểm kê', 'Xóa kiểm kê KHÔNG có giao dịch sau → nhận diện AN TOÀN hoàn tác', eRes.safeXucXich, `safeXucXich=${eRes.safeXucXich}`);
    check('Kiểm kê', 'Xóa kiểm kê CÓ Nhập hàng sau → nhận diện KHÔNG an toàn hoàn tác', eRes.unsafeMiTom, `unsafeMiTom=${eRes.unsafeMiTom}`);

    const eRevert = await page.evaluate(async () => {
      window.__apiPostCalls = [];
      const rXucXich = C.KK.find((r) => r[2] === 'Xuc xich');
      await kkRevertOne(rXucXich);
      const idx = C.TK.findIndex((t) => t[9] === 'SP0004');
      return { newSL: C.TK[idx][1], apiPostCall: window.__apiPostCalls[0] };
    });
    check('Kiểm kê', 'kkRevertOne() trả Tồn kho về đúng số Sổ sách (25)', eRevert.newSL === 25, `got ${eRevert.newSL}`);
    check('Kiểm kê', 'kkRevertOne() gọi apiPost update đúng sheet TonKho', eRevert.apiPostCall && eRevert.apiPostCall.sheet === 'TonKho' && eRevert.apiPostCall.action === 'update', JSON.stringify(eRevert.apiPostCall));
    await page.close();
  }

  // ══ F. BESTSELLER (bestseller.html) — công thức + ví dụ mẫu từ spec người dùng (SP A/B) ══
  {
    const page = await openPage('bestseller.html', 'best');
    await seed(page, ['TK', 'XH', 'KK']);
    const fRes = await page.evaluate(() => {
      fillBestMocOptions(); // lần gọi đầu — cả 2 ô đang trống → phải tự chọn sẵn 2 ngày gần nhất
      const autoD = document.getElementById('best-dau').value;
      const autoC = document.getElementById('best-cuoi').value;
      const dauOpts = [...document.getElementById('best-dau').options].map((o) => o.value).filter(Boolean);
      const cuoiOpts = [...document.getElementById('best-cuoi').options].map((o) => o.value).filter(Boolean);
      const computed = computeBestsellerPeriod('2026-08-10', '2026-08-23');
      return { autoD, autoC, dauOpts, cuoiOpts, top1: computed.items[0], top2: computed.items[1] };
    });
    check('Bestseller', 'Dropdown liệt kê MỌI ngày Kiểm kê Gian hàng, không chỉ ngày đã đánh dấu', JSON.stringify(fRes.dauOpts) === JSON.stringify(['2026-08-23', '2026-08-10']) && JSON.stringify(fRes.cuoiOpts) === JSON.stringify(['2026-08-23', '2026-08-10']), JSON.stringify(fRes));
    check('Bestseller', 'Chưa chọn gì → tự động chọn sẵn 2 lần kiểm kê GẦN NHẤT (không bắt phải đánh dấu trước)', fRes.autoD === '2026-08-10' && fRes.autoC === '2026-08-23', `autoD=${fRes.autoD} autoC=${fRes.autoC}`);
    // Công thức spec (SP A/B): Đã bán = Tồn đầu kỳ + Thêm trong kỳ − Tồn cuối kỳ. Bia Tiger: đầu 20, xếp
    // 50+30=80, cuối 10 → đã bán = 90 (tự tính độc lập ở đây, không lấy số của app).
    const expectBiaTiger = 20 + 80 - 10;
    check('Bestseller', `Đúng công thức spec (đầu+thêm-cuối=${expectBiaTiger}): Bia Tiger xếp #1, không phải Coca (số âm)`,
      fRes.top1.ten === 'Bia Tiger' && fRes.top1.daBan === expectBiaTiger, JSON.stringify(fRes.top1));
    check('Bestseller', 'Coca ra số ÂM đúng logic (đầu0+thêm20-cuối80=-60, dữ liệu test cố tình cho tồn cuối > đầu+thêm)',
      fRes.top2.ten === 'Nuoc ngot Coca' && fRes.top2.daBan === -60, JSON.stringify(fRes.top2));

    const fMissing = await page.evaluate(() => {
      const computed = computeBestsellerPeriod('2026-08-05', '2026-08-23');
      return { missing: computed.missing, tongSP: computed.tongSP, items: computed.items.map((i) => i.ten) };
    });
    check('Bestseller', 'SP thiếu dữ liệu 1 đầu mốc bị LOẠI khỏi ranking (không đoán số)', !fMissing.items.includes('Mi tom Hao Hao') && fMissing.missing >= 1, JSON.stringify(fMissing));
    await page.close();
  }

  // ══ G. NHẬT KÝ (nhat-ky.html) — autoPruneOldLogs() tự xóa log cũ hơn 30 ngày, tối đa 1 lần/ngày ══
  {
    const page = await openPage('nhat-ky.html', 'log');
    const now = Date.now();
    const day = 86400000;
    await page.evaluate((now, day) => {
      localStorage.removeItem('logPruneDate');// phòng trường hợp trang trước đó (cùng origin file://) đã set
      C.LOG = [
        [new Date(now - 40 * day).toISOString(), 'a@x.com', 'Tạo mới', 'Tồn kho', 'cũ 40 ngày'],
        [new Date(now - 31 * day).toISOString(), 'a@x.com', 'Tạo mới', 'Tồn kho', 'cũ 31 ngày'],
        [new Date(now - 10 * day).toISOString(), 'a@x.com', 'Tạo mới', 'Tồn kho', 'mới 10 ngày'],
        [new Date(now - 1 * day).toISOString(), 'a@x.com', 'Tạo mới', 'Tồn kho', 'mới 1 ngày'],
      ];
    }, now, day);
    const gRes = await page.evaluate(async () => {
      await autoPruneOldLogs();
      return {
        deleteCalls: window.__apiPostCalls.filter((c) => c.sheet === 'Log' && c.action === 'delete').length,
        prunedDate: localStorage.getItem('logPruneDate'),
      };
    });
    check('Nhật ký', 'autoPruneOldLogs() xóa đúng 2 dòng cũ hơn 30 ngày, giữ lại 2 dòng gần đây', gRes.deleteCalls === 2, JSON.stringify(gRes));
    const gRes2 = await page.evaluate(async () => {
      const before = window.__apiPostCalls.length;
      await autoPruneOldLogs(); // gọi lại trong CÙNG NGÀY → phải bỏ qua ngay (đã đánh dấu logPruneDate)
      return { extraCalls: window.__apiPostCalls.length - before };
    });
    check('Nhật ký', 'autoPruneOldLogs() chỉ thực sự chạy 1 lần/ngày (gọi lại trong ngày không xóa thêm)', gRes2.extraCalls === 0, JSON.stringify(gRes2));
    await page.close();
  }

  // ══ H. LỖI CONSOLE / RUNTIME trong suốt toàn bộ các trang đã mở ở trên ══
  check('Ổn định chung', 'Không có lỗi console/runtime nào phát sinh ở bất kỳ trang nào', allConsoleErrors.length === 0, allConsoleErrors.join(' | '));

  await browser.close();

  const byArea = {};
  results.forEach((r) => { (byArea[r.area] = byArea[r.area] || []).push(r); });
  let pass = 0, fail = 0;
  console.log('\n========== GRAND TEST REPORT ==========\n');
  for (const area of Object.keys(byArea)) {
    console.log(`▶ ${area}`);
    for (const r of byArea[area]) {
      const mark = r.pass ? '✅' : '❌';
      if (r.pass) pass++; else fail++;
      console.log(`  ${mark} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`);
    }
  }
  console.log(`\n========================================`);
  console.log(`TỔNG: ${pass + fail} kiểm tra — ${pass} PASS, ${fail} FAIL`);
  console.log('========================================\n');
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('GRAND TEST CRASHED:', e);
  process.exit(2);
});
