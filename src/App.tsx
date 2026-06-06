import { PhotoProvider } from '@/hooks/usePhotos';
import { PhotoEditor } from '@/pages/PhotoEditor';
import './App.css';

function App() {
  return (
    <PhotoProvider>
      <PhotoEditor />
    </PhotoProvider>
  );
}

export default App;
