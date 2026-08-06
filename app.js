
import {$,number,euro} from './utils.js';
import {fetchRdw,calculateApkMonths} from './rdw.js';
import {parseAdvertisement} from './parser.js';
import {costItems,extraItems,calculate,checkedTotal} from './valuation.js';

let benchmarkIndex=0;

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

function applyParsed(parsed){
  if(parsed.price&&!number('askingPrice')){
    $('askingPrice').value=parsed.price;
    $('priceSource').value=parsed.priceSource;
  }
  if(parsed.mileage&&!number('mileage'))$('mileage').value=parsed.mileage;
  if(parsed.plate&&!$('plate').value)$('plate').value=parsed.plate;
  const checks=[...document.querySelectorAll('#extraList .check-item')];
  const select=(name,on)=>{const row=checks.find(r=>r.querySelector('span').textContent===name);if(row&&on)row.querySelector('input[type=checkbox]').checked=true};
  select('Twee originele sleutels',parsed.flags.twoKeys);
  select('Winterwielen',parsed.flags.winterWheels);
  select('Trekhaak',parsed.flags.towbar);
  select('Onderhoudsmap',parsed.flags.maintenance);
  const costs=[...document.querySelectorAll('#costList .check-item')];
  const cost=(name,on)=>{const row=costs.find(r=>r.querySelector('span').textContent===name);if(row&&on)row.querySelector('input[type=checkbox]').checked=true};
  cost('Lak-/deukschade',parsed.flags.damage);
  cost('Onderhoud achterstallig',!parsed.flags.maintenance);
  cost('Distributieriem onbekend',!parsed.flags.belt);
  $('status').textContent=`Advertentie geanalyseerd. ${parsed.saved?`${parsed.saved}× bewaard. `:''}${parsed.viewed?`${parsed.viewed}× bekeken.`:''}`;
}

async function analyze(){
  if(!number('askingPrice')){alert('Vul eerst de vraagprijs in.');$('askingPrice').focus();return}
  if(!number('mileage')){alert('Vul daarna de kilometerstand in.');$('mileage').focus();return}
  $('priceSource').value=$('priceSource').value||'Handmatig bevestigd';
  if($('adText').value.trim())applyParsed(parseAdvertisement($('adText').value));
  if($('plate').value.trim()){
    try{await fetchRdw()}catch(e){$('rdwStatus').textContent=e.message}
  }
  refresh();
  $('dashboard').scrollIntoView({behavior:'smooth'});
}

function refresh(){
  const r=calculate();
  $('offerAverage').textContent=euro(r.offerAvg);
  $('offerHighest').textContent=euro(r.offerHigh);
  $('benchmarkCount').textContent=r.benchmarks.length;
  $('benchmarkMedian').textContent=euro(r.benchmarkMedian);
  $('costTotal').textContent=euro(r.repair);
  $('extraTotal').textContent=euro(r.extras);
  $('kpiAsk').textContent=euro(r.asking);
  $('kpiAdvice').textContent=r.advice;
  $('kpiMaxBid').textContent=euro(r.maxBid);
  $('kpiMarket').textContent=euro(r.market);
  $('kpiQuick').textContent=euro(r.quick);
  $('kpiOpenBid').textContent=euro(r.openBid);
  $('kpiProfit').textContent=euro(r.profit);
  $('kpiConfidence').textContent=`${r.confidence} / 100`;

  const gap=r.asking-r.maxBid;
  $('dashboardSummary').textContent=r.market
    ?`Vraagprijs ${euro(r.asking)}. Jouw maximale bod ${euro(r.maxBid)}. ${gap>0?`De verkoper vraagt ${euro(gap)} te veel voor jouw handelsmodel.`:`Er zit ${euro(Math.abs(gap))} ruimte onder jouw maximale bod.`}`
    :'Vul RDW/voertuiggegevens, directe biedingen of minimaal drie benchmarks in.';

  $('valuationBreakdown').innerHTML=[
    ...r.sources.map(s=>`<div><span>${s.name}</span><strong>${euro(s.value)}</strong></div>`),
    `<div><span>Meerwaarde extra's</span><strong>${euro(r.extras)}</strong></div>`,
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
$('pasteLinkBtn').addEventListener('click',pasteLink);
$('pasteTextBtn').addEventListener('click',pasteText);
$('parseTextBtn').addEventListener('click',()=>{applyParsed(parseAdvertisement($('adText').value));refresh()});
$('addBenchmarkBtn').addEventListener('click',()=>addBenchmark());
$('generateMessageBtn').addEventListener('click',generateMessage);
$('copyMessageBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText($('bidMessage').value);$('status').textContent='Bodbericht gekopieerd.'});
$('resetBtn').addEventListener('click',reset);

if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js');
refresh();
