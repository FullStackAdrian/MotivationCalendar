const test=require('node:test');const assert=require('node:assert/strict');const express=require('express');
process.env.JWT_SECRET='test-secret';process.env.NODE_ENV='test';
const progress=require('../backend/routes/progress');
function app(){const a=express();a.use(express.json());a.use('/progress',progress);return a;}

test('progress endpoints require authentication',async()=>{const server=app().listen(0);const base=`http://127.0.0.1:${server.address().port}`;for(const [path,method] of [['/progress','GET'],['/progress/2026-01-01','PUT'],['/progress/bulk','POST'],['/progress','DELETE']]){const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:method==='PUT'?JSON.stringify({status:'completed'}):method==='POST'?JSON.stringify({updates:{}}):method==='DELETE'?JSON.stringify({}):undefined});assert.equal(r.status,401);}await new Promise(resolve=>server.close(resolve));});

test('progress router exposes all expected routes',()=>{const stack=progress.stack.filter(x=>x.route).map(x=>`${Object.keys(x.route.methods).join(',')}:${x.route.path}`);assert.ok(stack.some(x=>x.includes('GET:/')));assert.ok(stack.some(x=>x.includes('PUT:/:dayKey')));assert.ok(stack.some(x=>x.includes('POST:/bulk')));assert.ok(stack.some(x=>x.includes('DELETE:/')));});
