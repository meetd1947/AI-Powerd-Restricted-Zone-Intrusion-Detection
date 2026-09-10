export type NavTab = 
  | 'dashboard'
  | 'cameras'
  | 'zones'
  | 'incidents'
  | 'analytics'
  | 'settings';

export interface NavItem {
  id: NavTab;
  label: string;
  iconName: string;
}

export type CameraStatus = 
  | 'STOPPED'
  | 'REQUESTING'
  | 'READY'
  | 'DENIED'
  | 'ERROR';

export interface PolygonPoint {
  x: number; // Normalized (0.0 to 1.0)
  y: number; // Normalized (0.0 to 1.0)
}

export type ZoneType = 
  | 'Pitch'
  | 'Player Area'
  | 'Equipment Area'
  | 'Service Entrance'
  | 'Custom';

export type ZoneSeverity = 
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';

export interface RestrictedZone {
  id: string;
  name: string;
  type: ZoneType;
  severity: ZoneSeverity;
  points: PolygonPoint[]; // Normalized coordinates
  status: 'CONFIGURED' | 'EDITING' | 'DRAWING';
  minConfidence?: number;     // Minimum confidence threshold (0.0 to 1.0, e.g. 0.50)
  persistenceFrames?: number; // Minimum consecutive inside frames required (e.g. 5)
  minDwellSeconds?: number;   // Minimum dwell time required in seconds (e.g. 2.0)
  createdAt: string;
}

/** Bounding box in source-video pixels: [x, y, width, height] */
export type BBox = [number, number, number, number];

/** A single COCO-SSD frame-level person detection */
export interface PersonDetection {
  bbox: BBox;
  score: number;
}

export type IdentityState = 'AUTHORIZED' | 'UNKNOWN' | 'FACE_UNVERIFIED';

/** Legacy alias for backwards compatibility */
export type FaceRecognitionStatus = 'AUTHORIZING' | 'AUTHORIZED' | 'UNKNOWN' | 'FACE_UNVERIFIED';

export interface AuthorizedPerson {
  id: string;
  name: string;
  photoUrl: string; // Base64 data URL for reference thumbnail
  descriptor: number[]; // 128D face feature embedding vector (representative/mean)
  descriptors?: number[][]; // Multiple 128D face feature embedding vectors from video frames
  createdAt: string;
}

/** A persistent person track maintained by the person + face tracker */
export interface TrackedPerson {
  id: number;             // Monotonically increasing session ID
  label: string;          // "Person #N"
  bbox: BBox;             // Person bounding box [x, y, width, height] in video pixels
  score: number;          // Person detection confidence
  centerX: number;        // Normalized centroid X (0–1)
  centerY: number;        // Normalized centroid Y (0–1)
  isInsideAnyZone: boolean; // Zone-first filtering flag
  identityState: IdentityState;
  matchedPersonId?: string | null;
  matchedPersonName?: string | null;
  associatedFaceBBox?: BBox | null;
  similarityDistance?: number | null;
  age: number;            // Total frames track has existed
  missedFrames: number;   // Consecutive missed frames
}

/** For backwards compatibility with existing components/types */
export interface TrackedFace extends TrackedPerson {
  recognitionStatus: FaceRecognitionStatus;
}

export type IntrusionStatus = 
  | 'OUTSIDE'
  | 'PENDING_ENTRY'
  | 'CONFIRMED_INTRUSION'
  | 'PENDING_EXIT';

/** Runtime state for a tracked person's temporal validation relationship with a zone */
export interface PersonZoneState {
  personId: number;
  personLabel: string;
  identityState: IdentityState;
  matchedPersonName: string | null;
  zoneId: string;
  zoneName: string;
  zoneSeverity: ZoneSeverity;
  isRawInside: boolean;
  validConfidence: boolean;
  status: IntrusionStatus;
  persistenceCount: number;      // Current consecutive valid inside frames
  requiredPersistence: number;   // Target frames required (e.g. 5)
  enteredAt: number | null;      // Timestamp (ms) when PENDING_ENTRY began
  dwellTimeMs: number;           // Current elapsed dwell time in ms
  requiredDwellMs: number;       // Target dwell time required in ms (e.g. 2000)
  confirmedAt: string | null;    // ISO timestamp string when intrusion was confirmed
  exitCount: number;             // Exit debounce frame count
  updatedAt: number;
  // Backwards compatibility fields
  faceId?: number;
  faceLabel?: string;
  recognitionStatus?: FaceRecognitionStatus;
}

export type IncidentStatus = 'UNACKNOWLEDGED' | 'ACKNOWLEDGED' | 'RESOLVED';

/** Phase 8 Security Incident Record created on confirmed UNKNOWN face intrusion */
export interface SecurityIncident {
  id: string;                      // Unique incident ID (e.g. "INC-1001")
  timestamp: string;               // ISO 8601 timestamp string
  displayTime: string;             // Human-readable time e.g. "15:05:16 • 08 Sep 2026"
  cameraName: string;              // "CAM-01 — Laptop Camera"
  faceTrackId: number;             // Temporary face track ID e.g. 2
  faceLabel: string;               // "Face #2"
  identityStatus: FaceRecognitionStatus; // UNKNOWN
  matchedPersonName: string | null;// null
  zoneId: string;
  zoneName: string;
  zoneType: ZoneType;
  zoneSeverity: ZoneSeverity;
  confidence: number;              // Face detection confidence score (0-1)
  centroid: { x: number; y: number }; // Normalized centroid
  status: IncidentStatus;          // 'UNACKNOWLEDGED'
  snapshotUrl: string;             // Base64 JPEG evidence snapshot URL
  createdAt: string;               // Creation timestamp
}





