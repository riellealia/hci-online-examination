const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const ok=(condition,message)=>{if(!condition)throw new Error(message);console.log(`  ✅ ${message}`)};
console.log('=== ROLE DASHBOARD RESTORATION. Preserve the original working views ===');

const pages=['dean','coordinator','faculty','student'].map(name=>({name,html:fs.readFileSync(path.join(root,'html',`${name}.html`),'utf8')}));
pages.forEach(({name,html})=>{
  ok(!html.includes('dashboard-charts.css')&&!html.includes('dashboard-charts.js'),`${name} no longer loads the replacement chart dashboard`);
  ok(!html.includes(`${name}DashboardCharts`),`${name} no longer inserts a chart panel before the working content`);
});

const faculty=pages.find(page=>page.name==='faculty').html;
ok(/<div class="subjects-grid" id="subjectList">/.test(faculty),'Professor dashboard keeps the original Subject cells');
ok(faculty.indexOf('id="subjectList"')<faculty.indexOf('id="exams-tab"'),'Professor Subjects remain the first working dashboard view');

const student=pages.find(page=>page.name==='student').html;
ok(/class="stats-grid"/.test(student),'Student dashboard keeps the original statistics cells');
ok(/id="studentSubjectCards"/.test(student)&&/id="resultSubjectCards"/.test(student),'Student Subjects and Results cells remain available');

const dean=pages.find(page=>page.name==='dean').html,coordinator=pages.find(page=>page.name==='coordinator').html;
ok(/class="role-action-grid"/.test(dean)&&/class="role-action-grid"/.test(coordinator),'Dean and Coordinator keep their original action-card dashboards');
ok(!fs.existsSync(path.join(root,'css','dashboard-charts.css'))&&!fs.existsSync(path.join(root,'js','dashboard-charts.js')),'Unused replacement dashboard assets were removed');
