# Drone Firmware

ESP32-based firmware for the delivery drone.

## Hardware Components
- ESP32-CAM (video streaming + WiFi)
- GPS Module (position tracking)
- Ultrasonic Sensors (obstacle detection)
- Storage Compartment (servo lock)
- Flight Controller

## Communication
- **MQTT Topics:**
  - `drone/{id}/telemetry` - Send position, battery, altitude
  - `drone/{id}/command` - Receive control commands
  - `drone/{id}/video` - Stream video frames
  - `drone/{id}/status` - Connection status

## Setup

1. Install PlatformIO or Arduino IDE
2. Configure WiFi credentials
3. Set MQTT broker details
4. Upload to ESP32

## Telemetry Data Format
```json
{
  "latitude": 51.4416,
  "longitude": 5.4697,
  "altitude": 25.5,
  "battery": 85,
  "speed": 12.3,
  "heading": 180
}
```

## Commands
| Command | Description |
|---------|-------------|
| `takeoff` | Start flight |
| `land` | Land drone |
| `move` | Move in direction |
| `hover` | Hold position |
| `return_home` | Return to base |
