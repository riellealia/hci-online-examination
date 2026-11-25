/* Reusable client-side search, sort, grouping, and pagination for Admin tables. */
const AdminTableTools = (() => {
  const states = new Map();
  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  /* Search/sort/group choices survive re-renders and page reloads (per page and
     table, for this browser tab) and only clear when the user changes them. */
  const storeKey = key => `tableTools:${location.pathname}:${key}`;
  function state(key){ if(!states.has(key)){ let saved=null; try{ saved=JSON.parse(sessionStorage.getItem(storeKey(key))||'null'); }catch(_){} states.set(key,{query:'',sort:-1,group:'-1',dir:1,...(saved&&typeof saved==='object'?saved:{})}); } return states.get(key); }
  function save(key){ try{ const s=states.get(key); sessionStorage.setItem(storeKey(key),JSON.stringify({query:s.query,sort:s.sort,group:s.group,dir:s.dir})); }catch(_){} }
  /* Put the saved choices back into freshly rendered controls. */
  function restore(key,tools){
    const s=state(key),box=tools.querySelector('.table-search-box'),input=box?.querySelector('input'),searchButton=tools.querySelector('.table-search-toggle');
    if(input&&input.value!==s.query) input.value=s.query;
    if(s.query&&box){ box.hidden=false; searchButton?.classList.add('active'); }
    searchButton?.classList.toggle('has-query',!!s.query);
    const sortSelect=tools.querySelector('.sort-field select'); if(sortSelect&&[...sortSelect.options].some(o=>o.value===String(s.sort))) sortSelect.value=String(s.sort); else s.sort=-1;
    const groupSelect=tools.querySelector('.group-field select'); if(groupSelect&&[...groupSelect.options].some(o=>o.value===String(s.group))) groupSelect.value=String(s.group); else s.group='-1';
    const direction=tools.querySelector('.table-direction'); if(direction){ direction.classList.toggle('descending',s.dir===-1); direction.setAttribute('aria-label',s.dir===1?'Sort ascending':'Sort descending'); direction.title=s.dir===1?'Ascending':'Descending'; }
  }
  function columns(table){ return [...table.querySelectorAll('tr:first-child th')].map((th,index)=>({index,label:th.textContent.trim()})).filter(item=>item.label&&item.label!=='Actions'); }
  function cell(row,index){ return (row.cells[index]?.textContent||'').trim(); }
  function apply(key,table){
    const s=state(key); table.querySelectorAll('.table-group-row').forEach(row=>row.remove());
    const rows=[...table.querySelectorAll('tr')].slice(1); rows.forEach(row=>row.hidden=false);
    let matching=rows.filter(row=>!s.query||row.textContent.toLowerCase().includes(s.query.toLowerCase()));
    const groupIndex=s.group.startsWith('alpha:')?Number(s.group.split(':')[1]):Number(s.group);
    const orderIndex=groupIndex>=0?groupIndex:s.sort;
    if(orderIndex>=0) matching.sort((a,b)=>cell(a,orderIndex).localeCompare(cell(b,orderIndex),undefined,{numeric:true,sensitivity:'base'})*s.dir);
    rows.forEach(row=>table.tBodies[0]?.appendChild(row)||table.appendChild(row));
    matching.forEach(row=>table.tBodies[0]?.appendChild(row)||table.appendChild(row));
    const visible=new Set(matching); rows.forEach(row=>row.hidden=!visible.has(row));
    if(groupIndex>=0){ let previous=null; const counts=new Map(); matching.forEach(row=>{const raw=cell(row,groupIndex)||'Unspecified';const value=s.group.startsWith('alpha:')?raw.charAt(0).toUpperCase():raw;counts.set(value,(counts.get(value)||0)+1);}); matching.forEach(row=>{ const raw=cell(row,groupIndex)||'Unspecified', value=s.group.startsWith('alpha:')?raw.charAt(0).toUpperCase():raw; if(value!==previous){ const group=document.createElement('tr'); group.className='table-group-row'; group.innerHTML=`<td colspan="${row.cells.length}"><span>${value}</span><strong>${counts.get(value)} record${counts.get(value)===1?'':'s'}</strong></td>`; row.before(group); previous=value; } }); }
  }
  function selectMarkup(kind,cols,label){ const alpha=kind==='group-field'?(cols.find(col=>/last|surname|student name/i.test(col.label))||null):null; return `<label class="table-tool-select ${kind}" hidden><span>${label}</span><select><option value="-1">None</option>${cols.map(col=>`<option value="${col.index}">${col.label}</option>`).join('')}${alpha?`<option value="alpha:${alpha.index}">Alphabetically (${/student name/i.test(alpha.label)?'name':'surname'} initial)</option>`:''}</select></label>`; }
  /* ---------- Export (CSV / Word) of the rows currently shown ---------- */
  const EXPORT_SKIP='.ck-mini,.roster-score-bar,[class*="avatar"],.sr-only,button,svg';
  function cellText(cell){const clone=cell.cloneNode(true);clone.querySelectorAll(EXPORT_SKIP).forEach(el=>el.remove());return clone.textContent.replace(/\s+/g,' ').trim();}
  function tableData(table){
    const heads=[...table.querySelectorAll('thead th, tr:first-child th')].map(th=>th.textContent.trim());
    const keep=heads.map((h,i)=>h&&!/^(actions?|subject management|expand)$/i.test(h)?i:-1).filter(i=>i>=0);
    const rows=[...(table.tBodies[0]||table).rows].filter(r=>!r.hidden&&!r.classList.contains('table-group-row')&&!r.classList.contains('cm-out')&&(!table.isConnected||r.offsetParent!==null)&&r.cells.length>1&&!r.querySelector('th'));
    return {heads:keep.map(i=>heads[i]),rows:rows.map(r=>keep.map(i=>r.cells[i]?cellText(r.cells[i]):''))};
  }
  function download(name,type,content){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportTable(table,name,format){
    const {heads,rows}=tableData(table);if(!rows.length)return typeof notify==='function'&&notify('There are no rows to export.','info');
    const stamp=new Date().toISOString().slice(0,10),base=`${name}-${stamp}`;
    if(format==='csv'){const q=v=>`"${String(v).replace(/"/g,'""')}"`;download(`${base}.csv`,'text/csv;charset=utf-8',['﻿'+heads.map(q).join(','),...rows.map(r=>r.map(q).join(','))].join('\r\n'));}
    else{const esc=v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));download(`${base}.doc`,'application/msword',`<html><head><meta charset="utf-8"><title>${esc(name)}</title></head><body><h2>${esc(name.replace(/-/g,' '))}</h2><p>Exported ${esc(new Date().toLocaleString())} · ${rows.length} rows</p><table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:11pt"><tr>${heads.map(h=>`<th style="background:#eee">${esc(h)}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`);}
    if(typeof notify==='function')notify(`Exported ${rows.length} row${rows.length===1?'':'s'} as ${format==='csv'?'CSV':'Word'}.`,'success');
  }
  const ICONS={add:'<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/>',import:'<path d="M11 15V6.8L8.4 9.4 7 8l5-5 5 5-1.4 1.4L13 6.8V15h-2Zm-6 4v-4h2v2h10v-2h2v4H5Z"/>',export:'<path d="M11 3h2v8.2l2.6-2.6L17 10l-5 5-5-5 1.4-1.4 2.6 2.6V3ZM5 19v-4h2v2h10v-2h2v4H5Z"/>'};
  /* options: { add:{label,onClick}, importer:{label,accept,onFile(input)}, exportName, noExport } */
  function extras(key,table,tools,options){
    if(options.add&&!tools.querySelector('.table-add-action')){const b=document.createElement('button');b.type='button';b.className='tool-icon table-add-action';b.title=b.ariaLabel=options.add.label||'Add';b.setAttribute('aria-label',options.add.label||'Add');b.innerHTML=icon(ICONS.add);b.onclick=()=>options.add.onClick();tools.prepend(b);}
    if(options.importer&&!tools.querySelector('.table-import-action')){const l=document.createElement('label');l.className='tool-icon table-import-action';l.title=options.importer.label||'Import CSV';l.setAttribute('aria-label',options.importer.label||'Import CSV');l.innerHTML=`${icon(ICONS.import)}<input type="file" accept="${options.importer.accept||'.csv,text/csv'}" hidden>`;l.querySelector('input').onchange=e=>{options.importer.onFile(e.target);e.target.value='';};{const a=tools.querySelector('.table-add-action');a?a.after(l):tools.prepend(l);}}
    if(!options.noExport&&!tools.querySelector('.table-export-action')){
      const wrap=document.createElement('div');wrap.className='table-export-wrap';
      wrap.innerHTML=`<button type="button" class="tool-icon table-export-action" aria-label="Export table" title="Export" aria-haspopup="menu" aria-expanded="false">${icon(ICONS.export)}</button><div class="table-export-menu" role="menu" hidden><button type="button" role="menuitem" data-format="csv">Export as CSV <small>.csv</small></button><button type="button" role="menuitem" data-format="doc">Export as Word <small>.doc</small></button></div>`;
      tools.appendChild(wrap);const btn=wrap.querySelector('.table-export-action'),menu=wrap.querySelector('.table-export-menu');
      btn.onclick=e=>{e.stopPropagation();const open=menu.hidden;tools.querySelectorAll('.table-search-box,.table-tool-select').forEach(p=>p.hidden=true);menu.hidden=!open;btn.setAttribute('aria-expanded',String(open));btn.classList.toggle('active',open);};
      menu.onclick=e=>{const item=e.target.closest('[data-format]');if(!item)return;menu.hidden=true;btn.classList.remove('active');btn.setAttribute('aria-expanded','false');exportTable(table,options.exportName||key,item.dataset.format);};
      document.addEventListener('click',e=>{if(!wrap.contains(e.target)){menu.hidden=true;btn.classList.remove('active');btn.setAttribute('aria-expanded','false');}});
    }
  }
  function mount(key,table,host,options={}){
    if(!table||!host)return; const cols=columns(table); let tools=host.querySelector(`[data-table-tools="${key}"]`);
    
    if(!tools){
      tools=document.createElement('div'); tools.className='table-tools'; tools.dataset.tableTools=key;
      tools.innerHTML=`<div class="table-search-box" hidden><input type="search" aria-label="Search table" placeholder="Search…"></div><button class="tool-icon table-search-toggle" aria-label="Search" title="Search">${icon('<path d="m20 19-4.3-4.3a7 7 0 1 0-1.4 1.4L18.6 20 20 19ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"/>')}</button><button class="tool-icon table-sort-toggle" aria-label="Choose sort field" title="Sort">${icon('<path d="M7 4h2v13l3-3 1.4 1.4L8 21l-5.4-5.6L4 14l3 3V4Zm7 1h7v2h-7V5Zm0 6h5v2h-5v-2Zm0 6h3v2h-3v-2Z"/>')}</button>${selectMarkup('sort-field',cols,'Sort by')}<button class="tool-icon table-direction" aria-label="Sort ascending" title="Ascending">${icon('<path d="m7 4 4 4H8v12H6V8H3l4-4Zm8 1h6v2h-6V5Zm0 6h5v2h-5v-2Zm0 6h4v2h-4v-2Z"/>')}</button><button class="tool-icon table-group-toggle" aria-label="Choose grouping field" title="Group by">${icon('<path d="M4 4h7v7H4V4Zm2 2v3h3V6H6Zm7-2h7v7h-7V4Zm2 2v3h3V6h-3ZM4 13h7v7H4v-7Zm2 2v3h3v-3H6Zm7-2h7v7h-7v-7Zm2 2v3h3v-3h-3Z"/>')}</button>${selectMarkup('group-field',cols,'Group by')}`;
      host.appendChild(tools); const s=state(key);
      const closeOthers=except=>{tools.querySelectorAll('.table-search-box,.table-tool-select').forEach(panel=>{if(panel!==except)panel.hidden=true;});tools.querySelectorAll('.table-search-toggle,.table-sort-toggle,.table-group-toggle').forEach(button=>{if(button.dataset.controls!==except?.classList[1])button.classList.remove('active');});};
      const toggle=(button,panel)=>{const opening=panel.hidden,scrollX=window.scrollX||0,scrollY=window.scrollY||0;closeOthers(panel);panel.hidden=!opening;button.classList.toggle('active',opening);if(opening&&panel.querySelector('input')){const input=panel.querySelector('input');try{input.focus({preventScroll:true});}catch(_){input.focus();window.scrollTo?.(scrollX,scrollY);}}};
      const searchButton=tools.querySelector('.table-search-toggle');searchButton.dataset.controls='table-search-box';searchButton.onclick=()=>toggle(searchButton,tools.querySelector('.table-search-box'));
      tools.querySelector('.table-search-box input').oninput=e=>{s.query=e.target.value;save(key);searchButton.classList.toggle('has-query',!!s.query);apply(key,table);};
      const sortButton=tools.querySelector('.table-sort-toggle');sortButton.dataset.controls='sort-field';sortButton.onclick=()=>toggle(sortButton,tools.querySelector('.sort-field'));
      tools.querySelector('.sort-field select').onchange=e=>{s.sort=Number(e.target.value);save(key);apply(key,table);};
      const groupButton=tools.querySelector('.table-group-toggle');groupButton.dataset.controls='group-field';groupButton.onclick=()=>toggle(groupButton,tools.querySelector('.group-field'));
      tools.querySelector('.group-field select').onchange=e=>{s.group=e.target.value;save(key);apply(key,table);};
      tools.querySelector('.table-direction').onclick=e=>{s.dir*=-1;save(key);e.currentTarget.classList.toggle('descending',s.dir===-1);e.currentTarget.setAttribute('aria-label',s.dir===1?'Sort ascending':'Sort descending');e.currentTarget.title=s.dir===1?'Ascending':'Descending';apply(key,table);};
    }
    extras(key,table,tools,options);
    // Import sits right before Export, so file in / file out are side by side.
    {const imp=tools.querySelector('.table-import-action'),exp=tools.querySelector('.table-export-wrap');if(imp&&exp&&imp.nextElementSibling!==exp)exp.before(imp);}
    if(!tools.dataset.floating){tools.dataset.floating='1';tools.addEventListener('click',()=>requestAnimationFrame(()=>placePanels(tools)),true);}
    restore(key,tools);
    apply(key,table);
  }
  /* Toolbar pop-outs (search box, sort / group lists, export menu) float above the page so a
     card or scrolling table can never clip them; they open upward when there is no room below. */
  function placePanels(tools){
    if(!tools.isConnected)return;
    const anchor=tools.getBoundingClientRect();
    // A page can keep its search box inline in the toolbar (e.g. My Students) — that one does not float.
    const inlineSearch=!!tools.closest('#students-tab');
    tools.querySelectorAll('.table-export-menu,.table-search-box,.table-tool-select').forEach(panel=>{
      if(inlineSearch&&panel.classList.contains('table-search-box')){['position','top','right','left','bottom','z-index'].forEach(p=>panel.style.removeProperty(p));return;}
      if(panel.hidden){['position','top','right','left','bottom','z-index'].forEach(p=>panel.style.removeProperty(p));return;}
      const set=(p,v)=>panel.style.setProperty(p,v,'important');
      set('position','fixed');set('left','auto');set('bottom','auto');set('z-index','2000');
      const h=panel.offsetHeight,below=anchor.bottom+6,above=anchor.top-6-h;
      set('top',`${below+h>innerHeight-8&&above>8?above:Math.min(below,Math.max(8,innerHeight-8-h))}px`);
      set('right',`${Math.max(8,innerWidth-anchor.right)}px`);
    });
  }
  // Keep open pop-outs attached to their toolbar while the page or a container scrolls.
  // Applies to every toolbar that uses these pop-outs (shared table tools, Coordinator/Dean workspace
  // toolbars, the curriculum toolbar), whichever code built it.
  const BARS='.table-tools,.cw-tools,.curriculum-top-tools';
  if(typeof window!=='undefined'){
    document.addEventListener('click',e=>{const bar=e.target.closest?.(BARS);if(bar)requestAnimationFrame(()=>placePanels(bar));},true);
    const follow=()=>document.querySelectorAll(BARS).forEach(t=>{if(t.querySelector('.table-export-menu:not([hidden]),.table-search-box:not([hidden]),.table-tool-select:not([hidden])'))placePanels(t);});
    window.addEventListener('scroll',follow,true);window.addEventListener('resize',follow);
  }
  return { mount, apply, exportTable };
})();
