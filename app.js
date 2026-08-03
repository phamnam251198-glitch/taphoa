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
    document.getElementById('login-screen').style.display='flex';
    document.getElementById('sb').style.display='none';
    document.getElementById('main').style.display='none';
    document.getElementById('login-email').value='';
    document.getElementById('login-pass').value='';
    document.getElementById('login-btn').disabled=false;
    document.getElementById('login-btn').textContent='Đăng nhập';
  }
}

let C={TK:[],NH:[],BH:[],TC:[],NCC:[],USER:[]};
let tcType='all';

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
function ym(d){return d?String(d).slice(0,7):'';}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className='show '+type;setTimeout(()=>t.className='',2500);}
function om(id){document.getElementById(id).classList.add('on');}
function cm(id){document.getElementById(id).classList.remove('on');}
function mkMonths(data,di,sel){
  const months=[...new Set(data.map(r=>ym(r[di])).filter(Boolean))].sort().reverse();
  const cur=sel.value;
  sel.innerHTML='<option value="">Tất cả tháng</option>'+months.map(m=>`<option value="${m}"${m===cur?' selected':''}>${m}</option>`).join('');
}
function filterM(data,di,sel){const m=sel?sel.value:'';return m?data.filter(r=>ym(r[di])===m):data;}
function confirmDel(msg,fn){if(confirm(msg))fn();}

function go(name){
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('#sb nav a').forEach(a=>a.classList.remove('on'));
  document.getElementById('s-'+name).classList.add('on');
  document.getElementById('n-'+name).classList.add('on');
  const titles={dash:'Tổng quan',tk:'Tồn kho',nh:'Nhập hàng',bh:'Bán hàng',tc:'Thu chi',bc:'Báo cáo',lnhuan:'Lợi nhuận',ncc:'Nhà cung cấp',user:'Người dùng'};
  document.getElementById('ptitle').textContent=titles[name];
  const btns={
    tk:`<button class="btn btn-p" onclick="initSPForm();om('m-sp')">+ Thêm sản phẩm</button>`,
    nh:`<button class="btn btn-s" onclick="openNH()">+ Tạo phiếu nhập</button>`,
    bh:`<button class="btn btn-p" onclick="openBH()">+ Tạo đơn bán</button>`,
    tc:`<button class="btn btn-p" onclick="openTC()">+ Ghi thu/chi</button>`,
    ncc:`<button class="btn btn-p" onclick="initNCC()">+ Thêm NCC</button>`,
    user:`<button class="btn btn-p" onclick="initUser()">+ Thêm người dùng</button>`,
    dash:`<button class="btn btn-g" onclick="loadDash()">↻ Làm mới</button>`,
    bc:'',lnhuan:''
  };
  document.getElementById('acts').innerHTML=btns[name]||'';
  if(name==='tk')loadTK();
  else if(name==='nh')loadNH();
  else if(name==='bh')loadBH();
  else if(name==='tc')loadTC();
  else if(name==='bc')loadBC();
  else if(name==='lnhuan')loadLN();
  else if(name==='ncc')loadNCC();
  else if(name==='user')loadUser();
  else loadDash();
}

// ══ DASHBOARD ══
async function loadDash(){
  const[tk,bh,tc]=await Promise.all([apiGet('TonKho'),apiGet('BanHang'),apiGet('ThuChi')]);
  C.TK=tk;C.BH=bh;C.TC=tc;
  document.getElementById('d-sp').textContent=tk.length;
  const ts=td();
  const bhT=bh.filter(r=>r[3]===ts);
  const rev=bhT.reduce((s,r)=>s+Number(r[4]||0),0);
  // Lãi gộp = doanh thu - giá vốn
  let von=0;bhT.forEach(r=>{const sp=tk.find(t=>t[0]===r[0]);if(sp)von+=Number(r[2]||0)*Number(sp[3]||0);});
  document.getElementById('d-dt').textContent=fmt(rev)+'đ';
  document.getElementById('d-lai').textContent=fmt(rev-von)+'đ';
  const low=tk.filter(r=>Number(r[1]||0)<=Number(r[7]||10));
  document.getElementById('d-sh').textContent=low.length;
  document.getElementById('lbadge').style.display=low.length?'inline':'none';
  document.getElementById('d-low').innerHTML=low.length===0?'<div class="empty">✅ Không có hàng sắp hết</div>':
    '<table><thead><tr><th>Sản phẩm</th><th>Tồn</th><th>Trạng thái</th></tr></thead><tbody>'+
    low.slice(0,8).map(r=>`<tr><td>${r[0]}</td><td>${r[1]} ${r[2]||''}</td><td>${Number(r[1]||0)<=3?'<span class="bg bg-r">Hết gần</span>':'<span class="bg bg-y">Sắp hết</span>'}</td></tr>`).join('')+'</tbody></table>';
  const rec=[...bh].slice(-6).reverse();
  document.getElementById('d-rec').innerHTML=rec.length===0?'<div class="empty">📋 Chưa có giao dịch</div>':
    '<table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Tiền</th><th>Ngày</th></tr></thead><tbody>'+
    rec.map(r=>`<tr><td>${r[0]}</td><td>${r[2]}</td><td><span class="bg bg-g">${fmt(r[4])}đ</span></td><td>${r[3]||''}</td></tr>`).join('')+'</tbody></table>';
  document.getElementById('sync').innerHTML='Trạng thái: <b>Đã đồng bộ ✓</b>';
}

