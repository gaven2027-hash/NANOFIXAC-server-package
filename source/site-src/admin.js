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
function tab(name){$$('.side-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab').forEach(x=>x.classList.toggle('active',x.id===`tab-${name}`));const label=$(`.side-nav button[data-tab="${name}"]`)?.textContent?.trim()||'Dashboard';$('#top-title').textContent=label; if(name==='dashboard')renderDashboard(); if(name==='pages')renderPages(); if(name==='services')renderServices();if(name==='faq')renderFaq();if(name==='media')renderMedia();if(name==='leads')renderLeads()}
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
