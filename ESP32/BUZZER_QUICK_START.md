# 🔊 Hướng Dẫn Nhanh - Loa 8Ω + PAM8403

## ✅ Code Đã Sẵn Sàng!

Tính năng phát âm thanh chào mừng đã được tích hợp sẵn trong `test_lcd.ino`. Bạn chỉ cần gắn module khuếch đại PAM8403 + loa 8Ω/2W và upload code.

---

## 🔌 Kết Nối Phần Cứng

### Vật liệu cần:
- **1 x Module PAM8403** (khuếch đại Class-D 5 V nhỏ gọn)
- **1 x Loa 8Ω/2W** (hoặc 3W nếu có)
- Dây nối
- Nguồn 5 V ổn định (USB, buck converter...)

### Sơ đồ kết nối:
```
ESP32                PAM8403                 Loa
------               -------                 ----
GPIO 25 (DAC1)  →    IN+                     (+) Loa
GND             →    IN- & GND          →    (-) Loa
5V (USB)  ─────→     VCC
GND (chung) ───→     GND
```

**Lưu ý:**
- Bắt buộc nối chung mass giữa ESP32 và PAM8403.
- PAM8403 chỉ chịu tối đa 5.5 V; không cấp trực tiếp từ pin Li-ion 4.2 V nếu chưa ổn áp.
- `GPIO25` hoặc `GPIO26` là chân DAC của ESP32. Nếu đổi chân, cập nhật `#define BUZZER_PIN`.
- Không cần thêm tụ hay điện trở vì PAM8403 đã có mạch lọc đầu vào.

---

## 🎚️ Điều Chỉnh Âm Lượng

- **Giảm âm lượng:** giảm biên độ `SINE_TABLE` (dịch các giá trị gần 128) hoặc gắn biến trở volume có sẵn trên module.
- **Tăng âm lượng:** dùng loa 3W hoặc cấp nguồn 5 V ổn định hơn; tránh vượt quá 5 V.
- **Tắt tiếng tức thì:** gọi `dacWrite(BUZZER_PIN, DAC_IDLE_LEVEL);` hoặc comment `playWelcomeSound();`.

---

## 🎹 Tùy Chỉnh Melody & Thời Gian

### Cách thay đổi melody:

Mở file `test_lcd.ino`, tìm hàm `playWelcomeSound()` và thay đổi:

```cpp
// Melody hiện tại
int melody[] = {
  NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6, NOTE_G5, NOTE_C6
};
int noteDurations[] = {
  200, 200, 200, 300, 200, 400  // ms
};
```

### Các nốt nhạc có sẵn:
- `NOTE_C4` đến `NOTE_C6` (262Hz - 1047Hz)
- Xem đầy đủ trong code: `#define NOTE_...`

### Ví dụ melody khác:

**Melody đơn giản (2 nốt):**
```cpp
int melody[] = { NOTE_C5, NOTE_C6 };
int noteDurations[] = { 300, 500 };
```

**Melody dài hơn:**
```cpp
int melody[] = {
  NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6,
  NOTE_G5, NOTE_E5, NOTE_C5, NOTE_C6
};
int noteDurations[] = {
  150, 150, 150, 300,
  150, 150, 150, 400
};
```

---

## ⚙️ Cấu Hình

### Thay đổi GPIO pin:
```cpp
#define BUZZER_PIN 25  // Chọn GPIO25 hoặc GPIO26 (DAC)
```

### Thay đổi độ dài âm thanh:
```cpp
int noteDurations[] = {
  200, 200, 200, 300, 200, 400  // Tăng/giảm số này (ms)
};
```

### Thay đổi khoảng nghỉ giữa các nốt:
```cpp
delay(30);  // Trong hàm playWelcomeSound(), tăng/giảm số này
```

---

## 🧪 Kiểm Tra

### Khi nào buzzer phát âm thanh?
- ✅ Khi ESP32 khởi động và kết nối WiFi thành công **lần đầu tiên**
- ❌ Không phát khi WiFi reconnect (chỉ phát 1 lần khi khởi động)

### Debug:
Mở Serial Monitor (115200 baud) để xem:
```
🔊 Playing welcome sound...
✅ Welcome sound completed
```

---

## 🔧 Xử Lý Sự Cố

### Không nghe thấy âm thanh:
1. ✅ Đảm bảo `GPIO25/26` → `IN+`, GND → `IN-`.
2. ✅ Kiểm tra nguồn 5 V vào PAM8403 có đủ ~5 V và chung mass với ESP32.
3. ✅ Mở Serial Monitor xem thông báo `Playing welcome sound...`.
4. ✅ Thử chạm nhẹ dây loa để nghe tiếng ù (để xác nhận amp hoạt động).

### Âm thanh méo/ngắt quãng:
- Kiểm tra nguồn 5 V có sụt áp; ưu tiên cấp riêng hoặc thêm tụ 470 µF.
- Dây loa quá dài dễ nhiễu → xoắn lại hoặc dùng dây đôi.

### Loa phát tiếng "pop" khi khởi động:
- Đã hạn chế bằng `DAC_IDLE_LEVEL`. Nếu vẫn còn, thêm điện trở 100 kΩ kéo IN- xuống GND hoặc cấp nguồn PAM8403 sau khi ESP32 đã khởi động.

---

## 📝 Tóm Tắt

| Mục | Giá trị |
|-----|---------|
| GPIO Pin | 25 (hoặc 26) |
| Module | PAM8403 (5 V) |
| Loa | 8Ω/2W (khuyến nghị) |
| Thời điểm phát | Khi WiFi kết nối thành công lần đầu |
| Số lần phát | 1 lần khi khởi động |
| Công suất | ~1.5 W (5 V) |

---

## 🎯 Kết Luận

Code đã sẵn sàng! Chỉ cần:
1. ✅ Gắn ESP32 → PAM8403 → Loa theo sơ đồ trên
2. ✅ Upload code lên ESP32
3. ✅ Sau khi WiFi kết nối, loa sẽ tự động phát âm thanh chào mừng!

**Chúc bạn thành công! 🎉**

