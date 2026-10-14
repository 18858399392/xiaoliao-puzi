/* Local reading and answer interactions; no network or account required. */
(() => {
  const REVEALED='spirit_riddle_revealed_v1', PROGRESS='spirit_reading_progress_v1';
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* The current page remains usable. */}}
  const savedReveals=read(REVEALED,[]),revealed=new Set(Array.isArray(savedReveals)?savedReveals:[]);
  const savedPositions=read(PROGRESS,{});
  let positions=savedPositions&&typeof savedPositions==='object'&&!Array.isArray(savedPositions)?savedPositions:{},dialog,scroll,title,meta,body,source,readerItem,opener,timer;
  function element(tag,className,text){const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;}
  function minutes(item){return Math.max(1,Math.ceil((item.wordCount||item.paragraphs.join('').length)/300));}
  function copyText(item){
    if(item.type==='reading')return item.title+'\n'+item.author+'\n\n'+item.paragraphs.join('\n\n')+'\n\n来源：'+item.sourceUrl+'\n转录许可：CC BY-SA 4.0\n'+item.licenseUrl;
    return item.duanzi+(revealed.has(item.id)?'\n\n参考答案：'+item.answer+'\n'+item.explanation:'');
  }
  function remember(){
    if(!readerItem||!scroll)return;
    const max=scroll.scrollHeight-scroll.clientHeight;
    positions[readerItem.id]={fraction:max>0?Math.min(1,scroll.scrollTop/max):0,updatedAt:Date.now()};
    save(PROGRESS,positions);
  }
  function close(){
    remember();clearTimeout(timer);dialog.close();document.body.classList.remove('reader-open');readerItem=null;
    document.querySelectorAll('.read-open').forEach(button=>{const value=positions[button.dataset.readId]?.fraction||0;button.textContent=value>.02?'继续阅读':'阅读全文';});
    if(opener?.isConnected)opener.focus({preventScroll:true});
  }
  function open(item,button){
    init();if(dialog.open)remember();readerItem=item;opener=button;
    title.textContent=item.title;meta.textContent=item.author+' · '+item.topic+' · 约'+minutes(item)+'分钟';
    body.replaceChildren(...item.paragraphs.map(text=>element('p','',text)));
    source.replaceChildren();
    const attribution=element('a','reader-source-link','原文与版本：'+item.sourceName);
    attribution.href=item.sourceUrl+(item.sourceRevision?'?oldid='+item.sourceRevision:'');attribution.target='_blank';attribution.rel='noopener noreferrer';
    const license=element('a','reader-source-link','转录许可：CC BY-SA 4.0');license.href=item.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';
    source.append(attribution,element('p','reader-license','原作属公有领域，作者与出处保留。'),license,element('p','reader-license',item.editorNote));
    const actions=dialog.querySelector('.reader-actions');actions.replaceChildren();
    const card=button.closest('.card'),like=card?.querySelector('.like-btn');
    if(like){const cloned=like.cloneNode(true);cloned.classList.remove('is-animating');actions.append(cloned);}
    document.body.classList.add('reader-open');if(!dialog.open)dialog.showModal();
    scroll.scrollTop=0;
    requestAnimationFrame(()=>{if(readerItem?.id!==item.id)return;scroll.scrollTop=(positions[item.id]?.fraction||0)*Math.max(0,scroll.scrollHeight-scroll.clientHeight);});
  }
  function init(){
    if(dialog)return;
    dialog=element('dialog','reading-dialog');dialog.setAttribute('aria-labelledby','reading-dialog-title');
    const head=element('div','reader-head');const back=element('button','reader-back','返回内容');back.type='button';back.addEventListener('click',close);
    const actions=element('div','reader-actions');head.append(back,actions);
    scroll=element('div','reader-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','文章正文');
    const article=element('article','reader-article');meta=element('p','reader-meta');title=element('h1','reader-title');title.id='reading-dialog-title';
    body=element('div','reader-body');source=element('footer','reader-source');article.append(meta,title,body,source);scroll.append(article);dialog.append(head,scroll);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
    scroll.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(remember,350);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();});window.addEventListener('pagehide',remember);
  }
  function decorate(card,item){
    if(!['riddle','reading'].includes(item.type))return;
    const old=card.querySelector('.joke-text'),content=element('div','extra-content');
    card.classList.add(item.type+'-card');content.append(element('p','extra-meta',item.topic+(item.type==='reading'?' · '+item.author+' · 约'+minutes(item)+'分钟':'')));
    const copy=card.querySelector('[data-action="copy"]');
    if(item.type==='riddle'){
      content.append(element('div','joke-text',item.duanzi));
      const button=element('button','reveal-answer','揭晓答案');button.type='button';
      const answer=element('div','riddle-answer');answer.id='answer-'+item.index+'-'+Math.random().toString(36).slice(2,8);answer.hidden=true;
      answer.append(element('p','answer-label','参考答案'),element('p','answer-value',item.answer),element('p','answer-explanation',item.explanation));
      const update=()=>{const yes=revealed.has(item.id);answer.hidden=!yes;button.textContent=yes?'收起答案':'揭晓答案';button.setAttribute('aria-expanded',String(yes));copy.dataset.text=copyText(item);};
      button.setAttribute('aria-controls',answer.id);update();
      button.addEventListener('click',()=>{
        const expanding=answer.hidden;answer.hidden=!expanding;
        if(expanding){revealed.add(item.id);save(REVEALED,[...revealed]);copy.dataset.text=copyText(item);}
        button.textContent=expanding?'收起答案':'揭晓答案';button.setAttribute('aria-expanded',String(expanding));
      });content.append(button,answer);
    }else{
      content.append(element('h2','reading-title',item.title),element('p','reading-intro',item.intro));
      const button=element('button','read-open',(positions[item.id]?.fraction||0)>.02?'继续阅读':'阅读全文');button.type='button';button.dataset.readId=item.id;
      button.addEventListener('click',()=>open(item,button));content.append(button);copy.dataset.text=copyText(item);
    }
    old.replaceWith(content);
  }
  window.ReadingCards={decorate,init};
})();
