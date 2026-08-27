/* Reusable client-side search, sort, grouping, and pagination for Admin tables. */
const AdminTableTools = (() => {
  const states = new Map();
  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  function state(key){ if(!states.has(key)) states.set(key,{query:'',sort:-1,group:'-1',dir:1}); return states.get(key); }
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
  function mount(key,table,host){
    if(!table||!host)return; const cols=columns(table); let tools=host.querySelector(`[data-table-tools="${key}"]`);
    if(!tools){
      tools=document.createElement('div'); tools.className='table-tools'; tools.dataset.tableTools=key;
      tools.innerHTML=`<div class="table-search-box" hidden><input type="search" aria-label="Search table" placeholder="Search…"></div><button class="tool-icon table-search-toggle" aria-label="Search" title="Search">${icon('<path d="m20 19-4.3-4.3a7 7 0 1 0-1.4 1.4L18.6 20 20 19ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"/>')}</button><button class="tool-icon table-sort-toggle" aria-label="Choose sort field" title="Sort">${icon('<path d="M7 4h2v13l3-3 1.4 1.4L8 21l-5.4-5.6L4 14l3 3V4Zm7 1h7v2h-7V5Zm0 6h5v2h-5v-2Zm0 6h3v2h-3v-2Z"/>')}</button>${selectMarkup('sort-field',cols,'Sort by')}<button class="tool-icon table-direction" aria-label="Sort ascending" title="Ascending">${icon('<path d="m7 4 4 4H8v12H6V8H3l4-4Zm8 1h6v2h-6V5Zm0 6h5v2h-5v-2Zm0 6h4v2h-4v-2Z"/>')}</button><button class="tool-icon table-group-toggle" aria-label="Choose grouping field" title="Group by">${icon('<path d="M4 4h7v7H4V4Zm2 2v3h3V6H6Zm7-2h7v7h-7V4Zm2 2v3h3V6h-3ZM4 13h7v7H4v-7Zm2 2v3h3v-3H6Zm7-2h7v7h-7v-7Zm2 2v3h3v-3h-3Z"/>')}</button>${selectMarkup('group-field',cols,'Group by')}`;
      host.appendChild(tools); const s=state(key);
      const closeOthers=except=>{tools.querySelectorAll('.table-search-box,.table-tool-select').forEach(panel=>{if(panel!==except)panel.hidden=true;});tools.querySelectorAll('.table-search-toggle,.table-sort-toggle,.table-group-toggle').forEach(button=>{if(button.dataset.controls!==except?.classList[1])button.classList.remove('active');});};
      const toggle=(button,panel)=>{const opening=panel.hidden;closeOthers(panel);panel.hidden=!opening;button.classList.toggle('active',opening);if(opening&&panel.querySelector('input'))panel.querySelector('input').focus();};
      const searchButton=tools.querySelector('.table-search-toggle');searchButton.dataset.controls='table-search-box';searchButton.onclick=()=>toggle(searchButton,tools.querySelector('.table-search-box'));
      tools.querySelector('.table-search-box input').oninput=e=>{s.query=e.target.value;apply(key,table);};
      const sortButton=tools.querySelector('.table-sort-toggle');sortButton.dataset.controls='sort-field';sortButton.onclick=()=>toggle(sortButton,tools.querySelector('.sort-field'));
      tools.querySelector('.sort-field select').onchange=e=>{s.sort=Number(e.target.value);apply(key,table);};
      const groupButton=tools.querySelector('.table-group-toggle');groupButton.dataset.controls='group-field';groupButton.onclick=()=>toggle(groupButton,tools.querySelector('.group-field'));
      tools.querySelector('.group-field select').onchange=e=>{s.group=e.target.value;apply(key,table);};
      tools.querySelector('.table-direction').onclick=e=>{s.dir*=-1;e.currentTarget.classList.toggle('descending',s.dir===-1);e.currentTarget.setAttribute('aria-label',s.dir===1?'Sort ascending':'Sort descending');e.currentTarget.title=s.dir===1?'Ascending':'Descending';apply(key,table);};
    }
    apply(key,table);
  }
  return { mount, apply };
})();
