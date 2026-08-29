import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $=id=>document.getElementById(id);
let auth=null, db=null, itemData=[], allBills=[], currentBillId=null, editTarget=null;

try{
  if(firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE_")){
    const app=initializeApp(firebaseConfig);
    auth=getAuth(app); db=getFirestore(app);
    $("firebaseState").textContent="Connected";
  } else $("firebaseState").textContent="Config needed";
}catch(e){console.error(e);$("firebaseState").textContent="Error";}

function today(){return new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}
function nextNo(){let n=+(localStorage.getItem("sf_bill_no")||1011)+1;localStorage.setItem("sf_bill_no",n);return n}
function money(n){return Number(n||0).toFixed(2)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}


function servicePaymentData(){
  const total = Number($("editorTotal")?.textContent || 0);
  const paid = Math.max(0, Number($("paidAmount")?.value || 0));
  const due = Math.max(0, total - paid);
  if($("dueAmount")) $("dueAmount").value = due.toFixed(2);
  if($("summaryTotal")) $("summaryTotal").textContent = total.toFixed(2);
  if($("summaryPaid")) $("summaryPaid").textContent = paid.toFixed(2);
  if($("summaryDue")) $("summaryDue").textContent = due.toFixed(2);
  return {
    serviceType: $("serviceType")?.value || "",
    paymentStatus: $("paymentStatus")?.value || "Paid",
    paidAmount: paid,
    dueAmount: due,
    paymentMethod: $("paymentMethod")?.value || "Cash",
    referenceNo: $("referenceNo")?.value.trim() || ""
  };
}

function data(){
  return {
    billNo:$("billNo").value.trim(), date:$("billDate").value,
    mobile:$("mobile").value.trim(), coach:$("coach").value.trim(),
    customerName:$("customerName").value.trim(), address:$("address").value.trim(),
    phone:$("phone").value.trim(),
    items:itemData.map(x=>({description:x.description||"",qty:Number(x.qty)||0,rate:Number(x.rate)||0})),
    total:itemData.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.rate)||0),0)
  ,...servicePaymentData()};
}

function renderItems(){
  const wrap=$("items"); wrap.innerHTML="";
  itemData.forEach((x,i)=>{
    const r=document.createElement("div"); r.className="item-row";
    r.innerHTML=`<div>${i+1}</div>
      <input class="desc" value="${esc(x.description)}" placeholder="Product / service">
      <input class="qty" type="number" min="0" step="1" value="${x.qty}">
      <input class="rate" type="number" min="0" step="0.01" inputmode="decimal" value="${x.rate}">
      <input class="amount" value="₹ ${money(x.qty*x.rate)}" readonly>
      <button class="remove" type="button">×</button>`;
    const desc=r.querySelector(".desc"), qty=r.querySelector(".qty"), rate=r.querySelector(".rate"), amount=r.querySelector(".amount");
    desc.addEventListener("input",e=>{x.description=e.target.value;sync()});
    qty.addEventListener("input",e=>{
      x.qty=Number(e.target.value)||0;
      amount.value="₹ "+money(x.qty*x.rate);
      sync();
    });
    rate.addEventListener("input",e=>{
      x.rate=Number(e.target.value)||0;
      amount.value="₹ "+money(x.qty*x.rate);
      sync();
    });
    r.querySelector(".remove").onclick=()=>{
      itemData.splice(i,1);
      if(!itemData.length)itemData.push({description:"",qty:1,rate:0});
      renderItems(); sync();
    };
    wrap.appendChild(r);
  });
}

function sync(){
  const d=data();
  $("headBillNo").textContent=d.billNo||"—";
  $("editorTotal").textContent=money(d.total);
  $("pBillNo").textContent=d.billNo||"—";
  $("pMobile").textContent=d.phone||d.mobile||"";
  $("pName").textContent=d.customerName||"";
  $("pDate").textContent=d.date?new Date(d.date+"T00:00:00").toLocaleDateString("en-GB"):"";
  $("pTotal").textContent=money(d.total);
  $("pPaymentMode").textContent=(d.paymentMethod||"Cash").toUpperCase();
  $("pReference").textContent=d.referenceNo?`Ref: ${d.referenceNo}`:"";
  const t=$("printItems"); t.innerHTML="";
  const visible=d.items.filter(x=>x.description||Number(x.qty)||Number(x.rate)).slice(0,7);
  visible.forEach((x,i)=>{
    const row=document.createElement("div"); row.className="print-line";
    const desc=(x.description||"Online Service").trim();
    const qty=Number(x.qty)||0;
    row.innerHTML=`<span>${i+1}. ${esc(desc)}${qty>1?` × ${qty}`:""}</span><b>₹ ${money((Number(x.qty)||0)*(Number(x.rate)||0))}</b>`;
    t.appendChild(row);
  });
  while(t.children.length<7){const row=document.createElement("div");row.className="print-line empty";row.innerHTML=`<span></span><b></b>`;t.appendChild(row)}
}

