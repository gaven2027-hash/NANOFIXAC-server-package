/* Published CMS overrides from Supabase, with a browser-local preview fallback. */
(function(){
  const page=document.body?.dataset?.page;if(!page)return;
  const split=page.indexOf(':'),locale=page.slice(0,split),route=page.slice(split+1);
  function apply(item){
    if(!item)return;
    const heroTitle=item.hero_title??item.heroTitle,heroLead=item.hero_lead??item.heroLead,metaDescription=item.meta_description??item.metaDescription;
    if(heroTitle){const h=document.querySelector('.hero h1,.page-hero-content h1');if(h)h.textContent=heroTitle;}
    if(heroLead){const p=document.querySelector('.hero-copy>p,.page-hero-content>p');if(p)p.textContent=heroLead;}
    if(metaDescription){const m=document.querySelector('meta[name="description"]');if(m)m.setAttribute('content',metaDescription);}
    if(item.image_url){const image=document.querySelector('.hero-photo-bg,.page-hero-bg');if(image)image.src=item.image_url;}
  }
  try{const local=JSON.parse(localStorage.getItem('nanofix_cms')||'{}');apply(local[page]);}catch{}
  const cloud=window.NANOFIX_SUPABASE;if(!cloud?.url||!cloud?.publishableKey)return;
  const query=`route=eq.${encodeURIComponent(route)}&locale=eq.${encodeURIComponent(locale)}&status=eq.published&select=hero_title,hero_lead,meta_description,image_url&limit=1`;
  fetch(`${cloud.url}/rest/v1/aircon_site_content?${query}`,{headers:{apikey:cloud.publishableKey}})
    .then(response=>response.ok?response.json():Promise.reject()).then(rows=>apply(rows?.[0])).catch(()=>{});
})();
