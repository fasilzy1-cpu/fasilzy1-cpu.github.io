
(()=>{
/***********************
 * 📋 主面板（panel_full_final.js）
 * 基于 panel_saved_full.js 整合：自动保存、本地恢复、清空后关闭 + 批量匹配填充
 ***********************/

/* 🍞 全局提示：轻量浮层提示 */
function showToast(message, type="info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:999999;
    background:${type==="error"?"#f44336":type==="success"?"#4CAF50":"#333"};
    color:white;padding:8px 14px;margin-top:8px;
    border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    opacity:0;transition:opacity .3s ease;font-size:14px;
  `;
  document.body.appendChild(toast);
  setTimeout(()=>toast.style.opacity=1,10);
  setTimeout(()=>{toast.style.opacity=0;setTimeout(()=>toast.remove(),300);},2000);
}

(function(){

  /* 🔒 防重：面板单例 */
  if(document.getElementById("dataToolPanel")) {
    showToast("⚠️ 面板已存在","info");
    return;
  }

  /* 💾 自动保存：读取/写入 mainData */
  const storageKey = "panel_mainData_v1";
  let mainData = localStorage.getItem(storageKey);
  if(mainData){
    showToast("✅ 已从本地恢复数据","success");
  }else{
    mainData = prompt("请输入要保存的数据：");
    if(!mainData){ showToast("已取消输入","info"); return; }
    localStorage.setItem(storageKey, mainData);
    showToast("📦 数据已保存到本地","success");
  }
  const saveData = ()=>localStorage.setItem(storageKey, mainData);

  /* 🧱 面板 UI：容器/标题/拖动 */
  const panel=document.createElement("div");
  panel.id="dataToolPanel";
  panel.style.cssText=`
    position:fixed;bottom:20px;right:20px;background:#fff;
    border:1px solid #ccc;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);
    padding:10px;z-index:999999;font-family:sans-serif;user-select:none;min-width:240px;
  `;
  const header=document.createElement("div");
  header.textContent="📋 数据工具面板";
  header.style.cssText=`
    cursor:move;font-weight:bold;margin-bottom:8px;background:#f5f5f5;
    padding:4px 8px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;
  `;
  panel.appendChild(header);

  /* 🖱️ 拖动：按下/移动/松开 */
  let offsetX,offsetY,isDragging=false;
  header.addEventListener("mousedown",e=>{
    isDragging=true;offsetX=e.clientX-panel.offsetLeft;offsetY=e.clientY-panel.offsetTop;
    document.body.style.userSelect='none';
  });
  document.addEventListener("mousemove",e=>{
    if(isDragging){panel.style.left=e.clientX-offsetX+"px";panel.style.top=e.clientY-offsetY+"px";
    panel.style.bottom="";panel.style.right="";}
  });
  document.addEventListener("mouseup",()=>{isDragging=false;document.body.style.userSelect='';});

  /* 🧩 工具：按钮工厂 */
  const mkBtn=(txt,fn)=>{const b=document.createElement("button");
    b.textContent=txt;b.style.margin="4px";b.style.padding="4px 8px";
    b.style.borderRadius="6px";b.style.cursor="pointer";b.onclick=fn;return b;};

  /* 🔗 工具：根据账户ID点击落地页链接（a.el-link 含 aadvid） */
  function clickAccountsByID(accountIDs) {
    let found = [], notFound = [];
    accountIDs.forEach(aid => {
      let ok = false;
      document.querySelectorAll("a.el-link").forEach(a => {
        if(a.href.includes("aadvid=" + aid)) { a.click(); ok = true; }
      });
      ok ? found.push(aid) : notFound.push(aid);
    });
    return {found, notFound};
  }

  /* 📋 按钮：复制 mainData */
  const btnCopyAll = mkBtn("复制内容",()=>{
    navigator.clipboard.writeText(mainData).then(()=>showToast("已复制全部内容","success"));
  });

  /* 📋 按钮：复制账户ID */
  const btnCopyID = mkBtn("复制账户ID",()=>{
    const m=mainData.match(/账户ID\{([\s\S]*?)\}/);
    if(!m)return showToast("未找到账户ID","error");
    navigator.clipboard.writeText(m[1].trim()).then(()=>showToast("已复制账户ID","success"));
  });

  /* 📋 按钮：复制剧名 */
  const btnCopyDramaName = mkBtn("复制剧名",()=>{
    const match=mainData.match(/剧名\{([\s\S]*?)\}/);
    if(!match)return showToast("未找到剧名","error");
    navigator.clipboard.writeText(match[1].trim()).then(()=>showToast("已复制剧名","success"));
  });

  /* ➕ 按钮：添加剧ID并保存 */
  const btnAddDrama=mkBtn("添加剧ID",()=>{
    const dramaId=prompt("请输入剧ID：");
    if(!dramaId)return showToast("未输入剧ID","error");
    mainData+=`\n剧ID{\n${dramaId}\n}`; saveData();
    showToast(`已添加剧ID：${dramaId}`,"success");
  });

  /* ➕ 按钮：添加链接块（支持选择行范围） */
  const btnAddLink=mkBtn("添加链接",()=>{
    const multiInput=prompt("请粘贴多行 code=... 的数据：");
    if(!multiInput)return showToast("未输入内容","error");
    const lines=multiInput.split(/\n+/).filter(Boolean);
    const pickInput=prompt(`共有 ${lines.length} 行，请输入要选取的行号（如 1,3,5 或 2-4）：`);
    if(!pickInput)return showToast("未输入行号","error");
    let picks=[];pickInput.split(",").forEach(p=>{
      if(p.includes("-")){const[a,b]=p.split("-").map(Number);for(let i=a;i<=b;i++)picks.push(i);}else picks.push(Number(p));
    });
    picks=[...new Set(picks.filter(i=>i>0&&i<=lines.length))];
    if(!picks.length)return showToast("未选中有效行","error");
    const selected=picks.map(i=>lines[i-1].trim()).join("\n");
    const formatted=`链接{\n${selected}\n}`;
    mainData=mainData.replace(/链接\{[\s\S]*?\}/,"");
    mainData+="\n"+formatted; saveData();
    showToast("已更新链接数据","success");
  });

  /* 👀 按钮：弹窗查看 mainData */
  const btnShowData=mkBtn("查看数据",()=>{ alert(mainData); });

  /* 🧹 按钮：清空数据并关闭面板 */
  const btnClearData=mkBtn("清空数据",()=>{
    if(confirm("确定清除保存数据？")) {
      localStorage.removeItem(storageKey);
      mainData="";
      showToast("🧹 已清空保存的数据并关闭面板","success");
      panel.remove();
    }
  });

  /* 🪄 按钮：备注账户（批量填备注与账户ID） */
  const btnRemark = mkBtn("备注账户",async()=>{
    const script=async()=>{
      const delay=300;
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      async function clickButtonByText(text){
        return new Promise(resolve=>{
          const t=setInterval(()=>{
            const span=Array.from(document.querySelectorAll("button span")).find(el=>el.innerText.includes(text));
            if(span){const button=span.closest("button");if(button){clearInterval(t);button.click();resolve(button);}}},100);
        });
      }
      const parentMenuText="产品管理",childMenuText="账户管理",buttonText="批量操作",menuItemText="批量上传备注",nextButtonText="批量录入账户";
      const parentMenu=Array.from(document.querySelectorAll('.el-sub-menu__title span.menu-title')).find(el=>el.innerText.includes(parentMenuText));
      if(parentMenu&&!parentMenu.closest('.el-sub-menu').classList.contains('is-opened')){parentMenu.click();await sleep(delay);}
      const childMenu=Array.from(document.querySelectorAll('.nest-menu a span.menu-title')).find(el=>el.innerText.includes(childMenuText));
      if(!childMenu)return showToast("未找到子菜单：账户管理","error");
      childMenu.click();await sleep(delay);
      await clickButtonByText(buttonText);await sleep(delay);
      await new Promise(resolve=>{
        const t=setInterval(()=>{
          const items=Array.from(document.querySelectorAll('.el-dropdown-menu__item')),
                item=items.find(el=>el.innerText.includes(menuItemText));
          if(item){clearInterval(t);item.click();resolve(item);} },100);
      });
      await sleep(delay);
      await clickButtonByText(nextButtonText);
      await sleep(delay);

      const idMatch=mainData.match(/账户ID\{([^}]*)\}/),remarkMatch=mainData.match(/备注行\{([^}]*)\}/);
      if(!idMatch||!remarkMatch)return showToast("mainData 中缺少账户ID或备注行","error");
      const accountIDs=idMatch[1].split("\n").map(i=>i.trim()),remark=remarkMatch[1].trim();

      const remarkInputs=document.querySelectorAll('div.el-input__wrapper input.el-input__inner[placeholder="请输入备注"]');
      if(remarkInputs.length>0){
        remarkInputs.forEach(input=>{
          input.value=remark;
          input.dispatchEvent(new Event("input",{bubbles:!0}));
        });
        showToast("已填入备注","success");
      }
      const idsTextarea=document.querySelector("textarea.el-textarea__inner[placeholder='请输入账户ID,一个占一行']");
      if(idsTextarea){
        idsTextarea.value=accountIDs.join("\n");
        idsTextarea.dispatchEvent(new Event("input",{bubbles:!0}));
        showToast("已填入账户ID","success");
      }
    };
    await script();
  });

  /* 🔗 按钮：取链接（主体识别 + 批量录入账户ID/剧ID） */
  const btnGetLink = mkBtn("取链接",async()=>{
    const dramaMatch=mainData.match(/剧ID\{([^}]*)\}/);
    if(!dramaMatch)return showToast("未检测到剧ID，请先添加剧ID！","error");
    const dramaId=dramaMatch[1].trim();
    const nameMatch=mainData.match(/名称\{([^}]*)\}/),
          accountMatch=mainData.match(/账户ID\{([^}]*)\}/),
          linkMatch=mainData.match(/链接备注\{([^}]*)\}/),
          remarkMatch=mainData.match(/备注行\{([^}]*)\}/);
    if(!nameMatch||!accountMatch||!linkMatch||!remarkMatch)
      return showToast("mainData 格式错误，无法解析","error");

    const names=nameMatch[1].split("\n").map(l=>l.trim()).filter(Boolean),
          accountIds=accountMatch[1].split("\n").map(l=>l.trim()).filter(Boolean),
          dramaIds=new Array(accountIds.length).fill(dramaId);

    const subjectMap={ "番茄":["贸腾","添娱","闲娱","富娱","尊娱","灿娱","娱久","赛理赛","灵娱"], "点众":["文采","山娱","弦娱","海威","霸林","娱城"], "掌阅":["赛理赛","典娱","适娱","华韵"] };
    let subjectNames=[...new Set(names.map(n=>n.split("-")[1]).filter(Boolean))];
    if(subjectNames.length===0)return showToast("没有识别到主体名","error");
    let subject=subjectNames[0];
    if(subjectNames.length>1)subject=prompt("检测到多个主体，请选择:\n"+subjectNames.join(" / "));
    if(!subject)return;
    let platform=null;
    for(let [p,arr] of Object.entries(subjectMap)){ if(arr.includes(subject)){ platform=p; break; } }
    if(!platform)return showToast("未找到主体对应平台","error");

    const clickEl=(sel,txt=null)=>{const els=[...document.querySelectorAll(sel)];const el=txt?els.find(e=>e.innerText.trim()===txt):els[0];if(el)el.click();};
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    clickEl(".el-sub-menu__title","推广链接");await wait(500);
    if(platform==="番茄")clickEl("span.menu-title","每日剧场");
    else if(platform==="点众")clickEl("span.menu-title","魔都剧场");
    else if(platform==="掌阅")clickEl("span.menu-title","游饼短剧");
    await wait(800);
    clickEl("span","新建推广链接");await wait(500);
    clickEl("span","批量录入");await wait(500);

    const select=document.querySelector(".el-select");
    if(select){
      select.click();
      await wait(300);
      const opts=[...document.querySelectorAll(".el-select-dropdown__item")];
      const target=opts.find(o=>o.innerText.trim()===subject);
      if(target)target.click();
    }

    const textareas = document.querySelectorAll("textarea.el-textarea__inner");
    if (textareas.length >= 2) {
      textareas[0].value = accountIds.join("\n");
      textareas[0].dispatchEvent(new Event("input"));
      textareas[1].value = dramaIds.join("\n");
      textareas[1].dispatchEvent(new Event("input"));
      showToast(`✅ 已选择主体 ${subject}，填入 ${accountIds.length} 个账户ID`, "success");
    }
  });

    /* 🧠 按钮：加载远程脚本 */
    const btnAutoMatch = mkBtn("执行远程脚本", ()=>{
      showToast("🚀 正在加载远程脚本...","info");
      try {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/gh/fasilzy1-cpu/fasilzy1-cpu.github.io@main/getlink.js";
        s.onload = () => showToast("✅ 远程脚本加载完成！","success");
        s.onerror = () => showToast("❌ 脚本加载失败","error");
        document.body.appendChild(s);
      } catch (e) {
        showToast("⚠️ 加载出错：" + e.message,"error");
      }
    });

  /* 🧩 面板布局：分行组织按钮 */
  const btnWrap=document.createElement("div");
  panel.appendChild(btnWrap);
  const row1=document.createElement("div"); row1.append(btnCopyAll,btnCopyID,btnCopyDramaName);
  const row2=document.createElement("div"); row2.append(btnAddDrama,btnAddLink);
  const row3=document.createElement("div"); row3.append(btnRemark,btnGetLink,btnFillLink,btnClickByID);
  const row4=document.createElement("div"); row4.append(btnAutoMatch,btnShowData,btnClearData);
  btnWrap.append(row1,row2,row3,row4);

  /* 👁️ 面板控制：显示/隐藏 + 关闭 */
  const toggleBtn=mkBtn("隐藏",()=>{btnWrap.style.display=btnWrap.style.display==="none"?"block":"none";
    toggleBtn.textContent=btnWrap.style.display==="none"?"显示":"隐藏";});
  const closeBtn=document.createElement("button");
  closeBtn.textContent="✖";
  closeBtn.style.cssText="border:none;background:none;font-size:14px;cursor:pointer;margin-left:8px;";
  closeBtn.onclick=()=>panel.remove();
  header.append(closeBtn);
  panel.append(toggleBtn);

  document.body.appendChild(panel);
})();
})();