// ══ TỒN KHO ══
async function loadTK(){
  document.getElementById('tk-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('TonKho');C.TK=data;
  const low=data.filter(r=>Number(r[1]||0)<=Number(r[7]||10));
  const al=document.getElementById('la');
  if(low.length){al.style.display='flex';document.getElementById('la-txt').textContent=low.length+' SP sắp hết: '+low.slice(0,4).map(r=>r[0]).join(', ')+(low.length>4?'...':'');}
  else al.style.display='none';
  document.getElementById('tk-cnt').textContent=data.length+' sản phẩm';
  rTK(data);
}
function rTK(data){
  const el=document.getElementById('tk-tbl');
  if(!data.length){el.innerHTML='<div class="empty">📦 Chưa có sản phẩm</div>';return;}
  el.innerHTML='<table><thead><tr><th>Tên SP</th><th>Tồn</th><th>Đơn vị</th><th>Giá nhập</th><th>Giá bán</th><th>Lãi/SP</th><th>Trạng thái</th><th></th></tr></thead><tbody>'+
    data.map((r,i)=>{
      const sl=Number(r[1]||0),ng=Number(r[7]||10),gn=Number(r[3]||0),gb=Number(r[4]||0);
      const badge=sl<=0?'<span class="bg bg-r">Hết</span>':sl<=ng?'<span class="bg bg-y">Sắp hết</span>':'<span class="bg bg-g">Còn</span>';
      return`<tr><td><b>${r[0]}</b>${r[8]?`<br><small style="color:var(--text2)">${r[8]}</small>`:''}</td><td><b>${sl}</b></td><td>${r[2]||''}</td><td>${gn?fmt(gn)+'đ':''}</td><td>${gb?fmt(gb)+'đ':''}</td><td>${gb-gn>0?'<span class="bg bg-g">+'+fmt(gb-gn)+'đ</span>':''}</td><td>${badge}</td>
      <td style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editSP(${i+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delSP(${i+2},'${r[0]}')">Xóa</button></td></tr>`;
    }).join('')+'</tbody></table>';
}
function fTK(){const q=document.getElementById('q-tk').value.toLowerCase();rTK(C.TK.filter(r=>(r[0]||'').toLowerCase().includes(q)));}
function initSPForm(){document.getElementById('m-sp-t').textContent='Thêm sản phẩm';['sp-ten','sp-sl','sp-dv','sp-gn','sp-gb','sp-hsd','sp-ncc'].forEach(id=>document.getElementById(id).value='');document.getElementById('sp-ng').value='10';document.getElementById('sp-row').value='';}
function editSP(row){
  const r=C.TK[row-2];document.getElementById('m-sp-t').textContent='Sửa sản phẩm';
  document.getElementById('sp-ten').value=r[0]||'';document.getElementById('sp-sl').value=r[1]||'';
  document.getElementById('sp-dv').value=r[2]||'';document.getElementById('sp-gn').value=r[3]||'';
  document.getElementById('sp-gb').value=r[4]||'';document.getElementById('sp-hsd').value=r[5]||'';
  document.getElementById('sp-ng').value=r[7]||10;document.getElementById('sp-ncc').value=r[8]||'';
  document.getElementById('sp-row').value=row;om('m-sp');
}
async function delSP(row,name){
  confirmDel(`Xóa sản phẩm "${name}"?`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'TonKho',action:'delete',row:Number(row)});
    toast('Đã xóa '+name);setTimeout(loadTK,800);
  });
}
async function saveSP(){
  const ten=document.getElementById('sp-ten').value.trim();if(!ten){toast('Nhập tên SP','err');return;}
  const row=[ten,document.getElementById('sp-sl').value||0,document.getElementById('sp-dv').value,document.getElementById('sp-gn').value||0,document.getElementById('sp-gb').value||0,document.getElementById('sp-hsd').value,td(),document.getElementById('sp-ng').value||10,document.getElementById('sp-ncc').value];
  const er=document.getElementById('sp-row').value;
  toast('Đang lưu...');
  await apiPost(er?{sheet:'TonKho',action:'update',row:Number(er),data:row}:{sheet:'TonKho',action:'append',row});
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
    <td><input type="number" id="nh-sl-${id}" placeholder="0" oninput="calcNH()" style="width:70px"></td>
    <td><input type="number" id="nh-gia-${id}" placeholder="0" oninput="calcNH()" style="width:90px"></td>
    <td id="nh-tt-${id}" style="font-size:12px;color:var(--green);font-weight:500;min-width:80px">0đ</td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="document.getElementById('nh-r-${id}').remove();calcNH()">✕</button></td>`;
  document.getElementById('nh-rows').appendChild(tr);
}
function nhFillGia(id){
  const sel=document.getElementById('nh-sp-'+id);
  const idx=sel.value;
  if(idx!=='')document.getElementById('nh-gia-'+id).value=C.TK[idx][3]||0;
  calcNH();
}
function calcNH(){
  let tsl=0,ttt=0;
  const rows=document.getElementById('nh-rows').querySelectorAll('tr');
  rows.forEach(tr=>{
    const id=tr.id.replace('nh-r-','');
    const sl=Number(document.getElementById('nh-sl-'+id)?.value||0);
    const gia=Number(document.getElementById('nh-gia-'+id)?.value||0);
    const tt=sl*gia;tsl+=sl;ttt+=tt;
    const el=document.getElementById('nh-tt-'+id);if(el)el.textContent=fmt(tt)+'đ';
  });
  document.getElementById('nh-tsl').textContent=fmt(tsl);
  document.getElementById('nh-ttt').textContent=fmt(ttt)+'đ';
}
async function openNH(){
  if(!C.TK.length)await loadTK();
  if(!C.USER.length)await loadUser();
  document.getElementById('nh-user').innerHTML='<option value="">-- Chọn --</option>'+C.USER.map(r=>`<option>${r[0]}</option>`).join('');
  document.getElementById('nh-ngay').value=td();
  document.getElementById('nh-ncc').value='';
  document.getElementById('nh-gc').value='';
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
    const idx=document.getElementById('nh-sp-'+id)?.value;
    const sl=Number(document.getElementById('nh-sl-'+id)?.value||0);
    const gia=Number(document.getElementById('nh-gia-'+id)?.value||0);
    if(idx!==''&&idx!==undefined&&sl>0)items.push({idx:Number(idx),sp:C.TK[idx],sl,gia});
  });
  if(!user){toast('Chọn người nhập','err');return;}
  if(!items.length){toast('Thêm ít nhất 1 sản phẩm','err');return;}
  toast('Đang lưu '+items.length+' sản phẩm...');
  for(const it of items){
    await apiPost({sheet:'NhapHang',action:'append',row:[it.sp[0],it.sl,it.gia,ncc||it.sp[8]||'',ngay,gc,user]});
    const newSL=Number(it.sp[1]||0)+it.sl;const upd=[...it.sp];upd[1]=newSL;
    await apiPost({sheet:'TonKho',action:'update',row:it.idx+2,data:upd});
    C.TK[it.idx][1]=newSL;
  }
  toast('Đã nhập '+items.length+' sản phẩm thành công!');cm('m-nh');setTimeout(loadNH,800);
}

async function loadNH(){
  document.getElementById('nh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('NhapHang');C.NH=data;
  rNH(data);
}
function rNH(data){
  const total=data.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0);
  document.getElementById('nh-sum').innerHTML=data.length?`<div class="grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số dòng nhập</div><div class="val">${data.length}</div></div>
    <div class="kpi r"><div class="lb">Tổng SL</div><div class="val">${fmt(data.reduce((s,r)=>s+Number(r[1]||0),0))}</div></div>
    <div class="kpi r"><div class="lb">Tổng tiền nhập</div><div class="val">${fmt(total)}đ</div></div></div>`:'';
  const el=document.getElementById('nh-tbl');
  if(!data.length){el.innerHTML='<div class="empty">⬇️ Chưa có phiếu nhập</div>';return;}
  el.innerHTML='<table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Giá nhập</th><th>Thành tiền</th><th>NCC</th><th>Ngày</th><th>Người nhập</th><th>Ghi chú</th><th></th></tr></thead><tbody>'+
    [...data].map((r,i)=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${fmt(r[2])}đ</td>
    <td><span class="bg bg-b">${fmt(Number(r[1]||0)*Number(r[2]||0))}đ</span></td>
    <td>${r[3]||''}</td><td>${r[4]||''}</td><td><span class="bg bg-p">${r[6]||''}</span></td><td>${r[5]||''}</td>
    <td><button class="btn btn-d btn-sm" onclick="delNH(${i+2},'${r[0]}',${Number(r[1]||0)})">Xóa</button></td></tr>`).join('')+'</tbody></table>';
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
  rNH(d);
}

