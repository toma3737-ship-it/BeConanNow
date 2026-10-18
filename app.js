const cases = [
  {
    id: '017', title: 'ليلة في البيت الأزرق', category: 'لغز مغلق', difficulty: 'متوسط', duration: '٢٥ دقيقة', visual: 'visual-night',
    summary: 'غرفة مغلقة، ساعة متوقفة، وثلاث شهادات لا تتفق على وقت واحد.',
    briefing: 'في الساعة العاشرة مساءً، عُثر على تاجر التحف سامر ناصر فاقدًا للوعي في مكتبه داخل البيت الأزرق. لم يكن باب المكتب مقفلًا بالمفتاح، لكن النافذة كانت مغلقة من الداخل. اختفت علبة صغيرة من خزانة العرض، ولا توجد آثار اقتحام واضحة.',
    victim: 'سامر ناصر، تاجر تحف في الثانية والخمسين من عمره.',
    suspects: [
      {name:'ليلى ناصر', role:'ابنة الضحية', detail:'قالت إنها كانت في الحديقة بين التاسعة والتاسعة والنصف، ولم تدخل المكتب تلك الليلة.'},
      {name:'ماهر الخطيب', role:'حارس المنزل', detail:'أكد أنه سمع دقّات الساعة العاشرة، وأنه لم يغادر المدخل الرئيسي.'},
      {name:'نديم فارس', role:'شريك تجاري', detail:'قال إنه غادر المنزل عند التاسعة تمامًا بعد نقاش قصير مع سامر.'}
    ],
    evidence: [
      {n:'٠١', title:'ساعة الحائط', detail:'توقفت الساعة عند التاسعة وعشر دقائق. لا توجد علامة على كسرها أو العبث بآليتها.'},
      {n:'٠٢', title:'سجل البوابة', detail:'سجل الحارس خروج سيارة نديم عند التاسعة وعشرين دقيقة، لا عند التاسعة تمامًا.'},
      {n:'٠٣', title:'فنجان القهوة', detail:'وُجد فنجان دافئ على المكتب، وبجانبه أثر أحمر خفيف على حافته.'},
      {n:'٠٤', title:'ملاحظة بخط اليد', detail:'على قصاصة قرب الخزانة: «سأعود قبل أن تدق العاشرة». لم يُحدَّد كاتبها بعد.'}
    ],
    timeline: '٨:٤٥ مساءً: وصل نديم. · ٩:١٠ مساءً: توقفت الساعة. · ٩:٢٠ مساءً: خرجت سيارة نديم. · ١٠:٠٠ مساءً: أبلغ الحارس عن الحادث.',
    hints: ['لا تفترض أن الساعة المتوقفة تخبرك بوقت الحادث؛ اسأل أولًا إن كانت تعمل أصلًا.', 'قارن ما قاله الحارس عن دقات الساعة مع الدليل الأول.', 'الشهادة الأكثر ثقة ليست بالضرورة الأكثر دقة؛ هناك تناقض في رواية الحارس.'],
    answer: 'ماهر الخطيب', accepted: ['ماهر الخطيب','ماهر','الحارس'],
    solution: 'في النسخة التجريبية، يشير التناقض الأساسي إلى الحارس ماهر: فقد قال إنه سمع دقات الساعة العاشرة، بينما تشير المعاينة إلى أن الساعة توقفت عند التاسعة وعشر دقائق. هذا لا يثبت وحده أنه الفاعل في تحقيق واقعي، لكنه هو الاستنتاج المرجعي لهذه القضية التعليمية. الدليل الحاسم في هذه النسخة هو تناقض الشهادة مع حالة الساعة؛ أما بقية الأدلة فتوفر سياقًا يحتاج إلى مزيد من الفحص.'
  },
  {
    id: '024', title: 'الرسالة الأخيرة', category: 'جريمة مكتبية', difficulty: 'سهل', duration: '١٥ دقيقة', visual: 'visual-office',
    summary: 'رسالة وصلت بعد موعد إرسالها، وموظف ينكر أنه كان في المبنى.',
    briefing: 'اختفت وثيقة من مكتب شركة صغيرة قبل اجتماع مهم. لم تُكسر الأقفال، وتُظهر كاميرا الممر حركة شخص واحد بعد انتهاء الدوام. وصلت رسالة إلكترونية إلى المدير عند السابعة مساءً، لكن توقيت مسودة الرسالة يثير سؤالًا مهمًا.',
    victim: 'الشركة هي المتضرر، والوثيقة المفقودة مسودة عقد سري.',
    suspects: [
      {name:'رنا عيسى', role:'مديرة المشروع', detail:'كانت تملك صلاحية الوصول إلى الوثيقة، وتقول إنها غادرت عند الخامسة.'},
      {name:'فادي مراد', role:'موظف الأرشيف', detail:'قال إنه لم يعد إلى الطابق بعد السادسة.'},
      {name:'جواد سليم', role:'موظف تقنية المعلومات', detail:'كان يجري تحديثًا للنظام في غرفة الخوادم.'}
    ],
    evidence: [
      {n:'٠١', title:'مسودة الرسالة', detail:'حُفظت المسودة عند السادسة وعشرين دقيقة، رغم أن الرسالة أُرسلت في السابعة.'},
      {n:'٠٢', title:'سجل الدخول', detail:'بطاقة فادي فُتحت بها غرفة الأرشيف عند السادسة والنصف.'},
      {n:'٠٣', title:'كاميرا الممر', detail:'تظهر شخصًا يحمل ملفًا ورقيًا، لكن الوجه غير واضح.'}
    ],
    timeline: '٥:٠٠ مساءً: نهاية الدوام الرسمية. · ٦:٢٠ مساءً: حُفظت مسودة الرسالة. · ٦:٣٠ مساءً: فُتحت غرفة الأرشيف. · ٧:٠٠ مساءً: أُرسلت الرسالة.',
    hints: ['ركّز على الدليل الذي يسجل فعلًا موثقًا، لا على ما يقوله الأشخاص.', 'بطاقة الدخول تثبت استخدام البطاقة، لكنها لا تثبت وحدها هوية حاملها.', 'فادي هو الاستنتاج المرجعي، لكن يجب أن تذكر أن سجل البطاقة قرينة وليس دليلًا قاطعًا بمفرده.'],
    answer: 'فادي مراد', accepted: ['فادي مراد','فادي'],
    solution: 'الاستنتاج المرجعي هو فادي مراد، لأن بطاقة الدخول المرتبطة به استُخدمت لفتح غرفة الأرشيف بعد الدوام. ينبغي للمحقق الحذر أن يذكر أن سجل البطاقة قرينة تحتاج إلى دعم من الكاميرا أو سجل آخر، لأن استخدام البطاقة لا يثبت تلقائيًا من حملها.'
  },
  {
    id: '031', title: 'آخر قطار إلى الشمال', category: 'خط زمني', difficulty: 'صعب', duration: '٤٥ دقيقة', visual: 'visual-train',
    summary: 'ثلاثة شهود على رصيف واحد، لكن أوقاتهم لا تتوافق مع جدول القطار.',
    briefing: 'عُثر على حقيبة مفقودة في محطة صغيرة بعد مغادرة آخر قطار شمالًا. تحتوي الحقيبة على دفتر مهم، لكن صفحة منه ممزقة. يدّعي ثلاثة شهود أنهم غادروا الرصيف قبل وصول القطار، بينما سجل المحطة يوثق تأخيرًا غير متوقع.',
    victim: 'المتضرر هو الباحث الذي فقد دفتر ملاحظاته الأصلي.',
    suspects: [
      {name:'سلمى حمدان', role:'مسافرة', detail:'تقول إنها غادرت الرصيف قبل الثامنة بعشر دقائق.'},
      {name:'باسم خوري', role:'عامل المحطة', detail:'أكد أن القطار وصل في موعده المعتاد.'},
      {name:'رامي شاهين', role:'بائع الصحف', detail:'قال إنه أغلق كشكه بعد مغادرة القطار مباشرة.'}
    ],
    evidence: [
      {n:'٠١', title:'لوحة المواعيد', detail:'تُظهر أن القطار تأخر اثنتي عشرة دقيقة بسبب عطل في الإشارة.'},
      {n:'٠٢', title:'إيصال الكشك', detail:'طُبع الإيصال الأخير عند الثامنة وسبع دقائق.'},
      {n:'٠٣', title:'تسجيل المنصة', detail:'تظهر الحقيبة قرب المقعد بعد الثامنة وعشرين دقيقة.'}
    ],
    timeline: '٧:٥٨ مساءً: موعد القطار الأصلي. · ٨:٠٧ مساءً: طُبع آخر إيصال. · ٨:١٠ مساءً: الموعد المعدّل بعد التأخير. · ٨:٢٠ مساءً: ظهرت الحقيبة في التسجيل.',
    hints: ['أعد بناء الخط الزمني قبل اختيار شخص.', 'فرّق بين موعد القطار الأصلي وموعده بعد التأخير.', 'رواية باسم هي التي تتعارض مباشرة مع لوحة المواعيد؛ وهو الاستنتاج المرجعي في هذه النسخة.'],
    answer: 'باسم خوري', accepted: ['باسم خوري','باسم'],
    solution: 'الاستنتاج المرجعي هو باسم خوري، لأن قوله إن القطار وصل في موعده المعتاد يتعارض مع لوحة المواعيد التي توثق التأخير. هذا التناقض يجعله محور التحقيق، لكنه لا يكفي وحده لإثبات أنه أخذ الحقيبة؛ في تحقيق كامل يلزم دليل إضافي يربطه بالحقيبة.'
  }
];

