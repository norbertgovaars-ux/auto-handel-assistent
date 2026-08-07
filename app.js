
import {$,number,euro} from './utils.js';
import {fetchRdw,calculateApkMonths} from './rdw.js';
import {parseAdvertisement} from './parser.js';
import {costItems,extraItems,calculate,checkedTotal} from './valuation.js';

let benchmarkIndex=0;
let lastParsed={detected:[],missing:[]};


function extractFirstUrl(value=''){
  const match=String(value).match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[),.;]+$/,'') : '';
}

async function receiveSharedAdvertisement(){
  const params=new URLSearchParams(window.location.search);
  if(params.get('share-target')!=='1') return false;
  const sharedTitle=params.get('title')||'';
  const sharedText=params.get('text')||'';
  const sharedUrl=params.get('url')||extractFirstUrl(sharedText);
  const combined=[sharedTitle,sharedText].filter(Boolean).join('\n').trim();
  if(sharedUrl)$('adUrl').value=sharedUrl;
  if(combined)$('adText').value=combined;
  history.replaceState({},document.title,'./');
  $('status').textContent='Advertentie ontvangen via Delen. Automatische analyse gestart…';
  await analyze({fromShare:true});
  return true;
}

function renderChecks(id,items){
  $(id).innerHTML=items.map(([name,value])=>`
    <label class="check-item">
      <input type="checkbox">
      <span>${name}</span>
      <input type="number" value="${value}">
    </label>`).join('');
  document.querySelectorAll(`#${id} input`).forEach(x=>x.addEventListener('input',refresh));
}

function addBenchmark(data={}){
  benchmarkIndex++;
  const row=document.createElement('div');
  row.className='bench';
  row.innerHTML=`
    <div class="bench-grid">
      <label>Titel<input data-key="title" value="${data.title||`Benchmark ${benchmarkIndex}`}"></label>
      <label>Prijs €<input data-key="price" type="number" value="${data.price||''}"></label>
      <label>Bouwjaar<input data-key="year" type="number" value="${data.year||''}"></label>
      <label>Kilometerstand<input data-key="km" type="number" value="${data.km||''}"></label>
      <label>Correctie €<input data-key="correction" type="number" value="${data.correction||0}"></label>
    </div>
    <label><input data-key="automatic" type="checkbox" ${data.automatic===false?'':'checked'}> Zelfde/vergelijkbare automaat</label>
    <label>Bronlink<input data-key="url" value="${data.url||''}"></label>
    <div class="bench-note">Nog niet compleet.</div>`;
  row.querySelectorAll('input').forEach(x=>x.addEventListener('input',refresh));
  $('benchmarkList').appendChild(row);
}


function confidenceLabel(v){return v>=85?'<span class="confidence-high">hoog</span>':v>=65?'<span class="confidence-medium">gemiddeld</span>':'<span class="confidence-low">laag</span>'}
function renderDetected(parsed){
 lastParsed=parsed;
 const plus=parsed.detected.filter(x=>x.type==='plus'),minus=parsed.detected.filter(x=>x.type==='minus');
 const item=(x,kind)=>`<div class="analysis-item ${kind}"><div><strong>${x.label}</strong><div class="meta"><span class="source-tag">${x.source}</span> zekerheid ${confidenceLabel(x.confidence)}</div></div><input type="number" value="${x.value}"></div>`;
 $('detectedPlus').innerHTML=plus.length?plus.map(x=>item(x,'plus')).join(''):'<div class="muted">Geen pluspunten gevonden.</div>';
 $('detectedMinus').innerHTML=minus.length?minus.map(x=>item(x,'minus')).join(''):'<div class="muted">Geen minpunten gevonden.</div>';
 $('missingInfo').innerHTML=parsed.missing.length?parsed.missing.map(x=>`<div class="analysis-item missing"><div><strong>${x.label}</strong><div class="meta">${x.question}<br><span class="source-tag">${x.source}</span> zekerheid ${confidenceLabel(x.confidence)}</div></div><div><label><input type="checkbox"> meenemen</label><input type="number" value="${x.value}"></div></div>`).join(''):'<div class="muted">Geen belangrijke ontbrekende informatie gevonden.</div>';
 document.querySelectorAll('#detectedPlus input,#detectedMinus input,#missingInfo input').forEach(x=>x.addEventListener('input',refresh));
}

