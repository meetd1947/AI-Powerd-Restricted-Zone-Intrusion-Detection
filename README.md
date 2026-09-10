 🏟️ Stadium Monitoring

 AI-Powered Restricted-Zone Security Monitoring for Cricket Stadiums

Stadium Monitoring is a real-time computer-vision-based security system designed to detect unauthorized people entering restricted areas inside cricket stadiums.

The system uses a live camera feed to detect and track people, identify authorized personnel, monitor restricted zones, and generate security incidents when an unknown or unverified person remains inside a restricted area.

---

 🚨 Problem Statement

Cricket stadiums contain several restricted areas such as:

- Player areas
- Pitch surroundings
- Equipment zones
- Service entrances
- VIP/restricted access areas

Unauthorized entry into these areas can create serious safety and security risks.

Traditional CCTV systems require security personnel to continuously monitor multiple camera feeds manually.

**Stadium Monitoring transforms CCTV footage into an intelligent security-response system by automatically detecting and validating restricted-zone intrusions.**

---

 💡 Solution

Stadium Monitoring combines:

- 👤 Real-time person detection
- 🎯 Person tracking
- 📍 Restricted-zone polygon calibration
- 🙂 Face recognition for authorized personnel
- 😷 Masked/occluded person handling
- 🛡️ False-alert mitigation
- ⏱️ Persistence and dwell-time validation
- 🚨 Intrusion alarms
- 📸 Evidence snapshot capture
- 📋 Incident management
- ☁️ Firebase synchronization
- 📊 Security analytics

The system processes security events in real time and converts them into actionable incidents for security personnel.

---

 🔄 System Workflow

```text
Live Camera
     │
     ▼
Person Detection
     │
     ▼
Person Tracking
     │
     ▼
Restricted Zone Check
     │
     ▼
Person Enters Restricted Zone
     │
     ▼
Face Detection / Recognition
     │
     ├───────────────┐
     ▼               ▼
AUTHORIZED      UNKNOWN / UNVERIFIED
     │               │
     │               ▼
     │        Temporal Validation
     │        Persistence + Dwell
     │               │
     │               ▼
     │        Confirmed Intrusion
     │               │
     │        ┌──────┴──────┐
     │        ▼             ▼
     │      Alarm       Evidence Snapshot
     │                      │
     │                      ▼
     │                 Incident Record
     │                      │
     └──────────────────────┴──────► Firebase
