import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {registerHooks} from 'node:module';
import {NextRequest} from 'next/server.js';

test('installed Neon callback middleware exchanges a verifier and forwards session cookies',async()=>{
 // The Next bundler resolves these extensionless SDK imports; plain Node needs the aliases.
 const hook=registerHooks({resolve(specifier,context,next){return next(['next/headers','next/server'].includes(specifier)?specifier+'.js':specifier,context);}});
 const {createNeonAuth}=await import('@neon/auth/next/server');
 const calls=[];
 const server=createServer((req,res)=>{
  calls.push(req.url);res.setHeader('Content-Type','application/json');
  res.setHeader('Set-Cookie','__Secure-neon-auth.session_token=synthetic; Path=/; Secure; HttpOnly; SameSite=Lax');
  const now=new Date().toISOString();
  res.end(JSON.stringify({session:{id:'synthetic-session',userId:'synthetic-user',token:'synthetic',createdAt:now,updatedAt:now,expiresAt:new Date(Date.now()+3600000).toISOString()},user:{id:'synthetic-user',email:'synthetic@example.invalid',emailVerified:true,name:'Synthetic',createdAt:now,updatedAt:now}}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const auth=createNeonAuth({baseUrl:`http://127.0.0.1:${server.address().port}/auth`,cookies:{secret:'s'.repeat(32)},logLevel:'silent'});
  const response=await auth.middleware({loginUrl:'/sign-in',publicRoutes:['/account/callback']})(new NextRequest('https://example.com/account/callback?neon_auth_session_verifier=synthetic-verifier',{headers:{cookie:'__Secure-neon-auth.session_challenge=synthetic-challenge'}}));
  assert.equal(response.status,307);assert.equal(response.headers.get('location'),'https://example.com/account/callback');
  assert.ok(response.headers.getSetCookie().some(c=>c.includes('neon-auth.session_token=')));
  assert.ok(calls.some(url=>url.includes('neon_auth_session_verifier=synthetic-verifier')));
 }finally{await new Promise(resolve=>server.close(resolve));hook.deregister();}
});
