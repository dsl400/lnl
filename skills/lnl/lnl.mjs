import{parseArgs as Ht}from"node:util";import{realpathSync as zt}from"node:fs";import{pathToFileURL as Bt}from"node:url";var m={NO_BLOCK:"LNL001",MANY_BLOCKS:"LNL002",UNCLOSED_BLOCK:"LNL003",UNKNOWN_INSTRUCTION:"LNL010",BAD_OPERAND:"LNL011",BAD_LABEL:"LNL012",UNTERMINATED_STRING:"LNL013",IF_NOT_ALLOWED:"LNL014",DUPLICATE_LABEL:"LNL020",MISSING_START:"LNL021",MISSING_TARGET:"LNL022",MISSING_REVIEW_REPLY:"LNL023",ASK_WITHOUT_BRANCH:"LNL030",BRANCH_WITHOUT_ASK:"LNL031",DUPLICATE_BRANCH:"LNL032",UNREACHABLE_LABEL:"LNL040",FALLS_OFF_END:"LNL041",NO_PATH_TO_END:"LNL042",UNCONTROLLED_CYCLE:"LNL050",DUPLICATE_LIMIT:"LNL051",TOO_MANY_CYCLES:"LNL052",NO_STOP_MODE_PATH:"LNL060",CALL_PATH:"LNL070",CALL_OUTSIDE_ROOT:"LNL071",CALL_MISSING:"LNL072",RECURSIVE_CALL:"LNL073",FILE_ACCESS:"LNL080"};function A(t,n,e,o,s,a="error"){return{code:t,severity:a,file:n,line:e,column:o,message:s}}function H(t){return`${t.file}:${t.line}:${t.column}: ${t.severity} ${t.code}: ${t.message}`}function G(t,n){return t.file.localeCompare(n.file)||t.line-n.line||t.column-n.column||t.code.localeCompare(n.code)}import{readFileSync as mt,realpathSync as K}from"node:fs";import W from"node:path";var ct=/^([A-Z][A-Z0-9_]*):$/,ht=/^[A-Z][A-Z0-9_]*$/,ft=/^<([a-z][a-z0-9_]*)>$/,pt=/\s+IF\s+(yes|no|<([a-z][a-z0-9_]*)>\s*>=\s*(\d+))$/,wt=new Set(["ASK","JUMP","DO","WRITE","CHECK","ADD","STOP","CALL","SAY","END"]),ut=new Set(["ASK","DO","CHECK","SAY"]);function Q(t,n){let e=[],o=V(t),s={file:n,labels:[],instructions:[],diagnostics:e},a=z(o);if(a.error)return e.push(A(m[a.error],n,a.line,1,Lt[a.error])),s;for(let p=a.open+1;p<a.close;p++)gt(o[p],p+1,s);return s}var Lt={NO_BLOCK:"no ```lnl block",MANY_BLOCKS:"more than one ```lnl block",UNCLOSED_BLOCK:"```lnl block is not closed"};function V(t){return t.split(`
`).map((n)=>n.endsWith("\r")?n.slice(0,-1):n)}function z(t){let n=[];for(let o=0;o<t.length;o++)if(t[o]==="```lnl")n.push(o);if(n.length===0)return{error:"NO_BLOCK",line:1};if(n.length>1)return{error:"MANY_BLOCKS",line:n[1]+1};let e=n[0]+1;while(e<t.length&&t[e]!=="```")e++;if(e===t.length)return{error:"UNCLOSED_BLOCK",line:n[0]+1};return{open:n[0],close:e}}function gt(t,n,e){let{file:o,diagnostics:s}=e,a=j(t);switch(a.kind){case"blank":case"comment":return;case"label":e.labels.push({name:a.name,index:e.instructions.length,line:n,column:a.column});return;case"instruction":e.instructions.push({...a.ins,line:n,column:a.column,file:o});return;default:s.push(A(a.code,o,n,a.column,a.message))}}function j(t){let n=lt(t);if(n===null)return{kind:"error",code:m.UNTERMINATED_STRING,column:t.indexOf('"')+1,message:"unterminated string"};let e=n.length<t.length?t.slice(n.length+1):void 0,o=n.trim();if(o==="")return e===void 0?{kind:"blank"}:{kind:"comment",comment:e};let s=n.indexOf(o)+1,a=ct.exec(o);if(a)return{kind:"label",name:a[1],column:s,comment:e};let p=/^\S+/.exec(o)[0];if(!wt.has(p)){if(o.endsWith(":"))return{kind:"error",code:m.BAD_LABEL,column:s,message:`invalid label "${o}"`};return{kind:"error",code:m.UNKNOWN_INSTRUCTION,column:s,message:`unknown instruction "${p}"`}}let i={op:p},v=Nt(i,o.slice(p.length).trim());if(v)return{kind:"error",code:v.code??m.BAD_OPERAND,column:s,message:`${p}: ${v.message}`};return{kind:"instruction",ins:i,column:s,comment:e}}function lt(t){let n=!1;for(let e=0;e<t.length;e++){let o=t[e];if(n){if(o==="\\")e++;else if(o==='"')n=!1}else if(o==='"')n=!0;else if(o===";")return t.slice(0,e)}return n?null:t}function F(t){if(t[0]!=='"')return null;let n="";for(let e=1;e<t.length;e++){let o=t[e];if(o==="\\"&&(t[e+1]==='"'||t[e+1]==="\\"))n+=t[++e];else if(o==='"')return{value:n,rest:t.slice(e+1).trim()};else n+=o}return null}function vt(t){let n=pt.exec(t);if(!n)return{body:t,cond:null};let e=t.slice(0,n.index).trim();if(n[2])return{body:e,cond:{counter:n[2],limit:Number(n[3])}};return{body:e,cond:{answer:n[1]}}}function D(t){if(t.startsWith('"')){let n=F(t);if(!n||n.rest!=="")return{error:"a quoted text must be the whole operand"};return{value:n.value}}return{value:t}}function Nt(t,n){let{body:e,cond:o}=vt(n);if(o&&t.op!=="JUMP"&&t.op!=="STOP")return{code:m.IF_NOT_ALLOWED,message:"IF is allowed only on JUMP and STOP; quote the text if the IF belongs to it"};if(ut.has(t.op)){let s=D(e);if(s.error)return{message:s.error};if(s.value==="")return{message:"missing text"};return t.text=s.value,null}switch(t.op){case"JUMP":if(!ht.test(e))return{message:`expected a label, got "${e}"`};if(o?.counter)return{message:"JUMP accepts only IF yes|no"};return t.target=e,t.answer=o?.answer??null,null;case"STOP":{if(!o)return{message:"STOP needs IF yes|no or IF <counter> >= <n>"};let s=D(e);if(s.error)return{message:s.error};if(s.value==="")return{message:"missing message"};if(t.text=s.value,o.answer)t.answer=o.answer;else{if(o.limit<1)return{message:"the limit must be a positive integer"};t.counter=o.counter,t.limit=o.limit}return null}case"WRITE":{let s=/^(\S+)\s+(".*)$/.exec(e),a=s&&F(s[2]);if(!a||a.rest!=="")return{message:'expected WRITE <path> "<description>"'};if(a.value.trim()==="")return{message:"empty description"};return t.path=s[1],t.description=a.value,null}case"ADD":{let s=/^1\s+to\s+(\S+)$/.exec(e),a=s&&ft.exec(s[1]);if(!a)return{message:"expected ADD 1 to <counter>"};return t.counter=a[1],null}case"CALL":if(!/^\S+$/.test(e))return{message:"expected CALL <relative-path.md>"};return t.path=e,null;case"END":if(e!=="")return{message:"END takes no operand"};return null}return null}function X(t){let{file:n,instructions:e,labels:o}=t,s=[],a=e.length,p=new Map,i=new Map;for(let c of o){if(i.has(c.name)){s.push(A(m.DUPLICATE_LABEL,n,c.line,c.column,`duplicate label ${c.name}`));continue}if(i.set(c.name,c.index),!p.has(c.index))p.set(c.index,[]);p.get(c.index).push(c.name)}if(!i.has("START"))s.push(A(m.MISSING_START,n,1,1,"missing START label"));let v=e.find((c)=>c.op==="STOP");if(v){for(let c of["REVIEW","REPLY"])if(!i.has(c))s.push(A(m.MISSING_REVIEW_REPLY,n,v.line,v.column,`a file with STOP must declare ${c}`))}let f=new Map,r=new Map;for(let c=0;c<a;c++){if(e[c].op!=="ASK")continue;let N=[],d=c+1;while(d<a&&!p.has(d)&&e[d].answer){if(N.find((b)=>e[b].answer===e[d].answer)!==void 0)s.push(A(m.DUPLICATE_BRANCH,n,e[d].line,e[d].column,`second branch for answer ${e[d].answer}`));N.push(d),f.set(d,c),d++}if(N.length===0)s.push(A(m.ASK_WITHOUT_BRANCH,n,e[c].line,e[c].column,"ASK must be followed by JUMP or STOP with IF yes|no"));r.set(c,{branches:N,after:d})}for(let c=0;c<a;c++)if(e[c].answer&&!f.has(c))s.push(A(m.BRANCH_WITHOUT_ASK,n,e[c].line,e[c].column,`IF ${e[c].answer} without an ASK in the same group`));let u=(c,N)=>{if(i.has(N))return i.get(N);return s.push(A(m.MISSING_TARGET,n,e[c].line,e[c].column,`label ${N} does not exist`)),null},L=i.get("REVIEW")??null,g=[],w=[],l=(c,N,d="",E={})=>{if(N!==null)w.push({from:c,to:N,label:d,implicit:!1,stop:!1,...E})};for(let c=0;c<a;c++){let N=e[c];if(N.op==="JUMP"&&f.has(c))continue;if(N.answer&&!f.has(c))continue;switch(g.push(c),N.op){case"ASK":{let{branches:d,after:E}=r.get(c);for(let b of["yes","no"]){let y=d.find((h)=>e[h].answer===b);if(y===void 0)l(c,E,b,{implicit:!0});else if(e[y].op==="JUMP")l(c,u(y,e[y].target),b);else l(c,y,b)}break}case"JUMP":l(c,u(c,N.target));break;case"STOP":if(N.counter)l(c,c+1,`<${N.counter}> < ${N.limit}`,{implicit:!0});l(c,L,N.counter?`<${N.counter}> >= ${N.limit}`:"stop",{stop:!0});break;case"END":break;default:l(c,c+1)}}return{program:t,nodes:g,edges:w,labelIndex:i,labelAt:p,groups:r,diagnostics:s,start:i.get("START")??null}}function q(t,n=process.cwd(),e=new Map){let o=[],s=new Map,a=[],p;try{p=K(n)}catch{return o.push(A(m.FILE_ACCESS,n,1,1,"cannot resolve the project root")),{root:n,entry:null,files:s,order:a,diagnostics:o}}let i=(r,u)=>{let L=e.get(r);try{L??=mt(r,"utf8")}catch(l){return o.push(A(m.FILE_ACCESS,u,1,1,`cannot read file: ${l.code??l.message}`)),null}let g=Q(L,u);g.real=r,g.source=L;let w=X(g);return o.push(...g.diagnostics,...w.diagnostics),w},v=(r,u,L)=>{if(s.has(r))return;let g=i(r,u);if(!g)return;s.set(r,g),a.push(r);for(let w of g.program.instructions){if(w.op!=="CALL")continue;let l=Et(w,r,p,o);if(!l)continue;if(w.resolved=l,L.includes(l)){o.push(A(m.RECURSIVE_CALL,w.file,w.line,w.column,`recursive CALL of ${w.path}`));continue}v(l,W.relative(p,l),[...L,l])}},f;try{f=K(t)}catch(r){return o.push(A(m.FILE_ACCESS,t,1,1,`cannot read file: ${r.code??r.message}`)),{root:p,entry:null,files:s,order:a,diagnostics:o}}return v(f,t,[f]),{root:p,entry:f,files:s,order:a,diagnostics:o}}function Et(t,n,e,o){let s=[t.file,t.line,t.column];if(W.isAbsolute(t.path)||!t.path.endsWith(".md")||!/^\.\.?\//.test(t.path))return o.push(A(m.CALL_PATH,...s,`CALL needs a relative path to a .md file, such as ./flow.md; got ${t.path}`)),null;let a;try{a=K(W.resolve(W.dirname(n),t.path))}catch{return o.push(A(m.CALL_MISSING,...s,`CALL target ${t.path} does not exist`)),null}if(a!==e&&!a.startsWith(e+W.sep))return o.push(A(m.CALL_OUTSIDE_ROOT,...s,`CALL target ${t.path} is outside the project root`)),null;return a}var bt=new Set(["ASK","CHECK","JUMP","SAY","END"]),x=1e4;function U(t,n,e){let o=q(t,n,e);for(let s of o.order){let a=o.files.get(s);if(a.guards=new Map,a.program.diagnostics.length===0&&a.diagnostics.length===0)o.diagnostics.push(...kt(a))}return o.diagnostics.sort(G),o.ok=!o.diagnostics.some((s)=>s.severity==="error"),o}function kt(t){let{program:n,nodes:e,edges:o,start:s,labelIndex:a}=t,{file:p,instructions:i,labels:v}=n,f=[];if(s===null)return f;let r=i.length;if(s===r){let h=v.find(($)=>$.name==="START");return f.push(A(m.FALLS_OFF_END,p,h.line,h.column,"control leaves the file without END")),f}let u=(h,$,M)=>{let k=i[h]??i[r-1]??{line:1,column:1};f.push(A($,p,k.line,k.column,M))},L=new Map(e.map((h)=>[h,[]]));for(let h of o)L.get(h.from).push(h);let g=new Set([s]),w=[s];while(w.length){let h=w.shift();if(h===r)continue;for(let $ of L.get(h)??[])if(!g.has($.to))g.add($.to),w.push($.to)}for(let h of v)if(!g.has(h.index)&&a.get(h.name)===h.index)f.push(A(m.UNREACHABLE_LABEL,p,h.line,h.column,`label ${h.name} is unreachable`));for(let h of o)if(h.to===r&&g.has(h.from))u(h.from,m.FALLS_OFF_END,"control leaves the file without END");let l=new Map;for(let h of o){if(!l.has(h.to))l.set(h.to,[]);l.get(h.to).push(h.from)}let c=e.filter((h)=>i[h].op==="END"),N=new Set(c),d=[...c];while(d.length)for(let h of l.get(d.pop())??[])if(!N.has(h))N.add(h),d.push(h);for(let h of e)if(g.has(h)&&!N.has(h))u(h,m.NO_PATH_TO_END,`no path from ${i[h].op} to END`);let E=new Map;for(let h=0;h<r;h++){let $=i[h];if($.op!=="STOP"||!$.counter)continue;if(E.has($.counter))u(h,m.DUPLICATE_LIMIT,`counter <${$.counter}> already has a limit`);else E.set($.counter,h)}let b=o.filter((h)=>!h.stop&&h.to!==r),y=$t(e,b,x);if(y===null)u(s,m.TOO_MANY_CYCLES,`more than ${x} simple cycles; split the flow`);else for(let h of y){let $=new Set(h),M=[...E.keys()].find((k)=>$.has(E.get(k))&&h.some((T)=>i[T].op==="ADD"&&i[T].counter===k));if(M===void 0){let k=Math.min(...h);u(k,m.UNCONTROLLED_CYCLE,`uncontrolled cycle through ${At(t,h)}: it needs ADD 1 to <c> and STOP ... IF <c> >= n on each repetition`);continue}for(let k=0;k<h.length;k++){let T=h[k],P=h[(k+1)%h.length];if(P>T)continue;let _=`${T}->${P}`;if(!t.guards.has(_))t.guards.set(_,new Set);t.guards.get(_).add(`<${M}> >= ${i[E.get(M)].limit}`)}}if(i.some((h)=>h.op==="STOP")&&a.has("REVIEW")&&a.has("REPLY")){let h=a.get("REVIEW"),$=a.get("REPLY"),M=(P)=>P<r&&bt.has(i[P].op)&&!i[P].answer,k=new Set,T=(P,_)=>{if(!M(P)||k.has(P))return!1;if(_||=P===$,i[P].op==="END")return _;k.add(P);let it=(L.get(P)??[]).some((Y)=>!Y.stop&&T(Y.to,_));return k.delete(P),it};if(!T(h,!1)){let P=v.find((_)=>_.name==="REVIEW");f.push(A(m.NO_STOP_MODE_PATH,p,P.line,P.column,"no path from REVIEW through REPLY to END that uses only ASK, CHECK, JUMP, SAY, and END"))}}return f}function At(t,n){let e=[];for(let o of[...n].sort((s,a)=>s-a))for(let s of t.labelAt.get(o)??[])e.push(s);return e.length?e.join(", "):`line ${t.program.instructions[Math.min(...n)].line}`}function $t(t,n,e){let o=new Map(t.map((p)=>[p,new Set]));for(let p of n)o.get(p.from)?.add(p.to);let s=[],a=[new Set(t)];while(a.length){let p=a.shift();for(let i of yt(p,o)){let v=Math.min(...i);if(i.length===1&&!o.get(v).has(v))continue;let f=new Set(i),r=new Set,u=new Map(i.map((c)=>[c,new Set])),L=[],g=!1,w=(c)=>{r.delete(c);let N=[...u.get(c)];u.get(c).clear();for(let d of N)if(r.has(d))w(d)},l=(c)=>{let N=!1;L.push(c),r.add(c);for(let d of o.get(c)){if(!f.has(d))continue;if(d===v){if(s.push([...L]),N=!0,s.length>e)g=!0}else if(!r.has(d)&&l(d))N=!0;if(g)return!0}if(N)w(c);else for(let d of o.get(c))if(f.has(d))u.get(d).add(c);return L.pop(),N};if(l(v),g)return null;if(f.delete(v),f.size)a.push(f)}}return s}function yt(t,n){let e=0,o=new Map,s=new Map,a=[],p=new Set,i=[],v=(f)=>{o.set(f,e),s.set(f,e++),a.push(f),p.add(f);for(let r of n.get(f)){if(!t.has(r))continue;if(!o.has(r))v(r),s.set(f,Math.min(s.get(f),s.get(r)));else if(p.has(r))s.set(f,Math.min(s.get(f),o.get(r)))}if(s.get(f)===o.get(f)){let r=[],u;do u=a.pop(),p.delete(u),r.push(u);while(u!==f);i.push(r)}};for(let f of[...t].sort((r,u)=>r-u))if(!o.has(f))v(f);return i}import I from"node:path";function B(t){let n=[],e=[],o=[],s=new Map(t.order.map((f,r)=>[f,`f${r}`])),a=(f,r)=>`${s.get(f)}_i${r}`,p="halt",i=!1,v=new Set;for(let f of t.order){let r=t.files.get(f),u=r.program.instructions,L={id:s.get(f),title:I.relative(t.root,f)||I.basename(f),nodes:[]};n.push(L);let g=u.some((w)=>w.op==="STOP");i||=g;for(let w of r.nodes){let l=u[w],c=r.labelAt.get(w)??[],N={id:a(f,w),shape:Pt(l.op),text:[...c.map((d)=>`${d}:`),Mt(l)].join(`
`)};if(L.nodes.push(N),e.push(N),l.op==="CALL"){let d=t.files.get(l.resolved);o.push({from:N.id,to:a(l.resolved,d.start),label:"call",style:"solid"});for(let E of d.nodes)if(d.program.instructions[E].op==="END")o.push({from:a(l.resolved,E),to:a(f,w+1),label:"return",style:"dotted"}),v.add(w)}if(l.op==="END"&&g)o.push({from:N.id,to:"halt",label:"after STOP",style:"dotted"})}for(let w of r.edges){if(v.has(w.from)&&w.to===w.from+1)continue;let l=r.guards.get(`${w.from}->${w.to}`),c=[w.label,l&&`back edge ${[...l].sort().join(", ")}`].filter(Boolean).join("; ");o.push({from:a(f,w.from),to:a(f,w.to),label:c,style:w.stop?"thick":w.implicit?"dotted":"solid"})}}if(i)e.push({id:"halt",shape:"hexagon",text:"waiting_human"});return{clusters:n,nodes:e,edges:o,humanId:i?"halt":null}}function Pt(t){if(t==="ASK")return"diamond";if(t==="END")return"terminal";if(t==="CALL")return"subroutine";return"box"}function Mt(t){switch(t.op){case"ASK":case"DO":case"CHECK":case"SAY":return`${t.op} ${t.text}`;case"JUMP":return`JUMP ${t.target}`;case"WRITE":return`WRITE ${t.path} "${t.description}"`;case"ADD":return`ADD 1 to <${t.counter}>`;case"STOP":return`STOP ${t.text} IF ${t.counter?`<${t.counter}> >= ${t.limit}`:t.answer}`;case"CALL":return`CALL ${t.path}`;default:return t.op}}var C=(t)=>t.replace(/&/g,"#amp;").replace(/"/g,"#quot;").replace(/</g,"#lt;").replace(/>/g,"#gt;").replace(/\|/g,"#124;").replace(/`/g,"'").replace(/\n/g,"<br/>");function J(t){let n={diamond:["{","}"],terminal:["([","])"],subroutine:["[[","]]"],box:["[","]"],hexagon:["{{","}}"]},e=(a)=>{let[p,i]=n[a.shape];return`${a.id}${p}"${C(a.text)}"${i}`},o={solid:"-->",dotted:"-.->",thick:"==>"},s=["flowchart TD"];for(let a of t.clusters){s.push(`  subgraph ${a.id}["${C(a.title)}"]`);for(let p of a.nodes)s.push(`    ${e(p)}`);s.push("  end")}if(t.humanId)s.push(`  ${e(t.nodes.find((a)=>a.id===t.humanId))}`);for(let a of t.edges)s.push(`  ${a.from} ${o[a.style]}${a.label?`|"${C(a.label)}"|`:""} ${a.to}`);return s.join(`
`)+`
`}var S=(t)=>t.replace(/\\/g,"\\\\").replace(/"/g,"\\\"").replace(/\n/g,"\\n");function et(t){let n={diamond:"diamond",terminal:"oval",subroutine:"box3d",box:"box",hexagon:"hexagon"},e={solid:"solid",dotted:"dashed",thick:"bold"},o=["digraph lnl {",'  node [fontname="monospace"];'],s=(a)=>`"${a.id}" [shape=${n[a.shape]}, label="${S(a.text)}"];`;for(let a of t.clusters){o.push(`  subgraph "cluster_${a.id}" {`,`    label="${S(a.title)}";`);for(let p of a.nodes)o.push(`    ${s(p)}`);o.push("  }")}if(t.humanId)o.push(`  ${s(t.nodes.find((a)=>a.id===t.humanId))}`);for(let a of t.edges)o.push(`  "${a.from}" -> "${a.to}" [style=${e[a.style]}${a.label?`, label="${S(a.label)}"`:""}];`);return o.push("}"),o.join(`
`)+`
`}var Tt=(t,n)=>t.length>n?t.slice(0,n-1).trimEnd()+"…":t,tt=(t,n=32)=>t.split(" ").reduce((e,o)=>{let s=e[e.length-1];if(s!==void 0&&(s+" "+o).length<=n)e[e.length-1]=s+" "+o;else e.push(o);return e},[]).join(`
`);function ot(t){let n=["flowchart TD","  classDef stop fill:#fdd,stroke:#c00,color:#900","  classDef human fill:#ffd,stroke:#a80","  classDef label fill:#eef,stroke:#669"],e=!1,o=t.order.length>1;if(t.order.forEach((s,a)=>{let p=t.files.get(s),i=p.program.instructions,v=(d)=>`f${a}_${d}`,f=(d)=>!d.stop,r=new Map,u=new Map;for(let d of p.edges.filter(f)){if(!r.has(d.from))r.set(d.from,[]);r.get(d.from).push(d),u.set(d.to,(u.get(d.to)??0)+1)}let L=(d)=>i[d]?.op==="STOP"&&!i[d].counter,g=(d)=>d<i.length&&i[d].op!=="ASK"&&!L(d),w=new Map,l=[];for(let d of p.nodes){if(w.has(d))continue;let E=[d];w.set(d,d);let b=d;while(g(b)&&i[b].op!=="END"&&i[b].op!=="JUMP"&&i[b].op!=="CALL"){let y=r.get(b)??[];if(y.length!==1)break;let h=y[0].to;if(!g(h)||p.labelAt.has(h)||u.get(h)!==1||w.has(h))break;E.push(h),w.set(h,d),b=h}l.push(E)}let c=new Set(l.filter((d)=>!p.labelAt.has(d[0])&&d.every((E)=>i[E].op==="JUMP")).map((d)=>d[0])),N=(d)=>{let E=new Set;while(c.has(d)&&!E.has(d))E.add(d),d=r.get(d)?.[0]?.to??d;return d};if(o)n.push(`  subgraph f${a}["${C(I.relative(t.root,s)||I.basename(s))}"]`);for(let d of l){if(c.has(d[0]))continue;let E=i[d[0]],b=(p.labelAt.get(d[0])??[]).join(" ");if(E.op==="ASK"){n.push(`  ${v(d[0])}{"${C((b?`${b}: `:"")+tt(E.text))}"}`);continue}if(L(d[0])){n.push(`  ${v(d[0])}(("STOP")):::stop`);continue}let y=[];for(let M of d){let k=i[M];if(k.op==="JUMP")continue;let T=y[y.length-1];if(k.op==="CHECK"&&T?.op==="CHECK")T.n++;else y.push({op:k.op,n:1,text:k.op==="STOP"?`■ STOP <${k.counter}> >= ${k.limit}`:_t(k)})}let h=y.map((M)=>M.op==="CHECK"&&M.n>1?`${M.n}× CHECK`:tt(M.text,40)).join(`
`),$=[b,h].filter(Boolean).join(`
`);if(n.push(`  ${v(d[0])}[["${C($)}"]]`.replace('[["',E.op==="CALL"?'[["':'["').replace("]]",E.op==="CALL"?"]]":"]")),b)n.push(`  class ${v(d[0])} label`)}for(let d of p.edges.filter(f)){if(w.get(d.to)!==d.to||c.has(w.get(d.from)))continue;if(d.to>=i.length)continue;let E=w.get(d.from);if(i[E].op!=="ASK"&&d.from!==l.find((M)=>M[0]===E).at(-1))continue;let b=N(d.to),y=b<=d.from,h=p.guards?.get(`${d.from}->${d.to}`),$=[i[E].op==="ASK"?d.label:"",y&&"back",h&&[...h].sort().join(", ")].filter(Boolean).join(" · ");n.push(`  ${v(E)} ${y?"-.->":"-->"}${$?`|"${C($)}"|`:""} ${v(b)}`)}for(let d of i){if(d.op!=="CALL"||!d.resolved)continue;let E=t.order.indexOf(d.resolved),b=t.files.get(d.resolved);n.push(`  ${v(i.indexOf(d))} -->|call| f${E}_${b.start}`)}if(o)n.push("  end");if(i.some((d)=>d.op==="STOP")){e=!0;for(let d of p.nodes)if(i[d].op==="END")n.push(`  ${v(w.get(d))} -.->|after STOP| halt`)}}),e)n.push('  halt{{"waiting_human"}}:::human');return n.join(`
`)+`
`}function _t(t){switch(t.op){case"ADD":return`ADD 1 to <${t.counter}>`;case"WRITE":return`WRITE ${t.path}`;case"CALL":return`CALL ${t.path}`;case"END":return"END";default:return`${t.op} ${Tt(t.text??"",120)}`}}function nt(t){return t.order.map((n)=>{let e=t.files.get(n),{instructions:o,labels:s,source:a}=e.program,p=V(a),i=[...new Set([...s.map((L)=>L.line),...o.map((L)=>L.line)])].sort((L,g)=>L-g),v=new Map(i.map((L,g)=>[L,g])),f=new Map(s.map((L)=>[L.name,L.line])),r=[];for(let L of o){let g=L.op==="JUMP"?L.target:L.op==="STOP"?"REVIEW":null;if(!g||!f.has(g))continue;let w=v.get(L.line),l=v.get(f.get(g));r.push({from:w,to:l,label:g,stop:L.op==="STOP",back:l<=w})}let u=[];for(let L of[...r].sort((g,w)=>g.stop-w.stop||Math.abs(g.from-g.to)-Math.abs(w.from-w.to)||g.from-w.from)){let g=Math.min(L.from,L.to),w=Math.max(L.from,L.to),l=0;while(u[l]?.some(([c,N])=>!(w<c||g>N)))l++;(u[l]??=[]).push([g,w]),L.lane=l}return{file:I.relative(t.root,n)||I.basename(n),rows:i.map((L)=>({line:L,text:p[L-1],label:s.find((g)=>g.line===L)?.name??null})),jumps:r}})}import{createServer as Vt}from"node:http";import{readFileSync as It,writeFileSync as Wt,realpathSync as Ut}from"node:fs";import{createHash as Ct}from"node:crypto";function at(t){let n=V(t),e=z(n);if(e.error)return{error:e.error,line:e.line,rows:[],blockStart:1,digest:O(t)};return{rows:n.slice(e.open+1,e.close),blockStart:e.open+2,digest:O(t)}}function Z(t,n){let e=t.split(`
`),o=z(V(t));if(o.error)throw Error(o.error);let s=(f)=>f.endsWith("\r")?`\r
`:`
`,a=s(e[o.open]),p=(f)=>{let r=e[o.open+1+f];if(r===void 0||o.open+1+f>=o.close)return a;return(r.endsWith("\r")?r.slice(0,-1):r)===n[f]?s(r):a},i=e.slice(0,o.open+1).join(`
`)+`
`,v=e.slice(o.close).join(`
`);return i+n.map((f,r)=>f+p(r)).join("")+v}var O=(t)=>Ct("sha256").update(t).digest("hex");function st(t){let n=[],e=[],o=null;for(let s of t){let a=j(s);if(a.kind==="label")o={label:a.name,row:s,rows:[]},n.push(o);else if(o)o.rows.push(s);else e.push(s)}return{header:e,sections:n}}var dt=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>lnl edit</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 0; display: grid; grid-template-rows: auto 1fr; height: 100vh; }
  header { display: flex; gap: .6rem; align-items: center; padding: .4rem 1rem; border-bottom: 1px solid #ddd; }
  header .file { font-family: monospace; flex: 1; }
  main { display: grid; grid-template-columns: 1fr 22rem; overflow: hidden; }
  #views { position: relative; overflow: hidden; }
  #rete { height: 100%; background: #f4f4f6; }
  #blocks, #listing { position: absolute; inset: 0; overflow: auto; background: #fff; }
  #blocks { padding: 1rem; box-sizing: border-box; }
  #blocks svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
  .views button[aria-pressed=true] { background: #335; color: #fff; }
  .stale { padding: 1rem; color: #a00; font-family: monospace; }
  .lst { display: flex; font: 12px/20px ui-monospace, monospace; }
  .lst svg { flex: none; }
  .lst svg path { fill: none; stroke: #8a9bb5; stroke-width: 1.4; }
  .lst svg path.back { stroke: #9b59c9; }
  .lst svg path.stop { stroke: #d99; stroke-dasharray: 3 3; }
  .lst svg path.on { stroke: #e08a00 !important; stroke-width: 3; stroke-dasharray: none; }
  .lst .rows { flex: 1; min-width: 0; }
  .lst .row { display: flex; gap: 10px; height: 20px; white-space: pre; padding-right: 10px; }
  .lst .row:hover { background: #f2f4f8; }
  .lst .row.hit { background: #fff3c4; }
  .lst .row.lab { border-top: 1px solid #e3e3e8; font-weight: bold; }
  .lst .ln { color: #999; width: 34px; text-align: right; flex: none; }
  .lst .code { overflow: hidden; text-overflow: ellipsis; }
  .lst .xref { margin-left: auto; color: #999; font-size: 11px; }
  .lst a { color: #1a5fb4; cursor: pointer; text-decoration: none; }
  .lst a:hover { text-decoration: underline; }
  .lst .op-ASK { color: #b06d00; } .lst .op-JUMP { color: #1a5fb4; } .lst .op-STOP { color: #c00; }
  .lst .op-CHECK { color: #08779b; } .lst .op-END, .lst .op-SAY { color: #2a7d2a; } .lst .op-CALL { color: #7a3fb0; }
  .lst h4 { margin: .6rem 0 .2rem 1rem; font: bold 12px monospace; color: #555; }
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
  <span class="views">
    <button data-view="rete" aria-pressed="true">Nodes</button>
    <button data-view="blocks" aria-pressed="false">Blocks</button>
    <button data-view="listing" aria-pressed="false">Listing</button>
  </span>
  <label title="draw the jump of each STOP to REVIEW in Listing"><input type="checkbox" id="stops"> STOP→REVIEW</label>
  <span id="status"></span>
  <button id="add">+ label</button>
  <button id="arrange">Arrange</button>
  <button id="reload">Reload</button>
  <button id="save">Save</button>
</header>
<main>
  <div id="views">
    <div id="rete"></div>
    <div id="blocks" hidden></div>
    <div id="listing" hidden></div>
  </div>
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
    <p>Nodes edits; Blocks (Ctrl+wheel zooms) and Listing show the last valid lint. In Listing, hover a row or an arrow to trace it, click a target or an arrow to follow it, Alt+← to go back.</p>
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
  const a = await r.json();
  mark(a.diagnostics);
  setViews(a);
}
async function take(doc) {
  Object.assign(state, { file: doc.file, rows: doc.rows, header: doc.header, blockStart: doc.blockStart, digest: doc.digest, dirty: false, disk: null });
  $('file').textContent = state.file;
  $('header-rows').value = doc.header.join('\\n');
  $('conflict').hidden = true;
  await show(doc);
  generate();
  mark(doc.diagnostics);
  setViews(doc);
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
// View modes. state.view is the shown one; state.views holds what the server derived.
state.view = 'rete';
state.views = { blocks: null, listing: null, drawn: '' };
let mermaid = null;
function setViews(a) {
  if (a.blocks !== undefined) { state.views.blocks = a.blocks; state.views.listing = a.listing; state.views.drawn = ''; }
  drawView();
}
async function drawView() {
  const v = state.view;
  if (v === 'rete' || state.views.drawn === v) return;
  state.views.drawn = v;
  const el = $(v);
  if (v === 'blocks') {
    if (!state.views.blocks) { el.innerHTML = '<div class="stale">The flow has errors: fix them in Nodes to draw Blocks.</div>'; return; }
    mermaid ??= (await import('${"https://esm.sh"}/mermaid@11.4.1')).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', themeVariables: { fontSize: '12px' }, flowchart: { htmlLabels: true, nodeSpacing: 25, rankSpacing: 30 } });
    const { svg } = await mermaid.render('lnl-blocks', state.views.blocks);
    el.innerHTML = svg;
    zoom(el, Math.min(1, (el.clientWidth - 32) / el.querySelector("svg").viewBox.baseVal.width));
  } else {
    if (!state.views.listing) { el.innerHTML = '<div class="stale">The flow has errors: fix them in Nodes to draw Listing.</div>'; return; }
    drawListing(el, state.views.listing);
  }
}
// Ctrl+wheel zooms the block diagram; the panel scrolls it.
let scale = 1;
function zoom(el, to) {
  scale = Math.min(3, Math.max(0.2, to));
  const svg = el.querySelector('svg');
  if (!svg) return;
  const w = svg.viewBox.baseVal.width;
  svg.style.width = w * scale + 'px';
  svg.style.maxWidth = 'none';
}
$('blocks').addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoom($('blocks'), scale * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// One file of the listing: an SVG jump column beside the rows. A jump runs from the
// row that transfers to the row of its label; its lane is the distance from the text.
function drawListing(el, files) {
  const R = 20, L = 11, NS = 'http://www.w3.org/2000/svg';
  el.innerHTML = '';
  files.forEach((f, fi) => {
    const lanes = Math.max(0, ...f.jumps.map((j) => j.lane + 1));
    const W = lanes * L + 14;
    const refs = f.rows.map(() => []);
    f.jumps.forEach((j, k) => refs[j.to].push(k));
    const rowId = (r) => 'L' + fi + '_' + r;
    const html = f.rows.map((row, r) => {
      const code = row.text.replace(/\\s;.*$/, '');
      let body = esc(code).replace(/^(\\s*)([A-Z]+)(?=\\s|$)/, (m, sp, op) => sp + '<span class="op-' + op + '">' + op + '</span>');
      for (const k of f.jumps.keys()) {
        const j = f.jumps[k];
        if (j.from !== r) continue;
        if (j.stop) body += ' <a data-go="' + j.to + '" data-j="' + k + '" class="op-STOP">→ ' + j.label + '</a>';
        else body = body.replace(new RegExp('\\\\b' + j.label + '\\\\b(?![^<]*>)'), '<a data-go="' + j.to + '" data-j="' + k + '">' + j.label + '</a>');
      }
      const xr = row.label && refs[r].length ? '<span class="xref">from ' + refs[r].map((k) => '<a data-go="' + f.jumps[k].from + '">' + f.rows[f.jumps[k].from].line + '</a>').join(' ') + '</span>' : '';
      return '<div class="row' + (row.label ? ' lab' : '') + '" id="' + rowId(r) + '" data-r="' + r + '"><span class="ln">' + row.line + '</span><span class="code">' + body + '</span>' + xr + '</div>';
    }).join('');
    const box = document.createElement('div');
    if (files.length > 1) box.insertAdjacentHTML('beforeend', '<h4>' + esc(f.file) + '</h4>');
    const lst = document.createElement('div');
    lst.className = 'lst';
    lst.innerHTML = '<svg width="' + W + '" height="' + f.rows.length * R + '"></svg><div class="rows">' + html + '</div>';
    box.appendChild(lst);
    el.appendChild(box);
    const svg = lst.firstChild;
    const y = (r) => r * R + R / 2;
    const paths = f.jumps.map((j, k) => {
      const x = W - 8 - (j.lane + 1) * L, p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + W + ' ' + y(j.from) + 'H' + x + 'V' + y(j.to) + 'H' + (W - 1) + 'm-5 -4l5 4l-5 4');
      p.setAttribute('class', (j.back ? 'back ' : '') + (j.stop ? 'stop' : ''));
      if (j.stop && !$('stops').checked) p.style.display = 'none';
      p.dataset.stop = j.stop ? '1' : '';
      p.addEventListener('mouseenter', () => on([k]));
      p.addEventListener('mouseleave', () => on([]));
      p.addEventListener('click', () => go(j.to));
      svg.appendChild(p);
      return p;
    });
    const on = (ks) => paths.forEach((p, k) => p.classList.toggle('on', ks.includes(k)));
    const go = (r, push = true) => {
      const target = lst.querySelector('[data-r="' + r + '"]');
      if (!target) return;
      if (push) history.pushState({ lnl: target.id }, '');
      el.querySelectorAll('.hit').forEach((e) => e.classList.remove('hit'));
      target.classList.add('hit');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    lst.querySelectorAll('.row').forEach((row) => {
      const r = Number(row.dataset.r);
      row.addEventListener('mouseenter', () => on(f.jumps.flatMap((j, k) => (j.from === r || j.to === r ? [k] : []))));
      row.addEventListener('mouseleave', () => on([]));
    });
    lst.querySelectorAll('a[data-go]').forEach((a) => a.addEventListener('click', () => go(Number(a.dataset.go))));
  });
}
window.addEventListener('popstate', (e) => {
  const t = e.state?.lnl && document.getElementById(e.state.lnl);
  if (!t) return;
  $('listing').querySelectorAll('.hit').forEach((x) => x.classList.remove('hit'));
  t.classList.add('hit');
  t.scrollIntoView({ block: 'center' });
});
$('stops').addEventListener('change', (e) => $('listing').querySelectorAll('path[data-stop="1"]').forEach((p) => { p.style.display = e.target.checked ? '' : 'none'; }));
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  state.view = b.dataset.view;
  document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  for (const v of ['blocks', 'listing']) $(v).hidden = v !== state.view;
  drawView();
}));
window.addEventListener('beforeunload', (e) => { if (state.dirty) e.preventDefault(); });
load();
</script>
</body>
</html>
`;function rt(t,n,e=0){let o=Ut(t),s=()=>It(o,"utf8"),a=(r)=>{let u=U(t,n,new Map([[o,r]]));if(!u.ok)return{diagnostics:u.diagnostics,mermaid:null,blocks:null,listing:null};return{diagnostics:u.diagnostics,mermaid:J(B(u)),blocks:ot(u),listing:nt(u)}},p=(r)=>{let u=at(r),L=a(r);return{file:t,rows:u.rows,...st(u.rows),blockStart:u.blockStart,digest:u.digest,...L}},i=(r,u,L)=>{r.writeHead(u,{"content-type":"application/json; charset=utf-8"}),r.end(JSON.stringify(L))},v=(r)=>new Promise((u,L)=>{let g="";r.on("data",(w)=>g+=w),r.on("end",()=>{try{u(JSON.parse(g))}catch(w){L(w)}})}),f=Vt(async(r,u)=>{try{if(r.method==="GET"&&r.url==="/")return u.writeHead(200,{"content-type":"text/html; charset=utf-8"}),u.end(dt);if(r.method==="GET"&&r.url==="/favicon.ico")return u.writeHead(204).end();if(r.method==="GET"&&r.url==="/api/doc")return i(u,200,p(s()));if(r.method==="POST"&&r.url==="/api/check"){let{rows:L}=await v(r),g=a(Z(s(),L));return i(u,200,g)}if(r.method==="POST"&&r.url==="/api/save"){let{rows:L,digest:g}=await v(r),w=s();if(O(w)!==g)return i(u,409,p(w));let l=Z(w,L);if(l!==w)Wt(o,l);return i(u,200,p(l))}i(u,404,{error:"not found"})}catch(L){i(u,500,{error:L.message})}});return new Promise((r)=>{f.listen(e,"127.0.0.1",()=>{f.url=`http://127.0.0.1:${f.address().port}/`,r(f)})})}var R=`usage:
  lnl lint <entry.md> [--format text|json] [--root <dir>]
  lnl graph <entry.md> --format mermaid|dot [--root <dir>]
  lnl edit <entry.md> [--root <dir>] [--port <n>]`;async function Jt(t,n,e){let[o,...s]=t,a;try{a=Ht({args:s,allowPositionals:!0,options:{format:{type:"string"},root:{type:"string"},port:{type:"string"}}})}catch(g){return e.write(`${g.message}
${R}
`),2}let{positionals:p,values:i}=a;if(!["lint","graph","edit"].includes(o)||p.length!==1)return e.write(`${R}
`),2;if(o==="edit")return Ot(p[0],i,n,e);let v=o==="lint"?["text","json"]:["mermaid","dot"],f=i.format??(o==="lint"?"text":void 0);if(!v.includes(f))return e.write(`--format must be ${v.join("|")}
${R}
`),2;let r=U(p[0],i.root),u=r.diagnostics.some((g)=>g.code===m.FILE_ACCESS)?2:r.ok?0:1;if(o==="lint"){if(f==="json")n.write(JSON.stringify({diagnostics:r.diagnostics},null,2)+`
`);else for(let g of r.diagnostics)n.write(H(g)+`
`);return u}for(let g of r.diagnostics)e.write(H(g)+`
`);if(u!==0)return u;let L=B(r);return n.write(f==="mermaid"?J(L):et(L)),0}async function Ot(t,n,e,o){let s=n.port===void 0?0:Number(n.port);if(!Number.isInteger(s)||s<0||s>65535)return o.write(`--port must be an integer between 0 and 65535
${R}
`),2;let a=U(t,n.root);if(a.diagnostics.some((i)=>i.code===m.FILE_ACCESS)){for(let i of a.diagnostics)o.write(H(i)+`
`);return 2}let p=await rt(t,n.root,s);return e.write(`lnl edit: ${p.url}
`),await new Promise((i)=>p.on("close",i)),0}if(process.argv[1]&&import.meta.url===Bt(zt(process.argv[1])).href)process.exitCode=await Jt(process.argv.slice(2),process.stdout,process.stderr);export{Jt as main};
