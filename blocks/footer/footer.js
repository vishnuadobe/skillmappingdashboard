function readFooterText(block) {
  const paragraphs = [...block.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
  if (paragraphs.length) {
    return paragraphs;
  }

  return [
    'Skill Mapper',
    'Adobe Customer Solutions',
  ];
}

export default function decorate(block) {
  const lines = readFooterText(block);

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'footer__wrapper';

  const top = document.createElement('div');
  top.className = 'footer__top';

  const title = document.createElement('p');
  title.className = 'footer__title';
  title.textContent = lines[0] || 'Skill Mapper';
  top.append(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'footer__subtitle';
  subtitle.textContent = lines[1] || 'Adobe Customer Solutions';
  top.append(subtitle);

  wrapper.append(top);

  const bottom = document.createElement('div');
  bottom.className = 'footer__bottom';

  const copyright = document.createElement('p');
  copyright.className = 'footer__copyright';
  copyright.textContent = `Copyright ${new Date().getFullYear()} Adobe. All rights reserved.`;
  bottom.append(copyright);

  const links = document.createElement('nav');
  links.className = 'footer__links';
  links.setAttribute('aria-label', 'Footer');

  const linkList = document.createElement('ul');
  linkList.className = 'footer__links-list';

  [
    { label: 'Org Chart', href: '/' },
    { label: 'Matrix', href: '/skill-matrix' },
  ].forEach((item) => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    link.className = 'footer__link';
    listItem.append(link);
    linkList.append(listItem);
  });

  links.append(linkList);
  bottom.append(links);
  wrapper.append(bottom);
  block.append(wrapper);
}