// ══ BÁN HÀNG NHIỀU DÒNG ══
let bhRowCount=0;
function addBHRow(){
  bhRowCount++;const id=bhRowCount;
  const opts=C.TK.map((r,i)=>`<option value="${i}" data-g="${r[4]||0}">${r[0]} (tồn:${r[1]})</option>`).join('');
  const tr=document.createElement('tr');tr.id='bh-r-'+id;
  tr.innerHTML=`<td><select onchange="bhFillGia(${id})" id="bh-sp-${id}"><option value="">-- Chọn --</option>${opts}</select></td>
    <td><input type="number" id="bh-sl-${id}" placeholder="0" oninput="calcBH()" style="width:70px"></td>
    <td><input type="number" id="bh-gia-${id}" placeholder="0" oninput="calcBH()" style="width:90px"></td>
    <td id="bh-tt-${id}" style="font-size:12px;color:var(--green);font-weight:500;min-width:80px">0đ</td>
    <td class="td-del"><button class="btn btn-d btn-sm" onclick="document.getElementById('bh-r-${id}').remove();calcBH()">✕</button></td>`;
  document.getElementById('bh-rows').appendChild(tr);
}
function bhFillGia(id){
  const sel=document.getElementById('bh-sp-'+id);
  const opt=sel.options[sel.selectedIndex];
  document.getElementById('bh-gia-'+id).value=opt.dataset.g||0;calcBH();
}
function calcBH(){
  let tsl=0,ttt=0;
  const rows=document.getElementById('bh-rows').querySelectorAll('tr');
  rows.forEach(tr=>{
    const id=tr.id.replace('bh-r-','');
    const sl=Number(document.getElementById('bh-sl-'+id)?.value||0);
    const gia=Number(document.getElementById('bh-gia-'+id)?.value||0);
    const tt=sl*gia;tsl+=sl;ttt+=tt;
    const el=document.getElementById('bh-tt-'+id);if(el)el.textContent=fmt(tt)+'đ';
  });
  document.getElementById('bh-tsl').textContent=fmt(tsl);
  document.getElementById('bh-ttt').textContent=fmt(ttt)+'đ';
}
async function openBH(){
  if(!C.TK.length)await loadTK();
  document.getElementById('bh-ngay').value=td();
  document.getElementById('bh-gc').value='';
  document.getElementById('bh-rows').innerHTML='';bhRowCount=0;
  addBHRow();calcBH();om('m-bh');
}
async function saveBH(){
  const ngay=document.getElementById('bh-ngay').value;
  const gc=document.getElementById('bh-gc').value;
  const rows=document.getElementById('bh-rows').querySelectorAll('tr');
  const items=[];
  rows.forEach(tr=>{
    const id=tr.id.replace('bh-r-','');
    const idx=document.getElementById('bh-sp-'+id)?.value;
    const sl=Number(document.getElementById('bh-sl-'+id)?.value||0);
    const gia=Number(document.getElementById('bh-gia-'+id)?.value||0);
    if(idx!==''&&idx!==undefined&&sl>0)items.push({idx:Number(idx),sp:C.TK[idx],sl,gia});
  });
  if(!items.length){toast('Thêm ít nhất 1 sản phẩm','err');return;}
  // Kiểm tra tồn
  for(const it of items){
    if(it.sl>Number(it.sp[1]||0)){toast(`${it.sp[0]}: tồn chỉ còn ${it.sp[1]}!`,'err');return;}
  }
  toast('Đang lưu '+items.length+' sản phẩm...');
  for(const it of items){
    await apiPost({sheet:'BanHang',action:'append',row:[it.sp[0],it.gia,it.sl,ngay,it.sl*it.gia,gc]});
    const newSL=Number(it.sp[1]||0)-it.sl;const upd=[...it.sp];upd[1]=newSL;
    await apiPost({sheet:'TonKho',action:'update',row:it.idx+2,data:upd});
    C.TK[it.idx][1]=newSL;
  }
  toast('Đã bán '+items.length+' sản phẩm!');cm('m-bh');setTimeout(loadBH,800);
}

