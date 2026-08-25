// ── FIREBASE CONFIG ──
const firebaseConfig={
  apiKey:"AIzaSyBaC8Wdxwavzb510AZMTiE6afIYLJJoiio",
  authDomain:"taphoa-8744f.firebaseapp.com",
  databaseURL:"https://taphoa-8744f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"taphoa-8744f",
  storageBucket:"taphoa-8744f.firebasestorage.app",
  messagingSenderId:"13251599726",
  appId:"1:13251599726:web:cf7a84fb4e259016c0f57f"
};

// Load Firebase SDK
let db=null,auth=null;
async function initFirebase(){
  return new Promise(resolve=>{
    if(db&&auth){resolve();return;}
    const s1=document.createElement('script');
    s1.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    s1.onload=()=>{
      const s2=document.createElement('script');
      s2.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
      s2.onload=()=>{
        const s3=document.createElement('script');
        s3.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
        s3.onload=()=>{
          if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
          db=firebase.database();
          auth=firebase.auth();
          resolve();
        };
        document.head.appendChild(s3);
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
}

// ── ĐĂNG NHẬP ──
async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  if(!email||!pass){document.getElementById('login-err').style.display='block';return;}
  const btn=document.getElementById('login-btn');
  btn.disabled=true;btn.textContent='Đang đăng nhập...';
  document.getElementById('login-err').style.display='none';
  try{
    await auth.signInWithEmailAndPassword(email,pass);
  }catch(e){
    document.getElementById('login-err').style.display='block';
    btn.disabled=false;btn.textContent='Đăng nhập';
  }
}

// ── ĐĂNG XUẤT ──
async function doLogout(){
  if(confirm('Bạn muốn đăng xuất?')){
    await auth.signOut();
    closeMenu();
    document.getElementById('login-screen').style.display='flex';
    document.getElementById('sb').style.display='none';
    document.getElementById('main').style.display='none';
    document.getElementById('login-email').value='';
    document.getElementById('login-pass').value='';
    document.getElementById('login-btn').disabled=false;
    document.getElementById('login-btn').textContent='Đăng nhập';
  }
}

let C={TK:[],NH:[],NCC:[],USER:[],GH:[],XH:[],LOG:[],GHK:[]};
let SETTINGS={sapHet:10,ganHet:3,hsdSap:30,hsdGan:7};// ngưỡng mặc định dùng chung, SP nào không đặt riêng thì dùng cái này

// ── FIREBASE API ──
async function apiGet(sheet){
  await initFirebase();
  try{
    const snap=await db.ref(sheet).once('value');
    const val=snap.val();
    if(!val)return[];
    // Firebase lưu object, convert sang array
    return Object.values(val).sort((a,b)=>(a._idx||0)-(b._idx||0)).map(r=>r.data||r);
  }catch(e){console.error(e);return[];}
}

async function apiPost(data){
  await initFirebase();
  try{
    const sheet=data.sheet;
    const ref=db.ref(sheet);
    if(data.action==='append'){
      const newRef=ref.push();
      const snap=await ref.once('value');
      const idx=snap.numChildren();
      await newRef.set({_idx:idx,_key:newRef.key,data:data.row});
    } else if(data.action==='update'){
      const snap=await ref.once('value');
      const items=snap.val();
      if(!items)return false;
      const keys=Object.keys(items).sort((a,b)=>(items[a]._idx||0)-(items[b]._idx||0));
      const targetKey=keys[data.row-2];// row-2 vì bỏ header (row 1)
      if(targetKey)await ref.child(targetKey).update({data:data.data});
    } else if(data.action==='delete'){
      const snap=await ref.once('value');
      const items=snap.val();
      if(!items)return false;
      const keys=Object.keys(items).sort((a,b)=>(items[a]._idx||0)-(items[b]._idx||0));
      const targetKey=keys[data.row-2];
      if(targetKey)await ref.child(targetKey).remove();
    }
    return true;
  }catch(e){console.error(e);return false;}
}

// apiGetRaw dùng để check initialized
async function apiGetRaw(sheet){
  return await apiGet(sheet);
}

function fmt(n){return Number(n||0).toLocaleString('vi-VN');}
function td(){return new Date().toISOString().slice(0,10);}

// ── XÁC ĐỊNH NGƯỜI ĐANG ĐĂNG NHẬP ── map email tài khoản Firebase Auth đang dùng ↔ bản ghi "Người dùng"
// để tự động biết "ai đang thao tác" thay vì bắt chọn tay mỗi lần
function findUserByEmail(email){
  if(!email)return null;
  return C.USER.find(r=>(r[4]||'').toLowerCase()===String(email).toLowerCase())||null;
}
function currentUserName(){
  const u=auth&&auth.currentUser;
  if(!u)return'';
  const rec=findUserByEmail(u.email);
  return rec?rec[0]:(u.email||'');
}

// ── NHẬT KÝ HOẠT ĐỘNG (Log) ── ghi lại ai vừa tạo mới/cập nhật/xóa gì, khi nào
// Không await/chặn luồng chính — ghi log lỗi (mất mạng...) không được làm hỏng thao tác chính của người dùng
function logAction(hanhDong,doiTuong,moTa){
  const nguoiDung=(auth&&auth.currentUser&&auth.currentUser.email)||'';
  const thoiGian=new Date().toISOString();
  apiPost({sheet:'Log',action:'append',row:[thoiGian,nguoiDung,hanhDong,doiTuong,moTa]}).catch(()=>{});
}
function fmtDT(iso){
  if(!iso)return'';
  const d=new Date(iso);
  if(isNaN(d))return iso;
  return d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function ym(d){return d?String(d).slice(0,7):'';}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className='show '+type;setTimeout(()=>t.className='',2500);}
function om(id){document.getElementById(id).classList.add('on');}
function cm(id){document.getElementById(id).classList.remove('on');}
// Cập nhật hiện/ẩn nút "Xóa đã chọn" + số lượng đang chọn — dùng chung cho mọi bảng có checkbox chọn nhiều
function updateSelUI(btnId,cntId,size){
  document.getElementById(cntId).textContent=size;
  document.getElementById(btnId).style.display=size?'inline-flex':'none';
}
// Cập nhật trạng thái checkbox "chọn tất cả" (tick/indeterminate) theo các checkbox đang hiển thị — dùng chung
function updateSelAllTri(allId,chkClass,selSet){
  const all=document.getElementById(allId);
  if(!all)return;
  const chks=[...document.querySelectorAll('.'+chkClass)];
  const checkedCnt=chks.filter(c=>selSet.has(Number(c.dataset.idx))).length;
  all.checked=chks.length>0&&checkedCnt===chks.length;
  all.indeterminate=checkedCnt>0&&checkedCnt<chks.length;
}
function mkMonths(data,di,sel){
  const months=[...new Set(data.map(r=>ym(r[di])).filter(Boolean))].sort().reverse();
  const cur=sel.value;
  sel.innerHTML='<option value="">Tất cả tháng</option>'+months.map(m=>`<option value="${m}"${m===cur?' selected':''}>${m}</option>`).join('');
}
function filterM(data,di,sel){const m=sel?sel.value:'';return m?data.filter(r=>ym(r[di])===m):data;}
function confirmDel(msg,fn){if(confirm(msg))fn();}

// ── HAMBURGER MENU (mobile) ──
function toggleMenu(){
  const open=document.getElementById('sb').classList.toggle('mnu-open');
  document.getElementById('mnu-backdrop').classList.toggle('on',open);
  document.getElementById('mnu-btn').textContent=open?'✕':'☰';
}
function closeMenu(){
  document.getElementById('sb').classList.remove('mnu-open');
  document.getElementById('mnu-backdrop').classList.remove('on');
  document.getElementById('mnu-btn').textContent='☰';
}

// ── KHỐI TÌM KIẾM & LỌC (<details class="sb-wrap">): mặc định ẨN trên điện thoại
// (người dùng bấm "🔍 Tìm kiếm & lọc" để mở), nhưng LUÔN MỞ trên desktop vì nút bấm bị ẩn ở đó ──
function syncSBWrap(){
  const isDesktop=!window.matchMedia('(max-width:480px)').matches;
  if(!isDesktop)return;// ở mobile giữ nguyên trạng thái đóng/mở người dùng đang chọn
  document.querySelectorAll('.sb-wrap').forEach(d=>{d.open=true;});
}
window.addEventListener('resize',syncSBWrap);
syncSBWrap();// đặt trạng thái đúng ngay khi tải trang

function go(name){
  closeMenu();
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('#sb nav a').forEach(a=>a.classList.remove('on'));
  document.getElementById('s-'+name).classList.add('on');
  document.getElementById('n-'+name).classList.add('on');
  const titles={dash:'Tổng quan',tk:'Tồn kho',nh:'Nhập hàng',xh:'Xếp hàng',ghk:'Đồ gian hàng',log:'Nhật ký hoạt động',setting:'Cài đặt'};
  document.getElementById('ptitle').textContent=titles[name];
  const btns={
    tk:`<button class="btn btn-p" onclick="initSPForm();om('m-sp')">+ Thêm sản phẩm</button>`,
    nh:`<button class="btn btn-s" onclick="openNH()">+ Tạo phiếu nhập</button>`,
    xh:`<button class="btn btn-s" onclick="openXH()">+ Tạo phiếu xếp</button>`,
    ghk:`<button class="btn btn-g" onclick="loadGHK()">↻ Làm mới</button>`,
    dash:`<button class="btn btn-g" onclick="loadDash()">↻ Làm mới</button>`,
    log:`<button class="btn btn-g" onclick="loadLog()">↻ Làm mới</button>`,
    setting:''
  };
  document.getElementById('acts').innerHTML=btns[name]||'';
  if(name==='tk')loadTK();
  else if(name==='nh')loadNH();
  else if(name==='xh')loadXH();
  else if(name==='ghk')loadGHK();
  else if(name==='log')loadLog();
  else if(name==='setting'){loadCaiDat();loadUser();loadNCC();loadGH();}
  else loadDash();
}
// Tab con trong màn Cài đặt: Ngưỡng cảnh báo / Người dùng / Nhà cung cấp / Gian hàng
function goSetTab(name){
  document.querySelectorAll('#s-setting .tabs .tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('#s-setting .set-tab').forEach(t=>t.classList.remove('on'));
  document.getElementById('st-'+name).classList.add('on');
  document.getElementById('set-'+name).classList.add('on');
}

// ══ DASHBOARD ══
let dashLow=[];
function renderDLow(){
  const mode=document.getElementById('srt-dash')?.value||'status';
  const data=sortByMode(dashLow,mode);
  document.getElementById('d-low').innerHTML=data.length===0?'<div class="empty">✅ Không có hàng sắp hết</div>':
    '<div class="scroll-tbl"><table><thead><tr><th>Sản phẩm</th><th>Tồn</th><th>Trạng thái</th></tr></thead><tbody>'+
    data.map(r=>`<tr><td>${r[0]}</td><td>${r[1]} ${r[2]||''}</td><td>${statusBadge(r)}</td></tr>`).join('')+'</tbody></table></div>';
}
async function loadDash(){
  const tk=await apiGet('TonKho');
  C.TK=tk;
  document.getElementById('d-sp').textContent=tk.length;
  dashLow=tk.filter(r=>Number(r[1]||0)<=getSapHet(r));
  document.getElementById('d-sh').textContent=dashLow.length;
  document.getElementById('lbadge').style.display=dashLow.length?'inline':'none';
  renderDLow();
  // Hàng sắp hết hạn sử dụng: HSD đã qua hoặc còn ≤ ngưỡng riêng SP (hoặc mặc định) — chỉ tính SP có ghi HSD
  const ts=td();
  const daysLeftOf=r=>Math.round((new Date(r[5])-new Date(ts))/86400000);
  const exp=tk.filter(r=>r[5]&&Number(r[1]||0)>0&&daysLeftOf(r)<=getHsdSap(r)).sort((a,b)=>(a[5]||'').localeCompare(b[5]||''));
  document.getElementById('d-hsd').textContent=exp.length;
  document.getElementById('d-exp').innerHTML=exp.length===0?'<div class="empty">✅ Không có hàng sắp hết hạn</div>':
    '<div class="scroll-tbl"><table><thead><tr><th>Sản phẩm</th><th>HSD</th><th>Trạng thái</th></tr></thead><tbody>'+
    exp.map(r=>{
      const daysLeft=daysLeftOf(r);
      const badge=daysLeft<0?'<span class="bg bg-r">Đã hết hạn</span>':daysLeft<=getHsdGan(r)?`<span class="bg bg-r">Còn ${daysLeft} ngày</span>`:`<span class="bg bg-y">Còn ${daysLeft} ngày</span>`;
      return`<tr><td>${r[0]}</td><td>${r[5]}</td><td>${badge}</td></tr>`;
    }).join('')+'</tbody></table></div>';
  renderDashChart(tk);
  document.getElementById('sync').innerHTML='Trạng thái: <b>Đã đồng bộ ✓</b>';
}

// ── Biểu đồ tròn "Tồn kho theo trạng thái" (gộp SP theo Hết hàng/Gần hết/Sắp hết/Còn hàng) ──
let dashChartMode='chart';
function toggleChartView(){
  dashChartMode=dashChartMode==='chart'?'table':'chart';
  document.getElementById('d-chart-toggle').textContent=dashChartMode==='chart'?'📋 Xem bảng':'📊 Xem biểu đồ';
  renderDashChart(C.TK);
}
function renderDashChart(tk){
  if(dashChartMode==='table')renderDashChartTable(tk);else renderDashDonut(tk);
}
function renderDashChartTable(tk){
  const el=document.getElementById('d-chart');
  const data=[...tk].sort((a,b)=>Number(b[1]||0)-Number(a[1]||0));
  if(!data.length){el.innerHTML='<div class="empty">📦 Chưa có sản phẩm</div>';return;}
  el.innerHTML='<div class="scroll-tbl"><table><thead><tr><th>Sản phẩm</th><th>Tồn</th><th>Trạng thái</th></tr></thead><tbody>'+
    data.map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${statusBadge(r)}</td></tr>`).join('')+'</tbody></table></div>';
}
function renderDashDonut(tk){
  const el=document.getElementById('d-chart');
  const total=tk.length;
  if(!total){el.innerHTML='<div class="empty">📦 Chưa có sản phẩm</div>';return;}
  const counts={het:0,gan:0,sap:0,con:0};
  tk.forEach(r=>counts[stTK(r)]++);
  const segs=STATUS_ORDER.map(k=>({label:STATUS_DEF[k].label,color:STATUS_DEF[k].hex,val:counts[k]})).filter(s=>s.val>0);

  const size=210,cx=size/2,cy=size/2,R=72,thick=30;
  const circ=2*Math.PI*R;
  let acc=0;
  const arcs=segs.map((s,i)=>{
    const frac=s.val/total;
    const dash=frac*circ;
    const offset=-acc*circ;
    acc+=frac;
    return`<circle class="donut-seg" data-i="${i}" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${s.color}" stroke-width="${thick}" stroke-dasharray="${Math.max(dash-1,0)} ${circ}" stroke-dashoffset="${offset}" stroke-linecap="butt"></circle>`;
  }).join('');

  el.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap">
    <svg viewBox="0 0 ${size} ${size}" style="width:210px;height:210px;flex-shrink:0">
      <g transform="rotate(-90 ${cx} ${cy})">${arcs}</g>
      <text x="${cx}" y="${cy-5}" text-anchor="middle" class="donut-total-num">${total}</text>
      <text x="${cx}" y="${cy+16}" text-anchor="middle" class="donut-total-lb">sản phẩm</text>
    </svg>
    <div class="donut-list">
      ${segs.map(s=>`<div class="donut-row"><i class="lg-dot" style="background:${s.color}"></i><span class="donut-row-lb">${s.label}</span><b>${s.val}</b><span class="donut-row-pct">${Math.round(s.val/total*100)}%</span></div>`).join('')}
    </div>
  </div>`;

  const tip=document.getElementById('d-chart-tip');
  el.querySelectorAll('.donut-seg').forEach((c,i)=>{
    const s=segs[i];
    const show=e=>{
      tip.textContent='';
      const b=document.createElement('b');b.textContent=s.val+' SP ';
      tip.appendChild(b);
      tip.appendChild(document.createTextNode('— '+s.label+' ('+Math.round(s.val/total*100)+'%)'));
      tip.style.display='block';
      const tx=Math.min(e.clientX+14,window.innerWidth-220);
      tip.style.left=tx+'px';tip.style.top=(e.clientY+14)+'px';
      c.style.filter='brightness(1.1)';
    };
    const hide=()=>{tip.style.display='none';c.style.filter='';};
    c.addEventListener('pointermove',show);
    c.addEventListener('pointerenter',show);
    c.addEventListener('pointerleave',hide);
  });
}

// ══ TỒN KHO ══
let selTK=new Set();
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
async function loadTK(){
  document.getElementById('tk-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selTK.clear();updateTKSelUI();
  const data=await apiGet('TonKho');C.TK=data;
  const low=data.filter(r=>Number(r[1]||0)<=getSapHet(r));
  const al=document.getElementById('la');
  if(low.length){al.style.display='flex';document.getElementById('la-txt').textContent=low.length+' SP sắp hết: '+low.slice(0,4).map(r=>r[0]).join(', ')+(low.length>4?'...':'');}
  else al.style.display='none';
  document.getElementById('tk-cnt').textContent=data.length+' sản phẩm';
  fTK();
}
// Tiêu đề cột bấm được để sắp xếp — mỗi cột 1 khóa so sánh riêng
const TK_COLS=[
  {key:'ma',label:'Mã SP'},{key:'ten',label:'Tên SP'},{key:'ton',label:'Tồn'},
  {key:'gia',label:'Giá nhập'},{key:'hsd',label:'Hạn sử dụng'},{key:'status',label:'Trạng thái'}
];
let tkSortCol='status',tkSortDir=1;// dir: 1=tăng dần, -1=giảm dần
function sortTKClick(col){
  if(tkSortCol===col)tkSortDir*=-1;else{tkSortCol=col;tkSortDir=1;}
  fTK();
}
function tkCompare(a,b,col){
  switch(col){
    case'ma':return(a[9]||'').localeCompare(b[9]||'');
    case'ten':return(a[0]||'').localeCompare(b[0]||'');
    case'ton':return Number(a[1]||0)-Number(b[1]||0);
    case'gia':return Number(a[3]||0)-Number(b[3]||0);
    case'hsd':return(a[5]||'').localeCompare(b[5]||'');
    default:return statusRank(a)-statusRank(b)||(a[0]||'').localeCompare(b[0]||'');
  }
}
function rTK(data){
  const el=document.getElementById('tk-tbl');
  if(!data.length){el.innerHTML='<div class="empty">📦 Chưa có sản phẩm</div>';return;}
  const ths=TK_COLS.map(c=>{
    const on=tkSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortTKClick('${c.key}')">${c.label} <span class="sort-ic">${on?(tkSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="tk-selall" onchange="toggleAllTK(this)"></th><th style="width:40px">STT</th>${ths}<th></th></tr></thead><tbody>`+
    data.map((r,i)=>{
      const gi=C.TK.indexOf(r);// vị trí thật trong C.TK, tránh lệch dòng khi đang lọc/sắp xếp
      const sl=Number(r[1]||0),gn=Number(r[3]||0);
      const chk=selTK.has(r[0])?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="tk-chk" data-name="${esc(r[0])}" ${chk} onchange="toggleTKChk(this)"></td><td class="mobile-hide" data-label="STT">${i+1}</td><td class="mobile-hide" data-label="Mã SP">${r[9]?`<span class="bg bg-b">${r[9]}</span>`:''}</td><td data-label="Tên SP"><b>${r[0]}</b></td><td data-label="Tồn"><b>${sl}</b></td><td data-label="Giá nhập">${gn?fmt(gn)+'đ':''}</td><td class="mobile-hide" data-label="Hạn sử dụng">${r[5]||''}</td><td data-label="Trạng thái">${statusBadge(r)}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editSP(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delSP(${gi+2},'${r[0]}')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateTKSelUI();
}
// Ngưỡng "Sắp hết"/"Gần hết" của 1 sản phẩm: ưu tiên số riêng SP đã đặt, không có thì dùng mặc định ở Cài đặt
function getSapHet(r){return Number(r[7])>0?Number(r[7]):SETTINGS.sapHet;}
function getGanHet(r){return Number(r[10])>0?Number(r[10]):SETTINGS.ganHet;}
// Ngưỡng "Sắp hết hạn"/"Gấp" (theo số ngày còn lại tới HSD) của 1 sản phẩm: ưu tiên số riêng, không có thì dùng mặc định
function getHsdSap(r){return Number(r[11])>0?Number(r[11]):SETTINGS.hsdSap;}
function getHsdGan(r){return Number(r[12])>0?Number(r[12]):SETTINGS.hsdGan;}
// ── Trạng thái tồn kho: ĐỊNH NGHĨA DUY NHẤT dùng chung toàn app (bảng, badge, biểu đồ, filter, sort) ──
// Sửa tên/màu ở ĐÂY là áp dụng khắp nơi, không sợ mỗi chỗ hiển thị 1 kiểu khác nhau nữa.
const STATUS_ORDER=['het','gan','sap','con'];// thứ tự khẩn cấp: khẩn cấp nhất → yên tâm nhất
const STATUS_DEF={
  het:{label:'Hết hàng', cls:'bg-r', hex:'#d03b3b'},
  gan:{label:'Gần hết',  cls:'bg-o', hex:'#ec835a'},
  sap:{label:'Sắp hết',  cls:'bg-y', hex:'#fab219'},
  con:{label:'Còn hàng', cls:'bg-g', hex:'#0ca30c'}
};
function stTK(r){
  const sl=Number(r[1]||0);
  if(sl<=0)return'het';
  if(sl<=getGanHet(r))return'gan';
  if(sl<=getSapHet(r))return'sap';
  return'con';
}
function statusLabel(r){return STATUS_DEF[stTK(r)].label;}
function statusBadge(r){const d=STATUS_DEF[stTK(r)];return`<span class="bg ${d.cls}">${d.label}</span>`;}
// Mức độ khẩn cấp dạng số (0=khẩn cấp nhất) — dùng để sắp xếp
function statusRank(r){return STATUS_ORDER.indexOf(stTK(r));}
// Sắp xếp dùng chung cho Tồn kho + danh sách "Hàng cần nhập gấp" ở Tổng quan
function sortByMode(data,mode){
  const arr=[...data];
  if(mode==='name')arr.sort((a,b)=>(a[0]||'').localeCompare(b[0]||''));
  else if(mode==='sl-asc')arr.sort((a,b)=>Number(a[1]||0)-Number(b[1]||0));
  else if(mode==='sl-desc')arr.sort((a,b)=>Number(b[1]||0)-Number(a[1]||0));
  else arr.sort((a,b)=>statusRank(a)-statusRank(b)||(a[0]||'').localeCompare(b[0]||''));// 'status' (mặc định): khẩn cấp trước
  return arr;
}
function fTK(){
  const q=document.getElementById('q-tk').value.toLowerCase();
  const st=document.getElementById('st-tk').value;
  const filtered=C.TK.filter(r=>((r[0]||'').toLowerCase().includes(q)||(r[9]||'').toLowerCase().includes(q))&&(!st||stTK(r)===st));
  filtered.sort((a,b)=>tkCompare(a,b,tkSortCol)*tkSortDir);
  rTK(filtered);
}

// ── chọn nhiều & xóa hàng loạt ──
function toggleTKChk(el){
  const name=el.dataset.name;
  if(el.checked)selTK.add(name);else selTK.delete(name);
  updateTKSelUI();
}
function toggleAllTK(el){
  document.querySelectorAll('#tk-tbl .tk-chk').forEach(c=>{
    c.checked=el.checked;
    if(el.checked)selTK.add(c.dataset.name);else selTK.delete(c.dataset.name);
  });
  updateTKSelUI();
}
function updateTKSelUI(){
  const btn=document.getElementById('tk-delsel-btn');
  document.getElementById('tk-selcnt').textContent=selTK.size;
  btn.style.display=selTK.size?'inline-flex':'none';
  const all=document.getElementById('tk-selall');
  if(all){
    const chks=[...document.querySelectorAll('#tk-tbl .tk-chk')];
    all.checked=chks.length>0&&chks.every(c=>c.checked);
    all.indeterminate=chks.some(c=>c.checked)&&!all.checked;
  }
}
async function delSelTK(){
  const names=[...selTK];
  if(!names.length){toast('Chưa chọn sản phẩm nào','err');return;}
  confirmDel(`Xóa ${names.length} sản phẩm đã chọn?`,async()=>{
    toast('Đang xóa '+names.length+' sản phẩm...');
    // xóa từ index lớn → nhỏ để tránh lệch vị trí các dòng còn lại
    const idxs=names.map(n=>C.TK.findIndex(r=>r[0]===n)).filter(i=>i>=0).sort((a,b)=>b-a);
    for(const i of idxs){
      await apiPost({sheet:'TonKho',action:'delete',row:i+2});
    }
    logAction('Xóa','Tồn kho',`Xóa hàng loạt ${idxs.length} sản phẩm: ${names.join(', ')}`);
    selTK.clear();
    toast('Đã xóa '+idxs.length+' sản phẩm!');setTimeout(loadTK,800);
  });
}
// Nạp gợi ý NCC (datalist dùng chung) cho các ô "Nhà cung cấp" — vẫn cho gõ tự do, không bắt buộc chọn
async function fillNCCDatalist(){
  if(!C.NCC.length)await loadNCC();
  document.getElementById('ncc-datalist').innerHTML=C.NCC.map(r=>`<option value="${esc(r[0])}">`).join('');
}
function initSPForm(){document.getElementById('m-sp-t').textContent='Thêm sản phẩm';['sp-ma','sp-ten','sp-sl','sp-dv','sp-gn','sp-gb','sp-hsd','sp-ng','sp-gh','sp-hsdsap','sp-hsdgan','sp-ncc'].forEach(id=>document.getElementById(id).value='');document.getElementById('sp-row').value='';fillNCCDatalist();}
function editSP(row){
  const r=C.TK[row-2];document.getElementById('m-sp-t').textContent='Sửa sản phẩm';
  document.getElementById('sp-ten').value=r[0]||'';document.getElementById('sp-sl').value=r[1]||'';
  document.getElementById('sp-dv').value=r[2]||'';document.getElementById('sp-gn').value=r[3]||'';
  document.getElementById('sp-gb').value=r[4]||'';document.getElementById('sp-hsd').value=r[5]||'';
  document.getElementById('sp-ng').value=r[7]||'';document.getElementById('sp-ncc').value=r[8]||'';
  document.getElementById('sp-ma').value=r[9]||'';
  document.getElementById('sp-gh').value=r[10]||'';
  document.getElementById('sp-hsdsap').value=r[11]||'';
  document.getElementById('sp-hsdgan').value=r[12]||'';
  document.getElementById('sp-row').value=row;om('m-sp');
  fillNCCDatalist();
}
async function delSP(row,name){
  confirmDel(`Xóa sản phẩm "${name}"?`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'TonKho',action:'delete',row:Number(row)});
    logAction('Xóa','Tồn kho',`Sản phẩm "${name}"`);
    toast('Đã xóa '+name);setTimeout(loadTK,800);
  });
}
async function saveSP(){
  const ten=document.getElementById('sp-ten').value.trim();if(!ten){toast('Nhập tên SP','err');return;}
  const ng=document.getElementById('sp-ng').value, gh=document.getElementById('sp-gh').value;
  if(ng&&gh&&Number(gh)>Number(ng)){toast('Ngưỡng "Gần hết" phải ≤ ngưỡng "Sắp hết"','err');return;}
  const hsdSap=document.getElementById('sp-hsdsap').value, hsdGan=document.getElementById('sp-hsdgan').value;
  if(hsdSap&&hsdGan&&Number(hsdGan)>Number(hsdSap)){toast('Ngưỡng HSD "Gấp" phải ≤ ngưỡng "Sắp hết hạn"','err');return;}
  const row=[ten,document.getElementById('sp-sl').value||0,document.getElementById('sp-dv').value,document.getElementById('sp-gn').value||0,document.getElementById('sp-gb').value||0,document.getElementById('sp-hsd').value,td(),ng,document.getElementById('sp-ncc').value,document.getElementById('sp-ma').value.trim(),gh,hsdSap,hsdGan];
  const er=document.getElementById('sp-row').value;
  toast('Đang lưu...');
  await apiPost(er?{sheet:'TonKho',action:'update',row:Number(er),data:row}:{sheet:'TonKho',action:'append',row});
  logAction(er?'Cập nhật':'Tạo mới','Tồn kho',`Sản phẩm "${ten}", SL: ${row[1]}`);
  toast(er?'Đã cập nhật':'Đã thêm sản phẩm');cm('m-sp');setTimeout(loadTK,800);
}

// ══ NHẬP HÀNG NHIỀU DÒNG ══
let nhRowCount=0;
function addNHRow(){
  nhRowCount++;
  const id=nhRowCount;
  const opts=C.TK.map((r,i)=>`<option value="${i}">${r[0]} (tồn:${r[1]})</option>`).join('');
  const tr=document.createElement('tr');
  tr.id='nh-r-'+id;
  tr.innerHTML=`<td><select onchange="nhFillGia(${id})" id="nh-sp-${id}"><option value="">-- Chọn --</option>${opts}</select></td>
    <td><input type="number" id="nh-sl-${id}" placeholder="0" oninput="nhCalc(${id},'sl')" style="width:70px"></td>
    <td><input type="number" id="nh-gia-${id}" placeholder="0" oninput="nhCalc(${id},'gia')" style="width:90px"></td>
    <td><input type="number" id="nh-tong-${id}" placeholder="0" oninput="nhCalc(${id},'tong')" style="width:100px"></td>
    <td><input type="date" id="nh-hsd-${id}" style="width:130px"></td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="document.getElementById('nh-r-${id}').remove();calcNH()">✕</button></td>`;
  document.getElementById('nh-rows').appendChild(tr);
}
// Chọn sản phẩm → gợi ý sẵn Giá nhập = giá nhập cũ trong Tồn kho, rồi tính lại Tổng theo giá đó
function nhFillGia(id){
  const sel=document.getElementById('nh-sp-'+id);
  const idx=sel.value;
  if(idx!==''){
    document.getElementById('nh-gia-'+id).value=C.TK[idx][3]||0;
    nhCalc(id,'gia');
  } else calcNH();
}
// Liên kết 2 chiều: Số lượng/Giá nhập đổi → tính lại Tổng giá nhập (SL×Giá);
// Tổng giá nhập đổi (kèm SL) → tính ngược lại Giá nhập/SP (Tổng÷SL)
function nhCalc(id,changed){
  const slEl=document.getElementById('nh-sl-'+id);
  const giaEl=document.getElementById('nh-gia-'+id);
  const tongEl=document.getElementById('nh-tong-'+id);
  const sl=Number(slEl.value||0);
  if(changed==='tong'){
    const tong=Number(tongEl.value||0);
    if(sl>0)giaEl.value=Math.round(tong/sl);
  } else {
    const gia=Number(giaEl.value||0);
    tongEl.value=sl*gia||'';
  }
  calcNH();
}
function calcNH(){
  let tsl=0,ttt=0;
  const rows=document.getElementById('nh-rows').querySelectorAll('tr');
  rows.forEach(tr=>{
    const id=tr.id.replace('nh-r-','');
    tsl+=Number(document.getElementById('nh-sl-'+id)?.value||0);
    ttt+=Number(document.getElementById('nh-tong-'+id)?.value||0);
  });
  document.getElementById('nh-tsl').textContent=fmt(tsl);
  document.getElementById('nh-ttt').textContent=fmt(ttt)+'đ';
}
async function openNH(){
  if(!C.TK.length)await loadTK();
  if(!C.USER.length)await loadUser();
  document.getElementById('nh-user').innerHTML='<option value="">-- Chọn --</option>'+C.USER.map(r=>`<option>${r[0]}</option>`).join('');
  // Tự điền sẵn "Người nhập" theo tài khoản đang đăng nhập (nếu tài khoản này có gắn với 1 Người dùng) — đỡ phải chọn tay
  const cur=currentUserName();
  if(cur&&C.USER.some(u=>u[0]===cur))document.getElementById('nh-user').value=cur;
  document.getElementById('nh-ngay').value=td();
  document.getElementById('nh-ncc').value='';
  document.getElementById('nh-gc').value='';
  document.getElementById('nh-rows').innerHTML='';nhRowCount=0;
  addNHRow();calcNH();om('m-nh');
  fillNCCDatalist();
}
async function saveNH(){
  const user=document.getElementById('nh-user').value;
  const ngay=document.getElementById('nh-ngay').value;
  const ncc=document.getElementById('nh-ncc').value;
  const gc=document.getElementById('nh-gc').value;
  const rows=document.getElementById('nh-rows').querySelectorAll('tr');
  const items=[];
  rows.forEach(tr=>{
    const id=tr.id.replace('nh-r-','');
    const idx=document.getElementById('nh-sp-'+id)?.value;
    const sl=Number(document.getElementById('nh-sl-'+id)?.value||0);
    const gia=Number(document.getElementById('nh-gia-'+id)?.value||0);// đã tự đồng bộ với Tổng giá nhập qua nhCalc()
    const hsd=document.getElementById('nh-hsd-'+id)?.value||'';
    if(idx!==''&&idx!==undefined&&sl>0)items.push({idx:Number(idx),sp:C.TK[idx],sl,gia,hsd});
  });
  if(!user){toast('Chọn người nhập','err');return;}
  if(!items.length){toast('Thêm ít nhất 1 sản phẩm','err');return;}
  toast('Đang lưu '+items.length+' sản phẩm...');
  for(const it of items){
    const nccGhi=ncc||it.sp[8]||'';
    await apiPost({sheet:'NhapHang',action:'append',row:[it.sp[0],it.sl,it.gia,nccGhi,ngay,gc,user,it.hsd]});
    const newSL=Number(it.sp[1]||0)+it.sl;const upd=[...it.sp];upd[1]=newSL;
    if(it.gia>0)upd[3]=it.gia;// cập nhật giá nhập mới nhất vào Tồn kho
    if(it.hsd)upd[5]=it.hsd;// cập nhật hạn sử dụng mới nhất vào Tồn kho
    if(ncc)upd[8]=ncc;// cập nhật nhà cung cấp mới nhất vào Tồn kho (chỉ khi có nhập NCC ở phiếu)
    await apiPost({sheet:'TonKho',action:'update',row:it.idx+2,data:upd});
    C.TK[it.idx][1]=newSL;if(it.gia>0)C.TK[it.idx][3]=it.gia;if(it.hsd)C.TK[it.idx][5]=it.hsd;if(ncc)C.TK[it.idx][8]=ncc;
  }
  logAction('Tạo mới','Nhập hàng',`Người nhập: ${user} — ${items.map(it=>`${it.sp[0]} x${it.sl}`).join(', ')}`);
  toast('Đã nhập '+items.length+' sản phẩm thành công!');cm('m-nh');setTimeout(loadNH,800);
}

// ── SỬA 1 DÒNG NHẬP HÀNG ──
async function editNH(row){
  const r=C.NH[row-2];if(!r){toast('Không tìm thấy phiếu nhập','err');return;}
  if(!C.TK.length)await loadTK();
  if(!C.USER.length)await loadUser();
  document.getElementById('nhe-sp').innerHTML=C.TK.map((t,i)=>`<option value="${i}"${t[0]===r[0]?' selected':''}>${t[0]} (tồn:${t[1]})</option>`).join('');
  document.getElementById('nhe-sl').value=r[1]||'';
  document.getElementById('nhe-gia').value=r[2]||'';
  document.getElementById('nhe-tong').value=Number(r[1]||0)*Number(r[2]||0)||'';
  document.getElementById('nhe-ncc').value=r[3]||'';
  document.getElementById('nhe-ngay').value=r[4]||'';
  document.getElementById('nhe-gc').value=r[5]||'';
  document.getElementById('nhe-user').innerHTML='<option value="">-- Chọn --</option>'+C.USER.map(u=>`<option${u[0]===r[6]?' selected':''}>${u[0]}</option>`).join('');
  document.getElementById('nhe-hsd').value=r[7]||'';
  document.getElementById('nhe-row').value=row;
  om('m-nh-edit');
  fillNCCDatalist();
}
// Liên kết 2 chiều: SL/Giá nhập đổi → tính lại Tổng (SL×Giá); Tổng đổi (kèm SL) → tính ngược Giá nhập (Tổng÷SL)
function nheCalc(changed){
  const slEl=document.getElementById('nhe-sl');
  const giaEl=document.getElementById('nhe-gia');
  const tongEl=document.getElementById('nhe-tong');
  const sl=Number(slEl.value||0);
  if(changed==='tong'){
    const tong=Number(tongEl.value||0);
    if(sl>0)giaEl.value=Math.round(tong/sl);
  } else {
    const gia=Number(giaEl.value||0);
    tongEl.value=sl*gia||'';
  }
}
async function saveNHEdit(){
  const row=Number(document.getElementById('nhe-row').value);
  const old=C.NH[row-2];if(!old){toast('Không tìm thấy phiếu nhập','err');return;}
  const spIdx=Number(document.getElementById('nhe-sp').value);
  const sp=C.TK[spIdx];
  const sl=Number(document.getElementById('nhe-sl').value||0);
  const gia=Number(document.getElementById('nhe-gia').value||0);// đã tự đồng bộ với Tổng giá nhập qua nheCalc()
  const ncc=document.getElementById('nhe-ncc').value;
  const ngay=document.getElementById('nhe-ngay').value;
  const gc=document.getElementById('nhe-gc').value;
  const user=document.getElementById('nhe-user').value;
  const hsd=document.getElementById('nhe-hsd').value;
  if(!sp){toast('Chọn sản phẩm','err');return;}
  if(!sl||sl<=0){toast('Số lượng phải lớn hơn 0','err');return;}
  if(!user){toast('Chọn người nhập','err');return;}
  toast('Đang lưu...');
  await apiPost({sheet:'NhapHang',action:'update',row,data:[sp[0],sl,gia,ncc,ngay,gc,user,hsd]});
  // đồng bộ ngay vào cache C.NH — tránh trường hợp sửa lại CÙNG dòng này lần nữa trước khi
  // setTimeout(loadNH,800) bên dưới kịp tải lại, khiến "SL cũ" đọc được bị lỗi thời và
  // tồn kho bị cộng dồn sai (trừ hụt phần chênh lệch của lần sửa trước)
  C.NH[row-2]=[sp[0],sl,gia,ncc,ngay,gc,user,hsd];
  // điều chỉnh lại tồn kho theo chênh lệch số lượng (và đổi sản phẩm nếu có)
  const oldIdx=C.TK.findIndex(t=>t[0]===old[0]);
  const oldSL=Number(old[1]||0);
  if(oldIdx>=0&&oldIdx===spIdx){
    const newStock=Math.max(0,Number(C.TK[spIdx][1]||0)-oldSL+sl);
    const upd=[...C.TK[spIdx]];upd[1]=newStock;
    if(gia>0)upd[3]=gia;// cập nhật giá nhập mới nhất vào Tồn kho
    if(hsd)upd[5]=hsd;// cập nhật hạn sử dụng mới nhất vào Tồn kho
    if(ncc)upd[8]=ncc;// cập nhật nhà cung cấp mới nhất vào Tồn kho
    await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
    C.TK[spIdx][1]=newStock;if(gia>0)C.TK[spIdx][3]=gia;if(hsd)C.TK[spIdx][5]=hsd;if(ncc)C.TK[spIdx][8]=ncc;
  } else {
    if(oldIdx>=0){
      const newStockOld=Math.max(0,Number(C.TK[oldIdx][1]||0)-oldSL);
      const updOld=[...C.TK[oldIdx]];updOld[1]=newStockOld;
      await apiPost({sheet:'TonKho',action:'update',row:oldIdx+2,data:updOld});
      C.TK[oldIdx][1]=newStockOld;
    }
    const newStockNew=Number(C.TK[spIdx][1]||0)+sl;
    const updNew=[...C.TK[spIdx]];updNew[1]=newStockNew;
    if(gia>0)updNew[3]=gia;// cập nhật giá nhập mới nhất vào Tồn kho
    if(hsd)updNew[5]=hsd;// cập nhật hạn sử dụng mới nhất vào Tồn kho
    if(ncc)updNew[8]=ncc;// cập nhật nhà cung cấp mới nhất vào Tồn kho
    await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:updNew});
    C.TK[spIdx][1]=newStockNew;if(gia>0)C.TK[spIdx][3]=gia;if(hsd)C.TK[spIdx][5]=hsd;if(ncc)C.TK[spIdx][8]=ncc;
  }
  logAction('Cập nhật','Nhập hàng',`"${old[0]}" SL ${old[1]}→${sl}, Giá ${old[2]}→${gia} — sửa bởi: ${user}`);
  toast('Đã cập nhật phiếu nhập!');cm('m-nh-edit');setTimeout(loadNH,800);
}

