const test=require('node:test');const assert=require('node:assert/strict');const jwt=require('jsonwebtoken');process.env.JWT_SECRET='test-secret';process.env.NODE_ENV='test';const {verifyToken}=require('../backend/middleware/auth');
function res(){return{code:200,body:null,status(c){this.code=c;return this;},json(b){this.body=b;return this;}};}

test('middleware rejects all malformed authorization forms',()=>{for(const authorization of [undefined,'','Basic abc','Bearer','Bearer a b','bearer abc']){const r=res();verifyToken({headers:{authorization}},r,()=>assert.fail());assert.equal(r.code,401);}});

test('middleware accepts valid bearer token',()=>{const token=jwt.sign({userId:'u1',username:'a'},'test-secret');const req={headers:{authorization:`Bearer ${token}`}};let next=false;verifyToken(req,res(),()=>{next=true});assert.equal(next,true);assert.equal(req.user.userId,'u1');});

test('middleware distinguishes invalid and expired JWTs',()=>{let r=res();verifyToken({headers:{authorization:'Bearer invalid'}},r,()=>{});assert.equal(r.body.error,'Token inválido');r=res();const token=jwt.sign({userId:'u'},'test-secret',{expiresIn:-1});verifyToken({headers:{authorization:`Bearer ${token}`}},r,()=>{});assert.equal(r.body.error,'Token expirado');});
