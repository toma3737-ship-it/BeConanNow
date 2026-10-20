import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

// The SDK is loaded inside initializeCases, after the page has rendered its loading state.
// This prevents a slow/unavailable CDN from leaving the case library silently blank.
let supabase = null;
let supabasePromise = null;
async function getSupabaseClient(){
  if(supabase) return supabase;
  if(!supabasePromise) supabasePromise = import('https://esm.sh/@supabase/supabase-js@2.118.0').then(({createClient}) => { supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY); return supabase; });
  return supabasePromise;
}
async function fetchSupabaseTable(table, params){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: 'GET', signal: controller.signal,
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, Accept: 'application/json' }
    });
    const body = await response.text();
    let data; try { data = body ? JSON.parse(body) : []; } catch { data = body; }
    if(!response.ok) throw new Error(data?.message || data?.hint || `HTTP ${response.status} عند قراءة ${table}`);
    return data;
  } catch(error) {
    if(error?.name === 'AbortError') throw new Error(`انتهت مهلة الاتصال بجدول ${table} بعد 15 ثانية. تحقق من اتصال الإنترنت أو إعدادات Supabase.`);
    throw error;
  } finally { clearTimeout(timeout); }
}
let supabaseLibraryError = null;
const supabaseReady = SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  SUPABASE_PUBLISHABLE_KEY.length > 20 &&
  !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_PUBLISHABLE_KEY');

let cases = [];

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHTML = (value = '') => String(value).replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
const caseGrid = $('#caseGrid');
const caseDialog = $('#caseDialog');
const dialogContent = $('#dialogContent');
const toast = $('#toast');
let currentCase = null;
let hintCount = 0;
let answerSubmitted = false;
let currentAnswerType = 'suspect';
let toastTimer;
const progressKey = 'mahder-demo-progress-v1';

