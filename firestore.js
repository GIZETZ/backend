import admin from 'firebase-admin';
import fs from 'fs';

export function initFirestore() {
  if (!admin.apps.length) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
      throw new Error('Fichier de clé de service Firestore manquant');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  return admin.firestore();
}
