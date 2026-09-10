# STADIUMSENTINEL

## AI-Powered Cricket Stadium Restricted-Zone Intrusion Detection

# FRONTEND REQUIREMENTS DOCUMENT (FRD)

**Version:** 2.0
**Project Type:** Cybersecurity Hackathon
**Frontend:** React + TypeScript
**Styling:** Tailwind CSS
**Graphics / Zone Calibration:** HTML5 Canvas API
**AI:** TensorFlow.js + COCO-SSD
**Computer Vision:** OpenCV.js
**Database Integration:** Firebase
**Primary Platform:** Desktop Web Application

---

# 1. PURPOSE

Build a professional browser-based stadium security monitoring platform that detects and visualizes unauthorized persons entering predefined restricted areas.

The frontend must provide a complete security-operator workflow:

DETECT
→ TRACK
→ CALIBRATE
→ VERIFY
→ ALERT
→ CAPTURE EVIDENCE
→ REVIEW
→ ACKNOWLEDGE
→ AUDIT

The application is intended for cricket stadium security personnel monitoring pitch, dugout, equipment, player-access and service areas.

---

# 2. CORE PROBLEM

Cricket stadiums contain restricted areas.

Examples:

* Playing pitch
* Player dugouts
* Player entrances
* Equipment areas
* Service entrances
* Officials-only areas

Security personnel need a system that can:

1. Define restricted areas.
2. Detect people.
3. Track people.
4. Determine whether a person's centroid enters a restricted polygon.
5. Reduce false alerts.
6. Immediately display an intrusion alarm.
7. Capture an intrusion snapshot.
8. Record the incident.
9. Allow security personnel to acknowledge the incident.

---

# 3. EVALUATION PRIORITY

The frontend must be designed around the official evaluation weightage.

## 35% — Real-Time Person Tracking & Zone Boundary Precision

Highest priority.

The UI must clearly visualize:

* Person detection
* Person tracking
* Person ID
* Bounding box
* Centroid
* Polygon boundary
* Inside/outside state
* Camera/video alignment

---

## 30% — False Alert Mitigation & Zone Calibration UX

Second highest priority.

The UI must support:

* Interactive polygon drawing
* Polygon editing
* Zone calibration
* Confidence threshold
* Dwell-time threshold
* Detection persistence
* Clear configuration feedback

---

## 20% — Incident Snapshot & Alarm Dispatch

The UI must support:

* Immediate visual alarm
* Snapshot
* Timestamp
* Incident information
* Incident review
* Acknowledgment

---

## 15% — System Performance

The UI must expose:

* FPS
* Detection latency
* Number of detected persons
* Camera status
* AI status

---

# 4. TECHNOLOGY REQUIREMENTS

Use:

## Required

* React
* TypeScript
* Tailwind CSS
* HTML5 Canvas API
* TensorFlow.js
* COCO-SSD
* OpenCV.js
* Firebase SDK

## Build tooling

* Vite
* npm

Do not introduce unnecessary frontend frameworks.

Do not use:

* Bootstrap
* Material UI
* Angular
* Vue
* Streamlit
* Python UI frameworks

The project must remain a React + TypeScript application.

---

# 5. APPLICATION DESIGN

The application should resemble a professional security operations center.

Design characteristics:

* Dark security-console theme
* High information density
* Clear status indicators
* Strong visual hierarchy
* Minimal decorative elements
* Fast operator interaction
* Responsive layout

The design must prioritize:

SECURITY INFORMATION

over

DECORATIVE UI.

---

# 6. GLOBAL APPLICATION STRUCTURE

Main layout:

┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│ SIDEBAR        │ MAIN CONTENT                                │
│                │                                             │
│ Dashboard      │                                             │
│ Live Cameras   │                                             │
│ Zone Setup     │                                             │
│ Incidents      │                                             │
│ Analytics      │                                             │
│ System Status  │                                             │
│ Settings       │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘

---

# 7. HEADER

Header must display:

### Branding

🛡️ StadiumSentinel

Subtitle:

AI Stadium Security

### System status

SYSTEM ONLINE

### Camera status

