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

// LCD Configuration
#define LCD1_ADDRESS   0x27  // Địa chỉ I2C LCD 1 (0x27 hoặc 0x3F)
#define LCD2_ADDRESS   0x26  // Địa chỉ I2C LCD 2 (0x26 hoặc 0x3F - tùy cách nối A0/A1/A2)
#define LCD_COLUMNS    16
#define LCD_ROWS       2

// Products Storage (tối đa 10 loại sản phẩm)
#define MAX_PRODUCTS 10

// Display Settings
#define SCREEN_INTERVAL    3000   // Thời gian hiển thị mỗi màn hình (ms)
#define SCROLL_DELAY       200    // Delay khi scroll text (ms)
#define BACKLIGHT_TIMEOUT  60000  // Tắt backlight sau 1 phút không hoạt động (ms)

// Optional: Button Control (nếu có nút bấm)
// #define BUTTON_PIN 2  // Uncomment nếu dùng nút bấm

// Speaker/Buzzer Configuration (sử dụng PWM)
#define BUZZER_PIN 25        // GPIO pin bất kỳ (khuyến nghị: 25, 26, 27, 14, 12...)
#define PWM_RESOLUTION 8      // Độ phân giải PWM (8-bit = 0-255)
#define PWM_FREQ_BASE 5000    // Tần số PWM cơ bản (Hz)

// Flag để chỉ phát âm thanh chào mừng 1 lần khi khởi động
bool welcomeSoundPlayed = false;

LiquidCrystal_I2C lcd1(LCD1_ADDRESS, LCD_COLUMNS, LCD_ROWS);
LiquidCrystal_I2C lcd2(LCD2_ADDRESS, LCD_COLUMNS, LCD_ROWS);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Timing
unsigned long lastUpdate = 0;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastLcdControlRead = 0;  // Thời gian đọc LCD control lần cuối
unsigned long lastActivity = 0;
unsigned long lastScrollTime = 0;

// Screen Management
int currentScreen = 0;
int totalScreens = 4;  // Sẽ được tính động dựa trên số sản phẩm
int scrollPosition[MAX_PRODUCTS] = {0};  // Vị trí scroll cho từng sản phẩm
bool isScrolling = false;
int currentProductIndex = -1;  // Sản phẩm đang được scroll

// Dual LCD Management
int currentScreenLCD1 = 0;  // Màn hình hiện tại của LCD1 (màn hình chẵn)
int currentScreenLCD2 = 1;  // Màn hình hiện tại của LCD2 (màn hình lẻ)
bool isLCD1Scrolling = false;
bool isLCD2Scrolling = false;

// System Status
bool systemOnline = false;
bool wifiConnected = false;
int totalProduct = 0;
int typeCount = 0;
String lastTimestamp = "";
String lcdMode = "auto";
String customLine1 = "";
String customLine2 = "";
String lastLcdCommandId = "";
bool pendingLcdRefresh = true;

// Products Storage (tối đa 10 loại sản phẩm)
String productNames[MAX_PRODUCTS];
int productCounts[MAX_PRODUCTS];
int productCount = 0;  // Số lượng sản phẩm thực tế

// Error Tracking
int errorCount = 0;
String lastError = "";

