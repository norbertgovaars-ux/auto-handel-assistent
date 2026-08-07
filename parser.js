
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
export function parseAdvertisement(text){
 const t=String(text||'').trim(),lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean),prices=[];
 lines.forEach((line,index)=>{let m=line.match(/(?:vraagprijs|verkoopprijs|prijs)\s*[:\-]?\s*(?:€|eur)?\s*([\d.]{3,7})/i);if(m)prices.push({value:money(m[1]),score:100,source:`advertentie: ${line.slice(0,90)}`});m=line.match(/^(?:€|eur)\s*([\d.]{3,7})/i);if(m)prices.push({value:money(m[1]),score:90-index*.2,source:`advertentie: ${line.slice(0,90)}`})});
 const best=prices.filter(x=>x.value>=300&&x.value<=100000).sort((a,b)=>b.score-a.score)[0];
 const km=t.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{5,6})\s*(?:km|kilometer)/i);
 const plate=t.match(/\b(?:[0-9]{2}-?[A-Z]{3}-?[0-9]|[A-Z]{2}-?[0-9]{2}-?[A-Z]{2}|[0-9]{2}-?[A-Z]{2}-?[A-Z]{2}|[A-Z]{2}-?[A-Z]{2}-?[0-9]{2})\b/i);
 const saved=t.match(/(\d+)\s*x?\s*bewaard/i),viewed=t.match(/(\d+)\s*x?\s*bekeken/i);
 const detected=rules.filter(r=>r[4].test(t)).map(r=>({id:r[0],label:r[1],type:r[2],value:r[3],source:'advertentie',confidence:r[5]}));
 const missing=missingRules.filter(r=>!r[3].test(t)).map(r=>({id:r[0],label:r[1],type:'missing',value:r[2],source:'ontbreekt in advertentie',confidence:65,question:r[4]}));
 return {price:best?.value||0,priceSource:best?.source||'Niet betrouwbaar gevonden',mileage:km?money(km[1]):0,plate:plate?cleanPlate(plate[0]):'',saved:saved?Number(saved[1]):0,viewed:viewed?Number(viewed[1]):0,detected,missing};
}
