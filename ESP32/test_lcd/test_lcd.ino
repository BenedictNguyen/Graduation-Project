#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <LiquidCrystal_I2C.h>
#include "time.h"

// ================== CẤU HÌNH ==================
#define WIFI_SSID      "580"
#define WIFI_PASSWORD  "1234554321"

#define API_KEY        "AIzaSyDcEpz7y-UdceHfclowTnuMUQFkfh4Y1CQ"
#define DATABASE_URL   "https://graduationproject-8fc97-default-rtdb.firebaseio.com"
#define DATABASE_SECRET "P7dcZoA9G4s67OR65AwqNmZnmAaxtx2jTm3SmwrW"   // <--- DÁN SECRET VÀO ĐÂY

LiquidCrystal_I2C lcd(0x27, 16, 2);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastUpdate = 0;
int currentScreen = 0; // 0: Tổng SP, 1: Số loại, 2: Trạng thái, 3: Thời gian
unsigned long lastFirebaseUpdate = 0; // Thời gian cập nhật Firebase gần nhất
bool systemOnline = false; // Trạng thái hệ thống
int totalProduct = 0;
int typeCount   = 0;
String lastTimestamp = ""; // Timestamp từ Firebase

// ================== HÀM KHAI BÁO ==================
void connectWiFi();
void setupFirebase();
bool readDataFromFirebase();
void showScreen();
String getTimeString();

// ================== SETUP ==================
void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Shelf");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  connectWiFi();
  setupFirebase();

  // NTP – giờ VN
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Reading data...");
  delay(1500);
}

// ================== LOOP ==================
void loop() {
  if (millis() - lastUpdate > 3000) {   // 3 giây
    lastUpdate = millis();

    if (readDataFromFirebase()) {
      showScreen();
      currentScreen = (currentScreen + 1) % 4;
    } else {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Firebase ERR");
      lcd.setCursor(0, 1);
      String err = fbdo.errorReason();
      if (err.length() > 16) err = err.substring(0, 16);
      lcd.print(err);

      Serial.print("Firebase error: ");
      Serial.print(fbdo.errorCode());
      Serial.print(" - ");
      Serial.println(fbdo.errorReason());
    }
  }
}

// ================== HÀM CON ==================

// Kết nối WiFi
void connectWiFi() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
}

// Cấu hình Firebase + legacy token
void setupFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // CỰC QUAN TRỌNG: dùng database secret làm legacy token
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase initialized with legacy token");
}

// Đọc dữ liệu từ Firebase
bool readDataFromFirebase() {
  // Đọc total
  if (!Firebase.RTDB.getInt(&fbdo, "/product_counts/latest/total")) {
    Serial.print("Read total error: ");
    Serial.println(fbdo.errorReason());
    systemOnline = false;
    return false;
  }
  totalProduct = fbdo.intData();

  // Đọc products
  if (!Firebase.RTDB.getJSON(&fbdo, "/product_counts/latest/products")) {
    Serial.print("Read products error: ");
    Serial.println(fbdo.errorReason());
    systemOnline = false;
    return false;
  }

  FirebaseJson products = fbdo.to<FirebaseJson>();
  size_t len = products.iteratorBegin();
  typeCount = (int)len;
  products.iteratorEnd();

  // Đọc timestamp để kiểm tra trạng thái
  if (Firebase.RTDB.getString(&fbdo, "/product_counts/latest/timestamp")) {
    String newTimestamp = fbdo.stringData();
    
    // Kiểm tra xem timestamp có thay đổi không
    if (newTimestamp != lastTimestamp) {
      lastTimestamp = newTimestamp;
      lastFirebaseUpdate = millis();
      systemOnline = true;
      Serial.println("✅ Python app is running - timestamp updated");
    } else {
      // Nếu timestamp không đổi quá 5 giây = Python app đã tắt
      if (millis() - lastFirebaseUpdate > 5000) {
        systemOnline = false;
        Serial.println("⚠️ Python app stopped - no timestamp update");
      }
    }
    
    Serial.print("Timestamp: ");
    Serial.println(newTimestamp);
  }

  Serial.print("Total = ");
  Serial.print(totalProduct);
  Serial.print(" | Types = ");
  Serial.print(typeCount);
  Serial.print(" | Status = ");
  Serial.println(systemOnline ? "ONLINE" : "OFFLINE");

  return true;
}

// Hiển thị LCD từng màn hình
void showScreen() {
  lcd.clear();

  switch (currentScreen) {
    case 0:
      lcd.setCursor(0, 0);
      lcd.print("TONG SP:");
      lcd.setCursor(0, 1);
      lcd.print(totalProduct);
      break;

    case 1:
      lcd.setCursor(0, 0);
      lcd.print("SO LOAI:");
      lcd.setCursor(0, 1);
      lcd.print(typeCount);
      break;

    case 2:
      lcd.setCursor(0, 0);
      lcd.print("TRANG THAI:");
      lcd.setCursor(0, 1);
      if (!WiFi.isConnected()) {
        lcd.print("NO WIFI");
      } else if (systemOnline) {
        lcd.print("ONLINE");
      } else {
        lcd.print("OFFLINE");
      }
      break;

    case 3:
      lcd.setCursor(0, 0);
      lcd.print("THOI GIAN:");
      lcd.setCursor(0, 1);
      lcd.print(getTimeString());
      break;
  }
}

// Lấy thời gian dạng HH:MM:SS
String getTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "NO TIME";
  }
  char buf[9];
  strftime(buf, sizeof(buf), "%H:%M:%S", &timeinfo);
  return String(buf);
}
