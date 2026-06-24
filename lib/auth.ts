import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export function subscribeAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb)
}
