'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const local=new Map([
  ['currentUser',JSON.stringify({username:'faculty.demo',role:'faculty'})],
  ['leftoverFromAnotherRole',JSON.stringify([{id:'OLD'}])]
]),session=new Map([['serverSessionToken','faculty-token']]);
let migrations=0;
class XHR {
  open(method,url){this.method=method;this.url=url;}
  setRequestHeader(){}
  send(){
    if(this.method==='POST'){migrations++;this.status=403;this.responseText=JSON.stringify({error:'Administrator only'});return;}
    this.status=200;
    if(this.url.includes('/api/academic-periods/current/records/'))this.responseText=JSON.stringify({records:[{subjectCode:'SUB1',facultyIds:['faculty.demo']}]});
    else this.responseText=JSON.stringify({records:{users:[{username:'faculty.demo',role:'faculty'}],subjects:[{code:'SUB1'}],subjectAssignments:[]},collections:['users','subjects','subjectAssignments'],session:{username:'faculty.demo',role:'faculty'}});
  }
}
const context=vm.createContext({console,performance:{now:()=>1},location:{protocol:'http:',port:'3000',pathname:'/faculty.html'},XMLHttpRequest:XHR,setTimeout:()=>{},window:{location:{replace:()=>{}}},localStorage:{get length(){return local.size;},key:i=>[...local.keys()][i],getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},sessionStorage:{getItem:k=>session.get(k)??null,removeItem:k=>session.delete(k)}});
const source=fs.readFileSync(path.join(__dirname,'..','js','storage.js'),'utf8');
const db=vm.runInContext(source+'\nDB',context);
assert.equal(migrations,0,'non-Admin hydration must not attempt an Administrator migration');
assert.equal(db.read('subjectAssignments',[]).length,1,'current-period records must survive a non-Admin role change');
console.log('✅ non-Admin SQLite hydration ignores leftover role cache without losing active data');
