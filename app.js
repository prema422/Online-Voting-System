const API = "http://localhost:4000/api";

function $(id){
  return document.getElementById(id);
}

let token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");

async function init(){
  // If already logged in and on a page without the app, redirect to main page
  if(token && user){
    if($("app")){
      showApp();
      await loadCandidates();
      await loadResults();
    } else {
      // We're on signin/register page: go to main app page
      if(location.pathname.endsWith("/index.html") || location.pathname === "/" || location.pathname.endsWith("/")){
        // stay on index if it's the root app
      } else {
        location.href = "index.html";
        return;
      }
    }
  } else {
    // If this page contains an auth area, ensure it's visible
    const authEl = $("auth");
    if(authEl) authEl.style.display = "block";
  }

  bindEvents();
}

function bindEvents(){
  const loginBtn = $("login-btn");
  const regBtn = $("reg-btn");
  const logoutBtn = $("logout-btn");

  if(loginBtn) loginBtn.addEventListener("click", login);
  if(regBtn) regBtn.addEventListener("click", register);
  if(logoutBtn) logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    token = null; user = null;
    location.reload();
  });
}

async function register(){
  const nameEl = $("reg-name");
  const emailEl = $("reg-email");
  const passwordEl = $("reg-password");
  if(!nameEl || !emailEl || !passwordEl) return alert("Registration form not found on this page.");
  const name = nameEl.value;
  const email = emailEl.value;
  const password = passwordEl.value;
  const res = await fetch(API + "/register", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name,email,password})});
  const data = await res.json();
  if(data.error) return alert(data.error);
  alert("Registered. Please sign in.");
  // After registering, send the user to the sign-in page
  location.href = "index.html";
}

async function login(){
  const emailEl = $("login-email");
  const passwordEl = $("login-password");
  if(!emailEl || !passwordEl) return alert("Login form not found on this page.");
  const email = emailEl.value;
  const password = passwordEl.value;
  const res = await fetch(API + "/login", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password})});
  const data = await res.json();
  if(data.error) return alert(data.error);
  token = data.token;
  user = data.user;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  // If the app container is on this page, show it, otherwise redirect to the main app page
  if($("app")){
    showApp();
    await loadCandidates();
    await loadResults();
  } else {
    location.href = "index.html";
  }
}

function showApp(){
  const authEl = $("auth");
  const appEl = $("app");
  if(authEl) authEl.style.display = "none";
  if(!appEl) return;
  appEl.classList.remove("hidden");
  const userName = $("user-name");
  if(userName) userName.innerText = user.name;

  // Set role display
  const roleDisplay = $("role-display");
  if(roleDisplay && user && user.role) {
    const roleName = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    roleDisplay.innerText = roleName;
  }

  // Show/hide results based on role
  const resultsSection = $("results-section");
  if(resultsSection) {
    if(user && user.role === "admin") {
      resultsSection.classList.remove("hidden");
    } else {
      resultsSection.classList.add("hidden");
    }
  }
}

async function loadCandidates(){
  if(!$("candidates")) return;
  const res = await fetch(API + "/candidates");
  const candidates = await res.json();
  const ul = $("candidates");
  ul.innerHTML = "";
  candidates.forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="candidate-name"><strong>${c.name}</strong></div>
      <button class="vote-btn" data-id="${c.id}"><i class="fas fa-check-circle"></i> Vote</button>
    `;
    li.querySelector("button").addEventListener("click", () => vote(c.id));
    ul.appendChild(li);
  });
}

async function vote(candidateId){
  if(!token) return alert("Please login first.");
  const res = await fetch(API + "/vote", {method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token}, body:JSON.stringify({candidateId})});
  const data = await res.json();
  if(data.error) return alert(data.error);
  alert("Vote recorded!");
  await loadResults();
}

async function loadResults(){
  if(!$("results")) return;
  const res = await fetch(API + "/results");
  const results = await res.json();
  const ul = $("results");
  ul.innerHTML = "";
  results.forEach(r => {
    const li = document.createElement("li");
    const deleteBtn = user && user.role === "admin" 
      ? `<button class="delete-btn" data-candidate-id="${r.candidate.id}"><i class="fas fa-trash"></i> Clear</button>`
      : "";
    li.innerHTML = `
      <div class="result-info">
        <strong>${r.candidate.name}</strong>
        <span class="vote-count">${r.votes} votes</span>
      </div>
      ${deleteBtn}
    `;
    if(user && user.role === "admin") {
      li.querySelector(".delete-btn").addEventListener("click", () => deleteVotes(r.candidate.id));
    }
    ul.appendChild(li);
  });
}

async function deleteVotes(candidateId){
  if(!confirm("Delete all votes for this candidate?")) return;
  const res = await fetch(API + `/votes/${candidateId}`, {
    method: "DELETE",
    headers: {"Authorization": "Bearer " + token}
  });
  const data = await res.json();
  if(data.error) return alert(data.error);
  alert("Votes deleted!");
  await loadResults();
}

init();