// ================== HÀM KHAI BÁO ==================
void connectWiFi();
void setupFirebase();
bool readDataFromFirebase();
void readLcdControlFromFirebase();  // Đọc LCD control độc lập
void showScreen();
void showScreenOnLCD(LiquidCrystal_I2C &lcd, int screenNum);
String getTimeString();
void scrollText(LiquidCrystal_I2C &lcd, String text, int row, int maxLen);
void showError(String error);
void showErrorOnLCD(LiquidCrystal_I2C &lcd, String error);
void updateBacklight();
void checkButton();  // Optional
int calculateTotalScreens();
String truncateText(String text, int maxLen);
void showCustomMessageOnLCD(LiquidCrystal_I2C &lcd, String line1, String line2);
void resetScrollingState();
void playWelcomeSound();  // Phát âm thanh chào mừng
void playWelcomeToSmartShelf();  // Phát âm thanh "Welcome to smart shelf" khi WiFi kết nối
void playTone(int frequency, int duration);  // Phát một nốt nhạc

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  delay(100);
  
  Serial.println("\n\n=================================");
  Serial.println("Smart Shelf - ESP32 LCD Display");
  Serial.println("=================================\n");
  
  // Initialize LCD 1
  lcd1.init();
  lcd1.backlight();
  lcd1.clear();
  lcd1.setCursor(0, 0);
  lcd1.print("Smart Shelf");
  lcd1.setCursor(0, 1);
  lcd1.print("LCD 1 Init...");
  
  // Initialize LCD 2
  lcd2.init();
  lcd2.backlight();
  lcd2.clear();
  lcd2.setCursor(0, 0);
  lcd2.print("Smart Shelf");
  lcd2.setCursor(0, 1);
  lcd2.print("LCD 2 Init...");
  delay(1000);

  // Initialize button (optional)
  #ifdef BUTTON_PIN
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    Serial.println("✅ Button initialized");
  #endif

  // Initialize buzzer/speaker (PWM) - ESP32 Arduino Core 3.x API
  Serial.print("🔧 Initializing buzzer on GPIO");
  Serial.println(BUZZER_PIN);
  ledcAttach(BUZZER_PIN, PWM_FREQ_BASE, PWM_RESOLUTION);
  ledcWriteTone(BUZZER_PIN, 0);  // Tắt buzzer ban đầu
  delay(50);  // Đợi một chút để đảm bảo khởi tạo xong
  Serial.println("✅ Buzzer (PWM) initialized");
  
  // Test buzzer ngay sau khi khởi tạo
  Serial.println("🔊 Testing buzzer...");
  ledcWriteTone(BUZZER_PIN, 1000);  // Phát 1000Hz
  delay(100);
  ledcWriteTone(BUZZER_PIN, 0);
  Serial.println("✅ Buzzer test completed");

  // Connect WiFi
  connectWiFi();
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  // Setup Firebase
  setupFirebase();

  // NTP – giờ VN (GMT+7)
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  // Wait for time sync
  lcd1.clear();
  lcd1.setCursor(0, 0);
  lcd1.print("Syncing time...");
  lcd2.clear();
  lcd2.setCursor(0, 0);
  lcd2.print("Syncing time...");
  delay(2000);

  // Init state
  lastUpdate = millis();
  lastFirebaseUpdate = millis();
  lastLcdControlRead = millis();
  lastActivity = millis();
  lastScrollTime = millis();

  // Initialize scroll positions
  for (int i = 0; i < MAX_PRODUCTS; i++) {
    scrollPosition[i] = 0;
    productNames[i] = "";
    productCounts[i] = 0;
  }

  // First data fetch
  if (wifiConnected) {
    bool success = readDataFromFirebase();
    if (!success) {
      showError("FB init failed");
    }
  } else {
    showError("WiFi not connected");
  }

  // Initial screen display
  totalScreens = calculateTotalScreens();
  showScreen();

  Serial.println("✅ Setup completed");
}

