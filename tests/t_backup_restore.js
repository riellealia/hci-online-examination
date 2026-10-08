'use strict';
const assert = require('assert');
const { validateBackup } = require('../server/backup-restore');

const period = { id:'AY-2026-2027-FIRST-SEMESTER', status:'active' };
const valid = {
  format:'neu-online-examination-backup', version:1, createdAt:'2026-10-08T00:00:00.000Z',
  records:{
    academicPeriods:[period],
    systemSettings:{currentAcademicPeriodId:period.id},
    studentEnrollments:[{id:'ENR-1',academicPeriodId:period.id,periodStatus:'active'}]
  }
};
assert.deepEqual(validateBackup(valid).academicPeriods, [period]);
assert.throws(() => validateBackup({...valid,records:{...valid.records,academicPeriods:[period,{...period}]}}), /duplicate academic period/i);
assert.throws(() => validateBackup({...valid,records:{...valid.records,systemSettings:{currentAcademicPeriodId:'missing'}}}), /does not match/i);
assert.throws(() => validateBackup({...valid,records:{...valid.records,studentEnrollments:[{id:'ENR-1',academicPeriodId:'missing'}]}}), /not present/i);
assert.throws(() => validateBackup({...valid,records:{...valid.records,unknownCollection:[]}}), /unsupported collection/i);
console.log('✅ protected backup validation accepts consistent period snapshots and rejects unsafe restores');
