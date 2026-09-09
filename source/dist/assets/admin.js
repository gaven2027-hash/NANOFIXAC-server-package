const KEY='nanofix_cms';
const LEADS='nanofix_leads';
const REVIEWS='nanofix_reviews';
const FAQS='nanofix_faqs';
const SERVICES='nanofix_services';
const SETTINGS='nanofix_settings';
const CLOUD=window.NANOFIX_SUPABASE||{};
const SESSION='nanofix_admin_session';
let authSession=null;
const pages=[['/','Homepage'],['/services/','Services overview'],['/services/high-temperature-steam-chemical-cleaning/','Steam chemical cleaning'],['/services/steam-vs-standard-aircon-cleaning/','Steam vs standard'],['/services/why-steam-chemical-cleaning/','Why steam cleaning'],['/services/pricing-packages/','Pricing & packages'],['/faq-reviews/','FAQ & reviews'],['/faq-reviews/aircon-cleaning-faq/','Aircon cleaning FAQ'],['/faq-reviews/customer-reviews/','Customer reviews'],['/faq-reviews/before-after/','Before & after'],['/contact/','Contact'],['/privacy/','Privacy'],['/terms/','Terms']];
const media=['hero-nanofixac-steam.webp','hero-services.webp','hero-faq-reviews.webp','hero-contact.webp','chemical-pre-treatment.webp','chemical-steam-process.webp','in-situ-steam-cleaning.webp','steam-vs-standard.webp','steam-coil-cleaning.webp','case-coil-before-after.webp','case-drainage-cleaning.webp','case-in-situ-steam-cleaning.webp','commercial-steam-cleaning.webp','protected-workflow.webp','post-clean-inspection.webp','pricing-consultation.webp','faq-knowledge.webp'];
const seedServices=[['High-temperature steam chemical cleaning','Chemical treatment, controlled steam and contained rinsing for accessible internal components.','/services/high-temperature-steam-chemical-cleaning/'],['Steam vs standard cleaning','Compare cleaning depth, component scope, suitability, working time and price.','/services/steam-vs-standard-aircon-cleaning/'],['Why choose steam cleaning','Hygiene-focused, in-situ deep cleaning with less dismantling where suitable.','/services/why-steam-chemical-cleaning/'],['Pricing & packages','Clear quotations based on unit type, quantity, condition and access.','/services/pricing-packages/']];
const seedFaq=[['Must the indoor unit or blower wheel be removed?','No. This service keeps the indoor unit mounted and the blower wheel in place. Filters, covers and accessible panels are removed only as needed.'],['How does steam help sanitise and remove odour?','Controlled steam treats accessible surfaces directly. With suitable heat and contact time, it helps reduce bacteria, mould contamination and odour sources.'],['Will cleaning affect the manufacturer warranty?','The process is designed to avoid altering sealed refrigeration and electrical systems. Warranty terms vary by brand and model, so check the manufacturer conditions.'],['Is this suitable for condo and landed homes in Singapore?','Yes. We confirm access, furniture protection, MCST or estate requirements and the appropriate aircon chemical wash scope before booking.'],['How is the price calculated?','Price depends on unit type, quantity, access, condition, dismantling required and whether additional components are included.']];
const seedReviews=['Bukit Timah condo — the aircon chemical wash reduced a stubborn musty smell and the airflow felt cleaner.','Sentosa Cove landed home — the high-temperature steam clean was neat, well protected and easy to book on WhatsApp.','Orchard residence — our condo aircon cleaning was explained clearly, with the blower wheel cleaned in place.'];
const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const set=(key,value)=>{
  localStorage.setItem(key,JSON.stringify(value));
  if(authSession){
    const routes={[SERVICES]:'/_cms/services',[FAQS]:'/_cms/faqs',[REVIEWS]:'/_cms/reviews'};
    if(routes[key])queueMicrotask(()=>saveContent(routes[key],'en',{content:{items:value}}).catch(()=>{}));
  }
};
let cms=get(KEY,{}), leads=get(LEADS,[]), reviews=get(REVIEWS,seedReviews), faqs=get(FAQS,seedFaq), services=get(SERVICES,seedServices), selectedPage=pages[0][0], selectedLocale='en';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
async function api(path,{method='GET',body,prefer}={}){
  if(!CLOUD.url||!CLOUD.publishableKey)throw new Error('Supabase configuration is missing.');
  const headers={apikey:CLOUD.publishableKey};
  if(authSession?.access_token)headers.Authorization=`Bearer ${authSession.access_token}`;
  if(body!==undefined)headers['Content-Type']='application/json';
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(`${CLOUD.url}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok){const info=await response.json().catch(()=>({}));throw new Error(info.message||info.error_description||`Request failed (${response.status})`)}
  if(response.status===204)return null;
  const text=await response.text();return text?JSON.parse(text):null;
}
async function signIn(email,password){
  const response=await fetch(`${CLOUD.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:CLOUD.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const session=await response.json();if(!response.ok)throw new Error(session.error_description||session.msg||'Sign-in failed.');
  authSession=session;
  const user=await api('/auth/v1/user');
  const profiles=await api(`/rest/v1/profiles?select=email,role,is_active&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  const profile=profiles?.[0];
  if(!profile?.is_active||!['super_admin','operations_admin','support','content_admin'].includes(profile.role)){authSession=null;throw new Error('This account is not authorised for the NANOFIX website admin.');}
  sessionStorage.setItem(SESSION,JSON.stringify(session));
  return profile;
}
async function loadCloudData(){
  const [remoteLeads,contentRows]=await Promise.all([
    api('/rest/v1/aircon_site_enquiries?select=*&order=created_at.desc&limit=200'),
    api('/rest/v1/aircon_site_content?select=*')
  ]);
  leads=(remoteLeads||[]).map(x=>({...x,id:x.enquiry_id,createdAt:x.created_at}));set(LEADS,leads);
  for(const row of contentRows||[]){cms[`${row.locale}:${row.route}`]={heroTitle:row.hero_title||'',heroLead:row.hero_lead||'',metaDescription:row.meta_description||'',imageUrl:row.image_url||'',status:row.status,content:row.content||{}};}
  set(KEY,cms);
  const serviceRow=contentRows?.find(x=>x.route==='/_cms/services');if(serviceRow?.content?.items){services=serviceRow.content.items;set(SERVICES,services)}
  const faqRow=contentRows?.find(x=>x.route==='/_cms/faqs');if(faqRow?.content?.items){faqs=faqRow.content.items;set(FAQS,faqs)}
  const reviewRow=contentRows?.find(x=>x.route==='/_cms/reviews');if(reviewRow?.content?.items){reviews=reviewRow.content.items;set(REVIEWS,reviews)}
}
async function saveContent(route,locale,fields){
  return api('/rest/v1/aircon_site_content?on_conflict=route,locale',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{route,locale,status:'published',updated_at:new Date().toISOString(),updated_by:authSession.user?.id||null,...fields}});
}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),2600)}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function tab(name){$$('.side-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab').forEach(x=>x.classList.toggle('active',x.id===`tab-${name}`));window.scrollTo(0,0);const label=$(`.side-nav button[data-tab="${name}"]`)?.textContent?.trim()||'Dashboard';$('#top-title').textContent=label; if(name==='dashboard')renderDashboard(); if(name==='pages')renderPages(); if(name==='services')renderServices();if(name==='faq')renderFaq();if(name==='media')renderMedia();if(name==='leads')renderLeads()}
function renderDashboard(){leads=get(LEADS,[]);$('#stat-leads').textContent=leads.length;$('#stat-new').textContent=leads.filter(x=>x.status==='new').length;$('#recent-leads').innerHTML=leads.slice(0,4).map(l=>`<div class="list-item"><div><h3>${esc(l.name||'Unnamed enquiry')}</h3><p>${esc(l.property_type||'Property')} · ${esc(l.unit_count||1)} unit(s) · ${new Date(l.createdAt).toLocaleString('en-SG')}</p></div><span class="status ${esc(l.status||'new')}">${esc(l.status||'new')}</span></div>`).join('')||'<div class="empty">No enquiries captured yet.</div>'}
function renderPages(){const list=$('#page-list');list.innerHTML=pages.map(p=>`<button class="${p[0]===selectedPage?'active':''}" data-page="${esc(p[0])}">${esc(p[1])}<br><span class="helper">${esc(p[0])}</span></button>`).join('');$$('[data-page]').forEach(b=>b.onclick=()=>{selectedPage=b.dataset.page;renderPages();loadPageEditor()});loadPageEditor()}
function loadPageEditor(){const p=pages.find(x=>x[0]===selectedPage)||pages[0], val=cms[`${selectedLocale}:${selectedPage}`]||cms[selectedPage]||{};$('#editor-title').textContent=`${p[1]} · ${selectedLocale==='zh'?'中文':'EN-SG'}`;$('#editor-route').textContent=p[0];const form=$('#page-form');form.heroTitle.value=val.heroTitle||'';form.heroLead.value=val.heroLead||'';form.metaDescription.value=val.metaDescription||''}
function renderServices(){services=get(SERVICES,seedServices);$('#service-list').innerHTML=services.map((s,i)=>`<div class="list-item"><div><h3>${esc(s[0])}</h3><p>${esc(s[1])}<br><span class="helper">${esc(s[2])}</span></p></div><div class="list-actions"><button class="btn ghost small" data-edit-service="${i}">Edit</button><button class="btn danger small" data-delete-service="${i}">Delete</button></div></div>`).join('')||'<div class="empty">No services yet.</div>';$$('[data-edit-service]').forEach(b=>b.onclick=()=>editService(+b.dataset.editService));$$('[data-delete-service]').forEach(b=>b.onclick=()=>{services.splice(+b.dataset.deleteService,1);set(SERVICES,services);renderServices();toast('Service removed')})}
function editService(index){const old=services[index]||['','',''];const title=prompt('Service title',old[0]);if(title===null)return;const desc=prompt('Short description',old[1])??old[1];const url=prompt('Page path',old[2])??old[2];if(index<0)services.push([title,desc,url]);else services[index]=[title,desc,url];set(SERVICES,services);saveContent('/_cms/services','en',{content:{items:services}}).then(()=>toast('Service saved to Supabase')).catch(e=>toast(e.message));renderServices()}
function renderFaq(){faqs=get(FAQS,seedFaq);reviews=get(REVIEWS,seedReviews);$('#faq-list').innerHTML=faqs.map((f,i)=>`<div class="list-item"><div><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></div><div class="list-actions"><button class="btn ghost small" data-edit-faq="${i}">Edit</button><button class="btn danger small" data-delete-faq="${i}">Delete</button></div></div>`).join('');$('#review-list').innerHTML=reviews.map((r,i)=>`<div class="list-item"><div><h3>Draft ${String(i+1).padStart(2,'0')}</h3><p>${esc(r)}</p></div><div class="list-actions"><button class="btn ghost small" data-edit-review="${i}">Edit</button><button class="btn danger small" data-delete-review="${i}">Delete</button></div></div>`).join('');$$('[data-edit-faq]').forEach(b=>b.onclick=()=>editFaq(+b.dataset.editFaq));$$('[data-delete-faq]').forEach(b=>b.onclick=()=>{faqs.splice(+b.dataset.deleteFaq,1);set(FAQS,faqs);renderFaq();toast('FAQ removed')});$$('[data-edit-review]').forEach(b=>b.onclick=()=>editReview(+b.dataset.editReview));$$('[data-delete-review]').forEach(b=>b.onclick=()=>{reviews.splice(+b.dataset.deleteReview,1);set(REVIEWS,reviews);renderFaq();toast('Review removed')})}
function editFaq(index){const old=faqs[index]||['',''];const q=prompt('Question',old[0]);if(q===null)return;const a=prompt('Answer',old[1])??old[1];if(index<0)faqs.push([q,a]);else faqs[index]=[q,a];set(FAQS,faqs);saveContent('/_cms/faqs','en',{content:{items:faqs}}).then(()=>toast('FAQ saved to Supabase')).catch(e=>toast(e.message));renderFaq()}
function editReview(index){const old=reviews[index]||'';const value=prompt('Customer-approved review copy',old);if(value===null)return;if(index<0)reviews.push(value);else reviews[index]=value;set(REVIEWS,reviews);saveContent('/_cms/reviews','en',{content:{items:reviews}}).then(()=>toast('Review saved to Supabase')).catch(e=>toast(e.message));renderFaq()}
function renderMedia(){$('#media-grid').innerHTML=media.map(file=>`<article class="media-card"><img src="/assets/images/${file}" alt="${esc(file)}" loading="lazy"><div><strong>${esc(file)}</strong><small>Generated site asset · WebP</small></div></article>`).join('')}
function renderLeads(){leads=get(LEADS,[]);const q=($('#lead-search')?.value||'').toLowerCase(), filter=$('#lead-filter')?.value||'all';const rows=leads.filter(l=>(filter==='all'||l.status===filter)&&(!q||JSON.stringify(l).toLowerCase().includes(q)));$('#lead-table').innerHTML=rows.map(l=>`<tr><td><strong>${esc(l.name||'Unnamed')}</strong><br><span class="helper">${esc(l.mobile||'')}<br>${new Date(l.createdAt).toLocaleString('en-SG')}<br>${esc(l.id||'')}</span></td><td>${esc(l.property_type||'')}<br>${esc(l.postal_code||'')}</td><td>${esc(l.unit_count||1)} unit(s)<br>${esc(l.preferred_date||'Flexible')}<br><span class="helper">${esc(l.details||'')}</span></td><td><select data-status="${esc(l.id)}"><option value="new" ${l.status==='new'?'selected':''}>New</option><option value="contacted" ${l.status==='contacted'?'selected':''}>Contacted</option><option value="quoted" ${l.status==='quoted'?'selected':''}>Quoted</option><option value="closed" ${l.status==='closed'?'selected':''}>Closed</option><option value="spam" ${l.status==='spam'?'selected':''}>Spam</option></select></td><td><div class="list-actions"><a class="btn small" href="https://wa.me/${String(l.mobile||'').replace(/\D/g,'')}" target="_blank" rel="noopener">WhatsApp</a><a class="btn ghost small" href="mailto:nanofixac@gmail.com?subject=${encodeURIComponent('NANOFIX enquiry '+(l.id||''))}">Email</a><button class="btn danger small" data-delete-lead="${esc(l.id)}">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No enquiries match this view.</td></tr>';$$('[data-status]').forEach(s=>s.onchange=()=>{const l=leads.find(x=>x.id===s.dataset.status);if(l){l.status=s.value;set(LEADS,leads);renderLeads();renderDashboard();toast('Lead status updated')}});$$('[data-delete-lead]').forEach(b=>b.onclick=()=>{leads=leads.filter(x=>x.id!==b.dataset.deleteLead);set(LEADS,leads);renderLeads();renderDashboard();toast('Enquiry deleted')})}
function exportData(){const payload={cms,leads:get(LEADS,[]),faqs:get(FAQS,seedFaq),reviews:get(REVIEWS,seedReviews),services:get(SERVICES,seedServices),settings:get(SETTINGS,{})};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`nanofix-workspace-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('JSON backup downloaded')}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{const p=JSON.parse(reader.result);if(p.cms)set(KEY,p.cms);if(p.leads)set(LEADS,p.leads);if(p.faqs)set(FAQS,p.faqs);if(p.reviews)set(REVIEWS,p.reviews);if(p.services)set(SERVICES,p.services);if(p.settings)set(SETTINGS,p.settings);cms=get(KEY,{});leads=get(LEADS,[]);faqs=get(FAQS,seedFaq);reviews=get(REVIEWS,seedReviews);services=get(SERVICES,seedServices);renderDashboard();toast('Workspace imported')}catch{toast('Import failed: invalid JSON')}};reader.readAsText(file)}
$$('.side-nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$$('[data-jump]').forEach(b=>b.onclick=()=>tab(b.dataset.jump));$('#page-form').onsubmit=e=>{e.preventDefault();cms[selectedPage]={heroTitle:e.target.heroTitle.value.trim(),heroLead:e.target.heroLead.value.trim(),metaDescription:e.target.metaDescription.value.trim()};set(KEY,cms);toast('Page override saved')};$('#lead-search').oninput=renderLeads;$('#lead-filter').onchange=renderLeads;$$('[data-action="export"]').forEach(b=>b.onclick=exportData);$('[data-action="import"]').onclick=()=>$('#import-file').click();$('#import-file').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);$('[data-action="add-service"]').onclick=()=>editService(-1);$('[data-action="add-faq"]').onclick=()=>editFaq(-1);$('[data-action="add-review"]').onclick=()=>editReview(-1);$('[data-action="clear-leads"]').onclick=()=>{if(confirm('Delete all captured enquiries from this browser?')){set(LEADS,[]);renderLeads();renderDashboard();toast('Inbox cleared')}};$('[data-action="save-settings"]').onclick=()=>{const obj={};$$('[data-setting]').forEach(x=>obj[x.dataset.setting]=x.value);set(SETTINGS,obj);toast('Business settings saved')};renderDashboard();

$('#page-form').addEventListener('submit',event=>{
  const form=event.currentTarget;
  const value={heroTitle:form.heroTitle.value.trim(),heroLead:form.heroLead.value.trim(),metaDescription:form.metaDescription.value.trim(),status:'published'};
  cms[`${selectedLocale}:${selectedPage}`]=value;set(KEY,cms);
  saveContent(selectedPage,selectedLocale,{hero_title:value.heroTitle||null,hero_lead:value.heroLead||null,meta_description:value.metaDescription||null,status:'published'})
    .then(()=>toast('Page published to Supabase')).catch(error=>toast(error.message));
});

document.addEventListener('change',event=>{
  const control=event.target.closest('[data-status]');if(!control||!authSession)return;
  api(`/rest/v1/aircon_site_enquiries?enquiry_id=eq.${encodeURIComponent(control.dataset.status)}`,{method:'PATCH',prefer:'return=minimal',body:{status:control.value,updated_at:new Date().toISOString()}}).catch(error=>toast(error.message));
});
document.addEventListener('click',event=>{
  const reply=event.target.closest('a[href^="https://wa.me/"],a[href^="mailto:nanofixac@gmail.com"]');
  if(reply&&authSession){
    const id=reply.closest('tr')?.querySelector('[data-delete-lead]')?.dataset.deleteLead;
    const lead=leads.find(x=>x.id===id);
    if(reply.href.startsWith('mailto:')){
      event.preventDefault();
      if(!lead?.email){toast('This customer did not provide an email address.');return;}
      window.location.href=`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent('Your NANOFIX aircon cleaning enquiry')}`;
    }
    if(lead){lead.status='contacted';lead.replied_at=new Date().toISOString();lead.reply_channel=reply.href.startsWith('mailto:')?'email':'whatsapp';set(LEADS,leads);api(`/rest/v1/aircon_site_enquiries?enquiry_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'contacted',replied_at:lead.replied_at,reply_channel:lead.reply_channel,updated_at:lead.replied_at}}).catch(error=>toast(error.message));}
  }
  const button=event.target.closest('[data-delete-lead]');if(!button||!authSession)return;
  api(`/rest/v1/aircon_site_enquiries?enquiry_id=eq.${encodeURIComponent(button.dataset.deleteLead)}`,{method:'DELETE',prefer:'return=minimal'}).catch(error=>toast(error.message));
});

