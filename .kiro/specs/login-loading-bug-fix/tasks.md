# Các Task Thực hiện

## Các Task Bugfix

- [x] 1. Viết test khám phá điều kiện bug
  - [x] 1.1 Test: Luồng xác thực bị treo khi truy vấn bảng users bị timeout
  - [x] 1.2 Test: `isLoading` vẫn giữ giá trị true sau 8 giây khi timeout
  - [x] 1.3 Xác minh test thất bại trên mã hiện tại (xác nhận bug tồn tại)

- [x] 2. Fix xử lý timeout trong `initializeAuth`
  - [x] 2.1 Bao quanh call `hydrateProfile` với timeout 7000ms
  - [x] 2.2 Khi timeout/lỗi, fallback về dữ liệu người dùng từ phiên
  - [x] 2.3 Đảm bảo `isLoading: false` được set khi timeout

- [x] 3. Fix xử lý timeout trong luồng `login`
  - [x] 3.1 Bao quanh call `hydrateProfile` với timeout 7000ms
  - [x] 3.2 Khi timeout/lỗi, fallback về dữ liệu người dùng từ phiên
  - [x] 3.3 Đảm bảo `isLoading: false` được set khi timeout

- [ ] 4. Fix xử lý timeout trong `onAuthStateChange`
  - [ ] 4.1 Bao quanh call `hydrateProfile` với timeout 7000ms
  - [ ] 4.2 Khi timeout/lỗi, fallback về dữ liệu người dùng từ phiên
  - [ ] 4.3 Đảm bảo `isLoading: false` được set khi timeout (không chỉ khi exception)

- [ ] 5. Chạy toàn bộ tasks
  - [ ] 5.1 Chạy test khám phá điều kiện bug (hiện đã pass)
  - [ ] 5.2 Chạy test tính chất cho các tính chất đúng đắn P1-P4
  - [ ] 5.3 Test thủ công: Luồng xác thực hoàn thành trong vòng 8 giây