function getProgress(){
  try{return JSON.parse(localStorage.getItem(progressKey)) || {completed:[], hints:{}};}catch{return {completed:[],hints:{}};}
}
function saveProgress(progress){try{localStorage.setItem(progressKey,JSON.stringify(progress));}catch{/* local saving may be unavailable */}}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}
function renderEvidenceMedia(e){if(/^image\//.test(e.mediaType))return `<a href="${escapeHTML(e.mediaUrl)}" target="_blank" rel="noopener"><img src="${escapeHTML(e.mediaUrl)}" alt="${escapeHTML(e.title)}" loading="lazy" style="max-width:100%;max-height:360px;border-radius:10px"></a>`;if(/^audio\//.test(e.mediaType))return `<audio controls preload="none" src="${escapeHTML(e.mediaUrl)}"></audio>`;if(/^video\//.test(e.mediaType))return `<video controls preload="metadata" src="${escapeHTML(e.mediaUrl)}" style="max-width:100%;max-height:360px"></video>`;return `<p><a href="${escapeHTML(e.mediaUrl)}" target="_blank" rel="noopener">فتح الملف المرفق</a></p>`;}
let casePage = 1;
const casesPerPage = 12;
function refreshCategoryOptions(){
  const select=$('#caseCategoryFilter'); if(!select) return;
  const current=select.value;
  const categories=[...new Set(cases.map(c=>c.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  select.innerHTML='<option value="all">كل التصنيفات</option>'+categories.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  if(categories.includes(current)) select.value=current;
}
function renderCases(){
  if(!caseGrid) return;
  const query=$('#caseSearch').value.trim().toLowerCase();
  const difficulty=$('#difficultyFilter').value;
  const category=$('#caseCategoryFilter')?.value || 'all';
  const sort=$('#caseSort')?.value || 'newest';
  let filtered=cases.filter(c=>(difficulty==='all'||c.difficulty===difficulty)&&(category==='all'||c.category===category)&&`${c.title} ${c.category} ${c.summary} ${c.briefing} ${c.id}`.replace(/<[^>]*>/g,'').toLowerCase().includes(query));
  filtered.sort((a,b)=>{
    if(sort==='title') return a.title.localeCompare(b.title,'ar');
    if(sort==='difficulty') return ({'سهل':1,'متوسط':2,'صعب':3}[a.difficulty]||9)-({'سهل':1,'متوسط':2,'صعب':3}[b.difficulty]||9);
    const ad=Date.parse(a.createdAt||'')||0, bd=Date.parse(b.createdAt||'')||0;
    return sort==='oldest' ? ad-bd : bd-ad;
  });
  const pages=Math.max(1,Math.ceil(filtered.length/casesPerPage));
  casePage=Math.min(Math.max(1,casePage),pages);
  if(!filtered.length){caseGrid.innerHTML='<div class="empty-state">لم نعثر على قضية تطابق بحثك. جرّب كلمة أخرى أو غيّر عوامل التصفية.</div>';$('#casePagination').innerHTML='';return;}
  const visible=filtered.slice((casePage-1)*casesPerPage,casePage*casesPerPage);
  const progress=getProgress();
  caseGrid.innerHTML=visible.map(c=>`<article class="case-card">
    <div class="card-visual ${escapeHTML(c.visual)}"><span class="visual-file">ملف رقم ${escapeHTML(c.id)}</span><span class="visual-number">${escapeHTML(c.id)}</span><span class="visual-seal">BCN</span></div>
    <div class="card-body"><div class="card-meta"><span>${escapeHTML(c.category)}</span><span class="difficulty ${c.difficulty==='صعب'?'hard':''}">${escapeHTML(c.difficulty)}</span></div>
      <h3>${escapeHTML(c.title)}</h3><p>${escapeHTML(c.summary)}</p>
      <div class="card-footer"><span>${escapeHTML(c.duration)}${progress.completed.includes(c.id)?' · تم التحقيق ✓':''}</span><button type="button" data-open-case="${escapeHTML(c.id)}">فتح الملف <span>←</span></button></div>
    </div></article>`).join('');
  caseGrid.querySelectorAll('[data-open-case]').forEach(button=>button.addEventListener('click',()=>openCase(button.dataset.openCase)));
  const pager=$('#casePagination');
  pager.innerHTML=`<span class="pagination-info">${filtered.length} قضية · صفحة ${casePage} من ${pages}</span><div class="pagination-buttons"><button type="button" data-page="prev" ${casePage===1?'disabled':''}>السابق</button>${Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-casePage)<=1).map(n=>`<button type="button" data-page="${n}" class="${n===casePage?'active':''}" aria-current="${n===casePage?'page':'false'}">${n}</button>`).join('')}<button type="button" data-page="next" ${casePage===pages?'disabled':''}>التالي</button></div>`;
  pager.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.page;casePage=value==='prev'?casePage-1:value==='next'?casePage+1:Number(value);renderCases();$('#cases').scrollIntoView({behavior:'smooth',block:'start'});}));
}

function openCase(id){
  currentCase=cases.find(c=>c.id===id);if(!currentCase)return;hintCount=0;
  const c=currentCase;const progress=getProgress();answerSubmitted=false;currentAnswerType=c.answerType||'suspect';
  const hintOptions=c.hints.map((_,i)=>`<option value="${i}">التلميح ${['الأول','الثاني','الثالث'][i] || (i+1)} — خصم ${(c.hintCosts?.[i] ?? [5,10,15][i] ?? 0)} نقاط</option>`).join('');
  const answerControl = currentAnswerType === 'open'
    ? '<label for="openAnswer">اكتب استنتاجك أو السيناريو الذي تراه أقرب للأدلة</label><textarea id="openAnswer" placeholder="ما الذي حدث؟ أين التناقض؟ كيف نجح اللص؟"></textarea>'
    : `<label for="answerSelect">من الشخص الذي ترى أن الأدلة تشير إليه؟</label><select id="answerSelect"><option value="">اختر استنتاجك...</option>${c.suspects.map(s=>`<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} — ${escapeHTML(s.role)}</option>`).join('')}</select>`;
  dialogContent.innerHTML=`
    <div class="dialog-title-row"><div><div class="eyebrow">${escapeHTML(c.category)} · ${escapeHTML(c.difficulty)} · ${escapeHTML(c.duration)}</div><h2 id="dialogTitle">${escapeHTML(c.title)}</h2><p>اقرأ الملف بعناية. استخدم الأدلة لبناء تفسيرك، ولا تكشف الحل قبل تقديم إجابتك.</p></div><div class="case-number-large">${escapeHTML(c.id)}</div></div>
    <section class="file-section"><h3>ملخص البلاغ</h3><p>${escapeHTML(c.briefing)}</p></section>
    <section class="file-section"><h3>المتضرر / موضوع القضية</h3><p>${escapeHTML(c.victim)}</p></section>
    <section class="file-section"><h3>الأشخاص الوارد ذكرهم</h3><div class="suspect-grid">${c.suspects.map(s=>`<article class="suspect"><strong>${escapeHTML(s.name)}</strong><span>${escapeHTML(s.role)}</span><p>${escapeHTML(s.detail)}</p></article>`).join('')}</div></section>
    <section class="file-section"><h3>الأدلة المرفقة</h3><div class="evidence-list">${c.evidence.map(e=>`<article class="evidence"><span class="evidence-number">${escapeHTML(e.n)}</span><div><strong>${escapeHTML(e.title)}</strong><p>${escapeHTML(e.detail)}</p>${e.mediaUrl?renderEvidenceMedia(e):''}</div></article>`).join('')}</div></section>
    <section class="file-section"><h3>الخط الزمني الأولي</h3><p>${escapeHTML(c.timeline)}</p></section>
    <section class="file-section"><h3>طلب تلميح</h3><div class="hint-box"><p>التلميحات تقلل نقاط نتيجتك. اختر المستوى الذي تحتاج إليه؛ سيظهر الخصم قبل عرض التلميح.</p><div class="hint-row"><select id="hintSelect" aria-label="اختر مستوى التلميح">${hintOptions}</select><button class="button button-outline" id="useHint">عرض التلميح</button></div><div class="hint-output" id="hintOutput"></div></div></section>
    <section class="file-section"><h3>استنتاج المحقق</h3><div class="answer-form">${answerControl}<label for="reasoning">ما الأدلة التي تدعم إجابتك؟</label><textarea id="reasoning" placeholder="اربط الأدلة باستنتاجك..."></textarea><button class="button button-primary" id="submitAnswer">تثبيت الإجابة ومراجعتها</button><div class="result-box" id="answerResult" aria-live="polite"></div></div></section>
    <section class="solution-panel" id="solutionPanel"><h3>الحل المرجعي وتحليل الأدلة</h3><p id="solutionText">لن يظهر الحل إلا بعد تثبيت إجابتك.</p></section>
    <div class="dialog-actions"><button class="subtle-button" id="resetCase">إعادة ضبط الإجابة</button><button class="button button-primary" id="revealSolution">كشف الحل بعد التأكيد</button></div>`;
  $('#dialogCaseNo').textContent=`ملف رقم ${escapeHTML(c.id)}`;
  $('#useHint').addEventListener('click',useHint);
  $('#submitAnswer').addEventListener('click',submitAnswer);
  $('#revealSolution').addEventListener('click',()=>{if(!answerSubmitted){showToast('لم ينجح تثبيت الإجابة بعد. راجع الرسالة أسفل نموذج الإجابة ثم حاول مجددًا.');(currentAnswerType==='open'?$('#openAnswer'):$('#answerSelect'))?.focus();return;} $('#solutionPanel').classList.add('visible');$('#solutionPanel').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('#resetCase').addEventListener('click',()=>{if(confirm('هل تريد مسح إجابتك الحالية وإعادة المحاولة؟')){const answerField=$('#openAnswer')||$('#answerSelect');if(answerField)answerField.value='';$('#reasoning').value='';$('#answerResult').classList.remove('visible');$('#solutionPanel').classList.remove('visible');answerSubmitted=false;hintCount=0;$('#hintOutput').classList.remove('visible');showToast('تمت إعادة ضبط نموذج الإجابة.');}});
  caseDialog.showModal();document.body.classList.add('dialog-open');
}
function useHint(){
  const index=Number($('#hintSelect').value);const c=currentCase;const progress=getProgress();
  if(!progress.hints[c.id])progress.hints[c.id]=[];
  if(progress.hints[c.id].includes(index)){ $('#hintOutput').textContent=`لقد استخدمت هذا التلميح من قبل. ${escapeHTML(c.hints[index])}`;$('#hintOutput').classList.add('visible');showToast('لن يُخصم هذا التلميح مرة أخرى في هذا المتصفح.');return; }
  const penalty=c.hintCosts?.[index] ?? [5,10,15][index] ?? 0;
  if(!confirm(`سيُعرض التلميح مع خصم ${penalty} نقاط من نتيجة هذه المحاولة. هل تريد المتابعة؟`))return;
  progress.hints[c.id].push(index);saveProgress(progress);hintCount+=penalty;
  $('#hintOutput').textContent=`التلميح: ${escapeHTML(c.hints[index])} (خصم ${penalty} نقاط)`;$('#hintOutput').classList.add('visible');showToast(`تم عرض التلميح. مجموع خصم التلميحات: ${hintCount} نقطة.`);
}
async function submitAnswer(){
  const c=currentCase;const open=currentAnswerType==='open';const selectedSuspectId=open?null:$('#answerSelect').value;const openAnswer=open?$('#openAnswer').value.trim():'';const reasoning=$('#reasoning').value.trim();const result=$('#answerResult');
  if(open?openAnswer.length<8:!selectedSuspectId){result.textContent=open?'اكتب إجابة من 8 أحرف على الأقل.':'اختر اسم الشخص أولًا، ثم ثبّت الإجابة.';result.classList.add('visible');showToast('أكمل الإجابة أولًا.');(open?$('#openAnswer'):$('#answerSelect')).focus();return;}
  if(reasoning.length<8){result.textContent='اكتب تعليلًا من 8 أحرف على الأقل حتى تُثبّت الإجابة.';result.classList.add('visible');showToast('أضف تعليلًا قصيرًا يوضح سبب اختيارك.');$('#reasoning').focus();return;}
  if(!c.dbId){result.textContent='القضية لا تحمل معرّفًا صالحًا.';result.classList.add('visible');return;}
  const submitButton=$('#submitAnswer');submitButton.disabled=true;submitButton.textContent='جارٍ مراجعة الإجابة…';
  try {
    await getSupabaseClient();
    const {data,error}=open?await supabase.rpc('submit_case_open_answer',{p_case_id:c.dbId,p_response:openAnswer,p_reasoning:reasoning}):await supabase.rpc('submit_case_answer',{p_case_id:c.dbId,p_suspect_id:selectedSuspectId});
    if(error) throw error;
    const resultRow=Array.isArray(data)?data[0]:data;
    if(!resultRow || (!open&&typeof resultRow.correct!=='boolean'))throw new Error('لم تُرجع قاعدة البيانات نتيجة تحقق مفهومة. أعد تشغيل ملف supabase-setup.sql في SQL Editor.');
    answerSubmitted=true;const correct=Boolean(resultRow.correct);
    result.innerHTML=open?'<strong>تم تثبيت إجابتك.</strong><p>الإجابة المفتوحة لا تُقيّم آليًا؛ قارن فكرتك بالإجابة المرجعية وتحليل الأدلة أدناه.</p>':'<strong>'+ (correct?'إجابة صحيحة!':'إجابة غير مطابقة للحل المرجعي')+'</strong><p>'+(correct?'أحسنت؛ لقد وصلت إلى الاستنتاج الصحيح.':'راجع تعليلك وقارن بين الأدلة قبل الانتقال إلى قضية أخرى.')+'</p>';
    result.classList.add('visible');
    $('#solutionText').textContent=open?((resultRow.expected_answer?'الإجابة المرجعية: '+resultRow.expected_answer+'\n\n':'')+(resultRow.explanation||'لا يتوفر تفسير إضافي لهذه القضية بعد.')):(resultRow?.explanation || 'لا يتوفر تفسير منشور لهذه القضية بعد.');
    $('#solutionPanel').classList.add('visible');
    $('#solutionPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
    const p=getProgress();if(!p.completed.includes(c.id))p.completed.push(c.id);saveProgress(p);renderCases();
  } catch(error) {
    console.error(error);result.textContent='لم يتم تثبيت الإجابة. '+(error?.message||'تحقق من اتصال قاعدة البيانات وصلاحيات الوظيفة.');result.classList.add('visible');showToast('تعذر تثبيت الإجابة. اقرأ الرسالة الظاهرة أسفل نموذج الإجابة.');
  } finally {submitButton.disabled=false;submitButton.textContent='تثبيت الإجابة ومراجعتها';}
}
$('#closeDialog').addEventListener('click',()=>{caseDialog.close();document.body.classList.remove('dialog-open');});
caseDialog.addEventListener('click',event=>{if(event.target===caseDialog){caseDialog.close();document.body.classList.remove('dialog-open');}});
caseDialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
$('#caseSearch').addEventListener('input',()=>{casePage=1;renderCases();});$('#difficultyFilter').addEventListener('change',()=>{casePage=1;renderCases();});$('#caseCategoryFilter')?.addEventListener('change',()=>{casePage=1;renderCases();});$('#caseSort')?.addEventListener('change',()=>{casePage=1;renderCases();});
window.addEventListener('pageshow',()=>{renderCases();});
$('#resumeBtn').addEventListener('click',()=>{const p=getProgress();const next=cases.find(c=>!p.completed.includes(c.id))||cases[0];openCase(next.id);});
async function initializeCases(){
  if(!caseGrid){ console.error('Missing #caseGrid container'); return; }
  caseGrid.innerHTML='<div class="empty-state">جارٍ تحميل القضايا المنشورة…</div>';
  try {
    if(!supabaseReady){
      caseGrid.innerHTML='<div class="empty-state">أكمل إعداد الاتصال بقاعدة البيانات في ملف supabase-config.js لعرض القضايا المنشورة.</div>';
      return;
    }
    // Use the Supabase REST endpoint for public case loading so a blocked or slow CDN
    // importing the JavaScript SDK cannot leave the library stuck on its loading message.
    const rows = await fetchSupabaseTable('cases', 'select=*&status=eq.published&order=created_at.desc');
    if(!rows || rows.length===0){
      cases=[];
      caseGrid.innerHTML='<div class="empty-state">لم تُرجع قاعدة البيانات أي قضايا منشورة. تحقّق من أن حالة القضية «منشورة» في لوحة الإدارة وأن سياسات القراءة العامة مطبّقة على جدول cases.</div>';
      return;
    }
    const ids=rows.map(r=>r.id).filter(Boolean);
    // Load related data independently; case cards remain available if a detail table fails.
    const childWarnings=[];
    const inFilter = `select=*&case_id=in.(${ids.join(',')})`;
    const childResults = await Promise.allSettled([
      fetchSupabaseTable('suspects', inFilter),
      fetchSupabaseTable('evidence', inFilter),
      fetchSupabaseTable('hints', inFilter)
    ]);
    const childItems = childResults.map((r,i)=>{ if(r.status==='fulfilled') return r.value; console.error('Could not load related case data:',r.reason); childWarnings.push(['الأشخاص','الأدلة','التلميحات'][i]); return []; });
    const groupByCase=(items=[])=>items.reduce((acc,item)=>{(acc[item.case_id] ||= []).push(item);return acc;},{});
    const suspectsByCase=groupByCase(childItems[0]);
    const evidenceByCase=groupByCase(childItems[1]);
    const hintsByCase=groupByCase(childItems[2]);
    cases=rows.map(row=>{
      const rowSuspects=(suspectsByCase[row.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      const rowEvidence=(evidenceByCase[row.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      const rowHints=(hintsByCase[row.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      return {
        id:row.slug || row.id, dbId:row.id, createdAt:row.created_at, title:row.title || 'قضية دون عنوان', category:row.category || 'لغز مغلق', answerType:row.answer_type||'suspect',
        difficulty:row.difficulty==='easy'?'سهل':row.difficulty==='hard'?'صعب':row.difficulty==='medium'?'متوسط':row.difficulty || 'متوسط',
        duration:`${row.estimated_minutes || 15} دقيقة`, visual:row.visual || 'visual-night', summary:row.summary || '',
        briefing:row.briefing || '', victim:row.victim || '', timeline:row.timeline || '',
        suspects:rowSuspects.map(s=>({id:s.id,name:s.name||'شخص غير مسمّى',role:s.role||'',detail:s.description||s.motive||''})),
        evidence:rowEvidence.map((e,i)=>({n:e.evidence_number||String(i+1).padStart(2,'0'),title:e.title||'دليل',detail:e.description||'',mediaUrl:e.media_url||'',mediaType:e.media_type||''})),
        hints:rowHints.map(h=>h.content||''),
        hintCosts:rowHints.map(h=>h.points_cost||0)
      };
    });
    refreshCategoryOptions();
    renderCases();
    if(childWarnings.length){
      console.warn('Some case details could not be loaded:',childWarnings.join(', '));
      const warning=document.createElement('div');warning.className='empty-state';warning.textContent=`ظهرت القضايا، لكن تعذّر تحميل بعض التفاصيل (${childWarnings.join('، ')}). راجع صلاحيات القراءة لهذه الجداول في Supabase.`;
      caseGrid.prepend(warning);
    }
  } catch(error) {
    console.error('Failed to load published cases:',error);
    caseGrid.innerHTML=`<div class="empty-state">تعذّر جلب القضايا من Supabase: ${escapeHTML(error?.message||String(error))}. تأكد من مشروع Supabase وإعدادات القراءة العامة، ثم حدّث الصفحة.</div>`;
  }
}
initializeCases();
