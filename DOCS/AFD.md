# StadiumSentinel — Architecture & Flow Diagram

## AI-Powered Cricket Stadium Restricted-Zone Intrusion Detection

**Document Type:** System Architecture & Flow Specification
**Project:** StadiumSentinel
**Frontend:** React + TypeScript + Tailwind CSS
**Computer Vision:** TensorFlow.js + COCO-SSD + OpenCV.js
**Rendering:** HTML5 Video + Canvas API
**Database / Cloud:** Firebase
**Build Environment:** Vite + npm

---

# 1. System Architecture Overview

StadiumSentinel is a browser-based stadium security monitoring system.

The system receives a CCTV/demo video stream, detects people using an AI model, tracks detected people between frames, calculates their centroids, checks those centroids against configured restricted polygon zones, confirms suspicious entry using temporal rules, and generates an intrusion incident.

The overall architecture is:

```text
                         STADIUMSENTINEL
                               │
                               ▼
                    ┌─────────────────────┐
                    │   CCTV / Video Feed │
                    │  Live or Demo Video │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Video Processing  │
                    │    HTML5 Video      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ TensorFlow.js Model │
                    │     COCO-SSD        │
                    │ Person Detection    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Tracking Layer     │
                    │ Person ID Tracking  │
                    │ Person #1, #2, ...  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Centroid Calculator │
                    │   Person Position   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Restricted Zone     │
                    │ Polygon Engine      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Temporal Validation │
                    │ Persistence / Dwell │
                    │ Confidence Checks   │
                    └──────────┬──────────┘
                               │
                         Intrusion?
                         /          \
                       NO            YES
                       │              │
                       ▼              ▼
                 Continue        ┌──────────────┐
                 Monitoring       │ Alert Engine │
                                 └──────┬───────┘
                                        │
                        ┌───────────────┼────────────────┐
                        │               │                │
                        ▼               ▼                ▼
                  Visual Siren      Snapshot       Incident
                  / Alert Banner     Capture        Creation
                        │               │                │
                        └───────────────┼────────────────┘
                                        │
                                        ▼
                              ┌────────────────────┐
                              │ Firebase           │
                              │ Firestore/Storage  │
                              └─────────┬──────────┘
                                        │
                                        ▼
                              ┌────────────────────┐
                              │ Incident Review    │
                              │ Security Dashboard │
                              └─────────┬──────────┘
                                        │
                                        ▼
                              ┌────────────────────┐
                              │ Acknowledge /      │
                              │ Resolve Incident   │
                              └────────────────────┘
```

---

# 2. High-Level Component Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        REACT APPLICATION                         │
│                                                                 │
│  ┌───────────────┐     ┌─────────────────────────────────────┐  │
│  │ Security UI   │     │         Monitoring Interface        │  │
│  │               │     │                                     │  │
│  │ Dashboard     │     │ Video                              │  │
│  │ Cameras       │     │ Canvas Overlay                     │  │
│  │ Zones         │     │ Detection Boxes                    │  │
│  │ Incidents     │     │ Tracking IDs                       │  │
│  │ Analytics     │     │ Centroids                          │  │
│  │ Settings      │     │ Restricted Polygons                │  │
│  └───────┬───────┘     └──────────────────┬──────────────────┘  │
│          │                                │                     │
│          └────────────────┬───────────────┘                     │
│                           ▼                                     │
│                 ┌─────────────────────┐                         │
│                 │ Application State   │                         │
│                 │ & Event Management  │                         │
│                 └──────────┬──────────┘                         │
└────────────────────────────┼────────────────────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              │                              │
              ▼                              ▼
┌─────────────────────────┐      ┌────────────────────────────┐
│ COMPUTER VISION LAYER   │      │ FIREBASE SERVICE LAYER     │
│                         │      │                            │
│ TensorFlow.js           │      │ Firebase Authentication     │
│ COCO-SSD                │      │ Firestore                  │
│ Tracking                │      │ Storage                    │
│ Centroid Calculation    │      │ Real-time Listeners        │
│ Polygon Detection       │      │                            │
│ Temporal Validation     │      │                            │
└─────────────────────────┘      └────────────────────────────┘
```

---

# 3. Complete Detection-to-Incident Flow

This is the most important system flow.

```text
START
  │
  ▼
Load Security Dashboard
  │
  ▼
Load Camera / Demo Video
  │
  ▼
Load COCO-SSD Model
  │
  ▼
