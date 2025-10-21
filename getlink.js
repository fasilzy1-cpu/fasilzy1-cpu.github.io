javascript:(async function(){
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 🧩 自动读取 maindata
  let input = "";
  try {
    input = window.mainData || localStorage.getItem("panel_mainData_v1");
  } catch(e){}
  if (!input) return alert("❌ 未检测到面板数据 (mainData)");

  const match = input.match(/名称\{([\s\S]*?)\}/);
  if (!match) return alert("⚠️ mainData 中未找到 名称{} 区块");
  const lines = match[1].split(/\n+/).map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return alert("⚠️ 名称{} 中无有效内容");

  // 🧠 自动识别类型
  const pattern = lines.map(l=>{
    if (l.includes("超小")) return "超小";
    if (l.includes("小")) return "小";
    if (l.includes("大")) return "大";
    return null;
  }).filter(Boolean);

  if (!pattern.length) return alert("❌ 未识别出任何 大/小/超小");
  console.log("识别到顺序：", pattern);

  // 📦 映射表
  const mapCol5 = {'超小':'1:1卡7','小':'1:1卡9.9','大':'2:1卡50'};
  const mapCol6 = {'超小':'超小9.9F','小':'小额起量-全剧买断','大':'大额高充-49起-慎'};
  const mapCol8 = {'超小':'0.88','小':'1.88','大':'3.88'};

  // 🧱 收集表格列
  function buildColumns(){
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const maxCols = rows.reduce((m,r)=>Math.max(m,r.querySelectorAll('td').length),0);
    const cols = Array.from({length:maxCols},()=>[]);
    rows.forEach((row,rIdx)=>{
      const tds = Array.from(row.querySelectorAll('td'));
      tds.forEach((td,ci)=>{
        const sel = td.querySelector('.el-select');
        const inp = td.querySelector('input.el-input__inner');
        if(sel) cols[ci].push({rowIndex:rIdx,element:sel,type:'select'});
        else if(inp) cols[ci].push({rowIndex:rIdx,element:inp,type:'input'});
      });
    });
    return cols;
  }

  // ---------- 新版更稳选择逻辑 ----------
  function normalizeText(s){
    return (s||"").replace(/\s+/g,"").replace(/[()（）\[\]【】]/g,"")
      .replace(/[-—_·•·，,。:.：；;｜|/\\]/g,"").toLowerCase().trim();
  }
  async function waitDropdownFor(selectEl, timeout=2000){
    const start = Date.now();
    const input = selectEl.querySelector('input[aria-controls], input[role="combobox"], input.el-input__inner');
    const ariaId = input?.getAttribute('aria-controls') || null;
    input?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    input?.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    input?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    while (Date.now() - start < timeout){
      if (ariaId){
        const byId = document.getElementById(ariaId) || document.querySelector(`#${CSS.escape(ariaId)}`);
        if (byId && getComputedStyle(byId).display !== 'none'){
          const list = byId.querySelector('.el-select-dropdown__list, .el-select-dropdown__wrap .el-scrollbar__view') || byId;
          if (list) return list;
        }
      }
      const candidates = Array.from(document.querySelectorAll('.el-popper,.el-select__popper,.el-select-dropdown'));
      const visible = candidates.filter(p=>{
        const s=getComputedStyle(p); const r=p.getBoundingClientRect();
        return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
      });
      if (visible.length){
        visible.sort((a,b)=>{
          const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
          const sr=selectEl.getBoundingClientRect();
          const da=Math.hypot((ar.left+ar.right)/2-(sr.left+sr.right)/2,(ar.top+ar.bottom)/2-(sr.top+sr.bottom)/2);
          const db=Math.hypot((br.left+br.right)/2-(sr.left+sr.right)/2,(br.top+br.bottom)/2-(sr.top+sr.bottom)/2);
          return da-db;
        });
        const list=visible[0].querySelector('.el-select-dropdown__list, .el-select-dropdown__wrap .el-scrollbar__view');
        if(list) return list;
      }
      await sleep(50);
    }
    return null;
  }
  function pickOptionEl(listEl, targetText){
    const wantRaw = (targetText||'').trim();
    const want = normalizeText(wantRaw);
    const items = Array.from(listEl.querySelectorAll('.el-select-dropdown__item'));
    let exact = items.find(it => normalizeText(it.innerText) === want);
    if (exact) return exact;
    let scored = items.map(it=>{
      const t = normalizeText(it.innerText);
      let score = 0;
      if (t.includes(want)) score = 2;
      if (t.startsWith(want)) score = 3;
      const common = [...t].filter(ch => want.includes(ch)).length;
      return {el: it, score: score*1000 + common};
    });
    scored.sort((a,b)=>b.score - a.score);
    return scored[0]?.el || null;
  }
  async function clickOptionWithScroll(listEl, targetText){
    const tryPick = () => pickOptionEl(listEl, targetText);
    let el = tryPick();
    if (el){
      el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
      el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
      el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      return true;
    }
    for (let i=0; i<12; i++){
      listEl.scrollTop += 200;
      await sleep(60);
      el = tryPick();
      if (el){
        el.scrollIntoView({block:'center'});
        el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
        el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
        el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        return true;
      }
    }
    return false;
  }
  async function openAndSelect(selectEl, optionText){
    try{
      document.body.click();
      await sleep(30);
      const input = selectEl.querySelector('input.el-input__inner, input') || selectEl;
      input.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
      input.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
      input.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      const list = await waitDropdownFor(selectEl, 2200);
      if (!list) return false;
      return await clickOptionWithScroll(list, optionText);
    }catch(err){
      console.error('openAndSelect failed:', err);
      return false;
    }
  }

  async function fillInputReliable(inputEl,value){
    const nativeSet=Object.getOwnPropertyDescriptor(inputEl.__proto__,'value')?.set;
    if(nativeSet) nativeSet.call(inputEl,value); else inputEl.value=value;
    inputEl.dispatchEvent(new Event('input',{bubbles:true}));
    inputEl.dispatchEvent(new Event('change',{bubbles:true}));
    inputEl.blur();await sleep(30);
  }

  // 🧮 主逻辑（每行独立）
  const cols=buildColumns();
  const col5=cols[4]||[],col6=cols[5]||[],col8=cols[7]||[];
  console.log(`检测到：第5列(${col5.length}) 第6列(${col6.length}) 第8列(${col8.length})`);

  for(let i=0;i<pattern.length;i++){
    const key=pattern[i];
    if(col5[i]){await openAndSelect(col5[i].element,mapCol5[key]);await sleep(100);}
    if(col6[i]){await openAndSelect(col6[i].element,mapCol6[key]);await sleep(100);}
    if(col8[i]){await fillInputReliable(col8[i].element,mapCol8[key]);await sleep(60);}
  }

  console.log('✅ 完成：从面板 mainData 读取并精确填充');
})();