// ================== LOOP ==================
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      // Just disconnected
      wifiConnected = false;
      showError("WiFi lost");
      Serial.println("⚠️  WiFi disconnected");
    }

    // Try reconnect every 10 seconds
    if (millis() - lastFirebaseUpdate > 10000) {
      lastFirebaseUpdate = millis();
      connectWiFi();
      if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        setupFirebase();
        showScreen();
        Serial.println("✅ WiFi reconnected");
        // Phát âm thanh "Welcome to smart shelf" khi reconnect
        playWelcomeToSmartShelf();
      }
    }
  } else {
    wifiConnected = true;
  }

  // Check button (optional - manual screen control)
  #ifdef BUTTON_PIN
    checkButton();
  #endif

  // Đọc LCD control từ Firebase (độc lập, không phụ thuộc vào products)
  // Đọc thường xuyên hơn để đảm bảo phản hồi nhanh với custom mode
  if (millis() - lastLcdControlRead > 1000) {  // Đọc mỗi 1 giây
    readLcdControlFromFirebase();
    lastLcdControlRead = millis();
  }

  bool shouldRefreshDisplay = false;

  // Update display
  if (millis() - lastUpdate > SCREEN_INTERVAL) {
    lastUpdate = millis();
    lastActivity = millis();

    // Read data from Firebase
    bool readSuccess = readDataFromFirebase();
    
    // Nếu đọc thành công hoặc có pending refresh, cần kiểm tra refresh
    if (readSuccess) {
      // Calculate total screens dynamically
      totalScreens = calculateTotalScreens();
      
      if (lcdMode == "auto") {
        // Auto-scroll to next screen (chỉ khi không đang scroll)
        if (!isScrolling) {
          // Chuyển màn hình cho cả 2 LCD luân phiên
          // LCD1: màn hình chẵn (0, 2, 4, 6...)
          // LCD2: màn hình lẻ (1, 3, 5, 7...)
          // Mỗi lần update, cả 2 LCD đều tăng lên 2
          currentScreenLCD1 = (currentScreenLCD1 + 2);
          if (currentScreenLCD1 >= totalScreens) {
            currentScreenLCD1 = 0;  // Reset về 0 nếu vượt quá
          }
          
          currentScreenLCD2 = (currentScreenLCD2 + 2);
          if (currentScreenLCD2 >= totalScreens) {
            currentScreenLCD2 = 1;  // Reset về 1 nếu vượt quá
          }
          
          shouldRefreshDisplay = true;
          Serial.print("🔄 Auto mode: LCD1=screen ");
          Serial.print(currentScreenLCD1);
          Serial.print(", LCD2=screen ");
          Serial.println(currentScreenLCD2);
        }
      } else if (lcdMode == "summary" || lcdMode == "top_products") {
        // Các mode cố định (summary, top_products) chỉ refresh khi có thay đổi dữ liệu
        // Không tự động chuyển màn hình
        shouldRefreshDisplay = true;
      } else if (lcdMode == "custom_message") {
        // Custom message mode đã được xử lý trong showScreen(), không cần refresh ở đây
        // Chỉ refresh khi có pendingLcdRefresh
      }
    }
  }

  // Kiểm tra pending refresh (quan trọng cho custom mode)
  if (pendingLcdRefresh) {
    shouldRefreshDisplay = true;
    Serial.println("🔄 Pending LCD refresh detected");
  }

  if (shouldRefreshDisplay) {
      showScreen();
    pendingLcdRefresh = false;
  }

  // Handle text scrolling for long product names
  if (isScrolling && currentProductIndex >= 0 && currentProductIndex < MAX_PRODUCTS) {
    if (millis() - lastScrollTime > SCROLL_DELAY) {
      lastScrollTime = millis();
      
      // Tăng scroll position cho sản phẩm hiện tại
      String productName = productNames[currentProductIndex];
      int maxScroll = productName.length() - LCD_COLUMNS;
      
      scrollPosition[currentProductIndex]++;
      if (scrollPosition[currentProductIndex] > maxScroll) {
        scrollPosition[currentProductIndex] = 0;  // Reset về đầu
      }
      
      // Redraw screen để hiển thị text mới (chỉ redraw LCD đang scroll)
      if (productName.length() > LCD_COLUMNS) {
        // Nếu LCD1 đang scroll và đang hiển thị màn hình sản phẩm này
        if (isLCD1Scrolling && currentScreenLCD1 >= 4 && (currentScreenLCD1 - 4) == currentProductIndex) {
          showScreenOnLCD(lcd1, currentScreenLCD1);
        }
        
        // Nếu LCD2 đang scroll và đang hiển thị màn hình sản phẩm này
        if (isLCD2Scrolling && currentScreenLCD2 >= 4 && (currentScreenLCD2 - 4) == currentProductIndex) {
          showScreenOnLCD(lcd2, currentScreenLCD2);
        }
      }
    }
  }

  // Update backlight (auto-off after timeout)
  updateBacklight();
  
  // Small delay to prevent watchdog issues
  delay(10);
}

// ================== HÀM CON ==================

// Kết nối WiFi
void connectWiFi() {
  Serial.print("📶 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  lcd1.clear();
  lcd1.setCursor(0, 0);
  lcd1.print("Connecting WiFi");
  lcd1.setCursor(0, 1);
  lcd1.print(WIFI_SSID);

  lcd2.clear();
  lcd2.setCursor(0, 0);
  lcd2.print("Please wait...");

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ WiFi connected: ");
  Serial.println(WiFi.localIP());

    lcd1.clear();
    lcd1.setCursor(0, 0);
    lcd1.print("WiFi Connected");
    lcd1.setCursor(0, 1);
    lcd1.print(WiFi.localIP().toString());

    lcd2.clear();
    lcd2.setCursor(0, 0);
    lcd2.print("Smart Shelf Ready");

    // Phát âm thanh "Welcome to smart shelf" khi WiFi kết nối thành công
    playWelcomeToSmartShelf();
    
    // Phát âm thanh chào mừng (chỉ khi khởi động lần đầu)
    if (!welcomeSoundPlayed) {
      playWelcomeSound();
      welcomeSoundPlayed = true;
    }
  } else {
    Serial.println("❌ WiFi connection failed");
    lcd1.clear();
    lcd1.setCursor(0, 0);
    lcd1.print("WiFi Failed");
    lcd1.setCursor(0, 1);
    lcd1.print("Check router");
    
    lcd2.clear();
    lcd2.setCursor(0, 0);
    lcd2.print("No WiFi");
    lcd2.setCursor(0, 1);
    lcd2.print("Offline mode");
  }
}

