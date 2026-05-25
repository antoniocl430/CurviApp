# CurviApp — Guía para Claude Code

Aplicación web de planificación de rutas para motociclistas que prioriza carreteras curvas y paisajísticas, inspirada en Calimoto y Stegra.io.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS v4 (con `@tailwindcss/vite`) |
| Mapas | Leaflet.js + react-leaflet (tiles OpenStreetMap) |
| Routing de mapas | OpenRouteService API (ORS) |
| Estado global | Zustand (con persistencia en localStorage) |
| Gráficos | Recharts (perfil de elevación) |
| Iconos | lucide-react |
| Utilidades CSS | clsx |

---

## Estructura de carpetas

```
src/
├── components/
│   ├── map/          # Todo lo relacionado con el mapa Leaflet
│   │   └── MapView.tsx           # Mapa principal, maneja clics y dibuja rutas
│   ├── route/        # Paneles de planificación
│   │   ├── RoutePlanner.tsx      # Panel lateral: waypoints, opciones, acciones
│   │   └── ElevationChart.tsx    # Gráfico de perfil de elevación (Recharts)
│   ├── ui/           # Componentes reutilizables "tontos" (sin lógica de negocio)
│   │   ├── Button.tsx
│   │   ├── Slider.tsx            # Control de curvosidad
│   │   └── Toggle.tsx            # Interruptores de opciones
│   └── layout/
│       └── Sidebar.tsx           # Barra lateral con navegación entre vistas
├── pages/            # Una página = una vista de la app
│   ├── PlannerPage.tsx           # Vista principal: mapa + panel lateral
│   ├── LibraryPage.tsx           # Biblioteca de rutas guardadas
│   └── SettingsPage.tsx          # Ajustes y configuración API key
├── store/
│   └── useAppStore.ts            # Store Zustand: toda la lógica de estado
├── services/
│   ├── ors/          # Cliente de la API de OpenRouteService
│   │   ├── client.ts             # fetch base autenticado
│   │   └── routing.ts            # calculateRoute(), lógica de curvosidad
│   └── gpx/          # Import/export de archivos GPX
│       ├── export.ts             # routeToGpx(), downloadGpx()
│       └── import.ts             # parseGpxToLatLngs()
├── types/
│   └── index.ts                  # Todos los tipos TypeScript del dominio
├── utils/
│   ├── nanoid.ts                 # Generador de IDs únicos
│   └── format.ts                 # formatDistance(), formatDuration(), formatElevation()
├── App.tsx                       # Router de vistas (usa activeView del store)
├── main.tsx                      # Punto de entrada React
└── index.css                     # Tailwind + variables CSS globales
```

---

## Tipos de dominio principales (`src/types/index.ts`)

```typescript
// Un punto GPS
LatLng { lat, lng }

// Un punto de paso en la ruta (el usuario hace clic en el mapa)
Waypoint { id, position: LatLng, label? }

// Opciones para calcular la ruta
RouteOptions {
  curviness: 0-1      // 0 = rápida, 1 = máximas curvas
  avoidHighways: bool
  avoidTolls: bool
  roundtrip?: { enabled, distance(km), direction(deg) }
}

// Una ruta calculada o guardada
Route {
  id, name, waypoints[], geometry: LatLng[],
  distanceKm, durationMin, elevationProfile[], elevationGainM,
  options: RouteOptions, createdAt: ISO string
}
```

---

## Estado global (`src/store/useAppStore.ts`)

El store Zustand centraliza todo el estado. Persiste en `localStorage` sólo `savedRoutes` y `routeOptions` (las rutas calculadas en memoria se pierden al recargar, que es el comportamiento correcto).

**Slices del store:**
- `activeView` — qué página se muestra ('planner' | 'library' | 'settings')
- `waypoints` — puntos que el usuario ha marcado en el mapa
- `routeOptions` — configuración de la próxima ruta
- `currentRoute` — ruta calculada actualmente visible
- `isCalculating` — loading state de la petición a ORS
- `savedRoutes` — biblioteca personal (persiste)

---

## Servicio de routing (`src/services/ors/`)

### Cómo funciona la "curvosidad"

ORS acepta un parámetro `green_factor` en el rango `-0.5` (evitar rutas verdes/escénicas) a `3.0` (preferir fuertemente rutas escénicas/paisajísticas).

```typescript
// En routing.ts
function curvinessToOptions(curviness: number) {
  const greenFactor = -0.5 + curviness * 3.5  // curviness 0→1 mapea a -0.5→3.0
  return { green: greenFactor }
}
```

Esto se combina con `avoid_features: ["highways"]` cuando `avoidHighways: true`.

### Variables de entorno necesarias

```bash
# Archivo .env (no subir a git, ya está en .gitignore)
VITE_ORS_API_KEY=tu_clave_aqui
```

Obtén una clave gratuita en https://openrouteservice.org (hasta 500 peticiones/día gratis).

---

## Configuración de Tailwind v4

No hay `tailwind.config.js`. La configuración se hace en `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-orange: #f97316;   /* usa: text-brand-orange, bg-brand-orange */
  --color-brand-dark: #1a1a2e;
  --color-brand-surface: #16213e;
  --color-brand-muted: #0f3460;
}
```

