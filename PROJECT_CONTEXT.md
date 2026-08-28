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
- Firebase RTDB được dùng theo kiểu "bảng tính": mỗi loại dữ liệu là 1 "sheet" (`TonKho`, `NhapHang`, `XepHang`, `NhaCungCap`, `GianHang`, `LoaiHang`, `User`, `KiemKe`, `GianHangKho`, `Log`); mỗi dòng là 1 mảng giá trị theo **vị trí cột cố định**, không phải object có tên trường.
- Lớp `apiGet(sheet)` / `apiPost({sheet,action,row})` giả lập API kiểu bảng tính; đánh số dòng theo quy ước `row = index + 2` (bù 1 dòng tiêu đề, đếm từ 1).
- Cache toàn cục `C = {TK,NH,XH,NCC,GH,LOAI,USER,KK,GHK,LOG}` giữ bản sao trong bộ nhớ của mọi sheet; hầu hết màn hình đọc/ghi qua `C` trước, đồng bộ Firebase sau.
- **Sidebar/topbar/màn đăng nhập dùng chung**: `renderShell(pageKey)` và `renderLogin()` trong `app.js`
  render 2 phần này bằng JS vào mỗi trang — sửa menu chỉ cần sửa 1 chỗ trong `app.js`, không phải sửa
  lại 10 file. Mỗi trang tự gọi `bootPage('tk', function(){ loadTK(); })` ở cuối script để khai báo mình
  là màn nào (tô sáng đúng mục sidebar, đặt tiêu đề) và hàm tải dữ liệu riêng của màn đó — hàm này chỉ
  chạy SAU KHI xác nhận đã đăng nhập.
- **Dữ liệu dùng chung giữa các màn** (VD Kiểm kê cần danh sách Gian hàng/Tồn kho) đi qua các hàm
  `ensureTK()/ensureGH()/ensureUser()/ensureNCC()/ensureLoai()` (dùng chung, trong `app.js`) — CHỈ nạp dữ
  liệu vào cache `C`, không vẽ giao diện (khác hàm `loadXxx()` của từng màn, vốn vừa nạp dữ liệu vừa vẽ
  bảng của riêng màn đó — không dùng được từ trang khác vì DOM đích không tồn tại ở trang khác).
- Đăng nhập nhiều người dùng: dùng "Firebase App phụ" (`firebase.initializeApp(config,'Secondary')`) để admin tạo tài khoản nhân viên mới mà không bị đăng xuất khỏi phiên của chính mình.
- Sản phẩm được liên kết trong Nhập/Xếp hàng qua **Mã SP** (cố định), không qua tên — đổi tên sản phẩm không làm phiếu cũ tra sai.

## 10 màn hình (đúng thứ tự sidebar) — mỗi dòng là 1 file .html riêng
1. **Tổng quan** (`index.html`) — ô thống kê Hết hàng/Sắp hết/Sắp hết hạn (bấm xem danh sách), biểu đồ tồn theo trạng thái, card Bestseller ước tính nhanh (30 ngày gần nhất).
2. **Tồn kho** (`ton-kho.html`) — gộp theo Loại hàng (accordion màu riêng, kéo thả thứ tự), phân trang 20 dòng/khối.
3. **Nhập hàng** (`nhap-hang.html`) — phiếu gộp theo ngày, sửa nhanh trong popup, lọc theo sản phẩm/NCC/người nhập/khoảng ngày, bảng "Top sản phẩm nhập nhiều nhất".
4. **Xếp hàng** (`xep-hang.html`) — chuyển hàng từ kho ra từng gian hàng, cùng mô hình phiếu-theo-ngày.
5. **Đồ gian hàng** (`do-gian-hang.html`) — số lượng hiện có ở từng kệ, tính thẳng từ lịch sử Xếp hàng + phần tự sửa tay (không dùng bảng cộng dồn riêng dễ lệch).
6. **Kiểm kê** (`kiem-ke.html`) — đối chiếu tồn sổ sách vs thực tế, cho cả Kho tổng lẫn từng Gian hàng. Xóa 1 dòng kiểm kê sẽ **tự hoàn tác** đúng số liệu cũ nếu an toàn (không có giao dịch nào xảy ra sau đó cho sản phẩm đó), ngược lại chỉ xóa lịch sử.
7. **Bestseller** (`bestseller.html`) — Đã bán = Tồn đầu kỳ + Xếp hàng trong kỳ − Tồn cuối kỳ. Kỳ so sánh KHÔNG cố định tuần/tháng — người dùng tự đánh dấu mốc Đầu kỳ/Cuối kỳ ngay lúc Kiểm kê, rồi ghép cặp bất kỳ để tính. Thiếu dữ liệu ở 1 đầu mốc → loại sản phẩm đó khỏi bảng xếp hạng, không đoán số.
8. **Báo cáo theo tháng** (`bao-cao.html`) — mỗi người nhập hàng đã chi bao nhiêu tiền mua hàng trong khoảng thời gian.
9. **Nhật ký hoạt động** (`nhat-ky.html`) — log mọi thao tác tạo/sửa/xóa.
10. **Cài đặt** (`cai-dat.html`) — VẪN 1 file duy nhất với 5 tab con bên trong (Ngưỡng cảnh báo, Người dùng, Nhà cung cấp, Gian hàng, Loại hàng — chuyển tab bằng JS `goSetTab()`, không phải điều hướng trang), cộng công cụ quét-gán Mã SP 1 lần cho dữ liệu cũ.

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
- `node grand-test.js` — logic nghiệp vụ sâu (Mã SP, phân trang, Kiểm kê, Bestseller...), mỗi nhóm kiểm
  tra tự mở đúng file `.html` sở hữu logic đó.
- `node multipage-test.js` — khung sườn: cả 10 trang bootstrap không lỗi, sidebar/topbar đúng, và nội
  dung `.sec` thực sự **hiển thị** (không chỉ có trong DOM mà bị CSS ẩn — lớp bug thật đã gặp lúc tách
  từ SPA sang nhiều trang, do quên gắn class `.on`).