function fill(d={}){
  currentBillId=d.id||null;
  $("billNo").value=d.billNo||nextNo();
  $("billDate").value=d.date||today();
  $("mobile").value=d.mobile||"";
  $("coach").value=d.coach||"";
  $("customerName").value=d.customerName||"";
  $("address").value=d.address||"";
  $("phone").value=d.phone||"";
  $("serviceType").value=d.serviceType||"";
  $("paymentStatus").value=d.paymentStatus||"Paid";
  $("paidAmount").value=Number(d.paidAmount||0);
  $("dueAmount").value=Number(d.dueAmount||0);
  $("paymentMethod").value=d.paymentMethod||"Cash";
  $("referenceNo").value=d.referenceNo||"";
  itemData=d.items?.length?d.items.map(x=>({...x})): [{description:"",qty:1,rate:0}];
  $("saveStatus").textContent="";
  renderItems(); sync();
}

function toast(s,big=false){
  const t=$("toast"); t.textContent=s; t.classList.add("show");
  if(big)t.classList.add("success-big");
  setTimeout(()=>{t.classList.remove("show");t.classList.remove("success-big")},3000);
}

async function save(){
  const d=data();
  if(!d.customerName)return alert("Customer Name is required.");
  if(!db || !auth?.currentUser)return alert("Firebase login is required.");
  $("saveStatus").textContent="Saving…";
  try{
    if(currentBillId){
      await updateDoc(doc(db,"bills",currentBillId),{...d,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid});
      $("saveStatus").textContent="Bill Updated ✓";
      toast("✓ BILL UPDATED SUCCESSFULLY",true);
    }else{
      const ref=await addDoc(collection(db,"bills"),{...d,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
      currentBillId=ref.id;
      $("saveStatus").textContent="Bill Saved ✓";
      toast("✓ BILL SAVED SUCCESSFULLY",true);
    }
    await loadBills();
  }catch(e){
    console.error(e);
    $("saveStatus").textContent="Save failed";
    alert("Firebase save failed: "+e.message);
  }
}

async function loadBills(){
  if(!db)return;
  try{
    const snap=await getDocs(query(collection(db,"bills"),orderBy("createdAt","desc"),limit(200)));
    allBills=snap.docs.map(x=>({id:x.id,...x.data()}));
    renderHistory(); renderCustomers();
  }catch(e){
    console.error(e);
    $("historyList").innerHTML="<div class='card'>Could not load bills. Check Firestore rules.</div>";
  }
}

function newBillFrom(x=null){
  fill({
    billNo:nextNo(), date:today(),
    mobile:x?.mobile||"", coach:x?.coach||"",
    customerName:x?.customerName||"", address:x?.address||"",
    phone:x?.phone||x?.mobile||"",
    items:[{description:"",qty:1,rate:0}]
  });
  showTab("billing");
  setTimeout(()=>{$("customerName").focus(); window.scrollTo({top:0,behavior:"smooth"})},80);
}

function renderHistory(){
  const q=$("historySearch").value.toLowerCase().trim();
  const a=allBills.filter(x=>(`${x.billNo} ${x.customerName} ${x.phone} ${x.mobile}`).toLowerCase().includes(q));
  $("historyList").innerHTML=(a.length?a:[null]).map(x=>x?`
    <div class="history-card">
      <div><b>Bill #${esc(x.billNo)}</b> — ${esc(x.customerName)}
      <div class="meta">${esc(x.date||"")} • ${esc(x.phone||x.mobile||"No phone")} • ₹ ${money(x.total)}</div></div>
      <div class="card-actions">
        <button data-open="${x.id}">Open</button>
        <button data-edit="${x.id}">Edit</button>
        <button data-new="${x.id}">New Bill</button>
        <button data-wa="${x.id}">WhatsApp</button>
      </div>
    </div>`:"<div class='card'>No matching bills found.</div>").join("");

  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{
    const x=allBills.find(v=>v.id===b.dataset.open); if(x){fill(x);showTab("billing")}
  });
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
    const x=allBills.find(v=>v.id===b.dataset.edit); if(x)openEditModal(x);
  });
  document.querySelectorAll("[data-new]").forEach(b=>b.onclick=()=>{
    const x=allBills.find(v=>v.id===b.dataset.new); newBillFrom(x);
  });
  document.querySelectorAll("[data-wa]").forEach(b=>b.onclick=()=>whatsapp(allBills.find(v=>v.id===b.dataset.wa)));
}

