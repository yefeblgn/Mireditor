import React, { useState, useEffect, useMemo } from 'react';
import { useEditorStore, ProjectConfig } from '../store/useEditorStore';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useDiscordRPC } from '../hooks/useDiscordRPC';
import { EditorCanvas, loadCanvasJSON, resetCanvas } from '../components/editor/Canvas';
import { EditorToolbar } from '../components/editor/Toolbar';
import { EditorMenuBar } from '../components/editor/MenuBar';
import { EditorLayerPanel } from '../components/editor/LayerPanel';
import { EditorStatusBar } from '../components/editor/StatusBar';
import { TextPropertiesBar } from '../components/editor/TextPropertiesBar';
import { ShortcutsModal, AboutModal } from '../components/editor/Modals';

const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

interface EditorPageProps {
  onBack: () => void;
  projectConfig?: ProjectConfig;
  draftFilePath?: string;
}

export function EditorPage({ onBack, projectConfig, draftFilePath }: EditorPageProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { setProjectConfig } = useEditorStore();
  const activeTool = useEditorStore((s) => s.activeTool);
  const projectTitle = useEditorStore((s) => s.projectTitle);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  // Global keyboard shortcuts (works regardless of focus)
  useGlobalShortcuts();

  // Discord RPC — editör detayları
  const rpcState = useMemo(() => ({
    view: 'editor' as const,
    projectTitle,
    activeTool,
    canvasSize: `${canvasWidth}×${canvasHeight}`,
  }), [projectTitle, activeTool, canvasWidth, canvasHeight]);
  useDiscordRPC(rpcState);

  // Apply project config on mount
  useEffect(() => {
    if (projectConfig) {
      setProjectConfig(projectConfig);
    }
  }, [projectConfig, setProjectConfig]);

  // Load draft file when editor mounts (if draftFilePath is provided)
  useEffect(() => {
    if (!draftFilePath || !ipcRenderer) return;
    const loadDraft = async () => {
      try {
        const raw = await ipcRenderer.invoke('read-file', { filePath: draftFilePath });
        if (!raw) return;
        const draft = JSON.parse(raw);

        // Wait for canvas to be ready
        const waitForCanvas = () => {
          const canvas = useEditorStore.getState().canvas;
          if (!canvas) {
            setTimeout(waitForCanvas, 100);
            return;
          }

          // Apply project config
          useEditorStore.getState().setProjectConfig({
            title: draft.title || 'Untitled',
            width: draft.width || 1920,
            height: draft.height || 1080,
            backgroundColor: draft.canvas?.background || '#ffffff',
          });

          // Reset canvas dimensions
          resetCanvas(canvas, draft.width || 1920, draft.height || 1080, draft.canvas?.background || '#ffffff');

          // Restore layers
          if (draft.layers && Array.isArray(draft.layers)) {
            useEditorStore.setState({ layers: draft.layers, activeLayerId: draft.layers[0]?.id || null });
          }

          // Load canvas JSON
          const canvasJson = typeof draft.canvas === 'string' ? draft.canvas : JSON.stringify(draft.canvas);
          loadCanvasJSON(canvas, canvasJson).then(() => {
            // Reset viewport to fit
            const wa = canvas.getObjects().find((o: any) => (o as any).customId === '__workarea__');
            if (wa) {
              const container = (canvas as any).wrapperEl?.parentElement;
              if (container) {
                const w = container.offsetWidth;
                const h = container.offsetHeight;
                const zx = (w - 80) / (draft.width || 1920);
                const zy = (h - 80) / (draft.height || 1080);
                const z = Math.min(zx, zy, 1);
                canvas.setZoom(z);
                const center = wa.getCenterPoint();
                canvas.viewportTransform![4] = w / 2 - center.x * z;
                canvas.viewportTransform![5] = h / 2 - center.y * z;
                useEditorStore.getState().setZoom(Math.round(z * 100));
              }
            }
            canvas.requestRenderAll();
            useEditorStore.getState().setModified(false);
          });
        };

        waitForCanvas();
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    };
    loadDraft();
  }, [draftFilePath]);

  // Register global modal triggers
  useEffect(() => {
    (window as any).__showShortcutsModal = () => setShowShortcuts(true);
    (window as any).__showAboutModal = () => setShowAbout(true);
    return () => {
      delete (window as any).__showShortcutsModal;
      delete (window as any).__showAboutModal;
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-[#111] select-none editor-container" style={{ cursor: 'default' }}>
      {/* Top Menu Bar */}
      <EditorMenuBar onBack={onBack} />

      {/* Text Properties Bar (shows when text object selected) */}
      <TextPropertiesBar />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Toolbar */}
        <EditorToolbar />

        {/* Canvas */}
        <EditorCanvas />

        {/* Right Panel */}
        <EditorLayerPanel />
      </div>

      {/* Status Bar */}
      <EditorStatusBar />

      {/* Modals */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
