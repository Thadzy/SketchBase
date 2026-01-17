import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Excalidraw } from "@excalidraw/excalidraw";
import { auth, loadProject, saveProject } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import debounce from 'lodash.debounce';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'; 

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  
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

  // 2. Data Loading Logic
  useEffect(() => {
    if (!id) return;
    
    setIsLoading(true);
    
    // ✅ FIX: ใส่ type ': any' เพื่อบอก TypeScript ว่า data ก้อนนี้มี appState แน่ๆ ไม่ต้องห่วง
    loadProject(id).then((data: any) => {
      if (data) {
        setProjectData({
          elements: data.elements || [],
          appState: { 
            ...data.appState, 
            viewBackgroundColor: data.appState?.viewBackgroundColor || "#ffffff" 
          }
        });
      }
      setIsLoading(false);
    });
  }, [id]);

  // 3. Auto-Save Logic
  const debouncedSave = useMemo(
    () => debounce(async (elements: any, appState: any) => {
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
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')} 
          className="pointer-events-auto bg-white p-2.5 rounded-lg border-2 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>

        {/* Status Indicator */}
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
        <Excalidraw
          key={id} 
          initialData={projectData}
          onChange={(elements, appState) => debouncedSave(elements, appState)}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: { saveFileToDisk: true },
              toggleTheme: false,
            }
          }}
        />
      </div>
    </div>
  );
}