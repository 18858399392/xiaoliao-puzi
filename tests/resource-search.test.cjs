const {test}=require('node:test');const assert=require('node:assert/strict');
const {queryUrl,pansearchUrl,normalize}=require('../resource-search.js');
test('requests plugins only, without Telegram channels',()=>{const u=new URL(queryUrl(' 论语 '));assert.equal(u.searchParams.get('src'),'plugin');assert.equal(u.searchParams.get('kw'),'论语');assert.equal(u.searchParams.has('channels'),false);assert.equal(u.searchParams.get('res'),'merge');});
test('PanSearch uses its real keyword route and encodes query safely',()=>{const u=new URL(pansearchUrl('书名 & 作者'));assert.equal(u.origin,'https://www.pansearch.me');assert.equal(u.pathname,'/search');assert.equal(u.searchParams.get('keyword'),'书名 & 作者');assert.equal([...u.searchParams].length,1);});
test('keeps safe plugin shares, extraction codes, and removes duplicates and unwanted genres',()=>{
 const valid={url:'https://pan.quark.cn/s/abc',note:'论语',source:'plugin:pansearch',password:'abcd'};
 const rows=normalize({code:0,data:{merged_by_type:{quark:[valid,{...valid,url:valid.url+'?ref=other'},{...valid,url:'https://pan.quark.cn/s/xyz',note:'修仙漫画'}]}}});
 assert.equal(rows.length,1);assert.equal(rows[0].password,'abcd');assert.equal(rows[0].cloud,'夸克网盘');
});
test('blocks Telegram sources, unknown sources, hostile links, credentials and non-share paths',()=>{
 const base={url:'https://pan.baidu.com/s/abc',note:'资源',source:'plugin:labi'};
 const input=[{...base,source:'tg:test'},{...base,source:''},...['https://t.me/share','https://telegram.org/s/abc','javascript:alert(1)','https://pan.baidu.com.attacker.example/s/abc','https://user:pass@pan.baidu.com/s/abc','http://pan.baidu.com/s/abc','https://pan.baidu.com/redirect?url=https://t.me'].map(url=>({...base,url}))];
 assert.deepEqual(normalize({merged_by_type:{x:input}}),[]);
});
test('rejects invalid upstream and handles empty merged results',()=>{assert.throws(()=>normalize({code:403}));assert.throws(()=>normalize({data:{unexpected:[]}}));assert.deepEqual(normalize({merged_by_type:{}}),[]);});
