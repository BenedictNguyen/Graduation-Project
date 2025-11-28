# 🛒 Smart Shelf - Hệ Thống Quản Lý Kệ Hàng Thông Minh

Hệ thống quản lý kệ hàng tự động sử dụng AI nhận diện sản phẩm, hiển thị thời gian thực trên màn hình LCD và quản lý qua ứng dụng di động.

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Tính Năng](#tính-năng)
- [Cấu Trúc Project](#cấu-trúc-project)
- [Cài Đặt](#cài-đặt)
  - [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
  - [Cài Đặt Phần Mềm](#cài-đặt-phần-mềm)
  - [Cấu Hình Firebase](#cấu-hình-firebase)
- [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
  - [Chạy YOLO Detection](#chạy-yolo-detection)
  - [Cài Đặt ESP32 Display](#cài-đặt-esp32-display)
  - [Chạy Mobile App](#chạy-mobile-app)
- [Cấu Hình Chi Tiết](#cấu-hình-chi-tiết)
- [Troubleshooting](#troubleshooting)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Tác Giả](#tác-giả)

---

## 🎯 Tổng Quan

**Smart Shelf** là hệ thống quản lý kệ hàng tự động với 3 thành phần chính:

1. **AI Detection System (Python)**: Sử dụng YOLOv11 để nhận diện và đếm sản phẩm từ camera
2. **Display System (ESP32)**: Hiển thị thông tin sản phẩm trên 2 màn hình LCD qua I2C
3. **Mobile App (React Native)**: Ứng dụng quản lý sản phẩm trên điện thoại

Tất cả các thành phần được kết nối qua **Firebase Realtime Database** để đồng bộ dữ liệu thời gian thực.

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐
│   Camera/USB    │
│   (YOLO Input)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Python Script  │ ◄─── YOLOv11 Model (best.pt)
│  (yolo.py)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Firebase RTDB  │ ◄─── Realtime Database
│  + Firestore    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│ ESP32  │ │ Mobile App   │
│ Display│ │ (React Native)│
│ (LCD)  │ │              │
└────────┘ └──────────────┘
```

### Luồng Dữ Liệu

1. **Camera** → **YOLO Detection** → Đếm sản phẩm → **Firebase**
2. **Firebase** → **ESP32** → Hiển thị trên LCD
3. **Firebase** → **Mobile App** → Hiển thị thống kê

---

## ✨ Tính Năng

### 🤖 AI Detection System
- ✅ Nhận diện sản phẩm tự động bằng YOLOv11
- ✅ Đếm số lượng sản phẩm theo từng loại
- ✅ Cập nhật Firebase mỗi 5 giây
- ✅ Merge logic: Giữ lại sản phẩm đã nhận diện (không xóa khi không phát hiện)
- ✅ Hiển thị FPS và bounding boxes
- ✅ Headless mode (chạy không cần màn hình)

### 📺 ESP32 Display System
- ✅ **2 màn hình LCD 16x2** qua I2C (địa chỉ 0x27 và 0x26)
- ✅ **4 chế độ hiển thị**:
  - `auto`: Tự động chuyển màn hình mỗi 3 giây
  - `summary`: LCD1 = Tổng sản phẩm, LCD2 = Trạng thái
  - `top_products`: Hiển thị 2 sản phẩm có số lượng cao nhất
  - `custom_message`: Hiển thị tin nhắn tùy chỉnh từ Firebase
- ✅ **Scroll text** tự động cho tên sản phẩm dài
- ✅ **Auto backlight**: Tắt đèn nền sau 1 phút không hoạt động
- ✅ **Welcome sound**: Phát âm thanh chào mừng khi WiFi kết nối (qua loa 8Ω + PAM8403)
- ✅ **NTP sync**: Đồng bộ thời gian từ internet

### 📱 Mobile App
- ✅ **Đăng nhập/Đăng ký** với Firebase Authentication
- ✅ **Dashboard**: Tổng quan sản phẩm, số loại, trạng thái kết nối
- ✅ **Thống kê chi tiết**: Biểu đồ, danh sách sản phẩm
- ✅ **Quản lý loại sản phẩm**: Thêm/sửa/xóa loại sản phẩm
- ✅ **Thông báo**: Cảnh báo khi hệ thống offline
- ✅ **Profile**: Quản lý thông tin người dùng

---

## 📁 Cấu Trúc Project

```
Graduation-Project/
│
├── yolo.py                          # Script Python chính - YOLO Detection
├── best.pt                          # YOLO Model (YOLOv11)
├── graduationproject-8fc97-*.json   # Firebase Admin SDK Credentials
│
├── ESP32/
│   ├── test_lcd/
│   │   └── test_lcd.ino             # Code Arduino cho ESP32
│   ├── i2c_scanner/
│   │   └── i2c_scanner.ino         # Tool quét địa chỉ I2C
│   └── BUZZER_QUICK_START.md       # Hướng dẫn kết nối loa
│
├── product-manager/                 # Mobile App (React Native/Expo)
│   ├── App.js                       # Entry point
│   ├── components/
│   │   ├── mainScreen/             # Màn hình chính
│   │   ├── productScreen/          # Màn hình thống kê
│   │   ├── profile/                # Màn hình profile
│   │   └── ...
│   ├── utils/
│   │   └── firebaseConfig.js        # Cấu hình Firebase
│   └── package.json
│
├── images/                          # Dataset training YOLO
│   ├── black_tea/
│   ├── noni_tea/
│   └── traindata/
│
├── firebase.json                    # Firebase config
├── firestore.rules                  # Firestore security rules
└── realtime_database.rules           # Realtime Database rules
```

---

## 🚀 Cài Đặt

### Yêu Cầu Hệ Thống

#### Python Detection System
- Python 3.8+
- Webcam/USB Camera
- GPU (khuyến nghị) hoặc CPU
- Windows/Linux/macOS

#### ESP32 Display System
- ESP32 Development Board
- 2x LCD 16x2 với I2C module (địa chỉ 0x27 và 0x26)
- Module PAM8403 + Loa 8Ω/2W (tùy chọn)
- Arduino IDE hoặc PlatformIO
- USB Cable để upload code

#### Mobile App
- Node.js 16+
- Expo CLI
- Android Studio (cho Android) hoặc Xcode (cho iOS)
- Thiết bị Android/iOS hoặc Emulator

### Cài Đặt Phần Mềm

#### 1. Python Detection System

```bash
# Clone repository
git clone <repository-url>
cd Graduation-Project

# Tạo virtual environment (khuyến nghị)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate     # Windows

# Cài đặt dependencies
pip install ultralytics opencv-python firebase-admin numpy

# Hoặc từ requirements.txt (nếu có)
pip install -r requirements.txt
```

#### 2. ESP32 Display System

1. **Cài đặt Arduino IDE**:
   - Download từ [arduino.cc](https://www.arduino.cc/en/software)
   - Cài đặt ESP32 Board Support:
     - File → Preferences → Additional Board Manager URLs
     - Thêm: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
     - Tools → Board → Boards Manager → Tìm "ESP32" → Install

2. **Cài đặt Libraries**:
   - Tools → Manage Libraries → Tìm và cài:
     - `LiquidCrystal_I2C` (by Frank de Brabander)
     - `Firebase ESP32 Client` (by Mobizt)

3. **Upload Code**:
   - Mở `ESP32/test_lcd/test_lcd.ino`
   - Chọn Board: `ESP32 Dev Module`
   - Chọn Port: COM port của ESP32
   - Upload

#### 3. Mobile App

```bash
cd product-manager

# Cài đặt dependencies
npm install

# Hoặc dùng yarn
yarn install

# Chạy app
npm start
# hoặc
expo start
```

### Cấu Hình Firebase

1. **Tạo Firebase Project**:
   - Truy cập [Firebase Console](https://console.firebase.google.com/)
   - Tạo project mới
   - Bật **Realtime Database** và **Firestore**

2. **Lấy Credentials**:
   - Project Settings → Service Accounts → Generate New Private Key
   - Lưu file JSON vào thư mục gốc (đặt tên: `graduationproject-8fc97-firebase-adminsdk-*.json`)
   - Copy **API Key**, **Database URL**, **Database Secret**

3. **Cấu Hình Python Script**:
   - Mở `yolo.py`
   - Sửa `Config.FIREBASE_CRED_PATH` = đường dẫn đến file JSON credentials

4. **Cấu Hình ESP32**:
   - Mở `ESP32/test_lcd/test_lcd.ino`
   - Sửa các define:
     ```cpp
     #define API_KEY        "YOUR_API_KEY"
     #define DATABASE_URL   "YOUR_DATABASE_URL"
     #define DATABASE_SECRET "YOUR_DATABASE_SECRET"
     ```

5. **Cấu Hình Mobile App**:
   - Mở `product-manager/utils/firebaseConfig.js`
   - Thêm Firebase config:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       databaseURL: "YOUR_DATABASE_URL",
       projectId: "YOUR_PROJECT_ID",
       // ...
     };
     ```

---

## 📖 Hướng Dẫn Sử Dụng

### Chạy YOLO Detection

1. **Chuẩn bị Model**:
   - Đảm bảo file `best.pt` có trong thư mục gốc
   - Nếu chưa có, train model YOLOv11 với dataset của bạn

2. **Cấu hình Camera**:
   - Mở `yolo.py`
   - Sửa `Config.CAMERA_INDEX` (thường là 0 hoặc 1)
   - Điều chỉnh `CAMERA_WIDTH` và `CAMERA_HEIGHT` nếu cần

3. **Chạy Script**:
   ```bash
   python yolo.py
   ```

4. **Điều khiển**:
   - Nhấn `q`: Thoát
   - Nhấn `s`: Gửi dữ liệu thủ công
   - Nhấn `r`: Reset dữ liệu Firebase
   - Nhấn `c`: Xóa console

### Cài Đặt ESP32 Display

#### Kết Nối Phần Cứng

**LCD 1 (0x27)**:
```
ESP32          LCD I2C Module
------         --------------
GPIO 21  →     SDA
GPIO 22  →     SCL
5V       →     VCC
GND      →     GND
```

**LCD 2 (0x26)**:
- Tương tự LCD 1, nhưng địa chỉ I2C là 0x26 (nối A0 hoặc A1 trên module I2C)

**Loa (Tùy chọn)**:
```
ESP32          PAM8403         Loa
------         -------         ----
GPIO 25  →     IN+
GND      →     IN- & GND
5V       →     VCC
GND      →     GND            →  (+)
                              →  (-)
```

Xem chi tiết trong `ESP32/BUZZER_QUICK_START.md`

#### Cấu Hình WiFi

Mở `test_lcd.ino` và sửa:
```cpp
#define WIFI_SSID      "TEN_WIFI"
#define WIFI_PASSWORD  "MAT_KHAU"
```

#### Upload và Chạy

1. Upload code lên ESP32
2. Mở Serial Monitor (115200 baud)
3. ESP32 sẽ tự động:
   - Kết nối WiFi
   - Kết nối Firebase
   - Đồng bộ thời gian (NTP)
   - Phát âm thanh chào mừng
   - Hiển thị dữ liệu từ Firebase

### Chạy Mobile App

1. **Development Mode**:
   ```bash
   cd product-manager
   npm start
   ```
   - Quét QR code bằng Expo Go app (Android/iOS)
   - Hoặc nhấn `a` (Android) / `i` (iOS) để mở emulator

2. **Build APK/IPA**:
   ```bash
   # Android
   eas build --platform android

   # iOS
   eas build --platform ios
   ```

3. **Đăng nhập**:
   - Tạo tài khoản mới hoặc đăng nhập
   - App sẽ tự động đồng bộ dữ liệu từ Firebase

---

## ⚙️ Cấu Hình Chi Tiết

### YOLO Detection (`yolo.py`)

```python
class Config:
    MODEL_PATH = "best.pt"              # Đường dẫn model
    CONFIDENCE_THRESHOLD = 0.5          # Ngưỡng tin cậy
    CAMERA_INDEX = 1                    # Index camera
    CAMERA_WIDTH = 640                  # Độ rộng
    CAMERA_HEIGHT = 480                 # Độ cao
    SEND_INTERVAL = 5                   # Gửi dữ liệu mỗi 5 giây
    UPDATE_MODE = True                  # Update document "latest"
    RESET_ON_START = True               # Reset khi khởi động
    HEADLESS_MODE = False               # Chế độ không màn hình
```

### ESP32 Display (`test_lcd.ino`)

```cpp
// LCD Configuration
#define LCD1_ADDRESS   0x27
#define LCD2_ADDRESS   0x26
#define LCD_COLUMNS    16
#define LCD_ROWS       2

// Display Settings
#define SCREEN_INTERVAL    3000   // 3 giây
#define BACKLIGHT_TIMEOUT  60000  // 1 phút

// Speaker
#define BUZZER_PIN 25             // GPIO25 (DAC1)
```

### Điều Khiển LCD từ Firebase

Thêm vào Firebase Realtime Database tại path `/lcd_control`:

```json
{
  "mode": "auto",              // "auto" | "summary" | "top_products" | "custom_message"
  "customLine1": "Dòng 1",     // Cho custom_message mode
  "customLine2": "Dòng 2",     // Cho custom_message mode
  "commandId": "unique_id"      // ID để track command
}
```

---

## 🔧 Troubleshooting

### YOLO Detection

**Camera không mở được**:
- Kiểm tra camera có được sử dụng bởi ứng dụng khác không
- Thử đổi `CAMERA_INDEX` (0, 1, 2...)
- Trên Windows, đảm bảo dùng backend DSHOW

**Model không load**:
- Kiểm tra file `best.pt` có tồn tại không
- Đảm bảo model đúng định dạng YOLOv11

**Firebase lỗi**:
- Kiểm tra file credentials JSON
- Kiểm tra quyền truy cập Firebase
- Kiểm tra internet connection

### ESP32 Display

**LCD không hiển thị**:
- Quét I2C address bằng `i2c_scanner.ino`
- Kiểm tra kết nối SDA/SCL (GPIO 21/22)
- Kiểm tra nguồn 5V

**WiFi không kết nối**:
- Kiểm tra SSID và password
- Đảm bảo WiFi 2.4GHz (ESP32 không hỗ trợ 5GHz)
- Xem Serial Monitor để debug

**Firebase không kết nối**:
- Kiểm tra API_KEY, DATABASE_URL, DATABASE_SECRET
- Kiểm tra Realtime Database rules (cho phép read/write)
- Kiểm tra internet connection

**Loa không phát âm thanh**:
- Kiểm tra kết nối GPIO25 → IN+ của PAM8403
- Kiểm tra nguồn 5V cho PAM8403
- Kiểm tra Serial Monitor xem có log "Playing welcome sound..."

### Mobile App

**App không kết nối Firebase**:
- Kiểm tra `firebaseConfig.js`
- Kiểm tra Firebase Authentication đã bật chưa
- Kiểm tra Realtime Database rules

**Dữ liệu không hiển thị**:
- Kiểm tra path trong Firebase: `/product_counts/latest`
- Kiểm tra format dữ liệu đúng không:
  ```json
  {
    "timestamp": "2024-01-01 12:00:00",
    "products": {
      "black_tea": 5,
      "noni_tea": 3
    },
    "total": 8
  }
  ```

---

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Python 3.8+**: Ngôn ngữ chính cho AI detection
- **YOLOv11 (Ultralytics)**: Model nhận diện đối tượng
- **OpenCV**: Xử lý hình ảnh và camera
- **Firebase Admin SDK**: Kết nối Firebase từ Python

### Embedded
- **ESP32**: Microcontroller chính
- **Arduino Framework**: Framework lập trình
- **LiquidCrystal_I2C**: Thư viện điều khiển LCD
- **Firebase ESP32 Client**: Thư viện kết nối Firebase

### Mobile
- **React Native**: Framework mobile app
- **Expo**: Development platform
- **Firebase SDK**: Kết nối Firebase từ mobile
- **React Navigation**: Điều hướng màn hình
- **React Native Paper**: UI components

### Cloud
- **Firebase Realtime Database**: Database thời gian thực
- **Firestore**: NoSQL database (backup)
- **Firebase Authentication**: Xác thực người dùng

---

## 👤 Tác Giả

**Graduation Project** - Hệ thống quản lý kệ hàng thông minh

---

## 📄 License

ISC License

---

## 🙏 Acknowledgments

- [Ultralytics YOLO](https://github.com/ultralytics/ultralytics) - YOLOv11 model
- [Firebase](https://firebase.google.com/) - Backend services
- [ESP32](https://www.espressif.com/) - Hardware platform
- [React Native](https://reactnative.dev/) - Mobile framework

---

**Chúc bạn thành công với dự án! 🎉**

