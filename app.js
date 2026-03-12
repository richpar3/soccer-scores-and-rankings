// ============================================
// EPL Tracker — Premier League Web App
// Uses football-data.org free tier API
// ============================================

const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'PL';
const STORAGE_KEY = 'epl-tracker-api-token';

// ---- State ----
let apiToken = localStorage.getItem(STORAGE_KEY) || '';
let demoMode = false;

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
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeySave = document.getElementById('api-key-save');
const apiKeyDemo = document.getElementById('api-key-demo');

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

// ---- API Key Modal ----
function showModal() {
  loadingEl.classList.add('hidden');
  apiKeyModal.classList.remove('hidden');
  apiKeyInput.value = apiToken;
  apiKeyInput.focus();
}

function hideModal() {
  apiKeyModal.classList.add('hidden');
}

apiKeySave.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiKeyInput.focus();
    return;
  }
  apiToken = key;
  localStorage.setItem(STORAGE_KEY, key);
  demoMode = false;
  hideModal();
  loadAll();
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') apiKeySave.click();
});

apiKeyDemo.addEventListener('click', () => {
  demoMode = true;
  hideModal();
  loadAllDemo();
});

// ---- API Fetch Wrapper ----
async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'X-Auth-Token': apiToken }
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error('Invalid API key. Please check your token.');
    }
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---- Standings Renderer ----
function renderStandings(table, seasonLabel) {
  standingsSeason.textContent = seasonLabel;

  standingsBody.innerHTML = table.map(row => {
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
            ${crestUrl ? `<img class="team-crest" src="${escapeAttr(crestUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
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

// ---- Matches Renderer ----
function renderMatches(matches, container, mode) {
  if (!matches.length) {
    container.innerHTML = `<div class="no-matches">No ${mode === 'results' ? 'recent results' : 'upcoming matches'} found.</div>`;
    return;
  }

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
            ${homeCrest ? `<img src="${escapeAttr(homeCrest)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
            <span>${escapeHtml(home.shortName || home.name)}</span>
          </div>
          ${centerContent}
          <div class="match-team away">
            ${awayCrest ? `<img src="${escapeAttr(awayCrest)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
            <span>${escapeHtml(away.shortName || away.name)}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}

// ---- Live Data Loading ----
async function loadStandings() {
  const data = await apiFetch(`/competitions/${COMPETITION}/standings`);
  const standing = data.standings.find(s => s.type === 'TOTAL');
  if (!standing) return;
  const seasonLabel = `${data.season.startDate.slice(0, 4)}/${data.season.endDate.slice(0, 4)}`;
  renderStandings(standing.table, seasonLabel);
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

async function loadAll() {
  loadingEl.classList.remove('hidden');
  hideError();
  removeDemoBadge();

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

// ---- Demo Data ----
function getDemoData() {
  const teams = [
    { name: 'Arsenal', shortName: 'Arsenal' },
    { name: 'Liverpool', shortName: 'Liverpool' },
    { name: 'Manchester City', shortName: 'Man City' },
    { name: 'Chelsea', shortName: 'Chelsea' },
    { name: 'Aston Villa', shortName: 'Aston Villa' },
    { name: 'Brighton & Hove Albion', shortName: 'Brighton' },
    { name: 'Newcastle United', shortName: 'Newcastle' },
    { name: 'Manchester United', shortName: 'Man United' },
    { name: 'Tottenham Hotspur', shortName: 'Spurs' },
    { name: 'Nottingham Forest', shortName: "Nott'm Forest" },
    { name: 'Fulham', shortName: 'Fulham' },
    { name: 'West Ham United', shortName: 'West Ham' },
    { name: 'AFC Bournemouth', shortName: 'Bournemouth' },
    { name: 'Brentford', shortName: 'Brentford' },
    { name: 'Crystal Palace', shortName: 'Crystal Palace' },
    { name: 'Wolverhampton Wanderers', shortName: 'Wolves' },
    { name: 'Everton', shortName: 'Everton' },
    { name: 'Leicester City', shortName: 'Leicester' },
    { name: 'Ipswich Town', shortName: 'Ipswich' },
    { name: 'Southampton', shortName: 'Southampton' }
  ];

  const forms = ['W,W,D,W,W', 'W,W,W,D,L', 'W,D,W,W,D', 'D,W,W,L,W', 'W,L,W,W,D',
    'D,D,W,W,L', 'W,W,L,D,W', 'L,W,D,W,L', 'W,L,W,D,D', 'D,W,L,W,W',
    'L,D,W,W,D', 'W,L,D,L,W', 'D,W,L,W,L', 'L,W,W,D,L', 'W,D,L,L,W',
    'L,L,W,D,W', 'D,L,W,L,D', 'L,D,L,W,L', 'L,L,D,L,W', 'L,L,L,D,L'];

  const standingsTable = teams.map((team, i) => {
    const played = 30;
    const won = Math.max(0, 22 - i * 1);
    const draw = Math.min(8, 3 + Math.floor(i * 0.4));
    const lost = played - won - draw;
    const gf = Math.max(20, 72 - i * 3);
    const ga = Math.max(18, 22 + i * 2);
    return {
      position: i + 1,
      team: { name: team.name, shortName: team.shortName, crest: '' },
      playedGames: played,
      won,
      draw,
      lost,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDifference: gf - ga,
      points: won * 3 + draw,
      form: forms[i]
    };
  });

  // Generate demo results (last few days)
  const now = new Date();
  const demoResults = [];
  const matchups = [
    [0, 3], [1, 6], [4, 2], [7, 5], [8, 9],
    [10, 11], [12, 14], [15, 13], [16, 17], [18, 19]
  ];

  matchups.forEach(([h, a], idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (idx < 5 ? 2 : 7));
    d.setHours(15 + (idx % 3), 0, 0, 0);
    const hg = Math.floor(Math.random() * 4);
    const ag = Math.floor(Math.random() * 3);
    demoResults.push({
      utcDate: d.toISOString(),
      status: 'FINISHED',
      homeTeam: { name: teams[h].name, shortName: teams[h].shortName, crest: '' },
      awayTeam: { name: teams[a].name, shortName: teams[a].shortName, crest: '' },
      score: { fullTime: { home: hg, away: ag } }
    });
  });

  // Generate demo upcoming matches
  const demoUpcoming = [];
  const upcomingMatchups = [
    [3, 1], [2, 0], [5, 8], [6, 4], [9, 7],
    [11, 10], [14, 12], [13, 15], [17, 16], [19, 18]
  ];

  upcomingMatchups.forEach(([h, a], idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() + (idx < 5 ? 3 : 10));
    d.setHours(15 + (idx % 4), 0, 0, 0);
    demoUpcoming.push({
      utcDate: d.toISOString(),
      status: 'TIMED',
      homeTeam: { name: teams[h].name, shortName: teams[h].shortName, crest: '' },
      awayTeam: { name: teams[a].name, shortName: teams[a].shortName, crest: '' },
      score: { fullTime: { home: null, away: null } }
    });
  });

  return { standingsTable, demoResults, demoUpcoming };
}

function loadAllDemo() {
  loadingEl.classList.remove('hidden');
  hideError();

  const { standingsTable, demoResults, demoUpcoming } = getDemoData();

  renderStandings(standingsTable, '2025/2026');
  renderMatches(demoResults, resultsList, 'results');
  renderMatches(demoUpcoming, upcomingList, 'upcoming');

  addDemoBadge();
  lastUpdatedEl.textContent = 'Demo mode — sample data';
  loadingEl.classList.add('hidden');
}

function addDemoBadge() {
  removeDemoBadge();
  const badge = document.createElement('span');
  badge.className = 'demo-badge';
  badge.id = 'demo-indicator';
  badge.textContent = 'DEMO';
  badge.style.cursor = 'pointer';
  badge.title = 'Click to enter API key';
  badge.addEventListener('click', showModal);
  document.querySelector('.titlebar-center').appendChild(badge);
}

function removeDemoBadge() {
  const existing = document.getElementById('demo-indicator');
  if (existing) existing.remove();
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

// ---- Refresh ----
refreshBtn.addEventListener('click', () => {
  if (demoMode) {
    loadAllDemo();
  } else if (apiToken) {
    loadAll();
  } else {
    showModal();
  }
});

// Auto-refresh every 5 minutes (only for live mode)
setInterval(() => {
  if (!demoMode && apiToken) loadAll();
}, 5 * 60 * 1000);

// ---- Startup ----
if (apiToken) {
  loadAll();
} else {
  showModal();
}
