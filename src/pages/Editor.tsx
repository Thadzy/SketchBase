import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Excalidraw } from "@excalidraw/excalidraw";
import { auth, loadProject, saveProject } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import debounce from 'lodash.debounce';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  
  // State: Stores loaded project data
  const [projectData, setProjectData] = useState<any>(null);
  
  // State: Tracks loading status to prevent premature rendering
  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // 1. Authentication Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Loading Logic: Fetch data before initializing Excalidraw
  useEffect(() => {
    if (!id) return;
    
    setIsLoading(true); // Start loading... Obscure the screen
    
    loadProject(id).then((data) => {
      if (data) {
        setProjectData({
          elements: data.elements || [],
          appState: { 
            ...data.appState, 
            viewBackgroundColor: data.appState?.viewBackgroundColor || "#ffffff" 
          }
        });
      }
      setIsLoading(false); // Loading complete! Reveal Excalidraw
    });
  }, [id]);

  // 3. Auto-Save Logic with Debounce
  const debouncedSave = useMemo(
    () => debounce(async (elements: any, appState: any) => {
      // Guard: Prevent saving if loading is incomplete, user is missing, or ID is invalid
      if (!id || !user || isLoading) return;

      setIsSaving(true);
      setSaveError(null);
      try {
        await saveProject(id, elements, appState);
      } catch (error: any) {
        console.error("Save failed:", error);
        setSaveError("Save failed");
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000),
    [id, user, isLoading]
  );

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fdfdfd] gap-4">
        <Loader2 className="w-10 h-10 text-gray-900 animate-spin" />
        <p className="text-gray-500 font-bold tracking-wide">LOADING CANVAS...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#fdfdfd]">
      
      {/* Top Bar Navigation & Status */}
      <div className="absolute top-5 left-5 z-50 flex gap-3 pointer-events-none">
        
        {/* Back Button (Graphite Style) */}
        <button 
          onClick={() => navigate('/')} 
          className="pointer-events-auto bg-white p-2.5 rounded-lg border-2 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>

        {/* Status Indicator (Graphite Style) */}
        <div className={`pointer-events-auto px-4 py-2 rounded-lg border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transition-all font-bold tracking-tight ${
          saveError ? "bg-red-50 text-red-600 border-red-900" : "bg-white text-gray-900"
        }`}>
           {saveError ? (
             <>
               <AlertCircle size={18} strokeWidth={2.5} />
               <span className="text-xs uppercase">Not Saved</span>
             </>
           ) : isSaving ? (
             <>
               <Loader2 size={18} className="animate-spin" strokeWidth={2.5} />
               <span className="text-xs uppercase">Saving...</span>
             </>
           ) : (
             <>
               <CheckCircle size={18} className="text-gray-900" strokeWidth={2.5} />
               <span className="text-xs uppercase">Saved</span>
             </>
           )}
        </div>
      </div>

      <div style={{ height: "100%", width: "100%" }}>
        {/* KEY POINT: key={id} forces React to remount component on project change */}
        {/* KEY POINT: initialData ensures no empty state is rendered */}
        <Excalidraw
          key={id} 
          initialData={projectData}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={(elements, appState) => debouncedSave(elements, appState)}
          // Optional: Clean up the UI by hiding default buttons that conflict with our app logic
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false, // Hide default save
              loadScene: false,        // Hide load button
              export: { saveFileToDisk: true }, // Keep export enabled
              toggleTheme: false,      // Disable theme toggle if you want to enforce light mode
            }
          }}
        />
      </div>
    </div>
  );
}