# HỆ THỐNG QUẢN LÝ TRƯỜNG MẦM NON - KIDGARDEN

**Phiên bản**: 1.0
**Ngày tạo**: 19/04/2026
**Trạng thái**: Đang chờ phê duyệt

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Giới thiệu

**KidGarden** là hệ thống quản lý trường mầm non toàn diện, được thiết kế để số hóa các hoạt động quản lý hàng ngày của trường mầm non, từ quản lý học sinh, giáo viên, điểm danh đến thu học phí và giao tiếp với phụ huynh.

### 1.2 Mục tiêu

- Đơn giản hóa quy trình quản lý trường mầm non
- Tăng cường giao tiếp giữa nhà trường và phụ huynh
- Tự động hóa các tác vụ lặp đi lặp lại (điểm danh, thu học phí)
- Cung cấp báo cáo thống kê chi tiết cho ban giám hiệu
- Đảm bảo bảo mật thông tin học sinh

### 1.3 Phạm vi

| STT | Module | Mô tả |
|-----|--------|-------|
| 1 | Quản lý người dùng & Phân quyền | Đăng nhập, phân quyền theo vai trò |
| 2 | Quản lý học sinh | Thêm, sửa, xóa, xem thông tin học sinh |
| 3 | Quản lý lớp học | Phân lớp, quản lý sĩ số |
| 4 | Quản lý giáo viên | Quản lý thông tin giáo viên |
| 5 | Quản lý phụ huynh | Liên kết phụ huynh với học sinh |
| 6 | Điểm danh | Điểm danh đi học hàng ngày |
| 7 | Quản lý học phí | Thu, theo dõi công nợ học phí |
| 8 | Thông báo | Gửi thông báo đến phụ huynh |
| 9 | Báo cáo & Thống kê | Xuất báo cáo, biểu đồ thống kê |
| 10 | Cài đặt hệ thống | Cấu hình thông tin trường, năm học |

---

## 2. ĐỐI TƯỢNG NGƯỜI DÙNG

### 2.1 Các vai trò

| Vai trò | Mô tả | Quyền hạn |
|---------|-------|----------|
| **Admin (Ban giám hiệu)** | Quản trị viên cấp cao | Toàn quyền hệ thống |
| **Giáo viên chủ nhiệm** | Phụ trách lớp | Quản lý lớp được phân công |
| **Kế toán** | Phụ trách tài chính | Quản lý học phí, báo cáo tài chính |
| **Phụ huynh** | Người giám hộ học sinh | Xem thông tin con, nhận thông báo |

### 2.2 Mô tả người dùng

**Admin:**
- Nam/nữ, 30-50 tuổi
- Thành thạo công nghệ ở mức trung bình
- Cần giao diện rõ ràng, dễ quản lý

**Giáo viên:**
- Nữ, 25-45 tuổi (phần lớn)
- Bận rộn, cần thao tác nhanh
- Cần mobile-friendly cho việc điểm danh

**Phụ huynh:**
- Đa dạng độ tuổi
- Cần thông tin cập nhật về con
- Ưu tiên ứng dụng điện thoại

---

## 3. THIẾT KẾ GIAO DIỆN (UI/UX)

### 3.1 Design Language

#### Color Palette

| Màu | Hex | Sử dụng |
|-----|-----|----------|
| Primary | `#FF6B6B` | Nút chính, logo, accent |
| Primary Dark | `#EE5A5A` | Hover state |
| Secondary | `#4ECDC4` | Nút phụ, icon, highlights |
| Secondary Dark | `#3DB8B0` | Hover state |
| Background | `#F8FAFC` | Nền chính |
| Card Background | `#FFFFFF` | Thẻ, modal |
| Text Primary | `#1E293B` | Văn bản chính |
| Text Secondary | `#64748B` | Văn bản phụ |
| Success | `#22C55E` | Trạng thái thành công |
| Warning | `#F59E0B` | Cảnh báo |
| Error | `#EF4444` | Lỗi |
| Border | `#E2E8F0` | Đường viền |

#### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Heading 1 | Inter | 28px | 700 |
| Heading 2 | Inter | 24px | 600 |
| Heading 3 | Inter | 20px | 600 |
| Body | Inter | 16px | 400 |
| Body Small | Inter | 14px | 400 |
| Caption | Inter | 12px | 400 |
| Button | Inter | 16px | 500 |

#### Spacing System

- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Border radius: 8px (small), 12px (medium), 16px (large)
- Shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`

#### Motion & Animation

- Transition duration: 200ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Hover scale: 1.02
- Focus ring: 2px solid primary color

### 3.2 Layout & Structure

#### Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Logo | Search | Notifications | User Menu          │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                  │
│  Sidebar   │  Main Content Area                              │
│  (260px)   │                                                  │
│            │  ┌────────────────────────────────────────────┐  │
│  - Dashboard│  │  Page Header: Title + Actions            │  │
│  - Học sinh │  ├────────────────────────────────────────────┤  │
│  - Lớp học  │  │                                            │  │
│  - Giáo viên│  │  Content (Tables, Forms, Cards)           │  │
│  - Phụ huynh│  │                                            │  │
│  - Điểm danh│  │                                            │  │
│  - Học phí  │  │                                            │  │
│  - Thông báo│  │                                            │  │
│  - Báo cáo  │  │                                            │  │
│  - Cài đặt  │  └────────────────────────────────────────────┘  │
│            │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

#### Tablet Layout (768px - 1023px)

- Sidebar thu gọn thành icon (64px)
- Mở rộng sidebar khi hover/click

#### Mobile Layout (<768px)

- Sidebar biến mất, thay bằng hamburger menu
- Bottom navigation cho phụ huynh
- Cards xếp dọc

### 3.3 Page Structure

#### Dashboard (Trang tổng quan)

```
┌─────────────────────────────────────────────────────────────┐
│  Chào mừng, [Tên User]!                        [Ngày hiện tại] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Tổng HS │ │ Đi học  │ │ Nghỉ    │ │ Công nợ │          │
│  │   150   │ │   142   │ │    8    │ │ 3.5M    │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │ Điểm danh hôm nay      │  │ Thông báo gần đây      │    │
│  │ ┌────────────────────┐ │  │ • Thông báo 1          │    │
│  │ │ Lớp 1: 25/28       │ │  │ • Thông báo 2          │    │
│  │ │ Lớp 2: 20/22       │ │  │ • Thông báo 3          │    │
│  │ │ Lớp 3: 18/20       │ │  │                        │    │
│  │ └────────────────────┘ │  │ [Xem tất cả]           │    │
│  └────────────────────────┘  └────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Biểu đồ thống kê học sinh theo lớp                   │   │
│  │ [Bar Chart]                                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Student List Page (Danh sách học sinh)

