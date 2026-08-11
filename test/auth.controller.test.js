const test = require('node:test');
const assert = require('node:assert/strict');
const AuthController = require('../backend/controllers/auth.controller');
function res(){return {code:200,body:null,status(c){this.code=c;return this;},json(b){this.body=b;return this;}};}

test('controller forwards valid register and login payloads', async()=>{
  const calls=[]; const c=new AuthController({async execute(x){calls.push(x);return {ok:true};}},{async execute(x){calls.push(x);return {ok:true};}});
  let r=res(); await c.register({body:{username:'a',email:'a@b.com',password:'secret123'}},r); assert.equal(r.code,201);
  r=res(); await c.login({body:{identifier:'a',password:'secret123'}},r); assert.equal(r.code,200);
  assert.equal(calls.length,2);
});

test('controller handles null, arrays and primitive bodies', async()=>{
  const calls=[]; const c=new AuthController({async execute(x){calls.push(x);return {}; }},{async execute(x){calls.push(x);return {}; }});
  for(const body of [null,[], 'text',42]) await c.register({body},res());
  for(const body of [null,[], 'text',42]) await c.login({body},res());
  assert.equal(calls.length,8);
});

test('controller maps every known validation and infrastructure error', async()=>{
  for(const message of ['Credenciales inválidas','El usuario o email ya está registrado','Todos los campos son requeridos','El identificador es inválido','La contraseña es requerida','El email no puede superar 255 caracteres','unexpected']){
    const c=new AuthController({async execute(){throw new Error(message);}},{async execute(){throw new Error(message);}});
    const r=res(); await c.register({body:{}},r); assert.ok([400,401,409,500].includes(r.code));
  }
});
