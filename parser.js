
import {$,cleanPlate} from './utils.js';

const money=s=>Number(String(s||'').replace(/[^0-9]/g,''))||0;

export function parseAdvertisement(text){
  const t=String(text||'').trim();
  const lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const priceCandidates=[];
  lines.forEach((line,index)=>{
    let m=line.match(/(?:vraagprijs|verkoopprijs|prijs)\s*[:\-]?\s*(?:€|eur)?\s*([\d.]{3,7})/i);
    if(m)priceCandidates.push({value:money(m[1]),score:100,source:`advertentie: ${line.slice(0,90)}`});
    m=line.match(/^(?:€|eur)\s*([\d.]{3,7})/i);
    if(m)priceCandidates.push({value:money(m[1]),score:90-index*.2,source:`advertentie: ${line.slice(0,90)}`});
  });
  const bestPrice=priceCandidates.filter(x=>x.value>=300&&x.value<=100000).sort((a,b)=>b.score-a.score)[0];
  const km=t.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{5,6})\s*(?:km|kilometer)/i);
  const plate=t.match(/\b(?:[0-9]{2}-?[A-Z]{3}-?[0-9]|[A-Z]{2}-?[0-9]{2}-?[A-Z]{2}|[0-9]{2}-?[A-Z]{2}-?[A-Z]{2}|[A-Z]{2}-?[A-Z]{2}-?[0-9]{2})\b/i);
  const saved=t.match(/(\d+)\s*x?\s*bewaard/i);
  const viewed=t.match(/(\d+)\s*x?\s*bekeken/i);
  const flags={
    twoKeys:/(2|twee)\s*(originele\s*)?sleutels|reservesleutel/i.test(t),
    winterWheels:/winterbanden|winterwielen/i.test(t),
    towbar:/trekhaak/i.test(t),
    airco:/airco|climate control|clima/i.test(t),
    cruise:/cruise control/i.test(t),
    maintenance:/onderhoudsboekjes|volledige historie|facturen aanwezig|dealeronderhouden/i.test(t),
    damage:/schade|deuk|kras|lakschade/i.test(t),
    warning:/storingslamp|waarschuwingslamp|motorlamp/i.test(t),
    belt:/distributieriem.*vervang|nieuwe distributieriem/i.test(t),
    clutch:/nieuwe koppeling|koppeling vervangen/i.test(t)
  };
  return {
    price:bestPrice?.value||0,
    priceSource:bestPrice?.source||'Niet betrouwbaar gevonden',
    mileage:km?money(km[1]):0,
    plate:plate?cleanPlate(plate[0]):'',
    saved:saved?Number(saved[1]):0,
    viewed:viewed?Number(viewed[1]):0,
    flags
  };
}
