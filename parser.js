
import {cleanPlate} from './utils.js';
const money=s=>Number(String(s||'').replace(/[^0-9]/g,''))||0;
const rules=[
['twoKeys','Twee originele sleutels','plus',175,/(2|twee)\s*(originele\s*)?sleutels|reservesleutel/i,90],
['winterWheels','Extra set winterwielen','plus',300,/winterbanden|winterwielen/i,90],
['towbar','Trekhaak','plus',150,/trekhaak/i,95],
['maintenance','Volledige onderhoudshistorie','plus',200,/onderhoudsboekjes|volledige historie|facturen aanwezig|dealeronderhouden/i,85],
['beltDone','Distributieriem recent vervangen','plus',500,/distributieriem.{0,40}(vervang|nieuw|gedaan)/i,85],
['clutchDone','Koppeling recent vervangen','plus',450,/(nieuwe koppeling|koppeling.{0,25}vervang)/i,85],
['newTyres','Nieuwe of recente banden','plus',250,/(nieuwe banden|banden.{0,25}nieuw|recent vervangen)/i,80],
['newBrakes','Nieuwe of recente remmen','plus',200,/(nieuwe remmen|remmen.{0,25}vervang)/i,80],
['airco','Airco / climate control','plus',150,/airco|climate control|clima/i,90],
['cruise','Cruise control','plus',150,/cruise control/i,90],
['camera','Achteruitrijcamera','plus',125,/achteruitrijcamera|camera achter/i,90],
['parking','Parkeersensoren','plus',100,/parkeersensoren|pdc/i,90],
['navigation','Navigatie / CarPlay','plus',100,/navigatie|carplay|android auto|multimedia/i,85],
['damage','Schade of lakschade genoemd','minus',350,/schade|deuk|kras|lakschade/i,85],
['warning','Storings- of waarschuwingslamp genoemd','minus',500,/storingslamp|waarschuwingslamp|motorlamp/i,90],
['aircoDefect','Airco defect','minus',450,/airco.{0,25}(defect|werkt niet|kapot|leeg)/i,90],
['oilUse','Olieverbruik genoemd','minus',600,/olieverbruik|verbruikt olie/i,90],
['noise','Bijgeluid of rammel genoemd','minus',400,/bijgeluid|rammel|tikken|bonken/i,80],
['seatWear','Slijtage bestuurdersstoel/interieur','minus',175,/stoel.{0,25}(slijtage|versleten|beschadigd)|interieur.{0,25}(slijtage|beschadigd)/i,75],
['oneKey','Slechts één sleutel','minus',175,/(1|één|een)\s*(originele\s*)?sleutel(?!s)/i,85]
];
const missingRules=[
['keysUnknown','Aantal sleutels niet genoemd',125,/sleutel/i,'Hoeveel originele sleutels zijn aanwezig?'],
['maintenanceUnknown','Onderhoudshistorie niet genoemd',250,/onderhoud|boekje|factuur|dealeronderhouden/i,'Is er een volledige onderhoudshistorie met facturen?'],
['beltUnknown','Distributieriem/ketting niet genoemd',450,/distributieriem|distributieketting|ketting/i,'Wanneer is de distributie gecontroleerd of vervangen?'],
['aircoUnknown','Werking airco niet bevestigd',150,/airco|climate control|clima/i,'Werkt de airco goed en wordt hij koud?'],
['damageUnknown','Schadevrij niet bevestigd',200,/schadevrij|geen schade|schade/i,'Heeft de auto schade, roest, deuken of herstelde schade?'],
['tyresUnknown','Bandenprofiel niet genoemd',250,/banden|profiel/i,'Hoeveel millimeter profiel hebben de banden?'],
['apkUnknown','APK niet genoemd',200,/apk/i,'Tot wanneer loopt de APK en waren er adviespunten?']
];

function normalizeText(text){
  return String(text||'')
    .replace(/\u00a0/g,' ')
    .replace(/[ \t]+/g,' ')
    .replace(/\r/g,'');
}
function bestPriceFromText(t){
  const candidates=[],lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const push=(raw,score,source)=>{
    const value=money(raw);
    if(value>=300 && value<=100000) candidates.push({value,score,source});
  };
  lines.forEach((line,index)=>{
    let m=line.match(/(?:vraagprijs|verkoopprijs|prijs|price)\s*[:\-]?\s*(?:€|eur)?\s*([\d.]{3,7})/i);
    if(m)push(m[1],120,`advertentie: ${line.slice(0,100)}`);
    m=line.match(/(?:€|EUR)\s*([\d.]{3,7})(?:[,\-]{0,2})?/i);
    if(m)push(m[1],105-index*.05,`advertentie: ${line.slice(0,100)}`);
    m=line.match(/^([\d.]{1,3}\.\d{3}|[1-9]\d{3,4})\s*(?:euro|EUR)$/i);
    if(m)push(m[1],95-index*.05,`advertentie: ${line.slice(0,100)}`);
  });
  return candidates.sort((a,b)=>b.score-a.score)[0]||null;
}
function findMileage(t){
  const patterns=[
    /(?:kilometerstand|km\s*stand|mileage)\s*[:\-]?\s*(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})/i,
    /(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})\s*(?:km|kilometer)\b/i
  ];
  for(const p of patterns){const m=t.match(p);if(m){const v=money(m[1]);if(v>=1000&&v<=900000)return v}}
  return 0;
}
function findPlate(t){
  const cleaned=t.toUpperCase();
  const patterns=[
    /\b\d{2}-?[A-Z]{3}-?\d\b/,
    /\b[A-Z]{2}-?\d{2}-?[A-Z]{2}\b/,
    /\b\d{2}-?[A-Z]{2}-?[A-Z]{2}\b/,
    /\b[A-Z]{2}-?[A-Z]{2}-?\d{2}\b/,
    /\b\d{2}-?\d{2}-?[A-Z]{2}\b/,
    /\b[A-Z]{2}-?\d{2}-?\d{2}\b/,
    /\b\d{2}-?[A-Z]{2}-?\d{2}\b/,
    /\b[A-Z]{2}-?\d{3}-?[A-Z]\b/
  ];
  for(const p of patterns){const m=cleaned.match(p);if(m)return cleanPlate(m[0])}
  return '';
}
function findYear(t){
  const m=t.match(/(?:bouwjaar|jaar|eerste toelating)\s*[:\-]?\s*((?:19|20)\d{2})/i) || t.match(/\b((?:19|20)\d{2})\b/);
  return m?Number(m[1]):0;
}
export function parseAdvertisement(text){
 const t=normalizeText(text),best=bestPriceFromText(t);
 const saved=t.match(/(\d+)\s*x?\s*bewaard/i),viewed=t.match(/(\d+)\s*x?\s*bekeken/i);
 const detected=rules.filter(r=>r[4].test(t)).map(r=>({id:r[0],label:r[1],type:r[2],value:r[3],source:'advertentie',confidence:r[5]}));
 const missing=missingRules.filter(r=>!r[3].test(t)).map(r=>({id:r[0],label:r[1],type:'missing',value:r[2],source:'ontbreekt in advertentie',confidence:65,question:r[4]}));
 return {
   price:best?.value||0,
   priceSource:best?.source||'Niet betrouwbaar gevonden',
   mileage:findMileage(t),
   plate:findPlate(t),
   year:findYear(t),
   saved:saved?Number(saved[1]):0,
   viewed:viewed?Number(viewed[1]):0,
   detected,missing,
   rawLength:t.length
 };
}
