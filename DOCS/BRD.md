# StadiumSentinel

## AI-Powered Cricket Stadium Restricted-Zone Security System

# Backend & Firebase Requirements Document

**Version:** 1.0
**Project Type:** Hackathon Prototype
**Frontend:** React + TypeScript + Tailwind CSS + Canvas API
**Computer Vision:** TensorFlow.js + COCO-SSD + OpenCV.js
**Backend / Cloud:** Firebase
**Database:** Cloud Firestore
**Authentication:** Firebase Authentication
**Evidence Storage:** Firebase Cloud Storage

---

# 1. Backend Objective

The backend is responsible for providing the persistent security infrastructure behind the StadiumSentinel frontend.

The backend must manage:

* User authentication
* Security operator accounts
* Camera configuration
* Restricted-zone configuration
* Incident records
* Incident status
* Incident snapshots
* Audit logs
* Security acknowledgments
* Application settings
* Real-time synchronization

The backend must NOT unnecessarily perform the real-time AI inference.

Real-time person detection and zone processing should primarily run client-side using:

TensorFlow.js + COCO-SSD + Canvas API + OpenCV.js.

Firebase should persist the resulting security events.

---

# 2. High-Level Architecture

The target architecture is:

CCTV / Demo Video

↓

React Application

↓

TensorFlow.js / COCO-SSD

↓

Person Detection

↓

Tracking Layer

↓

Centroid Calculation

↓

Polygon Zone Engine

↓

Temporal Intrusion Confirmation

↓

Incident Engine

↓

Firebase

├── Authentication
├── Firestore
├── Storage
└── Real-time synchronization

↓

Security Dashboard

---

# 3. Firebase Services

Use the following Firebase services.

## Firebase Authentication

Purpose:

* Operator login
* Operator identity
* Role management
* Session management

Preferred authentication methods for MVP:

* Email/password

Optional:

* Google authentication

---

# 4. User Roles

Support basic role-based access.

## SECURITY_OPERATOR

Permissions:

* View cameras
* View zones
* View incidents
* Acknowledge incidents
* Review snapshots

## SECURITY_ADMIN

Permissions:

* Everything an operator can do
* Create/edit/delete zones
* Configure cameras
* Configure alert thresholds
* Manage operators

Do not implement complicated enterprise RBAC unless required.

---

# 5. User Data Model

Firestore collection:

users

Example conceptual structure:

users/{userId}

Fields:

* uid
* displayName
* email
* role
* active
* createdAt
* lastLoginAt

Role:

SECURITY_OPERATOR

or

SECURITY_ADMIN

Do not store passwords in Firestore.

Firebase Authentication must handle credentials.

---

# 6. Stadium Configuration

Create a stadium configuration collection.

Conceptual:

stadiums/{stadiumId}

Fields:

* name
* location
* active
* createdAt
* updatedAt

For the hackathon demo, one stadium is sufficient.

Example:

stadiums/stadium-demo

name:

Ahmedabad Cricket Stadium

status:

ACTIVE

---

# 7. Camera Management

Firestore collection:

cameras

Each camera document should contain:

* cameraId
* name
* location
* streamType
* streamUrl
* status
* active
* createdAt
* updatedAt

Example:

CAM-01

Name:

Main Pitch Camera

Location:

Pitch

Stream type:

DEMO_VIDEO

Status:

ONLINE

Important:

For the hackathon prototype, support prerecorded video.

The architecture should allow future RTSP integration without redesigning the database.

---

# 8. Camera Status

Supported statuses:

ONLINE

OFFLINE

DEGRADED

UNKNOWN

The frontend should be able to display these statuses.

The backend should store the last known status.

Fields:

status

lastHeartbeatAt

lastError

---

# 9. Restricted Zone Data Model

Firestore collection:

zones

Each zone should contain:

* zoneId
* stadiumId
* cameraId
* name
* type
* severity
* polygon
* confidenceThreshold
* dwellTimeMs
* persistenceFrames
* active
* createdBy
* createdAt
* updatedAt

---

# 10. Polygon Storage

Polygon points must NOT be stored as screen-specific pixel coordinates.

Store normalized coordinates.

Example concept:

x: 0.25

y: 0.30

This allows the same polygon to work when the video is resized.

Polygon structure:

[
{ x, y },
{ x, y },
{ x, y },
{ x, y }
]

The frontend is responsible for converting normalized coordinates into actual Canvas coordinates.

---

# 11. Zone Severity

Supported values:

LOW

MEDIUM

HIGH

CRITICAL

Recommended stadium configuration:

Pitch:

CRITICAL

Player Dugout:

HIGH

Equipment Area:

MEDIUM

Service Area:

MEDIUM

These are configurable and should not be hard-coded into the detection engine.

---

# 12. Zone Detection Configuration