CAMERAS: 4/4

### Active incidents

ACTIVE: 2

### Current time

Live system time.

### User

Current security operator.

---

# 8. SIDEBAR

Navigation:

1. Dashboard
2. Live Cameras
3. Zone Calibration
4. Incidents
5. Analytics
6. System Status
7. Settings

Each item must have:

* Icon
* Label
* Active state
* Hover state

Active page must be visually obvious.

---

# 9. DASHBOARD

The Dashboard is the main security-control screen.

It must show:

## KPI Cards

### Cameras Online

4 / 4

### Active Incidents

2

### Today's Incidents

17

### System FPS

24 FPS

---

# 10. LIVE MONITORING

The main dashboard must contain a large live video area.

Use:

HTML5 video element

with

Canvas overlay.

The Canvas must align exactly with the displayed video.

The overlay must support:

* Person bounding boxes
* Person IDs
* Confidence
* Centroid markers
* Restricted polygons
* Zone labels
* Intrusion indicators

---

# 11. VIDEO / CANVAS ARCHITECTURE

Use separate conceptual layers:

### Video layer

Original video.

### Detection layer

Bounding boxes and labels.

### Tracking layer

Person IDs and trajectories.

### Zone layer

Restricted polygons.

### Alert layer

Intrusion visualization.

### Interaction layer

Polygon editing.

All coordinate systems must remain synchronized with the actual displayed video dimensions.

Do NOT hard-code coordinates for a single screen size.

---

# 12. PERSON DETECTION VISUALIZATION

TensorFlow.js + COCO-SSD provides person detections.

The frontend should visualize each valid person detection.

Example:

PERSON #12

Confidence: 91%

Bounding box:

[person bounding box]

Centroid:

●

The user must be able to toggle:

[ Detection ]

ON/OFF

---

# 13. PERSON TRACKING VISUALIZATION

The frontend must support a tracking layer above object detection.

Tracking should maintain a stable temporary Person ID.

Example:

Person #01

Person #02

Person #03

The same person should retain the same ID across consecutive frames whenever the tracking logic can confidently associate detections.

The UI should show the current tracking ID near the bounding box.

Tracking data must be visually distinguishable from raw detection.

---

# 14. CENTROID VISUALIZATION

For each tracked person:

Calculate and display the person's centroid.

Conceptually:

Bounding box

→

Center point

→

Zone membership check

The centroid should be represented with a small visible marker.

Example:

┌───────────────┐
│               │
│      👤       │
│       ●       │
│               │
└───────────────┘

The centroid is the primary point used for restricted-zone membership.

---

# 15. RESTRICTED ZONE VISUALIZATION

Restricted zones must appear directly over the video.

Each zone should have:

* Polygon boundary
* Zone name
* Severity
* Active/inactive state

Example:

PITCH

CRITICAL

DUGOUT A

HIGH

EQUIPMENT

MEDIUM

The polygon must remain aligned with the video when the browser window changes size.

---

# 16. ZONE CALIBRATION PAGE

This is a critical feature.

The operator must be able to define restricted zones interactively.

Layout:

┌──────────────────────────────────────────────────────────────┐
│ ZONE CALIBRATION                                             │
├──────────────────────────────────────┬───────────────────────┤
│                                      │ ZONE SETTINGS         │
│              VIDEO                   │                       │
│                                      │ Name                  │
│       ●──────────────●               │ [ Player Dugout ]     │
│       │              │               │                       │
│       │  RESTRICTED  │               │ Severity              │
│       │     ZONE     │               │ [ HIGH ]              │
│       │              │               │                       │
│       ●──────────────●               │ Confidence             │
│                                      │ [ 0.60 ]              │
│                                      │                       │
│                                      │ Dwell Time             │
│                                      │ [ 500 ms ]            │
│                                      │                       │
│                                      │ [ SAVE ZONE ]         │
└──────────────────────────────────────┴───────────────────────┘

---

# 17. POLYGON DRAWING

The operator must be able to:

1. Enter drawing mode.
2. Click polygon points.
3. See points immediately.
4. See connecting lines.
5. Close the polygon.
6. Preview the completed zone.
7. Edit points.
8. Drag points.
9. Clear the polygon.
10. Save the polygon.

