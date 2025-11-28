#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin();   // SDA = 21, SCL = 22 mặc định trên ESP32

  delay(2000);
  Serial.println("🔍 Scanning I2C bus...");
}

void loop() {
  byte error, address;
  int count = 0;

  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("✔ Found I2C device at: 0x");
      Serial.println(address, HEX);
      count++;
    }
  }

  if (count == 0) {
    Serial.println("❌ No I2C devices found.");
  } else {
    Serial.print("🔎 Total devices found: ");
    Serial.println(count);
  }

  Serial.println("---------------------------");
  delay(2000); // quét lại mỗi 2 giây
}
