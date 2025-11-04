(async()=>{
  const cfg=await fetch('config.json').then(r=>r.json());
  const root=document.documentElement;
  root.style.setProperty('--primary-color',cfg.theme.primaryColor);
  root.style.setProperty('--secondary-color',cfg.theme.secondaryColor);
  root.style.setProperty('--accent-color',cfg.theme.accentColor);
  root.style.setProperty('--background-color',cfg.theme.backgroundColor);
  root.style.setProperty('--text-color',cfg.theme.textColor);
  document.getElementById('pageTitle').textContent=cfg.header.title;
  document.getElementById('pageSubtitle').textContent=cfg.header.subtitle;
  const coins=await fetch('https://api.coingecko.com/api/v3/coins/list').then(r=>r.json());
  coins.sort((a,b)=>a.id.localeCompare(b.id));
  function populate(sel,def){coins.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name+' ('+c.symbol+')';if(c.id===def)o.selected=true;sel.appendChild(o);});}
  const sel1=document.getElementById('coin1Select'),sel2=document.getElementById('coin2Select');
  populate(sel1,cfg.default.coin1);populate(sel2,cfg.default.coin2);
  document.getElementById('dateFrom').value=cfg.default.date_from;
  document.getElementById('dateTo').value=cfg.default.date_to;
  function ts(d){return Math.floor(new Date(d).getTime()/1000);}
  async function fetchRange(id,vs,from,to){const url='https://api.coingecko.com/api/v3/coins/'+id+'/market_chart/range?vs_currency='+vs+'&from='+from+'&to='+to;return fetch(url).then(r=>r.json());}
  function draw(d1,d2,id1,id2){
    const labels=d1.prices.map(p=>{return new Date(p[0]).toLocaleDateString();});
    const data1=d1.prices.map(p=>p[1]);const data2=d2.prices.map(p=>p[1]);
    if(window.cryptoChart)window.cryptoChart.destroy();
    window.cryptoChart=new Chart(document.getElementById('chart').getContext('2d'),{type:'line',data:{labels:labels,datasets:[{label:id1,data:data1,borderColor:getComputedStyle(root).getPropertyValue('--primary-color').trim()||'#6366F1',fill:false},{label:id2,data:data2,borderColor:getComputedStyle(root).getPropertyValue('--secondary-color').trim()||'#34D399',fill:false}]},options:{responsive:true,maintainAspectRatio:false}});
  }
  async function loadPy(){window.pyodide=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'});await pyodide.loadPackage(['pandas']);}
  loadPy();
  document.getElementById('loadDataButton').addEventListener('click',async()=>{
    const from=ts(document.getElementById('dateFrom').value),to=ts(document.getElementById('dateTo').value);
    const id1=sel1.value,id2=sel2.value,vs=cfg.default.vs_currency||'usd';
    const [d1,d2]=await Promise.all([fetchRange(id1,vs,from,to),fetchRange(id2,vs,from,to)]);
    window.currentData={coin1:d1,coin2:d2};
    draw(d1,d2,id1,id2);
  });
  document.getElementById('runPythonButton').addEventListener('click',async()=>{
    const out=document.getElementById('pythonOutput');
    out.textContent='';
    if(!window.pyodide){out.textContent='Pyodide no está listo';return;}
    pyodide.globals.set('js_data',window.currentData);
    const code=document.getElementById('pythonInput').value;
    try{
      const script='import pandas as pd\nfrom js import js_data\nprices1=pd.DataFrame(js_data[\'coin1\'][\'prices\'],columns=[\'ts\',\'price\'])\nprices2=pd.DataFrame(js_data[\'coin2\'][\'prices\'],columns=[\'ts\',\'price\'])\nprices1[\'dt\']=pd.to_datetime(prices1[\'ts\'],unit=\'ms\')\nprices2[\'dt\']=pd.to_datetime(prices2[\'ts\'],unit=\'ms\')\n';
      const res=await pyodide.runPythonAsync(script+code);
      if(res!==undefined)out.textContent=res.toString();
    }catch(e){out.textContent=e.toString();}
  });
})();