Model Ready?
  │
  ├── NO ──► Show AI Model Loading State
  │              │
  │              └────► Retry / Wait
  │
  └── YES
       │
       ▼
Read Video Frame
       │
       ▼
Run Person Detection
       │
       ▼
Filter Objects
       │
       ▼
Keep Only "Person"
       │
       ▼
Apply Confidence Threshold
       │
       ▼
Tracking Layer
       │
       ▼
Assign / Maintain Person ID
       │
       ▼
Calculate Person Centroid
       │
       ▼
Check Centroid Against
Restricted Polygon
       │
       ├── OUTSIDE
       │      │
       │      ▼
       │  Continue Tracking
       │
       └── INSIDE
              │
              ▼
       Start Temporal Validation
              │
              ▼
       Persistence Frames Met?
              │
          ┌───┴───┐
          │       │
         NO      YES
          │       │
          ▼       ▼
      Continue   Check Dwell Time
      Monitoring      │
                      ▼
               Dwell Requirement Met?
                      │
                 ┌────┴────┐
                 │         │
                NO        YES
                 │         │
                 ▼         ▼
             Continue    CONFIRMED
                         INTRUSION
                             │
                             ▼
                      Prevent Duplicate
                         Incident
                             │
                             ▼
                       Create Incident
                             │
                ┌────────────┼─────────────┐
                │            │             │
                ▼            ▼             ▼
            Visual Siren  Snapshot     Timestamp
                │         Capture          │
                │            │             │
                └────────────┼─────────────┘
                             │
                             ▼
                    Save Incident Data
                             │
                             ▼
                         Firebase
                             │
                             ▼
                    Incident Review Feed
                             │
                             ▼
                    Security Personnel
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
               ACKNOWLEDGE         IGNORE/
                    │              INVESTIGATE
                    ▼
                RESOLVE
                    │
                    ▼
                  AUDIT
                    │
                    ▼
                   END
```

---

# 4. Real-Time Computer Vision Flow

```text
                  VIDEO FRAME
                       │
                       ▼
              ┌─────────────────┐
              │ HTML5 Video     │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Canvas Frame    │
              │ Processing      │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ COCO-SSD        │
              │ Object Detection│
              └────────┬────────┘
                       │
                       ▼
             Detection Results
                       │
                       ▼
              ┌─────────────────┐
              │ Person Filter   │
              └────────┬────────┘
                       │
                       ▼
              Confidence Filter
                       │
                       ▼
              ┌─────────────────┐
              │ Tracking Layer  │
              └────────┬────────┘
                       │
                       ▼
                Person IDs
              ┌────────┼────────┐
              ▼        ▼        ▼
           Person #1 Person #2 Person #3
              │        │        │
              └────────┼────────┘
                       ▼
              Centroid Calculation
                       │
                       ▼
               Zone Evaluation
```

---

# 5. Person Detection Architecture

COCO-SSD is responsible for object detection.

It should identify objects classified as:

```text
COCO-SSD
    │
    ▼
Detection Results
    │
    ├── Person       ◄── KEEP
    ├── Car          ◄── IGNORE
    ├── Chair        ◄── IGNORE
    ├── Backpack     ◄── IGNORE
    └── Other        ◄── IGNORE
```

Only detections classified as `person` should enter the intrusion detection pipeline.

Each valid detection should contain:

```text
Person Detection
│
├── Bounding Box
│   ├── x
│   ├── y
│   ├── width
│   └── height
│
├── Confidence
│
└── Frame Information
```

---

# 6. Tracking Architecture

COCO-SSD detects people independently in each frame.

The tracking layer maintains temporary identities between frames.

```text
Frame 1
│
├── Person detected
│      └── Person #1
│
▼
Frame 2
│
├── Person detected
│      └── Match with Person #1
│
▼
Frame 3
│
├── Person detected
│      └── Match with Person #1
│
▼
Frame 4
│
├── Person detected
│      └── Match with Person #1
│
▼
Person #1 continues moving
```

The system must NOT attempt facial recognition or determine the real identity of the person.

The ID is only a temporary tracking identifier.

Example:

```text
Person #17
Camera: CAM-01
Confidence: 94%
Centroid: (0.63, 0.48)
Zone: Player Dugout
State: CONFIRMED INTRUSION
```

---

# 7. Centroid Processing Flow

For every tracked person:

```text
Bounding Box
       │
       ▼
