# StadiumSentinel — Technology Requirements Document

## AI-Powered Cricket Stadium Restricted-Zone Intrusion Detection

**Project Name:** StadiumSentinel
**Document:** Technology Requirements Specification
**Version:** 1.0
**Target Platform:** Desktop Web Application
**Primary Environment:** Modern Chromium-based browsers
**Database:** Firebase
**AI Processing:** Browser-side
**Development Environment:** Vite + npm

---

# 1. Technology Objective

StadiumSentinel is a browser-based AI security monitoring platform designed to detect unauthorized person entry into predefined restricted areas inside cricket stadium environments.

The technology architecture must support:

* Real-time video monitoring
* AI-based person detection
* Temporary person tracking
* Centroid calculation
* Interactive polygon zone calibration
* Point-in-polygon zone detection
* False-alert mitigation
* Real-time intrusion alerts
* Intrusion snapshot capture
* Incident management
* Firebase persistence
* Security operator acknowledgment
* Audit history
* Performance monitoring

The system should prioritize **real-time accuracy, zone precision, low false alerts, and performance** over decorative features.

---

# 2. Mandatory Technology Stack

The implementation must use the following primary technologies.

| Technology              | Required | Purpose                                   |
| ----------------------- | -------- | ----------------------------------------- |
| React                   | YES      | Frontend application                      |
| TypeScript              | YES      | Type-safe application development         |
| Vite                    | YES      | Development/build environment             |
| Tailwind CSS            | YES      | UI styling                                |
| HTML5 Video             | YES      | Video playback                            |
| HTML5 Canvas            | YES      | CV visualization and polygon overlays     |
| TensorFlow.js           | YES      | Browser-side AI inference                 |
| COCO-SSD                | YES      | Object/person detection                   |
| OpenCV.js               | YES      | Optional browser-side image/CV processing |
| Firebase SDK            | YES      | Cloud integration                         |
| Firebase Authentication | YES      | Operator authentication                   |
| Cloud Firestore         | YES      | Application data                          |
| Firebase Storage        | YES      | Intrusion snapshots/evidence              |
| npm                     | YES      | Dependency management                     |

Do not replace the required stack with an unrelated framework unless technically necessary.

---

# 3. Frontend Technology

## 3.1 React

React is the primary UI framework.

React should manage:

* Application pages
* Navigation
* Dashboard components
* Camera management UI
* Zone calibration UI
* Incident feed
* Incident details
* Settings
* Authentication UI
* System status
* Operator interactions

React should NOT be responsible for high-frequency per-frame computer-vision calculations through unnecessary component re-renders.

Real-time CV rendering should be optimized separately.

---

# 4. TypeScript Requirements

TypeScript must be used throughout the application.

Important application entities should have explicit types/interfaces.

Required conceptual types include:

```text
Detection
Track
Centroid
Zone
PolygonPoint
Camera
Incident
Alert
AuditEvent
User
SystemMetrics
```

TypeScript should prevent common problems such as:

* Invalid zone data
* Missing incident fields
* Incorrect camera references
* Invalid tracking data
* Undefined configuration values

Avoid excessive use of `any`.

---

# 5. Vite Requirements

Vite must be used as the development and production build environment.

Vite should provide:

* Fast local development
* TypeScript support
* React integration
* Production bundling
* Environment configuration
* Fast development feedback

The project should remain compatible with standard npm workflows.

---

# 6. Tailwind CSS Requirements

Tailwind CSS must be used for the primary UI styling.

The interface should follow a professional stadium security-console design.

### Visual characteristics

* Dark interface
* High information density
* Clear hierarchy
* Strong contrast
* Minimal decorative elements
* Professional security-monitoring appearance
* Responsive desktop layout

Red should primarily represent:

* Active intrusion
* Critical alerts
* Security warnings

Avoid using excessive red throughout the interface because it reduces the visual importance of genuine security incidents.

---

# 7. HTML5 Video Requirements

HTML5 Video is responsible for displaying:

* Demo CCTV footage
* Uploaded/local demonstration videos where supported
* Camera streams where technically supported by the browser environment

The video element should provide the base visual layer.

The video must remain synchronized with the Canvas overlay.

---

# 8. HTML5 Canvas Requirements

Canvas is a critical technology in StadiumSentinel.