async function loadBH(){
  document.getElementById('bh-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('BanHang');C.BH=data;
  rBH(data);
}
function rBH(data){
  const rev=data.reduce((s,r)=>s+Number(r[4]||0),0);
  document.getElementById('bh-sum').innerHTML=data.length?`<div class="grid3" style="margin-bottom:16px">
    <div class="kpi b"><div class="lb">Số dòng bán</div><div class="val">${data.length}</div></div>
    <div class="kpi g"><div class="lb">Tổng SL bán</div><div class="val">${fmt(data.reduce((s,r)=>s+Number(r[2]||0),0))}</div></div>
    <div class="kpi g"><div class="lb">Tổng doanh thu</div><div class="val">${fmt(rev)}đ</div></div></div>`:'';
  const el=document.getElementById('bh-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🛒 Chưa có đơn bán</div>';return;}
  el.innerHTML='<table><thead><tr><th>Sản phẩm</th><th>Giá bán</th><th>SL</th><th>Ngày</th><th>Doanh thu</th><th>Ghi chú</th><th></th></tr></thead><tbody>'+
    [...data].reverse().map((r,i)=>`<tr><td><b>${r[0]}</b></td><td>${fmt(r[1])}đ</td><td>${r[2]}</td><td>${r[3]||''}</td>
    <td><span class="bg bg-g">${fmt(r[4])}đ</span></td><td>${r[5]||''}</td>
    <td><button class="btn btn-d btn-sm" onclick="delBH(${data.length-i+1},'${r[0]}',${Number(r[2]||0)})">Xóa</button></td></tr>`).join('')+'</tbody></table>';
}
function fBH(){
  const q=document.getElementById('q-bh').value.toLowerCase();
  const from=document.getElementById('from-bh').value;
  const to=document.getElementById('to-bh').value;
  const pg=Number(document.getElementById('pg-bh').value);
  let d=[...C.BH];
  if(from)d=d.filter(r=>r[3]>=from);
  if(to)d=d.filter(r=>r[3]<=to);
  if(q)d=d.filter(r=>(r[0]||'').toLowerCase().includes(q));
  if(pg>0)d=d.slice(-pg);
  rBH(d);
}

// ══ THU CHI ══
async function loadTC(){
  document.getElementById('tc-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('ThuChi');C.TC=data;
  mkMonths(data,5,document.getElementById('mf-tc'));rTC(data);
}
function swTC(t,el){tcType=t;document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('on'));el.classList.add('on');fTC();}
function fTC(){const mf=document.getElementById('mf-tc');let d=filterM(C.TC,5,mf);const base=d;if(tcType!=='all')d=d.filter(r=>r[1]===tcType);rTC(d,base);}
function rTC(data,base){
  const b=base||data;
  const thu=b.filter(r=>r[1]==='Thu').reduce((s,r)=>s+Number(r[2]||0),0);
  const chi=b.filter(r=>r[1]==='Chi').reduce((s,r)=>s+Number(r[2]||0),0);
  document.getElementById('tc-kpi').innerHTML=`
    <div class="kpi g"><div class="lb">Tổng thu</div><div class="val">${fmt(thu)}đ</div></div>
    <div class="kpi r"><div class="lb">Tổng chi</div><div class="val">${fmt(chi)}đ</div></div>
    <div class="kpi ${thu-chi>=0?'b':'r'}"><div class="lb">Lãi thực</div><div class="val">${fmt(thu-chi)}đ</div></div>`;
  const el=document.getElementById('tc-tbl');
  if(!data.length){el.innerHTML='<div class="empty">💰 Chưa có giao dịch</div>';return;}
  el.innerHTML='<table><thead><tr><th>Loại</th><th>Số tiền</th><th>Nội dung</th><th>Danh mục</th><th>Ngày</th><th></th></tr></thead><tbody>'+
    [...data].reverse().map((r,i)=>`<tr><td>${r[1]==='Thu'?'<span class="bg bg-g">Thu</span>':'<span class="bg bg-r">Chi</span>'}</td>
    <td><b>${fmt(r[2])}đ</b></td><td>${r[3]||''}</td><td><span class="bg bg-b">${r[4]||''}</span></td><td>${r[5]||''}</td>
    <td><button class="btn btn-d btn-sm" onclick="delRow('ThuChi',${data.length-i+1},'giao dịch')">Xóa</button></td></tr>`).join('')+'</tbody></table>';
}
function openTC(){document.getElementById('tc-ngay').value=td();document.getElementById('tc-st').value='';document.getElementById('tc-nd').value='';om('m-tc');}
async function saveTC(){
  const st=document.getElementById('tc-st').value;const nd=document.getElementById('tc-nd').value.trim();
  if(!st||!nd){toast('Nhập đầy đủ thông tin','err');return;}
  const loai=document.getElementById('tc-loai').value;
  await apiPost({sheet:'ThuChi',action:'append',row:[new Date().toISOString(),loai,st,nd,document.getElementById('tc-dm').value,document.getElementById('tc-ngay').value]});
  toast('Đã ghi '+loai+' '+fmt(st)+'đ');cm('m-tc');setTimeout(loadTC,800);
}

// ══ BÁO CÁO ══
async function loadBC(){
  const[bh,tc,tk]=await Promise.all([apiGet('BanHang'),apiGet('ThuChi'),apiGet('TonKho')]);
  C.BH=bh;C.TC=tc;C.TK=tk;
  mkMonths(bh,3,document.getElementById('mf-bc'));renderBC();
}
function renderBC(){
  const mf=document.getElementById('mf-bc');
  const bh=filterM(C.BH,3,mf);const tc=filterM(C.TC,5,mf);
  const revBan=bh.reduce((s,r)=>s+Number(r[4]||0),0);
  const thu=tc.filter(r=>r[1]==='Thu').reduce((s,r)=>s+Number(r[2]||0),0);
  const chi=tc.filter(r=>r[1]==='Chi').reduce((s,r)=>s+Number(r[2]||0),0);
  let von=0;bh.forEach(r=>{const sp=C.TK.find(t=>t[0]===r[0]);if(sp)von+=Number(r[2]||0)*Number(sp[3]||0);});
  const laiGop=revBan-von;
  const laiRongBC=laiGop+thu-chi;
  document.getElementById('bc-kpi').innerHTML=`
    <div class="kpi g"><div class="lb">Doanh thu bán</div><div class="val">${fmt(revBan)}đ</div></div>
    <div class="kpi p"><div class="lb">Lãi gộp</div><div class="val">${fmt(laiGop)}đ</div></div>
    <div class="kpi r"><div class="lb">Chi phí khác</div><div class="val">${fmt(chi)}đ</div></div>
    <div class="kpi ${laiRongBC>=0?'g':'r'}"><div class="lb">Lãi ròng</div><div class="val">${fmt(laiRongBC)}đ</div></div>`;
  const spMap={};bh.forEach(r=>{if(!spMap[r[0]])spMap[r[0]]={sl:0,rev:0};spMap[r[0]].sl+=Number(r[2]||0);spMap[r[0]].rev+=Number(r[4]||0);});
  const top=Object.entries(spMap).sort((a,b)=>b[1].sl-a[1].sl).slice(0,10);
  const maxV=top[0]?top[0][1].sl:1;
  document.getElementById('bc-top').innerHTML=top.length===0?'<div class="empty">Chưa có dữ liệu</div>':
    '<div class="bar-chart">'+top.map(([n,v])=>`<div class="br"><div class="bl" title="${n}">${n}</div><div class="bt"><div class="bf" style="width:${Math.round(v.sl/maxV*100)}%"></div></div><div class="bv">${v.sl} / ${fmt(v.rev/1000)}k</div></div>`).join('')+'</div>';
  const allM=[...new Set([...C.BH.map(r=>ym(r[3])),...C.TC.map(r=>ym(r[5]))].filter(Boolean))].sort().reverse();
  document.getElementById('bc-month').innerHTML=allM.length===0?'<div class="empty">Chưa có dữ liệu</div>':
    '<table><thead><tr><th>Tháng</th><th>DT bán</th><th>Lãi gộp</th><th>Tổng thu</th><th>Tổng chi</th><th>Lãi ròng</th></tr></thead><tbody>'+
    allM.map(m=>{
      const mbh=C.BH.filter(r=>ym(r[3])===m);
      const mtc=C.TC.filter(r=>ym(r[5])===m);
      const mRev=mbh.reduce((s,r)=>s+Number(r[4]||0),0);
      let mVon=0;mbh.forEach(r=>{const sp=C.TK.find(t=>t[0]===r[0]);if(sp)mVon+=Number(r[2]||0)*Number(sp[3]||0);});
      const mLaiGop=mRev-mVon;
      const mThu=mtc.filter(r=>r[1]==='Thu').reduce((s,r)=>s+Number(r[2]||0),0);
      const mChi=mtc.filter(r=>r[1]==='Chi').reduce((s,r)=>s+Number(r[2]||0),0);
      const mLai=mLaiGop+mThu-mChi;
      return`<tr><td><b>${m}</b></td><td>${fmt(mRev)}đ</td><td><span class="bg bg-p">${fmt(mLaiGop)}đ</span></td>
        <td><span class="bg bg-g">${fmt(mThu)}đ</span></td><td><span class="bg bg-r">${fmt(mChi)}đ</span></td>
        <td><span class="bg ${mLai>=0?'bg-g':'bg-r'}">${fmt(mLai)}đ</span></td></tr>`;
    }).join('')+'</tbody></table>';
}

// ══ LỢI NHUẬN ══
async function loadLN(){
  const[bh,tc,nh]=await Promise.all([apiGet('BanHang'),apiGet('ThuChi'),apiGet('NhapHang')]);
  C.BH=bh;C.TC=tc;C.NH=nh;
  // Tạo danh sách tháng từ tất cả nguồn
  const months=[...new Set([...bh.map(r=>ym(r[3])),...tc.map(r=>ym(r[5]))].filter(Boolean))].sort().reverse();
  const sel=document.getElementById('mf-ln');
  const cur=sel.value;
  sel.innerHTML='<option value="">Chọn tháng...</option>'+months.map(m=>`<option value="${m}"${m===cur?' selected':''}>${m}</option>`).join('');
  if(cur)renderLN();
}
async function renderLN(){
  const m=document.getElementById('mf-ln').value;
  if(!m){document.getElementById('ln-content').innerHTML='<div class="empty">👆 Chọn tháng để tính lợi nhuận</div>';return;}
  if(!C.USER.length)C.USER=await apiGet('User');
  const mbh=C.BH.filter(r=>ym(r[3])===m);
  const mtc=C.TC.filter(r=>ym(r[5])===m);
  const mnh=C.NH.filter(r=>ym(r[4])===m);
  const revBan=mbh.reduce((s,r)=>s+Number(r[4]||0),0);
  const thu=mtc.filter(r=>r[1]==='Thu').reduce((s,r)=>s+Number(r[2]||0),0);
  const chi=mtc.filter(r=>r[1]==='Chi').reduce((s,r)=>s+Number(r[2]||0),0);
  // Tổng tiền vốn nhập trong tháng
  const tongVonNhap=mnh.reduce((s,r)=>s+Number(r[1]||0)*Number(r[2]||0),0);
  // Lãi ròng = Tổng doanh thu - Tổng tiền vốn nhập + thu khác - chi khác
  const laiRong=revBan-tongVonNhap+thu-chi;
  const laiMoiNguoi=laiRong/2;
  // Tính tiền nhập theo từng người
  const users=C.USER.length>0?C.USER.map(r=>r[0]):['Người 1','Người 2'];
  const nhapTheoNguoi={};
  users.forEach(u=>{nhapTheoNguoi[u]=0;});
  mnh.forEach(r=>{
    const u=r[6]||'';
    if(nhapTheoNguoi[u]!==undefined)nhapTheoNguoi[u]+=Number(r[1]||0)*Number(r[2]||0);
  });
  const tongNhap=Object.values(nhapTheoNguoi).reduce((s,v)=>s+v,0);
  document.getElementById('ln-content').innerHTML=`
    <div class="profit-card">
      <div class="pc-title">Lợi nhuận tháng ${m}</div>
      <div class="pc-val">${fmt(laiRong)}đ</div>
      <div style="display:flex;gap:20px;margin-top:10px;flex-wrap:wrap">
        <span style="font-size:12px;color:#94a3b8">Doanh thu bán: <b style="color:#fff">${fmt(revBan)}đ</b></span>
        <span style="font-size:12px;color:#94a3b8">Tổng vốn nhập: <b style="color:#f87171">${fmt(tongVonNhap)}đ</b></span>
        <span style="font-size:12px;color:#94a3b8">Thu khác: <b style="color:#6ee7b7">${fmt(thu)}đ</b></span>
        <span style="font-size:12px;color:#94a3b8">Chi khác: <b style="color:#f87171">${fmt(chi)}đ</b></span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
      ${users.map(u=>{
        const tienNhap=nhapTheoNguoi[u]||0;
        const tongChuyen=laiMoiNguoi+tienNhap;
        return`<div class="profit-person">
          <div class="pp-name">👤 ${u}</div>
          <div class="pp-row"><span>Lãi ròng ÷ 2</span><span style="color:var(--green);font-weight:500">${fmt(laiMoiNguoi)}đ</span></div>
          <div class="pp-row"><span>Tiền đã nhập hàng tháng ${m}</span><span style="color:var(--blue);font-weight:500">${fmt(tienNhap)}đ</span></div>
          <div class="pp-total"><span>Cần chuyển cho ${u}</span><span>${fmt(tongChuyen)}đ</span></div>
        </div>`;
      }).join('')}
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:14px;font-size:12px;color:var(--text2)">
      <b>Công thức:</b> Lãi ròng = Doanh thu bán - Tổng vốn nhập + Thu khác - Chi khác<br>
      Tiền chuyển = Lãi ròng ÷ 2 + Tiền người đó đã bỏ ra nhập hàng trong tháng
    </div>`;
}

// ══ NHÀ CUNG CẤP ══
async function loadNCC(){
  document.getElementById('ncc-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('NhaCungCap');C.NCC=data;rNCC(data);
}
function rNCC(data){
  const el=document.getElementById('ncc-tbl');
  if(!data.length){el.innerHTML='<div class="empty">🚚 Chưa có NCC</div>';return;}
  el.innerHTML='<table><thead><tr><th>Tên NCC</th><th>SĐT</th><th>Mặt hàng</th><th>Địa chỉ</th><th>Ghi chú</th><th></th></tr></thead><tbody>'+
    data.map((r,i)=>`<tr><td><b>${r[0]}</b></td><td>${r[1]||''}</td><td>${r[2]||''}</td><td>${r[3]||''}</td><td>${r[4]||''}</td>
    <td style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editNCC(${i+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('NhaCungCap',${i+2},'NCC')">Xóa</button></td></tr>`).join('')+'</tbody></table>';
}
function fNCC(){const q=document.getElementById('q-ncc').value.toLowerCase();rNCC(C.NCC.filter(r=>(r[0]||'').toLowerCase().includes(q)));}
function initNCC(){document.getElementById('m-ncc-t').textContent='Thêm NCC';['ncc-ten','ncc-sdt','ncc-mh','ncc-dc','ncc-gc'].forEach(id=>document.getElementById(id).value='');document.getElementById('ncc-row').value='';om('m-ncc');}
function editNCC(row){const r=C.NCC[row-2];document.getElementById('m-ncc-t').textContent='Sửa NCC';document.getElementById('ncc-ten').value=r[0]||'';document.getElementById('ncc-sdt').value=r[1]||'';document.getElementById('ncc-mh').value=r[2]||'';document.getElementById('ncc-dc').value=r[3]||'';document.getElementById('ncc-gc').value=r[4]||'';document.getElementById('ncc-row').value=row;om('m-ncc');}
async function saveNCC(){
  const ten=document.getElementById('ncc-ten').value.trim();if(!ten){toast('Nhập tên NCC','err');return;}
  const row=[ten,document.getElementById('ncc-sdt').value,document.getElementById('ncc-mh').value,document.getElementById('ncc-dc').value,document.getElementById('ncc-gc').value];
  const er=document.getElementById('ncc-row').value;
  await apiPost(er?{sheet:'NhaCungCap',action:'update',row:Number(er),data:row}:{sheet:'NhaCungCap',action:'append',row});
  toast(er?'Đã cập nhật NCC':'Đã thêm NCC');cm('m-ncc');setTimeout(loadNCC,800);
}

// ══ NGƯỜI DÙNG ══
async function loadUser(){
  document.getElementById('user-tbl').innerHTML='<div class="ld"><div class="spin"></div></div>';
  const data=await apiGet('User');C.USER=data;rUser(data);
}
function rUser(data){
  const el=document.getElementById('user-tbl');
  if(!data.length){el.innerHTML='<div class="empty">👤 Chưa có người dùng nào</div>';return;}
  el.innerHTML='<table><thead><tr><th>Họ tên</th><th>SĐT</th><th>Vai trò</th><th>Ghi chú</th><th></th></tr></thead><tbody>'+
    data.map((r,i)=>`<tr><td><b>${r[0]}</b></td><td>${r[1]||''}</td><td>${r[2]?`<span class="bg bg-p">${r[2]}</span>`:''}</td><td>${r[3]||''}</td>
    <td style="display:flex;gap:4px"><button class="btn btn-g btn-sm" onclick="editUser(${i+2})">Sửa</button><button class="btn btn-d btn-sm" onclick="delRow('User',${i+2},'người dùng')">Xóa</button></td></tr>`).join('')+'</tbody></table>';
}
function initUser(){document.getElementById('m-user-t').textContent='Thêm người dùng';['user-ten','user-sdt','user-vaitro','user-gc'].forEach(id=>document.getElementById(id).value='');document.getElementById('user-row').value='';om('m-user');}
function editUser(row){const r=C.USER[row-2];document.getElementById('m-user-t').textContent='Sửa người dùng';document.getElementById('user-ten').value=r[0]||'';document.getElementById('user-sdt').value=r[1]||'';document.getElementById('user-vaitro').value=r[2]||'';document.getElementById('user-gc').value=r[3]||'';document.getElementById('user-row').value=row;om('m-user');}
async function saveUser(){
  const ten=document.getElementById('user-ten').value.trim();if(!ten){toast('Nhập tên người dùng','err');return;}
  const row=[ten,document.getElementById('user-sdt').value,document.getElementById('user-vaitro').value,document.getElementById('user-gc').value];
  const er=document.getElementById('user-row').value;
  await apiPost(er?{sheet:'User',action:'update',row:Number(er),data:row}:{sheet:'User',action:'append',row});
  toast(er?'Đã cập nhật':'Đã thêm người dùng');cm('m-user');setTimeout(loadUser,800);
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
    toast('Đã xóa & cập nhật tồn kho!');setTimeout(loadNH,800);
  });
}

