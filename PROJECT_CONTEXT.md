# Tạp Hóa D5 — Ngữ cảnh dự án

## Tổng quan
Tạp Hóa D5 là một single-page web app quản lý vận hành 1 cửa hàng tạp hóa nhỏ: tồn kho, nhập hàng, xếp hàng ra gian hàng, kiểm kê định kỳ, ước tính sản phẩm bán chạy, báo cáo chi tiêu theo tháng. Không có module "bán hàng" thực sự — mọi số liệu liên quan tới bán chạy đều là suy luận gián tiếp từ tồn kho/xếp hàng.

## Kiến trúc kỹ thuật
- **Nhiều trang HTML, không build step**: mỗi màn hình là 1 file `.html` riêng ở thư mục gốc (xem bảng
  màn hình bên dưới) — điều hướng bằng `<a href="...">` thật (tải lại trang), KHÔNG còn là 1 trang SPA
  ẩn/hiện `<div>` như bản đầu. `app.js` (~470 dòng) chỉ còn giữ logic **DÙNG CHUNG** (Firebase, cache `C`,
  helpers, và bộ khung sidebar/topbar/màn đăng nhập render bằng JS — xem bên dưới); JS **đặc thù riêng
  từng màn** nằm ngay trong thẻ `<script>` ở cuối file `.html` của màn đó. `style.css` dùng chung như cũ.
- Backend: Firebase Realtime Database (lưu dữ liệu) + Firebase Authentication (đăng nhập). Không có server riêng.
- Firebase RTDB được dùng theo kiểu "bảng tính": mỗi loại dữ liệu là 1 "sheet" (`TonKho`, `NhapHang`, `XepHang`, `NhaCungCap`, `GianHang`, `LoaiHang`, `User`, `KiemKe`, `GianHangKho`, `Log`, `HoaDon`); mỗi dòng là 1 mảng giá trị theo **vị trí cột cố định**, không phải object có tên trường. Ngoại lệ: nhánh `HoaDonAnh/<id>` KHÔNG theo mô hình sheet — nó là mảng data-URL ảnh gốc của 1 hóa đơn, đọc/ghi trực tiếp bằng `db.ref()` (không qua `apiGet/apiPost`).
- Lớp `apiGet(sheet)` / `apiPost({sheet,action,row})` giả lập API kiểu bảng tính; đánh số dòng theo quy ước `row = index + 2` (bù 1 dòng tiêu đề, đếm từ 1).
- Cache toàn cục `C = {TK,NH,XH,NCC,GH,LOAI,USER,KK,GHK,LOG}` giữ bản sao trong bộ nhớ của mọi sheet; hầu hết màn hình đọc/ghi qua `C` trước, đồng bộ Firebase sau.
- **Dropdown tự vẽ (`sel3d` trong `app.js`)**: MỌI `<select>` giữ nguyên trong DOM (vẫn là "mặt" hiển thị,
  CSS `appearance:none` + chevron riêng) nên code cũ đọc/ghi `.value` / dựng lại `<option>` chạy y nguyên;
  chỉ danh sách MẶC ĐỊNH của trình duyệt bị chặn, thay bằng menu `.sel3d-menu` dựng lại từ `select.options`
  mỗi lần mở. Chọn xong → set `selectedIndex` + bắn `input`+`change`. Uỷ quyền ở `document` nên tự áp cho
  cả `<select>` tạo động sau này. Có phím ↑↓/Enter/Esc/Tab. Style ở `style.css` (`#content select,.mb select`
  + `.sel3d-menu`).
- **Sidebar thu gọn**: nút ☰ ở topbar — trên MOBILE trượt drawer ra/vào (như cũ); trên DESKTOP bấm để
  thu gọn sidebar còn mỗi icon (`body.sb-collapsed`, CSS `@media (min-width:481px)`), nhớ trạng thái ở
  `localStorage['sbCollapsed']`. `applySbState()` (gọi cuối `renderShell`) áp lại trạng thái + gắn `title`
  cho từng mục để rê chuột vẫn thấy tên khi thu gọn.
- **Sidebar/topbar/màn đăng nhập dùng chung**: `renderShell(pageKey)` và `renderLogin()` trong `app.js`
  render 2 phần này bằng JS vào mỗi trang — sửa menu chỉ cần sửa 1 chỗ trong `app.js`, không phải sửa
  lại 10 file. Mỗi trang tự gọi `bootPage('tk', function(){ loadTK(); })` ở cuối script để khai báo mình
  là màn nào (tô sáng đúng mục sidebar, đặt tiêu đề) và hàm tải dữ liệu riêng của màn đó — hàm này chỉ
  chạy SAU KHI xác nhận đã đăng nhập.
