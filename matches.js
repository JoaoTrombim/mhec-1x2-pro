/* MHEC fixture connector — Open-Matchday public CSV, client-side and local-first. */
(() => {
  'use strict';
  const SOURCE = 'open-matchday';
  const SEASON = '2627'; // 2026/27
  const BASE = 'https://cdn.jsdelivr.net/gh/oladeeayo/open-matchday@master/data';
  const LEAGUES = [
    ['ENG_1_premier-league','Premier League','ENG'],
    ['ESP_1_la-liga','La Liga','ESP'],
    ['GER_1_bundesliga','Bundesliga','GER'],
    ['ITA_1_serie-a','Serie A','ITA'],
    ['FRA_1_ligue-1','Ligue 1','FRA'],
    ['POR_1_primeira-liga','Primeira Liga','POR'],
    ['NED_1_eredivisie','Eredivisie','NED'],
    ['BEL_1_pro-league','Belgian Pro League','BEL'],
    ['SCO_1_premiership','Scottish Premiership','SCO'],
    ['TUR_1_super-lig','Süper Lig','TUR'],
    ['UEFA_1_champions-league','Champions League','UCL'],
    ['UEFA_1_europa-league','Europa League','UEL'],
    ['UEFA_1_conference-league','Conference League','UECL']
  ];
  const DB='mhec-fixtures-cache', STORE='matches', META='meta';
  let filter='upcoming', matches=[], syncing=false;
  const $=s=>document.querySelector(s);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});if(!d.objectStoreNames.contains(META))d.createObjectStore(META,{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function putAll(rows,stamp){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction([STORE,META],'readwrite');const s=tx.objectStore(STORE);s.clear();rows.forEach(x=>s.put(x));tx.objectStore(META).put({key:'lastSync',value:stamp});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  async function readCache(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction([STORE,META]);const r=tx.objectStore(STORE).getAll();const m=tx.objectStore(META).get('lastSync');tx.oncomplete=()=>resolve({rows:r.result||[],meta:m.result?.value||null});tx.onerror=()=>reject(tx.error);});}
  function parseCSV(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field='';}else if(ch==='\n'){row.push(field.replace(/\r$/,''));if(row.some(v=>v!==''))rows.push(row);row=[];field='';}else field+=ch;}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}if(!rows.length)return[];const headers=rows.shift().map(x=>x.trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??'').trim()])));}
  async function getCSV(url){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const res=await fetch(url,{cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);return parseCSV(await res.text());}finally{clearTimeout(timer);}}
  function cleanDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:null;}
  function makeRecord(row,league,kind){const date=cleanDate(row.date);const home=(row.home||'').trim(),away=(row.away||'').trim();if(!date||!home||!away)return null;const hg=row.ft_home===''?null:Number(row.ft_home),ag=row.ft_away===''?null:Number(row.ft_away);const finished=kind==='result'&&Number.isInteger(hg)&&Number.isInteger(ag);return {id:[league[0],date,home,away].join('|'),competition:league[1],competitionCode:league[2],date,time:row.time||'',home,away,homeGoals:finished?hg:null,awayGoals:finished?ag:null,status:finished?'finished':'scheduled',source:SOURCE,sourceKind:kind,season:SEASON};}
  async function sync(){if(syncing)return;syncing=true;const btn=$('#syncMatches');btn.disabled=true;btn.textContent='A SINCRONIZAR…';$('#feedSourceState').textContent='A consultar 13 competições';let all=[],ok=0,errors=[];try{const outcomes=await Promise.all(LEAGUES.map(async league=>{const folder=league[0];try{const [fixtures,results]=await Promise.all([getCSV(`${BASE}/${folder}/fixtures_${SEASON}.csv`),getCSV(`${BASE}/${folder}/results_${SEASON}.csv`)]);const rs=results.map(r=>makeRecord(r,league,'result')).filter(Boolean);const fs=fixtures.map(r=>makeRecord(r,league,'fixture')).filter(Boolean);const map=new Map();rs.forEach(x=>map.set(x.id,x));fs.forEach(x=>{if(!map.has(x.id))map.set(x.id,x)});return {league,rows:[...map.values()]};}catch(e){return {league,error:e.message};}}));outcomes.forEach(x=>{if(x.error)errors.push(`${x.league[1]}: ${x.error}`);else{ok++;all.push(...x.rows);}});
      if(!ok)throw new Error('Não foi possível obter dados de nenhuma competição. Verifica a ligação ou tenta mais tarde.');
      const unique=[...new Map(all.map(x=>[x.id,x])).values()].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));const stamp=new Date().toISOString();await putAll(unique,stamp);matches=unique;render();$('#feedUpdated').textContent=`Atualizado ${new Date(stamp).toLocaleString('pt-PT')} · ${ok}/${LEAGUES.length} competições`;
      $('#feedSourceState').textContent=errors.length?`${ok} OK · ${errors.length} com erro`:'Fonte consultada';$('#syncState').textContent=`${unique.length} jogos`;
      if(errors.length)notify(`${ok}/${LEAGUES.length} competições sincronizadas. Algumas falharam.`);else notify(`${unique.length} jogos importados.`);
    }catch(e){$('#feedSourceState').textContent='Falha na sincronização';const list=$('#matchList');list.innerHTML=`<div class="feed-error">${safe(e.message)}<br>Os dados anteriormente guardados permanecem disponíveis.</div>`;notify('Sincronização não concluída.');}
    finally{syncing=false;btn.disabled=false;btn.innerHTML='SINCRONIZAR <span>↻</span>';}}
  function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function render(){const now=todayLocal();let rows=matches.filter(m=>filter==='all'||(filter==='today'&&m.date===now)||(filter==='upcoming'&&m.status!=='finished'&&m.date>=now));$('#feedCount').textContent=`${rows.length} jogos · ${matches.length} em cache`;
    if(!rows.length){$('#matchList').innerHTML=`<div class="empty-state"><span>⚽</span><b>Não existem jogos neste filtro</b><small>Sincroniza os dados ou seleciona Todos.</small></div>`;return;}
    $('#matchList').innerHTML=rows.slice(0,250).map((m,i)=>{const date=new Date(`${m.date}T12:00:00`);const label=date.toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'short'});const time=m.time?`HORA FONTE ${safe(m.time)}`:'HORA NÃO DISPONÍVEL';const score=m.status==='finished'?`<span class="match-score">${m.homeGoals} – ${m.awayGoals}</span>`:`<span class="match-status">${time}</span>`;const action=m.status==='finished'?'':`<button class="match-analyse" data-analyse="${i}">PREPARAR ANÁLISE 1X2 ↗</button>`;return `<article class="match-card"><div class="match-card-top"><span class="match-league">${safe(m.competition)}</span><span>${label.toUpperCase()}</span></div><div class="match-teams"><span>${safe(m.home)}</span><span class="match-vs">${m.status==='finished'?'FT':'VS'}</span><span>${safe(m.away)}</span></div><div class="match-card-foot"><span>${safe(m.source.toUpperCase())} · ${m.status==='finished'?'TERMINADO':'AGENDADO'}</span>${score}</div>${action}</article>`;}).join('');
  }
  function notify(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}
  document.addEventListener('DOMContentLoaded',async()=>{if(!$('#syncMatches'))return;$('#syncMatches').addEventListener('click',sync);document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render();}));$('#matchList').addEventListener('click',e=>{const b=e.target.closest('[data-analyse]');if(!b)return;const visible=matches.filter(m=>filter==='all'||(filter==='today'&&m.date===todayLocal())||(filter==='upcoming'&&m.status!=='finished'&&m.date>=todayLocal()));const m=visible[Number(b.dataset.analyse)];if(!m)return;$('#competition').value=m.competition;$('#homeTeam').value=m.home;$('#awayTeam').value=m.away;$('#analysisDate').value=m.date;document.querySelector('[data-page="analysis"]').click();});try{const cached=await readCache();matches=cached.rows;$('#syncState').textContent=matches.length?`${matches.length} jogos`:'N/D';render();if(cached.meta)$('#feedUpdated').textContent=`Cache local · última sincronização ${new Date(cached.meta).toLocaleString('pt-PT')}`;$('#feedSourceState').textContent=navigator.onLine?'Pronto para sincronizar':'Offline · cache local';if(navigator.onLine&&(!cached.meta||Date.now()-new Date(cached.meta).getTime()>12*60*60*1000))sync();}catch(e){$('#feedSourceState').textContent='Armazenamento local indisponível';}window.addEventListener('online',()=>$('#feedSourceState').textContent='Online · pronto a sincronizar');window.addEventListener('offline',()=>$('#feedSourceState').textContent='Offline · a usar cache');});
})();
