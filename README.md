# QR Menu (v3)

A small React-based QR menu app for restaurants. This repo is configured as a Vite project for easy local development and deployment.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Deploy (Coolify / any static host)

- Coolify can deploy this as a Node/Vite app using the `npm run build` command.
- The production output is in `dist/`.

## Customization

- Menu data lives in `src/App.jsx` under the `INITIAL_STORE` constant.
- The app stores data in `localStorage` and can optionally sync with Supabase if you configure access keys.
