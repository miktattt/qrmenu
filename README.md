# QR Menu (v3)

A single-file React-based QR menu app for restaurants, written in plain JSX.

## Usage

1. Place `qr-menu-v3.jsx` in a React project (e.g., Vite, Create React App).
2. Import and render:

```jsx
import App from './qr-menu-v3.jsx';

function Root() {
  return <App />;
}
```

## Notes

- The app stores data in `localStorage` and can sync with Supabase if configured.
- Adjust restaurant menu data in the `INITIAL_STORE` constant.
