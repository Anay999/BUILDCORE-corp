# BuildCore Mobile PWA — Setup

## Start the mobile app

```bash
cd construction-ai-system/mobile
npm install
npm run dev
```

App opens at **http://localhost:3001**

> Your backend must be running on port 5000. The Vite proxy auto-forwards all `/api` calls to it.

## Install on your phone (PWA)

1. Open `http://YOUR_PC_IP:3001` in Chrome on your phone
   - Find your PC's IP: run `ipconfig` (Windows) → look for IPv4 Address
   - Example: `http://192.168.1.5:3001`
2. Tap the **three-dot menu** (⋮) in Chrome
3. Select **"Add to Home Screen"** or **"Install App"**
4. Done — BuildCore appears as a native app icon on your home screen

## Pages included

| Bottom Tab | Pages |
|-----------|-------|
| Home | Dashboard with live KPIs, quick actions |
| Projects | Project list, Project detail (Overview/Tasks/Issues/Team/Finance tabs) |
| DSR | Daily Site Report submit & history |
| Alerts | Contract/tender/task/stock alerts |
| More | Tasks, Issues, Attendance, Timelog, Materials, Inventory, Vendors, POs, Tenders, Contracts, Equipment, Payroll, Requisitions, Settings |

## Notes

- Desktop version (port 3000) is completely separate — untouched
- All data is shared — same backend, same PostgreSQL database
- Works offline (service worker caches the app shell)
