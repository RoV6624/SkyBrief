# App Store Preview Screenshots

Generate professional App Store screenshots by combining your real device screenshots with styled frames.

## Step 1: Take Screenshots

Take these 6 screenshots on your iPhone (or simulator at 1x):

| File Name | What to Capture |
|-----------|----------------|
| `1-briefing.png` | Briefing tab — station card + flight category + AI briefing |
| `2-route.png` | Route tab — submitted route with timeline dots + NavLog |
| `3-wb.png` | W&B tab — CG envelope graph with plotted points |
| `4-alerts.png` | Briefing tab — alert feed with violations or "GROUNDED" banner |
| `5-charts.png` | Charts tab — 2-column chart grid |
| `6-darkmode.png` | Any tab in Midnight Cockpit dark mode |

## Step 2: Drop PNGs

Place your screenshots into:

```
app-store-assets/screenshots/
  1-briefing.png
  2-route.png
  3-wb.png
  4-alerts.png
  5-charts.png
  6-darkmode.png
```

## Step 3: Capture Final Images

1. Open any `screenshot-*.html` file in **Chrome**
2. Open DevTools (Cmd+Option+I)
3. Right-click the `#capture` element in the Elements panel
4. Select **"Capture node screenshot"**
5. The saved PNG will be exactly **1290×2796px** — the required size for iPhone 6.7" App Store screenshots

Repeat for all 6 files.

## Step 4: Upload

Upload all 6 PNGs to **App Store Connect → App Store → iPhone 6.7" Display**.

## Dimensions

- Frame size: 1290×2796px (iPhone 15 Pro Max / 6.7" display)
- Device mockup: 860px wide with 68px border radius
- Required by App Store Connect for the 6.7" size class
