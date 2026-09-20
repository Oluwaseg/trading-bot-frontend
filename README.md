# Profit Pilot

A modern, responsive Next.js dashboard for managing the Profit Pilot API. Built with React, TypeScript, Tailwind CSS, and Axios.

## Features

- 🚀 **Place Trades** - Click to place a single trade based on current EMA crossover signal
- 📊 **Monitor Open Positions** - View all active contracts in real-time
- ❌ **Close All Contracts** - Quickly close all open positions
- 📈 **Live Dashboard** - Monitor trading metrics and API status
- 🔄 **Auto-Refresh** - Dashboard refreshes every 10 seconds
- 🎨 **Modern UI** - Sleek dark theme with Tailwind CSS and smooth animations
- 💾 **Activity Logs** - View recent trading and system activity

## Setup

### Prerequisites

- Node.js 18+ installed
- Trading Bot API running on `http://localhost:4000`
- pnpm (recommended) or npm

### Installation

1. Install dependencies:

```bash
pnpm install
# or
npm install
```

2. Configure environment:
   - Copy `.env.example` to `.env.local`
   - Update `NEXT_PUBLIC_API_URL` if API is not on localhost:4000

```bash
cp .env.example .env.local
```

3. Start the development server:

```bash
pnpm dev
# or
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Dashboard Overview

- **Open Positions** - Shows count of active contracts
- **Database** - MongoDB connection status
- **API Status** - Trading API availability

### Actions

1. **Place Trade Button** - Places a single trade if:
   - No open positions exist
   - EMA crossover signal is present
   - API is responsive

2. **Close All Contracts** - Closes all open positions with confirmation

3. **Refresh Button** - Manually refresh dashboard data

### Activity Log

Shows recent trading events including:

- Trade placements
- Position closes
- Bot runs
- Backtest results

## Development

### Project Structure

```
app/
├── layout.tsx          # Root layout with metadata
├── page.tsx            # Main dashboard component
├── api-client.ts       # Axios API client and types
└── globals.css         # Tailwind CSS imports
```

### Building for Production

```bash
pnpm build
pnpm start
```

## Styling

- **Framework**: Tailwind CSS v4
- **Theme**: Dark slate with emerald/cyan accents
- **Components**: Custom components with glassmorphism effects
- **Responsive**: Mobile-first design with breakpoints

## API Integration

The dashboard consumes these API endpoints:

- `GET /api/health` - API and database status
- `POST /api/place-trade` - Place single trade
- `GET /api/open-contracts` - Fetch open positions
- `POST /api/close-contracts` - Close all positions
- `GET /api/logs` - Fetch activity logs

See the Trading Bot API documentation for details.

## Configuration

Edit `.env.local` to change API configuration:

```env
# API URL (default: http://localhost:4000/api)
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Notes

- Always use a **demo account** for testing
- Ensure the Trading Bot API is running before starting the dashboard
- Dashboard auto-refreshes every 10 seconds
- Use responsive design on mobile and desktop

## License

MIT