let selNH=new Set();
async function loadNH(){
  document.getElementById('nh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selNH.clear();updateSelUI('nh-delsel-btn','nh-selcnt',0);
  const data=await apiGet('NhapHang');C.NH=data;
  rNH(data);
}
const NH_COLS=[
  {key:'ten',label:'Sản phẩm'},{key:'sl',label:'SL'},{key:'gia',label:'Giá nhập'},{key:'tt',label:'Thành tiền'},
  {key:'hsd',label:'Hạn SD'},{key:'ncc',label:'NCC'},{key:'ngay',label:'Ngày'},{key:'nguoinhap',label:'Người nhập'},{key:'ghichu',label:'Ghi chú'}
];
let nhSortCol=null,nhSortDir=1;
function sortNHClick(col){if(nhSortCol===col)nhSortDir*=-1;else{nhSortCol=col;nhSortDir=1;}fNH();}
function nhCompare(a,b,col){
  switch(col){
    case'ten':return(a[0]||'').localeCompare(b[0]||'');
    case'sl':return Number(a[1]||0)-Number(b[1]||0);
    case'gia':return Number(a[2]||0)-Number(b[2]||0);
    case'tt':return Number(a[1]||0)*Number(a[2]||0)-Number(b[1]||0)*Number(b[2]||0);
    case'hsd':return(a[7]||'').localeCompare(b[7]||'');
    case'ncc':return(a[3]||'').localeCompare(b[3]||'');
    case'ngay':return(a[4]||'').localeCompare(b[4]||'');
    case'nguoinhap':return(a[6]||'').localeCompare(b[6]||'');
    default:return(a[5]||'').localeCompare(b[5]||'');
  }
}
function rNH(data){
  const total=data.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0);
  document.getElementById('nh-sum').innerHTML=data.length?`<div class="grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số dòng nhập</div><div class="val">${data.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng SL</div><div class="val">${fmt(data.reduce((s,r)=>s+Number(r[1]||0),0))}</div></div>
    <div class="kpi r"><div class="lb">Tổng tiền nhập</div><div class="val">${fmt(total)}đ</div></div></div>`:'';
  const el=document.getElementById('nh-tbl');
  if(!data.length){el.innerHTML='<div class="empty">⬇️ Chưa có phiếu nhập</div>';return;}
  const ths=NH_COLS.map(c=>{
    const on=nhSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortNHClick('${c.key}')">${c.label} <span class="sort-ic">${on?(nhSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="nh-selall" onchange="toggleAllNH(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    [...data].map((r)=>{
      const gi=C.NH.indexOf(r);// vị trí thật trong C.NH, tránh lệch dòng khi đang lọc/tìm kiếm
      const chk=selNH.has(gi)?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="nh-chk" data-idx="${gi}" ${chk} onchange="toggleNHChk(this)"></td><td data-label="Sản phẩm"><b>${r[0]}</b></td><td data-label="SL">${r[1]}</td><td class="mobile-hide" data-label="Giá nhập">${fmt(r[2])}đ</td>
      <td data-label="Thành tiền"><span class="bg bg-b">${fmt(Number(r[1]||0)*Number(r[2]||0))}đ</span></td>
      <td class="mobile-hide" data-label="Hạn SD">${r[7]?`<span class="bg bg-y">${r[7]}</span>`:''}</td>
      <td class="mobile-hide" data-label="NCC">${r[3]||''}</td><td data-label="Ngày">${r[4]||''}</td><td class="mobile-hide" data-label="Người nhập"><span class="bg bg-p">${r[6]||''}</span></td><td class="mobile-hide" data-label="Ghi chú">${r[5]||''}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editNH(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delNH(${gi+2},'${r[0]}',${Number(r[1]||0)})">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('nh-delsel-btn','nh-selcnt',selNH.size);
  updateSelAllTri('nh-selall','nh-chk',selNH);
}
function toggleNHChk(el){
  const idx=Number(el.dataset.idx);
  if(el.checked)selNH.add(idx);else selNH.delete(idx);
  updateSelUI('nh-delsel-btn','nh-selcnt',selNH.size);
  updateSelAllTri('nh-selall','nh-chk',selNH);
}
function toggleAllNH(el){
  document.querySelectorAll('.nh-chk').forEach(c=>{
    c.checked=el.checked;
    const idx=Number(c.dataset.idx);
    if(el.checked)selNH.add(idx);else selNH.delete(idx);
  });
  updateSelUI('nh-delsel-btn','nh-selcnt',selNH.size);
}
async function delSelNH(){
  if(!selNH.size){toast('Chưa chọn phiếu nào','err');return;}
  confirmDel(`Xóa ${selNH.size} phiếu nhập đã chọn? Tồn kho sẽ được điều chỉnh (trừ lại) tương ứng.`,async()=>{
    toast('Đang xóa '+selNH.size+' phiếu...');
    const idxs=[...selNH].sort((a,b)=>b-a);// xóa từ index lớn → nhỏ để tránh lệch vị trí
    const delNames=[];
    for(const idx of idxs){
      const r=C.NH[idx];if(!r)continue;
      delNames.push(`${r[0]} x${r[1]}`);
      await apiPost({sheet:'NhapHang',action:'delete',row:idx+2});
      const spIdx=C.TK.findIndex(t=>t[0]===r[0]);
      if(spIdx>=0){
        const newSL=Math.max(0,Number(C.TK[spIdx][1]||0)-Number(r[1]||0));
        const upd=[...C.TK[spIdx]];upd[1]=newSL;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=newSL;
      }
    }
    logAction('Xóa','Nhập hàng',`Xóa hàng loạt ${delNames.length} phiếu: ${delNames.join(', ')}`);
    selNH.clear();
    toast('Đã xóa '+idxs.length+' phiếu nhập!');setTimeout(loadNH,800);
  });
}
function fNH(){
  const q=document.getElementById('q-nh').value.toLowerCase();
  const from=document.getElementById('from-nh').value;
  const to=document.getElementById('to-nh').value;
  const pg=Number(document.getElementById('pg-nh').value);
  let d=[...C.NH];
  if(from)d=d.filter(r=>r[4]>=from);
  if(to)d=d.filter(r=>r[4]<=to);
  if(q)d=d.filter(r=>(r[0]||'').toLowerCase().includes(q)||(r[3]||'').toLowerCase().includes(q));
  if(pg>0)d=d.slice(-pg);
  if(nhSortCol)d.sort((a,b)=>nhCompare(a,b,nhSortCol)*nhSortDir);
  rNH(d);
}

// ══ XẾP HÀNG NHIỀU DÒNG (chuyển hàng từ kho ra gian hàng, trừ tồn kho) ══
let xhRowCount=0;
function addXHRow(){
  xhRowCount++;const id=xhRowCount;
  const opts=C.TK.map((r,i)=>`<option value="${i}">${r[0]} (tồn:${r[1]})</option>`).join('');
  const tr=document.createElement('tr');tr.id='xh-r-'+id;
  tr.innerHTML=`<td><select id="xh-sp-${id}"><option value="">-- Chọn --</option>${opts}</select></td>
    <td><input type="number" id="xh-sl-${id}" placeholder="0" oninput="calcXH()" style="width:90px"></td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="document.getElementById('xh-r-${id}').remove();calcXH()">✕</button></td>`;
  document.getElementById('xh-rows').appendChild(tr);
}
function calcXH(){
  let tsl=0;
  document.getElementById('xh-rows').querySelectorAll('tr').forEach(tr=>{
    const id=tr.id.replace('xh-r-','');
    tsl+=Number(document.getElementById('xh-sl-'+id)?.value||0);
  });
  document.getElementById('xh-tsl').textContent=fmt(tsl);
}
async function openXH(){
  if(!C.TK.length)await loadTK();
  if(!C.GH.length)await loadGH();
  if(!C.GH.length){toast('Chưa có gian hàng nào, vào mục Gian hàng để thêm trước','err');return;}
  document.getElementById('xh-gh').innerHTML='<option value="">-- Chọn --</option>'+C.GH.map(r=>`<option>${r[0]}</option>`).join('');
  document.getElementById('xh-ngay').value=td();
  document.getElementById('xh-gc').value='';
  document.getElementById('xh-rows').innerHTML='';xhRowCount=0;
  addXHRow();calcXH();om('m-xh');
}
async function saveXH(){
  const gh=document.getElementById('xh-gh').value;
  const ngay=document.getElementById('xh-ngay').value;
  const gc=document.getElementById('xh-gc').value;
  const rows=document.getElementById('xh-rows').querySelectorAll('tr');
  const items=[];
  rows.forEach(tr=>{
    const id=tr.id.replace('xh-r-','');
    const idx=document.getElementById('xh-sp-'+id)?.value;
    const sl=Number(document.getElementById('xh-sl-'+id)?.value||0);
    if(idx!==''&&idx!==undefined&&sl>0)items.push({idx:Number(idx),sp:C.TK[idx],sl});
  });
  if(!gh){toast('Chọn gian hàng','err');return;}
  if(!items.length){toast('Thêm ít nhất 1 sản phẩm','err');return;}
  // Kiểm tra tồn, không cho xếp vượt quá tồn kho hiện có
  for(const it of items){
    if(it.sl>Number(it.sp[1]||0)){toast(`${it.sp[0]}: tồn chỉ còn ${it.sp[1]}!`,'err');return;}
  }
  toast('Đang lưu '+items.length+' sản phẩm...');
  for(const it of items){
    await apiPost({sheet:'XepHang',action:'append',row:[it.sp[0],it.sl,gh,ngay,gc]});
    const newSL=Number(it.sp[1]||0)-it.sl;const upd=[...it.sp];upd[1]=newSL;
    await apiPost({sheet:'TonKho',action:'update',row:it.idx+2,data:upd});
    C.TK[it.idx][1]=newSL;
  }
  logAction('Tạo mới','Xếp hàng',`Gian hàng: ${gh} — ${items.map(it=>`${it.sp[0]} x${it.sl}`).join(', ')}`);
  toast('Đã xếp '+items.length+' sản phẩm!');cm('m-xh');setTimeout(loadXH,800);
}

let selXH=new Set();
async function loadXH(){
  document.getElementById('xh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selXH.clear();updateSelUI('xh-delsel-btn','xh-selcnt',0);
  const data=await apiGet('XepHang');C.XH=data;
  rXH(data);
}
const XH_COLS=[
  {key:'ten',label:'Sản phẩm'},{key:'sl',label:'SL'},{key:'gh',label:'Gian hàng'},{key:'ngay',label:'Ngày xếp'},{key:'ghichu',label:'Ghi chú'}
];
let xhSortCol=null,xhSortDir=1;
function sortXHClick(col){if(xhSortCol===col)xhSortDir*=-1;else{xhSortCol=col;xhSortDir=1;}fXH();}
function xhCompare(a,b,col){
  switch(col){
    case'ten':return(a[0]||'').localeCompare(b[0]||'');
    case'sl':return Number(a[1]||0)-Number(b[1]||0);
    case'gh':return(a[2]||'').localeCompare(b[2]||'');
    case'ngay':return(a[3]||'').localeCompare(b[3]||'');
    default:return(a[4]||'').localeCompare(b[4]||'');
  }
}
function rXH(data){
  document.getElementById('xh-sum').innerHTML=data.length?`<div class="grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số dòng xếp</div><div class="val">${data.length}</div></div>
    <div class="kpi p"><div class="lb">Tổng SL đã xếp</div><div class="val">${fmt(data.reduce((s,r)=>s+Number(r[1]||0),0))}</div></div>
    <div class="kpi g"><div class="lb">Số gian hàng</div><div class="val">${new Set(data.map(r=>r[2]).filter(Boolean)).size}</div></div></div>`:'';
  const el=document.getElementById('xh-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🏷️ Chưa có phiếu xếp hàng</div>';return;}
  const ths=XH_COLS.map(c=>{
    const on=xhSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortXHClick('${c.key}')">${c.label} <span class="sort-ic">${on?(xhSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="xh-selall" onchange="toggleAllXH(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    [...data].map(r=>{
      const gi=C.XH.indexOf(r);
      const chk=selXH.has(gi)?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="xh-chk" data-idx="${gi}" ${chk} onchange="toggleXHChk(this)"></td><td data-label="Sản phẩm"><b>${r[0]}</b></td><td data-label="SL">${r[1]}</td><td data-label="Gian hàng"><span class="bg bg-p">${r[2]||''}</span></td><td data-label="Ngày xếp">${r[3]||''}</td><td class="mobile-hide" data-label="Ghi chú">${r[4]||''}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editXH(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delXH(${gi+2},'${r[0]}',${Number(r[1]||0)})">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('xh-delsel-btn','xh-selcnt',selXH.size);
  updateSelAllTri('xh-selall','xh-chk',selXH);
}
function toggleXHChk(el){
  const idx=Number(el.dataset.idx);
  if(el.checked)selXH.add(idx);else selXH.delete(idx);
  updateSelUI('xh-delsel-btn','xh-selcnt',selXH.size);
  updateSelAllTri('xh-selall','xh-chk',selXH);
}
function toggleAllXH(el){
  document.querySelectorAll('.xh-chk').forEach(c=>{
    c.checked=el.checked;
    const idx=Number(c.dataset.idx);
    if(el.checked)selXH.add(idx);else selXH.delete(idx);
  });
  updateSelUI('xh-delsel-btn','xh-selcnt',selXH.size);
}
async function delSelXH(){
  if(!selXH.size){toast('Chưa chọn phiếu nào','err');return;}
  confirmDel(`Xóa ${selXH.size} phiếu xếp đã chọn? Tồn kho sẽ được hoàn lại tương ứng.`,async()=>{
    toast('Đang xóa '+selXH.size+' phiếu...');
    const idxs=[...selXH].sort((a,b)=>b-a);
    const delNames=[];
    for(const idx of idxs){
      const r=C.XH[idx];if(!r)continue;
      delNames.push(`${r[0]} x${r[1]}`);
      await apiPost({sheet:'XepHang',action:'delete',row:idx+2});
      const spIdx=C.TK.findIndex(t=>t[0]===r[0]);
      if(spIdx>=0){
        const newSL=Number(C.TK[spIdx][1]||0)+Number(r[1]||0);
        const upd=[...C.TK[spIdx]];upd[1]=newSL;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=newSL;
      }
    }
    logAction('Xóa','Xếp hàng',`Xóa hàng loạt ${delNames.length} phiếu: ${delNames.join(', ')}`);
    selXH.clear();
    toast('Đã xóa '+idxs.length+' phiếu xếp!');setTimeout(loadXH,800);
  });
}
function fXH(){
  const q=document.getElementById('q-xh').value.toLowerCase();
  const from=document.getElementById('from-xh').value;
  const to=document.getElementById('to-xh').value;
  const pg=Number(document.getElementById('pg-xh').value);
  let d=[...C.XH];
  if(from)d=d.filter(r=>r[3]>=from);
  if(to)d=d.filter(r=>r[3]<=to);
  if(q)d=d.filter(r=>(r[0]||'').toLowerCase().includes(q)||(r[2]||'').toLowerCase().includes(q));
  if(pg>0)d=d.slice(-pg);
  if(xhSortCol)d.sort((a,b)=>xhCompare(a,b,xhSortCol)*xhSortDir);
  rXH(d);
}

// ── SỬA 1 DÒNG XẾP HÀNG ──
async function editXH(row){
  const r=C.XH[row-2];if(!r){toast('Không tìm thấy phiếu xếp hàng','err');return;}
  if(!C.TK.length)await loadTK();
  if(!C.GH.length)await loadGH();
  document.getElementById('xhe-sp').innerHTML=C.TK.map((t,i)=>`<option value="${i}"${t[0]===r[0]?' selected':''}>${t[0]} (tồn:${t[1]})</option>`).join('');
  document.getElementById('xhe-sl').value=r[1]||'';
  document.getElementById('xhe-gh').innerHTML='<option value="">-- Chọn --</option>'+C.GH.map(g=>`<option${g[0]===r[2]?' selected':''}>${g[0]}</option>`).join('');
  document.getElementById('xhe-ngay').value=r[3]||'';
  document.getElementById('xhe-gc').value=r[4]||'';
  document.getElementById('xhe-row').value=row;
  om('m-xh-edit');
}
async function saveXHEdit(){
  const row=Number(document.getElementById('xhe-row').value);
  const old=C.XH[row-2];if(!old){toast('Không tìm thấy phiếu xếp hàng','err');return;}
  const spIdx=Number(document.getElementById('xhe-sp').value);
  const sp=C.TK[spIdx];
  const sl=Number(document.getElementById('xhe-sl').value||0);
  const gh=document.getElementById('xhe-gh').value;
  const ngay=document.getElementById('xhe-ngay').value;
  const gc=document.getElementById('xhe-gc').value;
  if(!sp){toast('Chọn sản phẩm','err');return;}
  if(!sl||sl<=0){toast('Số lượng phải lớn hơn 0','err');return;}
  if(!gh){toast('Chọn gian hàng','err');return;}
  const oldIdx=C.TK.findIndex(t=>t[0]===old[0]);
  const oldSL=Number(old[1]||0);
  // Kiểm tra tồn khả dụng (cộng hoàn lại phần phiếu cũ đã trừ trước khi so sánh)
  if(oldIdx>=0&&oldIdx===spIdx){
    const available=Number(C.TK[spIdx][1]||0)+oldSL;
    if(sl>available){toast(`${sp[0]}: tồn chỉ còn ${available}!`,'err');return;}
  } else if(sl>Number(sp[1]||0)){
    toast(`${sp[0]}: tồn chỉ còn ${sp[1]}!`,'err');return;
  }
  toast('Đang lưu...');
  await apiPost({sheet:'XepHang',action:'update',row,data:[sp[0],sl,gh,ngay,gc]});
  // đồng bộ ngay vào cache C.XH — tránh trường hợp sửa lại CÙNG dòng này lần nữa trước khi
  // setTimeout(loadXH,800) bên dưới kịp tải lại, khiến "SL cũ" đọc được bị lỗi thời và
  // tồn kho bị tính sai (cộng/trừ dư phần chênh lệch của lần sửa trước)
  C.XH[row-2]=[sp[0],sl,gh,ngay,gc];
  if(oldIdx>=0&&oldIdx===spIdx){
    const newStock=Math.max(0,Number(C.TK[spIdx][1]||0)+oldSL-sl);
    const upd=[...C.TK[spIdx]];upd[1]=newStock;
    await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
    C.TK[spIdx][1]=newStock;
  } else {
    if(oldIdx>=0){
      const newStockOld=Number(C.TK[oldIdx][1]||0)+oldSL;
      const updOld=[...C.TK[oldIdx]];updOld[1]=newStockOld;
      await apiPost({sheet:'TonKho',action:'update',row:oldIdx+2,data:updOld});
      C.TK[oldIdx][1]=newStockOld;
    }
    const newStockNew=Math.max(0,Number(C.TK[spIdx][1]||0)-sl);
    const updNew=[...C.TK[spIdx]];updNew[1]=newStockNew;
    await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:updNew});
    C.TK[spIdx][1]=newStockNew;
  }
  // (Không cần tự tay cập nhật "Đồ gian hàng" — màn đó tính thẳng từ lịch sử Xếp hàng mỗi lần hiển thị)
  logAction('Cập nhật','Xếp hàng',`"${old[0]}" SL ${old[1]}→${sl}, Gian hàng: ${gh}`);
  toast('Đã cập nhật phiếu xếp hàng!');cm('m-xh-edit');setTimeout(loadXH,800);
}

// ── XÓA XẾP HÀNG → hoàn lại tồn kho ──
async function delXH(row,tenSP,sl){
  confirmDel(`Xóa phiếu xếp "${tenSP}" (${sl})? Tồn kho sẽ được hoàn lại ${sl}.`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'XepHang',action:'delete',row:Number(row)});
    const spIdx=C.TK.findIndex(r=>r[0]===tenSP);
    if(spIdx>=0){
      const newSL=Number(C.TK[spIdx][1]||0)+sl;
      const upd=[...C.TK[spIdx]];upd[1]=newSL;
      await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
      C.TK[spIdx][1]=newSL;
    }
    logAction('Xóa','Xếp hàng',`Phiếu xếp "${tenSP}" x${sl}`);
    toast('Đã xóa & hoàn tồn kho!');setTimeout(loadXH,800);
  });
}

// ══ ĐỒ GIAN HÀNG ══ số lượng mỗi sản phẩm đang có tại mỗi gian hàng.
// KHÔNG dùng 1 bảng riêng cộng dồn dần (dễ thiếu dữ liệu cũ, dễ lệch) — mà TÍNH THẲNG từ lịch sử Xếp hàng
// (C.XH) mỗi lần hiển thị: gộp theo (Sản phẩm, Gian hàng) rồi cộng SL → tự động có đủ mọi phiếu xếp,
// kể cả những phiếu đã xếp từ TRƯỚC khi có màn hình này, không cần "backfill" gì cả.
// C.GHK chỉ còn dùng để lưu phần CHÊNH LỆCH khi người dùng tự "Sửa" (kiểm kê lại cho đúng thực tế) —
// mỗi dòng là 1 độ lệch (offset, có thể âm) cộng thêm vào số tính từ Xếp hàng, không phải số tuyệt đối.
function ghkBase(tenSP,gianHang){
  return C.XH.filter(r=>r[0]===tenSP&&r[2]===gianHang).reduce((s,r)=>s+Number(r[1]||0),0);
}
function ghkOffset(tenSP,gianHang){
  const r=C.GHK.find(r=>r[0]===tenSP&&r[1]===gianHang);
  return r?Number(r[2]||0):0;
}
function ghkQty(tenSP,gianHang){
  return Math.max(0,ghkBase(tenSP,gianHang)+ghkOffset(tenSP,gianHang));
}
let ghkActiveTab=null;
async function loadGHK(){
  if(!C.GH.length)await loadGH();
  // luôn lấy XepHang mới nhất — đây là nguồn dữ liệu chính để tính số lượng, phải tươi
  C.XH=await apiGet('XepHang');
  C.GHK=await apiGet('GianHangKho');
  rGHKView();
}
function goGHKTab(name){ghkActiveTab=name;rGHKView();}
function rGHKView(){
  const tabsEl=document.getElementById('ghk-tabs'),paneEl=document.getElementById('ghk-pane');
  if(!tabsEl||!paneEl)return;
  if(!C.GH.length){
    tabsEl.innerHTML='';
    paneEl.innerHTML='<div class="empty">🏬 Chưa có gian hàng nào — vào Cài đặt → Gian hàng để thêm trước</div>';
    return;
  }
  if(!ghkActiveTab||!C.GH.some(g=>g[0]===ghkActiveTab))ghkActiveTab=C.GH[0][0];
  // Danh sách sản phẩm của 1 gian hàng = mọi SP từng có phiếu Xếp hàng vào đó, hợp với mọi SP có sửa tay riêng
  function namesOf(gh){
    const s=new Set(C.XH.filter(r=>r[2]===gh).map(r=>r[0]));
    C.GHK.filter(r=>r[1]===gh).forEach(r=>s.add(r[0]));
    return[...s];
  }
  tabsEl.innerHTML=C.GH.map(g=>{
    const cnt=namesOf(g[0]).length;
    return`<div class="tab${g[0]===ghkActiveTab?' on':''}" onclick="goGHKTab('${esc(g[0])}')">${esc(g[0])}${cnt?` (${cnt})`:''}</div>`;
  }).join('');
  const q=(document.getElementById('q-ghk')?.value||'').toLowerCase();
  let names=namesOf(ghkActiveTab);
  if(q)names=names.filter(n=>n.toLowerCase().includes(q));
  const items=names.map(n=>[n,ghkQty(n,ghkActiveTab)]).sort((a,b)=>a[0].localeCompare(b[0]));
  const total=items.reduce((s,r)=>s+r[1],0);
  const body=!items.length
    ?`<div class="empty">🗄️ "${esc(ghkActiveTab)}" chưa có hàng nào (tự có khi Xếp hàng ra gian hàng này)</div>`
    :`<table class="m-tbl"><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th></th></tr></thead><tbody>`+
      items.map(([ten,sl])=>
        `<tr><td data-label="Sản phẩm"><b>${ten}</b></td><td data-label="Số lượng"><b>${fmt(sl)}</b></td><td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editGHK('${esc(ten)}','${esc(ghkActiveTab)}')">Sửa</button></td></tr>`
      ).join('')+'</tbody></table>';
  paneEl.innerHTML=`<div class="card"><div class="ch"><h2>${esc(ghkActiveTab)}</h2><span style="font-size:11px;color:var(--text2)">Tổng SL: ${fmt(total)}</span></div>${body}</div>`;
}
function editGHK(tenSP,gianHang){
  document.getElementById('ghk-sp').innerHTML=`<option>${tenSP}</option>`;
  document.getElementById('ghk-gh-sel').innerHTML=`<option>${gianHang}</option>`;
  document.getElementById('ghk-sp').disabled=true;document.getElementById('ghk-gh-sel').disabled=true;// chỉ sửa số lượng
  document.getElementById('ghk-sl').value=ghkQty(tenSP,gianHang);
  om('m-ghk');
}
async function saveGHK(){
  const ten=document.getElementById('ghk-sp').value;
  const gh=document.getElementById('ghk-gh-sel').value;
  const target=Number(document.getElementById('ghk-sl').value||0);
  if(!ten||!gh){toast('Thiếu thông tin sản phẩm/gian hàng','err');return;}
  if(target<0){toast('Số lượng không được âm','err');return;}
  // Lưu lại phần CHÊNH LỆCH so với số tính từ lịch sử Xếp hàng — không ghi đè số tuyệt đối,
  // để sau này có thêm phiếu Xếp hàng mới thì vẫn cộng đúng lên trên nền đã kiểm kê
  const offset=target-ghkBase(ten,gh);
  toast('Đang lưu...');
  const idx=C.GHK.findIndex(r=>r[0]===ten&&r[1]===gh);
  const row=[ten,gh,offset];
  await apiPost(idx>=0?{sheet:'GianHangKho',action:'update',row:idx+2,data:row}:{sheet:'GianHangKho',action:'append',row});
  if(idx>=0)C.GHK[idx]=row;else C.GHK.push(row);
  logAction('Cập nhật','Đồ gian hàng',`"${ten}" tại "${gh}": chỉnh về SL = ${target}`);
  toast('Đã cập nhật');cm('m-ghk');rGHKView();
}

// ══ NHÀ CUNG CẤP ══
let selNCC=new Set();
async function loadNCC(){
  document.getElementById('ncc-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selNCC.clear();updateSelUI('ncc-delsel-btn','ncc-selcnt',0);
  const data=await apiGet('NhaCungCap');C.NCC=data;rNCC(data);
}
const NCC_COLS=[
  {key:'ten',label:'Tên NCC'},{key:'sdt',label:'SĐT'},{key:'mh',label:'Mặt hàng'},{key:'dc',label:'Địa chỉ'},{key:'gc',label:'Ghi chú'}
];
let nccSortCol=null,nccSortDir=1;
function sortNCCClick(col){if(nccSortCol===col)nccSortDir*=-1;else{nccSortCol=col;nccSortDir=1;}fNCC();}
function nccCompare(a,b,col){
  const idx={ten:0,sdt:1,mh:2,dc:3,gc:4}[col];
  return(a[idx]||'').localeCompare(b[idx]||'');
}
function rNCC(data){
  const el=document.getElementById('ncc-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🚚 Chưa có NCC</div>';return;}
  const ths=NCC_COLS.map(c=>{
    const on=nccSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortNCCClick('${c.key}')">${c.label} <span class="sort-ic">${on?(nccSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="ncc-selall" onchange="toggleAllNCC(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    data.map(r=>{
      const gi=C.NCC.indexOf(r);// vị trí thật, tránh lệch dòng khi đang lọc/sắp xếp
      const chk=selNCC.has(gi)?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="ncc-chk" data-idx="${gi}" ${chk} onchange="toggleNCCChk(this)"></td><td data-label="Tên NCC"><b>${r[0]}</b></td><td data-label="SĐT">${r[1]||''}</td><td data-label="Mặt hàng">${r[2]||''}</td><td data-label="Địa chỉ">${r[3]||''}</td><td class="mobile-hide" data-label="Ghi chú">${r[4]||''}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editNCC(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('NhaCungCap',${gi+2},'NCC')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('ncc-delsel-btn','ncc-selcnt',selNCC.size);
  updateSelAllTri('ncc-selall','ncc-chk',selNCC);
}
function toggleNCCChk(el){
  const idx=Number(el.dataset.idx);
  if(el.checked)selNCC.add(idx);else selNCC.delete(idx);
  updateSelUI('ncc-delsel-btn','ncc-selcnt',selNCC.size);
  updateSelAllTri('ncc-selall','ncc-chk',selNCC);
}
function toggleAllNCC(el){
  document.querySelectorAll('.ncc-chk').forEach(c=>{
    c.checked=el.checked;
    const idx=Number(c.dataset.idx);
    if(el.checked)selNCC.add(idx);else selNCC.delete(idx);
  });
  updateSelUI('ncc-delsel-btn','ncc-selcnt',selNCC.size);
}
async function delSelNCC(){
  if(!selNCC.size){toast('Chưa chọn NCC nào','err');return;}
  confirmDel(`Xóa ${selNCC.size} nhà cung cấp đã chọn?`,async()=>{
    toast('Đang xóa '+selNCC.size+' NCC...');
    const idxs=[...selNCC].sort((a,b)=>b-a);
    for(const idx of idxs)await apiPost({sheet:'NhaCungCap',action:'delete',row:idx+2});
    selNCC.clear();
    toast('Đã xóa '+idxs.length+' NCC!');setTimeout(loadNCC,800);
  });
}
function fNCC(){
  const q=document.getElementById('q-ncc').value.toLowerCase();
  const d=C.NCC.filter(r=>(r[0]||'').toLowerCase().includes(q));
  if(nccSortCol)d.sort((a,b)=>nccCompare(a,b,nccSortCol)*nccSortDir);
  rNCC(d);
}
function initNCC(){document.getElementById('m-ncc-t').textContent='Thêm NCC';['ncc-ten','ncc-sdt','ncc-mh','ncc-dc','ncc-gc'].forEach(id=>document.getElementById(id).value='');document.getElementById('ncc-row').value='';om('m-ncc');}
function editNCC(row){const r=C.NCC[row-2];document.getElementById('m-ncc-t').textContent='Sửa NCC';document.getElementById('ncc-ten').value=r[0]||'';document.getElementById('ncc-sdt').value=r[1]||'';document.getElementById('ncc-mh').value=r[2]||'';document.getElementById('ncc-dc').value=r[3]||'';document.getElementById('ncc-gc').value=r[4]||'';document.getElementById('ncc-row').value=row;om('m-ncc');}
async function saveNCC(){
  const ten=document.getElementById('ncc-ten').value.trim();if(!ten){toast('Nhập tên NCC','err');return;}
  const row=[ten,document.getElementById('ncc-sdt').value,document.getElementById('ncc-mh').value,document.getElementById('ncc-dc').value,document.getElementById('ncc-gc').value];
  const er=document.getElementById('ncc-row').value;
  await apiPost(er?{sheet:'NhaCungCap',action:'update',row:Number(er),data:row}:{sheet:'NhaCungCap',action:'append',row});
  toast(er?'Đã cập nhật NCC':'Đã thêm NCC');cm('m-ncc');setTimeout(loadNCC,800);
}

// ══ GIAN HÀNG ══
let selGH=new Set();
async function loadGH(){
  document.getElementById('gh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selGH.clear();updateSelUI('gh-delsel-btn','gh-selcnt',0);
  const data=await apiGet('GianHang');C.GH=data;fGH();
}
let ghSortDir=1;
function sortGHClick(){ghSortDir*=-1;fGH();}
function rGH(data){
  const el=document.getElementById('gh-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🏬 Chưa có gian hàng</div>';return;}
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="gh-selall" onchange="toggleAllGH(this)"></th><th class="th-sort th-sort-on" onclick="sortGHClick()">Tên gian hàng <span class="sort-ic">${ghSortDir===1?'▲':'▼'}</span></th><th></th></tr></thead><tbody>`+
    data.map(r=>{
      const gi=C.GH.indexOf(r);
      const chk=selGH.has(gi)?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="gh-chk" data-idx="${gi}" ${chk} onchange="toggleGHChk(this)"></td><td data-label="Tên gian hàng"><b>${r[0]}</b></td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editGH(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('GianHang',${gi+2},'gian hàng')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('gh-delsel-btn','gh-selcnt',selGH.size);
  updateSelAllTri('gh-selall','gh-chk',selGH);
}
function toggleGHChk(el){
  const idx=Number(el.dataset.idx);
  if(el.checked)selGH.add(idx);else selGH.delete(idx);
  updateSelUI('gh-delsel-btn','gh-selcnt',selGH.size);
  updateSelAllTri('gh-selall','gh-chk',selGH);
}
function toggleAllGH(el){
  document.querySelectorAll('.gh-chk').forEach(c=>{
    c.checked=el.checked;
    const idx=Number(c.dataset.idx);
    if(el.checked)selGH.add(idx);else selGH.delete(idx);
  });
  updateSelUI('gh-delsel-btn','gh-selcnt',selGH.size);
}
async function delSelGH(){
  if(!selGH.size){toast('Chưa chọn gian hàng nào','err');return;}
  confirmDel(`Xóa ${selGH.size} gian hàng đã chọn?`,async()=>{
    toast('Đang xóa '+selGH.size+' gian hàng...');
    const idxs=[...selGH].sort((a,b)=>b-a);
    for(const idx of idxs)await apiPost({sheet:'GianHang',action:'delete',row:idx+2});
    selGH.clear();
    toast('Đã xóa '+idxs.length+' gian hàng!');setTimeout(loadGH,800);
  });
}
function fGH(){
  const q=document.getElementById('q-gh').value.toLowerCase();
  const d=C.GH.filter(r=>(r[0]||'').toLowerCase().includes(q));
  d.sort((a,b)=>(a[0]||'').localeCompare(b[0]||'')*ghSortDir);
  rGH(d);
}
function initGH(){document.getElementById('m-gh-t').textContent='Thêm gian hàng';document.getElementById('gh-ten').value='';document.getElementById('gh-row').value='';om('m-gh');}
function editGH(row){const r=C.GH[row-2];document.getElementById('m-gh-t').textContent='Sửa gian hàng';document.getElementById('gh-ten').value=r[0]||'';document.getElementById('gh-row').value=row;om('m-gh');}
async function saveGH(){
  const ten=document.getElementById('gh-ten').value.trim();if(!ten){toast('Nhập tên gian hàng','err');return;}
  const row=[ten];
  const er=document.getElementById('gh-row').value;
  await apiPost(er?{sheet:'GianHang',action:'update',row:Number(er),data:row}:{sheet:'GianHang',action:'append',row});
  toast(er?'Đã cập nhật gian hàng':'Đã thêm gian hàng');cm('m-gh');setTimeout(loadGH,800);
}

// ══ NGƯỜI DÙNG ══
const USER_COLS=[
  {key:'ten',label:'Họ tên'},{key:'sdt',label:'SĐT'},{key:'vaitro',label:'Vai trò'},{key:'email',label:'Email đăng nhập'},{key:'pass',label:'Mật khẩu'},{key:'gc',label:'Ghi chú'}
];
let userSortCol=null,userSortDir=1;
function sortUserClick(col){if(userSortCol===col)userSortDir*=-1;else{userSortCol=col;userSortDir=1;}renderUserSorted();}
function userCompare(a,b,col){
  const idx={ten:0,sdt:1,vaitro:2,email:4,pass:5,gc:3}[col];
  return(a[idx]||'').localeCompare(b[idx]||'');
}
function renderUserSorted(){
  const d=[...C.USER];
  if(userSortCol)d.sort((a,b)=>userCompare(a,b,userSortCol)*userSortDir);
  rUser(d);
}
let selUser=new Set();
async function loadUser(){
  document.getElementById('user-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selUser.clear();updateSelUI('user-delsel-btn','user-selcnt',0);
  const data=await apiGet('User');C.USER=data;renderUserSorted();
}
function rUser(data){
  const el=document.getElementById('user-tbl');
  if(!data.length){el.innerHTML='<div class="empty">👤 Chưa có người dùng nào</div>';return;}
  const ths=USER_COLS.map(c=>{
    const on=userSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortUserClick('${c.key}')">${c.label} <span class="sort-ic">${on?(userSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="user-selall" onchange="toggleAllUser(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    data.map(r=>{
      const gi=C.USER.indexOf(r);
      const chk=selUser.has(gi)?'checked':'';
      const passCell=r[5]
        ?`<span id="pwm-${gi}">••••••••</span><span id="pwr-${gi}" style="display:none">${esc(r[5])}</span> <button class="btn btn-g btn-sm" onclick="toggleUserPass(${gi})" title="Xem/ẩn mật khẩu">👁️</button>`
        :'<span style="color:var(--text2);font-size:11px">—</span>';
      return`<tr><td data-label=""><input type="checkbox" class="user-chk" data-idx="${gi}" ${chk} onchange="toggleUserChk(this)"></td><td data-label="Họ tên"><b>${r[0]}</b></td><td data-label="SĐT">${r[1]||''}</td><td data-label="Vai trò">${r[2]?`<span class="bg bg-p">${r[2]}</span>`:''}</td><td data-label="Email đăng nhập">${r[4]?`<span class="bg bg-b">${r[4]}</span>`:'<span style="color:var(--text2);font-size:11px">Chưa có</span>'}</td><td data-label="Mật khẩu">${passCell}</td><td class="mobile-hide" data-label="Ghi chú">${r[3]||''}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editUser(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('User',${gi+2},'người dùng')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('user-delsel-btn','user-selcnt',selUser.size);
  updateSelAllTri('user-selall','user-chk',selUser);
}
function toggleUserChk(el){
  const idx=Number(el.dataset.idx);
  if(el.checked)selUser.add(idx);else selUser.delete(idx);
  updateSelUI('user-delsel-btn','user-selcnt',selUser.size);
  updateSelAllTri('user-selall','user-chk',selUser);
}
function toggleAllUser(el){
  document.querySelectorAll('.user-chk').forEach(c=>{
    c.checked=el.checked;
    const idx=Number(c.dataset.idx);
    if(el.checked)selUser.add(idx);else selUser.delete(idx);
  });
  updateSelUI('user-delsel-btn','user-selcnt',selUser.size);
}
function toggleUserPass(gi){
  const m=document.getElementById('pwm-'+gi),r=document.getElementById('pwr-'+gi);
  if(!m||!r)return;
  const show=r.style.display==='none';
  r.style.display=show?'':'none';m.style.display=show?'none':'';
}
function toggleUserPassInput(){
  const el=document.getElementById('user-pass');
  el.type=el.type==='password'?'text':'password';
}
async function delSelUser(){
  if(!selUser.size){toast('Chưa chọn người dùng nào','err');return;}
  confirmDel(`Xóa ${selUser.size} người dùng đã chọn?`,async()=>{
    toast('Đang xóa '+selUser.size+' người dùng...');
    const idxs=[...selUser].sort((a,b)=>b-a);
    for(const idx of idxs)await apiPost({sheet:'User',action:'delete',row:idx+2});
    selUser.clear();
    toast('Đã xóa '+idxs.length+' người dùng!');setTimeout(loadUser,800);
  });
}
function initUser(){
  document.getElementById('m-user-t').textContent='Thêm người dùng';
  ['user-ten','user-sdt','user-vaitro','user-gc','user-email','user-pass'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('user-row').value='';
  document.getElementById('user-pass').type='password';
  document.getElementById('user-pass-hint').textContent='Nhập cả Email & Mật khẩu nếu muốn người này tự đăng nhập được vào app. Để trống nếu chỉ cần lưu tên tham khảo. Nếu email đã có tài khoản từ trước (VD: tài khoản admin gốc), chỉ cần gõ email đó — hệ thống sẽ tự liên kết vào đây.';
  document.getElementById('user-reset-btn').style.display='none';
  om('m-user');
}
function editUser(row){
  const r=C.USER[row-2];
  document.getElementById('m-user-t').textContent='Sửa người dùng';
  document.getElementById('user-ten').value=r[0]||'';
  document.getElementById('user-sdt').value=r[1]||'';
  document.getElementById('user-vaitro').value=r[2]||'';
  document.getElementById('user-gc').value=r[3]||'';
  document.getElementById('user-email').value=r[4]||'';
  document.getElementById('user-pass').value=r[5]||'';// mật khẩu tham khảo đã lưu — chỉ để xem lại, không tự đổi được mật khẩu đăng nhập thật
  document.getElementById('user-pass').type='password';
  document.getElementById('user-row').value=row;
  // Sửa người dùng đã có: KHÔNG thể tự đổi mật khẩu đăng nhập thật của tài khoản này từ đây (giới hạn của
  // Firebase phía client) — ô này chỉ sửa bản ghi lưu tham khảo. Muốn đổi mật khẩu thật, dùng nút gửi email bên dưới.
  document.getElementById('user-pass-hint').textContent='Đây là bản ghi mật khẩu lưu tham khảo — sửa ở đây KHÔNG đổi được mật khẩu đăng nhập thật của tài khoản (giới hạn kỹ thuật). Muốn đổi mật khẩu thật, dùng nút "Gửi email đặt lại mật khẩu" bên dưới.';
  document.getElementById('user-reset-btn').style.display=r[4]?'':'none';
  om('m-user');
}
// Tạo tài khoản đăng nhập mới (Firebase Auth) mà KHÔNG làm mất phiên đăng nhập hiện tại của admin —
// dùng 1 app Firebase phụ riêng để tạo, vì createUserWithEmailAndPassword sẽ tự đăng nhập vào app được gọi trên đó
async function createAuthUser(email,pass){
  await initFirebase();
  try{
    const secApp=firebase.apps.find(a=>a.name==='Secondary')||firebase.initializeApp(firebaseConfig,'Secondary');
    const secAuth=secApp.auth();
    await secAuth.createUserWithEmailAndPassword(email,pass);
    await secAuth.signOut();
    return{ok:true};
  }catch(e){return{ok:false,code:e.code};}
}
function authErrMsg(code){
  const m={
    'auth/email-already-in-use':'Email này đã được đăng ký cho tài khoản khác',
    'auth/invalid-email':'Email không hợp lệ',
    'auth/weak-password':'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
    'auth/user-not-found':'Không tìm thấy tài khoản đăng nhập với email này',
    'auth/network-request-failed':'Lỗi kết nối mạng, thử lại sau'
  };
  return m[code]||'Có lỗi xảy ra, thử lại sau';
}
async function sendUserResetPass(){
  const email=document.getElementById('user-email').value.trim();
  if(!email){toast('Người dùng này chưa có Email đăng nhập','err');return;}
  toast('Đang gửi email...');
  try{
    await auth.sendPasswordResetEmail(email);
    toast('Đã gửi email đặt lại mật khẩu tới '+email);
  }catch(e){toast(authErrMsg(e.code),'err');}
}
async function saveUser(){
  const ten=document.getElementById('user-ten').value.trim();if(!ten){toast('Nhập tên người dùng','err');return;}
  const er=document.getElementById('user-row').value;
  const email=document.getElementById('user-email').value.trim();
  const pass=document.getElementById('user-pass').value;
  if(!er&&(email||pass)){
    if(!email||!pass){toast('Cần nhập đủ cả Email và Mật khẩu để tạo tài khoản đăng nhập','err');return;}
    if(pass.length<6){toast('Mật khẩu phải từ 6 ký tự trở lên','err');return;}
  }
  const row=[ten,document.getElementById('user-sdt').value,document.getElementById('user-vaitro').value,document.getElementById('user-gc').value,email,pass];
  toast('Đang lưu...');
  let linked=false;
  if(!er&&email&&pass){
    const r=await createAuthUser(email,pass);
    if(!r.ok){
      if(r.code==='auth/email-already-in-use'){
        // Email này đã có tài khoản đăng nhập từ trước (VD: tài khoản admin gốc tạo tay trên Firebase Console,
        // hoặc tạo qua form này trước đó) — không tạo trùng, chỉ liên kết email vào bản ghi Người dùng để hiển thị
        linked=true;
      } else {toast(authErrMsg(r.code),'err');return;}
    }
  }
  await apiPost(er?{sheet:'User',action:'update',row:Number(er),data:row}:{sheet:'User',action:'append',row});
  toast(er?'Đã cập nhật':linked?'Đã thêm & liên kết với tài khoản đăng nhập có sẵn':('Đã thêm người dùng'+(email&&pass?' & tạo tài khoản đăng nhập':'')));
  cm('m-user');setTimeout(loadUser,800);
}

// ══ XÓA NHẬP HÀNG → trừ lại tồn kho ══
async function delNH(row,tenSP,sl){
  confirmDel(`Xóa phiếu nhập "${tenSP}" (${sl} ${''})? Tồn kho sẽ bị trừ lại ${sl}.`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'NhapHang',action:'delete',row:Number(row)});
    // Trừ lại tồn kho
    const spIdx=C.TK.findIndex(r=>r[0]===tenSP);
    if(spIdx>=0){
      const newSL=Math.max(0,Number(C.TK[spIdx][1]||0)-sl);
      const upd=[...C.TK[spIdx]];upd[1]=newSL;
      await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
      C.TK[spIdx][1]=newSL;
    }
    logAction('Xóa','Nhập hàng',`Phiếu nhập "${tenSP}" x${sl}`);
    toast('Đã xóa & cập nhật tồn kho!');setTimeout(loadNH,800);
  });
}

// ══ XÓA CHUNG (cho các module khác) ══
async function delRow(sheet,row,label){
  confirmDel(`Xóa ${label} này?`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet,action:'delete',row:Number(row)});
    toast('Đã xóa!');
    setTimeout(()=>{
      if(sheet==='NhaCungCap')loadNCC();
      else if(sheet==='GianHang')loadGH();
      else if(sheet==='User')loadUser();
    },800);
  });
}



// ── apiGetRaw: lấy toàn bộ kể cả header, dùng để check sheet trống thật sự ──
function apiGetRaw(sheet){
  return new Promise(resolve=>{
    const cb='_cbr'+Date.now()+Math.random().toString(36).slice(2);
    window[cb]=data=>{delete window[cb];document.getElementById('_s'+cb).remove();resolve(Array.isArray(data)?data:[]);};
    const s=document.createElement('script');s.id='_s'+cb;
    s.src=API+'?sheet='+sheet+'&callback='+cb;
    s.onerror=()=>{delete window[cb];s.remove();resolve(null);};// null = lỗi kết nối
    document.head.appendChild(s);
  });
}

// ══ CÀI ĐẶT (ngưỡng "Sắp hết"/"Gần hết" mặc định) ══
async function loadSettings(){
  const data=await apiGet('CaiDat');
  if(data.length){
    SETTINGS.ganHet=Number(data[0][0])||3;
    SETTINGS.sapHet=Number(data[0][1])||10;
    SETTINGS.hsdGan=Number(data[0][2])||7;
    SETTINGS.hsdSap=Number(data[0][3])||30;
  }
}
async function loadCaiDat(){
  ['set-saphet','set-ganhet','set-hsdsap','set-hsdgan'].forEach(id=>document.getElementById(id).value='');
  await loadSettings();
  document.getElementById('set-saphet').value=SETTINGS.sapHet;
  document.getElementById('set-ganhet').value=SETTINGS.ganHet;
  document.getElementById('set-hsdsap').value=SETTINGS.hsdSap;
  document.getElementById('set-hsdgan').value=SETTINGS.hsdGan;
}
async function saveCaiDat(){
  const sap=Number(document.getElementById('set-saphet').value||10);
  const gan=Number(document.getElementById('set-ganhet').value||3);
  const hsdSap=Number(document.getElementById('set-hsdsap').value||30);
  const hsdGan=Number(document.getElementById('set-hsdgan').value||7);
  if(gan>sap){toast('Ngưỡng "Gần hết" phải ≤ ngưỡng "Sắp hết"','err');return;}
  if(hsdGan>hsdSap){toast('Ngưỡng HSD "Gấp" phải ≤ ngưỡng HSD "Sắp hết hạn"','err');return;}
  toast('Đang lưu...');
  const data=await apiGet('CaiDat');
  const row=[gan,sap,hsdGan,hsdSap];
  await apiPost(data.length?{sheet:'CaiDat',action:'update',row:2,data:row}:{sheet:'CaiDat',action:'append',row});
  SETTINGS.ganHet=gan;SETTINGS.sapHet=sap;SETTINGS.hsdGan=hsdGan;SETTINGS.hsdSap=hsdSap;
  toast('Đã lưu cài đặt!');
}

// ══ NHẬT KÝ HOẠT ĐỘNG ══ xem lại ai đã tạo mới/cập nhật/xóa gì ở Tồn kho, Nhập hàng, Xếp hàng
async function loadLog(){
  document.getElementById('log-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  if(!C.USER.length)await loadUser();// cần để tra tên hiển thị từ email đăng nhập ghi trong nhật ký
  const data=await apiGet('Log');
  C.LOG=[...data].reverse();// mới nhất lên đầu
  fLog();
}
const LOG_ACT_BG={'Tạo mới':'bg-g','Cập nhật':'bg-b','Xóa':'bg-r'};
function fLog(){
  const q=document.getElementById('q-log').value.toLowerCase();
  const from=document.getElementById('from-log').value;
  const to=document.getElementById('to-log').value;
  const act=document.getElementById('act-log').value;
  const obj=document.getElementById('obj-log').value;
  const pg=Number(document.getElementById('pg-log').value);
  let d=C.LOG.filter(r=>{
    const ngay=(r[0]||'').slice(0,10);
    if(from&&ngay<from)return false;
    if(to&&ngay>to)return false;
    if(act&&r[2]!==act)return false;
    if(obj&&r[3]!==obj)return false;
    const ten=(findUserByEmail(r[1])||[])[0]||'';
    if(q&&!((r[1]||'').toLowerCase().includes(q)||ten.toLowerCase().includes(q)||(r[4]||'').toLowerCase().includes(q)))return false;
    return true;
  });
  if(pg>0)d=d.slice(0,pg);
  rLog(d);
}
function rLog(data){
  const el=document.getElementById('log-tbl');
  if(!data.length){el.innerHTML='<div class="empty">📜 Chưa có nhật ký hoạt động</div>';return;}
  el.innerHTML='<table class="m-tbl"><thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead><tbody>'+
    data.map(r=>{
      const rec=findUserByEmail(r[1]);
      const who=rec?`${rec[0]}<br><small style="opacity:.75">${esc(r[1]||'')}</small>`:esc(r[1]||'');
      return`<tr><td data-label="Thời gian">${fmtDT(r[0])}</td><td data-label="Người dùng"><span class="bg bg-p">${who}</span></td><td class="mobile-hide" data-label="Hành động"><span class="bg ${LOG_ACT_BG[r[2]]||'bg-b'}">${r[2]||''}</span></td><td data-label="Đối tượng">${r[3]||''}</td><td class="mobile-hide" data-label="Chi tiết">${esc(r[4]||'')}</td></tr>`;
    }).join('')+
    '</tbody></table>';
}

// ── INIT ──
(async()=>{
  await initFirebase();
  // Lắng nghe trạng thái đăng nhập
  auth.onAuthStateChanged(async user=>{
    if(user){
      // Đã đăng nhập → ẩn login, hiện app
      document.getElementById('login-screen').style.display='none';
      document.getElementById('sb').style.display='flex';
      document.getElementById('main').style.display='flex';
      document.getElementById('user-email-display').textContent=user.email;
      // Nạp sẵn danh sách Người dùng để nhận diện "ai đang đăng nhập" (map theo email) — dùng để
      // tự điền "Người nhập" trong Nhập hàng và hiển thị tên thân thiện thay vì email trần trong Nhật ký
      C.USER=await apiGet('User');
      const curRec=findUserByEmail(user.email);
      if(curRec)document.getElementById('user-email-display').textContent=`${curRec[0]} · ${user.email}`;
      // Khởi tạo data nếu chưa có
      const snap=await db.ref('_initialized').once('value');
      if(!snap.val()){
        toast('Đang khởi tạo dữ liệu...');
        const init=[['Bim',110,'gói',3000,5000,'','',10,''],['Moon',42,'hộp',8000,12000,'','',10,''],['BaoNgoc',9,'gói',5000,8000,'','',10,''],['Fami',6,'gói',4000,6000,'','',10,''],['LuongKho',20,'gói',15000,22000,'','',10,''],['Pina',12,'hộp',10000,15000,'','',10,''],['Sua',47,'hộp',12000,18000,'','',10,''],['Nabati',9,'gói',8000,12000,'','',10,''],['Tra',81,'chai',5000,8000,'','',10,''],['Nutri',45,'hộp',15000,22000,'','',10,''],['G',60,'chai',8000,12000,'','',10,''],['Orio',8,'gói',10000,15000,'','',10,''],['XX',69,'chai',7000,10000,'','',10,''],['Kokomi',25,'gói',5000,8000,'','',10,''],['Morden',26,'gói',20000,30000,'','',10,''],['Omachi',68,'gói',6000,9000,'','',10,''],['Haohao',3,'gói',5000,8000,'','',10,''],['Cafe',33,'gói',15000,22000,'','',10,''],['BH',79,'hộp',25000,38000,'','',10,''],['Staff',5,'gói',30000,45000,'','',10,''],['HoaCuc',2,'hộp',20000,30000,'','',10,''],['Probi',65,'hộp',18000,28000,'','',10,'']];
        for(const r of init)await apiPost({sheet:'TonKho',action:'append',row:r});
        await db.ref('_initialized').set(true);
        toast('Khởi tạo xong!');
      }
      await loadSettings();
      loadDash();
    } else {
      // Chưa đăng nhập → hiện login
      document.getElementById('login-screen').style.display='flex';
      document.getElementById('sb').style.display='none';
      document.getElementById('main').style.display='none';
    }
  });
})();
