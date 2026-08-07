import {$,cleanPlate} from './utils.js';

const VEHICLES='https://opendata.rdw.nl/resource/m9d7-ebf2.json';
const FUELS='https://opendata.rdw.nl/resource/8ys7-d773.json';

async function getJson(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok) throw new Error(`RDW gaf foutcode ${response.status}`);
  return response.json();
}

function rdwDateToInput(value){
  const d=String(value||'').replace(/\D/g,'');
  return d.length===8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : '';
}

export async function fetchRdw(){
  const plate=cleanPlate($('plate').value);
  if(!plate) throw new Error('Geen kenteken gevonden.');
  $('rdwStatus').textContent='RDW wordt opgehaald…';

  const rows=await getJson(`${VEHICLES}?kenteken=${encodeURIComponent(plate)}`);
  if(!rows.length) throw new Error('Kenteken niet gevonden bij RDW.');
  const v=rows[0];

  let fuelRows=[];
  try{ fuelRows=await getJson(`${FUELS}?kenteken=${encodeURIComponent(plate)}`); }catch(e){}
  const fuel=fuelRows[0]||{};

  $('plate').value=plate;
  $('brand').value=v.merk||'';
  $('model').value=v.handelsbenaming||'';
  $('year').value=(v.datum_eerste_toelating||v.datum_eerste_tenaamstelling_in_nederland||'').toString().slice(0,4);
  $('fuel').value=fuel.brandstof_omschrijving||'';
  const kw=Number(fuel.netto_max_vermogen||0);
  $('power').value=kw ? Math.round(kw) : '';
  $('body').value=v.inrichting||'';
  $('doors').value=v.aantal_deuren||'';
  $('seats').value=v.aantal_zitplaatsen||'';
  $('catalogPrice').value=v.catalogusprijs||'';

  const apk=rdwDateToInput(v.vervaldatum_apk);
  if(apk) $('apkDate').value=apk;
  calculateApkMonths();

  $('rdwStatus').textContent=`RDW: ${v.merk||''} ${v.handelsbenaming||''}`.trim();
  return {vehicle:v,fuel};
}

export function calculateApkMonths(){
  const value=$('apkDate').value;
  if(!value){$('apkMonths').value='';return 0}
  const now=new Date(),end=new Date(value+'T12:00:00');
  const diff=(end-now)/(1000*60*60*24*30.44);
  const months=Math.max(0,Math.floor(diff));
  $('apkMonths').value=end<now?'Verlopen':`${months} maanden`;
  return end<now?0:months;
}