- **Không có nút "Làm mới"**: đã bỏ khỏi mọi màn — muốn cập nhật thay đổi từ máy khác thì tải lại trang
  (các thao tác tự mình tạo/sửa/xóa vẫn gọi lại `loadXxx()` ngay nên danh sách luôn đúng với chính mình).
- **Tháng danh mục dùng chung**: KHÔNG có sheet riêng, KHÔNG có màn tạo. Dropdown tự sinh 7 mục — tháng
  hiện tại ±3 tháng, mới nhất lên đầu — qua `dmMonths()` trong `app.js` (bản ghi cũ có tháng ngoài dải
  vẫn được `dmFillSelect` thêm option riêng để hiện đúng). Giá trị lưu THẲNG
  chuỗi `"YYYY-MM"` vào **CỘT CUỐI** mỗi dòng (NhapHang idx 10, XepHang idx 6, KiemKe idx 10, HoaDon idx
  10). 4 modal tạo mới (Tạo phiếu nhập / Tạo phiếu xếp / Kiểm kê mới / Thêm hóa đơn) đều BẮT BUỘC chọn 1
  tháng. Helper: `dmFmt/dmLabel(=dmFmt)/dmMonths/dmFillSelect`.
- **Popup sửa phiếu Nhập/Xếp theo ngày (`m-nh-day`/`m-xh-day`) — bố cục GIỐNG modal "Tạo phiếu"**: các
  trường CHUNG (Nhập: Người nhập/NCC/Ngày/Tháng DM/Ghi chú · Xếp: Gian hàng/Ngày/Tháng DM/Ghi chú) nằm ở
  **khối header "áp cho MỌI dòng"**, bảng bên dưới chỉ còn Sản phẩm/SL(/Giá/HSD/Loại cho Nhập). `nhDayFillHeader()`
  /`xhDayFillHeader()` điền sẵn header = giá trị chung nếu MỌI dòng giống nhau, khác nhau thì **để trống**
  (placeholder "nhiều giá trị"). Khi Lưu: ô header có giá trị → ghi đè cho MỌI dòng; **để trống → giữ nguyên
  giá trị riêng từng dòng** (`hX || old[idx]`). Dòng "+ Thêm" lấy header (người nhập/gian hàng trống thì
  fallback `currentUserName()` / báo lỗi). Không còn cột sửa riêng NCC/ngày/người nhập/tháng ở từng dòng.
  Cả 4 màn đều có dropdown lọc theo tháng danh mục ở khối "Tìm kiếm & lọc" (`dm-nh`/`dm-xh`/`dm-kk`/`dm-hd`) —
  `dmFilterMonths()` = 7 tháng mặc định + mọi tháng có trong dữ liệu màn đó, mới nhất lên đầu.
- **Bấm 1 dòng để Sửa**: mọi bảng danh sách có nút "Sửa" đều cho bấm luôn vào dòng để mở form sửa —
  `<tr class="row-edit" onclick="rowEdit(event,editX,${gi+2})">`. `rowEdit()` (trong `app.js`) bỏ qua khi
  bấm trúng checkbox / nút (Sửa/Xóa/↑↓/👁️) / link trong dòng. Áp dụng ở Tồn kho, Đồ gian hàng, và 4 bảng
  Cài đặt (NCC/Gian hàng/Loại hàng/Người dùng). Nhập/Xếp hàng thì cả dòng phiếu-theo-ngày vốn đã bấm được
  để mở popup chi tiết.
- **Dữ liệu dùng chung giữa các màn** (VD Kiểm kê cần danh sách Gian hàng/Tồn kho) đi qua các hàm
  `ensureTK()/ensureGH()/ensureUser()/ensureNCC()/ensureLoai()` (dùng chung, trong `app.js`) — CHỈ nạp dữ
  liệu vào cache `C`, không vẽ giao diện (khác hàm `loadXxx()` của từng màn, vốn vừa nạp dữ liệu vừa vẽ
  bảng của riêng màn đó — không dùng được từ trang khác vì DOM đích không tồn tại ở trang khác).
- Đăng nhập nhiều người dùng: dùng "Firebase App phụ" (`firebase.initializeApp(config,'Secondary')`) để admin tạo tài khoản nhân viên mới mà không bị đăng xuất khỏi phiên của chính mình.
- Sản phẩm được liên kết trong Nhập/Xếp hàng qua **Mã SP** (cố định), không qua tên — đổi tên sản phẩm không làm phiếu cũ tra sai.

