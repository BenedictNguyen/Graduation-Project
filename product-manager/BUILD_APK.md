# 📱 Hướng Dẫn Build APK - Product AI App

Hướng dẫn chi tiết để xuất file APK của ứng dụng Product AI với đầy đủ tính năng.

## 📋 Yêu Cầu

### 1. Cài Đặt Node.js và npm
- Node.js >= 18.x
- npm >= 9.x

### 2. Cài Đặt Expo CLI và EAS CLI
```bash
npm install -g expo-cli eas-cli
```

### 3. Tài Khoản Expo
- Đăng ký tài khoản miễn phí tại: https://expo.dev
- Đăng nhập vào Expo CLI:
```bash
npx expo login
```

### 4. Cài Đặt Dependencies
```bash
cd product-manager
npm install
```

---

## 🚀 Các Cách Build APK

### Cách 1: Build APK với EAS Build (Khuyến Nghị) ⭐

**Ưu điểm:**
- Build trên cloud, không cần Android Studio
- Tự động xử lý signing
- Hỗ trợ build cho nhiều platform
- File APK tối ưu và sẵn sàng phân phối

#### Bước 1: Đăng nhập EAS
```bash
cd product-manager
eas login
```

#### Bước 2: Cấu hình EAS (nếu chưa có)
```bash
eas build:configure
```

#### Bước 3: Build APK Preview (Để test)
```bash
eas build --platform android --profile preview
```

#### Bước 4: Build APK Production (Để phân phối)
```bash
eas build --platform android --profile production
```

#### Bước 5: Tải APK về
- Build sẽ chạy trên cloud (mất khoảng 10-20 phút)
- Sau khi hoàn thành, bạn sẽ nhận được link tải APK
- Hoặc xem tại: https://expo.dev/accounts/[your-account]/builds

**Lưu ý:** Lần đầu build có thể mất thời gian hơn vì cần setup môi trường.

---

### Cách 2: Build APK Local (Cần Android Studio)

**Yêu cầu:**
- Android Studio đã cài đặt
- Android SDK đã cấu hình
- Java JDK 11+

#### Bước 1: Tạo keystore (chỉ lần đầu)
```bash
cd product-manager/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### Bước 2: Cấu hình keystore
Tạo file `android/keystore.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-store-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

#### Bước 3: Prebuild
```bash
cd product-manager
npx expo prebuild
```

#### Bước 4: Build APK
```bash
cd android
./gradlew assembleRelease
```

APK sẽ được tạo tại: `android/app/build/outputs/apk/release/app-release.apk`

---

### Cách 3: Build APK với Expo Build (Legacy - Không khuyến nghị)

**Lưu ý:** Expo Build đã bị deprecated, nên dùng EAS Build.

```bash
expo build:android -t apk
```

---

## 📦 Các Profile Build

File `eas.json` đã được cấu hình với 3 profiles:

### 1. Development
- Build với development client
- Dùng để debug
```bash
eas build --platform android --profile development
```

### 2. Preview (Khuyến nghị cho test)
- APK để test nội bộ
- Không cần signing phức tạp
```bash
eas build --platform android --profile preview
```

### 3. Production
- APK để phân phối chính thức
- Tự động tăng version
- Đã được sign
```bash
eas build --platform android --profile production
```

---

## 🔧 Cấu Hình Bổ Sung

### Thay Đổi Package Name

Nếu muốn đổi package name, sửa trong `app.json`:
```json
"android": {
  "package": "com.yourcompany.productai"
}
```

### Thay Đổi App Name

Sửa trong `app.json`:
```json
"expo": {
  "name": "Tên App Mới"
}
```

### Thay Đổi Version

Sửa trong `app.json`:
```json
"expo": {
  "version": "1.0.1"
}
```

### Thêm Icon và Splash Screen

- Icon: `assets/icon.png` (1024x1024px)
- Adaptive Icon: `assets/adaptive-icon.png` (1024x1024px)
- Splash: `assets/splash-icon.png` (1284x2778px)