```
┌─────────────────────────────────────────────────────────────┐
│  Quản lý học sinh                               [+ Thêm mới] │
├─────────────────────────────────────────────────────────────┤
│  [Search...]  [Lọc theo lớp ▼]  [Lọc theo năm ▼]          │
├─────────────────────────────────────────────────────────────┤
│  ┌────┬─────────────┬────────┬─────────┬────────┬─────┐ │
│  │ Ảnh │ Họ tên      │ Lớp    │ Ngày sinh│ Phụ huynh│ Hành động│ │
│  ├────┼─────────────┼────────┼─────────┼────────┼─────┤ │
│  │ [👶]│ Nguyễn Văn A│ Lớp 1A │ 15/03/20│ Nguyễn B│ ✏️👁️ │ │
│  │ [👶]│ Trần Thị B  │ Lớp 1A │ 22/06/20│ Trần C  │ ✏️👁️ │ │
│  │ [👶]│ Lê Văn C    │ Lớp 2B │ 10/01/19│ Lê D    │ ✏️👁️ │ │
│  └────┴─────────────┴────────┴─────────┴────────┴─────┘ │
│                                                              │
│  [Trang 1/8] [<] [1] [2] [3] [4] ... [>]                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, bottom nav |
| Tablet | 768px - 1023px | Collapsible sidebar |
| Desktop | ≥ 1024px | Full sidebar |

---

## 4. TÍNH NĂNG CHI TIẾT

### 4.1 Quản lý Người dùng & Đăng nhập

#### Trang Đăng nhập
- Email/password fields
- "Quên mật khẩu" link
- Remember me checkbox
- Error messages cho sai thông tin

#### Đăng nhập thành công
- Redirect theo vai trò:
  - Admin → Dashboard
  - Giáo viên → Lớp học được phân công
  - Phụ huynh → Thông tin con

#### Quản lý tài khoản
- Đổi mật khẩu
- Cập nhật thông tin cá nhân
- Đăng xuất

### 4.2 Quản lý Học sinh

#### Danh sách học sinh
- Bảng với các cột: Ảnh, Họ tên, Lớp, Ngày sinh, Giới tính, Phụ huynh, Trạng thái
- Tìm kiếm theo tên, mã học sinh
- Lọc theo lớp, năm học
- Phân trang (20/không trang)
- Export Excel

#### Thêm/Sửa học sinh
**Form fields:**
| Trường | Loại | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| Ảnh đại diện | Upload | Không | JPG, PNG, tối đa 2MB |
| Mã học sinh | Text | Có | Auto-generate hoặc nhập tay |
| Họ tên | Text | Có | |
| Ngày sinh | Date | Có | |
| Giới tính | Radio | Có | Nam / Nữ |
| Dân tộc | Select | Không | |
| Quốc tịch | Select | Không | Mặc định: Việt Nam |
| Địa chỉ | Textarea | Có | |
| Ngày nhập học | Date | Có | |
| Lớp | Select | Có | Chọn từ danh sách lớp |
| Ghi chú | Textarea | Không | |

**Thông tin sức khỏe:**
| Trường | Loại | Ghi chú |
|--------|------|---------|
| Chiều cao | Number | cm |
| Cân nặng | Number | kg |
| Nhóm máu | Select | |
| Dị ứng | Text | Phân cách bằng dấu phẩy |
| Bệnh lý | Textarea | |

#### Chi tiết học sinh
- Tabs: Thông tin chung | Sức khỏe | Học phí | Điểm danh | Lịch sử
- Avatar lớn
- Các nút hành động: Sửa, In thông tin, Xóa

### 4.3 Quản lý Lớp học

#### Danh sách lớp
- Card view hoặc table view
- Thông tin: Tên lớp, Giáo viên CN, Sĩ số, Phòng học
- Badge màu theo khối (Mầm, Chồi, Lá)

#### Thêm/Sửa lớp
| Trường | Loại | Bắt buộc |
|--------|------|----------|
| Tên lớp | Text | Có |
| Khối | Select | Có |
| Giáo viên chủ nhiệm | Select | Có |
| Số phòng | Text | Không |
| Số học sinh tối đa | Number | Có |
| Mô tả | Textarea | Không |

#### Chi tiết lớp
- Thông tin lớp
- Danh sách học sinh (trong lớp)
- Lịch sử điểm danh
- Nút chuyển học sinh

### 4.4 Quản lý Giáo viên

#### Danh sách giáo viên
- Bảng: Ảnh, Họ tên, Lớp phụ trách, SĐT, Email, Trạng thái
- Tìm kiếm, lọc theo lớp, khối

#### Thêm/Sửa giáo viên
| Trường | Loại | Bắt buộc |
|--------|------|----------|
| Ảnh đại diện | Upload | Không |
| Mã giáo viên | Text | Có |
| Họ tên | Text | Có |
| Ngày sinh | Date | Có |
| Giới tính | Radio | Có |
| SĐT | Text | Có |
| Email | Email | Có |
| Địa chỉ | Textarea | Có |
| Trình độ | Select | Có |
| Chuyên môn | Text | Không |
| Ngày vào làm | Date | Có |
| Lớp phụ trách | Select (multiple) | Không |

### 4.5 Quản lý Phụ huynh

#### Danh sách phụ huynh
- Bảng: Họ tên, SĐT, Email, Số con đang học, Trạng thái

#### Thêm/Sửa phụ huynh
| Trường | Loại | Bắt buộc |
|--------|------|----------|
| Họ tên | Text | Có |
| SĐT | Text | Có |
| Email | Email | Có |
| Mối quan hệ | Select | Có |
| Địa chỉ | Textarea | Có |
| Nghề nghiệp | Text | Không |
| Ghi chú | Textarea | Không |

#### Liên kết với học sinh
- Form liên kết: Chọn phụ huynh + Chọn học sinh
- Mỗi học sinh có thể có 1-2 phụ huynh
- Hiển thị trên thẻ học sinh

### 4.6 Điểm danh

#### Giao diện điểm danh
- Chọn ngày (mặc định hôm nay)
- Chọn lớp (giáo viên chỉ thấy lớp được phân công)
- Danh sách học sinh với avatar
- 3 nút hành động: ✓ Có mặt | ✗ Vắng | ⏰ Đi muộn

#### Chi tiết điểm danh
- Thời gian điểm danh: Giờ vào, Giờ ra
- Ghi chú: Lý do vắng (nếu có)
- Tùy chọn: Thông báo tự động cho phụ huynh khi vắng

#### Thống kê điểm danh
- Bảng: Lớp | Có mặt | Vắng | Tỷ lệ
- Biểu đồ theo ngày/tuần/tháng

### 4.7 Quản lý Học phí

#### Danh sách học sinh cần thu
- Bảng: Học sinh, Lớp, Tháng, Số tiền, Trạng thái, Ngày thu
- Filter: Theo tháng, lớp, trạng thái (Đã thu/Chưa thu/Còn nợ)

#### Thu học phí
- Chọn học sinh hoặc thu nhiều em cùng lúc
- Số tiền: Auto-fill từ cấu hình, có thể sửa
- Ngày thu
- Phương thức thanh toán: Tiền mặt / Chuyển khoản
- Ghi chú
- In biên nhận

#### Cấu hình học phí
- Các loại phí: Học phí, Bảo hiểm, Ăn trưa, Đồng phục...
- Số tiền theo tháng cho mỗi khối
- Miễn giảm: Theo đối tượng

#### Báo cáo công nợ
- Danh sách học sinh còn nợ
- Tổng tiền nợ
- In danh sách nợ

### 4.8 Thông báo

#### Gửi thông báo
- Tiêu đề
- Nội dung (rich text editor)
- Đính kèm file
- Gửi đến: Tất cả / Theo lớp / Theo khối / Chọn cá nhân
- Lịch gửi: Gửi ngay / Hẹn giờ

#### Loại thông báo
- 📢 Thông báo chung
- 📅 Sự kiện
- ⚠️ Nghỉ học
- 📋 Yêu cầu phụ huynh

#### App Phụ huynh
- Push notification
- In-app notification
- Lịch sử thông báo

### 4.9 Báo cáo & Thống kê

#### Dashboard Analytics
- Tổng quan: Tổng HS, Tổng GV, Tổng lớp
- Biểu đồ hình tròn: Phân bố HS theo khối
- Biểu đồ cột: Điểm danh theo ngày
- Biểu đồ đường: Thu chi theo tháng

#### Báo cáo chi tiết
| Báo cáo | Nội dung | Định dạng |
|---------|----------|-----------|
| Danh sách học sinh | Tất cả thông tin HS | Excel, PDF |
| Danh sách lớp | HS theo lớp, sĩ số | Excel |
| Điểm danh tháng | Chi tiết điểm danh | Excel |
| Công nợ học phí | HS còn nợ | Excel, PDF |
| Thống kê thu chi | Tổng hợp tài chính | Excel |

### 4.10 Cài đặt

#### Thông tin trường
- Tên trường
- Logo
- Địa chỉ, SĐT, Email
- Năm học: Từ ngày - Đến ngày

#### Quản lý năm học
- Thêm/sửa năm học
- Chuyển dữ liệu khi kết thúc năm

#### Phân quyền
- Thêm/sửa vai trò
- Gán quyền cho người dùng

---

## 5. COMPONENT INVENTORY

### 5.1 Buttons

| Type | Màu nền | Màu chữ | Sử dụng |
|------|---------|---------|---------|
| Primary | `#FF6B6B` | White | Hành động chính |
| Secondary | `#4ECDC4` | White | Hành động phụ |
| Outline | Transparent | `#FF6B6B` | Border 2px |
| Ghost | Transparent | `#64748B` | Hover: bg-gray |
| Danger | `#EF4444` | White | Xóa, hủy |