The interface must provide clear instructions while drawing.

Example:

DRAW MODE

Click to add points.

Click the first point to close the zone.

---

# 18. POLYGON EDITING

Existing polygons must be editable.

Operator should be able to:

* Drag a point
* Move polygon points
* Clear polygon
* Recreate polygon
* Save changes

Editing should happen directly over the video.

The operator must immediately see the result.

---

# 19. NORMALIZED ZONE COORDINATES

Zone coordinates must be stored independently of display resolution.

Use normalized coordinates conceptually:

x = 0.0 → 1.0

y = 0.0 → 1.0

This ensures the polygon remains aligned when the video is resized.

The frontend is responsible for converting normalized coordinates to Canvas coordinates.

---

# 20. ZONE CONFIGURATION

Every zone must support:

### Zone name

Example:

Player Dugout A

### Zone type

Restricted

### Severity

LOW

MEDIUM

HIGH

CRITICAL

### Confidence threshold

Example:

60%

### Minimum dwell time

Example:

500 ms

### Detection persistence

Example:

5 frames

### Active

ON/OFF

---

# 21. FALSE ALERT MITIGATION UI

The application must make false-alert controls visible and understandable.

Controls:

Confidence threshold

Minimum dwell time

Persistence frames

Optional sensitivity setting.

Example:

CONFIDENCE

60%

────────────────●──────

DWELL TIME

500 ms

PERSISTENCE

5 frames

Include helper text explaining that these settings help reduce false alarms.

---

# 22. ZONE MANAGEMENT

Provide a zone list.

Example:

| Zone      | Severity | Threshold | Status |
| --------- | -------- | --------- | ------ |
| Pitch     | Critical | 60%       | Active |
| Dugout A  | High     | 60%       | Active |
| Dugout B  | High     | 60%       | Active |
| Equipment | Medium   | 65%       | Active |

Actions:

[EDIT]

[DISABLE]

[DELETE]

---

# 23. INTRUSION STATE

The frontend must visually distinguish:

### Outside zone

Normal.

### Entering zone

Warning state.

### Confirmed intrusion

Critical state.

The system should not immediately show a confirmed intrusion from a single uncertain frame.

The UI should reflect the temporal confirmation process.

---

# 24. TEMPORAL CONFIRMATION

The frontend detection logic should support:

Person enters zone

↓

Detection remains valid

↓

Person remains inside configured dwell/persistence threshold

↓

Confirmed intrusion

↓

Generate incident

This is required to reduce false alerts.

---

# 25. ACTIVE INTRUSION ALERT

When an intrusion is confirmed:

Display a prominent alert.

Example:

🚨 CRITICAL SECURITY INCIDENT

Unauthorized person detected

ZONE

PITCH

CAMERA

CAM-03

PERSON

#17

CONFIDENCE

91%

TIME

10:42:18

Actions:

[VIEW INCIDENT]

[ACKNOWLEDGE]

---

# 26. ALERT BANNER

Dashboard should show active incidents without completely blocking the live camera.

Example:

🚨 2 ACTIVE SECURITY INCIDENTS

Clicking the alert should open incident details.

---

# 27. VISUAL SIREN

Use:

* Red alert banner
* Pulsing indicator
* Alert icon
* Optional browser audio notification

The alert should be noticeable but not visually chaotic.

Avoid excessive animation.

---

# 28. SNAPSHOT CAPTURE

When a confirmed intrusion occurs:

Capture the current video frame.

The snapshot should contain the relevant visual context.

It should preserve:

* Person bounding box
* Person ID
* Centroid
* Restricted zone
* Camera
* Timestamp

The frontend must prepare the snapshot for Firebase Storage upload.

---

# 29. INCIDENT CREATION

After confirmed intrusion:

Create an incident object containing:

* Incident ID
* Camera ID
* Zone ID
* Zone name
* Person ID
* Confidence
* Centroid
* Severity
* Timestamp
* Snapshot reference
* Status

Default status:

UNACKNOWLEDGED