function renderCustomers(){
  const q=$("customerSearch").value.toLowerCase().trim(), m=new Map();
  allBills.forEach(x=>{
    const k=(x.phone||x.mobile||x.customerName||"").toLowerCase();
    if(!m.has(k))m.set(k,{...x,count:1,total:Number(x.total)||0});
    else{m.get(k).count++;m.get(k).total+=Number(x.total)||0}
  });
  const a=[...m.values()].filter(x=>`${x.customerName} ${x.phone} ${x.mobile}`.toLowerCase().includes(q));
  $("customerList").innerHTML=(a.length?a:[null]).map(x=>x?`
    <div class="customer-card"><div><b>${esc(x.customerName||"Unknown")}</b>
    <div class="meta">${esc(x.phone||x.mobile||"No phone")} • ${x.count} bill(s) • Total ₹ ${money(x.total)}</div></div>
    <div class="card-actions"><button data-cust-new="${esc(x.id)}">New Bill</button><button data-cust-edit="${esc(x.id)}">Edit</button></div></div>`:"<div class='card'>No customers found.</div>").join("");
  document.querySelectorAll("[data-cust-new]").forEach(b=>b.onclick=()=>{
    const x=allBills.find(v=>v.id===b.dataset.custNew); newBillFrom(x);
  });
  document.querySelectorAll("[data-cust-edit]").forEach(b=>b.onclick=()=>{
    const x=allBills.find(v=>v.id===b.dataset.custEdit); if(x)openEditModal(x);
  });
}

function openEditModal(x){
  editTarget=x;
  $("editName").value=x.customerName||"";
  $("editPhone").value=x.phone||x.mobile||"";
  $("editModal").classList.remove("hidden");
  $("editName").focus();
}
function closeEditModal(){editTarget=null;$("editModal").classList.add("hidden")}
async function saveCustomerEdit(){
  if(!editTarget)return;
  const name=$("editName").value.trim(), phone=$("editPhone").value.trim();
  if(!name)return alert("Customer Name cannot be empty.");
  if(!db || !auth?.currentUser)return alert("Firebase login is required.");
  try{
    await updateDoc(doc(db,"bills",editTarget.id),{
      customerName:name,phone,mobile:phone,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid
    });
    closeEditModal(); toast("✓ CUSTOMER DETAILS UPDATED",true); await loadBills();
  }catch(e){console.error(e);alert("Update failed: "+e.message)}
}

function showTab(tab){
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));
  ["billing","history","customers"].forEach(x=>$(x+"Tab").classList.toggle("hidden",x!==tab));
  if(tab==="billing")setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),30);
}

function whatsapp(d=null){
  d=d||data(); if(!d.customerName)return alert("Enter customer name first.");
  const phone=(d.phone||d.mobile||"").replace(/\D/g,"");
  const text=encodeURIComponent(`Hello ${d.customerName},\n\nMa Shamsundari Online Services\nBill No: ${d.billNo}\nDate: ${d.date}\nTotal: ₹ ${money(d.total)}\n\nThank you for choosing Ma Shamsundari Online Services.`);
  window.open(`https://wa.me/${phone}?text=${text}`,"_blank");
}

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$("addItemBtn").onclick=()=>{itemData.push({description:"",qty:1,rate:0});renderItems();sync()};
$("newBillBtn").onclick=()=>newBillFrom();
$("saveBtn").onclick=save;
$("printBtn").onclick=()=>window.print();
$("shareBtn").onclick=()=>whatsapp();
$("clearBtn").onclick=()=>newBillFrom();
$("historySearch").oninput=renderHistory;
$("refreshHistory").onclick=loadBills;
$("historyNewBill").onclick=()=>newBillFrom();
$("customerSearch").oninput=renderCustomers;
$("refreshCustomers").onclick=loadBills;
["billNo","billDate","mobile","coach","customerName","address","phone"].forEach(id=>$(id).addEventListener("input",sync));

$("loginBtn").onclick=async()=>{
  if(!auth)return $("loginMsg").textContent="Add Firebase config first.";
  try{await signInWithEmailAndPassword(auth,$("loginEmail").value,$("loginPassword").value);$("loginMsg").textContent=""}
  catch(e){$("loginMsg").textContent=e.message}
};
$("logoutBtn").onclick=()=>signOut(auth);

$("closeEdit").onclick=closeEditModal;
$("cancelEdit").onclick=closeEditModal;
$("saveEdit").onclick=saveCustomerEdit;
$("editModal").addEventListener("click",e=>{if(e.target.id==="editModal")closeEditModal()});

if(auth)onAuthStateChanged(auth,u=>{
  if(u){
    $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden");
    fill({billNo:nextNo(),date:today(),items:[{description:"",qty:1,rate:0}]});
    loadBills();
  }else{$("loginScreen").classList.remove("hidden");$("app").classList.add("hidden")}
});
else{$("loginScreen").classList.remove("hidden");$("app").classList.add("hidden")}

document.addEventListener("input", e=>{
  if(["paidAmount","serviceType","paymentStatus","paymentMethod","referenceNo"].includes(e.target?.id)) servicePaymentData();
});

setTimeout(servicePaymentData, 300);
