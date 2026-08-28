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
let SETTINGS={sapHet:10,ganHet:3,hsdSap:30,hsdGan:7,visionApiKey:''};// ngưỡng mặc định dùng chung, SP nào không đặt riêng thì dùng cái này; visionApiKey dùng cho tính năng Quét hóa đơn (Google Cloud Vision, Nhập hàng)

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
    SETTINGS.ganHet=Number(data[0][0])||3;
    SETTINGS.sapHet=Number(data[0][1])||10;
    SETTINGS.hsdGan=Number(data[0][2])||7;
    SETTINGS.hsdSap=Number(data[0][3])||30;
    SETTINGS.visionApiKey=data[0][4]||'';
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
// Tồn của 1 sản phẩm TẠI 1 NGÀY, gộp mọi gian hàng — CHỈ tính được nếu có ít nhất 1 dòng Kiểm kê Gian hàng
// đúng ngày đó cho sản phẩm này (tra theo Mã SP trước, theo tên nếu SP chưa có mã); không có → trả về null,
// KHÔNG suy diễn/ước tính thay thế (thiếu dữ liệu phải báo rõ, không đoán bừa)
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
// 2 ngày Kiểm kê Gian hàng gần nhất hiện có trong C.KK (đã sort mới→cũ) — dùng làm cặp Đầu kỳ/Cuối kỳ mặc
// định khi chưa ai tự chọn gì. Trả về null nếu chưa đủ 2 ngày khác nhau (chưa đủ dữ liệu để tính).
function mostRecentKKPair(){
  const dates=[...new Set(C.KK.filter(r=>r[8]).map(r=>r[0]))].sort((a,b)=>b.localeCompare(a));
  if(dates.length<2)return null;
  return{dau:dates[1],cuoi:dates[0]};
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
const PAGE_MAP={dash:'index.html',tk:'ton-kho.html',nh:'nhap-hang.html',xh:'xep-hang.html',ghk:'do-gian-hang.html',kk:'kiem-ke.html',best:'bestseller.html',bc:'bao-cao.html',log:'nhat-ky.html',setting:'cai-dat.html'};
const PAGE_TITLES={dash:'Tổng quan',tk:'Tồn kho',nh:'Nhập hàng',xh:'Xếp hàng',ghk:'Đồ gian hàng',kk:'Kiểm kê',best:'Bestseller',bc:'Báo cáo theo tháng',log:'Nhật ký hoạt động',setting:'Cài đặt'};
function renderLogin(){
  document.getElementById('login-mount').innerHTML=`
    <div id="login-screen">
      <div id="login-box">
        <div class="login-logo">
          <span class="icon">🏪</span>
          <h2>Tạp Hóa</h2>
          <p>Đăng nhập để tiếp tục</p>
        </div>
        <div class="fg"><label>Email</label><input id="login-email" type="email" placeholder="email@taphoa.com" onkeydown="if(event.key==='Enter')doLogin()"></div>
        <div class="fg"><label>Mật khẩu</label><input id="login-pass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
        <button id="login-btn" onclick="doLogin()">Đăng nhập</button>
        <div id="login-err">Email hoặc mật khẩu không đúng!</div>
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
    <div class="logo"><span class="logo-ic">${icon('store',20)}</span><span class="logo-txt"><b>Tạp Hóa D5</b><small>Quản lý cửa hàng</small></span></div>
    <nav>
      <a href="${PAGE_MAP.dash}"${on('dash')} id="n-dash">${icon('home')}<span>Tổng quan</span></a>
      <a href="${PAGE_MAP.tk}"${on('tk')} id="n-tk">${icon('box')}<span>Tồn kho</span><span class="nbadge" id="lbadge" style="display:none">!</span></a>
      <a href="${PAGE_MAP.nh}"${on('nh')} id="n-nh">${icon('download')}<span>Nhập hàng</span></a>
      <a href="${PAGE_MAP.xh}"${on('xh')} id="n-xh">${icon('tag')}<span>Xếp hàng</span></a>
      <a href="${PAGE_MAP.ghk}"${on('ghk')} id="n-ghk">${icon('archive')}<span>Đồ gian hàng</span></a>
      <a href="${PAGE_MAP.kk}"${on('kk')} id="n-kk">${icon('clipboard')}<span>Kiểm kê</span></a>
      <a href="${PAGE_MAP.best}"${on('best')} id="n-best">${icon('trophy')}<span>Bestseller</span></a>
      <a href="${PAGE_MAP.bc}"${on('bc')} id="n-bc">${icon('bars')}<span>Báo cáo</span></a>
      <a href="${PAGE_MAP.log}"${on('log')} id="n-log">${icon('doc')}<span>Nhật ký</span></a>
      <a href="${PAGE_MAP.setting}"${on('setting')} id="n-setting">${icon('gear')}<span>Cài đặt</span></a>
    </nav>
    <div id="sb-logout-wrap" style="padding:10px 16px;border-top:1px solid #2a3547">
      <button id="logout-btn" onclick="doLogout()" style="width:100%">${icon('logout',16)} Đăng xuất</button>
    </div>
    <div id="sb-foot">
      <small class="sb-version">Phiên bản 1.0.0</small>
      <div id="sync" class="sb-sync"><span class="sync-dot"></span>Đang kết nối...<small id="user-email-display"></small></div>
    </div>`;
  document.getElementById('topbar').innerHTML=`
    <div class="tb-left"><button id="mnu-btn" onclick="toggleMenu()" aria-label="Menu">☰</button><h1 id="ptitle">${PAGE_TITLES[activePage]||''}</h1></div>
    <div id="acts"></div>`;
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

// ── INIT ── chạy trên MỌI trang: hiện màn "đang tải" trung tính ngay (không đợi Firebase tải xong), rồi
// mới kết nối Firebase thật; renderShell()/__pageInit() chỉ chạy sau khi xác nhận đã đăng nhập, còn
// renderLogin() (form thật) chỉ hiện khi Firebase xác nhận THẬT SỰ chưa đăng nhập — xem renderLoading().
(async()=>{
  renderLoading();
  await initFirebase();
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
