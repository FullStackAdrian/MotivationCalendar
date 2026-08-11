const test=require('node:test');const assert=require('node:assert/strict');process.env.JWT_SECRET='test-secret';process.env.NODE_ENV='test';const {User,Progress,getUserByField}=require('../backend/models/database');

test('database models expose required schema and constraints',()=>{assert.equal(User.getTableName(),'users');assert.equal(Progress.getTableName(),'progress');assert.equal(User.rawAttributes.username.allowNull,false);assert.equal(User.rawAttributes.username.type.options.length,50);assert.equal(User.rawAttributes.email.type.options.length,255);assert.equal(Progress.rawAttributes.dayKey.type.options.length,10);assert.deepEqual(Progress.rawAttributes.status.validate.isIn[0],['completed','partial','failed']);});

test('database model validators reject invalid user and progress data without PostgreSQL',async()=>{const user=User.build({username:'ab',email:'invalid',password:'x'});await assert.rejects(user.validate());const progress=Progress.build({userId:'u',dayKey:'2026-01-01',status:'unknown'});await assert.rejects(progress.validate());});

test('database rejects unknown user lookup fields',async()=>{await assert.rejects(getUserByField('password','x'),/Campo inválido/);});