function applyParsed(parsed,{overwrite=false}={}){
 if(parsed.price && (overwrite||!number('askingPrice'))){$('askingPrice').value=parsed.price;$('priceSource').value=parsed.priceSource||'Advertentie'}
 if(parsed.mileage && (overwrite||!number('mileage')))$('mileage').value=parsed.mileage;
 if(parsed.plate && (overwrite||!$('plate').value))$('plate').value=parsed.plate;
 if(parsed.year && !$('year').value)$('year').value=parsed.year;
 renderDetected(parsed);
 updateFoundSummary();
 $('status').textContent=`Advertentie geanalyseerd. ${parsed.detected.length} punten gevonden, ${parsed.missing.length} zaken nog te controleren.${parsed.saved?` ${parsed.saved}× bewaard.`:''}${parsed.viewed?` ${parsed.viewed}× bekeken.`:''}`;
}
function updateFoundSummary(){
 $('foundPrice').textContent=number('askingPrice')?euro(number('askingPrice')):'Niet gevonden';
 $('foundKm').textContent=number('mileage')?`${number('mileage').toLocaleString('nl-NL')} km`:'Niet gevonden';
 $('foundPlate').textContent=$('plate').value.trim()||'Niet gevonden';
 $('foundRdw').textContent=$('brand').value.trim()?`${$('brand').value} ${$('model').value}`.trim():'Nog niet';
}


async function fetchAdvertisementText(url){
  if(!url)return {text:'',source:'geen link'};
  const clean=url.trim();
  const attempts=[
    {url:clean,source:'direct'},
    {url:'https://r.jina.ai/'+clean,source:'reader'}
  ];
  let lastError='';
  for(const attempt of attempts){
    try{
      const res=await fetch(attempt.url,{cache:'no-store'});
      if(!res.ok){lastError=`${attempt.source} ${res.status}`;continue}
      const text=await res.text();
      if(text && text.length>250)return {text,source:attempt.source};
    }catch(e){lastError=e.message}
  }
  throw new Error(lastError||'advertentie kon niet automatisch worden gelezen');
}
async function importFromLink(){
  const url=$('adUrl').value.trim();
  if(!url)return null;
  $('status').className='status';
  $('status').textContent='Advertentielink wordt gelezen…';
  try{
    const result=await fetchAdvertisementText(url);
    const combined=[$('adText').value,result.text].filter(Boolean).join('\n');
    $('adText').value=combined.slice(0,180000);
    const parsed=parseAdvertisement(combined);
    applyParsed(parsed,{overwrite:false});
    $('status').className='status good';
    $('status').textContent=`Linkanalyse gelukt via ${result.source}. Basisgegevens zijn automatisch gecontroleerd.`;
    return parsed;
  }catch(e){
    $('status').className='status warn';
    $('status').textContent='De site blokkeert automatisch uitlezen. Gedeelde titel/tekst en handmatige gegevens blijven bruikbaar.';
    return null;
  }
}
function fillBenchmarkRows(found){
  const rows=[...document.querySelectorAll('.bench')];
  found.slice(0,Math.max(3,found.length)).forEach((b,i)=>{
    let row=rows[i];
    if(!row){addBenchmark();row=[...document.querySelectorAll('.bench')].at(-1)}
    row.querySelector('[data-key=title]').value=b.title||`Benchmark ${i+1}`;
    row.querySelector('[data-key=price]').value=b.price||'';
    row.querySelector('[data-key=year]').value=b.year||'';
    row.querySelector('[data-key=km]').value=b.km||'';
    row.querySelector('[data-key=url]').value=b.url||'';
    row.querySelector('[data-key=automatic]').checked=true;
  });
  refresh();
}
async function autoBenchmarks(){
  const brand=$('brand').value.trim(),model=$('model').value.trim(),year=number('year'),km=number('mileage');
  if(!brand||!model||!year||!km){$('benchmarkStatus').textContent='Eerst RDW/merk, model, bouwjaar en kilometerstand nodig.';return}
  $('benchmarkStatus').textContent='Vergelijkbare auto’s zoeken…';
  const query=encodeURIComponent(`"${brand} ${model}" ${year} occasion ${Math.round(km/10000)*10000} km prijs`);
  try{
    const res=await fetch('https://r.jina.ai/https://www.google.com/search?q='+query,{cache:'no-store'});
    if(!res.ok)throw new Error('zoekdienst '+res.status);
    const text=await res.text(),lines=text.split('\n'),found=[];
    for(const line of lines){
      const pm=line.match(/€\s*([\d.]{3,7})/),ym=line.match(/\b(19\d{2}|20[0-2]\d)\b/),kmm=line.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})\s*km/i);
      if(pm&&ym&&kmm){
        const price=Number(pm[1].replace(/\D/g,'')),mileage=Number(kmm[1].replace(/\D/g,''));
        if(price>=500&&price<=50000&&mileage>=1000&&!found.some(x=>x.price===price&&x.km===mileage)){
          found.push({title:line.replace(/\[|\]|\*/g,'').slice(0,110),price,year:Number(ym[1]),km:mileage,url:''});
        }
      }
      if(found.length>=5)break;
    }
    if(!found.length)throw new Error('geen bruikbare resultaten gevonden');
    fillBenchmarkRows(found);
    $('benchmarkStatus').textContent=`${found.length} mogelijke benchmarks gevonden. Controleer ze altijd handmatig.`;
  }catch(e){
    $('benchmarkStatus').textContent='Automatisch zoeken lukte niet. Benchmarks kunnen handmatig worden ingevuld.';
  }
}