## 11 màn hình (đúng thứ tự sidebar) — mỗi dòng là 1 file .html riêng
1. **Tổng quan** (`index.html`) — ô thống kê Hết hàng/Sắp hết/Sắp hết hạn (bấm xem danh sách), biểu đồ tồn theo trạng thái, card Bestseller ước tính nhanh (30 ngày gần nhất).
2. **Tồn kho** (`ton-kho.html`) — gộp theo Loại hàng (accordion màu riêng, kéo thả thứ tự), phân trang 20 dòng/khối.
3. **Nhập hàng** (`nhap-hang.html`) — phiếu gộp theo ngày, sửa nhanh trong popup, lọc theo sản phẩm/NCC/người nhập/khoảng ngày. Hàng KPI đầu màn (`#nh-sum`): Số ngày nhập / Tổng SL / Tổng tiền nhập / **Hàng nhập nhiều** (ô bấm được → popup `m-nh-top` xếp hạng SP theo tổng SL nhập, Top 5/10/Tất cả; gộp theo Mã SP). Modal "Tạo phiếu nhập" bắt buộc chọn **Tháng danh mục** (lưu ở cột cuối mỗi dòng).
4. **Kho lưu trữ hóa đơn** (`hoa-don.html`) — lưu nhiều ảnh chụp/hóa đơn (chọn nhiều ảnh 1 lần hoặc kéo-thả, cộng dồn qua nhiều đợt, bỏ ảnh trùng; nén JPEG ≤1600px) kèm ngày/NCC/số tiền/ghi chú/người nhập (chọn từ danh sách Người dùng, mặc định người đang đăng nhập)/**tháng danh mục** (BẮT BUỘC khi tạo mới — xem mục "Tháng danh mục dùng chung" ở phần Kiến trúc); dropdown tháng (tự sinh sẵn) có ở cả modal tạo mới lẫn sửa; danh sách chính xếp theo **người nhập** (mỗi thẻ = 1 người + số hóa đơn/ảnh/tổng tiền), bấm 1 người mở popup hiện THẲNG mọi ảnh của người đó (nhóm theo từng hóa đơn, mỗi khối có nút xóa cả hóa đơn, mỗi ảnh có icon ✕ chỉ xóa đúng ảnh đó — đều hỏi `confirm()`; xóa hết ảnh vẫn giữ hóa đơn rỗng, muốn bỏ hẳn thì bấm nút xóa cả hóa đơn; nút ✏️ Sửa mở lại modal Thêm ở chế độ sửa — chung 1 modal `m-hd-add`, `hdEditId` phân biệt, nạp sẵn thông tin + ảnh cũ vào dải preview, lưu ghi đè `apiPost update` + `HoaDonAnh/<id>` set lại; tải ảnh cũ lỗi thì chỉ đổi thông tin, giữ nguyên ảnh) — không lồng thêm popup chi tiết; bấm 1 ảnh mở lightbox duyệt các ảnh của chính hóa đơn đó (nút ‹ ›, phím mũi tên, Esc; cuộn chuột để phóng to quanh con trỏ, kéo để di chuyển, bấm đúp/phím 0 để về cỡ gốc). Xóa 1 ảnh giữ hóa đơn, cập nhật lại cột `soAnh` + `thumb`. Bộ lọc NCC/ngày/người nhập/tháng áp trước khi gộp nhóm. Metadata + 1 thumbnail nhỏ nằm trong sheet `HoaDon`; ảnh gốc lưu riêng ở nhánh RTDB `HoaDonAnh/<id>` (mảng data-URL), chỉ tải khi bấm xem để danh sách nhẹ. Không liên kết với phiếu Nhập hàng — chỉ là kho ảnh tra cứu.
5. **Xếp hàng** (`xep-hang.html`) — chuyển hàng từ kho ra từng gian hàng, cùng mô hình phiếu-theo-ngày. Modal "Tạo phiếu xếp" bắt buộc chọn **Tháng danh mục** (cột cuối mỗi dòng).
6. **Đồ gian hàng** (`do-gian-hang.html`) — số lượng hiện có ở từng kệ, tính thẳng từ lịch sử Xếp hàng + phần tự sửa tay (không dùng bảng cộng dồn riêng dễ lệch).
7. **Kiểm kê** (`kiem-ke.html`) — đối chiếu tồn sổ sách vs thực tế, cho cả Kho tổng lẫn từng Gian hàng. Modal "Kiểm kê mới" bắt buộc chọn **Tháng danh mục** (cột cuối mỗi dòng). Xóa 1 dòng kiểm kê sẽ **tự hoàn tác** đúng số liệu cũ nếu an toàn (không có giao dịch nào xảy ra sau đó cho sản phẩm đó), ngược lại chỉ xóa lịch sử.
8. **Bestseller** (`bestseller.html`) — Đã bán = Tồn đầu kỳ + Xếp hàng trong kỳ − Tồn cuối kỳ. Kỳ so sánh KHÔNG cố định tuần/tháng — người dùng tự đánh dấu mốc Đầu kỳ/Cuối kỳ ngay lúc Kiểm kê, rồi ghép cặp bất kỳ để tính. Thiếu dữ liệu ở 1 đầu mốc → loại sản phẩm đó khỏi bảng xếp hạng, không đoán số.
9. **Báo cáo theo tháng** (`bao-cao.html`) — mỗi người nhập hàng đã chi bao nhiêu tiền mua hàng. 2 chế độ: theo **ngày nhập thực tế** (khoảng ngày), hoặc chọn dropdown **Tháng danh mục** → tính theo cột `danhMucId` của phiếu (`r[10]`), bỏ qua khoảng ngày (ô ngày bị khoá). Có dòng ghi rõ đang tính theo chế độ nào.
10. **Nhật ký hoạt động** (`nhat-ky.html`) — log mọi thao tác tạo/sửa/xóa.
11. **Cài đặt** (`cai-dat.html`) — VẪN 1 file duy nhất với 5 tab con bên trong (Ngưỡng cảnh báo, Người dùng, Nhà cung cấp, Gian hàng, Loại hàng — chuyển tab bằng JS `goSetTab()`, không phải điều hướng trang), cộng công cụ quét-gán Mã SP 1 lần cho dữ liệu cũ.

## Nguyên tắc thiết kế dữ liệu xuyên suốt
- **Không đoán khi thiếu dữ liệu**: Kiểm kê/Bestseller từ chối ước tính thay thế khi thiếu mốc đối chiếu — báo rõ thay vì đưa số liệu có vẻ hợp lý nhưng sai.
- **Hoàn tác có điều kiện**: chỉ tự hoàn tác số liệu khi chắc chắn an toàn (không có giao dịch nào khác xảy ra sau đó cho đúng sản phẩm).
- **Liên kết theo mã, không theo tên**: Mã SP là khóa ổn định; tên chỉ để hiển thị/dự phòng cho dữ liệu cũ.
- **Suy luận rõ nguồn gốc**: không có bước "bán hàng" thật trong hệ thống — mọi chỉ số liên quan bán chạy đều nói rõ đang suy ra từ tín hiệu gián tiếp nào.

## Giới hạn được biết trước
App **chưa có module Bán hàng thực sự** — không có sự kiện nào ghi nhận "khách mua". Card Bestseller ở Tổng quan chỉ là ước tính theo lượng xếp hàng; màn Bestseller (theo mốc kỳ) tính đúng công thức nhưng phụ thuộc hoàn toàn vào việc nhân viên có kiểm kê đúng lúc — vì app chạy trên trình duyệt, không có server để tự "chốt" theo lịch.

## Kiểm thử
2 script (Puppeteer + Chrome headless) chạy trực tiếp trên các file `.html`/`app.js` THẬT, chặn mọi
request mạng thật (không đụng Firebase thật), dữ liệu giả lập trong bộ nhớ. Chạy: `cd tests && npm install`
rồi:
- `node grand-test.js` — logic nghiệp vụ sâu (Mã SP, phân trang, Kiểm kê, Bestseller, **Tháng danh mục**:
  lọc Nhập/Xếp/Kiểm/Hóa đơn + báo cáo theo `danhMucId`, gồm ca "ngày rơi sang tháng khác nhưng danh mục
  vẫn tính đúng"...), mỗi nhóm kiểm tra tự mở đúng file `.html` sở hữu logic đó.
- `test-data-month.js` — dán vào Console (đã đăng nhập) để tạo data thật minh hoạ chức năng "theo tháng"
  cho THÁNG 8 (kèm bảng kỳ vọng); sửa `CLEAN=true` rồi chạy lại để dọn.
- `node multipage-test.js` — khung sườn: cả 10 trang bootstrap không lỗi, sidebar/topbar đúng, và nội
  dung `.sec` thực sự **hiển thị** (không chỉ có trong DOM mà bị CSS ẩn — lớp bug thật đã gặp lúc tách
  từ SPA sang nhiều trang, do quên gắn class `.on`).