Each zone should support:

### Confidence threshold

Example:

0.60

### Minimum dwell time

Example:

500 milliseconds

### Detection persistence

Example:

5 frames

These values exist to support false-alert mitigation.

The frontend uses these values during real-time detection.

Firebase stores the configuration.

---

# 13. Incident Data Model

This is the most important backend entity.

Firestore collection:

incidents

Each incident should contain:

* incidentId
* stadiumId
* cameraId
* zoneId
* zoneName
* personId
* timestamp
* severity
* confidence
* centroid
* snapshotPath
* status
* detectionMethod
* createdAt
* acknowledgedAt
* acknowledgedBy
* resolvedAt
* resolvedBy

---

# 14. Incident Status

Supported states:

UNACKNOWLEDGED

ACKNOWLEDGED

RESOLVED

Example lifecycle:

UNACKNOWLEDGED

↓

ACKNOWLEDGED

↓

RESOLVED

Do not delete incidents after acknowledgment.

Incidents are security records and should remain available for review.

---

# 15. Incident Creation Workflow

When the frontend confirms an intrusion:

1. Generate a unique incident ID.
2. Capture the relevant frame.
3. Upload snapshot to Firebase Storage.
4. Obtain the storage reference/path.
5. Create an incident document in Firestore.
6. Store timestamp.
7. Store camera information.
8. Store zone information.
9. Store person ID.
10. Store confidence.
11. Store severity.
12. Set status to UNACKNOWLEDGED.

The complete operation should happen as close to the detection event as practical.

---

# 16. Duplicate Incident Prevention

The backend must support idempotent incident creation.

A single person remaining inside a restricted zone must NOT create hundreds of incidents.

The frontend detection engine should maintain intrusion state.

The backend should also avoid accidental duplicate writes.

Use a deterministic or client-generated incident identifier where appropriate.

Conceptual:

Person #17

Zone: PITCH

Entry:

10:42:18

Incident:

INC-001

Person remains inside:

No new incident

Person exits:

Incident lifecycle ends

Person enters again:

INC-002

---

# 17. Snapshot Storage

Use Firebase Cloud Storage for incident evidence.

Recommended logical path:

incidents/{incidentId}/snapshot.jpg

Optional future structure:

incidents/{incidentId}/before.jpg

incidents/{incidentId}/during.jpg

incidents/{incidentId}/after.jpg

For MVP, one primary snapshot is sufficient.

---

# 18. Snapshot Metadata

Store metadata in Firestore:

* snapshotPath
* snapshotCreatedAt
* cameraId
* incidentId

Do not store large image binary data directly inside Firestore documents.

---

# 19. Incident Acknowledgment

When a security operator clicks:

ACKNOWLEDGE

Update the incident:

status:

ACKNOWLEDGED

acknowledgedBy:

currentUser.uid

acknowledgedAt:

server timestamp

The frontend must immediately reflect the new state.

---

# 20. Incident Resolution

Allow authorized users to mark an incident:

RESOLVED

Store:

resolvedBy

resolvedAt

Do not remove the incident.

---

# 21. Audit Log

Create a separate collection:

auditLogs

Every important security action should generate an audit record.

Examples:

* INCIDENT_CREATED
* INCIDENT_ACKNOWLEDGED
* INCIDENT_RESOLVED
* ZONE_CREATED
* ZONE_UPDATED
* ZONE_DISABLED
* ZONE_DELETED
* CAMERA_UPDATED
* USER_LOGIN

Audit log fields:

* auditId
* actorId
* actorRole
* action
* entityType
* entityId
* timestamp
* metadata

---

# 22. Example Audit Timeline

INC-001

10:42:13

INCIDENT_CREATED

10:42:14

SNAPSHOT_CAPTURED

10:42:21

INCIDENT_ACKNOWLEDGED

10:42:48

INCIDENT_RESOLVED

This should be visible from the incident details page.

---

# 23. Real-Time Synchronization

Use Firestore real-time listeners where appropriate.

The dashboard should automatically update when:

* New incident occurs
* Incident is acknowledged
* Incident is resolved
* Zone configuration changes
* Camera status changes

The operator should not need to manually refresh the browser.

---

# 24. Incident Feed

The backend must support retrieving incidents ordered by timestamp.

The dashboard should show:

Newest first.

Example:

INC-104

CRITICAL

Pitch

CAM-03

10:42:18

UNACKNOWLEDGED

---

# 25. Incident Filtering

Support filtering by:

* Date
* Camera
* Zone
* Severity
* Status

Example:

Status:

UNACKNOWLEDGED

Zone:

PITCH

Severity:

CRITICAL

---

# 26. Incident Search

Support searching by:

* Incident ID
* Camera ID
* Zone name
* Person ID

Do not build an unnecessarily complex search engine for the MVP.

