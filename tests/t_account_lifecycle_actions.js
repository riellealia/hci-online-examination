const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
console.log('=== ACCOUNT LIFECYCLE ACTIONS. Edit status from Student Management and Account Lifecycle ===');
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
(async()=>{
  const seed=SEED();
  const r=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});

  // Student Management: row menu exposes Edit status instead of a one-off Deactivate button.
  const row=[...r.d.querySelectorAll('#studentTable tr')].find(tr=>/Cruz, Juan/.test(tr.textContent));
  row.querySelector('.section-action-trigger').click();
  const editStatusButton=[...row.querySelectorAll('.section-action-menu button')].find(btn=>/Edit status/.test(btn.textContent));
  ok(!!editStatusButton,'Student Management row menu offers Edit status');
  editStatusButton.click();

  const dialog=()=>r.d.querySelector('.account-status-box');
  ok(!!dialog(),'Edit status opens one prompt, not a chain of prompts');
  ok(dialog().querySelector('.confirm-ok').className.split(' ').every(cls=>!/choice|is-danger/.test(cls)),'the Save button carries no invented colored-button classes');
  const checkbox=()=>dialog().querySelector('#statusDeactivate');
  const select=()=>dialog().querySelector('#statusDropdown');
  ok(!!checkbox()&&!checkbox().checked,'an Active account shows an unchecked Deactivate checkbox');
  ok(!!select(),'Archive/graduate/transfer are offered together in one dropdown');
  ok([...select().options].map(o=>o.textContent).join(',')==='— None —,Archive account,Mark as graduated,Mark as transferred','the dropdown lists the remaining status changes');
  ok(dialog().querySelector('#statusReasonField').hidden,'no reason box is shown until a reason-requiring change is picked');

  select().value='archive'; select().dispatchEvent(new r.w.Event('change',{bubbles:true}));
  ok(!checkbox().checked,'choosing a dropdown option clears the checkbox (mutually exclusive)');
  ok(!dialog().querySelector('#statusReasonField').hidden,'archiving reveals the reason box in the same prompt');

  dialog().querySelector('#statusSave').click();
  ok(!!dialog()&&!!r.d.querySelector('.has-error'),'saving without a reason blocks with an inline field error, not another dialog');

  dialog().querySelector('#statusReason').value='Requested a leave of absence.';
  dialog().querySelector('#statusSave').click();
  await flush();

  let users=r.read('users'), account=users.find(user=>user.username==='S1');
  ok(account.lifecycleStatus==='Archived','account status is updated after Save');
  ok(account.lifecycleHistory?.length===1&&account.lifecycleHistory[0].reason==='Requested a leave of absence.','the reason is retained in lifecycle history');
  const audit=r.read('applicationAuditLog')||[];
  ok(audit.some(entry=>entry.entityId==='S1'&&entry.category==='account/lifecycle'&&entry.action==='archive'),'the change is recorded as an account/lifecycle audit entry');
  ok(![...r.d.querySelectorAll('#studentTable tr')].some(tr=>/Cruz, Juan/.test(tr.textContent)),'archived students are hidden from the normal Student Management list');

  // Account Lifecycle workspace: the same account now shows Archived, with an Actions menu of its own.
  r.w.eval("AdminWorkspaces.accounts()");
  const lifecycleRoot=r.d.getElementById('accountLifecycleRoot');
  const lifecycleRow=lifecycleRoot.querySelector('[data-account-id="S1"]');
  ok(/Archived/.test(lifecycleRow?.textContent||''),'Account Lifecycle reflects the status change made from Student Management');
  lifecycleRow.querySelector('.section-action-trigger').click();
  const restoreEntry=[...lifecycleRow.querySelectorAll('.section-action-menu button')].find(btn=>/Edit status/.test(btn.textContent));
  ok(!!restoreEntry,'Account Lifecycle rows also expose Edit status');
  restoreEntry.click();

  ok(!dialog().querySelector('#statusDeactivate'),'an Archived account has no Deactivate checkbox (it does not apply from this state)');
  ok([...dialog().querySelector('#statusDropdown').options].map(o=>o.textContent).join(',')==='— None —,Restore account','Restore is the only status change offered for an Archived account');
  dialog().querySelector('#statusDropdown').value='restore';
  dialog().querySelector('#statusDropdown').dispatchEvent(new r.w.Event('change',{bubbles:true}));
  ok(dialog().querySelector('#statusReasonField').hidden,'restoring does not require a reason');
  dialog().querySelector('#statusSave').click();
  await flush();

  users=r.read('users'); account=users.find(user=>user.username==='S1');
  ok(account.lifecycleStatus==='Active','restoring returns the account to Active');
  let managementRow=[...r.d.querySelectorAll('#studentTable tr')].find(tr=>/Cruz, Juan/.test(tr.textContent));
  ok(!!managementRow,'restored students reappear in Student Management');

  // Deactivate via the checkbox alone, with no dropdown selection.
  row.querySelector('.section-action-trigger').click();
  [...row.querySelectorAll('.section-action-menu button')].find(btn=>/Edit status/.test(btn.textContent)).click();
  ok(!checkbox().checked,'the checkbox reopens unchecked for the now-Active account');
  checkbox().checked=true; checkbox().dispatchEvent(new r.w.Event('change',{bubbles:true}));
  ok(select().value==='','checking Deactivate clears any dropdown selection');
  dialog().querySelector('#statusSave').click();
  await flush();

  users=r.read('users'); account=users.find(user=>user.username==='S1');
  ok(account.lifecycleStatus==='Deactivated','the checkbox alone can deactivate the account without touching the dropdown');
  managementRow=[...r.d.querySelectorAll('#studentTable tr')].find(tr=>/Cruz, Juan/.test(tr.textContent));
  ok(!!managementRow,'deactivated students still appear in Student Management (only Archived/Graduated/Transferred are hidden)');
  ok(!managementRow.querySelector('.section-action-menu button.danger'),'Student Management never exposes a permanent-delete action for students');

  r.w.close(); process.exit(0);
})();
