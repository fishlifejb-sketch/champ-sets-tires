# Turns the NC inventory export (.xlsx with locations) into the site inventory JSON.
# Usage: python3 tools/convert_inventory.py NEW.xlsx out.json, then swap out.json into <script id="inv"> in index.html.
import json,re,sys,openpyxl
RIMS={str(x) for x in range(10,31)}|{'16.5','17.5','19.5','22.5','24.5'}
def valid_size(w,a,rim):
    if rim not in RIMS: return False
    if re.fullmatch(r'\d{3}',w): return 125<=int(w)<=395 and int(w)%5==0 and re.fullmatch(r'\d{2}',a or '') is not None and 25<=int(a)<=95 and int(a)%5==0
    if re.fullmatch(r'\d{2}x',w): return re.fullmatch(r'\d{1,2}(\.\d+)?',a or '') is not None and 7<=float(a)<=20
    return re.fullmatch(r'\d{1,2}(\.\d+)?',w) is not None   # small/trailer sizes like 5.30-12, 4.80-8
def convert(path):
    wb=openpyxl.load_workbook(path,read_only=True,data_only=True)
    rows=wb.active.iter_rows(values_only=True); head=[str(h).strip() if h else '' for h in next(rows)]
    ix=lambda n:head.index(n)
    iS,iN,iC,iP,iT,iA,iL=ix('Number'),ix('Name'),ix('Tyre Condition'),ix('EBay Price'),ix('Tread Depth'),ix('Available'),ix('Location')
    iW,iAR,iR=ix('Width'),ix('Aspect Range'),ix('Wheel Size')
    listings={}; order=[]; skipped=[]
    for r in rows:
        if not r or not r[iS]: continue
        serial=str(r[iS]); name=str(r[iN] or '').split(' : ')[0]; p=name.split('_')
        if len(p)==6 and ' ' in p[0]: p=p[0].split(' ',1)+p[1:]   # "Nitto NT421Q Takeoff_235_..." (brand and model not split)
        if len(p)<7 or serial.lower().startswith('neginv'): skipped.append((serial,name,'unreadable name')); continue
        # size fields are always the last five; anything between brand and size is the model
        brand=p[0].strip(); model=' '.join(x for x in p[1:-5] if x.strip()); w,a,rim,li,sp=[x.strip() for x in p[-5:]]
        w=w.lower()
        # metric sizes: the Width / Aspect Range / Wheel Size columns win over the name (they fix typos in names)
        cw,ca,cr=[str(r[i]).strip() if r[i] not in (None,'') else '' for i in (iW,iAR,iR)]
        if re.fullmatch(r'\d+\.0',cr): cr=cr[:-2]
        if re.fullmatch(r'\d{3}',w) and re.fullmatch(r'\d{3}',cw) and re.fullmatch(r'\d{2}',ca) and valid_size(cw,ca,cr): w,a,rim=cw,ca,cr
        if not valid_size(w,a,rim): skipped.append((serial,name,'bad size')); continue
        isnew=str(r[iC]).strip().lower()=='new' or re.match(r'\s*new\s',model,re.I)
        cond='N' if isnew else 'T' if re.search(r'takeoff',model,re.I) else 'U'
        model=re.sub(r'\s+takeoff\s*$','',model,flags=re.I); model=re.sub(r'^\s*NEW\s+','',model,flags=re.I).strip()
        a='' if a.upper()=='N/A' else a
        ls=(li if li.upper()!='N/A' else '')+(sp if sp.upper()!='N/A' else '')
        try: tread=int(float(r[iT])) if r[iT] not in (None,'') else None
        except: tread=None
        price=round(float(r[iP]),2) if r[iP] not in (None,'') else None
        bay=str(r[iL] or '').strip()
        bay='' if bay.upper() in ('','#N/A','N/A','NONE') else (bay[3:] if bay.upper().startswith('NC-') else bay)
        key=(brand,model,w,a,rim,ls,cond)
        if key not in listings: listings[key]={}; order.append(key)
        listings[key].setdefault(tread,[]).append([serial,price]+([bay] if bay else []))
    out=[]
    for k in order:
        g=listings[k]
        groups=[[t,sorted(s,key=lambda x:(x[1] is None,x[1] or 0))] for t,s in sorted(g.items(),key=lambda kv:-(kv[0] if kv[0] is not None else -1))]
        out.append(list(k)+[groups])
    return out,skipped
if __name__=='__main__':
    out,sk=convert(sys.argv[1]); json.dump(out,open(sys.argv[2],'w'),separators=(',',':')); print(len(out),'listings',sum(len(s) for l in out for t,s in l[7]),'tires; skipped',len(sk))
