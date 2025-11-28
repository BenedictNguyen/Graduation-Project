#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd1(0x27, 16, 2);
LiquidCrystal_I2C lcd2(0x26, 16, 2);

void setup() {
  Wire.begin(21, 22);

  lcd1.init();
  lcd2.init();

  lcd1.backlight();
  lcd2.backlight();

  lcd1.print("LCD 1 - OK");
  lcd2.print("LCD 2 - OK");
}

void loop() {}
