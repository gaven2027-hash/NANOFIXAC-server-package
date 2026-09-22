const contactColumn = document.querySelector('.footer-grid>div:first-child');
const phoneLink = contactColumn?.querySelector('a[href^="tel:"]');
if (contactColumn && phoneLink && !contactColumn.querySelector('.footer-website')) {
  const website = document.createElement('a');
  website.className = 'footer-website';
  website.href = 'https://www.nanofixac.com';
  website.target = '_blank';
  website.rel = 'noopener noreferrer';
  website.textContent = 'www.nanofixac.com';
  phoneLink.insertAdjacentElement('afterend', website);
}

document.querySelectorAll('[data-menu]').forEach(button => button.addEventListener('click', () => {
  const nav = document.querySelector('[data-nav]');
  const open = nav.classList.toggle('is-open');
  button.setAttribute('aria-expanded', String(open));
}));

document.querySelectorAll('[data-faq-button]').forEach(button => button.addEventListener('click', () => {
  const item = button.closest('.faq-item');
  const open = item.classList.toggle('is-open');
  button.setAttribute('aria-expanded', String(open));
}));

// First-visit WhatsApp greeting: keep the prompt local to this browser and
// leave the existing floating WhatsApp action as the single contact target.
(function setupWhatsAppGreeting(){
  const button = document.querySelector('.whatsapp-float');
  if (!button || document.querySelector('[data-whatsapp-greeting]')) return;

  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const prompt = document.createElement('aside');
  prompt.className = 'whatsapp-greeting';
  prompt.dataset.whatsappGreeting = '';
  prompt.hidden = true;
  prompt.setAttribute('role', 'dialog');
  prompt.setAttribute('aria-label', zh ? 'WhatsApp咨询提示' : 'WhatsApp chat prompt');
  prompt.innerHTML = `
    <button class="whatsapp-greeting-close" type="button" aria-label="${zh ? '关闭提示' : 'Close prompt'}">×</button>
    <a class="whatsapp-greeting-link" href="${button.href}" target="_blank" rel="noopener noreferrer">
      <span class="whatsapp-greeting-avatar" aria-hidden="true"></span>
      <span class="whatsapp-greeting-copy">
        <strong>${zh ? '您好，请问有什么可以帮您？' : 'Hello, do you have any questions?'}</strong>
        <span>${zh ? '请在这里留言。' : 'Please write us here.'}</span>
      </span>
    </a>
    <span class="whatsapp-greeting-tail" aria-hidden="true"></span>`;
  document.body.append(prompt);

  const seenKey = 'nanofixac_whatsapp_greeting_seen_v1';
  let seen = false;
  try { seen = localStorage.getItem(seenKey) === '1'; } catch (error) {}

  const hide = () => { prompt.hidden = true; prompt.classList.remove('is-visible'); };
  const rememberAndHide = () => {
    try { localStorage.setItem(seenKey, '1'); } catch (error) {}
    hide();
  };
  prompt.querySelector('.whatsapp-greeting-close').addEventListener('click', rememberAndHide);
  prompt.querySelector('.whatsapp-greeting-link').addEventListener('click', rememberAndHide);

  if (!seen) {
    window.setTimeout(() => {
      try { localStorage.setItem(seenKey, '1'); } catch (error) {}
      prompt.hidden = false;
      window.requestAnimationFrame(() => prompt.classList.add('is-visible'));
    }, 900);
  }
})();

const form = document.querySelector('[data-booking-form]');
if (form) form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const fields = Object.fromEntries(data.entries());
  const requestId = crypto.randomUUID();
  const lines = [
    fields.locale === 'zh' ? '您好 NANOFIX，我想咨询高温蒸汽空调化学清洗。' : 'Hello NANOFIX, I would like to enquire about high-temperature steam aircon chemical cleaning.',
    '',
    `Name / 姓名: ${fields.name || ''}`,
    `Mobile / 手机: ${fields.mobile || ''}`,
    `Email / 电邮: ${fields.email || ''}`,
    `Postal code / 邮编: ${fields.postal_code || ''}`,
    `Property / 房屋类型: ${fields.property_type || ''}`,
    `Units / 空调数量: ${fields.unit_count || ''}`,
    `Preferred date / 日期: ${fields.preferred_date || ''}`,
    `Details / 情况: ${fields.details || ''}`
  ];
  // Keep a local inbox copy so the NANOFIX admin workspace can display and
  // track enquiries immediately. The public site still lets the customer
  // review and send the prepared WhatsApp message themselves.
  try {
    const leads = JSON.parse(localStorage.getItem('nanofix_leads') || '[]');
    leads.unshift({
      id: requestId,
      createdAt: new Date().toISOString(),
      status: 'new',
      ...fields
    });
    localStorage.setItem('nanofix_leads', JSON.stringify(leads.slice(0, 200)));
  } catch (error) {
    // Storage can be unavailable in privacy-restricted browsers; WhatsApp
    // remains fully functional in that case.
  }
  const cloud=window.NANOFIX_SUPABASE;
  if(cloud?.url&&cloud?.publishableKey){
    const payload={
      client_request_id:requestId,
      name:String(fields.name||'').slice(0,120),
      mobile:String(fields.mobile||'').slice(0,40),
      email:fields.email?String(fields.email).slice(0,254):null,
      postal_code:fields.postal_code?String(fields.postal_code).slice(0,12):null,
      property_type:fields.property_type?String(fields.property_type).slice(0,80):null,
      unit_count:Math.max(1,Math.min(100,Number(fields.unit_count)||1)),
      preferred_date:fields.preferred_date||null,
      details:fields.details?String(fields.details).slice(0,5000):null,
      locale:fields.locale==='zh'?'zh':'en',
      source:'nanofixac_website',
      status:'new'
    };
    fetch(`${cloud.url}/rest/v1/aircon_site_enquiries`,{
      method:'POST',
      headers:{apikey:cloud.publishableKey,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify(payload)
    }).then(response=>{if(!response.ok)throw new Error(`Form sync failed (${response.status})`)}).catch(()=>{
      const message=document.querySelector('[data-form-message]');
      if(message)message.textContent=fields.locale==='zh'?'WhatsApp已打开；在线记录暂未同步，请直接发送咨询信息。':'WhatsApp is open; online recording is temporarily unavailable, so please send the enquiry directly.';
    });
  }
  const url = `https://wa.me/6580387877?text=${encodeURIComponent(lines.join('\n'))}`;
  const message = document.querySelector('[data-form-message]');
  if (message) message.hidden = false;
  window.open(url, '_blank', 'noopener,noreferrer');
});
