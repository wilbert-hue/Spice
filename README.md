# Dashboard Frontend - Clean Version

This is a clean version of the dashboard frontend with all functionality and charts, but without any data files or API routes.

## Features

- ✅ All chart components (Bar, Line, Heatmap, Table, Waterfall, Bubble)
- ✅ All filter components (Geography, Segment, Year Range, Business Type)
- ✅ Interactive UI with tabs and vertical view modes
- ✅ Insights panel
- ✅ Export functionality
- ✅ Responsive design
- ❌ No data files (uses mock/empty data structure)
- ❌ No API routes

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

- `/components` - All React components (charts, filters, UI)
- `/lib` - Utility functions, types, store, mock data
- `/app` - Next.js app directory (pages, layout, styles)
- `/styles` - CSS animations and styles
- `/public` - Empty (no data files)

## Notes

- This version uses mock/empty data structures to allow the UI to render
- All charts will show empty states when no data is available
- You can connect your own data by updating the `createMockData()` function in `/lib/mock-data.ts`
- All API-related code has been removed