---

# 27. Dashboard Statistics

The backend should support data needed for:

### Total incidents today

### Active incidents

### Critical incidents

### Incidents by zone

### Incidents by severity

### Acknowledged incidents

### Unacknowledged incidents

The frontend can calculate simple statistics from retrieved incident data where appropriate.

Avoid unnecessary aggregation infrastructure for the hackathon MVP.

---

# 28. Performance Data

The frontend should calculate real-time technical metrics such as:

* FPS
* Inference latency
* Detection count
* Tracking count

The backend does not need to store every frame's performance data.

If performance history is required, store periodic summaries rather than per-frame records.

---

# 29. Security Rules

Firestore security rules are mandatory.

Users must authenticate before accessing protected data.

Conceptually:

UNAUTHENTICATED

→ No access

SECURITY_OPERATOR

→ Read cameras

→ Read zones

→ Read incidents

→ Acknowledge incidents

SECURITY_ADMIN

→ All operator permissions

→ Create/update/delete zones

→ Manage camera configuration

---

# 30. Storage Security

Incident snapshots must not be publicly writable.

Only authenticated users should be able to access security evidence.

Operators should have read access.

Authorized users can create incident snapshots.

Do not expose incident evidence through unrestricted public URLs.

---

# 31. Data Validation

Validate important fields before writing:

* Camera ID exists
* Zone ID exists
* Severity is valid
* Status is valid
* Confidence is within expected range
* Polygon has valid points
* Required timestamps exist

Never trust arbitrary client input simply because the client UI restricts it.

---

# 32. Timestamp Handling

Use Firebase server timestamps for important backend events.

Examples:

* Incident created
* Incident acknowledged
* Incident resolved
* Zone created
* Zone updated
* Audit event created

The frontend may display timestamps in local time.

---

# 33. Client/Backend Responsibility

## Client

Responsible for:

* Video rendering
* TensorFlow.js inference
* COCO-SSD detection
* Tracking
* Centroid calculation
* Polygon membership
* Temporal confirmation
* Real-time visual alerts
* FPS measurement

## Firebase

Responsible for:

* Authentication
* Persistence
* Incident records
* Zone configuration
* Camera configuration
* Snapshot storage
* Audit records
* Real-time synchronization

This separation is mandatory for the MVP architecture.

---

# 34. Offline / Network Failure Handling

The application should gracefully handle temporary Firebase connectivity problems.

If an incident occurs while Firebase is temporarily unavailable:

1. Keep the incident in temporary client-side state.
2. Display the alert immediately.
3. Attempt synchronization when connectivity returns.
4. Avoid creating duplicate incidents.

The security alert must NOT depend on waiting for Firebase.

This is important because real-time detection should remain responsive.

---

# 35. Firebase Failure Principle

Critical rule:

Firebase unavailable

≠

AI detection stops.

The browser should continue detection and local alerting where possible.

Persistence can synchronize later.

---

# 36. Environment Configuration

Firebase configuration must NOT be hard-coded throughout the application.

Use environment configuration.

Conceptual variables:

Firebase API key

Auth domain

Project ID

Storage bucket

Messaging sender ID

App ID

Do not commit secret credentials or service-account private keys to GitHub.

---

# 37. Firebase Project Environments

Support:

Development

and

Production

configuration.

For the hackathon, development is sufficient, but configuration should be separated so production settings can be added later.

---

# 38. Service Layer

Create a Firebase service abstraction.

Suggested conceptual modules:

firebase/

* firebaseConfig
* authService
* incidentService
* zoneService
* cameraService
* storageService
* auditService
* userService

React components should not contain large amounts of Firebase database logic.

Keep Firebase operations inside service modules.

---

# 39. Error Handling

Every Firebase operation should handle errors.

Examples:

Snapshot upload failed

→ Display warning

Incident write failed

→ Keep local pending incident

Authentication failed

→ Display clear error

Permission denied

→ Explain insufficient privileges

Network unavailable

→ Display offline indicator

---

# 40. Loading States

Provide UI states for:

Loading incidents

Loading zones

Loading cameras

Uploading snapshot

Saving zone

Acknowledging incident

Resolving incident

Do not allow repeated clicks while an operation is already processing.

---

# 41. Security Incident Consistency

The system should maintain this logical relationship:

Camera

↓

Zone

↓

Person

↓

Incident

↓

Snapshot

↓

Audit

Every incident should be traceable back to:

* Camera
* Zone
* Detection event
* Evidence
* Operator response

---

# 42. Data Retention

For hackathon MVP:

Keep incident records indefinitely within the demo Firebase project.

For a real deployment, retention should be configurable according to:

* Venue policy
* Privacy requirements
* Applicable law
* Storage limits

Do not implement automatic deletion in the MVP unless specifically required.

---

# 43. Privacy Principles

