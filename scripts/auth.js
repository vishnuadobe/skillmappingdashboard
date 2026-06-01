import { clearUser } from './db.js';

export default async function logout() {
  await clearUser();
  window.location.replace('/');
}