async function unlock(profile){
  await loadCloudData();
  $('#admin-auth').classList.add('hidden');$('.admin-shell').classList.remove('hidden');
  $('#admin-identity').textContent=`${profile.email} · ${profile.role.replaceAll('_',' ')}`;
  renderDashboard();
}
async function validateSavedSession(){
  try{
    authSession=JSON.parse(sessionStorage.getItem(SESSION)||'null');if(!authSession?.access_token)return;
    const user=await api('/auth/v1/user');
    const profiles=await api(`/rest/v1/profiles?select=email,role,is_active&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
    const profile=profiles?.[0];if(!profile?.is_active)throw new Error('Session is not authorised.');await unlock(profile);
  }catch{authSession=null;sessionStorage.removeItem(SESSION)}
}
$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const message=$('#auth-message');message.textContent='Signing in…';
  try{const profile=await signIn(event.currentTarget.email.value.trim(),event.currentTarget.password.value);await unlock(profile);message.textContent='';event.currentTarget.password.value='';}
  catch(error){message.textContent=error.message;authSession=null;sessionStorage.removeItem(SESSION)}
});
$('#sign-out').addEventListener('click',async()=>{
  try{await api('/auth/v1/logout',{method:'POST'})}catch{}
  authSession=null;sessionStorage.removeItem(SESSION);$('.admin-shell').classList.add('hidden');$('#admin-auth').classList.remove('hidden');
});
document.addEventListener('click',async event=>{
  if(!event.target.closest('[data-action="clear-leads"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  try{await loadCloudData();renderLeads();renderDashboard();toast('Supabase inbox refreshed')}catch(error){toast(error.message)}
},true);
$('#editor-locale').addEventListener('change',event=>{selectedLocale=event.target.value;loadPageEditor()});
validateSavedSession();

// Keep the admin workspace bilingual at all times: English first, Chinese second.
// Text is applied to both the static shell and dynamically rendered panels/toasts.
const ADMIN_BILINGUAL={
  'SECURE ADMIN ACCESS':'SECURE ADMIN ACCESS / 安全后台','Sign in to manage the website':'Sign in to manage the website / 登录管理网站','Use your authorised NANOFIX administrator account.':'Use your authorised NANOFIX administrator account. / 请使用已授权的 NANOFIX 管理员账号。','Email':'Email / 邮箱','Password':'Password / 密码','Sign in':'Sign in / 登录','Signing in…':'Signing in… / 正在登录…','← Back to website':'← Back to website / 返回网站','ADMIN WORKSPACE':'ADMIN WORKSPACE / 管理后台','Workspace':'Workspace / 工作区','Dashboard':'Dashboard / 控制面板','Page content':'Page content / 页面内容','Services':'Services / 服务项目','FAQ & reviews':'FAQ & reviews / 常见问题与评论','Media library':'Media library / 媒体库','Form inbox':'Form inbox / 表单收件箱','Settings':'Settings / 设置','Public website':'Public website / 网站前台','Open nanofixac.com ↗':'Open nanofixac.com ↗ / 打开 nanofixac.com ↗','Supabase connected':'Supabase connected / Supabase 已连接','Sign out':'Sign out / 退出登录','Manage content, enquiries and publishing-ready updates':'Manage content, enquiries and publishing-ready updates / 管理内容、询盘和可发布更新','Good afternoon':'Good afternoon / 下午好','A focused control centre for Singapore high-temperature steam aircon cleaning.':'A focused control centre for Singapore high-temperature steam aircon cleaning. / 新加坡高温蒸汽空调清洗的集中管理中心。','Total enquiries':'Total enquiries / 询盘总数','New to follow up':'New to follow up / 待跟进','Published pages':'Published pages / 已发布页面','Review drafts':'Review drafts / 评论草稿','Recent enquiries':'Recent enquiries / 最新询盘','View inbox':'View inbox / 查看收件箱','Quick actions':'Quick actions / 快捷操作','Edit homepage hero':'Edit homepage hero / 编辑首页主视觉','Update headline, intro and SEO description':'Update headline, intro and SEO description / 更新标题、简介和 SEO 描述','Review FAQ content':'Review FAQ content / 检查常见问题内容','Manage search-ready questions and answers':'Manage search-ready questions and answers / 管理适合搜索的问题与答案','Export workspace data':'Export workspace data / 导出工作区数据','Download a JSON backup of local changes':'Download a JSON backup of local changes / 下载本地修改的 JSON 备份','Open':'Open / 打开','Export':'Export / 导出','CMS':'CMS / 内容管理系统','Edit supported SEO and hero fields. Publish English or Chinese hero and SEO fields directly to Supabase.':'Edit supported SEO and hero fields. Publish English or Chinese hero and SEO fields directly to Supabase. / 编辑支持的 SEO 和主视觉字段，直接向 Supabase 发布英文或中文内容。','How this works':'How this works / 使用说明','Choose a language, save the page and refresh the public page to view the published Supabase content.':'Choose a language, save the page and refresh the public page to view the published Supabase content. / 选择语言并保存页面，然后刷新网站前台查看已发布的 Supabase 内容。','Pages':'Pages / 页面','Homepage':'Homepage / 首页','Page language':'Page language / 页面语言','Hero title':'Hero title / 主视觉标题','Hero introduction':'Hero introduction / 主视觉简介','Meta description':'Meta description / Meta 描述','Keep the existing title if blank':'Keep the existing title if blank / 留空则保留现有标题','Short, customer-facing introduction':'Short, customer-facing introduction / 面向客户的简短简介','SEO description, ideally under 160 characters':'SEO description, ideally under 160 characters / SEO 描述，建议不超过 160 个字符','Save page override':'Save page override / 保存页面覆盖内容','Content library':'Content library / 内容库','Maintain the four core cleaning service pages and their customer-facing summaries.':'Maintain the four core cleaning service pages and their customer-facing summaries. / 维护四个核心清洗服务页面及其客户简介。','Service catalogue':'Service catalogue / 服务目录','Add service':'Add service / 添加服务','Search & AEO':'Search & AEO / 搜索与 AEO','Keep answers clear, evidence-aware and aligned with Singapore aircon cleaning searches.':'Keep answers clear, evidence-aware and aligned with Singapore aircon cleaning searches. / 保持答案清晰、有依据，并符合新加坡空调清洗搜索需求。','FAQ knowledge base':'FAQ knowledge base / 常见问题知识库','Add FAQ':'Add FAQ / 添加常见问题','Customer reviews':'Customer reviews / 客户评论','Add review':'Add review / 添加评论','Approval reminder':'Approval reminder / 审核提醒','Draft review copy is for layout and SEO planning only. Publish only customer-approved, traceable feedback.':'Draft review copy is for layout and SEO planning only. Publish only customer-approved, traceable feedback. / 评论草稿仅用于布局和 SEO 规划；只能发布经客户批准且可追溯的反馈。','Visual assets':'Visual assets / 视觉素材','Review the generated, high-resolution scene assets used across the cleaning pages.':'Review the generated, high-resolution scene assets used across the cleaning pages. / 查看清洗页面使用的高分辨率场景素材。','Customer enquiries':'Customer enquiries / 客户询盘','View, qualify and reply to enquiries securely stored in Supabase.':'View, qualify and reply to enquiries securely stored in Supabase. / 查看、筛选并回复安全存储在 Supabase 中的询盘。','Search name, mobile or property':'Search name, mobile or property / 搜索姓名、手机或物业','All statuses':'All statuses / 全部状态','New':'New / 新询盘','Contacted':'Contacted / 已联系','Quoted':'Quoted / 已报价','Closed':'Closed / 已关闭','Spam':'Spam / 垃圾信息','Refresh from Supabase':'Refresh from Supabase / 从 Supabase 刷新','Enquiry':'Enquiry / 询盘','Property':'Property / 物业','Request':'Request / 需求','Status':'Status / 状态','Actions':'Actions / 操作','WhatsApp':'WhatsApp / WhatsApp','Delete':'Delete / 删除','Workspace controls':'Workspace controls / 工作区控制','Back up local edits and prepare a hand-off to a production CMS or CRM.':'Back up local edits and prepare a hand-off to a production CMS or CRM. / 备份本地编辑并准备移交到生产 CMS 或 CRM。','Business details':'Business details / 企业资料','Company':'Company / 公司','Website':'Website / 网站','Address':'Address / 地址','Save settings':'Save settings / 保存设置','Data & hand-off':'Data & hand-off / 数据与交接','Export JSON backup':'Export JSON backup / 导出 JSON 备份','Import JSON backup':'Import JSON backup / 导入 JSON 备份','Recommended production next step: server-side auth and roles; managed database for content, media and leads; audit log, CSRF protection and provider webhooks.':'Recommended production next step: server-side auth and roles; managed database for content, media and leads; audit log, CSRF protection and provider webhooks. / 生产环境建议下一步：服务端认证与角色、托管内容/媒体/询盘数据库、审计日志、CSRF 防护及服务商 Webhook。','No enquiries captured yet.':'No enquiries captured yet. / 暂无询盘记录。','No enquiries match this view.':'No enquiries match this view. / 没有符合当前筛选条件的询盘。','Service title':'Service title / 服务标题','Short description':'Short description / 简短描述','Page path':'Page path / 页面路径','Question':'Question / 问题','Answer':'Answer / 答案','Customer-approved review copy':'Customer-approved review copy / 经客户批准的评论内容','Service removed':'Service removed / 服务已删除','Service saved to Supabase':'Service saved to Supabase / 服务已保存到 Supabase','FAQ removed':'FAQ removed / 常见问题已删除','FAQ saved to Supabase':'FAQ saved to Supabase / 常见问题已保存到 Supabase','Review removed':'Review removed / 评论已删除','Review saved to Supabase':'Review saved to Supabase / 评论已保存到 Supabase','Page override saved':'Page override saved / 页面覆盖内容已保存','Page published to Supabase':'Page published to Supabase / 页面已发布到 Supabase','JSON backup downloaded':'JSON backup downloaded / JSON 备份已下载','Workspace imported':'Workspace imported / 工作区已导入','Import failed: invalid JSON':'Import failed: invalid JSON / 导入失败：JSON 无效','Lead status updated':'Lead status updated / 询盘状态已更新','Enquiry deleted':'Enquiry deleted / 询盘已删除','Inbox cleared':'Inbox cleared / 收件箱已清空','Business settings saved':'Business settings saved / 企业设置已保存','Supabase inbox refreshed':'Supabase inbox refreshed / Supabase 收件箱已刷新','Sign-in failed.':'Sign-in failed. / 登录失败。','Invalid login credentials':'Invalid login credentials / 登录凭据无效','This account is not authorised for the NANOFIX website admin.':'This account is not authorised for the NANOFIX website admin. / 此账号未获授权访问 NANOFIX 网站后台。','Session is not authorised.':'Session is not authorised. / 会话未获授权。','Supabase configuration is missing.':'Supabase configuration is missing. / 缺少 Supabase 配置。'
};
let adminBilingualizing=false;
function applyAdminBilingual(root=document.body){
  if(!root||adminBilingualizing)return;
  adminBilingualizing=true;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode()){
    if(node.parentElement?.closest('script,style'))continue;
    const raw=node.nodeValue||'',trimmed=raw.trim();
    if(!trimmed||trimmed.includes(' / '))continue;
    const replacement=ADMIN_BILINGUAL[trimmed];
    if(replacement)node.nodeValue=raw.replace(trimmed,replacement);
  }
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el=>{
    for(const attribute of ['placeholder','aria-label','title']){
      const value=el.getAttribute(attribute),replacement=value&&ADMIN_BILINGUAL[value];
      if(replacement)el.setAttribute(attribute,replacement);
    }
  });
  document.documentElement.lang='en-SG';
  adminBilingualizing=false;
}
function watchAdminBilingual(){
  applyAdminBilingual();
  new MutationObserver(()=>applyAdminBilingual()).observe(document.body,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchAdminBilingual);else watchAdminBilingual();