// ══ XÓA BÁN HÀNG → cộng lại tồn kho ══
async function delBH(row,tenSP,sl){
  confirmDel(`Xóa đơn bán "${tenSP}" (${sl} ${''})? Tồn kho sẽ được hoàn lại ${sl}.`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet:'BanHang',action:'delete',row:Number(row)});
    // Cộng lại tồn kho
    const spIdx=C.TK.findIndex(r=>r[0]===tenSP);
    if(spIdx>=0){
      const newSL=Number(C.TK[spIdx][1]||0)+sl;
      const upd=[...C.TK[spIdx]];upd[1]=newSL;
      await apiPost({sheet:'TonKho',action:'update',row:spIdx+2,data:upd});
      C.TK[spIdx][1]=newSL;
    }
    toast('Đã xóa & hoàn tồn kho!');setTimeout(loadBH,800);
  });
}

// ══ XÓA CHUNG (cho các module khác) ══
async function delRow(sheet,row,label){
  confirmDel(`Xóa ${label} này?`,async()=>{
    toast('Đang xóa...');
    await apiPost({sheet,action:'delete',row:Number(row)});
    toast('Đã xóa!');
    setTimeout(()=>{
      if(sheet==='ThuChi')loadTC();
      else if(sheet==='NhaCungCap')loadNCC();
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
      // Khởi tạo data nếu chưa có
      const snap=await db.ref('_initialized').once('value');
      if(!snap.val()){
        toast('Đang khởi tạo dữ liệu...');
        const init=[['Bim',110,'gói',3000,5000,'','',10,''],['Moon',42,'hộp',8000,12000,'','',10,''],['BaoNgoc',9,'gói',5000,8000,'','',10,''],['Fami',6,'gói',4000,6000,'','',10,''],['LuongKho',20,'gói',15000,22000,'','',10,''],['Pina',12,'hộp',10000,15000,'','',10,''],['Sua',47,'hộp',12000,18000,'','',10,''],['Nabati',9,'gói',8000,12000,'','',10,''],['Tra',81,'chai',5000,8000,'','',10,''],['Nutri',45,'hộp',15000,22000,'','',10,''],['G',60,'chai',8000,12000,'','',10,''],['Orio',8,'gói',10000,15000,'','',10,''],['XX',69,'chai',7000,10000,'','',10,''],['Kokomi',25,'gói',5000,8000,'','',10,''],['Morden',26,'gói',20000,30000,'','',10,''],['Omachi',68,'gói',6000,9000,'','',10,''],['Haohao',3,'gói',5000,8000,'','',10,''],['Cafe',33,'gói',15000,22000,'','',10,''],['BH',79,'hộp',25000,38000,'','',10,''],['Staff',5,'gói',30000,45000,'','',10,''],['HoaCuc',2,'hộp',20000,30000,'','',10,''],['Probi',65,'hộp',18000,28000,'','',10,'']];
        for(const r of init)await apiPost({sheet:'TonKho',action:'append',row:r});
        await db.ref('_initialized').set(true);
        toast('Khởi tạo xong!');
      }
      loadDash();
    } else {
      // Chưa đăng nhập → hiện login
      document.getElementById('login-screen').style.display='flex';
      document.getElementById('sb').style.display='none';
      document.getElementById('main').style.display='none';
    }
  });
})();
