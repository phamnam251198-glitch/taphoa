// GRAND TEST — kiểm thử tổng hợp cho app Tạp Hóa (chạy trực tiếp trên app.js/index.html/style.css thật,
// KHÔNG đụng Firebase thật: apiGet/apiPost bị stub lại trong trang để không có network call nào cả).
const puppeteer = require('puppeteer-core');
const path = require('path');

const APP_DIR = '/home/NAMPD/taphoa';
const results = []; // {area, name, pass, detail}

function check(area, name, pass, detail) {
  results.push({ area, name, pass, detail: detail || '' });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Chặn TUYỆT ĐỐI mọi request mạng thật ra ngoài (Firebase SDK từ gstatic.com, Firebase DB/Auth thật) —
  // app.js có 1 IIFE cuối file tự gọi initFirebase() + auth.onAuthStateChanged() ngay khi load, nếu không
  // chặn sẽ vừa tốn mạng vừa có nguy cơ đụng dữ liệu thật. Chặn ở tầng network là chắc chắn nhất (không
  // phụ thuộc việc override initFirebase có bị hàm khai báo top-level trong app.js ghi đè lại hay không).
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().startsWith('file://')) req.continue();
    else req.abort();
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    // Bỏ qua lỗi "không tải được tài nguyên" do CHÍNH mình chủ động chặn network (Firebase SDK thật) ở trên —
    // đây là hệ quả cố ý của việc cách ly test khỏi Firebase thật, không phải lỗi thật của app
    if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  const fileUrl = 'file://' + path.join(APP_DIR, 'index.html');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

  // ── Bypass đăng nhập + stub apiGet/apiPost trước khi app.js kịp tự gọi Firebase khi load ──
  await page.evaluate(() => {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main').style.display = 'flex';
    window.__apiPostCalls = [];
    // apiGet giả lập PHẢI trả về đúng mảng C[...] đang có trong bộ nhớ (không phải mảng rỗng cố định) —
    // vì rất nhiều hàm load...() gọi lại apiGet() rồi GHI ĐÈ thẳng vào C (VD "C.TK=await apiGet('TonKho')"),
    // trả rỗng sẽ xóa mất toàn bộ dữ liệu giả lập vừa nạp ở bước sau.
    const SHEET_MAP = { TonKho: 'TK', NhapHang: 'NH', XepHang: 'XH', NhaCungCap: 'NCC', GianHang: 'GH', LoaiHang: 'LOAI', User: 'USER', KiemKe: 'KK', GianHangKho: 'GHK', Log: 'LOG' };
    window.apiGet = async function (sheet) {
      const key = SHEET_MAP[sheet];
      return (key && window.C[key]) || [];
    };
    window.apiPost = async function (data) {
      window.__apiPostCalls.push(JSON.parse(JSON.stringify(data)));
      return true;
    };
    window.initFirebase = async function () {};
  });

  // Chờ app.js load xong (script cuối file), rồi mới điều hướng
  await page.waitForFunction(() => typeof go === 'function', { timeout: 5000 });

  // ══════════════════════════════════════════════════════════════════════
  // BỘ DỮ LIỆU GIẢ LẬP DÙNG CHUNG CHO TOÀN BỘ GRAND TEST
  // ══════════════════════════════════════════════════════════════════════
  await page.evaluate(() => {
    // TonKho: [ten,sl,dv,gn,gb,hsd,ngayTao,ng,ncc,ma,gh(nguong),hsdSap,hsdGan,loai]
    C.TK = [
      ['Bia Tiger', 0, 'lon', 18000, 20000, '2026-09-10', '2026-01-01', 10, 'NCC A', 'SP0001', 3, 30, 7, 'Đồ uống'],
      ['Nuoc ngot Coca', 2, 'chai', 9000, 12000, '2026-08-30', '2026-01-01', 10, 'NCC A', 'SP0002', 3, 30, 7, 'Đồ uống'],
      ['Mi tom Hao Hao', 50, 'goi', 3000, 4000, '', '2026-01-01', 10, 'NCC B', 'SP0003', 3, 30, 7, 'Thực phẩm'],
      ['Xuc xich', 20, 'goi', 15000, 20000, '2026-01-01', '2026-01-01', 10, 'NCC B', 'SP0004', 3, 30, 7, 'Thực phẩm'],
    ];
    // Thêm 25 SP giả để test PHÂN TRANG (LIST_PAGE_SIZE=20)
    for (let i = 5; i <= 29; i++) {
      C.TK.push(['SP test ' + i, 10, 'cai', 1000, 1500, '', '2026-01-01', 10, '', 'SP' + String(i).padStart(4, '0'), 3, 30, 7, 'Khác']);
    }
    C.NCC = Array.from({ length: 25 }, (_, i) => ['NCC ' + (i + 1), '0900000' + i, '', '', '']);
    C.GH = [['D5'], ['D6']];
    C.LOAI = [['Đồ uống'], ['Thực phẩm'], ['Khác']];
    C.USER = [['NV1', '', '', '', '', '']];

    // NhapHang: [ten,sl,gia,ncc,ngay,gc,user,hsd,loai,maSP]
    C.NH = [
      ['Bia Tiger', 100, 18000, 'NCC A', '2026-08-01', '', 'NV1', '', 'Đồ uống', 'SP0001'],
      ['Nuoc ngot Coca', 50, 9000, 'NCC A', '2026-08-05', '', 'NV1', '', 'Đồ uống', 'SP0002'],
      ['Nuoc ngot Coca', 30, 9000, 'NCC A', '2026-08-16', '', 'NV1', '', 'Đồ uống', 'SP0002'],
    ];
    // XepHang: [ten,sl,gh,ngay,gc,maSP]
    C.XH = [
      ['Bia Tiger', 50, 'D5', '2026-08-15', '', 'SP0001'],
      ['Bia Tiger', 30, 'D6', '2026-08-15', '', 'SP0001'],
      ['Nuoc ngot Coca', 20, 'D5', '2026-08-16', '', 'SP0002'],
    ];
    // KiemKe: [ngay,maSP,tenSP,tonSoSach,tonThucTe,chenhLech,ghiChu,nguoiKiemKe,gianHang,moc]
    C.KK = [
      ['2026-08-10', 'SP0001', 'Bia Tiger', 0, 20, 20, '', 'NV1', 'D5', 'dau'],
      ['2026-08-10', 'SP0002', 'Nuoc ngot Coca', 0, 0, 0, '', 'NV1', 'D5', 'dau'],
      ['2026-08-23', 'SP0001', 'Bia Tiger', 0, 10, 10, '', 'NV1', 'D5', 'cuoi'],
      ['2026-08-23', 'SP0002', 'Nuoc ngot Coca', 0, 80, 80, '', 'NV1', 'D5', 'cuoi'],
      // Dòng riêng để test kkHasLaterActivity: Xúc xích kiểm kê Kho tổng 2026-08-20, KHÔNG có giao dịch sau
      ['2026-08-20', 'SP0004', 'Xuc xich', 25, 20, -5, '', 'NV1', ''],
      // Mi tom kiểm kê Kho tổng 2026-08-05, NHƯNG có Nhập hàng SAU đó (2026-08-01 < 08-05 nên ko tính, thêm 1 dòng NH sau 08-05)
      ['2026-08-05', 'SP0003', 'Mi tom Hao Hao', 40, 40, 0, '', 'NV1', ''],
    ];
    C.NH.push(['Mi tom Hao Hao', 20, 3000, 'NCC B', '2026-08-06', '', 'NV1', '', 'Thực phẩm', 'SP0003']);
    C.GHK = [];
    window.C = C;
  });

  // ══════════════════════════════════════════════════════════════════════
  // A. MÃ SP LINKING
  // ══════════════════════════════════════════════════════════════════════
  const aRes = await page.evaluate(() => {
    const out = {};
    out.genNext = genNextMaSP(); // phải là SP0030 (29 SP hiện có, cao nhất SP0029)
    out.nhIdxByMa = nhTKIndex(['Bia Tiger', 10, 18000, '', '', '', '', '', '', 'SP0001']); // -> idx 0
    out.nhIdxByNameFallback = nhTKIndex(['Nuoc ngot Coca', 10, 0, '', '', '', '', '', '', '']); // ko có mã -> theo tên -> idx 1
    out.xhIdxByMa = xhTKIndex(['Bia Tiger', 5, 'D5', '', '', 'SP0001']); // -> idx 0
    return out;
  });
  check('Mã SP', 'genNextMaSP() sinh đúng mã kế tiếp', aRes.genNext === 'SP0030', `got ${aRes.genNext}, expect SP0030`);
  check('Mã SP', 'nhTKIndex() tra theo Mã SP', aRes.nhIdxByMa === 0, `got ${aRes.nhIdxByMa}`);
  check('Mã SP', 'nhTKIndex() dự phòng theo tên khi thiếu mã', aRes.nhIdxByNameFallback === 1, `got ${aRes.nhIdxByNameFallback}`);
  check('Mã SP', 'xhTKIndex() tra theo Mã SP', aRes.xhIdxByMa === 0, `got ${aRes.xhIdxByMa}`);

  // ══════════════════════════════════════════════════════════════════════
  // B. TỒN KHO — phân trang
  // ══════════════════════════════════════════════════════════════════════
  await page.evaluate(() => go('tk'));
  await page.waitForTimeout(150);
  const bRes = await page.evaluate(() => {
    fTK();
    const khacGroup = [...document.querySelectorAll('#tk-tbl .acc-group')].find((d) => d.querySelector('summary').textContent.includes('Khác'));
    const rows = khacGroup ? khacGroup.querySelectorAll('tbody tr').length : -1;
    const pagerText = khacGroup ? khacGroup.querySelector('.pager span')?.textContent : '';
    return { rows, pagerText, hasPager: !!(khacGroup && khacGroup.querySelector('.pager')) };
  });
  check('Tồn kho', 'Khối "Khác" (25 SP) chỉ hiện 20 dòng/trang', bRes.rows === 20, `got ${bRes.rows} rows`);
  check('Tồn kho', 'Có thanh phân trang khi > 20 SP', bRes.hasPager, bRes.pagerText);

  // Trang 2 của khối "Khác"
  const bRes2 = await page.evaluate(() => {
    gotoTKPage('Khác', 2);
    const khacGroup = [...document.querySelectorAll('#tk-tbl .acc-group')].find((d) => d.querySelector('summary').textContent.includes('Khác'));
    return khacGroup.querySelectorAll('tbody tr').length;
  });
  check('Tồn kho', 'Trang 2 của "Khác" hiện 5 SP còn lại (25-20)', bRes2 === 5, `got ${bRes2}`);

  // ══════════════════════════════════════════════════════════════════════
  // C. DASHBOARD — popup trạng thái + Bestseller (ước tính xếp hàng)
  // ══════════════════════════════════════════════════════════════════════
  await page.evaluate(() => go('dash'));
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
  check('Dashboard', 'Card Bestseller (xếp nhiều) có Bia Tiger đứng đầu (80 = 50+30)', cRes.bestText.includes('Bia Tiger') && cRes.bestText.includes('80'), cRes.bestText.slice(0, 200));

  // ══════════════════════════════════════════════════════════════════════
  // D. NHẬP HÀNG — Top sản phẩm nhập
  // ══════════════════════════════════════════════════════════════════════
  await page.evaluate(() => go('nh'));
  const dRes = await page.evaluate(() => {
    const groups = groupNHByDate(C.NH);
    rNH(groups);
    return document.getElementById('nh-top').textContent;
  });
  check('Nhập hàng', 'Top sản phẩm gộp đúng theo Mã SP (Coca 50+30=80)', dRes.includes('Nuoc ngot Coca') && dRes.includes('80'), dRes.slice(0, 200));

  // ══════════════════════════════════════════════════════════════════════
  // E. KIỂM KÊ — kkBuildList (Kho tổng / Gian hàng) + kkHasLaterActivity (an toàn hoàn tác)
  // ══════════════════════════════════════════════════════════════════════
  const eRes = await page.evaluate(() => {
    const listKhoTong = kkBuildList('');
    const listD5 = kkBuildList('D5');
    // Case: Xúc xích kiểm kê Kho tổng 2026-08-20, KHÔNG có giao dịch nào sau -> an toàn hoàn tác
    const rXucXich = C.KK.find((r) => r[2] === 'Xuc xich');
    const safeXucXich = !kkHasLaterActivity(rXucXich, C.KK.indexOf(rXucXich));
    // Case: Mi tom kiểm kê Kho tổng 2026-08-05, CÓ Nhập hàng sau (2026-08-06) -> KHÔNG an toàn
    const rMiTom = C.KK.find((r) => r[2] === 'Mi tom Hao Hao');
    const unsafeMiTom = kkHasLaterActivity(rMiTom, C.KK.indexOf(rMiTom));
    return {
      khoTongCount: listKhoTong.length,
      d5Names: listD5.map((x) => x.label).sort(),
      safeXucXich,
      unsafeMiTom,
    };
  });
  check('Kiểm kê', 'kkBuildList("") liệt kê đủ mọi SP Tồn kho', eRes.khoTongCount === 29, `got ${eRes.khoTongCount}`);
  check('Kiểm kê', 'kkBuildList("D5") chỉ gồm SP từng xếp vào D5', JSON.stringify(eRes.d5Names) === JSON.stringify(['Bia Tiger', 'Nuoc ngot Coca']), JSON.stringify(eRes.d5Names));
  check('Kiểm kê', 'Xóa kiểm kê KHÔNG có giao dịch sau → nhận diện AN TOÀN hoàn tác', eRes.safeXucXich, `safeXucXich=${eRes.safeXucXich}`);
  check('Kiểm kê', 'Xóa kiểm kê CÓ Nhập hàng sau → nhận diện KHÔNG an toàn hoàn tác', eRes.unsafeMiTom, `unsafeMiTom=${eRes.unsafeMiTom}`);

  // Thực thi thật kkRevertOne cho Xúc xích, kiểm tra apiPost được gọi đúng + C.TK cập nhật đúng
  const eRevert = await page.evaluate(async () => {
    window.__apiPostCalls = [];
    const rXucXich = C.KK.find((r) => r[2] === 'Xuc xich');
    await kkRevertOne(rXucXich); // phải trả TonKho SL về 25 (tonSoSach)
    const idx = C.TK.findIndex((t) => t[9] === 'SP0004');
    return { newSL: C.TK[idx][1], apiPostCall: window.__apiPostCalls[0] };
  });
  check('Kiểm kê', 'kkRevertOne() trả Tồn kho về đúng số Sổ sách (25)', eRevert.newSL === 25, `got ${eRevert.newSL}`);
  check('Kiểm kê', 'kkRevertOne() gọi apiPost update đúng sheet TonKho', eRevert.apiPostCall && eRevert.apiPostCall.sheet === 'TonKho' && eRevert.apiPostCall.action === 'update', JSON.stringify(eRevert.apiPostCall));

  // ══════════════════════════════════════════════════════════════════════
  // F. BESTSELLER — công thức + ví dụ mẫu từ spec người dùng (SP A/B)
  // ══════════════════════════════════════════════════════════════════════
  const fRes = await page.evaluate(() => {
    fillBestMocOptions();
    const dauOpts = [...document.getElementById('best-dau').options].map((o) => o.value).filter(Boolean);
    const cuoiOpts = [...document.getElementById('best-cuoi').options].map((o) => o.value).filter(Boolean);
    const computed = computeBestsellerPeriod('2026-08-10', '2026-08-23');
    return {
      dauOpts,
      cuoiOpts,
      top1: computed.items[0],
      top2: computed.items[1],
    };
  });
  check('Bestseller', 'Dropdown Đầu kỳ chỉ liệt kê ngày đã đánh dấu "dau"', JSON.stringify(fRes.dauOpts) === JSON.stringify(['2026-08-10']), JSON.stringify(fRes.dauOpts));
  check('Bestseller', 'Dropdown Cuối kỳ chỉ liệt kê ngày đã đánh dấu "cuoi"', JSON.stringify(fRes.cuoiOpts) === JSON.stringify(['2026-08-23']), JSON.stringify(fRes.cuoiOpts));
  // Công thức spec (SP A/B): Đã bán = Tồn đầu kỳ + Thêm trong kỳ − Tồn cuối kỳ. Với bộ dữ liệu chung của
  // Bia Tiger trong Grand Test này (đầu 20, xếp 50+30=80, cuối 10) → đã bán = 20+80-10 = 90 (tự tính lại
  // độc lập ở đây, không lấy số của app, để phép so sánh có ý nghĩa kiểm chứng thật).
  const expectBiaTiger = 20 + 80 - 10;
  check(
    'Bestseller',
    `Đúng công thức spec (đầu+thêm-cuối=${expectBiaTiger}): Bia Tiger xếp #1, không phải Coca (số âm)`,
    fRes.top1.ten === 'Bia Tiger' && fRes.top1.daBan === expectBiaTiger,
    JSON.stringify(fRes.top1)
  );
  check('Bestseller', 'Coca ra số ÂM đúng logic (đầu0+thêm20-cuối80=-60, dữ liệu test cố tình cho tồn cuối > đầu+thêm)', fRes.top2.ten === 'Nuoc ngot Coca' && fRes.top2.daBan === -60, JSON.stringify(fRes.top2));

  // Test trường hợp thiếu dữ liệu 1 SP (loại khỏi ranking, không đoán)
  const fMissing = await page.evaluate(() => {
    const computed = computeBestsellerPeriod('2026-08-05', '2026-08-23'); // Mi tom có KK ở 08-05 nhưng ko có ở 08-23
    return { missing: computed.missing, tongSP: computed.tongSP, items: computed.items.map((i) => i.ten) };
  });
  check('Bestseller', 'SP thiếu dữ liệu 1 đầu mốc bị LOẠI khỏi ranking (không đoán số)', !fMissing.items.includes('Mi tom Hao Hao') && fMissing.missing >= 1, JSON.stringify(fMissing));

  // ══════════════════════════════════════════════════════════════════════
  // G. XÓA SẢN PHẨM CÓ DẤU NHÁY ĐƠN — bug đã fix trước đó (delSP/delNH/delXH)
  // ══════════════════════════════════════════════════════════════════════
  const gRes = await page.evaluate(() => {
    C.TK.push(["Bánh Chinsu's Deli", 5, 'goi', 1000, 1500, '', '2026-01-01', 10, '', 'SP9999', 3, 30, 7, 'Thực phẩm']);
    fTK();
    // Tìm nút Xóa của đúng SP có dấu nháy, đảm bảo onclick không vỡ cú pháp (chỉ truyền row, không truyền tên)
    const btns = [...document.querySelectorAll('#tk-tbl button')].filter((b) => b.textContent.trim() === 'Xóa');
    const target = btns.find((b) => b.getAttribute('onclick').includes('delSP('));
    return { onclickAttr: target ? target.getAttribute('onclick') : null, hasQuoteInOnclick: target ? target.getAttribute('onclick').includes("Chinsu") : false };
  });
  check('Bảo mật/ổn định', 'Nút Xóa SP tên có dấu nháy đơn không nhúng tên vào onclick (chỉ truyền row)', gRes.onclickAttr && !gRes.hasQuoteInOnclick, gRes.onclickAttr);

  // ══════════════════════════════════════════════════════════════════════
  // H. LỖI CONSOLE / RUNTIME trong suốt quá trình chạy tất cả các bước trên
  // ══════════════════════════════════════════════════════════════════════
  check('Ổn định chung', 'Không có lỗi console/runtime nào phát sinh', consoleErrors.length === 0, consoleErrors.join(' | '));

  await browser.close();

  // ── In báo cáo ──
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
