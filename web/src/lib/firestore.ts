// Kept apart from ./firebase so the Firestore SDK only loads with the signed-in pages.
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { firebaseApp, useEmulators } from './firebase';

export const db = getFirestore(firebaseApp);

if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
}
