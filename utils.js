
export const $ = id => document.getElementById(id);
export const number = id => Number($(id)?.value || 0);
export const euro = value => new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
export const cleanPlate = value => String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export const median = values => {
  const a=values.filter(v=>Number(v)>0).map(Number).sort((x,y)=>x-y);
  if(!a.length)return 0;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
};
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
