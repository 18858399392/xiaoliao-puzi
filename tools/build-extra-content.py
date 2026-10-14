"""Build the local extras from reviewed question text and attributed essays."""
import hashlib,json,re
from pathlib import Path

TOOLS=Path(__file__).resolve().parent
ROOT=TOOLS.parent
def index(key):return int(hashlib.sha256(key.encode()).hexdigest()[:10],16)
def build():
    riddles=[];questions=set()
    for number,line in enumerate((TOOLS/'riddles.tsv').read_text(encoding='utf-8').splitlines(),1):
        if not line or line.startswith('#'):continue
        fields=line.split('|')
        if len(fields)!=4 or not all(fields):raise ValueError('Invalid riddle line '+str(number))
        topic,question,answer,explanation=fields
        if question in questions:raise ValueError('Duplicate question: '+question)
        if re.search('题面不能成立|部件不足|应重新仔细|需要重新|应组成.*吗',explanation):raise ValueError('Unreviewed draft: '+question)
        questions.add(question);key=index(question)
        riddles.append({'id':'riddle:'+str(key),'type':'riddle','index':key,'duanzi':question,'topic':topic,'answer':answer,'explanation':explanation,'sourceName':'精神零食整理','license':'CC BY 4.0'})
    readings=[];sources=[]
    imported=json.loads((TOOLS/'readings.json').read_text(encoding='utf-8'))
    # This page's quotation block needs a separate importer; omit rather than publish an incomplete body.
    excluded={'黃生借書說','白種人——上帝的驕子','好的故事'}
    title_chars=str.maketrans('種驕槳聲燈裏烏篷綠鄉業與樂學問學術為國說臘葉陋銘愛蓮蘭敘歸來辭傳謝書諫閣進毀譚記遊鈷鉧樹駝陽樓醉聲賣豐賦鐘臺傷東軒項齋義學創讀詩師論馬勸燭淚風箏體畫蓮學說學','种骄桨声灯里乌篷绿乡业与乐学问学术为国说腊叶陋铭爱莲兰叙归来辞传谢书谏阁进毁谭记游钴𬭁树驼阳楼醉声卖丰赋钟台伤东轩项斋义学创读诗师论马劝烛泪风筝体画莲学说学')
    for item in imported:
        if item['title'] in excluded:continue
        item={**item,'paragraphs':item['paragraphs'][:]}
        if item['title']=='前赤壁賦':
            end=next((n for n,p in enumerate(item['paragraphs']) if '不知东方之既白' in p),None)
            if end is None:raise ValueError('Red Cliff ending missing')
            item['paragraphs']=item['paragraphs'][:end+1]
        if item['title']=='諫逐客書':
            start=next((n for n,p in enumerate(item['paragraphs']) if p.startswith('臣闻吏议逐客')),None)
            if start is None:raise ValueError('Memorial opening missing')
            item['paragraphs']=item['paragraphs'][start:]
        item['paragraphs']=[re.sub('一作[“「][^”」]+[”」](?:或[“「][^”」]+[”」])*','',p).replace('〈乎〉','') for p in item['paragraphs']]
        key=index(item['sourceUrl']);paragraphs=item['paragraphs'];chars=sum(len(p) for p in paragraphs)
        if not paragraphs or chars<70 or not item.get('sourceRevision'):raise ValueError('Incomplete article '+item['title'])
        display_title=item['title'].translate(title_chars)
        entry={**{k:item[k] for k in ['author','topic','intro','sourceUrl','sourceRevision','license','licenseUrl','sourceName']},
               'title':display_title,'paragraphs':paragraphs,'wordCount':chars,'index':key,'id':'reading:'+str(key),'type':'reading','duanzi':display_title+'\n'+item['intro'],
               'editorNote':'导读由精神零食整理；正文选来源首个文本版本的简体显示，去除校勘异文及他人题跋，未作白话改写。'}
        readings.append(entry);sources.append({'id':entry['id'],'title':display_title,'author':item['author'],'url':item['sourceUrl'],'revision':item['sourceRevision'],'rightsNote':item['rightsNote'],'license':item['license'],'licenseUrl':item['licenseUrl']})
    for items in [riddles,readings]:
        if len({item['id'] for item in items})!=len(items):raise ValueError('Identity collision')
    payload={'text':{'riddle':riddles,'reading':readings},'counts':{'riddle':len(riddles),'reading':len(readings)}}
    payload['version']=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]
    script='window.EXTRA_CONTENT = '+json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';\n'
    (ROOT/'extra-content.js').write_text(script,encoding='utf-8',newline='\n')
    (ROOT/'content-sources.json').write_text(json.dumps({'riddles':{'source':'Project-written descriptions and explanations of common riddle and reasoning ideas; AI-assisted editing','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/'},'readings':sources},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({**payload['counts'],'bytes':len(script.encode()),'version':payload['version']},ensure_ascii=False))
if __name__=='__main__':build()
