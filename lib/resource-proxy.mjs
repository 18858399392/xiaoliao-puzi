import protocol from '../resource-search.js';
const {queryUrl,pansearchUrl,normalize}=protocol;
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const reply=(data,status=200,cache=false)=>new Response(JSON.stringify(data),{status,headers:{...headers,...(cache?{'Cache-Control':'public, max-age=300'}:{})}});
function text(value){return String(value).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).trim();}
export function parsePansearch(html,query){
  const match=html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!match)throw Error('invalid-page');
  const posts=JSON.parse(match[1]).props?.pageProps?.data?.data;if(!Array.isArray(posts))throw Error('invalid-page');
  const rows=[];
  for(const post of posts){
    const content=String(post.content||'').replace(/\\n/g,'\n'),postTitle=text(content.match(/名称[：:]([^\n]+)/)?.[1]||'');
    const links=[...content.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
    const terms=query.toLowerCase().split(/\s+/).filter(term=>term.length>=2);
    for(const link of links){
      const start=Math.max(content.lastIndexOf('\n',link.index),content.lastIndexOf(';',link.index));
      let title=text(content.slice(start+1,link.index)).replace(/^\d+[、.．]\s*/,'').replace(/[：:]$/,'').trim();
      if(!title||/^(?:链接|下載|下载|地址)$/.test(title))title=postTitle||query;
      if(links.length>1&&terms.length&&!terms.some(term=>title.toLowerCase().includes(term)))continue;
      let url;try{url=new URL(text(link[1]));}catch{continue;}
      const password=url.searchParams.get('pwd')||text(content.match(/提取码[：:\s]*([a-z0-9]{3,8})/i)?.[1]||'');
      rows.push({url:url.href,note:title,password,source:'plugin:pansearch'});
    }
  }
  return normalize({merged_by_type:{web:rows}});
}
export async function resourceResponse(request,{fetcher=fetch,cache,waitUntil}={}){
  if(request.method!=='GET')return reply({error:'method-not-allowed'},405);
  const incoming=new URL(request.url),query=(incoming.searchParams.get('kw')||'').trim(),provider=incoming.searchParams.get('provider')||'pansou';
  if(query.length<2||query.length>100||!['pansou','pansearch'].includes(provider))return reply({error:'invalid-query'},400);
  const cacheUrl=new URL(incoming.origin+'/api/resource-search');cacheUrl.search=new URLSearchParams({kw:query,provider});const key=new Request(cacheUrl);
  if(cache){try{const hit=await cache.match(key);if(hit)return hit;}catch{}}
  let rows=[],via=provider;
  try{
    if(provider==='pansou'){
      try{
        const response=await fetcher(queryUrl(query),{signal:AbortSignal.timeout(6500),headers:{Accept:'application/json'}});
        if(response.ok)rows=normalize(await response.json());
      }catch{/* Continue through the public-page search plugin. */}
    }
    if(!rows.length){
      const response=await fetcher(pansearchUrl(query),{signal:AbortSignal.timeout(9000),headers:{Accept:'text/html'}});
      if(!response.ok)return reply({error:response.status===429?'rate-limit':'unavailable'},response.status===429?429:502);
      rows=parsePansearch(await response.text(),query);via='pansearch';
    }
    const merged_by_type={shares:rows.map(row=>({url:row.url,note:row.title,password:row.password,source:row.source}))};
    const response=reply({code:0,data:{total:rows.length,merged_by_type},via},200,rows.length>0);
    if(cache&&rows.length){const store=cache.put(key,response.clone()).catch(()=>{});if(waitUntil)waitUntil(store);else await store;}
    return response;
  }catch{return reply({error:'unavailable'},502);}
}
