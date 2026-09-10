import { SecurityIncident, IncidentStatus } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const INCIDENTS_STORAGE_KEY = 'stadium_sentinel_incidents';
const MAX_STORED_INCIDENTS = 50;

/** Retrieve all locally stored security incidents */
export function getStoredIncidents(): SecurityIncident[] {
  try {
    const stored = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: SecurityIncident[] = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn('Failed to parse stored incidents from localStorage.');
    return [];
  }
}

/** Save a new security incident record to local storage */
export function saveIncident(incident: SecurityIncident): SecurityIncident[] {
  const current = getStoredIncidents();

  // Duplicate check by ID
  if (current.some((inc) => inc.id === incident.id)) {
    return current;
  }

  // Prepend newest incident, keep up to MAX_STORED_INCIDENTS
  const updated = [incident, ...current].slice(0, MAX_STORED_INCIDENTS);

  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage full, trimming older snapshots…', err);
    // If quota exceeded, trim image URLs of older incidents
    const trimmed = updated.map((inc, index) => {
      if (index > 5) return { ...inc, snapshotUrl: '' };
      return inc;
    });
    try {
      localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // silent fallback
    }
  }

  return updated;
}

/** Update status of a security incident (UNACKNOWLEDGED -> ACKNOWLEDGED -> RESOLVED) */
export function updateIncidentStatus(id: string, status: IncidentStatus): SecurityIncident[] {
  const current = getStoredIncidents();
  const updated = current.map((inc) => (inc.id === id ? { ...inc, status } : inc));

  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to update incident status in storage.');
  }

  return updated;
}

/**
 * Remove the evidence snapshot from a stored incident.
 * Only clears snapshotUrl — all other incident metadata is preserved.
 * The Firestore record is NOT modified; this is a local-only operation.
 */
export function deleteIncidentSnapshot(id: string): SecurityIncident[] {
  const current = getStoredIncidents();
  const updated = current.map((inc) =>
    inc.id === id ? { ...inc, snapshotUrl: '' } : inc
  );

  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to delete snapshot from storage.');
  }

  return updated;
}

/**
 * Permanently remove a complete incident record from localStorage.
 * Only removes the incident with the given id; all others are untouched.
 * Call ONLY after Firestore deletion has succeeded.
 */
export function deleteFullIncident(id: string): SecurityIncident[] {
  const current = getStoredIncidents();
  const updated = current.filter((inc) => inc.id !== id);

  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to remove incident from localStorage.');
  }

  return updated;
}

/**
 * Permanently delete an incident document from Firestore.
 * THROWS on failure — the caller must not proceed with local deletion
 * if this rejects, so the operator sees an accurate error.
 */
export async function deleteIncidentFromFirestore(id: string): Promise<void> {
  const incidentRef = doc(db, 'incidents', id);
  // deleteDoc throws natively on network / permission errors.
  await deleteDoc(incidentRef);
}

/** Firestore: Save an incident record (without heavy base64 to keep within free limits) */
export async function saveIncidentToFirestore(incident: SecurityIncident): Promise<void> {
  try {
    const incidentRef = doc(db, 'incidents', incident.id);
    // Exclude large raw base64 frame data to save Firestore document bandwidth
    const { snapshotUrl, ...metadata } = incident;
    await setDoc(incidentRef, {
      ...metadata,
      hasLocalSnapshot: !!snapshotUrl,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Failed to save incident to Firestore (fallback to local only):', error);
  }
}

/** Firestore: Update incident status in cloud */
export async function updateIncidentStatusInFirestore(id: string, status: IncidentStatus): Promise<void> {
  try {
    const incidentRef = doc(db, 'incidents', id);
    await updateDoc(incidentRef, { status });
  } catch (error) {
    console.warn('Failed to update incident status in Firestore:', error);
  }
}

/** Firestore: Real-time listener for incidents ordered by timestamp */
export function subscribeToIncidentsFromFirestore(
  onUpdate: (incidents: SecurityIncident[]) => void,
  onError?: (error: any) => void
) {
  try {
    const q = query(
      collection(db, 'incidents'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const firestoreIncidents: SecurityIncident[] = [];
        snapshot.forEach((docSnap) => {
          firestoreIncidents.push(docSnap.data() as SecurityIncident);
        });
        onUpdate(firestoreIncidents);
      },
      (error) => {
        console.warn('Firestore subscription error (using local storage fallback):', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    if (onError) onError(error);
    return () => {};
  }
}

