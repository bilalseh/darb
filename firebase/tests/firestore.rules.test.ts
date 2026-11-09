// Runs against the Firestore emulator: `pnpm test:rules` at the repo root.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-darb',
    firestore: { rules: readFileSync(resolve(import.meta.dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice' });
    await setDoc(doc(db, 'users/alice/skills/guitar'), { name: 'Guitar' });
    await setDoc(doc(db, 'users/bob'), { displayName: 'Bob' });
    await setDoc(doc(db, 'config/public'), { featured: true });
  });
});

const asAlice = () => env.authenticatedContext('alice').firestore();
const asBob = () => env.authenticatedContext('bob').firestore();
const signedOut = () => env.unauthenticatedContext().firestore();

describe('users/{uid}', () => {
  it('lets a user read their own profile and nested data', async () => {
    const db = asAlice();
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
    await assertSucceeds(getDoc(doc(db, 'users/alice/skills/guitar')));
    await assertSucceeds(getDocs(collection(db, 'users/alice/skills')));
  });

  it("blocks reading another user's data", async () => {
    const db = asBob();
    await assertFails(getDoc(doc(db, 'users/alice')));
    await assertFails(getDoc(doc(db, 'users/alice/skills/guitar')));
    await assertFails(getDocs(collection(db, 'users/alice/skills')));
  });

  it('blocks signed-out reads', async () => {
    await assertFails(getDoc(doc(signedOut(), 'users/alice')));
  });

  it('blocks listing every user', async () => {
    await assertFails(getDocs(collection(asAlice(), 'users')));
  });

  it("blocks every client write, even to the user's own data", async () => {
    const db = asAlice();
    await assertFails(setDoc(doc(db, 'users/alice/skills/piano'), { name: 'Piano' }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { plan: 'pro' }));
    await assertFails(deleteDoc(doc(db, 'users/alice/skills/guitar')));
    await assertFails(setDoc(doc(db, 'users/carol'), { displayName: 'Carol' }));
  });
});

describe('everything outside users/{uid}', () => {
  it('is closed by default', async () => {
    await assertFails(getDoc(doc(asAlice(), 'config/public')));
    await assertFails(setDoc(doc(asAlice(), 'config/public'), { featured: false }));
  });

  it('keeps placement answer keys away from the quiz taker', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'assessmentKeys/alice__guitar'), { quiz: {} });
    });

    await assertFails(getDoc(doc(asAlice(), 'assessmentKeys/alice__guitar')));
  });

  it('keeps module quiz answer keys away from the quiz taker', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'quizKeys/alice__guitar__0'), { questions: [] });
    });

    await assertFails(getDoc(doc(asAlice(), 'quizKeys/alice__guitar__0')));
  });

  it('keeps the global AI usage counter private', async () => {
    await assertFails(getDoc(doc(asAlice(), 'aiUsage/2026-11-09')));
  });

  it('lets users read their own AI usage', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice/usage/2026-11-09'), { aiRequests: 3 });
    });

    await assertSucceeds(getDoc(doc(asAlice(), 'users/alice/usage/2026-11-09')));
    await assertFails(setDoc(doc(asAlice(), 'users/alice/usage/2026-11-09'), { aiRequests: 0 }));
  });
});
