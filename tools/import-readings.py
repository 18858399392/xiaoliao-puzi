"""Curated, attributed public-domain essays from Wikisource's public API."""
import json,re,time,urllib.request,urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent
# A fixed editorial list, not a crawler or an indiscriminate book import.
LIST='''背影|朱自清|亲情|一个车站里的背影，怎样在多年后仍然清晰。
匆匆|朱自清|时间|从洗手、吃饭和沉默，重新看时间怎样经过我们。
荷塘月色|朱自清|自然|沿着荷塘走一段路，留意光、香气和心绪。
綠|朱自清|自然|一次看瀑布的经历，写成了关于颜色的细密观察。
春|朱自清|自然|跟着草木、风雨和人的动作，感受一个季节。
白種人——上帝的驕子|朱自清|观察|由一次日常相遇出发，思考平等与尊重。
槳聲燈影裏的秦淮河|朱自清|观察|在水面、灯影和声音之间，练习观察一座城。
北京的茶食|周作人|生活|一碟点心，也可以谈生活里的趣味与讲究。
喝茶|周作人|生活|从茶、器物和片刻闲暇，读一种日常生活的态度。
故鄉的野菜|周作人|自然|把记忆落在草木上，看看普通植物怎样连接故乡。
烏篷船|周作人|生活|小船上的细节，构成了一种缓慢而具体的生活经验。
我的母親|胡适|亲情|回望母亲的教养，也回望自己性格的来处。
敬業與樂業|梁启超|思考|一件事为什么值得认真做，又怎样从中找到乐趣。
最苦與最樂|梁启超|思考|从责任出发，讨论什么会使人困顿，什么能让人踏实。
少年中國說|梁启超|思考|一篇有力量的文章，也适合观察排比怎样推动表达。
學問之趣味|梁启超|学习|学习的快乐，是否可以从追问和发现中生长。
就任北京大學校長之演說|蔡元培|学习|关于求学、品行和人与人关系的一次公开讲话。
白馬湖之冬|夏丏尊|自然|从风与房屋的触感，读出一个地方的冬天。
秋夜|鲁迅|观察|一片夜空和一个小院，也能写出复杂的感受。
風箏|鲁迅|亲情|从一件童年往事，反省善意、误解和迟来的理解。
臘葉|鲁迅|时间|一片保存下来的叶子，带来关于生命与时间的联想。
好的故事|鲁迅|散文|在散文诗的语言中，留意色彩、节奏和瞬间的美。
陋室銘|刘禹锡|生活|住处的价值，怎样超出大小与装饰。
愛蓮說|周敦颐|自然|由一种植物，读古人怎样表达自己的取舍。
蘭亭集序|王羲之|时间|一次聚会的欢喜，怎样引出对时间与生命的感慨。
歸去來兮辭|陶渊明|生活|回到田园之前，先辨认自己愿意怎样生活。
五柳先生傳|陶渊明|生活|借一篇短传，观察一种不以富贵为尺度的人生态度。
與朱元思書|吴均|自然|文字怎样把山水、声音与流动的视线连起来。
答謝中書書|陶弘景|自然|极短的一封信，仍然能写出山川的层次与时刻。
諫太宗十思疏|魏徵|思考|在顺境中提醒自己，是一种怎样的自我约束。
滕王閣序|王勃|表达|跟随景物的铺陈，读一篇文章如何转入人的处境。
春夜宴桃李園序|李白|生活|一次相聚，留下对光阴、友情与兴致的感受。
師說|韩愈|学习|老师的价值，在身份之外还可以怎样理解。
馬說|韩愈|思考|才能与识别才能的环境，为什么需要同时被看见。
進學解|韩愈|学习|借问答的形式，讨论学习、勤勉与现实处境。
原毀|韩愈|思考|对自己和对别人，我们是否用了同一把尺子。
小石潭記|柳宗元|自然|一处小水潭，怎样被写得可见、可听、可感。
始得西山宴遊記|柳宗元|自然|换一个立足点，眼前的世界也可能不同。
鈷鉧潭西小丘記|柳宗元|自然|一个被忽略的小丘，怎样在观察中显露价值。
種樹郭橐駝傳|柳宗元|思考|通过种树的经验，思考照料与过度干预的区别。
岳陽樓記|范仲淹|思考|风景与心境相互照应，文章最后走向人的责任。
醉翁亭記|欧阳修|生活|山水、四时与人的快乐，在一篇游记中相遇。
秋聲賦|欧阳修|自然|从听见一阵声音开始，展开一次对秋天的感受。
賣油翁|欧阳修|学习|一个简单动作，可以帮助理解熟练从何而来。
豐樂亭記|欧阳修|生活|一处亭子不仅有风景，也保存着地方的记忆。
前赤壁賦|苏轼|思考|从江上的月色，走向对得失与变化的讨论。
後赤壁賦|苏轼|自然|同一处风景，再到访时可以有怎样不同的经验。
記承天寺夜遊|苏轼|生活|在一个短暂的夜晚，重新发现身边的月光。
石鐘山記|苏轼|观察|一个名称的来由，值得亲自观察和求证。
喜雨亭記|苏轼|生活|文章从一场雨说起，最后写到众人的生活。
超然臺記|苏轼|思考|所处的地方变化时，快乐有没有可能仍在身边。
答謝民師書|苏轼|表达|通过一封讨论文章的信，留意表达与自然之间的关系。
游褒禪山記|王安石|思考|一次未能走到底的探游，怎样引出关于志与力的反省。
傷仲永|王安石|学习|天分之后，后来的学习和环境仍然重要。
答司馬諫議書|王安石|表达|立场不同的时候，一封回信怎样交代自己的判断。
墨池記|曾巩|学习|由一个遗迹，讨论技艺背后长久的努力。
送東陽馬生序|宋濂|学习|在一段求学回忆里，观察条件、意愿与行动的关系。
項脊軒志|归有光|亲情|一间小屋里，留下了几代人的生活痕迹。
登泰山記|姚鼐|自然|沿着行程、方位和光线，练习有次序地写景。
病梅館記|龚自珍|思考|从梅树的形态，反思只有一种审美标准会怎样。
黃生借書說|袁枚|学习|拥有一本书和认真读它，为什么不是同一件事。
祭妹文|袁枚|亲情|在回忆的细节里，读亲人之间无法重来的时间。
與妻書|林觉民|亲情|一封留下的书信，让个人情感与时代处境同时可见。
報任安書|司马迁|思考|关于受挫、尊严和继续完成一件事的深长自述。
諫逐客書|李斯|思考|通过一篇劝谏，观察怎样用例证支撑自己的观点。
落花生|许地山|生活|一次家人的谈话，从果实说到怎样做一个有用的人。
海燕|郑振铎|自然|跟随飞鸟与远行的视线，体会自然与记忆的联系。
燕子|郑振铎|自然|用几笔观察，写出小鸟的形态和春天的生气。
谈读书|陶行知|学习|读书与生活怎样互相照应，值得在日常中反复追问。
学问的趣味|梁启超|学习|留意求知的过程，怎样比只记住结论更有趣。
勸學|荀子|学习|从积累、借助与坚持出发，思考学习怎样发生。'''