**States:**
- Default: Như bảng trên
- Hover: Darken 10%
- Active: Darken 15%
- Disabled: Opacity 50%, cursor not-allowed
- Loading: Spinner + "Đang xử lý..."

### 5.2 Form Elements

#### Input Fields
- Border: 1px solid `#E2E8F0`
- Border radius: 8px
- Padding: 12px 16px
- Focus: Border `#FF6B6B`, shadow ring
- Error: Border `#EF4444`, helper text màu đỏ

#### Select
- Tương tự Input
- Icon dropdown bên phải
- Searchable cho danh sách dài

#### Checkbox & Radio
- Custom styled với màu Primary
- Checked: Background Primary

#### Date Picker
- Calendar popup
- Format: DD/MM/YYYY

### 5.3 Cards

```css
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 24px;
}
```

- Card Header: Title + Action buttons
- Card Body: Content
- Card Footer: Pagination hoặc actions

### 5.4 Tables

- Header: Background `#F8FAFC`, font-weight 600
- Row: Hover background `#F8FAFC`
- Border: 1px solid `#E2E8F0`
- Cell padding: 12px 16px
- Responsive: Horizontal scroll trên mobile

### 5.5 Modals

- Overlay: `rgba(0,0,0,0.5)`
- Modal: White bg, border-radius 16px, max-width 600px
- Header: Title + Close button
- Body: Content
- Footer: Action buttons