const $ = (selector, root = document) => root.querySelector(selector);
const caseGrid = $('#caseGrid');
const caseDialog = $('#caseDialog');
const dialogContent = $('#dialogContent');
const toast = $('#toast');
let currentCase = null;
let hintCount = 0;
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
  const filtered=cases.filter(c=>(difficulty==='all'||c.difficulty===difficulty)&&`${c.title} ${c.category} ${c.summary} ${c.id}`.toLowerCase().includes(query));
  if(!filtered.length){caseGrid.innerHTML='<div class="empty-state">لم نعثر على قضية تطابق بحثك. جرّب كلمة أخرى أو غيّر مستوى الصعوبة.</div>';return;}
  const progress=getProgress();
  caseGrid.innerHTML=filtered.map(c=>`<article class="case-card">
    <div class="card-visual ${c.visual}"><span class="visual-file">ملف رقم ${c.id}</span><span class="visual-number">${c.id}</span><span class="visual-seal">BCN</span></div>
    <div class="card-body"><div class="card-meta"><span>${c.category}</span><span class="difficulty ${c.difficulty==='صعب'?'hard':''}">${c.difficulty}</span></div>
      <h3>${c.title}</h3><p>${c.summary}</p>
      <div class="card-footer"><span>${c.duration}${progress.completed.includes(c.id)?' · تم التحقيق ✓':''}</span><button type="button" data-open-case="${c.id}">فتح الملف <span>←</span></button></div>
    </div></article>`).join('');
  caseGrid.querySelectorAll('[data-open-case]').forEach(button=>button.addEventListener('click',()=>openCase(button.dataset.openCase)));
}
function openCase(id){
  currentCase=cases.find(c=>c.id===id);if(!currentCase)return;hintCount=0;
  const c=currentCase;const progress=getProgress();
  const hintOptions=c.hints.map((_,i)=>`<option value="${i}">التلميح ${['الأول','الثاني','الثالث'][i]} — خصم ${[5,10,15][i]} نقاط</option>`).join('');
  dialogContent.innerHTML=`
    <div class="dialog-title-row"><div><div class="eyebrow">${c.category} · ${c.difficulty} · ${c.duration}</div><h2 id="dialogTitle">${c.title}</h2><p>اقرأ الملف بعناية. استخدم الأدلة لبناء تفسيرك، ولا تكشف الحل قبل تقديم إجابتك.</p></div><div class="case-number-large">${c.id}</div></div>
    <section class="file-section"><h3>ملخص البلاغ</h3><p>${c.briefing}</p></section>
    <section class="file-section"><h3>المتضرر / موضوع القضية</h3><p>${c.victim}</p></section>
    <section class="file-section"><h3>الأشخاص الوارد ذكرهم</h3><div class="suspect-grid">${c.suspects.map(s=>`<article class="suspect"><strong>${s.name}</strong><span>${s.role}</span><p>${s.detail}</p></article>`).join('')}</div></section>
    <section class="file-section"><h3>الأدلة المرفقة</h3><div class="evidence-list">${c.evidence.map(e=>`<article class="evidence"><span class="evidence-number">${e.n}</span><div><strong>${e.title}</strong><p>${e.detail}</p></div></article>`).join('')}</div></section>
    <section class="file-section"><h3>الخط الزمني الأولي</h3><p>${c.timeline}</p></section>
    <section class="file-section"><h3>طلب تلميح</h3><div class="hint-box"><p>التلميحات تقلل نقاط نتيجتك. اختر المستوى الذي تحتاج إليه؛ سيظهر الخصم قبل عرض التلميح.</p><div class="hint-row"><select id="hintSelect" aria-label="اختر مستوى التلميح">${hintOptions}</select><button class="button button-outline" id="useHint">عرض التلميح</button></div><div class="hint-output" id="hintOutput"></div></div></section>
    <section class="file-section"><h3>استنتاج المحقق</h3><div class="answer-form"><label for="answerSelect">من الشخص الذي ترى أن الأدلة تشير إليه؟</label><select id="answerSelect"><option value="">اختر استنتاجك...</option>${c.suspects.map(s=>`<option value="${s.name}">${s.name} — ${s.role}</option>`).join('')}<option value="غير كافٍ">الأدلة غير كافية للحسم</option></select><label for="reasoning">ما الدليل الأهم الذي يدعم استنتاجك؟</label><textarea id="reasoning" placeholder="اكتب تعليلًا مختصرًا يربط الدليل باستنتاجك..."></textarea><button class="button button-primary" id="submitAnswer">تثبيت الإجابة ومراجعتها</button><div class="result-box" id="answerResult" aria-live="polite"></div></div></section>
    <section class="solution-panel" id="solutionPanel"><h3>الحل المرجعي وتحليل الأدلة</h3><p>${c.solution}</p></section>
    <div class="dialog-actions"><button class="subtle-button" id="resetCase">إعادة ضبط الإجابة</button><button class="button button-primary" id="revealSolution">كشف الحل بعد التأكيد</button></div>`;
  $('#dialogCaseNo').textContent=`ملف رقم ${c.id}`;
  $('#useHint').addEventListener('click',useHint);
  $('#submitAnswer').addEventListener('click',submitAnswer);
  $('#revealSolution').addEventListener('click',()=>{if(confirm('هل تريد كشف الحل المرجعي؟ حاول تثبيت إجابتك أولًا للحفاظ على تجربة التحقيق.')){$('#solutionPanel').classList.add('visible');$('#solutionPanel').scrollIntoView({behavior:'smooth',block:'nearest'});const p=getProgress();if(!p.completed.includes(c.id))p.completed.push(c.id);saveProgress(p);renderCases();}});
  $('#resetCase').addEventListener('click',()=>{if(confirm('هل تريد مسح إجابتك الحالية وإعادة المحاولة؟')){ $('#answerSelect').value='';$('#reasoning').value='';$('#answerResult').classList.remove('visible');$('#solutionPanel').classList.remove('visible');hintCount=0;$('#hintOutput').classList.remove('visible');showToast('تمت إعادة ضبط نموذج الإجابة.');}});
  caseDialog.showModal();document.body.classList.add('dialog-open');
}
function useHint(){
  const index=Number($('#hintSelect').value);const c=currentCase;const progress=getProgress();
  if(!progress.hints[c.id])progress.hints[c.id]=[];
  if(progress.hints[c.id].includes(index)){ $('#hintOutput').textContent=`لقد استخدمت هذا التلميح من قبل. ${c.hints[index]}`;$('#hintOutput').classList.add('visible');showToast('لن يُخصم هذا التلميح مرة أخرى في هذا المتصفح.');return; }
  const penalty=[5,10,15][index];
  if(!confirm(`سيُعرض التلميح مع خصم ${penalty} نقاط من نتيجة هذه المحاولة. هل تريد المتابعة؟`))return;
  progress.hints[c.id].push(index);saveProgress(progress);hintCount+=penalty;
  $('#hintOutput').textContent=`التلميح: ${c.hints[index]} (خصم ${penalty} نقاط)`;$('#hintOutput').classList.add('visible');showToast(`تم عرض التلميح. مجموع خصم التلميحات: ${hintCount} نقطة.`);
}
function submitAnswer(){
  const c=currentCase;const answer=$('#answerSelect').value;const reasoning=$('#reasoning').value.trim();const result=$('#answerResult');
  if(!answer){showToast('اختر استنتاجًا قبل تثبيت الإجابة.');$('#answerSelect').focus();return;}
  if(reasoning.length<8){showToast('أضف تعليلًا قصيرًا يوضح سبب اختيارك.');$('#reasoning').focus();return;}
  const accepted=c.accepted.some(a=>a===answer);const points=Math.max(0,(accepted?70:0)+(reasoning.length>=45?20:10)+(reasoning.includes('دليل')||reasoning.includes('شهادة')||reasoning.includes('ساعة')||reasoning.includes('سجل')?10:0)-hintCount);
  result.innerHTML=`<strong>${accepted?'إجابة مطابقة للاستنتاج المرجعي':'إجابة مختلفة عن الاستنتاج المرجعي'}</strong><p>نتيجة تجريبية أولية: <b>${points} / 100</b> بعد خصم التلميحات. ${accepted?'أحسنت؛ راجع الحل لتعرف كيف تتصل الأدلة ببعضها.':'راجع تناقضات الشهادات والخط الزمني، ثم قارن تعليلك بالحل المرجعي.'} هذه آلية أولية للعرض فقط وليست محرك تقييم نهائيًا.</p>`;
  result.classList.add('visible');const p=getProgress();if(!p.completed.includes(c.id))p.completed.push(c.id);saveProgress(p);renderCases();
}
$('#closeDialog').addEventListener('click',()=>{caseDialog.close();document.body.classList.remove('dialog-open');});
caseDialog.addEventListener('click',event=>{if(event.target===caseDialog){caseDialog.close();document.body.classList.remove('dialog-open');}});
caseDialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
$('#caseSearch').addEventListener('input',renderCases);$('#difficultyFilter').addEventListener('change',renderCases);
$('#menuToggle').addEventListener('click',()=>{const nav=$('.main-nav');const open=nav.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open));});
$('.main-nav').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{$('.main-nav').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false');}));
$('#resumeBtn').addEventListener('click',()=>{const p=getProgress();const next=cases.find(c=>!p.completed.includes(c.id))||cases[0];openCase(next.id);});
renderCases();
