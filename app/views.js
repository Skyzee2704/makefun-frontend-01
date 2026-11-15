// The four surfaces, each a function from API data to HTML:
// the bounty board, a bounty's page, its leaderboard, an account's profile.

import { date, esc, isOpen, money, shortWallet, timeLeft, winRate } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'free');

/** One board row: title, live pot, fee, time left, entries, status. */
function boardRow(b) {
  const open = isOpen(b);
  return `
      <li class="row${open ? '' : ' ended'}">
        <a class="title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <span class="pot">${pot(b)}</span>
        <span class="fee">${fee(b)}</span>
        <span class="left">${timeLeft(b.deadline)}</span>
        <span class="entries">${b.submissionCount} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
        <span class="status">${open ? 'Open' : 'Ended'}</span>
      </li>`;
}

/** The bounty board, sorted by live pot, with a filter and a show-more pager. */
export function board(data, query, shown) {
  const q = (query ?? '').trim().toLowerCase();
  const items = data.items
    .filter((b) => !q || `${b.title} ${b.slug} ${b.category ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
  const openCount = items.filter(isOpen).length;
  const page = items.slice(0, shown);
  const rows = page.map(boardRow).join('');
  return `
    <h1>Open bounties</h1>
    <p class="lede">${items.length} bounties · ${openCount} still taking entries · rewards in USDC on Solana</p>
    <ul class="board">
      <li class="head" aria-hidden="true"><span>Bounty</span><span>Reward</span><span>Entry fee</span><span>Time left</span><span>Entries</span><span>Status</span></li>
      ${rows || '<li class="empty">No bounties match that search.</li>'}
    </ul>
    ${items.length > shown ? `<p><button type="button" id="more">Show more (${items.length - shown} left)</button></p>` : ''}`;
}

/** The rewards table: each place and its prize, with the live pot beside it. */
function rewardsTable(b) {
  const rewards = b.rewards ?? {};
  const rows = Object.entries(rewards)
    .map(([place, amount]) => `<tr><td>${place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : `${place}th`}</td><td>${money(amount)}</td></tr>`)
    .join('');
  return `<table class="rewards"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** One bounty's page: summary, facts, rewards, rules, leaderboard link. */
export function bounty(b) {
  const open = isOpen(b);
  return `
    <p class="crumb"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary)}</p>
    <dl class="facts">
      <dt>Live pot</dt><dd><strong>${pot(b)}</strong> <span class="dim">($${Number(b.rewardAmount).toLocaleString('en-US')} prize + $${Number(b.entryFeesUsd ?? 0).toLocaleString('en-US')} in entry fees)</span></dd>
      <dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'None'}</dd>
      <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
      <dt>Status</dt><dd>${open ? 'Open — taking entries' : 'Ended — no longer taking entries'}</dd>
      <dt>Entries</dt><dd>${b.submissionCount}</dd>
      <dt>Category</dt><dd>${esc(b.category ?? '—')}</dd>
    </dl>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <h2>Description</h2>
    <div class="description">${esc(b.description)}</div>
    <h2>Rules</h2>
    <details><summary>Read the rules</summary><div class="description">${esc(b.rules ?? '')}</div></details>
    <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">See the leaderboard →</a></p>`;
}

/** One leaderboard row: rank, entrant, win rate with interval, size. */
function leaderRow(e) {
  const v = e.values ?? {};
  return `
      <tr>
        <td>${e.rank}</td>
        <td><a href="#/profile/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${e.title ? `<br><span class="dim">${esc(e.title)}</span>` : ''}</td>
        <td>${winRate(v.judge)}</td>
        <td>${winRate(v.judge_low)} – ${winRate(v.judge_high)}</td>
        <td>${v.valid ? '✓' : '—'}</td>
        <td>${v.bytes ? `${Math.round(v.bytes / 1024)} KB` : '—'}</td>
      </tr>`;
}

/** A bounty's leaderboard, ranked by judge win rate. */
export function leaderboard(data) {
  const c = data.competition ?? {};
  const rows = (data.entries ?? []).map(leaderRow).join('');
  return `
    <p class="crumb"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title)}</a></p>
    <h1>${esc(c.title)} — leaderboard</h1>
    <p class="lede">${data.entries?.length ?? 0} ranked entries · win rate by AI judge, best first</p>
    <table class="leader">
      <thead><tr><th>#</th><th>Entrant</th><th>Win rate</th><th>90% interval</th><th>Valid</th><th>Size</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No entries yet.</td></tr>'}</tbody>
    </table>`;
}

/** An account's public profile: avatar, record, solutions, payouts. */
export function profile(p) {
  const r = p.record ?? {};
  const solutions = (p.solutions ?? [])
    .map((s) => {
      const c = s.competition ?? {};
      const slug = c.slug ?? s.slug ?? '';
      const entryTitle = s.title ?? c.title ?? slug;
      const compTitle = c.title ?? '';
      return `<li><a href="#/bounty/${encodeURIComponent(slug)}">${esc(entryTitle)}</a>${compTitle && compTitle !== entryTitle ? ` <span class="dim">· in ${esc(compTitle)}</span>` : ''}${s.placement ? ` — #${s.placement}` : ''}${s.prize_usd ? ` — ${money(s.prize_usd)}` : ''}</li>`;
    })
    .join('');
  const avatarUrl = typeof p.image === 'string' ? p.image : p.avatar?.url;
  const avatarSrc = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `https://make.fun${avatarUrl}`) : '';
  return `
    <p class="crumb"><a href="#/">All bounties</a></p>
    <div class="profile">
      ${avatarSrc ? `<img class="avatar" crossorigin="anonymous" src="${esc(avatarSrc)}" alt="" width="96" height="96">` : ''}
      <div>
        <h1>@${esc(p.handle)}</h1>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
        <p class="dim">Joined ${date(p.joined_at)}</p>
      </div>
    </div>
    <dl class="facts">
      <dt>Entered</dt><dd>${r.competitions_entered ?? 0}</dd>
      <dt>Placed</dt><dd>${r.competitions_placed ?? 0}</dd>
      <dt>Won</dt><dd>${r.competitions_won ?? 0}</dd>
      <dt>Podiums</dt><dd>${r.podium_finishes ?? 0}</dd>
      <dt>Prize money</dt><dd>${money(r.prize_usd ?? 0)}</dd>
      <dt>Wallet</dt><dd>${p.wallet?.address ? `<a href="${esc(p.wallet.explorer_url ?? '')}">${shortWallet(p.wallet.address)}</a>` : '—'}</dd>
    </dl>
    <h2>Solutions</h2>
    ${solutions ? `<ul>${solutions}</ul>` : '<p>No solutions yet.</p>'}
    <h2>Payouts</h2>
    <p>${(p.payouts ?? []).length ? `${p.payouts.length} payout(s) on record.` : 'No payouts yet.'}</p>`;
}