Canvas must support:

* Bounding boxes
* Person tracking IDs
* Confidence values
* Centroid points
* Restricted polygons
* Zone labels
* Intrusion indicators
* Calibration points
* Calibration lines
* Visual alert overlays

Architecture:

```text
HTML5 Video
     │
     ▼
Canvas Overlay
     │
     ├── Detection Boxes
     ├── Tracking IDs
     ├── Centroids
     ├── Restricted Zones
     ├── Zone Labels
     └── Intrusion Indicators
```

The Canvas coordinate system must remain synchronized with the actual video dimensions.

---

# 9. TensorFlow.js Requirements

TensorFlow.js must perform AI inference in the browser.

Primary responsibilities:

* Load AI model
* Run inference
* Process video frames
* Generate object detections
* Provide confidence scores
* Identify detected objects

The AI pipeline should operate without requiring every video frame to be uploaded to a remote server.

This reduces:

* Network dependency
* Latency
* Infrastructure complexity
* Privacy exposure

---

# 10. COCO-SSD Requirements

COCO-SSD is the required initial object detection model.

The system must primarily use COCO-SSD to detect:

```text
person
```

Other detected classes should not enter the restricted-zone intrusion pipeline unless explicitly required later.

Example conceptual pipeline:

```text
Video Frame
     │
     ▼
TensorFlow.js
     │
     ▼
COCO-SSD
     │
     ▼
Detection Results
     │
     ▼
Filter "person"
     │
     ▼
Confidence Filtering
     │
     ▼
Tracking
```

---

# 11. Detection Confidence Requirements

Every person detection should contain a confidence value.

The system must support configurable confidence thresholds.

Example:

```text
Detection Confidence
        │
        ▼
Compare with Zone Threshold
        │
        ├── Below threshold → Ignore
        │
        └── Above threshold → Continue
```

The confidence threshold should be configurable per restricted zone where appropriate.

Do not hard-code a single threshold throughout the entire system if the zone calibration interface allows configuration.

---

# 12. Tracking Technology Requirements

COCO-SSD provides detection, but detection alone does not provide reliable persistent identities.

A dedicated tracking layer is therefore required.

The tracking layer must:

* Associate detections between frames
* Maintain temporary person IDs
* Handle short detection gaps
* Track movement
* Maintain person state
* Provide the current bounding box
* Provide the current centroid

Example:

```text
Frame 1
Person → #01

Frame 2
Person → #01

Frame 3
Person → #01

Frame 4
Person → #01
```

The system must not use facial recognition.

Tracking IDs are temporary technical identifiers only.

---

# 13. Centroid Technology Requirements

For every tracked person, calculate the center point of the bounding box.

Conceptually:

```text
Bounding Box
┌────────────────────┐
│                    │
│         ●          │
│      Centroid      │
│                    │
└────────────────────┘
```

The centroid is the primary spatial point used by the zone engine.

The system must not rely only on bounding-box overlap for intrusion detection.

---

# 14. Polygon Zone Technology

Restricted zones must be represented as polygons.

The zone calibration tool must allow the operator to:

* Create polygon
* Add points
* Move points
* Close polygon
* Clear polygon
* Edit polygon
* Save polygon
* Disable zone
* Delete zone

Example:

```text
           Point 1
              ●
             / \
            /   \
           /     \
      ●───/       \───●
 Point 4             Point 2
           \       /
            \     /
             \   /
              ●
           Point 3
```

---

# 15. Coordinate Normalization

Polygon coordinates must be stored using normalized coordinates rather than fixed screen pixels.

Recommended conceptual format:

```text
x = 0.0 → 1.0
y = 0.0 → 1.0
```

Example:

```text
{
    x: 0.63,
    y: 0.48
}
```

This allows a zone calibrated on one screen resolution to remain correctly positioned when the video is rendered at another resolution.

---

# 16. Point-In-Polygon Requirements

The zone engine must determine whether a person's centroid is inside a restricted polygon.

Required logic:

```text
Tracked Person
      │
      ▼
Centroid
      │
      ▼
Point-In-Polygon
      │
      ├── Outside
      │
      └── Inside
```

If the centroid is outside the polygon:

```text
Normal Monitoring
```

If the centroid enters the polygon:

