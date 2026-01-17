import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signIn, createProject, getUserProjects, updateProjectName, deleteProject } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Plus, LayoutGrid, LogOut, Loader2, Clock, Trash2, Edit2, PenTool } from 'lucide-react';
import { exportToSvg } from "@excalidraw/utils";

// --- Sub-component: Generates SVG previews from Excalidraw elements ---
const BoardPreview = ({ elementsString, appState }: { elementsString: string, appState: any }) => {
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  useEffect(() => {
    const generatePreview = async () => {
      try {
        const elements = elementsString ? JSON.parse(elementsString) : [];
        if (!elements || elements.length === 0) return;

        const svg = await exportToSvg({
          elements,
          appState: { ...appState, viewBackgroundColor: "#ffffff" },
          files: null,
        });

        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.maxWidth = "100%";
        svg.style.maxHeight = "100%";
        svg.style.objectFit = "contain";

        setSvgUrl(svg.outerHTML);
      } catch (e) {
        // console.error("Preview generation failed", e);
      }
    };
    generatePreview();
  }, [elementsString]);

  if (!svgUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f4f4f4] opacity-50 pattern-grid-lg">
        <LayoutGrid size={32} className="text-gray-300" />
      </div>
    );
  }

  return <div className="w-full h-full p-6 overflow-hidden flex items-center justify-center pointer-events-none grayscale opacity-90 contrast-125" dangerouslySetInnerHTML={{ __html: svgUrl }} />;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Monitor authentication state and fetch user projects upon login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const data = await getUserProjects(currentUser.uid);
        setProjects(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async () => {
    if (!user) return;
    const newId = await createProject(user.uid, `Sketch ${projects.length + 1}`);
    navigate(`/board/${newId}`);
  };

  // Handle project deletion
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this sketch? This action cannot be undone.")) {
      await deleteProject(projectId);
      // Update local state by removing the deleted project
      setProjects(projects.filter(p => p.id !== projectId));
    }
  };

  // Handle project renaming
  const handleRename = async (e: React.MouseEvent, projectId: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt("Rename sketch:", currentName);
    if (newName && newName.trim() !== "") {
      await updateProjectName(projectId, newName);
      // Optimistically update the UI with the new name
      setProjects(projects.map(p => p.id === projectId ? { ...p, name: newName } : p));
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#fdfdfd]"><Loader2 className="w-10 h-10 text-gray-800 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      
      {/* Navbar Style: Minimal Graphite */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b-2 border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black flex items-center gap-3 text-gray-900 tracking-tight">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
              <PenTool size={20} />
            </div>
            SketchBase
          </h1>
          
          {!user ? (
            <button 
              onClick={() => signIn()} 
              className="bg-white border-2 border-gray-900 text-gray-900 px-6 py-2 rounded-lg font-bold hover:bg-gray-900 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-gray-300 grayscale" alt="User" />
                <span className="text-sm font-bold text-gray-700 hidden sm:block">{user.displayName}</span>
              </div>
              <button 
                onClick={() => auth.signOut()} 
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Log Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-full">
               <PenTool size={48} className="text-gray-400" />
            </div>
            <h2 className="text-5xl font-black text-gray-900 mb-6 tracking-tighter">Raw Ideas. Real Sketches.</h2>
            <p className="text-gray-500 mb-10 max-w-md text-lg leading-relaxed">
              A minimalist whiteboard for those who think in black and white. No distractions, just graphite and paper.
            </p>
            <button 
              onClick={() => signIn()} 
              className="bg-gray-900 text-white text-lg px-10 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              Start Sketching
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">My Sketches</h2>
                <p className="text-gray-500 mt-2 font-medium">Your collection of digital graphite drawings.</p>
              </div>
              <button 
                onClick={handleCreate}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-black transition-all font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <Plus size={20} strokeWidth={3} /> New Sketch
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* Card: Create New (Dashed Style) */}
              <button 
                onClick={handleCreate}
                className="group h-72 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all duration-300"
              >
                <div className="bg-white p-4 rounded-full border-2 border-gray-100 group-hover:border-gray-900 mb-4 transition-colors">
                  <Plus size={32} />
                </div>
                <span className="font-bold text-lg">Create Blank Canvas</span>
              </button>

              {/* Project Cards (Graphite Style) */}
              {projects.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => navigate(`/board/${p.id}`)}
                  className="group relative h-72 bg-white rounded-2xl border-2 border-gray-100 hover:border-gray-900 shadow-sm hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
                >
                  {/* Preview Area */}
                  <div className="flex-1 bg-white relative overflow-hidden border-b-2 border-gray-50 group-hover:border-gray-900 transition-colors">
                     <BoardPreview elementsString={p.elements} appState={p.appState} />
                     
                     {/* Hover Overlay Actions */}
                     <div className="absolute inset-0 bg-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3 gap-2">
                        <button 
                          onClick={(e) => handleRename(e, p.id, p.name)}
                          className="p-2 bg-white text-gray-900 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all"
                          title="Rename"
                        >
                          <Edit2 size={16} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, p.id)}
                          className="p-2 bg-white text-red-600 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                     </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 bg-white z-10">
                    <h3 className="font-bold text-lg text-gray-900 truncate group-hover:underline decoration-2 underline-offset-4 decoration-gray-900">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <Clock size={12} strokeWidth={2.5} />
                      <span>
                        {p.updatedAt?.seconds 
                          ? new Date(p.updatedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                          : 'Now'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}