### 5.6 Alerts & Toasts

| Type | Background | Border |
|------|------------|--------|
| Success | `#DCFCE7` | `#22C55E` |
| Warning | `#FEF3C7` | `#F59E0B` |
| Error | `#FEE2E2` | `#EF4444` |
| Info | `#DBEAFE` | `#3B82F6` |

Toast position: Top-right
Duration: 3-5 seconds
Auto-dismiss: Có

### 5.7 Avatar

- Sizes: 32px (small), 40px (medium), 64px (large), 96px (xlarge)
- Border radius: 50%
- Fallback: Initials on colored background
- Group avatar: Overlap với +N indicator

### 5.8 Badge

| Variant | Background | Text |
|---------|------------|------|
| Success | `#DCFCE7` | `#22C55E` |
| Warning | `#FEF3C7` | `#F59E0B` |
| Error | `#FEE2E2` | `#EF4444` |
| Info | `#DBEAFE` | `#3B82F6` |
| Neutral | `#F1F5F9` | `#64748B` |

### 5.9 Sidebar Navigation

- Width: 260px (desktop), 64px (collapsed)
- Item: Padding 12px 16px
- Active: Background Primary 10%, text Primary
- Hover: Background `#F1F5F9`
- Icon + Label, icon 24px
- Submenu: Indent 32px

### 5.10 Empty States

- Icon/Illustration 120px
- Title: "Không có dữ liệu"
- Description: "Chưa có [object] nào"
- CTA button nếu phù hợp

### 5.11 Loading States

- Spinner: Primary color, 24px
- Skeleton: Animated gradient shimmer
- Progress bar: Determinate/Indeterminate

---

## 6. USER FLOWS

### 6.1 Flow: Đăng nhập → Dashboard

```
[User] → [Login Page] → [Enter credentials] → [Click Đăng nhập]
                                                      ↓
                                              [Validate credentials]
                                                      ↓
                                    ┌─────────────────┴─────────────────┐
                                    ↓                                   ↓
                              [Success]                          [Failed]
                                    ↓                                   ↓
                              [Redirect to role-based dashboard]  [Show error message]
```

### 6.2 Flow: Thêm học sinh mới

```
[Admin] → [Học sinh] → [Click + Thêm mới] → [Fill form]
                                                      ↓
                                            [Upload avatar]
                                                      ↓
                                            [Select class]
                                                      ↓
                                            [Link parent]
                                                      ↓
                                            [Click Lưu]
                                                      ↓
                                    ┌─────────────────┴─────────────────┐
                                    ↓                                   ↓
                              [Success]                          [Error]
                                    ↓                                   ↓
                         [Show success toast]              [Show field errors]
                         [Redirect to list]               [Stay on form]
```

### 6.3 Flow: Điểm danh hàng ngày

```
[Teacher] → [Điểm danh] → [Select class] → [View student list]
                                                    ↓
                                    ┌───────────────┼───────────────┐
                                    ↓               ↓               ↓
                              [Click ✓]      [Click ✗]       [Click ⏰]
                                    ↓               ↓               ↓
                              [Mark Present]  [Mark Absent]   [Mark Late]
                                    ↓               ↓               ↓
                                    └───────────────┴───────────────┘
                                                      ↓
                                            [Optional: Add note]
                                                      ↓
                                            [Save attendance]
                                                      ↓
                                            [Confirm dialog]
                                                      ↓
                                            [Success notification]
```

### 6.4 Flow: Phụ huynh xem thông tin con

```
[Parent] → [Login] → [Dashboard] → [View child's info]
                                          ↓
                              [Tab: Điểm danh] → View attendance history
                              [Tab: Học phí] → View payment status
                              [Tab: Thông báo] → Read notifications
```

---

## 7. DATA MODELS

