/* 只送出白名單欄位；完整出生資料與姓名不會被本程式自動送出。 */
(() => {
  const section=document.getElementById('aiSection');
  const form=document.getElementById('aiForm');
  const status=document.getElementById('aiStatus');
  const conversation=document.getElementById('aiConversation');
  const question=document.getElementById('aiQuestion');
  const preview=document.getElementById('aiPayloadPreview');
  const consent=document.getElementById('aiConsent');
  const submit=document.getElementById('aiSubmit');
  const url=section.dataset.workerUrl.trim();
  const sitekey=section.dataset.turnstileSitekey.trim();
  let history=[], widgetId=null, busy=false, generation=0;

  function compactPalaces(){
    if(!chart)return [];
    return chart.palaces.map(p=>({
      palace:p.name,
      stars:mainNames(p),
      transformations:signs(p),
      body:Boolean(p.isBodyPalace)
    }));
  }
  // 用瀏覽器內建事件，避免排盤失敗時誤將舊命盤當作新命盤。
  function resetConversation(){
    generation++;history=[];conversation.replaceChildren();consent.checked=false;
    preview.textContent=JSON.stringify(compactPalaces(),null,2);
  }
  // 每次重新排盤都清除舊對話，避免不同人的資料混入下一次提問。
  document.getElementById('chartForm').addEventListener('chart:rendered',resetConversation);
  function addMessage(role,text){
    const item=document.createElement('div');item.className='ai-message '+role;
    const heading=document.createElement('strong');heading.textContent=role==='user'?'你的問題':'AI 回答（請核對命盤）';
    const body=document.createElement('p');body.textContent=text;
    item.append(heading,body);
    if(role==='assistant'){
      const names=[...new Set((chart?.palaces||[]).filter(p=>text.includes(p.name)).map(p=>p.name))];
      if(names.length){
        const label=document.createElement('div');label.className='ai-reference';label.textContent='回答提到的宮位（只供定位，非驗證 AI 說法）： ';
        for(const name of names){const p=chart.palaces.find(x=>x.name===name);const b=document.createElement('button');b.type='button';b.textContent=name+' ↗';b.dataset.palace=String(indexOf(chart,p));label.append(b);}
        item.append(label);
      }
    }
    conversation.append(item);
  }
  conversation.addEventListener('click',e=>{
    const button=e.target.closest('button[data-palace]');
    if(!button)return;
    if(matchMedia('(max-width: 500px)').matches)setView('list');
    selectPalace(Number(button.dataset.palace),false);
    document.getElementById('chartSection').scrollIntoView({behavior:'smooth'});
  });
  if(!/^https:\/\/[^\s/]+\.workers\.dev\/?$/.test(url)||!sitekey){
    status.textContent='AI 尚未啟用：網站管理者需設定 Worker 網址與 Turnstile 公開 sitekey。固定問題仍可使用。';
    return;
  }
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.onload=()=>{
    try{
      widgetId=window.turnstile.render('#aiTurnstile',{sitekey});
      form.hidden=false;
      status.textContent='AI 已連接；送出前可展開檢查十二宮摘要。每次送出均須完成驗證。';
    }catch{status.textContent='驗證元件設定有誤，AI 暫時無法使用。';}
  };
  script.onerror=()=>{status.textContent='無法載入驗證元件，AI 暫時無法使用。';};
  document.head.append(script);
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(busy||!chart||!consent.checked)return;
    if(!/^https:\/\/[^\s/]+\.workers\.dev\/?$/.test(url))return;
    const text=question.value.trim();
    const token=window.turnstile?.getResponse(widgetId);
    if(!text||text.length>350||!token){status.textContent='請輸入問題並完成驗證。';return;}
    const palaces=compactPalaces();
    if(palaces.length!==12)return;
    const currentGeneration=generation;
    busy=true;submit.disabled=true;status.textContent='AI 回答中，請稍候…';
    try{
      const response=await fetch(url.replace(/\/$/,'')+'/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:text,palaces,history:history.slice(-2),token})
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'AI 暫時無法回答，請稍後重試。');
      if(typeof data.answer!=='string'||!data.answer.trim())throw Error('AI 沒有回傳可顯示的回答。');
      if(currentGeneration!==generation)return;
      addMessage('user',text);addMessage('assistant',data.answer);
      history.push({role:'user',content:text},{role:'assistant',content:data.answer.slice(0,700)});
      history=history.slice(-2);question.value='';consent.checked=false;
      status.textContent='已收到回答。繼續提問時請重新確認傳送資料。';
    }catch(error){if(currentGeneration===generation)status.textContent=error.message||'網路錯誤，請稍後再試。';}
    finally{busy=false;submit.disabled=false;window.turnstile?.reset(widgetId);}
  });
})();