---

## ✅ Kiểm Tra APK

### 1. Cài Đặt APK trên Thiết Bị

**Cách 1: Qua USB**
```bash
adb install path/to/app.apk
```

**Cách 2: Qua File Manager**
- Copy APK vào điện thoại
- Mở File Manager
- Tap vào file APK để cài đặt
- Cho phép "Install from unknown sources" nếu được hỏi

### 2. Test Tính Năng

Sau khi cài đặt, kiểm tra các tính năng:

- ✅ **Đăng nhập/Đăng ký**: Firebase Authentication
- ✅ **Màn hình chính**: Hiển thị thống kê sản phẩm realtime
- ✅ **Màn hình sản phẩm**: Biểu đồ, lịch sử, điều khiển LCD
- ✅ **Màn hình profile**: Thông tin user, cài đặt
- ✅ **Notifications**: Thông báo khi có thay đổi
- ✅ **Image Picker**: Chọn ảnh avatar (nếu có)

### 3. Kiểm Tra Kết Nối Firebase

- Đảm bảo app có thể kết nối Firebase
- Kiểm tra Realtime Database và Firestore
- Test authentication flow

---

## 🐛 Troubleshooting

### Lỗi: "EAS Build failed"

**Nguyên nhân:**
- Thiếu dependencies
- Lỗi cấu hình
- Lỗi code

**Giải pháp:**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install

# Kiểm tra lỗi
npx expo-doctor
```

### Lỗi: "Keystore not found"

**Giải pháp:**
- Đảm bảo đã tạo keystore (nếu build local)
- Hoặc dùng EAS Build (tự động xử lý)

### Lỗi: "Package name already exists"

**Giải pháp:**
- Đổi package name trong `app.json`
- Hoặc xóa app cũ trên thiết bị

### APK không cài được

**Nguyên nhân:**
- APK chưa được sign
- Package name conflict
- Thiếu permissions

**Giải pháp:**
- Dùng EAS Build (tự động sign)
- Kiểm tra package name
- Kiểm tra permissions trong `app.json`

### App crash khi mở

**Nguyên nhân:**
- Thiếu Firebase config
- Lỗi kết nối mạng
- Lỗi code

**Giải pháp:**
- Kiểm tra `firebaseConfig.js`
- Kiểm tra internet connection
- Xem log: `adb logcat | grep ReactNativeJS`

---

## 📊 Kích Thước APK

- **Development**: ~50-80 MB
- **Preview**: ~30-50 MB
- **Production**: ~25-40 MB (đã được tối ưu)

---

## 🔐 Bảo Mật

### Firebase Credentials

⚠️ **QUAN TRỌNG**: Firebase config đã được hardcode trong `firebaseConfig.js`. 

**Cho production:**
- Nên dùng environment variables
- Hoặc Firebase App Check để bảo vệ API
- Giới hạn API keys trong Firebase Console

### APK Signing

- EAS Build tự động sign APK
- Keystore được lưu an toàn trên Expo servers
- Không cần lo về signing khi dùng EAS

---

## 📝 Checklist Trước Khi Build

- [ ] Đã cài đặt tất cả dependencies (`npm install`)
- [ ] Đã kiểm tra Firebase config
- [ ] Đã test app trên Expo Go
- [ ] Đã cập nhật version trong `app.json`
- [ ] Đã kiểm tra icon và splash screen
- [ ] Đã đăng nhập EAS (`eas login`)
- [ ] Đã có kết nối internet ổn định

---

## 🎯 Kết Quả

Sau khi build thành công, bạn sẽ có:

1. **File APK** - Sẵn sàng cài đặt trên Android
2. **Link tải APK** - Chia sẻ với người khác
3. **Build logs** - Để debug nếu cần

---

## 📚 Tài Liệu Tham Khảo

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Android Build Guide](https://docs.expo.dev/build/android/)
- [React Native APK Guide](https://reactnative.dev/docs/signed-apk-android)

---

**Chúc bạn build thành công! 🎉**

