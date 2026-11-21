/* MHEC Market Intelligence — browser integration, local-only */
(() => {
 'use strict';
 const validate=o=>{if(!Array.isArray(o)||o.length!==3||o.some(x=>!Number.isFinite(Number(x))||Number(x)<=1))throw new Error('Introduz três odds decimais superiores a 1.00.');return o.map(Number)};
 function assess(p,odds,{uncertaintyPct=0,minEdgePct=2,minEvPct=2}={}){
  if(!Array.isArray(p)||p.length!==3||p.some(x=>!Number.isFinite(x)||x<0||x>1)||Math.abs(p.reduce((a,b)=>a+b,0)-1)>.002)throw new Error('Probabilidades inválidas.');
  const o=validate(odds),raw=o.map(x=>1/x),sum=raw.reduce((a,b)=>a+b,0),fair=raw.map(x=>x/sum);
  const rows=['1','X','2'].map((outcome,i)=>{const ev=p[i]*o[i]-1,edge=p[i]-fair[i],conservativeEv=Math.max(0,p[i]-uncertaintyPct/100)*o[i]-1;return {outcome,odd:o[i],modelProbability:p[i],marketFairProbability:fair[i],edgePct:edge*100,evPct:ev*100,conservativeEvPct:conservativeEv*100,status:edge*100>=minEdgePct&&ev*100>=minEvPct&&conservativeEv>0?'REVIEW':'NO_BET'};});
  return {marginPct:(sum-1)*100,rows,decision:rows.some(x=>x.status==='REVIEW')?'REVIEW_REQUIRED':'NO_BET'};
 }
 window.MHECMarket={assess,validateOdds:validate};
})();
