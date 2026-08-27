# Grand Test

Kiểm thử tổng hợp cho app Tạp Hóa — chạy `app.js`/`index.html`/`style.css` THẬT qua Chrome headless
(dùng Google Chrome đã cài sẵn trên máy, không tải Chromium riêng), với dữ liệu **giả lập trong bộ nhớ**.
Mọi request mạng thật (kể cả Firebase SDK) đều bị chặn — test không bao giờ đụng tới dữ liệu Firebase thật.

## Chạy thử

```bash
cd tests
npm install
node grand-test.js
```

Cần có Google Chrome tại `/usr/bin/google-chrome` (sửa `executablePath` trong `grand-test.js` nếu máy bạn
cài ở đường dẫn khác).

## Phạm vi kiểm tra hiện có

- Liên kết Mã SP (genNextMaSP, nhTKIndex, xhTKIndex)
- Phân trang Tồn kho theo từng khối Loại hàng
- Popup Tổng quan (Hết hàng/Sắp hết/Sắp hết hạn) + card Bestseller ước tính
- "Top sản phẩm nhập hàng" ở Nhập hàng (gộp theo Mã SP)
- Kiểm kê: danh sách SP theo Kho tổng/Gian hàng, nhận diện an toàn hoàn tác, hoàn tác đúng số liệu
- Bestseller: dropdown mốc Đầu/Cuối kỳ theo tag thật, đúng công thức (Tồn đầu + Thêm − Tồn cuối), loại SP
  thiếu dữ liệu khỏi bảng xếp hạng thay vì đoán số
- Nút xóa SP tên có dấu nháy đơn không làm vỡ `onclick`
- Không phát sinh lỗi console/runtime trong suốt quá trình chạy

Thêm kiểm tra mới bằng cách gọi `check(area, tên, điều_kiện_pass, chi_tiết)` sau mỗi bước `page.evaluate()`.