// Setup Firebase
void setupFirebase() {
  Serial.println("🔥 Initializing Firebase...");
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.token.uid = "esp32_lcd_client";
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  // Version thư viện của bạn: begin() trả về void, KHÔNG phải bool
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase initialized with legacy token");
}

// Đọc dữ liệu từ Firebase
bool readDataFromFirebase() {
  Serial.println("📥 Reading data from Firebase...");
  
  // Đọc total
  if (!Firebase.RTDB.getInt(&fbdo, "/product_counts/latest/total")) {
    Serial.print("❌ Read total error: ");
    Serial.println(fbdo.errorReason());
    lastError = fbdo.errorReason();
    systemOnline = false;
    return false;
  }
  totalProduct = fbdo.intData();

  // Đọc products JSON
  if (!Firebase.RTDB.getJSON(&fbdo, "/product_counts/latest/products")) {
    Serial.print("❌ Read products error: ");
    Serial.println(fbdo.errorReason());
    lastError = fbdo.errorReason();
    systemOnline = false;
    return false;
  }

  // Parse products JSON và lưu vào array
  FirebaseJson products = fbdo.to<FirebaseJson>();
  FirebaseJsonData jsonData;
  
  // Reset product array
  productCount = 0;
  for (int i = 0; i < MAX_PRODUCTS; i++) {
    productNames[i] = "";
    productCounts[i] = 0;
  }

  // Dùng iterator để duyệt tất cả key-value trong JSON
  size_t len = products.iteratorBegin();
  typeCount = (int)len;
  
  int index = 0;
  String key, value;
  int type = 0;
  
  for (size_t i = 0; i < len; i++) {
    products.iteratorGet(i, type, key, value);
    
    if (type == FirebaseJson::JSON_OBJECT || type == FirebaseJson::JSON_STRING) {
      // Parse value (có thể là string hoặc number)
      int count = value.toInt();
      
      if (index < MAX_PRODUCTS && count > 0) {  // Chỉ lưu sản phẩm có số lượng > 0
        productNames[index] = key;
        productCounts[index] = count;
        index++;
      }
    }
  }
  
  productCount = index;  // Số lượng sản phẩm thực tế (có số lượng > 0)
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
        Serial.println("⚠️  Python app stopped - no timestamp update");
      }
    }
  } else {
    systemOnline = false;
  }

  // Debug output
  Serial.print("📊 Total = ");
  Serial.print(totalProduct);
  Serial.print(" | Types = ");
  Serial.print(typeCount);
  Serial.print(" | Active = ");
  Serial.print(productCount);
  Serial.print(" | Status = ");
  Serial.println(systemOnline ? "ONLINE" : "OFFLINE");
  
  if (productCount > 0) {
    Serial.print("   Products: ");
    for (int i = 0; i < productCount; i++) {
      Serial.print(productNames[i]);
      Serial.print("(");
      Serial.print(productCounts[i]);
      Serial.print(") ");
    }
    Serial.println();
  }

  return true;
}