The system should NOT implement facial recognition.

Store only the information necessary for the intrusion event.

The system identifies:

Person #17

rather than:

Person's real identity.

This reduces unnecessary personal-data processing.

---

# 44. Backend Acceptance Criteria

Backend is complete when:

### Authentication

* User can log in.
* User role is available.
* Unauthorized users cannot access protected data.

### Zones

* Zones can be created.
* Polygon coordinates are stored.
* Zone configuration persists.
* Zones can be edited.
* Zones can be disabled.

### Cameras

* Camera configuration persists.
* Camera status can be displayed.

### Incidents

* Confirmed intrusion creates one incident.
* Incident contains camera, zone, person, timestamp, confidence and severity.
* Snapshot reference is stored.
* Incident status persists.

### Evidence

* Snapshot uploads to Firebase Storage.
* Authorized users can view it.

### Acknowledgment

* Operator can acknowledge.
* User and timestamp are stored.

### Audit

* Security actions create audit entries.

### Synchronization

* New incidents appear in the dashboard without manual refresh.

---

# 45. Development Order

Implement backend functionality in this exact order.

## Phase B1

Create Firebase project.

Configure:

* Authentication
* Firestore
* Storage

---

## Phase B2

Create authentication.

Implement:

* Login
* Logout
* Current-user state

---

## Phase B3

Create Firestore zone model.

Implement:

* Create zone
* Read zones
* Update zone
* Disable zone

---

## Phase B4

Create camera model.

Implement:

* Camera list
* Camera status
* Camera configuration

---

## Phase B5

Create incident model.

Implement:

* Create incident
* Read incidents
* Update status

---

## Phase B6

Add Firebase Storage.

Implement:

* Snapshot upload
* Snapshot retrieval

---

## Phase B7

Add acknowledgment.

Implement:

* Acknowledge
* Resolve
* Audit logging

---

## Phase B8

Add real-time listeners.

Dashboard automatically updates.

---

## Phase B9

Add security rules.

Verify unauthorized access is blocked.

---

## Phase B10

Test complete workflow.

VIDEO

↓

DETECTION

↓

TRACKING

↓

CENTROID

↓

ZONE ENTRY

↓

CONFIRMATION

↓

INCIDENT

↓

SNAPSHOT

↓

FIREBASE

↓

DASHBOARD

↓

ACKNOWLEDGE

↓

AUDIT

---

# 46. Antigravity Implementation Rules

Do not ask Antigravity to build the entire backend in one generation.

Implement one phase at a time.

After every phase:

1. Run the application.
2. Test the feature.
3. Check browser console.
4. Check Firebase Console.
5. Confirm Firestore data.
6. Confirm Storage data.
7. Commit to Git.

Do not move to the next phase until the current phase works.

---

# 47. Important Constraint

Do not move AI inference to a server unless there is a specific requirement.

The hackathon's specified architecture is:

TensorFlow.js

*

COCO-SSD

*

OpenCV.js

Therefore the primary real-time detection pipeline should remain browser-side.

Firebase is the persistence and synchronization layer.

---

# 48. Final Architecture

```
                USER / SECURITY OPERATOR
                          │
                          ▼
                 REACT + TYPESCRIPT
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
      LIVE VIDEO                   DASHBOARD
            │                           │
            ▼                           │
    TensorFlow.js                      │
            │                           │
      COCO-SSD                          │
            │                           │
      Person Detection                  │
            │                           │
            ▼                           │
        Tracking                        │
            │                           │
            ▼                           │
        Centroid                        │
            │                           │
            ▼                           │
     Polygon Zone Engine                │
            │                           │
            ▼                           │
   Temporal Confirmation                │
            │                           │
            ▼                           │
      🚨 INCIDENT                       │
            │                           │
    ┌───────┼────────┐                  │
    ▼       ▼        ▼                  │
Snapshot   Alert   Timestamp             │
    │                │                  │
    └────────┬───────┘                  │
             ▼                          │
      FIREBASE SERVICES ◄───────────────┘
             │
   ┌─────────┼──────────┐
   │         │          │
   ▼         ▼          ▼
```

Firestore  Storage     Auth
│         │          │
▼         ▼          ▼
Incidents   Evidence    Users
Zones       Snapshots   Roles
Cameras
Audit Logs

---

# 49. Final Product Principle

StadiumSentinel is not simply:

"An AI model detecting people."

It is:

"An AI-assisted physical-security incident management platform."

The system converts:

VIDEO

→

DETECTION

→

TRACKING

→

ZONE VALIDATION

→

INTRUSION CONFIRMATION

→

ALARM

→

EVIDENCE

→

INCIDENT

→

HUMAN ACKNOWLEDGMENT

→

AUDIT

The AI assists security personnel.

It does not autonomously identify or punish people.
