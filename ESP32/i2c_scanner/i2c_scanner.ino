#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define LCD_ADDR 0x27   // Đổi thành 0x3F nếu không chạy

LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

void setup() {
  Serial.begin(9600);

  // ESP32 sử dụng SDA = 21, SCL = 22
  Wire.begin(21, 22);

  Serial.println("Dang khoi tao LCD...");

  lcd.init();         // KHÔNG phải lcd.begin() với ESP32!
  lcd.backlight();    // bật đèn nền
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("LCD TEST OK!");

  lcd.setCursor(0, 1);
  lcd.print("ESP32 connected");

  Serial.println("LCD da khoi tao xong.");
}

void loop() {

}
