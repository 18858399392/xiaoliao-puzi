"""Build a reproducible starter bundle only from known candidate IDs."""
import hashlib
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parent
KINDS=['duanzi','dad-joke','hitokoto','audio']

def candidates():
    return json.loads((ROOT/'content-candidates.json').read_text(encoding='utf-8'))

def default_selection(data):
    result={}
    for kind in KINDS[:3]:
        values=data['text'][kind]
        result[kind]=[item['id'] for item in values]
    result['audio']=[item['id'] for item in data['audio'] if item.get('localAudio')]
    return {'selected':result,'blockedIds':[]}

def build(selection,data=None):
    data=data or candidates()
    all_items={kind: data['audio'] if kind=='audio' else data['text'][kind] for kind in KINDS}
    known={item['id']:item for values in all_items.values() for item in values}
    if not isinstance(selection,dict) or not isinstance(selection.get('selected'),dict):
        raise ValueError('选择包格式不正确')
    blocked=selection.get('blockedIds',[])
    if not isinstance(blocked,list) or any(not isinstance(key,str) or key not in known for key in blocked):
        raise ValueError('剔除列表包含未知内容')
    blocked=set(blocked)
    chosen={}
    for kind in KINDS:
        keys=selection['selected'].get(kind,[])
        valid_ids={item['id'] for item in all_items[kind]}
        if not isinstance(keys,list) or any(not isinstance(key,str) or key not in valid_ids for key in keys):
            raise ValueError('选择列表包含未知内容')
        chosen[kind]=list(dict.fromkeys(key for key in keys if key not in blocked))
    clean_selection={'selected':chosen,'blockedIds':sorted(blocked)}
    version=hashlib.sha256((json.dumps(clean_selection,sort_keys=True)+'local-text-v1').encode()).hexdigest()[:16]
    bundle={'version':version,'localTextOnly':True,'text':{kind:[known[key] for key in chosen[kind]] for kind in KINDS[:3]},'audio':[],
            'catalogue':{kind:[item['index'] for item in data['text'][kind]] for kind in KINDS[:3]},'blockedIds':sorted(blocked),'sourceCounts':data['counts'],'upstreamCommit':data['upstreamCommit']}
    for key in chosen['audio']:
        item=known[key]
        if not item.get('localAudio') or not (ROOT/item['audioUrl']).is_file():
            raise ValueError('歌曲尚无可用本地文件：'+item.get('songName',key))
        fields=['id','nickname','gender','avatar','songName','singer','lyrics','audioUrl','durationSec','likeCount','link','publishAt','localAudio']
        bundle['audio'].append({field:item.get(field) for field in fields})
    return clean_selection,bundle

def atomic_write(path,text):
    handle,temp=tempfile.mkstemp(prefix=path.name+'.',dir=ROOT)
    try:
        with os.fdopen(handle,'w',encoding='utf-8',newline='\n') as file:file.write(text)
        os.replace(temp,path)
    finally:
        if Path(temp).exists():Path(temp).unlink()

def save(selection,backup=True):
    selection,bundle=build(selection)
    if backup and (ROOT/'starter-content.js').exists():
        directory=ROOT/'.starter-backups'
        directory.mkdir(exist_ok=True)
        stamp=datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        (directory/(stamp+'.js')).write_bytes((ROOT/'starter-content.js').read_bytes())
    script='window.STARTER_CONTENT = '+json.dumps(bundle,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';\n'
    atomic_write(ROOT/'starter-content.js',script)
    atomic_write(ROOT/'starter-selection.json',json.dumps(selection,ensure_ascii=False,indent=2)+'\n')
    build_offline_worker(bundle)
    return {'version':bundle['version'],'counts':{kind:len(selection['selected'][kind]) for kind in KINDS}}

def build_offline_worker(bundle):
    template=(ROOT/'offline-worker.template.js').read_text(encoding='utf-8')
    audio_files=[item['audioUrl'] for item in bundle['audio']]
    template=template.replace('__AUDIO_FILES__',json.dumps(audio_files,separators=(',',':')))
    shell=['index.html','starter-content.js','content-buffer.js','music-sources.js']
    shell+=[name for name in ['pwa-register.js','manifest.webmanifest','favicon.png','favicon.ico'] if (ROOT/name).is_file()]
    shell+=[file.relative_to(ROOT).as_posix() for file in sorted((ROOT/'icons').glob('*.png'))]
    template=template.replace('__SHELL_FILES__',json.dumps(shell,separators=(',',':')))
    digest=hashlib.sha256(template.encode())
    for name in shell:
        digest.update((ROOT/name).read_bytes())
    worker=template.replace('__REVISION__',digest.hexdigest()[:20])
    atomic_write(ROOT/'offline-worker.js',worker)
    atomic_write(ROOT/'sw.js',worker)

if __name__=='__main__':
    selection_file=ROOT/'starter-selection.json'
    selection=json.loads(selection_file.read_text(encoding='utf-8')) if selection_file.exists() else default_selection(candidates())
    print(json.dumps(save(selection,backup=False),ensure_ascii=False))
