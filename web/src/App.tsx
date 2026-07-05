import { CrushProvider } from './context/CrushContext';
import { AppShell } from './ui/layout/AppShell';

export default function App() {
  return (
    <CrushProvider>
      <AppShell />
    </CrushProvider>
  );
}