```text
Entering State
```

The system must then apply temporal validation before declaring a confirmed intrusion.

---

# 17. False Alert Mitigation Technologies

False-alert reduction is one of the highest-priority technical requirements.

The system must support multiple validation mechanisms.

### Required mechanisms

1. Confidence threshold
2. Persistence frames
3. Minimum dwell time
4. Tracking stability
5. Duplicate incident prevention
6. Zone calibration
7. Centroid-based zone evaluation

Required conceptual flow:

```text
Detection
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
Persistence Validation
   │
   ▼
Dwell Time Validation
   │
   ▼
Duplicate Check
   │
   ▼
Confirmed Intrusion
```

---

# 18. Temporal Validation Requirements

The system must not trigger an intrusion immediately from a single frame.

Instead, it should confirm that the tracked person remains inside the zone for the configured validation period.

Example:

```text
Frame 1 → Inside
Frame 2 → Inside
Frame 3 → Inside
Frame 4 → Inside

Persistence requirement satisfied
        │
        ▼
Check dwell time
        │
        ▼
Confirmed intrusion
```

This helps prevent false alarms from:

* Detection flickering
* Boundary movement
* Single-frame errors
* Temporary occlusion
* Camera noise

---

# 19. Intrusion State Management

The technology layer must support an intrusion state machine.

Required states:

```text
OUTSIDE
   ↓
ENTERING
   ↓
CONFIRMED
   ↓
ACTIVE INCIDENT
   ↓
RESOLVED
```

The system must distinguish between:

* Person approaching zone
* Person temporarily entering
* Confirmed intrusion
* Active security incident
* Resolved event

---

# 20. Alert Technology Requirements

When an intrusion becomes confirmed, the alert system must provide immediate visual feedback.

Required:

* Visual siren/alert
* Alert banner
* Zone information
* Camera information
* Person tracking ID
* Timestamp
* Confidence
* Incident reference

Conceptual flow:

```text
CONFIRMED INTRUSION
        │
        ├── Visual Alert
        ├── Siren
        ├── Snapshot
        └── Incident Creation
```

The alert should not wait for a Firebase write to complete before displaying the local security alert.

---

# 21. Snapshot Technology Requirements

The system must capture an evidence snapshot when an intrusion is confirmed.

Snapshot should contain or be associated with:

* Video frame
* Timestamp
* Camera ID
* Zone ID/name
* Person tracking ID
* Confidence
* Intrusion status

Conceptual flow:

```text
Confirmed Intrusion
        │
        ▼
Capture Frame
        │
        ▼
Evidence Snapshot
        │
        ▼
Firebase Storage
        │
        ▼
Incident Reference
```

---

# 22. OpenCV.js Requirements

OpenCV.js should be treated as a supporting computer-vision library rather than the primary detector.

Potential responsibilities:

* Frame preprocessing
* Image manipulation
* Region processing
* Optional image analysis
* Optional advanced CV operations

COCO-SSD remains the primary person detection mechanism.

Do not introduce OpenCV.js processing into every frame unless benchmarking shows a real benefit.

---

# 23. Firebase Requirements

Firebase provides the cloud persistence and synchronization layer.

Firebase must NOT be used as the primary real-time AI inference engine.

Architecture:

```text
Browser
   │
   ├── AI Detection
   ├── Tracking
   ├── Centroid
   ├── Zone Engine
   └── Alert Engine
             │
             ▼
          Firebase
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
 Firestore Storage  Auth
```

---

# 24. Firebase Authentication

Firebase Authentication must support operator authentication.

Potential roles:

```text
ADMIN
SECURITY_OPERATOR
VIEWER
```

The UI should adapt based on the authenticated user's role.

For example:

```text
ADMIN
 ├── All Dashboard Features
 ├── Zone Management
 ├── Camera Management
 └── Settings

SECURITY_OPERATOR
 ├── Live Monitoring
 ├── Incident Review
 ├── Acknowledge
 └── Resolve

VIEWER
 ├── Monitoring
 └── Read-Only Incident View
```

---

# 25. Cloud Firestore Requirements

Firestore must store persistent application information.

Required conceptual collections:

```text
users
cameras
zones
incidents
auditEvents
systemConfiguration
```

Firestore should contain metadata and structured records rather than large video files.