---

# 30. DUPLICATE ALERT PREVENTION

A person staying inside the same restricted zone must not generate repeated incidents every frame.

Conceptual behavior:

ENTRY

↓

ONE INCIDENT

↓

PERSON REMAINS INSIDE

↓

NO NEW INCIDENT

↓

PERSON EXITS

↓

STATE RESET

↓

NEXT ENTRY

↓

NEW INCIDENT

The UI should reflect one active incident rather than flooding the operator with duplicate alerts.

---

# 31. INCIDENT FEED

Dashboard should include recent incidents.

Example:

┌────────────────────────────────────────────┐
│ 🚨 CRITICAL                               │
│ Pitch intrusion                           │
│ CAM-03 | Person #17                       │
│ 10:42:18                                  │
│                                            │
│ [VIEW] [ACKNOWLEDGE]                     │
└────────────────────────────────────────────┘

Newest incidents appear first.

---

# 32. INCIDENT REVIEW PAGE

Dedicated page for investigating historical incidents.

Filters:

* Camera
* Zone
* Severity
* Status
* Date

Search:

* Incident ID
* Person ID
* Zone
* Camera

---

# 33. INCIDENT DETAILS

Incident details must display:

Incident ID

Severity

Camera

Zone

Person ID

Confidence

Centroid

Timestamp

Snapshot

Status

Acknowledgment information

Timeline

---

# 34. INCIDENT SNAPSHOT VIEW

Example:

┌─────────────────────────────────────┐
│ INCIDENT SNAPSHOT                   │
│                                     │
│         [CAPTURED IMAGE]            │
│                                     │
│ Zone: PITCH                         │
│ Camera: CAM-03                      │
│ Person: #17                         │
│ Confidence: 91%                     │
│ Time: 10:42:18                      │
└─────────────────────────────────────┘

Provide zoom/view functionality where practical.

---

# 35. INCIDENT ACKNOWLEDGMENT

Operator clicks:

[ACKNOWLEDGE]

Then display:

STATUS

🟢 ACKNOWLEDGED

ACKNOWLEDGED BY

Current operator

ACKNOWLEDGED AT

Timestamp

The incident must remain in the historical feed.

---

# 36. INCIDENT RESOLUTION

Authorized operators may mark:

RESOLVED

Store/display:

Resolved by

Resolved at

Incident remains available for audit.

---

# 37. INCIDENT TIMELINE

Display a clear timeline.

Example:

10:42:11

Person detected

↓

10:42:13

Entered restricted zone

↓

10:42:14

Intrusion confirmed

↓

10:42:14

Snapshot captured

↓

10:42:14

Alarm generated

↓

10:42:21

Acknowledged

↓

10:42:48

Person exited

---

# 38. CAMERA MANAGEMENT

Camera page must display camera cards.

Example:

CAM-01

🟢 ONLINE

Pitch

CAM-02

🟢 ONLINE

Dugout

CAM-03

🔴 ALERT

Equipment

CAM-04

🟡 DEGRADED

Service Area

---

# 39. CAMERA DETAILS

Each camera should display:

* Camera ID
* Name
* Location
* Status
* FPS
* Detection count
* Active zones
* Current incident state

---

# 40. DEMO VIDEO SUPPORT

The application must support prerecorded videos for the hackathon demonstration.

Example:

Demo Camera

CAM-01

The architecture should allow a future live camera source without redesigning the UI.

Do not require real stadium CCTV for the prototype.

---

# 41. MULTIPLE CAMERA SUPPORT

The frontend architecture should support multiple cameras.

For MVP:

2–4 demo cameras are sufficient.

The UI should allow switching between cameras.

Example:

CAM-01

CAM-02

CAM-03

CAM-04

---

# 42. STADIUM OVERVIEW

Provide an optional visual stadium overview.

Display:

* Cameras
* Restricted zones
* Active alerts

Example:

STADIUM

PITCH 🔴

DUGOUT A 🟠

DUGOUT B 🟠

EQUIPMENT 🟡

SERVICE GATE 🟢

Clicking a camera should open its monitoring view.

---

