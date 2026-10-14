/* Human-initiated book lookup and music search; existing feed order is untouched. */
(() => {
  let dialog,input,heading,form,submit,status,results,mode,token=0,opener,controller;
  const cacheKey='spirit_discovery_cache_v1';let cache={};
  try{cache=JSON.parse(localStorage.getItem(cacheKey))||{};}catch{}
  if(typeof cache!=='object'||Array.isArray(cache))cache={};
  const forbidden=/玄幻|修仙|修真|漫画|漫畫|网文|網文|网络小说|網絡小說|小说|小說|\b(?:fiction|novels?|comics?|manga|fantasy)\b/i;
  function excluded(text){return forbidden.test(String(text).replace(/non[-\s]?fiction/gi,''));}
  function node(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;}
  function put(key,value){cache[key]={value,time:Date.now()};const keys=Object.keys(cache).sort((a,b)=>cache[b].time-cache[a].time);for(const key of keys.slice(20))delete cache[key];try{localStorage.setItem(cacheKey,JSON.stringify(cache));}catch{}}
  function get(key,age){const item=cache[key];return item&&Date.now()-item.time<age?item.value:null;}
  function renderBooks(books){
    results.replaceChildren();
    for(const book of books){
      const card=node('article','discovery-book'),title=node('h3','',book.title);
      const detail=[(book.author_name||[]).join(' / '),book.first_publish_year?'首版 '+book.first_publish_year+' 年':'',book.isbn?.[0]?'ISBN '+book.isbn[0]:''].filter(Boolean).join(' · ');
      card.append(title,node('p','discovery-meta',detail),node('p','discovery-meta','书目来源：Open Library · 仅展示书目信息'));
      results.append(card);
    }
  }
  function renderMusic(){
    results.replaceChildren();const rows=Discovery.audioItems;
    if(!rows.length){results.append(node('p','discovery-empty','暂未找到可播放的歌曲，试试其他歌名或歌手。'));return;}
    rows.forEach(item=>results.append(createAudioCard(item,{noAnim:true})));
  }
  async function search(event){
    event?.preventDefault();const query=input.value.trim().slice(0,100);if(!query){input.focus();return;}
    const current=++token,currentMode=mode;controller?.abort();
    if(mode==='book'&&excluded(query)){submit.disabled=false;status.textContent='这里查找知识类出版书，试试科学、历史、教育、传记或散文书名。';results.replaceChildren();return;}
    submit.disabled=true;status.textContent='正在查找…';results.replaceChildren();
    try{
      const key=mode+':'+query;let saved=get(key,mode==='book'?7*86400000:20*60000);
      if(mode==='book'){
        if(!saved){
          const activeController=new AbortController();controller=activeController;const timer=setTimeout(()=>activeController.abort(),10000);
          try{const isISBN=/^(?:\d[\d-]{8,16}[\dXx])$/.test(query);const params=new URLSearchParams({[isISBN?'isbn':'q']:query,limit:'12',lang:'zh',fields:'key,title,author_name,first_publish_year,isbn,ebook_access,subject'});
            const response=await fetch('https://openlibrary.org/search.json?'+params,{signal:activeController.signal});if(!response.ok)throw Error('Book source unavailable');const data=await response.json();if(!Array.isArray(data.docs))throw Error('Invalid catalogue');
            saved=data.docs.filter(book=>book.title&&!/^(?:现货|現貨|包邮|包郵|正版现货|正版現貨)/.test(book.title)&&!excluded(book.title+' '+(Array.isArray(book.subject)?book.subject:[]).join(' ')));put(key,saved);
          }finally{clearTimeout(timer);}
        }
        if(current!==token||currentMode!==mode)return;
        renderBooks(saved);status.textContent=saved.length?'找到 '+saved.length+' 条书目记录，此处提供书名、作者与版本信息。':'暂未找到匹配的书目，试试书名加作者或 ISBN。';
      }else{
        if(!saved){saved=await MusicSources.search(query);if(saved.items.length)put(key,saved);}
        if(current!==token||currentMode!==mode)return;
        Discovery.audioItems=saved.items;renderMusic();status.textContent=saved.items.length?'找到 '+saved.items.length+' 首；翻唱、试听或全曲，以来源实际播放为准。':'暂未找到歌曲。';
        if(saved.unavailable.length)status.textContent+=' '+saved.unavailable.join('、')+'暂时未响应，其他来源仍可使用。';
      }
    }catch{if(current===token)status.textContent=mode==='book'?'书目服务暂时无法连接，请稍后重试。':'歌曲暂时无法加载，请稍后重试或听听本地歌曲。';}
    finally{if(current===token)submit.disabled=false;}
  }
  function init(){
    if(dialog)return;dialog=node('dialog','discovery-dialog');dialog.setAttribute('aria-labelledby','discovery-title');
    const head=node('div','discovery-head');heading=node('h2','');heading.id='discovery-title';const back=node('button','reader-back','返回');back.type='button';
    back.onclick=close;head.append(heading,back);const content=node('div','discovery-scroll');
    form=node('form','discovery-form');input=node('input','discovery-input');input.type='search';input.maxLength=100;input.enterKeyHint='search';input.setAttribute('aria-label','书名、作者或歌曲');submit=node('button','discovery-submit','搜索');submit.type='submit';form.append(input,submit);form.addEventListener('submit',search);
    status=node('p','discovery-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');results=node('div','discovery-results');results.id='discovery-results';
    content.append(form,status,results);dialog.append(head,content);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  }
  function close(){token++;controller?.abort();submit.disabled=false;dialog.close();document.body.classList.remove('discovery-open');if(opener?.isConnected)opener.focus({preventScroll:true});}
  function open(kind,button){
    init();token++;controller?.abort();mode=kind;opener=button;submit.disabled=false;input.value='';results.replaceChildren();
    heading.textContent=mode==='book'?'找一本书':'找一首歌';input.placeholder=mode==='book'?'书名、作者或 ISBN':'歌名或歌手';
    status.textContent=mode==='book'?'输入书名、作者或 ISBN，查找知识类出版书的书目信息。':'搜索中文歌曲与独立音乐，在这里播放和收藏。';
    document.body.classList.add('discovery-open');dialog.showModal();input.focus();
  }
  const Discovery={open,audioItems:[],isOpen:()=>!!dialog?.open};window.Discovery=Discovery;
})();