---

# 26. Firebase Storage Requirements

Firebase Storage must store evidence media.

Primary use:

```text
Intrusion Snapshots
```

Potential future use:

```text
Replay Clips
Demo Evidence
Security Media
```

Large binary media should not be stored directly inside Firestore documents.

---

# 27. Real-Time Firebase Synchronization

The frontend should use Firebase real-time listeners where appropriate.

Examples:

```text
New Incident
     ↓
Firebase
     ↓
Real-Time Listener
     ↓
Dashboard Updates
     ↓
Incident Feed Updates
```

Similarly:

```text
Zone Configuration Changed
          ↓
Firebase
          ↓
Frontend Listener
          ↓
Live Monitoring Uses New Zone
```

---

# 28. Firebase Availability Strategy

The real-time security pipeline must not completely stop if Firebase temporarily becomes unavailable.

Preferred architecture:

```text
Video
  ↓
AI
  ↓
Tracking
  ↓
Zone Detection
  ↓
Alert
  │
  ├──────────────► Local UI immediately
  │
  └──────────────► Firebase persistence
```

If Firebase is temporarily unavailable:

```text
Local Detection
      ↓
Local Alert
      ↓
Sync Pending
      ↓
Firebase Available
      ↓
Synchronize Incident
```

---

# 29. Performance Requirements

Performance is a scored requirement.

The system should monitor actual:

* Video FPS
* AI inference FPS
* Inference latency
* Number of detections
* Number of active tracks
* Canvas rendering performance
* Camera status
* AI model status

The application must not display fabricated performance numbers.

---

# 30. AI Processing Frequency

The system should not assume that AI inference must run at the exact video frame rate.

Example architecture:

```text
Video
30 FPS
 │
 ├── Continuous Video Rendering
 │
 └── AI Inference
       10–15 FPS initially
             │
             ▼
          Tracking
             │
             ▼
        Zone Evaluation
```

The actual inference frequency must be determined through benchmarking.

The application should prioritize:

**stable detection + reliable tracking + acceptable latency**

over simply maximizing inference FPS.

---

# 31. Browser Performance Requirements

The application should minimize unnecessary work on the main UI thread.

Requirements:

* Avoid unnecessary React re-renders
* Avoid recreating AI models
* Load the AI model once
* Reuse Canvas contexts
* Reuse tracking state
* Control inference frequency
* Avoid excessive Firebase writes
* Avoid creating an incident every frame
* Clean up video/model/listeners when components are destroyed

---

# 32. Firebase Write Optimization

High-frequency CV data should NOT be written to Firestore every frame.

Incorrect:

```text
Frame 1 → Firestore
Frame 2 → Firestore
Frame 3 → Firestore
Frame 4 → Firestore
...
```

Correct:

```text
Real-Time CV
     │
     ▼
Local Processing
     │
     ▼
Confirmed Security Event
     │
     ▼
Firestore
```

Firebase should primarily persist meaningful security events and configuration.

---

# 33. Data Flow Technology

The complete technical pipeline is:

```text
CCTV / Demo Video
        ↓
HTML5 Video
        ↓
Canvas
        ↓
TensorFlow.js
        ↓
COCO-SSD
        ↓
Person Detection
        ↓
Tracking Layer
        ↓
Centroid Calculator
        ↓
Polygon Engine
        ↓
Temporal Validation
        ↓
Intrusion State Machine
        ↓
Alert Engine
        ↓
Snapshot Capture
        ↓
Firebase Storage
        ↓
Firestore Incident
        ↓
React Incident Feed
        ↓
Operator Action
        ↓
Audit Event
```

---

# 34. Technology Separation of Responsibilities

The implementation must maintain clear boundaries.

## Computer Vision Layer

Responsible for:

```text
Detection
Tracking
Centroid
Frame Processing
Polygon Evaluation
Temporal Validation
```

## UI Layer

Responsible for:

```text
Dashboard
Camera View
Calibration UI
Incident Feed
Alerts
Settings
Operator Controls
```

## Firebase Layer

Responsible for:

```text
Authentication
Persistence
Storage
Real-Time Synchronization
```

Architecture:

```text
             React UI
                │
       ┌────────┴────────┐
       ▼                 ▼
Computer Vision      Firebase
       │                 │
       └────────┬────────┘
                ▼
          Application State
```

