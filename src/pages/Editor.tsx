import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Excalidraw } from "@excalidraw/excalidraw";
import { auth, loadProject, saveProject } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import debounce from 'lodash.debounce';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // ใช้ Ref เก็บข้อมูลล่าสุดเสมอ (เพื่อใช้ตอนกดปุ่ม Save/Back)
  const currentElements = useRef<any>([]);
  const currentAppState = useRef<any>({});
  const isDirty = useRef(false); // เช็คว่ามีการแก้ไขไหม

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
    loadProject(id).then((data: any) => {
      if (data) {
        setProjectData({
          elements: data.elements || [],
          appState: { 
            ...data.appState, 
            viewBackgroundColor: data.appState?.viewBackgroundColor || "#ffffff" 
          }
        });
        // Init refs
        currentElements.current = data.elements || [];
        currentAppState.current = data.appState || {};
      }
      setIsLoading(false);
    });
  }, [id]);

  // Function เซฟจริง (แยกออกมาให้เรียกใช้ได้ทั้งจาก Auto และ Manual)
  const performSave = async () => {
    if (!id || !user || !isDirty.current) return; // ถ้าไม่มีอะไรแก้ ก็ไม่ต้องเซฟ (ประหยัด Write)

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveProject(id, currentElements.current, currentAppState.current);
      setLastSavedTime(new Date());
      isDirty.current = false; // รีเซ็ตสถานะว่าเซฟแล้ว
    } catch (error: any) {
      console.error("Save failed:", error);
      setSaveError("Save failed");
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // 3. Auto-Save Logic (Smart Throttling)
  const debouncedAutoSave = useMemo(
    () => debounce(() => {
      performSave();
    }, 10000), // ⏳ เปลี่ยนเป็น 10 วินาที (ประหยัดขึ้น 10 เท่า!)
    [id, user]
  );

  // Update Refs เมื่อมีการวาด
  const handleChange = (elements: any, appState: any) => {
    currentElements.current = elements;
    currentAppState.current = appState;
    isDirty.current = true; // บอกว่า "มีการแก้ไขแล้วนะ"
    debouncedAutoSave();
  };

  // ปุ่ม Back: เซฟงานก่อนออกเสมอ (Force Save)
  const handleBack = async () => {
    if (isDirty.current) {
      setIsSaving(true); // โชว์ว่ากำลังเซฟ
      await performSave(); // บังคับเซฟทันที
    }
    navigate('/');
  };

  // ป้องกันการปิด Tab โดยไม่ตั้งใจ
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = ''; // แสดง popup เตือนของ browser
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
      
      {/* Top Bar */}
      <div className="absolute top-5 left-5 z-50 flex gap-3 pointer-events-none">
        
        {/* Back Button (With Auto-Save Trigger) */}
        <button 
          onClick={handleBack} 
          className="pointer-events-auto bg-white p-2.5 rounded-lg border-2 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          title="Save & Back to Dashboard"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>

        {/* Status Indicator */}
        <div className={`pointer-events-auto px-4 py-2 rounded-lg border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transition-all font-bold tracking-tight ${
          saveError ? "bg-red-50 text-red-600 border-red-900" : "bg-white text-gray-900"
        }`}>
           {saveError ? (
             <><AlertCircle size={18} strokeWidth={2.5} /><span className="text-xs uppercase">Error</span></>
           ) : isSaving ? (
             <><Loader2 size={18} className="animate-spin" strokeWidth={2.5} /><span className="text-xs uppercase">Saving...</span></>
           ) : (
             <><CheckCircle size={18} className="text-gray-900" strokeWidth={2.5} />
               <span className="text-xs uppercase flex flex-col leading-none">
                 <span>Saved</span>
                 {lastSavedTime && <span className="text-[9px] text-gray-500 font-normal">{lastSavedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
               </span>
             </>
           )}
        </div>
      </div>

      <div style={{ height: "100%", width: "100%" }}>
        <Excalidraw
          key={id} 
          initialData={projectData}
          onChange={handleChange} // ใช้ HandleChange แบบใหม่
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