// Đọc cấu hình điều khiển LCD từ Firebase (độc lập với readDataFromFirebase)
void readLcdControlFromFirebase() {
  // Đọc cấu hình điều khiển LCD (nếu có)
  if (Firebase.RTDB.getJSON(&fbdo, "/lcd_control")) {
    FirebaseJson controlJson = fbdo.to<FirebaseJson>();
    FirebaseJsonData controlField;
    
    String newMode = lcdMode;
    String newLine1 = customLine1;
    String newLine2 = customLine2;
    String newCommandId = lastLcdCommandId;
    
    if (controlJson.get(controlField, "mode") && controlField.typeNum == FirebaseJson::JSON_STRING) {
      newMode = controlField.stringValue;
      Serial.print("📱 Read mode from Firebase: ");
      Serial.println(newMode);
    }
    
    if (controlJson.get(controlField, "customLine1") && controlField.typeNum == FirebaseJson::JSON_STRING) {
      newLine1 = controlField.stringValue;
      Serial.print("📱 Read customLine1: ");
      Serial.println(newLine1);
    }
    
    if (controlJson.get(controlField, "customLine2") && controlField.typeNum == FirebaseJson::JSON_STRING) {
      newLine2 = controlField.stringValue;
      Serial.print("📱 Read customLine2: ");
      Serial.println(newLine2);
    }
    
    if (controlJson.get(controlField, "commandId") && controlField.typeNum == FirebaseJson::JSON_STRING) {
      newCommandId = controlField.stringValue;
    }
    
    if (newMode.length() == 0) {
      newMode = "auto";
    }
    
    if (newCommandId.length() == 0) {
      newCommandId = "default";
    }
    
    bool commandChanged = (
      newMode != lcdMode ||
      newLine1 != customLine1 ||
      newLine2 != customLine2 ||
      newCommandId != lastLcdCommandId
    );
    
    lcdMode = newMode;
    customLine1 = newLine1;
    customLine2 = newLine2;
    lastLcdCommandId = newCommandId;
    
    if (commandChanged) {
      pendingLcdRefresh = true;
      Serial.print("🎛 LCD control updated - mode: ");
      Serial.print(lcdMode);
      Serial.print(" | Line1: ");
      Serial.print(customLine1);
      Serial.print(" | Line2: ");
      Serial.println(customLine2);
    }
  } else {
    // Không báo lỗi nếu không có dữ liệu (có thể là lần đầu chưa có)
    if (fbdo.errorReason() != "path not exist") {
      Serial.print("⚠️ Failed to read /lcd_control: ");
      Serial.println(fbdo.errorReason());
    }
  }
}

// Tính tổng số màn hình cần hiển thị
int calculateTotalScreens() {
  // Các màn hình cố định:
  // 0: Tổng sản phẩm
  // 1: Số loại sản phẩm
  // 2: Trạng thái hệ thống
  // 3: Thời gian cập nhật
  int baseScreens = 4;
  
  // Các màn hình sản phẩm bắt đầu từ index 4
  int productScreens = productCount;  // Mỗi sản phẩm 1 màn hình
  
  int total = baseScreens + productScreens;
  
  // Đảm bảo luôn có ít nhất 4 màn
  if (total < 4) total = 4;
  
  return total;
}

// Hiển thị cả 2 LCD theo mode hiện tại
void showScreen() {
  Serial.print("🖥 Updating LCD screens (mode: ");
  Serial.print(lcdMode);
  if (lcdMode == "custom_message") {
    Serial.print(" | Line1: ");
    Serial.print(customLine1);
    Serial.print(" | Line2: ");
    Serial.print(customLine2);
  }
  Serial.println(")");
  
  if (lcdMode == "custom_message") {
    Serial.println("✅ Custom message mode detected - updating LCDs");
    resetScrollingState();
    showCustomMessageOnLCD(lcd1, customLine1, customLine2);
    showCustomMessageOnLCD(lcd2, customLine1, customLine2);
    Serial.println("✅ Custom message displayed on both LCDs");
    return;
  }
  
  if (lcdMode == "summary") {
    resetScrollingState();
    currentScreenLCD1 = 0;  // LCD1: Tổng sản phẩm
    currentScreenLCD2 = 2;  // LCD2: Trạng thái (theo mô tả: "LCD1: Tổng sản phẩm • LCD2: Trạng thái")
    showScreenOnLCD(lcd1, currentScreenLCD1);
    showScreenOnLCD(lcd2, currentScreenLCD2);
    Serial.println("✅ Summary mode: LCD1=Total, LCD2=Status");
    return;
  }
  
  if (lcdMode == "top_products") {
    resetScrollingState();
    if (productCount == 0) {
      // Không có sản phẩm, hiển thị tổng quan
      currentScreenLCD1 = 0;  // Tổng sản phẩm
      currentScreenLCD2 = 2;  // Trạng thái
      Serial.println("⚠️ Top products mode: No products, showing summary");
    } else {
      // Tìm sản phẩm có số lượng cao nhất (top 1)
      int top1Index = 0;
      for (int i = 1; i < productCount; i++) {
        if (productCounts[i] > productCounts[top1Index]) {
          top1Index = i;
        }
      }
      
      // Tìm sản phẩm có số lượng cao thứ 2 (top 2)
      int top2Index = -1;
      for (int i = 0; i < productCount; i++) {
        if (i == top1Index) continue;
        if (top2Index == -1 || productCounts[i] > productCounts[top2Index]) {
          top2Index = i;
        }
      }
      
      // LCD1: Top 1 sản phẩm
      currentScreenLCD1 = 4 + top1Index;
      
      // LCD2: Top 2 sản phẩm (nếu có), nếu không có thì hiển thị tổng quan
      if (top2Index >= 0) {
        currentScreenLCD2 = 4 + top2Index;
      } else {
        // Chỉ có 1 sản phẩm, LCD2 hiển thị tổng quan
        currentScreenLCD2 = 0;  // Tổng sản phẩm
      }
      
      Serial.print("✅ Top products mode: LCD1=product ");
      Serial.print(top1Index);
      Serial.print(" (");
      Serial.print(productNames[top1Index]);
      Serial.print("), LCD2=product ");
      if (top2Index >= 0) {
        Serial.print(top2Index);
        Serial.print(" (");
        Serial.print(productNames[top2Index]);
        Serial.println(")");
      } else {
        Serial.println("summary (only 1 product)");
      }
    }
    
    showScreenOnLCD(lcd1, currentScreenLCD1);
    showScreenOnLCD(lcd2, currentScreenLCD2);
    return;
  }
  
  // Hiển thị theo auto mode mặc định
  showScreenOnLCD(lcd1, currentScreenLCD1);
  showScreenOnLCD(lcd2, currentScreenLCD2);
}

