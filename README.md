# BJ Beauty · Web y reservas

Estética y bienestar: diseño y laminado de cejas, manicura y pedicura. WhatsApp 611 296 406.

Proyecto derivado de la plantilla `las-greenlanters-nails` (Vite + React + Express + SQLite).

## Arranque

```bash
cp .env.example .env     # rellena SMTP y STAFF_PIN
npm install
npm run dev:full         # compila Vite e inicia Express (web + API) en http://localhost:3000
```

## Notas

- La portada, el logotipo (`src/components/BJLogo.tsx`) y los colores (rosa `#E0407F`, oro `#B8923A`, ciruela `#2B0F1E`) siguen el banner de BJ Beauty.
- Textos, servicios y galería se editan desde Staff (Cabina Staff). El botón de contacto de la portada usa los campos `instagram_*` apuntando a WhatsApp.
- Pendiente: precios y duración de cada servicio, horarios reales y fotos de galería.


## Despliegue en EasyPanel y almacenamiento persistente

La aplicación guarda toda la información operativa en SQLite. En producción, la base de datos debe residir en un volumen persistente montado en `/app/data`.

1. En el servicio de EasyPanel, abre **Storage / Persistent Storage** y crea un volumen llamado `bj-beauty-data`.
2. Monta ese volumen en la ruta exacta `/app/data` del contenedor.
3. Define `DB_PATH=/app/data/bjbeauty.db` en las variables de entorno.
4. La imagen ejecuta Node con el usuario sin privilegios `node` (UID 1000). Si EasyPanel permite definir permisos del volumen, concede lectura y escritura a UID/GID 1000.
5. Antes de activar el volumen en una instalación que ya tenga datos, haz una copia de seguridad de `/app/data/bjbeauty.db` y copia la base de datos existente al volumen. No montes un volumen vacío sobre el directorio actual sin rescatar primero la base de datos.
6. Reinicia el servicio y comprueba que las citas, clientes, servicios, galería y configuración siguen presentes. Después, recrea el contenedor y repite la comprobación.

La imagen declara `VOLUME ["/app/data"]` y establece `DB_PATH` por defecto. Esto documenta el punto de montaje, pero **no crea por sí solo el volumen persistente de EasyPanel**: el montaje debe configurarse en el servicio.

### Copias de seguridad

Copia periódicamente el archivo `bjbeauty.db` desde el volumen persistente a un almacenamiento independiente. Para una copia consistente de SQLite, utiliza `sqlite3 .backup` o detén brevemente el servicio antes de copiar el archivo; no dependas de copiar el fichero mientras se está escribiendo.
