# Tài liệu Yêu cầu Bugfix

## Giới thiệu

Sau khi xác thực thành công với Supabase, ứng dụng bị treo ở màn hình loading ("Đang tải...") và không bao giờ chuyển sang trang dashboard chính. Đây là regression trong luồng P1 (Xác thực + Học sinh + Lớp học) trước đây đã hoạt động tốt. Vấn đề xảy ra trong giai đoạn khởi tạo xác thực khi ứng dụng cố gắng tải hồ sơ người dùng từ cơ sở dữ liệu.

## Phân tích Bug

### Hành vi hiện tại (Lỗi)

1.1 KHI người dùng xác thực thành công với Supabase (thông tin đăng nhập hợp lệ) THÌ hệ thống vẫn ở trạng thái loading vô hạn và không bao giờ chuyển sang trang dashboard chính

1.2 KHI ứng dụng khởi tạo trạng thái xác thực từ phiên đã lưu hoặc phiên Supabase khi tải trang THÌ hệ thống có thể bị treo ở màn hình loading nếu truy vấn bảng users bị timeout hoặc bị chặn

1.3 KHI hàm `fetchMyProfile` truy vấn bảng `users` để lấy dữ liệu hồ sơ người dùng THÌ hệ thống có thể bị treo vô hạn do chính sách RLS chặn, timeout mạng, hoặc sự cố kết nối cơ sở dữ liệu

### Hành vi mong đợi (Đúng)

2.1 KHI người dùng xác thực thành công với Supabase THÌ hệ thống PHẢI chuyển sang trang dashboard trong vòng 8 giây tối đa

2.2 KHI ứng dụng khởi tạo trạng thái xác thực từ phiên đã lưu THÌ hệ thống PHẢI xử lý lỗi truy xuất hồ sơ một cách nhẹ nhàng và chuyển sang dashboard với dữ liệu người dùng tối thiểu nếu truy xuất hồ sơ thất bại

2.3 KHI hàm `fetchMyProfile` gặp lỗi hoặc timeout THÌ hệ thống PHẢI fallback về dữ liệu người dùng từ phiên và chuyển sang dashboard mà không bị chặn

### Hành vi không thay đổi (Ngăn chặn Regression)

3.1 KHI người dùng có dữ liệu hồ sơ hợp lệ trong bảng users THÌ hệ thống TIẾP TỤC hiển thị hồ sơ người dùng đầy đủ bao gồm vai trò, tên và avatar

3.2 KHI người dùng truy cập các route được bảo vệ sau khi xác thực THÌ hệ thống TIẾP TỤC áp dụng kiểm soát truy cập dựa trên vai trò của người dùng

3.3 KHI người dùng đăng xuất THÌ hệ thống TIẾP TỤC xóa tất cả trạng thái xác thực và chuyển hướng đến trang đăng nhập

3.4 KHI phiên của người dùng hết hạn hoặc bị vô hiệu hóa THÌ hệ thống TIẾP TỤC tự động đăng xuất người dùng và chuyển hướng đến trang đăng nhập
