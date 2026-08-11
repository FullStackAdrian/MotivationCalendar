const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET='test-secret'; process.env.NODE_ENV='test';
const bcrypt=require('bcryptjs'); const jwt=require('jsonwebtoken'); const UserService=require('../backend/services/user.service');

test('service sanitizes plain and Sequelize-like users',()=>{const s=new UserService(); assert.deepEqual(s._sanitizeUser({id:'1',password:'x',username:'a'}),{id:'1',username:'a'}); assert.deepEqual(s._sanitizeUser({toJSON:()=>({id:'2',password:'x',username:'b'})}),{id:'2',username:'b'}); assert.equal(s._sanitizeUser(null),null);});

test('service verifies correct and incorrect passwords',async()=>{const s=new UserService();const hash=await bcrypt.hash('secret',4);assert.equal(await s.verifyPassword('secret',hash),true);assert.equal(await s.verifyPassword('bad',hash),false);});

test('service creates valid JWT payload',()=>{const token=new UserService().generateToken({id:'u1',username:'alice'});const decoded=jwt.verify(token,'test-secret');assert.equal(decoded.userId,'u1');assert.equal(decoded.username,'alice');});
