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

// ── MÔI TRƯỜNG DỮ LIỆU ──────────────────────────────────────────────────────────
// 'prod' (mặc định) đọc/ghi thẳng các node như TonKho, NhapHang... ; 'test' đọc/ghi ở
// nhánh "TEST/..." TÁCH HẲN — tạo/xoá/nghịch data thoải mái không đụng dữ liệu thật.
// Đổi bằng URL (nhớ luôn ở localStorage): thêm ?env=test  hoặc  ?env=prod  vào địa chỉ.
let TAPHOA_ENV='prod';
try{
  const _e=new URLSearchParams(location.search).get('env');
  if(_e==='test'||_e==='prod')localStorage.setItem('taphoaEnv',_e);
  TAPHOA_ENV=localStorage.getItem('taphoaEnv')==='test'?'test':'prod';
}catch(e){}
function dbPath(name){return (TAPHOA_ENV==='test'?'TEST/':'')+name;}

// Ở chế độ test KHÔNG dùng Firebase Auth (Auth không tách được theo môi trường). Đăng nhập test =
// so email+mật khẩu với sheet TEST/User; phiên nhớ ở sessionStorage (đóng trình duyệt là hết).
let TEST_SESSION=null;
function testSessionLoad(){
  try{const s=sessionStorage.getItem('taphoaTestAuth');TEST_SESSION=s?JSON.parse(s):null;}catch(e){TEST_SESSION=null;}
  return TEST_SESSION;
}
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
  const fail=()=>{document.getElementById('login-err').style.display='block';btn.disabled=false;btn.textContent='Đăng nhập';};

  if(TAPHOA_ENV==='test'){
    // Đăng nhập TEST: khớp email + mật khẩu với sheet TEST/User (cột 4 = email, cột 5 = mật khẩu)
    await initFirebase();
    let users=await apiGet('User');
    if(!users.length){
      // Chưa có ai trong môi trường test → tạo sẵn tài khoản admin/admin để vào tạo tiếp
      await apiPost({sheet:'User',action:'append',row:['Quản trị test','','Admin','','admin','admin']});
      users=await apiGet('User');
    }
    const u=users.find(r=>(r[4]||'').trim().toLowerCase()===email.toLowerCase()&&String(r[5]||'')===pass);
    if(!u){fail();return;}
    try{sessionStorage.setItem('taphoaTestAuth',JSON.stringify({email:u[4],name:u[0]}));}catch(e){}
    location.reload();
    return;
  }

  try{
    await auth.signInWithEmailAndPassword(email,pass);
  }catch(e){ fail(); }
}

