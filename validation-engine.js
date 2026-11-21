/* MHEC browser-side descriptive validation for manually settled saved forecasts */
(() => {
 'use strict';
 function evaluate(items){const rows=items.filter(x=>['H','D','A'].includes(x.actualOutcome));if(!rows.length)return {matches:0,message:'Ainda não existem previsões com resultado real registado.'};
 const eps=1e-15,ys=rows.map(x=>['H','D','A'].indexOf(x.actualOutcome)),ps=rows.map(x=>x.probabilities);
 const logLoss=ps.reduce((s,p,i)=>s-Math.log(Math.max(eps,p[ys[i]])),0)/rows.length;
 const brier=ps.reduce((s,p,i)=>s+p.reduce((a,v,j)=>a+(v-(j===ys[i]?1:0))**2,0),0)/rows.length;
 const bins=Array.from({length:10},()=>[]);ps.forEach((p,i)=>{const j=p.indexOf(Math.max(...p));bins[Math.min(9,Math.floor(p[j]*10))].push([p[j],j===ys[i]?1:0]);});
 const ece=bins.reduce((s,b)=>s+(b.length/rows.length)*(b.length?Math.abs(b.reduce((a,x)=>a+x[0],0)/b.length-b.reduce((a,x)=>a+x[1],0)/b.length):0),0);
 return {matches:rows.length,logLoss,brier,ece,message:'Métricas descritivas apenas; não demonstram capacidade preditiva nem rentabilidade.'};
 }
 window.MHECValidation={evaluate};
})();
