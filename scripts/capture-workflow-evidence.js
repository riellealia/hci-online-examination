const {spawn}=require('child_process');
const fs=require('fs');
const http=require('http');
const path=require('path');

const root=path.resolve(__dirname,'..'),outputDir=path.join(root,'docs','evidence');
const chromeCandidates=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'];
const chrome=chromeCandidates.find(fs.existsSync);
if(!chrome)throw new Error('Chrome or Edge is required to capture workflow evidence.');
fs.mkdirSync(outputDir,{recursive:true});

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function json(url,options){const response=await fetch(url,options);if(!response.ok)throw new Error(`${response.status} ${url}`);return response.json();}
async function connect(wsUrl){
  const socket=new WebSocket(wsUrl),pending=new Map();let nextId=1;
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const item=pending.get(message.id);if(!item)return;pending.delete(message.id);message.error?item.reject(new Error(message.error.message)):item.resolve(message.result)};
  return{send(method,params={}){return new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})},close(){socket.close()}};
}
async function waitForDebugger(port){for(let attempt=0;attempt<40;attempt++){try{return await json(`http://127.0.0.1:${port}/json`)}catch{await delay(250)}}throw new Error('Browser debugging endpoint did not start.');}
async function capture({name,page,username,role,show,width=1440,height=1000,fullPage=true}){
  const port=9300+Math.floor(Math.random()*400),profile=path.join(root,'.data',`evidence-browser-${port}`);
  const browser=spawn(chrome,['--headless=new','--hide-scrollbars',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,`--window-size=${width},${height}`,'about:blank'],{stdio:'ignore'});
  try{
    const targets=await waitForDebugger(port),target=targets.find(item=>item.type==='page'),cdp=await connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/login.html'});await delay(500);
    await cdp.send('Runtime.evaluate',{expression:`localStorage.setItem('currentUser',JSON.stringify({username:'admin',role:'admin'}));`});
    await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/html/admin.html'});await delay(1800);
    await cdp.send('Runtime.evaluate',{expression:`localStorage.setItem('currentUser',JSON.stringify({username:${JSON.stringify(username)},role:${JSON.stringify(role)}}));`});
    await cdp.send('Page.navigate',{url:`http://127.0.0.1:4173/html/${page}`});await delay(1600);
    if(show){await cdp.send('Runtime.evaluate',{expression:show});await delay(500)}
    const overflow=await cdp.send('Runtime.evaluate',{expression:'({viewport:window.innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth})',returnByValue:true});
    if(overflow.result.value.documentWidth>overflow.result.value.viewport||overflow.result.value.bodyWidth>overflow.result.value.viewport)throw new Error(`${name} has horizontal page overflow: ${JSON.stringify(overflow.result.value)}`);
    const metrics=await cdp.send('Page.getLayoutMetrics'),shotWidth=fullPage?Math.ceil(metrics.cssContentSize.width):width,shotHeight=fullPage?Math.min(2400,Math.ceil(metrics.cssContentSize.height)):height;
    const image=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:shotWidth,height:shotHeight,scale:1}});
    fs.writeFileSync(path.join(outputDir,`${name}.png`),Buffer.from(image.data,'base64'));cdp.close();
  }finally{browser.kill();await delay(250);fs.rmSync(profile,{recursive:true,force:true})}
}

(async()=>{
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.csv':'text/csv'};
  const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname),file=path.resolve(root,`.${pathname}`),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)){response.writeHead(403);return response.end()}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end()}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});response.end(data)})});
  await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
  try{
    await capture({name:'dean-overload-approvals',page:'dean.html',username:'dean.demo',role:'dean',show:"deanNav.show('approvalsSection')"});
    await capture({name:'dean-statistics',page:'dean.html',username:'dean.demo',role:'dean',show:"deanNav.show('statisticsSection')"});
    await capture({name:'dean-activity-logs',page:'dean.html',username:'dean.demo',role:'dean',show:"deanNav.show('logsSection')"});
    await capture({name:'coordinator-activity-logs',page:'coordinator.html',username:'coordinator.demo',role:'coordinator',show:"coordinatorNav.show('logsSection')"});
    await capture({name:'admin-audit-log',page:'admin.html',username:'admin',role:'admin',show:"adminNav.show('auditSection')"});
    await capture({name:'dean-overload-approvals-mobile',page:'dean.html',username:'dean.demo',role:'dean',show:"deanNav.show('approvalsSection')",width:390,height:844,fullPage:false});
    await capture({name:'coordinator-activity-logs-mobile',page:'coordinator.html',username:'coordinator.demo',role:'coordinator',show:"coordinatorNav.show('logsSection')",width:390,height:844,fullPage:false});
  }finally{server.close()}
  console.log(`Captured workflow evidence in ${outputDir}`);
})().catch(error=>{console.error(error);process.exitCode=1});
