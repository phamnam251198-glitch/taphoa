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

let C={TK:[],NH:[],NCC:[],USER:[],GH:[],XH:[],LOG:[],GHK:[],LOAI:[],KK:[]};
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
  const titles={dash:'Tổng quan',tk:'Tồn kho',nh:'Nhập hàng',xh:'Xếp hàng',ghk:'Đồ gian hàng',kk:'Kiểm kê',best:'Bestseller',bc:'Báo cáo theo tháng',log:'Nhật ký hoạt động',setting:'Cài đặt'};
  document.getElementById('ptitle').textContent=titles[name];
  const btns={
    tk:`<button class="btn btn-p" onclick="initSPForm()">+ Thêm sản phẩm</button>`,
    nh:`<button class="btn btn-s" onclick="openNH()">+ Tạo phiếu nhập</button>`,
    xh:`<button class="btn btn-s" onclick="openXH()">+ Tạo phiếu xếp</button>`,
    ghk:`<button class="btn btn-g" onclick="loadGHK()">↻ Làm mới</button>`,
    kk:`<button class="btn btn-s" onclick="openKKNew()">+ Kiểm kê mới</button>`,
    best:`<button class="btn btn-g" onclick="loadBestseller()">↻ Làm mới</button>`,
    bc:`<button class="btn btn-g" onclick="loadBC()">↻ Làm mới</button>`,
    dash:`<button class="btn btn-g" onclick="loadDash()">↻ Làm mới</button>`,
    log:`<button class="btn btn-g" onclick="loadLog()">↻ Làm mới</button>`,
    setting:''
  };
  document.getElementById('acts').innerHTML=btns[name]||'';
  if(name==='tk')loadTK();
  else if(name==='nh')loadNH();
  else if(name==='xh')loadXH();
  else if(name==='ghk')loadGHK();
  else if(name==='kk')loadKK();
  else if(name==='best')loadBestseller();
  else if(name==='bc')openBC();
  else if(name==='log')loadLog();
  else if(name==='setting'){loadCaiDat();loadUser();loadNCC();loadGH();loadLoai();}
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
let dashLow=[],dashHet=[],dashExp=[];
// Bấm vào ô thống kê Hết hàng/Hàng sắp hết/Sắp hết hạn → popup danh sách SP tương ứng (chỉ Tên + Số lượng)
function openDashList(kind){
  const cfg={
    het:{title:'Hết hàng',data:dashHet},
    sap:{title:'Hàng sắp hết',data:dashLow},
    hsd:{title:'Sắp hết hạn sử dụng',data:dashExp}
  }[kind];
  if(!cfg)return;
  document.getElementById('dash-list-t').textContent=`${cfg.title} (${cfg.data.length} sản phẩm)`;
  const el=document.getElementById('dash-list-tbl');
  // Cố tình KHÔNG dùng bảng .m-tbl (bảng đó ở mobile tự chuyển mỗi CỘT thành 1 dòng riêng cho card nhiều
  // trường) — ở đây chỉ có 2 trường Tên/SL nên luôn muốn nằm chung 1 hàng, kể cả trên điện thoại
  el.innerHTML=cfg.data.length?'<div class="simple-list">'+
    cfg.data.map(r=>`<div class="simple-row"><span class="n">${esc(r[0])}</span><span class="v">${fmt(Number(r[1]||0))}</span></div>`).join('')+'</div>'
    :'<div class="empty">✅ Không có sản phẩm nào</div>';
  om('m-dash-list');
}
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
  dashHet=tk.filter(r=>stTK(r)==='het');
  document.getElementById('d-het').textContent=dashHet.length;
  dashLow=tk.filter(r=>Number(r[1]||0)<=getSapHet(r));
  document.getElementById('d-sh').textContent=dashLow.length;
  document.getElementById('lbadge').style.display=dashLow.length?'inline':'none';
  renderDLow();
  // Hàng sắp hết hạn sử dụng: HSD đã qua hoặc còn ≤ ngưỡng riêng SP (hoặc mặc định) — chỉ tính SP có ghi HSD
  const ts=td();
  const daysLeftOf=r=>Math.round((new Date(r[5])-new Date(ts))/86400000);
  const exp=tk.filter(r=>r[5]&&Number(r[1]||0)>0&&daysLeftOf(r)<=getHsdSap(r)).sort((a,b)=>(a[5]||'').localeCompare(b[5]||''));
  dashExp=exp;
  document.getElementById('d-hsd').textContent=exp.length;
  document.getElementById('d-exp').innerHTML=exp.length===0?'<div class="empty">✅ Không có hàng sắp hết hạn</div>':
    '<div class="scroll-tbl"><table><thead><tr><th>Sản phẩm</th><th>HSD</th><th>Trạng thái</th></tr></thead><tbody>'+
    exp.map(r=>{
      const daysLeft=daysLeftOf(r);
      const badge=daysLeft<0?'<span class="bg bg-r">Đã hết hạn</span>':daysLeft<=getHsdGan(r)?`<span class="bg bg-r">Còn ${daysLeft} ngày</span>`:`<span class="bg bg-y">Còn ${daysLeft} ngày</span>`;
      return`<tr><td>${r[0]}</td><td>${r[5]}</td><td>${badge}</td></tr>`;
    }).join('')+'</tbody></table></div>';
  renderDashChart(tk);
  C.XH=await apiGet('XepHang');
  renderDashBest();
  document.getElementById('sync').innerHTML='Trạng thái: <b>Đã đồng bộ ✓</b>';
}
// ── Bestseller (ước tính) — vì app chưa có bước ghi nhận BÁN HÀNG thực tế, không thể biết chính xác SP nào
// bán chạy. Tạm suy đoán qua tín hiệu gián tiếp: SP nào được XẾP HÀNG (bù ra gian hàng) nhiều nhất trong
// 30 ngày gần đây → khả năng cao là SP bán chạy nên phải bù hàng liên tục. Gộp theo Mã SP (qua xhTKIndex)
// để đổi tên SP không làm tách lẻ dữ liệu ra 2 dòng khác nhau, giống cách làm ở "Top sản phẩm nhập hàng".
let dashBestN=5;
function changeDashBestN(v){dashBestN=Number(v);renderDashBest();}
function renderDashBest(){
  const el=document.getElementById('d-best');if(!el)return;
  const cutoff=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const recent=(C.XH||[]).filter(r=>(r[3]||'')>=cutoff);
  const map=new Map();
  recent.forEach(r=>{
    const idx=xhTKIndex(r);
    const key=idx>=0?'i'+idx:'n'+r[0];
    const ten=idx>=0?C.TK[idx][0]:r[0];
    if(!map.has(key))map.set(key,{ten,sl:0,lan:0});
    const g=map.get(key);
    g.sl+=Number(r[1]||0);g.lan++;
  });
  const top=[...map.values()].sort((a,b)=>b.sl-a.sl).slice(0,dashBestN);
  if(!top.length){el.innerHTML='<div class="empty">📭 Chưa có dữ liệu xếp hàng trong 30 ngày qua</div>';return;}
  el.innerHTML='<p style="font-size:11px;color:var(--text2);padding:0 2px 10px">* Ước tính qua tổng SL đã Xếp hàng ra gian hàng (chưa có bước ghi nhận bán hàng thực tế) — SP càng phải bù hàng nhiều càng có khả năng bán chạy.</p>'+
    '<div class="simple-list">'+
    top.map((g,i)=>`<div class="simple-row"><span class="n">${i+1}. ${esc(g.ten)}</span><span class="v">${fmt(g.sl)} · ${g.lan} lần xếp</span></div>`).join('')+
    '</div>';
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
// Trạng thái thu gọn/mở của các khối Loại hàng — mặc định mở hết; bấm nút để đảo trạng thái cho TẤT CẢ khối
let tkAllOpen=true;
function toggleTKAll(){
  tkAllOpen=!tkAllOpen;
  document.querySelectorAll('#tk-tbl .acc-group').forEach(d=>{d.open=tkAllOpen;});
  updateTKToggleBtn();
}
function updateTKToggleBtn(){
  const btn=document.getElementById('tk-toggle-all-btn');
  if(btn)btn.textContent=tkAllOpen?'▲ Thu gọn tất cả':'▼ Mở tất cả';
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// ── Phân trang dùng chung cho các màn danh sách (Tồn kho, NCC, Gian hàng, Loại hàng, Người dùng) ──
// mkOnclick(page) trả về chuỗi JS cho thuộc tính onclick — cho phép mỗi màn tự định nghĩa hàm goto của mình
// (có màn chỉ cần 1 tham số trang, có màn như Tồn kho cần thêm tên Loại hàng vì phân trang riêng theo từng khối)
const LIST_PAGE_SIZE=20;
function pagerHTML(page,total,mkOnclick){
  const totalPages=Math.max(1,Math.ceil(total/LIST_PAGE_SIZE));
  if(totalPages<=1)return'';
  return`<div class="pager" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;flex-wrap:wrap">
    <button class="btn btn-g btn-sm"${page<=1?' disabled':''} onclick="${mkOnclick(page-1)}">‹ Trước</button>
    <span style="font-size:12px;color:var(--text2)">Trang ${page}/${totalPages} (${total} dòng)</span>
    <button class="btn btn-g btn-sm"${page>=totalPages?' disabled':''} onclick="${mkOnclick(page+1)}">Sau ›</button>
  </div>`;
}
// ── Ô gõ-tìm tự chế (Sản phẩm/Loại hàng/NCC...) ── thay cho <datalist>: giới hạn ~10 dòng gợi ý rồi cuộn,
// thay vì để trình duyệt tự quyết hiện bao nhiêu dòng (datalist có thể xổ ra cả danh sách dài không kiểm soát được)
function attachSearchList(input,getItems){
  if(!input||input.dataset.acBound)return;
  input.dataset.acBound='1';
  input.setAttribute('autocomplete','off');
  const menu=document.createElement('div');
  menu.className='ac-menu';
  document.body.appendChild(menu);
  input._acMenu=menu;// để dọn dẹp khi dòng/ô này bị xóa hoặc vẽ lại (menu nằm ở body, không tự mất theo input)
  let items=[],hi=-1;
  function position(){
    const r=input.getBoundingClientRect();
    menu.style.left=Math.round(r.left)+'px';
    menu.style.top=Math.round(r.bottom+2)+'px';
    menu.style.width=Math.round(r.width)+'px';
  }
  function render(){
    const q=input.value.trim().toLowerCase();
    const all=getItems();
    items=(q?all.filter(v=>v.toLowerCase().includes(q)):all).filter((v,i,a)=>a.indexOf(v)===i);
    hi=-1;
    if(!items.length){menu.innerHTML='<div class="ac-empty">Không có kết quả khớp</div>';}
    else menu.innerHTML=items.map((v,i)=>`<div class="ac-item" data-i="${i}">${esc(v)}</div>`).join('');
    position();
    menu.style.display='block';
  }
  function highlight(){
    [...menu.children].forEach((el,i)=>el.classList.toggle('hi',i===hi));
    const el=menu.children[hi];if(el)el.scrollIntoView({block:'nearest'});
  }
  function choose(i){
    if(!items[i])return;
    input.value=items[i];
    menu.style.display='none';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  input.addEventListener('focus',render);
  input.addEventListener('input',render);
  input.addEventListener('blur',()=>setTimeout(()=>{menu.style.display='none';},150));
  input.addEventListener('keydown',e=>{
    if(menu.style.display==='none'||!items.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();hi=Math.min(hi+1,items.length-1);highlight();}
    else if(e.key==='ArrowUp'){e.preventDefault();hi=Math.max(hi-1,0);highlight();}
    else if(e.key==='Enter'){if(hi>=0){e.preventDefault();choose(hi);}}
    else if(e.key==='Escape'){menu.style.display='none';}
  });
  menu.addEventListener('mousedown',e=>{// mousedown (không phải click) để chạy trước sự kiện blur của input
    const it=e.target.closest('.ac-item');
    if(!it)return;
    e.preventDefault();
    choose(Number(it.dataset.i));
  });
  window.addEventListener('resize',()=>{if(menu.style.display==='block')position();});
  window.addEventListener('scroll',()=>{if(menu.style.display==='block')position();},true);
}
// Xóa menu gợi ý còn sót lại của mọi ô đã gắn attachSearchList bên trong 1 phần tử — gọi TRƯỚC khi ghi đè
// innerHTML của phần tử đó (vd vẽ lại bảng), vì ghi đè innerHTML chỉ xóa input chứ không tự xóa menu ở body
function cleanupSearchLists(container){
  if(!container)return;
  container.querySelectorAll('[data-ac-bound]').forEach(el=>{if(el._acMenu)el._acMenu.remove();});
}
// Xóa 1 dòng (tr) kèm dọn menu gợi ý của các ô trong dòng đó — dùng thay cho .remove() trần ở các nút ✕ thêm dòng
function removeRowEl(tr){
  if(!tr)return;
  cleanupSearchLists(tr);
  tr.remove();
}
async function loadTK(){
  document.getElementById('tk-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selTK.clear();updateTKSelUI();
  tkPageByLoai={};// tải mới hẳn thì reset về trang 1 cho mọi khối Loại hàng
  const data=await apiGet('TonKho');C.TK=data;
  const low=data.filter(r=>Number(r[1]||0)<=getSapHet(r));
  const al=document.getElementById('la');
  if(low.length){al.style.display='flex';document.getElementById('la-txt').textContent=low.length+' SP sắp hết: '+low.slice(0,4).map(r=>r[0]).join(', ')+(low.length>4?'...':'');}
  else al.style.display='none';
  document.getElementById('tk-cnt').textContent=data.length+' sản phẩm';
  if(!C.LOAI.length)await loadLoai();
  fillLoaiFilterOptions();
  fTK();
}
// Nạp danh sách "Loại hàng" đang có (gom từ Tồn kho) vào ô lọc — giữ nguyên lựa chọn hiện tại nếu còn hợp lệ
function fillLoaiFilterOptions(){
  const sel=document.getElementById('loai-tk');
  if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Tất cả loại hàng</option>'+C.LOAI.map(r=>`<option${r[0]===cur?' selected':''}>${r[0]}</option>`).join('');
}
// Tiêu đề cột bấm được để sắp xếp — mỗi cột 1 khóa so sánh riêng
const TK_COLS=[
  {key:'ma',label:'Mã SP',w:'90px'},{key:'ten',label:'Tên SP',w:'220px'},{key:'ton',label:'Tồn',w:'70px'},
  {key:'gia',label:'Giá nhập',w:'100px'},{key:'hsd',label:'Hạn sử dụng',w:'120px'},{key:'status',label:'Trạng thái',w:'100px'}
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
    case'loai':return(a[13]||'').localeCompare(b[13]||'');
    case'ton':return Number(a[1]||0)-Number(b[1]||0);
    case'gia':return Number(a[3]||0)-Number(b[3]||0);
    case'hsd':return(a[5]||'').localeCompare(b[5]||'');
    default:return statusRank(a)-statusRank(b)||(a[0]||'').localeCompare(b[0]||'');
  }
}
// Màu cho từng khối "Loại hàng" — xoay vòng theo thứ tự, riêng "(Chưa phân loại)" luôn màu xám trung tính
function loaiColorClass(loai,idx){
  return loai==='(Chưa phân loại)'?'acc-cx':'acc-c'+(idx%8);
}
// ── Liên kết Nhập/Xếp hàng ↔ Tồn kho theo MÃ SP (khóa ổn định) thay vì theo TÊN ──
// Trước đây mọi nơi tra "phiếu này của sản phẩm nào" đều so tên (r[0]) với C.TK — nếu sau này đổi tên sản
// phẩm, các phiếu cũ sẽ tra sai/không ra. Giờ mỗi dòng NhapHang/XepHang có thêm cột Mã SP lưu kèm; tra theo
// mã trước, chỉ so tên như phương án dự phòng cho các bản ghi cũ chưa kịp gán mã (xem runMaSPMigration()).
function genNextMaSP(){
  let maxNum=0;
  C.TK.forEach(r=>{
    const m=/^SP(\d+)$/.exec(r[9]||'');
    if(m)maxNum=Math.max(maxNum,parseInt(m[1],10));
  });
  return'SP'+String(maxNum+1).padStart(4,'0');
}
// r = 1 dòng NhapHang [ten,sl,gia,ncc,ngay,gc,user,hsd,loai,maSP] — maSP ở index 9
function nhTKIndex(r){
  if(!r)return-1;
  const ma=r[9];
  if(ma){const i=C.TK.findIndex(t=>t[9]===ma);if(i>=0)return i;}
  return C.TK.findIndex(t=>t[0]===r[0]);// dự phòng: bản ghi cũ chưa có Mã SP
}
// r = 1 dòng XepHang [ten,sl,gh,ngay,gc,maSP] — maSP ở index 5
function xhTKIndex(r){
  if(!r)return-1;
  const ma=r[5];
  if(ma){const i=C.TK.findIndex(t=>t[9]===ma);if(i>=0)return i;}
  return C.TK.findIndex(t=>t[0]===r[0]);// dự phòng: bản ghi cũ chưa có Mã SP
}
// Chạy 1 LẦN (theo yêu cầu người dùng) để: (1) tự sinh Mã SP cho mọi sản phẩm Tồn kho đang thiếu mã,
// (2) quét toàn bộ lịch sử Nhập hàng/Xếp hàng, gán Mã SP vào các phiếu cũ chưa có (khớp theo TÊN đang lưu ở
// phiếu đó với Tồn kho hiện tại — vì vậy nên chạy TRƯỚC khi đổi tên bất kỳ SP nào, kẻo khớp sai/không ra).
// Sau khi chạy xong, mọi tra cứu liên kết phiếu↔sản phẩm sẽ ổn định qua đổi tên về sau.
async function runMaSPMigration(){
  toast('Đang quét & gán Mã SP...');
  const tk=await apiGet('TonKho');C.TK=tk;
  let tkCount=0;
  for(let i=0;i<C.TK.length;i++){
    if(!C.TK[i][9]){
      const row=[...C.TK[i]];row[9]=genNextMaSP();
      await apiPost({sheet:'TonKho',action:'update',row:i+2,data:row});
      C.TK[i]=row;tkCount++;
    }
  }
  const nh=await apiGet('NhapHang');C.NH=nh;
  let nhCount=0;
  for(let i=0;i<C.NH.length;i++){
    const r=C.NH[i];
    if(!r[9]){
      const idx=C.TK.findIndex(t=>t[0]===r[0]);
      if(idx>=0&&C.TK[idx][9]){
        const row=[...r];row[9]=C.TK[idx][9];
        await apiPost({sheet:'NhapHang',action:'update',row:i+2,data:row});
        C.NH[i]=row;nhCount++;
      }
    }
  }
  const xh=await apiGet('XepHang');C.XH=xh;
  let xhCount=0;
  for(let i=0;i<C.XH.length;i++){
    const r=C.XH[i];
    if(!r[5]){
      const idx=C.TK.findIndex(t=>t[0]===r[0]);
      if(idx>=0&&C.TK[idx][9]){
        const row=[...r];row[5]=C.TK[idx][9];
        await apiPost({sheet:'XepHang',action:'update',row:i+2,data:row});
        C.XH[i]=row;xhCount++;
      }
    }
  }
  logAction('Cập nhật','Hệ thống',`Quét gán Mã SP: ${tkCount} sản phẩm được sinh mã mới, ${nhCount} phiếu nhập & ${xhCount} phiếu xếp được gán mã.`);
  toast(`Xong! Đã sinh mã cho ${tkCount} SP, gán mã cho ${nhCount} phiếu nhập & ${xhCount} phiếu xếp.`);
}
function askRunMaSPMigration(){
  confirmDel('Quét & gán Mã SP cho toàn bộ sản phẩm + lịch sử Nhập/Xếp hàng đang thiếu mã?\n\nChỉ cần chạy 1 lần. Nên chạy trước khi đổi tên bất kỳ sản phẩm nào để việc khớp theo tên (cho phiếu cũ) được chính xác.',runMaSPMigration);
}
// Vị trí của 1 Loại hàng theo đúng thứ tự đã sắp ở Cài đặt → Loại hàng (kéo lên/xuống bằng nút ↑↓) —
// dùng để quyết định khối nào hiện trước khi gộp accordion ở Tồn kho & Đồ gian hàng
function loaiSortOrder(name){
  const idx=C.LOAI.findIndex(r=>r[0]===name);
  return idx>=0?idx:9999;
}
function sortLoaiNames(names){
  return names.sort((a,b)=>{
    if(a==='(Chưa phân loại)')return 1;
    if(b==='(Chưa phân loại)')return-1;
    return loaiSortOrder(a)-loaiSortOrder(b);
  });
}
// Phân trang RIÊNG cho từng khối Loại hàng (vì mỗi khối là 1 bảng độc lập) — key = tên Loại hàng
let tkPageByLoai={};
function gotoTKPage(loai,p){tkPageByLoai[loai]=p;rTK(tkLastData);}
let tkLastData=[];
function rTK(data){
  tkLastData=data;
  const el=document.getElementById('tk-tbl');
  if(!data.length){el.innerHTML='<div class="empty">📦 Chưa có sản phẩm</div>';return;}
  // Gộp theo Loại hàng — mỗi loại là 1 khối xổ (accordion) riêng, xổ được nhiều khối cùng lúc
  const groups=new Map();
  data.forEach(r=>{
    const loai=r[13]||'(Chưa phân loại)';
    if(!groups.has(loai))groups.set(loai,[]);
    groups.get(loai).push(r);
  });
  const loaiNames=sortLoaiNames([...groups.keys()]);
  const ths=TK_COLS.map(c=>{
    const on=tkSortCol===c.key;
    return`<th${c.w?` style="width:${c.w}"`:''} class="th-sort${on?' th-sort-on':''}" onclick="sortTKClick('${c.key}')">${c.label} <span class="sort-ic">${on?(tkSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;color:var(--text2)">
    <input type="checkbox" id="tk-selall" onchange="toggleAllTK(this)"><label for="tk-selall">Chọn tất cả đang hiển thị</label>
  </div>`+
    loaiNames.map((loai,idx)=>{
      const items=groups.get(loai);
      const totalPages=Math.max(1,Math.ceil(items.length/LIST_PAGE_SIZE));
      let page=tkPageByLoai[loai]||1;
      if(page>totalPages)page=totalPages;if(page<1)page=1;
      tkPageByLoai[loai]=page;
      const pageItems=items.slice((page-1)*LIST_PAGE_SIZE,page*LIST_PAGE_SIZE);
      const rows=pageItems.map((r,i)=>{
        const gi=C.TK.indexOf(r);// vị trí thật trong C.TK, tránh lệch dòng khi đang lọc/sắp xếp
        const sl=Number(r[1]||0),gn=Number(r[3]||0);
        const chk=selTK.has(r[0])?'checked':'';
        return`<tr><td data-label=""><input type="checkbox" class="tk-chk" data-name="${esc(r[0])}" ${chk} onchange="toggleTKChk(this)"></td><td class="mobile-hide" data-label="STT">${(page-1)*LIST_PAGE_SIZE+i+1}</td><td class="mobile-hide" data-label="Mã SP">${r[9]?`<span class="bg bg-b">${r[9]}</span>`:''}</td><td data-label="Tên SP"><b>${r[0]}</b></td><td data-label="Tồn"><b>${sl}</b></td><td data-label="Giá nhập">${gn?fmt(gn)+'đ':''}</td><td class="mobile-hide" data-label="Hạn sử dụng">${r[5]||''}</td><td data-label="Trạng thái">${statusBadge(r)}</td>
        <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editSP(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delSP(${gi+2})">Xóa</button></td></tr>`;
      }).join('');
      const tongSL=items.reduce((s,r)=>s+Number(r[1]||0),0);
      const moveBtns=loai==='(Chưa phân loại)'?'':`<span style="display:flex;gap:2px" onclick="event.preventDefault();event.stopPropagation()">
        <button class="btn btn-g btn-sm" ${idx<=0?'disabled':''} onclick="event.preventDefault();event.stopPropagation();moveLoaiByName('${esc(loai)}',-1,fTK)" title="Đưa loại này lên">↑</button>
        <button class="btn btn-g btn-sm" ${idx>=loaiNames.length-1?'disabled':''} onclick="event.preventDefault();event.stopPropagation();moveLoaiByName('${esc(loai)}',1,fTK)" title="Đưa loại này xuống">↓</button>
      </span>`;
      const pager=pagerHTML(page,items.length,p=>`gotoTKPage('${esc(loai)}',${p})`);
      return`<details class="acc-group ${loaiColorClass(loai,idx)}"${tkAllOpen?' open':''}>
        <summary>${moveBtns}🏷️ ${esc(loai)}<span class="acc-cnt">${items.length} SP · Tổng tồn: ${fmt(tongSL)}</span></summary>
        <div class="scroll-tbl"><table class="m-tbl" style="table-layout:fixed"><thead><tr><th style="width:34px"></th><th style="width:40px">STT</th>${ths}<th style="width:130px"></th></tr></thead><tbody>${rows}</tbody></table></div>
        ${pager}
      </details>`;
    }).join('');
  updateTKSelUI();
  updateTKToggleBtn();
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
// Sắp xếp dùng chung cho Tồn kho + danh sách "Hàng cần nhập" ở Tổng quan
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
  const loai=document.getElementById('loai-tk')?.value||'';
  const filtered=C.TK.filter(r=>((r[0]||'').toLowerCase().includes(q)||(r[9]||'').toLowerCase().includes(q))&&(!st||stTK(r)===st)&&(!loai||r[13]===loai));
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
async function initSPForm(){
  if(!C.LOAI.length)await loadLoai();
  document.getElementById('m-sp-t').textContent='Thêm sản phẩm';
  ['sp-ma','sp-ten','sp-sl','sp-dv','sp-gn','sp-gb','sp-hsd','sp-ng','sp-gh','sp-hsdsap','sp-hsdgan','sp-ncc','sp-loai'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('sp-row').value='';
  if(!C.NCC.length)await loadNCC();
  attachSearchList(document.getElementById('sp-ncc'),()=>C.NCC.map(r=>r[0]));
  attachSearchList(document.getElementById('sp-loai'),()=>C.LOAI.map(r=>r[0]));
  om('m-sp');
}
async function editSP(row){
  const r=C.TK[row-2];document.getElementById('m-sp-t').textContent='Sửa sản phẩm';
  document.getElementById('sp-ten').value=r[0]||'';document.getElementById('sp-sl').value=r[1]||'';
  document.getElementById('sp-dv').value=r[2]||'';document.getElementById('sp-gn').value=r[3]||'';
  document.getElementById('sp-gb').value=r[4]||'';document.getElementById('sp-hsd').value=r[5]||'';
  document.getElementById('sp-ng').value=r[7]||'';document.getElementById('sp-ncc').value=r[8]||'';
  document.getElementById('sp-ma').value=r[9]||'';
  document.getElementById('sp-gh').value=r[10]||'';
  document.getElementById('sp-hsdsap').value=r[11]||'';
  document.getElementById('sp-hsdgan').value=r[12]||'';
  document.getElementById('sp-loai').value=r[13]||'';
  document.getElementById('sp-row').value=row;
  if(!C.LOAI.length)await loadLoai();
  if(!C.NCC.length)await loadNCC();
  attachSearchList(document.getElementById('sp-ncc'),()=>C.NCC.map(r=>r[0]));
  attachSearchList(document.getElementById('sp-loai'),()=>C.LOAI.map(r=>r[0]));
  om('m-sp');
}
async function delSP(row){
  // Lấy tên trực tiếp từ C.TK theo vị trí dòng thay vì nhận qua tham số chuỗi trong onclick —
  // tránh lỗi/kẹt nút khi tên sản phẩm chứa dấu nháy đơn (') làm hỏng chuỗi JS nhúng trong HTML
  const r=C.TK[row-2];
  const name=r?r[0]:'';
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
  const er=document.getElementById('sp-row').value;
  let ma=document.getElementById('sp-ma').value.trim();
  if(!ma&&!er)ma=genNextMaSP();// SP mới mà chưa gõ mã → tự sinh, để luôn có khóa liên kết ổn định (không phụ thuộc tên nữa)
  if(!ma){toast('Thiếu Mã SP — không được để trống (sẽ làm hỏng liên kết với phiếu Nhập/Xếp hàng)','err');return;}
  if(C.TK.some((t,i)=>t[9]===ma&&String(i+2)!==er)){toast(`Mã SP "${ma}" đã được dùng cho sản phẩm khác`,'err');return;}
  const row=[ten,document.getElementById('sp-sl').value||0,document.getElementById('sp-dv').value,document.getElementById('sp-gn').value||0,document.getElementById('sp-gb').value||0,document.getElementById('sp-hsd').value,td(),ng,document.getElementById('sp-ncc').value,ma,gh,hsdSap,hsdGan,document.getElementById('sp-loai').value.trim()];
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
  const tr=document.createElement('tr');
  tr.id='nh-r-'+id;
  tr.innerHTML=`<td><input id="nh-sp-${id}" autocomplete="off" placeholder="Gõ tên sản phẩm..." oninput="nhFillGia(${id})" style="min-width:130px"></td>
    <td><input type="number" id="nh-sl-${id}" placeholder="0" oninput="nhCalc(${id},'sl')" style="width:70px"></td>
    <td><input type="number" id="nh-gia-${id}" placeholder="0" oninput="nhCalc(${id},'gia')" style="width:90px"></td>
    <td><input type="number" id="nh-tong-${id}" placeholder="0" oninput="nhCalc(${id},'tong')" style="width:100px"></td>
    <td><input type="date" id="nh-hsd-${id}" style="width:130px"></td>
    <td><input id="nh-loai-${id}" autocomplete="off" style="width:110px"></td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="removeRowEl(document.getElementById('nh-r-${id}'));calcNH()">✕</button></td>`;
  document.getElementById('nh-rows').appendChild(tr);
  attachSearchList(document.getElementById('nh-sp-'+id),()=>C.TK.map(t=>t[0]));
  attachSearchList(document.getElementById('nh-loai-'+id),()=>C.LOAI.map(r=>r[0]));
}
// Gõ/chọn sản phẩm khớp đúng tên có sẵn → gợi ý sẵn Giá nhập = giá nhập cũ, Loại hàng = loại đã lưu, rồi tính lại Tổng theo giá đó
function nhFillGia(id){
  const val=document.getElementById('nh-sp-'+id).value;
  const idx=C.TK.findIndex(t=>t[0]===val);
  if(idx>=0){
    document.getElementById('nh-gia-'+id).value=C.TK[idx][3]||0;
    document.getElementById('nh-loai-'+id).value=C.TK[idx][13]||'';
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
  if(!C.LOAI.length)await loadLoai();
  if(!C.NCC.length)await loadNCC();
  document.getElementById('nh-user').innerHTML='<option value="">-- Chọn --</option>'+C.USER.map(r=>`<option>${r[0]}</option>`).join('');
  // Tự điền sẵn "Người nhập" theo tài khoản đang đăng nhập (nếu tài khoản này có gắn với 1 Người dùng) — đỡ phải chọn tay
  const cur=currentUserName();
  if(cur&&C.USER.some(u=>u[0]===cur))document.getElementById('nh-user').value=cur;
  document.getElementById('nh-ngay').value=td();
  document.getElementById('nh-ncc').value='';
  document.getElementById('nh-gc').value='';
  attachSearchList(document.getElementById('nh-ncc'),()=>C.NCC.map(r=>r[0]));
  cleanupSearchLists(document.getElementById('nh-rows'));
  document.getElementById('nh-rows').innerHTML='';nhRowCount=0;
  addNHRow();calcNH();om('m-nh');
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
    const spVal=document.getElementById('nh-sp-'+id)?.value||'';
    const idx=C.TK.findIndex(t=>t[0]===spVal);
    const sl=Number(document.getElementById('nh-sl-'+id)?.value||0);
    const gia=Number(document.getElementById('nh-gia-'+id)?.value||0);// đã tự đồng bộ với Tổng giá nhập qua nhCalc()
    const hsd=document.getElementById('nh-hsd-'+id)?.value||'';
    const loai=document.getElementById('nh-loai-'+id)?.value||'';
    if(idx>=0&&sl>0)items.push({idx,sp:C.TK[idx],sl,gia,hsd,loai});
  });
  if(!user){toast('Chọn người nhập','err');return;}
  if(!items.length){toast('Thêm ít nhất 1 sản phẩm','err');return;}
  toast('Đang lưu '+items.length+' sản phẩm...');
  for(const it of items){
    const nccGhi=ncc||it.sp[8]||'';
    const loaiGhi=it.loai||it.sp[13]||'';
    await apiPost({sheet:'NhapHang',action:'append',row:[it.sp[0],it.sl,it.gia,nccGhi,ngay,gc,user,it.hsd,loaiGhi,it.sp[9]||'']});
    const newSL=Number(it.sp[1]||0)+it.sl;const upd=[...it.sp];upd[1]=newSL;
    if(it.gia>0)upd[3]=it.gia;// cập nhật giá nhập mới nhất vào Tồn kho
    if(it.hsd)upd[5]=it.hsd;// cập nhật hạn sử dụng mới nhất vào Tồn kho
    if(ncc)upd[8]=ncc;// cập nhật nhà cung cấp mới nhất vào Tồn kho (chỉ khi có nhập NCC ở phiếu)
    if(it.loai)upd[13]=it.loai;// cập nhật loại hàng mới nhất vào Tồn kho
    await apiPost({sheet:'TonKho',action:'update',row:it.idx+2,data:upd});
    C.TK[it.idx][1]=newSL;if(it.gia>0)C.TK[it.idx][3]=it.gia;if(it.hsd)C.TK[it.idx][5]=it.hsd;if(ncc)C.TK[it.idx][8]=ncc;if(it.loai)C.TK[it.idx][13]=it.loai;
  }
  logAction('Tạo mới','Nhập hàng',`Người nhập: ${user} — ${items.map(it=>`${it.sp[0]} x${it.sl}`).join(', ')}`);
  toast('Đã nhập '+items.length+' sản phẩm thành công!');cm('m-nh');setTimeout(loadNH,800);
}

// Lõi dùng chung để sửa 1 dòng Nhập hàng (dùng cho popup sửa nhanh theo ngày) —
// tách riêng để tránh viết trùng logic tính lại tồn kho ở 2 nơi (dễ lệch/dễ tái phát lỗi cộng dồn đã fix trước đây)
async function saveNHEditCore(row,spIdx,sl,gia,ncc,ngay,gc,user,hsd,loai){
  const old=C.NH[row-2];if(!old)return{ok:false,msg:'Không tìm thấy phiếu nhập'};
  const sp=C.TK[spIdx];
  if(!sp)return{ok:false,msg:'Chọn sản phẩm'};
  if(!sl||sl<=0)return{ok:false,msg:'Số lượng phải lớn hơn 0'};
  if(!user)return{ok:false,msg:'Chọn người nhập'};
  await apiPost({sheet:'NhapHang',action:'update',row,data:[sp[0],sl,gia,ncc,ngay,gc,user,hsd,loai,sp[9]||'']});
  // đồng bộ ngay vào cache C.NH — tránh trường hợp sửa lại CÙNG dòng này lần nữa trước khi loadNH()
  // kịp tải lại, khiến "SL cũ" đọc được bị lỗi thời và tồn kho bị cộng dồn sai
  C.NH[row-2]=[sp[0],sl,gia,ncc,ngay,gc,user,hsd,loai,sp[9]||''];
  // điều chỉnh lại tồn kho theo chênh lệch số lượng (và đổi sản phẩm nếu có) — tra theo Mã SP trước (ổn định
  // khi đổi tên), chỉ dự phòng theo tên cho các phiếu cũ chưa có Mã SP
  const oldIdx=nhTKIndex(old);
  const oldSL=Number(old[1]||0);
  if(oldIdx>=0&&oldIdx===spIdx){
    const newStock=Math.max(0,Number(C.TK[spIdx][1]||0)-oldSL+sl);
    const upd=[...C.TK[spIdx]];upd[1]=newStock;
    if(gia>0)upd[3]=gia;// cập nhật giá nhập mới nhất vào Tồn kho
    if(hsd)upd[5]=hsd;// cập nhật hạn sử dụng mới nhất vào Tồn kho
    if(ncc)upd[8]=ncc;// cập nhật nhà cung cấp mới nhất vào Tồn kho
    if(loai)upd[13]=loai;// cập nhật loại hàng mới nhất vào Tồn kho
    await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
    C.TK[spIdx][1]=newStock;if(gia>0)C.TK[spIdx][3]=gia;if(hsd)C.TK[spIdx][5]=hsd;if(ncc)C.TK[spIdx][8]=ncc;if(loai)C.TK[spIdx][13]=loai;
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
    if(loai)updNew[13]=loai;// cập nhật loại hàng mới nhất vào Tồn kho
    await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:updNew});
    C.TK[spIdx][1]=newStockNew;if(gia>0)C.TK[spIdx][3]=gia;if(hsd)C.TK[spIdx][5]=hsd;if(ncc)C.TK[spIdx][8]=ncc;if(loai)C.TK[spIdx][13]=loai;
  }
  logAction('Cập nhật','Nhập hàng',`"${old[0]}" SL ${old[1]}→${sl}, Giá ${old[2]}→${gia} — sửa bởi: ${user}`);
  return{ok:true};
}
let selNH=new Set();
// Danh sách Nhập hàng hiển thị GỘP THEO NGÀY (mỗi ngày 1 dòng) — bấm vào xem chi tiết từng dòng
// nhập của ngày đó trong popup, giống bảng ở form "Tạo phiếu nhập"
function groupNHByDate(data){
  const map=new Map();
  data.forEach(r=>{
    const ngay=r[4]||'(chưa có ngày)';
    if(!map.has(ngay))map.set(ngay,[]);
    map.get(ngay).push(r);
  });
  return[...map.entries()].map(([ngay,items])=>({
    ngay,items,
    soSP:new Set(items.map(r=>r[0])).size,
    tongSL:items.reduce((s,r)=>s+Number(r[1]||0),0),
    tongTien:items.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0),
    nguoiNhap:[...new Set(items.map(r=>r[6]).filter(Boolean))],
    ncc:[...new Set(items.map(r=>r[3]).filter(Boolean))],
    loai:[...new Set(items.map(r=>r[8]).filter(Boolean))]
  }));
}
async function loadNH(){
  document.getElementById('nh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selNH.clear();updateSelUI('nh-delsel-btn','nh-selcnt',0);
  if(!C.USER.length)await loadUser();
  const userSel=document.getElementById('user-nh');
  if(userSel){
    const cur=userSel.value;
    userSel.innerHTML='<option value="">Tất cả người nhập</option>'+C.USER.map(u=>`<option${u[0]===cur?' selected':''}>${esc(u[0])}</option>`).join('');
  }
  const data=await apiGet('NhapHang');C.NH=data;
  rNH(groupNHByDate(data).sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||'')));
  // Không tự vẽ lại popup nếu đang có dòng mới chưa lưu (bấm "+ Thêm") — tránh mất trắng nội dung đang gõ dở
  if(nhDayCurrent&&document.getElementById('m-nh-day').classList.contains('on')&&!document.querySelector('#nh-day-tbl tr[data-new="1"]'))renderNHDayDetail();
}
const NH_COLS=[
  {key:'ngay',label:'Ngày nhập'},{key:'sosp',label:'Số sản phẩm'},{key:'tongsl',label:'Tổng SL'},
  {key:'tongtien',label:'Tổng tiền'},{key:'nguoinhap',label:'Người nhập'},{key:'ncc',label:'NCC'},{key:'loai',label:'Loại hàng'}
];
let nhSortCol=null,nhSortDir=1;
function sortNHClick(col){if(nhSortCol===col)nhSortDir*=-1;else{nhSortCol=col;nhSortDir=1;}fNH();}
function nhCompare(a,b,col){
  switch(col){
    case'sosp':return a.soSP-b.soSP;
    case'tongsl':return a.tongSL-b.tongSL;
    case'tongtien':return a.tongTien-b.tongTien;
    case'nguoinhap':return a.nguoiNhap.join(',').localeCompare(b.nguoiNhap.join(','));
    case'ncc':return a.ncc.join(',').localeCompare(b.ncc.join(','));
    case'loai':return a.loai.join(',').localeCompare(b.loai.join(','));
    default:return(a.ngay||'').localeCompare(b.ngay||'');
  }
}
// Top sản phẩm nhập nhiều nhất trong khoảng đang lọc — gộp theo Mã SP (qua nhTKIndex) chứ không theo tên,
// để đổi tên sản phẩm không làm tách lẻ dữ liệu ra 2 dòng khác nhau trong bảng xếp hạng này.
let nhTopN=5,nhLastFlat=[];
function changeNHTopN(v){nhTopN=Number(v);renderNHTop(nhLastFlat);}
function renderNHTop(flat){
  nhLastFlat=flat;
  const el=document.getElementById('nh-top');if(!el)return;
  if(!flat.length){el.innerHTML='';return;}
  const map=new Map();
  flat.forEach(r=>{
    const idx=nhTKIndex(r);
    const key=idx>=0?'i'+idx:'n'+r[0];
    const ten=idx>=0?C.TK[idx][0]:r[0];
    if(!map.has(key))map.set(key,{ten,sl:0,tien:0,lan:0});
    const g=map.get(key);
    g.sl+=Number(r[1]||0);g.tien+=Number(r[1]||0)*Number(r[2]||0);g.lan++;
  });
  const top=[...map.values()].sort((a,b)=>b.sl-a.sl).slice(0,nhTopN);
  el.innerHTML=`<div class="card" style="margin-bottom:16px">
    <div class="ch"><h2>🏆 Top sản phẩm nhập nhiều nhất</h2>
      <select id="nh-topn" onchange="changeNHTopN(this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;background:#fff;outline:none">
        <option value="5"${nhTopN===5?' selected':''}>Top 5</option>
        <option value="10"${nhTopN===10?' selected':''}>Top 10</option>
      </select>
    </div>
    <div class="scroll-tbl"><table class="m-tbl"><thead><tr><th style="width:40px">#</th><th>Sản phẩm</th><th>Số lần nhập</th><th>Tổng SL</th><th>Tổng tiền</th></tr></thead><tbody>
    ${top.map((g,i)=>`<tr><td>${i+1}</td><td><b>${esc(g.ten)}</b></td><td>${g.lan}</td><td>${fmt(g.sl)}</td><td>${fmt(g.tien)}đ</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}
function rNH(groups){
  const flat=groups.flatMap(g=>g.items);
  const total=flat.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0);
  document.getElementById('nh-sum').innerHTML=flat.length?`<div class="grid3 stat-grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số ngày nhập</div><div class="val">${groups.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng SL</div><div class="val">${fmt(flat.reduce((s,r)=>s+Number(r[1]||0),0))}</div></div>
    <div class="kpi r"><div class="lb">Tổng tiền nhập</div><div class="val">${fmt(total)}đ</div></div></div>`:'';
  renderNHTop(flat);
  const el=document.getElementById('nh-tbl');
  if(!groups.length){el.innerHTML='<div class="empty">⬇️ Chưa có phiếu nhập</div>';return;}
  const ths=NH_COLS.map(c=>{
    const on=nhSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortNHClick('${c.key}')">${c.label} <span class="sort-ic">${on?(nhSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="nh-selall" onchange="toggleAllNH(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    groups.map(g=>{
      const chk=selNH.has(g.ngay)?'checked':'';
      return`<tr style="cursor:pointer" onclick="openNHDay('${esc(g.ngay)}')">
      <td data-label="" onclick="event.stopPropagation()"><input type="checkbox" class="nh-chk" data-ngay="${esc(g.ngay)}" ${chk} onchange="toggleNHChk(this)"></td>
      <td data-label="Ngày nhập"><b>${esc(g.ngay)}</b></td>
      <td data-label="Số sản phẩm">${g.soSP}</td>
      <td data-label="Tổng SL">${fmt(g.tongSL)}</td>
      <td data-label="Tổng tiền"><span class="bg bg-b">${fmt(g.tongTien)}đ</span></td>
      <td class="mobile-hide" data-label="Người nhập">${g.nguoiNhap.map(n=>`<span class="bg bg-p">${esc(n)}</span>`).join(' ')||''}</td>
      <td class="mobile-hide" data-label="NCC">${g.ncc.join(', ')}</td>
      <td class="mobile-hide" data-label="Loại hàng">${g.loai.join(', ')}</td>
      <td data-label="" onclick="event.stopPropagation()"><button class="btn btn-g btn-sm" onclick="openNHDay('${esc(g.ngay)}')">Xem</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('nh-delsel-btn','nh-selcnt',selNH.size);
  updateNHSelAllTri();
}
// selNH giờ chứa các NGÀY được chọn (không phải index dòng) — vì 1 dòng ngoài list = cả 1 ngày gộp nhiều bản ghi
function updateNHSelAllTri(){
  const all=document.getElementById('nh-selall');
  if(!all)return;
  const chks=[...document.querySelectorAll('.nh-chk')];
  const checkedCnt=chks.filter(c=>selNH.has(c.dataset.ngay)).length;
  all.checked=chks.length>0&&checkedCnt===chks.length;
  all.indeterminate=checkedCnt>0&&checkedCnt<chks.length;
}
function toggleNHChk(el){
  const ngay=el.dataset.ngay;
  if(el.checked)selNH.add(ngay);else selNH.delete(ngay);
  updateSelUI('nh-delsel-btn','nh-selcnt',selNH.size);
  updateNHSelAllTri();
}
function toggleAllNH(el){
  document.querySelectorAll('.nh-chk').forEach(c=>{
    c.checked=el.checked;
    const ngay=c.dataset.ngay;
    if(el.checked)selNH.add(ngay);else selNH.delete(ngay);
  });
  updateSelUI('nh-delsel-btn','nh-selcnt',selNH.size);
}
async function delSelNH(){
  if(!selNH.size){toast('Chưa chọn ngày nào','err');return;}
  const days=[...selNH];
  const items=C.NH.map((r,i)=>[r,i]).filter(([r])=>days.includes(r[4]||'(chưa có ngày)'));
  if(!items.length){toast('Không tìm thấy phiếu nào','err');return;}
  confirmDel(`Xóa toàn bộ phiếu nhập của ${days.length} ngày đã chọn (${items.length} dòng)? Tồn kho sẽ được điều chỉnh (trừ lại) tương ứng.`,async()=>{
    toast('Đang xóa '+items.length+' dòng...');
    const idxs=items.map(([,i])=>i).sort((a,b)=>b-a);// xóa từ index lớn → nhỏ để tránh lệch vị trí
    const delNames=[];
    for(const idx of idxs){
      const r=C.NH[idx];if(!r)continue;
      delNames.push(`${r[0]} x${r[1]}`);
      await apiPost({sheet:'NhapHang',action:'delete',row:idx+2});
      const spIdx=nhTKIndex(r);
      if(spIdx>=0){
        const newSL=Math.max(0,Number(C.TK[spIdx][1]||0)-Number(r[1]||0));
        const upd=[...C.TK[spIdx]];upd[1]=newSL;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=newSL;
      }
    }
    logAction('Xóa','Nhập hàng',`Xóa hàng loạt ${days.length} ngày (${delNames.length} dòng): ${delNames.join(', ')}`);
    selNH.clear();
    toast('Đã xóa '+idxs.length+' dòng nhập!');setTimeout(loadNH,800);
  });
}
function fNH(){
  const q=document.getElementById('q-nh').value.toLowerCase();
  const from=document.getElementById('from-nh').value;
  const to=document.getElementById('to-nh').value;
  const user=document.getElementById('user-nh')?.value||'';
  const pg=Number(document.getElementById('pg-nh').value);
  let d=[...C.NH];
  if(from)d=d.filter(r=>r[4]>=from);
  if(to)d=d.filter(r=>r[4]<=to);
  if(user)d=d.filter(r=>r[6]===user);
  if(q)d=d.filter(r=>(r[0]||'').toLowerCase().includes(q)||(r[3]||'').toLowerCase().includes(q)||(r[8]||'').toLowerCase().includes(q));
  let groups=groupNHByDate(d);
  if(nhSortCol)groups.sort((a,b)=>nhCompare(a,b,nhSortCol)*nhSortDir);
  else groups.sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||''));// mặc định: ngày mới nhất trước
  if(pg>0)groups=groups.slice(0,pg);// pg giờ giới hạn theo số NGÀY, không phải số dòng
  rNH(groups);
}
// ── Popup chi tiết các dòng nhập của 1 ngày ──
let nhDayCurrent=null;
async function openNHDay(ngay){
  nhDayCurrent=ngay;
  if(!C.TK.length)await loadTK();
  if(!C.USER.length)await loadUser();
  if(!C.LOAI.length)await loadLoai();
  if(!C.NCC.length)await loadNCC();
  document.getElementById('nh-day-q').value='';
  document.getElementById('nh-day-hsd-from').value='';
  document.getElementById('nh-day-hsd-to').value='';
  document.getElementById('nh-day-user-q').innerHTML='<option value="">Tất cả người nhập</option>'+C.USER.map(u=>`<option>${esc(u[0])}</option>`).join('');
  renderNHDayDetail();
  om('m-nh-day');
}
// Sửa trực tiếp (inline) từng dòng nhập ngay trong popup — tính lại "Thành tiền" khi gõ SL/Giá
function nhdCalc(id){
  const sl=Number(document.getElementById('nhd-sl-'+id)?.value||0);
  const gia=Number(document.getElementById('nhd-gia-'+id)?.value||0);
  const el=document.getElementById('nhd-tt-'+id);
  if(el)el.textContent=fmt(sl*gia)+'đ';
}
// Đổi sản phẩm → tự điền lại "Loại hàng" theo đúng loại đã lưu của sản phẩm đó; sản phẩm chưa có loại (hoặc gõ chưa khớp tên nào) thì để trống
function nhdFillLoai(id){
  const spEl=document.getElementById('nhd-sp-'+id);
  const loaiEl=document.getElementById('nhd-loai-'+id);
  if(!spEl||!loaiEl)return;
  const idx=C.TK.findIndex(t=>t[0]===spEl.value);
  loaiEl.value=idx>=0?(C.TK[idx][13]||''):'';
}
function renderNHDayDetail(){
  const wrap=document.getElementById('nh-day-tbl');
  if(!wrap)return;
  cleanupSearchLists(wrap);// dọn menu gợi ý cũ trước khi ghi đè innerHTML bên dưới
  const items=C.NH.filter(r=>(r[4]||'(chưa có ngày)')===nhDayCurrent);
  document.getElementById('nh-day-t').textContent='Phiếu nhập ngày '+(nhDayCurrent||'');
  const tongSL=items.reduce((s,r)=>s+Number(r[1]||0),0);
  const tongTien=items.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0);
  document.getElementById('nh-day-sum').innerHTML=items.length?`<div class="grid3 stat-grid3" style="margin-bottom:14px">
    <div class="kpi b"><div class="lb">Số dòng</div><div class="val">${items.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng SL</div><div class="val">${fmt(tongSL)}</div></div>
    <div class="kpi r"><div class="lb">Tổng tiền</div><div class="val">${fmt(tongTien)}đ</div></div></div>`:'';
  // Tìm nhanh Sản phẩm/Hạn SD/Người nhập ngay trong phiếu này — chỉ lọc dòng hiển thị, không đụng tới dữ liệu/tổng số ở trên
  const q=(document.getElementById('nh-day-q')?.value||'').trim().toLowerCase();
  const hsdFrom=document.getElementById('nh-day-hsd-from')?.value||'';
  const hsdTo=document.getElementById('nh-day-hsd-to')?.value||'';
  const qUser=document.getElementById('nh-day-user-q')?.value||'';
  const shown=items.filter(r=>
    (!q||(r[0]||'').toLowerCase().includes(q))&&
    (!hsdFrom||(r[7]||'')>=hsdFrom)&&
    (!hsdTo||(r[7]||'')<=hsdTo)&&
    (!qUser||r[6]===qUser)
  );
  const rowsHtml=shown.map(r=>{
    const gi=C.NH.indexOf(r);const row=gi+2;
    const userOpts='<option value="">-- Chọn --</option>'+C.USER.map(u=>`<option${u[0]===r[6]?' selected':''}>${u[0]}</option>`).join('');
    return`<tr>
      <td><input id="nhd-sp-${row}" value="${esc(r[0])}" autocomplete="off" oninput="nhdFillLoai(${row})" style="min-width:130px"></td>
      <td><input type="number" id="nhd-sl-${row}" value="${r[1]||0}" style="width:65px" oninput="nhdCalc(${row})"></td>
      <td><input type="number" id="nhd-gia-${row}" value="${r[2]||0}" style="width:85px" oninput="nhdCalc(${row})"></td>
      <td><b id="nhd-tt-${row}">${fmt(Number(r[1]||0)*Number(r[2]||0))}đ</b></td>
      <td><input type="date" id="nhd-ngay-${row}" value="${r[4]||''}" style="width:135px"></td>
      <td><input type="date" id="nhd-hsd-${row}" value="${r[7]||''}" style="width:135px"></td>
      <td><input id="nhd-ncc-${row}" value="${r[3]||''}" autocomplete="off" style="width:110px"></td>
      <td><select id="nhd-user-${row}" style="min-width:100px">${userOpts}</select></td>
      <td><input id="nhd-loai-${row}" value="${esc(r[8]||'')}" autocomplete="off" style="width:100px"></td>
      <td><input id="nhd-gc-${row}" value="${r[5]||''}" style="width:110px"></td>
      <td class="td-del"><button class="btn btn-d btn-sm" onclick="delNH(${row})">✕</button></td>
    </tr>`;
  }).join('');
  let emptyMsg='';
  if(!items.length)emptyMsg='<div class="empty">Không còn phiếu nào trong ngày này — bấm "+ Thêm sản phẩm" để thêm mới</div>';
  else if(!shown.length)emptyMsg='<div class="empty">Không có dòng nào khớp với bộ lọc đang tìm</div>';
  wrap.innerHTML=`<div class="scroll-tbl"><table class="item-table"><thead><tr>
    <th>Sản phẩm</th><th>SL</th><th>Giá nhập</th><th>Thành tiền</th><th>Ngày</th><th>Hạn SD</th><th>NCC</th><th>Người nhập</th><th>Loại hàng</th><th>Ghi chú</th><th></th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`+emptyMsg;
  wrap.querySelectorAll('[id^="nhd-sp-"]').forEach(el=>attachSearchList(el,()=>C.TK.map(t=>t[0])));
  wrap.querySelectorAll('[id^="nhd-ncc-"]').forEach(el=>attachSearchList(el,()=>C.NCC.map(r=>r[0])));
  wrap.querySelectorAll('[id^="nhd-loai-"]').forEach(el=>attachSearchList(el,()=>C.LOAI.map(r=>r[0])));
}
// Thêm 1 dòng TRỐNG (chưa lưu) vào popup để nhập thêm sản phẩm mới cho đúng ngày này
let nhDayNewCount=0;
function addNHDayRow(){
  const tbody=document.querySelector('#nh-day-tbl tbody');
  if(!tbody)return;
  nhDayNewCount++;
  const id='new'+nhDayNewCount;
  const cur=currentUserName();
  const userOpts='<option value="">-- Chọn --</option>'+C.USER.map(u=>`<option${u[0]===cur?' selected':''}>${u[0]}</option>`).join('');
  const ngayVal=nhDayCurrent&&nhDayCurrent!=='(chưa có ngày)'?nhDayCurrent:'';
  const tr=document.createElement('tr');
  tr.dataset.new='1';tr.dataset.tempId=id;
  tr.innerHTML=`
    <td><input id="nhd-sp-${id}" autocomplete="off" placeholder="Gõ tên sản phẩm..." oninput="nhdFillLoai('${id}')" style="min-width:130px"></td>
    <td><input type="number" id="nhd-sl-${id}" placeholder="0" style="width:65px" oninput="nhdCalc('${id}')"></td>
    <td><input type="number" id="nhd-gia-${id}" placeholder="0" style="width:85px" oninput="nhdCalc('${id}')"></td>
    <td><b id="nhd-tt-${id}">0đ</b></td>
    <td><input type="date" id="nhd-ngay-${id}" value="${ngayVal}" style="width:135px"></td>
    <td><input type="date" id="nhd-hsd-${id}" style="width:135px"></td>
    <td><input id="nhd-ncc-${id}" autocomplete="off" style="width:110px"></td>
    <td><select id="nhd-user-${id}" style="min-width:100px">${userOpts}</select></td>
    <td><input id="nhd-loai-${id}" autocomplete="off" style="width:100px"></td>
    <td><input id="nhd-gc-${id}" style="width:110px"></td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="removeRowEl(this.closest('tr'))">✕</button></td>`;
  tbody.appendChild(tr);
  attachSearchList(document.getElementById('nhd-sp-'+id),()=>C.TK.map(t=>t[0]));
  attachSearchList(document.getElementById('nhd-ncc-'+id),()=>C.NCC.map(r=>r[0]));
  attachSearchList(document.getElementById('nhd-loai-'+id),()=>C.LOAI.map(r=>r[0]));
}
// Tạo mới 1 dòng Nhập hàng (dùng cho dòng vừa "+ Thêm" trong popup theo ngày) — cùng logic cộng tồn kho như saveNH()
async function saveNHCreateCore(spIdx,sl,gia,ncc,ngay,gc,user,hsd,loai){
  const sp=C.TK[spIdx];
  if(!sp)return{ok:false,msg:'Chọn sản phẩm'};
  if(!sl||sl<=0)return{ok:false,msg:'Số lượng phải lớn hơn 0'};
  if(!user)return{ok:false,msg:'Chọn người nhập'};
  const nccGhi=ncc||sp[8]||'';
  const loaiGhi=loai||sp[13]||'';
  await apiPost({sheet:'NhapHang',action:'append',row:[sp[0],sl,gia,nccGhi,ngay,gc,user,hsd,loaiGhi,sp[9]||'']});
  const newSL=Number(sp[1]||0)+sl;const upd=[...sp];upd[1]=newSL;
  if(gia>0)upd[3]=gia;if(hsd)upd[5]=hsd;if(ncc)upd[8]=ncc;if(loai)upd[13]=loai;
  await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
  C.TK[spIdx][1]=newSL;if(gia>0)C.TK[spIdx][3]=gia;if(hsd)C.TK[spIdx][5]=hsd;if(ncc)C.TK[spIdx][8]=ncc;if(loai)C.TK[spIdx][13]=loai;
  C.NH.push([sp[0],sl,gia,nccGhi,ngay,gc,user,hsd,loaiGhi,sp[9]||'']);
  return{ok:true};
}
// Lưu tất cả các dòng đang sửa trong popup (cả dòng có sẵn lẫn dòng vừa "+ Thêm")
// Xóa cả phiếu (mọi dòng) của ngày đang xem trong popup — tiện hơn phải đóng popup rồi ra danh sách tick chọn
async function delNHDay(){
  const idxs=C.NH.map((r,i)=>i).filter(i=>(C.NH[i][4]||'(chưa có ngày)')===nhDayCurrent).sort((a,b)=>b-a);
  if(!idxs.length){toast('Không có phiếu nào để xóa','err');return;}
  confirmDel(`Xóa toàn bộ phiếu nhập ngày ${nhDayCurrent} (${idxs.length} dòng)? Tồn kho sẽ được điều chỉnh (trừ lại) tương ứng.`,async()=>{
    toast('Đang xóa '+idxs.length+' dòng...');
    const delNames=[];
    for(const idx of idxs){
      const r=C.NH[idx];if(!r)continue;
      delNames.push(`${r[0]} x${r[1]}`);
      await apiPost({sheet:'NhapHang',action:'delete',row:idx+2});
      const spIdx=nhTKIndex(r);
      if(spIdx>=0){
        const newSL=Math.max(0,Number(C.TK[spIdx][1]||0)-Number(r[1]||0));
        const upd=[...C.TK[spIdx]];upd[1]=newSL;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=newSL;
      }
    }
    logAction('Xóa','Nhập hàng',`Xóa cả phiếu ngày ${nhDayCurrent} (${delNames.length} dòng): ${delNames.join(', ')}`);
    toast('Đã xóa phiếu nhập ngày '+nhDayCurrent+'!');
    cm('m-nh-day');
    setTimeout(loadNH,800);
  });
}
async function saveNHDayAll(){
  toast('Đang lưu...');
  const items=C.NH.filter(r=>(r[4]||'(chưa có ngày)')===nhDayCurrent);
  for(const r of items){
    const row=C.NH.indexOf(r)+2;
    const spEl=document.getElementById('nhd-sp-'+row);
    if(!spEl)continue;// dòng đã bị xóa khỏi DOM (bấm ✕) trong lúc sửa, bỏ qua
    const spIdx=C.TK.findIndex(t=>t[0]===spEl.value);
    const sl=Number(document.getElementById('nhd-sl-'+row).value||0);
    const gia=Number(document.getElementById('nhd-gia-'+row).value||0);
    const ngay=document.getElementById('nhd-ngay-'+row).value;
    const hsd=document.getElementById('nhd-hsd-'+row).value;
    const ncc=document.getElementById('nhd-ncc-'+row).value;
    const user=document.getElementById('nhd-user-'+row).value;
    const loai=document.getElementById('nhd-loai-'+row).value;
    const gc=document.getElementById('nhd-gc-'+row).value;
    const res=await saveNHEditCore(row,spIdx,sl,gia,ncc,ngay,gc,user,hsd,loai);
    if(!res.ok){toast(`Dòng "${r[0]}": ${res.msg}`,'err');return;}
  }
  const newTrs=[...document.querySelectorAll('#nh-day-tbl tbody tr[data-new="1"]')];
  const created=[];
  for(const tr of newTrs){
    const id=tr.dataset.tempId;
    const spVal=document.getElementById('nhd-sp-'+id).value;
    const sl=Number(document.getElementById('nhd-sl-'+id).value||0);
    if(!spVal&&!sl)continue;// dòng để trống hoàn toàn (bấm + Thêm nhưng không gõ gì), bỏ qua
    const spIdx=C.TK.findIndex(t=>t[0]===spVal);
    const gia=Number(document.getElementById('nhd-gia-'+id).value||0);
    const ngay=document.getElementById('nhd-ngay-'+id).value;
    const hsd=document.getElementById('nhd-hsd-'+id).value;
    const ncc=document.getElementById('nhd-ncc-'+id).value;
    const user=document.getElementById('nhd-user-'+id).value;
    const loai=document.getElementById('nhd-loai-'+id).value;
    const gc=document.getElementById('nhd-gc-'+id).value;
    const res=await saveNHCreateCore(spIdx,sl,gia,ncc,ngay,gc,user,hsd,loai);
    if(!res.ok){toast(`Dòng mới: ${res.msg}`,'err');return;}
    created.push(`${C.TK[spIdx][0]} x${sl}`);
  }
  if(created.length)logAction('Tạo mới','Nhập hàng',`Thêm vào ngày ${nhDayCurrent}: ${created.join(', ')}`);
  toast('Đã lưu tất cả thay đổi!');
  cm('m-nh-day');
  setTimeout(loadNH,800);
}

// ══ XẾP HÀNG NHIỀU DÒNG (chuyển hàng từ kho ra gian hàng, trừ tồn kho) ══
let xhRowCount=0;
function addXHRow(){
  xhRowCount++;const id=xhRowCount;
  const tr=document.createElement('tr');tr.id='xh-r-'+id;
  tr.innerHTML=`<td><input id="xh-sp-${id}" autocomplete="off" placeholder="Gõ tên sản phẩm..." style="min-width:150px"></td>
    <td><input type="number" id="xh-sl-${id}" placeholder="0" oninput="calcXH()" style="width:90px"></td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="removeRowEl(document.getElementById('xh-r-${id}'));calcXH()">✕</button></td>`;
  document.getElementById('xh-rows').appendChild(tr);
  attachSearchList(document.getElementById('xh-sp-'+id),()=>C.TK.map(t=>t[0]));
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
  cleanupSearchLists(document.getElementById('xh-rows'));
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
    const spVal=document.getElementById('xh-sp-'+id)?.value||'';
    const idx=C.TK.findIndex(t=>t[0]===spVal);
    const sl=Number(document.getElementById('xh-sl-'+id)?.value||0);
    if(idx>=0&&sl>0)items.push({idx,sp:C.TK[idx],sl});
  });
  if(!gh){toast('Chọn gian hàng','err');return;}
  if(!items.length){toast('Thêm ít nhất 1 sản phẩm','err');return;}
  // Kiểm tra tồn, không cho xếp vượt quá tồn kho hiện có
  for(const it of items){
    if(it.sl>Number(it.sp[1]||0)){toast(`${it.sp[0]}: tồn chỉ còn ${it.sp[1]}!`,'err');return;}
  }
  toast('Đang lưu '+items.length+' sản phẩm...');
  for(const it of items){
    await apiPost({sheet:'XepHang',action:'append',row:[it.sp[0],it.sl,gh,ngay,gc,it.sp[9]||'']});
    const newSL=Number(it.sp[1]||0)-it.sl;const upd=[...it.sp];upd[1]=newSL;
    await apiPost({sheet:'TonKho',action:'update',row:it.idx+2,data:upd});
    C.TK[it.idx][1]=newSL;
  }
  logAction('Tạo mới','Xếp hàng',`Gian hàng: ${gh} — ${items.map(it=>`${it.sp[0]} x${it.sl}`).join(', ')}`);
  toast('Đã xếp '+items.length+' sản phẩm!');cm('m-xh');setTimeout(loadXH,800);
}

let selXH=new Set();
// Danh sách Xếp hàng hiển thị GỘP THEO NGÀY (mỗi ngày 1 dòng) — bấm vào xem/sửa chi tiết từng dòng
// xếp của ngày đó trong popup, giống cách đã làm ở Nhập hàng
function groupXHByDate(data){
  const map=new Map();
  data.forEach(r=>{
    const ngay=r[3]||'(chưa có ngày)';
    if(!map.has(ngay))map.set(ngay,[]);
    map.get(ngay).push(r);
  });
  return[...map.entries()].map(([ngay,items])=>({
    ngay,items,
    soSP:new Set(items.map(r=>r[0])).size,
    tongSL:items.reduce((s,r)=>s+Number(r[1]||0),0),
    gianHang:[...new Set(items.map(r=>r[2]).filter(Boolean))]
  }));
}
async function loadXH(){
  document.getElementById('xh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selXH.clear();updateSelUI('xh-delsel-btn','xh-selcnt',0);
  const data=await apiGet('XepHang');C.XH=data;
  rXH(groupXHByDate(data).sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||'')));
  // Không tự vẽ lại popup nếu đang có dòng mới chưa lưu (bấm "+ Thêm") — tránh mất trắng nội dung đang gõ dở
  if(xhDayCurrent&&document.getElementById('m-xh-day').classList.contains('on')&&!document.querySelector('#xh-day-tbl tr[data-new="1"]'))renderXHDayDetail();
}
const XH_COLS=[
  {key:'ngay',label:'Ngày xếp'},{key:'sosp',label:'Số sản phẩm'},{key:'tongsl',label:'Tổng SL'},{key:'gh',label:'Gian hàng'}
];
let xhSortCol=null,xhSortDir=1;
function sortXHClick(col){if(xhSortCol===col)xhSortDir*=-1;else{xhSortCol=col;xhSortDir=1;}fXH();}
function xhCompare(a,b,col){
  switch(col){
    case'sosp':return a.soSP-b.soSP;
    case'tongsl':return a.tongSL-b.tongSL;
    case'gh':return a.gianHang.join(',').localeCompare(b.gianHang.join(','));
    default:return(a.ngay||'').localeCompare(b.ngay||'');
  }
}
function rXH(groups){
  const flat=groups.flatMap(g=>g.items);
  document.getElementById('xh-sum').innerHTML=flat.length?`<div class="grid3 stat-grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số ngày xếp</div><div class="val">${groups.length}</div></div>
    <div class="kpi p"><div class="lb">Tổng SL đã xếp</div><div class="val">${fmt(flat.reduce((s,r)=>s+Number(r[1]||0),0))}</div></div>
    <div class="kpi g"><div class="lb">Số gian hàng</div><div class="val">${new Set(flat.map(r=>r[2]).filter(Boolean)).size}</div></div></div>`:'';
  const el=document.getElementById('xh-tbl');
  if(!groups.length){el.innerHTML='<div class="empty">🏷️ Chưa có phiếu xếp hàng</div>';return;}
  const ths=XH_COLS.map(c=>{
    const on=xhSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortXHClick('${c.key}')">${c.label} <span class="sort-ic">${on?(xhSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="xh-selall" onchange="toggleAllXH(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    groups.map(g=>{
      const chk=selXH.has(g.ngay)?'checked':'';
      return`<tr style="cursor:pointer" onclick="openXHDay('${esc(g.ngay)}')">
      <td data-label="" onclick="event.stopPropagation()"><input type="checkbox" class="xh-chk" data-ngay="${esc(g.ngay)}" ${chk} onchange="toggleXHChk(this)"></td>
      <td data-label="Ngày xếp"><b>${esc(g.ngay)}</b></td>
      <td data-label="Số sản phẩm">${g.soSP}</td>
      <td data-label="Tổng SL">${fmt(g.tongSL)}</td>
      <td data-label="Gian hàng">${g.gianHang.map(n=>`<span class="bg bg-p">${esc(n)}</span>`).join(' ')||''}</td>
      <td data-label="" onclick="event.stopPropagation()"><button class="btn btn-g btn-sm" onclick="openXHDay('${esc(g.ngay)}')">Xem</button></td></tr>`;
    }).join('')+'</tbody></table>';
  updateSelUI('xh-delsel-btn','xh-selcnt',selXH.size);
  updateXHSelAllTri();
}
// selXH giờ chứa các NGÀY được chọn (không phải index dòng) — như đã làm ở Nhập hàng
function updateXHSelAllTri(){
  const all=document.getElementById('xh-selall');
  if(!all)return;
  const chks=[...document.querySelectorAll('.xh-chk')];
  const checkedCnt=chks.filter(c=>selXH.has(c.dataset.ngay)).length;
  all.checked=chks.length>0&&checkedCnt===chks.length;
  all.indeterminate=checkedCnt>0&&checkedCnt<chks.length;
}
function toggleXHChk(el){
  const ngay=el.dataset.ngay;
  if(el.checked)selXH.add(ngay);else selXH.delete(ngay);
  updateSelUI('xh-delsel-btn','xh-selcnt',selXH.size);
  updateXHSelAllTri();
}
function toggleAllXH(el){
  document.querySelectorAll('.xh-chk').forEach(c=>{
    c.checked=el.checked;
    const ngay=c.dataset.ngay;
    if(el.checked)selXH.add(ngay);else selXH.delete(ngay);
  });
  updateSelUI('xh-delsel-btn','xh-selcnt',selXH.size);
}
async function delSelXH(){
  if(!selXH.size){toast('Chưa chọn ngày nào','err');return;}
  const days=[...selXH];
  const items=C.XH.map((r,i)=>[r,i]).filter(([r])=>days.includes(r[3]||'(chưa có ngày)'));
  if(!items.length){toast('Không tìm thấy phiếu nào','err');return;}
  confirmDel(`Xóa toàn bộ phiếu xếp của ${days.length} ngày đã chọn (${items.length} dòng)? Tồn kho sẽ được hoàn lại tương ứng.`,async()=>{
    toast('Đang xóa '+items.length+' dòng...');
    const idxs=items.map(([,i])=>i).sort((a,b)=>b-a);
    const delNames=[];
    for(const idx of idxs){
      const r=C.XH[idx];if(!r)continue;
      delNames.push(`${r[0]} x${r[1]}`);
      await apiPost({sheet:'XepHang',action:'delete',row:idx+2});
      const spIdx=xhTKIndex(r);
      if(spIdx>=0){
        const newSL=Number(C.TK[spIdx][1]||0)+Number(r[1]||0);
        const upd=[...C.TK[spIdx]];upd[1]=newSL;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=newSL;
      }
    }
    logAction('Xóa','Xếp hàng',`Xóa hàng loạt ${days.length} ngày (${delNames.length} dòng): ${delNames.join(', ')}`);
    selXH.clear();
    toast('Đã xóa '+idxs.length+' dòng xếp!');setTimeout(loadXH,800);
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
  let groups=groupXHByDate(d);
  if(xhSortCol)groups.sort((a,b)=>xhCompare(a,b,xhSortCol)*xhSortDir);
  else groups.sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||''));
  if(pg>0)groups=groups.slice(0,pg);// pg giờ giới hạn theo số NGÀY, không phải số dòng
  rXH(groups);
}
// Lõi dùng chung để sửa 1 dòng Xếp hàng (dùng cho popup sửa nhanh theo ngày)
async function saveXHEditCore(row,spIdx,sl,gh,ngay,gc){
  const old=C.XH[row-2];if(!old)return{ok:false,msg:'Không tìm thấy phiếu xếp hàng'};
  const sp=C.TK[spIdx];
  if(!sp)return{ok:false,msg:'Chọn sản phẩm'};
  if(!sl||sl<=0)return{ok:false,msg:'Số lượng phải lớn hơn 0'};
  if(!gh)return{ok:false,msg:'Chọn gian hàng'};
  const oldIdx=xhTKIndex(old);
  const oldSL=Number(old[1]||0);
  // Kiểm tra tồn khả dụng (cộng hoàn lại phần phiếu cũ đã trừ trước khi so sánh)
  if(oldIdx>=0&&oldIdx===spIdx){
    const available=Number(C.TK[spIdx][1]||0)+oldSL;
    if(sl>available)return{ok:false,msg:`${sp[0]}: tồn chỉ còn ${available}!`};
  } else if(sl>Number(sp[1]||0)){
    return{ok:false,msg:`${sp[0]}: tồn chỉ còn ${sp[1]}!`};
  }
  await apiPost({sheet:'XepHang',action:'update',row,data:[sp[0],sl,gh,ngay,gc,sp[9]||'']});
  // đồng bộ ngay vào cache C.XH — tránh trường hợp sửa lại CÙNG dòng này lần nữa trước khi loadXH()
  // kịp tải lại, khiến "SL cũ" đọc được bị lỗi thời và tồn kho bị tính sai
  C.XH[row-2]=[sp[0],sl,gh,ngay,gc,sp[9]||''];
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
  return{ok:true};
}
// ── Popup chi tiết + sửa nhanh các dòng xếp hàng của 1 ngày ──
let xhDayCurrent=null;
async function openXHDay(ngay){
  xhDayCurrent=ngay;
  if(!C.TK.length)await loadTK();
  if(!C.GH.length)await loadGH();
  document.getElementById('xh-day-q').value='';
  document.getElementById('xh-day-gh-q').innerHTML='<option value="">Tất cả gian hàng</option>'+C.GH.map(g=>`<option>${esc(g[0])}</option>`).join('');
  renderXHDayDetail();
  om('m-xh-day');
}
function renderXHDayDetail(){
  const wrap=document.getElementById('xh-day-tbl');
  if(!wrap)return;
  cleanupSearchLists(wrap);// dọn menu gợi ý cũ trước khi ghi đè innerHTML bên dưới
  const items=C.XH.filter(r=>(r[3]||'(chưa có ngày)')===xhDayCurrent);
  document.getElementById('xh-day-t').textContent='Phiếu xếp hàng ngày '+(xhDayCurrent||'');
  const tongSL=items.reduce((s,r)=>s+Number(r[1]||0),0);
  document.getElementById('xh-day-sum').innerHTML=items.length?`<div class="grid3 stat-grid3" style="margin-bottom:14px">
    <div class="kpi b"><div class="lb">Số dòng</div><div class="val">${items.length}</div></div>
    <div class="kpi p"><div class="lb">Tổng SL</div><div class="val">${fmt(tongSL)}</div></div>
    <div class="kpi g"><div class="lb">Số gian hàng</div><div class="val">${new Set(items.map(r=>r[2]).filter(Boolean)).size}</div></div></div>`:'';
  // Tìm nhanh sản phẩm/gian hàng ngay trong phiếu này — chỉ lọc dòng hiển thị, không đụng tới dữ liệu/tổng số ở trên
  const q=(document.getElementById('xh-day-q')?.value||'').trim().toLowerCase();
  const qGh=document.getElementById('xh-day-gh-q')?.value||'';// chọn đúng tên từ danh mục Gian hàng ở Cài đặt, không phải gõ tự do
  const shown=items.filter(r=>
    (!q||(r[0]||'').toLowerCase().includes(q))&&
    (!qGh||r[2]===qGh)
  );
  const rowsHtml=shown.map(r=>{
    const gi=C.XH.indexOf(r);const row=gi+2;
    return`<tr>
      <td><input id="xhd-sp-${row}" value="${esc(r[0])}" autocomplete="off" style="min-width:150px"></td>
      <td><input type="number" id="xhd-sl-${row}" value="${r[1]||0}" style="width:70px"></td>
      <td><input id="xhd-gh-${row}" value="${esc(r[2]||'')}" autocomplete="off" style="min-width:100px"></td>
      <td><input type="date" id="xhd-ngay-${row}" value="${r[3]||''}" style="width:135px"></td>
      <td><input id="xhd-gc-${row}" value="${r[4]||''}" style="width:130px"></td>
      <td class="td-del"><button class="btn btn-d btn-sm" onclick="delXH(${row})">✕</button></td>
    </tr>`;
  }).join('');
  let emptyMsg='';
  if(!items.length)emptyMsg='<div class="empty">Không còn phiếu nào trong ngày này — bấm "+ Thêm sản phẩm" để thêm mới</div>';
  else if(!shown.length)emptyMsg=`<div class="empty">Không có dòng nào khớp với bộ lọc đang tìm</div>`;
  wrap.innerHTML=`<div class="scroll-tbl"><table class="item-table"><thead><tr>
    <th>Sản phẩm</th><th>SL</th><th>Gian hàng</th><th>Ngày</th><th>Ghi chú</th><th></th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`+emptyMsg;
  wrap.querySelectorAll('[id^="xhd-sp-"]').forEach(el=>attachSearchList(el,()=>C.TK.map(t=>t[0])));
  wrap.querySelectorAll('[id^="xhd-gh-"]').forEach(el=>attachSearchList(el,()=>C.GH.map(g=>g[0])));
}
// Thêm 1 dòng TRỐNG (chưa lưu) vào popup để xếp thêm sản phẩm mới cho đúng ngày này
let xhDayNewCount=0;
function addXHDayRow(){
  const tbody=document.querySelector('#xh-day-tbl tbody');
  if(!tbody)return;
  xhDayNewCount++;
  const id='new'+xhDayNewCount;
  const ngayVal=xhDayCurrent&&xhDayCurrent!=='(chưa có ngày)'?xhDayCurrent:'';
  const tr=document.createElement('tr');
  tr.dataset.new='1';tr.dataset.tempId=id;
  tr.innerHTML=`
    <td><input id="xhd-sp-${id}" autocomplete="off" placeholder="Gõ tên sản phẩm..." style="min-width:150px"></td>
    <td><input type="number" id="xhd-sl-${id}" placeholder="0" style="width:70px"></td>
    <td><input id="xhd-gh-${id}" autocomplete="off" placeholder="Gõ tên gian hàng..." style="min-width:100px"></td>
    <td><input type="date" id="xhd-ngay-${id}" value="${ngayVal}" style="width:135px"></td>
    <td><input id="xhd-gc-${id}" style="width:130px"></td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="removeRowEl(this.closest('tr'))">✕</button></td>`;
  tbody.appendChild(tr);
  attachSearchList(document.getElementById('xhd-sp-'+id),()=>C.TK.map(t=>t[0]));
  attachSearchList(document.getElementById('xhd-gh-'+id),()=>C.GH.map(g=>g[0]));
}
// Tạo mới 1 dòng Xếp hàng (dùng cho dòng vừa "+ Thêm" trong popup theo ngày) — cùng logic trừ tồn kho như saveXH()
async function saveXHCreateCore(spIdx,sl,gh,ngay,gc){
  const sp=C.TK[spIdx];
  if(!sp)return{ok:false,msg:'Chọn sản phẩm'};
  if(!sl||sl<=0)return{ok:false,msg:'Số lượng phải lớn hơn 0'};
  if(!gh)return{ok:false,msg:'Chọn gian hàng'};
  if(sl>Number(sp[1]||0))return{ok:false,msg:`${sp[0]}: tồn chỉ còn ${sp[1]}!`};
  await apiPost({sheet:'XepHang',action:'append',row:[sp[0],sl,gh,ngay,gc,sp[9]||'']});
  const newSL=Number(sp[1]||0)-sl;const upd=[...sp];upd[1]=newSL;
  await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
  C.TK[spIdx][1]=newSL;
  C.XH.push([sp[0],sl,gh,ngay,gc,sp[9]||'']);
  return{ok:true};
}
// Lưu tất cả các dòng đang sửa trong popup (cả dòng có sẵn lẫn dòng vừa "+ Thêm")
// Xóa cả phiếu (mọi dòng) của ngày đang xem trong popup — tiện hơn phải đóng popup rồi ra danh sách tick chọn
async function delXHDay(){
  const idxs=C.XH.map((r,i)=>i).filter(i=>(C.XH[i][3]||'(chưa có ngày)')===xhDayCurrent).sort((a,b)=>b-a);
  if(!idxs.length){toast('Không có phiếu nào để xóa','err');return;}
  confirmDel(`Xóa toàn bộ phiếu xếp ngày ${xhDayCurrent} (${idxs.length} dòng)? Tồn kho sẽ được hoàn lại tương ứng.`,async()=>{
    toast('Đang xóa '+idxs.length+' dòng...');
    const delNames=[];
    for(const idx of idxs){
      const r=C.XH[idx];if(!r)continue;
      delNames.push(`${r[0]} x${r[1]}`);
      await apiPost({sheet:'XepHang',action:'delete',row:idx+2});
      const spIdx=xhTKIndex(r);
      if(spIdx>=0){
        const newSL=Number(C.TK[spIdx][1]||0)+Number(r[1]||0);
        const upd=[...C.TK[spIdx]];upd[1]=newSL;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=newSL;
      }
    }
    logAction('Xóa','Xếp hàng',`Xóa cả phiếu ngày ${xhDayCurrent} (${delNames.length} dòng): ${delNames.join(', ')}`);
    toast('Đã xóa phiếu xếp ngày '+xhDayCurrent+'!');
    cm('m-xh-day');
    setTimeout(loadXH,800);
  });
}
async function saveXHDayAll(){
  toast('Đang lưu...');
  const items=C.XH.filter(r=>(r[3]||'(chưa có ngày)')===xhDayCurrent);
  for(const r of items){
    const row=C.XH.indexOf(r)+2;
    const spEl=document.getElementById('xhd-sp-'+row);
    if(!spEl)continue;// dòng đã bị xóa khỏi DOM (bấm ✕) trong lúc sửa, bỏ qua
    const spIdx=C.TK.findIndex(t=>t[0]===spEl.value);
    const sl=Number(document.getElementById('xhd-sl-'+row).value||0);
    const gh=document.getElementById('xhd-gh-'+row).value;
    const ngay=document.getElementById('xhd-ngay-'+row).value;
    const gc=document.getElementById('xhd-gc-'+row).value;
    const res=await saveXHEditCore(row,spIdx,sl,gh,ngay,gc);
    if(!res.ok){toast(`Dòng "${r[0]}": ${res.msg}`,'err');return;}
  }
  const newTrs=[...document.querySelectorAll('#xh-day-tbl tbody tr[data-new="1"]')];
  const created=[];
  for(const tr of newTrs){
    const id=tr.dataset.tempId;
    const spVal=document.getElementById('xhd-sp-'+id).value;
    const sl=Number(document.getElementById('xhd-sl-'+id).value||0);
    if(!spVal&&!sl)continue;// dòng để trống hoàn toàn (bấm + Thêm nhưng không gõ gì), bỏ qua
    const spIdx=C.TK.findIndex(t=>t[0]===spVal);
    const gh=document.getElementById('xhd-gh-'+id).value;
    const ngay=document.getElementById('xhd-ngay-'+id).value;
    const gc=document.getElementById('xhd-gc-'+id).value;
    const res=await saveXHCreateCore(spIdx,sl,gh,ngay,gc);
    if(!res.ok){toast(`Dòng mới: ${res.msg}`,'err');return;}
    created.push(`${C.TK[spIdx][0]} x${sl}`);
  }
  if(created.length)logAction('Tạo mới','Xếp hàng',`Thêm vào ngày ${xhDayCurrent}: ${created.join(', ')}`);
  toast('Đã lưu tất cả thay đổi!');
  cm('m-xh-day');
  setTimeout(loadXH,800);
}

// ── XÓA XẾP HÀNG → hoàn lại tồn kho ──
async function delXH(row){
  const r=C.XH[row-2];if(!r)return;
  const tenSP=r[0],sl=Number(r[1]||0);
  confirmDel(`Xóa phiếu xếp "${tenSP}" (${sl})? Tồn kho sẽ được hoàn lại ${sl}.`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'XepHang',action:'delete',row:Number(row)});
    const spIdx=xhTKIndex(r);
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
  if(!C.TK.length)await loadTK();// cần để tra Loại hàng của từng sản phẩm khi gộp hiển thị
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
  if(!items.length){
    paneEl.innerHTML=`<div class="empty">🗄️ "${esc(ghkActiveTab)}" chưa có hàng nào (tự có khi Xếp hàng ra gian hàng này)</div>`;
    return;
  }
  // Gộp theo Loại hàng ngay trong gian hàng đang xem — mỗi loại 1 khối xổ (accordion) riêng
  const groups=new Map();
  items.forEach(([ten,sl])=>{
    const tk=C.TK.find(t=>t[0]===ten);
    const loai=(tk&&tk[13])||'(Chưa phân loại)';
    if(!groups.has(loai))groups.set(loai,[]);
    groups.get(loai).push([ten,sl]);
  });
  const loaiNames=sortLoaiNames([...groups.keys()]);
  const body=loaiNames.map((loai,idx)=>{
    const its=groups.get(loai);
    const rows=its.map(([ten,sl])=>
      `<tr><td data-label="Sản phẩm"><b>${ten}</b></td><td data-label="Số lượng"><b>${fmt(sl)}</b></td><td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editGHK('${esc(ten)}','${esc(ghkActiveTab)}')">Sửa</button></td></tr>`
    ).join('');
    const tongSL=its.reduce((s,[,sl])=>s+Number(sl||0),0);
    const moveBtns=loai==='(Chưa phân loại)'?'':`<span style="display:flex;gap:2px" onclick="event.preventDefault();event.stopPropagation()">
      <button class="btn btn-g btn-sm" ${idx<=0?'disabled':''} onclick="event.preventDefault();event.stopPropagation();moveLoaiByName('${esc(loai)}',-1,rGHKView)" title="Đưa loại này lên">↑</button>
      <button class="btn btn-g btn-sm" ${idx>=loaiNames.length-1?'disabled':''} onclick="event.preventDefault();event.stopPropagation();moveLoaiByName('${esc(loai)}',1,rGHKView)" title="Đưa loại này xuống">↓</button>
    </span>`;
    return`<details class="acc-group ${loaiColorClass(loai,idx)}" open>
      <summary>${moveBtns}🏷️ ${esc(loai)}<span class="acc-cnt">${its.length} SP · Tổng SL: ${fmt(tongSL)}</span></summary>
      <div class="scroll-tbl"><table class="m-tbl" style="table-layout:fixed"><thead><tr><th>Sản phẩm</th><th style="width:120px">Số lượng</th><th style="width:90px"></th></tr></thead><tbody>${rows}</tbody></table></div>
    </details>`;
  }).join('');
  paneEl.innerHTML=`<div class="card"><div class="ch"><h2>${esc(ghkActiveTab)}</h2><span style="font-size:11px;color:var(--text2)">Tổng SL: ${fmt(total)}</span></div></div>${body}`;
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
  nccPage=1;
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
let nccPage=1,nccLastData=[];
function gotoNCCPage(p){nccPage=p;rNCC(nccLastData);}
function rNCC(data){
  nccLastData=data;
  const el=document.getElementById('ncc-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🚚 Chưa có NCC</div>';return;}
  const totalPages=Math.max(1,Math.ceil(data.length/LIST_PAGE_SIZE));
  if(nccPage>totalPages)nccPage=totalPages;if(nccPage<1)nccPage=1;
  const pageData=data.slice((nccPage-1)*LIST_PAGE_SIZE,nccPage*LIST_PAGE_SIZE);
  const ths=NCC_COLS.map(c=>{
    const on=nccSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortNCCClick('${c.key}')">${c.label} <span class="sort-ic">${on?(nccSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="ncc-selall" onchange="toggleAllNCC(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    pageData.map(r=>{
      const gi=C.NCC.indexOf(r);// vị trí thật, tránh lệch dòng khi đang lọc/sắp xếp
      const chk=selNCC.has(gi)?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="ncc-chk" data-idx="${gi}" ${chk} onchange="toggleNCCChk(this)"></td><td data-label="Tên NCC"><b>${r[0]}</b></td><td data-label="SĐT">${r[1]||''}</td><td data-label="Mặt hàng">${r[2]||''}</td><td data-label="Địa chỉ">${r[3]||''}</td><td class="mobile-hide" data-label="Ghi chú">${r[4]||''}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editNCC(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('NhaCungCap',${gi+2},'NCC')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>'+pagerHTML(nccPage,data.length,p=>`gotoNCCPage(${p})`);
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
  nccPage=1;
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
  ghPage=1;
  const data=await apiGet('GianHang');C.GH=data;fGH();
}
let ghSortDir=1;
function sortGHClick(){ghSortDir*=-1;fGH();}
let ghPage=1,ghLastData=[];
function gotoGHPage(p){ghPage=p;rGH(ghLastData);}
function rGH(data){
  ghLastData=data;
  const el=document.getElementById('gh-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🏬 Chưa có gian hàng</div>';return;}
  const totalPages=Math.max(1,Math.ceil(data.length/LIST_PAGE_SIZE));
  if(ghPage>totalPages)ghPage=totalPages;if(ghPage<1)ghPage=1;
  const pageData=data.slice((ghPage-1)*LIST_PAGE_SIZE,ghPage*LIST_PAGE_SIZE);
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="gh-selall" onchange="toggleAllGH(this)"></th><th class="th-sort th-sort-on" onclick="sortGHClick()">Tên gian hàng <span class="sort-ic">${ghSortDir===1?'▲':'▼'}</span></th><th></th></tr></thead><tbody>`+
    pageData.map(r=>{
      const gi=C.GH.indexOf(r);
      const chk=selGH.has(gi)?'checked':'';
      return`<tr><td data-label=""><input type="checkbox" class="gh-chk" data-idx="${gi}" ${chk} onchange="toggleGHChk(this)"></td><td data-label="Tên gian hàng"><b>${r[0]}</b></td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editGH(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('GianHang',${gi+2},'gian hàng')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>'+pagerHTML(ghPage,data.length,p=>`gotoGHPage(${p})`);
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
  ghPage=1;
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

// ══ LOẠI HÀNG ══
let selLoai=new Set();
async function loadLoai(){
  document.getElementById('loai-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selLoai.clear();updateSelUI('loai-delsel-btn','loai-selcnt',0);
  loaiPage=1;
  const data=await apiGet('LoaiHang');C.LOAI=data;fLoai();
}
// Thứ tự Loại hàng hiển thị đúng theo thứ tự đã lưu trong C.LOAI (kéo/đưa lên xuống bằng nút ↑↓ bên dưới) —
// thứ tự này được TK/Đồ gian hàng dùng để quyết định khối nào hiện trước khi gộp accordion
let loaiPage=1,loaiLastData=[];
function gotoLoaiPage(p){loaiPage=p;rLoai(loaiLastData);}
function rLoai(data){
  loaiLastData=data;
  const el=document.getElementById('loai-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🏷️ Chưa có loại hàng</div>';return;}
  const filtering=!!document.getElementById('q-loai').value.trim();
  const totalPages=Math.max(1,Math.ceil(data.length/LIST_PAGE_SIZE));
  if(loaiPage>totalPages)loaiPage=totalPages;if(loaiPage<1)loaiPage=1;
  const pageData=data.slice((loaiPage-1)*LIST_PAGE_SIZE,loaiPage*LIST_PAGE_SIZE);
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="loai-selall" onchange="toggleAllLoai(this)"></th><th style="width:80px">Thứ tự</th><th>Tên loại hàng</th><th></th></tr></thead><tbody>`+
    pageData.map(r=>{
      const gi=C.LOAI.indexOf(r);
      const chk=selLoai.has(gi)?'checked':'';
      const upDis=filtering||gi<=0?'disabled':'';
      const downDis=filtering||gi>=C.LOAI.length-1?'disabled':'';
      return`<tr><td data-label=""><input type="checkbox" class="loai-chk" data-idx="${gi}" ${chk} onchange="toggleLoaiChk(this)"></td>
      <td data-label="Thứ tự"><button class="btn btn-g btn-sm" ${upDis} onclick="moveLoaiSettings(${gi},-1)" title="Đưa lên">↑</button> <button class="btn btn-g btn-sm" ${downDis} onclick="moveLoaiSettings(${gi},1)" title="Đưa xuống">↓</button></td>
      <td data-label="Tên loại hàng"><b>${r[0]}</b></td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editLoai(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('LoaiHang',${gi+2},'loại hàng')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>'+pagerHTML(loaiPage,data.length,p=>`gotoLoaiPage(${p})`)+(filtering?'<p style="font-size:11px;color:var(--text2);padding:10px 18px 0">Xóa ô tìm kiếm để sắp xếp lại thứ tự</p>':'');
  updateSelUI('loai-delsel-btn','loai-selcnt',selLoai.size);
  updateSelAllTri('loai-selall','loai-chk',selLoai);
}
// Đổi chỗ 1 loại hàng với loại liền kề (lên/xuống) — ghi thẳng xuống sheet để giữ đúng thứ tự sau khi tải lại
// Lõi đổi chỗ dùng chung — không tự vẽ lại màn hình nào cả, để chỗ nào gọi thì chỗ đó tự làm mới đúng view của mình
async function moveLoai(idx,dir){
  const j=idx+dir;
  if(j<0||j>=C.LOAI.length)return false;
  const a=C.LOAI[idx],b=C.LOAI[j];
  await apiPost({sheet:'LoaiHang',action:'update',row:idx+2,data:b});
  await apiPost({sheet:'LoaiHang',action:'update',row:j+2,data:a});
  [C.LOAI[idx],C.LOAI[j]]=[C.LOAI[j],C.LOAI[idx]];
  return true;
}
// Đổi thứ tự từ màn Cài đặt → Loại hàng (theo vị trí dòng)
async function moveLoaiSettings(idx,dir){if(await moveLoai(idx,dir))fLoai();}
// Đổi thứ tự ngay từ khối accordion ở Tồn kho / Đồ gian hàng (theo tên loại, vì các màn đó không có sẵn vị trí dòng)
async function moveLoaiByName(name,dir,refreshFn){
  const idx=C.LOAI.findIndex(r=>r[0]===name);
  if(idx<0)return;
  if(await moveLoai(idx,dir))refreshFn();
}
function toggleLoaiChk(el){
  const idx=Number(el.dataset.idx);
  if(el.checked)selLoai.add(idx);else selLoai.delete(idx);
  updateSelUI('loai-delsel-btn','loai-selcnt',selLoai.size);
  updateSelAllTri('loai-selall','loai-chk',selLoai);
}
function toggleAllLoai(el){
  document.querySelectorAll('.loai-chk').forEach(c=>{
    c.checked=el.checked;
    const idx=Number(c.dataset.idx);
    if(el.checked)selLoai.add(idx);else selLoai.delete(idx);
  });
  updateSelUI('loai-delsel-btn','loai-selcnt',selLoai.size);
}
async function delSelLoai(){
  if(!selLoai.size){toast('Chưa chọn loại hàng nào','err');return;}
  confirmDel(`Xóa ${selLoai.size} loại hàng đã chọn?`,async()=>{
    toast('Đang xóa '+selLoai.size+' loại hàng...');
    const idxs=[...selLoai].sort((a,b)=>b-a);
    for(const idx of idxs)await apiPost({sheet:'LoaiHang',action:'delete',row:idx+2});
    selLoai.clear();
    toast('Đã xóa '+idxs.length+' loại hàng!');setTimeout(loadLoai,800);
  });
}
let loaiLastQ='';
function fLoai(){
  const q=document.getElementById('q-loai').value.toLowerCase();
  if(q!==loaiLastQ){loaiPage=1;loaiLastQ=q;}// chỉ về trang 1 khi Ô TÌM KIẾM thực sự đổi — không phải mỗi lần bấm ↑↓ đưa lên/xuống (fLoai() cũng được gọi lại sau đó để vẽ lại đúng thứ tự)
  const d=C.LOAI.filter(r=>(r[0]||'').toLowerCase().includes(q));
  rLoai(d);
}
function initLoai(){document.getElementById('m-loai-t').textContent='Thêm loại hàng';document.getElementById('loai-ten').value='';document.getElementById('loai-row').value='';om('m-loai');}
function editLoai(row){const r=C.LOAI[row-2];document.getElementById('m-loai-t').textContent='Sửa loại hàng';document.getElementById('loai-ten').value=r[0]||'';document.getElementById('loai-row').value=row;om('m-loai');}
async function saveLoai(){
  const ten=document.getElementById('loai-ten').value.trim();if(!ten){toast('Nhập tên loại hàng','err');return;}
  const row=[ten];
  const er=document.getElementById('loai-row').value;
  await apiPost(er?{sheet:'LoaiHang',action:'update',row:Number(er),data:row}:{sheet:'LoaiHang',action:'append',row});
  toast(er?'Đã cập nhật loại hàng':'Đã thêm loại hàng');cm('m-loai');setTimeout(loadLoai,800);
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
  userPage=1;
  rUser(d);
}
let selUser=new Set();
async function loadUser(){
  document.getElementById('user-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  selUser.clear();updateSelUI('user-delsel-btn','user-selcnt',0);
  const data=await apiGet('User');C.USER=data;renderUserSorted();
}
let userPage=1,userLastData=[];
function gotoUserPage(p){userPage=p;rUser(userLastData);}
function rUser(data){
  userLastData=data;
  const el=document.getElementById('user-tbl');
  if(!data.length){el.innerHTML='<div class="empty">👤 Chưa có người dùng nào</div>';return;}
  const totalPages=Math.max(1,Math.ceil(data.length/LIST_PAGE_SIZE));
  if(userPage>totalPages)userPage=totalPages;if(userPage<1)userPage=1;
  const pageData=data.slice((userPage-1)*LIST_PAGE_SIZE,userPage*LIST_PAGE_SIZE);
  const ths=USER_COLS.map(c=>{
    const on=userSortCol===c.key;
    return`<th class="th-sort${on?' th-sort-on':''}" onclick="sortUserClick('${c.key}')">${c.label} <span class="sort-ic">${on?(userSortDir===1?'▲':'▼'):'⇅'}</span></th>`;
  }).join('');
  el.innerHTML=`<table class="m-tbl"><thead><tr><th style="width:30px"><input type="checkbox" id="user-selall" onchange="toggleAllUser(this)"></th>${ths}<th></th></tr></thead><tbody>`+
    pageData.map(r=>{
      const gi=C.USER.indexOf(r);
      const chk=selUser.has(gi)?'checked':'';
      const passCell=r[5]
        ?`<span id="pwm-${gi}">••••••••</span><span id="pwr-${gi}" style="display:none">${esc(r[5])}</span> <button class="btn btn-g btn-sm" onclick="toggleUserPass(${gi})" title="Xem/ẩn mật khẩu">👁️</button>`
        :'<span style="color:var(--text2);font-size:11px">—</span>';
      return`<tr><td data-label=""><input type="checkbox" class="user-chk" data-idx="${gi}" ${chk} onchange="toggleUserChk(this)"></td><td data-label="Họ tên"><b>${r[0]}</b></td><td data-label="SĐT">${r[1]||''}</td><td data-label="Vai trò">${r[2]?`<span class="bg bg-p">${r[2]}</span>`:''}</td><td data-label="Email đăng nhập">${r[4]?`<span class="bg bg-b">${r[4]}</span>`:'<span style="color:var(--text2);font-size:11px">Chưa có</span>'}</td><td data-label="Mật khẩu">${passCell}</td><td class="mobile-hide" data-label="Ghi chú">${r[3]||''}</td>
      <td data-label="" style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editUser(${gi+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('User',${gi+2},'người dùng')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>'+pagerHTML(userPage,data.length,p=>`gotoUserPage(${p})`);
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
async function delNH(row){
  const r=C.NH[row-2];if(!r)return;
  const tenSP=r[0],sl=Number(r[1]||0);
  confirmDel(`Xóa phiếu nhập "${tenSP}" (${sl} ${''})? Tồn kho sẽ bị trừ lại ${sl}.`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'NhapHang',action:'delete',row:Number(row)});
    // Trừ lại tồn kho — tra theo Mã SP trước, dự phòng theo tên cho phiếu cũ
    const spIdx=nhTKIndex(r);
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
      else if(sheet==='LoaiHang')loadLoai();
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

// ══ KIỂM KÊ ══ đối chiếu sổ sách với số đếm thực tế, phát hiện hao hụt/thất thoát — áp dụng được cho
// CẢ Kho tổng (Tồn kho) LẪN từng Gian hàng riêng (chọn ở ô "Đối tượng kiểm kê").
// Lưu lịch sử đối chiếu (KiemKe) VÀ điều chỉnh thẳng số liệu theo số thực tế đếm được lúc lưu:
//  - Kho tổng: ghi đè thẳng SL trong Tồn kho (giống trước).
//  - Gian hàng: ghi vào GianHangKho phần CHÊNH LỆCH (offset) so với số tính từ lịch sử Xếp hàng — dùng
//    đúng cơ chế offset sẵn có của Đồ gian hàng (xem ghkBase/ghkOffset/saveGHK ở trên) để không phá vỡ
//    cách tính "cộng dồn từ Xếp hàng" khi có phiếu xếp mới sau này.
// Lưu ý: khác Nhập/Xếp hàng (chỉnh theo CHÊNH LỆCH số lượng), Kiểm kê ghi đè theo số đếm thực tế tại thời
// điểm đó — nên xóa lại 1 phiếu kiểm kê CŨ sẽ không tự hoàn tác lại (dễ sai nếu đã có giao dịch sau đó).
let kkEntries={};// {key: {tt,gc,label,maSP,soSach}} — key ổn định theo SP/đối tượng, giữ state khi lọc/tìm trong modal
let kkCurrentList=[];// danh sách [{key,label,maSP,soSach}] đang render — tra theo VỊ TRÍ (pos) trong onclick,
// không nhúng thẳng tên SP vào chuỗi onclick (tên có thể chứa dấu nháy đơn, xem bug đã sửa ở delSP/delNH/delXH)
async function openKKNew(){
  kkEntries={};
  document.getElementById('kk-ngay').value=td();
  document.getElementById('kk-moc').value='';
  const userSel=document.getElementById('kk-user');
  userSel.innerHTML='<option value="">-- Chọn --</option>'+C.USER.map(u=>`<option>${esc(u[0])}</option>`).join('');
  if(!C.GH.length)await loadGH();
  if(!C.TK.length)await loadTK();
  C.XH=await apiGet('XepHang');// tươi, để tính đúng số hiện có ở từng gian hàng (ghkBase/ghkQty)
  C.GHK=await apiGet('GianHangKho');
  const targetSel=document.getElementById('kk-target');
  targetSel.innerHTML='<option value="">📦 Kho tổng (Tồn kho)</option>'+C.GH.map(g=>`<option value="${esc(g[0])}">🏬 ${esc(g[0])}</option>`).join('');
  document.getElementById('kk-q').value='';
  kkTargetChanged();
  om('m-kk');
}
// Đổi Đối tượng kiểm kê (Kho tổng ↔ 1 Gian hàng) → danh sách SP khác hẳn nhau, không giữ dở dữ liệu đang gõ
function kkTargetChanged(){
  kkEntries={};
  renderKKRows();
}
function kkDiffText(d){
  if(d===0)return'<span style="color:var(--text2)">0</span>';
  return`<span style="color:${d>0?'#0ca30c':'#d03b3b'}">${d>0?'+':''}${d}</span>`;
}
// Xây danh sách SP cần kiểm kê theo đối tượng đang chọn: '' = Kho tổng (mọi SP Tồn kho),
// còn lại = 1 Gian hàng (mọi SP từng có phiếu Xếp hàng vào đó, hợp với SP có sửa tay riêng — giống namesOf() ở rGHKView)
function kkBuildList(target){
  if(!target)return C.TK.map((r,idx)=>({key:'tk'+idx,label:r[0],maSP:r[9]||'',soSach:Number(r[1]||0)}));
  const names=new Set(C.XH.filter(r=>r[2]===target).map(r=>r[0]));
  C.GHK.filter(r=>r[1]===target).forEach(r=>names.add(r[0]));
  return[...names].sort((a,b)=>a.localeCompare(b)).map(name=>{
    const tk=C.TK.find(t=>t[0]===name);
    return{key:'gh:'+target+':'+name,label:name,maSP:tk?tk[9]||'':'',soSach:ghkQty(name,target)};
  });
}
function kkCalcRow(pos){
  const it=kkCurrentList[pos];if(!it)return;
  const v=document.getElementById('kk-tt-'+pos).value;
  kkEntries[it.key]=kkEntries[it.key]||{};
  Object.assign(kkEntries[it.key],{tt:v,label:it.label,maSP:it.maSP,soSach:it.soSach});
  document.getElementById('kk-cl-'+pos).innerHTML=v!==''?kkDiffText(Number(v)-it.soSach):'';
}
function kkSetNote(pos,val){
  const it=kkCurrentList[pos];if(!it)return;
  kkEntries[it.key]=kkEntries[it.key]||{};
  Object.assign(kkEntries[it.key],{gc:val,label:it.label,maSP:it.maSP,soSach:it.soSach});
}
function renderKKRows(){
  const target=document.getElementById('kk-target').value;
  const q=(document.getElementById('kk-q').value||'').trim().toLowerCase();
  const full=kkBuildList(target);
  const list=full.filter(it=>!q||it.label.toLowerCase().includes(q)||it.maSP.toLowerCase().includes(q));
  kkCurrentList=list;
  const el=document.getElementById('kk-rows');
  if(!list.length){el.innerHTML=`<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:20px">Không có sản phẩm nào${target?' ở gian hàng này':' khớp'}</td></tr>`;return;}
  el.innerHTML=list.map((it,pos)=>{
    const ent=kkEntries[it.key]||{};
    const ttVal=ent.tt!==undefined?ent.tt:'';
    return`<tr>
      <td><b>${esc(it.label)}</b>${it.maSP?` <span class="bg bg-b" style="font-size:10px">${esc(it.maSP)}</span>`:''}</td>
      <td style="text-align:center"><b>${it.soSach}</b></td>
      <td><input type="number" id="kk-tt-${pos}" value="${esc(ttVal)}" oninput="kkCalcRow(${pos})" style="width:90px"></td>
      <td id="kk-cl-${pos}" style="text-align:center;font-weight:600">${ttVal!==''?kkDiffText(Number(ttVal)-it.soSach):''}</td>
      <td><input id="kk-gc-${pos}" value="${esc(ent.gc||'')}" oninput="kkSetNote(${pos},this.value)" placeholder="Lý do lệch (nếu có)" style="width:140px"></td>
    </tr>`;
  }).join('');
}
async function saveKKNew(){
  const ngay=document.getElementById('kk-ngay').value;
  const nguoi=document.getElementById('kk-user').value;
  const target=document.getElementById('kk-target').value;// '' = Kho tổng, khác thì là tên Gian hàng
  const moc=document.getElementById('kk-moc').value;// ''/'dau'/'cuoi' — mốc kỳ cho Bestseller, tùy chọn
  if(!ngay){toast('Chọn ngày kiểm kê','err');return;}
  if(!nguoi){toast('Chọn người kiểm kê','err');return;}
  const entries=Object.entries(kkEntries).filter(([,e])=>e.tt!==undefined&&e.tt!=='');
  if(!entries.length){toast('Chưa nhập Tồn thực tế cho sản phẩm nào','err');return;}
  toast('Đang lưu kiểm kê...');
  let soLech=0;
  for(const[,e] of entries){
    const soSach=Number(e.soSach||0);
    const thucTe=Number(e.tt||0);
    const chenh=thucTe-soSach;
    const row=[ngay,e.maSP||'',e.label,soSach,thucTe,chenh,e.gc||'',nguoi,target,moc];
    await apiPost({sheet:'KiemKe',action:'append',row});
    C.KK.push(row);
    if(chenh===0)continue;
    soLech++;
    if(!target){
      // Kho tổng: ghi đè thẳng SL trong Tồn kho — tra theo Mã SP trước (ổn định), dự phòng theo tên
      const idx=e.maSP?C.TK.findIndex(t=>t[9]===e.maSP):-1;
      const spIdx=idx>=0?idx:C.TK.findIndex(t=>t[0]===e.label);
      if(spIdx>=0){
        const upd=[...C.TK[spIdx]];upd[1]=thucTe;
        await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
        C.TK[spIdx][1]=thucTe;
      }
    } else {
      // Gian hàng: lưu phần CHÊNH LỆCH (offset) so với số tính từ lịch sử Xếp hàng — giống hệt saveGHK()
      const offset=thucTe-ghkBase(e.label,target);
      const gi=C.GHK.findIndex(r=>r[0]===e.label&&r[1]===target);
      const grow=[e.label,target,offset];
      await apiPost(gi>=0?{sheet:'GianHangKho',action:'update',row:gi+2,data:grow}:{sheet:'GianHangKho',action:'append',row:grow});
      if(gi>=0)C.GHK[gi]=grow;else C.GHK.push(grow);
    }
  }
  const doiTuongTxt=target?`Gian hàng "${target}"`:'Kho tổng';
  const mocTxt=moc==='dau'?' [Đánh dấu: Đầu kỳ]':moc==='cuoi'?' [Đánh dấu: Cuối kỳ]':'';
  logAction('Tạo mới','Kiểm kê',`Kiểm kê ${doiTuongTxt} ngày ${ngay} bởi ${nguoi}: ${entries.length} SP đã đếm, ${soLech} SP lệch.${mocTxt}`);
  toast(`Đã lưu kiểm kê: ${entries.length} SP đã đếm, ${soLech} SP lệch!`);
  cm('m-kk');kkEntries={};
  setTimeout(()=>{loadKK();if(!target)loadTK();else rGHKView();},800);
}
async function loadKK(){
  document.getElementById('kk-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  if(!C.USER.length)await loadUser();// cần sẵn danh sách người dùng để đổ vào dropdown "Người kiểm kê" ở modal
  const data=await apiGet('KiemKe');C.KK=data;
  fKK();
}
// Gộp theo NGÀY + ĐỐI TƯỢNG (Kho tổng hay Gian hàng nào) — 1 ngày có thể có nhiều phiếu kiểm kê khác đối tượng
function groupKKByDate(data){
  const map=new Map();
  data.forEach(r=>{
    const ngay=r[0]||'(chưa có ngày)';
    const gh=r[8]||'';
    const key=ngay+'|'+gh;
    if(!map.has(key))map.set(key,{ngay,gianHang:gh,items:[]});
    map.get(key).items.push(r);
  });
  return[...map.values()].map(g=>({
    ...g,
    soSP:g.items.length,
    soLech:g.items.filter(r=>Number(r[5]||0)!==0).length,
    tongChenh:g.items.reduce((s,r)=>s+Number(r[5]||0),0),
    nguoiKK:[...new Set(g.items.map(r=>r[7]).filter(Boolean))]
  }));
}
function fKK(){
  const q=(document.getElementById('q-kk').value||'').toLowerCase();
  const from=document.getElementById('from-kk').value;
  const to=document.getElementById('to-kk').value;
  let d=[...C.KK];
  if(from)d=d.filter(r=>r[0]>=from);
  if(to)d=d.filter(r=>r[0]<=to);
  if(q)d=d.filter(r=>(r[7]||'').toLowerCase().includes(q)||(r[8]||'').toLowerCase().includes(q));
  const groups=groupKKByDate(d).sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||''));
  rKK(groups);
}
function rKK(groups){
  const flat=groups.flatMap(g=>g.items);
  document.getElementById('kk-sum').innerHTML=flat.length?`<div class="grid3 stat-grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số đợt kiểm kê</div><div class="val">${groups.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng SP đã đếm</div><div class="val">${flat.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng SP lệch</div><div class="val">${flat.filter(r=>Number(r[5]||0)!==0).length}</div></div></div>`:'';
  const el=document.getElementById('kk-tbl');
  if(!groups.length){el.innerHTML='<div class="empty">📋 Chưa có đợt kiểm kê nào</div>';return;}
  el.innerHTML=`<table class="m-tbl"><thead><tr><th>Ngày kiểm kê</th><th>Đối tượng</th><th>Mốc kỳ</th><th>Người kiểm kê</th><th>Số SP đã đếm</th><th>Số SP lệch</th><th>Tổng chênh lệch</th></tr></thead><tbody>`+
    groups.map(g=>{
      const cl=g.tongChenh===0?'':(g.tongChenh>0?'color:#0ca30c':'color:#d03b3b');
      const doiTuong=g.gianHang?`🏬 ${esc(g.gianHang)}`:'📦 Kho tổng';
      const moc=g.items[0]&&g.items[0][9];
      const mocBadge=moc==='dau'?'<span class="bg bg-b">📍 Đầu kỳ</span>':moc==='cuoi'?'<span class="bg bg-p">🏁 Cuối kỳ</span>':'';
      return`<tr style="cursor:pointer" onclick="openKKDay('${esc(g.ngay)}','${esc(g.gianHang)}')"><td><b>${esc(g.ngay)}</b></td><td>${doiTuong}</td><td>${mocBadge}</td><td>${esc(g.nguoiKK.join(', '))}</td><td>${g.soSP}</td><td>${g.soLech}</td><td style="${cl};font-weight:600">${g.tongChenh>0?'+':''}${g.tongChenh}</td></tr>`;
    }).join('')+'</tbody></table>';
}
let kkDayCurrent=null;// {ngay,gianHang}
function openKKDay(ngay,gianHang){
  kkDayCurrent={ngay,gianHang:gianHang||''};
  document.getElementById('kk-day-t').textContent=`Phiếu kiểm kê ${gianHang?`"${gianHang}"`:'Kho tổng'} ngày ${ngay}`;
  renderKKDayDetail();
  om('m-kk-day');
}
function renderKKDayDetail(){
  if(!kkDayCurrent)return;
  const items=C.KK.filter(r=>(r[0]||'(chưa có ngày)')===kkDayCurrent.ngay&&(r[8]||'')===kkDayCurrent.gianHang);
  const soLech=items.filter(r=>Number(r[5]||0)!==0).length;
  document.getElementById('kk-day-sum').innerHTML=`<p style="font-size:12px;color:var(--text2);margin-bottom:12px">${items.length} SP đã đếm · ${soLech} SP lệch</p>`;
  document.getElementById('kk-day-tbl').innerHTML=`<div class="scroll-tbl"><table class="m-tbl"><thead><tr><th>Sản phẩm</th><th>Mã SP</th><th>Sổ sách</th><th>Thực tế</th><th>Chênh lệch</th><th>Ghi chú</th><th>Người kiểm kê</th></tr></thead><tbody>`+
    items.map(r=>{
      const chenh=Number(r[5]||0);
      const cl=chenh===0?'':(chenh>0?'color:#0ca30c':'color:#d03b3b');
      return`<tr><td><b>${esc(r[2])}</b></td><td>${r[1]?`<span class="bg bg-b">${esc(r[1])}</span>`:''}</td><td>${r[3]}</td><td>${r[4]}</td><td style="${cl};font-weight:600">${chenh>0?'+':''}${chenh}</td><td>${esc(r[6]||'')}</td><td>${esc(r[7]||'')}</td></tr>`;
    }).join('')+'</tbody></table></div>';
}
async function delKKDay(){
  if(!kkDayCurrent)return;
  const idxs=C.KK.map((r,i)=>i).filter(i=>(C.KK[i][0]||'(chưa có ngày)')===kkDayCurrent.ngay&&(C.KK[i][8]||'')===kkDayCurrent.gianHang).sort((a,b)=>b-a);
  if(!idxs.length){toast('Không có gì để xóa','err');return;}
  confirmDel(`Xóa toàn bộ lịch sử kiểm kê ${kkDayCurrent.gianHang?`"${kkDayCurrent.gianHang}"`:'Kho tổng'} ngày ${kkDayCurrent.ngay} (${idxs.length} dòng)? LƯU Ý: thao tác này KHÔNG hoàn tác lại số liệu (Tồn kho/Đồ gian hàng) — vì có thể đã bị thay đổi bởi Nhập/Xếp hàng khác sau thời điểm kiểm kê, tự hoàn tác dễ gây sai số hơn. Chỉ nên xóa nếu ghi nhầm phiếu.`,async()=>{
    toast('Đang xóa...');
    for(const idx of idxs)await apiPost({sheet:'KiemKe',action:'delete',row:idx+2});
    logAction('Xóa','Kiểm kê',`Xóa lịch sử kiểm kê ${kkDayCurrent.gianHang?`"${kkDayCurrent.gianHang}"`:'Kho tổng'} ngày ${kkDayCurrent.ngay} (${idxs.length} dòng)`);
    toast('Đã xóa!');
    cm('m-kk-day');
    setTimeout(loadKK,800);
  });
}

// ══ BESTSELLER ══ xác định SP bán chạy dựa trên SỐ LƯỢNG ĐÃ BÁN THỰC TẾ (suy ra từ tồn kiểm kê), TUYỆT ĐỐI
// không xếp hạng trực tiếp theo số lượng thêm/xếp hàng (xếp nhiều ≠ bán chạy — có thể chỉ đang tồn kho nhiều).
// Công thức: Đã bán = Tồn đầu kỳ (Đồ gian hàng, gộp mọi gian hàng) + Xếp hàng ra gian hàng trong kỳ − Tồn cuối kỳ.
// KHÔNG cố định kỳ theo tuần/tháng — App không có server/cron nên không thể tự "chốt" đúng nửa đêm Thứ 6/cuối
// tháng. Thay vào đó, khi chạy Kiểm kê Gian hàng, người dùng tự đánh dấu lần đó là "Đầu kỳ"/"Cuối kỳ" (xem
// kk-moc ở modal Kiểm kê); màn này chỉ liệt kê các mốc đã đánh dấu cho người dùng chọn 1 cặp bất kỳ để tính.
// LƯU Ý: luôn dựng/đọc Date qua Date.UTC + getUTC*/setUTC* — dựng bằng "new Date(dateStr+'T00:00:00')" (giờ
// LOCAL) rồi gọi toISOString() (quy đổi UTC) sẽ bị lệch NGÀY ở múi giờ UTC+ (như VN, UTC+7): nửa đêm local
// bị lùi về chiều/tối hôm trước theo UTC. Toàn bộ hàm tính ngày của Bestseller phải né lỗi này.
function bAddDays(dateStr,n){
  const[y,m,d]=dateStr.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  dt.setUTCDate(dt.getUTCDate()+n);
  return dt.toISOString().slice(0,10);
}
function bDaysBetween(a,b){
  const[y1,m1,d1]=a.split('-').map(Number),[y2,m2,d2]=b.split('-').map(Number);
  return Math.round((Date.UTC(y2,m2-1,d2)-Date.UTC(y1,m1-1,d1))/86400000);
}
// Tồn của 1 sản phẩm TẠI 1 NGÀY, gộp mọi gian hàng — CHỈ tính được nếu có ít nhất 1 dòng Kiểm kê Gian hàng
// đúng ngày đó cho sản phẩm này (tra theo Mã SP trước, theo tên nếu SP chưa có mã); không có → trả về null,
// KHÔNG suy diễn/ước tính thay thế (đúng yêu cầu: thiếu dữ liệu phải báo rõ, không đoán bừa)
function kkStockOnDate(maSP,tenSP,date){
  const rows=C.KK.filter(r=>r[0]===date&&r[8]&&(maSP?r[1]===maSP:r[2]===tenSP));
  if(!rows.length)return null;
  return rows.reduce((s,r)=>s+Number(r[4]||0),0);
}
// Tổng SL đã Xếp hàng ra CÁC gian hàng của 1 sản phẩm, tính từ SAU ngày đầu kỳ đến HẾT ngày cuối kỳ
function xhAddedInRange(maSP,tenSP,fromExclusive,toInclusive){
  const start=bAddDays(fromExclusive,1);
  return C.XH.filter(r=>{
    if(!((r[3]||'')>=start&&(r[3]||'')<=toInclusive))return false;
    return maSP?r[5]===maSP:r[0]===tenSP;
  }).reduce((s,r)=>s+Number(r[1]||0),0);
}
// Tính bảng xếp hạng Bestseller cho khoảng [from,to] — bỏ qua (không đoán) những SP thiếu tồn kiểm kê ở 1
// trong 2 đầu mốc; trả về danh sách đã sắp xếp giảm dần theo SL đã bán thực tế + số SP bị loại vì thiếu dữ liệu
function computeBestsellerPeriod(from,to){
  const items=[];let missing=0;
  C.TK.forEach(sp=>{
    const ten=sp[0],ma=sp[9]||'';
    const dauKy=kkStockOnDate(ma,ten,from);
    const cuoiKy=kkStockOnDate(ma,ten,to);
    if(dauKy===null||cuoiKy===null){missing++;return;}
    const them=xhAddedInRange(ma,ten,from,to);
    items.push({ten,ma,dauKy,them,cuoiKy,daBan:dauKy+them-cuoiKy});
  });
  items.sort((a,b)=>b.daBan-a.daBan);
  return{items,missing,tongSP:C.TK.length};
}
async function loadBestseller(){
  if(!C.TK.length)await loadTK();
  C.KK=await apiGet('KiemKe');
  C.XH=await apiGet('XepHang');
  fillBestMocOptions();
  renderBestPeriod();
}
// Đổ 2 dropdown từ các NGÀY đã có ít nhất 1 dòng Kiểm kê Gian hàng đánh dấu Đầu kỳ / Cuối kỳ tương ứng —
// giữ lại lựa chọn hiện tại nếu vẫn còn hợp lệ sau khi tải lại
function fillBestMocOptions(){
  const dauSel=document.getElementById('best-dau'),cuoiSel=document.getElementById('best-cuoi');
  const curDau=dauSel.value,curCuoi=cuoiSel.value;
  const dauDates=[...new Set(C.KK.filter(r=>r[8]&&r[9]==='dau').map(r=>r[0]))].sort((a,b)=>b.localeCompare(a));
  const cuoiDates=[...new Set(C.KK.filter(r=>r[8]&&r[9]==='cuoi').map(r=>r[0]))].sort((a,b)=>b.localeCompare(a));
  dauSel.innerHTML='<option value="">-- Chọn --</option>'+dauDates.map(d=>`<option${d===curDau?' selected':''}>${d}</option>`).join('');
  cuoiSel.innerHTML='<option value="">-- Chọn --</option>'+cuoiDates.map(d=>`<option${d===curCuoi?' selected':''}>${d}</option>`).join('');
}
function rBestList(computed,warnMsg){
  const el=document.getElementById('best-tbl');
  if(!computed){el.innerHTML=`<div class="card"><div class="empty">⚠️ ${esc(warnMsg)}</div></div>`;return;}
  const{items,missing,tongSP}=computed;
  let html='';
  if(missing>0)html+=`<div class="alert" style="display:flex">⚠️ ${missing}/${tongSP} sản phẩm bị loại khỏi xếp hạng do thiếu dữ liệu kiểm kê đầu/cuối kỳ cho riêng SP đó (gian hàng chứa SP đó chưa được kiểm kê đúng ngày mốc).</div>`;
  if(!items.length){html+='<div class="card"><div class="empty">📭 Chưa đủ dữ liệu để xếp hạng Bestseller kỳ này</div></div>';el.innerHTML=html;return;}
  html+=`<div class="card"><div class="ch"><h2>🏆 Xếp hạng theo SL đã bán</h2></div>
    <div class="scroll-tbl"><table class="m-tbl"><thead><tr><th style="width:40px">#</th><th>Sản phẩm</th><th>Tồn đầu kỳ</th><th>Đã xếp</th><th>Tồn cuối kỳ</th><th>Đã bán</th></tr></thead><tbody>`+
    items.map((it,i)=>{
      const cl=it.daBan<0?'color:#d03b3b':'';
      return`<tr><td>${i+1}</td><td><b>${esc(it.ten)}</b></td><td>${fmt(it.dauKy)}</td><td>${fmt(it.them)}</td><td>${fmt(it.cuoiKy)}</td><td style="font-weight:700;${cl}">${fmt(it.daBan)}</td></tr>`;
    }).join('')+'</tbody></table></div></div>';
  el.innerHTML=html;
}
function renderBestPeriod(){
  const dau=document.getElementById('best-dau').value,cuoi=document.getElementById('best-cuoi').value;
  const infoEl=document.getElementById('best-info');
  if(!dau||!cuoi){
    infoEl.textContent='Chọn cả 2 mốc Đầu kỳ và Cuối kỳ để xem xếp hạng (đánh dấu mốc ngay khi chạy Kiểm kê Gian hàng).';
    rBestList(null,'Chưa chọn đủ 2 mốc Đầu kỳ / Cuối kỳ.');
    return;
  }
  if(dau>=cuoi){
    infoEl.textContent='';
    rBestList(null,`Mốc Đầu kỳ (${dau}) phải TRƯỚC mốc Cuối kỳ (${cuoi}) — chọn lại.`);
    return;
  }
  infoEl.textContent=`Kỳ từ ${dau} đến ${cuoi} (${bDaysBetween(dau,cuoi)} ngày).`;
  rBestList(computeBestsellerPeriod(dau,cuoi));
}

// ══ BÁO CÁO THEO THÁNG ══ thống kê trong 1 khoảng thời gian, mỗi "Người nhập" đã nhập tổng bao nhiêu tiền
// (dùng để đối chiếu/thanh toán lại cho người đã tạm ứng tiền mua hàng)
function bcMonthRange(ym){
  const[y,m]=ym.split('-').map(Number);
  const from=`${ym}-01`;
  const lastDay=new Date(y,m,0).getDate();// ngày cuối cùng của tháng
  const to=`${ym}-${String(lastDay).padStart(2,'0')}`;
  return{from,to};
}
function bcSetMonth(){
  const ym=document.getElementById('bc-thang').value;
  if(!ym)return;
  const{from,to}=bcMonthRange(ym);
  document.getElementById('bc-tu').value=from;
  document.getElementById('bc-den').value=to;
  loadBC();
}
function bcShiftMonth(delta){
  let ym=document.getElementById('bc-thang').value;
  if(!ym){const d=new Date();ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
  let[y,m]=ym.split('-').map(Number);
  m+=delta;
  if(m<1){m=12;y--;}else if(m>12){m=1;y++;}
  document.getElementById('bc-thang').value=`${y}-${String(m).padStart(2,'0')}`;
  bcSetMonth();
}
async function openBC(){
  const d=new Date();
  const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('bc-thang').value=ym;
  const{from,to}=bcMonthRange(ym);
  document.getElementById('bc-tu').value=from;
  document.getElementById('bc-den').value=to;
  if(!C.USER.length)await loadUser();
  document.getElementById('bc-user').innerHTML='<option value="">Tất cả người nhập</option>'+C.USER.map(u=>`<option>${esc(u[0])}</option>`).join('');
  await loadBC();
}
async function loadBC(){
  document.getElementById('bc-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('NhapHang');C.NH=data;
  const from=document.getElementById('bc-tu').value;
  const to=document.getElementById('bc-den').value;
  const user=document.getElementById('bc-user')?.value||'';
  const filtered=data.filter(r=>(!from||(r[4]||'')>=from)&&(!to||(r[4]||'')<=to)&&(!user||r[6]===user));
  const groups=new Map();
  filtered.forEach(r=>{
    const user=r[6]||'(Không rõ người nhập)';
    if(!groups.has(user))groups.set(user,[]);
    groups.get(user).push(r);
  });
  const rows=[...groups.entries()].map(([user,items])=>({
    user,
    soSP:new Set(items.map(r=>r[0])).size,
    tongSL:items.reduce((s,r)=>s+Number(r[1]||0),0),
    tongTien:items.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0)
  })).sort((a,b)=>b.tongTien-a.tongTien);
  const grandTotal=rows.reduce((s,r)=>s+r.tongTien,0);
  document.getElementById('bc-sum').innerHTML=`<div class="grid3 stat-grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số sản phẩm nhập</div><div class="val">${new Set(filtered.map(r=>r[0])).size}</div></div>
    <div class="kpi p"><div class="lb">Số người nhập</div><div class="val">${rows.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng tiền đã thanh toán</div><div class="val">${fmt(grandTotal)}đ</div></div></div>`;
  const el=document.getElementById('bc-tbl');
  if(!rows.length){el.innerHTML='<div class="empty">📊 Không có dữ liệu nhập hàng trong khoảng thời gian này</div>';return;}
  el.innerHTML=`<table class="m-tbl"><thead><tr><th>Người nhập</th><th>Số sản phẩm nhập</th><th>Tổng SL</th><th>Tổng tiền đã thanh toán</th></tr></thead><tbody>`+
    rows.map(r=>`<tr><td data-label="Người nhập"><span class="bg bg-p">${esc(r.user)}</span></td><td data-label="Số sản phẩm nhập">${r.soSP}</td><td data-label="Tổng SL">${fmt(r.tongSL)}</td><td data-label="Tổng tiền đã thanh toán"><b>${fmt(r.tongTien)}đ</b></td></tr>`).join('')+
    '</tbody></table>';
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
