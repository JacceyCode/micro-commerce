import SidebarWrapper from "apps/seller-ui/src/shared/components/sidebar/sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="flex h-full bg-black min-h-screen">
      {/* Sidebar */}

      <aside className="w-[280px] min-w-[250px] max-w-[300px] border-r border-r-slate-800 text-white p-4">
        <div className="sticky top-0">
          <SidebarWrapper />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="overflow-auto">{children}</div>
      </main>
    </section>
  );
};

export default Layout;
