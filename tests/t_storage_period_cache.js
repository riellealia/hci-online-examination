'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const local = new Map([['currentUser', JSON.stringify({ username:'admin', role:'admin' })]]);
const session = new Map([['serverSessionToken', 'demo-token']]);
const sent = [];
class XMLHttpRequestMock {
  open(method, url) { this.method=method; this.url=url; }
  setRequestHeader() {}
  send(body) {
    this.status = 200;
    if (this.method === 'GET') {
      this.responseText = JSON.stringify({ records:{studentEnrollments:[]}, collections:['studentEnrollments'], session:{username:'admin',role:'admin'} });
      return;
    }
    const value = JSON.parse(body).value;
    sent.push(value);
    this.responseText = JSON.stringify({ value:value.map(item => ({...item,academicPeriodId:'AY-2026-2027-FIRST-SEMESTER',periodStatus:'active'})) });
  }
}
const context = vm.createContext({
  console, performance:{now:()=>1},
  location:{protocol:'http:',port:'3000',pathname:'/admin.html'},
  XMLHttpRequest:XMLHttpRequestMock,
  localStorage:{get length(){return local.size;},key:index=>[...local.keys()][index],getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,String(value)),removeItem:key=>local.delete(key)},
  sessionStorage:{getItem:key=>session.get(key)??null,removeItem:key=>session.delete(key)}
});
const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');
const db = vm.runInContext(source + '\nDB', context);
assert.equal(db.write('studentEnrollments', [{id:'ENR-1',studentId:'S1'}]), true);
assert.equal(db.read('studentEnrollments', [])[0].academicPeriodId, 'AY-2026-2027-FIRST-SEMESTER', 'browser cache must use the server-normalized record');
assert.equal(db.write('studentEnrollments', db.read('studentEnrollments', [])), true);
assert.equal(sent[1][0].academicPeriodId, 'AY-2026-2027-FIRST-SEMESTER', 'the next save must retain the period tag');
console.log('✅ SQLite browser cache retains server-assigned academic-period tags');
