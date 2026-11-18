/* 運限一律取 iztro.horoscope(指定陽曆日期)，不推算國曆／農曆月份對照。 */
(() => {
  const $=id=>document.getElementById(id);
  const labels={natal:'本命',decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日'};
  const transforms=['祿','權','科','忌'];
  const flyColors=['#448653','#b57b31','#4877ae','#af4f60'];
  const normalizeName=s=>String(s||'').replace(/宮$/,'').replace(/仆/g,'僕');
  const sameName=(a,b)=>normalizeStar(a)===normalizeStar(b);
  const el=(tag,cls,content)=>{const node=document.createElement(tag);node.className=cls;if(content!==undefined)node.textContent=String(content);return node;};
  let layer=null;
  function clearLayer(){
    for(const node of document.querySelectorAll('#chartGrid .palace-cell,#palaceList .palace-row')){
      node.querySelector('.layer-data')?.remove();node.classList.remove('layer-home');
    }
    $('layerStatus').textContent='';
  }
  function selectedLayer(){
    const scope=$('layerScope').value,date=$('layerDate').value;
    if(!chart||scope==='natal')return null;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<chart.solarDate)throw Error('查看日期須是出生當日或之後的有效陽曆日期。');
    const h=chart.horoscope(date),item=h[scope];
    if(!item||!Number.isInteger(item.index)||item.index<0||item.index>=12)throw Error('此日期沒有可核對的運限資料。');
    if(!Array.isArray(item.palaceNames)||item.palaceNames.length!==12||!Array.isArray(item.stars)||item.stars.length!==12)throw Error('此日期的十二宮運限資料不完整。');
    return {scope,date,h,item};
  }
  function starsAt(item,i){return Array.isArray(item.stars?.[i])?item.stars[i].map(s=>s.name).filter(Boolean):[];}
  function applyLayer(){
    clearLayer();layer=null;
    try{layer=selectedLayer();}catch(error){$('layerStatus').textContent=error.message;return;}
    if(!layer){$('layerStatus').textContent='顯示本命盤；點宮位可看宮干飛化，運限切換不改變本命星曜。';return;}
    const {scope,date,h,item}=layer;
    $('layerStatus').textContent=`${labels[scope]} · 陽曆 ${date} · 農曆 ${h.lunarDate||'—'}；${item.heavenlyStem||''}${item.earthlyBranch||''}。標示宮位與流曜；四化對應位置僅依 iztro 回傳的星名核對。`;
    for(const [i,p] of chart.palaces.entries()){
      for(const node of document.querySelectorAll(`.palace-cell[data-index="${i}"],.palace-row[data-index="${i}"]`)){
        if(i===item.index)node.classList.add('layer-home');
        const box=el('span','layer-data');
        const name=item.palaceNames?.[i];
        if(name)box.append(el('span','layer-palace',`${labels[scope]}${name}`));
        if(i===item.index)box.append(el('span','layer-palace layer-active',`${labels[scope]}所在宮`));
        const moving=starsAt(item,i);
        if(moving.length)box.append(el('span','layer-stars',`${labels[scope]}曜 ${moving.join('、')}`));
        const mutagens=(item.mutagen||[]).flatMap((star,j)=>{
          const match=[...(p.majorStars||[]),...(p.minorStars||[])].some(s=>sameName(s.name,star));
          return match?[`${labels[scope]}${transforms[j]}：${star}`]:[];
        });
        if(mutagens.length)box.append(el('span','layer-mutations',mutagens.join('、')));
        if(box.childNodes.length)node.append(box);
      }
    }
  }
  function flyTargets(p){
    // 同版本 iztro 的宮干四化表＋本命十二宮主／輔星定位；星曜不在盤上時保持未定位。
    const stars=iztro.util.getMutagensByHeavenlyStem(p.heavenlyStem);
    return transforms.map((name,j)=>({name,star:stars[j],target:chart.palaces.find(q=>[...(q.majorStars||[]),...(q.minorStars||[])].some(s=>sameName(s.name,stars[j])))}));
  }
  function drawFly(){
    const parent=$('chartGrid');parent.querySelector('.fly-overlay')?.remove();
    const list=$('flyList');list.replaceChildren();list.hidden=true;
    if(!chart||!$('showFly').checked||!Number.isInteger(selected))return;
    const p=chart.palaces[selected],edges=flyTargets(p);
    const intro=el('p','fly-intro',`${p.name}（${p.heavenlyStem}${p.earthlyBranch}）宮干飛化：依 iztro 宮干四化星名，從本命主／輔星尋找落宮；若星曜不在盤上則不畫線。`);list.append(intro);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','fly-overlay');svg.setAttribute('aria-hidden','true');
    const root=parent.getBoundingClientRect(),start=parent.querySelector(`.palace-cell[data-index="${selected}"]`)?.getBoundingClientRect();
    if(!start)return;
    svg.setAttribute('viewBox',`0 0 ${root.width} ${root.height}`);
    const defs=document.createElementNS(svg.namespaceURI,'defs');svg.append(defs);
    edges.forEach(({name,star,target},j)=>{
      if(!target){list.append(el('span','fly-unlocated',`${name} ${star}：本命盤未定位`));return;}
      const idx=chart.palaces.indexOf(target),end=parent.querySelector(`.palace-cell[data-index="${idx}"]`)?.getBoundingClientRect();
      if(!end)return;
      const marker=document.createElementNS(svg.namespaceURI,'marker');marker.id=`fly-arrow-${j}`;marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('refX','6');marker.setAttribute('refY','3.5');marker.setAttribute('orient','auto');
      const tip=document.createElementNS(svg.namespaceURI,'path');tip.setAttribute('d','M0 0 L7 3.5 L0 7 Z');tip.setAttribute('fill',flyColors[j]);marker.append(tip);defs.append(marker);
      const x=start.left-root.left+start.width/2,y=start.top-root.top+start.height/2;
      const a=end.left-root.left+end.width/2,b=end.top-root.top+end.height/2;
      const dx=a-x,dy=b-y,dist=Math.hypot(dx,dy)||1;
      const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',x);line.setAttribute('y1',y);line.setAttribute('x2',a-dx/dist*32);line.setAttribute('y2',b-dy/dist*32);line.setAttribute('stroke',flyColors[j]);line.setAttribute('stroke-width','2');line.setAttribute('marker-end',`url(#fly-arrow-${j})`);svg.append(line);
      const button=el('button','fly-link',`${star}化${name} → ${target.name}（${target.heavenlyStem}${target.earthlyBranch}）`);button.type='button';button.addEventListener('click',()=>{selectPalace(idx);requestAnimationFrame(drawFly);});list.append(button);
    });
    if(!list.querySelector('.fly-link'))list.append(el('span','fly-unlocated','此宮位的四化星曜目前沒有可畫出的本命落宮。'));
    list.hidden=false;parent.append(svg);
  }
  $('layerScope').addEventListener('change',applyLayer);
  $('layerDate').addEventListener('change',applyLayer);
  $('showFly').addEventListener('change',drawFly);
  $('chartGrid').addEventListener('click',e=>{if(e.target.closest('.palace-cell'))requestAnimationFrame(drawFly);});
  $('palaceList').addEventListener('click',e=>{if(e.target.closest('.palace-row'))requestAnimationFrame(drawFly);});
  $('decadalStrip').addEventListener('click',e=>{if(e.target.closest('.decadal-item'))requestAnimationFrame(drawFly);});
  $('result').addEventListener('click',e=>{if(e.target.closest('button[data-palace]'))requestAnimationFrame(drawFly);});
  $('palaceDetail').addEventListener('click',e=>{if(e.target.closest('button[data-target]'))requestAnimationFrame(drawFly);});
  new ResizeObserver(()=>{if($('showFly').checked)drawFly();}).observe($('chartGrid'));
  window.ziweiLayers={refresh(){applyLayer();drawFly();},current:()=>layer};
})();