### 7.1 ER Diagram Overview

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Users     │       │  Students   │       │   Classes   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ email       │       │ student_code│       │ name        │
│ password    │       │ full_name   │       │ grade_id    │
│ role        │       │ dob         │       │ teacher_id  │
│ full_name   │       │ gender      │       │ room        │
│ phone       │       │ address     │       │ max_students│
│ avatar      │       │ class_id    │       │ description │
│ is_active   │       │ parent_id   │       │ is_active   │
│ created_at  │       │ enrolled_date│      │ created_at  │
└─────────────┘       │ health_info │       └─────────────┘
       │              │ is_active   │              │
       │              │ created_at  │              │
       │              └─────────────┘              │
       │                     │                     │
       │                     │                     │
       │              ┌──────────────┐             │
       │              │  Attendance  │             │
       │              ├──────────────┤             │
       │              │ id           │             │
       │              │ student_id   │─────────────┤
       │              │ class_id     │             │
       │              │ date         │             │
       │              │ status       │             │
       │              │ note         │             │
       │              │ recorded_by  │             │
       │              │ created_at   │             │
       │              └──────────────┘             │
       │                                             │
       │              ┌──────────────┐               │
       │              │  Fee Records │               │
       │              ├──────────────┤               │
       │              │ id           │               │
       └─────────────►│ student_id   │◄──────────────┘
                      │ fee_type_id  │
                      │ amount       │
                      │ month        │
                      │ year         │
                      │ status       │
                      │ paid_date    │
                      │ payment_method│
                      │ recorded_by  │
                      │ note         │
                      │ created_at   │
                      └──────────────┘
```

### 7.2 Table Schemas

#### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | |
| role | ENUM | NOT NULL | admin, teacher, accountant, parent |
| full_name | VARCHAR(255) | NOT NULL | |
| phone | VARCHAR(20) | | |
| avatar | VARCHAR(500) | | URL to avatar |
| date_of_birth | DATE | | For teachers |
| address | TEXT | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | | |

#### students
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| student_code | VARCHAR(50) | UNIQUE, NOT NULL | |
| full_name | VARCHAR(255) | NOT NULL | |
| dob | DATE | NOT NULL | |
| gender | ENUM | NOT NULL | male, female |
| ethnicity | VARCHAR(100) | | |
| nationality | VARCHAR(100) | DEFAULT 'Việt Nam' | |
| address | TEXT | NOT NULL | |
| enrolled_date | DATE | NOT NULL | |
| class_id | UUID | FK | |
| health_info | JSONB | | {height, weight, blood_type, allergies} |
| avatar | VARCHAR(500) | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | | |

#### classes
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | |
| grade_id | UUID | FK | |
| homeroom_teacher_id | UUID | FK | |
| room | VARCHAR(50) | | |
| max_students | INTEGER | DEFAULT 30 | |
| description | TEXT | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | | |

#### grades
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | Mầm, Chồi, Lá |
| description | TEXT | | |
| order | INTEGER | | Sort order |
| created_at | TIMESTAMP | DEFAULT now() | |

#### parents
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK | Link to users |
| full_name | VARCHAR(255) | NOT NULL | |
| phone | VARCHAR(20) | NOT NULL | |
| email | VARCHAR(255) | | |
| relationship | ENUM | NOT NULL | father, mother, guardian |
| occupation | VARCHAR(255) | | |
| address | TEXT | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT now() | |

#### student_parent
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| student_id | UUID | FK | |
| parent_id | UUID | FK | |
| is_primary | BOOLEAN | DEFAULT false | Primary contact |
| created_at | TIMESTAMP | DEFAULT now() | |

#### attendance
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| student_id | UUID | FK | |
| class_id | UUID | FK | |
| date | DATE | NOT NULL | |
| status | ENUM | NOT NULL | present, absent, late |
| check_in_time | TIME | | |
| check_out_time | TIME | | |
| note | TEXT | | |
| recorded_by | UUID | FK | User who recorded |
| created_at | TIMESTAMP | DEFAULT now() | |

#### fee_types
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | |
| amount | DECIMAL(10,0) | NOT NULL | |
| grade_id | UUID | FK | NULL = áp dụng tất cả |
| description | TEXT | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT now() | |

#### fee_records
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| student_id | UUID | FK | |
| fee_type_id | UUID | FK | |
| amount | DECIMAL(10,0) | NOT NULL | |
| month | INTEGER | NOT NULL | 1-12 |
| year | INTEGER | NOT NULL | |
| status | ENUM | DEFAULT 'unpaid' | paid, unpaid, partial |
| paid_date | DATE | | |
| payment_method | ENUM | | cash, bank_transfer |
| recorded_by | UUID | FK | |
| note | TEXT | | |
| created_at | TIMESTAMP | DEFAULT now() | |

#### notifications
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| content | TEXT | NOT NULL | |
| type | ENUM | NOT NULL | general, event, holiday, request |
| target_type | ENUM | | all, grade, class, specific |
| target_ids | JSONB | | Array of IDs |
| attachment_url | VARCHAR(500) | | |
| sent_by | UUID | FK | |
| sent_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT now() | |

#### notification_reads
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| notification_id | UUID | FK | |
| user_id | UUID | FK | |
| read_at | TIMESTAMP | DEFAULT now() | |

#### school_settings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| key | VARCHAR(100) | UNIQUE, NOT NULL | |
| value | TEXT | | |
| updated_at | TIMESTAMP | | |

---

## 8. API ENDPOINTS

### 8.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |
| PUT | `/api/auth/password` | Đổi mật khẩu |

### 8.2 Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Danh sách users (admin) |
| POST | `/api/users` | Tạo user mới |
| GET | `/api/users/:id` | Chi tiết user |
| PUT | `/api/users/:id` | Cập nhật user |
| DELETE | `/api/users/:id` | Xóa user |

### 8.3 Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Danh sách HS (filter: class_id, search) |
| POST | `/api/students` | Tạo HS mới |
| GET | `/api/students/:id` | Chi tiết HS |
| PUT | `/api/students/:id` | Cập nhật HS |
| DELETE | `/api/students/:id` | Xóa HS |
| GET | `/api/students/:id/attendance` | Lịch sử điểm danh |
| GET | `/api/students/:id/fees` | Lịch sử học phí |
| POST | `/api/students/import` | Import từ Excel |

### 8.4 Classes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/classes` | Danh sách lớp |
| POST | `/api/classes` | Tạo lớp mới |
| GET | `/api/classes/:id` | Chi tiết lớp |
| PUT | `/api/classes/:id` | Cập nhật lớp |
| DELETE | `/api/classes/:id` | Xóa lớp |
| GET | `/api/classes/:id/students` | DS học sinh trong lớp |
| POST | `/api/classes/:id/students` | Thêm HS vào lớp |
| DELETE | `/api/classes/:id/students/:studentId` | Xóa HS khỏi lớp |

