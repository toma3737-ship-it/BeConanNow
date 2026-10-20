import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabaseReady = SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  SUPABASE_PUBLISHABLE_KEY.length > 20 &&
  !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_PUBLISHABLE_KEY');
const supabase = supabaseReady ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

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
function renderCases(){
  const query=$('#caseSearch').value.trim().toLowerCase();
  const difficulty=$('#difficultyFilter').value;
  const filtered=cases.filter(c=>(difficulty==='all'||c.difficulty===difficulty)&&`${escapeHTML(c.title)} ${escapeHTML(c.category)} ${escapeHTML(c.summary)} ${escapeHTML(c.id)}`.toLowerCase().includes(query));
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
    <section class="file-section"><h3>الأدلة المرفقة</h3><div class="evidence-list">${c.evidence.map(e=>`<article class="evidence"><span class="evidence-number">${escapeHTML(e.n)}</span><div><strong>${escapeHTML(e.title)}</strong><p>${escapeHTML(e.detail)}</p></div></article>`).join('')}</div></section>
    <section class="file-section"><h3>الخط الزمني الأولي</h3><p>${escapeHTML(c.timeline)}</p></section>
    <section class="file-section"><h3>طلب تلميح</h3><div class="hint-box"><p>التلميحات تقلل نقاط نتيجتك. اختر المستوى الذي تحتاج إليه؛ سيظهر الخصم قبل عرض التلميح.</p><div class="hint-row"><select id="hintSelect" aria-label="اختر مستوى التلميح">${hintOptions}</select><button class="button button-outline" id="useHint">عرض التلميح</button></div><div class="hint-output" id="hintOutput"></div></div></section>
    <section class="file-section"><h3>استنتاج المحقق</h3><div class="answer-form">${currentAnswerType==='open'?'<label for="openAnswer">اكتب استنتاجك أو السيناريو الذي تراه أقرب للأدلة</label><textarea id="openAnswer" placeholder="ما الذي حدث؟ أين التناقض؟ كيف نجح اللص؟"></textarea>':'<label for="answerSelect">من الشخص الذي ترى أن الأدلة تشير إليه؟</label><select id="answerSelect"><option value="">اختر استنتاجك...</option>${c.suspects.map(s=>`<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} — ${escapeHTML(s.role)}</option>`).join('')}</select>'}<label for="reasoning">ما الأدلة التي تدعم إجابتك؟</label><textarea id="reasoning" placeholder="اربط الأدلة باستنتاجك..."></textarea><button class="button button-primary" id="submitAnswer">تثبيت الإجابة ومراجعتها</button><div class="result-box" id="answerResult" aria-live="polite"></div></div></section>
    <section class="solution-panel" id="solutionPanel"><h3>الحل المرجعي وتحليل الأدلة</h3><p id="solutionText">لن يظهر الحل إلا بعد تثبيت إجابتك.</p></section>
    <div class="dialog-actions"><button class="subtle-button" id="resetCase">إعادة ضبط الإجابة</button><button class="button button-primary" id="revealSolution">كشف الحل بعد التأكيد</button></div>`;
  $('#dialogCaseNo').textContent=`ملف رقم ${escapeHTML(c.id)}`;
  $('#useHint').addEventListener('click',useHint);
  $('#submitAnswer').addEventListener('click',submitAnswer);
  $('#revealSolution').addEventListener('click',()=>{if(!answerSubmitted){showToast('لم ينجح تثبيت الإجابة بعد. راجع الرسالة أسفل نموذج الإجابة ثم حاول مجددًا.');$('#answerSelect').focus();return;} $('#solutionPanel').classList.add('visible');$('#solutionPanel').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('#resetCase').addEventListener('click',()=>{if(confirm('هل تريد مسح إجابتك الحالية وإعادة المحاولة؟')){ $('#answerSelect').value='';$('#reasoning').value='';$('#answerResult').classList.remove('visible');$('#solutionPanel').classList.remove('visible');answerSubmitted=false;hintCount=0;$('#hintOutput').classList.remove('visible');showToast('تمت إعادة ضبط نموذج الإجابة.');}});
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
$('#menuToggle').addEventListener('click',()=>{const nav=$('.main-nav');const open=nav.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open));});
$('.main-nav').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{$('.main-nav').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false');}));
$('#resumeBtn').addEventListener('click',()=>{const p=getProgress();const next=cases.find(c=>!p.completed.includes(c.id))||cases[0];openCase(next.id);});
async function initializeCases(){
  if(!supabase){
    caseGrid.innerHTML='<div class="empty-state">أكمل إعداد الاتصال بقاعدة البيانات في ملف supabase-config.js لعرض القضايا المنشورة.</div>';
    return;
  }
  const {data,error}=await supabase.from('cases').select(`
    id, slug, title, category, answer_type, difficulty, estimated_minutes, visual, summary, briefing, victim, timeline,
    suspects(id, name, role, description, motive),
    evidence(id, evidence_number, title, description, sort_order),
    hints(id, content, points_cost, sort_order)
  `).eq('status','published').order('created_at',{ascending:false});
  if(error){console.error(error);caseGrid.innerHTML='<div class="empty-state">تعذر تحميل القضايا. تحقق من إعداد قاعدة البيانات والسياسات.</div>';return;}
  cases=(data||[]).map(row=>({
    id:row.slug || row.id, dbId:row.id, title:row.title, category:row.category || 'لغز مغلق', answerType:row.answer_type||'suspect',
    difficulty:row.difficulty==='easy'?'سهل':row.difficulty==='hard'?'صعب':row.difficulty==='medium'?'متوسط':row.difficulty,
    duration:`${row.estimated_minutes || 15} دقيقة`, visual:row.visual || 'visual-night', summary:row.summary || '',
    briefing:row.briefing || '', victim:row.victim || '', timeline:row.timeline || '',
    suspects:(row.suspects||[]).map(s=>({id:s.id,name:s.name,role:s.role||'',detail:s.description||s.motive||''})),
    evidence:(row.evidence||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map((e,i)=>({n:e.evidence_number||String(i+1).padStart(2,'0'),title:e.title,detail:e.description||''})),
    hints:(row.hints||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(h=>h.content),
    hintCosts:(row.hints||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(h=>h.points_cost||0)
  }));
  renderCases();
}
initializeCases();