async function analyze(options={}){
  $('status').className='status';
  $('status').textContent='Automatische analyse gestart…';

  // 1. Parse any already shared/pasted text.
  if($('adText').value.trim()){
    try{applyParsed(parseAdvertisement($('adText').value))}catch(e){}
  }

  // 2. Try to read the link itself if core data are still missing.
  if($('adUrl').value.trim() && (!number('askingPrice') || !number('mileage') || !$('plate').value.trim())){
    await importFromLink();
  }

  // 3. If a plate was found, RDW runs automatically.
  if($('plate').value.trim()){
    try{
      await fetchRdw();
      $('foundRdw').textContent=`${$('brand').value} ${$('model').value}`.trim();
    }catch(e){
      $('rdwStatus').textContent=e.message;
      $('foundRdw').textContent='Niet gelukt';
    }
  }

  updateFoundSummary();
  refresh();

  const missing=[];
  if(!number('askingPrice'))missing.push('vraagprijs');
  if(!number('mileage'))missing.push('kilometerstand');
  if(!$('plate').value.trim())missing.push('kenteken');
  if(missing.length){
    $('status').className='status warn';
    $('status').textContent=`Automatisch klaar voor zover mogelijk. Nog handmatig controleren: ${missing.join(', ')}.`;
    document.querySelector('.manual-core').open=true;
  }else{
    $('status').className='status good';
    $('status').textContent='Vraagprijs, kilometerstand en kenteken gevonden. RDW en aankoopanalyse zijn bijgewerkt.';
    $('dashboard').scrollIntoView({behavior:'smooth'});
  }
}

function refresh(){
  const r=calculate();
  $('offerAverage').textContent=euro(r.offerAvg);
  $('offerHighest').textContent=euro(r.offerHigh);
  $('benchmarkCount').textContent=r.benchmarks.length;
  $('benchmarkMedian').textContent=euro(r.benchmarkMedian);
  $('costTotal').textContent=euro(r.repair);
  $('extraTotal').textContent=euro(r.extras);
  $('detectedPlusTotal').textContent=euro(r.detectedPlus);
  $('detectedMinusConfirmed').textContent='- '+euro(r.detectedMinus);
  $('detectedMissingTotal').textContent='- '+euro(r.missingRisk);
  $('detectedMinusTotal').textContent='- '+euro(r.detectedMinus+r.missingRisk);
  $('detectedNetTotal').textContent=euro(r.detectedPlus-r.detectedMinus-r.missingRisk);
  $('kpiAsk').textContent=euro(r.asking);
  $('kpiAdvice').textContent=r.advice;
  $('kpiMaxBid').textContent=euro(r.maxBid);
  $('kpiMarket').textContent=euro(r.market);
  $('kpiQuick').textContent=euro(r.quick);
  $('kpiOpenBid').textContent=euro(r.openBid);
  $('kpiProfit').textContent=euro(r.profit);
  $('kpiConfidence').textContent=`${r.confidence} / 100`;
  let dealScore=30;
  if(r.market&&r.asking){
    const valueGap=(r.market-r.asking)/Math.max(r.market,1);
    dealScore+=Math.round(valueGap*90);
  }
  dealScore+=Math.min(20,r.benchmarks.length*6);
  dealScore+=Math.round(r.confidence*.20);
  dealScore-=Math.min(25,Math.round(r.repair/100));
  dealScore=Math.max(0,Math.min(100,dealScore));
  $('kpiDealScore').textContent=`${dealScore} / 100`;

  const gap=r.asking-r.maxBid;
  $('dashboardSummary').textContent=r.market
    ?`Vraagprijs ${euro(r.asking)}. Jouw maximale bod ${euro(r.maxBid)}. ${gap>0?`De verkoper vraagt ${euro(gap)} te veel voor jouw handelsmodel.`:`Er zit ${euro(Math.abs(gap))} ruimte onder jouw maximale bod.`}`
    :'Vul RDW/voertuiggegevens, directe biedingen of minimaal drie benchmarks in.';

  $('valuationBreakdown').innerHTML=[
    ...r.sources.map(s=>`<div><span>${s.name}</span><strong>${euro(s.value)}</strong></div>`),
    `<div><span>Meerwaarde extra's</span><strong>${euro(r.extras)}</strong></div>`,
    `<div><span>Pluscorrecties advertentie</span><strong>${euro(r.detectedPlus)}</strong></div>`,
    `<div><span>Minpunten advertentie</span><strong>- ${euro(r.detectedMinus)}</strong></div>`,
    `<div><span>Onzekerheidsreserve ontbrekende info</span><strong>- ${euro(r.missingRisk)}</strong></div>`,
    `<div><span>Snelle verkoopwaarde</span><strong>${euro(r.quick)}</strong></div>`,
    `<div><span>Herstel/risico</span><strong>- ${euro(r.repair)}</strong></div>`,
    `<div><span>Vaste kosten/buffer</span><strong>- ${euro(r.fixed)}</strong></div>`,
    `<div><span>Gewenste winst</span><strong>- ${euro(r.profit)}</strong></div>`,
    `<div><span>Maximaal bod</span><strong>${euro(r.maxBid)}</strong></div>`
  ].join('');

  const plus=[],minus=[];
  if(r.asking&&r.asking<=r.maxBid)plus.push('Vraagprijs ligt binnen jouw maximale aankoopprijs.');
  if(r.offerHigh)plus.push(`Er is een harde inkoopondergrens van ${euro(r.offerHigh)}.`);
  if(r.benchmarks.length>=3)plus.push(`${r.benchmarks.length} bruikbare benchmarkauto's ondersteunen de marktwaarde.`);
  if(r.apkMonths>=9)plus.push('Lange resterende APK.');
  if(r.asking>r.maxBid)minus.push(`Vraagprijs ligt ${euro(r.asking-r.maxBid)} boven jouw maximale bod.`);
  if(r.repair)minus.push(`Herstel- en risicokosten: ${euro(r.repair)}.`);
  if(r.benchmarks.length<3)minus.push('Minder dan drie bruikbare benchmarks.');
  if(!r.offerAvg)minus.push('Geen directe gegarandeerde inkoopbiedingen ingevoerd.');
  $('whyBuy').innerHTML=plus.length?plus.map(x=>`✓ ${x}`).join('<br>'):'Nog geen sterke koopargumenten.';
  $('whyNot').innerHTML=minus.length?minus.map(x=>`⚠ ${x}`).join('<br>'):'Geen duidelijke rode vlaggen.';
}