### 8.5 Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | DS điểm danh (filter: class_id, date) |
| POST | `/api/attendance` | Tạo điểm danh |
| PUT | `/api/attendance/:id` | Cập nhật điểm danh |
| POST | `/api/attendance/bulk` | Điểm danh nhiều HS |
| GET | `/api/attendance/report` | Báo cáo điểm danh |

### 8.6 Fees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fees/types` | Danh sách loại phí |
| POST | `/api/fees/types` | Tạo loại phí |
| GET | `/api/fees/records` | DS phiếu thu (filter: student_id, month, status) |
| POST | `/api/fees/records` | Tạo phiếu thu |
| PUT | `/api/fees/records/:id` | Cập nhật phiếu thu |
| GET | `/api/fees/debtors` | DS công nợ |

### 8.7 Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | DS thông báo |
| POST | `/api/notifications` | Gửi thông báo |
| GET | `/api/notifications/:id` | Chi tiết |
| PUT | `/api/notifications/:id` | Sửa |
| DELETE | `/api/notifications/:id` | Xóa |

### 8.8 Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Data dashboard |
| GET | `/api/reports/students` | Báo cáo HS |
| GET | `/api/reports/attendance` | Báo cáo điểm danh |
| GET | `/api/reports/finance` | Báo cáo tài chính |

### 8.9 Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Lấy cài đặt |
| PUT | `/api/settings` | Cập nhật cài đặt |
| GET | `/api/settings/grades` | Danh sách khối |

---

## 9. KỸ THUẬT

### 9.1 Tech Stack

#### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Custom components
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Date**: date-fns

#### Backend (Supabase)
- **Database**: PostgreSQL
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (avatars, attachments)
- **Real-time**: Supabase Realtime (notifications)
- **Edge Functions**: Deno (business logic)

### 9.2 Project Structure

