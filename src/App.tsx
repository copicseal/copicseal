import { useState } from 'react';
import { CoSidebar } from '@/components/CoSidebar';
import { CoSettingsDialog } from '@/components/settings/CoSettingsDialog';
import { Toaster } from '@/components/ui/toaster';
import { PhotoProvider } from '@/hooks/usePhotos';
import { CollageEditor } from '@/modules/collage';
import { ComarkEditor } from '@/modules/comark';
import './App.css';

type AppMode = 'border' | 'collage';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>();
  const [mode, setMode] = useState<AppMode>('border');

  const openSettings = (tab?: string) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CoSidebar mode={mode} onModeChange={setMode} onOpenSettings={openSettings} />
      <div className="min-w-0 flex-1">
        <PhotoProvider key={mode}>
          {mode === 'border' ? <ComarkEditor /> : <CollageEditor />}
        </PhotoProvider>
      </div>
      <CoSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
      />
      <Toaster />
    </div>
  );
}

export default App;