┌───────────────────┐
│ x, y              │
│ width, height     │
└─────────┬─────────┘
          │
          ▼
Calculate Center Point
          │
          ▼
      Centroid
          │
          ▼
Normalize Coordinates
          │
          ▼
     Zone Engine
```

The centroid is the primary point used for determining whether a person has entered a restricted area.

Conceptually:

```text
       Bounding Box
    ┌───────────────┐
    │               │
    │       ●       │
    │    Centroid   │
    │               │
    └───────────────┘
```

---

# 8. Restricted Zone Architecture

Zones are represented as polygons.

```text
Camera View
┌──────────────────────────────────────────┐
│                                          │
│            Stadium Pitch                │
│                                          │
│        ┌─────────────────────┐           │
│        │                     │           │
│        │   RESTRICTED ZONE   │           │
│        │                     │           │
│        └─────────────────────┘           │
│                                          │
│                    ● Person              │
│                                          │
└──────────────────────────────────────────┘
```

A zone contains:

```text
Zone
│
├── ID
├── Name
├── Camera ID
├── Polygon Points
├── Severity
├── Confidence Threshold
├── Persistence Frames
├── Minimum Dwell Time
└── Active / Disabled
```

---

# 9. Polygon Calibration Flow

```text
Open Zone Calibration
        │
        ▼
Select Camera
        │
        ▼
Display Video Frame
        │
        ▼
User Selects "Draw Zone"
        │
        ▼
User Clicks Polygon Points
        │
        ▼
Point 1
  │
  ▼
Point 2
  │
  ▼
Point 3
  │
  ▼
Point N
  │
  ▼
Close Polygon
        │
        ▼
Configure Zone
        │
        ├── Zone Name
        ├── Zone Type
        ├── Severity
        ├── Confidence
        ├── Persistence Frames
        └── Dwell Time
        │
        ▼
Validate Polygon
        │
        ▼
Save Zone
        │
        ▼
Firebase Firestore
        │
        ▼
Zone Available to
Live Monitoring
```

---

# 10. Coordinate System Architecture

The system must use normalized coordinates for zones.

Instead of storing:

```text
x = 742 pixels
y = 391 pixels
```

store:

```text
x = 0.63
y = 0.48
```

This allows the zone to remain correctly positioned when the video size changes.

```text
Original Video
1920 × 1080
       │
       ▼
Normalize
       │
       ▼
0.0 ─────────────── 1.0
│                    │
│       Polygon      │
│                    │
0.0 ─────────────── 1.0
       │
       ▼
Render at any
screen resolution
```

---

# 11. Zone Membership Flow

```text
Tracked Person
      │
      ▼
Calculate Centroid
      │
      ▼
Normalize Centroid
      │
      ▼
Load Active Zone Polygons
      │
      ▼
Point-In-Polygon Test
      │
      ├───────────────┐
      │               │
      ▼               ▼
Outside             Inside
      │               │
      ▼               ▼
Normal State       Entering State
                      │
                      ▼
              Temporal Validation
```

The system should use the **centroid** as the primary zone membership point.

Bounding-box overlap alone should not trigger an intrusion.

---

# 12. False Alert Mitigation Architecture

False-alert mitigation is a major scoring area.

The decision should NOT be:

```text
Person detected inside polygon
            ↓
         ALERT
```

Instead:

```text
Person Detected
      │
      ▼
Confidence Check
      │
      ▼
Tracking Stability
      │
      ▼
Centroid Inside Zone?
      │
      ▼
Persistence Frames
      │
      ▼
Minimum Dwell Time
      │
      ▼
Duplicate Incident Check
      │
      ▼
CONFIRMED INTRUSION
```

This reduces accidental alerts caused by:

* Detection flickering
* Temporary model errors
* People near zone boundaries
* Single-frame detections
* Bounding-box movement
* Camera noise

---

# 13. Intrusion State Machine

Each tracked person should have an intrusion state.

```text
                 ┌───────────┐
                 │  OUTSIDE  │
                 └─────┬─────┘
                       │
                 Centroid enters
                       │
                       ▼
                 ┌───────────┐
                 │  ENTERING │
                 └─────┬─────┘
                       │
             Persistence + dwell
                       │
                       ▼
                ┌─────────────┐
                │  CONFIRMED  │
                │  INTRUSION  │
                └──────┬──────┘
                       │
                Incident Created
                       │
                       ▼
                ┌─────────────┐
                │   ACTIVE    │
                │   INCIDENT  │
                └──────┬──────┘
                       │
              Person exits zone
                       │
                       ▼
                ┌─────────────┐
                │   RESOLVED  │
                └─────────────┘
