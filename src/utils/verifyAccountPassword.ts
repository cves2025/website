import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import { auth } from "../firebase/config";

/**
 * Confirms that `password` belongs to the currently signed-in account by
 * re-authenticating the user against Firebase Auth. This is the standard
 * "enter your password to confirm" gate used before sensitive actions such as
 * deleting the students of a whole class.
 *
 * @param email - the logged-in user's email from the auth context. When it is
 *        missing, the email on the Firebase auth user is used as a fallback.
 * @returns an user-facing error message when the password cannot be verified,
 *          or `null` when the password was accepted.
 */
export async function verifyAccountPassword(
  email: string | null | undefined,
  password: string
): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return "You are not signed in. Please log in again.";
  }

  const accountEmail = email ?? currentUser.email;
  if (!accountEmail) {
    return "Your account has no email on file, so the password cannot be verified.";
  }

  try {
    await reauthenticateWithCredential(
      currentUser,
      EmailAuthProvider.credential(accountEmail, password)
    );
    return null;
  } catch (cause) {
    const code = (cause as { code?: string })?.code ?? "";
    switch (code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      default:
        return "Password could not be verified. Please try again.";
    }
  }
}