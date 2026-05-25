# CurviApp

Aplicación web gratuita para planificar rutas en moto priorizando carreteras curvas y paisajísticas. Inspirada en Calimoto y Stegra.io.

## Stack

- React 18 + Vite + TypeScript
- Leaflet.js + OpenStreetMap (mapas)
- OpenRouteService API (cálculo de rutas)
- Tailwind CSS v4
- Zustand (estado global)

## Arrancar en local

```bash
# 1. Clona el repo
git clone <url>
cd curviapp

# 2. Instala dependencias
npm install

# 3. Crea el archivo de variables de entorno
cp .env.example .env
# Edita .env y añade tu API key de openrouteservice.org

# 4. Arranca el servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Obtener API key

Regístrate gratis en [openrouteservice.org](https://openrouteservice.org) y copia tu clave en el archivo `.env`:

```
VITE_ORS_API_KEY=tu_clave_aqui
```

## Funcionalidades

- Planificador de rutas con control de "curvosidad"
- Perfil de elevación interactivo
- Export/import GPX
- Biblioteca personal de rutas guardadas
- Evitar autopistas y peajes