```

---

# 14. Duplicate Alert Prevention

A person remaining inside a zone must NOT create hundreds of incidents.

Incorrect:

```text
Frame 1 → Alert
Frame 2 → Alert
Frame 3 → Alert
Frame 4 → Alert
Frame 5 → Alert
```

Correct:

```text
Person enters
     │
     ▼
Temporal confirmation
     │
     ▼
ONE INCIDENT CREATED
     │
     ▼
Person remains inside
     │
     ▼
Update existing incident
     │
     ▼
NO NEW INCIDENT
     │
     ▼
Person exits
     │
     ▼
Incident can be resolved
```

---

# 15. Alert Engine Architecture

Once an intrusion is confirmed:

```text
CONFIRMED INTRUSION
        │
        ▼
┌─────────────────────────┐
│      ALERT ENGINE       │
└───────────┬─────────────┘
            │
     ┌──────┼───────┬──────────┐
     ▼      ▼       ▼          ▼
   Siren  Banner  Snapshot  Timestamp
     │      │       │          │
     └──────┴───────┴──────────┘
                    │
                    ▼
             Create Incident
                    │
                    ▼
             Save to Firebase
```

---

# 16. Snapshot Capture Flow

```text
Confirmed Intrusion
        │
        ▼
Capture Current Video Frame
        │
        ▼
Include Detection Overlay
        │
        ▼
Add Timestamp
        │
        ▼
Add Camera Information
        │
        ▼
Add Zone Information
        │
        ▼
Upload Snapshot
        │
        ▼
Firebase Storage
        │
        ▼
Store Snapshot Reference
in Incident Record
```

Snapshot evidence should be linked to the incident rather than stored as unrelated media.

---

# 17. Incident Data Flow

```text
AI Detection
     │
     ▼
Tracking
     │
     ▼
Zone Violation
     │
     ▼
Temporal Confirmation
     │
     ▼
Incident Object
     │
     ├── Incident ID
     ├── Camera ID
     ├── Zone ID
     ├── Person Tracking ID
     ├── Confidence
     ├── Timestamp
     ├── Centroid
     ├── Severity
     ├── Snapshot Reference
     └── Status
             │
             ▼
        Firebase
             │
             ▼
      Incident Feed
```

---

# 18. Firebase Architecture

Firebase is the persistence and synchronization layer.

```text
                  REACT APPLICATION
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
       Firebase Auth           Firebase SDK
                                     │
                       ┌─────────────┼─────────────┐
                       │             │             │
                       ▼             ▼             ▼
                   Firestore      Storage      Real-Time
                       │             │          Listeners
                       │             │             │
                       ▼             ▼             ▼
                     Zones       Snapshots      Incidents
                     Cameras     Evidence       Updates
                     Incidents
                     Users
                     Audit
```

---

# 19. Firebase Data Responsibility

Firebase should handle persistence, not high-frequency computer-vision processing.

### Firebase Authentication

Responsible for:

```text
Operator Login
Security Personnel
Admin
Role-Based UI
```

### Firestore

Responsible for:

```text
Users
Cameras
Zones
Incidents
Audit Events
Configuration
```

### Firebase Storage

Responsible for:

```text
Intrusion Snapshots
Evidence Images
Optional Replay Media
```

### Real-Time Listeners

Responsible for:

```text
New Incidents
Incident Status Changes
Zone Configuration Updates
Camera Status Updates
```

---

# 20. Frontend Architecture

```text
src/
│
├── app/
│   ├── routing
│   └── application state
│
├── components/
│   ├── dashboard
│   ├── camera
│   ├── video
│   ├── canvas
│   ├── zones
│   ├── incidents
│   ├── alerts
│   └── common
│
├── pages/
│   ├── Dashboard
│   ├── LiveCameras
│   ├── ZoneCalibration
│   ├── Incidents
│   ├── Analytics
│   ├── SystemStatus
│   └── Settings
│
├── vision/
│   ├── model
│   ├── detection
│   ├── tracking
│   ├── centroid
│   ├── polygon
│   └── temporalValidation
│
├── services/
│   ├── firebase
│   ├── firestore
│   ├── storage
│   └── authentication
│
├── types/
│
├── hooks/
│
└── utils/
```

The exact folder names may be adjusted by Antigravity if necessary, but the separation of responsibilities must remain.

---

# 21. Canvas Rendering Architecture

The video and Canvas overlay must remain synchronized.

```text
                 VIDEO
                   │
                   ▼
        ┌────────────────────┐
        │ HTML5 Video Element│
        └─────────┬──────────┘
                  │
                  │ Same dimensions
                  ▼
        ┌────────────────────┐
        │ Canvas Overlay     │
        └─────────┬──────────┘
                  │
        ┌─────────┼───────────────┐
        ▼         ▼               ▼
    Bounding    Centroids      Polygons
     Boxes
        │         │               │
        └─────────┼───────────────┘
                  ▼
            Alert Indicators