The UI must not contain the complete AI algorithm.

The AI layer must not directly manipulate dashboard components.

---

# 35. Recommended Technology Modules

The application should conceptually separate the following modules:

```text
AI Model Manager
        │
        ▼
Detection Engine
        │
        ▼
Tracking Engine
        │
        ▼
Centroid Engine
        │
        ▼
Zone Engine
        │
        ▼
Temporal Validation Engine
        │
        ▼
Incident Engine
        │
        ▼
Snapshot Engine
        │
        ▼
Firebase Services
```

This makes the system easier to test, debug, and extend.

---

# 36. Error Handling Requirements

The application must provide clear states for:

### Camera Error

```text
CAMERA OFFLINE
```

### AI Model Error

```text
AI MODEL UNAVAILABLE
```

### Firebase Error

```text
CLOUD SYNC UNAVAILABLE
```

### Video Error

```text
VIDEO SOURCE UNAVAILABLE
```

### Zone Error

```text
INVALID ZONE CONFIGURATION
```

The interface should explain the problem and provide an appropriate recovery action where possible.

---

# 37. Loading Requirements

The system should explicitly communicate loading states.

Examples:

```text
Loading Application
       ↓
Loading Camera
       ↓
Loading AI Model
       ↓
AI Ready
       ↓
Monitoring Active
```

Do not display the system as "AI Active" before the model is actually ready.

---

# 38. Security Requirements

The application must follow basic security principles.

### Authentication

Users must authenticate before accessing protected security functionality.

### Authorization

Sensitive actions should be restricted based on user role.

### Firebase Rules

Firestore and Storage access must be protected using appropriate Firebase security rules.

### Evidence Protection

Intrusion snapshots should not be publicly exposed unnecessarily.

### Privacy

The system must not implement facial recognition.

The system should use:

```text
Person #01
Person #02
Person #03
```

rather than attempting to determine:

```text
Person's Name
Identity
Face
```

---

# 39. Technology Constraints

The implementation must avoid unnecessary complexity.

Do NOT introduce:

* Separate backend server without requirement
* Python inference service
* Custom ML training pipeline
* Kubernetes
* Microservices
* Redis
* PostgreSQL
* Kafka
* Complex cloud infrastructure

for the initial hackathon implementation.

The required architecture is intentionally lightweight:

```text
Browser
  │
  ├── React
  ├── TensorFlow.js
  ├── COCO-SSD
  ├── Canvas
  └── OpenCV.js
        │
        ▼
     Firebase
```

---

# 40. Optional Future Technologies

These technologies are NOT required for the first implementation but may be considered later:

```text
Advanced Object Tracking
More Advanced Detection Models
Web Workers
WebGL Optimization
WebRTC CCTV Integration
Pre/Post Event Video Buffer
Edge AI
Dedicated GPU Inference
Multi-Camera AI Processing
Advanced Analytics
```

Do not add these unless the core system is stable.

---

# 41. Development Environment

Recommended development environment:

```text
Operating System:
Windows / macOS / Linux

Runtime:
Node.js

Package Manager:
npm

Build Tool:
Vite

Language:
TypeScript

Browser:
Modern Chromium-based browser

Source Control:
Git

Cloud:
Firebase
```

---

# 42. Environment Configuration

Firebase configuration and other environment-specific values should be handled through environment configuration.

Do not hard-code sensitive credentials into application source files.

The application should support separate environments conceptually:

```text
Development
     ↓
Testing
     ↓
Hackathon Demo
     ↓
Production
```

---

# 43. Testing Requirements

The technology implementation should support testing of the following scenarios.

## Detection Test

```text
Person visible
     ↓
Person detected
```

## Tracking Test

```text
Person moves
     ↓
Same temporary ID maintained
```

## Zone Test

```text
Centroid outside
     ↓
No intrusion
```

```text
Centroid enters
     ↓
Temporal validation
     ↓
Intrusion
```

## False Alert Test

```text
Person briefly crosses boundary
     ↓
Persistence requirement not satisfied
     ↓
No incident
```

## Duplicate Test

```text
Person stays inside
     ↓
ONE incident
     ↓
No duplicate incidents
```

## Snapshot Test

