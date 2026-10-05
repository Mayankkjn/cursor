# Dashboard analytics

The "build an analytics dashboard" UI, built on the
[Whatfix dashboard boilerplate](https://github.com/shubham-bhatt50/whatfix-boilerplate)
(React + TypeScript + Tailwind CSS + the Navi design system components).

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build (tsc -b && vite build)
npm run preview  # serve the production build locally
```

## What's here

- `src/views/DashboardBuilderView.tsx` — the main flow: empty-state prompt box,
  a clarifying-questions chat, a generating state, and the final dashboard.
- `src/views/builderData.ts` — the question set and the mock data/copy
  generated per prompt topic.
- `src/components/dashboard/` — the header, empty state, and generated
  dashboard (toolbar, stat cards, ECharts line charts).
- `src/components/chat/` — the question card and the docked "Ask Whatfix AI"
  copilot panel.
- `src/components/ui/`, `src/components/layout/`, `src/components/charts/` —
  the boilerplate's design-system primitives (Button, Card, Modal, Sidebar,
  PageLayout, LineChart/BarChart/PieChart, etc.) carried over as-is so the
  rest of the boilerplate stays available for future screens.
