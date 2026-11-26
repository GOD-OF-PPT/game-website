// Three alternative game directories, switchable using ?variant=A, B, or C.
const games = [
  { id: 'starline', title: '星际拆解站', subtitle: '再捡一件', tag: '太空策略', platform: '桌面浏览器', icon: '✦', shot: 'starline-play', art: 'starline', description: '驾驶打捞船穿过残骸带。把打捞来的设备塞进有限的船舱，决定继续深入，还是带着战利品返航。' },
  { id: 'chenyaun-v2', title: '剑阵万象', subtitle: '尘缘问道', tag: '动作冒险', platform: '桌面浏览器', icon: '◇', shot: 'chenyaun-v2-play', description: '从一场山雨踏入修仙世界，在走位、剑招和阵法之间寻找破局之法。' },
  { id: 'tdk', title: '月海信标', subtitle: '星区中继战役', tag: '机甲塔防', platform: '浏览器', icon: '◈', shot: 'tdk-play', description: '在月海搭建防御阵列，搭配机甲与军械，守住星区的中继信标。' },
  { id: 'fire-zombie', title: '棱镜蜂群', subtitle: '霓虹协议', tag: '跑酷射击', platform: '浏览器', icon: '▰', description: '左右拖动小队冲过霓虹干线，穿过增益门扩大队伍，迎战区域首领。' },
  { id: 'kong-rpg', title: '劫火重燃', subtitle: '西游动作 RPG', tag: '动作冒险', platform: '桌面浏览器', icon: '✷', shot: 'kong-rpg-play', description: '操纵西游角色纵横战场，以不同的武器与连招迎战妖将。' },
  { id: 'reborn-2020', title: '重生 2020', subtitle: 'AI 时代', tag: '经营模拟', platform: '桌面浏览器', icon: '◉', description: '带着未来的记忆回到 2020 年，在工作、投资和创业中安排好自己的时间。' },
  { id: 'wizzard', title: '奇术茶馆', subtitle: 'Wizzard', tag: '牌桌策略', platform: '浏览器', icon: '♣', description: '在魔法茶馆的牌桌上预测自己能赢几墩，再用手中的牌兑现判断。' },
];

const variants = { A: '精选展厅', B: '游戏杂志', C: '街机游戏厅' };
const variantKeys = Object.keys(variants);
const siteName = '小游戏站';
const header = document.querySelector('#header');
const main = document.querySelector('#main');
const footer = document.querySelector('#footer');
const switcher = document.querySelector('#switcher');
const dialog = document.querySelector('#game-detail');
let variant = getVariant();
let activeGame = games[0];

function element(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter(child => child != null));
  return node;
}