// Hiển thị màn hình cụ thể trên LCD cụ thể
void showScreenOnLCD(LiquidCrystal_I2C &lcd, int screenNum) {
  lcd.clear();

  // Screen 0: Tổng sản phẩm
  if (screenNum == 0) {
      lcd.setCursor(0, 0);
      lcd.print("TONG SP:");
      lcd.setCursor(0, 1);
      lcd.print(totalProduct);
    lcd.print(" san pham");
  }

  // Screen 1: Số loại sản phẩm
  else if (screenNum == 1) {
      lcd.setCursor(0, 0);
      lcd.print("SO LOAI:");
      lcd.setCursor(0, 1);
      lcd.print(typeCount);
    lcd.print(" loai");
  }

  // Screen 2: Trạng thái hệ thống
  else if (screenNum == 2) {
      lcd.setCursor(0, 0);
      lcd.print("TRANG THAI:");
      lcd.setCursor(0, 1);
    if (!wifiConnected) {
        lcd.print("NO WIFI");
      } else if (systemOnline) {
        lcd.print("ONLINE");
      } else {
        lcd.print("OFFLINE");
      }
  }
  
  // Screen 3: Thời gian cập nhật cuối
  else if (screenNum == 3) {
    lcd.setCursor(0, 0);
    lcd.print("LAST UPDATE:");
    lcd.setCursor(0, 1);
    
    String displayTime = truncateText(lastTimestamp, LCD_COLUMNS);
    lcd.print(displayTime);
  }
  
  // Screen >= 4: Mỗi sản phẩm là 1 màn hình riêng
  else if (screenNum >= 4) {
    int productIndex = screenNum - 4;
    
    if (productIndex >= 0 && productIndex < productCount) {
      String productName = productNames[productIndex];
      int pCount = productCounts[productIndex];
      
      // Dòng 1: Tên sản phẩm (scroll nếu dài)
      lcd.setCursor(0, 0);
      
      if (productName.length() > LCD_COLUMNS) {
        // Lấy scroll position cho sản phẩm này
        int maxScroll = productName.length() - LCD_COLUMNS;
        int startPos = scrollPosition[productIndex] % (maxScroll + 1);
        String displayText = productName.substring(startPos, startPos + LCD_COLUMNS);
        lcd.print(displayText);
      } else {
        // Text ngắn, hiển thị bình thường
        bool isLCD1 = (screenNum == currentScreenLCD1);
        bool isLCD2 = (screenNum == currentScreenLCD2);
        
        if (isLCD1) {
          isLCD1Scrolling = false;
        } else if (isLCD2) {
          isLCD2Scrolling = false;
        }
        
        // Nếu cả 2 LCD đều không scroll, reset flag
        if (!isLCD1Scrolling && !isLCD2Scrolling) {
          isScrolling = false;
          currentProductIndex = -1;
        }
        
        lcd.print(truncateText(productName, LCD_COLUMNS));
      }
      
      // Dòng 2: Số lượng
      lcd.setCursor(0, 1);
      lcd.print("SL: ");
      lcd.print(pCount);
      lcd.print(" (");
      lcd.print(productIndex + 1);
      lcd.print("/");
      lcd.print(productCount);
      lcd.print(")");
      
      // Kiểm tra xem có cần scroll không
      if (productName.length() > LCD_COLUMNS) {
        // Xác định LCD nào đang hiển thị dựa trên screenNum
        bool isLCD1 = (screenNum == currentScreenLCD1);
        bool isLCD2 = (screenNum == currentScreenLCD2);
        
        if (isLCD1) {
          isLCD1Scrolling = true;
          isScrolling = true;
          currentProductIndex = productIndex;
        } else if (isLCD2) {
          isLCD2Scrolling = true;
          isScrolling = true;
          if (!isLCD1Scrolling) {
            currentProductIndex = productIndex;
          }
        }
      }
    } else {
      lcd.setCursor(0, 0);
      lcd.print("No product");
      lcd.setCursor(0, 1);
      lcd.print("data");
    }
  }
}

