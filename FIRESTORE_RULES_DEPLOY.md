# Hướng dẫn triển khai Firestore Security Rules

## Vấn đề
Ứng dụng đang gặp lỗi "Missing or insufficient permissions" khi đọc dữ liệu từ Firestore.

## Giải pháp
File `firestore.rules` đã được tạo với các quy tắc bảo mật phù hợp. Bạn cần triển khai nó lên Firebase Console.

## Cách triển khai

### Cách 1: Qua Firebase Console (Khuyến nghị)
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: `graduationproject-8fc97`
3. Vào **Firestore Database** > **Rules**
4. Copy nội dung từ file `firestore.rules`
5. Paste vào editor và nhấn **Publish**

### Cách 2: Qua Firebase CLI
```bash
# Cài đặt Firebase CLI (nếu chưa có)
npm install -g firebase-tools

# Đăng nhập
firebase login

# Khởi tạo Firebase project (nếu chưa có firebase.json)
firebase init firestore

# Triển khai rules
firebase deploy --only firestore:rules
```

## Nội dung Rules

### Phân quyền chi tiết:

#### **Users collection**
- **Admin**: 
  - Đọc tất cả dữ liệu người dùng
  - Sửa tất cả dữ liệu người dùng
  - Xóa người dùng
- **Nhân viên (Employee)**:
  - Chỉ đọc và sửa dữ liệu của chính mình
  - Không thể xóa người dùng

#### **Product counts collection**
- **Admin**: 
  - Đọc tất cả dữ liệu
  - Có thể xóa dữ liệu (nếu cần)
  - Không thể ghi (chỉ server-side được ghi)
- **Nhân viên (Employee)**:
  - Chỉ đọc dữ liệu
  - Không thể ghi/xóa dữ liệu
- **Server-side (Python script)**: 
  - Ghi dữ liệu qua Admin SDK (bỏ qua security rules)

## Lưu ý
- Sau khi triển khai rules, ứng dụng sẽ chỉ cho phép người dùng đã đăng nhập đọc dữ liệu
- Python script sử dụng Admin SDK nên vẫn có thể ghi dữ liệu bình thường (bỏ qua security rules)

