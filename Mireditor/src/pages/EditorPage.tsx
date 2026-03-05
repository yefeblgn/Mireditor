import React, { useState, useEffect } from 'react';
import { useEditorStore, ProjectConfig } from '../store/useEditorStore';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { EditorCanvas } from '../components/editor/Canvas';
import { EditorToolbar } from '../components/editor/Toolbar';
import { EditorMenuBar } from '../components/editor/MenuBar';
import { EditorLayerPanel } from '../components/editor/LayerPanel';
import { EditorStatusBar } from '../components/editor/StatusBar';
import { ShortcutsModal, AboutModal } from '../components/editor/Modals';

interface EditorPageProps {
  onBack: () => void;
  projectConfig?: ProjectConfig;
}

export function EditorPage({ onBack, projectConfig }: EditorPageProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { setProjectConfig } = useEditorStore();

  // Global keyboard shortcuts (works regardless of focus)
  useGlobalShortcuts();

  // Apply project config on mount
  useEffect(() => {
    if (projectConfig) {
      setProjectConfig(projectConfig);
    }
  }, [projectConfig, setProjectConfig]);

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
