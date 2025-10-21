(async function(){
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const pattern = prompt('请输入数字序列（如 123）：');
  if (!pattern) return alert('已取消');

  const mapCol5 = { '1': '1:1卡7', '2': '1:1卡9.9', '3': '2:1卡50' };
  const mapCol6 = { '1': '超小9.9F', '2': '小额起量-全剧买断', '3': '大额高充-49起-慎' };
  const mapCol8 = { '1': '0.88', '2': '1.88', '3': '3.88' };

  // 构建列（select/input）映射
  function buildColumns(){
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const maxCols = rows.reduce((m, r) => Math.max(m, r.querySelectorAll('td').length), 0);
    const cols = Array.from({length: maxCols}, ()=>[]);
    rows.forEach((row, rIdx) => {
      const tds = Array.from(row.querySelectorAll('td'));
      tds.forEach((td, ci) => {
        const sel = td.querySelector('.el-select');
        const inp = td.querySelector('input.el-input__inner');
        if (sel) cols[ci].push({rowIndex: rIdx, type:'select', element: sel});
        else if (inp) cols[ci].push({rowIndex: rIdx, type:'input', element: inp});
      });
    });
    return cols;
  }

  // 派发原生鼠标事件
  function dispatchMouseEvent(target, type){
    const evt = new MouseEvent(type, { bubbles: true, cancelable: true, view: window });
    target.dispatchEvent(evt);
  }

  // 判断可见性
  function isVisible(el){
    if(!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // 等待并返回当前 select 对应的下拉列表容器（ul）
  async function waitForDropdownForSelect(selectEl, timeout = 1500){
    // 找 select 内的 input（Element Plus 通常把 aria-controls 放在内部 input）
    const input = selectEl.querySelector('input[aria-controls], input[role="combobox"]');
    const start = Date.now();
    let ariaId = input ? input.getAttribute('aria-controls') : null;

    while (Date.now() - start < timeout){
      // 如果有 aria-controls 且对应元素存在并可见，优先返回
      if (ariaId){
        const list = document.getElementById(ariaId) || document.querySelector(`#${CSS.escape(ariaId)}`);
        if (list && isVisible(list)) return list;
      }

      // 否则查找最近出现并可见的 .el-select-dropdown__list（更严格地限定在 .el-popper 下）
      const lists = Array.from(document.querySelectorAll('.el-select-dropdown__list, .el-select-dropdown__wrap .el-scrollbar__view'));
      for (const l of lists){
        if (isVisible(l)) {
          // 如果 input 有 ariaControls，优先匹配同一 popper（closest）
          if (ariaId) {
            const popper = l.closest('.el-popper, .el-select__popper, .el-select-dropdown, .el-scrollbar');
            if (popper && (popper.querySelector(`#${ariaId}`) || popper.querySelector(`[id="${ariaId}"]`))) return l;
          } else {
            // 若没有 ariaId，则返回第一个可见的
            return l;
          }
        }
      }
      await sleep(40);
    }
    return null;
  }

  // 在特定 list 容器里按文本查找并点击 li（使用原生事件）
  function clickItemInList(listEl, optionText){
    if(!listEl) return false;
    const items = Array.from(listEl.querySelectorAll('.el-select-dropdown__item'));
    const target = items.find(it => (it.innerText || '').trim() === optionText);
    if (target && isVisible(target)){
      dispatchMouseEvent(target, 'mousedown');
      dispatchMouseEvent(target, 'mouseup');
      dispatchMouseEvent(target, 'click');
      return true;
    }
    return false;
  }

  // 打开 select 并在它对应的浮层里选择文本
  async function openAndSelect(selectEl, optionText){
    try {
      // 1) 打开 select（对 input 用原生事件以兼容）
      const input = selectEl.querySelector('input, .el-input__inner') || selectEl;
      dispatchMouseEvent(input, 'mousedown');
      dispatchMouseEvent(input, 'mouseup');
      dispatchMouseEvent(input, 'click');

      // 2) 等待对应浮层
      const list = await waitForDropdownForSelect(selectEl, 1600);
      if (!list) {
        console.warn('未检测到浮层或超时，尝试在全局可见浮层中匹配');
        // 全局回退查找（可见浮层）
        const fallback = Array.from(document.querySelectorAll('.el-select-dropdown__list')).find(isVisible);
        if (!fallback) return false;
        return clickItemInList(fallback, optionText);
      }

      // 3) 在该 list 中查找并点击
      if (clickItemInList(list, optionText)) return true;

      // 4) 如果列表存在分页/滚动，尝试滚动并重试（少量尝试）
      const itemEls = Array.from(list.querySelectorAll('.el-select-dropdown__item'));
      for (const el of itemEls){
        el.scrollIntoView({block:'center'});
        await sleep(40);
        if (clickItemInList(list, optionText)) return true;
      }
      return false;
    } catch (e){
      console.error('openAndSelect error', e);
      return false;
    }
  }

  // 填充输入框并触发事件（更稳定）
  async function fillInputReliable(inputEl, value){
    inputEl.scrollIntoView({block:'center'});
    inputEl.focus();
    // 先使用原生赋值再派发事件
    const nativeSet = Object.getOwnPropertyDescriptor(inputEl.__proto__, 'value')?.set;
    if (nativeSet) nativeSet.call(inputEl, value);
    else inputEl.value = value;
    inputEl.dispatchEvent(new Event('input', {bubbles:true}));
    inputEl.dispatchEvent(new Event('change', {bubbles:true}));
    // 触发 blur 以使框架响应（有时需要）
    inputEl.blur();
    await sleep(30);
    return true;
  }

  // 执行 主流程
  const cols = buildColumns();
  const col5 = cols[4] || [];
  const col6 = cols[5] || [];
  const col8 = cols[7] || [];

  console.log(`检测到：第5列(${col5.length}) 第6列(${col6.length}) 第8列(${col8.length})`);

  // 第5列：每两行为一组，第1行不动，第2行选择 mapCol5
  if (col5.length){
    console.log('开始第5列...');
    for (let i=0;i<col5.length;i++){
      const group = Math.floor(i/2);
      const ch = pattern[group % pattern.length];
      const text = mapCol5[ch];
      if (!text) { console.warn(`第5列 第${i+1}行 跳过（无映射）`); continue; }
      if (i%2 === 1){
        console.log(`第5列 第${i+1}行 选择 ${text}`);
        const ok = await openAndSelect(col5[i].element, text);
        if (!ok) console.warn(`第5列 第${i+1}行 选择失败: ${text}`);
        await sleep(60);
      }
    }
  }

  // 第6列：两行都选相同
  if (col6.length){
    console.log('开始第6列...');
    for (let i=0;i<col6.length;i++){
      const group = Math.floor(i/2);
      const ch = pattern[group % pattern.length];
      const text = mapCol6[ch];
      if (!text) { console.warn(`第6列 第${i+1}行 跳过（无映射）`); continue; }
      console.log(`第6列 第${i+1}行 选择 ${text}`);
      const ok = await openAndSelect(col6[i].element, text);
      if (!ok) console.warn(`第6列 第${i+1}行 选择失败: ${text}`);
      await sleep(50);
    }
  }

  // 第8列：每两行一组，两行都填入数值
  if (col8.length){
    console.log('开始第8列...');
    for (let i=0;i<col8.length;i++){
      const group = Math.floor(i/2);
      const ch = pattern[group % pattern.length];
      const val = mapCol8[ch];
      if (!val) { console.warn(`第8列 第${i+1}行 跳过（无映射）`); continue; }
      console.log(`第8列 第${i+1}行 填入 ${val}`);
      await fillInputReliable(col8[i].element, val);
      await sleep(30);
    }
  }

  console.log('全部完成（更稳的高速版）');
})();