```text
Confirmed intrusion
     ↓
Snapshot created
```

## Firebase Test

```text
Incident
     ↓
Firestore record
     ↓
Snapshot reference
     ↓
Incident feed
```

---

# 44. Technology Acceptance Criteria

The technology stack is considered successfully implemented when:

### AI

* TensorFlow.js loads successfully.
* COCO-SSD detects people.
* Confidence scores are available.
* AI runs in the browser.

### Tracking

* Temporary person IDs are maintained.
* Tracking remains reasonably stable during movement.

### Zone

* Operators can draw polygon zones.
* Zones can be edited.
* Zones use normalized coordinates.
* Centroid-based point-in-polygon evaluation works.

### False Alerts

* Confidence threshold works.
* Persistence validation works.
* Dwell-time validation works.
* Duplicate incidents are prevented.

### Alert

* Confirmed intrusion produces a visible alert.
* Snapshot is captured.
* Timestamp is recorded.

### Firebase

* Authentication works.
* Zones can be persisted.
* Incidents can be persisted.
* Snapshots can be stored.
* Incident updates can appear in real time.

### Performance

* Actual FPS is measured.
* Inference latency is measured.
* UI remains responsive during monitoring.

---

# 45. Final Technology Architecture

```text
                         STADIUMSENTINEL
                               │
                               ▼
                       ┌───────────────┐
                       │  React + TS   │
                       └───────┬───────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
           HTML5 Video      Canvas        Tailwind
                │              │
                └──────┬───────┘
                       ▼
                 TensorFlow.js
                       │
                       ▼
                   COCO-SSD
                       │
                       ▼
               Person Detection
                       │
                       ▼
                 Tracking Layer
                       │
                       ▼
                Centroid Engine
                       │
                       ▼
                 Polygon Engine
                       │
                       ▼
              Temporal Validation
                       │
                       ▼
                Incident Engine
                       │
             ┌─────────┴──────────┐
             ▼                    ▼
       Alert / Siren          Snapshot
             │                    │
             └─────────┬──────────┘
                       ▼
                    Firebase
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Auth     Firestore   Storage
             │         │         │
             └─────────┼─────────┘
                       ▼
               Security Dashboard
                       │
                       ▼
                Incident Review
                       │
                       ▼
                 Acknowledgment
                       │
                       ▼
                   Audit Trail
```

---

# 46. Non-Negotiable Technical Principle

The implementation must preserve this pipeline:

```text
VIDEO
  ↓
AI DETECTION
  ↓
PERSON TRACKING
  ↓
CENTROID
  ↓
POLYGON ZONE
  ↓
TEMPORAL VALIDATION
  ↓
CONFIRMED INTRUSION
  ↓
ALERT
  ↓
SNAPSHOT
  ↓
FIREBASE INCIDENT
  ↓
OPERATOR REVIEW
  ↓
ACKNOWLEDGE
  ↓
AUDIT
```

The most important engineering priorities are:

**1. Tracking accuracy**

**2. Zone boundary precision**

**3. False-alert reduction**

**4. Reliable intrusion confirmation**

**5. Fast visual alerting**

**6. Evidence capture**

**7. Firebase persistence**

**8. Measurable performance**

Everything else is secondary.

---

# 47. Instruction to Antigravity

Treat this document as the **Technology Source of Truth** for StadiumSentinel.

Use the specified technology stack unless there is a clear technical blocker.

Build the application incrementally.

Do not generate unnecessary backend infrastructure.

Do not train a custom AI model for the initial implementation.

Do not replace COCO-SSD with a different detector unless explicitly requested.

Do not use facial recognition.

Do not store high-frequency detection frames in Firebase.

Do not generate fake FPS, detection, or incident data.

Keep computer vision, UI, and Firebase responsibilities separated.

Prioritize the hackathon evaluation areas:

```text
35% — Real-Time Person Tracking & Zone Boundary Precision
30% — False Alert Mitigation & Zone Calibration UX
20% — Incident Snapshot & Alarm Dispatch
15% — System Performance
```

The final application must demonstrate a complete working path from:

**CCTV video → Person Detection → Tracking → Centroid → Polygon Zone → Temporal Validation → Intrusion → Alert → Snapshot → Firebase Incident → Operator Acknowledgment → Audit.**
