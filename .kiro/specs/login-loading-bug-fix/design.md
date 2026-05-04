# Tài liệu Thiết kế Bugfix

## Nguyên nhân gốc

`fetchMyProfile` trong `usersService.ts` truy vấn bảng `users` mà không có bảo vệ timeout trong một số đường dẫn mã. Khi chính sách RLS chặn hoặc mạng bị treo, `hydrateProfile` trong `authStore.ts` chờ vô hạn.

### Vị trí vấn đề

1. **authStore.ts:42-49** `hydrateProfile` bao quanh `fetchMyProfile` với timeout 7000ms
2. **authStore.ts:135-175** `initializeAuth` gọi `hydrateProfile` mà không có fallback khi lỗi
3. **authStore.ts:180-220** `onAuthStateChange` gọi `hydrateProfile` không có timeout, bắt tất cả lỗi nhưng chỉ set `isLoading: false` khi có exception (không phải timeout)

### Điều kiện Bug

C(X): Sau khi xác thực Supabase thành công, `isLoading` vẫn giữ giá trị `true` vô hạn khi `fetchMyProfile` bị treo (RLS block/network timeout).

## Chiến lược Fix

### 1. Thêm timeout rõ ràng cho call `fetchMyProfile` trong `onAuthStateChange`

**File**: `kindergarten-management/src/stores/authStore.ts`

**Thay đổi**: Bao quanh call `hydrateProfile` trong `onAuthStateChange` với timeout, giống như `initializeAuth`.

```typescript
// Hiện tại (dòng ~200):
const profile = await hydrateProfile(user);

// Fix:
const profile = await withTimeout(hydrateProfile(user), 7000, null);
```

### 2. Cải thiện xử lý lỗi trong `initializeAuth`

**File**: `kindergarten-management/src/stores/authStore.ts`

**Thay đổi**: Khi `hydrateProfile` lỗi/timeout, fallback về dữ liệu người dùng từ phiên và set `isLoading: false`.

```typescript
// Hiện tại (dòng ~155):
const profile = await hydrateProfile(user);

// Fix:
const profile = await withTimeout(hydrateProfile(user), 7000, null);
// Nếu truy xuất hồ sơ thất bại, tiếp tục với dữ liệu người dùng từ phiên
```

### 3. Thêm timeout cho luồng `login`

**File**: `kindergarten-management/src/stores/authStore.ts`

**Thay đổi**: Bao quanh call `hydrateProfile` trong `login` với timeout, fallback khi thất bại.

```typescript
// Hiện tại (dòng ~90):
const profile = await hydrateProfile(user);

// Fix:
const profile = await withTimeout(hydrateProfile(user), 7000, null);
```

## Các Task Thực hiện

1. Cập nhật các call `hydrateProfile` trong `initializeAuth`, `login`, `onAuthStateChange` để sử dụng `withTimeout`
2. Đảm bảo `isLoading: false` được set khi timeout/lỗi, không chỉ khi exception
3. Fallback về dữ liệu người dùng từ phiên khi truy xuất hồ sơ thất bại
4. Test: Luồng xác thực hoàn thành trong vòng 8 giây ngay cả khi truy vấn bảng users bị treo

## Các Tính chất Đúng đắn

- P1: Sau khi xác thực thành công, `isLoading` trở thành `false` trong vòng 8 giây
- P2: Nếu truy xuất hồ sơ thất bại/timeout, ứng dụng chuyển sang dashboard với dữ liệu người dùng tối thiểu
- P3: Nếu truy xuất hồ sơ thành công, hiển thị hồ sơ người dùng đầy đủ
- P4: Kiểm soát truy cập dựa trên vai trò vẫn được áp dụng sau khi xác thực