# 43. SYSTEM PERFORMANCE

Create a System Status section.

Display:

FPS

Detection latency

Tracking count

Detected persons

Camera status

AI model status

Example:

SYSTEM PERFORMANCE

FPS

24

INFERENCE

42 ms

PERSONS

7

CAMERAS

4 / 4

AI MODEL

🟢 RUNNING

---

# 44. PERFORMANCE MONITORING

Measure actual frontend performance.

Do not display fake values in the final demo.

Metrics should be derived from the application runtime.

Recommended metrics:

* Render FPS
* Detection/inference time
* Number of active detections
* Number of active tracks
* Processing status

---

# 45. AI MODEL STATUS

Show:

LOADING

RUNNING

PAUSED

ERROR

When the COCO-SSD model is loading:

AI MODEL

⏳ Loading...

After successful loading:

AI MODEL

🟢 Running

---

# 46. CAMERA ERROR STATES

Handle:

Camera loading

Camera unavailable

Video paused

Invalid source

Network failure

Display clear messages.

Example:

CAM-03

🔴 CAMERA OFFLINE

Do not show a blank panel.

---

# 47. FIREBASE FRONTEND INTEGRATION

The frontend will connect to Firebase for:

* Authentication
* Zone persistence
* Camera configuration
* Incident persistence
* Snapshot storage
* Real-time incident updates
* User information

Do not place Firebase operations directly throughout UI components.

Use dedicated service modules.

---

# 48. FRONTEND DATA SERVICES

Suggested services:

authService

zoneService

cameraService

incidentService

storageService

auditService

userService

React components should call these services instead of directly containing large Firebase operations.

---

# 49. FIREBASE REAL-TIME INCIDENT FEED

The dashboard should update automatically when a new incident is created.

Operator should not need to refresh the page.

Example:

Person enters pitch

↓

Incident created

↓

Firebase update

↓

Dashboard automatically shows:

🚨 NEW INCIDENT

---

# 50. LOCAL-FIRST ALERT PRINCIPLE

Critical visual detection must not wait for Firebase.

Detection:

Browser

↓

Zone validation

↓

Immediate alert

↓

Snapshot

↓

Firebase persistence

If Firebase is temporarily unavailable:

* Continue local detection
* Continue local alert
* Temporarily retain incident
* Synchronize when connection returns

---

# 51. AUTHENTICATION UI

Provide:

Login page.

Fields:

Email

Password

Login button

Display authentication errors.

After login:

Redirect to Dashboard.

Provide:

Logout

Current operator

Role

---

# 52. ROLE-BASED UI

SECURITY_OPERATOR:

Can:

* View cameras
* View zones
* View incidents
* Acknowledge incidents
* Review snapshots

SECURITY_ADMIN:

Can additionally:

* Create zones
* Edit zones
* Disable zones
* Configure cameras
* Manage system settings

UI controls should respect the user's role.

---

# 53. LOADING STATES

Every major operation should have a loading state.

Examples:

Loading cameras...

Loading zones...

Loading incidents...

Saving zone...

Uploading snapshot...

Acknowledging incident...

Do not allow duplicate actions while an operation is processing.

---

# 54. EMPTY STATES

Examples:

No active incidents.

No cameras configured.

No restricted zones.

No historical incidents.

Each empty state should explain what the user can do next.

---

# 55. ERROR STATES

Handle:

AI model loading failure

Camera failure

Firebase connection failure

Snapshot upload failure

Zone save failure

Authentication failure

Permission failure

Display understandable error messages.

---

# 56. RESPONSIVE DESIGN

Primary target:

Desktop / laptop.

Secondary:

Tablet.

On smaller screens:

* Collapse sidebar
* Stack panels
* Resize video
* Keep alerts visible
* Preserve important controls

---

# 57. ACCESSIBILITY

Important controls must have:

* Clear labels
* Keyboard accessibility
* Visible focus states
* Sufficient contrast
* Tooltips where needed

Security alerts should not rely only on color.

Use:

* Icon
* Text
* Severity label

along with color.

---

# 58. COMPONENT ARCHITECTURE

Suggested:

src/