Y en `vite.config.ts`:
```typescript
import tailwindcss from '@tailwindcss/vite'
plugins: [react(), tailwindcss()]
```

---

## Paleta de colores de la app

| Token | Valor | Uso |
|-------|-------|-----|
| `#1a1a2e` | Azul muy oscuro | Fondo principal |
| `#16213e` | Azul oscuro | Sidebar |
| `#0f3460` | Azul medio | Acentos de fondo |
| `#f97316` | Naranja | Acento principal, rutas en mapa |
| `white/10..80` | Blanco con opacidad | Textos y bordes |

---

## Convenciones de código

### Componentes
- Un archivo = un componente, nombre en PascalCase
- Los componentes de página (`*Page.tsx`) componen componentes y no tienen lógica propia
- Los componentes en `ui/` son "tontos": sólo reciben props, no usan el store directamente
- Los componentes en `components/` pueden acceder al store

### Selectors del store (importante para performance)
```typescript
// BIEN: selector específico, sólo re-renderiza si cambia `waypoints`
const waypoints = useAppStore((s) => s.waypoints)

// MAL: selecciona todo, re-renderiza en cualquier cambio del store
const store = useAppStore()
```

### Estilos
- Usar clases de Tailwind directamente en JSX
- Para clases condicionales, usar `clsx()`:
  ```typescript
  import { clsx } from 'clsx'
  className={clsx('base-class', { 'conditional-class': condition })}
  ```
- Los colores del mapa (naranja de la polyline) van hardcodeados en los componentes de mapa, no en CSS

### TypeScript
- Siempre anotar el tipo de retorno de funciones que devuelven objetos complejos
- Usar `interface` para tipos de datos del dominio, `type` para uniones y utilidades
- Nunca usar `any`, usar `unknown` y hacer narrowing si es necesario

---

## Comandos útiles

```bash
npm run dev        # Servidor de desarrollo en http://localhost:5173
npm run build      # Build de producción en /dist
npm run preview    # Previsualizar el build de producción
npm run lint       # Linter ESLint
```

---

## Guía para subagentes (Claude Code)

Cuando trabajes con subagentes en este proyecto, aquí tienes el contexto clave que necesitan saber:

### Para añadir una nueva funcionalidad de mapa
1. Crear componente en `src/components/map/`
2. Usar hooks de `react-leaflet` (`useMap`, `useMapEvents`)
3. Importar siempre `leaflet/dist/leaflet.css` si el componente crea elementos Leaflet
4. El fix del icono de marcador (líneas con `L.Icon.Default.mergeOptions`) sólo hace falta hacerlo una vez en `MapView.tsx`

### Para añadir una nueva llamada a la API de ORS
1. Añadir la función en `src/services/ors/routing.ts` o crear un nuevo archivo en `src/services/ors/`
2. Usar `orsPost()` de `client.ts` para las peticiones (ya maneja auth y errores)
3. La API key viene de `import.meta.env.VITE_ORS_API_KEY`
4. Documentación ORS: https://openrouteservice.org/dev/#/api-docs

### Para añadir una nueva página/vista
1. Crear `src/pages/NombrePage.tsx`
2. Añadir el nuevo valor a `AppView` en `src/types/index.ts`
3. Añadir el case en `src/App.tsx`
4. Añadir el item de navegación en `src/components/layout/Sidebar.tsx` (array `NAV_ITEMS`)

### Para añadir un nuevo componente UI reutilizable
1. Crear en `src/components/ui/`
2. Sólo recibe props, no accede al store
3. Usar `clsx` para clases condicionales
4. Seguir la paleta de colores de la app (fondo oscuro azul, acento naranja)

### Problemas comunes y soluciones

**Los iconos de Leaflet no se muestran**
→ Comprobar que en `MapView.tsx` están las líneas de `L.Icon.Default.mergeOptions` con los imports de las imágenes.

**Error "VITE_ORS_API_KEY is not set"**
→ Crear archivo `.env` en la raíz con `VITE_ORS_API_KEY=tu_clave`. Reiniciar el servidor dev.

**El mapa no ocupa toda la altura**
→ Asegurarse de que `html`, `body` y `#root` tienen `height: 100%` (está en `index.css`). El `MapContainer` necesita una altura explícita.

**Tailwind no aplica estilos**
→ Verificar que `vite.config.ts` tiene el plugin `tailwindcss()` y que `index.css` tiene `@import "tailwindcss"`.

---

## Roadmap de funcionalidades

- [x] Planificador básico (waypoints + calcular ruta)
- [x] Control de curvosidad
- [x] Perfil de elevación
- [x] Export GPX
- [x] Import GPX
- [x] Biblioteca de rutas guardadas
- [ ] Generador de roundtrip (ruta circular)
- [ ] POIs moteros en el mapa (gasolineras, miradores)
- [ ] Compartir ruta con link
- [ ] Tiles de mapa alternativos (ciclovías, topográfico)
- [ ] Modo oscuro/claro
- [ ] App nativa con Capacitor (fase futura)
- [ ] Deploy en Vercel (fase futura)
