// ===== Firebase Setup =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { 
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const provider = new GoogleAuthProvider();

// ===== State Management =====
let currentUser = null;
let userRef = null;
let allItems = [];

// ===== DOM Elements =====
const linksContainer = document.getElementById("linksContainer");
const emptyState = document.getElementById("emptyState");

// ===== Feature 1: Auth System =====
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("signInBtn").classList.add("hidden");
    document.getElementById("signOutBtn").classList.remove("hidden");
    userRef = collection(db, "users", user.uid, "items");
    listenToItems();
  } else {
    document.getElementById("userEmail").textContent = "";
    document.getElementById("signInBtn").classList.remove("hidden");
    document.getElementById("signOutBtn").classList.add("hidden");
    linksContainer.innerHTML = "";
    checkEmptyState();
  }
});

document.getElementById("signInBtn").onclick = () => signInWithPopup(auth, provider);
document.getElementById("signOutBtn").onclick = () => signOut(auth);

// ===== Feature 2: Item Management =====
document.getElementById("addItemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("itemTitle").value.trim();
  const url = document.getElementById("itemUrl").value.trim();
  const type = document.getElementById("itemType").value;
  
  if (!title) return;

  const id = Date.now().toString();
  const data = {
    id,
    title,
    url: type === "link" ? formatUrl(url) : "",
    type,
    parentId: type === "heading" ? null : getCurrentFolderId(),
    order: id,
    clicks: 0,
    createdAt: serverTimestamp(),
    tags: extractTags(title)
  };

  if (currentUser) await setDoc(doc(userRef, id), data);
  document.getElementById("addItemForm").reset();
});

function formatUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

function extractTags(text) {
  const tags = [];
  const matches = text.match(/#(\w+)/g);
  if (matches) {
    tags.push(...matches.map(tag => tag.substring(1).toLowerCase()));
  }
  return tags;
}

// ===== Feature 3: Nested Folders =====
function getCurrentFolderId() {
  // Implement folder navigation logic
  return null; // Top-level by default
}

// ===== Feature 4: Real-time Sync =====
function listenToItems() {
  const q = query(userRef, orderBy("order"));
  onSnapshot(q, (snapshot) => {
    allItems = [];
    snapshot.forEach((doc) => allItems.push(doc.data()));
    renderItems(allItems);
    updateStats(allItems);
    checkEmptyState();
  });
}

// ===== Feature 5: Click Tracking =====
async function trackClick(itemId) {
  const itemRef = doc(userRef, itemId);
  await setDoc(itemRef, {
    clicks: firebase.firestore.FieldValue.increment(1),
    lastClicked: serverTimestamp()
  }, { merge: true });
  
  // Visual feedback
  const counter = document.querySelector(`[data-id="${itemId}"] .click-counter`);
  if (counter) {
    counter.classList.add("click-pulse");
    setTimeout(() => counter.classList.remove("click-pulse"), 300);
  }
}

// ===== Feature 6: Drag-and-Drop =====
function enableDrag() {
  let draggedItem = null;

  document.querySelectorAll(".item-card").forEach(item => {
    item.addEventListener("dragstart", () => {
      draggedItem = item;
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", async () => {
      item.classList.remove("drag-over");
      if (draggedItem === item) return;

      // Update Firestore order
      const items = [...linksContainer.children];
      const updates = items.map((el, index) => ({
        id: el.dataset.id,
        order: index
      }));

      const batch = [];
      updates.forEach(({ id, order }) => {
        batch.push(setDoc(doc(userRef, id), { order }, { merge: true }));
      });
      
      await Promise.all(batch);
    });
  });
}

// ===== Feature 7: Search & Filter =====
document.getElementById("searchInput").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const isTagSearch = term.startsWith("#");
  
  document.querySelectorAll(".item-card").forEach(item => {
    const matches = isTagSearch
      ? item.dataset.tags?.includes(term.substring(1))
      : item.textContent.toLowerCase().includes(term);
    
    item.style.display = matches ? "flex" : "none";
  });
});

// ===== Feature 8: Link Previews =====
async function fetchPreview(url) {
  if (!url) return null;
  try {
    const res = await fetch(`https://api.linkpreview.net/?key=YOUR_KEY&q=${encodeURIComponent(url)}`);
    return await res.json();
  } catch {
    return null;
  }
}

// ===== Feature 9: Stats Dashboard =====
function updateStats(items) {
  const totalClicks = items.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const folderCount = items.filter(item => item.type === "heading").length;
  
  document.getElementById("totalCount").textContent = items.length;
  document.getElementById("totalClicks").textContent = totalClicks;
  document.getElementById("folderCount").textContent = folderCount;
}

// ===== Feature 10: Empty State =====
function checkEmptyState() {
  if (allItems.length === 0) {
    emptyState.classList.add("visible");
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.remove("visible");
    emptyState.classList.add("hidden");
  }
}

// ===== Feature 11: Theme System =====
document.getElementById("themeToggle").addEventListener("click", () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  
  // Update button text
  document.querySelector(".theme-icon").textContent = next === "dark" ? "🌙" : "☀️";
  document.querySelector(".theme-text").textContent = next === "dark" ? "Dark" : "Light";
});

// Initialize theme
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);