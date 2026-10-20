import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

// The SDK is loaded inside initializeCases, after the page has rendered its loading state.
// This prevents a slow/unavailable CDN from leaving the case library silently blank.
let supabase = null;
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
function renderCases(){
  const query=$('#caseSearch').value.trim().toLowerCase();
  const difficulty=$('#difficultyFilter').value;
  const filtered=cases.filter(c=>(difficulty==='all'||c.difficulty===difficulty)&&`${c.title} ${c.category} ${c.summary} ${c.briefing} ${c.id}`.replace(/<[^>]*>/g,'').toLowerCase().includes(query));
  if(!filtered.length){caseGrid.innerHTML='<div class="empty-state">لم نعثر على قضية تطابق بحثك. جرّب كلمة أخرى أو غيّر مستوى الصعوبة.</div>';return;}
  const progress=getProgress();
  caseGrid.innerHTML=filtered.map(c=>`<article class="case-card">
    <div class="card-visual ${c.visual}"><span class="visual-file">ملف رقم ${escapeHTML(c.id)}</span><span class="visual-number">${escapeHTML(c.id)}</span><span class="visual-seal">BCN</span></div>
    <div class="card-body"><div class="card-meta"><span>${escapeHTML(c.category)}</span><span class="difficulty ${c.difficulty==='صعب'?'hard':''}">${escapeHTML(c.difficulty)}</span></div>
      <h3>${escapeHTML(c.title)}</h3><p>${escapeHTML(c.summary)}</p>
      <div class="card-footer"><span>${escapeHTML(c.duration)}${progress.completed.includes(c.id)?' · تم التحقيق ✓':''}</span><button type="button" data-open-case="${escapeHTML(c.id)}">فتح الملف <span>←</span></button></div>
    </div></article>`).join('');
  caseGrid.querySelectorAll('[data-open-case]').forEach(button=>button.addEventListener('click',()=>openCase(button.dataset.openCase)));
}
function openCase(id){
  currentCase=cases.find(c=>c.id===id);if(!currentCase)return;hintCount=0;
  const c=currentCase;const progress=getProgress();answerSubmitted=false;currentAnswerType=c.answerType||'suspect';
  const hintOptions=c.hints.map((_,i)=>`<option value="${i}">التلميح ${['الأول','الثاني','الثالث'][i] || (i+1)} — خصم ${(c.hintCosts?.[i] ?? [5,10,15][i] ?? 0)} نقاط</option>`).join('');
  dialogContent.innerHTML=`
    <div class="dialog-title-row"><div><div class="eyebrow">${escapeHTML(c.category)} · ${escapeHTML(c.difficulty)} · ${escapeHTML(c.duration)}</div><h2 id="dialogTitle">${escapeHTML(c.title)}</h2><p>اقرأ الملف بعناية. استخدم الأدلة لبناء تفسيرك، ولا تكشف الحل قبل تقديم إجابتك.</p></div><div class="case-number-large">${escapeHTML(c.id)}</div></div>
    <section class="file-section"><h3>ملخص البلاغ</h3><p>${escapeHTML(c.briefing)}</p></section>
    <section class="file-section"><h3>المتضرر / موضوع القضية</h3><p>${escapeHTML(c.victim)}</p></section>
    <section class="file-section"><h3>الأشخاص الوارد ذكرهم</h3><div class="suspect-grid">${c.suspects.map(s=>`<article class="suspect"><strong>${escapeHTML(s.name)}</strong><span>${escapeHTML(s.role)}</span><p>${escapeHTML(s.detail)}</p></article>`).join('')}</div></section>
    <section class="file-section"><h3>الأدلة المرفقة</h3><div class="evidence-list">${c.evidence.map(e=>`<article class="evidence"><span class="evidence-number">${escapeHTML(e.n)}</span><div><strong>${escapeHTML(e.title)}</strong><p>${escapeHTML(e.detail)}</p>${e.mediaUrl?renderEvidenceMedia(e):''}</div></article>`).join('')}</div></section>
    <section class="file-section"><h3>الخط الزمني الأولي</h3><p>${escapeHTML(c.timeline)}</p></section>
    <section class="file-section"><h3>طلب تلميح</h3><div class="hint-box"><p>التلميحات تقلل نقاط نتيجتك. اختر المستوى الذي تحتاج إليه؛ سيظهر الخصم قبل عرض التلميح.</p><div class="hint-row"><select id="hintSelect" aria-label="اختر مستوى التلميح">${hintOptions}</select><button class="button button-outline" id="useHint">عرض التلميح</button></div><div class="hint-output" id="hintOutput"></div></div></section>
    <section class="file-section"><h3>استنتاج المحقق</h3><div class="answer-form">${currentAnswerType==='open'?'<label for="openAnswer">اكتب استنتاجك أو السيناريو الذي تراه أقرب للأدلة</label><textarea id="openAnswer" placeholder="ما الذي حدث؟ أين التناقض؟ كيف نجح اللص؟"></textarea>':'<label for="answerSelect">من الشخص الذي ترى أن الأدلة تشير إليه؟</label><select id="answerSelect"><option value="">اختر استنتاجك...</option>${c.suspects.map(s=>`<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} — ${escapeHTML(s.role)}</option>`).join('')}</select>'}<label for="reasoning">ما الأدلة التي تدعم إجابتك؟</label><textarea id="reasoning" placeholder="اربط الأدلة باستنتاجك..."></textarea><button class="button button-primary" id="submitAnswer">تثبيت الإجابة ومراجعتها</button><div class="result-box" id="answerResult" aria-live="polite"></div></div></section>
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
  if(!supabase || !c.dbId){result.textContent='تعذر الاتصال بقاعدة البيانات أو أن القضية لا تحمل معرّفًا صالحًا.';result.classList.add('visible');showToast('اتصال قاعدة البيانات غير مُعدّ بعد. راجع ملف supabase-config.js.');return;}
  const submitButton=$('#submitAnswer');submitButton.disabled=true;submitButton.textContent='جارٍ مراجعة الإجابة…';
  try {
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
$('#caseSearch').addEventListener('input',renderCases);$('#difficultyFilter').addEventListener('change',renderCases);
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
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.118.0');
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    // Fetch cases separately from related tables. This avoids a PostgREST embedded-relationship
    // error from hiding every case when the schema cache or a foreign-key relationship differs.
    const {data:rows,error}=await supabase.from('cases').select('*').eq('status','published').order('created_at',{ascending:false});
    if(error) throw error;
    if(!rows || rows.length===0){
      cases=[];
      caseGrid.innerHTML='<div class="empty-state">لم تُرجع قاعدة البيانات أي قضايا منشورة. تحقّق من أن حالة القضية «منشورة» في لوحة الإدارة وأن سياسات القراءة العامة مطبّقة على جدول cases.</div>';
      return;
    }
    const ids=rows.map(r=>r.id).filter(Boolean);
    const [suspectResult,evidenceResult,hintResult]=await Promise.all([
      supabase.from('suspects').select('*').in('case_id',ids),
      supabase.from('evidence').select('*').in('case_id',ids),
      supabase.from('hints').select('*').in('case_id',ids)
    ]);
    // The case cards should remain visible even if a related-content table has a policy/schema issue.
    const childWarnings=[];
    if(suspectResult.error){console.error('Could not load suspects:',suspectResult.error);childWarnings.push('الأشخاص');}
    if(evidenceResult.error){console.error('Could not load evidence:',evidenceResult.error);childWarnings.push('الأدلة');}
    if(hintResult.error){console.error('Could not load hints:',hintResult.error);childWarnings.push('التلميحات');}
    const groupByCase=(items=[])=>items.reduce((acc,item)=>{(acc[item.case_id] ||= []).push(item);return acc;},{});
    const suspectsByCase=groupByCase(suspectResult.data||[]);
    const evidenceByCase=groupByCase(evidenceResult.data||[]);
    const hintsByCase=groupByCase(hintResult.data||[]);
    cases=rows.map(row=>{
      const rowSuspects=(suspectsByCase[row.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      const rowEvidence=(evidenceByCase[row.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      const rowHints=(hintsByCase[row.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      return {
        id:row.slug || row.id, dbId:row.id, title:row.title || 'قضية دون عنوان', category:row.category || 'لغز مغلق', answerType:row.answer_type||'suspect',
        difficulty:row.difficulty==='easy'?'سهل':row.difficulty==='hard'?'صعب':row.difficulty==='medium'?'متوسط':row.difficulty || 'متوسط',
        duration:`${row.estimated_minutes || 15} دقيقة`, visual:row.visual || 'visual-night', summary:row.summary || '',
        briefing:row.briefing || '', victim:row.victim || '', timeline:row.timeline || '',
        suspects:rowSuspects.map(s=>({id:s.id,name:s.name||'شخص غير مسمّى',role:s.role||'',detail:s.description||s.motive||''})),
        evidence:rowEvidence.map((e,i)=>({n:e.evidence_number||String(i+1).padStart(2,'0'),title:e.title||'دليل',detail:e.description||'',mediaUrl:e.media_url||'',mediaType:e.media_type||''})),
        hints:rowHints.map(h=>h.content||''),
        hintCosts:rowHints.map(h=>h.points_cost||0)
      };
    });
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