components/

Header

Sidebar

StatusCard

CameraCard

LiveVideoPanel

VideoCanvas

DetectionOverlay

TrackingOverlay

ZonePolygon

ZoneEditor

ZonePoint

ZoneSettings

ZoneList

AlertBanner

IncidentCard

IncidentFeed

IncidentModal

IncidentDetails

IncidentTimeline

SnapshotViewer

PerformancePanel

StadiumOverview

LoadingState

ErrorState

EmptyState

pages/

Dashboard

Cameras

ZoneCalibration

Incidents

IncidentDetails

Analytics

SystemStatus

Settings

Login

services/

firebase

authService

zoneService

cameraService

incidentService

storageService

auditService

types/

Detection

Track

Zone

Incident

Camera

User

AuditEvent

---

# 59. DATA INTERFACES

Keep AI/CV data independent from UI components.

Detection object should conceptually contain:

person ID

bounding box

confidence

centroid

tracking state

Zone object:

zone ID

camera ID

name

polygon

severity

confidence threshold

dwell threshold

persistence threshold

active state

Incident object:

incident ID

camera ID

zone ID

person ID

timestamp

confidence

severity

centroid

snapshot

status

---

# 60. AI/UI SEPARATION

The UI must not depend directly on COCO-SSD implementation details.

Create an abstraction between:

AI engine

and

UI.

This allows the detection model to be changed later without redesigning the dashboard.

---

# 61. CANVAS REQUIREMENTS

Canvas must:

* Match video dimensions
* Resize with video
* Render polygons
* Render bounding boxes
* Render centroids
* Render labels
* Receive mouse interaction
* Support polygon editing

Canvas coordinate conversion must account for video scaling.

---

# 62. OPEN-CV.JS ROLE

OpenCV.js may be used for browser-side computer-vision processing where appropriate.

Do not use OpenCV.js unnecessarily for tasks that can be handled more efficiently by normal browser APIs.

The application should keep the processing pipeline lightweight.

---

# 63. MODEL LOADING

COCO-SSD must load asynchronously.

The application must:

1. Start application.
2. Initialize AI engine.
3. Load model.
4. Display loading state.
5. Confirm model readiness.
6. Begin detection.

Do not block the entire application while the AI model loads.

---

# 64. PERFORMANCE STRATEGY

The UI must avoid unnecessary React re-renders during high-frequency video processing.

Do not store every video frame or every detection update in global React state if it causes performance problems.

Use appropriate mutable references or rendering mechanisms for high-frequency Canvas updates.

The live detection loop should be optimized independently from normal UI state.

---

# 65. DETECTION FREQUENCY

The video may run at a higher FPS than AI inference.

The architecture should allow detection to run at a controlled rate while maintaining smooth rendering.

Example concept:

Video:

30 FPS

AI inference:

10–15 FPS

Tracking/rendering:

Continuous where practical.

The exact values must be benchmarked on the hackathon hardware.

---

# 66. PERFORMANCE PRIORITY

If there is a conflict between:

Decorative UI

and

Real-time detection performance

always prioritize detection performance.

If there is a conflict between:

Animation

and

Canvas rendering

prioritize Canvas/video responsiveness.

---

# 67. SECURITY UI PRINCIPLES

The interface must make these immediately visible:

1. System health
2. Active incidents
3. Camera status
4. Zone status
5. AI status
6. Evidence
7. Operator response

The operator should not need to navigate through multiple pages to discover an active critical incident.

---

# 68. FINAL DASHBOARD CONCEPT

