/* 本頁只解讀可在 iztro 本命盤直接核對的主星、四化與宮位關係。 */
const $ = id => document.getElementById(id);
$('solarDate').value = new Date().toLocaleDateString('en-CA');
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const POSITIONS = {巳:[1,1],午:[1,2],未:[1,3],申:[1,4],辰:[2,1],酉:[2,4],卯:[3,1],戌:[3,4],寅:[4,1],丑:[4,2],子:[4,3],亥:[4,4]};
const normalize = s => String(s || '').replace(/宮$/,'').replace(/仆役|僕役/g,'交友').replace(/官祿/g,'官禄').replace(/財帛/g,'财帛').replace(/遷移/g,'迁移').replace(/夫妻/g,'夫妻').replace(/命宮/g,'命');
const normalizeStar = s => String(s || '').replace(/貞/g,'贞').replace(/機/g,'机').replace(/陰/g,'阴').replace(/陽/g,'阳').replace(/門/g,'门').replace(/輔/g,'辅').replace(/祿/g,'禄').replace(/權/g,'权').replace(/殺/g,'杀').replace(/軍/g,'军').replace(/狼/g,'狼');
const starRules = {
  '紫微':{style:'重視全局、責任與主導權',scene:'需要統籌資源或承擔決策的場合',tension:'若權責不清，容易把所有事情攬在自己身上'},
  '天机':{style:'傾向先比較資訊，再調整做法',scene:'研究、規劃或需要快速換位思考時',tension:'選項太多時可能遲遲難以定案'},
  '太阳':{style:'偏向公開表達、投入與照顧他人',scene:'能清楚發聲或帶領合作的場域',tension:'責任分配不均時容易消耗自己'},
  '武曲':{style:'看重可衡量成果與執行效率',scene:'資源盤點、執行和制度化工作',tension:'遇到感受或模糊需求時可能顯得過於直接'},
  '天同':{style:'在關係與感受中尋找穩定節奏',scene:'需要耐心、維持氣氛的合作',tension:'為了和諧可能推遲棘手的決定'},
  '廉贞':{style:'對界線、認同與自主性敏感',scene:'需要拿捏規則與人際界線的情況',tension:'規範和個人意願衝突時容易拉扯'},
  '天府':{style:'偏好累積、管理與守住既有資源',scene:'長期經營、維護系統和穩定協作',tension:'機會來得太快時可能顧慮太多'},
  '太阴':{style:'習慣細察感受與內在需求',scene:'需要耐心觀察、積累與細節的環境',tension:'不確定時容易把顧慮放在心裡'},
  '贪狼':{style:'對新鮮事物、人脈與選擇保持好奇',scene:'跨圈交流、試驗新路徑時',tension:'興趣分散時需要設定優先順序'},
  '巨门':{style:'傾向追問細節與辨析說法',scene:'談判、研究或查核資訊時',tension:'溝通急迫時可能讓對方感到被質疑'},
  '天相':{style:'注重公平、程序與合作分工',scene:'協調、多方對接與制度執行',tension:'難以拒絕不合理請求時易失去界線'},
  '天梁':{style:'傾向從經驗、原則與照顧角度判斷',scene:'指導、整理經驗與處理疑難',tension:'想保護別人時可能承擔過多'},
  '七杀':{style:'面對挑戰時重視果斷與獨立',scene:'需要在變動中快速承擔責任時',tension:'速度快時可能忽略團隊的適應節奏'},
  '破军':{style:'更願意拆解舊方法、重組現狀',scene:'轉型、開新局或處理僵化流程',tension:'破舊速度超過新秩序建立時易反覆'}
};
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const majors = p => (p?.majorStars || []).filter(s=>s.type === 'major');
const mainNames = p => majors(p).map(s=>s.name);
const signs = p => [...(p?.majorStars||[]),...(p?.minorStars||[])].filter(s=>s.mutagen && s.scope === 'origin').map(s=>`${s.name}化${s.mutagen}`);
const nameOf = p => p?.name || '未定位';
const byName = (chart,name) => chart.palaces.find(p=>normalize(p.name)===normalize(name));
const indexOf = (chart,p) => chart.palaces.indexOf(p);
function surrounded(chart,p){
  const i=BRANCHES.indexOf(p.earthlyBranch);
  if(i<0) return [p];
  return [0,4,8,6].map(d=>chart.palaces.find(x=>x.earthlyBranch===BRANCHES[(i+d)%12])).filter(Boolean);
}
function selectedGroup(chart,p){return new Set(surrounded(chart,p).map(x=>indexOf(chart,x)));}
let chart=null, fortune=null, selected=null, view='grid', assistantQuestion=null;
let birthInput=null;
function resolveBirthInput(){
  const date=$('solarDate').value,clock=$('birthClock').value,dst=$('dstCorrection').checked;
  const place=$('birthPlace').value.trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('請填寫有效的陽曆出生日期。');
  if(!clock){
    if(dst)throw Error('要扣回夏令時間，請先填寫出生當地鐘錶時間。');
    const index=Number($('timeIndex').value);
    if(!Number.isInteger(index)||index<0||index>12)throw Error('請選擇出生時辰，或填寫精確的當地鐘錶時間。');
    return {date,index,place,clock:'',dst:false,originalDate:date};
  }
  const match=/^(\d{2}):(\d{2})$/.exec(clock);
  if(!match||Number(match[1])>23||Number(match[2])>59)throw Error('出生當地鐘錶時間格式不正確。');
  const [year,month,day]=date.split('-').map(Number);
  const local=new Date(Date.UTC(year,month-1,day,Number(match[1]),Number(match[2])));
  if(local.getUTCFullYear()!==year||local.getUTCMonth()+1!==month||local.getUTCDate()!==day)throw Error('出生日期無效。');
  // UTC 的日期方法只用於安全進位／退位；此處沒有把出生地當成 UTC 時區。
  if(dst)local.setUTCMinutes(local.getUTCMinutes()-60);
  const correctedDate=`${local.getUTCFullYear()}-${String(local.getUTCMonth()+1).padStart(2,'0')}-${String(local.getUTCDate()).padStart(2,'0')}`;
  const correctedClock=`${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`;
  // iztro 區分早子時（0，00:00–01:00）及晚子時（12，23:00–24:00）。
  const index=local.getUTCHours()===23?12:Math.floor((local.getUTCHours()+1)/2);
  return {date:correctedDate,index,place,clock,dst,correctedClock,originalDate:date};
}
function showError(message){$('error').textContent=message;$('error').hidden=false;}
$('birthClock').addEventListener('input',()=>{$('timeIndex').required=!$('birthClock').value;});
$('birthClock').addEventListener('change',()=>{$('timeIndex').required=!$('birthClock').value;});
function setView(next){view=next;$('chartScroll').hidden=next!=='grid';$('chartScrollHint').hidden=next!=='grid';$('palaceList').hidden=next!=='list';for(const [id,v] of [['viewGrid','grid'],['viewList','list']]){$(id).classList.toggle('active',v===next);$(id).setAttribute('aria-pressed',String(v===next));}}
$('layerDate').value=$('solarDate').value;
$('viewGrid').addEventListener('click',()=>setView('grid'));
$('viewList').addEventListener('click',()=>setView('list'));
$('chartForm').addEventListener('submit',e=>{
  e.preventDefault();$('error').hidden=true;
  if(!window.iztro?.astro?.bySolar){showError('排盤函式庫未載入。請連上網路後重新整理，再試一次。');return;}
  const button=$('submitBtn');button.disabled=true;
  try{
    // 保留原本的排盤呼叫、參數與語言；原有「當前運限」摘要仍取當前日期。
    birthInput=resolveBirthInput();
    chart=iztro.astro.bySolar(birthInput.date,birthInput.index,$('gender').value,true,'zh-TW');
    fortune=chart.horoscope(new Date());
    render($('name').value.trim()||'命主');
    const note=document.createElement('span');note.className='birth-correction';
    note.textContent=birthInput.clock?`出生地：${birthInput.place||'未提供'}（僅記錄） · 出生紀錄：${birthInput.originalDate} ${birthInput.clock}（當地鐘錶時間） · ${birthInput.dst?'依本人確認夏令時間扣回一小時':'未套用夏令時間校正'} · 排盤採用：${birthInput.date} ${birthInput.correctedClock}，${birthInput.index===12?'晚子':'子丑寅卯辰巳午未申酉戌亥'[birthInput.index]}時。未做歷史時區或真太陽時校正。`:`出生地：${birthInput.place||'未提供'}（僅記錄） · 依手選時辰排盤；未做夏令時間、歷史時區或真太陽時校正。`;
    $('birthLine').append(note);
    $('layerDate').min=chart.solarDate;
    if($('layerDate').value<chart.solarDate)$('layerDate').value=chart.solarDate;
    $('layerScope').value='natal';$('showFly').checked=false;
    $('chartForm').dispatchEvent(new Event('chart:rendered'));
    $('result').hidden=false;
    setView('grid');
    selectPalace(indexOf(chart,byName(chart,'命')),false);
    if(window.ziweiLayers)window.ziweiLayers.refresh();
    $('chartSection').scrollIntoView({behavior:'smooth'});
  }catch(err){console.error(err);showError(err.message||'排盤失敗，請確認日期與時辰；如持續發生，請檢查網路連線。');}
  finally{button.disabled=false;}
});
function makeBadges(p,isSelected){return `${normalize(p.name)==='命'?'<span class="badge soul">命宮</span>':''}${p.isBodyPalace?'<span class="badge body">身宮</span>':''}${isSelected?'<span class="badge pick">選取</span>':''}`;}
const starMarkup = (stars,className) => stars.map(s=>`<span class="${className}">${escapeHTML(s.name)}${s.mutagen&&s.scope==='origin'?`<span class="star-transform">化${escapeHTML(s.mutagen)}</span>`:''}</span>`).join('');
const periodText = p => {
  const range=p.decadal;
  return range&&Number.isFinite(Number(range.range?.[0]))&&Number.isFinite(Number(range.range?.[1]))?`${range.range[0]}–${range.range[1]}歲`:'';
};
function drawChart(){
  const grid=$('chartGrid');grid.replaceChildren();
  for(const [i,p] of chart.palaces.entries()){
    const pos=POSITIONS[p.earthlyBranch];if(!pos)throw Error('無法定位地支：'+p.earthlyBranch);
    const btn=document.createElement('button');btn.type='button';btn.className='palace-cell';btn.dataset.index=i;btn.style.gridRow=pos[0];btn.style.gridColumn=pos[1];btn.addEventListener('click',()=>selectPalace(i));
    btn.innerHTML=`<span class="palace-stars"><span class="major-group">${starMarkup(majors(p),'major-star')||'<span class="empty-star">無主星</span>'}</span><span class="minor-group">${starMarkup(p.minorStars||[],'minor-star')}</span><span class="misc-group">${(p.adjectiveStars||[]).map(s=>`<span>${escapeHTML(s.name)}</span>`).join('')}</span></span><span class="palace-footer"><span class="cell-branch">${escapeHTML(p.heavenlyStem+p.earthlyBranch)}</span><span class="palace-title"><span class="cell-name">${escapeHTML(p.name)}</span><span class="badges"></span></span><span class="palace-period">${escapeHTML(periodText(p))}</span></span>`;grid.append(btn);
  }
  const center=document.createElement('div');center.className='chart-center';center.innerHTML=`<div class="center-heading"><span>本命星盤 · 十二宮</span><strong>紫微斗數</strong></div><div class="center-facts"><div><b>陽曆</b><span>${escapeHTML(chart.solarDate)} · ${escapeHTML(chart.time)} ${escapeHTML(chart.timeRange)}</span></div><div><b>農曆</b><span>${escapeHTML(chart.lunarDate)}</span></div><div><b>干支</b><span>${escapeHTML(chart.chineseDate)}</span></div><div><b>局數</b><span>${escapeHTML(chart.fiveElementsClass||'—')}</span></div><div><b>命主／身主</b><span>${escapeHTML(chart.soul||'—')}／${escapeHTML(chart.body||'—')}</span></div><div><b>命宮／身宮</b><span>${escapeHTML(chart.earthlyBranchOfSoulPalace||'—')}／${escapeHTML(chart.earthlyBranchOfBodyPalace||'—')}</span></div></div><small>點宮位可查看三方四正；命盤僅供文化參考。</small>`;grid.append(center);
  const strip=$('decadalStrip');strip.replaceChildren();
  const label=document.createElement('span');label.className='decadal-label';label.textContent='大限';strip.append(label);
  const periods=chart.palaces.filter(p=>periodText(p)).sort((a,b)=>Number(a.decadal.range[0])-Number(b.decadal.range[0]));
  for(const p of periods){
    const button=document.createElement('button');button.type='button';button.className='decadal-item';
    button.innerHTML=`<span>${escapeHTML(nameOf(p))}</span><span>${escapeHTML(periodText(p))}</span>`;
    button.addEventListener('click',()=>selectPalace(indexOf(chart,p),false));strip.append(button);
  }
  const list=$('palaceList');list.replaceChildren();
  for(const [i,p] of chart.palaces.entries()){
    const btn=document.createElement('button');btn.type='button';btn.className='palace-row';btn.dataset.index=i;btn.addEventListener('click',()=>selectPalace(i));
    btn.innerHTML=`<span class="row-name">${escapeHTML(p.name)}</span><span class="row-stars">${escapeHTML(mainNames(p).join('・')||'無主星')}<br><span class="row-note">${escapeHTML(signs(p).join('・')||p.heavenlyStem+p.earthlyBranch)}</span></span><span class="badges"></span>`;list.append(btn);
  }
}
function selectPalace(i,scroll=true){
  if(!chart || !chart.palaces[i])return;
  selected=i;const p=chart.palaces[i], linked=selectedGroup(chart,p);
  for(const node of document.querySelectorAll('.palace-cell,.palace-row')){
    const n=Number(node.dataset.index), q=chart.palaces[n];
    node.classList.toggle('selected',n===i);
    node.classList.toggle('related',n!==i && linked.has(n));
    node.classList.toggle('soul',normalize(q.name)==='命');
    node.classList.toggle('body',Boolean(q.isBodyPalace));
    node.setAttribute('aria-pressed',String(n===i));
    node.querySelector('.badges').innerHTML=makeBadges(q,n===i);
  }
  const others=surrounded(chart,p).filter(x=>x!==p);
  const main=mainNames(p);
  const setting=main.map(x=>starRules[normalizeStar(x)]?.style).filter(Boolean).join('，');
  const secondary=(p.minorStars||[]).map(s=>s.name).join('、')||'無';
  const misc=(p.adjectiveStars||[]).map(s=>s.name).join('、')||'無';
  $('palaceDetail').innerHTML=`<div class="eyebrow">PALACE NOTES · ${escapeHTML(p.heavenlyStem+p.earthlyBranch)}</div><h3>${escapeHTML(nameOf(p))} ${makeBadges(p,true)}</h3><p class="detail-metadata">主星：${escapeHTML(main.join('、')||'無主星')}　·　輔星：${escapeHTML(secondary)}　·　雜曜：${escapeHTML(misc)}</p><p class="detail-metadata">本命四化：${escapeHTML(signs(p).join('、')||'本宮未標示')}</p><p>${escapeHTML(main.length?`以本宮主星看，${setting||'重點在與其他宮位合看'}。這是星曜象徵，不等於事件會發生。`:'本宮無主星；先參考對宮的主星，再與三合宮並讀，不自行補出本宮星曜。')}</p><p>三方四正：${others.map(x=>`<button type="button" class="jump" data-target="${indexOf(chart,x)}">${escapeHTML(nameOf(x))}（${escapeHTML(mainNames(x).join('、')||'無主星')}）</button>`).join('、')}。所列為同一地支盤上的兩個三合宮與對宮。</p>`;
  if(scroll)$('palaceDetail').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function summary(text,heading,places){return {heading,text,places};}
function palaceFacts(p){return `${nameOf(p)}${mainNames(p).length?`有${mainNames(p).join('、')}`:'無主星'}${signs(p).length?`，${signs(p).join('、')}`:''}`;}
function primary(chart,name){return byName(chart,name) || chart.palaces[0];}
function buildSummaries(c){
  const soul=primary(c,'命'),career=primary(c,'官祿'),wealth=primary(c,'財帛'),partner=primary(c,'夫妻');
  const opposite=surrounded(c,soul)[3];
  const first=mainNames(soul).length?`命宮主星${mainNames(soul).join('、')}提示${mainNames(soul).map(x=>starRules[normalizeStar(x)]?.style).filter(Boolean).join('，')}。`:`命宮無主星，需參考對宮${nameOf(opposite)}的${mainNames(opposite).join('、')||'配置'}，不宜單看命宮。`;
  const second=`官祿宮${mainNames(career).join('、')||'無主星'}與財帛宮${mainNames(wealth).join('、')||'無主星'}${mainNames(career).some(x=>mainNames(wealth).includes(x))?'呼應': '提供不同的工作／資源視角'}；先看工作方式，再看資源運用。`;
  const third=`夫妻宮${mainNames(partner).join('、')||'無主星'}，對照命宮${mainNames(soul).join('、')||'無主星'}；${!mainNames(partner).length||!mainNames(soul).length?'有空宮時需再看對宮與三合宮，不宜只看兩個宮位。':mainNames(partner).join('')===mainNames(soul).join('')?'兩宮主星相同，可留意期待是否一致。':'兩宮主星不同，留意各自需要的相處節奏。'}`;
  return [summary(first,'行事節奏',[soul,opposite]),summary(second,'工作與資源',[career,wealth]),summary(third,'關係的對照',[partner,soul])];
}
function tone(p){
  const stars=mainNames(p), s=stars[0], rule=starRules[normalizeStar(s)];
  if(!s)return {style:'此宮無主星，不能直接以單星定調',scene:'需要借對宮與三合宮交叉確認時',tension:'只憑空宮判斷容易失焦',star:null};
  return {...(rule||{style:'此宮主星需要與相關宮位合看',scene:'多宮位訊號相互補充時',tension:'單看一顆星可能忽略其他條件'}),star:s};
}
function theme(c,code,title,question,base,other,subject){
  const a=primary(c,base),b=primary(c,other),ta=tone(a),tb=tone(b);
  const aSigns=signs(a),bSigns=signs(b);
  const contrast=ta.star && tb.star && normalizeStar(ta.star)!==normalizeStar(tb.star);
  const linked=surrounded(c,a).includes(b);
  const additional=mainNames(a).slice(1).map(s=>starRules[normalizeStar(s)]?`${s}另提示${starRules[normalizeStar(s)].style}`:`${s}也在本宮`).join('；');
  const tendency=ta.star?`從${nameOf(a)}的${ta.star}看，${ta.style}${additional?'；'+additional:''}`:`${nameOf(a)}無主星；${nameOf(b)}${tb.star?'的'+tb.star:'也無主星'}提供另一個可核對的角度`;
  const scene=ta.star?`${ta.scene}，這個傾向可能較容易被看見`:`先看${nameOf(b)}${tb.star?'的'+tb.star:''}與其他三合宮是否有呼應，再決定如何理解`;
  const pull=contrast?`${nameOf(a)}偏向「${ta.style}」，${nameOf(b)}偏向「${tb.style}」。${ta.scene}時前者較明顯；${tb.scene}時後者較突出。若兩種需求同時出現，${ta.tension}；${tb.tension}。`:`${ta.tension}。與${nameOf(b)}對照時，留意${tb.tension}。`;
  const transformation=aSigns.length||bSigns.length?`可核對的生年四化：${[...aSigns,...bSigns].join('、')}；這裡只標示位置，不推定吉凶或事件。`:'這兩宮未標示生年四化；本段不推論未顯示的四化。';
  const evidence=[{p:a,text:palaceFacts(a)},{p:b,text:palaceFacts(b)}];
  if(linked)evidence.push({p:a,text:`${nameOf(a)}與${nameOf(b)}屬三方四正（依地支相隔四或六位）`});
  return {code,title,question,subject,tendency,scene,pull,transformation,evidence};
}
function buildThemes(c){return [
  theme(c,'character','性格與決策','需要做決定時，先看全局還是先動手？','命','遷移','把內在取向與外在環境對照'),
  theme(c,'career','事業與工作環境','什麼樣的工作方式比較容易發揮？','官祿','命','把工作宮與個人行事節奏對照'),
  theme(c,'finance','財務傾向','管理資源時，較重效率還是保留彈性？','財帛','田宅','比較資源運用與長期安置；不是投資建議'),
  theme(c,'relationships','關係與相處','在親密關係裡，哪些需要說清楚？','夫妻','福德','比較互動期待與內在休息需求')
];}
function assistantOptions(c){
  const themes=buildThemes(c);
  const soul=primary(c,'命'), body=c.palaces.find(p=>p.isBodyPalace);
  const group=surrounded(c,soul);
  return [
    ...themes.map(t=>({code:t.code,label:t.question,title:t.title,
      lines:[`主要傾向：${t.tendency}。`,`發揮情境：${t.scene}。`,`可能拉扯：${t.pull}`,`觀察範圍：${t.subject}。${t.transformation}`],
      evidence:t.evidence})),
    {code:'surround',label:'命宮的三方四正怎麼看？',title:'命宮的三方四正',
      lines:[`命宮${palaceFacts(soul)}。`,group.length===4?`同盤的兩個三合宮是${palaceFacts(group[1])}、${palaceFacts(group[2])}；對宮是${palaceFacts(group[3])}。`:'目前無法完整定位三方四正，請以命盤所列宮位為準。','這些宮位提供對照線索，不等於事件會發生。'],
      evidence:group.map(p=>({p,text:palaceFacts(p)}))},
    {code:'body',label:'我的身宮在哪裡？',title:'身宮位置',
      lines:body?[`身宮位於${nameOf(body)}（${body.heavenlyStem}${body.earthlyBranch}），本宮${mainNames(body).join('、')||'無主星'}。`,'身宮標記來自排盤結果；這裡只說明位置，不由此推斷人生結果。']:['這份排盤沒有標示身宮位置，無法由本頁判斷。'],
      evidence:body?[{p:body,text:`身宮標記：${palaceFacts(body)}`}]:[]}
  ];
}
function showAssistantAnswer(code){
  const item=assistantOptions(chart).find(option=>option.code===code);
  if(!item)return;
  assistantQuestion=code;
  for(const button of $('assistantQuestions').querySelectorAll('button[data-question]')){
    const active=button.dataset.question===code;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
  $('assistantAnswer').innerHTML=`<h3>${escapeHTML(item.title)}</h3>${item.lines.map(line=>`<p>${escapeHTML(line)}</p>`).join('')}<div class="assistant-evidence"><strong>命盤依據 · 點選可查看宮位</strong><ul>${item.evidence.map(({p,text})=>`<li><button type="button" data-palace="${indexOf(chart,p)}">${escapeHTML(text)} ↗</button></li>`).join('')}</ul></div>`;
}
function renderAssistant(){
  $('assistantQuestions').replaceChildren();
  for(const item of assistantOptions(chart)){
    const button=document.createElement('button');button.type='button';button.className='assistant-question';
    button.dataset.question=item.code;button.textContent=item.label;
    button.setAttribute('aria-pressed','false');
    $('assistantQuestions').append(button);
  }
  assistantQuestion=null;
  $('assistantAnswer').innerHTML='<p>請選擇上方的一個問題。</p>';
}
$('assistantQuestions').addEventListener('click',e=>{
  const button=e.target.closest('button[data-question]');
  if(button && chart)showAssistantAnswer(button.dataset.question);
});
function renderReadings(){
  const summaries=buildSummaries(chart);
  $('summaryList').replaceChildren();
  for(const item of summaries){const div=document.createElement('div');div.className='summary-item';div.innerHTML=`<strong>${escapeHTML(item.heading)}</strong>${escapeHTML(item.text)}<details class="evidence"><summary>查看命盤依據</summary><ul>${item.places.map(p=>`<li><button type="button" data-palace="${indexOf(chart,p)}">${escapeHTML(palaceFacts(p))} ↗</button></li>`).join('')}</ul></details>`;$('summaryList').append(div);}
  $('themeGrid').replaceChildren();
  for(const t of buildThemes(chart)){
    const article=document.createElement('article');article.className='theme-card';
    article.innerHTML=`<h4>${escapeHTML(t.title)}</h4><p class="theme-question">${escapeHTML(t.question)}</p><p><b>主要傾向：</b>${escapeHTML(t.tendency)}。</p><p><b>發揮情境：</b>${escapeHTML(t.scene)}。</p><p><b>可能拉扯：</b>${escapeHTML(t.pull)}</p><p><b>觀察範圍：</b>${escapeHTML(t.subject)}。本段主要採宮位主星及跨宮對照；不是完整流派論命。</p><details class="evidence"><summary>查看命盤依據</summary><ul>${t.evidence.map(e=>`<li><button type="button" data-palace="${indexOf(chart,e.p)}">${escapeHTML(e.text)} ↗</button></li>`).join('')}<li>${escapeHTML(t.transformation)}</li></ul></details>`;
    $('themeGrid').append(article);
  }
}
function render(name){
  $('resultName').textContent=`${name}的命盤`;
  $('birthLine').textContent=`陽曆 ${chart.solarDate} · ${chart.time} ${chart.timeRange}　／　農曆 ${chart.lunarDate}`;
  $('identitySide').textContent=`命主 ${chart.soul} · 身主 ${chart.body}\n命宮 ${chart.earthlyBranchOfSoulPalace} · 身宮 ${chart.earthlyBranchOfBodyPalace}\n${chart.fiveElementsClass}`;
  drawChart();renderReadings();renderAssistant();
  const d=fortune?.decadal,y=fortune?.yearly;
  $('flowContent').innerHTML=`<div class="flow-grid"><div><b>大限</b><br>${escapeHTML(d?.index>=0?nameOf(chart.palaces[d.index]):'資料不足')} · ${escapeHTML(d?.heavenlyStem||'')}${escapeHTML(d?.earthlyBranch||'')}<br>目前虛歲 ${escapeHTML(fortune?.age?.nominalAge??'—')}</div><div><b>流年</b><br>${escapeHTML(y?.index>=0?nameOf(chart.palaces[y.index]):'資料不足')} · ${escapeHTML(y?.heavenlyStem||'')}${escapeHTML(y?.earthlyBranch||'')}<br>${escapeHTML(fortune?.solarDate||'')}</div></div>`;
}
$('result').addEventListener('click',e=>{const btn=e.target.closest('button[data-palace]');if(!btn)return;const i=Number(btn.dataset.palace);if(matchMedia('(max-width: 500px)').matches)setView('list');selectPalace(i,false);$('chartSection').scrollIntoView({behavior:'smooth'});});
$('palaceDetail').addEventListener('click',e=>{const btn=e.target.closest('button[data-target]');if(btn)selectPalace(Number(btn.dataset.target));});