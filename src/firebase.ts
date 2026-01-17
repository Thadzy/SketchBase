import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, addDoc, collection, 
  query, where, getDocs, orderBy, serverTimestamp, updateDoc, deleteDoc 
} from "firebase/firestore";

// Initialize Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// Handle Google Sign-In
export const signIn = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
};

// --- CRUD Operations ---

// 1. Create Project
export const createProject = async (userId: string, name: string = "Untitled Project") => {
  const projectsRef = collection(db, "projects");
  const docRef = await addDoc(projectsRef, {
    ownerId: userId,
    name: name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    elements: "[]", // Initialize as an empty JSON array string
    appState: {}
  });
  return docRef.id;
};

// 2. Read Projects (Fetch by User ID)
export const getUserProjects = async (userId: string) => {
  const projectsRef = collection(db, "projects");
  const q = query(projectsRef, where("ownerId", "==", userId), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 3. Update Project Content (Save Board State)
export const saveProject = async (projectId: string, elements: any, appState: any) => {
  const projectRef = doc(db, "projects", projectId);
  
  // WORKAROUND: Serialize the elements array to a JSON string.
  // Firestore does not natively support nested arrays (arrays of arrays), which Excalidraw uses.
  const elementsString = JSON.stringify(elements);
  
  const cleanAppState = {
    viewBackgroundColor: appState?.viewBackgroundColor || "#ffffff"
  };

  await setDoc(projectRef, {
    elements: elementsString,
    appState: cleanAppState,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 4. Load Project Data
export const loadProject = async (projectId: string) => {
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    let parsedElements = [];
    try {
      // WORKAROUND: Parse the JSON string back into a valid array for the editor.
      if (typeof data.elements === 'string') {
        parsedElements = JSON.parse(data.elements);
      } else {
        // Fallback for legacy data that might be stored as an array
        parsedElements = data.elements || [];
      }
    } catch (e) {
      console.error("Error parsing elements:", e);
      parsedElements = [];
    }
    return { ...data, elements: parsedElements };
  }
  return null;
};

// 5. Rename Project
export const updateProjectName = async (projectId: string, newName: string) => {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    name: newName,
    updatedAt: serverTimestamp()
  });
};

// 6. Delete Project
export const deleteProject = async (projectId: string) => {
  const projectRef = doc(db, "projects", projectId);
  await deleteDoc(projectRef);
};