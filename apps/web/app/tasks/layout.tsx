import { Sidebar } from '../../components/Sidebar';

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-950">
        {children}
      </main>
    </div>
  );
}
