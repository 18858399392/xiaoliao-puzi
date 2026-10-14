/* Resource lookup only: files stay on the original cloud services. */
((root) => {
  const API='https://so.252035.xyz/api/search';
  const HOSTS={
    'pan.baidu.com':'百度网盘','pan.quark.cn':'夸克网盘',
    'www.alipan.com':'阿里云盘','alipan.com':'阿里云盘','www.aliyundrive.com':'阿里云盘','aliyundrive.com':'阿里云盘',
    'pan.xunlei.com':'迅雷网盘','www.123pan.com':'123网盘','123pan.com':'123网盘',
    'www.123865.com':'123网盘','www.123684.com':'123网盘','www.123912.com':'123网盘',
    'www.123pan.cn':'123网盘','www.123592.com':'123网盘','www.123685.com':'123网盘',
    'cloud.189.cn':'天翼云盘','drive.uc.cn':'UC网盘','caiyun.139.com':'移动云盘',
    'yun.139.com':'移动云盘','115.com':'115网盘','www.115.com':'115网盘','anxia.com':'115网盘'
  };
  const excluded=/玄幻|修仙|修真|漫画|漫畫|网文|網文|网络小说|網絡小說/;
  function queryUrl(query){
    const url=new URL(API);url.search=new URLSearchParams({kw:query.trim().slice(0,100),src:'plugin',res:'merge'});return url.href;
  }
  function pansearchUrl(query){const url=new URL('https://www.pansearch.me/search');url.searchParams.set('keyword',query.trim().slice(0,100));return url.href;}
  function requestUrl(query,provider){
    const local=/^https?:$/.test(root.location.protocol)&&!root.location.hostname.endsWith('github.io');
    const url=new URL('/api/resource-search',local?root.location.origin:'https://yule.kanglimin.com');url.search=new URLSearchParams({kw:query,provider});return url.href;
  }
  function normalize(payload){
    if(!payload||typeof payload!=='object'||(payload.code!==undefined&&payload.code!==0))throw Error('invalid-response');
    const data=payload.data||payload;
    if(!data.merged_by_type||typeof data.merged_by_type!=='object'||Array.isArray(data.merged_by_type))throw Error('invalid-response');
    const rows=[],seen=new Set();
    for(const group of Object.values(data.merged_by_type)){
      if(!Array.isArray(group))continue;
      for(const item of group){
        if(!item||typeof item!=='object'||!/^plugin:[a-z0-9_-]+$/i.test(item.source||''))continue;
        let url;try{url=new URL(item.url);}catch{continue;}
        if(url.protocol!=='https:'||!HOSTS[url.hostname]||url.username||url.password||!url.pathname.startsWith('/s/'))continue;
        const title=String(item.note||item.work_title||'未命名资源').slice(0,500);
        if(excluded.test(title))continue;
        const key=url.origin+url.pathname.replace(/\/$/,'');if(seen.has(key))continue;seen.add(key);
        rows.push({title,url:url.href,cloud:HOSTS[url.hostname],password:String(item.password||'').slice(0,40),source:item.source});
        if(rows.length>=100)return rows;
      }
    }
    return rows;
  }
  const helpers={queryUrl,pansearchUrl,normalize};
  if(typeof module!=='undefined'&&module.exports)module.exports=helpers;
  if(!root.document)return;

  const CACHE='spirit_resource_search_v1',AGE=20*60000;
  let dialog,input,title,form,submit,external,status,results,retry,provider,opener,controller,token=0;
  let stored;try{stored=JSON.parse(localStorage.getItem(CACHE));}catch{}
  const cache=Object.assign(Object.create(null),stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{});
  function node(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;}
  function link(cls,text,url){const el=node('a',cls,text);el.href=url;el.target='_blank';el.rel='noopener noreferrer';return el;}
  function put(query,rows){
    cache[query]={time:Date.now(),rows};
    const keys=Object.keys(cache).sort((a,b)=>cache[b].time-cache[a].time);keys.slice(10).forEach(k=>delete cache[k]);
    try{localStorage.setItem(CACHE,JSON.stringify(cache));}catch{}
  }
  function saved(query){
    const item=cache[query];if(!item||Date.now()-item.time>AGE||!Array.isArray(item.rows))return null;
    // Revalidate stored metadata too; old cache cannot reintroduce Telegram links.
    return normalize({merged_by_type:{cache:item.rows.map(row=>({url:row.url,note:row.title,password:row.password,source:row.source}))}});
  }
  function setBusy(busy){submit.disabled=busy;retry.disabled=busy;submit.textContent=busy?'搜索中…':'搜索';}
  function render(rows){
    results.replaceChildren();
    for(const row of rows){
      const card=node('article','resource-card');
      card.append(node('h3','resource-title',row.title),node('p','resource-meta',row.cloud+(row.source.toLowerCase()==='plugin:pansearch'?' · PanSearch':'')));
      if(row.password)card.append(node('p','resource-meta','提取码：'+row.password));
      const actions=node('div','resource-actions');actions.append(link('resource-open','打开资源 ↗',row.url));
      const copy=node('button','resource-copy','复制链接');copy.type='button';
      copy.addEventListener('click',async()=>{
        const text=row.url+(row.password?'\n提取码：'+row.password:'');
        try{await navigator.clipboard.writeText(text);copy.textContent='已复制';setTimeout(()=>{copy.textContent='复制链接';},1600);}
        catch{const manual=node('textarea','resource-manual-copy');manual.value=text;manual.readOnly=true;manual.setAttribute('aria-label','选择并复制资源链接');actions.append(manual);manual.focus();manual.select();copy.textContent='请长按或按 Ctrl+C 复制';}
      });
      actions.append(copy);card.append(actions);results.append(card);
    }
  }
  async function search(event,force=false){
    event?.preventDefault();
    const active=++token;controller?.abort();setBusy(false);retry.hidden=true;results.replaceChildren();
    const query=input.value.trim().slice(0,100);if(query.length<2){status.textContent='请输入至少两个字，试试书名、片名或作者。';input.focus();return;}
    const searchProvider=provider,cacheQuery=searchProvider+':'+query;
    if(!force){try{const rows=saved(cacheQuery)?.filter(row=>searchProvider!=='pansearch'||row.source.toLowerCase()==='plugin:pansearch');if(rows?.length){render(rows);status.textContent='找到 '+rows.length+' 条网盘资源 · 最近搜索结果';retry.hidden=false;return;}}catch{}}
    if(!navigator.onLine){status.textContent='目前没有网络，联网后可以重试。';retry.hidden=false;return;}
    const request=new AbortController();controller=request;const timer=setTimeout(()=>request.abort(),20000);
    setBusy(true);status.textContent='正在搜索网盘资源…';
    try{
      const fetchRows=async()=>{
        const response=await fetch(requestUrl(query,searchProvider),{signal:request.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok)throw Error(response.status===429?'rate-limit':'unavailable');
        const rows=normalize(await response.json());
        return searchProvider==='pansearch'?rows.filter(row=>row.source.toLowerCase()==='plugin:pansearch'):rows;
      };
      let rows=await fetchRows();if(active!==token)return;
      if(!rows.length){
        status.textContent='正在等待更多搜索结果…';
        await new Promise((resolve,reject)=>{
          const abort=()=>{clearTimeout(delay);reject(new DOMException('Aborted','AbortError'));};
          const delay=setTimeout(()=>{request.signal.removeEventListener('abort',abort);resolve();},1800);
          request.signal.addEventListener('abort',abort,{once:true});
        });
        rows=await fetchRows();if(active!==token)return;
      }
      render(rows);if(rows.length)put(cacheQuery,rows);
      status.textContent=rows.length?'找到 '+rows.length+' 条网盘资源，点击后在新页面打开。':searchProvider==='pansearch'?'插件暂未找到匹配资源，可以更新结果，或到 PanSearch 搜索。':'暂未找到匹配的网盘资源，可以换个关键词或稍后更新结果。';
      retry.hidden=false;
    }catch(error){
      if(active!==token)return;
      status.textContent=error.message==='rate-limit'?'搜索服务请求较多，请稍后重试。':error.name==='AbortError'?'搜索用时较长，请稍后重试或换个关键词。':'搜索服务暂时无法连接，请稍后重试。';retry.hidden=false;
    }finally{clearTimeout(timer);if(active===token)setBusy(false);}
  }
  function updateExternal(){
    const valid=input.value.trim().length>=2;external.href=valid?pansearchUrl(input.value):'https://www.pansearch.me/';
    external.setAttribute('aria-disabled',String(!valid));
  }
  function close(){token++;controller?.abort();setBusy(false);dialog.close();document.body.classList.remove('resource-opened');if(opener?.isConnected)opener.focus({preventScroll:true});}
  function init(){
    if(dialog)return;
    dialog=node('dialog','resource-dialog');dialog.setAttribute('aria-labelledby','resource-heading');
    const head=node('div','discovery-head');title=node('h2','');title.id='resource-heading';
    const back=node('button','reader-back','返回');back.type='button';back.addEventListener('click',close);head.append(title,back);
    const content=node('div','resource-scroll');form=node('form','discovery-form');
    input=node('input','discovery-input');input.type='search';input.maxLength=100;input.enterKeyHint='search';input.placeholder='书名、片名、歌曲或作者';input.setAttribute('aria-label','资源搜索关键词');
    submit=node('button','discovery-submit','搜索');submit.type='submit';
    external=link('resource-open resource-external','到 PanSearch 搜索 ↗','https://www.pansearch.me/');
    external.addEventListener('click',event=>{if(input.value.trim().length<2){event.preventDefault();status.textContent='请输入至少两个字，再打开搜索结果。';input.focus();}});
    input.addEventListener('input',updateExternal);form.append(input,submit);
    form.addEventListener('submit',event=>search(event));
    status=node('p','discovery-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    results=node('div','resource-results');retry=node('button','resource-retry','更新结果');retry.type='button';retry.hidden=true;retry.addEventListener('click',event=>search(event,true));
    content.append(form,status,external,results,retry);dialog.append(head,content);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  }
  function open(kind,button){
    init();token++;controller?.abort();provider=kind;opener=button;input.value='';results.replaceChildren();retry.hidden=true;setBusy(false);
    const local=provider==='pansou';title.textContent=local?'PanSou 盘搜':'PanSearch 网盘搜索';external.hidden=local;
    status.textContent=local?'输入关键词查找网盘分享。结果可在站外打开。':'输入关键词搜索网盘分享，也可以到 PanSearch 搜索。';
    updateExternal();document.body.classList.add('resource-opened');dialog.showModal();input.focus();
  }
  root.ResourceSearch={open,...helpers};
})(typeof window!=='undefined'?window:globalThis);
