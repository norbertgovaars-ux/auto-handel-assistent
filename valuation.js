
import {$,number,euro,median,clamp} from './utils.js';
import {calculateApkMonths} from './rdw.js';

export const costItems=[
  ['Verse APK nodig',250],['Banden',400],['Remmen',350],['Airco defect',450],['Distributieriem onbekend',600],
  ['Koppeling',900],['Accu',150],['Lak-/deukschade',350],['Voorruit',400],['Stuurhuis',700],
  ['Turbo/injectie risico',900],['Automaat risico',750],['Onderhoud achterstallig',450]
];
export const extraItems=[
  ['Twee originele sleutels',175],['Winterwielen',300],['Zomerwielen',250],['Trekhaak',150],
  ['Skibox',175],['Dakdragers',100],['Onderhoudsmap',125],['Navigatie/multimedia',100]
];

export function checkedTotal(containerId){
  return [...document.querySelectorAll(`#${containerId} .check-item`)]
    .filter(row=>row.querySelector('input[type=checkbox]').checked)
    .reduce((sum,row)=>sum+Number(row.querySelector('input[type=number]').value||0),0);
}

export function benchmarkValues(){
  const rows=[...document.querySelectorAll('.bench')].map(row=>{
    const price=Number(row.querySelector('[data-key=price]').value||0);
    const year=Number(row.querySelector('[data-key=year]').value||0);
    const km=Number(row.querySelector('[data-key=km]').value||0);
    const sameAuto=row.querySelector('[data-key=automatic]').checked;
    const manualCorrection=Number(row.querySelector('[data-key=correction]').value||0);
    let correction=manualCorrection;
    const targetYear=number('year'),targetKm=number('mileage');
    if(year&&targetYear)correction+=(targetYear-year)*175;
    if(km&&targetKm)correction+=Math.round(((km-targetKm)/10000)*125/25)*25;
    if(!sameAuto)correction-=500;
    const corrected=Math.max(0,price+correction);
    row.querySelector('.bench-note').textContent=price?`Gecorrigeerd: ${euro(corrected)} (${euro(correction)} correctie)`:'Nog niet compleet.';
    return {valid:!!(price&&year&&km&&sameAuto),corrected};
  }).filter(x=>x.valid);
  return rows;
}

function depreciationFloor(){
  const year=number('year'),km=number('mileage'),catalog=number('catalogPrice')||22000;
  if(!year||!km)return 0;
  const age=Math.max(0,new Date().getFullYear()-year);
  const ageFactor=age<=10?[1,.78,.65,.55,.47,.40,.34,.30,.26,.23,.20][age]:Math.max(.04,.20*Math.pow(.92,age-10));
  const expected=Math.max(25000,age*15000);
  const kmFactor=clamp(1+(expected-km)/expected*.30,.62,1.25);
  return Math.max(500,Math.round(catalog*ageFactor*kmFactor/50)*50);
}

function detectedTotal(id){return [...document.querySelectorAll(`#${id} .analysis-item`)].reduce((s,row)=>s+Number(row.querySelector('input[type=number]')?.value||0),0)}
function missingTotal(){return [...document.querySelectorAll('#missingInfo .analysis-item')].filter(row=>row.querySelector('input[type=checkbox]')?.checked).reduce((s,row)=>s+Number(row.querySelector('input[type=number]')?.value||0),0)}
export function calculate(){
  const asking=number('askingPrice');
  const detectedPlus=detectedTotal('detectedPlus');
  const detectedMinus=detectedTotal('detectedMinus');
  const missingRisk=missingTotal();
  const repair=checkedTotal('costList')+detectedMinus+missingRisk;
  const extras=Math.min(checkedTotal('extraList'),600);
  const profit=number('targetProfit');
  const fixed=number('fixedCosts');
  const quickDiscount=number('quickDiscount')/100;
  const offers=[number('offerAnwb'),number('offerWka'),number('offerOther')].filter(Boolean);
  const offerAvg=offers.length?offers.reduce((a,b)=>a+b,0)/offers.length:0;
  const offerHigh=offers.length?Math.max(...offers):0;
  const benchmarks=benchmarkValues();
  const benchmarkMedian=median(benchmarks.map(x=>x.corrected));
  const floor=depreciationFloor();

  let sources=[];
  if(benchmarkMedian)sources.push({name:'Benchmarkmediaan',value:benchmarkMedian,weight:0.50});
  if(offerAvg)sources.push({name:'Directe inkoopbiedingen + handelsopslag',value:offerAvg*1.28,weight:0.25});
  if(floor)sources.push({name:'Afschrijvingsondergrens',value:floor,weight:0.25});
  const totalWeight=sources.reduce((s,x)=>s+x.weight,0);
  let market=totalWeight?sources.reduce((s,x)=>s+x.value*x.weight,0)/totalWeight:0;
  market=Math.round((market+extras+detectedPlus)/50)*50;
  const quick=Math.round(market*(1-quickDiscount)/50)*50;
  const maxBid=Math.max(0,Math.round((quick-repair-fixed-profit)/50)*50);
  const openBid=Math.max(0,Math.round((maxBid*.90)/50)*50);
  const confidence=clamp(Math.round(10+Math.min(45,benchmarks.length*15)+offers.length*8+(number('year')?8:0)+(number('mileage')?8:0)+($('plate')?.value?8:0)+($('brand')?.value?10:0)),0,100);
  let advice='ONVOLDOENDE DATA';
  if(market&&asking){
    if(asking<=maxBid)advice='KOPEN / DIRECT BELLEN';
    else if(asking<=maxBid*1.12)advice='ALLEEN ONDERHANDELEN';
    else advice='OVERSLAAN';
  }

  return {asking,repair,extras,detectedPlus,detectedMinus,missingRisk,profit,fixed,offerAvg,offerHigh,benchmarks,benchmarkMedian,floor,market,quick,maxBid,openBid,confidence,advice,sources,apkMonths:calculateApkMonths()};
}
