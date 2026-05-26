const DEFAULT_NAV = [
  { label: 'Org Chart', href: '/' },
  { label: 'Skill Matrix', href: '/skill-matrix' },
];

function readNavItems(block) {
  const items = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) {
      return;
    }

    const label = cells[0].textContent.trim();
    const href = cells[1].textContent.trim();

    if (label && href) {
      items.push({ label, href });
    }
  });

  return items.length ? items : DEFAULT_NAV;
}

export default function decorate(block) {
  const navItems = readNavItems(block);

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'header__wrapper';

  const brand = document.createElement('a');
  brand.className = 'header__brand';
  brand.href = '/';
  brand.textContent = 'Skill Mapper';
  wrapper.append(brand);

  const nav = document.createElement('nav');
  nav.className = 'header__nav';
  nav.setAttribute('aria-label', 'Primary');

  const list = document.createElement('ul');
  list.className = 'header__nav-list';

  navItems.forEach((item) => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    link.className = 'header__nav-link';
    listItem.append(link);
    list.append(listItem);
  });

  nav.append(list);
  wrapper.append(nav);
  block.append(wrapper);
}
