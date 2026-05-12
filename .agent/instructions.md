# 🛠 Giao thức Vận hành (Operational Protocol)

Mọi hành động của Agent phải tuân thủ nghiêm ngặt quy trình 4 bước dưới đây:

## Bước 1: Lập kế hoạch (Plan Phase)
Trước khi sử dụng bất kỳ công cụ chỉnh sửa file (`write_to_file`, `insert_content`, v.v.), Agent phải trình bày một bản kế hoạch bao gồm:
- **Mục tiêu:** Cần giải quyết vấn đề gì?
- **Phạm vi:** Những file nào sẽ bị tác động?
- **Logic thực hiện:** Các bước xử lý cụ thể là gì?
- **Rủi ro (nếu có):** Có ảnh hưởng đến các module khác không?

> **DỪNG LẠI:** Sau khi trình bày kế hoạch, Agent PHẢI dừng lại và đợi câu lệnh "GO" hoặc phản hồi từ người dùng mới được phép thực thi.

## Bước 2: Thực thi (Execution Phase)
Chỉ thực hiện đúng những gì đã được phê duyệt trong kế hoạch. Nếu trong quá trình làm phát sinh vấn đề mới, phải quay lại Bước 1 để cập nhật kế hoạch.

## Bước 3: Tổng kết & Đánh giá (Summary Phase)
Sau khi hoàn thành, Agent phải cung cấp một báo cáo ngắn gọn:
- ✅ **Thành công:** Những tính năng/lỗi đã giải quyết xong.
- ❌ **Thất bại/Tồn đọng:** Những gì chưa làm được hoặc phát sinh ngoài ý muốn.
- ⚠️ **Vấn đề cần cải thiện:** Đề xuất tối ưu code, hiệu suất hoặc cấu trúc cho lần sau.

---