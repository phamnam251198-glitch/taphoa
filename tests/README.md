# Kiểm thử tự động

App giờ là **nhiều trang** (mỗi màn hình 1 file `.html` riêng ở thư mục gốc — xem `PROJECT_CONTEXT.md`),
không còn là 1 trang SPA duy nhất. Cả 2 script dưới đây chạy trực tiếp trên code THẬT (`app.js` +
các file `.html`/`style.css`) qua Chrome headless (dùng Google Chrome đã cài sẵn trên máy — không tải
Chromium riêng), với dữ liệu **giả lập trong bộ nhớ**. Mọi request mạng thật (kể cả tải Firebase SDK)
đều bị chặn ở tầng network — không bao giờ đụng tới dữ liệu Firebase thật.

## Cài đặt & chạy

```bash
cd tests
npm install
node grand-test.js       # kiểm tra logic nghiệp vụ sâu (Mã SP, Kiểm kê, Bestseller, phân trang...)
node multipage-test.js   # kiểm tra khung sườn: cả 10 trang bootstrap không lỗi, sidebar/topbar đúng
```

Cần có Google Chrome tại `/usr/bin/google-chrome` (sửa `executablePath` trong 2 file trên nếu máy bạn
cài ở đường dẫn khác).

## grand-test.js — logic nghiệp vụ

Mỗi nhóm kiểm tra mở ĐÚNG trang sở hữu logic cần test (VD: kiểm tra Kiểm kê thì mở `kiem-ke.html`, kiểm
tra Bestseller thì mở `bestseller.html`) — không còn `go('...')` điều hướng trong 1 trang như bản cũ.

Phạm vi hiện có:
- Liên kết Mã SP (genNextMaSP, nhTKIndex, xhTKIndex) — trang Tồn kho
- Phân trang Tồn kho theo từng khối Loại hàng — trang Tồn kho
- Nút xóa SP tên có dấu nháy đơn không làm vỡ `onclick` — trang Tồn kho
- Popup Tổng quan (Hết hàng) + card Bestseller ước tính — trang Tổng quan (`index.html`)
- "Top sản phẩm nhập hàng" gộp theo Mã SP — trang Nhập hàng
- Kiểm kê: danh sách SP theo Kho tổng/Gian hàng, nhận diện an toàn hoàn tác, hoàn tác đúng số liệu —
  trang Kiểm kê
- Bestseller: dropdown mốc Đầu/Cuối kỳ theo tag thật, đúng công thức (kể cả ra số âm), loại SP thiếu dữ
  liệu khỏi bảng xếp hạng thay vì đoán — trang Bestseller
- Không phát sinh lỗi console/runtime ở BẤT KỲ trang nào đã mở trong suốt lượt chạy

Thêm kiểm tra mới bằng cách gọi `check(area, tên, điều_kiện_pass, chi_tiết)` sau `page.evaluate()`, mở
trang tương ứng qua helper `openPage(file, pageKey)` + `seed(page, ['TK','NH',...])`.

## multipage-test.js — khung sườn cả 10 trang

Duyệt tuần tự cả 10 file `.html`, với mỗi trang: giả lập đăng nhập xong (gọi thẳng `renderShell()` +
hàm tải dữ liệu riêng của trang đó), rồi kiểm tra: không lỗi JS, sidebar hiện đủ 10 mục, đúng mục đang
active, đúng tiêu đề topbar, nội dung màn có render (không trống, và **thực sự hiển thị** — không chỉ có
trong DOM mà bị CSS ẩn đi). Kiểm tra "hiển thị" này bắt đúng lớp bug thật đã gặp lúc tách trang: mỗi file
`.html` giờ chỉ có 1 khối `.sec` nhưng lúc đầu quên gắn class `.on` (CSS quy định `.sec{display:none}`),
khiến nội dung có trong DOM (qua được kiểm tra `textContent`) nhưng không ai nhìn thấy gì trên màn hình.
