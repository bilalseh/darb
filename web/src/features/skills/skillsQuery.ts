import type { Skill } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';

import { db } from '../../lib/firestore';

export const skillsQueryKey = (uid: string) => ['skills', uid] as const;

/** Reads straight from Firestore (docs/adr/0002). Rules let users read only their own data. */
export async function fetchSkills(uid: string): Promise<Skill[]> {
  const snapshot = await getDocs(
    query(collection(db, 'users', uid, 'skills'), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs.map((doc) => {
    const data: Record<string, unknown> = doc.data();
    const createdAt = data['createdAt'];
    // Only the API writes these documents (rules deny client writes), so the shape is trusted;
    // timestamps are converted to the ISO strings the shared type describes.
    return {
      ...data,
      id: doc.id,
      createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : createdAt,
    } as Skill;
  });
}

export function skillsQueryOptions(uid: string) {
  return queryOptions({ queryKey: skillsQueryKey(uid), queryFn: () => fetchSkills(uid) });
}
