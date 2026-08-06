
import {$,cleanPlate} from './utils.js';

const API='https://opendata.rdw.nl/resource/m9d7-ebf2.json';

export async function fetchRdw(){
  const plate=cleanPlate($('plate').value);
  if(!plate)throw new Error('Vul een kenteken in.');
  $('rdwStatus').textContent='RDW wordt opgehaald…';
  const response=await fetch(`${API}?kenteken=${encodeURIComponent(plate)}`);
  if(!response.ok)throw new Error(`RDW gaf foutcode ${response.status}`);
  const rows=await response.json();
  if(!rows.length)throw new Error('Kenteken niet gevonden bij RDW.');
  const v=rows[0];
  $('plate').value=plate;
  $('brand').value=v.merk||'';
  $('model').value=v.handelsbenaming||'';
  $('year').value=(v.datum_eerste_toelating||'').slice(0,4);
  $('fuel').value=v.brandstof_omschrijving||'';
  $('power').value=v.vermogen_massarijklaar||v.vermogen_motor_pk ? Math.round(Number(v.vermogen_motor_pk||0)*0.7355) : '';
  $('body').value=v.inrichting||'';
  $('doors').value=v.aantal_deuren||'';
  $('seats').value=v.aantal_zitplaatsen||'';
  $('catalogPrice').value=v.catalogusprijs||'';
  if(v.vervaldatum_apk){
    const d=String(v.vervaldatum_apk);
    $('apkDate').value=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  }
  calculateApkMonths();
  $('rdwStatus').textContent=`Gevonden: ${v.merk||''} ${v.handelsbenaming||''}`;
  return v;
}

export function calculateApkMonths(){
  const value=$('apkDate').value;
  if(!value){$('apkMonths').value='';return 0}
  const now=new Date(),end=new Date(value+'T12:00:00');
  const months=Math.max(0,Math.round((end-now)/(1000*60*60*24*30.44)));
  $('apkMonths').value=`${months} maanden`;
  return months;
}
