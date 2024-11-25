import firebase, { ServiceAccount } from "firebase-admin";
import serviceAccount from "../../montra-dev-429606-firebase-adminsdk-opuej-f234f508aa.json";
firebase?.initializeApp({
  credential: firebase.credential.cert(serviceAccount as ServiceAccount),
});

export { firebase };