// Cắt text nếu quá dài & thêm "..."
String truncateText(String text, int maxLen) {
  if (text.length() <= maxLen) {
    return text;
  }
  return text.substring(0, maxLen - 3) + "...";
  }

void resetScrollingState() {
  isScrolling = false;
  isLCD1Scrolling = false;
  isLCD2Scrolling = false;
  currentProductIndex = -1;
}

void showCustomMessageOnLCD(LiquidCrystal_I2C &lcd, String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  // Nếu line1 rỗng thì để trống, không chèn giá trị mặc định
  if (line1.length() > 0) {
    String safeLine1 = truncateText(line1, LCD_COLUMNS);
    lcd.print(safeLine1);
    Serial.print("📺 LCD Line1: \"");
    Serial.print(safeLine1);
    Serial.print("\"");
  } else {
    Serial.print("📺 LCD Line1: (empty)");
  }
  
  lcd.setCursor(0, 1);
  // Nếu line2 rỗng thì để trống, không chèn giá trị mặc định
  if (line2.length() > 0) {
    String safeLine2 = truncateText(line2, LCD_COLUMNS);
    lcd.print(safeLine2);
    Serial.print(" | Line2: \"");
    Serial.print(safeLine2);
    Serial.print("\"");
  } else {
    Serial.print(" | Line2: (empty)");
  }
  Serial.println();
}

// Scroll text trên LCD (deprecated - dùng trong showScreen thay thế)
void scrollText(LiquidCrystal_I2C &lcd, String text, int row, int maxLen) {
  if (text.length() <= maxLen) {
    lcd.setCursor(0, row);
    lcd.print(text);
    return;
  }
  
  // Scroll text nếu quá dài
  static int scrollPos = 0;
  int startPos = scrollPos % (text.length() - maxLen + 1);
  String displayText = text.substring(startPos, startPos + maxLen);
  
  lcd.setCursor(0, row);
  lcd.print(displayText);
  
  scrollPos++;
  if (scrollPos > text.length() - maxLen) {
    scrollPos = 0;
  }
}

// Hiển thị lỗi trên cả 2 LCD
void showError(String error) {
  showErrorOnLCD(lcd1, error);
  showErrorOnLCD(lcd2, error);
  
  Serial.print("❌ Error displayed: ");
  Serial.println(error);
}

// Hiển thị lỗi trên LCD cụ thể
void showErrorOnLCD(LiquidCrystal_I2C &lcd, String error) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ERROR:");
  
  lcd.setCursor(0, 1);
  String displayError = truncateText(error, LCD_COLUMNS);
  lcd.print(displayError);
}

// Cập nhật backlight dựa trên thời gian hoạt động
void updateBacklight() {
  if (millis() - lastActivity > BACKLIGHT_TIMEOUT) {
    lcd1.noBacklight();
    lcd2.noBacklight();
  } else {
    lcd1.backlight();
    lcd2.backlight();
  }
}

