// Uptime frontend: every data feature below uses the ASP.NET Core API.
const $ = s => document.querySelector(s);
let studentId = Number(localStorage.getItem("uptimeStudentId") || 0);
let profile = null, ringtones = [], alarmTimer = null, timerInterval = null, timerSeconds = 25*60;
function weekdayOptions(){
 const codes=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
 const monday=new Date(); monday.setHours(12,0,0,0);
 monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
 const currentCode=codes[new Date().getDay()===0?6:new Date().getDay()-1];
 return codes.map((code,index)=>{
  const date=new Date(monday); date.setDate(monday.getDate()+index);
  const label=date.toLocaleDateString(undefined,{weekday:"long"});
  return `<option value="${code}"${code===currentCode?" selected":""}>${esc(label)} (${code})</option>`;
 }).join("");
}
const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtTime = v => (v || "").toString().slice(0,5);
async function api(path, options={}) {
  const res = await fetch(path,{headers:{"Content-Type":"application/json"},...options});
  if(!res.ok){let msg=`Request failed (${res.status})`;try{const d=await res.json();msg=d.title||d.detail||d.message||msg}catch{}throw new Error(msg)}
  if(res.status===204)return null; return res.json();
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function today(){ $("#todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); }
function nav(){document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page))}
async function init(){
  today();nav();
  try{ringtones=await api("/api/ringtones")}catch(e){toast("API is not reachable. Check the server and database.");}
  if(studentId){try{profile=await api(`/api/students/${studentId}`)}catch{studentId=0;localStorage.removeItem("uptimeStudentId")}}
  if(!profile)showOnboarding();else {updateSide();showPage("Dashboard")}
}
function updateSide(){const n=profile.preferredName||profile.firstName;$("#sideName").textContent=n;$("#sideInstitution").textContent=profile.institutionName}
function showOnboarding(){ $("#pageTitle").textContent="Welcome to Uptime";$("#content").innerHTML=`
<section class="welcome mb-4"><div><h1>Your study life, organised.</h1><p>Set up your student profile to start using your personal productivity space.</p></div><div class="welcome-art">🎓</div></section>
<div class="panel"><h3>Let's get started</h3><form id="profileForm" class="page-form">
<div><label class="form-label">First name *</label><input class="form-control" name="firstName" required maxlength="80"></div>
<div><label class="form-label">Last name *</label><input class="form-control" name="lastName" required maxlength="80"></div>
<div><label class="form-label">Preferred name</label><input class="form-control" name="preferredName" maxlength="80"></div>
<div class="wide"><label class="form-label">Institution *</label><input class="form-control" name="institutionName" required minlength="2" maxlength="150" placeholder="e.g. Triumphant College"></div>
<div><label class="form-label">Email (optional)</label><input class="form-control" type="email" name="email"></div>
<div><button class="btn btn-primary w-100">Save profile and continue</button></div></form></div>`;
$("#profileForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{profile=await api("/api/students",{method:"POST",body:JSON.stringify(d)});studentId=profile.id;localStorage.setItem("uptimeStudentId",studentId);updateSide();toast("Profile saved");showPage("Dashboard")}catch(err){toast(err.message)}}}
async function showPage(page){document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageTitle").textContent=page;
if(!profile){showOnboarding();return}
try{
 switch(page){
 case "Dashboard":return await dashboard();
 case "Timetable":return await timetable();
 case "Calendar":return await calendarPage();
 case "Budget":return await budgetPage();
 case "Tasks":return await tasksPage();
 case "Study Timer":return timerPage();
 case "Alarms":return await alarmsPage();
 case "Settings":return await settingsPage();
 }
}catch(e){$("#content").innerHTML=`<div class="alert alert-danger">${esc(e.message)}</div>`}
}
async function dashboard(){
 const d=await api(`/api/students/${studentId}/dashboard`);const b=d.budget;
 $("#content").innerHTML=`<section class="welcome"><div><h1>${esc(d.greeting)}</h1><p>${esc(d.welcome)} &nbsp; Institution: <b>${esc(profile.institutionName)}</b></p></div><div class="welcome-art">🎓</div></section>
 <div class="stats-grid">
 <div class="stat"><span class="symbol">▤</span><small>Classes today</small><strong>${d.classes.length}</strong></div>
 <div class="stat"><span class="symbol">☑</span><small>Open tasks</small><strong>${d.pendingTasks}</strong></div>
 <div class="stat"><span class="symbol">◉</span><small>Monthly spending</small><strong>N$${Number(b.spent).toFixed(2)}</strong></div>
 <div class="stat"><span class="symbol">◷</span><small>Enabled alarms</small><strong>${d.enabledAlarms}</strong></div></div>
 <div class="columns"><div class="panel"><div class="panel-head"><h3>Today's timetable · ${esc(d.today)}</h3><button class="btn btn-sm btn-outline-primary" onclick="showPage('Timetable')">Manage</button></div>${d.classes.length?d.classes.map(c=>`<div class="row-item"><div><b>${esc(c.course)}</b><small>${esc(c.venue)}</small></div><span class="pill">${fmtTime(c.startTime)}–${fmtTime(c.endTime)}</span></div>`).join(""):`<div class="empty">No classes scheduled today. Add your timetable.</div>`}</div>
 <div class="panel"><h3>Upcoming events</h3>${d.upcomingEvents.length?d.upcomingEvents.map(e=>`<div class="row-item"><div><b>${esc(e.title)}</b><small>${esc(e.description)}</small></div><span class="pill">${e.eventDate}</span></div>`).join(""):`<div class="empty">No upcoming events yet.</div>`}
 <h3 class="mt-4">Monthly budget</h3><div class="d-flex justify-content-between mb-2"><small>Spent N$${Number(b.spent).toFixed(2)}</small><small>Limit N$${Number(b.limit).toFixed(2)}</small></div><div class="progress"><div class="progress-bar" style="width:${Math.min(100,b.limit?b.spent/b.limit*100:0)}%"></div></div><button class="btn btn-sm btn-outline-primary mt-3" onclick="showPage('Budget')">View budget</button></div></div>`;
}
async function timetable(){
 const rows=await api(`/api/students/${studentId}/classes`);
 $("#content").innerHTML=`<div class="panel"><h3>Add a class</h3><form id="classForm" class="page-form">
 <div><label class="form-label">Course *</label><input name="course" class="form-control" required maxlength="150"></div>
 <div><label class="form-label">Day *</label><select name="dayOfWeek" class="form-select">${weekdayOptions()}</select></div>
 <div><label class="form-label">Venue *</label><input name="venue" class="form-control" required></div>
 <div><label class="form-label">Start time *</label><input name="startTime" type="time" class="form-control" required></div>
 <div><label class="form-label">End time *</label><input name="endTime" type="time" class="form-control" required></div>
 <div><label class="form-label">Instructor</label><input name="instructor" class="form-control"></div>
 <div><button class="btn btn-primary w-100">Add class</button></div></form></div>
 <div class="panel mt-3"><h3>Weekly timetable</h3>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Day</th><th>Course</th><th>Time</th><th>Venue</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.dayOfWeek)}</td><td><b>${esc(x.course)}</b></td><td>${fmtTime(x.startTime)}–${fmtTime(x.endTime)}</td><td>${esc(x.venue)}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('classes',${x.id},showPage.bind(null,'Timetable'))">Delete</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No classes saved yet. Add your weekly classes above.</div>`}</div>`;
 $("#classForm").onsubmit=async e=>{e.preventDefault();let d=Object.fromEntries(new FormData(e.target));d.startTime=d.startTime+":00";d.endTime=d.endTime+":00";try{await api(`/api/students/${studentId}/classes`,{method:"POST",body:JSON.stringify(d)});toast("Class added");timetable()}catch(x){toast(x.message)}};
}
async function calendarPage(){
 const rows=await api(`/api/students/${studentId}/events`);
 $("#content").innerHTML=`<div class="panel"><h3>Add calendar event</h3><form id="eventForm" class="page-form"><div><label class="form-label">Title</label><input name="title" class="form-control" required></div><div><label class="form-label">Date</label><input name="eventDate" type="date" class="form-control" required></div><div><label class="form-label">Time</label><input name="eventTime" type="time" class="form-control"></div><div class="wide"><label class="form-label">Description</label><input name="description" class="form-control"></div><div><button class="btn btn-primary w-100">Save event</button></div></form></div><div class="panel mt-3"><h3>Your calendar</h3>${rows.length?rows.map(e=>`<div class="row-item"><div><b>${esc(e.title)}</b><small>${esc(e.description)}</small></div><span>${e.eventDate} ${fmtTime(e.eventTime)}</span><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('events',${e.id},()=>showPage('Calendar'))">Delete</button></div>`).join(""):`<div class="empty">No events added.</div>`}</div>`;
 $("#eventForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.eventTime=d.eventTime?d.eventTime+":00":null;try{await api(`/api/students/${studentId}/events`,{method:"POST",body:JSON.stringify(d)});toast("Event saved");calendarPage()}catch(x){toast(x.message)}};
}
async function budgetPage(){
 const [rows,s]=await Promise.all([api(`/api/students/${studentId}/expenses`),api(`/api/students/${studentId}/settings`)]);const spent=rows.filter(x=>x.expenseDate?.startsWith(new Date().toISOString().slice(0,7))).reduce((a,x)=>a+Number(x.amount),0);
 $("#content").innerHTML=`<div class="stats-grid"><div class="stat"><small>Monthly limit</small><strong>N$${Number(s.monthlyBudgetLimit).toFixed(2)}</strong></div><div class="stat"><small>Spent this month</small><strong>N$${spent.toFixed(2)}</strong></div><div class="stat"><small>Remaining</small><strong>N$${(Number(s.monthlyBudgetLimit)-spent).toFixed(2)}</strong></div></div><div class="panel"><h3>Add expense</h3><form id="expenseForm" class="page-form"><div><label class="form-label">Expense</label><input name="name" class="form-control" required></div><div><label class="form-label">Amount (N$)</label><input name="amount" type="number" min=".01" step=".01" class="form-control" required></div><div><label class="form-label">Category</label><select name="category" class="form-select"><option>Food</option><option>Transport</option><option>Books</option><option>Accommodation</option><option>Data</option><option>Other</option></select></div><div><label class="form-label">Date</label><input name="expenseDate" type="date" value="${new Date().toISOString().slice(0,10)}" class="form-control" required></div><div><button class="btn btn-primary w-100">Add expense</button></div></form></div><div class="panel mt-3"><h3>Expense history</h3>${rows.length?rows.map(x=>`<div class="row-item"><div><b>${esc(x.name)}</b><small>${esc(x.category)} · ${x.expenseDate}</small></div><b>N$${Number(x.amount).toFixed(2)}</b><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('expenses',${x.id},()=>showPage('Budget'))">Delete</button></div>`).join(""):`<div class="empty">No expenses saved.</div>`}</div>`;
 $("#expenseForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.amount=Number(d.amount);try{await api(`/api/students/${studentId}/expenses`,{method:"POST",body:JSON.stringify(d)});toast("Expense saved");budgetPage()}catch(x){toast(x.message)}};
}
async function tasksPage(){
 const rows=await api(`/api/students/${studentId}/tasks`);
 $("#content").innerHTML=`<div class="panel"><h3>Add task or assignment</h3><form id="taskForm" class="page-form"><div class="wide"><label class="form-label">Task title</label><input name="title" class="form-control" required></div><div><label class="form-label">Due date</label><input name="dueDate" type="date" class="form-control"></div><div><label class="form-label">Priority</label><select name="priority" class="form-select"><option>Normal</option><option>High</option><option>Low</option></select></div><div><label class="form-label">Description</label><input name="description" class="form-control"></div><div><button class="btn btn-primary w-100">Add task</button></div></form></div><div class="panel mt-3"><h3>My tasks</h3>${rows.length?rows.map(x=>`<div class="row-item"><div><b>${esc(x.title)}</b><small>${esc(x.description)} · Due: ${x.dueDate||"No date"} · ${esc(x.priority)}</small></div><select class="form-select" style="width:145px" onchange="setTaskStatus(${x.id},this.value)">${["Pending","In Progress","Completed"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('tasks',${x.id},()=>showPage('Tasks'))">Delete</button></div>`).join(""):`<div class="empty">No tasks added yet.</div>`}</div>`;
 $("#taskForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.dueDate=d.dueDate||null;d.status="Pending";try{await api(`/api/students/${studentId}/tasks`,{method:"POST",body:JSON.stringify(d)});toast("Task added");tasksPage()}catch(x){toast(x.message)}};
}
async function setTaskStatus(id,status){const rows=await api(`/api/students/${studentId}/tasks`),x=rows.find(x=>x.id===id);if(!x)return;try{await api(`/api/students/${studentId}/tasks/${id}`,{method:"PUT",body:JSON.stringify({...x,status})});toast("Task updated")}catch(e){toast(e.message)}}
async function alarmsPage(){
 const rows=await api(`/api/students/${studentId}/alarms`);
 $("#content").innerHTML=`<div class="panel"><h3>Create alarm</h3><form id="alarmForm" class="page-form"><div><label class="form-label">Alarm label</label><input name="label" class="form-control" value="Study time" required></div><div><label class="form-label">Time</label><input name="alarmTime" type="time" class="form-control" required></div><div><label class="form-label">Ringtone</label><select name="ringtoneId" class="form-select">${ringtones.map(r=>`<option value="${r.id}">${esc(r.category)} — ${esc(r.name)}</option>`).join("")}</select></div><div><label class="form-label">Repeat</label><select name="repeatDays" class="form-select"><option value="">Once</option><option value="1,2,3,4,5">Weekdays</option><option value="6,7">Weekend</option><option value="1,2,3,4,5,6,7">Every day</option></select></div><div><button class="btn btn-primary w-100">Save alarm</button></div></form><div class="text-muted small">Preview ringtone: choose one below and press Preview.</div><div class="d-flex flex-wrap gap-2 mt-2">${ringtones.map(r=>`<button class="btn btn-sm btn-outline-primary" onclick="previewTone(${r.id})">▶ ${esc(r.name)}</button>`).join("")}</div></div><div class="panel mt-3"><h3>Saved alarms</h3>${rows.length?rows.map(a=>`<div class="alarm-row"><div><div class="alarm-time">${fmtTime(a.alarmTime)}</div><b>${esc(a.label)}</b><small class="d-block text-muted">${esc(a.ringtone?.name||"Ringtone")} · ${a.repeatDays||"Once"}</small></div><div class="d-flex gap-2 align-items-center"><button class="btn btn-sm ${a.isEnabled?"btn-primary":"btn-outline-secondary"}" onclick="toggleAlarm(${a.id},${!a.isEnabled})">${a.isEnabled?"On":"Off"}</button><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('alarms',${a.id},()=>showPage('Alarms'))">Delete</button></div></div>`).join(""):`<div class="empty">No alarms yet.</div>`}</div><div class="alert alert-warning mt-3 small">Browser alarms work only while this app tab is open and active enough to run timers. Background/locked-device alarms are not guaranteed.</div>`;
 $("#alarmForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.alarmTime=d.alarmTime+":00";d.ringtoneId=Number(d.ringtoneId);d.isEnabled=true;try{await api(`/api/students/${studentId}/alarms`,{method:"POST",body:JSON.stringify(d)});toast("Alarm saved");alarmsPage()}catch(x){toast(x.message)}};
 if(alarmTimer)clearInterval(alarmTimer);
 alarmTimer=setInterval(async()=>{try{const alarms=await api(`/api/students/${studentId}/alarms`);const now=new Date(),hm=now.toTimeString().slice(0,5),dow=now.getDay()||7;alarms.forEach(a=>{const key=`alarm-${a.id}-${now.toDateString()}-${hm}`;if(a.isEnabled&&fmtTime(a.alarmTime)===hm&&(!a.repeatDays||a.repeatDays.split(",").includes(String(dow)))&&!sessionStorage.getItem(key)){sessionStorage.setItem(key,"1");playAlarm(a)}})}catch{}},10000);
}
async function previewTone(id){const r=ringtones.find(x=>x.id===id);if(!r)return;try{const a=new Audio(r.audioFilePath);await a.play()}catch{const C=window.AudioContext||window.webkitAudioContext;if(C){const c=new C(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=660;g.gain.value=.12;o.start();setTimeout(()=>{o.stop();c.close()},350)}toast("Audio preview unavailable; fallback beep played.")}}
async function playAlarm(a){await previewTone(a.ringtoneId);if("Notification"in window&&Notification.permission==="granted")new Notification("Uptime alarm",{body:a.label});alert(`Alarm: ${a.label} (${fmtTime(a.alarmTime)})`)}
async function toggleAlarm(id,enabled){try{await api(`/api/students/${studentId}/alarms/${id}/enabled`,{method:"PATCH",body:JSON.stringify(enabled)});alarmsPage()}catch(e){toast(e.message)}}
async function settingsPage(){
 const s=await api(`/api/students/${studentId}/settings`);
 $("#content").innerHTML=`<div class="panel"><h3>Student profile</h3><form id="settingsProfile" class="page-form"><div><label class="form-label">First name</label><input class="form-control" name="firstName" value="${esc(profile.firstName)}" required></div><div><label class="form-label">Last name</label><input class="form-control" name="lastName" value="${esc(profile.lastName)}" required></div><div><label class="form-label">Preferred name</label><input class="form-control" name="preferredName" value="${esc(profile.preferredName)}"></div><div class="wide"><label class="form-label">Institution</label><input class="form-control" name="institutionName" value="${esc(profile.institutionName)}" required></div><div><label class="form-label">Email</label><input class="form-control" name="email" type="email" value="${esc(profile.email)}"></div><div><button class="btn btn-primary w-100">Update profile</button></div></form></div>
 <div class="panel mt-3"><h3>Preferences</h3><form id="settingsForm" class="page-form"><div><label class="form-label">Reminder (minutes)</label><input class="form-control" type="number" name="reminderMinutes" min="1" max="1440" value="${s.reminderMinutes}"></div><div><label class="form-label">Monthly budget limit (N$)</label><input class="form-control" type="number" step=".01" min=".01" name="monthlyBudgetLimit" value="${s.monthlyBudgetLimit}"></div><div><label class="form-label">Volume (0–100)</label><input class="form-control" type="number" name="volume" min="0" max="100" value="${s.volume}"></div><div><label><input type="checkbox" name="notificationsEnabled" ${s.notificationsEnabled?"checked":""}> Enable notifications</label></div><div><label><input type="checkbox" name="ringtoneEnabled" ${s.ringtoneEnabled?"checked":""}> Enable ringtone</label></div><div><button class="btn btn-primary w-100">Save preferences</button></div></form><hr><button class="btn btn-outline-danger" onclick="resetLocalProfile()">Forget this profile on this browser</button><p class="text-muted small mt-2">This only clears the browser's selected profile. It does not delete the profile or its database records.</p></div>`;
 $("#settingsProfile").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{profile=await api(`/api/students/${studentId}`,{method:"PUT",body:JSON.stringify(d)});updateSide();toast("Profile updated")}catch(x){toast(x.message)}};
 $("#settingsForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),d={reminderMinutes:Number(f.get("reminderMinutes")),monthlyBudgetLimit:Number(f.get("monthlyBudgetLimit")),volume:Number(f.get("volume")),notificationsEnabled:f.has("notificationsEnabled"),ringtoneEnabled:f.has("ringtoneEnabled")};try{await api(`/api/students/${studentId}/settings`,{method:"PUT",body:JSON.stringify(d)});toast("Preferences saved")}catch(x){toast(x.message)}};
}
function resetLocalProfile(){if(confirm("Choose a different profile on this browser? Your saved database profile will remain.")){localStorage.removeItem("uptimeStudentId");studentId=0;profile=null;showOnboarding()}}
async function deleteItem(type,id,callback){if(!confirm("Delete this item?"))return;try{await api(`/api/students/${studentId}/${type}/${id}`,{method:"DELETE"});toast("Deleted");callback()}catch(e){toast(e.message)}}
function timerPage(){
 $("#content").innerHTML=`<div class="panel text-center"><h3>Focus study timer</h3><p class="text-muted">Work in focused intervals, then take a short break.</p><div id="timerDisplay" class="timer-display">${timerFormat(timerSeconds)}</div><div class="d-flex justify-content-center gap-2 flex-wrap"><button class="btn btn-primary" onclick="startTimer()">Start</button><button class="btn btn-outline-secondary" onclick="pauseTimer()">Pause</button><button class="btn btn-outline-secondary" onclick="resetTimer()">Reset</button></div><form id="sessionForm" class="page-form mt-4"><div><label class="form-label">Subject studied</label><input class="form-control" name="subject" required placeholder="e.g. Computer Forensics"></div><div><label class="form-label">Minutes completed</label><input class="form-control" name="durationMinutes" type="number" min="1" max="1440" value="25" required></div><div><button class="btn btn-primary w-100">Save study session</button></div></form></div>`;
 $("#sessionForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.durationMinutes=Number(d.durationMinutes);try{await api(`/api/students/${studentId}/study-sessions`,{method:"POST",body:JSON.stringify(d)});toast("Study session saved")}catch(x){toast(x.message)}};
}
function timerFormat(s){return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function startTimer(){if(timerInterval)return;timerInterval=setInterval(()=>{if(timerSeconds>0)timerSeconds--;$("#timerDisplay").textContent=timerFormat(timerSeconds);if(timerSeconds===0){pauseTimer();toast("Focus session complete!");}},1000)}
function pauseTimer(){clearInterval(timerInterval);timerInterval=null}
function resetTimer(){pauseTimer();timerSeconds=25*60;const el=$("#timerDisplay");if(el)el.textContent=timerFormat(timerSeconds)}
init();
