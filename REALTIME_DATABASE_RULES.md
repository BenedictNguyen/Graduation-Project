# Hướng dẫn cấu hình Realtime Database Rules

## Vấn đề
ESP32 không đọc được dữ liệu từ Realtime Database mặc dù dữ liệu đã được ghi thành công.

## Nguyên nhân
Realtime Database có rules mặc định **chặn tất cả truy cập** nếu chưa được cấu hình.

## Giải pháp

### Bước 1: Truy cập Firebase Console
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: `graduationproject-8fc97`
3. Vào **Realtime Database** (không phải Firestore)
4. Chọn tab **Rules**

### Bước 2: Cấu hình Rules

#### Option 1: Cho phép đọc công khai (Development - Không khuyến nghị cho production)
```json
{
  "rules": {
    "product_counts": {
      ".read": true,
      ".write": false
    }
  }
}
```

#### Option 2: Chỉ cho phép đọc, không cho phép ghi từ client (Khuyến nghị)
```json
{
  "rules": {
    "product_counts": {
      ".read": true,
      ".write": false,
      "latest": {
        ".read": true,
        ".write": false
      }
    }
  }
}
```

#### Option 3: Cho phép đọc/ghi công khai (Chỉ dùng cho testing)
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Bước 3: Publish Rules
1. Sau khi chỉnh sửa rules, nhấn **Publish**
2. Đợi vài giây để rules được áp dụng

## Kiểm tra

### Trong Firebase Console:
1. Vào **Realtime Database** > **Data**
2. Kiểm tra path: `/product_counts/latest`
3. Xem có dữ liệu không:
   ```json
   {
     "timestamp": "2024-...",
     "total": 0,
     "products": { ... }
   }
   ```

### Trong Serial Monitor của ESP32:
- Mở Serial Monitor (115200 baud)
- Kiểm tra các message:
  - `✅ Firebase ready!`
  - `✅ Successfully read from Firebase!`
  - `Total: X`
  - `Number of product types: X`

## Lưu ý bảo mật

⚠️ **QUAN TRỌNG**: 
- Rules ở trên cho phép **đọc công khai** - phù hợp cho development
- Đối với production, nên sử dụng authentication và rules phức tạp hơn
- Python script sử dụng Admin SDK nên **bỏ qua rules** và vẫn có thể ghi được

## Troubleshooting

### Nếu vẫn không đọc được:

1. **Kiểm tra URL trong ESP32 code:**
   - Phải khớp với URL trong Firebase Console
   - Format: `https://graduationproject-8fc97-default-rtdb.firebaseio.com/`

2. **Kiểm tra API Key:**
   - Phải đúng API Key từ Firebase Console > Project Settings

3. **Kiểm tra Serial Monitor:**
   - Xem error message cụ thể
   - Thường gặp: "Permission denied" → Cần cấu hình rules

4. **Kiểm tra dữ liệu trong Realtime Database:**
   - Đảm bảo path `/product_counts/latest` có dữ liệu
   - Kiểm tra format JSON có đúng không

