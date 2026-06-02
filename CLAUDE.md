# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `Mireditor/` subdirectory (not the repo root):

```bash
npm run dev            # Vite dev server → http://localhost:5173
npm run typecheck      # TypeScript validation (tsc --noEmit)
npm run build          # Production build → dist/
npm run electron       # Launch Electron (requires dev server running first)
npm run dev-desktop    # Starts Vite + Electron concurrently (no backend required)
npm run build-exe      # Windows NSIS installer → release/
```

Optional backend (not required for editor functionality):
```bash
cd backend && npm install && npm start   # Express API → http://localhost:3000
```

No automated test suite exists. `typecheck` is the primary validation step.

## Architecture

**Mireditor** is an offline-first, AI-assisted, Photoshop-style image editor built with Electron + React 19 + Vite + TypeScript. The backend (Node.js/Express + MySQL) is optional — the app works fully without it.

### Entry points

- `main.electron.js` — Electron main process: splash screen, BrowserWindow, IPC handlers, recent projects, Discord RPC
- `src/main.tsx` → `src/App.tsx` — React root; routes between three views (`auth`, `dashboard`, `editor`) based on Zustand store state
- `src/pages/EditorPage.tsx` — renders the full editor layout

### Editor core (`src/editor/`)

This is the most complex part of the codebase. Organized into:

| Directory | Purpose |
|-----------|---------|
| `model/` | `MirDocument` and `Layer` types; `.gef` document model; UID generation |
| `store/useEditorStore.ts` | All editor state (layers, active tool, colors, history/undo, selections) via Zustand |
| `render/Compositor.ts` | Canvas2D compositing with 16 blend modes and opacity |
| `render/text.ts` | Rasterizes text to canvas before blending |
| `tools/` | Tool registry + implementations: paint (brush/pencil/eraser), vector (shapes/gradient), select (marquee/lasso/magic wand) |
| `filters/` | Adjustments & effects: GPU path via `ctx.filter` (canvasOps.ts), CPU pixel ops (pixelOps.ts), execution/preview (run.ts) |
| `ai/` | Optional AI features: text-to-image and generative fill via OpenRouter API; upscaling and background removal run offline |
| `io/gefFormat.ts` | `.gef` file format: JSON manifest + base64-encoded PNG per layer |
| `io/fileService.ts` | File open/save abstraction over both Electron IPC and browser File API |
| `components/CanvasViewport.tsx` | Zoom (1%–6400%), pan, rulers, grid overlay, cursor |
| `panels/` | All sidebar/dialog panels (Layers, Color, History, Navigator, etc.) |
| `shortcuts.ts` | Keyboard shortcut map |

### State management

Two Zustand stores:
- `src/store/useAuthStore.ts` — auth token and user, persisted to localStorage
- `src/editor/store/useEditorStore.ts` — all editor runtime state (layers, tool state, undo stack up to 50 snapshots, selection, color swatches)

Layers store their pixel data as in-memory `HTMLCanvasElement` objects; the undo stack holds full document snapshots.

### File format (`.gef`)

Proprietary format defined in `src/editor/io/gefFormat.ts`: a JSON envelope containing document metadata (width, height, DPI, color mode) and an array of layer descriptors, each with its canvas serialized as a base64 PNG data URL. This is the only persistent project format.

### AI features

All AI features are bring-your-own-key and never touch the backend. The OpenRouter API key is stored in localStorage only (`src/editor/ai/settings.ts`). Offline operations (upscaling, background removal) run entirely in the browser via canvas pixel manipulation.

### Desktop integration

- Splash screen (`splash.html` + `preload-splash.js`) shown during Electron boot
- Discord Rich Presence managed by `discord-rpc-manager.js` (called from the main process) and synced via `src/hooks/useDiscordRPC.ts`
- Electron IPC bridges file system access: `src/editor/io/fileService.ts` detects `window.electronAPI` to switch between native dialogs and browser File API

## Key conventions

- UI text is in Turkish throughout
- Tailwind CSS for all styling; no CSS modules or styled-components
- `concurrently` and `wait-on` coordinate multi-process dev startup in `dev-desktop`
- The Python FastAPI backend (`backend/main.py`) is an unused alternative to the active Node.js `backend/server.js`