function button(className, label, onClick) {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function link(className, label, href) {
  const node = element('a', className, label);
  node.href = href;
  return node;
}

function image(asset, className = '', alt = '') {
  const node = element('img', className);
  node.src = `./assets/${asset}.webp`;
  node.alt = alt;
  node.decoding = 'async';
  return node;
}

function cover(game) {
  return image(game.id === 'starline' ? 'starline-cover' : game.id, 'cover');
}

function getVariant() {
  const key = new URLSearchParams(location.search).get('variant');
  return variantKeys.includes(key) ? key : 'A';
}

function changeVariant(key) {
  if (key === variant) return;
  variant = key;
  const url = new URL(location.href);
  url.searchParams.set('variant', key);
  url.hash = '';
  history.replaceState(null, '', url);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  switcher.querySelector('[aria-current="true"]').focus({ preventScroll: true });
}

function stepVariant(direction) {
  const index = variantKeys.indexOf(variant);
  changeVariant(variantKeys[(index + direction + variantKeys.length) % variantKeys.length]);
}

function brand() {
  return link('brand', element('span', 'wordmark', element('span', 'brand-mark', variant === 'B' ? '小' : '✦'), siteName), '#main');
}

function gamesNav(anchor, label) {
  return element('nav', 'site-nav', link('nav-active', label, anchor));
}

function gameCard(game, className = '') {
  const trigger = button(`game-card ${className}`, '', () => showGame(game));
  const arrow = element('span', 'card-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  trigger.replaceChildren(
    element('span', 'cover-frame', cover(game)),
    element('span', 'card-body', element('span', 'card-text', element('strong', '', game.title), element('span', 'card-tag', game.tag)), arrow),
  );
  return trigger;
}

function gameGrid(className, gamesToShow) {
  return element('div', className, ...gamesToShow.map(game => gameCard(game)));
}

function showGame(game) {
  const close = button('detail-close', '×', () => dialog.close());
  close.setAttribute('aria-label', '关闭游戏详情');
  const art = image(game.shot ?? game.art ?? game.id, 'detail-art', game.shot ? `${game.title} 游戏实拍` : `${game.title} 封面`);
  const title = element('h2', '', game.title);
  title.id = 'detail-title';
  const body = element('div', 'detail-body', element('p', 'eyeline', `${game.tag}　／　${game.platform}`), title,
    element('p', 'detail-copy', game.description), element('p', 'preview-note', '设计预览 · 试玩入口会在游戏上架后开放'));
  dialog.replaceChildren(close, art, body);
  dialog.showModal();
}

function renderShowroom() {
  const featured = games[0];
  header.replaceChildren(brand(), gamesNav('#catalog', '全部游戏'), element('span', 'header-label', '浏览器游戏合集'));
  const hero = element('section', 'showroom-hero', image(featured.art, 'hero-art'),
    element('div', 'showroom-copy', element('p', 'eyeline', `本期精选  /  ${featured.tag}`),
      element('h1', '', featured.title), element('p', 'showroom-subtitle', featured.subtitle),
      element('p', 'hero-description', featured.description),
      element('div', 'hero-actions', button('action action-primary', '查看游戏　↗', () => showGame(featured)), link('action action-secondary', '浏览全部', '#catalog'))));
  const catalog = element('section', 'showroom-catalog',
    element('div', 'section-title', element('h2', '', '全部游戏'), element('span', '', `${games.length} 款设计样例`)),
    gameGrid('showroom-grid', games.slice(1)),
  );
  catalog.id = 'catalog';
  main.replaceChildren(hero, catalog);
}

function renderMagazine() {
  const featured = games[4];
  header.replaceChildren(brand(), element('span', 'magazine-headline', '独立游戏选刊'), gamesNav('#catalog', '浏览目录  ↓'));
  const lead = element('section', 'magazine-lead',
    element('div', 'magazine-heading', element('p', 'eyeline', '封面故事'),
      element('h1', '', '劫火', element('br'), '重燃'), element('p', 'magazine-description', featured.description),
      button('magazine-action', '阅读游戏卡　→', () => showGame(featured))),
    element('figure', 'magazine-figure', cover(featured),
      element('figcaption', '', element('span', '', featured.subtitle), element('span', '', '封面 · 游戏原画'))),
  );
  const catalog = element('section', 'magazine-catalog',
    element('div', 'section-title', element('h2', '', '本期游戏'), element('span', '', '游戏目录')),
    gameGrid('magazine-grid', games.filter(game => game !== featured)),
  );
  catalog.id = 'catalog';
  main.replaceChildren(lead, catalog);
}

function arcadeStation(game) {
  const station = button('arcade-station', '', () => {
    activeGame = game;
    updateArcade();
  });
  station.dataset.game = game.id;
  const thumbnail = cover(game);
  station.replaceChildren(thumbnail, element('span', 'station-copy', element('strong', '', game.title), element('span', '', game.tag)), element('span', 'station-arrow', '›'));
  return station;
}

function updateArcade() {
  for (const station of main.querySelectorAll('.arcade-station')) {
    station.setAttribute('aria-pressed', String(station.dataset.game === activeGame.id));
  }
  const screen = main.querySelector('.arcade-screen');
  const game = activeGame;
  screen.replaceChildren(
    element('div', 'monitor-bar', element('span', 'monitor-on', '已选游戏'), element('span', '', game.platform)),
    element('div', 'monitor-image', image(game.shot ?? game.art ?? game.id, 'cover', game.shot ? `${game.title} 游戏实拍` : `${game.title} 封面`)),
    element('div', 'monitor-control',
      element('div', 'monitor-info', element('p', 'eyeline', game.tag), element('h2', '', game.title), element('p', 'monitor-description', game.description)),
      button('action arcade-action', '查看游戏　↗', () => showGame(game))),
  );
}

function renderArcade() {
  header.replaceChildren(brand(), gamesNav('#catalog', '选台列表'), element('span', 'arcade-headline', '网页游戏厅'));
  const catalog = element('div', 'arcade-catalog', ...games.map(arcadeStation));
  catalog.id = 'catalog';
  const screen = element('section', 'arcade-screen');
  screen.setAttribute('aria-label', '当前选择的游戏');
  main.replaceChildren(element('div', 'arcade-title', element('h1', '', '今天玩什么？'), element('span', '', '选择一台，查看游戏画面。')),
    element('div', 'arcade-layout', catalog, screen));
  updateArcade();
}

function renderSwitcher() {
  const previous = button('switch-arrow', '‹', () => stepVariant(-1));
  const next = button('switch-arrow', '›', () => stepVariant(1));
  previous.setAttribute('aria-label', '上一版');
  next.setAttribute('aria-label', '下一版');
  const options = variantKeys.map(key => {
    const control = button('switch-option', element('span', '', key, element('span', 'switch-name', ` ${variants[key]}`)), () => changeVariant(key));
    control.setAttribute('aria-label', `${key} ${variants[key]}`);
    if (key === variant) control.setAttribute('aria-current', 'true');
    return control;
  });
  switcher.replaceChildren(previous, ...options, next);
}

function render() {
  document.body.dataset.variant = variant;
  document.title = `${variants[variant]} · ${siteName}设计预览`;
  ({ A: renderShowroom, B: renderMagazine, C: renderArcade })[variant]();
  footer.replaceChildren(element('span', '', siteName), element('span', '', '首页设计预览'));
  renderSwitcher();
}

document.addEventListener('keydown', event => {
  if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, [contenteditable]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepVariant(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

render();
