(()=>{

/***********************
 * 🍞 全局提示工具
 ***********************/
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
  setTimeout(()=>{
    toast.style.opacity=0;
    setTimeout(()=>toast.remove(),300);
  },2000);
}

/***********************
 * 🧠 主逻辑入口
 ***********************/
(function(){

  // 防止重复创建
  if(document.getElementById("dataToolPanel")) {
    showToast("⚠️ 面板已存在","info");
    return;
  }

  // 数据存储
  const storageKey = "panel_mainData_v1";
  let mainData = localStorage.getItem(storageKey);

  if(!mainData){
    mainData = prompt("请输入要保存的数据：");
    if(!mainData){
      showToast("已取消输入","info");
      return;
    }
    localStorage.setItem(storageKey, mainData);
    showToast("📦 数据已保存到本地","success");
  } else {
    showToast("✅ 已从本地恢复数据","success");
  }

  // 暴露全局变量给外部模块使用
  window.panelData = { mainData, showToast, storageKey };

  /***********************
   * 🧱 按钮工厂
   ***********************/
  const mkBtn = (txt, fn, color="#007bff") => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.onclick = fn;
    b.style.cssText = `
      margin:4px;
      padding:6px 10px;
      border:none;
      border-radius:6px;
      cursor:pointer;
      color:white;
      background:${color};
      font-size:13px;
    `;
    b.onmouseover = ()=>b.style.opacity=0.8;
    b.onmouseout  = ()=>b.style.opacity=1;
    return b;
  };

  /***********************
   * 🚀 外部脚本加载器
   ***********************/
  function loadScript(file, successMsg){
    showToast(`加载 ${file}...`);
    const s = document.createElement("script");
    s.src = `https://cdn.jsdelivr.net/gh/fasilzy1-cpu/fasilzy1-cpu.github.io@main/${file}`;
    s.onload  = ()=>showToast(successMsg || `${file} 执行完成`,"success");
    s.onerror = ()=>showToast(`加载 ${file} 失败`,"error");
    document.body.appendChild(s);
  }

  /***********************
   * 🎨 创建面板
   ***********************/
  const panel = document.createElement("div");
  panel.id = "dataToolPanel";
  panel.style.cssText = `
    position:fixed;bottom:20px;right:20px;background:#fff;
    border:1px solid #ccc;border-radius:8px;
    box-shadow:0 2px 8px rgba(0,0,0,0.2);
    padding:10px;z-index:999999;
    font-family:sans-serif;user-select:none;
  `;

  const header = document.createElement("div");
  header.textContent = "📋 数据工具面板";
  header.style.cssText = `
    cursor:move;font-weight:bold;margin-bottom:8px;background:#f5f5f5;
    padding:4px 8px;border-radius:6px;
    display:flex;justify-content:space-between;align-items:center;
  `;
  panel.appendChild(header);

  // 拖动逻辑
  let offsetX, offsetY, isDragging=false;
  header.addEventListener("mousedown",e=>{
    isDragging=true;
    offsetX=e.clientX-panel.offsetLeft;
    offsetY=e.clientY-panel.offsetTop;
    document.body.style.userSelect='none';
  });
  document.addEventListener("mousemove",e=>{
    if(isDragging){
      panel.style.left=e.clientX-offsetX+"px";
      panel.style.top=e.clientY-offsetY+"px";
      panel.style.bottom="";panel.style.right="";
    }
  });
  document.addEventListener("mouseup",()=>{isDragging=false;document.body.style.userSelect='';});

  const btnWrap = document.createElement("div");
  panel.appendChild(btnWrap);

  /***********************
   * 🔘 按钮定义
   ***********************/
  const btnCopy = mkBtn("复制内容", ()=>{
    navigator.clipboard.writeText(mainData)
      .then(()=>showToast("已复制全部内容","success"));
  },"#4CAF50");

  const btnRemark   = mkBtn("备注账户", ()=>loadScript("remark.js","remark 执行完成"), "#2196F3");
  const btnGetLink  = mkBtn("取链接", ()=>loadScript("getlink.js","getlink 执行完成"), "#9C27B0");
  const btnFillLink = mkBtn("填入链接", ()=>loadScript("filllink.js","filllink 执行完成"), "#FF9800");
  const btnAddLink  = mkBtn("添加链接", ()=>loadScript("addlink.js","addlink 执行完成"), "#795548");

  const btnShowData = mkBtn("查看数据", ()=>alert(mainData), "#607D8B");

  const btnClearData = mkBtn("清空数据", ()=>{
    if(confirm("确定清空保存的数据？")){
      localStorage.removeItem(storageKey);
      showToast("🧹 已清空并关闭面板","success");
      panel.remove();
    }
  },"#E91E63");

  // 添加按钮
  btnWrap.append(btnCopy,btnRemark,btnGetLink,btnFillLink,btnAddLink,btnShowData,btnClearData);

  // 关闭按钮
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✖";
  closeBtn.style.cssText = "border:none;background:none;font-size:14px;cursor:pointer;margin-left:8px;";
  closeBtn.onclick = ()=>panel.remove();
  header.append(closeBtn);

  // 显示面板
  document.body.appendChild(panel);
})();
})();
