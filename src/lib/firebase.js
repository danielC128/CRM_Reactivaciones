import admin from "firebase-admin";

if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  admin.initializeApp({ credential: admin.credential.cert(svc) });
}
const db = admin.firestore();

export default db;