```

Canvas should render:

* Detection bounding boxes
* Tracking IDs
* Confidence values
* Centroid points
* Restricted polygons
* Zone labels
* Intrusion indicators

---

# 22. UI Data Flow

```text
AI / Application State
          │
          ▼
      React State
          │
    ┌─────┼──────────────┐
    ▼     ▼              ▼
Dashboard Live View   Incident Feed
    │     │              │
    ▼     ▼              ▼
 KPI     Canvas        Incident Cards
Cards    Overlay
```

High-frequency detection data should not cause unnecessary full-page React re-renders.

The video/CV rendering path should be optimized independently from normal dashboard UI updates.

---

# 23. Live Camera Architecture

```text
Camera
  │
  ▼
Video Source
  │
  ├── Live CCTV
  │
  └── Demo Video
          │
          ▼
      HTML5 Video
          │
          ▼
     AI Detection
          │
          ▼
       Tracking
          │
          ▼
      Zone Engine
          │
          ▼
      Alert Engine
```

The system must support demo videos so the complete workflow can be demonstrated during the hackathon even without physical stadium CCTV integration.

---

# 24. Multiple Camera Flow

```text
                 Camera Manager
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
    CAM-01          CAM-02          CAM-03
       │               │               │
       ▼               ▼               ▼
     Video           Video           Video
       │               │               │
       ▼               ▼               ▼
       AI              AI              AI
       │               │               │
       ▼               ▼               ▼
     Zones           Zones           Zones
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                Incident Manager
                       │
                       ▼
                Security Dashboard
```

---

# 25. Operator Workflow

```text
Security Operator Login
          │
          ▼
Security Dashboard
          │
          ▼
Check Camera Status
          │
          ▼
Monitor Live Cameras
          │
          ▼
Intrusion Detected
          │
          ▼
Visual Siren
          │
          ▼
Operator Opens Incident
          │
          ▼
Review Snapshot
          │
          ▼
Check Camera / Zone
          │
          ▼
Acknowledge
          │
          ▼
Take Security Action
          │
          ▼
Resolve Incident
          │
          ▼
Incident Remains in Audit History
```

---

# 26. Complete End-to-End Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                         CCTV / DEMO VIDEO                          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                        HTML5 VIDEO LAYER                           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                     TENSORFLOW.JS + COCO-SSD                       │
│                         PERSON DETECTION                           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         TRACKING LAYER                              │
│              Maintain Temporary Person Identities                  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                       CENTROID ENGINE                              │
│                   Calculate Person Center                          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                        ZONE ENGINE                                 │
│                    Point-In-Polygon Test                           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    FALSE ALERT MITIGATION                          │
│        Confidence + Persistence + Dwell + Duplicate Check           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
                     ┌─────────────────────┐
                     │ Confirmed Intrusion │
                     └──────────┬──────────┘
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
       ┌───────────┐      ┌────────────┐     ┌────────────┐
       │   SIREN   │      │  SNAPSHOT  │     │ INCIDENT   │
       │   ALERT   │      │   CAPTURE  │     │  CREATION  │
       └─────┬─────┘      └─────┬──────┘     └─────┬──────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                     ┌─────────────────────┐
                     │      FIREBASE       │
                     │                     │
                     │    Firestore        │
                     │    Storage          │
                     │    Authentication   │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ INCIDENT REVIEW     │
                     │ FEED + DETAILS      │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ SECURITY OPERATOR   │
                     │ ACKNOWLEDGEMENT     │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │      RESOLVED       │
                     │       + AUDIT       │
                     └─────────────────────┘
```

---

# 27. System Responsibility Matrix