```
kindergarten-management/
├── src/
│   ├── components/
│   │   ├── common/           # Reusable components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Card/
│   │   │   ├── Avatar/
│   │   │   ├── Badge/
│   │   │   └── Toast/
│   │   ├── layout/           # Layout components
│   │   │   ├── Sidebar/
│   │   │   ├── Header/
│   │   │   └── MainLayout/
│   │   └── features/         # Feature-specific components
│   │       ├── students/
│   │       ├── classes/
│   │       ├── attendance/
│   │       └── ...
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── students/
│   │   ├── classes/
│   │   ├── teachers/
│   │   ├── parents/
│   │   ├── attendance/
│   │   ├── fees/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── settings/
│   ├── hooks/                # Custom hooks
│   ├── services/             # API services
│   ├── stores/               # Zustand stores
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   ├── constants/            # Constants
│   └── lib/
│       └── supabase.ts       # Supabase client
├── public/
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### 9.3 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │   React     │────►│  Supabase  │────►│  PostgreSQL │    │
│  │   App       │◄────│   Auth     │◄────│   Database  │    │
│  └─────────────┘     └─────────────┘     └─────────────┘    │
│         │                   │                              │
│         │  1. Login          │                              │
│         │───────────────────►│                              │
│         │                   │  2. Verify credentials        │
│         │                   │───────────────────────────────►│
│         │                   │◄──────────────────────────────│
│         │  3. JWT Token     │                              │
│         │◄──────────────────│                              │
│         │                   │                              │
│         │  4. Store token in localStorage                  │
│         │                   │                              │
└─────────┴───────────────────┴──────────────────────────────┘
```

### 9.4 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_full_name ON students(full_name);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_fee_records_student ON fee_records(student_id);
CREATE INDEX idx_fee_records_month_year ON fee_records(month, year);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 9.5 Row Level Security (RLS)

```sql
-- Example: Students can only be viewed by their class teacher or admin
CREATE POLICY "Users can view students" ON students
  FOR SELECT
  USING (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.homeroom_teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM student_parent
      JOIN parents ON parents.id = student_parent.parent_id
      WHERE student_parent.student_id = students.id
      AND parents.user_id = auth.uid()
    )
  );
```

---

## 10. MILEPHONES & TIMELINE

### Phase 1: Core Foundation (2-3 tuần)
- [ ] Thiết lập project structure
- [ ] Setup Supabase project
- [ ] Database migrations
- [ ] Authentication system
- [ ] Layout components (Sidebar, Header)

### Phase 2: Student & Class Management (2-3 tuần)
- [ ] Student CRUD
- [ ] Class CRUD
- [ ] Parent management
- [ ] Student-Parent linking

### Phase 3: Attendance System (1-2 tuần)
- [ ] Daily attendance
- [ ] Attendance history
- [ ] Attendance reports

### Phase 4: Fee Management (1-2 tuần)
- [ ] Fee types configuration
- [ ] Fee collection
- [ ] Debt tracking
- [ ] Financial reports

### Phase 5: Notifications & Dashboard (1-2 tuần)
- [ ] Notification system
- [ ] Dashboard with charts
- [ ] Report exports

### Phase 6: Polish & Deploy (1 tuần)
- [ ] Responsive design testing
- [ ] Performance optimization
- [ ] Deployment
- [ ] Documentation

---

## 11. ASSUMPTIONS & NOTES

### 11.1 Assumptions

1. **Supabase**: Sử dụng Supabase làm backend-as-a-service
2. **Single School**: Hệ thống quản lý 1 trường (không multi-tenant)
3. **Online-first**: Yêu cầu kết nối internet (không offline mode)
4. **Vietnamese**: Giao diện tiếng Việt hoàn toàn
5. **Mobile Responsive**: Hỗ trợ đầy đủ trên mobile

### 11.2 Future Considerations (Out of Scope)

- Ứng dụng di động native (iOS/Android)
- Học phí trực tuyến (VNPay, MoMo integration)
- Module giáo dục (bài tập, đánh giá)
- Camera điểm danh khuôn mặt
- SMS notifications

---

## 12. REVIEW CHECKLIST

### Trước khi bắt đầu code, vui lòng xác nhận:

- [ ] **Tên dự án**: KidGarden ✓/□
- [ ] **Tech stack**: React + Supabase ✓/□
- [ ] **Tính năng cần thiết**: Đã đủ? ✓/□
- [ ] **Design language**: Đã phù hợp? ✓/□
- [ ] **Data models**: Đã chính xác? ✓/□
- [ ] **Phân quyền**: Đã rõ ràng? ✓/□

### Góp ý thêm:

1. Thêm/yêu cầu tính năng: _________________________
2. Thay đổi design: ________________________________
3. Thay đổi data model: ______________________________
4. Khác: ____________________________________________

---

**Người tạo**: MiniMax Agent
**Ngày tạo**: 2026-04-19

*Nếu bạn đồng ý với SPEC này, vui lòng phản hồi để tôi bắt đầu triển khai.*