// Kiểm tra nút bấm để chuyển màn hình thủ công (optional)
void checkButton() {
  #ifdef BUTTON_PIN
    static int lastButtonState = HIGH;
    static unsigned long lastDebounceTime = 0;
    unsigned long debounceDelay = 50;
    
    int reading = digitalRead(BUTTON_PIN);
    
    // Debounce
    if (reading != lastButtonState) {
      lastDebounceTime = millis();
    }
    
    if ((millis() - lastDebounceTime) > debounceDelay) {
      // Nút chuyển từ HIGH -> LOW (nhấn)
      if (lastButtonState == HIGH && reading == LOW) {
        lastActivity = millis();
        
        // Tạm thời tắt scroll khi nhấn nút
        isScrolling = false;
        isLCD1Scrolling = false;
        isLCD2Scrolling = false;
        
        // Chuyển màn hình cho cả 2 LCD (giống như trong auto mode)
        totalScreens = calculateTotalScreens();
        currentScreenLCD1 = (currentScreenLCD1 + 2);
        if (currentScreenLCD1 >= totalScreens) {
          currentScreenLCD1 = 0;  // Reset về 0 nếu vượt quá
        }
        
        currentScreenLCD2 = (currentScreenLCD2 + 2);
        if (currentScreenLCD2 >= totalScreens) {
          currentScreenLCD2 = 1;  // Reset về 1 nếu vượt quá
        }
        
        currentProductIndex = -1;
        isScrolling = false;
        isLCD1Scrolling = false;
        isLCD2Scrolling = false;
        lastActivity = millis();
        showScreen();
        
        Serial.print("🔘 Button pressed - Screen1: ");
        Serial.print(currentScreenLCD1);
        Serial.print(" | Screen2: ");
        Serial.println(currentScreenLCD2);
      }
    }
    
    lastButtonState = reading;
  #endif
}

// ================== ÂM THANH CHÀO MỪNG ==================

// Định nghĩa các nốt nhạc (tần số Hz) - Dễ tùy chỉnh
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523
#define NOTE_D5  587
#define NOTE_E5  659
#define NOTE_F5  698
#define NOTE_G5  784
#define NOTE_A5  880
#define NOTE_B5  988
#define NOTE_C6  1047

// Phát âm thanh chào mừng (melody vui vẻ, thân thiện)
void playWelcomeSound() {
  Serial.println("🔊 Playing welcome sound...");
  
  // Melody chào mừng - Có thể tùy chỉnh theo ý thích
  // Melody hiện tại: C5-E5-G5-C6-G5-C6 (âm thanh vui vẻ, chào mừng)
  int melody[] = {
    NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6, NOTE_G5, NOTE_C6
  };
  int noteDurations[] = {
    200, 200, 200, 300, 200, 400  // Thời gian mỗi nốt (ms)
  };
  
  int numNotes = sizeof(melody) / sizeof(melody[0]);
  
  // Phát từng nốt nhạc
  for (int i = 0; i < numNotes; i++) {
    playTone(melody[i], noteDurations[i]);
    delay(30);  // Khoảng nghỉ ngắn giữa các nốt (ms)
  }
  
  // Tắt buzzer
  ledcWriteTone(BUZZER_PIN, 0);
  delay(10);
  
  Serial.println("✅ Welcome sound completed");
}

// Phát âm thanh "Welcome to smart shelf" khi WiFi kết nối
void playWelcomeToSmartShelf() {
  Serial.println("🔊 Playing 'Welcome to smart shelf' sound...");
  
  // Melody đơn giản, thân thiện cho "Welcome to smart shelf"
  // Sử dụng các nốt nhạc vui vẻ, chào mừng
  int melody[] = {
    NOTE_G4, NOTE_A4, NOTE_C5, NOTE_E5,  // "Wel-come"
    NOTE_G5, NOTE_E5, NOTE_C5,            // "to"
    NOTE_A4, NOTE_G4, NOTE_E4,           // "smart"
    NOTE_G4, NOTE_A4, NOTE_C5, NOTE_E5,  // "shelf"
    NOTE_C6                                // Kết thúc
  };
  int noteDurations[] = {
    150, 150, 150, 200,  // "Wel-come"
    200, 150, 200,       // "to"
    150, 150, 200,       // "smart"
    150, 150, 150, 250,  // "shelf"
    400                   // Kết thúc
  };
  
  int numNotes = sizeof(melody) / sizeof(melody[0]);
  
  // Phát từng nốt nhạc
  for (int i = 0; i < numNotes; i++) {
    playTone(melody[i], noteDurations[i]);
    delay(20);  // Khoảng nghỉ ngắn giữa các nốt (ms)
  }
  
  // Tắt buzzer
  ledcWriteTone(BUZZER_PIN, 0);
  delay(10);
  
  Serial.println("✅ 'Welcome to smart shelf' sound completed");
}

// Phát một nốt nhạc với tần số và thời gian cụ thể
void playTone(int frequency, int duration) {
  if (frequency <= 0 || duration <= 0) {
    Serial.print("⚠️ Invalid tone: freq=");
    Serial.print(frequency);
    Serial.print(", duration=");
    Serial.println(duration);
    return;
  }

  // Phát tần số bằng PWM
  ledcWriteTone(BUZZER_PIN, frequency);
  delay(duration);
  
  // Tắt buzzer
  ledcWriteTone(BUZZER_PIN, 0);
}
