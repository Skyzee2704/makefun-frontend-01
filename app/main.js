// A make.fun frontend: four surfaces on hash routes, each with its own URL.
//
//   #/                              the bounty board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/profile/<handle>              an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture. One fetch per view:
// the API layer caches answers for a minute, so going back costs nothing.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const searchInput = document.getElementById('q');
let boardShown = 12;

function errorPage(message) {
  return `<h1>Something went wrong</h1><p>${message}</p><p><a href="#/">Back to the board</a></p>`;
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const leader = hash.match(/^#\/bounty\/([^/]+)\/leaderboard\/?$/);
  const bountyMatch = hash.match(/^#\/bounty\/([^/]+)\/?$/);
  const profileMatch = hash.match(/^#\/profile\/([^/]+)\/?$/);
  try {
    if (leader) {
      const slug = decodeURIComponent(leader[1]);
      document.title = `Leaderboard | ${slug} | make.fun bounties`;
      app.innerHTML = leaderboard(await getLeaderboard(slug));
    } else if (bountyMatch) {
      const b = await getBounty(decodeURIComponent(bountyMatch[1]));
      document.title = `${b.title} | make.fun bounties`;
      app.innerHTML = bounty(b);
    } else if (profileMatch) {
      const p = await getProfile(decodeURIComponent(profileMatch[1]));
      document.title = `@${p.handle} | make.fun bounties`;
      app.innerHTML = profile(p);
    } else {
      document.title = 'make.fun bounties';
      app.innerHTML = board(await getBounties(), searchInput.value, boardShown);
      const more = document.getElementById('more');
      if (more) more.addEventListener('click', () => {
        boardShown += 12;
        render();
      });
    }
  } catch (err) {
    document.title = 'make.fun bounties';
    app.innerHTML = errorPage('make.fun did not answer. Check your connection and try again.');
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

searchInput.addEventListener('input', () => {
  boardShown = 12;
  if ((location.hash || '#/') === '#/') render();
  else location.hash = '#/';
});
document.getElementById('search').addEventListener('submit', (event) => event.preventDefault());
window.addEventListener('hashchange', render);
render();
