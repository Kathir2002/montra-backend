import { config } from "dotenv";
import firebase, { ServiceAccount } from "firebase-admin";
config();

// import serviceAccount from "../../montra-dev-429606-firebase-adminsdk-opuej-f234f508aa.json";
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY!);

firebase?.initializeApp({
  credential: firebase.credential.cert(serviceAccount as ServiceAccount),
});

export { firebase };
