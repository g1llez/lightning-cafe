# Lightning Café

**Sandbox Lightning** — simulateur éducatif Lightning Network (Bitcoin L1 + L2).

> Sats simulés seulement. Pas de vrai Bitcoin.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- i18next (FR / EN)
- Vitest
- GitHub Pages

## Development

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run build    # production build
npm run preview  # preview production build locally
npm test              # Vitest in /tests (GitHub runs this before Pages)
npm run test:session-api  # read-only health/404/CORS against cafe-session prod
```

## Sprint 1 — walking skeleton

Done. See [ROADMAP.md](ROADMAP.md) for versions (now: **v0.2.3**). Shared sessions: button **Café** on the live site (GitHub Pages); the API is not callable from localhost.

## License

See [LICENSE](LICENSE).

## Author

Gilles Auclair — gauclair@sarius.ca
