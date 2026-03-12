// ============================================
// EPL Tracker — Premier League Web App
// Uses football-data.org free tier API
// ============================================

const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'PL'; // Premier League

// Free-tier token (limited to 10 req/min). Users can replace with their own.
// Register at https://www.football-data.org/client/register for a free key.
const API_TOKEN = '';

const headers = API_TOKEN
  ? { 'X-Auth-Token': API_TOKEN }
  : {};

// ---- DOM Elements ----
const standingsBody = document.getElementById('standings-body');
const standingsSeason = document.getElementById('standings-season');
const resultsList = document.getElementById('results-list');
const upcomingList = document.getElementById('upcoming-list');
const loadingEl = document.getElementById('loading');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const errorDismiss = document.getElementById('error-dismiss');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedEl = document.getElementById('last-updated');

// ---- Tab Navigation ----
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
  });
});

// ---- Error Handling ----
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
}

errorDismiss.addEventListener('click', hideError);

// ---- API Fetch Wrapper ----
async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---- Standings ----
async function loadStandings() {
  const data = await apiFetch(`/competitions/${COMPETITION}/standings`);
  const standing = data.standings.find(s => s.type === 'TOTAL');
  if (!standing) return;

  const seasonLabel = `${data.season.startDate.slice(0, 4)}/${data.season.endDate.slice(0, 4)}`;
  standingsSeason.textContent = seasonLabel;

  standingsBody.innerHTML = standing.table.map(row => {
    const pos = row.position;
    let zoneClass = '';
    if (pos <= 4) zoneClass = 'zone-ucl';
    else if (pos === 5) zoneClass = 'zone-uel';
    else if (pos === 6) zoneClass = 'zone-uecl';
    else if (pos >= 18) zoneClass = 'zone-rel';

    const formBadges = (row.form || '').split(',').filter(Boolean).map(f =>
      `<span class="form-badge ${f.trim()}">${f.trim()}</span>`
    ).join('');

    const crestUrl = row.team.crest || '';

    return `
      <tr class="${zoneClass}">
        <td class="col-pos">${pos}</td>
        <td class="col-team">
          <div class="team-cell">
            <img class="team-crest" src="${escapeAttr(crestUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span class="team-name">${escapeHtml(row.team.shortName || row.team.name)}</span>
          </div>
        </td>
        <td class="col-num">${row.playedGames}</td>
        <td class="col-num">${row.won}</td>
        <td class="col-num">${row.draw}</td>
        <td class="col-num">${row.lost}</td>
        <td class="col-num">${row.goalsFor}</td>
        <td class="col-num">${row.goalsAgainst}</td>
        <td class="col-num">${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
        <td class="col-num col-pts">${row.points}</td>
        <td class="col-form"><div class="form-badges">${formBadges}</div></td>
      </tr>
    `;
  }).join('');
}

// ---- Matches ----
function renderMatches(matches, container, mode) {
  if (!matches.length) {
    container.innerHTML = `<div class="no-matches">No ${mode === 'results' ? 'recent results' : 'upcoming matches'} found.</div>`;
    return;
  }

  // Group by date
  const grouped = {};
  matches.forEach(m => {
    const dateKey = new Date(m.utcDate).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(m);
  });

  let html = '';
  for (const [date, group] of Object.entries(grouped)) {
    html += `<div class="match-date-group">`;
    html += `<div class="match-date-header">${escapeHtml(date)}</div>`;

    group.forEach(m => {
      const home = m.homeTeam;
      const away = m.awayTeam;
      const score = m.score;
      const isFinished = m.status === 'FINISHED';
      const homeGoals = score?.fullTime?.home;
      const awayGoals = score?.fullTime?.away;

      let centerContent;
      if (isFinished) {
        const homeWin = homeGoals > awayGoals;
        const awayWin = awayGoals > homeGoals;
        centerContent = `
          <div class="match-score">
            <span class="${homeWin ? 'match-winner' : ''}">${homeGoals}</span>
            &ndash;
            <span class="${awayWin ? 'match-winner' : ''}">${awayGoals}</span>
          </div>
        `;
      } else {
        const time = new Date(m.utcDate).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit'
        });
        const statusLabel = m.status === 'IN_PLAY' ? 'LIVE' :
                            m.status === 'PAUSED' ? 'HT' :
                            m.status === 'POSTPONED' ? 'PPD' : '';
        centerContent = `
          <div class="match-time">
            ${time}
            ${statusLabel ? `<div class="match-status">${statusLabel}</div>` : ''}
          </div>
        `;
      }

      const homeCrest = home.crest || '';
      const awayCrest = away.crest || '';

      html += `
        <div class="match-card">
          <div class="match-team home">
            <img src="${escapeAttr(homeCrest)}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span>${escapeHtml(home.shortName || home.name)}</span>
          </div>
          ${centerContent}
          <div class="match-team away">
            <img src="${escapeAttr(awayCrest)}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span>${escapeHtml(away.shortName || away.name)}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}

async function loadResults() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);

  const params = new URLSearchParams({
    status: 'FINISHED',
    dateFrom: formatDate(from),
    dateTo: formatDate(today)
  });

  const data = await apiFetch(`/competitions/${COMPETITION}/matches?${params}`);
  const sorted = (data.matches || []).sort((a, b) =>
    new Date(b.utcDate) - new Date(a.utcDate)
  );
  renderMatches(sorted, resultsList, 'results');
}

async function loadUpcoming() {
  const today = new Date();
  const to = new Date(today);
  to.setDate(to.getDate() + 21);

  const params = new URLSearchParams({
    status: 'SCHEDULED,TIMED',
    dateFrom: formatDate(today),
    dateTo: formatDate(to)
  });

  const data = await apiFetch(`/competitions/${COMPETITION}/matches?${params}`);
  const sorted = (data.matches || []).sort((a, b) =>
    new Date(a.utcDate) - new Date(b.utcDate)
  );
  renderMatches(sorted, upcomingList, 'upcoming');
}

// ---- Helpers ----
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Main Load ----
async function loadAll() {
  loadingEl.classList.remove('hidden');
  hideError();

  try {
    await Promise.all([
      loadStandings(),
      loadResults(),
      loadUpcoming()
    ]);
    lastUpdatedEl.textContent = `Updated: ${new Date().toLocaleTimeString('en-GB')}`;
  } catch (err) {
    console.error('Failed to load data:', err);
    showError(err.message || 'Failed to load data. Please try again.');
  } finally {
    loadingEl.classList.add('hidden');
  }
}

refreshBtn.addEventListener('click', loadAll);

// Auto-refresh every 5 minutes
setInterval(loadAll, 5 * 60 * 1000);

// Initial load
loadAll();
