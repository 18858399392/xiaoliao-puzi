/* Per-category unread buffer. Rendering never waits for the network while local items exist. */
(() => {
  function read(key) { try { const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]; } catch { return []; } }
  function write(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* Memory still works when storage is unavailable. */ } }
  const pendingTasks=[];
  let activeTasks=0;
  function schedule(task) { return new Promise((resolve,reject)=>{pendingTasks.push({task,resolve,reject});pump();}); }
  function pump() { while(activeTasks<2&&pendingTasks.length) {const job=pendingTasks.shift();activeTasks++;Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{activeTasks--;pump();});} }

  class ContentBuffer {
    constructor({type,seeds,catalogue,blocked,fetchOne,version}) {
      this.type=type;this.fetchOne=fetchOne;this.version=version;this.catalogue=catalogue||[];
      this.blocked=new Set((blocked||[]).map(id=>String(id).replace(/^cy:cont_/, 'cy:')));this.reserved=new Set();this.running=null;this.cooldown=0;this.waiters=[];
      this.historyKey=type==='audio'?'duanzi_seen_audio_v1':`duanzi_seen_v3_${type}`;
      this.cacheKey=type==='audio'?'duanzi_audio_cache_v1':`duanzi_cache_v3_${type}`;
      this.history=read(this.historyKey);
      if(type==='audio')this.history=[...new Set(this.history.map(id=>String(id).replace(/^cy:cont_/, 'cy:')))];
      this.seen=new Set(this.history.map(id=>type==='audio'?String(id):`${type}:${id}`));
      const allowedStarter=new Set(seeds.map(item=>item.id));
      this.pool=[];
      let sameRelease=false;
      try { sameRelease=localStorage.getItem(this.cacheKey+'_release')===String(version); } catch {}
      const cached=(sameRelease?read(this.cacheKey):[]).filter(item=>!item._starter||allowedStarter.has(item.id));
      try { localStorage.setItem(this.cacheKey+'_release',String(version)); } catch {}
      this.add(cached);
      // Shuffle a private copy; all users do not start with the same five lines.
      const shuffled=seeds.map(item=>({...item,_starter:true}));
      for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
      this.seedBank=shuffled;
      this.add(shuffled);
    }
    normalize(item) {
      if(!item||typeof item!=='object')return null;
      if(this.type==='audio') {
        if(!item.id||!item.audioUrl)return null;
        if(!item.localAudio&&item.cachedAt&&Date.now()-item.cachedAt>30*60*1000)return null;
        return {...item,id:String(item.id).replace(/^cy:cont_/, 'cy:'),cachedAt:item.cachedAt||Date.now()};
      }
      if(!Number.isInteger(Number(item.index))||typeof item.duanzi!=='string'||!item.duanzi.trim())return null;
      return {...item,index:Number(item.index),id:`${this.type}:${Number(item.index)}`,type:this.type};
    }
    add(items) {
      const ids=new Set(this.pool.map(item=>item.id));const texts=new Set(this.pool.map(item=>item.duanzi).filter(Boolean));
      for(const raw of items) {
        const item=this.normalize(raw);
        if(!item||this.seen.has(item.id)||this.blocked.has(item.id)||ids.has(item.id)||(item.duanzi&&texts.has(item.duanzi)))continue;
        this.pool.push(item);ids.add(item.id);if(item.duanzi)texts.add(item.duanzi);
      }
      this.pool=this.pool.slice(0,this.type==='audio'?80:240);
      write(this.cacheKey,this.pool);
      if(this.pool.length)this.waiters.splice(0).forEach(resolve=>resolve());
    }
    take(count) {
      const result=[];
      while(this.pool.length&&result.length<count) {
        const item=this.pool.shift();
        if(this.seen.has(item.id)||this.blocked.has(item.id))continue;
        this.seen.add(item.id);this.history.push(this.type==='audio'?item.id:item.index);result.push(item);
      }
      this.history=this.history.slice(-10000);
      write(this.historyKey,this.history);write(this.cacheKey,this.pool);
      return result;
    }
    nextIndex() {
      if(!this.catalogue.length)return undefined;
      const buffered=new Set(this.pool.map(item=>item.id));
      const available=this.catalogue.filter(index=>{const id=`${this.type}:${index}`;return !this.seen.has(id)&&!this.blocked.has(id)&&!buffered.has(id)&&!this.reserved.has(index);});
      if(!available.length)return null;
      const index=available[Math.floor(Math.random()*available.length)];this.reserved.add(index);return index;
    }
    refill({force=false}={}) {
      if(this.running)return this.running;
      if(this.pool.length<16)this.add(this.seedBank);
      if((!force&&this.pool.length>=16)||(!force&&Date.now()<this.cooldown))return Promise.resolve();
      let added=0;
      const tasks=Array.from({length:this.type==='audio'?4:8},()=>schedule(async()=>{
        const index=this.type==='audio'?undefined:this.nextIndex();
        if(index===null)return;
        try {const item=await this.fetchOne(index);const previous=this.pool.length;this.add([item]);added+=this.pool.length-previous;}catch {/* Accept any successful item from the batch. */}
        finally {if(index!==undefined)this.reserved.delete(index);}
      }));
      this.running=Promise.allSettled(tasks).then(()=>{this.cooldown=Date.now()+(added?1000:15000);}).finally(()=>{this.running=null;this.waiters.splice(0).forEach(resolve=>resolve());});
      return this.running;
    }
    async waitForFirst({force=false}={}) {
      if(this.pool.length)return;
      let readyResolve;
      const ready=new Promise(resolve=>{readyResolve=resolve;this.waiters.push(resolve);});
      const refill=this.refill({force});
      try {await Promise.race([ready,refill]);}
      finally {this.waiters=this.waiters.filter(resolve=>resolve!==readyResolve);}
    }
    get available(){return this.pool.length;}
  }
  window.ContentBuffer=ContentBuffer;
})();
