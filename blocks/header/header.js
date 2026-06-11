import logout, { getSessionUser } from '../../scripts/auth.js';
import buildViewToggle from '../../scripts/view-toggle.js';

export default async function decorate(block) {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Main navigation');

  // Brand / logo — wraps in a home link
  const brand = document.createElement('a');
  brand.className = 'header__brand';
  brand.href = '/';
  brand.setAttribute('aria-label', 'Adobe home');

  try {
    const resp = await fetch('/header.plain.html');
    if (resp.ok) {
      const tmp = document.createElement('div');
      tmp.innerHTML = await resp.text();
      const picture = tmp.querySelector('picture');
      const img = tmp.querySelector('img');
      if (picture) {
        brand.append(picture);
      } else if (img) {
        brand.append(img);
      } else {
        // Fall back to first element's text content (e.g. authored "Adobe")
        const first = tmp.firstElementChild;
        brand.textContent = first ? first.textContent.trim() : 'Adobe';
      }
    } else {
      brand.textContent = 'Adobe';
    }
  } catch {
    brand.textContent = 'Adobe';
  }

  // Logout button
  const actions = document.createElement('div');
  actions.className = 'header__actions';
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'header__logout-btn';
  logoutBtn.type = 'button';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', logout);
  actions.append(logoutBtn);

  nav.append(brand, actions);
  block.textContent = '';
  block.append(nav);

  // Inject the view toggle for managers, left of the logout button.
  try {
    const user = await getSessionUser();
    if (user?.isManager) {
      const currentView = window.location.pathname.startsWith('/employee-details') ? 'report' : 'entry';
      actions.prepend(buildViewToggle(currentView));
    }
  } catch { /* leave header unchanged if session lookup fails */ }
}
