# Inventra — admin panel (Inventory & Order Management)

React 19 + Vite 8 (JavaScript / JSX), Tailwind CSS 4, Motion animations, TanStack Query, React Router, Recharts.
Frontend only: until your backend exists, the app runs on realistic demo data stored in the browser.
The customer shop is a separate project in `../user-website`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Sign in with the demo account: **admin@inventra.test / demo1234** (the sign-in page has a "Use demo account" button).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (React hooks + React Compiler rules) |
| `npm test` | Vitest tests for the demo data layer |

## What's inside

- **Dashboard**: KPIs with sparklines, revenue vs previous period, orders by status, sales by category, top products, low stock, live activity.
- **Products**: table/grid views, filters in the URL, bulk archive/delete, create/edit/duplicate drawer, product page with stock history chart.
- **Categories**, **Suppliers** (detail drawer), **Customers** (detail page with spending chart).
- **Stock**: stock in / out / count adjustments, movement history, stock-flow chart, reorder suggestions grouped by supplier.
- **Purchase orders**: create (prefilled from reorder suggestions), place, receive partly or fully (stock updates).
- **Orders**: order builder with live totals, status tracker (pending → processing → shipped → delivered), payments, notes, printable tax invoice.
- **Reports**: sales and inventory reports with CSV export and print.
- **Settings**: profile and password, company details and currency, light/dark/system theme, reduce motion, notifications, data & API.
- App-wide: command palette (**Ctrl/⌘ + K**), notifications, toasts, confirm dialogs, responsive from 360px phones to desktops, dark mode.

## Product photos

In demo mode every product uses the photos listed in `src/api/mock/productPhotos.js` (they alternate).
Change the links there to change every product, or add a SKU to `PRODUCT_PHOTOS` to give one product its own photo.
A product created without an image link also gets one of these photos. The photos load from the web, so they need internet.
With a real backend, each product's `imageUrl` comes from your API.

## Connecting your backend

1. Copy `.env.example` to `.env`.
2. Set:
   ```
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
3. Restart `npm run dev`.

Every request then goes to your server through `src/api/client.js` (JSON, `Authorization: Bearer <token>`).
**Each file in `src/api/` starts with the exact endpoints, parameters and response shapes the UI expects**: build your
backend to match them. Highlights:

- Lists return `{ data: [...], meta: { page, pageSize, total, totalPages } }` and accept `page, pageSize, search, sortBy, sortDir` plus filters.
- Errors: any non-2xx status; send `{ "message": "...", "fieldErrors": { "field": "message" } }` to show errors next to form fields (409 / 422).
- Sign in: `POST /auth/login` → `{ token, user }`; `GET /auth/me` must return 401 for an invalid token (the app then signs out).
- Business rules your server should apply (the demo layer in `src/api/mock/` is a working reference):
  creating an order deducts stock, cancelling returns it, receiving a purchase order adds stock,
  order totals = subtotal − discount + tax (on the discounted amount) + shipping (`src/lib/pricing.js`).

## Folder map

```
src/
  api/            data layer: one module per resource (+ mock/ demo implementation)
  components/
    ui/           design-system components (Button, DataTable, Modal, Toaster, Stepper…)
    domain/       inventory pieces (status badges, pickers, stock & customer forms)
    charts/       chart components (the only place that uses recharts)
    layout/       sidebar, top bar, command palette, route guards
  context/        React contexts + hooks (auth, theme, toasts, confirm, preferences)
  providers/      context providers
  queries/        TanStack Query hooks used by the pages
  pages/          one folder per screen
  lib/            formatting, pricing, constants, motion presets, CSV
  styles/         Tailwind theme (colours, shadows, animations, light/dark tokens)
```
