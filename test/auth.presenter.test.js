const test = require('node:test');
const assert = require('node:assert/strict');
const AuthPresenter = require('../backend/presenters/auth.presenter');

test('presenter formats both authentication responses',()=>{
 const p=new AuthPresenter(); const user={id:'u1',username:'alice',email:'a@b.com',password:'secret',createdAt:'2026-01-01'};
 assert.deepEqual(p.presentRegistration(user,'r'),{message:'Usuario registrado exitosamente',token:'r',user:{id:'u1',username:'alice',email:'a@b.com',createdAt:'2026-01-01'}});
 assert.deepEqual(p.presentLogin({...user,createdAt:undefined},'l').user,{id:'u1',username:'alice',email:'a@b.com',createdAt:null});
});

test('presenter never leaks password and handles falsy createdAt',()=>{
 const u={id:'u',username:'x',email:'x@y.com',password:'top-secret',createdAt:null};
 const out=new AuthPresenter().presentLogin(u,'t'); assert.equal(out.user.password,undefined); assert.equal(out.user.createdAt,null);
});
