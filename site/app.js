import { games } from './games.js';

const playOrigin = new URL(document.documentElement.dataset.playOrigin);
const grid = document.querySelector('#game-grid');
const dialog = document.querySelector('#game-detail');

function element(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function picture(asset, className, description = '') {
  const node = element('img', className);
  node.src = `./assets/${asset}.webp`;
  node.alt = description;
  node.decoding = 'async';
  return node;
}

function playUrl(game) {
  return new URL(`games/${game.id}/`, playOrigin).href;
}

function playLink(game) {
  const arrow = element('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  const link = element('a', 'action action-primary', '开始试玩 ', arrow);
  link.href = playUrl(game);
  link.target = '_blank';
  link.rel = 'noopener';
  link.setAttribute('aria-label', `试玩${game.title}（在新标签页打开）`);
  return link;
}

function showGame(game) {
  const close = element('button', 'detail-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', '关闭游戏详情');
  close.addEventListener('click', () => dialog.close());

  const title = element('h2', '', game.title);
  title.id = 'detail-title';
  const asset = game.screen ?? game.cover ?? game.id;
  const art = picture(asset, 'detail-art', `${game.title}${game.screen ? '游戏画面' : '封面'}`);
  dialog.replaceChildren(close, art, element('div', 'detail-body',
    element('p', 'eyeline', `${game.genre} / ${game.device}`), title,
    element('p', 'detail-subtitle', game.subtitle),
    element('p', 'detail-copy', game.description), playLink(game)));
  dialog.showModal();
}

function gameCard(game) {
  const art = picture(game.cover ?? game.id, 'cover');
  art.loading = 'lazy';
  const arrow = element('span', 'card-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  const card = element('button', 'game-card', element('span', 'cover-frame', art),
    element('span', 'card-body', element('span', 'card-text', element('strong', '', game.title),
      element('span', 'card-tag', `${game.subtitle} · ${game.genre}`)), arrow));
  card.type = 'button';
  card.addEventListener('click', () => showGame(game));
  return card;
}

dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

document.querySelector('#featured-play').href = playUrl(games[0]);
document.querySelector('#catalog-count').textContent = `${games.length} 款游戏`;
grid.append(...games.map(gameCard));