| Component          | Responsibility                       |
| ------------------ | ------------------------------------ |
| HTML5 Video        | Display camera/demo video            |
| Canvas API         | Draw detection and security overlays |
| TensorFlow.js      | Browser-side AI inference            |
| COCO-SSD           | Person/object detection              |
| Tracking Layer     | Maintain temporary person IDs        |
| Centroid Engine    | Calculate person center              |
| Polygon Engine     | Determine zone membership            |
| Temporal Validator | Reduce false alerts                  |
| Alert Engine       | Trigger security alerts              |
| Snapshot Engine    | Capture intrusion evidence           |
| React              | Application UI and state             |
| Tailwind CSS       | Security-console styling             |
| Firebase Auth      | Authentication                       |
| Firestore          | Persistent application data          |
| Firebase Storage   | Snapshot/evidence storage            |
| Firebase Listeners | Real-time incident/config updates    |

---

# 28. Performance Architecture

The system should separate:

```text
VIDEO FPS
      │
      ▼
Smooth Video Rendering
      │
      ├───────────────┐
      │               │
      ▼               ▼
AI Inference       Canvas Rendering
Controlled Rate    Continuous Where Practical
      │
      ▼
Tracking
      │
      ▼
Zone Evaluation
```

Do not assume that AI inference must execute on every video frame.

The implementation should benchmark:

```text
Video FPS
AI Inference FPS
Inference Latency
Active Detections
Active Tracks
Canvas Rendering Performance
```

The System Status page must display real measured values rather than fabricated metrics.

---

# 29. Failure Handling Architecture

The system must fail gracefully.

```text
Camera Failure
     │
     ▼
Show Camera Offline
     │
     ▼
Continue Monitoring Other Cameras
```

```text
AI Model Failure
     │
     ▼
Show AI Unavailable
     │
     ▼
Do Not Generate False Intrusions
```

```text
Firebase Failure
     │
     ▼
Continue Local Detection/Alerting
     │
     ▼
Show Sync Warning
     │
     ▼
Synchronize Incident Data
when Firebase becomes available
```

The security alert pipeline should not unnecessarily depend on Firebase availability.

---

# 30. Security Architecture Principles

StadiumSentinel must follow these principles:

1. Do not perform facial recognition.
2. Do not attempt to identify a person's real-world identity.
3. Use temporary tracking IDs.
4. Restrict Firebase access using appropriate authentication and authorization.
5. Do not expose Firebase configuration secrets unnecessarily.
6. Validate user permissions before sensitive operations.
7. Keep security events auditable.
8. Avoid storing unnecessary personal information.
9. Treat snapshots as security evidence.
10. Prevent unauthorized modification of incident history.

---

# 31. Core State Flow

The complete logical state flow is:

```text
VIDEO
  ↓
FRAME
  ↓
DETECTION
  ↓
PERSON
  ↓
TRACK
  ↓
CENTROID
  ↓
ZONE CHECK
  ↓
OUTSIDE / ENTERING
  ↓
TEMPORAL VALIDATION
  ↓
CONFIRMED INTRUSION
  ↓
ALERT
  ↓
SNAPSHOT
  ↓
INCIDENT
  ↓
FIREBASE
  ↓
REVIEW
  ↓
ACKNOWLEDGE
  ↓
RESOLVE
  ↓
AUDIT
```

---

# 32. Architecture Priority

Development priority must follow the hackathon evaluation weight.

## Priority 1 — Real-Time Tracking & Zone Precision

**35%**

Build and validate:

```text
Detection
   ↓
Tracking
   ↓
Centroid
   ↓
Polygon
   ↓
Zone Membership
```

## Priority 2 — False Alert Mitigation & Calibration

**30%**

Build and validate:

```text
Polygon Calibration
       +
Confidence
       +
Persistence
       +
Dwell Time
       +
Duplicate Prevention
```

## Priority 3 — Incident Snapshot & Alarm

**20%**

Build:

```text
Intrusion
   ↓
Siren
   ↓
Snapshot
   ↓
Incident
```

## Priority 4 — System Performance

**15%**

Measure:

```text
FPS
Inference Latency
Tracking Stability
Camera Health
Model Status
```

---

# 33. Recommended Implementation Sequence

Antigravity must NOT attempt to build the entire system at once.

Implement in this order:

