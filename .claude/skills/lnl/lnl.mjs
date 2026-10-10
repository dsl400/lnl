import{parseArgs as kt}from"node:util";import{realpathSync as Wt}from"node:fs";import{pathToFileURL as Ot}from"node:url";var P={NO_BLOCK:"LNL001",MANY_BLOCKS:"LNL002",UNCLOSED_BLOCK:"LNL003",UNKNOWN_INSTRUCTION:"LNL010",BAD_OPERAND:"LNL011",BAD_LABEL:"LNL012",UNTERMINATED_STRING:"LNL013",IF_NOT_ALLOWED:"LNL014",DUPLICATE_LABEL:"LNL020",MISSING_START:"LNL021",MISSING_TARGET:"LNL022",MISSING_REVIEW_REPLY:"LNL023",ASK_WITHOUT_BRANCH:"LNL030",BRANCH_WITHOUT_ASK:"LNL031",DUPLICATE_BRANCH:"LNL032",UNREACHABLE_LABEL:"LNL040",FALLS_OFF_END:"LNL041",NO_PATH_TO_END:"LNL042",UNCONTROLLED_CYCLE:"LNL050",DUPLICATE_LIMIT:"LNL051",TOO_MANY_CYCLES:"LNL052",NO_STOP_MODE_PATH:"LNL060",CALL_PATH:"LNL070",CALL_OUTSIDE_ROOT:"LNL071",CALL_MISSING:"LNL072",RECURSIVE_CALL:"LNL073",FILE_ACCESS:"LNL080"};function g(t,d,e,o,a,n="error"){return{code:t,severity:n,file:d,line:e,column:o,message:a}}function O(t){return`${t.file}:${t.line}:${t.column}: ${t.severity} ${t.code}: ${t.message}`}function F(t,d){return t.file.localeCompare(d.file)||t.line-d.line||t.column-d.column||t.code.localeCompare(d.code)}import{readFileSync as At,realpathSync as b}from"node:fs";import k from"node:path";var ht=/^([A-Z][A-Z0-9_]*):$/,ft=/^[A-Z][A-Z0-9_]*$/,ut=/^<([a-z][a-z0-9_]*)>$/,it=/\s+IF\s+(yes|no|<([a-z][a-z0-9_]*)>\s*>=\s*(\d+))$/,rt=new Set(["ASK","JUMP","DO","WRITE","CHECK","ADD","STOP","CALL","SAY","END"]),Lt=new Set(["ASK","DO","CHECK","SAY"]);function v(t,d){let e=[],o=B(t),a={file:d,labels:[],instructions:[],diagnostics:e},n=H(o);if(n.error)return e.push(g(P[n.error],d,n.line,1,ct[n.error])),a;for(let L=n.open+1;L<n.close;L++)pt(o[L],L+1,a);return a}var ct={NO_BLOCK:"no ```lnl block",MANY_BLOCKS:"more than one ```lnl block",UNCLOSED_BLOCK:"```lnl block is not closed"};function B(t){return t.split(`
`).map((d)=>d.endsWith("\r")?d.slice(0,-1):d)}function H(t){let d=[];for(let o=0;o<t.length;o++)if(t[o]==="```lnl")d.push(o);if(d.length===0)return{error:"NO_BLOCK",line:1};if(d.length>1)return{error:"MANY_BLOCKS",line:d[1]+1};let e=d[0]+1;while(e<t.length&&t[e]!=="```")e++;if(e===t.length)return{error:"UNCLOSED_BLOCK",line:d[0]+1};return{open:d[0],close:e}}function pt(t,d,e){let{file:o,diagnostics:a}=e,n=V(t);switch(n.kind){case"blank":case"comment":return;case"label":e.labels.push({name:n.name,index:e.instructions.length,line:d,column:n.column});return;case"instruction":e.instructions.push({...n.ins,line:d,column:n.column,file:o});return;default:a.push(g(n.code,o,d,n.column,n.message))}}function V(t){let d=Nt(t);if(d===null)return{kind:"error",code:P.UNTERMINATED_STRING,column:t.indexOf('"')+1,message:"unterminated string"};let e=d.length<t.length?t.slice(d.length+1):void 0,o=d.trim();if(o==="")return e===void 0?{kind:"blank"}:{kind:"comment",comment:e};let a=d.indexOf(o)+1,n=ht.exec(o);if(n)return{kind:"label",name:n[1],column:a,comment:e};let L=/^\S+/.exec(o)[0];if(!rt.has(L)){if(o.endsWith(":"))return{kind:"error",code:P.BAD_LABEL,column:a,message:`invalid label "${o}"`};return{kind:"error",code:P.UNKNOWN_INSTRUCTION,column:a,message:`unknown instruction "${L}"`}}let r={op:L},$=wt(r,o.slice(L.length).trim());if($)return{kind:"error",code:$.code??P.BAD_OPERAND,column:a,message:`${L}: ${$.message}`};return{kind:"instruction",ins:r,column:a,comment:e}}function Nt(t){let d=!1;for(let e=0;e<t.length;e++){let o=t[e];if(d){if(o==="\\")e++;else if(o==='"')d=!1}else if(o==='"')d=!0;else if(o===";")return t.slice(0,e)}return d?null:t}function j(t){if(t[0]!=='"')return null;let d="";for(let e=1;e<t.length;e++){let o=t[e];if(o==="\\"&&(t[e+1]==='"'||t[e+1]==="\\"))d+=t[++e];else if(o==='"')return{value:d,rest:t.slice(e+1).trim()};else d+=o}return null}function st(t){let d=it.exec(t);if(!d)return{body:t,cond:null};let e=t.slice(0,d.index).trim();if(d[2])return{body:e,cond:{counter:d[2],limit:Number(d[3])}};return{body:e,cond:{answer:d[1]}}}function X(t){if(t.startsWith('"')){let d=j(t);if(!d||d.rest!=="")return{error:"a quoted text must be the whole operand"};return{value:d.value}}return{value:t}}function wt(t,d){let{body:e,cond:o}=st(d);if(o&&t.op!=="JUMP"&&t.op!=="STOP")return{code:P.IF_NOT_ALLOWED,message:"IF is allowed only on JUMP and STOP; quote the text if the IF belongs to it"};if(Lt.has(t.op)){let a=X(e);if(a.error)return{message:a.error};if(a.value==="")return{message:"missing text"};return t.text=a.value,null}switch(t.op){case"JUMP":if(!ft.test(e))return{message:`expected a label, got "${e}"`};if(o?.counter)return{message:"JUMP accepts only IF yes|no"};return t.target=e,t.answer=o?.answer??null,null;case"STOP":{if(!o)return{message:"STOP needs IF yes|no or IF <counter> >= <n>"};let a=X(e);if(a.error)return{message:a.error};if(a.value==="")return{message:"missing message"};if(t.text=a.value,o.answer)t.answer=o.answer;else{if(o.limit<1)return{message:"the limit must be a positive integer"};t.counter=o.counter,t.limit=o.limit}return null}case"WRITE":{let a=/^(\S+)\s+(".*)$/.exec(e),n=a&&j(a[2]);if(!n||n.rest!=="")return{message:'expected WRITE <path> "<description>"'};if(n.value.trim()==="")return{message:"empty description"};return t.path=a[1],t.description=n.value,null}case"ADD":{let a=/^1\s+to\s+(\S+)$/.exec(e),n=a&&ut.exec(a[1]);if(!n)return{message:"expected ADD 1 to <counter>"};return t.counter=n[1],null}case"CALL":if(!/^\S+$/.test(e))return{message:"expected CALL <relative-path.md>"};return t.path=e,null;case"END":if(e!=="")return{message:"END takes no operand"};return null}return null}function S(t){let{file:d,instructions:e,labels:o}=t,a=[],n=e.length,L=new Map,r=new Map;for(let f of o){if(r.has(f.name)){a.push(g(P.DUPLICATE_LABEL,d,f.line,f.column,`duplicate label ${f.name}`));continue}if(r.set(f.name,f.index),!L.has(f.index))L.set(f.index,[]);L.get(f.index).push(f.name)}if(!r.has("START"))a.push(g(P.MISSING_START,d,1,1,"missing START label"));let $=e.find((f)=>f.op==="STOP");if($){for(let f of["REVIEW","REPLY"])if(!r.has(f))a.push(g(P.MISSING_REVIEW_REPLY,d,$.line,$.column,`a file with STOP must declare ${f}`))}let u=new Map,h=new Map;for(let f=0;f<n;f++){if(e[f].op!=="ASK")continue;let w=[],A=f+1;while(A<n&&!L.has(A)&&e[A].answer){if(w.find((U)=>e[U].answer===e[A].answer)!==void 0)a.push(g(P.DUPLICATE_BRANCH,d,e[A].line,e[A].column,`second branch for answer ${e[A].answer}`));w.push(A),u.set(A,f),A++}if(w.length===0)a.push(g(P.ASK_WITHOUT_BRANCH,d,e[f].line,e[f].column,"ASK must be followed by JUMP or STOP with IF yes|no"));h.set(f,{branches:w,after:A})}for(let f=0;f<n;f++)if(e[f].answer&&!u.has(f))a.push(g(P.BRANCH_WITHOUT_ASK,d,e[f].line,e[f].column,`IF ${e[f].answer} without an ASK in the same group`));let c=(f,w)=>{if(r.has(w))return r.get(w);return a.push(g(P.MISSING_TARGET,d,e[f].line,e[f].column,`label ${w} does not exist`)),null},_=r.get("REVIEW")??null,s=[],p=[],N=(f,w,A="",M={})=>{if(w!==null)p.push({from:f,to:w,label:A,implicit:!1,stop:!1,...M})};for(let f=0;f<n;f++){let w=e[f];if(w.op==="JUMP"&&u.has(f))continue;if(w.answer&&!u.has(f))continue;switch(s.push(f),w.op){case"ASK":{let{branches:A,after:M}=h.get(f);for(let U of["yes","no"]){let C=A.find((i)=>e[i].answer===U);if(C===void 0)N(f,M,U,{implicit:!0});else if(e[C].op==="JUMP")N(f,c(C,e[C].target),U);else N(f,C,U)}break}case"JUMP":N(f,c(f,w.target));break;case"STOP":if(w.counter)N(f,f+1,`<${w.counter}> < ${w.limit}`,{implicit:!0});N(f,_,w.counter?`<${w.counter}> >= ${w.limit}`:"stop",{stop:!0});break;case"END":break;default:N(f,f+1)}}return{program:t,nodes:s,edges:p,labelIndex:r,labelAt:L,groups:h,diagnostics:a,start:r.get("START")??null}}function q(t,d=process.cwd(),e=new Map){let o=[],a=new Map,n=[],L;try{L=b(d)}catch{return o.push(g(P.FILE_ACCESS,d,1,1,"cannot resolve the project root")),{root:d,entry:null,files:a,order:n,diagnostics:o}}let r=(h,c)=>{let _=e.get(h);try{_??=At(h,"utf8")}catch(N){return o.push(g(P.FILE_ACCESS,c,1,1,`cannot read file: ${N.code??N.message}`)),null}let s=v(_,c);s.real=h;let p=S(s);return o.push(...s.diagnostics,...p.diagnostics),p},$=(h,c,_)=>{if(a.has(h))return;let s=r(h,c);if(!s)return;a.set(h,s),n.push(h);for(let p of s.program.instructions){if(p.op!=="CALL")continue;let N=Pt(p,h,L,o);if(!N)continue;if(p.resolved=N,_.includes(N)){o.push(g(P.RECURSIVE_CALL,p.file,p.line,p.column,`recursive CALL of ${p.path}`));continue}$(N,k.relative(L,N),[..._,N])}},u;try{u=b(t)}catch(h){return o.push(g(P.FILE_ACCESS,t,1,1,`cannot read file: ${h.code??h.message}`)),{root:L,entry:null,files:a,order:n,diagnostics:o}}return $(u,t,[u]),{root:L,entry:u,files:a,order:n,diagnostics:o}}function Pt(t,d,e,o){let a=[t.file,t.line,t.column];if(k.isAbsolute(t.path)||!t.path.endsWith(".md")||!/^\.\.?\//.test(t.path))return o.push(g(P.CALL_PATH,...a,`CALL needs a relative path to a .md file, such as ./flow.md; got ${t.path}`)),null;let n;try{n=b(k.resolve(k.dirname(d),t.path))}catch{return o.push(g(P.CALL_MISSING,...a,`CALL target ${t.path} does not exist`)),null}if(n!==e&&!n.startsWith(e+k.sep))return o.push(g(P.CALL_OUTSIDE_ROOT,...a,`CALL target ${t.path} is outside the project root`)),null;return n}var $t=new Set(["ASK","CHECK","JUMP","SAY","END"]),x=1e4;function W(t,d,e){let o=q(t,d,e);for(let a of o.order){let n=o.files.get(a);if(n.guards=new Map,n.program.diagnostics.length===0&&n.diagnostics.length===0)o.diagnostics.push(..._t(n))}return o.diagnostics.sort(F),o.ok=!o.diagnostics.some((a)=>a.severity==="error"),o}function _t(t){let{program:d,nodes:e,edges:o,start:a,labelIndex:n}=t,{file:L,instructions:r,labels:$}=d,u=[];if(a===null)return u;let h=r.length;if(a===h){let i=$.find((m)=>m.name==="START");return u.push(g(P.FALLS_OFF_END,L,i.line,i.column,"control leaves the file without END")),u}let c=(i,m,J)=>{let T=r[i]??r[h-1]??{line:1,column:1};u.push(g(m,L,T.line,T.column,J))},_=new Map(e.map((i)=>[i,[]]));for(let i of o)_.get(i.from).push(i);let s=new Set([a]),p=[a];while(p.length){let i=p.shift();if(i===h)continue;for(let m of _.get(i)??[])if(!s.has(m.to))s.add(m.to),p.push(m.to)}for(let i of $)if(!s.has(i.index)&&n.get(i.name)===i.index)u.push(g(P.UNREACHABLE_LABEL,L,i.line,i.column,`label ${i.name} is unreachable`));for(let i of o)if(i.to===h&&s.has(i.from))c(i.from,P.FALLS_OFF_END,"control leaves the file without END");let N=new Map;for(let i of o){if(!N.has(i.to))N.set(i.to,[]);N.get(i.to).push(i.from)}let f=e.filter((i)=>r[i].op==="END"),w=new Set(f),A=[...f];while(A.length)for(let i of N.get(A.pop())??[])if(!w.has(i))w.add(i),A.push(i);for(let i of e)if(s.has(i)&&!w.has(i))c(i,P.NO_PATH_TO_END,`no path from ${r[i].op} to END`);let M=new Map;for(let i=0;i<h;i++){let m=r[i];if(m.op!=="STOP"||!m.counter)continue;if(M.has(m.counter))c(i,P.DUPLICATE_LIMIT,`counter <${m.counter}> already has a limit`);else M.set(m.counter,i)}let U=o.filter((i)=>!i.stop&&i.to!==h),C=mt(e,U,x);if(C===null)c(a,P.TOO_MANY_CYCLES,`more than ${x} simple cycles; split the flow`);else for(let i of C){let m=new Set(i),J=[...M.keys()].find((T)=>m.has(M.get(T))&&i.some((I)=>r[I].op==="ADD"&&r[I].counter===T));if(J===void 0){let T=Math.min(...i);c(T,P.UNCONTROLLED_CYCLE,`uncontrolled cycle through ${gt(t,i)}: it needs ADD 1 to <c> and STOP ... IF <c> >= n on each repetition`);continue}for(let T=0;T<i.length;T++){let I=i[T],E=i[(T+1)%i.length];if(E>I)continue;let y=`${I}->${E}`;if(!t.guards.has(y))t.guards.set(y,new Set);t.guards.get(y).add(`<${J}> >= ${r[M.get(J)].limit}`)}}if(r.some((i)=>i.op==="STOP")&&n.has("REVIEW")&&n.has("REPLY")){let i=n.get("REVIEW"),m=n.get("REPLY"),J=(E)=>E<h&&$t.has(r[E].op)&&!r[E].answer,T=new Set,I=(E,y)=>{if(!J(E)||T.has(E))return!1;if(y||=E===m,r[E].op==="END")return y;T.add(E);let dt=(_.get(E)??[]).some((D)=>!D.stop&&I(D.to,y));return T.delete(E),dt};if(!I(i,!1)){let E=$.find((y)=>y.name==="REVIEW");u.push(g(P.NO_STOP_MODE_PATH,L,E.line,E.column,"no path from REVIEW through REPLY to END that uses only ASK, CHECK, JUMP, SAY, and END"))}}return u}function gt(t,d){let e=[];for(let o of[...d].sort((a,n)=>a-n))for(let a of t.labelAt.get(o)??[])e.push(a);return e.length?e.join(", "):`line ${t.program.instructions[Math.min(...d)].line}`}function mt(t,d,e){let o=new Map(t.map((L)=>[L,new Set]));for(let L of d)o.get(L.from)?.add(L.to);let a=[],n=[new Set(t)];while(n.length){let L=n.shift();for(let r of Et(L,o)){let $=Math.min(...r);if(r.length===1&&!o.get($).has($))continue;let u=new Set(r),h=new Set,c=new Map(r.map((f)=>[f,new Set])),_=[],s=!1,p=(f)=>{h.delete(f);let w=[...c.get(f)];c.get(f).clear();for(let A of w)if(h.has(A))p(A)},N=(f)=>{let w=!1;_.push(f),h.add(f);for(let A of o.get(f)){if(!u.has(A))continue;if(A===$){if(a.push([..._]),w=!0,a.length>e)s=!0}else if(!h.has(A)&&N(A))w=!0;if(s)return!0}if(w)p(f);else for(let A of o.get(f))if(u.has(A))c.get(A).add(f);return _.pop(),w};if(N($),s)return null;if(u.delete($),u.size)n.push(u)}}return a}function Et(t,d){let e=0,o=new Map,a=new Map,n=[],L=new Set,r=[],$=(u)=>{o.set(u,e),a.set(u,e++),n.push(u),L.add(u);for(let h of d.get(u)){if(!t.has(h))continue;if(!o.has(h))$(h),a.set(u,Math.min(a.get(u),a.get(h)));else if(L.has(h))a.set(u,Math.min(a.get(u),o.get(h)))}if(a.get(u)===o.get(u)){let h=[],c;do c=n.pop(),L.delete(c),h.push(c);while(c!==u);r.push(h)}};for(let u of[...t].sort((h,c)=>h-c))if(!o.has(u))$(u);return r}import l from"node:path";function z(t){let d=[],e=[],o=[],a=new Map(t.order.map((u,h)=>[u,`f${h}`])),n=(u,h)=>`${a.get(u)}_i${h}`,L="halt",r=!1,$=new Set;for(let u of t.order){let h=t.files.get(u),c=h.program.instructions,_={id:a.get(u),title:l.relative(t.root,u)||l.basename(u),nodes:[]};d.push(_);let s=c.some((p)=>p.op==="STOP");r||=s;for(let p of h.nodes){let N=c[p],f=h.labelAt.get(p)??[],w={id:n(u,p),shape:Tt(N.op),text:[...f.map((A)=>`${A}:`),Mt(N)].join(`
`)};if(_.nodes.push(w),e.push(w),N.op==="CALL"){let A=t.files.get(N.resolved);o.push({from:w.id,to:n(N.resolved,A.start),label:"call",style:"solid"});for(let M of A.nodes)if(A.program.instructions[M].op==="END")o.push({from:n(N.resolved,M),to:n(u,p+1),label:"return",style:"dotted"}),$.add(p)}if(N.op==="END"&&s)o.push({from:w.id,to:"halt",label:"after STOP",style:"dotted"})}for(let p of h.edges){if($.has(p.from)&&p.to===p.from+1)continue;let N=h.guards.get(`${p.from}->${p.to}`),f=[p.label,N&&`back edge ${[...N].sort().join(", ")}`].filter(Boolean).join("; ");o.push({from:n(u,p.from),to:n(u,p.to),label:f,style:p.stop?"thick":p.implicit?"dotted":"solid"})}}if(r)e.push({id:"halt",shape:"hexagon",text:"waiting_human"});return{clusters:d,nodes:e,edges:o,humanId:r?"halt":null}}function Tt(t){if(t==="ASK")return"diamond";if(t==="END")return"terminal";if(t==="CALL")return"subroutine";return"box"}function Mt(t){switch(t.op){case"ASK":case"DO":case"CHECK":case"SAY":return`${t.op} ${t.text}`;case"JUMP":return`JUMP ${t.target}`;case"WRITE":return`WRITE ${t.path} "${t.description}"`;case"ADD":return`ADD 1 to <${t.counter}>`;case"STOP":return`STOP ${t.text} IF ${t.counter?`<${t.counter}> >= ${t.limit}`:t.answer}`;case"CALL":return`CALL ${t.path}`;default:return t.op}}var G=(t)=>t.replace(/&/g,"#amp;").replace(/"/g,"#quot;").replace(/</g,"#lt;").replace(/>/g,"#gt;").replace(/\|/g,"#124;").replace(/\n/g,"<br/>");function Z(t){let d={diamond:["{","}"],terminal:["([","])"],subroutine:["[[","]]"],box:["[","]"],hexagon:["{{","}}"]},e=(n)=>{let[L,r]=d[n.shape];return`${n.id}${L}"${G(n.text)}"${r}`},o={solid:"-->",dotted:"-.->",thick:"==>"},a=["flowchart TD"];for(let n of t.clusters){a.push(`  subgraph ${n.id}["${G(n.title)}"]`);for(let L of n.nodes)a.push(`    ${e(L)}`);a.push("  end")}if(t.humanId)a.push(`  ${e(t.nodes.find((n)=>n.id===t.humanId))}`);for(let n of t.edges)a.push(`  ${n.from} ${o[n.style]}${n.label?`|"${G(n.label)}"|`:""} ${n.to}`);return a.join(`
`)+`
`}var Y=(t)=>t.replace(/\\/g,"\\\\").replace(/"/g,"\\\"").replace(/\n/g,"\\n");function tt(t){let d={diamond:"diamond",terminal:"oval",subroutine:"box3d",box:"box",hexagon:"hexagon"},e={solid:"solid",dotted:"dashed",thick:"bold"},o=["digraph lnl {",'  node [fontname="monospace"];'],a=(n)=>`"${n.id}" [shape=${d[n.shape]}, label="${Y(n.text)}"];`;for(let n of t.clusters){o.push(`  subgraph "cluster_${n.id}" {`,`    label="${Y(n.title)}";`);for(let L of n.nodes)o.push(`    ${a(L)}`);o.push("  }")}if(t.humanId)o.push(`  ${a(t.nodes.find((n)=>n.id===t.humanId))}`);for(let n of t.edges)o.push(`  "${n.from}" -> "${n.to}" [style=${e[n.style]}${n.label?`, label="${Y(n.label)}"`:""}];`);return o.push("}"),o.join(`
`)+`
`}import{createServer as Ut}from"node:http";import{readFileSync as Ct,writeFileSync as It,realpathSync as Jt}from"node:fs";import{createHash as yt}from"node:crypto";function et(t){let d=B(t),e=H(d);if(e.error)return{error:e.error,line:e.line,rows:[],blockStart:1,digest:K(t)};return{rows:d.slice(e.open+1,e.close),blockStart:e.open+2,digest:K(t)}}function Q(t,d){let e=t.split(`
`),o=H(B(t));if(o.error)throw Error(o.error);let a=(u)=>u.endsWith("\r")?`\r
`:`
`,n=a(e[o.open]),L=(u)=>{let h=e[o.open+1+u];if(h===void 0||o.open+1+u>=o.close)return n;return(h.endsWith("\r")?h.slice(0,-1):h)===d[u]?a(h):n},r=e.slice(0,o.open+1).join(`
`)+`
`,$=e.slice(o.close).join(`
`);return r+d.map((u,h)=>u+L(h)).join("")+$}var K=(t)=>yt("sha256").update(t).digest("hex");function ot(t){let d=[],e=[],o=null;for(let a of t){let n=V(a);if(n.kind==="label")o={label:n.name,row:a,rows:[]},d.push(o);else if(o)o.rows.push(a);else e.push(a)}return{header:e,sections:d}}var nt=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>lnl edit</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 0; display: grid; grid-template-rows: auto 1fr; height: 100vh; }
  header { display: flex; gap: .6rem; align-items: center; padding: .4rem 1rem; border-bottom: 1px solid #ddd; }
  header .file { font-family: monospace; flex: 1; }
  main { display: grid; grid-template-columns: 1fr 22rem; overflow: hidden; }
  #rete { height: 100%; background: #f4f4f6; }
  aside { overflow: auto; padding: .5rem 1rem; border-left: 1px solid #ddd; font-size: 13px; }
  aside h3 { margin: .8rem 0 .3rem; font-size: 13px; }
  #problems { color: #c00; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
  #header-rows { width: 100%; box-sizing: border-box; font: 12px/1.4 monospace; min-height: 6em; }
  #conflict { background: #fff3cd; border: 1px solid #e0c060; padding: .5rem; margin: .5rem 0; }
  [hidden] { display: none !important; }
  .dirty { color: #a60; }
  .lnl-body { display: grid; gap: 4px; padding: 2px 0; }
  .lnl-body .head { display: flex; gap: 4px; align-items: center; }
  .lnl-body .head input { flex: 1; font: bold 13px monospace; padding: 2px 4px; border: 1px solid #aaa; border-radius: 4px; min-width: 0; }
  .lnl-body .head button { font-size: 11px; padding: 0 5px; }
  .lnl-body textarea { width: 100%; box-sizing: border-box; font: 12px/1.35 monospace; border: 1px solid #aaa; border-radius: 4px; padding: 4px; resize: vertical; white-space: pre; overflow-wrap: normal; overflow-x: auto; }
  .lnl-body .errors { color: #fff; background: #c33; border-radius: 4px; padding: 2px 6px; font: 11px/1.3 monospace; white-space: pre-wrap; }
</style>
</head>
<body>
<header>
  <span class="file" id="file"></span>
  <span id="status"></span>
  <button id="add">+ label</button>
  <button id="arrange">Arrange</button>
  <button id="reload">Reload</button>
  <button id="save">Save</button>
</header>
<main>
  <div id="rete"></div>
  <aside>
    <div id="conflict" hidden>
      The file changed on disk since it was opened.
      <button id="take-disk">Load the disk version</button>
      <button id="keep-mine">Keep mine and save over it</button>
    </div>
    <h3>Problems</h3>
    <div id="problems">none</div>
    <h3>Rows before the first label</h3>
    <textarea id="header-rows" spellcheck="false"></textarea>
    <h3>How to</h3>
    <p>Each node is a label with its rows. Edit the rows in the node. Drag a wire from a JUMP output onto a node to change the target of that JUMP. The "next" wire is the fall-through to the label that follows in the file: use ↑ ↓ to reorder. Ctrl+S saves.</p>
  </aside>
</main>
<script type="module">
const React = (await import('${"https://esm.sh"}/${"react@18.3.1"}')).default;
const { createRoot } = await import('${"https://esm.sh"}/react-dom@18.3.1/client');
const { NodeEditor, ClassicPreset } = await import('${"https://esm.sh"}/rete@2.0.6');
const { AreaPlugin, AreaExtensions } = await import('${"https://esm.sh"}/rete-area-plugin@2.3.2');
const { ConnectionPlugin, Presets: ConnectionPresets } = await import('${"https://esm.sh"}/rete-connection-plugin@2.0.5');
const { ReactPlugin, Presets } = await import('${"https://esm.sh"}/rete-react-plugin@2.1.2${"?deps=react@18.3.1,react-dom@18.3.1"}');
const dagre = (await import('${"https://esm.sh"}/@dagrejs/dagre@1.1.4')).default;
const h = React.createElement;
const $ = (id) => document.getElementById(id);

const state = { file: '', rows: [], header: [], blockStart: 1, digest: '', dirty: false, disk: null, nodes: [], loading: false, rowOwner: [], rev: 0 };
// state.rev counts the local edits; a save acknowledges the revision it sent, not a later one.
// state.nodes: [{ node, section: { label, row, rows }, control }] in file order.

// Rows the picture derives its wires from (engine.md, Instructions). Lint is the authority:
// these patterns only draw the sockets.
// JUMP captures the opcode prefix, the target, and the suffix, so a rewrite touches only the target.
const JUMP = /^(\\s*JUMP\\s+)([A-Z][A-Z0-9_]*)((?:\\s+IF\\s+(?:yes|no))?\\s*(?:;.*)?)$/;
const STOP = /^\\s*STOP\\s/;
const ENDS = /^\\s*(END|JUMP\\s+[A-Z][A-Z0-9_]*)\\s*(;.*)?$/;
const LABEL_ROW = /^([A-Z][A-Z0-9_]*):(.*)$/;

const socket = new ClassicPreset.Socket('flow');
const editor = new NodeEditor();
const area = new AreaPlugin($('rete'));
const connection = new ConnectionPlugin();
const render = new ReactPlugin({ createRoot });
connection.addPreset(ConnectionPresets.classic.setup());

// The body of a node: label name, rows, errors.
function Body({ data }) {
  const stop = (e) => e.stopPropagation();
  return h('div', { className: 'lnl-body', onPointerDown: stop, onWheel: stop, onKeyDown: stop },
    h('div', { className: 'head' },
      h('input', { defaultValue: data.name, spellCheck: false, onChange: (e) => data.rename(e.target.value) }),
      h('button', { title: 'move up in the file', onClick: () => data.move(-1) }, '↑'),
      h('button', { title: 'move down in the file', onClick: () => data.move(1) }, '↓'),
      h('button', { title: 'delete the label and its rows', onClick: () => data.remove() }, '✕')),
    h('textarea', { defaultValue: data.rows.join('\\n'), rows: Math.min(24, Math.max(3, data.rows.length + 1)), spellCheck: false, onChange: (e) => data.edit(e.target.value.split('\\n')) }),
    data.errors.length ? h('div', { className: 'errors' }, data.errors.join('\\n')) : null);
}
render.addPreset(Presets.classic.setup({
  customize: {
    control(context) { return context.payload.isBody ? Body : Presets.classic.Control; },
  },
}));
editor.use(area);
area.use(render);
area.use(connection);
AreaExtensions.selectableNodes(area, AreaExtensions.selector(), { accumulating: AreaExtensions.accumulateOnCtrl() });
AreaExtensions.simpleNodesOrder(area);

// A wire made by the user from a JUMP output rewrites that JUMP's target; other wires
// (next, STOP, or removals) are refused: the text is the source of truth.
editor.addPipe((ctx) => {
  if (state.loading) return ctx;
  if (ctx.type === 'connectioncreate') {
    const c = ctx.data;
    const from = state.nodes.find((n) => n.node.id === c.source);
    const to = state.nodes.find((n) => n.node.id === c.target);
    const m = /^j(\\d+)$/.exec(c.sourceOutput);
    if (from && to && m) {
      const i = Number(m[1]);
      from.section.rows[i] = from.section.rows[i].replace(JUMP, (row, pre, label, post) => pre + to.section.label + post);
      queueMicrotask(async () => { await rebuild(from); await wire(); touch(); });
    }
    return undefined;
  }
  if (ctx.type === 'connectionremove') return undefined;
  if (ctx.type === 'noderemove') {
    const k = state.nodes.findIndex((n) => n.node.id === ctx.data.id);
    if (k >= 0) {
      state.nodes.splice(k, 1);
      queueMicrotask(async () => { await wire(); touch(); });
    }
  }
  return ctx;
});
document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); return; }
  if (e.key === 'Delete' && document.activeElement === document.body) {
    for (const n of editor.getNodes().filter((n) => n.selected)) await editor.removeNode(n.id);
  }
});

// Outputs of a section: one per JUMP row, one per STOP row, and "next" unless the
// last row ends the label.
function outputsOf(rows) {
  const out = [];
  rows.forEach((row, i) => {
    const j = JUMP.exec(row);
    if (j) out.push({ key: 'j' + i, label: row.trim().replace(/\\s*;.*$/, ''), target: j[2] });
    else if (STOP.test(row)) out.push({ key: 's' + i, label: 'STOP → REVIEW', target: 'REVIEW' });
  });
  const last = [...rows].reverse().find((r) => r.trim() && !r.trim().startsWith(';'));
  if (!last || !ENDS.test(last)) out.push({ key: 'next', label: 'next', target: null });
  return out;
}
function makeNode(section) {
  const node = new ClassicPreset.Node(section.label);
  node.width = 420;
  node.addInput('in', new ClassicPreset.Input(socket, ''));
  const entry = { node, section, control: null };
  const control = {
    isBody: true, id: 'body-' + node.id, name: section.label, rows: section.rows, errors: [],
    rename: (name) => { section.label = name.trim(); section.row = section.label + ':' + (LABEL_ROW.exec(section.row)?.[2] ?? ''); node.label = section.label; rebuildAll().then(touch); },
    edit: (rows) => { section.rows = rows; control.rows = rows; rebuild(entry).then(wire).then(touch); },
    move: (by) => { const k = state.nodes.indexOf(entry); const j = k + by; if (j < 0 || j >= state.nodes.length) return; state.nodes.splice(k, 1); state.nodes.splice(j, 0, entry); wire().then(touch); },
    remove: () => editor.removeNode(node.id),
  };
  entry.control = control;
  node.addControl('body', control);
  for (const o of outputsOf(section.rows)) node.addOutput(o.key, new ClassicPreset.Output(socket, o.label));
  return entry;
}
// Resets the outputs of a node after its rows changed, then redraws it.
async function rebuild(entry) {
  const { node, section } = entry;
  for (const key of Object.keys(node.outputs)) node.removeOutput(key);
  for (const o of outputsOf(section.rows)) node.addOutput(o.key, new ClassicPreset.Output(socket, o.label));
  await area.update('node', node.id);
}
async function rebuildAll() {
  for (const e of state.nodes) await rebuild(e);
  await wire();
}
// Replaces every wire with the ones the rows describe.
async function wire() {
  state.loading = true;
  for (const c of editor.getConnections()) await editor.removeConnection(c.id);
  const byLabel = new Map(state.nodes.map((e) => [e.section.label, e]));
  for (const [k, e] of state.nodes.entries()) {
    for (const o of outputsOf(e.section.rows)) {
      const to = o.target ? byLabel.get(o.target) : state.nodes[k + 1];
      if (to) await editor.addConnection(new ClassicPreset.Connection(e.node, o.key, to.node, 'in'));
    }
  }
  state.loading = false;
}
async function layout() {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const e of state.nodes) {
    const el = area.nodeViews.get(e.node.id)?.element;
    g.setNode(e.node.id, { width: el?.offsetWidth || 420, height: el?.offsetHeight || 200 });
  }
  for (const c of editor.getConnections()) g.setEdge(c.source, c.target);
  dagre.layout(g);
  for (const e of state.nodes) {
    const p = g.node(e.node.id);
    await area.translate(e.node.id, { x: p.x - p.width / 2, y: p.y - p.height / 2 });
  }
  AreaExtensions.zoomAt(area, editor.getNodes());
}
async function show(doc) {
  state.loading = true;
  await editor.clear();
  state.nodes = doc.sections.map(makeNode);
  for (const e of state.nodes) await editor.addNode(e.node);
  state.loading = false;
  await wire();
  await new Promise((r) => setTimeout(r, 50));
  await layout();
}

// Rows to send: the original rows while nothing changed, so open + save keeps the
// file identical; the joined sections after a change. rowOwner maps each row to its node.
function generate() {
  const rows = [];
  state.rowOwner = [];
  const put = (row, owner) => { rows.push(row); state.rowOwner.push(owner); };
  for (const r of state.header) put(r, null);
  for (const e of state.nodes) {
    put(e.section.row, e);
    for (const r of e.section.rows) put(r, e);
  }
  return rows;
}
const rows = () => { const g = generate(); return state.dirty ? g : state.rows; };

function setStatus() {
  $('status').textContent = state.dirty ? 'unsaved changes' : 'saved';
  $('status').className = state.dirty ? 'dirty' : '';
  document.title = (state.dirty ? '* ' : '') + 'lnl edit · ' + state.file;
}
let timer = null;
function touch() {
  state.dirty = true;
  state.rev++;
  setStatus();
  clearTimeout(timer);
  timer = setTimeout(check, 300);
}
async function mark(diagnostics) {
  const other = [];
  for (const e of state.nodes) e.control.errors = [];
  for (const d of diagnostics) {
    const owner = d.file === state.file ? state.rowOwner[d.line - state.blockStart] : null;
    const text = d.code + ' ' + d.message;
    if (owner) owner.control.errors.push(text);
    else other.push(d.file + ':' + d.line + ':' + d.column + ': ' + text);
  }
  for (const e of state.nodes) await area.update('control', e.control.id);
  $('problems').textContent = diagnostics.length ? [diagnostics.length + ' problem' + (diagnostics.length > 1 ? 's' : '')].concat(other).join('\\n') : 'none';
}
async function check() {
  const r = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: rows() }) });
  mark((await r.json()).diagnostics);
}
async function take(doc) {
  Object.assign(state, { file: doc.file, rows: doc.rows, header: doc.header, blockStart: doc.blockStart, digest: doc.digest, dirty: false, disk: null });
  $('file').textContent = state.file;
  $('header-rows').value = doc.header.join('\\n');
  $('conflict').hidden = true;
  await show(doc);
  generate();
  mark(doc.diagnostics);
  setStatus();
}
async function load() { take(await (await fetch('/api/doc')).json()); }
async function save(digest = state.digest) {
  const sent = state.rev;
  const r = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: rows(), digest }) });
  const doc = await r.json();
  if (r.status === 409) { state.disk = doc; $('conflict').hidden = false; return; }
  if (r.status !== 200) { alert('save failed: ' + doc.error); return; }
  if (state.rev === sent) { take(doc); return; }
  // Edits arrived while the save was pending: keep them, adopt the saved document as the new baseline.
  Object.assign(state, { rows: doc.rows, digest: doc.digest, disk: null });
  $('conflict').hidden = true;
}
$('save').addEventListener('click', () => save());
$('reload').addEventListener('click', () => { if (!state.dirty || confirm('Discard the unsaved changes?')) load(); });
$('arrange').addEventListener('click', () => layout());
$('add').addEventListener('click', async () => {
  const name = (prompt('Name of the new label (A-Z, 0-9, _):') ?? '').trim();
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) return;
  const entry = makeNode({ label: name, row: name + ':', rows: ['  END'] });
  state.nodes.push(entry);
  await editor.addNode(entry.node);
  await wire();
  touch();
});
$('header-rows').addEventListener('change', (e) => { state.header = e.target.value === '' ? [] : e.target.value.split('\\n'); touch(); });
$('take-disk').addEventListener('click', () => take(state.disk));
$('keep-mine').addEventListener('click', () => save(state.disk.digest));
window.addEventListener('beforeunload', (e) => { if (state.dirty) e.preventDefault(); });
load();
</script>
</body>
</html>
`;function at(t,d,e=0){let o=Jt(t),a=()=>Ct(o,"utf8"),n=(h)=>{let c=W(t,d,new Map([[o,h]]));return{diagnostics:c.diagnostics,mermaid:c.ok?Z(z(c)):null}},L=(h)=>{let c=et(h),_=n(h);return{file:t,rows:c.rows,...ot(c.rows),blockStart:c.blockStart,digest:c.digest,diagnostics:_.diagnostics,mermaid:_.mermaid}},r=(h,c,_)=>{h.writeHead(c,{"content-type":"application/json; charset=utf-8"}),h.end(JSON.stringify(_))},$=(h)=>new Promise((c,_)=>{let s="";h.on("data",(p)=>s+=p),h.on("end",()=>{try{c(JSON.parse(s))}catch(p){_(p)}})}),u=Ut(async(h,c)=>{try{if(h.method==="GET"&&h.url==="/")return c.writeHead(200,{"content-type":"text/html; charset=utf-8"}),c.end(nt);if(h.method==="GET"&&h.url==="/favicon.ico")return c.writeHead(204).end();if(h.method==="GET"&&h.url==="/api/doc")return r(c,200,L(a()));if(h.method==="POST"&&h.url==="/api/check"){let{rows:_}=await $(h),s=n(Q(a(),_));return r(c,200,{diagnostics:s.diagnostics,mermaid:s.mermaid})}if(h.method==="POST"&&h.url==="/api/save"){let{rows:_,digest:s}=await $(h),p=a();if(K(p)!==s)return r(c,409,L(p));let N=Q(p,_);if(N!==p)It(o,N);return r(c,200,L(N))}r(c,404,{error:"not found"})}catch(_){r(c,500,{error:_.message})}});return new Promise((h)=>{u.listen(e,"127.0.0.1",()=>{u.url=`http://127.0.0.1:${u.address().port}/`,h(u)})})}var R=`usage:
  lnl lint <entry.md> [--format text|json] [--root <dir>]
  lnl graph <entry.md> --format mermaid|dot [--root <dir>]
  lnl edit <entry.md> [--root <dir>] [--port <n>]`;async function Bt(t,d,e){let[o,...a]=t,n;try{n=kt({args:a,allowPositionals:!0,options:{format:{type:"string"},root:{type:"string"},port:{type:"string"}}})}catch(s){return e.write(`${s.message}
${R}
`),2}let{positionals:L,values:r}=n;if(!["lint","graph","edit"].includes(o)||L.length!==1)return e.write(`${R}
`),2;if(o==="edit")return Ht(L[0],r,d,e);let $=o==="lint"?["text","json"]:["mermaid","dot"],u=r.format??(o==="lint"?"text":void 0);if(!$.includes(u))return e.write(`--format must be ${$.join("|")}
${R}
`),2;let h=W(L[0],r.root),c=h.diagnostics.some((s)=>s.code===P.FILE_ACCESS)?2:h.ok?0:1;if(o==="lint"){if(u==="json")d.write(JSON.stringify({diagnostics:h.diagnostics},null,2)+`
`);else for(let s of h.diagnostics)d.write(O(s)+`
`);return c}for(let s of h.diagnostics)e.write(O(s)+`
`);if(c!==0)return c;let _=z(h);return d.write(u==="mermaid"?Z(_):tt(_)),0}async function Ht(t,d,e,o){let a=d.port===void 0?0:Number(d.port);if(!Number.isInteger(a)||a<0||a>65535)return o.write(`--port must be an integer between 0 and 65535
${R}
`),2;let n=W(t,d.root);if(n.diagnostics.some((r)=>r.code===P.FILE_ACCESS)){for(let r of n.diagnostics)o.write(O(r)+`
`);return 2}let L=await at(t,d.root,a);return e.write(`lnl edit: ${L.url}
`),await new Promise((r)=>L.on("close",r)),0}if(process.argv[1]&&import.meta.url===Ot(Wt(process.argv[1])).href)process.exitCode=await Bt(process.argv.slice(2),process.stdout,process.stderr);export{Bt as main};
