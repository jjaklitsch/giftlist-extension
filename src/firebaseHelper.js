import { signOut, onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { auth } from "./firebase";

let user;
let token;

export async function updateUserToken(forceRefresh = false, u) {
  const usr = u !== undefined ? u : user;
  if (usr) {
    const tokenPromise = usr.getIdToken(forceRefresh);
    token = tokenPromise;
    token = await tokenPromise;
  } else {
    // wait until user arrives
    token = new Promise((resolve) =>
      setTimeout(
        () => resolve(user ? user.getIdToken(forceRefresh) : null),
        600
      )
    );
  }

  return token;
}

onAuthStateChanged(auth, async (u) => {
  user = u;
  await updateUserToken();
});

onIdTokenChanged(auth, async (user) => await updateUserToken(false, user));

/**
 * @returns {firebase.User | null}
 */
export const getUser = () => user;
/**
 * @returns {string | Promise<string> | null}
 */
export const getToken = (doRefresh) => {
  if (!doRefresh) return token;
  return updateUserToken(true);
}

export const firebaseLogout = () => signOut(auth)
    .then(() => console.info("firebaseLogout successful"))
    .catch((error) => console.error("firebaseLogout failed ", error));