// ── ĐĂNG XUẤT ──
async function doLogout(){
  if(confirm('Bạn muốn đăng xuất?')){
    if(TAPHOA_ENV==='test'){
      try{sessionStorage.removeItem('taphoaTestAuth');}catch(e){}
      location.reload();
      return;
    }
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

let C={TK:[],NH:[],NCC:[],USER:[],GH:[],XH:[],LOG:[],GHK:[],LOAI:[],KK:[],HD:[]};
let SETTINGS={sapHet:10,hsdSap:30,hsdGan:7};// ngưỡng mặc định dùng chung, SP nào không đặt riêng thì dùng cái này

// ── OVERLAY "ĐANG XỬ LÝ" — hiện spinner phủ toàn màn khi đang đọc/ghi Firebase (lưu / xóa / tải / tìm) ──
// Tự bật/tắt qua apiGet/apiPost bên dưới nên MỌI thao tác đều có phản hồi, không cần đụng từng hàm.
// Chỉ hiện nếu thao tác kéo dài > ~220ms (tránh nhấp nháy với thao tác nhanh); tắt sau khi lô cuối xong.
let _busyN=0,_busyShowT=null,_busyHideT=null,_busyVisible=false;
function renderBusy(show){
  let el=document.getElementById('busy-ov');
  if(show){
    if(!el){
      el=document.createElement('div');el.id='busy-ov';
      el.innerHTML='<div class="busy-box"><div class="spin"></div><span>Đang xử lý…</span></div>';
      document.body.appendChild(el);
    }
    el.style.display='flex';
  }else if(el){el.style.display='none';}
}
function busyShow(){
  _busyN++;
  if(_busyHideT){clearTimeout(_busyHideT);_busyHideT=null;}
  if(!_busyVisible&&!_busyShowT)_busyShowT=setTimeout(()=>{renderBusy(true);_busyVisible=true;_busyShowT=null;},220);
}
function busyDone(){
  _busyN=Math.max(0,_busyN-1);
  if(_busyN>0)return;
  if(_busyShowT){clearTimeout(_busyShowT);_busyShowT=null;}
  if(_busyVisible)_busyHideT=setTimeout(()=>{renderBusy(false);_busyVisible=false;_busyHideT=null;},120);
}

// ── FIREBASE API ──
async function apiGet(sheet){
  await initFirebase();
  busyShow();
  try{
    const snap=await db.ref(dbPath(sheet)).once('value');
    const val=snap.val();
    if(!val)return[];
    // Firebase lưu object, convert sang array
    return Object.values(val).sort((a,b)=>(a._idx||0)-(b._idx||0)).map(r=>r.data||r);
  }catch(e){console.error(e);return[];}
  finally{busyDone();}
}

async function apiPost(data){
  await initFirebase();
  busyShow();
  try{
    const sheet=data.sheet;
    const ref=db.ref(dbPath(sheet));
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
  finally{busyDone();}
}

// Xóa NHIỀU dòng của 1 sheet trong 1 lượt: đọc sheet ĐÚNG 1 LẦN, ánh xạ mọi index → _key rồi gọi remove()
// SONG SONG. Thay cho vòng `for(...)await apiPost({action:'delete'})` (mỗi lần lại đọc lại cả sheet →
// chậm tuyến tính). Nhận MẢNG INDEX 0-based (đúng quy ước row = index + 2). An toàn khi chạy song song vì
// xóa theo _key CỐ ĐỊNH, không theo vị trí — thứ tự không quan trọng. CHỈ dùng cho vòng xóa thuần (không có
// thao tác ghi phụ thuộc xen giữa — VD điều chỉnh tồn kho — những chỗ đó phải giữ tuần tự).
async function apiDeleteRows(sheet,indices){
  const idxs=[...new Set((indices||[]).filter(i=>i>=0))];
  if(!idxs.length)return true;
  await initFirebase();
  busyShow();
  try{
    const ref=db.ref(dbPath(sheet));
    const snap=await ref.once('value');
    const items=snap.val();
    if(!items)return false;
    const keys=Object.keys(items).sort((a,b)=>(items[a]._idx||0)-(items[b]._idx||0));
    await Promise.all(idxs.map(i=>{const k=keys[i];return k?ref.child(k).remove():Promise.resolve();}));
    return true;
  }catch(e){console.error(e);return false;}
  finally{busyDone();}
}

// apiGetRaw dùng để check initialized
function fmt(n){return Number(n||0).toLocaleString('vi-VN');}
function td(){return new Date().toISOString().slice(0,10);}
// Ngày cách hôm nay n ngày (YYYY-MM-DD) — dùng đặt mặc định ô "Từ ngày" = 30 ngày gần nhất ở các màn danh sách.
// Dựng chuỗi theo giờ ĐỊA PHƯƠNG (không qua toISOString/UTC) để ở VN (UTC+7) sáng sớm không bị lùi 1 ngày.
function dNago(n){const d=new Date();d.setDate(d.getDate()-n);const z=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}

// ── XÁC ĐỊNH NGƯỜI ĐANG ĐĂNG NHẬP ── map email tài khoản Firebase Auth đang dùng ↔ bản ghi "Người dùng"
// để tự động biết "ai đang thao tác" thay vì bắt chọn tay mỗi lần
function findUserByEmail(email){
  if(!email)return null;
  return C.USER.find(r=>(r[4]||'').toLowerCase()===String(email).toLowerCase())||null;
}
function currentUserEmail(){
  if(TAPHOA_ENV==='test'){const s=testSessionLoad();return s?s.email:'';}
  return (auth&&auth.currentUser&&auth.currentUser.email)||'';
}
function currentUserName(){
  if(TAPHOA_ENV==='test'){const s=testSessionLoad();return s?(s.name||s.email||''):'';}
  const u=auth&&auth.currentUser;
  if(!u)return'';
  const rec=findUserByEmail(u.email);
  return rec?rec[0]:(u.email||'');
}

// ── NHẬT KÝ HOẠT ĐỘNG (Log) ── ghi lại ai vừa tạo mới/cập nhật/xóa gì, khi nào
// Không await/chặn luồng chính — ghi log lỗi (mất mạng...) không được làm hỏng thao tác chính của người dùng
function logAction(hanhDong,doiTuong,moTa){
  const nguoiDung=currentUserEmail();
  const thoiGian=new Date().toISOString();
  apiPost({sheet:'Log',action:'append',row:[thoiGian,nguoiDung,hanhDong,doiTuong,moTa]}).catch(()=>{});
}
const LOG_RETENTION_DAYS=30;
// Tự động xóa các dòng Nhật ký cũ hơn 30 ngày — chạy NGẦM, KHÔNG cần mở màn Nhật ký mới dọn (gọi 1 lần
// sau khi đăng nhập xong ở BẤT KỲ trang nào, xem cuối file). Chỉ thực sự kiểm tra 1 LẦN/NGÀY trên mỗi trình
// duyệt (đánh dấu bằng localStorage) để không phải tải lại toàn bộ Log mỗi lần chuyển trang trong ngày.
async function autoPruneOldLogs(){
  try{
    const today=td();
    if(localStorage.getItem('logPruneDate')===today)return;
    localStorage.setItem('logPruneDate',today);// đánh dấu TRƯỚC khi chạy — lỡ có lỗi giữa chừng cũng không thử lại liên tục trong ngày
    const data=await apiGet('Log');
    const cutoff=Date.now()-LOG_RETENTION_DAYS*86400000;
    const idxs=data.map((r,i)=>i).filter(i=>{
      const t=new Date(data[i][0]).getTime();
      return !isNaN(t)&&t<cutoff;
    }).sort((a,b)=>b-a);// xóa từ index lớn → nhỏ để không lệch vị trí giữa các lần xóa
    for(const idx of idxs)await apiPost({sheet:'Log',action:'delete',row:idx+2});
  }catch(e){console.error(e);}
}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className='show '+type;setTimeout(()=>t.className='',2500);}
function om(id){document.getElementById(id).classList.add('on');}
function cm(id){document.getElementById(id).classList.remove('on');}
// Bấm ra vùng nền tối (ngoài hộp .mb) → đóng popup. Dùng mousedown+mouseup CÙNG trên nền để tránh
// đóng nhầm khi bôi đen chữ trong popup rồi thả chuột ra ngoài.
document.addEventListener('mousedown',e=>{document._moDown=e.target;},true);
document.addEventListener('mouseup',e=>{
  const t=e.target;
  if(t===document._moDown && t.classList && t.classList.contains('mo') && t.classList.contains('on')){
    t.classList.remove('on');
  }
},true);
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
function confirmDel(msg,fn){if(confirm(msg))fn();}

// ── NÚT ☰ Ở TOPBAR ──
// Mobile: trượt sidebar ra/vào (drawer). Desktop: thu gọn sidebar còn mỗi icon (nhớ trạng thái ở localStorage).
function sbIsMobile(){return window.matchMedia('(max-width:480px)').matches;}
function toggleMenu(){
  if(sbIsMobile()){
    const open=document.getElementById('sb').classList.toggle('mnu-open');
    document.getElementById('mnu-backdrop').classList.toggle('on',open);
    document.getElementById('mnu-btn').textContent=open?'✕':'☰';
  }else{
    const collapsed=document.body.classList.toggle('sb-collapsed');
    try{localStorage.setItem('sbCollapsed',collapsed?'1':'0');}catch(e){}
    syncMnuBtn();
  }
}
function closeMenu(){
  document.getElementById('sb').classList.remove('mnu-open');
  document.getElementById('mnu-backdrop').classList.remove('on');
  if(sbIsMobile())document.getElementById('mnu-btn').textContent='☰';
}
// Icon nút ☰: mobile luôn ☰; desktop hiện « (đang mở, bấm để thu gọn) / » (đang thu gọn, bấm để mở)
function syncMnuBtn(){
  const b=document.getElementById('mnu-btn');
  const s=document.getElementById('sb-tgl');
  const mobile=sbIsMobile();
  const collapsed=document.body.classList.contains('sb-collapsed');
  const drawerOpen=document.getElementById('sb')?.classList.contains('mnu-open');
  if(b)b.textContent=mobile?(drawerOpen?'✕':'☰'):(collapsed?'»':'«');
  if(s)s.textContent=collapsed?'»':'«';
}
// Áp trạng thái đã lưu + gắn tooltip cho các mục (để khi thu gọn rê chuột vẫn biết tên) — gọi sau renderShell()
function applySbState(){
  let collapsed=false;try{collapsed=localStorage.getItem('sbCollapsed')==='1';}catch(e){}
  document.body.classList.toggle('sb-collapsed',collapsed);
  document.querySelectorAll('#sb nav a').forEach(a=>{
    const s=a.querySelector('span:not(.nbadge)');if(s&&!a.title)a.title=s.textContent.trim();
  });
  const lo=document.getElementById('logout-btn');if(lo&&!lo.title)lo.title='Đăng xuất';
  syncMnuBtn();
}
window.addEventListener('resize',syncMnuBtn);

// ── KHỐI TÌM KIẾM & LỌC (<details class="sb-wrap">): mặc định ẨN trên điện thoại
// (người dùng bấm "🔍 Tìm kiếm & lọc" để mở), nhưng LUÔN MỞ trên desktop vì nút bấm bị ẩn ở đó ──
function syncSBWrap(){
  const isDesktop=!window.matchMedia('(max-width:480px)').matches;
  if(!isDesktop)return;// ở mobile giữ nguyên trạng thái đóng/mở người dùng đang chọn
  document.querySelectorAll('.sb-wrap').forEach(d=>{d.open=true;});
}
window.addEventListener('resize',syncSBWrap);
syncSBWrap();// đặt trạng thái đúng ngay khi tải trang

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// ── Bấm vào 1 DÒNG danh sách để mở form Sửa ── dùng chung mọi màn list có chức năng sửa.
// Đặt: <tr class="row-edit" onclick="rowEdit(event,editSP,${gi+2})">. Bỏ qua khi bấm trúng
// checkbox/nút (Sửa/Xóa)/link bên trong dòng để không cướp thao tác của chúng.
function rowEdit(ev,fn){
  if(ev&&ev.target&&ev.target.closest('button,a,input,select,label,.no-row-edit'))return;
  const args=[].slice.call(arguments,2);
  const f=(typeof fn==='function')?fn:window[fn];
  if(typeof f==='function')f.apply(null,args);
}
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
  let items=[],hi=-1,picking=false;
  function position(){
    const r=input.getBoundingClientRect();
    menu.style.left=Math.round(r.left)+'px';
    menu.style.top=Math.round(r.bottom+2)+'px';
    menu.style.width=Math.round(r.width)+'px';
  }
  function render(){
    // vừa CHỌN xong 1 option → giữ menu đóng (event 'input' do choose() phát ra sẽ không mở lại menu)
    if(picking){menu.style.display='none';return;}
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
    picking=true;
    input.value=items[i];
    menu.style.display='none';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    picking=false;
    menu.style.display='none';// đảm bảo menu đóng sau khi các handler 'input' chạy xong
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
function loaiColorClass(loai,idx){
  // Trước đây mỗi loại 1 màu xoay vòng — nay dùng CHUNG 1 màu (#008080) cho mọi loại hàng
  return 'acc-uni';
}

// ── sel3d: DROPDOWN TỰ VẼ cho MỌI <select> ──────────────────────────────────────────────────────────
// <select> gốc vẫn nằm trong DOM và vẫn là "mặt" hiển thị (CSS appearance:none) — mọi code cũ đọc/ghi
// .value / dựng lại <option> vẫn chạy y nguyên. Chỉ chặn danh sách MẶC ĐỊNH của trình duyệt, thay bằng
// menu .sel3d-menu dựng lại từ select.options mỗi lần mở (nên luôn khớp dữ liệu mới nhất). Chọn xong ->
// set selectedIndex + bắn 'input'+'change' để onchange/oninput cũ vẫn kích hoạt. Uỷ quyền ở document nên
// tự chạy cho cả <select> tạo động sau này (dòng "+ Thêm" trong popup...).
(function(){
  let menu=null,curSel=null;
  function close(){
    if(!menu)return;
    menu.remove();menu=null;
    if(curSel)curSel.classList.remove('sel3d-open');
    curSel=null;
  }
  function pick(sel,i){
    if(sel.selectedIndex!==i){
      sel.selectedIndex=i;
      sel.dispatchEvent(new Event('input',{bubbles:true}));
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
    close();
  }
  function position(sel){
    if(!menu)return;
    const r=sel.getBoundingClientRect();
    menu.style.minWidth=r.width+'px';
    menu.style.maxWidth=Math.max(r.width,Math.min(window.innerWidth-16,320))+'px';
    const mh=menu.offsetHeight,mw=menu.offsetWidth;
    let top=r.bottom+4;
    if(top+mh>window.innerHeight-8&&r.top-mh-4>8)top=r.top-mh-4;// không đủ chỗ dưới -> lật lên trên
    menu.style.top=Math.max(8,Math.min(top,window.innerHeight-mh-8))+'px';
    menu.style.left=Math.max(8,Math.min(r.left,window.innerWidth-mw-8))+'px';
  }
  function open(sel){
    close();
    curSel=sel;sel.classList.add('sel3d-open');
    menu=document.createElement('div');
    menu.className='sel3d-menu';
    [...sel.options].forEach((o,i)=>{
      const it=document.createElement('div');
      it.className='it'+(i===sel.selectedIndex?' sel':'')+(o.disabled?' dis':'');
      it.textContent=o.textContent;
      it.dataset.i=i;
      if(!o.disabled)it.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pick(sel,i);});
      menu.appendChild(it);
    });
    document.body.appendChild(menu);
    position(sel);
    const s=menu.querySelector('.it.sel');if(s)s.scrollIntoView({block:'nearest'});
  }
  function items(){return menu?[...menu.querySelectorAll('.it:not(.dis)')]:[];}
  function move(dir){
    const its=items();if(!its.length)return;
    let hi=its.findIndex(x=>x.classList.contains('hi'));
    if(hi<0)hi=its.findIndex(x=>x.classList.contains('sel'));
    hi=Math.max(0,Math.min((hi<0?(dir>0?-1:its.length):hi)+dir,its.length-1));
    its.forEach(x=>x.classList.remove('hi'));
    its[hi].classList.add('hi');
    its[hi].scrollIntoView({block:'nearest'});
  }
  // Chặn danh sách MẶC ĐỊNH của trình duyệt (mousedown là mẹo suppress <select> phổ biến, phủ cả touch)
  document.addEventListener('mousedown',e=>{
    const s=e.target&&e.target.closest?e.target.closest('select'):null;
    if(s&&!s.disabled&&!s.multiple)e.preventDefault();
  },true);
  document.addEventListener('pointerdown',e=>{
    const t=e.target;
    const sel=t&&t.closest?t.closest('select'):null;
    if(sel&&!sel.disabled&&!sel.multiple){
      e.preventDefault();
      sel.focus();
      if(curSel===sel)close();else open(sel);
      return;
    }
    if(menu&&!menu.contains(t))close();
  },true);
  document.addEventListener('keydown',e=>{
    const a=document.activeElement;
    const isSel=a&&a.tagName==='SELECT'&&!a.multiple&&!a.disabled;
    if(menu&&curSel){
      if(e.key==='Escape'){e.preventDefault();close();curSel&&curSel.focus();}
      else if(e.key==='ArrowDown'){e.preventDefault();move(1);}
      else if(e.key==='ArrowUp'){e.preventDefault();move(-1);}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();const h=items().find(x=>x.classList.contains('hi'));if(h)pick(curSel,Number(h.dataset.i));else close();}
      else if(e.key==='Tab')close();
      return;
    }
    if(isSel&&(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter'||e.key===' ')){e.preventDefault();open(a);}
  },true);
  document.addEventListener('focusin',e=>{if(curSel&&e.target!==curSel&&!(menu&&menu.contains(e.target)))close();},true);
  window.addEventListener('resize',close);
  window.addEventListener('scroll',e=>{if(curSel&&!(menu&&menu.contains(e.target)))position(curSel);},true);
})();
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
function getSapHet(r){return Number(r[7])>0?Number(r[7]):SETTINGS.sapHet;}
// Ngưỡng "Sắp hết hạn"/"Gấp" (theo số ngày còn lại tới HSD) của 1 sản phẩm: ưu tiên số riêng, không có thì dùng mặc định
function getHsdSap(r){return Number(r[11])>0?Number(r[11]):SETTINGS.hsdSap;}
function getHsdGan(r){return Number(r[12])>0?Number(r[12]):SETTINGS.hsdGan;}
// ── Trạng thái tồn kho: ĐỊNH NGHĨA DUY NHẤT dùng chung toàn app (bảng, badge, biểu đồ, filter, sort) ──
// Sửa tên/màu ở ĐÂY là áp dụng khắp nơi. (Đã bỏ trạng thái "Gần hết" — chỉ còn Hết hàng / Sắp hết / Còn hàng.)
const STATUS_ORDER=['het','sap','con'];// thứ tự khẩn cấp: khẩn cấp nhất → yên tâm nhất
const STATUS_DEF={
  het:{label:'Hết hàng', cls:'bg-r', hex:'#d03b3b'},
  sap:{label:'Sắp hết',  cls:'bg-y', hex:'#fab219'},
  con:{label:'Còn hàng', cls:'bg-g', hex:'#0ca30c'}
};
function stTK(r){
  const sl=Number(r[1]||0);
  if(sl<=0)return'het';
  if(sl<=getSapHet(r))return'sap';
  return'con';
}
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
async function moveLoaiByName(name,dir,refreshFn){
  const idx=C.LOAI.findIndex(r=>r[0]===name);
  if(idx<0)return;
  if(await moveLoai(idx,dir))refreshFn();
}
async function loadSettings(){
  const data=await apiGet('CaiDat');
  if(data.length){
    // cột 0 của CaiDat trước đây là "Gần hết" — nay bỏ, giữ nguyên vị trí các cột còn lại
    SETTINGS.sapHet=Number(data[0][1])||10;
    SETTINGS.hsdGan=Number(data[0][2])||7;
    SETTINGS.hsdSap=Number(data[0][3])||30;
  }
}

// ══ TÍNH SL ĐÃ BÁN (Kiểm kê Gian hàng) ══ dùng chung cho Tổng quan (card Bestseller nhanh) VÀ màn
// Bestseller riêng — cả 2 giờ phải ra CÙNG MỘT con số cho cùng 1 kỳ, không được lệch nhau giữa 2 nơi.
function bAddDays(dateStr,n){
  const[y,m,d]=dateStr.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  dt.setUTCDate(dt.getUTCDate()+n);
  return dt.toISOString().slice(0,10);
}
// Tồn của 1 sản phẩm TÍNH ĐẾN 1 NGÀY (as-of): lấy lần Kiểm kê Gian hàng GẦN NHẤT có ngày ≤ ngày mốc mà
// CÓ đếm SP này, rồi gộp mọi gian hàng của đúng lần đó (tra theo Mã SP trước, theo tên nếu SP chưa có mã).
// → SP không được đếm đúng ngày mốc vẫn dùng được số ở lần kiểm kê trước đó (dữ liệu kiểm kê "cộng dồn",
//   không bắt buộc mọi SP phải xuất hiện đúng 1 ngày). Trả {stock,date} hoặc null nếu tính đến ngày đó SP
//   này chưa từng được Kiểm kê Gian hàng lần nào (lúc đó mới bỏ SP — không đoán bừa).
function kkStockAsOf(maSP,tenSP,date,moc){
  // moc ('dau'/'cuoi'): khi 1 ngày có CẢ Đầu kỳ lẫn Cuối kỳ → chỉ lấy đúng lần đánh dấu tương ứng.
  let rows=C.KK.filter(r=>r[8]&&(r[0]||'')<=date&&(maSP?r[1]===maSP:r[2]===tenSP)&&(!moc||(r[9]||'')===moc));
  if(!rows.length&&moc)rows=C.KK.filter(r=>r[8]&&(r[0]||'')<=date&&(maSP?r[1]===maSP:r[2]===tenSP));// dữ liệu cũ chưa gắn mốc → dùng tạm
  if(!rows.length)return null;
  const d=rows.reduce((m,r)=>(r[0]||'')>m?(r[0]||''):m,'');
  return{stock:rows.filter(r=>(r[0]||'')===d).reduce((s,r)=>s+Number(r[4]||0),0),date:d};
}
// Tổng SL đã Xếp hàng ra CÁC gian hàng của 1 sản phẩm, tính từ SAU ngày đầu kỳ đến HẾT ngày cuối kỳ
function xhAddedInRange(maSP,tenSP,fromExclusive,toInclusive){
  // Cùng ngày (Đầu kỳ === Cuối kỳ) → tính luôn phần xếp ngày đó; khác ngày → chỉ tính từ SAU ngày đầu kỳ
  const start=fromExclusive>=toInclusive?fromExclusive:bAddDays(fromExclusive,1);
  return C.XH.filter(r=>{
    if(!((r[3]||'')>=start&&(r[3]||'')<=toInclusive))return false;
    return maSP?r[5]===maSP:r[0]===tenSP;
  }).reduce((s,r)=>s+Number(r[1]||0),0);
}
// Tính bảng xếp hạng Bestseller cho khoảng [from,to]. Mỗi SP đo trên CỬA SỔ RIÊNG của nó = [ngày kiểm kê
// gian hàng gần nhất ≤ from, ngày kiểm kê gần nhất ≤ to]; phần "Đã xếp" cũng cộng đúng trong cửa sổ đó nên
// công thức luôn nhất quán kể cả khi 2 mốc kiểm kê của SP không rơi đúng ngày from/to. Bỏ SP nếu tính đến
// `to` nó chưa từng được Kiểm kê Gian hàng, hoặc 2 mốc trùng ngày (không đủ để đo chênh lệch) — không đoán.
function computeBestsellerPeriod(from,to){
  const items=[];let missing=0;
  C.TK.forEach(sp=>{
    const ten=sp[0],ma=sp[9]||'';
    const dau=kkStockAsOf(ma,ten,from,'dau');
    const cuoi=kkStockAsOf(ma,ten,to,'cuoi');
    if(!dau||!cuoi||dau.date>cuoi.date){missing++;return;}
    const them=xhAddedInRange(ma,ten,dau.date,cuoi.date);
    items.push({ten,ma,dauKy:dau.stock,them,cuoiKy:cuoi.stock,daBan:dau.stock+them-cuoi.stock,dauDate:dau.date,cuoiDate:cuoi.date});
  });
  items.sort((a,b)=>b.daBan-a.daBan);
  return{items,missing,tongSP:C.TK.length};
}
// Cặp Đầu kỳ/Cuối kỳ mặc định: Cuối kỳ = lần Kiểm kê Gian hàng đánh dấu 🏁 gần nhất, Đầu kỳ = lần đánh dấu
// 📍 gần nhất TRƯỚC đó (khớp với dropdown ở màn Bestseller). Trả về null nếu chưa đủ 2 mốc đã đánh dấu hợp lệ.
function mostRecentKKPair(){
  const byMoc=moc=>[...new Set(C.KK.filter(r=>r[8]&&r[9]===moc).map(r=>r[0]))].sort((a,b)=>b.localeCompare(a));
  const cuoi=byMoc('cuoi')[0];if(!cuoi)return null;
  const dau=byMoc('dau').find(d=>d<=cuoi);if(!dau)return null;
  return{dau,cuoi};
}

// ── Kỳ Bestseller do người dùng CHỐT ở màn Bestseller ──────────────────────────────────────────────
// Lưu trong sheet "BestKy" (1 dòng [dau, cuoi]) để dùng CHUNG: màn Tổng quan lấy đúng kỳ này cho card
// Bestseller thay vì tự đoán 2 mốc gần nhất. Chưa lưu / dữ liệu hỏng → trả null, bên gọi tự fallback.
async function getSavedBestKy(){
  const r=(await apiGet('BestKy'))[0];
  return(r&&r[0]&&r[1]&&r[0]<=r[1])?{dau:r[0],cuoi:r[1]}:null;
}
async function saveBestKy(dau,cuoi){
  const bk=await apiGet('BestKy');
  if(bk.length)await apiPost({sheet:'BestKy',action:'update',row:2,data:[dau,cuoi]});
  else await apiPost({sheet:'BestKy',action:'append',row:[dau,cuoi]});
}
async function clearBestKy(){
  if((await apiGet('BestKy')).length)await apiPost({sheet:'BestKy',action:'delete',row:2});
}

// ══ BỘ ICON DÙNG CHUNG (SVG nội tuyến, không phụ thuộc font/CDN ngoài) ── thay cho emoji ở sidebar/KPI —
// mỗi icon chỉ là phần <path>/... bên trong, icon() bọc lại thành <svg> hoàn chỉnh, màu ăn theo `color`
// CSS hiện tại của thẻ cha (stroke="currentColor") nên đặt màu ở ngoài là icon đổi màu theo, không cần sửa gì thêm.
const ICONS={
  store:'<path d="M3 10l1.5-6h15L21 10"/><path d="M4 10v10a1 1 0 001 1h4v-6h6v6h4a1 1 0 001-1V10"/>',
  home:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  box:'<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v9l9 4 9-4V8"/><path d="M12 12v9"/>',
  download:'<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  tag:'<path d="M3 12l9-9h7v7l-9 9-7-7z"/><circle cx="15.5" cy="6.5" r="1.3"/>',
  archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M4 8v11a1 1 0 001 1h14a1 1 0 001-1V8"/><path d="M10 13h4"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 13l2 2 4-5"/>',
  trophy:'<path d="M7 3h10v6a5 5 0 01-10 0V3z"/><path d="M7 4H4a3 3 0 003 4"/><path d="M17 4h3a3 3 0 01-3 4"/><path d="M12 14v3"/><path d="M8 21h8"/><path d="M9 21c0-2 1-3 1-4h4c0 1 1 2 1 4"/>',
  bars:'<line x1="5" y1="21" x2="5" y2="10"/><line x1="12" y1="21" x2="12" y2="3"/><line x1="19" y1="21" x2="19" y2="14"/>',
  doc:'<path d="M7 2h7l5 5v15H7z"/><path d="M14 2v5h5"/><line x1="9.5" y1="12" x2="14.5" y2="12"/><line x1="9.5" y1="16" x2="14.5" y2="16"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  logout:'<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  bag:'<path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
  hourglass:'<path d="M6 3h12"/><path d="M6 21h12"/><path d="M7 3v3.5a5 5 0 005 5 5 5 0 005-5V3"/><path d="M7 21v-3.5a5 5 0 015-5 5 5 0 015 5V21"/>',
  calcheck:'<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><path d="M9 15l2 2 4-4"/>',
  receipt:'<path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>',
  checkcircle:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/>',
};
function icon(name,size){
  size=size||18;
  return`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`;
}

// ══ ĐIỀU HƯỚNG NHIỀU TRANG ══ mỗi màn hình giờ là 1 file .html riêng (thay vì 1 trang SPA ẩn/hiện div) —
// app.js chỉ còn giữ logic DÙNG CHUNG; phần JS đặc thù từng màn nằm ngay trong <script> của file .html đó.
// Sidebar/topbar/màn đăng nhập được RENDER Ở ĐÂY (dùng chung) để sau này đổi menu chỉ cần sửa 1 chỗ,
// không phải sửa lại từng file trong 10 file màn hình.
const PAGE_MAP={dash:'index.html',tk:'ton-kho.html',nh:'nhap-hang.html',hd:'hoa-don.html',xh:'xep-hang.html',ghk:'do-gian-hang.html',kk:'kiem-ke.html',best:'bestseller.html',bc:'bao-cao.html',log:'nhat-ky.html',setting:'cai-dat.html'};
const PAGE_TITLES={dash:'Tổng quan',tk:'Tồn kho',nh:'Nhập hàng',hd:'Kho lưu trữ hóa đơn',xh:'Xếp hàng',ghk:'Đồ gian hàng',kk:'Kiểm kê',best:'Bestseller',bc:'Báo cáo theo tháng',log:'Nhật ký hoạt động',setting:'Cài đặt'};
function renderLogin(){
  const test=TAPHOA_ENV==='test';
  document.getElementById('login-mount').innerHTML=`
    <div id="login-screen">
      <div id="login-box">
        <div class="login-logo">
          <span class="icon">🏪</span>
          <h2>Tạp Hóa${test?' · TEST':''}</h2>
          <p>${test?'Chế độ test — đăng nhập bằng tài khoản trong TEST/Người dùng':'Đăng nhập để tiếp tục'}</p>
        </div>
        <div class="fg"><label>Email</label><input id="login-email" type="email" placeholder="email@taphoa.com" onkeydown="if(event.key==='Enter')doLogin()"></div>
        <div class="fg"><label>Mật khẩu</label><input id="login-pass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
        <button id="login-btn" onclick="doLogin()">Đăng nhập</button>
        <div id="login-err">Email hoặc mật khẩu không đúng!</div>
        ${test?`<p style="font-size:11px;color:#94a3b8;margin-top:10px;text-align:center">Chưa có tài khoản test? Đăng nhập <b>admin</b> / <b>admin</b> để vào tạo.</p>`:''}
      </div>
    </div>`;
}
// Màn hình TRUNG GIAN khi vừa tải trang, trong lúc chờ Firebase xác nhận đã đăng nhập hay chưa — cố ý
// KHÔNG phải form đăng nhập thật. Vì giờ mỗi lần bấm menu là tải lại 1 trang mới hoàn toàn (không còn là
// SPA), nếu hiện thẳng form đăng nhập ngay từ đầu thì người dùng ĐÃ đăng nhập rồi vẫn bị "chớp" qua màn
// login mỗi lần chuyển trang, trong lúc chờ Firebase SDK tải lại + xác nhận phiên đăng nhập (mất chút thời
// gian vì giờ tải lại từ đầu). Chỉ khi Firebase xác nhận THẬT SỰ chưa đăng nhập mới đổi sang renderLogin().
function renderLoading(){
  document.getElementById('login-mount').innerHTML=`
    <div id="login-screen"><div class="spin" style="width:34px;height:34px;border-width:3px;border-top-color:#fff"></div></div>`;
}
function renderShell(activePage){
  const sb=document.getElementById('sb');
  const on=k=>k===activePage?' class="on"':'';
  sb.innerHTML=`
    <div class="logo"><span class="logo-ic">${icon('store',20)}</span><span class="logo-txt"><b>Tạp Hóa D5</b><small>Quản lý cửa hàng</small></span><button id="sb-tgl" onclick="toggleMenu()" aria-label="Thu gọn / mở menu" title="Thu gọn / mở menu">«</button></div>
    <nav>
      <a href="${PAGE_MAP.dash}"${on('dash')} id="n-dash">${icon('home')}<span>Tổng quan</span></a>
      <a href="${PAGE_MAP.tk}"${on('tk')} id="n-tk">${icon('box')}<span>Tồn kho</span><span class="nbadge" id="lbadge" style="display:none">!</span></a>
      <a href="${PAGE_MAP.nh}"${on('nh')} id="n-nh">${icon('download')}<span>Nhập hàng</span></a>
      <a href="${PAGE_MAP.hd}"${on('hd')} id="n-hd">${icon('receipt')}<span>Kho hóa đơn</span></a>
      <a href="${PAGE_MAP.xh}"${on('xh')} id="n-xh">${icon('tag')}<span>Xếp hàng</span></a>
      <a href="${PAGE_MAP.ghk}"${on('ghk')} id="n-ghk">${icon('archive')}<span>Đồ gian hàng</span></a>
      <a href="${PAGE_MAP.kk}"${on('kk')} id="n-kk">${icon('clipboard')}<span>Kiểm kê</span></a>
      <a href="${PAGE_MAP.best}"${on('best')} id="n-best">${icon('trophy')}<span>Bestseller</span></a>
      <a href="${PAGE_MAP.bc}"${on('bc')} id="n-bc">${icon('bars')}<span>Báo cáo</span></a>
      <a href="${PAGE_MAP.log}"${on('log')} id="n-log">${icon('doc')}<span>Nhật ký</span></a>
      <a href="${PAGE_MAP.setting}"${on('setting')} id="n-setting">${icon('gear')}<span>Cài đặt</span></a>
    </nav>
    <div id="sb-logout-wrap" style="padding:10px 16px;border-top:1px solid #2a3547">
      <button id="logout-btn" onclick="doLogout()" style="width:100%">${icon('logout',16)}<span>Đăng xuất</span></button>
    </div>
    <div id="sb-foot">
      <small class="sb-version">Phiên bản 1.0.0</small>
      <div id="sync" class="sb-sync"><span class="sync-dot"></span>Đang kết nối...<small id="user-email-display"></small></div>
    </div>`;
  document.getElementById('topbar').innerHTML=`
    <div class="tb-left"><button id="mnu-btn" onclick="toggleMenu()" aria-label="Thu gọn / mở menu" title="Thu gọn / mở menu">☰</button><h1 id="ptitle">${PAGE_TITLES[activePage]||''}</h1>${TAPHOA_ENV==='test'?`<button onclick="if(confirm('Thoát chế độ TEST, quay lại dữ liệu THẬT?')){localStorage.setItem('taphoaEnv','prod');try{sessionStorage.removeItem('taphoaTestAuth')}catch(e){};location.href='${PAGE_MAP.dash}';}" title="Bấm để quay lại dữ liệu thật" style="margin-left:10px;background:#d03b3b;color:#fff;border:none;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;letter-spacing:.5px;cursor:pointer">● CHẾ ĐỘ TEST</button>`:''}</div>
    <div id="acts"></div>`;
  applySbState();
}
// Mỗi file .html tự gọi bootPage('kk', function(){ loadKK(); }) ở cuối <script> của nó — 'kk' để biết
// tô sáng đúng mục trong sidebar + đặt tiêu đề, còn hàm callback là bước tải dữ liệu riêng của màn đó,
// chỉ chạy SAU KHI đã xác nhận đăng nhập xong (giữ đúng thứ tự như bản SPA cũ, không lộ dữ liệu trước khi login).
let __pageKey=null,__pageInit=null;
function bootPage(pageKey,initFn){__pageKey=pageKey;__pageInit=initFn;}

// ── ĐẢM BẢO DỮ LIỆU DÙNG CHUNG ĐÃ CÓ SẴN TRONG CACHE (không kèm vẽ giao diện) ──
// Trước đây nhiều màn "mượn tạm" hàm load...() của màn KHÁC chỉ để ép nạp dữ liệu (VD Kiểm kê gọi
// loadGH()/loadTK() của Gian hàng/Tồn kho) — nhưng các hàm đó ĐỒNG THỜI vẽ luôn bảng của màn đó, giờ mỗi
// màn là 1 trang riêng nên DOM đích không tồn tại ở trang khác nữa. Tách hẳn phần "chỉ nạp dữ liệu" ra đây.
async function ensureTK(){if(!C.TK.length)C.TK=await apiGet('TonKho');}
async function ensureGH(){if(!C.GH.length)C.GH=await apiGet('GianHang');}
async function ensureUser(){if(!C.USER.length)C.USER=await apiGet('User');}
async function ensureNCC(){if(!C.NCC.length)C.NCC=await apiGet('NhaCungCap');}
async function ensureLoai(){if(!C.LOAI.length)C.LOAI=await apiGet('LoaiHang');}

// ── THÁNG DANH MỤC (dùng chung Nhập hàng / Xếp hàng / Kiểm kê / Kho hóa đơn) ───────────────────────
// KHÔNG lưu ở sheet riêng: dropdown tự sinh sẵn tháng hiện tại ±3 tháng. Giá trị lưu vào CỘT CUỐI của
// mỗi dòng là chuỗi "YYYY-MM" luôn. Các màn tạo mới BẮT BUỘC chọn 1 tháng.
function dmFmt(ym){const m=/^(\d{4})-(\d{2})$/.exec(ym||'');return m?`Tháng ${+m[2]}/${m[1]}`:(ym||'');}
function dmLabel(ym){return dmFmt(ym);}
function dmNow(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
// Danh sách "YYYY-MM" có sẵn: 3 tháng tương lai → tháng này → 3 tháng quá khứ (mới nhất lên đầu)
function dmMonths(){
  const now=new Date(),out=[];
  for(let off=3;off>=-3;off--){
    const d=new Date(now.getFullYear(),now.getMonth()+off,1);
    out.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  return out;
}
// Danh sách tháng cho Ô LỌC ở các màn danh sách: 7 tháng mặc định + mọi tháng đang có trong dữ liệu, mới nhất lên đầu
function dmFilterMonths(used){
  return[...new Set([...dmMonths(),...(used||[]).filter(Boolean)])].filter(m=>/^\d{4}-\d{2}$/.test(m)).sort((a,b)=>b.localeCompare(a));
}
// Dọn 1 LẦN: bản ghi lỡ lưu danhMucId dạng "DM<timestamp>" (giai đoạn thử nghiệm trước) → đổi về "YYYY-MM"
// suy từ ngày của CHÍNH bản ghi (cột dateIdx). Chỉ đụng đúng cột danhMucId. Trả về số dòng đã sửa.
async function dmHealSheet(sheet,rows,dmIdx,dateIdx){
  let fixed=0;
  for(let i=0;i<rows.length;i++){
    const v=rows[i]&&rows[i][dmIdx];
    if(v&&!/^\d{4}-\d{2}$/.test(v)){
      const ym=String(rows[i][dateIdx]||'').slice(0,7);
      const row=[...rows[i]];row[dmIdx]=/^\d{4}-\d{2}$/.test(ym)?ym:dmNow();
      await apiPost({sheet,action:'update',row:i+2,data:row});
      rows[i]=row;fixed++;
    }
  }
  return fixed;
}
// Đổ các tháng vào 1 <select>; giữ sẵn cur (thêm option riêng nếu cur nằm ngoài dải mặc định)
function dmFillSelect(sel,cur){
  if(!sel)return;
  const months=dmMonths();
  if(cur&&!months.includes(cur))months.unshift(cur);
  sel.innerHTML='<option value="">-- Chọn tháng --</option>'+months.map(m=>`<option value="${m}">${dmFmt(m)}</option>`).join('');
  sel.value=cur||'';
}

// ── KHOẢNG NGÀY TÙY CHỈNH CHO TỪNG KỲ "YYYY-MM" ──────────────────────────────────────────────
// Mặc định 1 kỳ "YYYY-MM" = ngày 01 → ngày cuối tháng. Người dùng có thể chỉnh lại ở
// Cài đặt → tab "Tháng danh mục" (sheet DanhMucKy, mỗi dòng [ym, tuNgay, denNgay]).
let DM_KY={__loaded:false};
async function ensureDmKy(force){
  if(!force&&DM_KY.__loaded)return DM_KY;
  const rows=await apiGet('DanhMucKy');
  const map={__loaded:true};
  rows.forEach(r=>{
    const ym=String(r[0]||'').trim();
    if(!/^\d{4}-\d{2}$/.test(ym))return;
    map[ym]={tu:String(r[1]||'').slice(0,10),den:String(r[2]||'').slice(0,10)};
  });
  DM_KY=map;
  return DM_KY;
}
// Khoảng ngày dương lịch mặc định của 1 kỳ (01 → ngày cuối tháng)
function dmCalRange(ym){
  const m=/^(\d{4})-(\d{2})$/.exec(ym||'');
  if(!m)return{from:'0000-01-01',to:'9999-12-31'};
  const last=new Date(+m[1],+m[2],0).getDate();
  return{from:`${ym}-01`,to:`${ym}-${String(last).padStart(2,'0')}`};
}
// Khoảng ngày HIỆU LỰC của 1 kỳ: dùng cấu hình tùy chỉnh nếu đủ cả 2 đầu, không thì tháng dương lịch
function dmRange(ym){
  const c=DM_KY[ym];
  if(c&&/^\d{4}-\d{2}-\d{2}$/.test(c.tu||'')&&/^\d{4}-\d{2}-\d{2}$/.test(c.den||''))return{from:c.tu,to:c.den};
  return dmCalRange(ym);
}
// Kỳ (YYYY-MM) mà 1 ngày "YYYY-MM-DD" rơi vào — ưu tiên kỳ có cấu hình khoảng tùy chỉnh chứa ngày đó,
// nếu không khớp kỳ nào thì lấy đúng YYYY-MM của ngày.
function dmForDate(dateStr){
  const d=String(dateStr||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return dmNow();
  for(const ym in DM_KY){
    if(ym==='__loaded'||!DM_KY[ym])continue;
    const r=dmRange(ym);
    if(DM_KY[ym].tu&&DM_KY[ym].den&&d>=r.from&&d<=r.to)return ym;
  }
  return d.slice(0,7);
}
// Nhãn kỳ kèm khoảng ngày hiệu lực, VD: "Tháng 8/2026 (05/08/2026 → 04/09/2026)"
function dmFmtRange(ym){
  const r=dmRange(ym);
  const vn=s=>s.split('-').reverse().join('/');
  return `${dmFmt(ym)} (${vn(r.from)} → ${vn(r.to)})`;
}

// ── INIT ── chạy trên MỌI trang: hiện màn "đang tải" trung tính ngay (không đợi Firebase tải xong), rồi
// mới kết nối Firebase thật; renderShell()/__pageInit() chỉ chạy sau khi xác nhận đã đăng nhập, còn
// renderLogin() (form thật) chỉ hiện khi Firebase xác nhận THẬT SỰ chưa đăng nhập — xem renderLoading().
(async()=>{
  renderLoading();
  await initFirebase();

  // ── CHẾ ĐỘ TEST: bỏ qua Firebase Auth, dùng phiên test ở sessionStorage ──
  if(TAPHOA_ENV==='test'){
    const sess=testSessionLoad();
    if(sess){
      document.getElementById('login-mount').innerHTML='';
      renderShell(__pageKey);
      document.getElementById('sb').style.display='flex';
      document.getElementById('main').style.display='flex';
      C.USER=await apiGet('User');
      await loadSettings();
      const syncEl=document.getElementById('sync');
      if(syncEl)syncEl.innerHTML=`<span class="sync-dot ok"></span>Đã đồng bộ<small id="user-email-display">${esc(sess.name||sess.email)} · TEST</small>`;
      if(__pageInit)__pageInit();
      autoPruneOldLogs();
    }else{
      renderLogin();
      document.getElementById('sb').style.display='none';
      document.getElementById('main').style.display='none';
    }
    return;
  }

  auth.onAuthStateChanged(async user=>{
    if(user){
      document.getElementById('login-mount').innerHTML='';
      renderShell(__pageKey);
      document.getElementById('sb').style.display='flex';
      document.getElementById('main').style.display='flex';
      // Nạp sẵn danh sách Người dùng để nhận diện "ai đang đăng nhập" (map theo email) — dùng để
      // tự điền "Người nhập" trong Nhập hàng và hiển thị tên thân thiện thay vì email trần trong Nhật ký
      C.USER=await apiGet('User');
      const curRec=findUserByEmail(user.email);
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
      // Tới đây là đã kết nối/xác thực xong thật sự — cập nhật trạng thái đồng bộ ở CHUNG 1 chỗ cho mọi
      // trang (trước đây chỉ mỗi Tổng quan tự cập nhật dòng này, các trang khác luôn kẹt ở "Đang kết nối...")
      const syncEl=document.getElementById('sync');
      if(syncEl)syncEl.innerHTML=`<span class="sync-dot ok"></span>Đã đồng bộ<small id="user-email-display">${curRec?`${curRec[0]} · ${user.email}`:user.email}</small>`;
      if(__pageInit)__pageInit();
      autoPruneOldLogs();// chạy ngầm, không chặn/chờ — dọn Nhật ký cũ hơn 30 ngày (tối đa 1 lần/ngày, xem hàm)
    } else {
      renderLogin();
      document.getElementById('sb').style.display='none';
      document.getElementById('main').style.display='none';
    }
  });
})();