┌──────────────────────────────────────────────────────────────┐
│ 🛡️ STADIUMSENTINEL        SYSTEM ONLINE 🟢   OPERATOR        │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ DASHBOARD    │  LIVE CAMERA                                  │
│              │                                               │
│ CAMERAS      │  ┌─────────────────────────────────────────┐ │
│              │  │                                         │ │
│ ZONES        │  │             LIVE VIDEO                  │ │
│              │  │                                         │ │
│ INCIDENTS    │  │       RESTRICTED ZONE                   │ │
│              │  │             ┌──────────┐                │ │
│ ANALYTICS    │  │             │    👤    │                │ │
│              │  │             │     ●    │ 🚨             │ │
│ SYSTEM       │  │             └──────────┘                │ │
│              │  │                                         │ │
│ SETTINGS     │  └─────────────────────────────────────────┘ │
│              │                                               │
│              │ FPS 24 | INFERENCE 42ms | PERSONS 7          │
├──────────────┴───────────────────────────────────────────────┤
│ 🚨 ACTIVE INCIDENTS                                          │
│                                                               │
│ CRITICAL | PITCH | CAM-03 | PERSON #17 | 10:42:18           │
│ [SNAPSHOT] [VIEW] [ACKNOWLEDGE]                             │
└───────────────────────────────────────────────────────────────┘

---

# 69. IMPLEMENTATION PRIORITY

Antigravity must implement in this order.

## PHASE 1 — Application Shell

React

TypeScript

Vite

Tailwind

Navigation

Dashboard mock UI

---

## PHASE 2 — Video + Canvas

Video element

Canvas overlay

Canvas/video coordinate synchronization

---

## PHASE 3 — Zone Calibration

Polygon drawing

Polygon editing

Normalized coordinates

Zone configuration

Zone persistence

---

## PHASE 4 — AI

TensorFlow.js

COCO-SSD

Person detection

Bounding boxes

Confidence

---

## PHASE 5 — Tracking

Person association

Temporary Person IDs

Centroids

Tracking visualization

---

## PHASE 6 — Zone Intelligence

Centroid/polygon membership

Confidence threshold

Persistence frames

Dwell time

False-alert mitigation

---

## PHASE 7 — Incident System

Confirmed intrusion

Alert banner

Snapshot

Incident object

Incident feed

---

## PHASE 8 — Firebase

Authentication

Firestore

Storage

Real-time listeners

---

## PHASE 9 — Operator Workflow

Acknowledge

Resolve

Incident timeline

Audit information

---

## PHASE 10 — Performance

FPS

Inference latency

Render optimization

Camera status

AI status

---

# 70. DO NOT IMPLEMENT ALL FEATURES AT ONCE

Antigravity must work incrementally.

After every phase:

1. Run application.
2. Test feature.
3. Check browser console.
4. Fix errors.
5. Verify behavior.
6. Commit changes.

Do not generate the entire application in one step.

---

# 71. ACCEPTANCE CRITERIA

The final frontend must successfully demonstrate:

VIDEO

↓

COCO-SSD PERSON DETECTION

↓

PERSON TRACKING

↓

CENTROID

↓

INTERACTIVE RESTRICTED POLYGON

↓

ZONE MEMBERSHIP

↓

TEMPORAL CONFIRMATION

↓

INTRUSION

↓

VISUAL ALARM

↓

SNAPSHOT

↓

FIREBASE INCIDENT

↓

INCIDENT FEED

↓

ACKNOWLEDGMENT

↓

AUDITABLE HISTORY

---

# 72. HACKATHON SUCCESS CRITERIA

The final demonstration should clearly prove the four judging categories.

## 35%

Real-time person tracking and precise zone boundaries.

## 30%

False-alert reduction and excellent polygon calibration UX.

## 20%

Fast alarm + timestamped evidence snapshot.

## 15%

Smooth performance with measurable FPS and latency.

The application should optimize for these criteria before adding optional features.

---

# 73. PRODUCT POSITIONING

The frontend should communicate:

"StadiumSentinel transforms CCTV video into actionable physical-security incidents."

The system is an AI-assisted security platform.

It does not replace human security personnel.

The operator remains responsible for verification and response.

---

# 74. DEVELOPMENT INSTRUCTION FOR ANTIGRAVITY

Treat this document as the master frontend specification.

Do not make major architectural changes without checking against this specification.

Build incrementally.

Do not generate unnecessary features.

Prioritize:

1. Detection
2. Tracking
3. Zone precision
4. False-alert mitigation
5. Snapshot/alarm
6. Performance
7. Dashboard polish

The scoring criteria must drive development priorities.

The final result must be a working security product, not merely a visual mockup.