function generateMessage(){
  const r=calculate();
  $('bidMessage').value=`Goedendag, bedankt voor de informatie over de auto. De vraagprijs is ${euro(r.asking)}. Op basis van de kilometerstand, RDW-gegevens, vergelijkbare auto's en de kosten om de auto netjes verkoopklaar te maken, kom ik uit op een verantwoord bod van ${euro(r.openBid)}. Mijn absolute maximum ligt rond ${euro(r.maxBid)}. Als de auto verder is zoals beschreven, kan ik snel langskomen en direct betalen.`;
}

async function pasteText(){
  try{
    $('adText').value=await navigator.clipboard.readText();
    applyParsed(parseAdvertisement($('adText').value));
    refresh();
  }catch(e){$('status').textContent='Klembordtoegang niet toegestaan. Houd het tekstveld ingedrukt en kies Plakken.'}
}

async function pasteLink(){
  try{$('adUrl').value=await navigator.clipboard.readText()}catch(e){$('status').textContent='Klembordtoegang niet toegestaan.'}
}

function reset(){
  localStorage.removeItem('aha2');
  location.reload();
}

renderChecks('costList',costItems);
renderChecks('extraList',extraItems);
addBenchmark();addBenchmark();addBenchmark();

document.querySelectorAll('input,textarea').forEach(x=>x.addEventListener('input',refresh));
$('apkDate').addEventListener('change',()=>{calculateApkMonths();refresh()});
$('analyzeBtn').addEventListener('click',analyze);
$('openAdBtn').addEventListener('click',()=>{const u=$('adUrl').value.trim();if(u)window.open(/^https?:/i.test(u)?u:`https://${u}`,'_blank','noopener')});
$('pasteLinkBtn').addEventListener('click',async()=>{await pasteLink();await analyze()});
$('adUrl').addEventListener('change',()=>{ if($('adUrl').value.trim()) analyze(); });
$('pasteTextBtn').addEventListener('click',pasteText);
$('parseTextBtn').addEventListener('click',()=>{applyParsed(parseAdvertisement($('adText').value));refresh()});
$('addBenchmarkBtn').addEventListener('click',()=>addBenchmark());
$('autoBenchmarkBtn').addEventListener('click',autoBenchmarks);
$('generateMessageBtn').addEventListener('click',generateMessage);
$('copyMessageBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText($('bidMessage').value);$('status').textContent='Bodbericht gekopieerd.'});
$('resetBtn').addEventListener('click',reset);

if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js');
receiveSharedAdvertisement();
updateFoundSummary();
refresh();
