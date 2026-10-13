/* Online additions follow the bundled SingDuck recordings. No audio is downloaded here. */
(() => {
  const METING = 'https://meting-api-omega.vercel.app/api';
  const AUDIUS = 'https://api.audius.co/v1';
  const APP = 'SpiritSnack';
  const sources = [{key:'netease',items:[],loaded:false,nextTry:0}, {key:'audius',items:[],loaded:false,nextTry:0,offset:0}];
  let pending = null;
  function https(value) {
    try {const url=new URL(String(value||'').replace(/^http:\/\//i,'https://'));return url.protocol==='https:'?url.href:'';}catch{return '';}
  }
  function hash(text) {let value=2166136261;for(const char of text){value=Math.imul(value^char.charCodeAt(0),16777619);}return (value>>>0).toString(36);}
  async function json(url) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try {const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Music source unavailable');return await response.json();}
    finally {clearTimeout(timer);}
  }
  function netease(track) {
    const audioUrl=https(track.url);if(!audioUrl)return null;
    const rawId=new URL(audioUrl).searchParams.get('id');
    const songName=String(track.title||track.name||'未命名歌曲'),artist=String(track.author||'未知歌手');
    const trackId=rawId&&/^\d+$/.test(rawId)?rawId:'';
    return {id:'netease:'+(trackId||hash(artist+'|'+songName)),source:'netease',sourceLabel:'网易云 · 在线歌单',trackId,
      nickname:artist,songName,singer:'',gender:'',avatar:https(track.pic),lyrics:[],audioUrl,durationSec:0,likeCount:0,
      link:trackId?'https://music.163.com/#/song?id='+trackId:'https://music.163.com/#/discover/toplist?id=3778678',publishAt:0,cachedAt:Date.now()};
  }
  function audius(track) {
    if(!track.id||track.is_stream_gated||track.is_streamable===false)return null;
    const trackId=String(track.id),artist=String(track.user?.name||'Audius 音乐人');
    return {id:'audius:'+trackId,source:'audius',sourceLabel:'Audius',trackId,nickname:artist,songName:String(track.title||'未命名歌曲'),
      singer:'',gender:'',avatar:https(track.artwork?.['150x150']||track.user?.profile_picture?.['150x150']),lyrics:[],
      audioUrl:AUDIUS+'/tracks/'+encodeURIComponent(trackId)+'/stream?app_name='+APP,durationSec:Number(track.duration)||0,
      likeCount:Number(track.favorite_count)||0,link:https(track.permalink?new URL(track.permalink,'https://audius.co').href:'https://audius.co'),publishAt:0,cachedAt:Date.now()};
  }
  async function load(source) {
    if(source.nextTry>Date.now())return;
    if(source.loaded&&(source.key==='netease'||source.items.length))return;
    try {
      if(source.key==='netease') {
        const data=await json(METING+'?server=netease&type=playlist&id=3778678');
        if(!Array.isArray(data))throw Error('Invalid playlist');
        source.items=data.map(netease).filter(Boolean);
      }else {
        const data=await json(AUDIUS+'/tracks/trending?limit=100&offset='+source.offset+'&time=week&app_name='+APP);
        if(!Array.isArray(data.data))throw Error('Invalid tracks');
        source.items=data.data.map(audius).filter(Boolean);source.offset+=data.data.length;
        if(!data.data.length)source.nextTry=Date.now()+5*60*1000;
      }
      source.loaded=true;
    }catch{source.nextTry=Date.now()+15000;}
  }
  async function fetchBatch(excluded) {
    if(pending)await pending;
    pending=Promise.allSettled(sources.map(load));
    await pending;pending=null;
    const taken=[],ids=new Set(excluded);
    for(const source of sources)source.items=source.items.filter(item=>!ids.has(item.id));
    // A mostly Chinese feed, with independent music between playlist batches.
    for(let slot=0;slot<32;slot++) {
      const preferred=slot%8===7?1:0;
      const item=sources[preferred].items.shift()||sources[1-preferred].items.shift();
      if(!item)break;
      if(ids.has(item.id))continue;
      ids.add(item.id);taken.push({...item,cachedAt:Date.now()});
    }
    return taken;
  }
  function playbackUrl(item) {
    if(item.source==='audius'&&item.trackId)return AUDIUS+'/tracks/'+encodeURIComponent(item.trackId)+'/stream?app_name='+APP;
    if(item.source==='netease'&&item.trackId)return METING+'?server=netease&type=url&id='+encodeURIComponent(item.trackId);
    return item.audioUrl;
  }
  window.MusicSources={fetchBatch,playbackUrl};
})();