```text
PHASE 1
Project Shell
      ↓
PHASE 2
Video + Canvas
      ↓
PHASE 3
Zone Calibration
      ↓
PHASE 4
COCO-SSD Detection
      ↓
PHASE 5
Person Tracking
      ↓
PHASE 6
Centroid + Polygon Engine
      ↓
PHASE 7
False Alert Mitigation
      ↓
PHASE 8
Intrusion State Machine
      ↓
PHASE 9
Alert + Snapshot
      ↓
PHASE 10
Firebase Integration
      ↓
PHASE 11
Incident Review
      ↓
PHASE 12
Performance Optimization
      ↓
PHASE 13
Final UI Polish
```

---

# 34. Final System Flow

The final StadiumSentinel workflow must demonstrate:

```text
┌─────────────┐
│ Camera Feed │
└──────┬──────┘
       ▼
┌──────────────┐
│ Person       │
│ Detection    │
└──────┬───────┘
       ▼
┌──────────────┐
│ Person       │
│ Tracking     │
└──────┬───────┘
       ▼
┌──────────────┐
│ Centroid     │
│ Calculation  │
└──────┬───────┘
       ▼
┌──────────────┐
│ Polygon Zone │
│ Evaluation   │
└──────┬───────┘
       ▼
┌──────────────┐
│ Temporal     │
│ Validation   │
└──────┬───────┘
       ▼
┌──────────────┐
│ Confirmed    │
│ Intrusion    │
└──────┬───────┘
       ▼
┌────────────────────────┐
│ Alarm + Snapshot       │
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ Firebase Incident      │
│ Record + Evidence      │
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ Security Review Feed   │
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ Acknowledge / Resolve  │
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ Audit History           │
└────────────────────────┘
```

---

# 35. Antigravity Implementation Rules

Antigravity must treat this document as the **architecture source of truth**.

### Rules

* Build incrementally.
* Do not generate the entire application in one step.
* Do not replace the specified technology stack without a strong technical reason.
* Keep AI processing separate from UI components.
* Keep Firebase operations separate from computer-vision logic.
* Use Canvas for real-time overlays.
* Use normalized coordinates for polygon zones.
* COCO-SSD is responsible for detection.
* A separate tracking layer must maintain temporary person identities.
* Centroid is the primary point for zone membership.
* Use temporal validation before declaring an intrusion.
* Prevent duplicate incidents.
* Capture timestamped intrusion snapshots.
* Store incidents and evidence references in Firebase.
* Continue local detection/alerting even if Firebase temporarily becomes unavailable.
* Display actual performance measurements.
* Avoid facial recognition.
* Do not invent security events or fake detection metrics.
* Prioritize tracking accuracy and zone calibration over decorative UI.

---

# 36. Definition of Done

The architecture is considered successfully implemented when the following complete demonstration works:

```text
1. Open StadiumSentinel
        ↓
2. Login / Enter Security Dashboard
        ↓
3. Select Camera
        ↓
4. Play CCTV / Demo Video
        ↓
5. COCO-SSD detects people
        ↓
6. Tracking IDs appear
        ↓
7. Centroids appear
        ↓
8. Restricted polygon is visible
        ↓
9. Person enters polygon
        ↓
10. Temporal validation occurs
        ↓
11. Intrusion becomes CONFIRMED
        ↓
12. Visual siren appears
        ↓
13. Timestamped snapshot captured
        ↓
14. Incident created
        ↓
15. Incident appears in review feed
        ↓
16. Security operator opens incident
        ↓
17. Snapshot/evidence reviewed
        ↓
18. Operator acknowledges incident
        ↓
19. Incident is resolved
        ↓
20. Event remains in audit history
```

---

# 37. Final Architecture Principle

The system should be understood as:

```text
             RAW VIDEO
                 │
                 ▼
          COMPUTER VISION
                 │
                 ▼
          TRACKED PEOPLE
                 │
                 ▼
          SPATIAL INTELLIGENCE
                 │
                 ▼
         TEMPORAL INTELLIGENCE
                 │
                 ▼
        SECURITY INCIDENT
                 │
                 ▼
          ACTIONABLE ALERT
                 │
                 ▼
          DIGITAL EVIDENCE
                 │
                 ▼
        OPERATOR RESPONSE
                 │
                 ▼
             AUDIT TRAIL
```

**StadiumSentinel is not simply a CCTV viewer.**

It transforms raw stadium video into a structured security workflow:

**Detect → Track → Locate → Verify → Alert → Capture Evidence → Review → Acknowledge → Audit**
