# EPL Tracker — Premier League Scores & Rankings

A lightweight, macOS-styled web app that displays English Premier League standings, recent results, and upcoming fixtures.

![Dark themed Mac-style app](https://img.shields.io/badge/theme-dark-1e1e1e) ![EPL](https://img.shields.io/badge/league-Premier%20League-38003c)

## Features

- **League Standings** — Full table with position, points, goal difference, and recent form
- **Recent Results** — Scores from the last 14 days
- **Upcoming Matches** — Fixtures for the next 21 days
- **Auto-refresh** — Data updates every 5 minutes
- **macOS Native Look** — Dark theme with traffic lights, tabs, and smooth scrolling

## Quick Start

1. **Open directly** — Just open `index.html` in your browser. No build step required.

2. **Or serve locally** (recommended for API calls):
   ```bash
   # Python
   python3 -m http.server 8000

   # Node.js
   npx serve .
   ```
   Then visit `http://localhost:8000`

## API Key (Optional but Recommended)

This app uses the free [football-data.org](https://www.football-data.org) API. The free tier allows 10 requests per minute without a key, but you may hit rate limits.

To get your own free API key:

1. Register at https://www.football-data.org/client/register
2. Open `app.js` and set your key:
   ```js
   const API_TOKEN = 'your-api-key-here';
   ```

## Making it a Mac App

To run this as a standalone Mac app using Safari:

1. Open `index.html` in Safari (or your local server URL)
2. Go to **File → Add to Dock**
3. The app will appear in your Dock and run in its own window

Alternatively, use [Nativefier](https://github.com/nativefier/nativefier):
```bash
npx nativefier "http://localhost:8000" --name "EPL Tracker"
```

## Tech Stack

- Vanilla HTML, CSS, JavaScript — no frameworks, no dependencies
- [football-data.org API](https://www.football-data.org) for live EPL data
- [Inter font](https://fonts.google.com/specimen/Inter) via Google Fonts

## License

MIT
