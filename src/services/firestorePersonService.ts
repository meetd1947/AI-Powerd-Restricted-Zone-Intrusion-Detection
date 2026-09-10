import { AuthorizedPerson } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const COLLECTION_NAME = 'authorizedPersons';

/** Save or update an authorized person in Firestore */
export async function savePersonToFirestore(person: AuthorizedPerson): Promise<void> {
  try {
    const personRef = doc(db, COLLECTION_NAME, person.id);
    // person contains id, name, role, photoUrl (120x120 base64 thumbnail), descriptor (128-float array), registeredAt
    await setDoc(personRef, {
      ...person,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to save authorized person to Firestore (fallback to local only):', error);
  }
}

/** Delete an authorized person from Firestore */
export async function deletePersonFromFirestore(id: string): Promise<void> {
  try {
    const personRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(personRef);
  } catch (error) {
    console.warn('Failed to delete authorized person from Firestore:', error);
  }
}

/** Subscribe to live authorized persons updates from Firestore */
export function subscribeToPersonsFromFirestore(
  onUpdate: (persons: AuthorizedPerson[]) => void,
  onError?: (error: any) => void
) {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const persons: AuthorizedPerson[] = [];
        snapshot.forEach((docSnap) => {
          persons.push(docSnap.data() as AuthorizedPerson);
        });
        onUpdate(persons);
      },
      (error) => {
        console.warn('Firestore authorized persons subscription error (using fallback):', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    if (onError) onError(error);
    return () => {};
  }
}
