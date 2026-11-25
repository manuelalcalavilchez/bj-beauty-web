# BJ Beauty · Web y reservas

Estética y bienestar: diseño y laminado de cejas, manicura y pedicura. WhatsApp 611 296 406.

Proyecto derivado de la plantilla `las-greenlanters-nails` (Vite + React + Express + SQLite).

## Arranque

```bash
cp .env.example .env     # rellena SMTP y STAFF_PIN
npm install
npm run dev:full         # API (server.js) + web en http://localhost:3002
```

## Notas

- La portada, el logotipo (`src/components/BJLogo.tsx`) y los colores (rosa `#E0407F`, oro `#B8923A`, ciruela `#2B0F1E`) siguen el banner de BJ Beauty.
- Textos, servicios y galería se editan desde Staff (Cabina Staff). El botón de contacto de la portada usa los campos `instagram_*` apuntando a WhatsApp.
- Pendiente: precios y duración de cada servicio, horarios reales y fotos de galería.