def fetch(row):
    title,author,topic,intro=row.split('|')
    aliases={'綠':'绿','烏篷船':'乌篷船','故鄉的野菜':'故乡的野菜','白馬湖之冬':'白马湖之冬','游褒禪山記':'遊褒禪山記','小石潭記':'至小丘西小石潭記'}
    page_title=aliases.get(title,title)
    params=urllib.parse.urlencode({'action':'parse','page':page_title,'prop':'text|revid','format':'json','variant':'zh-hans','redirects':1})
    url='https://zh.wikisource.org/w/api.php?'+params
    for attempt in range(3):
        try:
            request=urllib.request.Request(url,headers={'User-Agent':'SpiritSnack/1.0 (open-source curated reader; https://yule.kanglimin.com/)'})
            data=json.load(urllib.request.urlopen(request,timeout=25))
            if 'error' in data:return {'title':title,'error':data['error'].get('code')}
            parsed=data['parse'];soup=BeautifulSoup(parsed['text']['*'],'html.parser')
            licenses=soup.select('.licenseContainer, .licenseBanner')
            rights=' '.join(tag.get_text(' ',strip=True) for tag in licenses)
            if not re.search('公有领域|公有領域|Public domain',rights,re.I):return {'title':title,'error':'No explicit public-domain banner'}
            if re.search('有限例外|消极容忍|消極容忍|仍然.*版权|仍然.*版權',rights):return {'title':title,'error':'Source marks territory-restricted copyright'}
            main=soup.select_one('.prp-pages-output') or soup.select_one('.mw-parser-output') or soup
            for tag in main.select('style,script,table,.licenseContainer,.licenseBanner,.noprint,.mw-editsection,.reference,.ws-noexport,.headertemplate,.headerContainer,.header,.acContainer,.toc,.reflist'):
                tag.decompose()
            paragraphs=[]
            for p in main.find_all(['p','h2','h3']):
                if p.name!='p':
                    if paragraphs:break
                    continue
                text=p.get_text('',strip=False)
                text=re.sub('[\u200b\ufeff]','',text).strip()
                if text and text not in paragraphs and not re.match('^(作者[：:]|维基|維基|姊妹计划|姊妹計劃|取自|Public domain)',text):paragraphs.append(text)
            chars=sum(len(p) for p in paragraphs)
            if not 70<=chars<=8500:return {'title':title,'error':'Unexpected article length: '+str(chars)}
            if any('公有领域' in p or '公有領域' in p for p in paragraphs):return {'title':title,'error':'License leaked into body'}
            return {'title':title,'author':author,'topic':topic,'intro':intro,'paragraphs':paragraphs,'wordCount':chars,
                    'sourceUrl':'https://zh.wikisource.org/wiki/'+urllib.parse.quote(parsed.get('title',page_title)),'sourceRevision':parsed['revid'],
                    'license':'Public domain; Wikisource transcription CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/',
                    'rightsNote':rights,'sourceName':'维基文库','editorNote':'导读由精神零食整理；正文按来源的简体显示导入，未作现代白话改写。'}
        except Exception as error:
            if attempt==2:return {'title':title,'error':str(error)}
            time.sleep(1+attempt)

if __name__=='__main__':
    rows=LIST.splitlines();existing={}
    cache=ROOT/'readings-import.json'
    if cache.exists():existing={item['title']:item for item in json.loads(cache.read_text(encoding='utf-8')) if item.get('importVersion')==2}
    missing=[row for row in rows if row.split('|')[0] not in existing or 'error' in existing[row.split('|')[0]]]
    with ThreadPoolExecutor(max_workers=2) as pool:
        for item in pool.map(fetch,missing):
            item['importVersion']=2;existing[item['title']]=item;print(item['title']+': '+(item.get('error') or str(item['wordCount'])+' chars'),flush=True)
            cache.write_text(json.dumps(list(existing.values()),ensure_ascii=False,indent=2),encoding='utf-8')
    good=[existing[row.split('|')[0]] for row in rows if 'error' not in existing[row.split('|')[0]]]
    (ROOT/'readings.json').write_text(json.dumps(good,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'accepted':len(good),'total':len(rows)},ensure_ascii=False))
