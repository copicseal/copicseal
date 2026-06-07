import { useState } from 'react';
import { CoSidebar } from '@/components/CoSidebar';
import { CoSettingsDialog } from '@/components/settings/CoSettingsDialog';
import { Toaster } from '@/components/ui/toaster';
import { PhotoProvider } from '@/hooks/usePhotos';
import { PhotoEditor } from '@/pages/PhotoEditor';
import './App.css';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>();

  const openSettings = (tab?: string) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CoSidebar onOpenSettings={openSettings} />
      <div className="min-w-0 flex-1">
        <PhotoProvider>
          <PhotoEditor />
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
