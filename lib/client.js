/**
 * Claude Style — Claude Code Desktop theme for the DeepSeek Harness web GUI.
 * GENERATED FILE — do not edit. Source lives in packages/client/src/; `npm run build` bundles it.
 */
window.__ModuleLoader__.load({
  id: "dsh-claude-style",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
"use strict";var ih=Object.create;var na=Object.defineProperty;var dh=Object.getOwnPropertyDescriptor;var ch=Object.getOwnPropertyNames;var uh=Object.getPrototypeOf,hh=Object.prototype.hasOwnProperty;var ph=(e,t)=>{for(var n in t)na(e,n,{get:t[n],enumerable:!0})},Ir=(e,t,n,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of ch(t))!hh.call(e,o)&&o!==n&&na(e,o,{get:()=>t[o],enumerable:!(a=dh(t,o))||a.enumerable});return e};var Se=(e,t,n)=>(n=e!=null?ih(uh(e)):{},Ir(t||!e||!e.__esModule?na(n,"default",{value:e,enumerable:!0}):n,e)),mh=e=>Ir(na({},"__esModule",{value:!0}),e);var Y0={};ph(Y0,{apply:()=>j0});module.exports=mh(Y0);var Fr=Object.freeze({brand:"claude",motion:"system",collapseFooter:!0,autoPopover:"all",composerScope:"all",modelPicker:!0,quickProviders:[],username:"",banLocale:"en",homeLayout:"studio",palette:"claude",typeface:"claude",mascot:"brand",mascotScope:"all",permissionsControl:!0,workspaceView:!0,sidebarSearch:!0,turnStatus:!0,turnNav:!0,viewTabs:!0,headerBand:!0,chatAnimations:!0,caretMotion:"typing"});var qt="/dsh-claude-style",Ao=`${qt}/username`,xo=`${qt}/hdsl`,Ct=`${qt}/hdsl-skin.png`,ko=`${qt}/session-delete`,Eo=`${qt}/usage`,aa=`${qt}/session-search`;var yn="dsh-claude-style-style",Nr="ui-skin-claude-style",mt="dsh-claude-style",zr=`${mt}/client.css`,Br=`${mt}/foreign-sheet`,Co="plugins.bundle.config",oa="settings.section",sa="claude",jt="deepseek",Dr="off",To="data-dsh-claude-brand",So="system",Tt="reduced",St="full",fh=[So,Tt,St],Yt="data-dsh-claude-motion",Kt="off",vn="move",Ro="typing",gh=[Kt,vn,Ro],_o="claude",Mo="host",bh=[_o,Mo],Lo="data-dsh-claude-palette",Ho="claude",Oo="host",yh=[Ho,Oo],Po="data-dsh-claude-typeface",wn="brand",Rt="crab",_t="deepy",ra="off",vh=[wn,Rt,_t,ra],Io="data-dsh-claude-mascot",Fo="home",An="all",wh=[Fo,An],Vr={permissionsControl:!0,workspaceView:!0,sidebarSearch:!0,turnStatus:!0,turnNav:!0,viewTabs:!0,headerBand:!0,chatAnimations:!0},No="data-dsh-claude-chat-follow",zo="data-dsh-claude-stream-glide",la="data-dsh-claude-chat-reveal",Qt="data-dsh-claude-send-flight",Ue="data-dsh-claude-quiet",Bo="data-dsh-claude-rolling",Mt="data-dsh-claude-caret",Ur="data-dsh-claude-caret-layer",Do="data-dsh-claude-caret-visible",Vo="data-dsh-claude-caret-host",Uo="data-dsh-claude-chat-fold",ia="data-dsh-claude-footer-takeover",Go="en",xn="zh",Ah=[Go,xn],kn="data-dsh-claude-composer-active",En="data-dsh-claude-composer-hidden",Wo="data-dsh-claude-permissions",qo="data-dsh-claude-session-stats",Gr="data-dsh-claude-account-menu",Cn="data-dsh-claude-account-armed",da="data-dsh-claude-account-ready",jo="data-dsh-claude-hero-menu",ca="data-dsh-window-blur",Yo="data-dsh-claude-style-handoff",Ko="data-dsh-skin",Qo="data-dsh-claude-settings-scroller",ua="data-dsh-claude-home-layout",Xt="data-dsh-claude-home-hero",Xo="classic",ze="studio",xh=[Xo,ze],kh="all",Eh=["off","hero","conversation",kh],Ge="off",$o="account",Ee="all",Wr=[Ge,$o,Ee],ft=Fr,Jo={motion:fh,composerScope:Eh,banLocale:Ah,homeLayout:xh,palette:bh,typeface:yh,mascot:vh,mascotScope:wh,caretMotion:gh},it=64,qr=64,jr=128;var Yr="[data-chat-flow-key]",je="[data-chat-flow]",Kr="[data-chat-call-id]",et='[data-variant="think"]',gt="running",We="[data-streaming]",Qr="data-streaming",Zo="data-shimmer",es="data-text-shimmer",Tn=`[${Zo}], [${es}]`,Ie="[data-conversation-scroll]",ha="data-chat-following-tail",ts="[data-chat-following-tail]",Lt=25;var $t="[data-composer-seat]",Jt="[data-composer-input]",dt="[data-composer-card]",Xr="[data-input-scroll]",pa="[data-submission-echo]",$r="[data-composer-seat] textarea",bt="[data-step-process]",tt="[data-step-process-body]",Jr="[data-step-process-content]",Sn="data-group-expanded-mode",Rn="data-chat-turn",ma="user",Ht="data-chat-flow-kind",Zr=`${Ie} nav[class*="_frame"]`,ns=':scope > [class*="_scroller"]',el="button[data-index]",fa='button[data-index][aria-current="true"]',ga=10,as=6;var tl="button[data-turn-process]",os="[data-disclosure-row]",ss="[aria-expanded]",rs="[data-turn-process], [data-turn-trigger]",nl='[data-phase="active"] [data-conversation-session]',al="data-conversation-session",_n="data-phase",ol='[class*="_composerStack"]',sl="[data-composer-placeholder]",rl="[data-composer-stats]",ba="[data-composer-stat]",ll="data-composer-variant",il='[data-slot="conversation.input.permission"] button:not([class*="dsh-claude"])',Mn='button[aria-haspopup="dialog"]',dl='[class*="footArea"]';var cl='[role="dialog"][aria-modal="true"], [role="menu"]',ya='[role="menu"]';var ul='[class*="settingsArea"] button[aria-haspopup="dialog"]',ls='[class*="footerActions"]';var hl='[class*="titleRow"]',is='[class*="_crumbs"]',ds='[class*="headerUtilities"]',pl='[class*="headerCorner"]',ml='[class*="_header"]',fl='[class*="_tabs"]',va="data-windows-titlebar",gl="[data-windows-menu]";var bl="data-fullscreen",yl="--dsh-frame-top-clearance";var vl="data-ds-dark-theme",wl='style[data-plugin-css="dsh-plugin-msg-nav/style.css"]',Al="style:not([data-plugin])";var Ye="deepseek-official",xl="/dsh-claude-style/model-descriptions.json";var kl="Select model",El="Loading models…",cs="No models available.",wa="Reasoning effort",Aa="Default",Cl="Faster",Tl="Smarter";var Sl="More models",Rl="Select model, currently {model}";function qe(e,...t){for(let n of e.slice())if(e.includes(n))try{n(...t)}catch(a){reportError(a)}}var ct=Vl({}),Zt=[],Pt=null,xa=null,Ot=null,us=!1;function Ch(e){let t=e?.fiber?.entry?.id;return[typeof t=="string"&&t!==""?t.slice(t.lastIndexOf(":")+1):null,mt,Nr]}function Th(e,t){let n=e.describe?.()?.getSnapshot?.()?.view?.namespaces;if(!n)return null;for(let a of t)if(!(typeof a!="string"||a==="")&&n.some(o=>o?.ns===a))return a;return null}function Sh(e){let t=e?.get("configForms");return typeof t?.get=="function"?t:null}function Ml(){let e=Pt?.getSnapshot();return e?.status!=="ready"?null:e.value&&typeof e.value=="object"?e.value:null}function Ll(e,t){let n=Th(e,Ch(t));if(n===null)return!1;let a=e.get(n);return typeof a?.getSnapshot!="function"?!1:(Pt=a,typeof a.subscribe=="function"&&(xa=a.subscribe(en)),!0)}function Rh(e,t){if(us)return;let n=e.describe?.();if(!n)return;us=!0;let a=()=>{Pt===null&&!Ll(e,t)||(Ot!==null&&(Ot(),Ot=null),en())};typeof n.subscribe=="function"&&(Ot=n.subscribe(a)),typeof n.ensure=="function"&&n.ensure(),a()}function Ln(e){if(Pt===null){let t=Sh(e);if(t===null)return!1;Ll(t,e)||Rh(t,e)}return Pt===null?!1:(en(),!0)}function Hl(){xa!==null&&(xa(),xa=null),Ot!==null&&(Ot(),Ot=null),us=!1,Pt=null}var Ol=!1,hs=!1;function Pl(){Ol=!0,document.body.removeAttribute(ia)}function Il(){hs=!0,document.body.removeAttribute(kn)}function le(){return ct}function nt(e){return Zt.push(e),()=>{let t=Zt.indexOf(e);t!==-1&&Zt.splice(t,1)}}function ka(e){ct=e,document.body.setAttribute(To,e.brand),document.body.setAttribute(Lo,e.palette),document.body.setAttribute(Po,e.typeface),document.body.setAttribute(Io,Hn(e)),zl(e.motion),document.body.toggleAttribute(ia,e.collapseFooter&&!Ol),qe(Zt,e)}function Fl(){for(let e of[To,Lo,Po,Io,Yt,ia])document.body.removeAttribute(e)}function Nl(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function zl(e){let t=e===Tt||e!==St&&Nl();document.body.setAttribute(Yt,t?Tt:St)}function Bl(){let e=document.body.getAttribute(Yt);zl(ct.motion),document.body.getAttribute(Yt)!==e&&qe(Zt,ct)}function Dl(){qe(Zt,ct)}function Re(){let e=document.body.getAttribute(Yt);return e===Tt?!0:e===St?!1:Nl()}function en(){let e=Ml();e!==null&&(ka(Vl(e)),Oh(e))}function _h(e){return e===!0?Ee:e===!1?Ge:typeof e=="string"&&Wr.includes(e)?e:ft.autoPopover}function Mh(e){if(!Array.isArray(e))return[];let t=[];for(let n=0;n<e.length&&t.length<qr;n++){let a=e[n];typeof a!="string"||a===""||a.length>jr||a===Ye||t.includes(a)||t.push(a)}return t}function Lh(e){return e===jt?e:e===Dr?jt:sa}function Hn(e){return e.mascot!==wn?e.mascot:e.brand===jt?_t:Rt}function Vl(e){let t=e&&typeof e=="object"?e:{},n={};for(let a of Object.keys(ft)){let o=ft[a],s=Jo[a];typeof o=="boolean"?n[a]=t[a]!==!1:s!==void 0&&(n[a]=typeof t[a]=="string"&&s.includes(t[a])?t[a]:o)}return n.brand=Lh(t.brand),n.autoPopover=_h(t.autoPopover),n.quickProviders=Mh(t.quickProviders),n.username=typeof t.username=="string"?t.username.trim().slice(0,it):"",n}var Hh={username:"dsh-claude-style.username",banLocale:"dsh-claude-style.banLocale"},_l=!1;function Oh(e){if(!_l){_l=!0;for(let[t,n]of Object.entries(Hh)){let a=localStorage.getItem(n);if(a===null)continue;let o=e[t]!==void 0&&e[t]!==ft[t],s=Jo[t],l=a===""||a===ft[t]||s!==void 0&&!s.includes(a);if(o||l){localStorage.removeItem(n);continue}Ea({[t]:a}).then(r=>{r!==null&&r[t]===a&&localStorage.removeItem(n)})}}}function Ea(e){let t=Pt;if(Ml()===null||t===null)return Promise.resolve(null);let n=o=>s=>{if(s===!1)return!1;let l;try{l=t.set(o,e[o])}catch{return!1}return typeof l=="boolean"||l===void 0?typeof l=="boolean"?l:!0:l.then(r=>r===!0)},a=Promise.resolve(!0);for(let o of Object.keys(e))a=a.then(n(o));return a.then(o=>(en(),o===!1?null:ct))}function U(e,t,n){let a=document.createElement(e);return t&&(a.className=t),n!=null&&(a.textContent=n),a}function ye(e,t,n){e.getAttribute(t)!==n&&e.setAttribute(t,n)}function fe(e,t){return e==null||typeof e.closest!="function"?null:e.closest(t)}function Ae(e){let t=null;function n(a,o=""){t!==null&&t!==a&&t.removeAttribute(e),t=a,a!==null&&ye(a,e,o)}return{mark:n,current:()=>t,release:()=>n(null)}}function On(e,t){let n=!1,a=[];function o(){n||(n=!0,fetch(e,{credentials:"same-origin"}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}).then(r=>{let g=t(r);g!==void 0&&qe(a,g)},()=>{}))}function s(r){return a.push(r),()=>{let g=a.indexOf(r);g!==-1&&a.splice(g,1)}}function l(){n=!1}return{load:o,onLoaded:s,reset:l}}function _a(){return document.querySelector(il)}function ut(){return document.querySelector(dl)}var Ca=dt,Ul=sl;function Ma(){return document.querySelectorAll(Ca)}function Gl(){return document.querySelector(Ca)}function La(e,t){return t===void 0?fe(e,Ca):fe(e,`${Ca}[${ll}="${t}"]`)}function Wl(){return document.querySelectorAll(Ul)}function Ha(e){return e.querySelector(Ul)}function ql(){let e=document.querySelector(rl);if(e!==null)return e;let t=document.querySelector(ba);return t===null?null:t.parentElement}function jl(e=document){return e.querySelector(Jt)}function Oa(e=document){return e.querySelector($t)}function Yl(){return document.querySelector(Ie)}function Kl(){return document.querySelectorAll(je)}function Ql(e){return e.querySelector(tl)}var Xl=al,Ph=`[${Xl}]`;function Ke(){return document.querySelector(nl)}function Pa(e){return fe(e,Ph)}function Qe(e){if(e==null)return null;let t=e.getAttribute(Xl);return typeof t=="string"?t:null}var tn=ol;function Pn(e,t){let a=e.get("uiSession")?.current?.value;return typeof a?.key=="string"?a.key:t.list.getSnapshot().current}function Ia(e){let t=e.get("sessions");if(t==null)return null;let n=Pn(e,t);if(n==null)return null;let a=t.binding(n);return a==null||a.session===void 0?null:a.session}function nn(e,t){let n=e.get("uiConversation"),a=e.get("sessions");return!n||!a?.binding(t)?null:n.binding(t).target("chat")??null}function Fa(e,t){let n=t.steps.length===0?void 0:t.steps[t.steps.length-1],a=n===void 0?void 0:n.data.get("assistant-step");if(a!==void 0&&a.status==="running"){let s=a.blocks;return{kind:"assistant",assistant:a,newest:s.length===0?null:s[s.length-1].kind}}let o=e.legacy?.runningCalls??[];for(let s=0;s<o.length;s++)if(o[s].turn===t.turn)return{kind:"tools"};return null}function ms(e){let t=e.projections?.faceOf("permissions").getSnapshot();return t==null?null:typeof t=="object"&&"currentValue"in t?t.currentValue:typeof t=="string"?t:null}var Ta="",Sa="";function $l(e,t){Ta=typeof e=="string"?e.trim():"",Sa=typeof t=="string"?t:""}var It="",Jl="dsh-claude-style.probed-username",ps=Ih();function Ih(){return localStorage.getItem(Jl)||""}function Fh(e){e&&localStorage.setItem(Jl,e)}var fs=On(Ao,e=>{if(!(!e||e.ok!==!0||typeof e.username!="string"))return It=e.username.trim().slice(0,it),It&&(ps=It,Fh(It)),It});function Zl(e){return fs.onLoaded(e)}function ei(){fs.load()}var gs=!1,Ra="",bs=!1,ys=On(xo,e=>{if(!(!e||e.ok!==!0||e.contract!==!0))return gs=!0,Ra=typeof e.name=="string"?e.name.trim().slice(0,it):"",bs=e.hasSkinImage===!0,!0});function ti(e){return ys.onLoaded(e)}function ni(){ys.load()}function vs(){let e=le().username;return e||Ta||Ra||ps||It}function Ft(){return vs()||"User"}function ai(){return Sa||(gs&&bs?Ct:"")}var ws=null;function As(e){ws=e,fs.reset(),It="",ys.reset(),gs=!1,Ra="",bs=!1,Ta="",Sa=""}var ie=null,oi=On(xl,e=>{let t=Nh(e);if(t!==null)return ie=t,ie});function za(e){return oi.onLoaded(e)}function an(){oi.load()}function Nh(e){if(!e||typeof e!="object")return null;let t=r=>r&&typeof r=="object"?r:{},n=t(e.exact),a=t(e.brands),o={ui:t(e.ui),settings:t(e.settings),ban:t(e.ban),exact:n,aliases:t(e.aliases),fallback:typeof e.fallback=="string"&&e.fallback?e.fallback:"en",folded:{},foldedAliases:{},families:[],tiers:[],providerBrands:t(a.providers),brandRules:[]};for(let r in n)o.folded[In(r)]=n[r];for(let r in o.aliases)o.foldedAliases[In(r)]=o.aliases[r],o.foldedAliases[r.toLowerCase()]=o.aliases[r];let s=r=>{let g=[];for(let c=0;c<(r||[]).length;c++){let u=r[c];!u||typeof u.match!="string"||g.push({re:new RegExp(u.match,"i"),key:u.key,text:u.text})}return g};o.families=s(e.families),o.tiers=s(e.tiers);let l=[];for(let r=0;r<(a.models||[]).length;r++){let g=a.models[r];!g||typeof g.match!="string"||typeof g.brand!="string"||l.push({re:new RegExp(g.match,"i"),brand:g.brand})}return o.brandRules=l,o}function In(e){return String(e??"").toLowerCase().replace(/[^a-z0-9]/g,"")}var Nt=[],on=null;function zh(e){let t=e.target instanceof Element?e.target:e.target.parentElement;if(t!==null&&t.closest("["+Ue+"]")!==null)return!0;if(e.addedNodes.length===0&&e.removedNodes.length===0)return!1;for(let n of e.addedNodes)if(!(n instanceof Element)||!n.hasAttribute(Ue))return!1;for(let n of e.removedNodes)if(!(n instanceof Element)||!n.hasAttribute(Ue))return!1;return!0}function Bh(e){return e===document||e===document.documentElement||e===document.body}function Dh(e,t){let n=e.options;if(t.type==="childList"&&n.childList!==!0||t.type==="characterData"&&n.characterData!==!0)return!1;if(t.type==="attributes"){let o=n.attributeFilter;if(n.attributes!==!0&&o===void 0||o!==void 0&&!o.includes(t.attributeName??""))return!1}let a=e.target;return t.target!==a&&(n.subtree!==!0||!a.contains(t.target)&&!(Bh(a)&&!t.target.isConnected))?!1:n.skipQuiet!==!0||!zh(t)}function si(e){for(let t of Nt.slice()){if(!Nt.includes(t))continue;let n=e.filter(a=>Dh(t,a));if(n.length!==0)try{t.callback(n)}catch(a){reportError(a)}}}function ri(){let e=on?.takeRecords()??[];if(on?.disconnect(),Nt.length===0)on=null;else{on===null&&(on=new MutationObserver(si));let t=new Map;for(let{target:n,options:a}of Nt){let o=t.get(n)??{};if(a.childList===!0&&(o.childList=!0),a.characterData===!0&&(o.characterData=!0),a.characterDataOldValue===!0&&(o.characterDataOldValue=!0),a.subtree===!0&&(o.subtree=!0),a.attributeOldValue===!0&&(o.attributeOldValue=!0),a.attributes===!0&&a.attributeFilter===void 0){o.attributes=!0,o.attributeFilter=void 0,t.set(n,o);continue}a.attributeFilter!==void 0&&!(o.attributes===!0&&o.attributeFilter===void 0)&&(o.attributeFilter=[...new Set([...o.attributeFilter??[],...a.attributeFilter])]),t.set(n,o)}for(let[n,a]of t)a.attributeFilter===void 0&&delete a.attributeFilter,on.observe(n,a)}e.length>0&&queueMicrotask(()=>si(e))}function ge(e,t,n){let a={target:e,options:t,callback:n};return Nt.push(a),ri(),()=>{let o=Nt.indexOf(a);o!==-1&&(Nt.splice(o,1),ri())}}var Vh={observer:null,subscriptions:[],watchers:new Map},li={observer:null,subscriptions:[],watchers:new Map};function ii(e){return new ResizeObserver(t=>{for(let n of e.subscriptions.slice()){if(!e.subscriptions.includes(n))continue;let a=t.filter(o=>n.targets.includes(o.target));if(a.length!==0)try{n.callback(a)}catch(o){reportError(o)}}})}function De(e,t,n){let a=n?.afterHost===!0?li:Vh,o={targets:Array.isArray(e)?[...e]:[e],callback:t};a.subscriptions.push(o);for(let s of o.targets)a.watchers.set(s,(a.watchers.get(s)??0)+1);if(a===li){a.observer?.disconnect(),a.observer=ii(a);for(let s of a.watchers.keys())a.observer.observe(s)}else{a.observer===null&&(a.observer=ii(a));for(let s of o.targets)a.watchers.get(s)>1&&a.observer.unobserve(s),a.observer.observe(s)}return()=>{let s=a.subscriptions.indexOf(o);if(s!==-1){a.subscriptions.splice(s,1);for(let l of o.targets){let r=a.watchers.get(l)-1;if(r>0){a.watchers.set(l,r);continue}a.watchers.delete(l),a.observer?.unobserve(l)}a.subscriptions.length>0||(a.observer?.disconnect(),a.observer=null)}}}var rn=[],ln=new Set,sn=0;function Uh(e){sn=0;let t=rn;rn=[];for(let n of t)if(!(n.read===void 0||!ln.has(n)))try{n.read(e)}catch(a){reportError(a)}for(let n of t)if(ln.has(n)&&(ln.delete(n),n.write!==void 0))try{n.write(e)}catch(a){reportError(a)}}function he(e){if(ln.has(e))throw new Error("frame: this task is already requested");return ln.add(e),rn.push(e),sn===0&&(sn=requestAnimationFrame(Uh)),()=>{ln.delete(e);let t=rn.indexOf(e);t!==-1&&rn.splice(t,1),rn.length===0&&sn!==0&&(cancelAnimationFrame(sn),sn=0)}}function Ba(e,t){console.error(`[dsh-claude-style] "${e}" failed and was switched off:`,t)}function di(e,t,n){let a=!1,o=null,s=!1;function l(Y){return t[Y]}function r(Y,...B){for(let _ of n){let F=l(_),W=F?.[Y];F&&typeof W=="function"&&W.apply(F,B)}}function g(){r("onActivity")}function c(Y){g();let B=Y.target;for(let _ of n){let F=l(_);!F||typeof F.owns!="function"||typeof F.close!="function"||B instanceof Node&&!F.owns(B)&&F.close("outside")}r("onPointerDown",B)}function u(Y){Y.__dshHostMenuEscape!==!0&&(g(),Y.key==="Escape"&&r("close","escape"),r("onKey",Y))}function y(Y){let B=fe(Y.target,"*");B!==null&&(La(B)!==null&&r("close","composer"),r("onFocusIn",B))}function x(Y){fe(Y.target,"[data-composer-input]")!==null&&r("onInput",Y.target)}document.addEventListener("pointerdown",c),document.addEventListener("pointermove",g,{passive:!0}),document.addEventListener("keydown",u,!0),document.addEventListener("input",x,!0),document.addEventListener("compositionend",x,!0),document.addEventListener("focusin",y,!0);function m(){r("reposition","viewport")}window.addEventListener("resize",m),window.addEventListener("scroll",m,!0);function C(){r("onCopyChange"),L()}let b=e.get("locale"),h=typeof b?.subscribe=="function"?b.subscribe(C):null,A=nt(C);en();let w=window.matchMedia("(prefers-reduced-motion: reduce)");function d(){Bl(),L()}w.addEventListener("change",d);let i=za(C),p=Zl(()=>{L()}),f=ti(()=>{L()}),v=null,k=null,E=()=>{r("reposition","composer")},T=3,R={};function N(Y){let B=l(Y);if(!B||typeof B.sync!="function")return;let _=R[Y]||0;if(!(_>=T))try{B.sync(),R[Y]=0}catch(F){if(R[Y]=_+1,_+1<T)return;Ba(Y,F),t.retire(Y)}}function L(){a||s||(a=!0,o=he({write(){if(a=!1,o=null,s)return;for(let B of n)N(B);let Y=Gl();Y!==v&&(k!==null&&k(),k=null,v=Y,v&&(k=De(v,E)))}}))}t.schedule=L;let D=ge(document.body,{childList:!0,characterData:!0,subtree:!0,attributeFilter:["aria-label","aria-selected"],skipQuiet:!0},L);L();let V=setInterval(L,6e4);return()=>{s=!0,o!==null&&o(),o=null,a=!1,clearInterval(V),window.removeEventListener("resize",m),window.removeEventListener("scroll",m,!0),h!==null&&h(),A(),w.removeEventListener("change",d),i(),p(),f(),D(),k!==null&&k(),k=null,v=null,document.removeEventListener("pointerdown",c),document.removeEventListener("pointermove",g),document.removeEventListener("keydown",u,!0),document.removeEventListener("input",x,!0),document.removeEventListener("compositionend",x,!0),document.removeEventListener("focusin",y,!0)}}var xs=`/* Generated from packages/client/src/theme/tokens.json by scripts/css.mjs; edit the JSON. */

body[data-dsh-claude-style] {
  --dsh-claude-image-claude-mark: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20148.09%20148.18'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20d%3D'm%20105.01%2C322.07%2029.14%2C-16.35%200.49%2C-1.42%20-0.49%2C-0.79%20h%20-1.42%20l%20-4.87%2C-0.3%20-16.65%2C-0.45%20-14.44%2C-0.6%20-13.99%2C-0.75%20-3.52%2C-0.75%20-3.3%2C-4.35%200.34%2C-2.17%202.96%2C-1.99%204.24%2C0.37%209.37%2C0.64%2014.06%2C0.97%2010.2%2C0.6%2015.11%2C1.57%20h%202.4%20l%200.34%2C-0.97%20-0.82%2C-0.6%20-0.64%2C-0.6%20-14.55%2C-9.86%20-15.75%2C-10.42%20-8.25%2C-6%20-4.46%2C-3.04%20-2.25%2C-2.85%20-0.97%2C-6.22%204.05%2C-4.46%205.44%2C0.37%201.39%2C0.37%205.51%2C4.24%2011.77%2C9.11%2015.37%2C11.32%202.25%2C1.87%200.9%2C-0.64%200.11%2C-0.45%20-1.01%2C-1.69%20-8.36%2C-15.11%20-8.92%2C-15.37%20-3.97%2C-6.37%20-1.05%2C-3.82%20c%20-0.37%2C-1.57%20-0.64%2C-2.89%20-0.64%2C-4.5%20l%204.61%2C-6.26%202.55%2C-0.82%206.15%2C0.82%202.59%2C2.25%203.82%2C8.74%206.19%2C13.76%209.6%2C18.71%202.81%2C5.55%201.5%2C5.14%200.56%2C1.57%20h%200.97%20v%20-0.9%20l%200.79%2C-10.54%201.46%2C-12.94%201.42%2C-16.65%200.49%2C-4.69%202.32%2C-5.62%204.61%2C-3.04%203.6%2C1.72%202.96%2C4.24%20-0.41%2C2.74%20-1.76%2C11.44%20-3.45%2C17.92%20-2.25%2C12%20h%201.31%20l%201.5%2C-1.5%206.07%2C-8.06%2010.2%2C-12.75%204.5%2C-5.06%205.25%2C-5.59%203.37%2C-2.66%20h%206.37%20l%204.69%2C6.97%20-2.1%2C7.2%20-6.56%2C8.32%20-5.44%2C7.05%20-7.8%2C10.5%20-4.87%2C8.4%200.45%2C0.67%201.16%2C-0.11%2017.62%2C-3.75%209.52%2C-1.72%2011.36%2C-1.95%205.14%2C2.4%200.56%2C2.44%20-2.02%2C4.99%20-12.15%2C3%20-14.25%2C2.85%20-21.22%2C5.02%20-0.26%2C0.19%200.3%2C0.37%209.56%2C0.9%204.09%2C0.22%20h%2010.01%20l%2018.64%2C1.39%204.87%2C3.22%202.92%2C3.94%20-0.49%2C3%20-7.5%2C3.82%20-10.12%2C-2.4%20-23.62%2C-5.62%20-8.1%2C-2.02%20h%20-1.12%20v%200.67%20l%206.75%2C6.6%2012.37%2C11.17%2015.49%2C14.4%200.79%2C3.56%20-1.99%2C2.81%20-2.1%2C-0.3%20-13.61%2C-10.24%20-5.25%2C-4.61%20-11.89%2C-10.01%20h%20-0.79%20v%201.05%20l%202.74%2C4.01%2014.47%2C21.75%200.75%2C6.67%20-1.05%2C2.17%20-3.75%2C1.31%20-4.12%2C-0.75%20-8.47%2C-11.89%20-8.74%2C-13.39%20-7.05%2C-12%20-0.86%2C0.49%20-4.16%2C44.81%20-1.95%2C2.29%20-4.5%2C1.72%20-3.75%2C-2.85%20-1.99%2C-4.61%201.99%2C-9.11%202.4%2C-11.89%201.95%2C-9.45%201.76%2C-11.74%201.05%2C-3.9%20-0.07%2C-0.26%20-0.86%2C0.11%20-8.85%2C12.15%20-13.46%2C18.19%20-10.65%2C11.4%20-2.55%2C1.01%20-4.42%2C-2.29%200.41%2C-4.09%202.47%2C-3.64%2014.74%2C-18.75%208.89%2C-11.62%205.74%2C-6.71%20-0.04%2C-0.97%20h%20-0.34%20l%20-39.15%2C25.42%20-6.97%2C0.9%20-3%2C-2.81%200.37%2C-4.61%201.42%2C-1.5%2011.77%2C-8.1%20-0.04%2C0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E");
  --dsh-claude-image-claude-word: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'177.76%2014.09%20512.22%20121.54'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20d%3D'm%20317.73%2C349.33%20c%20-18.82%2C0%20-31.69%2C-10.5%20-37.76%2C-26.66%20-3.17%2C-8.42%20-4.74%2C-17.36%20-4.61%2C-26.36%200%2C-27.11%2012.15%2C-45.94%2039%2C-45.94%2018.04%2C0%2029.17%2C7.87%2035.51%2C26.66%20h%207.72%20l%20-1.05%2C-25.91%20c%20-10.8%2C-6.97%20-24.3%2C-10.5%20-40.72%2C-10.5%20-23.14%2C0%20-42.82%2C10.35%20-53.77%2C29.02%20-5.66%2C9.86%20-8.53%2C21.07%20-8.32%2C32.44%200%2C20.74%209.79%2C39.11%2028.16%2C49.31%2010.06%2C5.37%2021.34%2C8.04%2032.74%2C7.72%2017.92%2C0%2032.14%2C-3.41%2044.74%2C-9.37%20l%203.26%2C-28.57%20h%20-7.87%20c%20-4.72%2C13.05%20-10.35%2C20.89%20-19.69%2C25.05%20-4.57%2C2.06%20-10.35%2C3.11%20-17.32%2C3.11%20z%20m%2081.18%2C-98.96%200.75%2C-12.75%20h%20-5.32%20l%20-23.7%2C7.12%20v%203.86%20l%2010.5%2C4.87%20v%2089.17%20c%200%2C6.07%20-3.11%2C7.42%20-11.25%2C8.44%20v%206.52%20h%2040.31%20v%20-6.52%20c%20-8.17%2C-1.01%20-11.25%2C-2.36%20-11.25%2C-8.44%20V%20250.4%20l%20-0.04%2C-0.04%20z%20m%20160.31%2C108.75%20h%203.11%20l%2027.26%2C-5.17%20v%20-6.67%20l%20-3.82%2C-0.3%20c%20-6.37%2C-0.6%20-8.02%2C-1.91%20-8.02%2C-7.12%20v%20-47.55%20l%200.75%2C-15.26%20h%20-4.31%20l%20-25.76%2C3.71%20v%206.52%20l%202.51%2C0.45%20c%206.97%2C1.01%209.04%2C2.96%209.04%2C7.84%20v%2042.37%20c%20-6.67%2C5.17%20-13.05%2C8.44%20-20.62%2C8.44%20-8.4%2C0%20-13.61%2C-4.27%20-13.61%2C-14.25%20v%20-39.79%20l%200.75%2C-15.26%20h%20-4.42%20l%20-25.8%2C3.71%20v%206.52%20l%202.66%2C0.45%20c%206.97%2C1.01%209.04%2C2.96%209.04%2C7.84%20v%2039.11%20c%200%2C16.57%209.37%2C24.45%2024.3%2C24.45%2011.4%2C0%2020.74%2C-6.07%2027.75%2C-14.51%20l%20-0.75%2C14.51%20-0.04%2C-0.04%20z%20M%20484.3%2C306.36%20c%200%2C-21.19%20-11.25%2C-29.32%20-31.57%2C-29.32%20-17.92%2C0%20-30.94%2C7.42%20-30.94%2C19.72%200%2C3.67%201.31%2C6.49%203.97%2C8.44%20l%2013.65%2C-1.8%20c%20-0.6%2C-4.12%20-0.9%2C-6.64%20-0.9%2C-7.69%200%2C-6.97%203.71%2C-10.5%2011.25%2C-10.5%2011.14%2C0%2016.76%2C7.84%2016.76%2C20.44%20v%204.12%20l%20-28.12%2C8.44%20c%20-9.37%2C2.55%20-14.7%2C4.76%20-18.26%2C9.94%20-1.89%2C3.17%20-2.8%2C6.82%20-2.62%2C10.5%200%2C12%208.25%2C20.47%2022.35%2C20.47%2010.2%2C0%2019.24%2C-4.61%2027.11%2C-13.35%202.81%2C8.74%207.12%2C13.35%2014.81%2C13.35%206.22%2C0%2011.85%2C-2.51%2016.87%2C-7.42%20l%20-1.5%2C-5.17%20c%20-2.17%2C0.6%20-4.27%2C0.9%20-6.49%2C0.9%20-4.31%2C0%20-6.37%2C-3.41%20-6.37%2C-10.09%20v%20-30.97%20z%20m%20-36%2C40.76%20c%20-7.69%2C0%20-12.45%2C-4.46%20-12.45%2C-12.3%200%2C-5.32%202.51%2C-8.44%207.87%2C-10.24%20l%2022.8%2C-7.24%20v%2021.9%20c%20-7.27%2C5.51%20-11.55%2C7.87%20-18.22%2C7.87%20z%20m%20237.36%2C6.82%20v%20-6.67%20l%20-3.86%2C-0.3%20c%20-6.37%2C-0.6%20-7.99%2C-1.91%20-7.99%2C-7.12%20v%20-89.47%20l%200.75%2C-12.75%20h%20-5.36%20l%20-23.7%2C7.12%20v%203.86%20l%2010.5%2C4.87%20v%2029.32%20c%20-5.91%2C-4.05%20-12.98%2C-6.08%20-20.14%2C-5.77%20-23.55%2C0%20-41.92%2C17.92%20-41.92%2C44.74%200%2C22.09%2013.2%2C37.35%2034.95%2C37.35%2011.25%2C0%2021.04%2C-5.47%2027.11%2C-13.95%20l%20-0.75%2C13.95%20h%203.15%20l%2027.26%2C-5.17%20v%200%20z%20m%20-49.35%2C-68.02%20c%2011.25%2C0%2019.69%2C6.52%2019.69%2C18.52%20v%2033.75%20c%20-5.18%2C5.16%20-12.23%2C8%20-19.54%2C7.87%20-16.12%2C0%20-24.3%2C-12.75%20-24.3%2C-29.77%200%2C-19.12%209.34%2C-30.37%2024.15%2C-30.37%20z%20M%20743.3%2C302.8%20c%20-2.1%2C-9.9%20-8.17%2C-15.52%20-16.61%2C-15.52%20-12.6%2C0%20-21.34%2C9.49%20-21.34%2C23.1%200%2C20.14%2010.65%2C33.19%2027.86%2C33.19%2011.48%2C-0.12%2022.04%2C-6.33%2027.71%2C-16.31%20l%205.02%2C1.35%20c%20-2.25%2C17.47%20-18.07%2C30.52%20-37.5%2C30.52%20-22.8%2C0%20-38.51%2C-16.87%20-38.51%2C-40.87%200%2C-24%2017.06%2C-41.21%2039.86%2C-41.21%2017.02%2C0%2029.02%2C10.24%2032.89%2C28.01%20l%20-59.4%2C18.22%20v%20-8.02%20l%2040.01%2C-12.41%20v%20-0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E");
  --dsh-claude-image-claude-mark-clay: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20148.09%20148.18'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20fill%3D'%23D97757'%20d%3D'm%20105.01%2C322.07%2029.14%2C-16.35%200.49%2C-1.42%20-0.49%2C-0.79%20h%20-1.42%20l%20-4.87%2C-0.3%20-16.65%2C-0.45%20-14.44%2C-0.6%20-13.99%2C-0.75%20-3.52%2C-0.75%20-3.3%2C-4.35%200.34%2C-2.17%202.96%2C-1.99%204.24%2C0.37%209.37%2C0.64%2014.06%2C0.97%2010.2%2C0.6%2015.11%2C1.57%20h%202.4%20l%200.34%2C-0.97%20-0.82%2C-0.6%20-0.64%2C-0.6%20-14.55%2C-9.86%20-15.75%2C-10.42%20-8.25%2C-6%20-4.46%2C-3.04%20-2.25%2C-2.85%20-0.97%2C-6.22%204.05%2C-4.46%205.44%2C0.37%201.39%2C0.37%205.51%2C4.24%2011.77%2C9.11%2015.37%2C11.32%202.25%2C1.87%200.9%2C-0.64%200.11%2C-0.45%20-1.01%2C-1.69%20-8.36%2C-15.11%20-8.92%2C-15.37%20-3.97%2C-6.37%20-1.05%2C-3.82%20c%20-0.37%2C-1.57%20-0.64%2C-2.89%20-0.64%2C-4.5%20l%204.61%2C-6.26%202.55%2C-0.82%206.15%2C0.82%202.59%2C2.25%203.82%2C8.74%206.19%2C13.76%209.6%2C18.71%202.81%2C5.55%201.5%2C5.14%200.56%2C1.57%20h%200.97%20v%20-0.9%20l%200.79%2C-10.54%201.46%2C-12.94%201.42%2C-16.65%200.49%2C-4.69%202.32%2C-5.62%204.61%2C-3.04%203.6%2C1.72%202.96%2C4.24%20-0.41%2C2.74%20-1.76%2C11.44%20-3.45%2C17.92%20-2.25%2C12%20h%201.31%20l%201.5%2C-1.5%206.07%2C-8.06%2010.2%2C-12.75%204.5%2C-5.06%205.25%2C-5.59%203.37%2C-2.66%20h%206.37%20l%204.69%2C6.97%20-2.1%2C7.2%20-6.56%2C8.32%20-5.44%2C7.05%20-7.8%2C10.5%20-4.87%2C8.4%200.45%2C0.67%201.16%2C-0.11%2017.62%2C-3.75%209.52%2C-1.72%2011.36%2C-1.95%205.14%2C2.4%200.56%2C2.44%20-2.02%2C4.99%20-12.15%2C3%20-14.25%2C2.85%20-21.22%2C5.02%20-0.26%2C0.19%200.3%2C0.37%209.56%2C0.9%204.09%2C0.22%20h%2010.01%20l%2018.64%2C1.39%204.87%2C3.22%202.92%2C3.94%20-0.49%2C3%20-7.5%2C3.82%20-10.12%2C-2.4%20-23.62%2C-5.62%20-8.1%2C-2.02%20h%20-1.12%20v%200.67%20l%206.75%2C6.6%2012.37%2C11.17%2015.49%2C14.4%200.79%2C3.56%20-1.99%2C2.81%20-2.1%2C-0.3%20-13.61%2C-10.24%20-5.25%2C-4.61%20-11.89%2C-10.01%20h%20-0.79%20v%201.05%20l%202.74%2C4.01%2014.47%2C21.75%200.75%2C6.67%20-1.05%2C2.17%20-3.75%2C1.31%20-4.12%2C-0.75%20-8.47%2C-11.89%20-8.74%2C-13.39%20-7.05%2C-12%20-0.86%2C0.49%20-4.16%2C44.81%20-1.95%2C2.29%20-4.5%2C1.72%20-3.75%2C-2.85%20-1.99%2C-4.61%201.99%2C-9.11%202.4%2C-11.89%201.95%2C-9.45%201.76%2C-11.74%201.05%2C-3.9%20-0.07%2C-0.26%20-0.86%2C0.11%20-8.85%2C12.15%20-13.46%2C18.19%20-10.65%2C11.4%20-2.55%2C1.01%20-4.42%2C-2.29%200.41%2C-4.09%202.47%2C-3.64%2014.74%2C-18.75%208.89%2C-11.62%205.74%2C-6.71%20-0.04%2C-0.97%20h%20-0.34%20l%20-39.15%2C25.42%20-6.97%2C0.9%20-3%2C-2.81%200.37%2C-4.61%201.42%2C-1.5%2011.77%2C-8.1%20-0.04%2C0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E");
  --dsh-claude-image-anthropic-mark: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2024%2024'%3E%3Cpath%20d%3D'M4.709%2015.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0%2011.784l.055-.352.48-.321.686.06%201.52.103%202.278.158%201.652.097%202.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686%201.908%201.476%202.491%201.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97%202.97%200%2001-.104-.729L6.283.134%206.696%200l.996.134.42.364.62%201.414%201.002%202.229%201.555%203.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286%201.851-.559%202.903-.364%201.942h.212l.243-.242.985-1.306%201.652-2.064.73-.82.85-.904.547-.431h1.033l.76%201.129-.34%201.166-1.064%201.347-.881%201.142-1.264%201.7-.79%201.36.073.11.188-.02%202.856-.606%201.543-.28%201.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061%201.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093%201.068%202.006%201.81%202.509%202.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649%202.345%203.521.122%201.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674%207.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434%201.967-2.18%202.945-1.726%201.845-.414.164-.717-.37.067-.662.401-.589%202.388-3.036%201.44-1.882.93-1.086-.006-.158h-.055L4.132%2018.56l-1.13.146-.487-.456.061-.746.231-.243%201.908-1.312-.006.006z'%20fill%3D'%23D97757'%2F%3E%3C%2Fsvg%3E");
  --dsh-claude-image-deepseek-mark: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2023.16%2017.04'%3E%3Cpath%20fill%3D'%234D6BFE'%20d%3D'M22.9168%201.43018C22.6713%201.31018%2022.5658%201.53918%2022.4223%201.65519C22.3733%201.69269%2022.3318%201.74169%2022.2903%201.78669C21.9317%202.1697%2021.5127%202.42121%2020.9657%202.39121C20.1657%202.34621%2019.4827%202.59771%2018.8787%203.20973C18.7502%202.45521%2018.3236%202.0047%2017.6746%201.71569C17.3351%201.56568%2016.9916%201.41518%2016.7536%201.08867C16.5876%200.856163%2016.5421%200.597155%2016.4591%200.341647C16.4061%200.187643%2016.3536%200.0301382%2016.1761%200.00363739C15.9836%20-0.0263635%2015.9081%200.135141%2015.8326%200.270145C15.5306%200.822162%2015.4136%201.43018%2015.4251%202.0462C15.4516%203.43174%2016.0366%204.53527%2017.1991%205.3203C17.3311%205.4103%2017.3651%205.5003%2017.3236%205.63181C17.2441%205.90231%2017.1501%206.16482%2017.0671%206.43533C17.0141%206.60784%2016.9351%206.64584%2016.7501%206.57033C16.1121%206.30383%2015.5611%205.90931%2015.074%205.4328C14.2475%204.63328%2013.5%203.75075%2012.568%203.05973C12.349%202.89822%2012.13%202.74822%2011.9034%202.60522C10.9524%201.68169%2012.028%200.923165%2012.277%200.833162C12.5375%200.739159%2012.3675%200.41615%2011.5259%200.42015C10.6844%200.42365%209.91439%200.705658%208.93286%201.08117C8.78935%201.13767%208.63835%201.17867%208.48384%201.21267C7.59332%201.04367%206.66829%201.00617%205.70226%201.11517C3.88321%201.31768%202.43016%202.1777%201.36213%203.64575C0.0790928%205.4103%20-0.222916%207.41536%200.146595%209.50642C0.535106%2011.7105%201.66014%2013.535%203.38869%2014.9616C5.18125%2016.4406%207.24581%2017.1657%209.60138%2017.0266C11.0319%2016.9441%2012.6245%2016.7526%2014.421%2015.2321C14.874%2015.4576%2015.3496%2015.5476%2016.1381%2015.6151C16.7456%2015.6716%2017.3306%2015.5851%2017.7836%2015.4911C18.4931%2015.3411%2018.4441%2014.6841%2018.1876%2014.5636C16.1081%2013.595%2016.5646%2013.9891%2016.1496%2013.67C17.2061%2012.42%2018.8202%2010.1979%2019.3182%207.17235C19.3672%206.83834%2019.4297%206.36783%2019.4222%206.09732C19.4182%205.93231%2019.4562%205.86831%2019.6447%205.84931C20.1657%205.78931%2020.6712%205.64681%2021.1357%205.3913C22.4833%204.65528%2023.0268%203.44624%2023.1548%201.9972C23.1738%201.77569%2023.1508%201.54668%2022.9168%201.43018ZM11.1749%2014.4736C9.15936%2012.889%208.18184%2012.3675%207.77832%2012.39C7.40081%2012.4125%207.46881%2012.8445%207.55182%2013.126C7.63882%2013.404%207.75182%2013.5955%207.91033%2013.8396C8.01983%2014.0011%208.09533%2014.2411%207.80083%2014.4216C7.15181%2014.8231%206.02327%2014.2866%205.97027%2014.2601C4.65673%2013.4865%203.5587%2012.4655%202.78467%2011.069C2.03715%209.72493%201.60314%208.28289%201.53164%206.74384C1.51264%206.37233%201.62214%206.24082%201.99215%206.17332C2.47916%206.08332%202.98118%206.06432%203.46769%206.13582C5.52476%206.43633%207.27581%207.35586%208.74385%208.8129C9.58188%209.64243%2010.2159%2010.634%2010.8689%2011.6025C11.5634%2012.631%2012.3105%2013.611%2013.262%2014.4146C13.598%2014.6961%2013.866%2014.9101%2014.1225%2015.0681C13.349%2015.1546%2012.058%2015.1731%2011.1749%2014.4746L11.1749%2014.4736ZM12.141%208.25988C12.141%208.09488%2012.273%207.96338%2012.439%207.96338C12.4765%207.96338%2012.5105%207.97088%2012.541%207.98188C12.5825%207.99688%2012.6205%208.01938%2012.6505%208.05338C12.7035%208.10588%2012.7335%208.18088%2012.7335%208.25988C12.7335%208.42489%2012.6015%208.55639%2012.4355%208.55639C12.2695%208.55639%2012.141%208.42489%2012.141%208.25988ZM15.1415%209.79893C14.949%209.87793%2014.7565%209.94544%2014.5715%209.95294C14.2845%209.96794%2013.9715%209.85143%2013.8015%209.70893C13.5375%209.48742%2013.3485%209.36342%2013.2695%208.97691C13.2355%208.8119%2013.2545%208.55639%2013.2845%208.40989C13.3525%208.09438%2013.277%207.89187%2013.0545%207.70787C12.8735%207.55786%2012.643%207.51636%2012.39%207.51636C12.2955%207.51636%2012.209%207.47486%2012.1445%207.44136C12.039%207.38886%2011.9519%207.25735%2012.035%207.09585C12.0615%207.04335%2012.19%206.91584%2012.22%206.89334C12.5635%206.69784%2012.9595%206.76184%2013.326%206.90834C13.6655%207.04735%2013.9225%207.30236%2014.292%207.66287C14.6695%208.09838%2014.7375%208.21838%2014.9525%208.54539C15.1225%208.8009%2015.277%209.06341%2015.3831%209.36392C15.4471%209.55142%2015.3641%209.70493%2015.1415%209.79893Z'%2F%3E%3C%2Fsvg%3E");
}

body[data-dsh-claude-style][data-dsh-claude-typeface="claude"] {
  --dsw-font-family: 'Anthropic Sans Web Text','Claude Style Inter','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif;
  --dsh-claude-font-serif: 'Anthropic Serif Web Text','Claude Style Noto Serif',Georgia,'Times New Roman','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  --dsh-claude-font-prose: 'Anthropic Serif Web Text','Claude Style Noto Serif',Georgia,'Times New Roman','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  --dsh-claude-font-code: 'JetBrains Mono','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace;
  --dsh-claude-font-brand: 'Anthropic Serif Web Text', var(--dsh-claude-font-serif);
  --dsw-font-markdown-h2: 700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsh-claude-font-prose);
  --dsw-font-markdown-h3: 700 calc(16px + var(--dsh-content-font-delta)) / calc(24px + var(--dsh-content-font-delta)) var(--dsh-claude-font-prose);
}

body[data-dsh-claude-style][data-dsh-claude-typeface="host"] {
  --dsh-claude-font-serif: var(--dsw-font-family);
  --dsh-claude-font-prose: var(--dsw-font-family);
  --dsh-claude-font-code: var(--ds-font-family-code);
  --dsh-claude-font-brand: var(--dsw-font-family);
}

body[data-dsh-claude-style][data-ds-dark-theme] {
  --dsh-claude-apex: #9d8ce0;
  --dsh-claude-apex-flash: #e6e0fb;
  --dsh-claude-apex-ink: #b9adf0;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) {
  --dsh-claude-apex: #8b7ad0;
  --dsh-claude-apex-flash: #d9d2f5;
  --dsh-claude-apex-ink: #5f51b5;
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"][data-ds-dark-theme] {
  --dsw-alias-bg-base: #141413;
  --dsw-alias-bg-layer-1: #1c1b1a;
  --dsw-alias-bg-layer-2: #242320;
  --dsw-alias-bg-layer-3: #2e2c29;
  --dsw-alias-bg-overlay: #242320;
  --dsw-alias-border-l1: #242320;
  --dsw-alias-border-l2: #2e2c29;
  --dsw-alias-border-l3: #3a3833;
  --dsw-alias-brand-primary: #d97757;
  --dsw-alias-brand-text: #faf9f5;
  --dsw-alias-button-primary-fill: #d97757;
  --dsw-alias-button-primary-hover: #e08a6d;
  --dsw-alias-button-elevated-fill: #242320;
  --dsw-alias-button-floating-fill: #242320;
  --dsw-alias-button-floating-hover: #2e2c29;
  --dsw-alias-button-info-fill: #d97757;
  --dsw-alias-button-info-hover: #e08a6d;
  --dsw-alias-interactive-bg-active: rgba(217, 119, 87, 0.30);
  --dsh-claude-hover-bg: rgba(255, 255, 255, 0.08);
  --dsh-claude-inline-code-bg: rgba(255, 255, 255, 0.05);
  --dsh-claude-inline-code-fg: #e8a08a;
  --dsh-claude-link: #8ab4f8;
  --dsh-claude-link-underline: rgba(138, 180, 248, 0.6);
  --dsw-alias-markdown-code-block: #1c1b1a;
  --dsw-alias-markdown-code-block-banner: #242320;
  --dsw-alias-interactive-bg-hover: var(--dsh-claude-hover-bg);
  --dsw-alias-interactive-bg-hover-solid: #2e2c29;
  --dsw-alias-label-primary: #faf9f5;
  --dsw-alias-label-primary-bluish: #faf9f5;
  --dsw-alias-label-secondary: #b0aea5;
  --dsw-alias-label-tertiary: #8f8d84;
  --dsw-alias-label-caption: #6b6a65;
  --dsw-alias-state-business-primary: #d97757;
  --dsw-alias-state-business-tertiary: #3a2a22;
  --dsw-alias-link: #e08a6d;
  --dsw-shadow-lv2: 0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14);
  --dsw-specific-input-major: #0f0e0d;
  --dsw-specific-selector: #2e2c29;
  --dsw-specific-sidebar-fill: #141413;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #d97757;
  --dsh-claude-canvas: #141413;
  --dsh-claude-sidebar-canvas: #141413;
  --dsh-claude-raised: #1e1e1d;
  --dsh-claude-card: #1e1e1d;
  --dsh-claude-inverse-fill: #faf9f5;
  --dsh-claude-inverse-ink: #141413;
  --dsh-claude-ink-strong: #f5f4ef;
  --dsh-claude-session-ink: #8c8983;
  --dsh-claude-table-head: #242320;
  --dsh-claude-scrollbar: rgba(58, 56, 51, 0.9);
  --dsh-claude-scrollbar-hover: rgba(107, 106, 101, 0.9);
  --dsh-claude-link-hover: #f0a488;
  --dsh-claude-logo-ink: #faf9f5;
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-ds-dark-theme]) {
  --dsw-alias-bg-base: #fcfcfb;
  --dsw-alias-bg-layer-1: #fcfcfb;
  --dsw-alias-bg-layer-2: #fbfbf9;
  --dsw-alias-bg-layer-3: #f9f9f6;
  --dsw-alias-bg-overlay: #ffffff;
  --dsw-alias-border-l1: #e8e6dc;
  --dsw-alias-border-l2: #dedcd2;
  --dsw-alias-border-l3: #d0cdc1;
  --dsw-alias-brand-primary: #d97757;
  --dsw-alias-brand-text: #faf9f5;
  --dsw-alias-button-primary-fill: #d97757;
  --dsw-alias-button-primary-hover: #c6613f;
  --dsw-alias-button-elevated-fill: #ffffff;
  --dsw-alias-button-floating-fill: #ffffff;
  --dsw-alias-button-floating-hover: #ffffff;
  --dsw-alias-button-info-fill: #d97757;
  --dsw-alias-button-info-hover: #c6613f;
  --dsw-alias-interactive-bg-active: rgba(217, 119, 87, 0.30);
  --dsh-claude-hover-bg: rgba(0, 0, 0, 0.08);
  --dsh-claude-inline-code-bg: rgba(0, 0, 0, 0.05);
  --dsh-claude-inline-code-fg: #943333;
  --dsh-claude-link: #184f95;
  --dsh-claude-link-underline: rgba(24, 79, 149, 0.6);
  --dsw-alias-markdown-code-block: #ffffff;
  --dsw-alias-markdown-code-block-banner: #ffffff;
  --dsw-alias-interactive-bg-hover: var(--dsh-claude-hover-bg);
  --dsw-alias-interactive-bg-hover-solid: #f0efe9;
  --dsw-alias-label-primary: #141413;
  --dsw-alias-label-primary-bluish: #141413;
  --dsw-alias-label-secondary: #6e6a60;
  --dsw-alias-label-tertiary: #8f8a7e;
  --dsw-alias-label-caption: #a6a094;
  --dsw-alias-state-business-primary: #d97757;
  --dsw-alias-state-business-tertiary: #e9dfd2;
  --dsw-alias-link: #c6613f;
  --dsw-shadow-lv2: 0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05);
  --dsw-specific-input-major: #ffffff;
  --dsw-specific-selector: #fbfbf9;
  --dsw-specific-sidebar-fill: #fbfbf9;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #d97757;
  --dsh-claude-canvas: #fcfcfb;
  --dsh-claude-sidebar-canvas: #fbfbf9;
  --dsh-claude-card: #fcfcfb;
  --dsh-claude-inverse-fill: #141413;
  --dsh-claude-inverse-ink: #faf9f5;
  --dsh-claude-table-head: #f0f0ef;
  --dsh-claude-scrollbar: rgba(208, 205, 193, 0.9);
  --dsh-claude-scrollbar-hover: rgba(143, 138, 126, 0.8);
  --dsh-claude-link-hover: #a94f2f;
  --dsh-claude-logo-ink: #141413;
  --dsw-specific-menu: #ffffff;
  --dsw-specific-bubble: var(--dsh-claude-hover-bg);
  --dsh-claude-chip: #f6f6f4;
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"][data-dsh-claude-brand="deepseek"]:not([data-ds-dark-theme]) {
  --dsw-alias-bg-base: #fafbff;
  --dsw-alias-bg-layer-1: #fafbff;
  --dsw-alias-bg-layer-2: #f7f9ff;
  --dsw-alias-bg-layer-3: #f4f7fe;
  --dsw-alias-border-l1: #e7ecf7;
  --dsw-alias-border-l2: #dde4f1;
  --dsw-alias-border-l3: #cfd8ea;
  --dsw-alias-brand-primary: #4d6bfe;
  --dsw-alias-brand-text: #fafbff;
  --dsw-alias-button-primary-fill: #4d6bfe;
  --dsw-alias-button-primary-hover: #3a57e8;
  --dsw-alias-button-info-fill: #4d6bfe;
  --dsw-alias-button-info-hover: #3a57e8;
  --dsw-alias-interactive-bg-active: rgba(77, 107, 254, 0.22);
  --dsh-claude-hover-bg: rgba(38, 49, 72, 0.08);
  --dsh-claude-inline-code-bg: rgba(38, 49, 72, 0.05);
  --dsh-claude-inline-code-fg: var(--dsw-alias-label-primary);
  --dsh-claude-link: #3b56d9;
  --dsh-claude-link-underline: rgba(59, 86, 217, 0.6);
  --dsw-alias-interactive-bg-hover-solid: #eef3fc;
  --dsw-alias-label-primary: #0f1115;
  --dsw-alias-label-primary-bluish: #0f1115;
  --dsw-alias-label-secondary: #61666b;
  --dsw-alias-label-tertiary: #81858c;
  --dsw-alias-label-caption: #adb2b8;
  --dsw-alias-state-business-primary: #4d6bfe;
  --dsw-alias-state-business-tertiary: #e9eeff;
  --dsw-alias-link: #3b56d9;
  --dsw-specific-selector: #f7f9ff;
  --dsw-specific-sidebar-fill: #f7f9ff;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #4d6bfe;
  --dsh-claude-canvas: #fafbff;
  --dsh-claude-sidebar-canvas: #f7f9ff;
  --dsh-claude-card: #fafbff;
  --dsh-claude-table-head: #eff3fb;
  --dsh-claude-scrollbar: rgba(206, 216, 233, 0.9);
  --dsh-claude-scrollbar-hover: rgba(129, 133, 140, 0.8);
  --dsh-claude-link-hover: #2c43b8;
  --dsh-claude-logo-ink: #4d6bfe;
  --dsw-specific-bubble: #eaf0fe;
  --dsh-claude-chip: #f2f6fd;
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"][data-dsh-claude-brand="deepseek"][data-ds-dark-theme] {
  --dsw-alias-bg-base: #13161d;
  --dsw-alias-bg-layer-1: #1a1e27;
  --dsw-alias-bg-layer-2: #212631;
  --dsw-alias-bg-layer-3: #2a303c;
  --dsw-alias-bg-overlay: #212631;
  --dsw-alias-border-l1: #212631;
  --dsw-alias-border-l2: #2a303c;
  --dsw-alias-border-l3: #363d4b;
  --dsw-alias-brand-primary: #4d6bfe;
  --dsw-alias-brand-text: #eef1f8;
  --dsw-alias-button-primary-fill: #4d6bfe;
  --dsw-alias-button-primary-hover: #6a84ff;
  --dsw-alias-button-elevated-fill: #212631;
  --dsw-alias-button-floating-fill: #212631;
  --dsw-alias-button-floating-hover: #2a303c;
  --dsw-alias-button-info-fill: #4d6bfe;
  --dsw-alias-button-info-hover: #6a84ff;
  --dsw-alias-interactive-bg-active: rgba(77, 107, 254, 0.30);
  --dsh-claude-inline-code-fg: var(--dsw-alias-label-primary);
  --dsh-claude-link: #8fa4ff;
  --dsh-claude-link-underline: rgba(143, 164, 255, 0.6);
  --dsw-alias-markdown-code-block: #1a1e27;
  --dsw-alias-markdown-code-block-banner: #212631;
  --dsw-alias-interactive-bg-hover-solid: #2a303c;
  --dsw-alias-label-primary: #eef1f8;
  --dsw-alias-label-primary-bluish: #eef1f8;
  --dsw-alias-label-secondary: #aeb5c4;
  --dsw-alias-label-tertiary: #8a92a3;
  --dsw-alias-label-caption: #666e7e;
  --dsw-alias-state-business-primary: #6a84ff;
  --dsw-alias-state-business-tertiary: #253056;
  --dsw-alias-link: #8fa4ff;
  --dsw-specific-input-major: #0e1117;
  --dsw-specific-selector: #2a303c;
  --dsw-specific-sidebar-fill: #13161d;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #4d6bfe;
  --dsh-claude-canvas: #13161d;
  --dsh-claude-sidebar-canvas: #13161d;
  --dsh-claude-raised: #1b1f28;
  --dsh-claude-card: #1b1f28;
  --dsh-claude-ink-strong: #e9edf6;
  --dsh-claude-session-ink: #8a91a0;
  --dsh-claude-table-head: #212631;
  --dsh-claude-scrollbar: rgba(54, 61, 75, 0.9);
  --dsh-claude-scrollbar-hover: rgba(104, 112, 128, 0.9);
  --dsh-claude-link-hover: #b0c0ff;
  --dsh-claude-logo-ink: #4d6bfe;
  --dsw-specific-bubble: #232a3a;
}

body[data-dsh-claude-style][data-dsh-claude-palette="host"] {
  --dsh-claude-hover-bg: var(--dsw-alias-interactive-bg-hover);
  --dsh-claude-inline-code-bg: var(--dsw-alias-markdown-inline-code);
  --dsh-claude-inline-code-fg: var(--dsw-alias-label-primary);
  --dsh-claude-link: var(--dsw-alias-link);
  --dsh-claude-link-underline: color-mix(in srgb, var(--dsw-alias-link) 60%, transparent);
  --dsh-claude-canvas: var(--dsw-alias-bg-base);
  --dsh-claude-sidebar-canvas: var(--dsw-specific-sidebar-fill);
  --dsh-claude-raised: var(--dsw-alias-bg-overlay);
  --dsh-claude-card: var(--dsw-alias-bg-overlay);
  --dsh-claude-inverse-fill: var(--dsw-alias-interactive-bg-hover);
  --dsh-claude-inverse-ink: var(--dsw-alias-label-primary);
  --dsh-claude-ink-strong: var(--dsw-alias-label-primary);
  --dsh-claude-session-ink: var(--dsw-alias-label-secondary);
  --dsh-claude-table-head: var(--dsw-alias-bg-layer-2);
  --dsh-claude-scrollbar: var(--dsw-alias-border-l2);
  --dsh-claude-scrollbar-hover: var(--dsw-alias-label-caption);
  --dsh-claude-link-hover: var(--dsw-alias-link);
  --dsh-claude-logo-ink: var(--dsw-alias-label-primary);
  --dsh-claude-chip: var(--dsw-specific-selector);
}

/* The canvases the Claude palette paints onto the host's own structure; under
   "follow the host" none of them apply. */
body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-ds-dark-theme]) {
  color: var(--dsw-alias-label-primary);
  background-color: var(--dsh-claude-canvas);
}

/* The document element sits above the body and cannot read its tokens, so each
   palette states its canvas here. */
html:has(body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-ds-dark-theme])) {
  background-color: #fcfcfb;
}

html:has(body[data-dsh-claude-style][data-dsh-claude-palette="claude"][data-dsh-claude-brand="deepseek"]:not([data-ds-dark-theme])) {
  background-color: #fafbff;
}
body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-ds-dark-theme]) #root {
  background-color: var(--dsh-claude-canvas);
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-ds-dark-theme]) :is([data-pane="sidebar"], [class*="sidebarCol"], .dshDesktopSidebarSurface) {
  --dsw-specific-sidebar-fill: var(--dsh-claude-sidebar-canvas);
  background: var(--dsh-claude-sidebar-canvas);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) :is([data-pane="sidebar"], [class*="sidebarCol"], .dshDesktopSidebarSurface) {
  border-right: 1px solid var(--dsw-alias-border-l1);
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-ds-dark-theme]) :is([data-pane="conversation"], [class*="centerCol"]) {
  background: var(--dsh-claude-canvas);
}

/* The light half of the anchor ink in theme/chrome.css; both leave a host button
   class (\`_linkButton\`) to the ink that class states for itself. */
body[data-dsh-claude-style]:not([data-ds-dark-theme]) a:not([class*="_linkButton"]) {
  color: var(--dsw-alias-link);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) a:not([class*="_linkButton"]):hover {
  color: var(--dsh-claude-link-hover);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*="_brand"],
body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*="_primary"],
body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-slot="sidebar.settings"] > :is(button, [role="button"]) {
  background: var(--dsw-alias-button-primary-fill);
  color: #ffffff;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*="_brand"]:hover,
body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*="_primary"]:hover,
body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-slot="sidebar.settings"] > :is(button, [role="button"]):hover {
  background: var(--dsw-alias-button-primary-hover);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) blockquote {
  color: var(--dsw-alias-label-secondary);
  border-left-color: var(--dsw-alias-label-caption);
  background: rgba(20, 20, 19, 0.04);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) pre {
  border-color: var(--dsw-alias-border-l1);
}


body[data-dsh-claude-style]:not([data-ds-dark-theme]) * {
  scrollbar-color: var(--dsh-claude-scrollbar) transparent;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) ::-webkit-scrollbar-thumb {
  background: var(--dsh-claude-scrollbar);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) ::-webkit-scrollbar-thumb:hover {
  background: var(--dsh-claude-scrollbar-hover);
}

/* ---------- webfonts ---------- */
/* The code font ships in the package and the host half serves it, so 'JetBrains
   Mono' resolves on systems that never installed it. When the route is missing the
   fetch 404s and the stacks' system fallbacks take over. */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/dsh-claude-style/fonts/JetBrainsMonoVariable.ttf') format('truetype-variations');
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/dsh-claude-style/fonts/JetBrainsMonoItalicVariable.ttf') format('truetype-variations');
  font-weight: 100 800;
  font-style: italic;
  font-display: swap;
}

/* The Anthropic text faces are not in the npm package, so these registrations
   resolve only when the user dropped the files into \`$DSH_HOME/dsh-claude-style/fonts/\`;
   otherwise the stacks fall back to a system-installed copy. Both are static
   Regular cuts, so one 400 declaration covers them and the browser synthesizes
   the heavier weights. */
@font-face {
  font-family: 'Anthropic Sans Web Text';
  src: url('/dsh-claude-style/fonts/AnthropicSansWebText.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Anthropic Serif Web Text';
  src: url('/dsh-claude-style/fonts/AnthropicSerifWebText.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* The look-alikes the stacks name after the Anthropic faces, for an install with
   neither the files nor a system copy. They ship in the package (SIL OFL 1.1), cut
   to the coverage of the Anthropic faces and matched to them in x-height, cap
   height and lowercase width, so switching between a face and its look-alike does
   not rewrap text. The family names are the skin's own: a plugin asking for 'Inter'
   or 'Noto Serif' still gets its own copy. */
@font-face {
  font-family: 'Claude Style Inter';
  src: url('/dsh-claude-style/fonts/InterVariable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Claude Style Noto Serif';
  src: url('/dsh-claude-style/fonts/NotoSerifVariable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* ---------- typography: serif display + sans UI + mono code ---------- */
body[data-dsh-claude-style] {
  font-family: var(--dsw-font-family);
  color: var(--dsw-alias-label-primary);
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"] {
  background-color: var(--dsh-claude-canvas);
}

body[data-dsh-claude-style] :is(h1, h2, h3, h4, [class*="headline"], [class*="title"]) {
  font-family: var(--dsh-claude-font-serif);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

/* Display headings sit at 500 with tighter tracking */
body[data-dsh-claude-style] :is(h1, [class*="headline"]) {
  font-weight: 500;
  letter-spacing: -0.015em;
}

/* ---------- markdown document prose ---------- */
/* Conversation prose — body and headings alike — takes the serif face and lets
   Chinese fall through to a sans CJK; the display rule above stays for headlines. */
body[data-dsh-claude-style] [class*="markdown"] {
  font-family: var(--dsh-claude-font-prose);
  line-height: calc(23px + var(--dsh-content-font-delta, 0px));
}

/* Claude keeps 12px between blocks, not the host's 16px; first/last-child zeroing
   stays with the host's !important rules. */
body[data-dsh-claude-style] [class*="markdown"] p {
  margin: 12px 0;
}

/* The host gives its markdown elements their own \`font:\` shorthand, so the family
   has to be re-stated wherever those shorthands land; the heading shorthand is
   re-asserted so the host's weight, size and line-height survive the display rule. */
body[data-dsh-claude-style] [class*="markdown"] h1 { font: var(--dsw-font-markdown-h1); font-family: var(--dsh-claude-font-prose); }
body[data-dsh-claude-style] [class*="markdown"] h2 { font: var(--dsw-font-markdown-h2); font-family: var(--dsh-claude-font-prose); }
body[data-dsh-claude-style] [class*="markdown"] h3 { font: var(--dsw-font-markdown-h3); font-family: var(--dsh-claude-font-prose); }
body[data-dsh-claude-style] [class*="markdown"] h4 { font: var(--dsw-font-markdown-h4); font-family: var(--dsh-claude-font-prose); }

body[data-dsh-claude-style] [class*="markdown"] :is(th, td) {
  font-family: var(--dsh-claude-font-prose);
  /* One type step up from the host's 13px table size. */
  font-size: var(--dsh-content-font-size, 14px);
}

body[data-dsh-claude-style] [class*="tableScroll"] thead th,
body[data-dsh-claude-style] [class*="tableScroll"] thead td {
  background: var(--dsh-claude-table-head, #f0f0ef) !important;
}

body[data-dsh-claude-style][data-ds-dark-theme] [class*="tableScroll"] thead th,
body[data-dsh-claude-style][data-ds-dark-theme] [class*="tableScroll"] thead td {
  background: var(--dsh-claude-table-head) !important;
}

/* Table frame: the host's 0.5px row-separator line, rounded like the code block. */
body[data-dsh-claude-style] [class*="tableScroll"] {
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  padding-left: 0 !important;
  padding-right: 0 !important;
  background-clip: padding-box;
  /* Narrow tables stretch to the prose block; wide ones keep max-content and
     scroll inside this wrapper. */
  width: 100% !important;
  max-width: var(--dsh-chat-content-width, 100%) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

body[data-dsh-claude-style] [class*="tableScroll"] table {
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  border-spacing: 0 !important;
  border-collapse: collapse !important;
  width: max-content !important;
  min-width: 100% !important;
  max-width: max-content !important;
}

/* Every first/last cell, whatever element the renderer used. */
body[data-dsh-claude-style] [class*="tableScroll"] tr > :first-child {
  padding-left: 16px !important;
}

body[data-dsh-claude-style] [class*="tableScroll"] tr > :last-child {
  padding-right: 16px !important;
}

/* Heading rhythm: the host's 32px top margin stacks on the previous heading's
   bottom margin, which opens ~36px where Claude keeps ~12px; a heading directly
   after another tightens further so a run reads as one block. */
body[data-dsh-claude-style] [class*="markdown"] :is(h1, h2, h3) {
  margin-top: 24px;
  margin-bottom: 12px;
}

body[data-dsh-claude-style] [class*="markdown"] :is(h1, h2, h3) + :is(h1, h2, h3) {
  margin-top: 8px;
}

body[data-dsh-claude-style] [class*="markdown"] :is(h4, h5, h6) {
  margin-top: 16px;
  margin-bottom: 8px;
}

body[data-dsh-claude-style] :is(pre, code, kbd, samp, [class*="mono"], [class*="codeBlock"], [class*="CodeBlock"]) {
  font-family: var(--dsh-claude-font-code);
}

/* editorial captions */
body[data-dsh-claude-style] :is([class*="caption"], [class*="sectionLabel"]) {
  font-size: 12px;
  font-weight: 500;
}

/* ---------- editorial markdown ---------- */
/* The quote keeps the prose face upright on a neutral bar and wash; links, chips
   and file mentions keep their own material inside it — a quote is a container,
   not a link, so it never borrows the link colour. */
body[data-dsh-claude-style] blockquote {
  font-family: var(--dsh-claude-font-prose);
  font-style: normal;
  color: var(--dsw-alias-label-secondary);
  border-left: 2px solid var(--dsw-alias-label-caption);
  background: rgba(250, 249, 245, 0.06);
  border-radius: 0 8px 8px 0;
  padding: 0.6em 1em;
}

/* The fill rides the host's --dsw-alias-markdown-code-block token, because the host
   pins \`pre.shiki\` with !important and a \`background\` here would never apply. The
   frame lives on the wrapper, so the banner and the code share one rounded outline. */
body[data-dsh-claude-style] .md-code-block {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
}

/* The same outer rhythm as body paragraphs, against the host's 16px/19px. */
body[data-dsh-claude-style] .md-code-block {
  margin: 12px 0;
}

body[data-dsh-claude-style] .md-code-block pre,
body[data-dsh-claude-style] .md-code-block pre code {
  line-height: calc(23px + var(--dsh-content-font-delta, 0px)) !important;
  font-weight: 500 !important;
}

/* One pixel below the surrounding copy; the inner <code> inherits rather than
   compounding the calc(). */
body[data-dsh-claude-style] pre {
  font-size: calc(1em - 1px) !important;
  font-weight: 500 !important;
}

body[data-dsh-claude-style] pre code {
  font-size: inherit !important;
  font-weight: 500 !important;
}

/* The inline-code chip: the host makes it an inline-flex box inheriting the prose
   line box, which left empty wash above and below the glyphs; line-height 1.2
   collapses it onto them, and lower values start clipping descenders. */
body[data-dsh-claude-style] code:not(pre code) {
  font-family: var(--dsh-claude-font-code);
  background: var(--dsh-claude-inline-code-bg);
  color: var(--dsh-claude-inline-code-fg);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 4px;
  padding: 1px;
  font-size: calc(1em - 1px) !important;
  line-height: 1.2;
}

/* Claude's links: blue, underlined at rest, without the host's link-category glyph. */
body[data-dsh-claude-style] [class*="linkIcon"] {
  display: none;
}

/* Inline file mentions are links, not code: the host resolves a path inside an
   inline code span to a button, and the generic chip above is more specific than
   the host's class, so the text would otherwise keep the chip's warm red while real
   links are blue (the class is hashed, hence the longest stable fragment). The chip
   keeps its own wash and hairline. The hover rule touches the colour only: the
   \`text-decoration\` shorthand would reset the thickness to \`auto\` mid-hover. */
body[data-dsh-claude-style] :is(code:not(pre code) > [class*="_fileMention"], code:not(pre code) > a) {
  color: var(--dsh-claude-link);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--dsh-claude-link-underline);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}

body[data-dsh-claude-style] :is(code:not(pre code) > [class*="_fileMention"], code:not(pre code) > a):hover,
body[data-dsh-claude-style] :is(code:not(pre code) > [class*="_fileMention"], code:not(pre code) > a):focus-visible {
  text-decoration-color: var(--dsh-claude-link);
}

body[data-dsh-claude-style] [class*="markdown"] :is(a, a:focus) {
  color: var(--dsh-claude-link);
  text-decoration: underline;
  text-decoration-color: var(--dsh-claude-link-underline);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}

body[data-dsh-claude-style] [class*="markdown"] :is(a:hover, a:focus-visible) {
  text-decoration-color: var(--dsh-claude-link);
}

body[data-dsh-claude-style] hr {
  border: none;
  border-top: 1px solid rgba(20, 20, 19, 0.14);
  margin: 1.6em 0;
}


/* tabs: subtle editorial weighting */
body[data-dsh-claude-style] [role="tab"] {
  font-weight: 500;
}

/* technical meta (model selector, triggers) read as mono labels */
body[data-dsh-claude-style] [class*="triggerLabel"],
body[data-dsh-claude-style] [class*="selectLabel"],
body[data-dsh-claude-style] [class*="monoLabel"] {
  font-family: var(--dsh-claude-font-code);
  font-size: 12px;
  letter-spacing: 0;
}

/* ---------- Popover card: the skin's own floating cards ---------- */
/* Every card the skin builds (permission, model picker, effort, account,
   session stats, quick providers) wears this shell: one fill, hairline, 12px
   radius, shadow and 6px inset, closed until data-open="true" and opening with
   the same short rise. Each card's own stylesheet adds only what differs — its
   placement, its width limits, the corner it grows from — and comes later in
   the cascade, so it wins where the two overlap. */

/* The same short rise as a one-shot animation, for a surface that MOUNTS
   instead of toggling \`data-open\` (the host's own panels, which the skin opens
   but does not build). Same distance, same duration, same curve as the card
   transition above, so every surface the skin opens arrives the same way. */
@keyframes dsh-claude-popover-in {
  from { opacity: 0; transform: translateY(4px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
body[data-dsh-claude-style] .dsh-claude-popover-card {
  background: var(--dsw-alias-bg-overlay, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(20, 20, 19, 0.12), 0 2px 8px rgba(20, 20, 19, 0.06);
  padding: 6px;
  box-sizing: border-box;
  z-index: 99999;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px) scale(0.98);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
body[data-dsh-claude-style] .dsh-claude-popover-card[data-open="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-popover-card {
  background: var(--dsh-claude-raised);
  border-color: var(--dsw-alias-border-l2);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
}
/* Under the host's colours the card's fill is the host's overlay layer, which
   a theme plugin may turn translucent (a wallpaper's glass): the card blurs
   what lies behind it, so its rows stay readable over a busy picture. */
body[data-dsh-claude-style][data-dsh-claude-palette="host"] .dsh-claude-popover-card {
  -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;
  backdrop-filter: blur(16px) saturate(1.4);
}
/* A card's list: rows stacked with a hairline of air. */
body[data-dsh-claude-style] .dsh-claude-popover-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
/* A line in place of rows: loading, or nothing to list. */
body[data-dsh-claude-style] .dsh-claude-popover-status {
  color: var(--dsw-alias-label-tertiary, #8f8d84) !important;
  font-size: 12px !important;
  line-height: 20px !important;
  padding: 4px 8px !important;
}

/* ---------- Popover rows ---------- */
body[data-dsh-claude-style] .dsh-claude-popover-item {
  width: 100%;
  min-height: 32px;
  padding: 2px 7px;
  border-radius: 6px;
  border: none !important;
  background: transparent;
  color: var(--dsw-alias-label-primary, #141413);
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  box-shadow: none;
  cursor: pointer;
  font-family: var(--dsw-font-family);
  transition: background-color 0.12s ease;
  box-sizing: border-box;
}
body[data-dsh-claude-style] .dsh-claude-popover-item:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
  color: var(--dsw-alias-label-primary, #141413) !important;
}
body[data-dsh-claude-style] .dsh-claude-popover-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--dsw-alias-label-secondary, #787672);
}
body[data-dsh-claude-style] .dsh-claude-popover-item-icon svg {
  width: 16px;
  height: 16px;
}
body[data-dsh-claude-style] .dsh-claude-popover-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
/* A two-line row: the title over a quieter second line, the pair sharing the
   slack the one-line text block would take. */
body[data-dsh-claude-style] .dsh-claude-popover-item-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-align: left;
}
body[data-dsh-claude-style] .dsh-claude-popover-item-col .dsh-claude-popover-item-text {
  font-weight: 500;
  line-height: 16px;
}
body[data-dsh-claude-style] .dsh-claude-popover-item-desc {
  font-size: 11px;
  line-height: 14px;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The current choice's check, in the accent. A row that carries the mark for
   every choice keeps it out of the flow until its \`hidden\` comes off. */
body[data-dsh-claude-style] .dsh-claude-popover-check {
  flex: none;
  display: inline-flex;
  align-items: center;
  color: var(--dsw-alias-brand-primary, #d97757);
}
body[data-dsh-claude-style] .dsh-claude-popover-check[hidden] {
  display: none;
}
body[data-dsh-claude-style] .dsh-claude-popover-item-badge {
  margin-left: auto !important;
  font-size: 10px !important;
  line-height: 14px !important;
  padding: 0 5px !important;
  border-radius: 8px !important;
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.08)) !important;
  color: var(--dsw-alias-label-secondary, #787672) !important;
}
/* A provider the catalog no longer offers: its stored row stays checked but is
   muted, so it reads as "this used to be picked" and can be unchecked away. */
body[data-dsh-claude-style] .dsh-claude-popover-item.dsh-claude-popover-item-stale .dsh-claude-popover-item-text,
body[data-dsh-claude-style] .dsh-claude-popover-item.dsh-claude-popover-item-stale .dsh-claude-popover-item-badge {
  color: var(--dsw-alias-label-tertiary, #8f8d84) !important;
}
body[data-dsh-claude-style] .dsh-claude-popover-item.dsh-claude-popover-item-stale .dsh-claude-popover-item-badge {
  background: transparent !important;
}

/* Ensure popover items only display inside the popover */
body[data-dsh-claude-style] [class*="footArea"] > .dsh-claude-popover-item {
  display: none !important;
}

/* ---------- Sliding pill: the segmented controls' shared highlight ---------- */
/* packages/client/src/shared/sliding-pill.ts marks a control with data-dsh-claude-pill and
   writes the active item's offset and width; this draws one box there and
   slides it on every later change. The shape and fill belong to each control
   (view-tabs.css for the conversation view tabs, permissions.css for the
   permission segments, workspace.css for 进行中 / 已归档), and each control is
   positioned by its own rules, since one of them is absolutely placed.
   While the pill is there, the active item's own background gives way to it.
   The slide ignores the system's reduced-motion request on purpose: a
   quarter-second move of one small box is how the switch reads, and the user
   asked for it to always play. */
body[data-dsh-claude-style] [data-dsh-claude-pill]::before {
  content: "";
  position: absolute;
  left: 0;
  width: var(--dsh-claude-pill-w, 0px);
  transform: translateX(var(--dsh-claude-pill-x, 0px));
  pointer-events: none;
  transition: transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
}
/* The items paint above the pill, which is the control's first painted box. */
body[data-dsh-claude-style] [data-dsh-claude-pill] > * {
  position: relative;
  z-index: 1;
}

/* ---------- canvas + hairline structure ---------- */
/* Under the Claude palette the skin paints the columns; under "follow the
   host" they take the host's own tokens and only the hairline stays. */
body[data-dsh-claude-style][data-dsh-claude-palette="claude"] :is([data-pane="sidebar"], [class*="sidebarCol"], .dshDesktopSidebarSurface) {
  --dsw-specific-sidebar-fill: var(--dsh-claude-sidebar-canvas);
  background: var(--dsh-claude-sidebar-canvas);
}

body[data-dsh-claude-style] :is([data-pane="sidebar"], [class*="sidebarCol"], .dshDesktopSidebarSurface) {
  border-right: 1px solid var(--dsw-alias-border-l1);
}

body[data-dsh-claude-style][data-dsh-claude-palette="claude"] :is([data-pane="conversation"], [class*="centerCol"]) {
  background: var(--dsh-claude-canvas);
}

/* ---------- Windows titlebar: the columns run to the window's top ---------- */
/* The shell keeps a caption row above every column and paints the three window
   buttons over it; the skin clears the row and each column paints its own fill
   up through it (D31). */
html[data-windows-titlebar] body[data-dsh-claude-style] [class*="_frame"]:has(> [class*="_sidebarCol"]) {
  --dsh-windows-content-radius: 0px;
  background: var(--dsh-claude-canvas) !important;
}

html[data-windows-titlebar] body[data-dsh-claude-style] [class*="_frame"]:has(> [class*="_sidebarCol"])::before {
  background: transparent !important;
}

html[data-windows-titlebar] body[data-dsh-claude-style] > span[style*="--dsw-specific-sidebar-fill"] {
  background-color: transparent !important;
}

html[data-windows-titlebar] body[data-dsh-claude-style] [class*="_frame"] > [class*="_sidebarCol"] {
  box-shadow: 0 calc(-1 * var(--dsh-windows-titlebar-height)) 0 0 var(--dsh-claude-sidebar-canvas);
}

html[data-windows-titlebar] body[data-dsh-claude-style] [class*="_frame"] > [class*="_centerCol"] {
  box-shadow: 0 calc(-1 * var(--dsh-windows-titlebar-height)) 0 0 var(--dsh-claude-canvas);
}

/* The handle is 8px wide, centred on the column edge; the sidebar's 1px
   hairline is the last pixel inside the column, 3px into the handle. */
html[data-windows-titlebar] body[data-dsh-claude-style] [class*="_frame"] > [data-side="sidebar"]::before {
  content: "";
  position: absolute;
  left: 3px;
  bottom: 100%;
  height: var(--dsh-windows-titlebar-height);
  border-left: 1px solid var(--dsw-alias-border-l1);
  pointer-events: none;
}

/* ---------- the right sidebar's panels as floating cards ---------- */
/* A panel docked in the right column floats 8px inside the window: the skin's
   hairline and the host's own panel elevation over the frame's canvas. It hangs on
   what paints the column — a docked tab's pane, or the column's own empty host; a
   panel pulled out into the host's floating window is left to that window. */
body[data-dsh-claude-style] [class*="_rightbarCol"] :is([data-dockkit-empty], [data-dockkit-host="dock"] > [data-dockkit-pane]) {
  margin: 8px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  box-shadow: var(--dsw-elevation-prominent);
}

/* The column's start page centers its stack in a box that never grows, so a list
   taller than the pane is clipped at both ends with no way to reach it. The stack
   scrolls instead: the two auto margins hold the centering while it fits and stay
   at zero once it does not, and the host's trailing 10% spacer shrinks away. */
body[data-dsh-claude-style] [class*="_rightbarCol"] [class*="_guide"] {
  justify-content: flex-start !important;
  overflow-y: auto !important;
}
body[data-dsh-claude-style] [class*="_rightbarCol"] [class*="_guide"] > :first-child {
  margin-top: auto !important;
}
body[data-dsh-claude-style] [class*="_rightbarCol"] [class*="_guide"] > :last-child {
  margin-bottom: auto !important;
}

/* ---------- clay accent: one emphasis color, disciplined ---------- */
/* A host button anchor (\`_linkButton\`, e.g. the settings page's 充值) states its
   own ink; repainting it here would paint the label the same colour as its fill. */
body[data-dsh-claude-style] a:not([class*="_linkButton"]) {
  color: var(--dsw-alias-link);
}

body[data-dsh-claude-style] a:not([class*="_linkButton"]):hover {
  color: var(--dsh-claude-link-hover);
}

body[data-dsh-claude-style] button[class*="brand"]:not([class*="dsh-claude"]) {
  color: var(--dsw-alias-brand-primary);
}

/* The baked-in wordmark badge (pill rect + letter paths) crowds the whale and
   the wordmark; hide it so the brand reads as mark + word. */
body[data-dsh-claude-style] button[class*="brand"]:not([class*="dsh-claude"]) rect[fill="currentColor"],
body[data-dsh-claude-style] button[class*="brand"]:not([class*="dsh-claude"]) path[fill*="label-primary-inverted"] {
  display: none;
}

/* pill CTAs: send + settings sidebar actions */
body[data-dsh-claude-style] button[class*="_brand"],
body[data-dsh-claude-style] button[class*="_primary"],
body[data-dsh-claude-style] [data-slot="sidebar.settings"] > :is(button, [role="button"]) {
  border-radius: 9999px;
  background: var(--dsw-alias-button-primary-fill);
  color: #ffffff;
  font-weight: 500;
}

body[data-dsh-claude-style] button[class*="_brand"]:hover,
body[data-dsh-claude-style] button[class*="_primary"]:hover,
body[data-dsh-claude-style] [data-slot="sidebar.settings"] > :is(button, [role="button"]):hover {
  background: var(--dsw-alias-button-primary-hover);
}

/* Brand logo chip: the clay pill goes, so the mark and wordmark sit on the
   canvas and the pill's arc stops clipping the mark's leading edge. Every
   "brand" rule excludes the skin's own controls: the settings page's brand
   cards carry the same substring and draw their own box. */
body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*="brand"]:not([class*="dsh-claude"]),
body[data-dsh-claude-style][data-ds-dark-theme] button[class*="brand"]:not([class*="dsh-claude"]) {
  background: transparent;
  border: none;
  border-radius: 0;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*="brand"]:not([class*="dsh-claude"]) {
  color: var(--dsh-claude-logo-ink);
}

body[data-dsh-claude-style][data-ds-dark-theme] button[class*="brand"]:not([class*="dsh-claude"]) {
  color: var(--dsh-claude-logo-ink);
}

/* Host badges and tags: full pill, each named by its own CSS-module class (D3),
   so a plugin's own badge keeps the shape it draws. corner-shape: round undoes
   the host's superellipse sheet, which squares a pill's ends. */
body[data-dsh-claude-style] :is(
  [class*="_tagSystem"],
  [class*="_tagUser"],
  [class*="_tagContext"],
  [class*="_tagMessage"],
  [class*="_tagTool"],
  [class*="_tagSubtool"],
  [class*="_kindTag"]:not([class*="_kindTagIcon"], [class*="_kindTagLabel"]),
  [class*="_rowTag"],
  [class*="_optionLine"] > [class*="_badge"],
  [class*="_attemptBadge"],
  [class*="_keyBadge"]
) {
  border-radius: 9999px;
  corner-shape: round;
}

/* ---------- chrome details ---------- */
body[data-dsh-claude-style] * {
  scrollbar-width: thin;
  scrollbar-color: var(--dsh-claude-scrollbar) transparent;
}

body[data-dsh-claude-style] ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

body[data-dsh-claude-style] ::-webkit-scrollbar-track {
  background: transparent;
}

body[data-dsh-claude-style] ::-webkit-scrollbar-thumb {
  background: var(--dsh-claude-scrollbar);
  border-radius: 9999px;
}

body[data-dsh-claude-style] ::-webkit-scrollbar-thumb:hover {
  background: var(--dsh-claude-scrollbar-hover);
}

/* Text selection: white on blue, gray on black while the window is blurred.
   !important and solid colours because the paint has to cover the ink the host
   and this skin put under it (links, code, syntax tokens). The unfocused rule
   comes after the focused one at the same weight, so the attribute decides.
   Scope: text blocks in the conversation and the draft editor only (D35).
   Selection styles inherit, so the blocks carry their inline descendants. */
body[data-dsh-claude-style] :is([data-chat-flow], [data-lexical-editor]) :is(p, li, td, th, blockquote, pre, h1, h2, h3, h4, h5, h6)::selection {
  background-color: #3366d0 !important;
  color: #ffffff !important;
}

body[data-dsh-claude-style][data-dsh-window-blur] :is([data-chat-flow], [data-lexical-editor]) :is(p, li, td, th, blockquote, pre, h1, h2, h3, h4, h5, h6)::selection {
  background-color: #c7c7c6 !important;
  color: #000000 !important;
}

/* Inline-code chips: the chip's own background paints above the selection
   highlight, so these paints are the channel-wise inverse of that wash. */
body[data-dsh-claude-style] [data-chat-flow] code:not(pre code)::selection {
  background-color: rgb(40, 94, 206) !important;
}

body[data-dsh-claude-style][data-dsh-window-blur] [data-chat-flow] code:not(pre code)::selection {
  background-color: rgb(196, 196, 195) !important;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-chat-flow] code:not(pre code)::selection {
  background-color: rgb(54, 107, 219) !important;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme])[data-dsh-window-blur] [data-chat-flow] code:not(pre code)::selection {
  background-color: rgb(209, 209, 208) !important;
}

body[data-dsh-claude-style] :is(button, input, textarea, select, [role="button"], [role="tab"], [role="treeitem"]) {
  outline: none;
}

/* Keyboard focus ring: espresso ink on light, bright ivory on dark — a
   near-black canvas gets a light ring. */
body[data-dsh-claude-style] :is(button, input, textarea, select, [role="button"], [role="tab"], [role="treeitem"]):focus-visible {
  outline: 2px solid rgba(20, 20, 19, 0.45);
  outline-offset: 1px;
}

body[data-dsh-claude-style][data-ds-dark-theme] :is(button, input, textarea, select, [role="button"], [role="tab"], [role="treeitem"]):focus-visible {
  outline-color: rgba(250, 249, 245, 0.60);
}

/* ---------- composer dock overlays ---------- */
/* The queue, the todo list and the goal bar live inside the composer seat,
   which is its own stacking context (sticky + z-index 7); a z-index on them
   orders them among the seat's children and cannot lift them over the message
   cards, which sit outside the seat. */

/* The header actions sit outside that seat, so their z-index is read against
   the page: 9 clears the message layer (pinned headers 7, back-to-bottom 8) and
   stays under ui-dockkit's dock layers (10, 40 fullscreen). */
body[data-dsh-claude-style] [data-slot="conversation.session.header.actions"] > * {
  position: relative;
  z-index: 9;
}

/* The queue dock's spacing is the host's to own: its own rule cancels the stack
   gap and tucks 3px under the input card. No rule here on purpose — re-add one
   only if the host changes its geometry. */

/* The conversation header carries the host's own bottom border — the line under
   the tabs; the transcript's top fade below takes over that job. Scoped with
   :has() to the header that owns the tab strip, so no other header loses its edge. */
body[data-dsh-claude-style] [class*="_header"]:has([class*="_tabs"]) {
  border-bottom-color: transparent;
  /* The host's header rule sets no position, so it is static and an absolutely
     positioned band would anchor to a far ancestor. The stickiness lives on the
     header's parent, so relative is safe here. */
  position: relative;
  overflow: visible;
}

/* The transcript's top fade: the header already covers the transcript, so the
   band hangs off the header's own bottom edge and follows it. One knob,
   --dsh-transcript-fade-h, matching the composer's own fade. */
body[data-dsh-claude-style] [class*="_header"]:has([class*="_tabs"])::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: var(--dsh-transcript-fade-h, 28px);
  /* Four stops: a straight ramp reads as a haze band, and color-mix keeps the
     paint theme-aware. */
  background: linear-gradient(
    to bottom,
    var(--dsw-alias-bg-base, #FCFCFB) 0%,
    color-mix(in srgb, var(--dsw-alias-bg-base, #FCFCFB) 82%, transparent) 32%,
    color-mix(in srgb, var(--dsw-alias-bg-base, #FCFCFB) 40%, transparent) 68%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 1;
}

/* ---------- the animation choice: reduced motion ---------- */
/* The resolved choice rides <body data-dsh-claude-motion> (packages/client/src/core/prefs.ts,
   D26), because a stylesheet cannot talk a media query out of the system's
   setting. Scoped to the skin's own class prefix so the host's transitions stay
   as the host wrote them. Two things keep moving on purpose: the segmented
   controls' sliding pill and the background-work ring (theme/sidebar.css). */
body[data-dsh-claude-style][data-dsh-claude-motion="reduced"] [class*="dsh-claude-"] {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* ---------- conversation view tabs: the skin's own segment control ---------- */
/* The host's tab strip (ConversationRoot's .tabs / .tab / .tabActive) gets
   the same shape as the sidebar's 进行中 / 已归档 control: a 7px pill shell with a
   raised pill for the active tab, instead of the shipped underline. Scoped to the
   strip packages/client/src/features/view-tabs/view-tabs.ts stamps data-dsh-view-tabs on — the one in the
   conversation header — so the settings page's own tabs keep their look. The
   stamp stands in for \`header:has(tabs) tabs\`, which made every DOM change
   re-match the whole document. */
body[data-dsh-claude-style] [data-dsh-view-tabs] {
  display: inline-flex;
  /* Hug the tabs. The host's strip is a full-width flex row, so without this the
     pill shell stretches across the whole header: the "groove" reads as one long
     empty bar and clicks to the right of the last tab land on nothing — which is
     what made switching feel unresponsive. */
  width: fit-content;
  max-width: 100%;
  flex: none;
  align-self: flex-start;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.06));
  /* Horizontally centred in the header (the strip already spans grid-column 1/-1,
     so justify-self alone does it). The vertical shift is MEASURED, not fixed: the
     title's row also carries the header actions, so whether the strip can rise onto
     it depends on the window — packages/client/src/features/view-tabs/view-tabs.ts writes
     --dsh-view-tabs-shift when the room is there, and this fallback (its own row,
     10px up from y=50) holds the rest of the time. */
  justify-self: center;
  transform: translateY(var(--dsh-view-tabs-shift, -10px));
  /* The sliding pill (shared/sliding-pill.css) is absolutely placed against the strip. */
  position: relative;
  /* A view switcher, not furniture: it fades in when the pointer is in the
     conversation pane and out when it leaves, the same idiom as the sidebar's
     进行中 / 已归档 control. Opacity, not display, so the header keeps its height
     and the actions beside it never move. */
  opacity: 0;
  transition: opacity 0.16s ease;
}
/* \`centerCol\` is the pane holding the header AND the transcript, so hovering the
   strip itself keeps it up, while the right sidebar — which sits outside it —
   does not bring it back. */
body[data-dsh-claude-style] [class*="centerCol"]:hover [data-dsh-view-tabs] {
  opacity: 1;
}
body[data-dsh-claude-style][data-ds-dark-theme] [data-dsh-view-tabs] {
  background: rgba(255, 255, 255, 0.08);
}
body[data-dsh-claude-style] [data-dsh-view-tabs] > [class*="_tab"] {
  appearance: none;
  border: none !important;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  font-family: var(--dsw-font-family);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  height: 22px;
  padding: 0 10px;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: color 0.2s ease;
}
body[data-dsh-claude-style] [data-dsh-view-tabs] > [class*="_tab"]:hover {
  color: var(--dsw-alias-label-primary, #141413);
}
body[data-dsh-claude-style] [data-dsh-view-tabs] > [class*="_tab"][aria-selected="true"],
body[data-dsh-claude-style] [data-dsh-view-tabs] > [class*="_tab"][class*="Active"] {
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #141413);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.10);
}
body[data-dsh-claude-style][data-ds-dark-theme] [data-dsh-view-tabs] > [class*="_tab"][aria-selected="true"],
body[data-dsh-claude-style][data-ds-dark-theme] [data-dsh-view-tabs] > [class*="_tab"][class*="Active"] {
  background: rgba(255, 255, 255, 0.14);
  color: var(--dsh-claude-ink-strong);
  box-shadow: none;
}
/* The strip's sliding pill (shared/sliding-pill.css places and moves it):
   the raised box the active tab wore above, which the tab gives up while the
   pill is there. */
body[data-dsh-claude-style] [data-dsh-view-tabs][data-dsh-claude-pill]::before {
  top: 2px;
  bottom: 2px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.10);
}
body[data-dsh-claude-style][data-ds-dark-theme] [data-dsh-view-tabs][data-dsh-claude-pill]::before {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: none;
}
body[data-dsh-claude-style] [data-dsh-view-tabs][data-dsh-claude-pill] > [class*="_tab"][aria-selected="true"],
body[data-dsh-claude-style] [data-dsh-view-tabs][data-dsh-claude-pill] > [class*="_tab"][class*="Active"] {
  background: transparent;
  box-shadow: none;
}
/* The shipped active-tab underline has no place in a pill. */
body[data-dsh-claude-style] [data-dsh-view-tabs] > [class*="_tab"]::after {
  display: none;
}

/* ---------- Windows titlebar mode: the strip moves into the titlebar ---------- */
/* The desktop shell marks <html> with data-windows-titlebar and draws the
   titlebar strip with the frame's ::before; packages/client/src/features/view-tabs/view-tabs.ts mirrors
   the marker onto <body>. There the strip leaves its own row and sits fixed in
   the titlebar, horizontally centred in the window — the same row the host
   gives the collapsed sidebar's new-session button. The measured
   --dsh-view-tabs-shift is not written in this mode, so the base transform
   gives way.
   macOS has no such block: its shell leaves the frame unpadded, so the
   conversation header draws its first row inside the strip and the measured
   shift seats the tabs on the row beneath it (view-tabs.ts). */
body[data-dsh-claude-style][data-dsh-titlebar-tabs] [data-dsh-view-tabs] {
  position: fixed !important;
  top: calc(var(--dsh-windows-titlebar-height, 40px) / 2) !important;
  left: 50% !important;
  /* The host's own strip carries a top margin for its row; fixed placement
     must not inherit it, or the translate would be off centre. */
  margin: 0 !important;
  transform: translate(-50%, -50%) !important;
  justify-self: auto !important;
  z-index: 30 !important;
  /* The titlebar band is a drag region; the strip's tabs must stay clickable. */
  -webkit-app-region: no-drag !important;
  /* The pane-hover reveal stays the rule here, as it was inside the header. The
     strip now sits outside the pane, so the pointer leaving the pane on its way
     up must not blank it: its own hover keeps it up, and the longer fade covers
     the 40px crossing between the pane and the titlebar. */
  opacity: 0 !important;
  transition: opacity 0.3s ease !important;
}
body[data-dsh-claude-style][data-dsh-titlebar-tabs] [data-dsh-view-tabs]:hover {
  opacity: 1 !important;
}
/* The pane-hover reveal above cannot outweigh this mode's own resting opacity,
   which is stated with \`!important\` because the strip is fixed over the caption
   row; without this the strip only answers the pointer once it is already in
   that row. */
body[data-dsh-claude-style][data-dsh-titlebar-tabs] [class*="centerCol"]:hover [data-dsh-view-tabs] {
  opacity: 1 !important;
}
/* The strip's row is gone from the flow, so the header takes the shape it has
   when it owns no tab strip: no min-height, and the bottom padding the host
   gives that shape. */
body[data-dsh-claude-style][data-dsh-titlebar-tabs] [class*="_header"]:has([class*="_tabs"]) {
  min-height: 0 !important;
  padding-bottom: 10px !important;
}

/* ---------- Claude Code layout: hero brand mark ---------- */
/* The new-conversation hero ships the DeepSeek fish; swap it for the selected
   brand mark. Every child of the hitbox is hidden — the mark can sit behind a
   slot wrapper, not always a bare svg — and the mark is painted on the hitbox,
   so React keeps owning its own node. The hero keeps the clay fill in both
   brands, matching the shipped accent treatment. */
body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="fishHitbox"] > * {
  display: none !important;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="fishHitbox"] svg {
  display: none;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="fishHitbox"]::before {
  content: "";
  flex: none;
  width: 42.5px;
  height: 42.5px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="fishHitbox"]::before {
  background-image: var(--dsh-claude-image-claude-mark-clay);
}

/* The DeepSeek brand keeps the host's own fish, and paints it in DeepSeek's
   brand blue (the host inks it with the headline's primary label). */
body[data-dsh-claude-style][data-dsh-claude-brand="deepseek"] [class*="fishHitbox"] svg {
  color: var(--dsh-claude-logo-ink);
}

/* The preview badge has no Claude Code counterpart. */
body[data-dsh-claude-style] [class*="previewBadge"] {
  display: none;
}

/* Headline: the shipped 26px/32px editorial display, then 15% back off that
   (52 -> 44.2) and one weight step below the display rule. */
body[data-dsh-claude-style] [class*="headline"]:has([class*="fishHitbox"]) {
  font-size: 44.2px;
  line-height: 54.4px;
  font-weight: 400;
}

/* The conversation header's title row in the Windows desktop caption row (D52).

   The pass stamps each piece it lifted and writes one number per side; a side
   it left in the row carries no stamp, these rules miss it, and the header the
   host draws is the fallback — nothing has to be restored. The caption row is
   the shell's own drag region, so every piece placed in it declares itself
   no-drag: a control that cannot be pressed is not a control. */

body[data-dsh-claude-style][data-dsh-header-band~="title"] [data-dsh-header-title] {
  position: fixed !important;
  /* The pass centres the box on the row's middle plus its own optical nudge. */
  top: var(--dsh-header-band-title-top, calc(var(--dsh-windows-titlebar-height, 40px) / 2)) !important;
  left: var(--dsh-header-band-left) !important;
  /* The room the pass measured: past it the title would run into the tab strip
     or the controls. The title's own crumb ellipsizes inside whatever width
     this leaves (the host's own rule, unchanged). */
  max-width: var(--dsh-header-band-max, none) !important;
  margin: 0 !important;
  transform: translateY(-50%) !important;
  z-index: 30 !important;
  -webkit-app-region: no-drag !important;
}

/* The view-tab strip: view-tabs places it at the window's centre, and with the
   title and the controls standing on either side of it that no longer reads as
   the middle of the row. The pass hands it the middle of what is left between
   them, and the strip's own translate keeps it centred on that value. */
body[data-dsh-claude-style][data-dsh-titlebar-tabs] [data-dsh-header-band-tabs] {
  left: var(--dsh-header-band-tabs-left, 50%) !important;
}

/* The row the title left: what it still holds — the preset picker, the
   background-task chips, whatever the host mounts — rides up to sit just under
   the title instead of on the line the title used to take. It is offset, not
   re-laid: a margin would resize the row inside the header's own grid, and an
   offset leaves the header's height — and with it the conversation below —
   where the host put it. The pass writes the rise it measured, so the host's
   inset is not assumed, and the row declares itself no-drag: its top now lies
   inside the shell's drag strip. */
body[data-dsh-claude-style][data-dsh-header-band~="title"] [data-dsh-header-row] {
  position: relative !important;
  top: var(--dsh-header-band-row-lift, 0px) !important;
  -webkit-app-region: no-drag !important;
}
/* The host hides a chip's label through a container query on the row's own
   width, which protects the title when the two share it. In the caption row the
   title takes no width, so the row has room and the control would only be
   missing; the label stays. */
body[data-dsh-claude-style][data-dsh-header-band~="title"] [data-dsh-header-row] [class*="_label"] {
  display: flex !important;
}

body[data-dsh-claude-style][data-dsh-header-band~="actions"] [data-dsh-header-actions],
body[data-dsh-claude-style][data-dsh-header-band~="actions"] [data-dsh-header-corner] {
  position: fixed !important;
  top: calc(var(--dsh-windows-titlebar-height, 40px) / 2) !important;
  /* Both clusters keep their order and their air through this offset alone:
     the corner sits off the caption buttons, the utilities off the corner. */
  right: var(--dsh-header-band-right) !important;
  /* The utilities carry the host's own left margin for the row's flow; a
     fixed box has no row to keep clear of. */
  margin: 0 !important;
  transform: translateY(-50%) !important;
  z-index: 30 !important;
  -webkit-app-region: no-drag !important;
}

/* ---------- Claude Code layout: composer input + buttons ---------- */
/* @composer-gate */
/* Everything from here down is the "Composer restyle" preference's territory:
   the build stamps \`[data-dsh-claude-composer-active]\` onto every rule below
   this marker, and the skin sets that attribute on <body> only while the page
   on screen is a surface the preference covers. Above the marker sits the hero
   brand mark and headline, which belong to the brand preference instead — a
   composer scope of "conversation only" must not revert them. */
/* The composer card is the input box: one step up in type size, pure white
   so it separates from the canvas, and an outline 4px tighter than the
   shipped 22px. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] {
  font-size: 15px;
  border-radius: 18px;
  border: 1px solid var(--dsw-alias-border-l1);
  position: relative;
  z-index: 2;
  gap: 8px;
  padding-bottom: 2px;
  min-height: 0;
  height: auto;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}

/* Input height, by composer variant. The hero (new conversation) keeps the
   tall 86px field it was tuned to. An active conversation instead hugs its
   draft: the shipped 36px floor holds exactly one line, the contenteditable
   then grows a line at a time, and .scroll caps the box at
   --dsh-composer-text-max-height before it starts scrolling. Both hooks are
   ancestors of the field, so :is() also keeps the tall field through the
   settling frame, while an active composer matches neither. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] :is([class*="composerHero"], [data-phase="hero"]) [data-composer-input] {
  min-height: 86px;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-input] {
  min-height: 36px;
  height: auto;
}

/* The hero's hint, for the times the skin has to supply it.
   The host renders its own placeholder only while the draft is empty AND
   nothing is attached (\`draft === "" && attachments.length === 0\`), so pasting
   an image with no text removes it — and the skin's synthetic stand-in carries
   none of the host's classes, so without this rule it fell back to a static
   block in the card's own ink colour, below the field instead of on it. The
   hero keeps the host's field metrics (the skin only raises its min-height), so
   the stand-in takes the host's own inset — 4px down, 14px in — rather than the
   inline variant's zero-origin line box. The host's \`.grow\` is already
   \`position: relative\`, so the offsets resolve against the field. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="hero"] [data-dsh-synthetic-placeholder] {
  position: absolute !important;
  top: 4px !important;
  left: 14px !important;
  right: 8px !important;
  color: var(--dsw-alias-label-caption) !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
  overflow: hidden !important;
  pointer-events: none !important;
  user-select: none !important;
}

/* Tight bottom padding below the button controls row. The selector must
   be \`[class*="_row"]\`: a bare \`[class*="row"]\` substring-matches the
   shipped input growth wrapper \`.p_FcLG_grow\` ("grow" contains "row"),
   which pins the composer field to the toolbar-row metrics. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_row"] {
  padding-bottom: 2px;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card] {
  background: var(--dsw-specific-input-major);
  box-shadow: 0 4px 12px rgba(20, 20, 19, 0.04), 0 1px 3px rgba(20, 20, 19, 0.02);
}

body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-composer-card] {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.15);
}

/* Focus: the shipped field has no focus face at all — only the caret moves —
   so this adds one, in the input box's own shadow colour rather than the
   accent: the hairline takes the drop-shadow tint (espresso in light), a 1px
   halo in the same tone hugs the edge, and the drop shadow deepens. Dark sits
   on a near-black canvas, where black-on-black carries no cue at all — there
   the focus face inverts to a BRIGHT ivory rim and halo, so the field visibly
   lights up instead of deepening. The tray below continues the same hairline,
   so its three edges follow whenever the card above it holds focus. */
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card]:focus-within {
  border-color: rgba(20, 20, 19, 0.18);
  box-shadow: 0 0 0 1px rgba(20, 20, 19, 0.065), 0 6px 18px rgba(20, 20, 19, 0.03), 0 2px 6px rgba(20, 20, 19, 0.015);
}

body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-composer-card]:focus-within {
  border-color: rgba(250, 249, 245, 0.22);
  box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.09), 0 6px 24px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.11);
}

/* The seat paints the bar and its fade band (see features/composer/inline.css), so the
   base rules above hold the pure card fill and the real drop shadow on every variant. */

/* The hero's workspace row sits on the card and takes its focus ring. The row
   comes before the card in the stack, so no sibling selector reaches it from
   the card; focus inside the stack but not inside the row itself is the card's
   (\`:has(card:focus-within)\` made every DOM change re-match the document). */
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [class*="_composerStack"]:focus-within > [class*="heroWorkspaceRow"]:not(:focus-within) {
  border-color: rgba(20, 20, 19, 0.18);
}

body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [class*="_composerStack"]:focus-within > [class*="heroWorkspaceRow"]:not(:focus-within) {
  border-color: rgba(250, 249, 245, 0.22);
}

/* The workspace-trigger variant paints its dashed ring through a masked svg
   cut with rx=22; re-cut it so the ring tracks the 18px card. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card]:after {
  border-radius: 18px;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27none%27 rx=%2718%27 ry=%2718%27 stroke=%27black%27 stroke-width=%272%27 stroke-dasharray=%274 4%27/%3E%3C/svg%3E");
  mask: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27none%27 rx=%2718%27 ry=%2718%27 stroke=%27black%27 stroke-width=%272%27 stroke-dasharray=%274 4%27/%3E%3C/svg%3E");
}

/* Commands and attach: 7px corners instead of the shipped full circle, no
   resting fill, and a warm plate on hover. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] button[data-dsh-claude-control="commands"] {
  border-radius: 7px;
}

/* Send, and the stop/queue/steer labels that replace it while running: the
   shipped 34px circle becomes a 7px rounded rectangle. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] :is(button[data-dsh-claude-control="send"], button[data-dsh-claude-control="stop"]) {
  border-radius: 7px;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) button[data-dsh-claude-control="commands"] {
  background: transparent;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) button[data-dsh-claude-control="commands"]:hover:not(:disabled) {
  background: var(--dsh-claude-chip);
}

/* Model selector: the same type size as the permission segments and the
   same 7px corners; its chevron is dropped while the click target and the
   menu it opens stay exactly as shipped. Its shipped hover token is only a
   ~6% tint, so the hover plate matches the composer tool buttons. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_trigger"] {
  font-size: 14px;
  border-radius: 7px;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card] [class*="_trigger"]:hover:not(:disabled) {
  background: var(--dsh-claude-chip);
}

body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_chevron"] {
  display: none;
}

/* ---------- Claude Code layout: composer footer bar ---------- */
/* Reference layout: two-tier integrated tray. The top card is a pure white
   rounded card with drop shadow (z-index: 2). The bottom tray is a seamless
   equal-width tray (z-index: 1) attached directly to the bottom of the card,
   with transparent background (inheriting the canvas tone #fcfcfb),
   left/right/bottom border, and 18px rounded bottom corners.

   The tray belongs to the CLASSIC home layout: the studio layout
   (features/home/home-panel.css) places the workspace row as a plain context row
   above the card and the usage panel between them, so every rule below is
   scoped away from it. */
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-dsh-claude-home-layout="studio"]) [class*="_composerStack"][data-composer-variant="hero"] {
  --dsh-claude-bar-h: 96px;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-dsh-claude-home-layout="studio"]) [class*="_composerStack"][data-composer-variant="hero"] *:has([data-composer-card]) {
  order: 1;
  padding-bottom: 0 !important;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-dsh-claude-home-layout="studio"]) [class*="_composerStack"][data-composer-variant="hero"] [data-composer-card] {
  gap: 8px !important;
  padding-bottom: 2px !important;
  min-height: 0 !important;
  height: auto !important;
}

body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-dsh-claude-home-layout="studio"]) [class*="_composerStack"][data-composer-variant="hero"] > [class*="heroWorkspaceRow"] {
  order: 2;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  height: calc(var(--dsh-claude-bar-h) + 18px);
  width: calc(100% - var(--dsh-composer-side-clearance, 0px) - var(--dsh-composer-side-clearance, 0px));
  max-width: var(--dsh-composer-card-max-width, 100%);
  margin: calc(0px - var(--dsh-composer-stack-gap, 6px) - 18px) auto 0;
  padding: 18px 16px 0 16px;
  background: transparent;
  border-left: 1px solid var(--dsw-alias-border-l1);
  border-right: 1px solid var(--dsw-alias-border-l1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  border-top: none;
  border-radius: 0 0 18px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.12s ease;
}

/* Muted typography and 7px corners for footer controls */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="heroWorkspaceRow"] :is(button, [role="button"]) {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
  border-radius: 7px;
}

/* Hide chevrons in the footer tray for a clean, minimal Claude Code look */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="heroWorkspaceRow"] :is([class*="_chevron"], [class*="Chevron"]) {
  display: none;
}

/* ---------- Claude Code layout: composer send button ---------- */
/* An empty composer keeps the send button in place but drops it to a ghost:
   transparent plate, a hairline in the input box border colour, and the glyph
   in the same colour the model control uses for its effort tier (low/high), so
   it reads as not-ready instead of vanishing. Flat by design (no shadow), and
   border-box keeps the outer 34px so the row does not shift. The stop/queue/
   steer labels are untouched, so a running turn keeps its control even with an
   empty draft. The empty draft is the card's data-dsh-claude-draft-empty mark
   (packages/client/src/features/composer/composer.ts). */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card]:not([data-has-attachments="true"])[data-dsh-claude-draft-empty] button[data-dsh-claude-control="send"] {
  box-sizing: border-box;
  background: transparent;
  color: var(--dsw-alias-label-caption);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: none;
  cursor: default;
}

/* @composer-gate */
/* ---------- In-conversation single-line composer ---------- */
/* In an active conversation, compress composer to a single-line input card,
   render send button as an enter symbol ↵ inside the card on the right,
   and display toolbar controls directly underneath on the canvas. */

/* Every rule in this file lists its selector twice. The first form reads
   data-composer-variant, which the composer feature's pass writes
   (packages/client/src/features/composer/composer.ts); the second reads the host's own structure —
   data-composer-card is a host attribute that predates the skin, and a
   composerStack carrying no hero variant holds the inline card. Before the
   first pass lands, only the second form matches, so dropping it would leave
   those frames unstyled. New rules keep both forms. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"]:focus-within,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:focus-within {
  background: transparent;
  border: none !important;
  /* No canvas wash here: the seat behind the composer paints the opaque bar and
     its fade band (see the seat rules below), so the card needs no
     background-coloured shadow to hide the transcript scrolling past. */
  box-shadow: none;
  outline: none;
  padding: 0;
  gap: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  max-width: var(--dsh-composer-card-max-width, 100%);
  box-sizing: border-box;
  overflow: visible;
  height: auto;
}
/* Do NOT override the host viewArea flex contract here. In the active
   phase the host uses \`flex: 1 0 auto; min-height: auto\` so the viewArea
   is content-sized and the sticky composerSeat pins to the scrollport
   bottom. An earlier override (\`flex: 1 1 auto; min-height: 0\`) let the
   viewArea shrink to exactly viewport-minus-composer, which put the
   composer seat near the TOP of the scroll content — sticky bottom:0
   cannot pull an element down past its normal position, so the composer
   appeared mid-scroll and never followed message growth. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) {
  flex: 0 0 auto;
  overflow: visible;
  height: auto;
  max-height: none;
}
/* ---------- the transcript's bottom edge ---------- */
/* The chat fades into the canvas where the composer begins. The seat paints an
   opaque canvas-coloured BAR across its own box — so the bar's height IS the
   composer's height (card, toolbar row, stats, dock), nothing to keep in sync —
   and one GRADIENT band sits directly above it, running from the bar's colour
   up to transparent.
   One paint, one token, and it is the host's own idiom — its seat already
   carries a 36px version of this gradient in the active phase; the bar simply
   covers the rest of the seat, which the host leaves transparent.
   \`--dsh-composer-fade-h\` is the single knob: it is the band's height AND the
   transcript's bottom clearance below, so the last turn always comes to rest
   exactly at the band's top edge. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] {
  --dsh-composer-fade-h: 40px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] :is([data-phase="active"], [data-content-phase="active"]) [data-composer-seat] {
  background: var(--dsw-alias-bg-base);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] :is([data-phase="active"], [data-content-phase="active"]) [data-composer-seat]::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: var(--dsh-composer-fade-h, 40px);
  /* Four stops, matching the transcript's top band in reverse: a straight
     100% -> 0% ramp reads as a haze band, so hold near-opaque against the card
     and ease out upward. color-mix keeps it theme-aware. */
  background: linear-gradient(
    to top,
    var(--dsw-alias-bg-base, #FCFCFB) 0%,
    color-mix(in srgb, var(--dsw-alias-bg-base, #FCFCFB) 82%, transparent) 32%,
    color-mix(in srgb, var(--dsw-alias-bg-base, #FCFCFB) 40%, transparent) 68%,
    transparent 100%
  );
  pointer-events: none;
}
/* Message body clearance: the transcript ends where the fade band begins (same
   token as the band's height), so the last turn's action buttons (copy, retry,
   …) rest clear of the fade instead of being washed by it. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="viewArea"] {
  padding-bottom: var(--dsh-composer-fade-h, 40px);
}
/* The composer is a chat-view affordance. The host keeps the seat mounted on
   every conversation tab (轨迹 / 上下文 even reserve room for it), but it
   should only show on the chat tab — drop the whole bottom area otherwise.
   Hiding the seat also zeroes the host's --dsh-composer-height, so the
   trajectory ledger's bottom clearance collapses with it. */
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-dsh-claude-composer-hidden] [data-composer-seat] {
  display: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"]:not([data-has-attachments="true"]) [class*="_rail"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:not([data-has-attachments="true"]) [class*="_rail"] {
  display: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"] [class*="_rail"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"] [class*="_rail"] {
  background: var(--dsw-specific-input-major, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1) !important;
  border-bottom: none !important;
  border-radius: 14px 14px 0 0;
  padding: 12px 14px 10px 14px;
  margin: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 162px;
  height: auto;
  overflow: visible;
  /* Flat: the seat's bar is what hides the transcript behind the composer, so
     the rail needs no canvas-coloured shadow of its own to add to it. */
  box-shadow: none;
  position: relative;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"] [class*="_rail"],
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"] [class*="_rail"] {
  background: var(--dsw-specific-input-major);
  border-color: var(--dsw-alias-border-l1);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant="inline"]:focus-within [class*="_rail"],
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:focus-within [class*="_rail"] {
  border-color: rgba(20, 20, 19, 0.18) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-composer-card][data-composer-variant="inline"]:focus-within [class*="_rail"],
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:focus-within [class*="_rail"] {
  border-color: rgba(250, 249, 245, 0.22) !important;
}
/* The attachment rail nests two levels: ComposerAttachments' outer rail wraps
   AttachmentRail's scrolling inner rail, and BOTH substring-match
   \`[class*="_rail"]\`, so the block above would draw the card frame twice —
   one box inside the other. Only the outer shell carries the frame; the
   inner scrolling rail stays frameless. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"] [class*="_rail"] [class*="_rail"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"] [class*="_rail"] [class*="_rail"] {
  background: transparent;
  border: none !important;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  min-height: 140px;
  height: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
}
/* Attachment thumbnail card: enlarged by 75% (~140px), matching non-focus
   border without shadow. The composer pass finds the tiles once per pass and
   marks them data-dsh-claude-attachment (packages/client/src/features/composer/composer.ts). */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_rail"] [data-dsh-claude-attachment] {
  width: 140px;
  height: 140px;
  min-width: 140px;
  min-height: 140px;
  max-width: 140px;
  max-height: 140px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: none;
  overflow: hidden;
  position: relative;
  z-index: 5;
  flex: 0 0 140px;
  box-sizing: border-box;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card] [class*="_rail"] [data-dsh-claude-attachment] {
  border-color: var(--dsw-alias-border-l1);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_rail"] [data-dsh-claude-attachment] :is(img, canvas, [class*="_preview"], [class*="_image"]) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 11px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_rail"] [data-dsh-claude-attachment] :is(button, [role="button"], [class*="_close"], [class*="_delete"], [class*="_remove"], [class*="badge"], [class*="_tag"]) {
  position: absolute;
  z-index: 6;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [data-input-scroll] {
  background: var(--dsw-specific-input-major, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1) !important;
  border-radius: 14px;
  min-height: 38px;
  height: auto;
  max-height: var(--dsh-composer-text-max-height, 180px);
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 7px 36px 7px 14px;
  margin: 0;
  position: relative;
  z-index: 2;
  cursor: text;
  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.03);
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"] [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"] [data-input-scroll] {
  border-top: none !important;
  border-radius: 0 0 14px 14px;
  /* Seamless join with attachment rail above: 1px negative margin prevents subpixel seam without clipping thumbnails */
  margin-top: -1px;
  min-height: 32px;
  padding: 8px 36px 6px 14px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant="inline"] [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [data-input-scroll] {
  background: var(--dsw-specific-input-major);
  border-color: var(--dsw-alias-border-l1) !important;
  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.03);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-composer-card][data-composer-variant="inline"] [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [data-input-scroll] {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
/* No workspace picked yet: the host marks the card as a workspace picker with a
   dashed ring over its whole box. In the single-line form the card is the input
   box plus the toolbar row on the canvas, so the ring moves onto the input box
   itself — the host's dashed stroke and colours, hover included — and the
   card's own ring is dropped. The input box stays flat, the way the host's
   picker card drops its elevation. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][class*="_cardWorkspaceTrigger"]::after,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][class*="_cardWorkspaceTrigger"]::after {
  display: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][class*="_cardWorkspaceTrigger"] [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][class*="_cardWorkspaceTrigger"] [data-input-scroll] {
  border-style: dashed !important;
  border-color: var(--dsw-alias-border-l4) !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: border-color 100ms ease !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][class*="_cardWorkspaceTrigger"]:hover [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][class*="_cardWorkspaceTrigger"]:hover [data-input-scroll] {
  border-color: var(--dsw-alias-state-business-primary) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant="inline"]:focus-within [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:focus-within [data-input-scroll] {
  border-color: rgba(20, 20, 19, 0.18) !important;
  box-shadow: 0 0 0 1px rgba(20, 20, 19, 0.065), 0 4px 12px rgba(20, 20, 19, 0.025);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-composer-card][data-composer-variant="inline"]:focus-within [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:focus-within [data-input-scroll] {
  border-color: rgba(250, 249, 245, 0.22) !important;
  box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.09), 0 4px 16px rgba(0, 0, 0, 0.20);
}
/* With attachments the rail already carries the card's focus ring, so the
   input keeps only the deepened drop — its own 1px ring would paint a second
   line across the seam between the thumbnails and the text. */
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"]:focus-within [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active]:not([data-ds-dark-theme]) [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"]:focus-within [data-input-scroll] {
  box-shadow: 0 4px 12px rgba(20, 20, 19, 0.025);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"]:focus-within [data-input-scroll],
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"]:focus-within [data-input-scroll] {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.20);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [data-input-scroll] [class*="_grow"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [data-input-scroll] [class*="_grow"] {
  width: 100%;
  max-width: 100%;
  min-height: 24px;
  position: relative;
  display: block;
  box-sizing: border-box;
  overflow-x: hidden;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [data-composer-input],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [data-composer-input] {
  min-height: 24px;
  height: auto;
  line-height: 24px;
  padding: 0;
  font-size: 14px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  cursor: text;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow-x: hidden;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [data-composer-placeholder],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [data-composer-placeholder] {
  line-height: 24px;
  height: 24px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  max-width: 100%;
  box-sizing: border-box;
  font-size: 14px;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
/* Pinned send button inside input box */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="send"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="send"] {
  position: absolute;
  bottom: 40px;
  right: 8px;
  top: auto;
  left: auto;
  width: 26px;
  height: 26px;
  min-width: 26px;
  padding: 0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: none;
  background: transparent;
  color: var(--dsw-alias-label-caption);
  border: none !important;
  cursor: pointer;
  transition: color 0.12s ease, background-color 0.12s ease;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="send"] :is(svg, [class*="_chevron"], span) {
  display: none;
}
/* The return glyph is drawn, as Claude Code draws it: a short stub along the
   top, down the right side, and back along the bottom to a left arrowhead, in
   crisp 1.5px square-cornered strokes filled with the button's own colour. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="send"]::after,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="send"]::after {
  content: "";
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linejoin='miter'%3E%3Cpath d='M8 3.75h5.25v7H3M6 7.75l-3 3 3 3'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linejoin='miter'%3E%3Cpath d='M8 3.75h5.25v7H3M6 7.75l-3 3 3 3'/%3E%3C/svg%3E") center / contain no-repeat;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="send"]:not(:disabled):hover,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="send"]:not(:disabled):hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
  color: var(--dsw-alias-label-primary) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"]:not([data-dsh-claude-draft-empty]) button[data-dsh-claude-control="send"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"][data-has-attachments="true"] button[data-dsh-claude-control="send"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card]:not([data-dsh-claude-draft-empty]) button[data-dsh-claude-control="send"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card][data-has-attachments="true"] button[data-dsh-claude-control="send"] {
  color: var(--dsw-alias-label-primary);
}
/* Pinned stop button inside input box */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="stop"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="stop"] {
  position: absolute !important;
  bottom: 40px !important;
  right: 8px !important;
  top: auto !important;
  left: auto !important;
  width: 26px !important;
  height: 26px !important;
  min-width: 26px !important;
  padding: 0 !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 10 !important;
  /* Claude's stop control is a bare ink circle with a filled square inside; the
     plate is hover only, and the glyph is the interface ink — not the accent. */
  background: transparent !important;
  color: var(--dsw-alias-label-primary, #141413) !important;
  border-radius: 6px !important;
  border: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="stop"]:hover:not(:disabled),
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="stop"]:hover:not(:disabled) {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
/* The ring the host's square sits in: drawn here, since the shipped glyph is the
   square alone. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="stop"]::before,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="stop"]::before {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  inset: 0 !important;
  margin: auto !important;
  width: 16px !important;
  height:  16px !important;
  box-sizing: border-box !important;
  border: 1.6px solid currentColor !important;
  border-radius: 50% !important;
  corner-shape: round !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="stop"] svg,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="stop"] svg {
  display: block !important;
  width: 7px !important;
  height:  7px !important;
  border-radius: 1.5px !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="stop"]::after,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="stop"]::after {
  display: none !important;
}
/* Toolbar row below input card. \`[class*="_row"]\` on purpose: a bare
   \`[class*="row"]\` substring-matches the shipped \`.p_FcLG_grow\` input
   wrapper ("grow" contains "row"), and the fixed 28px height + flex
   display here would pin the composer field to one line forever. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [class*="_row"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_row"] {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  margin: 6px 0 0 0;
  background: transparent;
  border: none !important;
  box-shadow: none;
  min-height: 28px;
  height: 28px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
  position: relative;
  z-index: 3;
}
/* The context-occupancy meter renders its click-open panel INSIDE the inline
   composer card, and its legend classes (\`…_rows\` / \`…_row\`) substring-match
   the toolbar-row override above — which flattened the shipped definition
   list into one 28px flex line and wrapped every label/value. Restore the
   shipped legend layout: the list stacks vertically, each row keeps its
   natural height and space-between distribution. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [class*="_rows"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_rows"] {
  display: block !important;
  height: auto !important;
  min-height: 0 !important;
  width: auto !important;
  max-width: none !important;
  padding: 0 !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [class*="_rows"] [class*="_row"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_rows"] [class*="_row"] {
  display: flex !important;
  height: auto !important;
  min-height: 0 !important;
  width: auto !important;
  max-width: none !important;
  padding: 2px 0 !important;
  margin: 0 !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [class*="_tools"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_tools"] {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  overflow: visible;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [class*="_modes"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_modes"] {
  order: 1;
  display: inline-flex;
  align-items: center;
  overflow: visible;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="commands"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="commands"] {
  order: 3;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] button[data-dsh-claude-control="commands"]:hover:not(:disabled),
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] button[data-dsh-claude-control="commands"]:hover:not(:disabled) {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-primary);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [class*="_trailing"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_trailing"] {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex: 0 0 auto;
}

/* @composer-gate */
/* Model trigger in the host's contract slot: the skin's own button, and the
   host's trigger when the picker preference hands the seat back. Both are
   named by their exact place in the seat, so a menu another plugin nests
   inside the seat keeps its own layout, and the seat root the picker hides is
   never matched — a display here would outrank the hide rule below. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [data-slot="conversation.input.model"] > [class*="_root"] > [class*="_trigger"],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card][data-composer-variant="inline"] [data-slot="conversation.input.model"] > .dsh-claude-model-btn {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
  border-radius: 7px;
  cursor: pointer;
  visibility: visible;
  opacity: 1;
}
/* The skin's own model trigger replaces the host's model seat (the host's
   root is marked and hidden by syncModelControl). One button, one hover
   background — the shipped seat stacks an icon + label + effort + chevron,
   each with its own surface. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-model-host] {
  display: none;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_trailing"] .dsh-claude-model-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  max-width: 280px;
  padding: 0 8px;
  border: none !important;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  box-sizing: border-box;
  min-width: 0;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_trailing"] .dsh-claude-model-btn-label.dsh-claude-model-btn-loading {
  color: var(--dsw-alias-label-caption, #a6a094) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_trailing"] .dsh-claude-model-btn:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-primary);
}

/* Only the whole trigger gets the hover plate; its label/effort spans stay
   transparent so no smaller inner background appears. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_trailing"] .dsh-claude-model-btn > * {
  background: transparent;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_trailing"] .dsh-claude-model-btn-label {
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
}
/* (The effort trigger's styles live in features/effort/effort-picker.css: the
   trigger is body-mounted and JS-pinned beside the model trigger — it never
   sits under [class*="_trailing"], so the rules drafted for that seat were dead
   and have been removed.) */

/* The host's dock line — the context meter and (hidden, see below) the stats
   pills — laid over the toolbar row. Both stay in their native React parent
   (moving them out crashed React's unmount with Node.removeChild), so the dock
   itself leaves the flow for the row's line, with the meter at the row's right
   end. The dock is the card's next sibling; the queue, todo and goal overlays
   above the card name their roots \`dock\` too and keep the host's own
   placement. The 4px is the inset the card leaves under itself inside the
   stack: the dock's 28px line is then exactly the control row's line. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) {
  position: relative;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] + [class*="_dock"] {
  position: absolute;
  bottom: 4px;
  left: var(--dsh-composer-side-clearance, 0px);
  right: var(--dsh-composer-side-clearance, 0px);
  height: 28px;
  margin: 0 auto;
  padding: 0 calc(160px + var(--dsh-claude-meter-room, 0px)) 0 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
  z-index: 3;
  max-width: var(--dsh-composer-card-max-width, 100%);
  box-sizing: border-box;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] + [class*="_dock"] > * {
  pointer-events: auto;
}
/* The meter holds the row's right end, inside the row's own 4px inset, after
   the model and effort triggers: the trailing cluster keeps that room free
   (--dsh-claude-meter-room, measured by the permissions pass). Centred by
   stretching over the dock's height, never by a transform — the meter's panel
   is position: fixed, and a transform here would anchor it to the meter. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] + [class*="_dock"] > [data-dsh-claude-context-meter] {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 4px;
  align-items: center;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_row"] > [class*="_trailing"] {
  margin-right: var(--dsh-claude-meter-room, 0px);
}

/* ---------- the host's stats row: hidden, its detail moved into the context popover ---------- */
/* The host ships two figures here (turns and steps · tok/s, total tokens · cache
   hits) with its own icons and spacing; it marks each figure since its 2026-09
   update and marked the container around them before, so both marks are hidden.
   The row STAYS in the document: its structure still tells the detailed form
   from the compact one, and the session's numbers are read from the host's
   projections (features/context-stats/session-stats.ts) into the popover the
   context meter opens. One popover for everything about the session's numbers,
   and the input row keeps only the meter at its right end. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-stats],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-stat] {
  display: none;
}

/* ---------- one type for the composer's bottom line ---------- */
/* The ring, the model trigger and the hidden stats row are three host widgets
   that each brought their own type: the trigger 13px/500 in the secondary
   tone, the stats 12px/400 tertiary, the ring the host's secondary content
   size. They share one line now, so they read as one family — same face, same
   size, same weight, same tone. The ring's trigger is targeted explicitly
   because the host sets its own colour and size on that button. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-context-meter],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-context-meter] button,
body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"] [data-composer-stats],
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-composer-card] [class*="_row"] .dsh-claude-model-btn {
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: normal;
  color: var(--dsw-alias-label-secondary);
}

/* The host renders two separate stat dialogs; hide them — their numbers are
   read into the context popover instead — for as long as the context
   statistics, which own that read, are installed. */
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-dsh-claude-session-stats] [role="dialog"]:has([data-session-stats-details]),
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-dsh-claude-session-stats] [role="dialog"]:has([data-session-stats-usage]) {
  display: none !important;
}

/* ---------- session statistics inside the context popover ---------- */
/* Skin-owned nodes appended to the host's own panel
   (features/context-stats/session-stats.ts): the host's context rows above, the
   session's numbers below, one hairline between them.

   The panel itself is the host's, and the host mounts it with no entrance of
   its own. The feature stamps the panel, and it takes the cards' own short
   rise (the shared keyframe), so hovering either control opens the same way. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-context-panel] {
  animation: dsh-claude-popover-in 0.15s ease;
}
/* The host places the panel from the anchor's LEFT edge and only then clamps it
   into the viewport, which at the end of the composer row parks it against the
   window's right margin, past the ring. stats-binding.ts reads the two boxes and
   writes the left value that lines the panel's right edge up with the meter's —
   the hand-over the hero menu makes for the menu the host places below its own
   trigger. The mark is written together with the value, so this declaration
   never runs on a reading that has gone. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-context-panel][data-dsh-claude-context-aligned] {
  left: var(--dsh-claude-context-panel-left) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  min-width: 0;
  font-family: var(--dsw-font-family);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  min-width: 0;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-section {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-label {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-value {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}

/* ---------- the block while the numbers are still on their way ---------- */
/* The two sections at the size the numbers will take, drawn as bars under the
   real headings: a row keeps a real row's 37px (16 + 1 + 20), so the panel
   opens at its final height and nothing grows under the pointer. It shows only
   while the session's projections have answered nothing AND within the short
   deadline the feature allows — a host that serves no such projection falls
   back to the panel the host drew, rather than keeping placeholder bars. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats[data-dsh-claude-context-skeleton] .dsh-claude-context-stats-item {
  min-height: 37px !important;
  justify-content: center !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-skeleton-label,
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-skeleton-value {
  display: block !important;
  border-radius: 3px !important;
  background: var(--dsw-alias-interactive-bg-hover-solid, rgba(0, 0, 0, 0.06)) !important;
  animation: dsh-claude-context-stats-pulse 1.6s ease-in-out infinite !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-skeleton-label {
  width: 68% !important;
  height: 12px !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] .dsh-claude-context-stats-skeleton-value {
  width: 46% !important;
  height: 14px !important;
}
@keyframes dsh-claude-context-stats-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ---------- a phone-width composer ---------- */
/* The trailing cluster's three controls share what the row has left, and the row
   itself is narrower than the sums the desktop reserves for it. The model name
   truncates at the phone's own width instead of the 280px it takes on a desktop;
   the cluster may shrink with it rather than push the row past the card; the
   context meter keeps the ring that carries the reading, the number beside it
   being what does not fit; and the dock gives up the padding that reserved the
   two clusters' room — on a phone it is wider than the card, and it took the
   ring pinned to its right edge out of the card with it. */
@media (max-width: 480px) {
  body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_trailing"] .dsh-claude-model-btn {
    max-width: 112px;
  }
  body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] [class*="_row"] > [class*="_trailing"] {
    flex: 0 1 auto;
    min-width: 0;
  }
  body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-context-meter] button > span {
    display: none;
  }
  body[data-dsh-claude-style][data-dsh-claude-composer-active] [class*="_composerStack"]:not([data-composer-variant="hero"]) [data-composer-card] + [class*="_dock"] {
    padding: 0;
  }
}

/* ---------- Claude Code layout: sidebar brand ---------- */
/* The shipped whale and wordmark give way to the selected brand, each painted as
   an alpha mask over currentColor so it follows the label colour. The choice is a
   document attribute, so the settings page flips one attribute and the UI follows.
   Sizing: an 18px cap height to match the shipped brandName box, the wordmark's
   width read from that height through the artwork's aspect ratio (its viewBox,
   512.22 × 121.54, packages/assets/src/brand/claude-word.svg). */
body[data-dsh-claude-style][data-dsh-claude-brand="claude"] :is([class*="brandMark"], [class*="railMark"]) > * {
  display: none !important;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] :is([class*="brandMark"], [class*="railMark"])::before {
  content: "";
  display: block;
  flex: none;
  background-color: currentColor;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

/* Claude (default): starburst mark + the Claude wordmark. */
body[data-dsh-claude-style][data-dsh-claude-brand="claude"] :is([class*="brandMark"], [class*="railMark"])::before {
  width: 18px;
  height: 18px;
  -webkit-mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
  mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="brandIdentity"] > [class*="brandName"] > * {
  display: none !important;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="brandIdentity"] > [class*="brandName"]::before {
  content: "";
  display: block;
  flex: none;
  background-color: currentColor;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

body[data-dsh-claude-style][data-dsh-claude-brand="claude"] [class*="brandIdentity"] > [class*="brandName"]::before {
  width: calc(18px * 512.22 / 121.54);
  max-width: 100%;
  height: 18px;
  -webkit-mask: var(--dsh-claude-image-claude-word) center / contain no-repeat;
  mask: var(--dsh-claude-image-claude-word) center / contain no-repeat;
}

/* DeepSeek: the host's own whale and wordmark in DeepSeek's brand blue. The
   expanded brand is a button on most platforms and a plain row on macOS, and the
   collapsed rail's whale sits in the sidebar toggle, so the art is inked where it
   sits. */
body[data-dsh-claude-style][data-dsh-claude-brand="deepseek"] :is([class*="brandIdentity"], [class*="railMark"]) {
  color: var(--dsh-claude-logo-ink);
}

/* ---------- Claude Code layout: new session button ---------- */
/* A narrow, left-aligned row with a leading 20px chip, flat until the pointer is
   on it. The row treatment holds while the column is expanded: collapsed, the host
   re-seats this button as its own icon control, where a full-width plate would
   span the titlebar. The expanded state is read down from the app frame, which
   carries the collapsed marker and holds the sidebar column as a direct child —
   \`body:not(:has(collapsed))\` made every DOM change re-match the document. */
body[data-dsh-claude-style] [class*="_frame"]:not([data-sidebar-collapsed]) > [class*="_sidebarCol"] button[class*="newSession"] {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
  height: 28px;
  line-height: 28px;
  padding: 0 8px;
  margin: 0 0 6px 0;
  border: none !important;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #141413);
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 500;
  /* Explicit, so the label's x does not depend on the host's gap: both sidebar
     rows place their text at padding + 20px icon box + 6px. */
  gap: 6px;
  cursor: pointer;
  box-shadow: none;
  transition: background-color 0.12s ease;
}
body[data-dsh-claude-style] [class*="_frame"]:not([data-sidebar-collapsed]) > [class*="_sidebarCol"] button[class*="newSession"]:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
}
body[data-dsh-claude-style][data-ds-dark-theme] [class*="_frame"]:not([data-sidebar-collapsed]) > [class*="_sidebarCol"] button[class*="newSession"] {
  color: var(--dsh-claude-ink-strong);
}
body[data-dsh-claude-style][data-ds-dark-theme] [class*="_frame"]:not([data-sidebar-collapsed]) > [class*="_sidebarCol"] button[class*="newSession"]:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}
/* Collapsed rail and titlebar: the host draws its own plate for its icon control,
   and in the titlebar one reads as a stray rectangle. */
body[data-dsh-claude-style] [data-sidebar-collapsed] button[class*="newSession"]:hover {
  background: transparent !important;
}
body[data-dsh-claude-style] button[class*="newSession"] svg {
  display: none;
}
/* The expanded row centers its label inside a flex-1 mask and parks the shortcut
   at the far right; Claude's row reads left to right from the chip. */
body[data-dsh-claude-style] button[class*="newSession"] [class*="newSessionContent"] {
  justify-content: flex-start;
}
/* The chip paints BOTH the circular fill and the plus. A mask cannot: it clips the
   element to the glyph and takes the fill with it, so the plus is a background
   image, which costs the currentColor adaptivity and buys a theme pair below. */
body[data-dsh-claude-style] button[class*="newSession"]::before {
  content: "";
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 0;
  flex: none;
  border-radius: 50%;
  /* The page inherits \`corner-shape: superellipse(1.5)\` from <html>, which turns a
     50% radius into a pebble; the host's own spinner/dot/toggle rules say round
     for the same reason. */
  corner-shape: round;
  background-color: rgba(0, 0, 0, 0.10);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23141413' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='6' x2='12' y2='18'></line><line x1='6' y1='12' x2='18' y2='12'></line></svg>");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 12px 12px;
  -webkit-mask: none;
  mask: none;
}
body[data-dsh-claude-style][data-ds-dark-theme] button[class*="newSession"]::before {
  background-color: rgba(255, 255, 255, 0.14);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23faf9f5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='6' x2='12' y2='18'></line><line x1='6' y1='12' x2='18' y2='12'></line></svg>");
}

/* ---------- the sidebar's panel rows (插件 + plugin entries) ---------- */
/* The panel entries live in a \`nav.panelList\` whose own gap stacks on the row
   margin, so the rows' 6px margin is the only spacing, and each row takes the
   new-session metrics — including the 20px icon box, so both labels start at the
   same x. */
body[data-dsh-claude-style] nav[class*="panelList"] {
  gap: 0;
}
body[data-dsh-claude-style] button[class*="panelRow"] {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
  height: 28px;
  /* The host floors this row at 36px with a min-height, which \`height\` alone
     cannot beat. */
  min-height: 28px;
  line-height: 28px;
  padding: 0 8px;
  margin: 0 0 6px 0;
  border: none !important;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #141413);
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 500;
  gap: 6px;
  cursor: pointer;
  box-shadow: none;
  transition: background-color 0.12s ease;
}
body[data-dsh-claude-style] button[class*="panelRow"]:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
}
body[data-dsh-claude-style][data-ds-dark-theme] button[class*="panelRow"] {
  color: var(--dsh-claude-ink-strong);
}
body[data-dsh-claude-style][data-ds-dark-theme] button[class*="panelRow"]:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}
/* A 13px glyph in a 20px box: the box the new-session chip occupies. */
body[data-dsh-claude-style] button[class*="panelRow"] svg {
  width: 13px;
  height: 13px;
  margin: 0 3.5px;
  flex: none;
}

/* ---------- sidebar rows: the icon turns a quarter on hover ---------- */
/* Both glyphs are four-fold symmetric, so the turn ends where it started and the
   transition turns it back when the pointer leaves. */
body[data-dsh-claude-style] button[class*="newSession"]::before,
body[data-dsh-claude-style] button[class*="panelRow"] svg {
  transition: transform 0.25s ease;
  transform-origin: center;
}
body[data-dsh-claude-style] button[class*="newSession"]:hover::before,
body[data-dsh-claude-style] button[class*="panelRow"]:hover svg {
  transform: rotate(90deg);
}

/* ---------- Claude Code layout: workspace & session sidebar ---------- */
/* Typography: Anthropic Sans and compact sizes */
body[data-dsh-claude-style] :is([data-pane="sidebar"], [class*="sidebarCol"], [class*="treeBody"], [role="tree"]) :is([class*="title"], [class*="projectText"], [class*="sectionLabel"], [class*="sessionRow"], [class*="projectRow"], [class*="_time"]) {
  font-family: var(--dsw-font-family);
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="title"] {
  font-size: 13px;
  line-height: 18px;
  letter-spacing: normal;
}
body[data-dsh-claude-style] [class*="sessionRow"] [class*="title"] {
  font-size: 13px;
  line-height: 18px;
  letter-spacing: normal;
  color: var(--dsw-alias-label-secondary, #787672);
  transition: color 0.12s ease;
}
body[data-dsh-claude-style][data-ds-dark-theme] [class*="sessionRow"] [class*="title"] {
  color: var(--dsh-claude-session-ink);
}
body[data-dsh-claude-style] [class*="sessionRow"]:is(:hover, [class*="_selected"], [class*="_active"], [class*="menuOpen"], [aria-selected="true"], [data-selected="true"]) [class*="title"] {
  color: var(--dsw-alias-label-primary, #141413);
}
body[data-dsh-claude-style][data-ds-dark-theme] [class*="sessionRow"]:is(:hover, [class*="_selected"], [class*="_active"], [class*="menuOpen"], [aria-selected="true"], [data-selected="true"]) [class*="title"] {
  color: var(--dsh-claude-ink-strong);
}
body[data-dsh-claude-style] [class*="sessionRow"] [class*="_time"] {
  font-size: 11px;
  line-height: 16px;
}
body[data-dsh-claude-style] [class*="sectionLabel"] {
  font-size: 12px;
  line-height: 16px;
}

/* Compact scale: shrunken heights, margins and paddings */
body[data-dsh-claude-style] [class*="projectRow"] {
  height: 28px;
  min-height: 28px;
  padding: 0 6px;
  gap: 4px;
  border-radius: 6px;
}
body[data-dsh-claude-style] [class*="sessionRow"] {
  height: 28px;
  min-height: 28px;
  padding: 0 6px;
  gap: 0;
  border-radius: 6px;
}
body[data-dsh-claude-style] [class*="sessionRow"] [class*="title"] {
  margin: 0 4px;
}
body[data-dsh-claude-style] [class*="groupSection"] > * + * {
  margin-top: 1px;
}
body[data-dsh-claude-style] [class*="groupSection"] + [class*="groupSection"] {
  margin-top: 6px !important;
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="rowActions"],
body[data-dsh-claude-style] [class*="sessionRow"] [class*="rowActions"] {
  gap: 6px;
}
body[data-dsh-claude-style] :is([class*="projectRow"], [class*="sessionRow"]) [class*="iconButton"] {
  width: 16px;
  height: 16px;
}

/* Hover and active plates belong to session rows alone: a folder row is a heading,
   so its cue is the label darkening below. This also cancels the shipped
   .projectRow:hover background. */
body[data-dsh-claude-style] [class*="sessionRow"]:hover,
body[data-dsh-claude-style] [class*="sessionRow"][class*="_selected"],
body[data-dsh-claude-style] [class*="sessionRow"][class*="menuOpen"] {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
}

body[data-dsh-claude-style] [class*="projectRow"],
body[data-dsh-claude-style] [class*="projectRow"]:hover,
body[data-dsh-claude-style] [class*="projectRow"][class*="menuOpen"],
body[data-dsh-claude-style] [class*="projectRow"][class*="_selected"] {
  background: transparent;
}

/* Folder header: muted label, no folder icon, dropdown arrow instead */
body[data-dsh-claude-style] [class*="projectRow"] [class*="title"] {
  color: var(--dsw-alias-label-secondary, #787672);
  font-weight: 500;
}
body[data-dsh-claude-style] [class*="projectRow"]:hover [class*="title"] {
  color: var(--dsw-alias-label-primary, #141413);
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="folderActive"] {
  color: inherit;
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="_folder"] {
  display: none;
}
/* Title left, dropdown arrow beside it */
body[data-dsh-claude-style] [class*="projectRow"] {
  display: flex;
  align-items: center;
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="projectText"] {
  order: 1;
  flex: 0 0 auto;
  margin-right: 2px;
}
/* The chevron is a reveal-on-hover affordance. The shipped CSS gates it on
   .projectRow:hover alone, which drops it the moment the pointer moves down into
   the folder's conversation list, so the trigger is the whole group section —
   keyed on the section's own :hover rather than \`:has(row:hover)\`, which made
   every DOM change re-match the document. */
body[data-dsh-claude-style] [class*="projectRow"] [class*="_chevron"] {
  order: 2;
  display: none;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary, #787672);
}
body[data-dsh-claude-style] [class*="groupSection"]:hover [class*="projectRow"] [class*="_chevron"] {
  display: inline-flex !important;
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="rowActions"] {
  order: 3;
  margin-left: auto;
}
/* The shipped solid triangle gives way to a chevron */
body[data-dsh-claude-style] [class*="projectRow"] [class*="_chevron"] svg {
  display: none;
}
body[data-dsh-claude-style] [class*="projectRow"] [class*="_chevron"]::after {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 6l4 4 4-4%27/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 6l4 4 4-4%27/%3E%3C/svg%3E") center / contain no-repeat;
  transition: transform 0.15s var(--ds-ease-in-out, ease);
}
body[data-dsh-claude-style] [class*="projectRow"][aria-expanded="false"] [class*="_chevron"]::after {
  transform: rotate(-90deg);
}
/* Session status circle. The host renders the leading seat through a slot outlet
   whose anchor (\`div[data-slot]\`, display:contents) is a child of the seat even
   when nothing is registered, so an idle row's seat is never :empty and the circle
   hangs on the empty anchor as well; a seat carrying dots or another plugin's
   content keeps its own paint. */
body[data-dsh-claude-style] [class*="sessionRow"] [class*="_slot"] {
  width: 14px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
body[data-dsh-claude-style] [class*="sessionRow"] [class*="_slot"]:empty::after,
body[data-dsh-claude-style] [class*="sessionRow"] [class*="_slot"] > [data-slot]:empty::after {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  corner-shape: round;
  border: 1.2px solid var(--dsw-alias-label-caption, #a6a094);
  box-sizing: border-box;
}

/* Session status ongoing indicator: a circular progress ring */
body[data-dsh-claude-style] svg[data-state="ongoing"] {
  width: 10px !important;
  height: 10px !important;
  box-sizing: border-box !important;
  border-radius: 50% !important;
  corner-shape: round !important;
  border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
  border-top-color: var(--dsw-alias-label-primary) !important;
  animation: 0.85s linear infinite dsh-claude-win11-spin !important;
  transform-origin: center center !important;
  display: inline-block !important;
  flex: none !important;
  color: transparent !important;
  fill: none !important;
  background: transparent !important;
}
body[data-dsh-claude-style]:not([data-ds-dark-theme]) svg[data-state="ongoing"] {
  border-color: rgba(20, 20, 19, 0.12) !important;
  border-top-color: var(--dsw-alias-label-secondary) !important;
}
body[data-dsh-claude-style] svg[data-state="ongoing"] * {
  display: none !important;
}
@keyframes dsh-claude-win11-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
/* The ring spins in EVERY motion setting, deliberately: a 0.85s rotation is the
   whole signal that background work is alive, and a frozen ring reads as broken
   rather than as calm. Neither the system setting (D26) nor the settings page's
   own choice governs it. */
@media (prefers-reduced-motion: reduce) {
  body[data-dsh-claude-style] svg[data-state="ongoing"] {
    animation: 0.85s linear infinite dsh-claude-win11-spin !important;
    animation-play-state: running !important;
  }
}

/* ---------- Workspace section: 进行中 / 已归档 segments and the archived list ---------- */
/* The segment control and the archived list dress the markup built by
   packages/client/src/features/workspace/workspace-view.ts; sidebar-adjacent, but split from theme/sidebar.css
   when that file neared the 750-line stop line. */

/* ---------- workspace section: 进行中 / 已归档 ---------- */
/* The section label gives way to a two-state segment control (the skin's own
   markup, built by packages/client/src/features/workspace/workspace-view.ts); the archived state swaps
   the host's tree for the skin's list, and the list's rows carry a delete
   button. The label and the control cross-fade by opacity further down. */
body[data-dsh-claude-style] .dsh-claude-ws-segments {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.06));
  flex: none;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-ws-segments {
  /* The skin's light plate token resolves too faintly on the warm black canvas;
     pin the dark pair so the control matches the sidebar's own rows. */
  background: rgba(255, 255, 255, 0.08);
}
/* The control is a mode switch, not furniture: while 进行中 is the state it steps
   aside for the plain 工作区 heading and comes back as soon as the pointer is in
   the section — the header itself or the tree below it. In 已归档 it stays put,
   because it is the way back.
   The two swap by opacity rather than display, so they cross-fade; the control
   is laid over the label's own slot (absolute, same 16px) so neither the header's
   height nor the actions' position moves while they swap. */
body[data-dsh-claude-style] [class*="sectionHeader"] {
  position: relative;
}
body[data-dsh-claude-style] .dsh-claude-ws-segments {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  opacity: 1;
  visibility: visible;
  transition: opacity 0.16s ease, visibility 0.16s ease;
}
body[data-dsh-claude-style] [data-dsh-claude-ws-view="active"] .dsh-claude-ws-segments {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
body[data-dsh-claude-style] [data-dsh-claude-ws-view="active"]:hover .dsh-claude-ws-segments,
body[data-dsh-claude-style] [class*="sectionHeader"]:hover .dsh-claude-ws-segments {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}
body[data-dsh-claude-style] [class*="sectionLabel"][data-dsh-claude-ws-label] {
  /* The heading is a label, not a target: it must not swallow clicks aimed at the
     control laid over it, nor start a selection drag. */
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  opacity: 0;
  transition: opacity 0.16s ease;
}
body[data-dsh-claude-style] [data-dsh-claude-ws-view="active"] [class*="sectionLabel"][data-dsh-claude-ws-label] {
  opacity: 1;
}
body[data-dsh-claude-style] [data-dsh-claude-ws-view="active"]:hover [class*="sectionLabel"][data-dsh-claude-ws-label],
body[data-dsh-claude-style] [class*="sectionHeader"]:hover [class*="sectionLabel"][data-dsh-claude-ws-label] {
  opacity: 0 !important;
}
body[data-dsh-claude-style] .dsh-claude-ws-segment {
  /* A click must never start a text selection in the heading behind the control. */
  user-select: none;
  -webkit-user-select: none;
  appearance: none;
  border: none !important;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  font-family: var(--dsw-font-family);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  padding: 0 8px;
  height: 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}
body[data-dsh-claude-style] .dsh-claude-ws-segment:hover {
  color: var(--dsw-alias-label-primary, #141413) !important;
}
body[data-dsh-claude-style] .dsh-claude-ws-segment[aria-checked="true"] {
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #141413);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.10);
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-ws-segment[aria-checked="true"] {
  background: rgba(255, 255, 255, 0.14);
  color: var(--dsh-claude-ink-strong);
  box-shadow: none;
}
/* The control's sliding pill (shared/sliding-pill.css places and moves it;
   the control is absolutely placed, so it already anchors the pill): the raised
   box the checked segment wore above, which the segment gives up while the pill
   is there. */
body[data-dsh-claude-style] .dsh-claude-ws-segments[data-dsh-claude-pill]::before {
  top: 2px;
  bottom: 2px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.10);
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-ws-segments[data-dsh-claude-pill]::before {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: none;
}
body[data-dsh-claude-style] .dsh-claude-ws-segments[data-dsh-claude-pill] > .dsh-claude-ws-segment[aria-checked="true"] {
  background: transparent;
  box-shadow: none;
}
/* ---------- workspace view: the skin's own archived list ---------- */
/* 已归档 is the skin's list (packages/client/src/features/workspace/workspace-view.ts), flat on purpose:
   the host's own filter buries archived rows inside collapsed workspace groups
   and its state is not reachable without clicking its menu. */
body[data-dsh-claude-style] [data-dsh-claude-ws-view="archived"] [data-dsh-claude-ws-tree] {
  display: none !important;
}
body[data-dsh-claude-style] [data-dsh-claude-ws-view="active"] .dsh-claude-archive-list {
  display: none;
}
body[data-dsh-claude-style] .dsh-claude-archive-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  /* It takes the tree's place in the section's column, so it takes the tree's
     box and scrolling too: fill the height left under the header and scroll
     inside it (the region above clips), with the tree's thin, reserved
     scrollbar. The host's scroller reaches 4px left of the section's content
     and 10px past its right edge to hold that gutter, then insets 4px / 5px —
     the same box puts the rows where the tree's rows sit (measured: row x=12,
     width 251, title x=36). */
  margin: 0 -10px 0 -4px;
  padding: 0 5px 0 4px;
  min-width: 0;
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}
body[data-dsh-claude-style] .dsh-claude-archive-row {
  /* The list scrolls at a fixed height; its rows keep theirs instead of
     shrinking to fit. */
  flex: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  height: 28px !important;
  /* The host's own session row: 6px inside the list's 12px, so the row's box and
     the title's x land where the tree's rows put them (measured 12 / 36). */
  padding: 0 6px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  /* The host's 进行中 rows rest in the secondary ink and darken under the pointer;
     the archived list reads the same way, so an archived conversation does not
     sit there looking selected. */
  color: var(--dsw-alias-label-secondary, #787672) !important;
  font-family: var(--dsw-font-family) !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  transition: background-color 0.12s ease, color 0.12s ease !important;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-archive-row {
  color: var(--dsh-claude-session-ink) !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-row:is(:hover, :focus-visible) {
  color: var(--dsw-alias-label-primary, #141413) !important;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-archive-row:is(:hover, :focus-visible) {
  color: var(--dsh-claude-ink-strong) !important;
}
/* The leading slot the host's rows carry (a 5px circle centred in 14px), so the
   two lists start their titles at the same x. */
body[data-dsh-claude-style] .dsh-claude-archive-row::before {
  content: "" !important;
  flex: none !important;
  width: 5px !important;
  height: 5px !important;
  margin: 0 4.5px !important;
  border-radius: 50% !important;
  corner-shape: round !important;
  border: 1.2px solid var(--dsw-alias-label-caption, #a6a094) !important;
  box-sizing: border-box !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-row:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.06)) !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-title {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-time {
  flex: none !important;
  color: var(--dsw-alias-label-caption, #a6a094) !important;
  font-size: 11px !important;
}
/* Hover swaps the trailing time for the two row actions, the way the host's
   own session rows swap their time cell for the action buttons — so at rest
   the time right-aligns with the row and nothing sits reserved beside it. */
body[data-dsh-claude-style] .dsh-claude-archive-row:hover .dsh-claude-archive-time,
body[data-dsh-claude-style] .dsh-claude-archive-row:focus-visible .dsh-claude-archive-time {
  display: none !important;
}
/* The two row actions follow the host's own session rows: display none while
   the row is at rest — nothing sits reserved at the row's right end, and the
   invisible buttons offered phantom click targets there — and on hover, or
   while the row holds keyboard focus (a display:none button cannot be tabbed
   to), they take the time's place. Each button lives in the span its React
   root renders into. */
body[data-dsh-claude-style] .dsh-claude-archive-action {
  display: none !important;
  flex: none !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-row:hover .dsh-claude-archive-action,
body[data-dsh-claude-style] .dsh-claude-archive-row:focus-visible .dsh-claude-archive-action {
  display: inline-flex !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-delete,
body[data-dsh-claude-style] .dsh-claude-archive-restore {
  flex: none !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 22px !important;
  height: 22px !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 5px !important;
  background: transparent !important;
  color: var(--dsw-alias-label-caption, #a6a094) !important;
  cursor: pointer !important;
  transition: background-color 0.12s ease, color 0.12s ease !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-restore:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
  color: var(--dsw-alias-label-primary, #141413) !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-delete:hover {
  background: rgba(192, 57, 43, 0.12) !important;
  color: var(--dsw-alias-state-error-primary, #c0392b) !important;
}
body[data-dsh-claude-style] .dsh-claude-archive-status {
  padding: 8px;
  color: var(--dsw-alias-label-caption, #a6a094);
  font-family: var(--dsw-font-family);
  font-size: 12px;
}

/* ---------- Sidebar search box ---------- */
/* packages/client/src/features/search/search.ts puts the box in the host's logo row, beside
   the brand, and marks the row. The row becomes a two-column grid whose first
   cell holds the brand and the box on top of each other (the web shell's
   collapse toggle keeps the second; the desktop's is fixed in the titlebar).
   At rest the brand shows; while the pointer is anywhere over the sidebar the
   two cross-fade, on the same 0.16s the workspace heading and its segmented
   control trade places with. A box that holds the keyboard stays.
   The box is the first row of the sidebar's list: it takes the same 28px and
   the same 6px step down to the row below, so the host's logo row carries it
   at 28px with no padding of its own. The host gives that row no top margin
   and a 4px bottom margin; the row's own 6px foot is what puts the box on the
   rows' rhythm, and it replaces the host's 4px rather than adding to it. */
body[data-dsh-claude-style] [data-dsh-claude-search-row] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  height: 28px;
  padding: 0;
  margin-bottom: 6px;
}
body[data-dsh-claude-style] [data-dsh-claude-search-row] > :is([class*="_brand"], .dsh-claude-search-trigger) {
  grid-area: 1 / 1;
}
body[data-dsh-claude-style] [data-dsh-claude-search-row] > [class*="_brand"] {
  transition: opacity 0.16s ease, visibility 0.16s ease;
}
body[data-dsh-claude-style] .dsh-claude-search-trigger {
  display: flex;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.16s ease, visibility 0.16s ease;
  min-width: 0;
  height: 28px;
  margin: 0;
  padding: 0 10px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  border-radius: 8px;
  background: var(--dsh-claude-canvas, #fcfcfb);
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  font-family: var(--dsw-font-family);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  -webkit-app-region: no-drag;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-trigger {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsh-claude-raised);
}
body[data-dsh-claude-style] [data-slot="sidebar"]:hover [data-dsh-claude-search-row] > .dsh-claude-search-trigger,
body[data-dsh-claude-style] [data-dsh-claude-search-row] > .dsh-claude-search-trigger:focus-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
body[data-dsh-claude-style] [data-slot="sidebar"]:hover [data-dsh-claude-search-row] > [class*="_brand"],
body[data-dsh-claude-style] [data-dsh-claude-search-row] > [class*="_brand"]:has(~ .dsh-claude-search-trigger:focus-visible) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
/* The Windows desktop shell's sidebar column starts under its 40px titlebar,
   which left the brand a titlebar's height lower than on the web; the row rises
   to that edge. It rises 6px and not the 10px this rule carried while the box
   was 32px: the box is 28px now, and the 4px it gives back are what keep its
   top clear of the host's clip at the column's edge. The row's own 6px foot is
   untouched, so the box still steps down to New session by 6px. macOS takes no
   offset: the host pads nothing around the traffic lights, and its own
   \`_topStrip + _logoRow\` margin (-12px) already seats the row's content where
   the 48px it declares for --dsh-frame-top-clearance wants it. */
html[data-windows-titlebar] body[data-dsh-claude-style] [data-slot="sidebar"] [class*="_logoRow"] {
  margin-top: -6px !important;
}
/* Where no desktop shell owns the column's top — a browser page — the row is the
   column's first row, and the root's own 6px was the whole inset: the brand sat
   against the window's top edge. A step of the rows' own 6px, rounded to the
   row's 8px inline padding, lifts it clear. The attribute is what the collapsed
   rail lacks, so it keeps the host's 18px. */
html:not([data-windows-titlebar]):not([data-platform="darwin"]) body[data-dsh-claude-style] [data-dsh-claude-search-row] {
  margin-top: 8px;
}
/* The host gives its own logo row a 4px leading edge, and the brand another 4px
   under the Windows caption row; the row's zeroed padding drops both, so the
   brand takes the row's 8px and its mark's left edge lands on the new-session
   chip's. */
html:not([data-windows-titlebar]):not([data-platform="darwin"]) body[data-dsh-claude-style] [data-dsh-claude-search-row] > [class*="_brand"] {
  padding-left: 8px;
}
/* On both desktop shells the host's toggle takes no cell in the row: macOS
   renders it inside its own 52px \`_topStrip\`, Windows fixes it into the caption
   overlay. The row keeps a single column there — a second, empty one would
   still cost the brand and the box the host logo row's 8px gap. */
html[data-windows-titlebar] body[data-dsh-claude-style] [data-dsh-claude-search-row],
html[data-platform=darwin] body[data-dsh-claude-style] [data-dsh-claude-search-row] {
  grid-template-columns: minmax(0, 1fr) !important;
}
/* The host's own sidebar search stays mounted, since its shortcut (Ctrl+K)
   ends by focusing its input and that focus is what opens the palette; it is
   only taken out of sight and out of the header's layout. The header packs
   its children to the right and relied on that slot's flex to hold the
   heading at the left, so the heading now takes the free space itself. */
body[data-dsh-claude-style] [data-slot="sidebar"] [class*="_sectionHeader"] > [class*="_sectionLabel"] {
  margin-right: auto;
}
body[data-dsh-claude-style] [data-slot="sidebar"] [class*="_searchSlot"] {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  opacity: 0;
  pointer-events: none;
}
/* Expanding that search would clear the header's actions (view options, add
   workspace) out of its way for the moment before the palette folds it back;
   with the search out of sight they have nothing to make room for. */
body[data-dsh-claude-style] [data-slot="sidebar"] [class*="_headerActionsHidden"] {
  opacity: 1 !important;
  visibility: visible !important;
  max-width: 60px !important;
  transform: none !important;
  pointer-events: auto !important;
}
/* A button, like the New session and Plugins rows under it: the same hover
   plate, laid over the box's own opaque fill so the brand behind it never
   shows through. */
body[data-dsh-claude-style] .dsh-claude-search-trigger:hover {
  background-image: linear-gradient(var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)), var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)));
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-trigger:hover {
  background-image: linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08)) !important;
}
body[data-dsh-claude-style] .dsh-claude-search-trigger-icon {
  display: inline-flex;
  flex: none;
  color: var(--dsw-alias-label-secondary, #787672);
}
body[data-dsh-claude-style] .dsh-claude-search-trigger-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* ---------- Search palette ---------- */
/* The card is the host's Modal (its mask, focus return and Esc); these rules
   only re-cut the card: wider, set high in the window, no inner gaps, and the
   skin's own rows inside. It fades and settles in; on close search.ts marks
   the overlay and keeps it mounted while card and mask fade out together. */
body[data-dsh-claude-style] .dsh-claude-search-dialog {
  animation: dsh-claude-search-in 0.18s cubic-bezier(0.22, 0.61, 0.36, 1);
  width: min(760px, 100%);
  max-height: 100%;
  margin: 8vh 0 auto;
  padding: 0;
  gap: 0;
  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  border-radius: 16px;
  background: var(--dsh-claude-card);
  box-shadow: 0 16px 48px rgba(20, 20, 19, 0.14), 0 2px 8px rgba(20, 20, 19, 0.06);
}
body[data-dsh-claude-style] [data-dsh-claude-search-closing] > .dsh-claude-search-dialog {
  animation: dsh-claude-search-out 0.14s ease forwards !important;
}
body[data-dsh-claude-style] [data-dsh-claude-search-closing] > [class*="_mask"] {
  animation: dsh-claude-search-mask-out 0.14s ease forwards !important;
}
body[data-dsh-claude-style] [data-dsh-claude-search-closing] {
  pointer-events: none !important;
}
@keyframes dsh-claude-search-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
@keyframes dsh-claude-search-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(-4px) scale(0.985); }
}
@keyframes dsh-claude-search-mask-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-dialog {
  border-color: var(--dsw-alias-border-l2) !important;
  background: var(--dsh-claude-raised) !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}
body[data-dsh-claude-style] .dsh-claude-search {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: var(--dsw-font-family);
  color: var(--dsw-alias-label-primary, #141413);
}
body[data-dsh-claude-style] .dsh-claude-search-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 16px 10px 24px;
}
body[data-dsh-claude-style] .dsh-claude-search-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 32px;
  padding: 0;
  border: none !important;
  outline: none !important;
  background: transparent;
  box-shadow: none;
  color: var(--dsw-alias-label-primary, #141413);
  font-family: var(--dsw-font-family);
  font-size: 17px;
}
body[data-dsh-claude-style] .dsh-claude-search-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #8f8d84);
}
body[data-dsh-claude-style] .dsh-claude-search-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none !important;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #787672);
  cursor: pointer;
}
body[data-dsh-claude-style] .dsh-claude-search-close:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.06)) !important;
  color: var(--dsw-alias-label-primary, #141413) !important;
}

/* Filters: a segmented control whose highlight slides (shared/sliding-pill). */
body[data-dsh-claude-style] .dsh-claude-search-filters {
  position: relative;
  display: flex;
  align-self: flex-start;
  flex-wrap: nowrap;
  gap: 2px;
  margin: 0 16px 8px 14px;
}
body[data-dsh-claude-style] .dsh-claude-search-filters[data-dsh-claude-pill]::before {
  top: 0;
  height: 100%;
  border-radius: 8px;
  background: rgba(20, 20, 19, 0.06);
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-filters[data-dsh-claude-pill]::before {
  background: rgba(250, 249, 245, 0.08) !important;
}
body[data-dsh-claude-style] .dsh-claude-search-filter {
  height: 32px;
  padding: 0 10px;
  border: none !important;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  font-family: var(--dsw-font-family);
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.12s ease;
  user-select: none;
  -webkit-user-select: none;
}
body[data-dsh-claude-style] .dsh-claude-search-filter:hover {
  color: var(--dsw-alias-label-secondary, #787672) !important;
}
body[data-dsh-claude-style] .dsh-claude-search-filter[aria-checked="true"] {
  color: var(--dsw-alias-label-primary, #141413);
}
body[data-dsh-claude-style] .dsh-claude-search-filters:not([data-dsh-claude-pill]) .dsh-claude-search-filter[aria-checked="true"] {
  background: rgba(20, 20, 19, 0.06) !important;
}

/* Results: section captions over rows; the highlighted row carries the fill
   and the Enter glyph. */
body[data-dsh-claude-style] .dsh-claude-search-list {
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(520px, 62vh);
  overflow-y: auto;
  padding: 4px 12px 10px;
  overscroll-behavior: contain;
}
body[data-dsh-claude-style] .dsh-claude-search-section {
  padding: 14px 12px 6px;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  font-size: 13px;
  line-height: 18px;
}
body[data-dsh-claude-style] .dsh-claude-search-status {
  padding: 18px 12px !important;
  color: var(--dsw-alias-label-tertiary, #8f8d84) !important;
  font-size: 14px !important;
}
body[data-dsh-claude-style] .dsh-claude-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: 8px;
  box-sizing: border-box;
  cursor: pointer;
  font-size: 15px;
  line-height: 20px;
}
body[data-dsh-claude-style] .dsh-claude-search-item[data-active] {
  background: rgba(20, 20, 19, 0.05);
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-item[data-active] {
  background: rgba(250, 249, 245, 0.07) !important;
}
body[data-dsh-claude-style] .dsh-claude-search-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--dsw-alias-label-secondary, #787672);
}
body[data-dsh-claude-style] .dsh-claude-search-item-image {
  width: 18px !important;
  height: 18px !important;
  border-radius: 4px !important;
  object-fit: contain !important;
}
body[data-dsh-claude-style] .dsh-claude-search-item-text {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
body[data-dsh-claude-style] .dsh-claude-search-item-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
body[data-dsh-claude-style] .dsh-claude-search-item-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
body[data-dsh-claude-style] .dsh-claude-search-item-detail,
body[data-dsh-claude-style] .dsh-claude-search-item-snippet {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  font-size: 13px;
}
body[data-dsh-claude-style] .dsh-claude-search-item-detail {
  flex: 1 1 0;
}
body[data-dsh-claude-style] .dsh-claude-search-item-snippet {
  line-height: 18px !important;
}
/* The query inside a message excerpt: the primary label ink at medium weight,
   no fill, so the excerpt stays one quiet line. */
body[data-dsh-claude-style] .dsh-claude-search-item-match {
  background: none !important;
  color: var(--dsw-alias-label-primary) !important;
  font-weight: 500 !important;
}
body[data-dsh-claude-style] .dsh-claude-search-item-enter {
  display: inline-flex;
  flex: none;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
  visibility: hidden;
}
body[data-dsh-claude-style] .dsh-claude-search-item[data-active] .dsh-claude-search-item-enter {
  visibility: visible;
}

/* Keycaps: the action rows' shortcuts and the footer's hints. */
body[data-dsh-claude-style] .dsh-claude-search-keys {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 3px;
}
body[data-dsh-claude-style] .dsh-claude-search-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #787672);
  font-family: var(--dsw-font-family);
  font-size: 12px;
  line-height: 1;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-key {
  border-color: var(--dsw-alias-border-l3);
}
body[data-dsh-claude-style] .dsh-claude-search-foot {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  border-top: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  color: var(--dsw-alias-label-secondary, #787672);
  font-size: 13px;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-search-foot {
  border-top-color: var(--dsw-alias-border-l2) !important;
}
body[data-dsh-claude-style] .dsh-claude-search-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* ---------- Turn status line ---------- */
/* The host draws the live turn's own line — the whale tail and "deep diving",
   with its ticking clock — as the chat flow's LAST row, so it rides the bottom
   of the content: while an answer streams in, every burst pushes it down and the
   follow's glide pulls it back, and the reader watching the tail sees it jump.
   While the host's follow is on it is pinned instead, at the place it already
   comes to rest when the glide has caught up: the composer's own height, the
   fade band above it, and the host's 16px transcript padding (\`.scroll\`'s
   \`padding: 16px 32px\`). A burst then costs the line nothing — the glide and the
   pin land on the same spot — and scrolled away from the tail the row keeps its
   document place, so it never floats over what the reader went back to read. */
body[data-dsh-claude-style] [data-chat-following-tail] [data-chat-running] {
  position: sticky !important;
  bottom: calc(var(--dsh-composer-height, 0px) + var(--dsh-composer-fade-h, 40px) + 16px) !important;
  z-index: 1 !important;
  /* Pinned, the row floats over the tail of the transcript, and the words there
     would show through it. The canvas it already stands on paints the band, the
     way the composer seat paints its own: at rest the two are the same colour
     and nothing changes. */
  background: var(--dsh-claude-canvas, var(--dsw-alias-bg-base, #FCFCFB)) !important;
}
/* packages/client/src/features/turn-status/turn-status.ts writes a flex order onto the chat
   column's rows from the first running, stopped or failed turn on: that turn's
   process control goes after its work, and the rows after it (its footer,
   later turns, queued messages) step up one level each time. The chat column
   is a flex column; rows without the property keep order 0 and their
   document place. */
body[data-dsh-claude-style] [data-chat-flow] > [style*="--dsh-claude-turn-order"] {
  order: var(--dsh-claude-turn-order);
}

/* The control reads as Claude Code's status line: the spark, then the text the
   pass writes into the attribute — elapsed · output tokens · action while the
   turn runs, the host's stopped / failed word · duration · tokens after. The
   host's own label (and its ticking clock) stays in the DOM, out of sight. */
body[data-dsh-claude-style] button[data-dsh-claude-turn-status] {
  height: auto !important;
  min-height: calc(24px + var(--dsh-content-font-delta, 0px)) !important;
  margin: 4px 0 0 !important;
  padding: 0 !important;
  gap: 8px !important;
  border-bottom: none !important;
  color: var(--dsw-alias-label-tertiary) !important;
  cursor: default !important;
}
body[data-dsh-claude-style] button[data-dsh-claude-turn-status] > [class*="_label"] {
  display: none !important;
}
body[data-dsh-claude-style] button[data-dsh-claude-turn-status]::before {
  content: "";
  flex: none;
  width: 14px;
  height: 14px;
  background: var(--dsw-alias-brand-primary, #d97757);
  -webkit-mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
  mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
}
body[data-dsh-claude-style] button[data-dsh-claude-turn-status]::after {
  content: attr(data-dsh-claude-turn-status);
  min-width: 0;
  overflow: hidden;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px));
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* While the turn runs the spark turns and breathes, in every motion setting,
   like the sidebar's background-work ring: standing still, it would read as a
   stalled turn. A stopped or failed turn's spark stands still. */
body[data-dsh-claude-style] button[data-dsh-claude-turn-state="live"]::before {
  animation: 2.4s ease-in-out infinite dsh-claude-turn-spark;
}
@keyframes dsh-claude-turn-spark {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(0.78); }
  100% { transform: rotate(360deg) scale(1); }
}
/* Under the DeepSeek brand the mark is DeepSeek's whale, in the accent; a
   running turn has it swim — a tilt and a bob — where the spark turns. */
body[data-dsh-claude-style][data-dsh-claude-brand="deepseek"] button[data-dsh-claude-turn-status]::before {
  width: 16px;
  -webkit-mask-image: var(--dsh-claude-image-deepseek-mark);
  mask-image: var(--dsh-claude-image-deepseek-mark);
}
body[data-dsh-claude-style][data-dsh-claude-brand="deepseek"] button[data-dsh-claude-turn-state="live"]::before {
  animation: 1.6s ease-in-out infinite dsh-claude-turn-swim;
}
@keyframes dsh-claude-turn-swim {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-1.5px) rotate(-10deg); }
  75% { transform: translateY(1px) rotate(8deg); }
}

/* ---------- Conversation navigator (features/turn-nav, docs/decisions D34) ---------- */
/* The skin's turn rail stands in the host's rail slot at the card's row pitch
   (24px), and opens into the card with every row on its mark. The host's own
   rail stays laid out but unseen: its marks are what a jump presses. */

/* The host's rail, while the skin's stands in for it. Hidden, not removed: a
   jump scrolls it and presses its marks, and both need its layout. */
body[data-dsh-claude-style] [data-conversation-scroll] nav[class*="_frame"][data-dsh-claude-turn-nav-replaced] {
  visibility: hidden;
  pointer-events: none;
}

/* The skin's rail takes the host rail's seat by the host rail's own rules
   (ui-chat's TurnNavigator stylesheet): 12px in from the slot's right edge,
   centred in the band between the conversation's top and the composer, at
   most the band less 64px — and at most ten turns. */
body[data-dsh-claude-style] .dsh-claude-turn-rail {
  --dsh-claude-turn-rail-band: calc(var(--dsh-conversation-viewport-height, 100dvh) - var(--dsh-composer-height, 152px));
  position: absolute;
  top: calc(var(--dsh-claude-turn-rail-band) / 2);
  right: 12px;
  width: 28px;
  height: var(--dsh-claude-turn-rail-height);
  max-height: min(max(0px, calc(var(--dsh-claude-turn-rail-band) - 64px)), 240px);
  transform: translateY(-50%);
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
}
/* The host hides its rail in a narrow conversation; the slot is the container
   its rule asks, so the same rule hides this one. */
@container (width <= 900px) {
  body[data-dsh-claude-style] .dsh-claude-turn-rail {
    display: none;
  }
}
body[data-dsh-claude-style] .dsh-claude-turn-rail[data-fade-top] {
  mask-image: linear-gradient(transparent 0, #000 24px, #000 100%) !important;
}
body[data-dsh-claude-style] .dsh-claude-turn-rail[data-fade-bottom] {
  mask-image: linear-gradient(#000 0, #000 calc(100% - 24px), transparent 100%) !important;
}
body[data-dsh-claude-style] .dsh-claude-turn-rail[data-fade-top][data-fade-bottom] {
  mask-image: linear-gradient(transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%) !important;
}
body[data-dsh-claude-style] .dsh-claude-turn-rail-track {
  position: relative;
  transition: transform 0.15s ease, opacity 0.12s ease;
}
/* The card covers the rail while it is open; the marks step back under it. */
body[data-dsh-claude-style] .dsh-claude-turn-rail[data-dsh-claude-turn-nav-open] .dsh-claude-turn-rail-track {
  opacity: 0;
}
body[data-dsh-claude-style] .dsh-claude-turn-rail-mark {
  position: absolute;
  left: 0;
  right: 0;
  height: 24px;
}

/* One dash per turn, on the rail and in the card alike, in the host's three
   states: a 20px dash at 0.6 at rest (0.4 and fainter for a turn outside the
   loaded window), 0.9 under the pointer, whole for the turn being read. */
body[data-dsh-claude-style] .dsh-claude-turn-rail-mark::before,
body[data-dsh-claude-style] .dsh-claude-turn-nav-dash {
  width: 20px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l4);
  transform: scaleX(0.6);
  transform-origin: 100% 50%;
  transition: transform 0.14s ease, background-color 0.14s ease;
}
body[data-dsh-claude-style] .dsh-claude-turn-rail-mark::before {
  content: "";
  position: absolute;
  right: 0;
  top: 11px;
}
body[data-dsh-claude-style] .dsh-claude-turn-rail-mark[data-unloaded]::before,
body[data-dsh-claude-style] .dsh-claude-turn-nav-row[data-unloaded] .dsh-claude-turn-nav-dash {
  opacity: 0.6 !important;
  transform: scaleX(0.4) !important;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-row:hover .dsh-claude-turn-nav-dash {
  background: var(--dsw-alias-label-tertiary);
  opacity: 1;
  transform: scaleX(0.9);
}
body[data-dsh-claude-style] .dsh-claude-turn-rail-mark[data-current]::before,
body[data-dsh-claude-style] .dsh-claude-turn-nav-row[data-current] .dsh-claude-turn-nav-dash {
  background: var(--dsw-alias-label-primary);
  opacity: 1;
  transform: none;
}

/* The card: the shared shell, laid over the rail by turn-nav.ts from inside the
   rail's slot, so it counts as the conversation pane under the pointer. It
   fades in and out in place — the shell's rise would carry the rows off their
   marks. */
body[data-dsh-claude-style] .dsh-claude-turn-nav,
body[data-dsh-claude-style] .dsh-claude-turn-nav[data-open="true"] {
  position: absolute;
  left: auto;
  width: 288px;
  max-width: calc(100vw - 16px);
  transform: none;
  transition: opacity 0.12s ease;
}
/* The rows scroll in step with the rail's track; the wheel never reaches the page. */
body[data-dsh-claude-style] .dsh-claude-turn-nav-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-list::-webkit-scrollbar {
  display: none !important;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-row {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 24px;
  padding: 0 0 0 10px;
  border: none !important;
  border-radius: 6px;
  background: transparent;
  box-shadow: none;
  color: var(--dsw-alias-label-secondary, #787672);
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 400;
  line-height: 24px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-row:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-primary, #141413);
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-row:focus-visible {
  outline: 1px solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary, #D97757)) !important;
  outline-offset: -1px !important;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-row[data-current] {
  color: var(--dsw-alias-label-primary, #141413);
  font-weight: 500;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-dsh-claude-style] .dsh-claude-turn-nav-dash {
  flex: none;
}

/* The landing line: a short accent line over the first row of the turn a
   jump landed on, drawing out and fading. The row is the host's, so the mark
   alone carries it — the shared reduced-motion rule reads class names — and
   under reduced motion the line simply stands for its time. */
@keyframes dsh-claude-turn-nav-landed {
  0% { opacity: 0; transform: scaleX(0.5); }
  25% { opacity: 1; transform: scaleX(1); }
  70% { opacity: 1; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(1); }
}
body[data-dsh-claude-style] [data-dsh-claude-turn-nav-landed] {
  position: relative !important;
}
body[data-dsh-claude-style] [data-dsh-claude-turn-nav-landed]::after {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: -8px !important;
  height: 2px !important;
  border-radius: 1px !important;
  background: var(--dsw-alias-brand-primary, #D97757) !important;
  pointer-events: none !important;
  animation: dsh-claude-turn-nav-landed 1.4s ease-out forwards !important;
}
body[data-dsh-claude-style][data-dsh-claude-motion="reduced"] [data-dsh-claude-turn-nav-landed]::after {
  animation: none !important;
}

/* ---------- chat follow: the capped process group's body ---------- */
/* The catch-up in packages/client/src/features/chat-follow/process-follow.ts measures
   scrollHeight minus clientHeight, and the host declares only overflow-y on
   this body. By the CSS Overflow rules a visible axis beside a non-visible one
   computes to auto, so content a couple of pixels too wide (a wide table, an
   inline-flex atom, scrollbar-gutter's rounding) grows a horizontal scrollbar
   and adds its thickness to that difference. Clipped rather than scrollable:
   what can scroll sideways inside a group (code blocks, tables) carries its own
   overflow-x. */
body[data-dsh-claude-style][data-dsh-claude-chat-follow] [data-step-process]:not([data-group-expanded-mode]) [data-step-process-body] {
  overflow-x: hidden;
}
/* The host's own "back to the end" button while the stream glide follows
   (chat-follow.ts). A position held off the end reads to the host as a reader
   who left the end, so its settlement turns the follow off and it renders this
   button although the glide is following. Kept out of sight rather than
   removed: the host's own state stays untouched, and the mark goes away the
   moment the glide lets go. */
body[data-dsh-claude-style][data-dsh-claude-chat-follow] [data-dsh-claude-stream-glide] {
  visibility: hidden;
}
/* The same button at rest, back where the reader can press it: centred over the
   composer instead of the column's right edge, which the mascot stands on. Its
   two numbers are written per pass (chat-follow.ts): the button is fixed and the
   column moves with the sidebars. */
body[data-dsh-claude-style][data-dsh-claude-chat-follow] [data-dsh-claude-follow-tail] {
  position: fixed !important;
  left: var(--dsh-claude-follow-tail-left) !important;
  bottom: var(--dsh-claude-follow-tail-bottom) !important;
  right: auto !important;
  top: auto !important;
  transform: translateX(-50%) !important;
  z-index: 2 !important;
}

/* ---------- chat fold: the process group's live label ---------- */
/* While a group is open and its header carries a live detail, that header's text
   is the label and the detail joined in one text node (the host's separator is
   " · "), and the detail is the same text the group's thinking row is streaming
   — two places growing at once. CSS cannot split a text node, so the label half
   is written onto the header as an attribute and stands in for the whole text
   while the body is open: the header, its icon and its control stay where they
   are. Closing the body brings the original text straight back, and a tier
   without live detail never matches.

   The stand-in text needs its own sweep: the animation lived on the element that
   was hidden along with it. The gradient, its half width and its period follow
   the host's TextShimmer; only the keyframes name is ours, because the host's
   own animation names live in CSS Modules and change with every build. */

body[data-dsh-claude-style][data-dsh-claude-chat-fold] [data-step-process][data-dsh-claude-live-detail][data-dsh-claude-open] button[data-process-activity] > :is([data-shimmer], [data-text-shimmer]) {
  display: none;
}

body[data-dsh-claude-style][data-dsh-claude-chat-fold] [data-step-process][data-dsh-claude-live-detail][data-dsh-claude-open] button[data-process-activity]::after {
  content: attr(data-dsh-claude-label);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes dsh-claude-label-shimmer {
  66.6667%, 100% { background-position: 0% center; }
}

/* Only a browser that can draw the gradient hands its text over to a background;
   one that cannot keeps a plain static label instead of a background it cannot
   paint and the text lost with it.

   The parenthesised test has to be a property and value. A bare function call
   (color-mix(...)) is an unknown function form and always false, which would
   skip the whole block silently: the text stays, the sweep is gone, and nothing
   says so. */
@supports (color: color-mix(in oklab, currentColor 50%, transparent)) and ((-webkit-background-clip: text) or (background-clip: text)) {
  body[data-dsh-claude-style][data-dsh-claude-chat-fold] [data-step-process][data-dsh-claude-live-detail][data-dsh-claude-open] button[data-process-activity]::after {
    background-image: linear-gradient(
      90deg,
      currentColor calc(50% - var(--dsh-claude-label-spread, 0px)),
      color-mix(in oklab, currentColor 50%, transparent),
      currentColor calc(50% + var(--dsh-claude-label-spread, 0px))
    );
    background-position: 100% center;
    background-repeat: no-repeat;
    background-size: 250% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: dsh-claude-label-shimmer 1.5s cubic-bezier(0.33, 0, 0.67, 1) infinite;
  }

  /* The reader's animation choice, resolved onto <body> by packages/client/src/core/prefs.ts
     (D26): reduced leaves a plain static label rather than a standing gradient.
     The attribute already folds in the system setting, so no media query here —
     and one would stop the sweep for a reader who picked "always". */
  body[data-dsh-claude-style][data-dsh-claude-chat-fold][data-dsh-claude-motion="reduced"] [data-step-process][data-dsh-claude-live-detail][data-dsh-claude-open] button[data-process-activity]::after {
    background-image: none;
    -webkit-text-fill-color: currentColor;
    animation: none;
  }
}

/* ---------- chat reveal: the fading-in-a-rivulets rules, one per step ---------- */
/* Ported from dsh-chat-ux (packages/client/src/features/chat-reveal/reveal-engine.ts). Step 0 is
   the faintest a character ever is, the last step is its own colour — so the text
   reaches its final colour exactly when its segment leaves the highlight registry.

   The fade is a change of the text's own alpha, never a swap of colours: every
   step paints the character in the colour it will come to rest in (its own,
   published per element to --dsh-claude-run-color by the engine) and walks the
   alpha from CHAT_REVEAL_MIN_OPACITY to fully opaque. ::highlight() accepts no
   opacity — its property set is small and does not include it — so the alpha rides
   on color, and color-mix(in srgb, C p%, transparent) is exactly that: mixing with
   transparent weights the result's alpha by p and leaves the hue alone.

   Every rule is scoped under the streaming containers: the fade happens nowhere
   else, and elements outside one are filtered out by their ancestor during style
   matching and cost nothing. The two selectors per step cover the container's own
   text and text inside any element under it.

   The step count and the names are the engine's own (CHAT_REVEAL_STEPS,
   CHAT_REVEAL_HIGHLIGHT_PREFIX): 24 steps and dsh-claude-tok-<n>, spelled here by
   hand. The alphas are CHAT_REVEAL_MIN_OPACITY + (1 - CHAT_REVEAL_MIN_OPACITY) *
   n / 23, in percent to two decimals. */

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-0),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-0) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 20.00%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-1),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-1) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 23.48%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-2),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-2) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 26.96%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-3),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-3) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 30.43%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-4),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-4) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 33.91%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-5),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-5) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 37.39%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-6),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-6) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 40.87%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-7),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-7) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 44.35%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-8),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-8) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 47.83%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-9),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-9) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 51.30%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-10),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-10) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 54.78%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-11),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-11) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 58.26%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-12),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-12) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 61.74%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-13),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-13) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 65.22%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-14),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-14) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 68.70%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-15),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-15) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 72.17%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-16),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-16) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 75.65%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-17),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-17) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 79.13%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-18),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-18) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 82.61%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-19),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-19) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 86.09%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-20),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-20) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 89.57%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-21),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-21) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 93.04%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-22),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-22) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 96.52%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming]::highlight(dsh-claude-tok-23),
body[data-dsh-claude-style][data-dsh-claude-chat-reveal] [data-streaming] ::highlight(dsh-claude-tok-23) {
  color: color-mix(in srgb, var(--dsh-claude-run-color, currentColor) 100.00%, transparent);
}

/* ---------- chat files: the file-change row ---------- */
/* The file-change row belongs to this skin: it takes over the host's two keyed
   seat rows for the write and edit tools (chat-files.ts), and what the host's own
   ToolRow.module.css draws for them has build-time hashed names — not reachable,
   and not an interface. So the rules are drawn again here, with the sizes, tokens
   and rhythm of the host's own row. The line height and the leading icon are the
   shared DisclosureRow's job; what it does not draw is added here: the separator
   dot, the summary, the statistics tail, the path link, the IN/OUT card and the
   trajectory entrance. */

/* The added and removed colours read the host's own file-diff marker pair rather
   than the diff body's success and error tokens: the body pair has one green in
   both themes (rgb(34,197,94)), which is bright for 11px text on a light canvas,
   while the marker pair is split for exactly that — light rgb(1,162,65) /
   rgb(186,39,35), dark rgb(65,201,119) / rgb(250,66,62). Retuning means these two
   lines, one per theme. */
body[data-dsh-claude-style] {
  --dsh-claude-diff-added: var(--dsw-alias-file-diff-added-marker);
  --dsh-claude-diff-deleted: var(--dsw-alias-file-diff-deleted-marker);
}

body[data-dsh-claude-style] .dsh-claude-file-root {
  display: flex;
  flex-direction: column;
}

body[data-dsh-claude-style] .dsh-claude-file-leading {
  flex-shrink: 0;
}

body[data-dsh-claude-style] .dsh-claude-file-chevron {
  color: var(--dsw-alias-label-secondary);
}

body[data-dsh-claude-style] .dsh-claude-file-title {
  font-weight: 400;
  transition: color 100ms ease;
}

/* A 2 by 2 dot: the light separator between the title and the summary. */
body[data-dsh-claude-style] .dsh-claude-file-sep {
  flex: none;
  width: 2px;
  height: 2px;
  border-radius: 1px;
  margin: 0 8px;
  background: var(--dsw-alias-label-caption);
}

body[data-dsh-claude-style] .dsh-claude-file-summary {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px));
  color: var(--dsw-alias-label-tertiary);
  transition: color 100ms ease;
}

/* The tail: it sits outside the summary's ellipsis, so it carries the same type
   size of its own. A fixed gap sits between the two numbers — wider than a space,
   so "+12" and "-3" do not read as one number. */
body[data-dsh-claude-style] .dsh-claude-file-suffix {
  flex: none;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  margin-left: 10px;
  white-space: nowrap;
}

/* The numbers: the code face, two steps below the path, with half a pixel pushing
   the baseline back to the middle of the line box. */
body[data-dsh-claude-style] .dsh-claude-file-stat {
  font-family: var(--ds-font-family-code);
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 2px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px));
  transform: translateY(0.5px);
}

body[data-dsh-claude-style] .dsh-claude-file-add {
  color: var(--dsh-claude-diff-added);
}

body[data-dsh-claude-style] .dsh-claude-file-del {
  color: var(--dsh-claude-diff-deleted);
}

/* Hovering the row lifts it, but the two numbers do not follow: they are this
   row's conclusion, their colour is the information, and turning them into body
   colour would rub the conclusion out. */
body[data-dsh-claude-style] .dsh-claude-file-row:hover .dsh-claude-file-title,
body[data-dsh-claude-style] .dsh-claude-file-row:hover .dsh-claude-file-summary:not(.dsh-claude-file-error):not(.dsh-claude-file-stopped) {
  color: var(--dsw-alias-label-primary);
}

/* The file path: same type size, a dotted underline saying it can be pressed. It
   shrinks to the width of its text, so the blank space left in the row still
   belongs to the open and close target. */
body[data-dsh-claude-style] .dsh-claude-file-link {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px));
  color: var(--dsw-alias-label-secondary);
  text-decoration: underline dotted;
  text-decoration-color: var(--dsw-alias-label-tertiary);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color 100ms ease;
}

body[data-dsh-claude-style] .dsh-claude-file-row:hover .dsh-claude-file-link,
body[data-dsh-claude-style] .dsh-claude-file-link:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration-color: currentColor;
}

body[data-dsh-claude-style] .dsh-claude-file-error {
  color: var(--dsw-alias-state-error-primary);
}

body[data-dsh-claude-style] .dsh-claude-file-stopped {
  color: var(--dsw-alias-state-warn-label);
}

body[data-dsh-claude-style] .dsh-claude-file-body {
  display: flex;
  flex-direction: column;
}

/* The expanded body: the diff card and the IN/OUT card share one left indent and
   one rhythm between rows. */
body[data-dsh-claude-style] .dsh-claude-file-diff,
body[data-dsh-claude-style] .dsh-claude-file-io {
  margin: 4px 0 4px 4px;
}

/* The IN/OUT card: the code block's surface and corner, each section scrolling on
   its own with a hairline between them. */
body[data-dsh-claude-style] .dsh-claude-file-io {
  display: flex;
  flex-direction: column;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-markdown-code-block);
  font: var(--dsw-font-markdown-code-block-small);
}

body[data-dsh-claude-style] .dsh-claude-file-io-section {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 14px;
  align-items: baseline;
  padding: 12px 16px;
  max-height: 150px;
  overflow-y: auto;
}

body[data-dsh-claude-style] .dsh-claude-file-io-divider {
  flex: none;
  height: 0.5px;
  background: var(--dsw-alias-border-l2);
}

body[data-dsh-claude-style] .dsh-claude-file-io-label {
  position: sticky;
  top: 0;
  align-self: start;
  color: var(--dsw-alias-label-caption);
}

body[data-dsh-claude-style] .dsh-claude-file-io-text {
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-secondary);
}

body[data-dsh-claude-style] .dsh-claude-file-io-text[data-error] {
  color: var(--dsw-alias-state-error-primary);
}

/* The trajectory entrance: it appears when the row (its title line included) is
   hovered or when it takes keyboard focus, and takes no room otherwise. */
body[data-dsh-claude-style] .dsh-claude-file-inspect {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  margin: 4px 0 2px 4px;
  padding: 2px 8px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease;
}

body[data-dsh-claude-style] .dsh-claude-file-root:hover .dsh-claude-file-inspect,
body[data-dsh-claude-style] .dsh-claude-file-inspect:focus-visible {
  opacity: 1;
}

body[data-dsh-claude-style] .dsh-claude-file-inspect:hover {
  background: var(--dsw-alias-interactive-bg-hover-solid);
  color: var(--dsw-alias-label-primary);
}

/* The running state is carried by the icon and its sweep alone, so the state
   itself needs a sentence for a screen reader. */
body[data-dsh-claude-style] .dsh-claude-file-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ---------- chat send: the bubble's take-off ---------- */
/* One rule: the real row hides while the stand-in flies. visibility rather than
   display — the hidden row has to keep its layout box, because the stand-in
   measures the destination from it every frame. The attribute name is
   constants.ts's CHAT_FLYING_ATTR, spelled the same by the JS that writes it. */
body[data-dsh-claude-style] [data-dsh-claude-send-flight] {
  visibility: hidden;
}

/* ---------- chat fold: a body's entrance, and the door while it rolls ---------- */
/* The host's DisclosureRow unmounts a body whole when it closes ({open &&
   children}, ui-primitives' DisclosureRow.tsx), so the frame it is inserted on is
   the only chance to attach a transition: @starting-style gives it a start value
   and the body fades in from 2px above instead of snapping into place. This
   covers every such row in the chat area — tool cards, thinking rows, system
   notices, context injections, the generic command card — and the feature's own
   file-change rows once they land.

   Only opacity and translate move; the height is final at insertion. The chat
   area is one scrolling container with a follow, and a process group's body has
   its own ResizeObserver follow inside it: rewriting the height frame by frame
   would send both chasing a moving target, and the paging anchors are recorded
   by element position, which would drift during the animation. So this is a fade,
   not an unfold.

   The closed direction has no exit: the element is removed in the same frame and
   CSS has no old value to transition from. An exit would mean taking over the
   render.

   The selector anchors on data-disclosure-row, an attribute DisclosureRow emits
   itself rather than a hashed class name, so a host release cannot break it.
   Every sibling after the row is its body.

   Two exclusions:

     outside the chat area  [data-disclosure-row] comes from a page-wide
                            component that file previews and workflow panels use
                            too, and they should not follow the chat area's rules:
                            the rule is scoped to [data-chat-flow].
     the turn's header      at the end of a turn the host gathers that turn's
                            non-final content under its header (the "took X
                            seconds" button, [data-turn-process]), and opening it
                            brings those process members back into view at once —
                            every body inside them would be treated as "just
                            inserted" and dozens would fade in from 2px above,
                            sliding the whole block into place. The process
                            members carry the host's own data-turn-process-member,
                            so that subtree is excluded whole; the turn's trigger
                            notice ([data-turn-trigger]) likewise. */
@starting-style {
  body[data-dsh-claude-style][data-dsh-claude-chat-fold] [data-chat-flow] [data-disclosure-row] ~ *:not([data-turn-process-member] *, [data-turn-trigger] *) {
    opacity: 0;
    translate: 0 -2px;
  }
}

/* The entrance: 2px up and a fade, at the 120 ms the chat area already uses
   (MessageItem and the TurnNavigator preview match it). It rides the folding
   switch with the rest of the feature: off leaves the host's own insertion. */
body[data-dsh-claude-style][data-dsh-claude-chat-fold] [data-chat-flow] [data-disclosure-row] ~ *:not([data-turn-process-member] *, [data-turn-trigger] *) {
  transition: opacity 120ms ease-out, translate 120ms ease-out;
}

/* The reader's animation choice, resolved onto <body> (packages/client/src/core/prefs.ts, D26):
   the system setting is folded into that attribute by "follow the system", so
   this one rule covers both it and the explicit "reduced". */
body[data-dsh-claude-style][data-dsh-claude-motion="reduced"] [data-chat-flow] [data-disclosure-row] ~ *:not([data-turn-process-member] *, [data-turn-trigger] *) {
  transition: none;
}

/* While the door rolls (fold-glide.ts hangs the mark), every card inside is laid
   out at its natural height rather than squeezed: a body is often a flex column,
   and with the height pressed the flex would shrink away the card that can shrink
   (a code card's automatic minimum height is 0) first, so a run_code body of
   "code card plus output card" would roll in two stages. Marked, each card takes
   its own height and only the frame clips. The mark goes away with the door and
   the layout returns to the host's own — at the end point the two arrangements
   agree to the pixel. !important because nothing may change it during those
   200 ms. */
body[data-dsh-claude-style] [data-dsh-claude-rolling] > * {
  flex: none !important;
}

/* ---------- caret motion (packages/client/src/features/caret/) ---------- */
/* Three rules: press the native caret down, lend a parent the positioning
   context the drawn caret is placed against, and draw it. The first two match
   only the marks the script writes, so a script that never ran leaves the
   native caret in place — this is the one effect that really hurts a reader
   when it half-runs (no caret at all), so the native caret is only ever hidden
   by the script's own mark. */

/* 0-3-1 against the host's own caret-color rule (0-1-0). */
body[data-dsh-claude-style] [data-composer-input][data-dsh-claude-caret],
body[data-dsh-claude-style] textarea[data-dsh-claude-caret] {
  caret-color: transparent;
}

/* Lent to a parent that is not a positioning context. None of these containers
   has an absolutely positioned descendant, so this changes no layout. */
body[data-dsh-claude-style] [data-dsh-claude-caret-host] {
  position: relative;
}

/* The same attribute twice, to reach 0-3-1 and beat whatever the host's own
   container writes for its children (a question card's field gives every child
   a grid area, padding and a whole font), so the box's size and place are
   written back explicitly. */
body[data-dsh-claude-style] [data-dsh-claude-caret-layer][data-dsh-claude-caret-layer] {
  position: absolute;
  top: 0;
  left: 0;
  grid-area: auto;
  box-sizing: content-box;
  width: 2px;
  min-width: 0;
  max-width: none;
  min-height: 0;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  visibility: hidden;
  pointer-events: none;
  /* Read off the native caret at the moment of taking over; before that, the
     host's own colour for the composer input. */
  background: var(--dsh-claude-caret-color, var(--dsw-alias-state-business-primary, currentColor));
  transition: transform 80ms ease;
  will-change: transform;
  /* The native caret's own cycle: 500 ms lit, 500 ms dark. The script restarts
     it by name (CARET_BLINK_NAME), so the two spellings stay the same. */
  animation: dsh-claude-caret-blink 1s step-end infinite;
}

body[data-dsh-claude-style] [data-dsh-claude-caret-layer][data-dsh-claude-caret-layer][data-dsh-claude-caret-visible] {
  visibility: visible;
}

@keyframes dsh-claude-caret-blink {
  50% { opacity: 0; }
}

/* The reader's animation choice, resolved onto <body> (packages/client/src/core/prefs.ts, D26):
   reduced stills the glide and the blink, and it covers the system setting too
   because "follow the system" resolves into this same attribute. A media query
   here would ignore the choice — and would stop the caret for a reader who
   picked "always" against a system that asks for reduced motion. */
body[data-dsh-claude-style][data-dsh-claude-motion="reduced"] [data-dsh-claude-caret-layer][data-dsh-claude-caret-layer] {
  transition: none;
  animation: none;
}

/* ---------- Claude Code layout: permission segments ---------- */
/* The shipped access control is one popup-select button; it is replaced by
   a Read | Edit | Auto | Yolo segmented control over presets — for
   as long as the permission control is installed to stand in for it. The
   host's button is the one packages/client/src/features/composer/composer.ts marks as the
   access control. */
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-dsh-claude-permissions] button[data-dsh-claude-control="access"] {
  display: none;
}

body[data-dsh-claude-style] .dsh-claude-segments {
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--dsw-specific-selector);
  display: inline-flex;
  /* The sliding pill (shared/sliding-pill.css) is absolutely placed against the group. */
  position: relative;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-segments {
  background: var(--dsh-claude-chip);
}

body[data-dsh-claude-style] .dsh-claude-segment {
  appearance: none;
  margin: 0;
  border: 0;
  cursor: pointer;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  padding: 3px 12px;
  border-radius: 7px;
  transition: background-color .1s, color .1s;
}

body[data-dsh-claude-style] .dsh-claude-segment:hover:not([data-active]) {
  color: var(--dsw-alias-label-primary);
}

body[data-dsh-claude-style] .dsh-claude-segment[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-3);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-segment[data-active] {
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.08);
}

/* The group's sliding pill: the box the active segment wore above, which the
   segment gives up while the pill is there. */
body[data-dsh-claude-style] .dsh-claude-segments[data-dsh-claude-pill]::before {
  top: 2px;
  bottom: 2px;
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-3);
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-segments[data-dsh-claude-pill]::before {
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.08);
}

body[data-dsh-claude-style] .dsh-claude-segments[data-dsh-claude-pill] > .dsh-claude-segment[data-active] {
  background: transparent;
  box-shadow: none;
}

/* ---------- Claude Code layout: in-conversation permission popover ---------- */
body[data-dsh-claude-style] .dsh-claude-perm-container {
  position: relative;
  display: inline-flex;
  z-index: 20;
}
body[data-dsh-claude-style] .dsh-claude-perm-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  /* The tier names run from "Read only" to "Workspace write": the button takes
     the room the composer's bottom line reserves for it and the label truncates
     past that, so a long name never pushes the row's other controls. */
  max-width: 132px;
  padding: 0 6px 0 6px;
  border-radius: 6px;
  border: none !important;
  background: transparent;
  color: var(--dsw-alias-label-primary, #141413);
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.12s ease;
}
body[data-dsh-claude-style] .dsh-claude-perm-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-perm-btn {
  color: var(--dsw-alias-label-primary);
}
body[data-dsh-claude-style] .dsh-claude-perm-btn:hover,
body[data-dsh-claude-style] .dsh-claude-perm-btn[data-open="true"] {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
}
/* The preset list's card is the shared popover card (shared/popover.css). */
body[data-dsh-claude-style] .dsh-claude-perm-popover {
  position: fixed;
  min-width: 248px;
  display: flex;
  flex-direction: column;
  /* Two-line preset rows (label + description) need air between them: the
     2px gap read as one solid block, so each row is separated by 6px. */
  gap: 6px;
  transform-origin: bottom left;
}

/* ---------- Claude Code layout: account row & floating popover ---------- */
/* footArea positioning with crisp hairline border spanning entire sidebar */
body[data-dsh-claude-style] [class*="footArea"] {
  position: relative;
  overflow: visible;
  margin: 0 calc(-1 * var(--dsh-sidebar-inline-padding, 12px)) -6px;
  padding: 8px var(--dsh-sidebar-inline-padding, 12px) 6px;
  border-top: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  background: transparent;
  box-sizing: border-box;
}
body[data-dsh-claude-style][data-ds-dark-theme] [class*="footArea"] {
  border-top-color: var(--dsw-alias-border-l2);
}

/* Account trigger button in sidebar */
body[data-dsh-claude-style] .dsh-claude-account-btn {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  box-sizing: border-box;
  padding: 0 8px;
  margin: 0;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  background: transparent;
  transition: background-color 0.12s ease;
}
body[data-dsh-claude-style] .dsh-claude-account-btn:hover,
body[data-dsh-claude-style] .dsh-claude-account-btn[data-open="true"] {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
}
body[data-dsh-claude-style] .dsh-claude-account-avatar {
  width: 18px;
  height: 18px;
  background: var(--dsh-claude-image-anthropic-mark) center / contain no-repeat;
  flex: none;
  margin-right: 8px;
  /* The host's own avatar is a circle (32px with a 16px radius). Ours is 18px to
     fit this compact row, but the shape has to match, or the picture reads as a
     square chip: half the size, and clip so \`cover\` crops inside the circle. */
  border-radius: 50%;
  corner-shape: round;
  overflow: hidden;
}
/* Under the DeepSeek brand the picture with no account behind it is DeepSeek's
   whale, in its brand blue. */
body[data-dsh-claude-style][data-dsh-claude-brand="deepseek"] .dsh-claude-account-avatar {
  background-image: var(--dsh-claude-image-deepseek-mark);
}
body[data-dsh-claude-style] .dsh-claude-account-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 18px;
  font-family: var(--dsw-font-family);
}
body[data-dsh-claude-style] .dsh-claude-account-user {
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
body[data-dsh-claude-style] .dsh-claude-account-chevron {
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--dsw-alias-label-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}
body[data-dsh-claude-style] .dsh-claude-account-chevron::after {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E") center / contain no-repeat;
  transition: transform 0.15s ease;
}
body[data-dsh-claude-style] .dsh-claude-account-btn[data-open="true"] .dsh-claude-account-chevron::after {
  transform: rotate(180deg);
}

/* Floating Popover Container: Adaptive Width */
body[data-dsh-claude-style] .dsh-claude-account-popover {
  position: absolute;
  bottom: calc(100% + 4px);
  /* The drawer's inline edges are the account row's own, measured by
     features/account/account-footer.ts: the footer's padding box is wider than the row,
     so a flat 0 would make the card overhang the row it hangs from. */
  left: var(--dsh-claude-account-inset-left, 0px);
  right: var(--dsh-claude-account-inset-right, 0px);
  width: auto;
  max-width: none;
  min-width: 0;
  /* The shared popover card (shared/popover.css), on the card fill. */
  background: var(--dsh-claude-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* The drawer's rows are built and reconciled while it is closed (the mirror
     sync only runs then), so the panel sits right above the account row with
     its icons in it. opacity alone leaves that content in the paint and
     hit-test tree; visibility takes it out of both, and the delayed transition
     keeps the closing fade. Layout is untouched, so the closed drawer's box is
     still measurable. */
  visibility: hidden;
  transform: translateY(6px) scale(0.98);
  transform-origin: bottom left;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0s linear 0.15s;
}
body[data-dsh-claude-style] .dsh-claude-account-popover[data-open="true"] {
  visibility: visible;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0s;
}
/* Hover bridge between trigger and popover */
body[data-dsh-claude-style] .dsh-claude-account-popover::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 12px;
  background: transparent;
}

/* The account row is the ban-screen easter egg's trigger
   (packages/client/src/features/ban-screen/ban-screen.ts). The header is only the wrapper — the clickable
   strip is the inner row, so the hover plate covers the name and not the divider
   that follows it. */
body[data-dsh-claude-style] .dsh-claude-account-popover-row {
  min-height: 32px;
  padding: 2px 7px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
body[data-dsh-claude-style] .dsh-claude-account-popover-row:hover,
body[data-dsh-claude-style] .dsh-claude-account-popover-row:focus-visible {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
  outline: none !important;
}

/* The rule under the account name belongs to the POPOVER, not to the row: it
   spans the panel's full width (the negative inline margins cancel the popover's
   6px padding) and sits outside the hover plate above. */
body[data-dsh-claude-style] .dsh-claude-account-popover-header .dsh-claude-account-popover-divider {
  margin: 0 -6px;
}


/* The account mark is a background image on the span itself (see the rule above).
   When the desktop has a real avatar, the picture is an <img> layered over that
   mark (packages/client/src/features/account/account-footer.ts) rather than a background: the picture
   host expects the request without a referrer, the way the host's own avatar
   <img> sends it, and only an element can say so. A picture that fails to load
   hides itself, and the mark underneath shows instead of an empty circle. */
body[data-dsh-claude-style] .dsh-claude-account-avatar[data-dsh-claude-photo] {
  position: relative !important;
}
body[data-dsh-claude-style] .dsh-claude-account-avatar[data-dsh-claude-photo]::before {
  display: none !important;
}
body[data-dsh-claude-style] .dsh-claude-account-photo {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: inherit !important;
  pointer-events: none !important;
}
body[data-dsh-claude-style] .dsh-claude-account-photo[hidden] {
  display: none !important;
}

/* The launcher's own skin, when the instance was started with one: the head is
   a canvas cropped out of the texture the host serves (packages/client/src/features/account/
   rows.ts), so it is the picture, not the mark, that fills the box. The mark is
   dropped only while that canvas is mounted — a skin whose bytes never arrived
   leaves the attribute off and the mark in place. The pixels are a Minecraft
   head's 8×8 face, so they are scaled without smoothing.
   The box is square, not the circle the photo path uses: the head is drawn to
   the box's edges (the hat layer covers it, the face is inset by 1/18), so any
   rounding at all shaves the head's own pixels — the circle cut the four
   corners off. The launcher's own account list shows the head square for the
   same reason. */
body[data-dsh-claude-style] .dsh-claude-account-avatar[data-dsh-claude-skin] {
  position: relative !important;
  background-image: none !important;
  border-radius: 0 !important;
}
body[data-dsh-claude-style] .dsh-claude-account-avatar[data-dsh-claude-skin]::before {
  display: none !important;
}
body[data-dsh-claude-style] .dsh-claude-account-skin {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  image-rendering: pixelated;
}

/* The drawer's rows had no hover feedback at all: the only
   \`.dsh-claude-popover-item:hover\` rule in the stylesheet is scoped to the model
   picker. Give the account drawer the same affordance as the rest of the skin. */
body[data-dsh-claude-style] .dsh-claude-account-popover .dsh-claude-popover-item:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-account-popover .dsh-claude-popover-item:hover {
  background: rgba(255, 255, 255, 0.10) !important;
}
body[data-dsh-claude-style] .dsh-claude-account-popover .dsh-claude-popover-item[aria-disabled="true"] {
  opacity: 0.5 !important;
  cursor: default !important;
}

/* ---------- Host account area ---------- */
/* The host's own account row is the entry on a host that has one (Desktop
   0.1.7+): it stays in the host's DOM and flow and is repainted here as a
   Claude row. features/account/account-footer.ts marks it with
   [data-dsh-claude-account-host-row]. */
body[data-dsh-claude-style] [data-dsh-claude-account-host-row] {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  width: 100% !important;
  height: 32px !important;
  box-sizing: border-box !important;
  padding: 0 8px !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: var(--dsw-alias-label-primary) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  font-family: var(--dsw-font-family) !important;
  text-align: left !important;
  cursor: pointer !important;
  transition: background-color 0.12s ease !important;
}
body[data-dsh-claude-style] [data-dsh-claude-account-host-row]:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
/* The host's own avatar keeps its picture; only its box is normalised to this
   row's 18px circle. */
body[data-dsh-claude-style] [data-dsh-claude-account-host-row] img {
  width: 18px !important;
  height: 18px !important;
  flex: none !important;
  border-radius: 50% !important;
  object-fit: cover !important;
}
/* The chevron is the skin's own: the host row does not draw one. */
body[data-dsh-claude-style] [data-dsh-claude-account-host-row]::after {
  content: "" !important;
  display: inline-block !important;
  width: 12px !important;
  height: 12px !important;
  flex: none !important;
  margin-left: auto !important;
  background: currentColor !important;
  opacity: 0.55 !important;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E") center / contain no-repeat;
}
/* The host wraps its row in its own slot markup. Every branch on the way to the
   marked row becomes a full-width flex box, so the row can fill the footer
   whatever the host's hashed wrapper classes are. */
body[data-dsh-claude-style] [class*="footArea"] [class*="triggerRow"]:has([data-dsh-claude-account-host-row]) {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}
body[data-dsh-claude-style] [class*="footArea"] [class*="triggerRow"] :has([data-dsh-claude-account-host-row]) {
  display: flex !important;
  align-items: center !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

/* Our container injected at the head of the host's account menu. Its rows use
   the shared popover-item rules; the container only stacks them and carries the
   account header above the host's own rows. */
body[data-dsh-claude-style] .dsh-claude-account-inject {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  padding: 0 !important;
}

/* ---------- Host account menu: the skin's popover language ---------- */
/* On a host with an account area (Desktop 0.1.7+) the host renders its own
   account menu and the skin injects only its header and plugin rows into the
   list. features/account/surface.ts marks that menu while it is open, and the
   rules below repaint the host's card, rows and separators with the same card /
   row / hairline language as the self-built drawer (shared/popover.css).
   Only appearance is touched: the host keeps its row order, copy and click
   behaviour. The marker sits on the card itself, so every selector is scoped to
   it and no other host menu is reached. */
body[data-dsh-claude-style] [data-dsh-claude-account-menu] {
  width: var(--dsh-claude-account-width, 260px) !important;
  min-width: 0 !important;
  max-width: none !important;
  box-sizing: border-box !important;
  padding: 6px !important;
  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc) !important;
  border-radius: 12px !important;
  background: var(--dsh-claude-card) !important;
  box-shadow: 0 8px 30px rgba(20, 20, 19, 0.12), 0 2px 8px rgba(20, 20, 19, 0.06) !important;
  font-family: var(--dsw-font-family) !important;
}
/* The card's visible fill is the MenuSurface material layer, not this box:
   under the Claude palette the surface token is rebound so that layer paints
   the same card fill, and its backdrop blur is dropped for the flat skin card.
   Under the host's colours the host's material stands. */
body[data-dsh-claude-style][data-dsh-claude-palette="claude"] [data-dsh-claude-account-menu] {
  --dsw-menu-surface-fill: var(--dsh-claude-card);
  --dsw-menu-backdrop-filter: none;
}
/* The entry animation is keyed on the armed marker rather than on the card
   marker (constants.ts): the armed marker is in place before the host mounts
   the card, so the animation runs from the card's first frame instead of
   replaying over a card that was already painted. The host's shared menu card
   is the only thing that mounts inside that window.

   The card is also held until the reveal marker lands. The host mounts its card
   with its own rows and places it from that geometry; the skin's container
   arrives a frame later, the card grows, and the host re-places it a frame after
   that. A card revealed on the mount frame fades in low and jumps up mid-fade,
   so inside the armed window it stays unpainted until surface.ts has seen our
   rows inside it and the host's placement stand still. */
body[data-dsh-claude-style][data-dsh-claude-account-armed] div[role="menu"][data-menu-material]:not([data-dsh-claude-account-ready]) {
  visibility: hidden !important;
  animation: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-account-armed] div[role="menu"][data-menu-material][data-dsh-claude-account-ready] {
  transform-origin: bottom left !important;
  animation: dsh-claude-account-menu-in 0.15s ease !important;
}
@keyframes dsh-claude-account-menu-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
body[data-dsh-claude-style][data-ds-dark-theme] [data-dsh-claude-account-menu] {
  background: var(--dsh-claude-raised) !important;
  border-color: var(--dsw-alias-border-l2) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

/* The host's rows. itemWrap is the shared Menu's row wrapper; the bare item
   fragment would reach unrelated class names, so the longest stable piece is
   used. */
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="itemWrap"] > [role="menuitem"] {
  min-height: 32px !important;
  padding: 2px 7px !important;
  gap: 8px !important;
  border-radius: 6px !important;
  font-size: 13px !important;
  line-height: 20px !important;
  font-weight: 400 !important;
  color: var(--dsw-alias-label-primary, #141413) !important;
  transition: background-color 0.12s ease !important;
}
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="itemWrap"] > [role="menuitem"]:hover:not(:disabled),
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="itemWrap"] > [role="menuitem"]:focus-visible:not(:disabled) {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
/* The selected row keeps the skin's fill rather than the host's stronger
   accent: the account menu's rows are actions, not a persistent choice. */
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="_selected"] {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="itemLabel"] {
  font-size: 13px !important;
  line-height: 20px !important;
}
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="itemIcon"] {
  width: 16px !important;
  height: 16px !important;
  color: var(--dsw-alias-label-secondary, #787672) !important;
}
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="itemIcon"] svg {
  width: 16px !important;
  height: 16px !important;
}

/* Separators take the skin's hairline and bleed across the card's padding the
   way the drawer's own divider does. */
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [role="separator"] {
  height: 1px !important;
  margin: 2px -6px !important;
  background: var(--dsw-alias-border-l1, #e8e6dc) !important;
}

/* The list and its pinned footer sit inside the card's 6px padding; the footer
   keeps a hairline but takes the skin's spacing. */
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="_viewport"] {
  padding: 0 !important;
  overflow-x: hidden !important;
}
body[data-dsh-claude-style] [data-dsh-claude-account-menu] [class*="_footer"] {
  margin-top: 2px !important;
  padding-top: 2px !important;
  border-top: 1px solid var(--dsw-alias-border-l1, #e8e6dc) !important;
}

/* Our injected container and header already use the shared popover rules; the
   host's viewport is a flex column, so the container only needs to fill it. */
body[data-dsh-claude-style] [data-dsh-claude-account-menu] .dsh-claude-account-inject {
  width: 100% !important;
}


/* ---------- The account popover's header, divider and body ---------- */
/* Popover Header. Vertical padding only: the clickable account row carries its
   own inline padding (the row rules above), and the divider below is a
   full-bleed rule that must not be inset by this box. */
body[data-dsh-claude-style] .dsh-claude-account-popover-header {
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
body[data-dsh-claude-style] .dsh-claude-account-popover-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #141413);
  line-height: 18px;
  font-family: var(--dsw-font-family);
}
body[data-dsh-claude-style] .dsh-claude-account-popover-divider {
  height: 1px;
  background: var(--dsw-alias-border-l1, #e8e6dc);
  margin: 2px 0;
  flex: none;
}

/* Popover Body & Items */
body[data-dsh-claude-style] .dsh-claude-account-popover-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 360px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ---------- Claude Code layout: account-ban easter egg ---------- */
/* A reproduction of Claude's own "Your account is on hold" page, shown when the
   account row at the top of the sidebar's account popover is clicked. It is an
   easter egg, not a real state (packages/client/src/features/ban-screen/ban-screen.ts), and it is a
   full-window overlay rather than a page: \`position: fixed\` at the top of the
   stacking order, so it covers the titlebar, sidebar and composer whatever the
   host paints underneath, and can never be clipped by the sidebar column the
   account popover itself has to dodge.

   Palette: the page is Claude's ivory canvas, so the light rules carry the
   measurements and the dark theme re-maps the same slots onto the skin's warm
   black. Every colour is a custom property, which is what lets one set of rules
   serve both canvases. */
body[data-dsh-claude-style] .dsh-claude-ban {
  --dsh-ban-canvas: #faf9f5;
  --dsh-ban-text: #141413;
  --dsh-ban-muted: #6e6a60;
  --dsh-ban-card: #ffffff;
  --dsh-ban-hairline: #e4e2d8;
  --dsh-ban-hover: rgba(20, 20, 19, 0.05);
  --dsh-ban-primary-fill: #141413;
  --dsh-ban-primary-text: #faf9f5;
  --dsh-ban-primary-hover: #2e2c29;
  --dsh-ban-danger: #a8412b;
  --dsh-ban-danger-hover: #8f3623;
  --dsh-ban-toast-bg: #f6e3c0;
  --dsh-ban-toast-border: #e6cfa1;
  --dsh-ban-toast-text: #7a4f12;
  --dsh-ban-toast-icon: #9a5a15;
  --dsh-ban-toast-hover: rgba(20, 20, 19, 0.09);
  /* The two brand marks are alpha masks over these slots, so the starburst
     keeps the clay accent while the wordmark stays in the page's ink. */
  --dsh-ban-mark: #d97757;
  --dsh-ban-word: #141413;
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483000 !important;
  margin: 0 !important;
  padding: 0 !important;
  background: var(--dsh-ban-canvas) !important;
  color: var(--dsh-ban-text);
  font-family: var(--dsw-font-family);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-ban {
  --dsh-ban-canvas: #141413;
  --dsh-ban-text: #faf9f5;
  --dsh-ban-muted: #b0aea5;
  --dsh-ban-card: #1c1b1a;
  --dsh-ban-hairline: #2e2c29;
  --dsh-ban-hover: rgba(255, 255, 255, 0.07);
  --dsh-ban-primary-fill: #faf9f5;
  --dsh-ban-primary-text: #141413;
  --dsh-ban-primary-hover: #e8e6dc;
  --dsh-ban-danger: #e08a6d;
  --dsh-ban-danger-hover: #eb9f84;
  --dsh-ban-toast-bg: #3a2a22;
  --dsh-ban-toast-border: #55402f;
  --dsh-ban-toast-text: #f0d8b8;
  --dsh-ban-toast-icon: #e0a86a;
  --dsh-ban-toast-hover: rgba(255, 255, 255, 0.08);
  --dsh-ban-word: #faf9f5;
}

body[data-dsh-claude-style] .dsh-claude-ban *,
body[data-dsh-claude-style] .dsh-claude-ban *::before,
body[data-dsh-claude-style] .dsh-claude-ban *::after {
  box-sizing: border-box;
}

body[data-dsh-claude-style] .dsh-claude-ban svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---------- top bar: brand lockup, sign out, window controls ---------- */
/* The bar sits 30px down from the window edge: it reproduces the shipped app's
   own titlebar row, which the real Claude page keeps clear of. */
body[data-dsh-claude-style] .dsh-claude-ban-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 40px 8px 10px 44px;
}

body[data-dsh-claude-style] .dsh-claude-ban-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dsh-ban-word);
}

/* The page is Claude's own, so its lockup is the Claude one in every brand: the
   ember starburst beside the wordmark, both masked over the page's ink. */
body[data-dsh-claude-style] .dsh-claude-ban-mark {
  flex: none;
  width: 21px;
  height: 21px;
  background-color: var(--dsh-ban-mark);
  -webkit-mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
  mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
}

body[data-dsh-claude-style] .dsh-claude-ban-word {
  flex: none;
  width: 89px;
  height: 21px;
  background-color: var(--dsh-ban-word);
  -webkit-mask: var(--dsh-claude-image-claude-word) center / contain no-repeat;
  mask: var(--dsh-claude-image-claude-word) center / contain no-repeat;
}

body[data-dsh-claude-style] .dsh-claude-ban-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

body[data-dsh-claude-style] .dsh-claude-ban-signout {
  appearance: none;
  margin: 0;
  border: 1px solid var(--dsh-ban-hairline);
  border-radius: 8px;
  background: var(--dsh-ban-card);
  color: var(--dsh-ban-text);
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.05);
  transition: background-color 0.12s ease;
}

body[data-dsh-claude-style] .dsh-claude-ban-signout:hover {
  background: var(--dsh-ban-hover);
}

body[data-dsh-claude-style] .dsh-claude-ban-window {
  display: flex;
  align-items: center;
}

body[data-dsh-claude-style] .dsh-claude-ban-win {
  appearance: none;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--dsh-ban-muted);
  width: 34px;
  height: 28px;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s ease;
}

body[data-dsh-claude-style] .dsh-claude-ban-win:hover {
  background: var(--dsh-ban-hover);
  color: var(--dsh-ban-text);
}

/* ---------- Desktop caption strip: the bar rides the native titlebar row ---------- */
/* Both desktop platforms hand the top of the window to a NATIVE layer, and
   ban-screen.ts stamps data-dsh-ban-titlebar on the overlay once per open
   whenever the shared desktopBand() reports a strip, together with the strip's
   height (--dsh-ban-caption-height) and the width its window controls occupy
   (--dsh-ban-caption-controls) and the end those controls take
   (data-dsh-ban-controls). So the bar stops drawing its own three window buttons
   — the strip already shows a cluster — and moves its content up onto the strip,
   clear of that cluster: Windows draws its caption buttons at the RIGHT end and
   macOS draws its traffic lights at the LEFT, which is the one thing the two
   platforms lay out differently. The Windows shell paints its strip with the
   colour it measures off --dsw-specific-sidebar-fill, so the overlay lends it
   the page's canvas colour while it is open (holdCaptionFill), which is what
   lets the lockup and Sign out read as that row's own content the way Claude's
   titlebar carries them; macOS paints the strip as the vibrancy sidebar, which
   no token of ours reaches.
   The strip has to keep moving the window, so the bar claims the DRAG region for
   itself and only the one control inside it opts out: the overlay covers the
   host's own drag regions (the Windows frame's \`.frame::before\` strip, and on
   macOS the elements the host marks \`data-window-drag\`), and a drag region the
   pointer cannot reach is no region at all. */
body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar] .dsh-claude-ban-bar {
  height: var(--dsh-ban-caption-height, 40px) !important;
  padding: 0 calc(var(--dsh-ban-caption-controls, 140px) + 10px) 0 44px !important;
  -webkit-app-region: drag;
}

/* macOS: the traffic lights sit at the LEFT end of the strip, so the bar keeps
   its own leading inset clear of them and gives the trailing end back to the
   row. */
body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar][data-dsh-ban-controls="left"] .dsh-claude-ban-bar {
  padding: 0 10px 0 calc(var(--dsh-ban-caption-controls, 88px) + 10px) !important;
}

/* The lockup sits a touch below the row's midline: the wordmark's ink fills its
   whole 21px box, so centring it beside the platform's 10px-tall caption glyphs
   leaves it reading high. */
body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar] .dsh-claude-ban-brand {
  position: relative;
  top: 4px;
}

body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar] .dsh-claude-ban-signout {
  -webkit-app-region: no-drag;
}

body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar] .dsh-claude-ban-window {
  display: none !important;
}

body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar] .dsh-claude-ban-scroll {
  inset: calc(var(--dsh-ban-caption-height, 40px) + 6px) 0 0 0;
}

body[data-dsh-claude-style] .dsh-claude-ban[data-dsh-ban-titlebar] .dsh-claude-ban-toast {
  top: calc(var(--dsh-ban-caption-height, 40px) + 16px);
}

/* ---------- account_banned toast ---------- */
body[data-dsh-claude-style] .dsh-claude-ban-toast {
  position: absolute;
  top: 94px;
  right: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 340px;
  padding: 10px 12px;
  border: 1px solid var(--dsh-ban-toast-border);
  border-radius: 12px;
  background: var(--dsh-ban-toast-bg);
  color: var(--dsh-ban-toast-text);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(20, 20, 19, 0.08);
  animation: dsh-claude-ban-toast-in 0.22s ease both;
}

@keyframes dsh-claude-ban-toast-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
}

body[data-dsh-claude-style] .dsh-claude-ban-toast-icon {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--dsh-ban-toast-icon);
}

body[data-dsh-claude-style] .dsh-claude-ban-toast-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body[data-dsh-claude-style] .dsh-claude-ban-toast-close {
  flex: none;
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

body[data-dsh-claude-style] .dsh-claude-ban-toast:hover {
  border-color: var(--dsh-ban-toast-icon);
}

/* ---------- content column ---------- */
/* The page is one centred column: the card stack is the page's measure, so it
   is centred in the window rather than pinned to a left inset, and capped so it
   never stretches into a measure no one wants to read. */
body[data-dsh-claude-style] .dsh-claude-ban-scroll {
  position: absolute;
  inset: 86px 0 0 0;
  overflow-y: auto;
  overflow-x: hidden;
}

body[data-dsh-claude-style] .dsh-claude-ban-column {
  width: 63%;
  max-width: 1150px;
  margin: 0 auto;
  padding: 70px 40px 96px;
}

/* The icon box is the lock's size lever: the traced ink is 20 of the SVG's 24
   units, so 75px here paints a ~61px lock — the reference page's lock, which
   reads about a third larger than the 58px box did next to the same title. */
body[data-dsh-claude-style] .dsh-claude-ban-lock {
  display: block;
  width: 75px;
  height: 75px;
  color: var(--dsh-ban-text);
}

body[data-dsh-claude-style] .dsh-claude-ban-title {
  margin: 26px 0 0;
  font-family: var(--dsh-claude-font-serif);
  font-size: 31px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--dsh-ban-text);
}

body[data-dsh-claude-style] .dsh-claude-ban-lead {
  margin: 22px 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--dsh-ban-text);
}

body[data-dsh-claude-style] .dsh-claude-ban-lead strong {
  font-weight: 700;
}

body[data-dsh-claude-style] .dsh-claude-ban-next {
  margin: 32px 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--dsh-ban-text);
}

body[data-dsh-claude-style] .dsh-claude-ban-subtitle {
  margin: 44px 0 0;
  font-family: var(--dsw-font-family);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--dsh-ban-text);
}

/* ---------- cards: the numbered steps and the two account actions ---------- */
body[data-dsh-claude-style] .dsh-claude-ban-card {
  margin-top: 18px;
  border: 1px solid var(--dsh-ban-hairline);
  border-radius: 12px;
  background: var(--dsh-ban-card);
  overflow: hidden;
}

body[data-dsh-claude-style] .dsh-claude-ban-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 24px;
}

body[data-dsh-claude-style] .dsh-claude-ban-step-num {
  flex: none;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
  corner-shape: round;
  background: var(--dsh-ban-hover);
  color: var(--dsh-ban-text);
  font-size: 12px;
  line-height: 24px;
  text-align: center;
}

body[data-dsh-claude-style] .dsh-claude-ban-step-body {
  display: block;
  min-width: 0;
}

body[data-dsh-claude-style] .dsh-claude-ban-step-title {
  display: block;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsh-ban-text);
}

body[data-dsh-claude-style] .dsh-claude-ban-step-desc {
  display: block;
  margin-top: 2px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--dsh-ban-muted);
}

body[data-dsh-claude-style] .dsh-claude-ban-primary {
  appearance: none;
  display: inline-block;
  margin: 26px 0 0;
  border: 0;
  border-radius: 8px;
  background: var(--dsh-ban-primary-fill);
  color: var(--dsh-ban-primary-text);
  padding: 9px 18px;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

body[data-dsh-claude-style] .dsh-claude-ban-primary:hover {
  background: var(--dsh-ban-primary-hover);
}

body[data-dsh-claude-style] .dsh-claude-ban-actions {
  margin-top: 18px;
}

body[data-dsh-claude-style] .dsh-claude-ban-action {
  appearance: none;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 18px 24px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

body[data-dsh-claude-style] .dsh-claude-ban-action + .dsh-claude-ban-action {
  border-top: 1px solid var(--dsh-ban-hairline);
}

body[data-dsh-claude-style] .dsh-claude-ban-action:hover {
  background: var(--dsh-ban-hover);
}

body[data-dsh-claude-style] .dsh-claude-ban-action-icon {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  color: var(--dsh-ban-muted);
}

body[data-dsh-claude-style] .dsh-claude-ban-action-text {
  display: block;
  flex: 1;
  min-width: 0;
}

body[data-dsh-claude-style] .dsh-claude-ban-action-title {
  display: block;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsh-ban-text);
}

body[data-dsh-claude-style] .dsh-claude-ban-action-title-danger {
  color: var(--dsh-ban-danger);
}

body[data-dsh-claude-style] .dsh-claude-ban-action:hover .dsh-claude-ban-action-title-danger {
  color: var(--dsh-ban-danger-hover);
}

body[data-dsh-claude-style] .dsh-claude-ban-action-desc {
  display: block;
  margin-top: 3px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--dsh-ban-muted);
}

body[data-dsh-claude-style] .dsh-claude-ban-action-chevron {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 3px;
  color: var(--dsh-ban-muted);
}

/* Narrow windows: drop the fixed left inset so the column keeps its measure
   instead of being squeezed against the right edge. */
@media (max-width: 1000px) {
  body[data-dsh-claude-style] .dsh-claude-ban-column {
    width: auto;
    padding: 72px 32px 80px;
  }

  body[data-dsh-claude-style] .dsh-claude-ban-toast {
    right: 24px;
    max-width: calc(100% - 48px);
  }
}

/* ---------- Claude Code layout: model picker ---------- */
/* Replaces the host's two-pane model menu: level 1 carries the current
   provider's models, a divider, the effort row and a More models row; both
   rows open their level 2 beside this popover. The card is the shared popover
   card (shared/popover.css); what is the picker's own is below. */
body[data-dsh-claude-style] .dsh-claude-model-popover {
  position: fixed;
  min-width: 248px;
  max-width: min(360px, calc(100vw - 16px));
  /* The first level is sized by its content like the second: the cap is only
     the viewport, so a short list does not leave a tall empty card. The level-1
     list scrolls inside the body instead (see the scoped rule below); this
     overflow-y stays for the sub popover, whose whole card scrolls. */
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transform-origin: bottom right;
}
/* Level 1 splits into a scrollable list and a pinned footer: the model rows
   scroll under the divider / effort / more-models rows, which never leave the
   viewport edge of the card. Only the first level does this — the sub popover
   keeps scrolling as one card, with its provider labels pinned (below). */
body[data-dsh-claude-style] .dsh-claude-model-popover:not(.dsh-claude-model-popover-sub) {
  overflow: hidden;
}
body[data-dsh-claude-style] .dsh-claude-model-popover:not(.dsh-claude-model-popover-sub) .dsh-claude-popover-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
body[data-dsh-claude-style] .dsh-claude-model-footer {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
/* The sub popover is taller than the first level and sized by its content: the
   cap is only the viewport, so a short provider list does not leave a tall empty
   card. Provider labels stay pinned to the top while the list scrolls. */
body[data-dsh-claude-style] .dsh-claude-model-popover-sub {
  padding-top: 0;
}

body[data-dsh-claude-style] .dsh-claude-model-group-section {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  /* Level 2 rows sit close together: the 3px the body uses between sections
     read as a gap between models of the same provider. */
  gap: 1px !important;
  min-width: 0 !important;
}

body[data-dsh-claude-style] .dsh-claude-model-group-row {
  position: sticky !important;
  top: 0 !important;
  z-index: 6 !important;
  align-self: stretch !important;
  margin: 0 !important;
  padding: 3px 7px 0 7px !important;
  background: var(--dsw-alias-bg-overlay, #ffffff) !important;
}

body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-model-group-row {
  background: var(--dsh-claude-raised) !important;
}

body[data-dsh-claude-style] .dsh-claude-model-group {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  margin: 0 !important;
  padding: 1px 7px !important;
  background: var(--dsh-claude-inverse-fill) !important;
  color: var(--dsh-claude-inverse-ink) !important;
  border-radius: 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  line-height: 16px !important;
}

/* Model / effort option: same row metrics and hover as the drawer items. */
body[data-dsh-claude-style] .dsh-claude-model-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 2px 7px;
  border: none !important;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #141413);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
body[data-dsh-claude-style] .dsh-claude-model-option:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
body[data-dsh-claude-style] .dsh-claude-model-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
body[data-dsh-claude-style] .dsh-claude-model-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
}
/* Claude's wordmark is set in Anthropic's serif, so the rest of the label follows
   it — the row reads as one piece of lettering rather than serif art beside sans. */
body[data-dsh-claude-style] .dsh-claude-model-option[data-brand='claude'] .dsh-claude-model-name {
  font-family: var(--dsh-claude-font-brand) !important;
}
/* A vendor lockup: the mark and the vendor's own wordmark as one piece of art,
   drawn in place of the vendor's name in the label. Its viewBox is the wordmark's
   capital band, so the label's own cap height sizes it and the mark — which is
   taller — paints outside the box, which is what the visible overflow is for.
   Two mark layers ship inside the file: the colour artwork on the ivory canvas,
   the mono one in currentColor on the warm black canvas, where a brand colour
   like #000 or #F1F0E8 would disappear. A vendor with no colour artwork carries
   both classes on its single layer, so it shows on either canvas. */
body[data-dsh-claude-style] .dsh-claude-model-combine {
  display: inline-block !important;
  height: 0.72em !important;
  height: 1cap !important;
  margin-right: 0.25em !important;
  vertical-align: baseline !important;
}
body[data-dsh-claude-style] .dsh-claude-model-combine svg {
  display: block;
  height: 100%;
  width: auto;
  overflow: visible;
}
/* Dark canvas is the base: hide a *separate* colour layer. The \`:not()\` matters —
   a hand-provided lockup is one layer carrying both classes so it shows on either
   canvas, and a bare \`.dsh-combine-mark-color\` rule would hide it on the dark one
   (which is how the ChatGPT knot went missing on warm black). */
body[data-dsh-claude-style] .dsh-claude-model-combine .dsh-combine-mark-color:not(.dsh-combine-mark-mono) {
  display: none;
}
body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-model-combine .dsh-combine-mark-color {
  display: block;
}
body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-model-combine .dsh-combine-mark-mono:not(.dsh-combine-mark-color) {
  display: none;
}
/* The word the lockup stands in for stays in the accessibility tree. */
body[data-dsh-claude-style] .dsh-claude-model-combine-alt {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* The row carries one description line, in the shell's language: the copy
   document is localized rather than stacked, so there is no second-language
   rule to style. */
body[data-dsh-claude-style] .dsh-claude-model-desc {
  font-size: 11px;
  line-height: 14px;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
}
/* The picker's two hairlines share one declaration: the provider header's rule
   and the divider that closes the model list. Same colour, same thickness, same
   insets — the only difference left is that the header's line starts after the
   provider's name, which is the point of that row. */
body[data-dsh-claude-style] .dsh-claude-model-divider,
body[data-dsh-claude-style] .dsh-claude-model-rule::after {
  height: 1px !important;
  background: var(--dsw-alias-border-l1, #e8e6dc) !important;
}
body[data-dsh-claude-style] .dsh-claude-model-divider {
  margin: 2px 4px !important;
  flex: none !important;
}
/* The provider header: the name first, then the rule running to the right edge.
   The line is what is left of that row, not a separate full-width rule above it
   — one rule per provider boundary, and nothing more. An empty label leaves the
   bare rule, which is how a provider that needs no naming (the official source)
   is separated. */
body[data-dsh-claude-style] .dsh-claude-model-rule {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin: 2px 4px !important;
  flex: none !important;
}
body[data-dsh-claude-style] .dsh-claude-model-rule::after {
  content: "" !important;
  flex: 1 !important;
}
body[data-dsh-claude-style] .dsh-claude-model-rule-name {
  flex: none !important;
  font-size: 11px !important;
  line-height: 14px !important;
  color: var(--dsw-alias-label-caption, #a6a094) !important;
  letter-spacing: 0.02em !important;
}
/* Level-2 row: label + chevron; hover opens its own level. */
body[data-dsh-claude-style] .dsh-claude-model-cell {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
  min-height: 32px !important;
  padding: 2px 7px !important;
  border: none !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: var(--dsw-alias-label-primary, #141413) !important;
  font-size: 13px !important;
  text-align: left !important;
  cursor: pointer !important;
  box-sizing: border-box !important;
}
body[data-dsh-claude-style] .dsh-claude-model-cell:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
body[data-dsh-claude-style] .dsh-claude-model-cell-label {
  flex: 1 !important;
  min-width: 0 !important;
}
body[data-dsh-claude-style] .dsh-claude-model-cell-chevron {
  flex: none !important;
  display: inline-flex !important;
  align-items: center !important;
  color: var(--dsw-alias-label-caption, #a6a094) !important;
}

/* ---------- The effort card (its own popover) ---------- */
/* Same card language as the model picker — the two panels open over the same
   corner and must read as one design — sized to the slider, which is the only
   thing it holds. The card is the shared popover card (shared/popover.css). */
body[data-dsh-claude-style] .dsh-claude-effort-popover {
  position: fixed;
  min-width: 264px;
  max-width: min(320px, calc(100vw - 16px));
  transform-origin: bottom right;
}

/* ---------- Reasoning-effort slider (its own card) ---------- */
/* The effort ladder drawn as a track instead of a second level. The knob
   travels continuously with the pointer and settles on the nearest level when
   the gesture ends — release, or the pointer leaving the control — so the
   control never reads as a hard switch between fixed stops. The transition is
   what makes that settle read as a settle; it is switched off while the pointer
   owns the knob, which is what \`data-dragging\` marks. */
body[data-dsh-claude-style] .dsh-claude-effort {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 3px 7px 4px 7px;
  min-width: 0;
  user-select: none;
  -webkit-user-select: none;
}
body[data-dsh-claude-style] .dsh-claude-effort-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  /* The outgoing name is absolutely positioned over the incoming one. */
  position: relative;
}
/* The label recedes and the level's name carries the weight — Claude's own
   \`Effort High\` pairs a grey caption with a near-black value. */
body[data-dsh-claude-style] .dsh-claude-effort-label {
  flex: none;
  font-size: 13px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary, #6e6a60);
}
/* The level's name trails the label instead of sitting at the far edge: the
   control reads as one phrase, \`Reasoning effort High\`, the way the ends below
   read as one scale. A change is a SWAP, not a replacement: the incoming name
   rises out of a blur from below while the outgoing one (the ghost, absolutely
   positioned over this one) blurs away upward. Both animations are re-armed
   from the override on every real change. */
body[data-dsh-claude-style] .dsh-claude-effort-value {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 16px;
  color: var(--dsw-alias-label-primary, #141413);
  transition: color 0.18s ease;
  animation: dshClaudeEffortValueIn 0.28s ease;
}
/* The outgoing name. It sits exactly where the value sat (the override writes
   its left offset), takes no layout space, and ends at opacity 0 — so it never
   needs removing, only re-arming. */
body[data-dsh-claude-style] .dsh-claude-effort-value-ghost {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  pointer-events: none;
  font-size: 13px;
  line-height: 16px;
  color: var(--dsw-alias-label-primary, #141413);
  opacity: 0;
  animation: dshClaudeEffortValueOut 0.28s ease forwards;
}
@keyframes dshClaudeEffortValueIn {
  from { filter: blur(4px); opacity: 0; transform: translateY(5px); }
  to { filter: blur(0); opacity: 1; transform: translateY(0); }
}
@keyframes dshClaudeEffortValueOut {
  from { filter: blur(0); opacity: 1; transform: translateY(0); }
  to { filter: blur(4px); opacity: 0; transform: translateY(-5px); }
}
/* The ends name the axis: a scale, not a value, so they keep the caption colour
   and take their words from the copy table (更快 / 更强 in Chinese). */
body[data-dsh-claude-style] .dsh-claude-effort-ends {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  line-height: 14px;
  color: var(--dsw-alias-label-caption, #a6a094);
}
body[data-dsh-claude-style] .dsh-claude-effort-track {
  position: relative;
  /* The hit area is the knob's height; the groove itself sits centred in it. */
  height: 30px;
  margin-top: 1px;
  cursor: pointer;
  touch-action: none;
}
body[data-dsh-claude-style] .dsh-claude-effort-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  /* Claude's real Effort slider reads as one chunky groove the knob rides IN:
     the groove is 26px tall, the knob 30px — it pokes 2px out top and bottom.
     (The first pass at this control was 6px, a thin rail; 14px was an
     intermediate groove. 26px matches the reference.) */
  height: 26px;
  margin-top: -13px;
  /* A rounded rectangle, NOT a pill: the recorded slider's end is a ~1/3-height
     corner (the reference plugin solves the same 26px groove to 9px), so a
     999px radius rounded the ends far more than Claude's do. */
  border-radius: 8px;
  /* The page inherits superellipse corners from <html>; the groove keeps true
     circular corners. */
  corner-shape: round;
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.08));
}
/* The filled portion: from the track's left end to the knob's centre, where
   the opaque knob swallows it. Its colour IS the label ink at low alpha, so it
   darkens the light groove and lightens the dark one with a single rule. */
body[data-dsh-claude-style] .dsh-claude-effort-fill {
  position: absolute;
  left: 0;
  top: 50%;
  height: 26px;
  margin-top: -13px;
  /* No width here: the override drives it with an inline style, and any
     stylesheet width (even 0) would win through !important and pin the fill
     shut forever. Unset shrinks the absolute box to 0 until the first paint. */
  /* Square on the right: the fill ends at the knob's centre, and a rounded
     right cap curves away from the knob at the groove's top and bottom rows,
     which showed a sliver of bare track between them ("the fill let go of the
     knob"). The left cap still matches the groove's corner. */
  border-radius: 8px 0 0 8px;
  corner-shape: round;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 26%, transparent);
  transition: width 0.18s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.18s ease;
  pointer-events: none;
}
/* One tick per stop, centred on the stop's resting position (the override
   computes the px). Same ink as the fill: the fill swallows passed ticks, the
   knob swallows the current one, so a tick only ever shows on bare track. */
body[data-dsh-claude-style] .dsh-claude-effort-ticks {
  position: absolute;
  inset: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}
body[data-dsh-claude-style] .dsh-claude-effort-tick {
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  margin-top: -2px;
  transform: translateX(-50%);
  border-radius: 50%;
  corner-shape: round;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 26%, transparent);
}
/* The top rung's dot matrix: a grid of violet blocks floating on the bare track
   (the 1px gaps ARE the grid lines). Every block twinkles on its OWN hash-
   scattered phase, cycle length and tone — nothing is ordered, which is what
   makes it read as a field of particles. The plume shape (solid at the nozzle,
   dissolving into the track by the far left) is a static per-block opacity the
   colour flash rides through. The grid lives only while the apex is shown, so
   the cost stays bounded to that state. */
body[data-dsh-claude-style] .dsh-claude-effort-matrix {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 26px;
  margin-top: -13px;
  border-radius: 8px;
  corner-shape: round;
  overflow: hidden;
  box-sizing: border-box;
  /* display: none while the apex is off — the twinkle costs nothing until the
     top rung is actually reached. */
  display: none;
  pointer-events: none;
}
body[data-dsh-claude-style] .dsh-claude-effort[data-apex] .dsh-claude-effort-matrix {
  display: grid !important;
  grid-auto-flow: row !important;
}
/* No base opacity: an !important declaration would outrank the animation in
   the cascade and freeze the cell at 0. fill-mode both covers the pre-delay
   (from) and the rest (to), so the keyframes own the whole life cycle. */
body[data-dsh-claude-style] .dsh-claude-effort-matrix-cell {
  animation: dshClaudeEffortCellIn 0.15s ease both !important;
}
@keyframes dshClaudeEffortCellIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq {
  width: 100% !important;
  height: 100% !important;
  border-radius: 1px !important;
  /* NOT !important: the flash animates background-color, and no animation can
     outrank an !important declaration — the same cascade trap the cell's
     opacity fell into. Nothing in the host targets these private classes. */
  background-color: var(--dsh-claude-apex, #8b7ad0);
  /* The block's flash peak lives HERE, never inline: the override only picks a
     tone bucket (data-tone), so a stylesheet swap always re-colours every
     block. Inline rgb peaks did not — after the violet landed, blocks built by
     the previous clay bundle kept flashing orange from their stale inline
     values. Eight buckets ramp from 6% to 62% of the apex colour, so the
     plume's tail cools in small steps instead of four visible bands. */
  --dsh-flash-light: var(--dsh-claude-apex-flash, #d9d2f5);
  /* One flash cycle: hold violet 250ms, jump to the block's lighter peak 480ms,
     ease back over 720ms. var() in keyframes resolves against the animated
     block, so one keyframes rule serves every block's own peak colour. */
  animation: dshClaudeEffortFlash 1.45s infinite ease-in-out !important;
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="0"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 62%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="1"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 54%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="2"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 46%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="3"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 38%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="4"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 30%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="5"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 22%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="6"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 14%, var(--dsh-claude-apex-flash, #d9d2f5));
}
body[data-dsh-claude-style] .dsh-claude-effort-matrix-sq[data-tone="7"] {
  --dsh-flash-light: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 6%, var(--dsh-claude-apex-flash, #d9d2f5));
}
@keyframes dshClaudeEffortFlash {
  0%, 17.24% { background-color: var(--dsh-claude-apex, #8b7ad0); }
  17.25%, 50.34% { background-color: var(--dsh-flash-light, #d9d2f5); }
  100% { background-color: var(--dsh-claude-apex, #8b7ad0); }
}
/* Reaching the top rung: the plain fill and the ticks hand the groove over to
   the matrix, the knob takes a violet tint and a soft glow, and the level's
   name goes violet. */
body[data-dsh-claude-style] .dsh-claude-effort[data-apex] .dsh-claude-effort-fill {
  opacity: 0 !important;
}
body[data-dsh-claude-style] .dsh-claude-effort[data-apex] .dsh-claude-effort-ticks {
  opacity: 0 !important;
}
body[data-dsh-claude-style] .dsh-claude-effort[data-apex] .dsh-claude-effort-knob {
  background: color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 22%, var(--dsw-static-neutral-bluish-00, #ffffff)) !important;
  box-shadow: 0 0 10px color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 80%, transparent), 0 0 0 1px color-mix(in srgb, var(--dsh-claude-apex, #8b7ad0) 35%, transparent) !important;
}
body[data-dsh-claude-style] .dsh-claude-effort[data-apex] .dsh-claude-effort-value {
  color: var(--dsh-claude-apex-ink, #5f51b5) !important;
}
/* A vertical capsule, not a bead: 16px wide, 30px tall, poking 2px past the
   groove top and bottom. The width stays 16px, which the override's travel
   geometry (and the fill's +8) depends on. */
body[data-dsh-claude-style] .dsh-claude-effort-knob {
  position: absolute;
  left: 0;
  top: 50%;
  width: 16px;
  height: 30px;
  margin-top: -15px;
  /* A rounded rectangle with a flat run down each side, not a capsule: the
     recorded knob has a visibly straight edge between two ~1/3 corners. */
  border-radius: 5px;
  corner-shape: round;
  /* Pinned to the host's static white in BOTH appearances: the knob is the one
     light pebble in the groove, and a dark knob drowned in the dark groove. */
  background: var(--dsw-static-neutral-bluish-00, #ffffff);
  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.28), 0 0 0 1px rgba(20, 20, 19, 0.06);
  /* The lift is the \`scale\` property and the travel is the \`translate\`
     property — both INDIVIDUAL transform properties, which compose in the order
     translate → scale. That order is the whole point: positioning with
     \`transform\` while lifting with \`scale\` multiplies the travel by the lift
     (the composed matrix is scale · translate), so a 1.1 lift at the last stop
     put the knob 10% of the travel PAST the track's end and, mid-drag, ahead of
     the fill. The explicit 1 also gives the release a numeric target to ease
     back to (an unset value is \`none\`, which does not interpolate). */
  scale: 1;
  transition: translate 0.18s cubic-bezier(0.22, 0.61, 0.36, 1), scale 0.12s ease, background-color 0.3s ease, box-shadow 0.3s ease;
  will-change: translate, scale;
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-effort-knob {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.4);
}
body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-effort[data-apex] .dsh-claude-effort-knob {
  box-shadow: 0 0 10px color-mix(in srgb, var(--dsh-claude-apex, #9d8ce0) 80%, transparent), 0 0 0 1px color-mix(in srgb, var(--dsh-claude-apex, #9d8ce0) 35%, transparent) !important;
}
/* Held: the knob lifts 10%. Only \`transform\` stays un-transitioned (the drag
   writes it every frame); the lift itself eases in and, on release, eases back
   — so grabbing and letting go read as motion rather than a size jump. */
body[data-dsh-claude-style] .dsh-claude-effort[data-dragging] .dsh-claude-effort-knob {
  scale: 1.1 !important;
  /* \`translate\` is dropped from the transition (the drag writes it every
     frame); the lift itself still eases in and back out. */
  transition: scale 0.12s ease, background-color 0.3s ease, box-shadow 0.3s ease !important;
}
body[data-dsh-claude-style] .dsh-claude-effort[data-dragging] .dsh-claude-effort-fill {
  transition: none !important;
}
body[data-dsh-claude-style] .dsh-claude-effort-track:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #d97757) !important;
  outline-offset: 1px !important;
  border-radius: 10px !important;
}
/* No ladder to climb: the track is dimmed and the value reads as a dash, but the
   knob still travels and eases home — the control keeps its shape. */
body[data-dsh-claude-style] .dsh-claude-effort[data-empty] .dsh-claude-effort-track::before {
  opacity: 0.55 !important;
}
body[data-dsh-claude-style] .dsh-claude-effort[data-empty] .dsh-claude-effort-value {
  color: var(--dsw-alias-label-caption, #a6a094) !important;
}

/* ---------- reasoning-effort trigger ---------- */
/* Body-mounted (the seat slot is React-managed and crashed on a foreign node),
   pinned beside the model trigger by measurement — every pass, and in the same
   frame as a resize / scroll / card-resize through the handle's reposition(). */
body[data-dsh-claude-style] .dsh-claude-effort-btn {
  position: fixed;
  display: inline-flex;
  align-items: center;
  height: 28px;
  /* The row's rhythm: 2px here plus the model trigger's 8px right padding and
     the 2px the JS sits past its box land the two texts 12px apart — the
     trailing cluster's own flex gap. */
  padding: 0 2px;
  border: none !important;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6e6a60);
  /* One set of metrics with the model trigger beside it: the row reads as one
     line, so the two labels must not differ in line box or tracking. */
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: normal;
  white-space: nowrap;
  cursor: pointer;
  /* Above the composer's own layers. The seat (the input area's container) is
     the host's stacking context at z-index 9, so the card and its controls all
     paint above anything lower — the trigger read as missing while it sat at 4
     under the opaque card. Page-level surfaces sit at 1000 and above, and the
     trigger goes with the seat when the composer does. */
  z-index: 10;
  transition: background-color 0.12s ease, color 0.12s ease;
}
body[data-dsh-claude-style] .dsh-claude-effort-btn:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-primary, #141413);
}

/* @composer-gate */
/* ---------- Host menu primitive: the hero row's pickers ---------- */
/* The workspace (directory) chip and the agent-preset seat open the host's
   shared Menu primitive, which portals its card to <body>. The card carries no
   marker of its own, so packages/client/src/features/hero-menu/hero-menu.ts stamps the one that belongs
   to this row with HERO_MENU_ATTR and these rules reach it alone — the host's
   other menus keep their own design. The metrics are the skin's popover
   language, the same card / rows / hover plate / accent check as
   features/model/model-picker.css and features/permissions/permissions.css. */

/* Two class-name families meet here. The host's client-ui packages hash as
   \`<hash>_<local>\`, so their fragments read \`_itemName\` / \`_itemDesc\`; the
   shared menu ships inside the web shell and hashes as \`_<local>_<hash>_<n>\`,
   so its fragments read \`_itemWrap_\` / \`_itemLabel_\`. Both are the longest
   stable piece of the class — never the bare local name. */

body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] {
  min-width: 248px;
  max-width: min(360px, calc(100vw - 16px));
  max-height: min(440px, calc(100vh - 96px));
  /* The host re-places this card from its own geometry on every frame while it
     is open, writing plain inline \`left\` / \`top\`; an inline write from the
     browser half would survive only until that frame. The position travels in
     two custom properties instead — the host's style writes never touch them —
     and these \`!important\` declarations outrank its inline value, so the card
     holds the position the stamping pass gave it. */
  left: var(--dsh-claude-hero-menu-x, 0px) !important;
  top: var(--dsh-claude-hero-menu-y, 0px) !important;
  padding: 6px;
  gap: 6px;
  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 8px 30px rgba(20, 20, 19, 0.12), 0 2px 8px rgba(20, 20, 19, 0.06);
  z-index: 99999;
  font-family: var(--dsw-font-family);
  /* The host mounts the card instead of toggling a \`data-open\` attribute, so
     the skin's open transition becomes a one-shot animation with the same
     values. Its origin is the corner nearest the trigger: the card opens above
     the trigger's right edge, as the skin's composer pickers do. */
  transform-origin: bottom right;
  animation: dsh-claude-hero-menu-in 0.15s ease;
}
@keyframes dsh-claude-hero-menu-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
body[data-dsh-claude-style][data-dsh-claude-composer-active][data-ds-dark-theme] [data-dsh-claude-hero-menu] {
  background: var(--dsh-claude-raised) !important;
  border-color: var(--dsw-alias-border-l2) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

/* One row height, one radius, one hover plate for both pickers. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemWrap_"] > [role="menuitem"] {
  min-height: 32px;
  padding: 2px 7px;
  gap: 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary, #141413);
  transition: background-color 0.12s ease;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemWrap_"] > [role="menuitem"]:hover:not(:disabled) {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemWrap_"] > [role="menuitem"]:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemIcon_"] {
  width: 16px;
  height: 16px;
  color: var(--dsw-alias-label-secondary, #787672);
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemIcon_"] svg {
  width: 16px;
  height: 16px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemLabel_"] {
  font-size: 13px;
  line-height: 20px;
}
/* The current row is marked by the accent, as in the model picker. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_check_"] {
  flex: none;
  color: var(--dsw-alias-brand-primary, #d97757);
}

/* The preset rows are two lines (name + description), so the height above is a
   floor rather than a cap. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemName"] {
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_itemDesc"] {
  font-size: 11px;
  line-height: 14px;
  color: var(--dsw-alias-label-tertiary, #8f8d84);
}

/* Heading and separator rows. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] > [class*="_viewport_"] > [role="presentation"] {
  padding: 6px 7px 2px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  line-height: 16px !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  color: var(--dsw-alias-label-tertiary, #8f8d84) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [role="separator"] {
  height: 1px !important;
  margin: 2px 4px !important;
  background: var(--dsw-alias-border-l1, #e8e6dc) !important;
}

/* The pinned footer ("添加工作区…") keeps the host's spacing with the skin's
   hairline. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] > [class*="_footer_"] {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--dsw-alias-border-l1, #e8e6dc);
}

/* The workspace picker is Claude Code's folder menu: a narrow card of plain
   text rows. Every row names a folder, so the folder glyph in front of each
   one repeats what the list already says and is dropped, the add row's \`＋\`
   with it; the rows sit closer together than the preset card's two-line rows
   need to. The current folder keeps the accent check. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu="workspace"] {
  min-width: 180px;
  max-width: min(280px, calc(100vw - 16px));
  padding: 4px;
  gap: 4px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu="workspace"] [class*="_itemWrap_"] > [role="menuitem"] {
  min-height: 26px;
  padding: 3px 10px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu="workspace"] [class*="_itemIcon_"] {
  display: none;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu="workspace"] [class*="_check_"] {
  width: 14px;
  height: 14px;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu="workspace"] > [class*="_footer_"] {
  margin-top: 0;
  padding-top: 4px;
}

/* The card's padding is the skin's 6px rather than the host's 4px, so a side
   card moves with it: 6px pad + 6px gap. */
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_submenu_"] {
  bottom: -6px !important;
  left: calc(100% + 12px) !important;
}
body[data-dsh-claude-style][data-dsh-claude-composer-active] [data-dsh-claude-hero-menu] [class*="_submenu_"]::before {
  left: -12px !important;
  width: 12px !important;
}

/* ---------- Footer takeover ----------
   Everything in this block modifies the HOST's own footer (it hides entries and
   zeroes the containers that host them) and exists only because the skin
   replaces that footer with its account row. The "Collapse the sidebar settings
   area" preference turns the whole takeover off, so each rule below carries
   data-dsh-claude-footer-takeover — the skin sets it on <body> only while the takeover is on,
   and with it absent the host footer renders exactly as shipped. */
/* Hide the controls beside the account row while keeping containers intact for
   modals. The trigger row is not settingsArea's child: it renders inside the
   \`sidebar.settings\` slot anchor (a display:contents div), which the child
   selector alone never crossed. The host's own account row is the skin's entry
   where it exists (features/account/account-footer.ts marks it), so the row itself
   stays and only the controls next to it — the connection pill, the update pill
   ("Retry update") — go. The account menu and its sign-in dialog are portals and
   the settings panel is the row's sibling, so all three still open. */
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] > [class*="footerActions"] :is([class*="footerButtons"], > button) {
  display: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] [class*="triggerRow"] :is(button, [role="button"], a):not([data-dsh-claude-account-host-row]) {
  display: none;
}
/* Both containers stay mounted at zero size so the overlays they host keep
   painting, but the collapse must stay geometric. font-size and line-height
   inherit, and the settings dialog mounts IN PLACE inside settingsArea (the
   host renders its overlay as a sibling of the trigger row — no portal): the
   dialog inherited font-size: 0 with line-height: 0px, so every text line
   that sets an explicit font-size without its own line-height (the SubAgent
   page's rows, the onboarding overlay) collapsed to a 0px line box and
   vanished. settingsArea hosts nothing besides its display:none'd trigger row
   and those in-place overlays, so it keeps only the geometric collapse and
   hands real inherited metrics down; footerActions still hosts plain plugin
   entries whose stray in-flow text only the zeroing keeps invisible, so the
   full collapse stays there. */
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] > [class*="settingsArea"] {
  position: static;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  overflow: visible;
}
/* A settingsArea that holds the host's account row gets its box back: that row
   has to paint in the footer, not inside a zero-sized cell. Everything else
   keeps the geometric collapse. */
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] > [class*="settingsArea"]:has([data-dsh-claude-account-host-row]) {
  width: 100% !important;
  height: auto !important;
}
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] > [class*="footerActions"] {
  position: static;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  line-height: 0;
  font-size: 0;
  overflow: visible;
}

/* Generic footer-action redirection. The \`sidebar.footer.action\` slot accepts
   arbitrary plugin controls, not just buttons; overrides.js marks every
   mirrored entry (\`data-dsh-claude-footer-entry\`) and hides it in place
   (\`data-dsh-claude-footer-hidden\`) once it is redirected into the account
   popover. Entries that host a floating overlay (a fixed panel or dialog)
   keep their subtree visible — the overlay must stay reachable after the
   mirrored popover item opens it — but the entry box itself collapses so it
   never paints inside the zero-sized footerActions container. */
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] [data-dsh-claude-footer-hidden] {
  display: none !important;
}
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="footArea"] [data-dsh-claude-footer-entry] {
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
}

/* Collapsed rail mode adaptations */
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] .dsh-claude-account-btn {
  width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  justify-content: center !important;
}
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] .dsh-claude-account-avatar {
  margin-right: 0 !important;
}
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] :is(.dsh-claude-account-label, .dsh-claude-account-chevron) {
  display: none !important;
}
/* The rail's popover cannot stay an absolutely positioned child of the footer.
   The sidebar column is 56px wide with \`overflow: hidden\`, so a panel anchored
   past the rail edge is cut off the moment it crosses it — and the base rule's
   percentage max-width, measured against the 59px footer, squashed it to 43px.
   Fixed positioning lifts it out of that clip (no ancestor is a containing block
   for it), and overrides.js anchors it to the trigger from there. left/right/
   bottom are reset so the base rule's own \`!important\` anchors cannot fight the
   resolved coordinates. */
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] .dsh-claude-account-popover {
  position: fixed !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  top: auto !important;
  width: 220px !important;
  max-width: min(220px, calc(100vw - 16px)) !important;
  transform-origin: bottom left !important;
}
/* The host's own account menu in the rail: the card's width follows the account
   row, which is a 36px icon there, so the measured width would leave a 36px
   card. The drawer's rail width above is the floor for both. */
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] [data-dsh-claude-account-menu] {
  width: 220px !important;
  max-width: min(220px, calc(100vw - 16px)) !important;
}
/* The rail opens the panel beside the trigger, not above it, so the hover bridge
   has to span the horizontal gap: the base rule's downward strip would sit under
   the panel and leave the pointer's 8px crossing uncovered. */
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] .dsh-claude-account-popover::after {
  top: 0 !important;
  bottom: 0 !important;
  left: auto !important;
  right: 100% !important;
  width: 12px !important;
  height: auto !important;
}
/* In the rail the account button is the only control; the settings entry lives
   in the popover. The settings container is zero-sized rather than hidden (its
   dialog must stay reachable), which is enough while the sidebar is wide — the
   entry is squeezed to a 4px sliver. A plugin that ships its own rail variant
   escapes that box instead: the settings plugin's \`…_rail\` trigger keeps its
   full 36px square and lands straight on top of the Claude mark. Hide the entry
   in the rail. Reachability is unaffected — the popover's settings item opens
   the real trigger programmatically (\`realTrigger.click()\`), which
   display:none does not block. */
body[data-dsh-claude-style][data-dsh-claude-footer-takeover] [class*="_root"][class*="_collapsed"] [class*="footArea"] [class*="settingsArea"] :is(button, [class*="triggerRow"]):not([data-dsh-claude-account-host-row]):not(:has([data-dsh-claude-account-host-row])) {
  display: none !important;
}
/* The rail's host account row is a 36px square with neither label nor chevron,
   matching the self-built trigger's rail shape. */
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] [data-dsh-claude-account-host-row] {
  width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  justify-content: center !important;
  font-size: 0 !important;
}
body[data-dsh-claude-style] [class*="_root"][class*="_collapsed"] [data-dsh-claude-account-host-row]::after {
  display: none !important;
}

/* Embedded footer widgets: display-only plugin entries (progress bars,
   status panels — the cost-meter balance/quota stack is the known case)
   cannot collapse into a text menu item, so overrides.js embeds a live clone
   of the entry into the popover. The embed sits above the action items with
   a hairline separator; the cloned plugin markup keeps its own classes, so
   the plugin's own stylesheet styles the content. */
body[data-dsh-claude-style] .dsh-claude-popover-embed {
  padding: 2px 2px 6px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #2e2c29);
  border-radius: 7px;
}

body[data-dsh-claude-style] .dsh-claude-popover-embed[data-clickable] {
  cursor: pointer;
}

body[data-dsh-claude-style] .dsh-claude-popover-embed[data-clickable]:hover {
  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-popover-embed {
  border-bottom-color: var(--dsw-alias-border-l1);
}

/* ---------- Third-party repair: dsh-agy-link run_code fallback card ---------- */
/* The agy-link bridge replaces the host run_code tool card with its own keyed
   toolview; its non-mirror fallback ships an unstyled header (two bare spans,
   not even a gap) and a bare pre. Give the header the tool-row rhythm, the
   tool name the skin's technical-meta mono voice (overriding the editorial
   serif the \`[class*="title"]\` rule lends it), the variant label a real
   pill, and the code preview card padding. */
body[data-dsh-claude-style] .agy-tv-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}
body[data-dsh-claude-style] .agy-tv-title {
  font-family: var(--dsh-claude-font-code);
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0;
  line-height: 24px;
  color: var(--dsw-alias-label-secondary);
}
body[data-dsh-claude-style] .agy-tv-badge {
  font-family: var(--dsh-claude-font-code);
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 9999px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary);
}
body[data-dsh-claude-style] .agy-tv-pre {
  padding: 10px 12px;
  overflow-x: auto;
}

/* ---------- Third-party repair: dsh-better-sidebar's split dock ---------- */
/* A split dock puts two panes side by side, each carried as the skin's own card
   (theme/chrome.css). Between them the dock draws a hairline of its own — the
   strip it also uses as the drag target — and with the two cards around it the
   middle reads as one divider through the split. The cards stay two: each keeps
   its own hairline, radius and elevation, and only the dock's resting line goes
   (its hover and drag glow is a separate layer and stays, so the seam is still
   where the split is resized). The two come in toward each other and toward the
   column's edges, which leaves the same 6px seam between them as at the sides.
   The columns are numbered by position and the wrapper exists only while the
   dock is split, so column 0 is the left pane and column 1 the right one
   whichever way round they were opened. */
body[data-dsh-claude-style] [class*="_rightbarCol"] [data-dockkit-split] > [data-dockkit-column] > [data-dockkit-pane] {
  margin: 6px !important;
}
body[data-dsh-claude-style] [class*="_rightbarCol"] [data-dockkit-split] > [data-dockkit-column="0"] > [data-dockkit-pane] {
  margin-right: 3px !important;
}
body[data-dsh-claude-style] [class*="_rightbarCol"] [data-dockkit-split] > [data-dockkit-column="1"] > [data-dockkit-pane] {
  margin-left: 3px !important;
}
body[data-dsh-claude-style] [class*="_rightbarCol"] [data-dockkit-split] > [class*="_divider_"]::before {
  background: transparent !important;
}

/* ---------- Settings dialog: modal panel background ---------- */
/* In light mode, the host dialog defaults to var(--dsw-alias-bg-layer-2);
   align the dialog card with the main canvas (#fcfcfb). */
body[data-dsh-claude-style]:not([data-ds-dark-theme]) :is([class*="settingsArea"] [class*="_panel"], [class*="settingsArea"] [role="dialog"], [class*="_overlay"] > [class*="_panel"]) {
  background: var(--dsw-alias-bg-base) !important;
}

/* ---------- Settings dialog: Claude Style tab icon ---------- */
/* Replace the host's default settings gear icon on the Claude Style nav tab
   with the monochrome Claude starburst icon (black in light mode). */
body[data-dsh-claude-style] button[data-dsh-section="claude-style"] [class*="_navIcon"] {
  display: none !important;
}

body[data-dsh-claude-style] button[data-dsh-section="claude-style"]::before {
  content: "";
  display: block;
  flex: none;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
  mask: var(--dsh-claude-image-claude-mark) center / contain no-repeat;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[data-dsh-section="claude-style"]::before {
  background-color: #141413;
}

/* ---------- Claude Code layout: settings page ---------- */
/* The skin's own page in the settings dialog and on the plugin page. Its
   segmented controls reuse the composer permission picker's classes
   (\`.dsh-claude-segments\` / \`.dsh-claude-segment\`), so the two are literally one
   control rather than two lookalikes; the switch and the brand cards are new
   here. The rows follow the host's own settings rows (ui-chat's PreferenceRow):
   full width, 16px above and below, a hairline between two rows.
   No side padding of its own: the host's options column already carries 24px
   (\`.options { padding: 0 24px 24px }\`), and a second inset here set the skin's
   rows 24px inside every other page's. The 16px on top is the host's own row
   padding, so the page's heading lands where their first row's text does. */
body[data-dsh-claude-style] .dsh-claude-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0 0;
  box-sizing: border-box;
  font-family: var(--dsw-font-family);
}

body[data-dsh-claude-style] .dsh-claude-settings-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

/* The tab strip is the segmented control itself, stretched across the page so
   every tab gets an equal share; the open tab's rows follow in their own
   column. */
body[data-dsh-claude-style] .dsh-claude-settings-tabs {
  display: flex;
  align-self: stretch;
}

body[data-dsh-claude-style] .dsh-claude-settings-tabs > [role="tab"] {
  flex: 1 1 0;
  min-width: 0;
}

body[data-dsh-claude-style] .dsh-claude-settings-rows {
  display: flex;
  flex-direction: column;
}

body[data-dsh-claude-style] .dsh-claude-settings-rows > :first-child {
  border-top: none;
}

/* A sub-row belongs to the row above it: no hairline between the two and no
   air above it, so they read as one group, and it greys out while its parent
   is off (its control is disabled as well, so the keyboard skips it). */
body[data-dsh-claude-style] .dsh-claude-settings-row.dsh-claude-settings-row-sub {
  border-top: none;
  padding-top: 0;
}

/* The host's scroller around the page (the settings dialog's options column,
   the plugin page) always keeps the scrollbar's room: a tab short enough to
   need no scrollbar then lays out at the same width as one that does. The
   page marks its nearest scrolling ancestor while it is mounted (settings.ts). */
body[data-dsh-claude-style] [data-dsh-claude-settings-scroller] {
  scrollbar-gutter: stable;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-sub[data-disabled] {
  opacity: .5;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-sub[data-disabled] :is(button, input) {
  cursor: not-allowed;
}

body[data-dsh-claude-style] .dsh-claude-settings-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}

/* A row whose control is a segmented control (the row builder marks it) keeps it
   on the right while the two share one line, and hands it the next line — where
   it starts at the row's left edge, as it always did — only when it no longer
   fits beside the text. The text's basis is the whole decision: the control is
   \`flex: none\`, so the row wraps exactly when the text's room would fall under
   this. */
body[data-dsh-claude-style] .dsh-claude-settings-row-segment {
  flex-wrap: wrap;
  gap: 12px 8px;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-segment > .dsh-claude-settings-row-text {
  flex: 1 1 220px;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 48px;
}

/* A block row stacks its control under the text — the brand picker's cards
   and the four-way mascot choice need more room than an inline control slot
   gives. A control keeps its own width; only the brand cards span the row. */
body[data-dsh-claude-style] .dsh-claude-settings-row-block {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-block > .dsh-claude-settings-row-text {
  align-self: stretch;
  padding-right: 0;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-block > .dsh-claude-brand-picker {
  align-self: stretch;
}

/* The brand picker: one card per brand, the brand's mark above its name. The
   marks are the same assets the sidebar and hero paint — Claude's clay
   starburst, DeepSeek's whale in brand blue — inlined as CSS data URIs, so
   they read in full colour on either theme. A new brand adds one option in
   settings.ts and one [data-brand] rule here. */
body[data-dsh-claude-style] .dsh-claude-brand-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}

body[data-dsh-claude-style] .dsh-claude-brand-card {
  appearance: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 10px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  cursor: pointer;
  transition: border-color .12s ease;
}

body[data-dsh-claude-style] .dsh-claude-brand-card:hover {
  border-color: var(--dsw-alias-border-l2);
}

body[data-dsh-claude-style] .dsh-claude-brand-card:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #d97757);
  outline-offset: 1px;
}

body[data-dsh-claude-style] .dsh-claude-brand-card[data-active] {
  border-color: var(--dsw-alias-brand-primary, #d97757);
}

body[data-dsh-claude-style] .dsh-claude-brand-card-logo {
  width: 32px;
  height: 32px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

body[data-dsh-claude-style] .dsh-claude-brand-card-logo[data-brand="claude"] {
  background-image: var(--dsh-claude-image-claude-mark-clay);
}

body[data-dsh-claude-style] .dsh-claude-brand-card-logo[data-brand="deepseek"] {
  background-image: var(--dsh-claude-image-deepseek-mark);
}

body[data-dsh-claude-style] .dsh-claude-brand-card-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

/* The row title is UI text in the host's row metrics: the sans face, not the
   serif display face theme/typography.css gives every class naming a title. */
body[data-dsh-claude-style] .dsh-claude-settings-row-title {
  font-family: var(--dsw-font-family);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}

body[data-dsh-claude-style] .dsh-claude-settings-row-desc {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

/* A row whose behaviour another plugin owns right now: the control refuses input
   and dims, while the row's own copy stays readable and a line in the accent
   colour says who owns it. The reader's stored answer is what the control shows,
   so it already tells what will happen once that plugin goes away. */
body[data-dsh-claude-style] .dsh-claude-settings-row button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

body[data-dsh-claude-style] .dsh-claude-settings-row-managed {
  display: block;
  margin-top: 2px;
  color: var(--dsw-alias-state-business-primary);
}

body[data-dsh-claude-style] .dsh-claude-settings-error {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary, #c0392b);
}

/* The switch borrows the segment track's palette and radius so a page of rows
   reads as one control set rather than two. */
body[data-dsh-claude-style] .dsh-claude-settings-switch {
  flex: none;
  appearance: none;
  margin: 0;
  border: 0;
  cursor: pointer;
  width: 36px;
  height: 20px;
  padding: 2px;
  box-sizing: border-box;
  border-radius: 10px;
  background: var(--dsw-specific-selector);
  transition: background-color .12s ease;
}

body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-settings-switch {
  background: var(--dsh-claude-chip);
}

body[data-dsh-claude-style] .dsh-claude-settings-switch[data-on] {
  background: var(--dsw-alias-brand-primary, #d97757);
}

body[data-dsh-claude-style] .dsh-claude-settings-switch-knob {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  /* A true circle: the page inherits superellipse corners from <html>. */
  corner-shape: round;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.18);
  transition: transform .12s ease;
}

body[data-dsh-claude-style] .dsh-claude-settings-switch[data-on] .dsh-claude-settings-switch-knob {
  transform: translateX(16px);
}

/* Custom username input: same row rhythm as the switch/segments, but wide
   enough to read a name and narrow enough not to push the description. */
body[data-dsh-claude-style] .dsh-claude-settings-input {
  flex: none;
  width: 180px;
  max-width: 45%;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  padding: 6px 10px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  outline: none;
}

body[data-dsh-claude-style] .dsh-claude-settings-input:focus {
  border-color: var(--dsw-alias-brand-primary, #d97757);
}

body[data-dsh-claude-style] .dsh-claude-settings-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

/* The quick-provider trigger belongs to the same control family as the username
   input: one bordered plate that opens a picker. Its card is the shared popover
   card (features/permissions/permissions.css), so only the trigger is styled here. */
body[data-dsh-claude-style] .dsh-claude-settings-picker {
  flex: none;
  min-width: 140px;
  max-width: 45%;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  padding: 6px 10px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;
}
body[data-dsh-claude-style] .dsh-claude-settings-picker:hover {
  border-color: var(--dsw-alias-border-l2);
}
body[data-dsh-claude-style] .dsh-claude-settings-picker[aria-expanded="true"] {
  border-color: var(--dsw-alias-brand-primary, #d97757);
}

/* The quick-provider picker's card (packages/client/src/features/settings/quick-providers.ts):
   the shared popover card, anchored above the trigger and right-aligned with it
   (positionAnchoredPopover), so it grows from the corner nearest the trigger —
   the bottom right, as the model picker's card does. */
body[data-dsh-claude-style] .dsh-claude-quick-popover {
  position: fixed !important;
  min-width: 248px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  transform-origin: bottom right !important;
}

/* ---------- home layout: the studio (dashboard) form and its usage panel ---------- */
/* The hero's own markup is the host's either way; this file only rearranges it and
   draws the panel the dock slot carries. Both are keyed on the attributes
   packages/client/src/features/home/home-layout.ts writes — the layout, and \`data-dsh-claude-home-hero\`
   while the studio layout owns the new-conversation page — so the classic
   layout is untouched.
   The two tab bodies live in home-overview.css and home-models.css. */

/* The scroll body centres the hero stack; the studio form starts at the top and
   lets the seat take the rest of the column, so the card lands on the bottom edge. */
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_scrollBody"] {
  justify-content: flex-start;
}

body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_composerSeat"] {
  flex: 1 1 auto;
  min-height: 0;
}

/* The stack becomes the column: greeting, panel, context row, card. Its own
   32px foot is the hero's centred-box treatment; the studio form drops the foot
   and fills the seat, so the context row and the card rest on the bottom edge.
   The composer keeps the 720px column, while the greeting and the dashboard
   card read as a 480px block against its left edge. */
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_composerStack"][class*="_composerHero"] {
  /* The conversation form's own rule pins this stack to its content height; the
     studio column has to fill the seat for the card to reach the bottom edge.
     Naming the stack by both its classes matches that gated rule's weight, and
     this sheet comes after it, so the studio column wins. */
  flex: 1 1 auto;
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  height: auto;
  min-height: 0;
  margin-inline: auto;
  gap: 10px;
  padding-bottom: 16px;
}

/* Order is written on the boxes the host's \`display: contents\` slot anchors
   expose, because an anchor with \`display: contents\` generates no box to sort. */
body[data-dsh-claude-style][data-dsh-claude-home-layout="studio"] [class*="_composerHero"] > :has([class*="_headline"]) {
  order: 0;
  height: auto;
  justify-content: flex-start;
  /* The greeting's left edge lands on the panel's and the card's. */
  padding: 14px var(--dsh-composer-side-clearance, 0px) 0;
  margin-bottom: 30px;
}

/* The skin's own seat on the cold start screen, where the host renders no dock
   (packages/client/src/features/home/home-layout.ts); like the host's anchor it generates no box. */
body[data-dsh-claude-style] .dsh-claude-home-seat {
  display: contents;
}

body[data-dsh-claude-style][data-dsh-claude-home-layout="studio"] [class*="_composerHero"] > :is([data-slot="conversation.input.dock"], .dsh-claude-home-seat) > * {
  order: 1;
  /* A window too short for the whole panel shrinks the panel instead of the
     page: the greeting stays on the top edge, the context row and the card on
     the bottom, and the panel scrolls inside the room between them. */
  flex: 0 1 auto;
  min-height: 0;
  /* The panel is the narrow dashboard card, left-aligned on the composer's own
     left edge; the free width to its right stays empty. The width is stated
     rather than left to the content, so the head's copy length cannot resize the
     card. */
  width: 480px;
  max-width: calc(100% - var(--dsh-composer-side-clearance, 0px));
  margin-right: auto;
}

body[data-dsh-claude-style][data-dsh-claude-home-layout="studio"] [class*="_composerHero"] > [class*="_heroWorkspaceRow"] {
  order: 2;
  /* Everything below the panel drops to the bottom edge: the auto margin eats
     the free column and carries the context row and the card down with it. */
  margin-top: auto;
  gap: 8px;
}

/* The context row's triggers wear Claude's chip: a hairline box on the canvas
   rather than a bare label. The target list is the composer card's own for these
   triggers, so the chip carries the same weight and, coming later, wins. */
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_heroWorkspaceRow"] :is(button, [role="button"]) {
  box-sizing: border-box;
  height: 28px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 12%, transparent);
  border-radius: 8px;
  background: transparent;
}

body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_heroWorkspaceRow"] :is(button, [role="button"]):hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 5%, transparent);
}

body[data-dsh-claude-style][data-dsh-claude-home-layout="studio"] [class*="_composerHero"] > [data-slot="conversation.composer.bar"] > * {
  order: 3;
}

/* Claude Code's home greeting is a 20px sans line with a small brand mark.
   The serif display rule (theme/typography.css) reaches the headline AND the
   titleGroup inside it — the class name contains "title" — so both elements
   have to leave it behind, and the two extra body attributes plus the root
   qualifier carry past the hero's own 44.2px size as well. */
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_headline"],
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_headline"] [class*="titleGroup"],
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_headline"] [class*="titleGroup"] > span {
  justify-content: flex-start;
  font-family: var(--dsw-font-family);
  font-size: 20px;
  font-weight: 500;
  line-height: 26px;
  color: var(--dsw-alias-label-primary, #141413);
}

body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="_headline"] {
  gap: 8px;
}

/* The mark shrinks with the line: Claude's home asterisk stands a hair taller
   than the greeting's own cap height, not twice it. */
body[data-dsh-claude-style][data-dsh-claude-home-hero] [class*="fishHitbox"]::before {
  width: 21px;
  height: 21px;
}

/* ---------- the panel ---------- */
/* The panel draws only inside the studio hero stack. Sending the first message
   takes the stack's hero class away in the host's own render, while
   the component steps away only on the skin's next pass; keyed here, the panel
   leaves in the same frame, instead of spending that gap at the conversation's
   full width with its square heat cells blown up to fill the window. */
body[data-dsh-claude-style] .dsh-claude-home-panel {
  display: none;
}

body[data-dsh-claude-style][data-dsh-claude-home-layout="studio"] [class*="_composerHero"] > :is([data-slot="conversation.input.dock"], .dsh-claude-home-seat) > .dsh-claude-home-panel {
  display: flex;
}

body[data-dsh-claude-style] .dsh-claude-home-panel {
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  /* The card inside the stack carries the composer's side clearance; the panel
     takes the same inset so the two read as one column. */
  margin: 0 var(--dsh-composer-side-clearance, 0px);
  padding: 12px;
  border-radius: 12px;
  /* Claude Code's panel is a flat warm-gray wash with no outline: a whisper of
     the label tone over the card tone, which flips with the theme on its own. */
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 4%, var(--dsw-alias-bg-layer-2, #fbfbf9));
  overflow: auto;
  /* Claude Code fades its dashboard into the context row when the window cuts
     it short. The mask's transparent 32px foot hangs below the box at rest, so
     a panel that fits is untouched; while the panel scrolls, the scroll-linked
     animation pulls the foot up over the bottom edge, and lowers it again over
     the last 32px of travel, so the final row reads clean at the end. A panel
     that does not overflow has an inactive scroll timeline, and the resting
     value holds. */
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 32px), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 32px), transparent);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% calc(100% + 32px);
  mask-size: 100% calc(100% + 32px);
  animation: dsh-claude-home-panel-fade linear both;
  animation-timeline: scroll(self);
  animation-range: calc(100% - 32px) 100%;
}

@keyframes dsh-claude-home-panel-fade {
  from { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }
  to { -webkit-mask-size: 100% calc(100% + 32px); mask-size: 100% calc(100% + 32px); }
}

body[data-dsh-claude-style] .dsh-claude-home-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

body[data-dsh-claude-style] .dsh-claude-home-tabs,
body[data-dsh-claude-style] .dsh-claude-home-ranges {
  display: flex;
  align-items: center;
  gap: 2px;
}

body[data-dsh-claude-style] .dsh-claude-home-tab,
body[data-dsh-claude-style] .dsh-claude-home-range {
  appearance: none;
  margin: 0;
  padding: 1px 8px;
  border: 0;
  /* Half of the full pill the 20px control would round to, matching Claude's
     Overview chip. */
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-family: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

body[data-dsh-claude-style] .dsh-claude-home-tab:hover:not([data-active]),
body[data-dsh-claude-style] .dsh-claude-home-range:hover:not([data-active]) {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 5%, transparent);
  color: var(--dsw-alias-label-primary, #141413);
}

/* The active pill is a gray chip one step below the panel's own wash — Claude's
   Overview reads as gray ground under black text, not a lifted white card. */
body[data-dsh-claude-style] .dsh-claude-home-tab[data-active],
body[data-dsh-claude-style] .dsh-claude-home-range[data-active] {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 10%, var(--dsw-alias-bg-layer-2, #fbfbf9));
  color: var(--dsw-alias-label-primary, #141413);
}

body[data-dsh-claude-style] .dsh-claude-home-panel-side {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* While the host half is still folding, every skeleton surface breathes together:
   the tiles' stand-in figures, the heat grid, and the models tab's stand-in rows. */
body[data-dsh-claude-style] .dsh-claude-home-panel[data-computing] .dsh-claude-home-stat[data-skeleton] .dsh-claude-home-stat-value,
body[data-dsh-claude-style] .dsh-claude-home-panel[data-computing] .dsh-claude-home-models[data-skeleton] .dsh-claude-home-model-swatch,
body[data-dsh-claude-style] .dsh-claude-home-heat[data-skeleton] .dsh-claude-home-heat-cell {
  animation: dsh-claude-home-pulse 1.6s ease-in-out infinite;
}

@keyframes dsh-claude-home-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* The skeleton pulse stands down with the rest of the skin's motion when the
   animation choice resolves to "reduced" (theme/chrome.css): the shared rule
   holds it on its first frame, and it covers "Always" as well. */

/* ---------- the usage panel's Overview tab ---------- */
/* The six stat cells, Claude Code's blue heat grid, and the yardstick line under
   it. The shell (the panel frame, its head and the tab pills) is home-panel.css. */

body[data-dsh-claude-style] .dsh-claude-home-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

/* A tile sits one tone deeper than the panel wash, not one tone lighter. */
body[data-dsh-claude-style] .dsh-claude-home-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  min-width: 0;
  padding: 5px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 15%, var(--dsw-alias-bg-layer-2, #fbfbf9));
}

body[data-dsh-claude-style] .dsh-claude-home-stat-label {
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

body[data-dsh-claude-style] .dsh-claude-home-stat-value {
  color: var(--dsw-alias-label-primary, #141413);
  /* Claude's tile keeps the figure barely above its own label: 13px bold, which
     is also what lets a long model id such as deepseek-v4.1-flash sit on one
     line instead of being cut off. */
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

/* The favourite model is a name, not a figure: Claude Code sets it at the
   label's own weight. */
body[data-dsh-claude-style] .dsh-claude-home-stat[data-stat="model"] .dsh-claude-home-stat-value {
  font-weight: 400;
}

/* The heat grid keeps its geometry whether or not the numbers have landed: an
   empty cell IS the zero step, so the skeleton and the data look like one grid
   and nothing shifts when the value arrives. */
/* The grid fills the panel's inner width: one equal column per week, square
   cells, so the newest week never falls past the edge and the whole block
   scales with the card instead of with a fixed cell size. */
body[data-dsh-claude-style] .dsh-claude-home-heat {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-columns: 1fr;
  gap: 3px;
  align-content: start;
}

/* Claude Code's heat grid is a blue data ramp, not the brand ember: the empty
   cell stays the neutral base tone, and the four steps mix in the data blue. */
body[data-dsh-claude-style] .dsh-claude-home-heat-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 3px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 11%, transparent);
}

/* Claude Code's day tip: a solid pill in the label ink over the cell, the day
   and its messages in the canvas tone, so it inverts with the theme on its own.
   It appears the moment the pointer is on the cell, and never takes the
   pointer itself. */
body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-tip]:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--dsw-alias-label-primary, #141413);
  color: var(--dsw-alias-bg-base, #fcfcfb);
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-tip][data-edge="start"]:hover::after {
  left: 0;
  transform: none;
}

body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-tip][data-edge="end"]:hover::after {
  left: auto;
  right: 0;
  transform: none;
}

body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-level="1"] {
  background: color-mix(in srgb, #3b6ecf 20%, transparent);
}

body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-level="2"] {
  background: color-mix(in srgb, #3b6ecf 40%, transparent);
}

body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-level="3"] {
  background: color-mix(in srgb, #3b6ecf 65%, transparent);
}

body[data-dsh-claude-style] .dsh-claude-home-heat-cell[data-level="4"] {
  background: #3b6ecf;
}

/* The one-liner under the grid: a plain caption, no emphasis of its own. */
body[data-dsh-claude-style] .dsh-claude-home-fun {
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-size: 12px;
  line-height: 16px;
}

/* Skeleton: the label stays, the number is a placeholder of the value's own
   height, and the grid breathes instead of pretending to hold zeroes. */
body[data-dsh-claude-style] .dsh-claude-home-stat[data-skeleton] .dsh-claude-home-stat-value {
  display: block;
  width: 42px;
  height: 13px;
  margin: 2px 0;
  border-radius: 4px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 9%, transparent);
}

body[data-dsh-claude-style] .dsh-claude-home-heat[data-skeleton] .dsh-claude-home-heat-cell {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 5%, transparent);
}

/* A narrow window stacks the stat cells rather than squeezing three of them;
   the heat grid follows the panel on its own. */
@media (max-width: 760px) {
  body[data-dsh-claude-style] .dsh-claude-home-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---------- the usage panel's Models tab ---------- */
/* Claude Code's own shape: a per-day stacked chart over a ranked list. A model's
   rank in the list is its colour in the chart, so both read from \`data-rank\`. */

/* The tick labels live in the gutter this variable reserves, outside the plot. */
body[data-dsh-claude-style] .dsh-claude-home-chart {
  --dsh-home-axis: 34px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-plot {
  position: relative;
  height: 152px;
  margin-left: var(--dsh-home-axis);
}

body[data-dsh-claude-style] .dsh-claude-home-chart-tick {
  position: absolute;
  left: calc(-1 * var(--dsh-home-axis));
  width: calc(var(--dsh-home-axis) - 6px);
  transform: translateY(50%);
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-size: 11px;
  line-height: 14px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* One column per day, stacked from the axis up: the column owns the rounding so
   the top of the stack is what curves, exactly like Claude's bars. */
body[data-dsh-claude-style] .dsh-claude-home-chart-bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-col {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 0;
  border-radius: 2px;
  overflow: hidden;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg {
  display: block;
  width: 100%;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-axis {
  display: flex;
  gap: 2px;
  margin-left: var(--dsh-home-axis);
}

body[data-dsh-claude-style] .dsh-claude-home-chart-label {
  flex: 1 1 0;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* The ramp: the biggest spender is the deepest data blue, and the walk down ends
   in the warm grey that stands for every model past the list. */
body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="0"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="0"] {
  background: #2f5fc4;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="1"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="1"] {
  background: #3b6ecf;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="2"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="2"] {
  background: #5b88da;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="3"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="3"] {
  background: #7ea3e4;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="4"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="4"] {
  background: #a3bfec;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="5"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="5"] {
  background: #c3d5f3;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="6"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="6"] {
  background: #dbe5f8;
}

body[data-dsh-claude-style] .dsh-claude-home-chart-seg[data-rank="7"],
body[data-dsh-claude-style] .dsh-claude-home-model-swatch[data-rank="7"] {
  background: #b9b5ac;
}

body[data-dsh-claude-style] .dsh-claude-home-models {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

body[data-dsh-claude-style] .dsh-claude-home-model {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

body[data-dsh-claude-style] .dsh-claude-home-model-swatch {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

body[data-dsh-claude-style] .dsh-claude-home-model-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary, #141413);
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Claude's row reads name, then the input/output split, then the share: the
   split floats right against the fixed share column so the numbers line up. */
body[data-dsh-claude-style] .dsh-claude-home-model-split {
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

body[data-dsh-claude-style] .dsh-claude-home-model-share {
  flex: none;
  width: 48px;
  color: var(--dsw-alias-label-primary, #141413);
  font-size: 12px;
  line-height: 18px;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

body[data-dsh-claude-style] .dsh-claude-home-models-more {
  appearance: none;
  align-self: flex-start;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-family: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

body[data-dsh-claude-style] .dsh-claude-home-models-more:hover {
  color: var(--dsw-alias-label-primary, #141413);
}

body[data-dsh-claude-style] .dsh-claude-home-models-empty {
  padding: 18px 0;
  color: var(--dsw-alias-label-tertiary, #8f8a7e);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
}

/* A skeleton row is one stand-in bar: the name, the split and the share are
   placeholders of their own height, so the list keeps its rhythm. */
body[data-dsh-claude-style] .dsh-claude-home-models[data-skeleton] .dsh-claude-home-model-name,
body[data-dsh-claude-style] .dsh-claude-home-models[data-skeleton] .dsh-claude-home-model-split,
body[data-dsh-claude-style] .dsh-claude-home-models[data-skeleton] .dsh-claude-home-model-share {
  display: none;
}

body[data-dsh-claude-style] .dsh-claude-home-models[data-skeleton] .dsh-claude-home-model-swatch {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #141413) 9%, transparent);
}

/* ── The composer crab ──────────────────────────────────────────────────────
   Claude Code's pixel crab, drawn on a 52×36 grid of cells at 2px a cell
   (104×72px): feet on the bottom row, on the top edge of what it stands on;
   the right claw four cells in from the grid's right edge, which is the room a
   lean, a note or a sparkle takes on that side. The crab writes the sheet and
   the sprite's crop box as custom properties when an animation starts; each
   frame is a translation of the strip inside the sprite's window, played by
   the browser's animation engine (packages/client/src/features/mascot/mascot-player.ts), eight
   frames to a sheet row. The strip carries the shell, its shaded side and the
   eyes; its ::after carries the ink mask (the laptop, the thought bubble,
   letters, notes, the hat), filled with the tertiary label ink so it stays a
   quiet grey on either canvas. Only the crab itself takes the pointer. */

/* Claude Code's spacing on the home page's single-line card: the right claw
   8px inside the card's right edge (the grid's four spare cells), so the feet
   stand where the 18px corner starts to round. */
body[data-dsh-claude-style] .dsh-claude-crab {
  position: absolute;
  right: 0;
  /* Feet on the card's edge: the card draws its outline inside its own box. */
  bottom: 100%;
  z-index: 1;
  width: 104px;
  height: 72px;
  pointer-events: none;
}

body[data-dsh-claude-style] .dsh-claude-crab:not([data-ready]) {
  visibility: hidden;
}

/* A conversation's input area and the panels that take its card's place span
   the whole column, so the crab is set in from the edge of the card they
   centre, as Deepy is (features/mascot/whale.css); those panels start 6–8px
   above their card. */
body[data-dsh-claude-style] :is([data-dsh-claude-crab-anchor="stack"], [data-dsh-claude-crab-anchor="panel"]) {
  position: relative;
}

body[data-dsh-claude-style] [data-dsh-claude-crab-anchor="stack"] > .dsh-claude-crab {
  right: max(var(--dsh-composer-side-clearance, 16px), (100% - var(--dsh-composer-card-max-width, 100%)) / 2);
}

body[data-dsh-claude-style] [data-dsh-claude-crab-anchor="panel"] > .dsh-claude-crab {
  right: max(var(--dsh-composer-side-clearance, 16px) + 16px, (100% - var(--dsh-chat-content-width, 100%)) / 2);
  bottom: calc(100% - 7px);
}

body[data-dsh-claude-style] .dsh-claude-crab-sprite {
  position: absolute;
  left: calc(var(--dsh-claude-crab-x, 0) * 2px);
  top: calc(var(--dsh-claude-crab-y, 0) * 2px);
  width: calc(var(--dsh-claude-crab-w, 0) * 2px);
  height: calc(var(--dsh-claude-crab-h, 0) * 2px);
  overflow: hidden;
}

/* The strip carries the whole sheet and is translated frame to frame: a
   transform composites, where a background-position would repaint. Its box is
   the sheet's own box — \`--dsh-claude-crab-cell-w\` is one frame cell, which
   is the crop box because these sheets carry no margin (the art is built at
   one pixel a cell and inlined, so there is no rebuild to add one). The art
   is one pixel a cell, scaled to 2px: whole multiples, so \`pixelated\` keeps
   every cell square. */
body[data-dsh-claude-style] .dsh-claude-crab-strip {
  position: relative;
  display: block;
  width: calc(var(--dsh-claude-crab-cell-w, 0) * 16px);
  height: calc(var(--dsh-claude-crab-strip-h, 0) * 2px);
  background-image: var(--dsh-claude-crab-sheet, none);
  background-repeat: no-repeat;
  background-size: 100% 100%;
  image-rendering: pixelated;
}

body[data-dsh-claude-style] .dsh-claude-crab-strip::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--dsw-alias-label-tertiary, #8f8a7e);
  -webkit-mask: var(--dsh-claude-crab-ink, none) no-repeat 0 0 / 100% 100%;
  mask: var(--dsh-claude-crab-ink, none) no-repeat 0 0 / 100% 100%;
  image-rendering: pixelated;
}

/* The resting crab's shell, claws and legs: columns 24–47, rows 20–35. */
body[data-dsh-claude-style] .dsh-claude-crab-hit {
  position: absolute;
  left: 48px;
  top: 40px;
  width: 48px;
  height: 32px;
  pointer-events: auto;
  touch-action: none;
}

/* ── Deepy, the DeepSeek brand's pixel whale ────────────────────────────────
   The whale is drawn on a 52×52 grid of logical pixels at 2px a pixel (104px
   square), its ground line — row 48.5, the middle of its shadow — on the top
   edge of what it stands on. The sheets hold five device pixels to a logical
   pixel, so the browser scales them down smoothly at every pixel density
   (\`image-rendering\` stays at its default: a pixelated downscale drops rows).
   The whale writes the sheet and the sprite's crop box as custom properties
   when an animation starts; each frame is a translation of the strip inside
   the sprite's window, played by the browser's animation engine
   (packages/client/src/features/mascot/whale.ts); the sheet holds eight frames to a row.
   Only the whale's body takes the pointer. */

/* Feet on the top edge of what it stands on. Every sheet's crop box ends 3px
   below the whale's ground line (logical row 50 against the ground line at
   48.5), and the whale paints over the host's cards — the composer card, and
   the todo, goal and queue cards stacked above it in a conversation — so that
   overhang, which is the soft tail of the shadow, would darken the top of the
   card being stood on. Lifting the box by that 3px lands the sprite's last row
   on the card's top edge instead, which leaves the shadow resting on the card
   and nothing painted across it. */
body[data-dsh-claude-style] .dsh-claude-deepy {
  position: absolute;
  right: 8px;
  bottom: calc(100% - 4px);
  z-index: 1;
  width: 104px;
  height: 104px;
  pointer-events: none;
}

/* Hidden until the first sheet has drawn a frame: a host half that predates
   the sheets leaves no empty box to click on. */
body[data-dsh-claude-style] .dsh-claude-deepy:not([data-ready]) {
  visibility: hidden;
}

/* A conversation's input area and the panels that take its card's place span
   the whole column, so the whale is set in from the edge of the card they
   centre: the composer card (its max width, inside the side clearance), or
   the takeover's own card (the shared content width, 16px further in). Those
   panels start 6–8px above their card. */
body[data-dsh-claude-style] :is([data-dsh-claude-deepy-anchor="stack"], [data-dsh-claude-deepy-anchor="panel"]) {
  position: relative;
}

body[data-dsh-claude-style] [data-dsh-claude-deepy-anchor="stack"] > .dsh-claude-deepy {
  right: calc(max(var(--dsh-composer-side-clearance, 16px), (100% - var(--dsh-composer-card-max-width, 100%)) / 2) + 8px);
}

body[data-dsh-claude-style] [data-dsh-claude-deepy-anchor="panel"] > .dsh-claude-deepy {
  right: calc(max(var(--dsh-composer-side-clearance, 16px) + 16px, (100% - var(--dsh-chat-content-width, 100%)) / 2) + 8px);
  bottom: calc(100% - 11px);
}

body[data-dsh-claude-style] .dsh-claude-deepy-sprite {
  position: absolute;
  left: calc(var(--dsh-claude-deepy-x, 0) * 2px);
  top: calc(var(--dsh-claude-deepy-y, 0) * 2px);
  width: calc(var(--dsh-claude-deepy-w, 0) * 2px);
  height: calc(var(--dsh-claude-deepy-h, 0) * 2px);
  overflow: hidden;
}

/* The strip carries the whole sheet and is translated frame to frame: a
   transform composites, where a background-position would repaint. Its box is
   the rebuilt vector's own box, so \`--dsh-claude-deepy-cell-w\` is one frame
   cell — the crop box plus the transparent margin each frame keeps there
   (DEEPY_GUTTER; without that margin the downscale that draws the vector
   samples the frame above's shadow along the cell's edge) — and
   \`--dsh-claude-deepy-strip-h\` the stacked height of all its cell rows. */
body[data-dsh-claude-style] .dsh-claude-deepy-strip {
  display: block;
  width: calc(var(--dsh-claude-deepy-cell-w, 0) * 16px);
  height: calc(var(--dsh-claude-deepy-strip-h, 0) * 2px);
  background-image: var(--dsh-claude-deepy-sheet, none);
  background-repeat: no-repeat;
  background-size: calc(var(--dsh-claude-deepy-cell-w, 0) * 16px) auto;
}

/* The resting whale's body, head to tail: columns 12–44, rows 30–48. */
body[data-dsh-claude-style] .dsh-claude-deepy-hit {
  position: absolute;
  left: 24px;
  top: 60px;
  width: 64px;
  height: 36px;
  pointer-events: auto;
  touch-action: none;
}

/* ============================================================================
   主题翻转：瞬时抑制过渡 (Theme Flip: Transition Suppression)
   ============================================================================ */
/* While a theme flip is in flight, every skin surface must swap in ONE
   recalc: the composer card/input/rail keep 0.12s border/box-shadow
   transitions for hover/focus, and without this flag they trail the canvas
   repaint by a visible beat ("colours first, styles later"). The flag is
   mounted for the flip only (~0.3s), never during ordinary interaction.
   This rule only out-specifies the lower-specificity transition rules
   (html[flag] body[skin][flag] * is (0,3,2)); the higher ones (input scroll
   (0,6,1), attachment rail (0,7,1)) are covered by the forced-flush cancel
   sweep in packages/client/src/features/theme-flip/theme-flip.ts. */
html[data-dsh-theme-transitioning] body[data-dsh-claude-style][data-dsh-theme-transitioning] * {
  transition: none !important;
}`,ks={baidu:'<svg fill="none" viewBox="0 0 5.0084 1" data-combine-word="Baidu" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.1208 -0.2250) scale(0.060417)"><g><path d="M8.859 11.735c1.017-1.71 4.059-3.083 6.202.286 1.579 2.284 4.284 4.397 4.284 4.397s2.027 1.601.73 4.684c-1.24 2.956-5.64 1.607-6.005 1.49l-.024-.009s-1.746-.568-3.776-.112c-2.026.458-3.773.286-3.773.286l-.045-.001c-.328-.01-2.38-.187-3.001-2.968-.675-3.028 2.365-4.687 2.592-4.968.226-.288 1.802-1.37 2.816-3.085zm.986 1.738v2.032h-1.64s-1.64.138-2.213 2.014c-.2 1.252.177 1.99.242 2.148.067.157.596 1.073 1.927 1.342h3.078v-7.514l-1.394-.022zm3.588 2.191l-1.44.024v3.956s.064.985 1.44 1.344h3.541v-5.3h-1.528v3.979h-1.46s-.466-.068-.553-.447v-3.556zM9.82 16.715v3.06H8.58s-.863-.045-1.126-1.049c-.136-.445.02-.959.088-1.16.063-.203.353-.671.951-.85H9.82zm9.525-9.036c2.086 0 2.646 2.06 2.646 2.742 0 .688.284 3.597-2.309 3.655-2.595.057-2.704-1.77-2.704-3.08 0-1.374.277-3.317 2.367-3.317zM4.24 6.08c1.523-.135 2.645 1.55 2.762 2.513.07.625.393 3.486-1.975 4-2.364.515-3.244-2.249-2.984-3.544 0 0 .28-2.797 2.197-2.969zm8.847-1.483c.14-1.31 1.69-3.316 2.931-3.028 1.236.285 2.367 1.944 2.137 3.37-.224 1.428-1.345 3.313-3.095 3.082-1.748-.226-2.143-1.823-1.973-3.424zM9.425 1c1.307 0 2.364 1.519 2.364 3.398 0 1.879-1.057 3.4-2.364 3.4s-2.367-1.521-2.367-3.4C7.058 2.518 8.118 1 9.425 1z" fill="#2932E1" fill-rule="nonzero"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.1208 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M8.859 11.735c1.017-1.71 4.059-3.083 6.202.286 1.579 2.284 4.284 4.397 4.284 4.397s2.027 1.601.73 4.684c-1.24 2.956-5.64 1.607-6.005 1.49l-.024-.009s-1.746-.568-3.776-.112c-2.026.458-3.773.286-3.773.286l-.045-.001c-.328-.01-2.38-.187-3.001-2.968-.675-3.028 2.365-4.687 2.592-4.968.226-.288 1.802-1.37 2.816-3.085zm.986 1.738v2.032h-1.64s-1.64.138-2.213 2.014c-.2 1.252.177 1.99.242 2.148.067.157.596 1.073 1.927 1.342h3.078v-7.514l-1.394-.022zm3.588 2.191l-1.44.024v3.956s.064.985 1.44 1.344h3.541v-5.3h-1.528v3.979h-1.46s-.466-.068-.553-.447v-3.556zM9.82 16.715v3.06H8.58s-.863-.045-1.126-1.049c-.136-.445.02-.959.088-1.16.063-.203.353-.671.951-.85H9.82zm9.525-9.036c2.086 0 2.646 2.06 2.646 2.742 0 .688.284 3.597-2.309 3.655-2.595.057-2.704-1.77-2.704-3.08 0-1.374.277-3.317 2.367-3.317zM4.24 6.08c1.523-.135 2.645 1.55 2.762 2.513.07.625.393 3.486-1.975 4-2.364.515-3.244-2.249-2.984-3.544 0 0 .28-2.797 2.197-2.969zm8.847-1.483c.14-1.31 1.69-3.316 2.931-3.028 1.236.285 2.367 1.944 2.137 3.37-.224 1.428-1.345 3.313-3.095 3.082-1.748-.226-2.143-1.823-1.973-3.424zM9.425 1c1.307 0 2.364 1.519 2.364 3.398 0 1.879-1.057 3.4-2.364 3.4s-2.367-1.521-2.367-3.4C7.058 2.518 8.118 1 9.425 1z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.4084 -0.1000) scale(0.050000)"><g fill="currentColor" fill-rule="evenodd"><path d="M36.887 5.791H41V2.125h-4.113v3.666zM41 21.774V7.389h-4.113v14.385H41zM21.423 7.379v3.023h7.695s1.832.458 1.832 1.634V13.1h-6.963s-2.739.256-3.618 3.567c-.152 1.55.05 2.31.153 2.595.1.28.901 2.107 3.29 2.565h11.087V11.523s-.528-3.535-4.7-4.121l-8.776-.023zm3.923 11.6c-.753-.307-1.004-.815-1.057-.942-.052-.125-.226-.58-.023-1.041.453-.889 1.205-1.093 1.205-1.093h5.479v3.076h-5.604zm-8.866-6.964c2.629-1.392 2.295-4.897 2.295-4.897-.285-5.366-6.764-5.116-6.764-5.116H2V22h11.304c6.638-.026 6.16-5.272 6.16-5.272.122-3.503-2.984-4.713-2.984-4.713zM6.305 18.292v-4.314h6.739l.228.046s1.282.237 1.746 1.404c0 0 .27 1.096-.311 1.91 0 0-.427.755-1.63.945l-6.772.009zm6.545-8.252H6.305V5.9h6.517s1.416-.067 1.885 1.072c0 0 .281 1.21-.195 2.038 0 0-.455.847-1.662 1.029zM53.274 2v5.394h-4.308s-4.306.365-5.814 5.343c-.525 3.324.464 5.282.637 5.701.174.418 1.566 2.849 5.06 3.562h8.085V2.058L53.274 2zm-.065 16.727h-3.257s-2.269-.12-2.96-2.784c-.356-1.182.053-2.546.233-3.082.164-.538.926-1.779 2.497-2.256h3.486l.001 8.122zm5.707-10.849v10.5s.168 2.614 3.78 3.566H72V7.878h-4.015v10.56h-3.833s-1.225-.18-1.454-1.186V7.816l-3.782.062z"></path></g></g></g></svg>',bytedance:'<svg fill="none" viewBox="0 0 8.1408 1" data-combine-word="ByteDance" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g><path d="M14.944 18.587l-1.704-.445V10.01l1.824-.462c1-.254 1.84-.461 1.88-.453.032 0 .056 2.235.056 4.972v4.973l-.176-.008c-.104 0-.952-.207-1.88-.446z" fill="#00C8D2" fill-rule="nonzero"></path><path d="M7 16.542c0-2.736.024-4.98.064-4.98.032-.008.872.2 1.88.454l1.816.461-.016 4.05-.024 4.049-1.632.422c-.896.23-1.736.445-1.856.469L7 21.523v-4.98z" fill="#3C8CFF" fill-rule="nonzero"></path><path d="M19.24 12.477c0-9.03.008-9.515.144-9.475.072.024.784.207 1.576.406.792.207 1.576.405 1.744.445l.296.08-.016 8.56-.024 8.568-1.624.414c-.888.23-1.728.437-1.856.47l-.24.055v-9.523z" fill="currentColor" fill-rule="nonzero"></path><path d="M1 12.509c0-4.678.024-8.505.064-8.505.032 0 .872.207 1.872.454l1.824.461v7.582c0 4.16-.016 7.574-.032 7.574-.024 0-.872.215-1.88.47L1 21.013v-8.505z" fill="#325AB4"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M14.944 18.587l-1.704-.445V10.01l1.824-.462c1-.254 1.84-.461 1.88-.453.032 0 .056 2.235.056 4.972v4.973l-.176-.008c-.104 0-.952-.207-1.88-.446z"></path><path d="M7 16.542c0-2.736.024-4.98.064-4.98.032-.008.872.2 1.88.454l1.816.461-.016 4.05-.024 4.049-1.632.422c-.896.23-1.736.445-1.856.469L7 21.523v-4.98z"></path><path d="M19.24 12.477c0-9.03.008-9.515.144-9.475.072.024.784.207 1.576.406.792.207 1.576.405 1.744.445l.296.08-.016 8.56-.024 8.568-1.624.414c-.888.23-1.728.437-1.856.47l-.24.055v-9.523z"></path><path d="M1 12.509c0-4.678.024-8.505.064-8.505.032 0 .872.207 1.872.454l1.824.461v7.582c0 4.16-.016 7.574-.032 7.574-.024 0-.872.215-1.88.47L1 21.013v-8.505z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.5129 -0.1163) scale(0.058140)"><g fill="currentColor" fill-rule="evenodd"><path d="M31.574 4.626V7.43h.893c.674 0 .84.015.88.49l.012.53-.013.53c-.04.474-.205.49-.88.49h-.892l.003 5c.018 2.842.164 2.902 1.298 2.902.357 0 .46.137.48.837l.004 1.534-1.428-.179c-.79-.076-1.631-.28-1.912-.408-.693-.382-.96-1.705-.991-5.188l-.003-4.499h-2.958l-3.187 7.266L19.72 24h-2.423l.484-1.198c.28-.688.74-1.785 1.02-2.447l.536-1.25-4.768-11.344c-.102-.255.255-.331 1.25-.331h1.376l2.633 6.613c.738 1.81.936 2.113 1.094 1.82l1.857-4.584 1.53-3.722 4.716-.153V4.626h2.55zm68.557 3.773c.306.229.23.407-.383 1.121l-.765.867-1.121-.612c-2.04-1.07-3.978-.408-4.895 1.657-.587 1.3-.51 2.83.178 4.181.918 1.733 3.34 2.294 5.048 1.147l.892-.612.663.689c.357.382.663.79.663.943 0 .637-3.493 2.065-4.564 1.86l-1.045-.203c-1.886-.383-3.467-1.683-4.181-3.39-.255-.561-.408-1.709-.408-2.83 0-1.657.102-2.014.841-3.238 1.81-3.033 5.94-3.747 9.077-1.58zM42.92 7.455c2.09.561 3.951 3.263 3.951 5.685v.918l-7.175.008c-2.97.039-2.837.26-2.08 1.521 1.25 2.116 4.539 2.346 6.63.46.586-.536 1.172-.409 1.86.433.281.331.23.51-.382 1.147-1.3 1.351-4.181 2.269-5.864 1.86-2.269-.535-3.62-1.503-4.538-3.237-.765-1.453-.74-4.435.026-5.94 1.35-2.6 4.36-3.747 7.572-2.855zm64.604-.28c3.595 0 5.966 2.065 6.323 5.506l.153 1.377h-9.765v.663c0 .433.306.968.893 1.53 1.53 1.452 3.722 1.478 5.685.101l1.096-.765.765.51c.408.306.74.638.74.74 0 .102-.306.484-.689.866-1.402 1.326-4.232 2.116-6.195 1.734-2.932-.586-4.844-3.008-4.844-6.17 0-3.466 2.524-6.067 5.838-6.092zm-34.01.918l.55.367c.508.32.584.263.595-.18l.002-.213c0-.49.078-.61.713-.633L76.7 7.43v11.726h-1.148c-.847 0-1.09-.058-1.137-.363l-.01-.146c0-.638-.127-.638-1.198.025-1.377.867-3.697.918-5.329.153-2.422-1.173-3.62-3.39-3.34-6.297.179-1.963 1.097-3.594 2.55-4.435 1.989-1.173 4.691-1.173 6.425 0zM2 19.182V2l4.892.212c2.05.11 2.655.253 3.496.706 2.498 1.274 3.136 4.563 1.275 6.526-.357.382-.485.663-.306.714 1.3.433 2.6 2.523 2.626 4.155 0 1.351-.97 3.059-2.244 3.951l-1.122.765L2 19.182zM87.995 8.985c.69.928.914 2.167.94 5.644l.003 4.527h-2.294v-3.365l-.02-1.404c-.11-4.106-.676-5.045-2.683-5.045-.994 0-1.274.127-1.912.841l-.74.816v8.157h-2.294V7.43h1.147c.743 0 1.056.075 1.13.289l.018.119c0 .23.076.357.204.306 2.855-1.479 4.946-1.198 6.501.84zm-36.33-6.909c8.285 0 11.778 2.805 11.472 9.203-.255 5.456-3.39 7.877-10.172 7.877H49.93V2.076h1.733zm17.005 7.75c-1.683 1.122-2.244 4.053-1.071 5.787 1.147 1.733 3.646 2.243 5.252 1.07 2.294-1.733 2.192-5.404-.23-6.806-1.045-.612-3.033-.637-3.951-.05zM4.55 11.713v5.2l4.09-.15c1.333-.067 1.473-.209 2.054-.87.459-.51.74-1.096.74-1.58s-.281-1.07-.74-1.58l-.283-.312c-.518-.531-.864-.54-3.159-.606l-2.702-.102zm47.675-7.419v12.62l2.244-.103c1.606-.076 2.498-.255 3.263-.663 2.04-1.045 2.907-2.676 2.907-5.404 0-2.141-.434-3.314-1.632-4.461-1.09-1.066-2.052-1.48-4.23-1.737l-2.552-.252zM39.962 9.342c-1.173.204-2.779 1.606-2.779 2.422l.017.171c.077.273.477.327 2.443.336l4.704.002-.153-.56c-.484-1.58-2.422-2.677-4.232-2.371zm66.568.102c-1.07.306-2.295 1.555-2.295 2.345 0 .402.176.471 2.44.482l4.674.002-.255-.764c-.587-1.683-2.703-2.626-4.564-2.065zM4.55 4.294V9.47h1.657c.918 0 2.04-.153 2.498-.331 1.147-.484 1.53-1.045 1.53-2.243 0-.79-.179-1.199-.663-1.708-.47-.45-.775-.604-1.858-.7L4.55 4.294z"></path></g></g></g></svg>',celestoai:'<svg fill="none" viewBox="0 0 7.7955 1" data-combine-word="celestoai" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(0.0000 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path d="M11.77.194c.044-.259.416-.259.46 0l1.081 6.45a.989.989 0 001.55.641l5.325-3.795c.213-.153.477.11.324.324L16.715 9.14a.989.989 0 00.641 1.549l6.45 1.082c.259.043.259.415 0 .458l-6.45 1.082a.989.989 0 00-.641 1.55l3.795 5.325c.153.213-.11.477-.324.324l-5.326-3.795a.989.989 0 00-1.549.641l-1.082 6.45c-.043.259-.415.259-.458 0l-1.082-6.45a.989.989 0 00-1.55-.641L3.815 20.51c-.214.153-.477-.11-.324-.324l3.795-5.326a.989.989 0 00-.641-1.549L.194 12.23c-.259-.043-.259-.415 0-.458l6.45-1.082a.989.989 0 00.641-1.55L3.49 3.815c-.153-.214.11-.477.324-.324L9.14 7.285a.989.989 0 001.549-.641L11.77.194z"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M11.77.194c.044-.259.416-.259.46 0l1.081 6.45a.989.989 0 001.55.641l5.325-3.795c.213-.153.477.11.324.324L16.715 9.14a.989.989 0 00.641 1.549l6.45 1.082c.259.043.259.415 0 .458l-6.45 1.082a.989.989 0 00-.641 1.55l3.795 5.325c.153.213-.11.477-.324.324l-5.326-3.795a.989.989 0 00-1.549.641l-1.082 6.45c-.043.259-.415.259-.458 0l-1.082-6.45a.989.989 0 00-1.55-.641L3.815 20.51c-.214.153-.477-.11-.324-.324l3.795-5.326a.989.989 0 00-.641-1.549L.194 12.23c-.259-.043-.259-.415 0-.458l6.45-1.082a.989.989 0 00.641-1.55L3.49 3.815c-.153-.214.11-.477.324-.324L9.14 7.285a.989.989 0 001.549-.641L11.77.194z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6591 -0.0455) scale(0.045455)"><g fill="currentColor" fill-rule="nonzero"><path d="M12.49 23c-1.52 0-2.923-.268-4.207-.803a10.25 10.25 0 01-3.32-2.319 10.334 10.334 0 01-2.192-3.508C2.256 15.022 2 13.546 2 11.94c0-1.605.257-3.072.77-4.4.514-1.327 1.235-2.477 2.164-3.448a9.873 9.873 0 013.319-2.29C9.537 1.269 10.95 1 12.49 1c1.699 0 3.23.337 4.593 1.01a8.828 8.828 0 013.349 2.855c.889 1.209 1.432 2.636 1.63 4.28h-3.794c-.237-1.604-.879-2.833-1.926-3.686-1.047-.872-2.321-1.308-3.823-1.308-1.323 0-2.48.317-3.467.952-.988.634-1.758 1.536-2.311 2.705-.554 1.15-.83 2.517-.83 4.103 0 1.625.276 3.032.83 4.221.553 1.17 1.333 2.081 2.34 2.736 1.008.654 2.164.98 3.468.98 1.462 0 2.716-.425 3.764-1.278 1.047-.872 1.708-2.1 1.985-3.686h3.823c-.237 1.625-.8 3.052-1.69 4.28a8.828 8.828 0 01-3.348 2.855c-1.363.654-2.894.981-4.593.981zM31.756 23c-1.6 0-3.002-.337-4.208-1.01a7.27 7.27 0 01-2.785-2.795c-.652-1.19-.978-2.557-.978-4.103 0-1.546.326-2.904.978-4.073a7.063 7.063 0 012.785-2.765c1.186-.674 2.569-1.01 4.15-1.01 1.5 0 2.805.316 3.911.95a6.436 6.436 0 012.578 2.617c.613 1.13.919 2.448.919 3.954a8.821 8.821 0 01-.118 1.486H26.095v-2.616h10.017l-.77.714c0-1.427-.327-2.498-.979-3.211-.652-.714-1.56-1.07-2.726-1.07-1.264 0-2.272.436-3.023 1.308-.73.872-1.096 2.13-1.096 3.775 0 1.626.365 2.874 1.096 3.746.751.853 1.808 1.279 3.171 1.279.79 0 1.482-.149 2.075-.446a2.743 2.743 0 001.303-1.368h3.527c-.494 1.427-1.334 2.557-2.519 3.39-1.165.832-2.637 1.248-4.415 1.248zM41.9 22.703V1.297h3.734v21.406H41.9zM56.385 23c-1.6 0-3.003-.337-4.209-1.01a7.27 7.27 0 01-2.785-2.795c-.652-1.19-.978-2.557-.978-4.103 0-1.546.326-2.904.978-4.073a7.062 7.062 0 012.785-2.765c1.186-.674 2.569-1.01 4.15-1.01 1.5 0 2.805.316 3.91.95a6.436 6.436 0 012.58 2.617c.612 1.13.918 2.448.918 3.954a8.821 8.821 0 01-.119 1.486h-12.89v-2.616H60.74l-.77.714c0-1.427-.327-2.498-.979-3.211-.652-.714-1.56-1.07-2.726-1.07-1.264 0-2.272.436-3.023 1.308-.73.872-1.096 2.13-1.096 3.775 0 1.626.365 2.874 1.096 3.746.75.853 1.808 1.279 3.171 1.279.79 0 1.482-.149 2.075-.446a2.743 2.743 0 001.303-1.368h3.527c-.494 1.427-1.334 2.557-2.519 3.39-1.166.832-2.637 1.248-4.415 1.248zM72.394 23c-2.095 0-3.764-.436-5.009-1.308-1.244-.892-1.926-2.12-2.044-3.687h3.408c.098.773.464 1.358 1.096 1.755.632.396 1.482.594 2.549.594.968 0 1.689-.149 2.163-.446.494-.317.74-.763.74-1.338 0-.416-.138-.753-.414-1.01-.277-.278-.8-.506-1.57-.684l-2.43-.565c-1.66-.357-2.895-.912-3.705-1.665-.79-.773-1.185-1.734-1.185-2.884 0-1.407.533-2.507 1.6-3.3 1.086-.812 2.578-1.219 4.475-1.219 1.877 0 3.378.407 4.504 1.22 1.146.792 1.778 1.892 1.897 3.3H75.06a1.904 1.904 0 00-.949-1.398c-.513-.317-1.224-.476-2.133-.476-.85 0-1.492.139-1.927.416-.434.258-.652.645-.652 1.16 0 .396.168.733.504 1.01.336.258.9.486 1.69.684l2.607.595c1.482.337 2.598.922 3.349 1.754a4.19 4.19 0 011.156 2.943c0 1.447-.553 2.567-1.66 3.36C75.94 22.604 74.39 23 72.394 23zM88.016 23c-1.857 0-3.23-.436-4.12-1.308-.869-.892-1.303-2.22-1.303-3.984V4.092l3.763-1.397v15.102c0 .734.198 1.279.593 1.635.395.357 1.017.536 1.867.536.336 0 .632-.02.889-.06.277-.06.533-.129.77-.208v2.913c-.237.12-.572.209-1.007.268-.435.08-.919.119-1.452.119zm-8.328-12.516V7.54h10.787v2.943H79.69zM99.68 23c-1.6 0-3.012-.337-4.237-1.01a7.213 7.213 0 01-2.815-2.795c-.672-1.21-1.008-2.587-1.008-4.133 0-1.546.336-2.903 1.008-4.073a7.067 7.067 0 012.815-2.735c1.225-.674 2.638-1.01 4.238-1.01 1.62 0 3.032.336 4.237 1.01a7.065 7.065 0 012.816 2.735c.671 1.17 1.007 2.527 1.007 4.073 0 1.546-.345 2.924-1.037 4.133a7.215 7.215 0 01-2.815 2.794c-1.205.674-2.608 1.011-4.208 1.011zm0-3.003c.791 0 1.502-.198 2.134-.594.633-.416 1.127-.991 1.482-1.725.356-.753.534-1.635.534-2.646 0-1.486-.396-2.655-1.186-3.508-.77-.852-1.758-1.278-2.963-1.278s-2.203.426-2.993 1.278c-.79.853-1.186 2.022-1.186 3.508 0 1.011.178 1.893.534 2.646.375.734.869 1.308 1.481 1.725.633.396 1.354.594 2.164.594zM108.406 22.703l7.853-21.406h3.319l-7.379 21.406h-3.793zm16.092 0l-7.35-21.406h3.497l7.824 21.406h-3.971zm-12.032-8.414h11.676v3.092h-11.676V14.29zM131.148 22.703V1.297H135v21.406h-3.852z"></path></g></g></g></svg>',claude:'<svg fill="none" viewBox="0 0 5.9773 1" data-combine-word="Claude" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6591 -0.0000) scale(0.045455)"><g fill="currentColor" fill-rule="nonzero"><path d="M13.623 20.222c-3.417 0-5.753-1.901-6.855-4.827a12.992 12.992 0 01-.838-4.772c0-4.907 2.206-8.315 7.08-8.315 3.275 0 5.297 1.425 6.448 4.826h1.402l-.19-4.69C18.709 1.18 16.258.543 13.276.543c-4.2 0-7.775 1.874-9.763 5.254a11.357 11.357 0 00-1.511 5.872c0 3.753 1.777 7.08 5.113 8.926a11.95 11.95 0 005.943 1.398c3.254 0 5.835-.617 8.122-1.697l.593-5.172h-1.43c-.858 2.362-1.88 3.78-3.574 4.534-.831.373-1.88.564-3.146.564zm14.74-17.914L28.499 0h-.967L23.23 1.29v.699l1.907.882v16.142c0 1.1-.565 1.344-2.043 1.528v1.18h7.319v-1.18c-1.484-.184-2.042-.428-2.042-1.528V2.315l-.007-.007zm29.104 19.685h.565l4.95-.937v-1.208l-.695-.054c-1.157-.109-1.457-.346-1.457-1.29V9.897l.137-2.763h-.783l-4.678.672v1.181l.457.082c1.266.183 1.64.536 1.64 1.419v7.67c-1.212.937-2.369 1.527-3.744 1.527-1.525 0-2.471-.774-2.471-2.58V9.905l.136-2.763h-.804l-4.684.672v1.181l.484.082c1.266.183 1.64.536 1.64 1.418v7.08c0 3 1.703 4.426 4.412 4.426 2.07 0 3.765-1.1 5.038-2.627L57.474 22l-.007-.007zm-13.602-9.55c0-3.836-2.043-5.309-5.733-5.309-3.254 0-5.616 1.344-5.616 3.57 0 .666.238 1.175.721 1.528l2.478-.326c-.109-.746-.163-1.201-.163-1.391 0-1.263.674-1.901 2.042-1.901 2.022 0 3.044 1.419 3.044 3.7v.746l-5.106 1.527c-1.702.462-2.67.863-3.316 1.8a3.386 3.386 0 00-.476 1.9c0 2.172 1.497 3.706 4.057 3.706 1.852 0 3.493-.835 4.922-2.416.51 1.581 1.294 2.416 2.69 2.416 1.13 0 2.15-.455 3.063-1.344l-.272-.937a4.363 4.363 0 01-1.178.163c-.783 0-1.157-.617-1.157-1.826v-5.607zm-6.536 7.378c-1.396 0-2.26-.808-2.26-2.226 0-.964.456-1.528 1.43-1.854l4.139-1.31v3.965c-1.321.997-2.097 1.425-3.31 1.425zm43.095 1.235v-1.208l-.701-.054c-1.158-.109-1.45-.346-1.45-1.29V2.308L78.409 0h-.974l-4.302 1.29v.699l1.906.882V8.18a6.024 6.024 0 00-3.656-1.046c-4.276 0-7.612 3.245-7.612 8.098 0 3.998 2.397 6.761 6.346 6.761 2.042 0 3.819-.99 4.922-2.525l-.136 2.525h.571l4.95-.937zm-8.96-12.313c2.043 0 3.575 1.181 3.575 3.353v6.11a4.91 4.91 0 01-3.547 1.425c-2.928 0-4.412-2.308-4.412-5.39 0-3.462 1.695-5.498 4.385-5.498zm19.424 3.055c-.381-1.792-1.484-2.81-3.016-2.81-2.288 0-3.874 1.717-3.874 4.18 0 3.646 1.934 6.008 5.059 6.008a5.858 5.858 0 005.03-2.953l.913.245c-.408 3.163-3.281 5.525-6.808 5.525-4.14 0-6.992-3.054-6.992-7.399 0-4.378 3.098-7.46 7.237-7.46 3.09 0 5.27 1.853 5.97 5.07l-10.783 3.3V14.05l7.264-2.247v-.006z"></path></g></g></g></svg>',cohere:'<svg fill="none" viewBox="0 0 6.2957 1" data-combine-word="Cohere" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g><path clip-rule="evenodd" d="M8.128 14.099c.592 0 1.77-.033 3.398-.703 1.897-.781 5.672-2.2 8.395-3.656 1.905-1.018 2.74-2.366 2.74-4.18A4.56 4.56 0 0018.1 1H7.549A6.55 6.55 0 001 7.55c0 3.617 2.745 6.549 7.128 6.549z" fill="#39594D" fill-rule="evenodd"></path><path clip-rule="evenodd" d="M9.912 18.61a4.387 4.387 0 012.705-4.052l3.323-1.38c3.361-1.394 7.06 1.076 7.06 4.715a5.104 5.104 0 01-5.105 5.104l-3.597-.001a4.386 4.386 0 01-4.386-4.387z" fill="#D18EE2" fill-rule="evenodd"></path><path d="M4.776 14.962A3.775 3.775 0 001 18.738v.489a3.776 3.776 0 007.551 0v-.49a3.775 3.775 0 00-3.775-3.775z" fill="#FF7759"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M8.128 14.099c.592 0 1.77-.033 3.398-.703 1.897-.781 5.672-2.2 8.395-3.656 1.905-1.018 2.74-2.366 2.74-4.18A4.56 4.56 0 0018.1 1H7.549A6.55 6.55 0 001 7.55c0 3.617 2.745 6.549 7.128 6.549z"></path><path clip-rule="evenodd" d="M9.912 18.61a4.387 4.387 0 012.705-4.052l3.323-1.38c3.361-1.394 7.06 1.076 7.06 4.715a5.104 5.104 0 01-5.105 5.104l-3.597-.001a4.386 4.386 0 01-4.386-4.387z"></path><path d="M4.776 14.962A3.775 3.775 0 001 18.738v.489a3.776 3.776 0 007.551 0v-.49a3.775 3.775 0 00-3.775-3.775z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.5339 -0.0476) scale(0.047619)"><g fill="currentColor" fill-rule="evenodd"><path d="M9.589 21.996c3.12 0 5.85-1.56 6.929-4.709.21-.63-.091-1.05-.69-1.05h-1.17c-.54 0-.9.24-1.141.75-.93 1.83-2.22 2.488-3.839 2.488-2.88 0-4.65-2.01-4.65-5.369 0-3.358 1.831-5.369 4.589-5.369 1.68 0 3.06.72 3.93 2.43.27.51.598.749 1.14.749h1.17c.6 0 .9-.39.69-.96-1.259-3.42-4.08-4.74-6.958-4.74C5.24 6.217 2 9.428 2 14.107c0 4.68 3.09 7.89 7.589 7.89zm78.496-9.27c.389-2.55 2.129-4.14 4.499-4.14 2.37 0 4.14 1.62 4.349 4.14h-8.848zm4.62 9.27c2.76 0 5.519-1.29 6.869-4.199.33-.69.03-1.17-.57-1.17h-1.109c-.539 0-.87.239-1.14.72-.9 1.589-2.46 2.249-4.048 2.249-2.73 0-4.5-1.86-4.71-4.889h11.01c.6 0 .99-.33.99-.96-.12-4.71-3.178-7.528-7.409-7.528-4.23 0-7.589 3.06-7.589 7.89 0 4.829 3.27 7.889 7.71 7.889l-.005-.002zm-17.458-7.498h.99c.6 0 .93-.33 1.02-.961.572-4.053 2.944-4.59 5.467-4.47.54.026.982-.39.982-.93v-.93c0-.599-.3-.96-.9-.99-2.232-.085-4.224.681-5.375 2.85-.063.119-.241.087-.256-.046l-.186-1.636c-.06-.599-.39-.9-.99-.9h-4.53c-.529 0-.96.43-.96.961v.51c0 .53.43.961.96.961h1.86c.53 0 .962.43.962.96v3.66c0 .529.43.96.96.96h-.004zm-4.048 7.2h9.387c.6 0 .961-.36.961-.962v-.51c0-.598-.36-.96-.96-.96h-2.4c-.6 0-.961-.36-.961-.961v-1.65c0-.6-.36-.962-.961-.962h-1.02c-.599 0-.96.36-.96.961v1.651c0 .599-.36.96-.962.96h-2.129c-.599 0-.96.36-.96.962v.51c0 .599.36.96.96.96h.005zm-14.489-8.97c.39-2.55 2.13-4.139 4.5-4.139s4.14 1.619 4.349 4.14H56.71zm4.62 9.27c2.76 0 5.52-1.289 6.87-4.199.33-.69.03-1.17-.57-1.17h-1.108c-.54 0-.87.239-1.141.72-.9 1.589-2.46 2.249-4.049 2.249-2.73 0-4.499-1.86-4.708-4.889h11.009c.599 0 .99-.33.99-.96-.12-4.71-3.178-7.528-7.41-7.528-4.23 0-7.588 3.06-7.588 7.89 0 4.829 3.27 7.889 7.71 7.889l-.005-.002zm-34.703 0c4.5 0 7.71-3.33 7.71-7.89s-3.21-7.89-7.71-7.89c-4.499 0-7.71 3.391-7.71 7.89 0 1.05.18 2.22.72 3.51.271.63.781.719 1.32.33l.87-.631c.451-.33.57-.72.42-1.29-.24-.748-.301-1.409-.301-1.978 0-3.149 1.89-5.31 4.68-5.31 2.788 0 4.678 2.13 4.678 5.37s-1.86 5.368-4.62 5.368c-.96 0-1.86-.18-2.94-.99-.45-.36-.869-.42-1.35-.06l-.66.481c-.54.39-.598.93-.09 1.35 1.56 1.26 3.358 1.74 4.98 1.74h.003zm11.517-.3h.99c.53 0 .962-.43.962-.962V13.57c0-3.029 1.618-4.83 4.139-4.83 2.28 0 3.6 1.5 3.6 4.26v7.74c0 .529.43.96.96.96h1.02c.53 0 .961-.43.961-.96v-8.22c0-4.048-2.07-6.298-5.578-6.298-2.39 0-3.801.978-4.855 2.338a.136.136 0 01-.243-.082V1.96A.97.97 0 0039.135 1h-.99c-.53 0-.962.43-.962.96v18.777c0 .529.43.96.961.96z"></path></g></g></g></svg>',deepseek:'<svg fill="none" viewBox="0 0 8.2825 1" data-combine-word="DeepSeek" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6469 -0.0000) scale(0.051546)"><g fill="currentColor" fill-rule="evenodd"><path d="M117.986 0h-3.21v19.404h3.21V0zM8.7 5.215h1.83v2.838H8.7c-1.135 0-2.28.282-3.019 1.068-.738.785-1.016 1.99-1.016 3.194s.267 2.408 1.016 3.193c.75.786 1.884 1.068 3.018 1.068 1.135 0 2.28-.282 3.018-1.068.739-.785 1.017-1.99 1.017-3.193V.649h3.21v18.755h-3.21V18.21h-.589a3.498 3.498 0 01-.192.199c-.803.733-2.034.995-3.243.995-1.894 0-3.788-.472-5.03-1.78C2.44 16.314 2 14.303 2 12.303c0-2 .45-4 1.68-5.32 1.242-1.308 3.136-1.77 5.02-1.77zM57.564 18.9h-1.83v-2.837h1.83c1.134 0 2.28-.283 3.017-1.068.739-.785 1.017-1.99 1.017-3.194s-.267-2.408-1.017-3.194c-.749-.785-1.883-1.068-3.017-1.068s-2.28.283-3.018 1.068c-.738.786-1.017 1.99-1.017 3.194v11.655h-3.21V4.712h3.21v1.194h.59a3.42 3.42 0 01.186-.194l.005-.005c.803-.733 2.034-.995 3.243-.995 1.895 0 3.788.471 5.03 1.78 1.241 1.31 1.68 3.32 1.68 5.32 0 2-.45 4-1.68 5.319-1.23 1.32-3.135 1.77-5.019 1.77zM32.05 13.204v-1.14c0-2.064-.46-4.137-1.754-5.498-1.285-1.362-3.264-1.843-5.223-1.843-1.958 0-3.928.492-5.222 1.843-1.295 1.35-1.755 3.434-1.755 5.497 0 2.063.47 4.136 1.755 5.498 1.284 1.36 3.264 1.843 5.222 1.843 1.959 0 3.938-.493 5.223-1.843.663-.692 1.102-1.582 1.38-2.566h-3.168a5.026 5.026 0 01-.3.367c-.77.816-1.958 1.11-3.135 1.11-1.177 0-2.365-.304-3.136-1.11-.77-.807-1.048-2.063-1.048-3.299 0-1.236.278-2.482 1.049-3.298.77-.817 1.958-1.11 3.135-1.11 1.177 0 2.365.293 3.136 1.11.535.565.834 1.34.963 2.167H23.5v2.272h8.55zM48.168 12.063v1.141h-8.55v-2.272h5.671c-.129-.827-.428-1.602-.963-2.167-.77-.817-1.959-1.11-3.136-1.11s-2.365.293-3.136 1.11c-.77.816-1.049 2.063-1.049 3.298 0 1.236.279 2.492 1.05 3.299.77.806 1.958 1.11 3.135 1.11 1.177 0 2.365-.294 3.136-1.11.107-.116.203-.241.299-.367h3.168c-.278.985-.717 1.874-1.38 2.566-1.285 1.35-3.264 1.843-5.223 1.843s-3.938-.482-5.222-1.843c-1.285-1.362-1.756-3.435-1.756-5.498s.46-4.147 1.755-5.497c1.296-1.351 3.264-1.843 5.223-1.843s3.938.481 5.222 1.843c1.296 1.36 1.756 3.434 1.756 5.497zM78.635 18.315c-1.284.806-3.263 1.089-5.222 1.089-1.958 0-3.917-.294-5.212-1.09-1.295-.795-1.755-2.03-1.755-3.246h3.767c0 .472.225.953.824 1.257.6.304 1.54.419 2.462.419.92 0 1.851-.115 2.46-.42.611-.303.825-.784.825-1.256 0-.47-.214-.952-.824-1.256-.61-.304-1.627-.419-2.547-.419-1.777 0-3.563-.293-4.73-1.09-1.167-.795-1.584-2.03-1.584-3.245 0-1.215.417-2.44 1.584-3.246 1.167-.807 2.953-1.09 4.73-1.09 1.776 0 3.564.294 4.73 1.09 1.167.795 1.584 2.031 1.584 3.246h-3.264c0-.471-.203-.942-.749-1.257-.546-.303-1.391-.419-2.226-.419s-1.68.105-2.226.42c-.556.303-.75.785-.75 1.256 0 .47.204.942.75 1.256.545.304 1.316.42 2.151.42 1.959 0 3.938.292 5.222 1.088 1.295.796 1.756 2.032 1.756 3.246 0 1.215-.471 2.44-1.756 3.247zM96.507 12.063v1.141h-8.55v-2.272h5.672c-.129-.827-.429-1.602-.963-2.167-.771-.817-1.959-1.11-3.136-1.11s-2.366.293-3.136 1.11c-.77.816-1.048 2.063-1.048 3.298 0 1.236.278 2.492 1.048 3.299.77.806 1.959 1.11 3.135 1.11 1.178 0 2.366-.294 3.137-1.11.106-.116.203-.241.3-.367h3.167c-.279.985-.717 1.874-1.38 2.566-1.284 1.35-3.265 1.843-5.224 1.843-1.957 0-3.938-.482-5.222-1.843-1.284-1.362-1.754-3.435-1.754-5.498s.46-4.147 1.754-5.497c1.296-1.351 3.265-1.843 5.222-1.843 1.96 0 3.94.481 5.224 1.843 1.294 1.36 1.754 3.434 1.754 5.497zM112.624 13.204v-1.14c0-2.064-.46-4.137-1.754-5.498-1.285-1.362-3.265-1.843-5.223-1.843-1.959 0-3.928.492-5.222 1.843-1.296 1.35-1.756 3.434-1.756 5.497 0 2.063.471 4.136 1.756 5.498 1.284 1.36 3.263 1.843 5.222 1.843 1.958 0 3.938-.493 5.223-1.843.663-.692 1.102-1.582 1.38-2.566h-3.168l-.012.016c-.093.12-.185.24-.288.35-.77.817-1.957 1.11-3.135 1.11-1.177 0-2.365-.303-3.136-1.11-.77-.806-1.049-2.062-1.049-3.298 0-1.236.279-2.482 1.049-3.298.771-.817 1.959-1.11 3.136-1.11 1.178 0 2.365.293 3.135 1.11.536.565.836 1.34.964 2.167h-5.672v2.272h8.55zM128.73 19.404l-5.264-7.78 5.264-6.252h-3.97l-5.265 6.251 5.265 7.78h3.97z"></path></g></g></g></svg>',gemini:'<svg fill="none" viewBox="0 0 5.6291 1" data-combine-word="Gemini" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-0-_R_0_" x1="7" x2="11" y1="15.5" y2="12"><stop stop-color="#08B962"></stop><stop offset="1" stop-color="#08B962" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-1-_R_0_" x1="8" x2="11.5" y1="5.5" y2="11"><stop stop-color="#F94543"></stop><stop offset="1" stop-color="#F94543" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-2-_R_0_" x1="3.5" x2="17.5" y1="13.5" y2="12"><stop stop-color="#FABC12"></stop><stop offset=".46" stop-color="#FABC12" stop-opacity="0"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"></path><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-0-_R_0_)"></path><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-1-_R_0_)"></path><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-2-_R_0_)"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-0-_R_0_" x1="7" x2="11" y1="15.5" y2="12"><stop stop-color="#08B962"></stop><stop offset="1" stop-color="#08B962" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-1-_R_0_" x1="8" x2="11.5" y1="5.5" y2="11"><stop stop-color="#F94543"></stop><stop offset="1" stop-color="#F94543" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-2-_R_0_" x1="3.5" x2="17.5" y1="13.5" y2="12"><stop stop-color="#FABC12"></stop><stop offset=".46" stop-color="#FABC12" stop-opacity="0"></stop></linearGradient></defs></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.5265 -0.1026) scale(0.051282)"><g fill="currentColor" fill-rule="evenodd"><path d="M21.186 12.67c0 2.649-.786 4.759-2.359 6.33-1.766 1.87-4.09 2.806-6.969 2.806-2.756 0-5.088-.953-6.996-2.86C2.954 17.04 2 14.693 2 11.904c0-2.789.954-5.137 2.862-7.043C6.77 2.953 9.102 2 11.858 2c1.396 0 2.712.247 3.949.741 1.236.495 2.252 1.192 3.047 2.092l-1.749 1.748c-.583-.706-1.338-1.258-2.266-1.655a7.49 7.49 0 00-2.981-.596c-2.067 0-3.816.715-5.247 2.145-1.413 1.448-2.12 3.257-2.12 5.428s.707 3.98 2.12 5.428c1.431 1.43 3.18 2.145 5.247 2.145 1.89 0 3.463-.53 4.717-1.588 1.254-1.06 1.979-2.516 2.173-4.37h-6.89v-2.277h9.196c.088.495.132.971.132 1.43m7.652-4.633c1.946 0 3.494.629 4.645 1.886 1.15 1.257 1.726 3.018 1.726 5.282l-.027.268H24.877c.036 1.284.464 2.318 1.285 3.102.82.785 1.802 1.177 2.944 1.177 1.57 0 2.802-.784 3.694-2.354l2.195 1.07a6.54 6.54 0 01-2.45 2.595C31.503 21.688 30.32 22 29 22c-1.927 0-3.516-.66-4.765-1.98-1.249-1.319-1.873-2.986-1.873-5.001 0-1.997.606-3.66 1.82-4.988 1.213-1.329 2.766-1.993 4.657-1.993m-.053 2.247c-.928 0-1.727.285-2.396.856-.67.57-1.11 1.337-1.325 2.3h7.522c-.071-.91-.442-1.663-1.111-2.26-.67-.598-1.566-.896-2.69-.896M39.247 21.53h-2.455V8.465h2.348v1.813h.107c.374-.64.947-1.173 1.721-1.6.774-.427 1.544-.64 2.309-.64.96 0 1.806.222 2.535.667a3.931 3.931 0 011.601 1.84c1.085-1.671 2.589-2.507 4.51-2.507 1.513 0 2.678.462 3.496 1.387.819.924 1.228 2.24 1.228 3.946v8.16h-2.455v-7.786c0-1.227-.223-2.112-.668-2.654-.444-.542-1.192-.813-2.241-.813-.943 0-1.735.4-2.375 1.2-.64.8-.961 1.742-.961 2.826v7.227h-2.455v-7.786c0-1.227-.223-2.112-.668-2.654-.444-.542-1.191-.813-2.241-.813-.943 0-1.735.4-2.375 1.2-.64.8-.961 1.742-.961 2.826v7.227zM61.911 3.93c0 .48-.17.89-.508 1.228a1.675 1.675 0 01-1.23.508c-.48 0-.89-.17-1.229-.508a1.673 1.673 0 01-.508-1.228c0-.481.17-.89.508-1.229a1.675 1.675 0 011.23-.508c.48 0 .89.17 1.23.508.338.338.507.748.507 1.228m-.11 4.514v13.088h-2.857V8.443h2.857zM80 3.93c0 .48-.17.89-.508 1.228a1.675 1.675 0 01-1.23.508c-.48 0-.89-.17-1.229-.508a1.673 1.673 0 01-.508-1.228c0-.481.17-.89.508-1.229a1.675 1.675 0 011.23-.508c.48 0 .89.17 1.23.508.338.338.507.748.507 1.228m-.11 4.514v13.088h-2.857V8.443h2.857zm-16.343.022h2.349v1.813h.107c.373-.64.947-1.173 1.721-1.6a4.935 4.935 0 012.415-.64c1.601 0 2.833.458 3.696 1.373.863.916 1.294 2.218 1.294 3.907v8.213h-2.455v-8.053c-.053-2.133-1.13-3.2-3.229-3.2-.978 0-1.797.395-2.455 1.187-.658.79-.987 1.737-.987 2.84v7.226h-2.456V8.465z"></path></g></g></g></svg>',gemma:'<svg fill="none" viewBox="0 0 6.2500 1" data-combine-word="Gemma" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lobe-icons-gemma-_R_0_" x1="24.419%" x2="75.194%" y1="75.581%" y2="25.194%"><stop offset="0%" stop-color="#446EFF"></stop><stop offset="36.661%" stop-color="#2E96FF"></stop><stop offset="83.221%" stop-color="#B1C5FF"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><defs><linearGradient id="lobe-icons-gemma-_R_0_" x1="24.419%" x2="75.194%" y1="75.581%" y2="25.194%"><stop offset="0%" stop-color="#446EFF"></stop><stop offset="36.661%" stop-color="#2E96FF"></stop><stop offset="83.221%" stop-color="#B1C5FF"></stop></linearGradient></defs><path d="M12.34 5.953a8.233 8.233 0 01-.247-1.125V3.72a8.25 8.25 0 015.562 2.232H12.34zm-.69 0c.113-.373.199-.755.257-1.145V3.72a8.25 8.25 0 00-5.562 2.232h5.304zm-5.433.187h5.373a7.98 7.98 0 01-.267.696 8.41 8.41 0 01-1.76 2.65L6.216 6.14zm-.264-.187H2.977v.187h2.915a8.436 8.436 0 00-2.357 5.767H0v.186h3.535a8.436 8.436 0 002.357 5.767H2.977v.186h2.976v2.977h.187v-2.915a8.436 8.436 0 005.767 2.357V24h.186v-3.535a8.436 8.436 0 005.767-2.357v2.915h.186v-2.977h2.977v-.186h-2.915a8.436 8.436 0 002.357-5.767H24v-.186h-3.535a8.436 8.436 0 00-2.357-5.767h2.915v-.187h-2.977V2.977h-.186v2.915a8.436 8.436 0 00-5.767-2.357V0h-.186v3.535A8.436 8.436 0 006.14 5.892V2.977h-.187v2.976zm6.14 14.326a8.25 8.25 0 005.562-2.233H12.34c-.108.367-.19.743-.247 1.126v1.107zm-.186-1.087a8.015 8.015 0 00-.258-1.146H6.345a8.25 8.25 0 005.562 2.233v-1.087zm-8.186-7.285h1.107a8.23 8.23 0 001.125-.247V6.345a8.25 8.25 0 00-2.232 5.562zm1.087.186H3.72a8.25 8.25 0 002.232 5.562v-5.304a8.012 8.012 0 00-1.145-.258zm15.47-.186a8.25 8.25 0 00-2.232-5.562v5.315c.367.108.743.19 1.126.247h1.107zm-1.086.186c-.39.058-.772.144-1.146.258v5.304a8.25 8.25 0 002.233-5.562h-1.087zm-1.332 5.69V12.41a7.97 7.97 0 00-.696.267 8.409 8.409 0 00-2.65 1.76l3.346 3.346zm0-6.18v-5.45l-.012-.013h-5.451c.076.235.162.468.26.696a8.698 8.698 0 001.819 2.688 8.698 8.698 0 002.688 1.82c.228.097.46.183.696.259zM6.14 17.848V12.41c.235.078.468.167.696.267a8.403 8.403 0 012.688 1.799 8.404 8.404 0 011.799 2.688c.1.228.19.46.267.696H6.152l-.012-.012zm0-6.245V6.326l3.29 3.29a8.716 8.716 0 01-2.594 1.728 8.14 8.14 0 01-.696.259zm6.257 6.257h5.277l-3.29-3.29a8.716 8.716 0 00-1.728 2.594 8.135 8.135 0 00-.259.696zm-2.347-7.81a9.435 9.435 0 01-2.88 1.96 9.14 9.14 0 012.88 1.94 9.14 9.14 0 011.94 2.88 9.435 9.435 0 011.96-2.88 9.14 9.14 0 012.88-1.94 9.435 9.435 0 01-2.88-1.96 9.434 9.434 0 01-1.96-2.88 9.14 9.14 0 01-1.94 2.88z" fill="url(#lobe-icons-gemma-_R_0_)" fill-rule="evenodd"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M12.34 5.953a8.233 8.233 0 01-.247-1.125V3.72a8.25 8.25 0 015.562 2.232H12.34zm-.69 0c.113-.373.199-.755.257-1.145V3.72a8.25 8.25 0 00-5.562 2.232h5.304zm-5.433.187h5.373a7.98 7.98 0 01-.267.696 8.41 8.41 0 01-1.76 2.65L6.216 6.14zm-.264-.187H2.977v.187h2.915a8.436 8.436 0 00-2.357 5.767H0v.186h3.535a8.436 8.436 0 002.357 5.767H2.977v.186h2.976v2.977h.187v-2.915a8.436 8.436 0 005.767 2.357V24h.186v-3.535a8.436 8.436 0 005.767-2.357v2.915h.186v-2.977h2.977v-.186h-2.915a8.436 8.436 0 002.357-5.767H24v-.186h-3.535a8.436 8.436 0 00-2.357-5.767h2.915v-.187h-2.977V2.977h-.186v2.915a8.436 8.436 0 00-5.767-2.357V0h-.186v3.535A8.436 8.436 0 006.14 5.892V2.977h-.187v2.976zm6.14 14.326a8.25 8.25 0 005.562-2.233H12.34c-.108.367-.19.743-.247 1.126v1.107zm-.186-1.087a8.015 8.015 0 00-.258-1.146H6.345a8.25 8.25 0 005.562 2.233v-1.087zm-8.186-7.285h1.107a8.23 8.23 0 001.125-.247V6.345a8.25 8.25 0 00-2.232 5.562zm1.087.186H3.72a8.25 8.25 0 002.232 5.562v-5.304a8.012 8.012 0 00-1.145-.258zm15.47-.186a8.25 8.25 0 00-2.232-5.562v5.315c.367.108.743.19 1.126.247h1.107zm-1.086.186c-.39.058-.772.144-1.146.258v5.304a8.25 8.25 0 002.233-5.562h-1.087zm-1.332 5.69V12.41a7.97 7.97 0 00-.696.267 8.409 8.409 0 00-2.65 1.76l3.346 3.346zm0-6.18v-5.45l-.012-.013h-5.451c.076.235.162.468.26.696a8.698 8.698 0 001.819 2.688 8.698 8.698 0 002.688 1.82c.228.097.46.183.696.259zM6.14 17.848V12.41c.235.078.468.167.696.267a8.403 8.403 0 012.688 1.799 8.404 8.404 0 011.799 2.688c.1.228.19.46.267.696H6.152l-.012-.012zm0-6.245V6.326l3.29 3.29a8.716 8.716 0 01-2.594 1.728 8.14 8.14 0 01-.696.259zm6.257 6.257h5.277l-3.29-3.29a8.716 8.716 0 00-1.728 2.594 8.135 8.135 0 00-.259.696zm-2.347-7.81a9.435 9.435 0 01-2.88 1.96 9.14 9.14 0 012.88 1.94 9.14 9.14 0 011.94 2.88 9.435 9.435 0 011.96-2.88 9.14 9.14 0 012.88-1.94 9.435 9.435 0 01-2.88-1.96 9.434 9.434 0 01-1.96-2.88 9.14 9.14 0 01-1.94 2.88z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6591 -0.0000) scale(0.045455)"><g fill="currentColor" fill-rule="evenodd"><path d="M12.914 22c-1.98 0-3.804-.48-5.472-1.441a10.717 10.717 0 01-3.971-3.97C2.49 14.901 2 13.038 2 11c0-2.04.49-3.902 1.47-5.588a10.717 10.717 0 013.972-3.97C9.11.48 10.934 0 12.914 0c1.55 0 3.006.275 4.37.824 1.362.549 2.485 1.323 3.368 2.323l-1.795 1.794c-.667-.823-1.52-1.456-2.56-1.897a8.494 8.494 0 00-3.353-.662c-1.49 0-2.878.358-4.163 1.074-1.285.716-2.314 1.725-3.089 3.03C4.917 7.788 4.53 9.293 4.53 11c0 1.706.387 3.21 1.162 4.515a8.144 8.144 0 003.104 3.03 8.44 8.44 0 004.148 1.073c1.412 0 2.594-.22 3.545-.662a7.943 7.943 0 002.456-1.75 6.43 6.43 0 001.236-1.985c.314-.775.51-1.633.588-2.574h-7.796v-2.323h10.12c.098.549.147 1.058.147 1.529 0 1.294-.205 2.554-.617 3.78a8.347 8.347 0 01-1.971 3.22C18.71 20.95 16.13 22 12.914 22zm18.727 0c-1.432 0-2.716-.343-3.854-1.03a7.143 7.143 0 01-2.662-2.838c-.638-1.206-.957-2.563-.957-4.073 0-1.451.3-2.784.898-4a7.26 7.26 0 012.545-2.912c1.098-.725 2.373-1.088 3.824-1.088 1.47 0 2.746.328 3.824.985a6.54 6.54 0 012.486 2.72c.579 1.158.868 2.481.868 3.971 0 .294-.03.55-.088.765H26.669c.059 1.137.334 2.098.824 2.882.49.785 1.113 1.373 1.868 1.765a5.072 5.072 0 002.368.588c1.922 0 3.403-.902 4.442-2.706l2.119 1.03c-.648 1.216-1.525 2.176-2.633 2.882C34.548 21.647 33.21 22 31.64 22zm4.324-9.559a4.868 4.868 0 00-.53-1.882c-.313-.628-.808-1.157-1.485-1.588-.676-.432-1.525-.647-2.544-.647-1.177 0-2.173.377-2.986 1.132-.814.755-1.349 1.75-1.604 2.985h9.15zm4.223-5.912h2.383v2.206h.118c.432-.764 1.079-1.402 1.942-1.911a5.296 5.296 0 012.736-.765c1.098 0 2.054.265 2.868.794a4.446 4.446 0 011.75 2.118 6.125 6.125 0 012.104-2.118c.873-.53 1.888-.794 3.045-.794 1.726 0 3.025.524 3.898 1.573.872 1.05 1.309 2.476 1.309 4.28v9.617H59.87v-9.235c0-1.392-.285-2.402-.853-3.03-.57-.627-1.413-.94-2.53-.94-.746 0-1.422.215-2.03.647-.608.431-1.084 1.01-1.427 1.735a5.432 5.432 0 00-.515 2.353v8.47h-2.5v-9.205c0-1.412-.285-2.432-.854-3.06-.569-.627-1.402-.94-2.5-.94-.746 0-1.422.22-2.03.661-.608.441-1.084 1.03-1.427 1.765a5.528 5.528 0 00-.515 2.368v8.411h-2.5v-15zm24.405 0h2.383v2.206h.117c.432-.764 1.08-1.402 1.942-1.911a5.296 5.296 0 012.736-.765c1.098 0 2.054.265 2.868.794a4.446 4.446 0 011.75 2.118 6.125 6.125 0 012.104-2.118c.873-.53 1.888-.794 3.045-.794 1.726 0 3.025.524 3.898 1.573.873 1.05 1.31 2.476 1.31 4.28v9.617h-2.472v-9.235c0-1.392-.284-2.402-.853-3.03-.569-.627-1.412-.94-2.53-.94-.745 0-1.422.215-2.03.647-.608.431-1.084 1.01-1.427 1.735a5.432 5.432 0 00-.515 2.353v8.47h-2.5v-9.205c0-1.412-.285-2.432-.853-3.06-.57-.627-1.403-.94-2.501-.94-.745 0-1.422.22-2.03.661-.608.441-1.084 1.03-1.427 1.765a5.528 5.528 0 00-.515 2.368v8.411h-2.5v-15zM93.645 22c-1.098 0-2.079-.216-2.942-.647-.863-.431-1.53-1.025-2-1.78-.47-.754-.706-1.612-.706-2.573 0-1.588.598-2.828 1.794-3.72 1.197-.893 2.707-1.339 4.53-1.339.903 0 1.742.098 2.516.294.775.196 1.368.422 1.78.677V12c0-1.118-.392-2.015-1.177-2.691-.784-.677-1.775-1.015-2.971-1.015a5.01 5.01 0 00-2.324.544 4.246 4.246 0 00-1.677 1.515L88.585 8.94c.589-.902 1.398-1.608 2.427-2.117 1.03-.51 2.172-.765 3.428-.765 2.04 0 3.643.534 4.81 1.603 1.167 1.068 1.75 2.524 1.75 4.367v9.5h-2.383v-2.147H98.5c-.431.726-1.078 1.343-1.941 1.853S94.724 22 93.645 22zm.236-2.206c.843 0 1.627-.216 2.353-.647a4.905 4.905 0 001.736-1.735c.431-.726.647-1.52.647-2.383-.47-.313-1.05-.568-1.736-.764a7.89 7.89 0 00-2.177-.294c-1.373 0-2.407.284-3.103.853-.697.568-1.045 1.303-1.045 2.205 0 .824.314 1.49.942 2 .627.51 1.422.765 2.383.765z"></path></g></g></g></svg>',grok:'<svg fill="none" viewBox="0 0 4.6799 1" data-combine-word="Grok" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6500 -0.1000) scale(0.050000)"><g fill="currentColor" fill-rule="evenodd"><path d="M47.419 21.645V2.457h3.033V15.12l6.415-7.369h3.678l-5.772 6.316 5.825 7.578h-3.624l-4.717-6.512-1.805-.012v6.524h-3.033zM38.22 21.968c-4.51 0-6.952-3.198-6.952-7.283 0-4.112 2.443-7.283 6.952-7.283 4.537 0 6.952 3.17 6.952 7.283 0 4.085-2.415 7.283-6.952 7.283zm-3.785-7.283c0 3.17 1.718 4.756 3.785 4.756 2.094 0 3.785-1.585 3.785-4.756 0-3.172-1.691-4.784-3.785-4.784-2.067 0-3.785 1.612-3.785 4.784zM22.826 21.645V9.955l2.55-2.204h5.422v2.58H25.86v11.314h-3.033zM11.228 22C5.447 22 2 17.802 2 12.078 2 6.3 5.57 2 11.341 2c4.51 0 7.811 2.311 8.59 6.611h-3.463c-.51-2.445-2.55-3.816-5.127-3.816-4.16 0-5.986 3.601-5.986 7.283 0 3.682 1.826 7.256 5.986 7.256 3.973 0 5.717-2.876 5.852-5.267h-5.986v-2.783h9.046l-.015 1.455c0 5.406-2.203 9.261-9.01 9.261z"></path></g></g></g></svg>',inception:'<svg fill="none" viewBox="0 0 7.7527 1" data-combine-word="inception" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path d="M14.767 1H7.884L1 7.883v6.884h6.884V7.883h6.883V1zM9.234 23h6.882L23 16.116V9.233h-6.884v6.883H9.234V23z"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M14.767 1H7.884L1 7.883v6.884h6.884V7.883h6.883V1zM9.234 23h6.882L23 16.116V9.233h-6.884v6.883H9.234V23z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.4960 -0.2780) scale(0.066560)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M50.024 7.374c1.58 0 2.891.56 3.893 1.689.993 1.12 1.476 2.533 1.476 4.203 0 1.67-.483 3.085-1.476 4.205-1.002 1.128-2.314 1.689-3.893 1.689v-.002c-1.164 0-2.142-.327-2.911-.983V24h-2.808V7.66h2.808v.698c.77-.657 1.748-.984 2.911-.984zm-.802 1.859c-.874 0-1.565.286-2.11.854v6.355c.558.573 1.25.859 2.11.859.948 0 1.69-.357 2.269-1.083.629-.84.95-1.87.91-2.918V13.247a4.603 4.603 0 00-.884-2.899l-.02-.025-.11-.133c-.563-.642-1.273-.957-2.165-.957z"></path><path d="M60.694 7.66h3.862v1.962h-3.862v6.643l-.003.023c-.029.29.054.579.23.81.291.177.629.262.97.244l.015-.001h.098c.672 0 1.226-.059 1.67-.17l.595-.148v1.642l-.363.09a13.015 13.015 0 01-3.157.405 3.399 3.399 0 01-1.838-.435l-.013-.007-.012-.009a2.044 2.044 0 01-.27-.21l-.015-.013-.014-.016a2.57 2.57 0 01-.67-1.634 5.94 5.94 0 01-.03-.618V9.622h-2.281V7.661h2.28V5.452l2.808-1.276V7.66zM25.668 7.373c.83.022 1.648.21 2.405.552l.008.003.006.004c.151.073.297.156.438.246.49.277.888.69 1.144 1.188l.103.224.007.015.005.018c.06.183.09.374.09.566 0 .378-.105.733-.356 1.016a1.255 1.255 0 01-.965.428c-.387 0-.74-.122-1.03-.376-.28-.246-.472-.589-.598-.983l-.004-.012-.002-.012c-.117-.44-.305-.76-.546-.986a1.654 1.654 0 00-1.057-.335H25.28a4.35 4.35 0 00-.178-.004c-.805 0-1.458.295-1.99.9a3.62 3.62 0 00-.803 2.207l-.001.011v.01c-.01.145-.015.289-.014.433v.354c.024.787.211 1.562.55 2.275.128.248.282.483.46.698l.125.143c.633.692 1.439 1.037 2.454 1.037h.015l.016.001a2.99 2.99 0 003.082-2.2l.004-.016.005-.015c.042-.122.08-.245.113-.37l.095-.353h1.514l-.122.577c-.294 1.387-.85 2.494-1.701 3.272-.855.782-1.964 1.191-3.286 1.26-.137.007-.276.01-.413.01-1.688 0-3.091-.547-4.159-1.666-1.06-1.111-1.58-2.52-1.58-4.186a5.848 5.848 0 011.256-3.839l.007-.008c.14-.169.289-.328.448-.479l.215-.195c1.091-.94 2.407-1.41 3.922-1.412l.355-.001z"></path><path clip-rule="evenodd" d="M36.976 7.374c1.326 0 2.483.361 3.447 1.098l.191.153.009.007a5.438 5.438 0 011.805 3.439l.016.098.084.55h-8.336c.037 1.326.39 2.342 1.017 3.093.658.788 1.507 1.181 2.59 1.181h.018l.019.001a3.074 3.074 0 003.18-2.185l.003-.012.005-.011c.035-.098.066-.197.094-.297l.1-.347h1.488l-.1.562a5.837 5.837 0 01-1.474 2.952l-.01.009c-.127.129-.262.25-.404.364l-.01.009-.001-.001a5.54 5.54 0 01-3.408 1.12h.001a8.36 8.36 0 01-.2.003c-1.688 0-3.09-.548-4.158-1.667-1.06-1.111-1.58-2.52-1.58-4.186 0-1.75.556-3.2 1.697-4.301 1.117-1.079 2.43-1.632 3.917-1.632zm-.04 1.551c-.673 0-1.245.224-1.739.682-.38.353-.662.832-.834 1.459h4.958a3.429 3.429 0 00-.505-1.263 1.985 1.985 0 00-.211-.244l-.167-.148c-.4-.32-.893-.485-1.502-.486zM76.261 7.374c1.663 0 3.086.544 4.235 1.64 1.16 1.104 1.73 2.536 1.73 4.252 0 1.704-.571 3.132-1.729 4.242-1.15 1.103-2.572 1.652-4.236 1.652-1.663 0-3.086-.55-4.235-1.652-1.157-1.11-1.73-2.538-1.73-4.242 0-1.716.571-3.148 1.73-4.253 1.15-1.095 2.573-1.639 4.236-1.64zm-.122 1.633c-.774 0-1.43.288-1.993.894a3.466 3.466 0 00-.823 2.069l-.002.02a6.894 6.894 0 00-.032.68v.002c0 1.246.278 2.332.82 3.271l.113.187.009.013.007.014a2.627 2.627 0 001.75 1.316c.131.021.263.033.396.033.776 0 1.434-.288 1.997-.89a3.423 3.423 0 00.82-2.052v-.01l.001-.012c.022-.226.033-.453.033-.68 0-1.329-.316-2.481-.934-3.47l-.009-.013-.007-.013a2.654 2.654 0 00-1.69-1.315 2.301 2.301 0 00-.456-.044z"></path><path d="M5.136 18.914H2.328V7.66h2.808v11.253zM13.76 7.374c1.254 0 2.275.374 2.97 1.195.681.805.98 1.962.98 3.385v6.96h-2.807v-6.627a4.578 4.578 0 00-.287-1.754l-.055-.125a1.697 1.697 0 00-1.666-.951h-.04c-.65 0-1.17.221-1.595.663a2.645 2.645 0 00-.631 1.614l-.001.013-.001.012a5.998 5.998 0 00-.025.563v6.592H7.794V7.66h2.808v1.084c.08-.097.164-.191.252-.282l.014-.014c.067-.063.136-.123.207-.18.752-.602 1.656-.895 2.684-.895zM68.4 18.914h-2.808V7.66h2.807v11.253zM90.049 7.374c1.254 0 2.275.374 2.97 1.195.682.805.981 1.962.981 3.385v6.96h-2.808v-6.627a4.577 4.577 0 00-.287-1.754 1.697 1.697 0 00-1.722-1.076h-.039c-.649 0-1.17.221-1.595.663a2.644 2.644 0 00-.63 1.614l-.002.013v.012a5.998 5.998 0 00-.026.563v6.592h-2.808V7.66h2.808v1.084c.08-.097.164-.191.253-.282l.006-.007.008-.007c.067-.063.135-.123.207-.18.751-.602 1.656-.895 2.684-.895zM3.732 2c.476 0 .894.182 1.233.52.334.333.52.742.52 1.209 0 .475-.18.893-.52 1.231a1.707 1.707 0 01-1.057.511l-.176.009a1.68 1.68 0 01-1.212-.52A1.699 1.699 0 012 3.73c0-.467.186-.876.52-1.21A1.68 1.68 0 013.732 2zM66.995 2c.476 0 .894.181 1.233.52.334.333.52.742.52 1.209a1.7 1.7 0 01-.52 1.231c-.338.338-.757.52-1.233.52a1.68 1.68 0 01-1.212-.52 1.699 1.699 0 01-.52-1.231c0-.467.186-.876.52-1.21l.129-.117c.308-.26.674-.402 1.083-.402z"></path></g></g></g></svg>',kimi:'<svg fill="none" viewBox="0 0 4.5548 1" data-combine-word="Kimi" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.1812 -0.2250) scale(0.060417)"><g><path d="M21.846 0a1.923 1.923 0 110 3.846H20.15a.226.226 0 01-.227-.226V1.923C19.923.861 20.784 0 21.846 0z" fill="#1783FF"></path><path d="M11.065 11.199l7.257-7.2c.137-.136.06-.41-.116-.41H14.3a.164.164 0 00-.117.051l-7.82 7.756c-.122.12-.302.013-.302-.179V3.82c0-.127-.083-.23-.185-.23H3.186c-.103 0-.186.103-.186.23V19.77c0 .128.083.23.186.23h2.69c.103 0 .186-.102.186-.23v-3.25c0-.069.025-.135.069-.178l2.424-2.406a.158.158 0 01.205-.023l6.484 4.772a7.677 7.677 0 003.453 1.283c.108.012.2-.095.2-.23v-3.06c0-.117-.07-.212-.164-.227a5.028 5.028 0 01-2.027-.807l-5.613-4.064c-.117-.078-.132-.279-.028-.381z" fill="currentColor"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.1812 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M21.846 0a1.923 1.923 0 110 3.846H20.15a.226.226 0 01-.227-.226V1.923C19.923.861 20.784 0 21.846 0z"></path><path d="M11.065 11.199l7.257-7.2c.137-.136.06-.41-.116-.41H14.3a.164.164 0 00-.117.051l-7.82 7.756c-.122.12-.302.013-.302-.179V3.82c0-.127-.083-.23-.185-.23H3.186c-.103 0-.186.103-.186.23V19.77c0 .128.083.23.186.23h2.69c.103 0 .186-.102.186-.23v-3.25c0-.069.025-.135.069-.178l2.424-2.406a.158.158 0 01.205-.023l6.484 4.772a7.677 7.677 0 003.453 1.283c.108.012.2-.095.2-.23v-3.06c0-.117-.07-.212-.164-.227a5.028 5.028 0 01-2.027-.807l-5.613-4.064c-.117-.078-.132-.279-.028-.381z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.4548 -0.1000) scale(0.050000)"><g fill="currentColor" fill-rule="evenodd"><path d="M24.353 21.58c0 .232.188.42.42.42h2.69a.42.42 0 00.42-.42V2.42a.42.42 0 00-.42-.42h-2.69a.42.42 0 00-.42.42v19.16zM58.47 21.58c0 .232.188.42.42.42h2.691a.42.42 0 00.419-.42V2.42a.42.42 0 00-.419-.42H58.89a.42.42 0 00-.42.42v19.16zM47.786 2a.42.42 0 00-.408.32L43.4 18.633c-.066.267-.38.267-.444 0L38.976 2.32A.417.417 0 0038.57 2H31.83a.418.418 0 00-.418.42v19.16c0 .232.188.42.42.42h2.988c.231 0 .419-.182.419-.414V5.471c0-.322.378-.389.454-.079l3.974 16.288a.42.42 0 00.407.32h6.208a.42.42 0 00.407-.32L50.66 5.394c.076-.31.455-.243.455.079V21.58c0 .231.187.419.419.419h2.987a.42.42 0 00.42-.42V2.42a.42.42 0 00-.42-.42h-6.735zM11.55 11.273l8.115-8.565A.42.42 0 0019.36 2h-3.776a.42.42 0 00-.298.124l-9.303 9.39c-.144.146-.357.016-.357-.218V2.42a.42.42 0 00-.42-.42H2.42a.42.42 0 00-.42.42v19.16c0 .232.188.42.42.42h2.786a.42.42 0 00.42-.42v-3.82c0-.085.03-.166.081-.219l2.87-2.931c.07-.07.166-.081.243-.029l7.678 5.816c1.123.778 2.552 1.288 3.861 1.5a.403.403 0 00.464-.404v-3.461c0-.206-.15-.38-.35-.423-.76-.164-1.604-.474-2.244-.918l-6.647-4.953c-.138-.095-.155-.34-.033-.465z"></path></g></g></g></svg>',longcat:'<svg fill="none" viewBox="0 0 7.7616 1" data-combine-word="longcat" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(0.0000 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path clip-rule="evenodd" d="M.507 19.883a.507.507 0 01-.489-.642L4.29 3.745a1.013 1.013 0 011.533-.578l5.622 3.687a1.013 1.013 0 001.11 0L18.2 3.165a1.013 1.013 0 011.532.58l4.25 15.497a.506.506 0 01-.49.64H18.07a6.297 6.297 0 001.53-4.115v-.177a6.09 6.09 0 00-1.513-4.017l-.697-3.495a.438.438 0 00-.694-.266L14.07 9.781a.748.748 0 01-.654.121 5.156 5.156 0 00-2.833 0 .746.746 0 01-.653-.121L7.302 7.81a.435.435 0 00-.688.269l-.675 3.652a5.36 5.36 0 00-1.539 3.76v.333c0 1.474.527 2.9 1.488 4.02l.032.038H.507z"></path><path d="M9.213 16.843h1.52v-3.546h-1.29l-.23 3.546zm5.573 0h-1.52v-3.546h1.29l.23 3.546z"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M.507 19.883a.507.507 0 01-.489-.642L4.29 3.745a1.013 1.013 0 011.533-.578l5.622 3.687a1.013 1.013 0 001.11 0L18.2 3.165a1.013 1.013 0 011.532.58l4.25 15.497a.506.506 0 01-.49.64H18.07a6.297 6.297 0 001.53-4.115v-.177a6.09 6.09 0 00-1.513-4.017l-.697-3.495a.438.438 0 00-.694-.266L14.07 9.781a.748.748 0 01-.654.121 5.156 5.156 0 00-2.833 0 .746.746 0 01-.653-.121L7.302 7.81a.435.435 0 00-.688.269l-.675 3.652a5.36 5.36 0 00-1.539 3.76v.333c0 1.474.527 2.9 1.488 4.02l.032.038H.507z"></path><path d="M9.213 16.843h1.52v-3.546h-1.29l-.23 3.546zm5.573 0h-1.52v-3.546h1.29l.23 3.546z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6344 -0.1156) scale(0.057803)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M2 19.138h12.31V15.96H5.887V2.289H2v16.849zm20.277.192c4.103 0 7.079-2.768 7.079-6.667 0-3.9-2.976-6.667-7.08-6.667-4.102 0-7.102 2.768-7.102 6.667 0 3.9 3 6.667 7.103 6.667zm0-3.08c-1.872 0-3.312-1.348-3.312-3.587s1.44-3.586 3.312-3.586c1.872 0 3.287 1.348 3.287 3.586 0 2.239-1.415 3.587-3.287 3.587zM39.698 5.996c-1.752 0-3.263.601-4.271 1.709V6.188H31.85v12.95h3.744v-6.403c0-2.383 1.296-3.49 3.095-3.49 1.656 0 2.616.963 2.616 3.057v6.836h3.743v-7.414c0-3.947-2.303-5.728-5.35-5.728zm18.645.192V7.85c-.984-1.252-2.471-1.853-4.271-1.853-3.576 0-6.455 2.479-6.455 6.258s2.88 6.258 6.455 6.258c1.68 0 3.095-.53 4.08-1.613v.554c0 2.335-1.153 3.538-3.792 3.538-1.656 0-3.456-.577-4.56-1.468l-1.487 2.696C49.825 23.399 52.2 24 54.648 24c4.655 0 7.247-2.214 7.247-7.028V6.188h-3.552zm-3.527 9.243c-1.968 0-3.408-1.276-3.408-3.177 0-1.902 1.44-3.177 3.408-3.177s3.383 1.275 3.383 3.177c0 1.901-1.415 3.177-3.383 3.177zm18.861 3.996c2.927 0 5.351-1.06 6.935-3.01l-2.496-2.31c-1.127 1.324-2.543 1.998-4.223 1.998-3.144 0-5.375-2.214-5.375-5.392 0-3.177 2.231-5.391 5.375-5.391 1.68 0 3.096.674 4.223 1.973l2.496-2.31C79.028 3.059 76.605 2 73.7 2c-5.231 0-9.119 3.635-9.119 8.713 0 5.08 3.888 8.714 9.095 8.714zM88.075 5.996c-2.064 0-4.152.553-5.567 1.564l1.343 2.624c.936-.746 2.352-1.204 3.72-1.204 2.016 0 2.975.939 2.975 2.552h-2.975c-3.936 0-5.543 1.588-5.543 3.875 0 2.238 1.8 3.923 4.823 3.923 1.896 0 3.24-.625 3.935-1.805v1.613h3.504v-7.39c0-3.923-2.28-5.752-6.215-5.752zm-.288 10.807c-1.32 0-2.112-.626-2.112-1.565 0-.866.552-1.516 2.304-1.516h2.567v1.324c-.432 1.18-1.511 1.757-2.76 1.757zm17.205-.939c-.408.313-.96.482-1.512.482-1.007 0-1.607-.602-1.607-1.71v-5.27h3.215V6.476h-3.215V3.324h-3.744v3.153h-1.992v2.888h1.992v5.32c0 3.08 1.776 4.645 4.823 4.645 1.152 0 2.28-.264 3.048-.818l-1.008-2.648z"></path></g></g></g></svg>',meta:'<svg fill="none" viewBox="2.0000 2.6410 99.0000 19.3590" data-combine-word="Meta" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lobe-icons-meta-brand-0-_R_0_" x1="75.904%" x2="33.275%" y1="89.153%" y2="23.044%"><stop offset=".06%" stop-color="#0867DF"></stop><stop offset="45.39%" stop-color="#0668E1"></stop><stop offset="100%" stop-color="#0064E0"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-1-_R_0_" x1="21.67%" x2="97.068%" y1="75.837%" y2="24.022%"><stop offset="13.23%" stop-color="#0064DF"></stop><stop offset="99.88%" stop-color="#0064E0"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-2-_R_0_" x1="38.247%" x2="60.91%" y1="89.127%" y2="16.131%"><stop offset="1.47%" stop-color="#0072EC"></stop><stop offset="68.81%" stop-color="#0064DF"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-3-_R_0_" x1="47.027%" x2="52.153%" y1="90.19%" y2="15.745%"><stop offset="7.31%" stop-color="#007CF6"></stop><stop offset="99.43%" stop-color="#0072EC"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-4-_R_0_" x1="52.155%" x2="47.591%" y1="58.289%" y2="37.023%"><stop offset="7.31%" stop-color="#007FF9"></stop><stop offset="100%" stop-color="#007CF6"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-5-_R_0_" x1="37.689%" x2="61.961%" y1="12.556%" y2="63.605%"><stop offset="7.31%" stop-color="#007FF9"></stop><stop offset="100%" stop-color="#0082FB"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-6-_R_0_" x1="42.496%" x2="59.964%" y1="56.072%" y2="27.099%"><stop offset="0%" stop-color="#007FF8"></stop><stop offset="100%" stop-color="#0082FB"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-7-_R_0_" x1="43.753%" x2="57.613%" y1="6.235%" y2="98.514%"><stop offset="0%" stop-color="#0082FB"></stop><stop offset="99.95%" stop-color="#0081FA"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-8-_R_0_" x1="60.07%" x2="39.865%" y1="4.661%" y2="69.077%"><stop offset="6.19%" stop-color="#0081FA"></stop><stop offset="100%" stop-color="#0080F9"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-9-_R_0_" x1="30.254%" x2="61.097%" y1="59.32%" y2="33.244%"><stop offset="0%" stop-color="#027AF3"></stop><stop offset="100%" stop-color="#0080F9"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-10-_R_0_" x1="20.433%" x2="82.112%" y1="50.001%" y2="50.001%"><stop offset="0%" stop-color="#0377EF"></stop><stop offset="99.94%" stop-color="#0279F1"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-11-_R_0_" x1="40.289%" x2="72.427%" y1="35.298%" y2="57.811%"><stop offset=".19%" stop-color="#0471E9"></stop><stop offset="100%" stop-color="#0377EF"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-12-_R_0_" x1="32.228%" x2="68.028%" y1="19.719%" y2="84.908%"><stop offset="27.65%" stop-color="#0867DF"></stop><stop offset="100%" stop-color="#0471E9"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g fill="currentColor" fill-rule="evenodd"><path d="M38.337 2.641h3.752l6.38 11.57 6.38-11.57h3.671v19.011H55.46V7.082l-5.594 10.09h-2.872l-5.595-10.09v14.57h-3.06V2.642zm30.058 19.353c-1.418 0-2.664-.314-3.739-.944a6.594 6.594 0 01-2.513-2.614c-.6-1.113-.9-2.39-.9-3.829 0-1.457.293-2.748.88-3.87.587-1.123 1.402-2 2.445-2.635 1.043-.633 2.242-.95 3.596-.95 1.346 0 2.504.319 3.475.957.97.638 1.718 1.532 2.242 2.682.523 1.15.785 2.499.785 4.047v.842h-10.39c.19 1.159.658 2.07 1.403 2.736.745.665 1.686.998 2.824.998.912 0 1.698-.136 2.357-.407a5.997 5.997 0 001.856-1.236l1.625 1.996c-1.616 1.485-3.599 2.227-5.946 2.227zm2.235-11.278c-.642-.656-1.481-.984-2.52-.984-1.011 0-1.858.335-2.54 1.005-.681.67-1.113 1.57-1.293 2.702h7.45c-.09-1.159-.456-2.066-1.097-2.723zm7.748-.712h-2.817V7.492h2.817V3.337h2.953v4.155h4.28v2.512h-4.28v6.369c0 1.059.18 1.815.542 2.267.36.453.98.68 1.855.68.389 0 .718-.016.99-.048l.426-.056c.15-.022.305-.046.467-.073v2.485a8.876 8.876 0 01-2.452.34c-3.187 0-4.781-1.748-4.781-5.242v-6.722zM101 21.654h-2.899v-1.982a5.24 5.24 0 01-1.964 1.718c-.795.403-1.698.604-2.71.604-1.245 0-2.35-.319-3.311-.957-.962-.638-1.718-1.517-2.269-2.635-.55-1.118-.826-2.396-.826-3.836 0-1.448.28-2.73.84-3.843.56-1.113 1.334-1.987 2.323-2.62.989-.634 2.124-.951 3.406-.951.967 0 1.834.188 2.601.563a5.145 5.145 0 011.91 1.596V7.49H101v14.164zm-2.953-9.206c-.316-.806-.815-1.442-1.497-1.908-.682-.466-1.47-.7-2.363-.7-1.265 0-2.272.426-3.021 1.277-.75.851-1.125 2-1.124 3.45 0 1.457.36 2.611 1.083 3.462.722.851 1.702 1.276 2.94 1.276.911 0 1.724-.235 2.438-.706a3.987 3.987 0 001.544-1.9v-4.251z"></path><path d="M8.627 0h-.029l-.04 3.27.028-.001c2.146 0 3.81 1.696 7.43 7.807l.22.372.014.024 2.026-3.047-.014-.023a60.949 60.949 0 00-1.374-2.146 35.014 35.014 0 00-1.47-2.036C13.026 1.165 11.024 0 8.628 0z" fill="url(#lobe-icons-meta-brand-0-_R_0_)" transform="translate(2 2)"></path><path d="M8.598 0C6.19.013 4.062 1.573 2.525 3.961a5.44 5.44 0 00-.013.021l2.82 1.54.015-.022c.897-1.354 2.014-2.218 3.211-2.23l.027-.001L8.627 0h-.03z" fill="url(#lobe-icons-meta-brand-1-_R_0_)" transform="translate(2 2)"></path><path d="M2.525 3.963l-.013.02C1.502 5.56.749 7.494.342 9.58l-.005.027 3.17.75c0-.01.002-.018.004-.028.339-1.833.984-3.533 1.822-4.806l.013-.02-2.82-1.54z" fill="url(#lobe-icons-meta-brand-2-_R_0_)" transform="translate(2 2)"></path><path d="M3.511 10.33L.342 9.582l-.005.027A18.541 18.541 0 000 13.09v.028l3.25.292v-.029a15.728 15.728 0 01.262-3.05z" fill="url(#lobe-icons-meta-brand-3-_R_0_)" transform="translate(2 2)"></path><path d="M3.349 14.422a6.822 6.822 0 01-.099-1.017v-.028L0 13.085v.031a11.105 11.105 0 00.183 2.064l3.17-.731a5.131 5.131 0 01-.004-.027z" fill="url(#lobe-icons-meta-brand-4-_R_0_)" transform="translate(2 2)"></path><path d="M4.09 16.112c-.354-.387-.605-.945-.736-1.659l-.005-.027-3.171.731.005.027c.24 1.262.71 2.313 1.383 3.108l.018.022 2.524-2.181a2.635 2.635 0 01-.019-.02z" fill="url(#lobe-icons-meta-brand-5-_R_0_)" transform="translate(2 2)"></path><path d="M15.484 9.067a399.491 399.491 0 00-3.069 4.781c-2.545 4-3.426 4.897-4.843 4.897-.591 0-1.085-.211-1.464-.615a2.313 2.313 0 01-.019-.02l-2.523 2.18.018.021C4.514 21.397 5.825 22 7.448 22c2.456 0 4.222-1.16 7.361-6.662l2.21-3.913a51.6 51.6 0 00-1.535-2.358z" fill="#0082FB"></path><path d="M16.89 2.432a19.722 19.722 0 00-1.471 1.79c.472.604.96 1.281 1.47 2.038.6-.93 1.16-1.682 1.71-2.258l.019-.02-1.728-1.55z" fill="url(#lobe-icons-meta-brand-6-_R_0_)" transform="translate(2 2)"></path><path d="M28.166 4.142C26.834 2.792 25.245 2 23.546 2c-1.79 0-3.297.984-4.656 2.43a6.451 6.451 0 00-.02.02L20.6 6l.019-.021c.895-.934 1.762-1.4 2.722-1.4 1.034 0 2.001.488 2.84 1.343l.019.02 1.987-1.78-.02-.02z" fill="#0082FB"></path><path d="M30.019 12.656c-.075-4.333-1.588-8.207-3.833-10.495l-.02-.02-1.987 1.78.02.02c1.689 1.74 2.848 4.975 2.953 8.714v.028l2.867.001v-.028z" fill="url(#lobe-icons-meta-brand-7-_R_0_)" transform="translate(2 2)"></path><path d="M30.02 12.687l-.001-.028h-2.867v.027c.005.176.008.352.008.53 0 1.02-.152 1.843-.461 2.438l-.014.027 2.137 2.228.016-.024c.776-1.2 1.183-2.868 1.183-4.89 0-.103 0-.205-.002-.308z" fill="url(#lobe-icons-meta-brand-8-_R_0_)" transform="translate(2 2)"></path><path d="M26.7 15.65l-.015.026c-.267.502-.649.836-1.147.982l.974 3.079a4.372 4.372 0 00.547-.229 4.45 4.45 0 001.709-1.522 4.18 4.18 0 00.055-.081l.015-.025-2.139-2.23z" fill="url(#lobe-icons-meta-brand-9-_R_0_)" transform="translate(2 2)"></path><path d="M24.917 16.742c-.327 0-.615-.049-.897-.175l-.998 3.151c.56.192 1.16.279 1.826.279.615 0 1.179-.092 1.69-.27l-.974-3.077c-.21.063-.428.094-.647.092z" fill="url(#lobe-icons-meta-brand-10-_R_0_)" transform="translate(2 2)"></path><path d="M22.92 15.667l-.018-.021-2.296 2.393.02.02c.797.853 1.56 1.382 2.423 1.672l.997-3.15c-.364-.156-.716-.44-1.125-.914z" fill="url(#lobe-icons-meta-brand-11-_R_0_)" transform="translate(2 2)"></path><path d="M22.902 15.643c-.688-.802-1.54-2.139-2.88-4.3l-1.746-2.92-.014-.023-2.026 3.046.014.024 1.237 2.087c1.2 2.012 2.177 3.467 3.12 4.48l.019.02 2.295-2.392a2.945 2.945 0 01-.019-.022z" fill="url(#lobe-icons-meta-brand-12-_R_0_)" transform="translate(2 2)"></path><defs><linearGradient id="lobe-icons-meta-brand-0-_R_0_" x1="75.904%" x2="33.275%" y1="89.153%" y2="23.044%"><stop offset=".06%" stop-color="#0867DF"></stop><stop offset="45.39%" stop-color="#0668E1"></stop><stop offset="100%" stop-color="#0064E0"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-1-_R_0_" x1="21.67%" x2="97.068%" y1="75.837%" y2="24.022%"><stop offset="13.23%" stop-color="#0064DF"></stop><stop offset="99.88%" stop-color="#0064E0"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-2-_R_0_" x1="38.247%" x2="60.91%" y1="89.127%" y2="16.131%"><stop offset="1.47%" stop-color="#0072EC"></stop><stop offset="68.81%" stop-color="#0064DF"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-3-_R_0_" x1="47.027%" x2="52.153%" y1="90.19%" y2="15.745%"><stop offset="7.31%" stop-color="#007CF6"></stop><stop offset="99.43%" stop-color="#0072EC"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-4-_R_0_" x1="52.155%" x2="47.591%" y1="58.289%" y2="37.023%"><stop offset="7.31%" stop-color="#007FF9"></stop><stop offset="100%" stop-color="#007CF6"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-5-_R_0_" x1="37.689%" x2="61.961%" y1="12.556%" y2="63.605%"><stop offset="7.31%" stop-color="#007FF9"></stop><stop offset="100%" stop-color="#0082FB"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-6-_R_0_" x1="42.496%" x2="59.964%" y1="56.072%" y2="27.099%"><stop offset="0%" stop-color="#007FF8"></stop><stop offset="100%" stop-color="#0082FB"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-7-_R_0_" x1="43.753%" x2="57.613%" y1="6.235%" y2="98.514%"><stop offset="0%" stop-color="#0082FB"></stop><stop offset="99.95%" stop-color="#0081FA"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-8-_R_0_" x1="60.07%" x2="39.865%" y1="4.661%" y2="69.077%"><stop offset="6.19%" stop-color="#0081FA"></stop><stop offset="100%" stop-color="#0080F9"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-9-_R_0_" x1="30.254%" x2="61.097%" y1="59.32%" y2="33.244%"><stop offset="0%" stop-color="#027AF3"></stop><stop offset="100%" stop-color="#0080F9"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-10-_R_0_" x1="20.433%" x2="82.112%" y1="50.001%" y2="50.001%"><stop offset="0%" stop-color="#0377EF"></stop><stop offset="99.94%" stop-color="#0279F1"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-11-_R_0_" x1="40.289%" x2="72.427%" y1="35.298%" y2="57.811%"><stop offset=".19%" stop-color="#0471E9"></stop><stop offset="100%" stop-color="#0377EF"></stop></linearGradient><linearGradient id="lobe-icons-meta-brand-12-_R_0_" x1="32.228%" x2="68.028%" y1="19.719%" y2="84.908%"><stop offset="27.65%" stop-color="#0867DF"></stop><stop offset="100%" stop-color="#0471E9"></stop></linearGradient></defs></g></g><g class="dsh-combine-mark-mono"><g fill="currentColor" fill-rule="evenodd"><path d="M38.337 2.641h3.752l6.38 11.57 6.38-11.57h3.671v19.011H55.46V7.082l-5.594 10.09h-2.872l-5.595-10.09v14.57h-3.06V2.642zm30.058 19.353c-1.418 0-2.664-.314-3.739-.944a6.594 6.594 0 01-2.513-2.614c-.6-1.113-.9-2.39-.9-3.829 0-1.457.293-2.748.88-3.87.587-1.123 1.402-2 2.445-2.635 1.043-.633 2.242-.95 3.596-.95 1.346 0 2.504.319 3.475.957.97.638 1.718 1.532 2.242 2.682.523 1.15.785 2.499.785 4.047v.842h-10.39c.19 1.159.658 2.07 1.403 2.736.745.665 1.686.998 2.824.998.912 0 1.698-.136 2.357-.407a5.997 5.997 0 001.856-1.236l1.625 1.996c-1.616 1.485-3.599 2.227-5.946 2.227zm2.235-11.278c-.642-.656-1.481-.984-2.52-.984-1.011 0-1.858.335-2.54 1.005-.681.67-1.113 1.57-1.293 2.702h7.45c-.09-1.159-.456-2.066-1.097-2.723zm7.748-.712h-2.817V7.492h2.817V3.337h2.953v4.155h4.28v2.512h-4.28v6.369c0 1.059.18 1.815.542 2.267.36.453.98.68 1.855.68.389 0 .718-.016.99-.048l.426-.056c.15-.022.305-.046.467-.073v2.485a8.88 8.88 0 01-2.452.34c-3.187 0-4.781-1.748-4.781-5.242v-6.722zM101 21.654h-2.899v-1.982a5.24 5.24 0 01-1.964 1.718c-.795.403-1.698.604-2.71.604-1.245 0-2.35-.319-3.311-.957-.962-.638-1.718-1.517-2.269-2.635-.55-1.118-.826-2.396-.826-3.836 0-1.448.28-2.73.84-3.843.56-1.113 1.334-1.987 2.323-2.62.989-.634 2.124-.951 3.406-.951.967 0 1.834.188 2.601.563a5.145 5.145 0 011.91 1.596V7.49H101v14.164zm-2.953-9.206c-.316-.806-.815-1.442-1.497-1.908-.682-.466-1.47-.7-2.363-.7-1.265 0-2.272.426-3.021 1.277-.75.851-1.125 2-1.124 3.45 0 1.457.36 2.611 1.083 3.462.722.851 1.702 1.276 2.94 1.276.911 0 1.724-.235 2.438-.706a3.987 3.987 0 001.544-1.9v-4.251zM10.627 2c2.396 0 4.398 1.165 6.792 4.22.375-.507.758-.99 1.153-1.438l.318-.352C20.249 2.984 21.755 2 23.546 2c1.604 0 3.11.706 4.395 1.92l.245.24c2.173 2.215 3.66 5.914 3.821 10.078l.012.446.002.311c0 1.896-.358 3.48-1.042 4.66l-.157.254-.134.19a4.45 4.45 0 01-1.629 1.41l-.17.08a4.372 4.372 0 01-.377.148c-.505.17-1.06.26-1.664.26-.656 0-1.246-.084-1.8-.27-.784-.26-1.485-.72-2.206-1.443l-.236-.245c-.942-1.015-1.92-2.47-3.119-4.482l-1.472-2.481c-.171-.29-.338-.57-.5-.839l-.497-.812-2.209 3.913-.377.652-.373.623C11.374 21.023 9.701 22 7.449 22c-1.528 0-2.78-.534-3.696-1.501l-.187-.207c-.617-.729-1.063-1.673-1.318-2.797l-.07-.338a10.856 10.856 0 01-.17-1.61L2 15.084c.002-.97.08-1.941.235-2.902l.107-.603C2.72 9.643 3.396 7.837 4.3 6.327l.226-.366c1.482-2.303 3.514-3.836 5.816-3.954L10.627 2zm.114 3.272l-.183-.003c-1.13.012-2.19.784-3.06 2.01l-.153.222-.012.022c-.774 1.175-1.383 2.714-1.738 4.386l-.089.448c-.17.93-.257 1.873-.259 2.818l.003.235c.005.224.022.45.05.675l.054.364c.117.639.328 1.15.621 1.528l.113.133.02.02c.379.404.873.615 1.464.615 1.348 0 2.21-.811 4.482-4.333l2.286-3.578 1.144-1.767-.25-.354c-1.744-2.429-2.965-3.32-4.34-3.432l-.153-.009zm12.599-.693l-.204.007c-.88.062-1.687.526-2.518 1.393l-.02.023c-.549.576-1.11 1.329-1.71 2.258.352.52.715 1.082 1.09 1.683l.298.48 1.746 2.92.748 1.2.527.83c.607.946 1.085 1.641 1.5 2.146l.124.146c.358.416.672.686.989.852l.108.051c.284.125.572.174.899.174.22.002.437-.03.647-.092.43-.132.774-.409 1.03-.815l.106-.185.087-.181c.25-.576.373-1.336.373-2.253l-.002-.266-.006-.292c-.102-3.612-1.185-6.752-2.78-8.53l-.193-.206c-.838-.855-1.805-1.343-2.84-1.343z"></path></g></g></svg>',microsoft:'<svg fill="none" viewBox="0 0 6.6971 1" data-combine-word="Azure" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.1208 -0.2250) scale(0.060417)"><g><path d="M11.49 2H2v9.492h9.492V2h-.002z" fill="#F25022"></path><path d="M22 2h-9.492v9.492H22V2z" fill="#7FBA00"></path><path d="M11.49 12.508H2V22h9.492v-9.492h-.002z" fill="#00A4EF"></path><path d="M22 12.508h-9.492V22H22v-9.492z" fill="#FFB900"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.1208 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M11.49 2H2v9.492h9.492V2h-.002z"></path><path d="M22 2h-9.492v9.492H22V2z"></path><path d="M11.49 12.508H2V22h9.492v-9.492h-.002z"></path><path d="M22 12.508h-9.492V22H22v-9.492z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.4083 -0.1000) scale(0.050000)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M21.881 3.355V21.68h-3.19V7.316h-.051l-5.7 14.364h-2.114L4.984 7.316h-.038V21.68H2V3.355h4.573L11.85 16.94h.076L17.5 3.355h4.381zm2.667 1.393c0-.511.186-.939.558-1.284.356-.34.832-.526 1.325-.518.546 0 1 .177 1.358.53.359.354.538.778.538 1.272 0 .502-.184.925-.55 1.264-.368.342-.816.512-1.346.512-.529 0-.976-.172-1.338-.517a1.667 1.667 0 01-.545-1.259zm.32 16.932h3.1V8.543h-3.1V21.68zm12.503-2.25c.461 0 .97-.104 1.524-.318a6.417 6.417 0 001.538-.844v2.876a6.289 6.289 0 01-1.685.639A9.217 9.217 0 0136.68 22c-1.94 0-3.515-.611-4.728-1.834-1.212-1.221-1.819-2.783-1.819-4.683 0-2.113.62-3.853 1.858-5.22 1.238-1.368 2.993-2.051 5.265-2.051.58 0 1.168.074 1.761.223.594.148 1.065.32 1.416.518v2.964a6.39 6.39 0 00-1.468-.812 4.234 4.234 0 00-1.53-.287c-1.22 0-2.207.396-2.96 1.189-.75.792-1.126 1.862-1.126 3.207 0 1.329.36 2.365 1.082 3.105.722.742 1.701 1.111 2.94 1.111zM49.258 8.327c.248 0 .471.017.667.051.195.034.363.076.5.128v3.131c-.163-.12-.4-.232-.711-.338-.313-.108-.69-.16-1.134-.16-.76 0-1.403.32-1.928.958-.525.64-.787 1.624-.787 2.952v6.632h-3.1V8.544h3.1v2.07h.05c.282-.716.709-1.276 1.281-1.681.572-.404 1.26-.606 2.062-.606zm1.335 6.977c0-2.172.614-3.893 1.843-5.162 1.231-1.27 2.939-1.904 5.124-1.904 2.06 0 3.666.611 4.824 1.834 1.157 1.223 1.735 2.873 1.735 4.952 0 2.13-.614 3.825-1.844 5.085C61.045 21.371 59.371 22 57.253 22c-2.041 0-3.661-.598-4.86-1.795-1.201-1.197-1.8-2.829-1.8-4.901zm3.228-.101c0 1.37.31 2.42.935 3.143.622.724 1.515 1.086 2.677 1.086 1.128 0 1.985-.362 2.574-1.086.59-.723.884-1.797.884-3.22 0-1.415-.305-2.482-.915-3.2-.611-.721-1.468-1.082-2.568-1.082-1.137 0-2.019.377-2.646 1.132-.628.754-.941 1.829-.941 3.227zm14.91-3.208c0 .443.141.79.422 1.042.283.25.905.568 1.871.951 1.238.495 2.108 1.051 2.607 1.67.5.615.749 1.364.749 2.24 0 1.237-.476 2.23-1.428 2.979-.951.75-2.24 1.124-3.862 1.124a9.277 9.277 0 01-1.813-.198c-.662-.132-1.223-.3-1.685-.506v-3.04c.564.391 1.17.703 1.82.933.649.23 1.238.344 1.768.344.699 0 1.216-.097 1.55-.294.331-.195.499-.523.499-.982 0-.427-.172-.787-.519-1.081-.346-.294-1-.633-1.966-1.016-1.144-.477-1.956-1.014-2.434-1.61-.477-.596-.718-1.354-.718-2.275 0-1.185.473-2.158 1.416-2.92.944-.763 2.167-1.143 3.67-1.143.46 0 .978.05 1.55.152.573.103 1.051.235 1.435.396v2.94a6.63 6.63 0 00-1.435-.703 4.797 4.797 0 00-1.626-.294c-.59 0-1.049.115-1.378.345-.328.23-.493.546-.493.946zm6.982 3.31c0-2.173.614-3.894 1.844-5.163 1.23-1.27 2.937-1.904 5.124-1.904 2.059 0 3.666.611 4.824 1.834 1.157 1.223 1.735 2.873 1.735 4.952 0 2.13-.616 3.825-1.844 5.085C86.166 21.371 84.491 22 82.373 22c-2.04 0-3.66-.598-4.861-1.795-1.2-1.197-1.799-2.83-1.799-4.902v.002zm3.227-.102c0 1.37.313 2.42.935 3.143.625.724 1.517 1.086 2.677 1.086 1.128 0 1.987-.362 2.576-1.086.588-.723.883-1.797.883-3.22 0-1.415-.304-2.482-.916-3.2-.609-.721-1.467-1.082-2.567-1.082-1.136 0-2.018.377-2.646 1.132-.628.754-.942 1.829-.942 3.227zm20.584-4.128h-4.618V21.68H91.77V11.074h-2.203v-2.53h2.203V6.716c0-1.38.45-2.511 1.352-3.393C94.021 2.44 95.177 2 96.586 2c.376 0 .708.02.998.058.292.038.548.095.77.172v2.672a3.233 3.233 0 00-.54-.218 2.792 2.792 0 00-.883-.128c-.648 0-1.148.202-1.498.607-.35.405-.527 1.004-.527 1.795v1.586h4.618V5.592l3.113-.946v3.898h3.138v2.53h-3.138v6.146c0 .81.147 1.38.442 1.712.294.334.758.499 1.391.499.178 0 .394-.042.647-.128.25-.085.47-.186.658-.306v2.556c-.196.112-.523.213-.98.307-.457.093-.906.14-1.35.14-1.308 0-2.287-.347-2.942-1.043-.653-.692-.98-1.739-.98-3.136v-6.747l.001.001z"></path></g></g></g></svg>',minimax:'<svg fill="none" viewBox="0 0 7.2485 1" data-combine-word="Minimax" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lobe-icons-minimax-_R_0_" x1="0%" x2="100.182%" y1="50.057%" y2="50.057%"><stop offset="0%" stop-color="#E2167E"></stop><stop offset="100%" stop-color="#FE603C"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><defs><linearGradient id="lobe-icons-minimax-_R_0_" x1="0%" x2="100.182%" y1="50.057%" y2="50.057%"><stop offset="0%" stop-color="#E2167E"></stop><stop offset="100%" stop-color="#FE603C"></stop></linearGradient></defs><path d="M16.278 2c1.156 0 2.093.927 2.093 2.07v12.501a.74.74 0 00.744.709.74.74 0 00.743-.709V9.099a2.06 2.06 0 012.071-2.049A2.06 2.06 0 0124 9.1v6.561a.649.649 0 01-.652.645.649.649 0 01-.653-.645V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v7.472a2.037 2.037 0 01-2.048 2.026 2.037 2.037 0 01-2.048-2.026v-12.5a.785.785 0 00-.788-.753.785.785 0 00-.789.752l-.001 15.904A2.037 2.037 0 0113.441 22a2.037 2.037 0 01-2.048-2.026V18.04c0-.356.292-.645.652-.645.36 0 .652.289.652.645v1.934c0 .263.142.506.372.638.23.131.514.131.744 0a.734.734 0 00.372-.638V4.07c0-1.143.937-2.07 2.093-2.07zm-5.674 0c1.156 0 2.093.927 2.093 2.07v11.523a.648.648 0 01-.652.645.648.648 0 01-.652-.645V4.07a.785.785 0 00-.789-.78.785.785 0 00-.789.78v14.013a2.06 2.06 0 01-2.07 2.048 2.06 2.06 0 01-2.071-2.048V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v3.8a2.06 2.06 0 01-2.071 2.049A2.06 2.06 0 010 12.9v-1.378c0-.357.292-.646.652-.646.36 0 .653.29.653.646V12.9c0 .418.343.757.766.757s.766-.339.766-.757V9.099a2.06 2.06 0 012.07-2.048 2.06 2.06 0 012.071 2.048v8.984c0 .419.343.758.767.758.423 0 .766-.339.766-.758V4.07c0-1.143.937-2.07 2.093-2.07z" fill="url(#lobe-icons-minimax-_R_0_)" fill-rule="nonzero"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M16.278 2c1.156 0 2.093.927 2.093 2.07v12.501a.74.74 0 00.744.709.74.74 0 00.743-.709V9.099a2.06 2.06 0 012.071-2.049A2.06 2.06 0 0124 9.1v6.561a.649.649 0 01-.652.645.649.649 0 01-.653-.645V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v7.472a2.037 2.037 0 01-2.048 2.026 2.037 2.037 0 01-2.048-2.026v-12.5a.785.785 0 00-.788-.753.785.785 0 00-.789.752l-.001 15.904A2.037 2.037 0 0113.441 22a2.037 2.037 0 01-2.048-2.026V18.04c0-.356.292-.645.652-.645.36 0 .652.289.652.645v1.934c0 .263.142.506.372.638.23.131.514.131.744 0a.734.734 0 00.372-.638V4.07c0-1.143.937-2.07 2.093-2.07zm-5.674 0c1.156 0 2.093.927 2.093 2.07v11.523a.648.648 0 01-.652.645.648.648 0 01-.652-.645V4.07a.785.785 0 00-.789-.78.785.785 0 00-.789.78v14.013a2.06 2.06 0 01-2.07 2.048 2.06 2.06 0 01-2.071-2.048V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v3.8a2.06 2.06 0 01-2.071 2.049A2.06 2.06 0 010 12.9v-1.378c0-.357.292-.646.652-.646.36 0 .653.29.653.646V12.9c0 .418.343.757.766.757s.766-.339.766-.757V9.099a2.06 2.06 0 012.07-2.048 2.06 2.06 0 012.071 2.048v8.984c0 .419.343.758.767.758.423 0 .766-.339.766-.758V4.07c0-1.143.937-2.07 2.093-2.07z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6500 -0.1000) scale(0.050000)"><g fill="currentColor" fill-rule="evenodd"><path d="M2 22V2h4.23l4.41 6.828L14.93 2h3.988v20l-3.987-.06V9.25l-3.263 4.714H9.674L6.23 9.25V22H2zM26.471 2h-3.867v20h3.867V2zm3.565 0h4.049l7.492 12.387V2h3.988v20h-3.988L34.085 9.734V21.94h-4.049V2zm23.082 0h-4.109v20h4.109V2zm3.504 0v20h4.23V9.25l3.444 4.714h1.994l3.263-4.713V21.94l3.988.06V2h-3.988l-4.29 6.828L60.852 2h-4.23zm19.457 20l6.344-20h5.076l6.404 20h-4.471l-.89-3.021h-7.139L80.49 22h-4.411zm6.369-6.405h5.078l-2.505-8.338-2.573 8.338zM111.97 2h-4.774l-3.619 6.082L99.885 2h-4.592l5.961 9.985L95.294 22h4.591l3.698-6.113 3.613 6.053h4.774l-6.025-9.956L111.97 2z"></path></g></g></g></svg>',mistral:'<svg fill="none" viewBox="0 0 7.7685 1" data-combine-word="Mistral" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" fill="gold"></path><path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00"></path><path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205"></path><path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" fill="#FA500F"></path><path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" fill="#E10500"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M3.428 3.4h3.429v3.428h3.429v3.429h-.002 3.431V6.828h3.427V3.4h3.43v13.714H24v3.429H13.714v-3.428h-3.428v-3.429h-3.43v3.428h3.43v3.429H0v-3.429h3.428V3.4zm10.286 13.715h3.428v-3.429h-3.427v3.429z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6574 -0.0463) scale(0.046296)"><g fill="currentColor" fill-rule="evenodd"><path d="M2 22.638V1h6.55l3.933 14.76L16.37 1h6.565v21.638H18.87V5.605l-4.302 17.033h-4.214L6.066 5.605v17.033H2zm25.011-17.8V1.002h4.155V4.84h-4.155zm0 17.801V6.964h4.155V22.64h-4.155zm6.707-4.473l4.17-.635c.177.807.536 1.42 1.079 1.838.986.864 3.753.796 4.702.036.588-.404.753-1.367.25-1.89-.206-.196-.67-.378-1.389-.545-3.351-.738-5.475-1.412-6.372-2.022-2.418-1.526-2.465-5.18-.252-6.952 1.76-1.8 7.852-1.78 9.788-.34 1.045.699 1.764 1.732 2.159 3.1l-3.918.723c-.413-1.402-1.417-1.886-2.957-1.89-1.094 0-1.878.154-2.35.458-.591.383-.651 1.179-.06 1.595.374.275 1.668.664 3.88 1.165 2.213.502 3.759 1.117 4.636 1.845 1.993 1.694 1.615 5.13-.503 6.79-2.087 2.01-8.091 2.034-10.416.25-1.247-.865-2.063-2.04-2.447-3.527zm31.88 4.472h-4.154V6.963h3.86v2.229c.66-1.053 1.253-1.747 1.78-2.081 1.374-.857 3.144-.536 4.532.28l-1.286 3.617c-1.877-1.247-3.849-.81-4.384 1.535-.468 1.352-.329 7.76-.347 10.096zm10.67-10.892l-3.77-.679c1.014-3.408 3.08-4.43 6.801-4.457 2.81.037 4.804.362 6.055 2.324.37.674.554 1.912.554 3.713.013 1.729-.178 6.48.155 7.889.133.654.382 1.355.747 2.103H82.7c-.124-.272-.411-1.286-.547-1.712-1.378 1.335-2.97 2.066-4.865 2.067-2.945.058-5.22-1.756-5.219-4.635-.011-1.72.87-3.225 2.418-3.963.764-.37 1.865-.691 3.304-.967 1.942-.364 3.287-.703 4.037-1.018v-.413c0-.797-.197-1.366-.591-1.705-.57-.582-3.147-.744-3.963-.074-.414.29-.75.8-1.006 1.527zm5.56 3.365c-.757.315-4.139.86-4.79 1.358-1.077.707-1.038 2.141-.163 2.967 1.017.987 2.672.733 3.8-.103 1.374-.983 1.117-2.455 1.153-4.221zm7.933 7.527V1h4.155v21.638H89.76zm35.917 0h-4.761l-1.892-4.915h-8.665l-1.789 4.915h-4.643L112.371 1h4.627l8.679 21.638h.001zm-8.058-8.56l-2.987-8.03-2.927 8.03h5.914zm10.004 8.56V1H132v21.638h-4.376zM58.98 6.964v3.307H56.14v6.317l.081 2.236c.434 1.136 1.612.712 2.743.332l.355 3.218c-2.416 1.02-6.87 1.14-7.215-2.346-.096-.537-.123-1.89-.133-3.44v-6.317h-1.908V6.965h1.908V3.85l4.17-2.42v5.535h2.838z"></path></g></g></g></svg>',nanobanana:'<svg fill="none" viewBox="0 0 9.8258 1" data-combine-word="Nano Banana" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0906 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path d="M8.342 13.16H3.455c-.513 0-.772-.639-.408-1.012l1.608-1.653a3.166 3.166 0 014.565 0l.513.527.006-.015.038.017c.735-1.93.786-2.809.783-5.007v-.275c-.01-1.782-.02-3.935 1.965-4.22 2.603-.375 4.504 4.219 4.815 8.299a3.166 3.166 0 013.38.774l1.609 1.653c.365.375.106 1.012-.407 1.012H19.27c.072.264.11.542.11.828v5.664c0 .914-.994 1.292-1.602.576-.229-.27-1.067-1.25-2.155-2.52-2.92 4.183-10.266 6.462-12.34 3.006a.915.915 0 01-.05 0h-.743a.991.991 0 110-1.982h.246c.014-1.687 1.23-3.148 2.846-3.783a7.448 7.448 0 002.76-1.889zm7.543-2.145c0-.127-.001-.256-.005-.388a15.693 15.693 0 00-.632-3.939c-.38-1.282-.887-2.33-1.425-2.992-.545-.671-.906-.715-1.085-.69-.223.032-.292.098-.322.129-.05.052-.135.176-.209.45-.152.567-.15 1.286-.147 2.186v.244c.002 1.134-.009 2.028-.145 2.92a11.292 11.292 0 01-.537 2.08h4.507zm-3.468 3.056c-1.636 3.166-4.981 4.71-8.118 4.87a.562.562 0 00.057 1.124c3.294-.169 6.921-1.749 8.845-5.081l-.784-.913z"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0906 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M8.342 13.16H3.455c-.513 0-.772-.639-.408-1.012l1.608-1.653a3.166 3.166 0 014.565 0l.513.527.006-.015.038.017c.735-1.93.786-2.809.783-5.007v-.275c-.01-1.782-.02-3.935 1.965-4.22 2.603-.375 4.504 4.219 4.815 8.299a3.166 3.166 0 013.38.774l1.609 1.653c.365.375.106 1.012-.407 1.012H19.27c.072.264.11.542.11.828v5.664c0 .914-.994 1.292-1.602.576-.229-.27-1.067-1.25-2.155-2.52-2.92 4.183-10.266 6.462-12.34 3.006a.915.915 0 01-.05 0h-.743a.991.991 0 110-1.982h.246c.014-1.687 1.23-3.148 2.846-3.783a7.448 7.448 0 002.76-1.889zm7.543-2.145c0-.127-.001-.256-.005-.388a15.693 15.693 0 00-.632-3.939c-.38-1.282-.887-2.33-1.425-2.992-.545-.671-.906-.715-1.085-.69-.223.032-.292.098-.322.129-.05.052-.135.176-.209.45-.152.567-.15 1.286-.147 2.186v.244c.002 1.134-.009 2.028-.145 2.92a11.292 11.292 0 01-.537 2.08h4.507zm-3.468 3.056c-1.636 3.166-4.981 4.71-8.118 4.87a.562.562 0 00.057 1.124c3.294-.169 6.921-1.749 8.845-5.081l-.784-.913z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.4688 -0.1000) scale(0.050000)"><g fill="currentColor" fill-rule="nonzero"><path d="M159.626 22c-1.002 0-1.886-.191-2.651-.574a4.55 4.55 0 01-1.803-1.666c-.437-.71-.656-1.521-.656-2.432 0-.984.255-1.822.765-2.514.51-.71 1.194-1.248 2.05-1.612.856-.383 1.812-.574 2.869-.574.564 0 1.083.037 1.557.11.492.072.92.164 1.284.273.383.109.683.218.902.328v-.656c0-.838-.31-1.512-.929-2.022-.601-.528-1.403-.792-2.405-.792-.692 0-1.348.154-1.967.464a4.31 4.31 0 00-1.53 1.257l-2.158-1.694a6.783 6.783 0 011.53-1.448 6.114 6.114 0 011.967-.93 7.849 7.849 0 012.268-.327c2.076 0 3.661.5 4.754 1.503 1.111.983 1.667 2.395 1.667 4.235v8.634h-3.197v-1.557h-.191a4.409 4.409 0 01-.957.983c-.4.291-.865.528-1.393.71-.528.2-1.12.301-1.776.301zm.683-2.596c.747 0 1.393-.164 1.94-.491a3.547 3.547 0 001.257-1.34 3.827 3.827 0 00.437-1.775 5.033 5.033 0 00-1.421-.547 7.082 7.082 0 00-1.667-.191c-1.129 0-1.921.219-2.377.656a2.149 2.149 0 00-.683 1.612c0 .6.219 1.102.656 1.503.437.382 1.056.573 1.858.573zM139.245 21.563V7.628h3.06v1.83h.192c.4-.673.992-1.22 1.776-1.639a5.303 5.303 0 012.541-.628c1.712 0 2.996.52 3.852 1.557.875 1.02 1.312 2.377 1.312 4.072v8.743h-3.279v-8.306c0-1.02-.255-1.776-.765-2.268-.51-.51-1.193-.765-2.049-.765-.674 0-1.266.191-1.776.574-.51.364-.911.856-1.203 1.475a4.768 4.768 0 00-.409 1.995v7.295h-3.252zM128.487 22c-1.002 0-1.885-.191-2.65-.574a4.56 4.56 0 01-1.804-1.666c-.437-.71-.655-1.521-.655-2.432 0-.984.255-1.822.765-2.514.51-.71 1.193-1.248 2.049-1.612.856-.383 1.812-.574 2.869-.574.565 0 1.084.037 1.557.11.492.072.92.164 1.284.273.383.109.684.218.902.328v-.656c0-.838-.31-1.512-.929-2.022-.601-.528-1.402-.792-2.404-.792-.692 0-1.348.154-1.968.464a4.31 4.31 0 00-1.53 1.257l-2.158-1.694a6.783 6.783 0 011.53-1.448 6.124 6.124 0 011.967-.93 7.854 7.854 0 012.268-.327c2.077 0 3.661.5 4.754 1.503 1.111.983 1.667 2.395 1.667 4.235v8.634h-3.197v-1.557h-.191a4.425 4.425 0 01-.956.983 5.29 5.29 0 01-1.394.71c-.528.2-1.12.301-1.776.301zm.683-2.596c.747 0 1.394-.164 1.94-.491a3.532 3.532 0 001.257-1.34 3.827 3.827 0 00.437-1.775 5.021 5.021 0 00-1.421-.547 7.074 7.074 0 00-1.666-.191c-1.13 0-1.922.219-2.377.656a2.146 2.146 0 00-.684 1.612c0 .6.219 1.102.656 1.503.437.382 1.057.573 1.858.573zM108.106 21.563V7.628h3.06v1.83h.192c.4-.673.992-1.22 1.776-1.639a5.303 5.303 0 012.541-.628c1.712 0 2.996.52 3.852 1.557.875 1.02 1.312 2.377 1.312 4.072v8.743h-3.279v-8.306c0-1.02-.255-1.776-.765-2.268-.51-.51-1.193-.765-2.049-.765-.674 0-1.266.191-1.776.574-.51.364-.911.856-1.203 1.475a4.768 4.768 0 00-.409 1.995v7.295h-3.252zM97.348 22c-1.002 0-1.885-.191-2.65-.574a4.552 4.552 0 01-1.803-1.666c-.438-.71-.656-1.521-.656-2.432 0-.984.255-1.822.765-2.514.51-.71 1.193-1.248 2.049-1.612.856-.383 1.813-.574 2.869-.574.565 0 1.084.037 1.557.11.492.072.92.164 1.285.273.382.109.683.218.901.328v-.656c0-.838-.309-1.512-.929-2.022-.601-.528-1.402-.792-2.404-.792a4.34 4.34 0 00-1.967.464c-.62.31-1.13.729-1.53 1.257l-2.16-1.694a6.79 6.79 0 011.531-1.448 6.119 6.119 0 011.967-.93 7.85 7.85 0 012.268-.327c2.077 0 3.661.5 4.754 1.503 1.111.983 1.667 2.395 1.667 4.235v8.634h-3.197v-1.557h-.191a4.425 4.425 0 01-.956.983 5.286 5.286 0 01-1.394.71c-.528.2-1.12.301-1.776.301zm.683-2.596c.747 0 1.394-.164 1.94-.491a3.533 3.533 0 001.257-1.34 3.815 3.815 0 00.437-1.775 5.01 5.01 0 00-1.421-.547 7.076 7.076 0 00-1.666-.191c-1.13 0-1.922.219-2.377.656a2.147 2.147 0 00-.683 1.612c0 .6.218 1.102.655 1.503.438.382 1.057.573 1.858.573zM76.151 21.563V2h7.514c1.093 0 2.077.228 2.951.683.893.455 1.603 1.075 2.131 1.858.529.765.793 1.64.793 2.623 0 1.002-.255 1.858-.765 2.568a4.787 4.787 0 01-1.858 1.613v.19a4.941 4.941 0 012.404 1.695c.62.783.93 1.74.93 2.869 0 1.11-.292 2.076-.875 2.896-.565.802-1.32 1.43-2.268 1.885-.947.456-1.995.683-3.142.683H76.15zm1.858-8.552v-2.923h5.438c.6 0 1.11-.119 1.53-.356a2.47 2.47 0 00.956-.929c.219-.4.328-.82.328-1.256 0-.456-.11-.866-.328-1.23a2.28 2.28 0 00-.929-.929c-.4-.237-.883-.355-1.448-.355h-4.044v13.47h4.372c.637 0 1.175-.127 1.612-.382.455-.255.792-.583 1.01-.984a2.73 2.73 0 00.356-1.366c0-.51-.118-.975-.355-1.394-.219-.419-.565-.747-1.038-.983-.456-.255-1.02-.383-1.694-.383h-5.766zM59.271 22c-1.439 0-2.714-.319-3.825-.956a6.971 6.971 0 01-2.596-2.65c-.619-1.13-.929-2.396-.929-3.798 0-1.403.31-2.66.93-3.771a6.726 6.726 0 012.595-2.65c1.111-.656 2.386-.984 3.825-.984 1.457 0 2.733.328 3.825.984a6.917 6.917 0 012.596 2.677c.62 1.111.93 2.36.93 3.743 0 1.403-.31 2.669-.93 3.798a6.971 6.971 0 01-2.595 2.65c-1.112.638-2.387.957-3.826.957zm0-3.033c.729 0 1.403-.173 2.022-.519a3.967 3.967 0 001.503-1.503c.383-.655.574-1.439.574-2.35 0-.929-.191-1.712-.574-2.35a3.967 3.967 0 00-1.503-1.502 4.024 4.024 0 00-1.994-.52 4.23 4.23 0 00-2.05.52c-.619.346-1.12.847-1.502 1.503-.383.655-.574 1.439-.574 2.35 0 .928.191 1.72.574 2.377a3.967 3.967 0 001.502 1.502 4.362 4.362 0 002.022.492zM36.65 21.563V7.628h3.06v1.83h.191c.401-.673.993-1.22 1.776-1.639a5.304 5.304 0 012.541-.628c1.713 0 2.997.52 3.853 1.557.874 1.02 1.312 2.377 1.312 4.072v8.743h-3.28v-8.306c0-1.02-.254-1.776-.764-2.268-.51-.51-1.193-.765-2.05-.765-.673 0-1.265.191-1.776.574-.51.364-.91.856-1.202 1.475a4.765 4.765 0 00-.41 1.995v7.295H36.65zM25.892 22c-1.002 0-1.885-.191-2.65-.574a4.552 4.552 0 01-1.804-1.666c-.437-.71-.655-1.521-.655-2.432 0-.984.255-1.822.765-2.514.51-.71 1.193-1.248 2.049-1.612.856-.383 1.812-.574 2.869-.574.564 0 1.084.037 1.557.11.492.072.92.164 1.284.273.383.109.684.218.902.328v-.656c0-.838-.31-1.512-.929-2.022-.601-.528-1.402-.792-2.404-.792a4.34 4.34 0 00-1.968.464c-.619.31-1.129.729-1.53 1.257L21.22 9.896a6.788 6.788 0 011.53-1.448 6.117 6.117 0 011.967-.93 7.85 7.85 0 012.268-.327c2.076 0 3.661.5 4.754 1.503 1.111.983 1.667 2.395 1.667 4.235v8.634h-3.197v-1.557h-.191a4.407 4.407 0 01-.957.983c-.4.291-.865.528-1.393.71-.528.2-1.12.301-1.776.301zm.683-2.596c.747 0 1.394-.164 1.94-.491a3.54 3.54 0 001.257-1.34 3.823 3.823 0 00.437-1.775 5.024 5.024 0 00-1.42-.547 7.083 7.083 0 00-1.668-.191c-1.129 0-1.921.219-2.377.656a2.148 2.148 0 00-.683 1.612c0 .6.219 1.102.656 1.503.437.382 1.057.573 1.858.573zM2 21.563V2h3.935l8.36 13.743h.192l-.192-3.77V2h3.334v19.563h-3.525L5.306 7.083h-.191l.191 3.77v10.71H2z"></path></g></g></g></svg>',nova:'<svg fill="none" viewBox="0 0 10.9878 1" data-combine-word="Nova" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-nova-2-_R_0_" x1="33.663" x2="-2.086" y1="33.633" y2="-1.901"><stop stop-color="#ff6200"></stop><stop offset=".399" stop-color="#e433ff"></stop><stop offset=".96" stop-color="#6842ff"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g transform="translate(0.0002 -0.2250) scale(0.045312)"><g><g mask="url(#lobe-icons-nova-0-_R_0_)"><mask height="32" id="lobe-icons-nova-0-_R_0_" maskUnits="userSpaceOnUse" style="mask-type:luminance" width="32" x="0" y="0"><path d="M31.8 0H0v32h31.8z" fill="currentColor"></path></mask><mask height="32" id="lobe-icons-nova-1-_R_0_" maskUnits="userSpaceOnUse" style="mask-type:alpha" width="32" x="0" y="0"><path d="m17.865 23.28 1.533 1.543c.07.07.092.175.055.267l-2.398 6.118A1.24 1.24 0 0 1 15.9 32c-.51 0-.969-.315-1.155-.793l-3.451-8.804-5.582 5.617a.246.246 0 0 1-.35 0l-1.407-1.415a.25.25 0 0 1 0-.352l6.89-6.932a1.3 1.3 0 0 1 .834-.398 1.25 1.25 0 0 1 1.232.79l2.992 7.63 1.557-3.977a.248.248 0 0 1 .408-.085zm8.224-19.3-5.583 5.617-3.45-8.805a1.24 1.24 0 0 0-1.43-.762c-.414.092-.744.407-.899.805l-2.38 6.072a.25.25 0 0 0 .055.267l1.533 1.543c.127.127.34.082.407-.085L15.9 4.655l2.991 7.629a1.24 1.24 0 0 0 2.035.425l6.922-6.965a.25.25 0 0 0 0-.352L26.44 3.977a.246.246 0 0 0-.35 0zM8.578 17.566l-3.953-1.567 7.582-3.01c.49-.195.815-.685.785-1.24a1.3 1.3 0 0 0-.395-.84l-6.886-6.93a.246.246 0 0 0-.35 0L3.954 5.395a.25.25 0 0 0 0 .353l5.583 5.617-8.75 3.472a1.25 1.25 0 0 0 0 2.325l6.079 2.412a.24.24 0 0 0 .266-.055l1.533-1.542a.25.25 0 0 0-.085-.41zm22.434-2.73-6.08-2.412a.24.24 0 0 0-.265.055l-1.533 1.542a.25.25 0 0 0 .084.41L27.172 16l-7.583 3.01a1.255 1.255 0 0 0-.785 1.24c.018.317.172.614.395.84l6.89 6.931a.246.246 0 0 0 .35 0l1.406-1.415a.25.25 0 0 0 0-.352l-5.582-5.617 8.75-3.472a1.25 1.25 0 0 0 0-2.325z" fill="currentColor"></path></mask><g mask="url(#lobe-icons-nova-1-_R_0_)"><path d="M-2.915 34.125h37.448V-2.109H-2.915z" fill="url(#lobe-icons-nova-2-_R_0_)"></path></g></g><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-nova-2-_R_0_" x1="33.663" x2="-2.086" y1="33.633" y2="-1.901"><stop stop-color="#ff6200"></stop><stop offset=".399" stop-color="#e433ff"></stop><stop offset=".96" stop-color="#6842ff"></stop></linearGradient></defs></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(0.0002 -0.2250) scale(0.045312)"><g fill="none"><path d="m17.865 23.28 1.533 1.543c.07.07.092.175.055.267l-2.398 6.118A1.24 1.24 0 0 1 15.9 32c-.51 0-.969-.315-1.155-.793l-3.451-8.804-5.582 5.617a.246.246 0 0 1-.35 0l-1.407-1.415a.25.25 0 0 1 0-.352l6.89-6.932a1.3 1.3 0 0 1 .834-.398 1.25 1.25 0 0 1 1.232.79l2.992 7.63 1.557-3.977a.248.248 0 0 1 .408-.085zm8.224-19.3-5.583 5.617-3.45-8.805a1.24 1.24 0 0 0-1.43-.762c-.414.092-.744.407-.899.805l-2.38 6.072a.25.25 0 0 0 .055.267l1.533 1.543c.127.127.34.082.407-.085L15.9 4.655l2.991 7.629a1.24 1.24 0 0 0 2.035.425l6.922-6.965a.25.25 0 0 0 0-.352L26.44 3.977a.246.246 0 0 0-.35 0zM8.578 17.566l-3.953-1.567 7.582-3.01c.49-.195.815-.685.785-1.24a1.3 1.3 0 0 0-.395-.84l-6.886-6.93a.246.246 0 0 0-.35 0L3.954 5.395a.25.25 0 0 0 0 .353l5.583 5.617-8.75 3.472a1.25 1.25 0 0 0 0 2.325l6.079 2.412a.24.24 0 0 0 .266-.055l1.533-1.542a.25.25 0 0 0-.085-.41zm22.434-2.73-6.08-2.412a.24.24 0 0 0-.265.055l-1.533 1.542a.25.25 0 0 0 .084.41L27.172 16l-7.583 3.01a1.255 1.255 0 0 0-.785 1.24c.018.317.172.614.395.84l6.89 6.931a.246.246 0 0 0 .35 0l1.406-1.415a.25.25 0 0 0 0-.352l-5.582-5.617 8.75-3.472a1.25 1.25 0 0 0 0-2.325z" fill="currentColor"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6437 -0.0488) scale(0.048780)"><g fill="currentColor" fill-rule="evenodd"><path d="M183.349 22c-1.461 0-2.636-.415-3.525-1.244-.869-.83-1.303-1.935-1.303-3.317 0-1.462.533-2.627 1.599-3.495 1.086-.889 2.518-1.333 4.295-1.333.948 0 1.995.128 3.14.385v-1.481c0-.909-.188-1.53-.563-1.866-.375-.336-1.066-.504-2.073-.504-.691 0-1.422.07-2.192.208-.77.118-1.55.286-2.34.503-.158.04-.267.06-.326.06-.336 0-.503-.228-.503-.682V7.901c0-.316.039-.533.118-.651.099-.119.277-.237.533-.356.691-.296 1.531-.523 2.518-.681a16.69 16.69 0 012.962-.267c2.034 0 3.515.415 4.443 1.244.948.81 1.422 2.093 1.422 3.85v9.746c0 .493-.247.74-.741.74h-2.014c-.435 0-.711-.217-.829-.651l-.178-.682a7.346 7.346 0 01-2.133 1.333c-.79.316-1.56.474-2.31.474zm1.214-2.903c1.027 0 2.024-.404 2.992-1.214v-2.577c-.375-.06-.77-.109-1.185-.148-.415-.04-.8-.06-1.155-.06-1.718 0-2.577.692-2.577 2.074 0 .612.168 1.086.504 1.422.335.335.809.503 1.421.503zM170.756 21.526h-2.577c-.276 0-.494-.05-.652-.148-.158-.1-.296-.306-.414-.622l-5.065-13.181a11.554 11.554 0 01-.148-.415 1.023 1.023 0 01-.059-.326c0-.296.197-.444.592-.444h2.962c.553 0 .898.257 1.037.77l3.05 10.485 3.11-10.485c.139-.513.484-.77 1.037-.77h2.873c.395 0 .593.148.593.444 0 .1-.02.208-.06.326-.039.119-.089.257-.148.415l-5.065 13.18c-.118.317-.256.524-.414.623-.158.098-.376.148-.652.148zM153.044 21.97c-2.31 0-4.137-.69-5.48-2.073-1.342-1.402-2.014-3.386-2.014-5.953 0-2.548.672-4.512 2.014-5.895 1.343-1.402 3.17-2.103 5.48-2.103 2.31 0 4.137.701 5.48 2.103 1.342 1.383 2.014 3.347 2.014 5.895 0 2.567-.672 4.551-2.014 5.953-1.343 1.382-3.17 2.073-5.48 2.073zm0-3.317c.987 0 1.748-.365 2.281-1.096.553-.75.829-1.955.829-3.613 0-1.64-.276-2.824-.829-3.555-.533-.75-1.294-1.125-2.281-1.125-.968 0-1.728.375-2.281 1.125-.553.73-.829 1.916-.829 3.555 0 1.658.276 2.863.829 3.613.553.73 1.313 1.096 2.281 1.096zM128.034 21.526h-2.429c-.493 0-.74-.247-.74-.74V1.74c0-.493.247-.74.74-.74h3.288c.316 0 .533.05.652.148.138.08.276.227.414.444l7.998 13.774V1.74c0-.493.246-.74.74-.74h2.429c.493 0 .74.247.74.74v19.046c0 .493-.247.74-.74.74h-3.288c-.316 0-.543-.04-.681-.118a2.05 2.05 0 01-.385-.474l-7.998-13.655v13.507c0 .493-.246.74-.74.74zM102.264 21.526h-2.843c-.494 0-.74-.247-.74-.74V7.13c0-.494.246-.74.74-.74h2.133c.454 0 .73.217.829.651l.266.978c1.778-1.383 3.673-2.074 5.687-2.074 1.402 0 2.479.385 3.229 1.155.77.75 1.155 1.827 1.155 3.229v10.456c0 .493-.247.74-.74.74h-2.844c-.494 0-.74-.247-.74-.74v-9.182c0-1.56-.721-2.34-2.163-2.34-1.086 0-2.162.335-3.228 1.007v10.515c0 .493-.247.74-.741.74zM87.817 21.97c-2.31 0-4.136-.69-5.48-2.073-1.342-1.402-2.013-3.386-2.013-5.953 0-2.548.671-4.512 2.014-5.895 1.343-1.402 3.17-2.103 5.48-2.103 2.31 0 4.136.701 5.48 2.103 1.342 1.383 2.013 3.347 2.013 5.895 0 2.567-.671 4.551-2.014 5.953-1.343 1.382-3.17 2.073-5.48 2.073zm0-3.317c.988 0 1.748-.365 2.281-1.096.553-.75.83-1.955.83-3.613 0-1.64-.277-2.824-.83-3.555-.533-.75-1.293-1.125-2.28-1.125-.968 0-1.728.375-2.281 1.125-.553.73-.83 1.916-.83 3.555 0 1.658.277 2.863.83 3.613.553.73 1.313 1.096 2.28 1.096zM77.617 21.526H66.39c-.494 0-.74-.247-.74-.74v-1.511c0-.297.029-.534.088-.711.06-.178.188-.375.385-.593L73.44 9.59h-6.753c-.494 0-.74-.247-.74-.74V7.13c0-.494.246-.74.74-.74h10.782c.493 0 .74.246.74.74V8.7c0 .296-.03.533-.089.71-.06.178-.188.376-.385.593l-7.405 8.323h7.287c.493 0 .74.247.74.74v1.718c0 .494-.247.74-.74.74zM54.487 22c-1.462 0-2.636-.415-3.525-1.244-.869-.83-1.303-1.935-1.303-3.317 0-1.462.533-2.627 1.6-3.495 1.085-.889 2.517-1.333 4.294-1.333.948 0 1.994.128 3.14.385v-1.481c0-.909-.188-1.53-.563-1.866-.375-.336-1.066-.504-2.074-.504-.69 0-1.421.07-2.191.208-.77.118-1.55.286-2.34.503-.158.04-.267.06-.326.06-.336 0-.504-.228-.504-.682V7.901c0-.316.04-.533.119-.651.099-.119.276-.237.533-.356.691-.296 1.53-.523 2.518-.681a16.689 16.689 0 012.962-.267c2.034 0 3.515.415 4.443 1.244.947.81 1.421 2.093 1.421 3.85v9.746c0 .493-.247.74-.74.74h-2.014c-.435 0-.711-.217-.83-.651l-.177-.682a7.35 7.35 0 01-2.133 1.333c-.79.316-1.56.474-2.31.474zm1.214-2.903c1.027 0 2.024-.404 2.992-1.214v-2.577c-.375-.06-.77-.109-1.185-.148-.415-.04-.8-.06-1.155-.06-1.718 0-2.577.692-2.577 2.074 0 .612.168 1.086.503 1.422.336.335.81.503 1.422.503zM27.03 21.526h-2.844c-.494 0-.74-.247-.74-.74V7.13c0-.494.246-.74.74-.74h2.133c.454 0 .73.217.83.651l.236.8c1.027-.671 1.955-1.155 2.784-1.451a7.947 7.947 0 012.636-.445c1.778 0 3.032.632 3.762 1.896 1.007-.671 1.955-1.155 2.844-1.451a8.654 8.654 0 012.754-.445c1.382 0 2.449.385 3.2 1.155.77.75 1.154 1.827 1.154 3.229v10.456c0 .493-.247.74-.74.74h-2.844c-.493 0-.74-.247-.74-.74v-9.508c0-1.343-.602-2.014-1.807-2.014-1.066 0-2.142.256-3.228.77v10.752c0 .493-.247.74-.741.74h-2.843c-.494 0-.74-.247-.74-.74v-9.508c0-1.343-.603-2.014-1.808-2.014-.533 0-1.066.069-1.6.207a7.649 7.649 0 00-1.658.592v10.723c0 .493-.247.74-.74.74zM2.592 21.526c-.395 0-.592-.148-.592-.444 0-.099.02-.217.06-.355.058-.158.118-.326.177-.504L8.812 1.77c.119-.316.257-.523.415-.622C9.385 1.05 9.602 1 9.88 1h3.288c.276 0 .493.05.651.148.178.099.316.306.415.622l6.575 18.453c.06.178.109.346.148.504.06.138.09.256.09.355 0 .296-.198.444-.593.444h-3.258c-.316 0-.543-.059-.681-.177-.139-.119-.257-.316-.356-.593l-1.214-3.91h-7.08l-1.154 3.91c-.08.277-.198.474-.356.593-.138.118-.375.177-.71.177H2.591zm6.22-7.878h5.213l-2.636-8.59-2.577 8.59z"></path></g></g></g></svg>',openai:'<svg fill="none" viewBox="0 0 4.5678 1" data-combine-word="GPT" xmlns="http://www.w3.org/2000/svg"><clipPath id="crop-openai"><rect x="1.7500" y="-1" width="2.8178" height="3"/></clipPath><g class="dsh-combine-mark-mono dsh-combine-mark-color"><g transform="translate(-0.2852 -2.0104) scale(0.002787)"><g fill="currentColor"><path d="M583.793,841.346c11.778,-44.127 0.356,-93.159 -34.264,-127.777c-34.616,-34.618 -83.65,-46.041 -127.777,-34.264c-32.329,-32.262 -80.503,-46.887 -127.794,-34.215c-47.289,12.672 -81.694,49.424 -93.563,93.526c-44.102,11.866 -80.854,46.274 -93.523,93.564c-12.673,47.289 1.952,95.462 34.214,127.791c-11.776,44.126 -0.354,93.16 34.264,127.777c34.618,34.62 83.651,46.041 127.779,34.264c32.329,32.263 80.503,46.888 127.79,34.215c47.289,-12.672 81.695,-49.425 93.564,-93.526c44.104,-11.865 80.857,-46.274 93.526,-93.563c12.672,-47.291 -1.952,-95.462 -34.216,-127.792Zm-179.693,-124.105c39.682,-22.943 91.303,-17.439 125.254,16.511c23.963,23.965 33.748,56.745 29.367,87.904l-111.77,-64.53c-4.415,-2.549 -9.855,-2.549 -14.27,0l-130.876,75.563l0,-50.806c0,-3.427 1.837,-6.63 4.803,-8.343l97.49,-56.297l0.002,-0.002Zm-41.659,113.397l60.638,35.01l0,70.02l-60.638,35.01l-60.639,-35.01l0,-70.02l60.639,-35.01Zm-138.015,-57.766c-0.029,-45.836 30.549,-87.793 76.926,-100.217c32.734,-8.773 66.015,-0.856 90.81,18.518l-111.768,64.53c-4.415,2.549 -7.134,7.261 -7.134,12.359l0,151.125l-44.001,-25.405c-2.967,-1.715 -4.824,-4.909 -4.824,-8.332l-0.009,-112.576l0,-0.002Zm-89.99,66.69c8.773,-32.735 32.268,-57.601 61.443,-69.386l0,129.056c0,5.099 2.719,9.81 7.134,12.359l130.877,75.564l-44.002,25.405c-2.964,1.713 -6.661,1.724 -9.627,0.011l-97.498,-56.279c-39.71,-22.893 -60.754,-70.353 -48.329,-116.727l0.002,-0.003Zm186.345,244.515c-39.681,22.943 -91.303,17.437 -125.253,-16.512c-23.965,-23.965 -33.749,-56.745 -29.368,-87.904l111.769,64.53c4.414,2.549 9.856,2.549 14.271,0l130.876,-75.564l0,50.807c0,3.429 -1.837,6.632 -4.803,8.343l-97.49,56.298l-0.002,0.002Zm179.675,-55.631c0.028,45.837 -30.55,87.793 -76.927,100.216c-32.736,8.774 -66.017,0.856 -90.81,-18.519l111.767,-64.529c4.417,-2.549 7.136,-7.262 7.136,-12.359l0,-151.123l44.001,25.404c2.965,1.713 4.824,4.909 4.824,8.332l0.009,112.578Zm89.986,-66.691c-8.773,32.735 -32.268,57.601 -61.444,69.387l0,-129.058c0,-5.097 -2.718,-9.808 -7.133,-12.359l-130.878,-75.562l44.002,-25.405c2.965,-1.714 6.662,-1.726 9.628,-0.012l97.497,56.278c39.712,22.893 60.754,70.355 48.329,116.729l-0.001,0.002Z" style=""/></g></g></g><g clip-path="url(#crop-openai)"><g class="dsh-combine-text"><g transform="translate(-4.3541 -3.0172) scale(0.003905)"><g fill="currentColor"><path d="M882.894,985.151c-46.843,0 -79.373,-35.476 -79.373,-84.506c0,-49.03 32.578,-84.506 78.67,-84.506c33.672,0 59.617,19.759 67.304,43.897l52.326,0c-9.132,-52.678 -58.522,-91.091 -120.372,-91.091c-74.28,0 -128.761,58.914 -128.761,131.7c0,72.787 53.027,131.7 129.153,131.7c62.912,0 111.201,-37.67 121.082,-91.091l-51.935,0c-8.781,24.498 -34.374,43.897 -68.045,43.897l-0.041,0l-0.008,0Z" style=""/><path d="M1131.2,842.121c-24.148,0 -43.154,10.624 -53.781,25.241l0,-94.739l-47.544,0l0,256.071l47.544,0l0,-98.429c0,-28.537 15.368,-47.192 40.258,-47.192c22.698,0 35.469,17.563 35.469,42.052l0,103.521l47.544,0l0,-111.201c0,-45.35 -27.787,-75.381 -69.49,-75.381l0,0.057Z" style=""/><path d="M1395.71,909.439c0,-41.699 -28.538,-67.301 -81.217,-67.301c-43.155,0 -77.576,24.148 -83.412,59.266l47.944,0c3.641,-12.07 16.813,-21.603 35.125,-21.603c23.797,0 35.125,12.421 35.125,34.022l0,1.094l-46.451,4.04c-48.639,4.04 -75.734,23.796 -75.734,61.108c0,31.477 27.086,52.327 64.756,52.327c25.242,0 49.743,-9.882 60.015,-26.343c0,8.03 0.744,15.367 2.197,22.696l44.255,0c-1.844,-11.72 -2.547,-25.242 -2.547,-40.959l0,-78.281l-0.048,-0.088l-0.008,0.022Zm-46.492,43.557c0,21.601 -16.109,43.547 -48.639,43.547c-17.563,0 -27.086,-8.431 -27.086,-20.852c0,-13.524 9.132,-21.951 29.633,-23.797l46.092,-4.04l0,5.142Z" style=""/><path d="M1495.64,786.533l-47.545,0l0,59.263l-38.061,0l0,38.416l38.061,0l0,89.995c0,34.773 17.914,54.525 56.328,54.525l38.062,0l0,-39.509l-24.148,0c-16.11,0 -22.697,-5.483 -22.697,-20.499l0,-84.506l46.845,0l0,-38.413l-46.845,0l0,-59.264l0,-0.008Z" style=""/><path d="M1778.69,891.873l-81.969,0l0,40.957l69.889,0c-4.78,34.024 -36.617,54.525 -72.083,54.525c-51.234,0 -81.216,-37.672 -81.216,-86.702c0,-49.029 33.671,-84.865 79.722,-84.865c31.477,0 57.118,18.305 63.696,38.765l52.287,0c-9.883,-50.835 -56.719,-85.608 -116.693,-85.608c-73.888,0 -128.762,59.615 -128.762,132.051c0,72.436 50.49,131.349 125.865,131.349c34.415,0 65.498,-15.367 79.373,-36.218l0,32.579l42.452,0l0,-104.264c0,-20.851 -11.678,-32.578 -32.571,-32.578l0.01,0.009Z" style=""/><path d="M1962.44,772.631l-113.397,0l0,256.071l48.247,0l0,-96.231l65.494,0c50.541,0 86.356,-29.633 86.356,-79.374c0,-49.74 -35.815,-80.474 -86.7,-80.474l0,0.008Zm-3.299,117.434l-61.851,0l0,-73.537l61.851,0c24.913,0 41.002,14.267 41.002,36.569c0,22.304 -16.089,36.962 -41.002,36.962l0,0.006Z" style=""/><path d="M2061.15,772.623l0,43.897l87.459,0l0,212.174l48.251,0l0,-212.174l87.814,0l0,-43.897l-223.543,0l0.037,0l-0.018,0Z" style=""/></g></g></g></g></svg>',perplexity:'<svg fill="none" viewBox="0 0 7.5161 1" data-combine-word="Perplexity" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0906 -0.2250) scale(0.060417)"><g><path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" fill="#22B8CD" fill-rule="nonzero"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0906 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.4635 -0.0000) scale(0.052632)"><g fill="currentColor" fill-rule="evenodd"><path d="M38.542 5.218h1.151V7.59h-1.49c-1.167 0-2.036.281-2.612.843-.575.563-.863 1.485-.863 2.768v7.773h-2.351V5.271h2.351v2.187c0 .123.062.185.184.185.069 0 .121-.017.157-.053a.58.58 0 00.104-.211c.453-1.44 1.577-2.16 3.371-2.16h-.002zm15.36 2.938c.617 1.098.928 2.42.928 3.966 0 1.545-.309 2.867-.928 3.965-.62 1.098-1.42 1.92-2.404 2.464a6.446 6.446 0 01-3.174.817c-2.23 0-3.797-.896-4.703-2.688-.069-.14-.157-.211-.262-.211-.105 0-.157.052-.157.158v7.352h-2.351V5.271h2.351v2.345c0 .106.052.159.157.159.105 0 .191-.07.262-.211.906-1.793 2.473-2.689 4.703-2.689 1.132 0 2.19.272 3.174.817.984.545 1.785 1.366 2.404 2.464zm-1.424 3.966c0-1.617-.43-2.877-1.292-3.781-.862-.904-1.998-1.357-3.41-1.357-1.413 0-2.548.453-3.41 1.357-.863.905-1.179 2.166-1.179 3.78 0 1.616.316 2.878 1.178 3.782.863.905 2 1.356 3.41 1.356 1.411 0 2.549-.453 3.411-1.356.862-.904 1.292-2.166 1.292-3.781zM15.05 8.177c.618 1.098.928 2.42.928 3.965 0 1.546-.308 2.868-.928 3.966-.619 1.098-1.42 1.919-2.403 2.464a6.448 6.448 0 01-3.175.817c-2.23 0-3.797-.896-4.702-2.688-.07-.14-.158-.212-.262-.212-.105 0-.158.053-.158.159V24H2V5.292h2.351v2.345c0 .106.053.159.158.159.104 0 .19-.07.261-.212.906-1.792 2.473-2.688 4.703-2.688 1.132 0 2.19.272 3.175.817.983.545 1.784 1.366 2.403 2.464h-.002zm-1.423 3.965c0-1.616-.43-2.877-1.293-3.78-.862-.904-1.998-1.357-3.41-1.357-1.412 0-2.548.453-3.41 1.357-.862.905-1.178 2.165-1.178 3.78 0 1.615.316 2.878 1.178 3.781.862.906 1.998 1.357 3.41 1.357 1.412 0 2.548-.453 3.41-1.357.863-.903 1.293-2.166 1.293-3.78zm14.422 2.481h2.482c-.33 1.283-1.006 2.395-2.023 3.334-1.02.94-2.479 1.41-4.378 1.41-1.429 0-2.686-.295-3.775-.884a6.13 6.13 0 01-2.521-2.516c-.593-1.089-.889-2.372-.889-3.847 0-1.476.288-2.758.863-3.847.574-1.089 1.38-1.928 2.417-2.517 1.036-.588 2.25-.883 3.644-.883 1.393 0 2.547.29 3.514.87.968.58 1.69 1.349 2.168 2.305.48.959.719 2.008.719 3.15v1.58H19.427c.086 1.37.544 2.46 1.37 3.268.828.807 1.939 1.213 3.332 1.213 1.132 0 2-.232 2.6-.698.601-.466 1.04-1.111 1.32-1.938zm-8.595-3.82h8.204c0-1.194-.305-2.13-.914-2.807-.61-.676-1.568-1.015-2.874-1.015-1.22 0-2.217.33-2.99.988-.775.659-1.25 1.604-1.424 2.832l-.002.002zm37.238 8.17h2.352V0H56.69v18.974-.002zM89.316 3.774h2.747V.81h-2.747v2.966zm9.688 13.156c-.426.043-.684.066-.77.066a.39.39 0 01-.289-.106.395.395 0 01-.104-.29c0-.087.022-.348.065-.778.043-.43.066-1.094.066-1.988V7.279h3.354l-.66-2.008h-2.692v-3.69h-2.352v3.688h-2.557v2.008h2.557v7.214c0 1.512.367 2.636 1.098 3.374.732.737 1.846 1.107 3.345 1.107h1.83v-2.107h-.915c-.889 0-1.547.022-1.974.066h-.002zm13.759-11.662l-3.893 11.498c-.053.141-.135.326-.402.326-.268 0-.35-.185-.402-.326l-3.893-11.498h-2.398l4.508 13.703h1.594a.81.81 0 01.235.026c.053.017.096.06.131.133.07.105.06.264-.026.473l-.731 2.002c-.105.264-.305.396-.6.396-.106 0-.349-.023-.732-.066a13.71 13.71 0 00-1.49-.066h-1.907v2.107h2.508c1.463 0 2.344-.25 3.102-.75.757-.5 1.345-1.383 1.764-2.65L115 5.795v-.526h-2.237v.001zm-31.127 5.113L77.953 5.27h-2.588v.527l4.415 5.93-5.382 6.72v.526h2.64l4.285-5.507 3.998 5.507h2.535v-.526l-4.677-6.324 5.07-6.298v-.553h-2.64l-3.971 5.113-.002-.002zm7.931 8.59h2.351v-13.7h-2.35v13.702-.002zm-15.062-4.349c-.331 1.283-1.006 2.395-2.024 3.334-1.02.94-2.479 1.41-4.377 1.41-1.43 0-2.686-.295-3.775-.884a6.13 6.13 0 01-2.522-2.516c-.593-1.089-.888-2.372-.888-3.847 0-1.476.288-2.758.862-3.847.574-1.089 1.38-1.928 2.417-2.517 1.036-.588 2.25-.883 3.644-.883 1.394 0 2.547.29 3.515.87.967.58 1.689 1.349 2.168 2.305.479.959.718 2.008.718 3.15v1.58H63.401c.086 1.37.544 2.46 1.371 3.268.827.807 1.938 1.213 3.332 1.213 1.132 0 2-.232 2.6-.698.6-.466 1.04-1.111 1.319-1.938h2.482zm-11.078-3.82h8.205c0-1.194-.305-2.13-.915-2.807-.61-.676-1.568-1.015-2.873-1.015-1.22 0-2.217.33-2.991.988-.775.659-1.25 1.604-1.424 2.832l-.002.002z"></path></g></g></g></svg>',qwen:'<svg fill="none" viewBox="0 0 4.8478 1" data-combine-word="Qwen" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lobe-icons-qwen-_R_0_" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" stop-color="#6336E7" stop-opacity=".84"></stop><stop offset="100%" stop-color="#6F69F7" stop-opacity=".84"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g><path d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z" fill="url(#lobe-icons-qwen-_R_0_)" fill-rule="nonzero"></path><defs><linearGradient id="lobe-icons-qwen-_R_0_" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" stop-color="#6336E7" stop-opacity=".84"></stop><stop offset="100%" stop-color="#6F69F7" stop-opacity=".84"></stop></linearGradient></defs></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0604 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.5383 -0.0000) scale(0.045455)"><g fill="currentColor" fill-rule="evenodd"><path d="M11.425 14.13h3.642l1.529 1.795a7.89 7.89 0 002.166-2.832 8.36 8.36 0 00.771-3.562c0-2.03-.624-3.664-1.874-4.905-1.24-1.25-2.884-1.874-4.931-1.874-1.028 0-1.99.186-2.885.558A6.99 6.99 0 007.45 4.932 8.576 8.576 0 005.656 7.67a8.354 8.354 0 00-.625 3.19c0 2.003.611 3.643 1.834 4.919 1.223 1.276 2.779 1.914 4.666 1.914.39 0 .793-.031 1.21-.093.425-.062.868-.16 1.329-.293l-2.645-3.177zM18.07 22l-2.127-2.46c-.753.293-1.48.51-2.18.652a9.84 9.84 0 01-2.073.226c-2.97 0-5.326-.85-7.072-2.552C2.873 16.164 2 13.865 2 10.966c0-1.577.28-3.052.837-4.426a10.148 10.148 0 012.406-3.576A10.427 10.427 0 018.713.758C10.025.253 11.429 0 12.927 0c2.915 0 5.25.86 7.005 2.579 1.755 1.72 2.632 4.01 2.632 6.872 0 1.764-.354 3.399-1.063 4.905a10.156 10.156 0 01-3.031 3.776L21.714 22H18.07zm5.743-14.675h2.884l2.047 6.433.054.16c.248.789.38 1.373.399 1.755.097-.302.221-.62.372-.958.16-.345.354-.713.585-1.103l4.227-7.218 2.06 7.43c.08.275.146.559.2.851.053.293.097.63.133 1.01.132-.372.265-.708.398-1.01.142-.3.28-.562.412-.784l3.816-6.567h3.243L36.097 20.71l-2.127-7.045a8.683 8.683 0 01-.213-.798 17.846 17.846 0 01-.146-.97 69.17 69.17 0 01-.519 1.063c-.15.302-.265.514-.345.638l-4.28 7.112-4.653-13.385zm24.392 4.785h6.5c-.026-.85-.292-1.52-.797-2.007-.496-.497-1.166-.745-2.008-.745-.957 0-1.768.248-2.432.745-.665.496-1.086 1.165-1.263 2.007zm6.34 3.948l2.061 1.608c-.735.966-1.533 1.67-2.392 2.114-.86.443-1.848.665-2.965.665-1.87 0-3.38-.563-4.533-1.689-1.152-1.134-1.728-2.623-1.728-4.466 0-2.162.66-3.935 1.98-5.317 1.33-1.391 3.018-2.087 5.066-2.087 1.71 0 3.07.532 4.08 1.595 1.02 1.055 1.53 2.473 1.53 4.254 0 .15-.01.345-.027.585-.01.23-.027.51-.054.837h-9.61c0 1.143.288 2.056.864 2.738.576.674 1.342 1.01 2.3 1.01.664 0 1.293-.159 1.887-.478a4.633 4.633 0 001.542-1.369zm14.317 3.868l.957-7.244c.018-.133.031-.27.04-.412.009-.151.013-.368.013-.652 0-.824-.2-1.453-.598-1.887-.399-.444-.98-.665-1.741-.665-1.188 0-2.118.385-2.792 1.156-.673.763-1.112 1.937-1.316 3.523l-.797 6.181H59.77l1.661-12.601h2.752l-.213 1.515c.727-.664 1.476-1.156 2.247-1.475a6.5 6.5 0 012.486-.479c1.293 0 2.3.341 3.017 1.024.727.673 1.09 1.622 1.09 2.845 0 .31-.018.673-.053 1.09-.036.407-.089.886-.16 1.435l-.877 6.647h-2.858z"></path></g></g></g></svg>',stepfun:'<svg fill="none" viewBox="0 0 6.5278 1" data-combine-word="Step" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-stepfun-_R_0_" x1="1.646" x2="18.342" y1="1.916" y2="22.091"><stop stop-color="#01A9FF"></stop><stop offset="1" stop-color="#0160FF"></stop></linearGradient></defs><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><path d="M22.012 0h1.032v.927H24v.968h-.956V3.78h-1.032V1.896h-1.878v-.97h1.878V0zM2.6 12.371V1.87h.969v10.502h-.97zm10.423.66h10.95v.918h-6.208v9.579h-4.742V13.03zM5.629 3.333v12.356H0v4.51h10.386V8L20.859 8l-.003-4.668-15.227.001z" fill="url(#lobe-icons-stepfun-_R_0_)" fill-rule="evenodd"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-stepfun-_R_0_" x1="1.646" x2="18.342" y1="1.916" y2="22.091"><stop stop-color="#01A9FF"></stop><stop offset="1" stop-color="#0160FF"></stop></linearGradient></defs></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM8.762 19.614H4.376v-4.386h4.386v4.386zm5.423 0H9.798v-4.386h4.387v4.386zm0-5.42H9.798V9.81h4.387v4.386zm0-5.418H9.798V4.39h4.387v4.386zm5.422-.004h-4.386V4.386h4.386v4.386z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6364 -0.1136) scale(0.056818)"><g fill="currentColor" fill-rule="evenodd"><path d="M14.86 14.568c0 2.873-2.174 5.061-6.347 5.061-3.542 0-6.352-1.844-6.492-5.143h2.794c.18 1.795 1.67 2.766 3.824 2.766s3.45-1.121 3.45-2.562c0-1.296-.97-2.072-3.44-2.8l-1.514-.427c-2.853-.82-4.615-2.082-4.615-4.658 0-2.892 2.66-4.784 6.143-4.784 3.484 0 5.934 1.989 6.046 4.876h-2.741c-.224-1.553-1.442-2.504-3.392-2.504s-3.27.961-3.27 2.387c0 1.238 1.062 1.956 3.226 2.582l1.32.374c3.29.96 5.007 2.329 5.007 4.837v-.005zm5.4 1.13V9.12h2.339V6.683H20.26V3.874h-2.64v2.81H15.53v2.435h2.091v6.609c0 2.868 1.796 3.697 3.494 3.785.85.043 1.723-.073 1.723-.073v-2.174c-.296.015-.486.039-.85.039-.64 0-1.732-.116-1.732-1.606h.005zm28.42-2.391c0 3.93-2.732 6.308-5.915 6.308-1.335 0-2.742-.471-3.693-1.33v5.692h-2.64V7.08h2.64v1.17c.951-.86 2.358-1.33 3.693-1.33 3.032 0 5.914 2.465 5.914 6.386zm-2.62-.039c0-2.61-1.486-4.042-3.315-4.042-1.83 0-3.678 1.431-3.678 4.042 0 2.61 1.849 4.042 3.678 4.042 1.83 0 3.314-1.431 3.314-4.042z"></path><path d="M39.095 24h-2.688V7.056h2.688v1.14c.927-.815 2.29-1.3 3.669-1.3 1.518 0 3.018.63 4.114 1.732 1.18 1.184 1.83 2.848 1.83 4.682 0 1.835-.612 3.48-1.772 4.644-1.082 1.087-2.562 1.689-4.168 1.689-1.378 0-2.741-.486-3.668-1.3V24h-.005zm-2.634-.049h2.59v-5.72l.04.038c.916.83 2.29 1.325 3.677 1.325 2.926 0 5.89-2.16 5.89-6.284s-2.993-6.36-5.89-6.36c-1.383 0-2.756.494-3.678 1.324l-.038.039V7.109H36.46v16.847-.005zM8.51 19.657c-1.8 0-3.372-.466-4.536-1.339C2.747 17.396 2.063 16.071 2 14.49v-.025h2.839v.025c.174 1.717 1.591 2.741 3.804 2.741 2.018 0 3.425-1.043 3.425-2.538 0-1.27-.96-2.047-3.425-2.775l-1.514-.427c-1.563-.446-2.64-.98-3.387-1.674-.84-.776-1.247-1.761-1.247-3.008 0-1.408.611-2.616 1.776-3.494C5.387 2.465 6.944 2 8.662 2s3.212.47 4.309 1.359c1.097.888 1.708 2.11 1.761 3.542v.024h-2.79v-.02c-.228-1.576-1.456-2.484-3.367-2.484-1.912 0-3.246.927-3.246 2.363 0 1.155.931 1.897 3.212 2.557l1.32.374c3.522 1.029 5.026 2.484 5.026 4.857 0 1.475-.558 2.727-1.615 3.625-1.121.956-2.766 1.46-4.755 1.46h-.005zM2.05 14.51c.14 3.096 2.673 5.095 6.463 5.095s6.322-1.931 6.322-5.037c0-2.353-1.494-3.79-4.988-4.813l-1.32-.374C6.221 8.71 5.28 7.958 5.28 6.775c0-1.466 1.296-2.412 3.295-2.412 1.999 0 3.173.912 3.41 2.504h2.699c-.126-2.887-2.543-4.828-6.022-4.828s-6.119 1.96-6.119 4.76c0 2.324 1.374 3.712 4.6 4.639l1.514.427c2.49.732 3.46 1.523 3.46 2.819 0 1.523-1.427 2.586-3.474 2.586-2.227 0-3.664-1.034-3.848-2.766H2.049v.005zm19.457 5.037c-.131 0-.262 0-.393-.01-1-.049-1.805-.34-2.397-.854-.742-.645-1.121-1.64-1.121-2.955V9.143h-2.091V6.658h2.091v-2.81h2.688v2.81h2.339v2.485h-2.339v6.555c0 1.417.976 1.582 1.708 1.582.253 0 .427-.01.607-.025l.237-.014h.025v2.217h-.02s-.635.088-1.334.088zM15.557 9.094h2.091v6.633c0 2.96 1.888 3.678 3.47 3.76.766.04 1.557-.053 1.698-.072v-2.126c-.078 0-.145.01-.213.015a7.092 7.092 0 01-.612.024c-.432 0-1.756 0-1.756-1.63V9.094h2.338V6.707h-2.338v-2.81h-2.591v2.81h-2.092v2.387h.005zm27.187 8.244a3.654 3.654 0 01-2.542-1.048c-.757-.752-1.16-1.795-1.16-3.018 0-1.223.403-2.266 1.16-3.018a3.654 3.654 0 012.542-1.048c2 0 3.338 1.635 3.338 4.066 0 2.43-1.339 4.066-3.338 4.066zm0-8.089c-1.771 0-3.654 1.407-3.654 4.018 0 2.61 1.883 4.018 3.654 4.018 1.965 0 3.29-1.616 3.29-4.018 0-2.402-1.32-4.018-3.29-4.018zM31.98 15.704c-.535 1.097-1.495 1.597-2.81 1.636-1.854-.049-3.009-1.136-3.246-3.222h9.073c.025-.277.044-.563.044-.86 0-4.114-2.625-6.341-5.866-6.341-3.242 0-5.867 2.222-5.867 6.342 0 4.12 2.397 6.337 5.867 6.337 2.872 0 4.677-1.35 5.502-3.892h-2.698zm-2.81-6.55c1.805.048 2.945.912 3.227 2.902h-6.454c.281-1.99 1.422-2.854 3.227-2.902z"></path><path d="M29.17 19.622c-1.748 0-3.218-.568-4.251-1.64-1.073-1.111-1.64-2.746-1.64-4.721s.596-3.59 1.727-4.731c1.043-1.053 2.523-1.635 4.168-1.635s3.12.582 4.168 1.635c1.13 1.14 1.727 2.775 1.727 4.73 0 .282-.014.573-.043.86v.024h-9.07c.244 2.023 1.355 3.125 3.218 3.173 1.364-.039 2.27-.568 2.785-1.62v-.015h2.751l-.01.034c-.844 2.591-2.702 3.906-5.526 3.906h-.005zm0-12.679c-3.495 0-5.843 2.538-5.843 6.318s2.237 6.312 5.842 6.312c2.79 0 4.63-1.29 5.469-3.843h-2.65c-.524 1.063-1.446 1.597-2.824 1.636-1.902-.054-3.032-1.174-3.27-3.246v-.03h9.074a9.77 9.77 0 00.038-.834c0-3.775-2.348-6.318-5.842-6.318l.005.005zm3.255 5.139h-6.507v-.03c.272-1.911 1.335-2.867 3.251-2.92 1.917.053 2.98 1.009 3.251 2.92v.03h.005zm-6.453-.049h6.395c-.272-1.868-1.32-2.8-3.198-2.853-1.878.053-2.926.985-3.198 2.853zM53.09 5.294v4.77h7.182v2.678h-7.181v6.914h-2.8V2.616h9.981v2.678h-7.181zM72.92 7.482v12.17h-2.63v-.893c-.612.786-1.82 1.325-3.775 1.208-1.956-.116-4.673-1.635-4.673-5.012V7.482h2.63v7.206c0 1.849 1.241 2.824 2.727 2.824 1.484 0 3.09-1.024 3.09-3.503V7.482h2.63zM75.011 19.66V7.49h2.63v.893c.612-.786 1.82-1.324 3.775-1.208 1.956.116 4.673 1.635 4.673 5.012v7.473h-2.63v-7.206c0-1.849-1.242-2.824-2.727-2.824-1.485 0-3.09 1.024-3.09 3.503v6.527h-2.63z"></path></g></g></g></svg>',tencent:'<svg fill="none" viewBox="0 0 7.0893 1" data-combine-word="Hunyuan" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g><circle cx="12" cy="12" fill="#0055E9" r="12"></circle><path d="M12 0c.518 0 1.028.033 1.528.096A6.188 6.188 0 0112.12 12.28l-.12.001c-2.99 0-5.242 2.179-5.554 5.11-.223 2.086.353 4.412 2.242 6.146C3.672 22.1 0 17.479 0 12 0 5.373 5.373 0 12 0z" fill="currentColor"></path><path d="M5.286 5a2.438 2.438 0 01.682 3.38c-3.962 5.966-3.215 10.743 2.648 15.136C3.636 22.056 0 17.452 0 12c0-1.787.39-3.482 1.09-5.006.253-.435.525-.872.817-1.311A2.438 2.438 0 015.286 5z" fill="#0055E9"></path><path d="M12.98.04c.272.021.543.053.81.093.583.106 1.117.254 1.538.44 6.638 2.927 8.07 10.052 1.748 15.642a4.125 4.125 0 01-5.822-.358c-1.51-1.706-1.3-4.184.357-5.822.858-.848 3.108-1.223 4.045-2.441 1.257-1.634 2.122-6.009-2.523-7.506L12.98.039z" fill="#00BCFF"></path><path d="M13.528.096A6.187 6.187 0 0112 12.281a5.75 5.75 0 00-1.71.255c.147-.905.595-1.784 1.321-2.501.858-.848 3.108-1.223 4.045-2.441 1.27-1.651 2.14-6.104-2.676-7.554.184.014.367.033.548.056z" fill="#ECECEE"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm1.652 1.123l-.01-.001c.533.097 1.023.233 1.41.404 6.084 2.683 7.396 9.214 1.601 14.338a3.781 3.781 0 01-5.337-.328 3.654 3.654 0 01-.884-3.044c-1.934.6-3.295 2.305-3.524 4.45-.204 1.912.324 4.044 2.056 5.634l.245.067C10.1 22.876 11.036 23 12 23c6.075 0 11-4.925 11-11 0-5.513-4.056-10.08-9.348-10.877zM2.748 6.21c-.178.269-.348.536-.51.803l-.235.394.078-.167A10.957 10.957 0 001 12c0 4.919 3.228 9.083 7.682 10.49l.214.065C3.523 18.528 2.84 14.149 6.47 8.68A2.234 2.234 0 102.748 6.21zm10.157-5.172c4.408 1.33 3.61 5.41 2.447 6.924-.86 1.117-2.922 1.46-3.708 2.238-.666.657-1.077 1.462-1.212 2.291A5.303 5.303 0 0112 12.258a5.672 5.672 0 001.404-11.169 10.51 10.51 0 00-.5-.052z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6485 -0.1015) scale(0.050761)"><g fill="currentColor" fill-rule="evenodd"><path d="M23.587 7.91c5.127 0 6.172 3.607 5.66 6.56-.11.635-.262 1.144-.39 1.434h-10.55c-.318 2.448 1.711 3.514 4.265 3.514 1.831 0 3.994-.683 5.693-1.904l-.54 3.084c-1.74.97-3.88 1.402-6.169 1.402-5.121 0-7.651-3.027-6.937-7.161.645-3.723 3.893-6.929 8.968-6.929zm47.887 0c5.13 0 6.174 3.607 5.665 6.56-.078.491-.209.972-.39 1.434H66.198c-.317 2.448 1.71 3.514 4.263 3.514 1.833 0 3.995-.683 5.694-1.904l-.54 3.084c-1.74.97-3.881 1.402-6.169 1.402-5.12 0-7.652-3.027-6.937-7.161.645-3.723 3.892-6.929 8.965-6.929zm-13.732.007c1.46-.01 2.91.263 4.267.803l-.619 3.67c-1.06-1.4-2.74-1.817-3.981-1.817-3.043 0-5.377 1.902-5.791 4.373-.48 2.767 1.578 4.354 4.295 4.354 1.332 0 3.213-.31 4.6-1.806l-.646 3.605c-.888.33-3.237.898-5.203.898-4.947 0-7.867-3.03-7.145-7.219.7-4.037 4.674-6.86 10.223-6.86zm-16.524-.005c2.75 0 5.364 1.515 4.625 5.78l-1.406 8.015h-3.99l1.334-7.614c.333-1.935-.259-3.41-2.439-3.41-1.586 0-2.836.96-3.432 2.002-.172.28-.304.693-.37 1.082l-1.389 7.94h-3.99l1.638-9.48c.204-1.172.352-2.361.468-3.376l.105-.94 3.515 2.084h.093c.879-1.047 2.746-2.083 5.238-2.083zm47.889 0c2.75 0 5.364 1.515 4.625 5.78l-1.404 8.015h-3.992l1.334-7.614c.335-1.935-.257-3.41-2.439-3.41-1.585 0-2.836.96-3.432 2.002-.172.28-.305.693-.37 1.082l-1.389 7.94h-3.992l1.639-9.48c.229-1.319.389-2.659.511-3.748l.063-.567 3.515 2.083h.092c.85-1.011 2.618-2.012 4.982-2.08l.257-.003zM20.633 2l-.494 2.866h-7.105l-2.949 16.84h-3.99l2.948-16.84H2L2.498 2h18.135zm78.69 2.414l7.861 6.344h-4.978l-1.92 10.949h-3.992l1.915-10.949H95.93l-1.768-2.543h4.495l.666-3.801zm-76.389 5.825c-2.456 0-3.805 1.906-4.221 3.287h6.943c.233-1.248-.05-3.287-2.722-3.287zm47.888 0c-2.453 0-3.803 1.906-4.219 3.287h6.943l.028-.175c.175-1.255-.199-3.112-2.752-3.112z"></path></g></g></g></svg>',xiaomimimo:'<svg fill="none" viewBox="0 0 10.0671 1" data-combine-word="MiMo" xmlns="http://www.w3.org/2000/svg"><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path d="M.958 15.936a.459.459 0 01.459.44v2.729a.46.46 0 01-.918 0v-2.729a.459.459 0 01.459-.44zm4.814-2.035a.46.46 0 01.553.45v4.754a.458.458 0 11-.918 0V15.48L3.74 17.202a.462.462 0 01-.655.016.462.462 0 01-.065-.082L.628 14.67a.459.459 0 01.658-.637l2.124 2.187 2.127-2.188a.46.46 0 01.235-.13zm2.068.004a.46.46 0 01.458.445v4.755a.46.46 0 01-.458.458.459.459 0 01-.458-.458V14.35a.459.459 0 01.458-.445zm1.973 2.014a.46.46 0 01.46.457v2.729a.46.46 0 01-.784.324.46.46 0 01-.134-.324v-2.729a.46.46 0 01.458-.458zm.002-2.045a.458.458 0 01.328.157l2.127 2.19 2.125-2.19a.459.459 0 01.784.318v4.756a.46.46 0 01-.455.458.46.46 0 01-.458-.458V15.48l-1.667 1.723a.46.46 0 01-.65.008l-.005-.005c0-.002-.002-.002-.004-.003l-2.455-2.534a.46.46 0 01-.008-.667.461.461 0 01.338-.128zm6.797 1.206a.46.46 0 01.53.651A1.966 1.966 0 0019.81 18.4a.462.462 0 01.623.18.46.46 0 01-.181.624 2.863 2.863 0 01-1.38.353l-.142-.004a2.88 2.88 0 01-2.393-4.263.461.461 0 01.274-.21zm.864-.931a2.884 2.884 0 013.915 3.914.46.46 0 01-.402.24l-.057-.004a.458.458 0 01-.164-.055.46.46 0 01-.182-.622 1.967 1.967 0 00-2.669-2.67.459.459 0 11-.441-.803zM9.59 6.368c1.481 0 1.696 1.202 1.696 1.654v2.648h-.917v-.432c-.26.346-.792.535-1.36.535-.133 0-1.289-.03-1.384-1.136-.082-.932.675-1.61 2.053-1.61h.691c0-.563-.367-.886-.983-.886-.44.013-.864.174-1.2.458l-.36-.664c.484-.379 1.012-.567 1.764-.567zm4.427.1c1.263 0 2.082.97 2.083 2.15 0 1.181-.824 2.154-2.083 2.154-1.26 0-2.084-.972-2.084-2.152 0-1.18.82-2.153 2.084-2.153zm6.801.015c.68 0 1.202.465 1.197 1.548v2.642H21.1V8.29c0-.312-.002-.98-.63-.98s-.628.667-.628.838v2.524h-.89V8.148c0-.17-.001-.838-.63-.838-.628 0-.628.668-.628.98v2.383h-.917v-4.03h.917V7a1.22 1.22 0 01.947-.516c.398 0 .76.193.982.686a1.321 1.321 0 011.195-.686zm-18.093.872l1.457-1.772H5.32L3.311 8.07l2.14 2.602H4.24L2.725 8.796 1.21 10.672H0L2.138 8.07.13 5.583h1.138l1.458 1.772zm4.149 3.317h-.916V6.644h.916v4.028zm16.99 0h-.916V6.644h.916v4.028zM9.925 8.71c-1.055 0-1.359.412-1.326.742.032.329.324.537.757.537a1.013 1.013 0 001.014-.968l.002-.31h-.447zM14.018 7.3c-.663 0-1.184.487-1.184 1.32 0 .832.52 1.32 1.184 1.32.662 0 1.182-.49 1.182-1.32 0-.832-.52-1.32-1.182-1.32zM6.417 5.001a.568.568 0 01.587.582.588.588 0 01-1.175 0A.57.57 0 016.417 5zm16.991 0a.57.57 0 01.592.582.588.588 0 01-1.174 0 .57.57 0 01.357-.542.572.572 0 01.225-.04z"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M.958 15.936a.459.459 0 01.459.44v2.729a.46.46 0 01-.918 0v-2.729a.459.459 0 01.459-.44zm4.814-2.035a.46.46 0 01.553.45v4.754a.458.458 0 11-.918 0V15.48L3.74 17.202a.462.462 0 01-.655.016.462.462 0 01-.065-.082L.628 14.67a.459.459 0 01.658-.637l2.124 2.187 2.127-2.188a.46.46 0 01.235-.13zm2.068.004a.46.46 0 01.458.445v4.755a.46.46 0 01-.458.458.459.459 0 01-.458-.458V14.35a.459.459 0 01.458-.445zm1.973 2.014a.46.46 0 01.46.457v2.729a.46.46 0 01-.784.324.46.46 0 01-.134-.324v-2.729a.46.46 0 01.458-.458zm.002-2.045a.458.458 0 01.328.157l2.127 2.19 2.125-2.19a.459.459 0 01.784.318v4.756a.46.46 0 01-.455.458.46.46 0 01-.458-.458V15.48l-1.667 1.723a.46.46 0 01-.65.008l-.005-.005c0-.002-.002-.002-.004-.003l-2.455-2.534a.46.46 0 01-.008-.667.461.461 0 01.338-.128zm6.797 1.206a.46.46 0 01.53.651A1.966 1.966 0 0019.81 18.4a.462.462 0 01.623.18.46.46 0 01-.181.624 2.863 2.863 0 01-1.38.353l-.142-.004a2.88 2.88 0 01-2.393-4.263.461.461 0 01.274-.21zm.864-.931a2.884 2.884 0 013.915 3.914.46.46 0 01-.402.24l-.057-.004a.458.458 0 01-.164-.055.46.46 0 01-.182-.622 1.967 1.967 0 00-2.669-2.67.459.459 0 11-.441-.803zM9.59 6.368c1.481 0 1.696 1.202 1.696 1.654v2.648h-.917v-.432c-.26.346-.792.535-1.36.535-.133 0-1.289-.03-1.384-1.136-.082-.932.675-1.61 2.053-1.61h.691c0-.563-.367-.886-.983-.886-.44.013-.864.174-1.2.458l-.36-.664c.484-.379 1.012-.567 1.764-.567zm4.427.1c1.263 0 2.082.97 2.083 2.15 0 1.181-.824 2.154-2.083 2.154-1.26 0-2.084-.972-2.084-2.152 0-1.18.82-2.153 2.084-2.153zm6.801.015c.68 0 1.202.465 1.197 1.548v2.642H21.1V8.29c0-.312-.002-.98-.63-.98s-.628.667-.628.838v2.524h-.89V8.148c0-.17-.001-.838-.63-.838-.628 0-.628.668-.628.98v2.383h-.917v-4.03h.917V7a1.22 1.22 0 01.947-.516c.398 0 .76.193.982.686a1.321 1.321 0 011.195-.686zm-18.093.872l1.457-1.772H5.32L3.311 8.07l2.14 2.602H4.24L2.725 8.796 1.21 10.672H0L2.138 8.07.13 5.583h1.138l1.458 1.772zm4.149 3.317h-.916V6.644h.916v4.028zm16.99 0h-.916V6.644h.916v4.028zM9.925 8.71c-1.055 0-1.359.412-1.326.742.032.329.324.537.757.537a1.013 1.013 0 001.014-.968l.002-.31h-.447zM14.018 7.3c-.663 0-1.184.487-1.184 1.32 0 .832.52 1.32 1.184 1.32.662 0 1.182-.49 1.182-1.32 0-.832-.52-1.32-1.182-1.32zM6.417 5.001a.568.568 0 01.587.582.588.588 0 01-1.175 0A.57.57 0 016.417 5zm16.991 0a.57.57 0 01.592.582.588.588 0 01-1.174 0 .57.57 0 01.357-.542.572.572 0 01.225-.04z"></path></g></g></g><g class="dsh-combine-text"><g transform="translate(1.6993 -0.1157) scale(0.050714)"><g fill="currentColor" fill-rule="evenodd"><path clip-rule="evenodd" d="M34.192 6.736c5.13 0 5.87 4.168 5.87 5.733v9.174h-3.171v-1.497C35.99 21.344 34.147 22 32.18 22c-.46 0-4.46-.107-4.788-3.936-.283-3.23 2.335-5.58 7.103-5.58h2.395c0-1.948-1.27-3.068-3.405-3.068a6.746 6.746 0 00-4.152 1.586l-1.248-2.298c1.679-1.313 3.505-1.968 6.106-1.968zm1.156 8.115c-3.65 0-4.7 1.425-4.588 2.566.11 1.141 1.12 1.861 2.622 1.861a3.5 3.5 0 003.509-3.353l.005-1.074h-1.548zM49.511 7.083c4.373 0 7.21 3.362 7.21 7.454 0 4.09-2.85 7.458-7.21 7.458-4.358 0-7.21-3.367-7.21-7.456 0-4.088 2.835-7.456 7.21-7.456zm0 2.885c-2.294 0-4.093 1.686-4.093 4.571 0 2.884 1.8 4.573 4.093 4.573 2.295 0 4.093-1.693 4.093-4.573 0-2.881-1.797-4.57-4.093-4.57z"></path><path d="M109.72 2.376a1.58 1.58 0 01.923.082 1.583 1.583 0 01.991 1.475v16.47a1.593 1.593 0 01-.463 1.126 1.59 1.59 0 01-2.714-1.125V7.847l-5.769 5.966a1.596 1.596 0 01-2.268.057 1.593 1.593 0 01-.228-.285L91.914 5.04a1.593 1.593 0 01.075-2.206 1.59 1.59 0 012.203-.008l7.354 7.58 7.362-7.58c.219-.228.502-.385.812-.45zM116.876 2.391c.413 0 .81.16 1.107.449.295.288.466.68.477 1.093v16.476a1.584 1.584 0 01-2.706 1.12 1.591 1.591 0 01-.465-1.123V3.933a1.585 1.585 0 011.587-1.542zM123.707 9.366a1.587 1.587 0 011.585 1.589v9.449a1.593 1.593 0 01-.463 1.125 1.59 1.59 0 01-2.246 0 1.596 1.596 0 01-.463-1.125v-9.45a1.588 1.588 0 011.587-1.588zM123.712 2.282a1.591 1.591 0 011.132.545l7.366 7.59 7.352-7.59a1.583 1.583 0 012.441.228c.176.26.27.567.272.88v16.471a1.598 1.598 0 01-1.577 1.589 1.587 1.587 0 01-1.585-1.589V7.85l-5.769 5.966a1.597 1.597 0 01-1.117.481 1.592 1.592 0 01-1.129-.448l-.019-.023-.015-.012-8.496-8.775a1.597 1.597 0 01-.51-1.148 1.6 1.6 0 01.481-1.16c.154-.15.34-.267.542-.344.201-.077.416-.113.631-.104zM93.056 9.426a1.592 1.592 0 011.59 1.529v9.449a1.6 1.6 0 01-.469 1.125 1.59 1.59 0 01-.517.342 1.587 1.587 0 01-2.191-1.467v-9.45a1.592 1.592 0 011.587-1.528zM147.235 6.461a1.587 1.587 0 011.832 2.256 6.82 6.82 0 00-.772 4.238 6.819 6.819 0 001.926 3.855 6.803 6.803 0 008.082 1.155 1.595 1.595 0 012.157.624 1.603 1.603 0 01-.151 1.76c-.13.163-.291.299-.473.4a9.903 9.903 0 01-4.777 1.224 9.962 9.962 0 01-7.014-2.853 9.98 9.98 0 01-2.989-6.96 9.993 9.993 0 011.231-4.973 1.59 1.59 0 01.948-.726zM73.054 7.138c2.354 0 4.157 1.608 4.14 5.361v9.154h-3.167v-8.257c0-1.08-.004-3.395-2.181-3.395-2.174 0-2.174 2.314-2.174 2.905v8.745h-3.078v-8.745c0-.591-.003-2.905-2.179-2.905-2.175 0-2.174 2.316-2.174 3.395v8.257h-3.172V7.69h3.172v1.232a4.222 4.222 0 013.276-1.784c1.38 0 2.632.667 3.4 2.377a4.567 4.567 0 014.138-2.377zM10.431 10.16l5.044-6.143h3.94l-6.953 8.618 7.4 9.016h-4.189l-5.242-6.5-5.239 6.5H1l7.399-9.018-6.95-8.616h3.939l5.043 6.142zM24.793 21.65h-3.17V7.694h3.17v13.958zM83.595 21.65h-3.17V7.694h3.17v13.958zM150.224 3.236a9.975 9.975 0 016.21-1.13 9.98 9.98 0 018.465 8.475 10.003 10.003 0 01-1.126 6.216 1.592 1.592 0 01-1.392.828 1.59 1.59 0 01-1.391-2.357 6.819 6.819 0 00-1.154-8.093 6.802 6.802 0 00-8.085-1.155 1.582 1.582 0 01-1.223.158 1.588 1.588 0 01-1.159-1.365 1.596 1.596 0 01.364-1.183c.136-.162.302-.297.491-.394zM23.208 2.004a1.964 1.964 0 012.03 2.013 2.038 2.038 0 01-.594 1.438 2.034 2.034 0 01-1.436.597 2.033 2.033 0 01-1.877-1.257 2.037 2.037 0 01-.156-.778 1.97 1.97 0 012.033-2.013zM82.013 2.002A1.963 1.963 0 0184.06 4.02a2.03 2.03 0 11-4.063 0 1.97 1.97 0 012.016-2.018z"></path></g></g></g></svg>',zai:'<svg fill="none" viewBox="0 0 4.1567 1" data-combine-word="GLM" xmlns="http://www.w3.org/2000/svg"><clipPath id="crop-zai"><rect x="1.7500" y="-1" width="2.4067" height="3"/></clipPath><g class="dsh-combine-mark-color"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="#000" fill-rule="evenodd"><path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z"></path></g></g></g><g class="dsh-combine-mark-mono"><g transform="translate(-0.0000 -0.2250) scale(0.060417)"><g fill="currentColor" fill-rule="evenodd"><path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z"></path></g></g></g><g clip-path="url(#crop-zai)"><g class="dsh-combine-text"><g transform="translate(1.6480 -0.1020) scale(0.051020)"><g fill="currentColor" fill-rule="evenodd"><path d="M8.904 2c1.374 0 2.56.285 3.608.853 1.048.567 1.858 1.346 2.433 2.332.576.988.865 2.077.865 3.27v.138a.346.346 0 01-.09.237.287.287 0 01-.219.099h-3.658a.287.287 0 01-.219-.099.338.338 0 01-.09-.237c0-.727-.235-1.346-.708-1.858-.473-.511-1.113-.768-1.92-.768-.807 0-1.426.279-1.906.838-.48.558-.722 1.285-.722 2.178v6.006c0 .893.268 1.62.8 2.179.53.559 1.2.838 2.008.838.756 0 1.365-.22 1.829-.655.464-.437.696-1.049.696-1.83v-.782c0-.093-.044-.138-.13-.138H8.904a.287.287 0 01-.218-.099.338.338 0 01-.09-.237V11.19c0-.093.03-.171.09-.237a.287.287 0 01.218-.099h6.597c.086 0 .159.033.219.1.06.065.09.143.09.236v3.798c0 1.397-.29 2.627-.865 3.688a6.048 6.048 0 01-2.42 2.458c-1.04.577-2.247.865-3.62.865-1.374 0-2.58-.297-3.62-.893a6.179 6.179 0 01-2.42-2.514C2.288 17.513 2 16.263 2 14.849V9.122c0-1.415.287-2.657.864-3.73a6.222 6.222 0 012.421-2.5C6.325 2.298 7.531 2 8.905 2zm58.488.479c.184 0 .302.09.353.273l2.907 12.442c.017.055.043.082.078.082.034 0 .057-.027.076-.082l2.856-12.442c.051-.182.168-.273.355-.273h3.79c.101 0 .178.036.23.109.05.073.057.165.024.274l-5.18 18.485c-.051.182-.161.273-.33.273H68.71c-.168 0-.278-.09-.33-.273h-.003L63.272 2.862l-.026-.11c0-.182.093-.273.277-.273h3.869zm-45.29.003c.084 0 .156.033.216.095a.33.33 0 01.087.232V17.6c0 .09.042.137.126.137h8.063c.084 0 .155.033.216.095a.33.33 0 01.088.232v3.227a.33.33 0 01-.088.231.282.282 0 01-.216.095H18.512a.279.279 0 01-.168-.053l-.045-.04a.332.332 0 01-.088-.232V2.809a.33.33 0 01.088-.232.278.278 0 01.215-.095h3.588zm25.99-.002a.29.29 0 01.216.095.332.332 0 01.087.233v18.484a.33.33 0 01-.087.231.281.281 0 01-.215.095h-3.59a.284.284 0 01-.215-.095.33.33 0 01-.087-.231V10.3c0-.073-.017-.11-.052-.11-.034 0-.067.028-.1.083l-2.173 3.772c-.068.146-.186.22-.354.22h-1.795c-.168 0-.287-.074-.355-.22l-2.198-3.8c-.035-.055-.068-.082-.1-.082-.034 0-.051.036-.051.11v11.019a.33.33 0 01-.088.231.282.282 0 01-.216.095H33.13a.285.285 0 01-.216-.095.33.33 0 01-.088-.231V2.809a.33.33 0 01.088-.232.28.28 0 01.216-.095h3.564c.152 0 .269.073.355.22l3.514 5.96c.05.11.1.11.15 0l3.463-5.96c.067-.147.184-.22.354-.22l-.004-.002h3.566zm12.506 8.496v3.63h-7.416v-3.63h7.416z"></path></g></g></g></g></svg>'},ci={baidu:"Baidu",bytedance:"ByteDance",celestoai:"celestoai",claude:"Claude",cohere:"Cohere",deepseek:"DeepSeek",gemini:"Gemini",gemma:"Gemma",grok:"Grok",inception:"inception",kimi:"Kimi",longcat:"longcat",meta:"Meta",microsoft:"Azure",minimax:"Minimax",mistral:"Mistral",nanobanana:"Nano Banana",nova:"Nova",openai:"GPT",perplexity:"Perplexity",qwen:"Qwen",stepfun:"Step",tencent:"Hunyuan",xiaomimimo:"MiMo",zai:"GLM"},Es="28178ab3c3c0",ui="0.12.0",Da={idle:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAwCAYAAABHTnUeAAAA+ElEQVR42u3bsQ3CQAwF0H+IXRgigzAKMzBEBmCHLMI0UNGcBAGl4BS/VwL6FVaMjVs698v5kQ1O11v79L58+SPlHwKFvS2AaV4yzctqwLefky9/xHxPAEprW3sq2GULBAoAFADs+DdAzInlxx4AtECgAKCQ41qv9Oq5+t6pf/3X3ky+/BHyPQHQAoECgNgDmBPLjz0AuAfwf3H57gHAPQCYAoECAAUA9gAxh5YfewDQAoECgLgH8H90+XEPAFogUAAQewD58mMPAO4B5NfgHoASXyD3AGAKBAoAFADYA8QcWn7sAUALBAoA4h5Avvy4BwAtECgA+LcnkKN/7mnIqCwAAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAwCAYAAABHTnUeAAAAOklEQVR42u3BMQEAAADCoPVP7W8GoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgDeQMAABeOTGmAAAAABJRU5ErkJggg=="},"idle-look":{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAABACAYAAABMbHjfAAABSUlEQVR42u3dwY3CMBAF0B9ELxSRQiiFGigiBdBDGqEaOOViCQJERE783nFZfYlII088tuhSuF/Ojyxwut66d5/Ll19T/iHQsJcF0A9j+mGcDfj0/+R7NjXmWwFoWre0p4JdtkCgAEABwI7fAWKfWH7MAUALBAoAGnKc65Wmnqvsncq/f9ubyZdfQ74VAC0QKACIOYB9YvkxB4CWWyDnxeUvyd/Sd7AC4D6Ax4AWCBQAKAAwB4h9YvkxBwAtECgAiPsAzqPLj/sAoAUCBQAxB7APLT/mAOD3AeJcvfwN5VsBcB/AY0ALBAoAFACYA8Q+sfyYA4AWCBQAxH0A59Hlx30A0AKBAoCYA9iHlr9SvhUA1ioA58U9m5p/g8AKAO4DsGf/fiewAuAdABQAmAPYh5YfcwDQAoECgLgP4Dy6/NryrQCgAEABwM+e2Uo8TK1/jy4AAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAABACAYAAABMbHjfAAAAR0lEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4N8AwEAAAWSBsuAAAAAASUVORK5CYII="},"idle-wave":{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAqCAYAAADlA1TjAAABJ0lEQVR42u3cyw3CMAwAUBd1F4bgyg4MwBDMwBAMwA5cGYJp4ISE+JVKLamb925IlRVVMXGauk3wV5fd5vr4e7k/NsZfbvwLU5KaSQCq1roFSpSaxy8BCsk2Mec6/rYrA4e+MVOP3/cfSvzc8VslCvYAb6wOp4iIOG/XXwP8el22+F2JZfzzGL+nQFStGbtmy765G/r+iD+t+IvME1X9T3WbYJOecBIMA+0BwjmA+BXHtwKgBAIJAOEp0EutdK+5Pj2ffb6uby0mvvgl41sBUAKBBAAAAKLGVyFCxxY2wRB1HoRNval57i97oR9AiUX+pvjsTdml42MPAJGuKX7spubwhTisAJri0RQP9gCgKT6cA2AFAAkAEgBCU3zq+FgBQAKABICR3AAtroMyqwB90gAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAqCAYAAADlA1TjAAAANklEQVR42u3BMQEAAADCoPVPbQZ/oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4DH4qAAH4CjvkAAAAAElFTkSuQmCC"},"idle-laptop":{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAACKCAYAAABigBWEAAAFPElEQVR42u3dv20cRxQH4HeH7UEKlbEIBk4MsASnBlyEa2ARBJiyBANMGLgIZwqlKuRopeOC93/m5u3M9wFMhJP4087tu9nZ2zcRAAAAAAAAACSyufQv/vf3Hz+u+cV3jy+bEv8BOXLmYAyTQ0ANCuoYObbXBrp/eo37p9dir5OjrxyYgUDzGUyrSys5DufY3GrqU2qKJkfOHLVzyZEzxzagoiyXSHLUyeEShhRv5tm/f/0ux4pyKCBUvfNyygnw0WtKX+O3yDHC8ZguveZqdVtKjpw5erqF7JZ6WAMB6lNAiNZ3BhwPBQR+njStT5xMJ27vx2MqFW6+ztp3Tb58Xa2DJEeuHK1PGushdY+HuzDc9I2rsPeVwyUMYA0EAAAAICq0NASiu/4q5/YdsYgKhLswQPGH6Y79XZcwWt2hgBz09fu3iIh4eH7bdPdNVF235ZAj1tdUWd8JYOplxjG3XzvWaenU18WVbeDkIAZ4sHAafQ2h1Ayq1VOfWXIoqHVzlDpfSh+Hbp7GPXXAa3/SyuEDZqQ2Alc3jC1Vse2D0keO2o+fr+V4ZHyfXprp0F2Y7S33oCixD4XFV5+6RD+LqC3a1N89vmy8WSPlupBxGau/6rTWTxgt65wwFtndxvVG7SRHlhMky1pUeBYGoGABUY2Bqy5hsq496LrdNsep/75xaZ/jkgzzrdxu94WBkRYvrYEACggAAAAAAAAAAAAxVkvDc78avPwO/Udt0YDo/2G6f/787cda2+fVKmRyyDFyjumcX77viTwgPAtzSuU61hy5VPNkwMN0UbvTe+tCJoccI+fYXnpNBDCdWzyObeNwq53OWuY4Z0GqVo7lgvaXT5+Ni3G5+bhMa5p56C4VNpQi1bgcLSDL2zet3iyZbiFncezTzbgYl+YFxKcLYGOpqNO4V4E1LgpIxW7s8yVQiSnV7npMq2lilin7w/Nbmn1ojcu447KaGci+tZgWhSxLQc2Qw7iMPS7bUiu8+6ru8s9LD9DIOe4eXzbzj+NhXFocj+05B2N5UA5td7n889JP4bbK8fD8ttn9Gf14GBfjAgAAAAAAAAAAQNgXJrSpl0MOOc7NsdqmykDoyg4MVEC0y5dDDjnMQIC4SUMh7fJtY2BcjIueqLYxMC6M21TZNgbGxbjkGhdrIEDdGYh2+WEbA4zLJQVEu/ywjYFxMS497AtjGwPjYlxy5dhqlx+2MTAuxqXWtg7a5YdtDIyLcQEAAAAAAAAgemyqDFHx0fr56+i+fxAe5yf3SVurA3hPPUL2feFKjgsLiHb5OXPoh4EZCBcXsGVham1u0HusVd6pr8sygyk1E+glhwLS0fT82MmY+WTNVgCpNAPJ8iaVo481h/m4fP3+7V0Pj32Pm699RtRbDi0NO5Dl01tXNDMQ7fJjXdsY7BaPtYxNC6f+35evK73W0FuOySeLmUdvhSNLpkzHplaWye3BWOU2BhG/bgH3UuB3C6IvkrmNywCfcB9NrS/JNRdld2Oi7821W79Zlz0eyb2twYi/P1uO5jMQ7fLzXb4c+pS/e3zZHOu6Pf/5fFxrXTKc2gV8maf0721dRHrNMWmX32cOritktU743nJstcuXw2I5N1sDadUe/sunz+9+Rm+Xv7se9NG6kLb9AAAAAAAAABC2dQjdrtecA8LDdMAQBeT+6fVn38QSr5MDzECAsAaS7pq/9mPRp+bKkgNiDR3JSp8wWTbKAVzCAAoIED2ugWS95vc9EIj8ayD7Wp45YcAlDIACAqxoYyndrnPmADMQQAEBFBCAd/4HyvgDJ3UI0qEAAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAACKCAYAAABigBWEAAAB70lEQVR42u3dQQ7CIBAF0I/x/leuSzcao6hlmPcS94TfjgXrkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMC0wzjg7mIKAAUEUEAABeQfewD2AeBkV5uYXxnDaDwOGhtFi4YbBTyBbFnwwBNIkWWLggIAkM3fwvXLF/EeCDPLSEUEBQT/xUEBITbbcWGwz5OHa8oTCDwtDgoEgL0oTyC4YcyJAgKKyMQepjmBIi+0rfhCnZf8oNgNs9pNe8p47KhTfSkzjOPl8u5nY1NA2HE/ZDQdBwAAAAAAAAAAAAAAAAAAAABANMxFLnLJp13ZD5Oy5A0jF7mkyrEOhzb1Lla5yGWHLtO6bstFLgXHYlJcrHKRy1RX9tZt6h0fIBe5zB/roE294wPkIhcAAAAAAAAAAAAAAAAAAAAAgGiXj1wauOh0HccYyEUumxzrEO3yXaxyqVncdbqODuRykYtJcbHKRS7tj3VwjIFc5LL4OIZ2+XGMgVzkAgAAAAAAAAAAAAAAAEDK9aUA6vQBVTzSuycqishs4fCXcfAN76mDul3ZyfLNhGHZruw6XdcrIseDD82+2Vbp7ajv53vFzb4D1rU6XYMioohA4yWMdvn1ljOwZAGx3o99BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAjN0jO0KHi9KHDAAAAAElFTkSuQmCC"},thinking:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAACACAYAAADDGzbiAAACOklEQVR42u3dsW2EMBSA4ccpu2QIt+yQARgiM2QID5Ad3DLETZNUSMjlnTEYfV95IsmfxuLJ1jkCAAAAAAAAAAAAAAAAAAAAALiK6dUffH5//b3zhz9/fqcW/4AOHTrO63i888tSLpFyafacDh06xup4BMCLPt754XWZmz6nQ4eOsTqmXrNTqxlPhw4d1+kwwgAWEMACAoRzIPbXdegI50AAjDCABQSImxwk289E22xVz0j150ftS+vQoaN/hzcQwAgDWEAAAAAAAAAAAAAAAAAAAAAAAIBwL4wOHTpGuRcm5RIpl2bP6dChY6wOX2kIxCnXOqzL3PQ5HTp0jNUx9ZqdWs14OnTouE6HEQawgAAWECCcA7G/rkNHOAcCYIQBLCBA3OQg2X4m2marekaqPz9qX1qHDh39O7yBAEYYwAICAAAAAAAAAAAAAAAAAAAAAACEe2F06NAxyr0wKZdIuTR7TocOHWN1+EpDIE651mFd5qbP6dChY6yOqdfs1GrG06FDx3U6jDCABQSwgADhHIj9dR06wjkQACMMYAEB4iYHyfYz0TZb1TNS/flR+9I6dOjo3+ENBDDCABYQAAAAAAAAAAAAAAAAAAAAAAAg3AujQ4eOUe6FSblEyqXZczp06Birw1caAnHKtQ7rMjd9TocOHWN1TL1mp1Yzng4dOq7TYYQBLCCABQQI50Dsr+vQEc6BABhhAAsIEDc5SLafibbZqp6R6s+P2pfWoUNH/w5vIIARBrCAAAP5B781IFkfFpUqAAAAAElFTkSuQmCC",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAACACAYAAADDGzbiAAABWElEQVR42u3dMQ6DQAxFwQ/3v7PTpI4olo3BM1L6V0QrsSA7AQAAAAAAAAAAAHiB+v50bOw4/e8AAACmPXvr0KEDAAAAAAAAAAAAAAAAAAAAAAAAGObI9XFnR3qMXdOhQ0ejjkqPmYo6dOh4WIe9MBgQrMMBwtZHXh063IHo0KEDAAAAgCy6qCkdOnToiNe4AABAfM6sQ4cOHQAAAAAAAAAAAAAAAAAAAAAAAEAGLku261OHDh23zkosHTp06MiPvTDVZACrjmd0lA4dTlQdOnTEHYgOHTr+0QEAAAAQu3B77NXUoUNHs47T+QgAAOT1dyI6dOjQAQAAAAAAAAAAAAAAAAAAAAAAAIxmN64OHTpsG9ehQ8f+DnthMCBYhwOErY+8OnS4A9GhQwcAAAAAWXRRUzp06NARr3EBAID4nFmHDh06AAAAAAAAAAAAAAAAAAAAAAAAgEk+Q/PfcTY1eGsAAAAASUVORK5CYII="},typing:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOAAAAAOCAYAAAA2YxATAAABCUlEQVR42u2aPwrCMBSHE/EOOrr1EB1chB7BVfAQnqGHKHTtEYQuHTyEm6OeQqeAfVLatH2Bxu+DDPlTfuRH3iOvxBoP7pfj22f94/Vs9bOyseihp6W3RFYGAAhAAAKwh7SoTVrUo+d9QQ89AhAA1Fj7LL6dD5Pm5y7cp+pdT/uW1m6zVd8ffur5GWUA+v7JAvyEmQJQZrQY6cvSc4KfQA0IsNQaMARJXlmua/hJAJrf1wna14vQV7SsbGzoQ4mfMDgA5VMgZ67LqrIv17nvpx6EWPTwM4xe9DWgzHJdWU+OjzVWUy/JK+tajPv7Rz+jDUCZuWS/a3zoo9qsbOx309YLvT/81NVbIh8bcFH1c0M4RAAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOAAAAAOCAYAAAA2YxATAAAAZElEQVR42u3WgQ3AIAgAQen+O9MVWlOF1LsFNB9IGAMAAAAAAGCZlEBPalwFQ5MHLISePF7AMDSf0pPpqPnDtyre0xNDYwktYXfx4ryIhadMbD6dYtSfa3rSIlxu/ls2bqHnYW6S9y/jZM1ljwAAAABJRU5ErkJggg=="},music:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABGCAYAAADyxhn6AAACC0lEQVR42u3dwW3CMBQG4BeUXTpEr+zAAAzRGToEA3SHXhmi09BTpKpSQoBgm+fvu9btA/8Px0klHAEAAAAAAAAAAAAAAAAAAAAAACkMcz/4+ThcHvnDb59fwz2/V6tub+Sbw7jVxNZqJA29rq58c+Y7WsOe0yClrhSP1n0/fUdExPm432Rc63Wz5btbM9HTJG4x7paAa9TtyfvpO87HfZyP+8U5XDuu9boZ+3kotdWZW7Fq1Z17HVtdGVqrK9/DZVoQ/i4OSwvH0rhW6g6lJvzaGy5dt9eGlm+uuuPcgNIPH2rVrXVFqFVXvrny9RCrkw8uOfMdNTTyjdf/P3DvDVhqa1errnxz5rsTNbwuH2DIvIX+//Rwbouw9VPGWnV73WrK1z2whtbQ8i1c1xYa3AMDAAAAAAAAAAAAAAAAAAAAAADA3YZeT6wPB5LLNxJ9rWytrylt5etRsze0fHPm63uhn9Qgpa4Uj9bd6mDxuOPE+hp1s+W7WzPR0yRuMe6WgGvU7cl0Cvz5uF+cw7XjWq+bsZ+H3k+s//86troytFZXvofLtCD8XRyWFo6lca3UHUpN+LU3XLpurw0t31x1x2tnuESlM2vCwddPqSvfXPl6iOXEel4431FDI99wvOirN2CprV2tuvLNma/TCSEcLwq0uIV2Yr0T6+XrHlhDa2j5PqGuLTS4BwZq+AWP69iZS7atlwAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABGCAYAAADyxhn6AAAB1UlEQVR42u3dQW7FIAwFQINy/yvTVaWq7SrhQ2xmVt0gK+Gh/EAVtwDuGj/+bjvqdnPA5GCNX8GuXHf1wv1T1wIW6FKBPqx26wIt0K45r25yXTOP33+31e0CTaVAn+aSO4Em70PoEmgK/qrafryzqq4nsEBXPCf9rrdr09JDw274RxbSaXXL/9rrjnfCbrjNw6hwjCTQAm3zMFndLtACHTYPwzGSQAt02DzcsYAFWqD9qvIEFmiBBmDaU2FsetoMT7lXv8aY3wQLeDy4YRnHnhZo81t4fp/+c8Xd8bvqxoS6mcaa3yJjfZFj3o74SFTX/BaZXwsYwhc5gHjPOfDTl/YWezYL7FK++z6bXwAAAAAAAAAAAAAAAIDwqVOI1F0RtRdFoBO1+fzv+pbW7dqLhm6Mn72+tvG+tk33dVld7UUFulSgT+v20QVaoIu1r9FeVKAF2uduc3S5vARaoIu1bdVeVKAF2hFlji6Xl0ALtLatrOiLk60uAAAAALFmB++kjvWhb675rbSAx4MblnHsaYE2v4Xn9+nRy93xu+rGhLqZxprfImM1+J73TyYjUV3zW2R+LWBIzAKGxK4PvbS32LNZYJfy3ffZ/AIAAAAAAAAAAAAwyxebddYRmLiTsAAAAABJRU5ErkJggg=="},conducting:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANgAAABICAYAAACURjuuAAACDUlEQVR42u3dwW3CMBQG4BeUXTIEV3boAAzRGRiCAdiBK0MwTXuK1CIFDI5NHL7v1irKX9G8xInjRwQAAPzT+Qjacv3++vn783A4dbKWm7VxyEI5CgwK6g0D2srCFYyChsOpq1XAsvJ1t2ffOf741DO9rOez5s6UVTarNzQz5KTgEHHqcrk9nmN7PD/cQep29y7NstKzcvchq27WZmoHl/0uLvvd3R2lbvfoj5UlKz5lotl9kixZ82X1UfBJTVR8siaLJeodgAoL82DgCkY0OXEtq1yWKxgYIoICA1LvwcZx5ThHcDvOvP19zlyCLFlrzXIFA0NEUGAAAAAAAEBkdZXSOCY+qkmN/0nZLPNgEBXfRcztT/DMmULW+7NyztSy3rDg0pCjbJaDvK2sfurN4LHV1mW/i0dtvFK2u/cWsqz0rNx9TG33zAlDVnqWe7AV0INxuVn6IjaW5TNrK0tfxMay5lhY+OoCRFn6In5MloO/jSz3YBAWXIICAxQYKDAIfRH1vpMlyxUMDBFBgQEAAPC6zirj0ESH8JADFBgQNRZcEvoiyrKiWRZN9UXUqkuWLEPE1QzpZC07qy/VIy4q9vSTpVdhU30R19r7DuLd366i950sWfNlmQdrzHA4dbWeLsoKE80KTdaSsxQYRIVvV6nxCFMW4V1EQIGBAgPvIup9J0uWvohgiAgoMKjjF2zqHsxE0DXFAAAAAElFTkSuQmCC",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANgAAABICAYAAACURjuuAAAAkElEQVR42u3c0QnAIAxF0Uv33zmu0I8WDJyzwAOJoJJYAAAAAAAAAHChkbUua2StyVL4C7P4wGMJAAAAAAAAAAAAAAAAACDT57JA4f+VZaIZAADApVlWXqZQjDYZ+RcRAAAAAAAAAAAAAEhne7rosclkkXEVAKcNWU4bKEb/IgIAAAAAAAAAAAAAAAAAAADvHP+lL9tVOzyTAAAAAElFTkSuQmCC"},building:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOAAAAARCAYAAADE46BdAAABHklEQVR42u2aMQ6CMBSGqfEOOrpxCAYXE47gauIhPAOHIGHlCCYuDB7CzVFPoRMJvIRggRb7+L6kQ0vJn77H/9KSRhEAAAAAgFeMzeTH5fixmf98v1r9tKjQQ8+ZXoisqEEAGBAAA/aR5LcoyW+Dn9uCHnoYEACcsbaZfD8fRj2f+uA+Vu962re0dputqvX5zt8c8VRvQNs/WfBfkL+ADSgrmkb6qnTIzJE/zfHkDAiw5DOgD+KsNJq3T9rXBxMbsHk7wfX2wveWKS0q49MEc2wJfebPdzzVG1BeBaqDW1dx2Zfz6vfHfnjoDdNbav7UnwFlleuqenJ8aGBd6sVZaeqmcX1LjKdaA8rKJftd479eqk2LyjSbaz3Wp0svRL7741H17CprKQAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOAAAAARCAYAAADE46BdAAAAiElEQVR42u3bwQ2AMAwDwIb9dw4zAKJV3bs3yFKDBY9Q451+eH2Nb+TJi3RNOMy398iTF68WHErJk+dtCAAAAAAA8Lt2BObHWLoJ08EPTB9QiFb4fQtYSrh1XilhzqdMB2adkJc+PyVUCiVUwjnL2D1xKbYnL9ym56XP7+i/IRIemBPy0ucX5QZ30kfb7Nw7WwAAAABJRU5ErkJggg=="},error:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAABLCAYAAAABBQn0AAABm0lEQVR42u3cwW0CMRAF0M+KXlIEV3pIARSRGlIEBaQHrhRBNcmJAyiwSzZ4bfPeBQkZPtLIsr0ykwAAAAAAAABwYfXbm6eP9+85X/r2+bUaG1Mio9cs9akna7g1cLM/XLze88jY0hm9ZqlPHVk3J9Bxt81mf8hxtx0NeWRs6Yxes9Snjqy7K9D5w1Nm6dSxpTN6zVKfOrKcgZyB1OcZZyBgnAkEmfkYe+6yNmXZK5HxX8t0bVnqU2+WFQhMIDCBwFUej0k9xn6l+qynDD6HXn/4+v2//LgSGb1mqc/yWbZw4AwEJhAAAAAAAAAAELex47av29iaikTjvmisqD7RWDEaK6qPxooa90VjxWisaI/tDKSxIhD/B4JorKixovpEY0WwhQMTCHCVJx5jq080VtS4LxoraqwIzkCACQQAAAAAAAAApPvb2HLk9JAzLN3oTo6clnOGpRvdyZHTcs6wdKM7OXJaznEGkiPnGWcgIP4PBOmhsaIcOT3mWIHAFg5MIHCVx2NSOa+Us66h0Z0cOa3m2MKBMxCYQNCcHxqW5WOVyKJXAAAAAElFTkSuQmCC",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAABLCAYAAAABBQn0AAAAk0lEQVR42u3csQrAIBBEwUf+/5+TxjqQwiDHDFgvKFt4xdV39zo7/ZExNWva+xztcgWgQKBAAGCI4O4MEQAAAAAAAAAAAAAAAAAAAMhOhOxEkJG1VqBAgAIBkCGCj70hAgAAAAAAAAAAAAAAAAAAADRoh4AcOVlrBQoEKBAAGSLIkQMAAAAAAAAAAAAAAAAAAAAvHoBsR8vwrJ6sAAAAAElFTkSuQmCC"},happy:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAAB4CAYAAAA62q2WAAAEN0lEQVR42u3dwW3cMBCF4ZGQXlKEr+7BBbgI15AiXEB68NVFuBr7FIMwNptYK5JD8vtPSSAoD8TMm6Ek7kQAAAAAAADMz2YJxuLt6eG9/PvPX7+3TPfDWvywBBLXeuAouyUAMG0HotJBfDAQnMSfgP4a6GfdF2AgCyXu2XoYGRhIh9bZelgPBqLyD8vd80tERLw+3p9ync5QJ3STgWR9OJWt0mVI3Lvnl8/7ln8+et3I69ErPrLkS2sdtjCDJm5Zecv7Xbv3pevOrLSZjAzR90vU2k7+3cD9qufWStf74eVZiUtHjvjIki+tdewjV/7Xx/vPALjlOszZGYqPBGdhVH466BivU26lY+fswNydUE0dmwpDBx10HNXhMB2AcBoXQPgSFd9uT8s289K/Xbv27enh3VeXYCAS13rAFgaADiRaH6L6V6VzWjSW/vkF8cFAcPKrPlsGNDcQzp47cf927x7/JyPLky+1dOhABk5c6wFbmBsD838DVeCuaVziI7yFAQAAAAAAAIDI+otkCKMcgfAdiMS1HgivcQHoQFQ6iA8GgjDKEQwEQyZur8OKjAwMxDR664G5DUSli2GGfIsPBpL+4VS2SpchcTMNte69Hr3iI0u+tNZhCzNo4paVt7zftXtfuu7MSpvJyBB9v0TNMm3cjF46RoiPLPnSWsdu5ijMpBUf1c7CqPx00DFep9xKx87Zgbk7oZo6NhWGDjroOKrDYToA4TQugPAlKgy1BgORuOskrvWwhQGAdToQM3ohPhgIDLXGSgbC2XMnbo+h1owsf77U0qEDMY3eemCdLYzp6xAf4S0MAAAAAAAAAMQMv0iGMMoRCN+BSFzrgfAaF4AORKWD+GAgCKMcwUAwZOL2OqzIyMBATKO3HpjbQFS6GGbIt/hgIOkfTmWrdBkSN9NQ697r0Ss+suRLax22MIMmbll5y/tdu/el686stJmMDNH3S9Qs08bN6KVjhPjIki+tdexmjsJMWvFR7SyMyk8HHeN1yq107JwdmLsTqqljU2HooIOOozocpgMQTuMCCF+iwlBrMBCJu07iWg9bGABYpwMxoxfig4HAUGusZCCcPXfi9hhqzcjy50stHToQ0+itB9bZwpi+DvER3sIAAAAAAAAAQMzwi2QIoxyB8B2IxLUeCK9xAehAVDqIDwaCMMoRDARDJm6vw4qMDAzENHrrgbkNRKWLYYZ8iw8Gkv7hVLZKlyFxMw217r0eveIjS7601mELM2jilpW3vN+1e1+67sxKm8nIEH2/RM0ybdyMXjpGiI8s+dJax27mKMykFR/VzsKo/HTQMV6n3ErHztmBuTuhmjo2FYYOOug4qsNhOgDhNC6A8CUqDLUGA5G46ySu9bCFAYB1OhAzeiE+GAgMtcZKBsLZcyduj6HWjCx/vtTSoQMxjd56YJ0tjOnrEB/hLQyA8fkALyHJsnPhb50AAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAAB4CAYAAAA62q2WAAACA0lEQVR42u3d0Q3CMAwEUB/771wmaMQf5+i9CRA255RI9QzNHl8BzT6+gtof7iNEYGd4PGUhIsxhUaNqWmG+oT/+/jlS8iWkqBDxu60LkZT+UKNnTRinDpxAPOOiVqBRm6eu0yJzusZ1fSlA3z5DSp639Yf/I0yYH+ogyPSHyYc6cG1/PK4sYWd4RIgBq08gSgEAAAAAAAAAAAAAAAAAAAAAADDe+MRY64D1FoD1FsIc7D6lOcy91Hh6tnq3bV+36qIvRFpXGETPmjBOHTiBeMZFrUCjNk9dp0XmdI3r+lKAvn2GlK1UFCL+jzBhDnUQZPrD5EMduHc3ritL2BkeEWLA6hOIUgAAAAAAAAAAAAAAAAAAAAAAAIw3PjHWOmC9BWC9hTAHu09pDnMvNZ6erd5t29etuugLkdYVBtGzJoxTB04gnnFRK9CozVPXaZE5XeO6vhSgb58hZSsVhYj/I0yYQx0Emf4w+VAH7t2N68oSdoZHhBiw+gSiFAAAAAAAAAAAAAAAAAAAAAAAAOONT4y1DlhvAVhvIczB7lOaw9xLjadnq3fb9nWrLvpCpHWFQfSsCePUgROIZ1zUCjRq89R1WmRO17iuLwXo22dI2UpFIeL/CBPmUAdBpj9MPtSBe3fjurKEneERIQasPoEoBQAAAAAAAAAAAAAAAAAAAAAAXOALqhfvSfh7RAEAAAAASUVORK5CYII="},notification:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAA4CAYAAACrHfdzAAABJUlEQVR42u3czQ0BURgF0DsyvSjCVg8KUIQaFKEAPdgqQjWsJEjGDDNvIs85O4nchfjm/ZCbAAAAAAAAAFCXZurAy25zfXy93B8b+fPl85mFj4B/1vY9oUqvEPKnze9bUeQ/57ddb1wdTkmS83b9NnDo++TPkz90iyW/ZwDGKr23lY8zAIzUTL2nfX2yyZ83n5GHYOpwH7RSA1ZLvgGo9Isvf1i+MwB+CXZPLP9f860AxDUoGACIa9Cua6iu++tvr6vky/+FfCsAtkBgAAAAAAAAAAAAohs0ujujGzT+CwTRDaq7M7pBoxs0ujujG1Q3aPTTRDeoMwBEN6j86AbVDUp0g0Y3KM4u0Q0KukHly49uUIhrUDAAEN2g8uVHNyjYAoEBgAJum8colXsFaJEAAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAA4CAYAAACrHfdzAAAAhklEQVR42u3csQ2AQAwDQBOx/8rQMMSb3Em0X1iWSOWEJs/3tb5/nFEgBdqc/ygQm40I2OwWQZWr/H03nBNI/iiQ/EvzVyAAAAAAAAAAAAAAAAAAAAAgRgliGU6B5G8bFPwBILZBYxs0tkHdcPKXPwokf9ugAAAAAAAAAAAAAAAAAAAA/NcLs/xH0QBTK9kAAAAASUVORK5CYII="},compacting:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAwCAYAAAAvvfcmAAAB9klEQVR42u3dzW0CMRCG4dmIXigi1/SQAlJEaqCIFEAPuaYIqklOSGgFZNkfj7Gf94ZkGK09nz3G/mCIO5w+339jAfvDcQigc7bU0a61hzV5oKe8miTg16/viIj4+XhbpV2rg2vy0M+ldbTr7YFbTeapSZ0VV14VWIFvDe7UBxi3G3/etUHeKqGmxIbVfou8KqmjqlfguQ+8dHCXztDXOnyrhCqVuHMSO6OfM/Oq2j1wb2QNcFZplxW3JSERMNISmpAaEfC4BClxDrx2THteZOdVSR3tDG6Z442tY9b4LXRGP/fGi7kaIGAAUeFZ2mXZM379aDtxxRV33bhWYEAJDYCAATzEUKMfuLe4QLiJFXyqIOBwR5f/2eTxNP1sBQ4+Vf7n55200v3AvcXlf4Y9cHAj8T/zP+8Px4GAwf/8xP5nAgb/cyu/yJHhB+4tLv8z7IHB/8z/HBGuUgLhLjSAekvo89J9LglulQrjdmuVDC3HvTx+mBv30f3vrfdvGfeybQ9xS/WzFRhQQgMgYACxmh84Gvw/VXERPXyJ5YIBoISOpXdWz/dR12gnLroUsMQCKt8D3yuZ13RvlPTIzvUDtxoXnV7k8O91gD0wAAIG8O85cOYxknNge15YgQECBkDAAKLgMVKGT5UPOScurMAACBgAAQOd8Aeuci8zP1toCQAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAwCAYAAAAvvfcmAAAAXklEQVR42u3asQ0AMAgEsdt/abIDHYq9ANVJX1AAAAAAAAAAwAXz2V0QFgAAmOvmOogJAAAAAAAAAAAAgLyq5lUVYQkLAADMdRCTmAAAAAAAAAAAAAAAAAAAAACAnQd7SA/xuy9XZQAAAABJRU5ErkJggg=="},sleeping:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOgAAACECAYAAACan2dZAAAB9klEQVR42u3dzVHCQACG4S9OerEIrvZgARZhDRZBAfbA1SKsRk8gs+6YzS9kfJ4bmOTlEhPCzm4CAAAAAAAAAAAAAAAAAAAAALCZrvbm5+vz15yDPr69d2P30dTU/O3B/yi4X05Q2OsJejiecjieBg/Sul0LTU3NH/1ff/x4eWo6SOt2Sx5LU/M/NN3igu+gQKb+zDL3UXEmPErW1NQcbrqCgltcwAkKhvoZpqWpuVWzb9n5/CHKg5XvL/EFWlNT0y0uAAAAAAAAAAAAAAAAAAAAAAAAZLfTbi41tf2YKQw1NTVjVj+ImeUBK2xralph2+rImpqxwjZQ0629IGkqT6o0NTXbmq6gEE9xAScoGElkFIim5o2al/B1vHw9djtNTc1pTbe4AAAAAAAAAAAAAAAAAAAAAABAUpnVL5k/W9noWco0NTVj0jCIiasB64NqalofNNZ21NS0PijgBIXs72eWtRcmrT1K1tTUHG66goJbXMAJCob6GaalqblVs2/Z+fwhyoOV7y/xBVpTU9MtLgAAAAAAAAAAAAAAAAAAAAAAAGS3024uNbX9mCkMNTU1Y1Y/iJnlAStsa2paYdvqyJqascI2UNOtvSBpKk+qNDU125quoBBPcQEnKBhJZBSIpuaNmpfwdbx8PXY7TU3NaU23uHDHvgFW+LilN9hzCQAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOgAAACECAYAAACan2dZAAABbklEQVR42u3dMY4CMRAAwZ7/PxoCUiLEssauCi/pAwlpvALPdI3Hm79N19LU1PzSP6CpqblA0xurqenDqam5Z3PM8pqaZ59BAQAAAAAAAACA1f3qq35zw/cZNTU1fdlZUzO/ZtHUzK9ZjAqamieNuAAAAAAAAAAAAAAAAAAAAAAAAAAA0D6rH3LHqabm31ycnZvCNTWzCkJTc6umEVdT04gLZD+opqamM4OmZh4KaWraD2pU0NS0HxQAAAAAAAAAAAAAAAAAACCXhvXxFQ5zw7URmpqa7pXR1MzFYZqaml6kpman3ern/KCpuegZFMh+UE3NLE9yptDUzEMjTU1NI66mphEXyH5QTU1NZwZNzTwU0tTUNOJqatoPCgAAAAAAAAAAAAAAAAAAkEvDsuNCUzP7QTU1Nb1ITU0fTk1NTftBNTU1gewH1dTUdKbQ1NT0xmpq2g+qqWnEBQAAAAAAAAAAAAAAAAAAAAAAAABentEVN3SBilQBAAAAAElFTkSuQmCC"},waking:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAABACAYAAABMbHjfAAABsklEQVR42u3cwW3CMBQA0J/KuzAE1+7AAB2CGRiCAdiBa4dgGnqrUEVCiuzEdt67FQVjGX//n5g6AgAAADZiMAR9ux0P98e/d6fLUFN7a0umSN8TVIBN+zAF2TIZoPMV2vhPtycDdG53ugwlyohS7coAG5ygJTLD2OQs9TmttCsAGkv5pezP14iI+P76zHJdqyWeAKhshS49QZeSq/+lx18AuInd9PgLgMpKiKUy2dz+/L2ulhvfXOMvACottVqboK32P0mRET1t7aMEKlKi9FZCyJAjAVB6BbVCUxM7wSiBeqz5302Rvf3clzczwP58/a2PX9XQc65bun2YlQFKr6Bz35e7fcaz5WNWe/ba1LW34+HeU1a0D2CCbrr/qZfHY54yIQOs+Fz61QqndKtz/NPSK6gVup5saexlgM1P0LH35Gyr5gBLUmTdJUrOCar/MkD2L3TuF6x0q3P801orqJtIwm+BAAAAAAAAAAAAAAAA4H+G3k6HdqoF4WxQZ5viXyJBAMDkPYDTFqLpw7CQAUAAgAAA+wD2AZABQACAAIB443j01k+Hdro1MgAIABAA8NQP8RzW3H0Y1OcAAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAABACAYAAABMbHjfAAAAkUlEQVR42u3cQQqAIBAF0DG6/5V1EyjtReS/B62rab6TG6tg6t8V4/HNNWjy8wsA0QTACh1d/1fNWLS0FxYADfpfQXfepwnA+RF580p3e4P21EnjHx2bYAFD/RUIABMAAAAAAAAAAAAAAAAAAAAAAAAAAChHC1KORwcBAAEAAJtgAAAAAAAAAAAAAAAAAAAAjhq4KRwHBpIvogAAAABJRU5ErkJggg=="},"poke-left":{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANgAAAAgCAYAAABw4baZAAABDklEQVR42u3bwRGCQAwF0F2HXizCQizFGijCAujBRqxG74woomYlvHdV+eNAyOKaWkaup+OtfGDfD/Xdz0RnRuZlzJIzP6crDXz6hf45L2NWtpxIu6kXDudLOZwvLw8w933kE3WNrDlnt8UT1iIvaxbP1V+35Ufr0+jMyLyMWXKWn6MmHWzfD3XJjyFryMuYlS3nL57BFJoshbbyAoPsum8/r7S480RnRnfdbFmtcyKveR0MLBFBgQFz/yo13jOYWrd+c28hOjMyL2OWnNc5OhhYIoICA0bqVmalQAcD82DFeAXoYLCxebAWs2egg4ECAxQY2Acr9sHQwQAFBgoMinmw/LNSoIOBAgMUGDR0B/glUpc7BkxsAAAAAElFTkSuQmCC",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANgAAAAgCAYAAABw4baZAAAAMklEQVR42u3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgJcBbCAAAQ5e1s0AAAAASUVORK5CYII="},"poke-right":{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANgAAAAgCAYAAABw4baZAAABCUlEQVR42u3bwQ2CQBAF0IHQi0VQiKVYg0VQgD3QiNXonUQFIQPsvnfe5EdgmMXJNvHF83Z9xQqX+6P5tSYjIzOn5Cx5y/O6OLnpBVl6QY+WU3JWDXlT7ZxF/TBGP4ybreP8sp+Js+a1td2wzBtVahbzNVvuP+fsTzMysn5L5nXbI0veel0pb4qsvXXmHr7UrBryiikwheVBP2JhHe4bDIr/BgtzMHMweZvm6WBgiwgKDIg//kWczpY+zRLWzKAyMjJzSs6SNz9PBwNbRFBgQBxsDhY7zTtAB4MaCsyxC9DBwHmw2OncD+hgoMAABQbmYGEOhg4GKDBQYBDOg9Vzrgl0MFBggAKDRG9/9FZS9IHJcwAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANgAAAAgCAYAAABw4baZAAAAMklEQVR42u3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgJcBbCAAAQ5e1s0AAAAASUVORK5CYII="},tickle:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAAAkCAYAAAD4p7R7AAABfklEQVR42u3by3GDMBSF4QtDLykiW3pIARSRGlJECkgP2VJEqklWzng8NuGlV+b7V7ZHII7PXCQkThcJ+Hp9+b7+/vT20d37LRph6dpb1MWf8+gDwG6GNRWd466xlS13khx6curiTz26htwCSgzbreviT726hqXGz++fERExT2PsaXf9p10+317A0T62cKaeGnTxp7w//dKB8zTGPI2/JznSrlQf/7Uv/tTRV5diSC0xj085RSg5n08xhePPyYsIj4a5FtgybLeqiz/16hpaFbbmrtOiUUu6+FOfLvtAQNhIBRQQoIAABQQg9r4Ld7vScFkl+WtlZc9qytpzHnmLNqeeHLr4U48//aOD11zc2naxcoMrVZ8l9KTsmz/1+GMKB3gGAsrQSTxKpPLHCASERGpIPEqkSqRKPEqkSqRGSDxKpPJHIlUilT8SqRKp/JFIDYlHiVSJVIlHiVT+2AcCwkYqoIAABQQoIAAhkSqRyh+JVIlHiVSJVMAzEID7/AC/YppCTpcIBwAAAABJRU5ErkJggg==",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAAAkCAYAAAD4p7R7AAAANElEQVR42u3BMQEAAADCoPVPbQdvoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgN1JAABgIwlBQAAAABJRU5ErkJggg=="},drag:{body:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAAAWCAYAAACxFRLdAAAA2klEQVR42u3c2w2CQBAF0MHYi0VQCKVQg0VYgD3QCNXgrzE+VpHdZXPOJwEmN2GyAwS6iIh5HJa4czpfu1jh1fly1Wktkyz1XmuHAH6mgUADQRnHd3PjWo9zZ646rWWSpd5r7Zhyw7SVXHVayyRLPXXejnD9ZYr+Mn08Sep+peu0lkmW8nXcA4GHCFBGt8W8mPrSKled1jLJUk8WKxAY4UADgQYCDQRoINBAsCfzOCyPz8yfbft231J1WsskS11ZrEBghAMNBLHLD+rijz9fSD0+V53WMslSV5Yb/YiR3qNBrscAAAAASUVORK5CYII=",ink:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAAAWCAYAAACxFRLdAAAAKElEQVR42u3BMQEAAADCoPVP7WENoAAAAAAAAAAAAAAAAAAAAAAAgBtHlgABq98cRwAAAABJRU5ErkJggg=="}},Cs={idle:"/dsh-claude-style/assets/22360387d0e1.svg","idle-look":"/dsh-claude-style/assets/ae2250afa4d4.svg","idle-spout":"/dsh-claude-style/assets/7f10aaf08b36.svg",thinking:"/dsh-claude-style/assets/07ba49c55318.svg",typing:"/dsh-claude-style/assets/917b19426a88.svg",music:"/dsh-claude-style/assets/e4c4d54e666e.svg",conducting:"/dsh-claude-style/assets/2d4bd629514d.svg",building:"/dsh-claude-style/assets/84bc02d65566.svg",error:"/dsh-claude-style/assets/d0b76604f76f.svg",happy:"/dsh-claude-style/assets/62647b81453f.svg",notification:"/dsh-claude-style/assets/b5c88fffcd08.svg",compacting:"/dsh-claude-style/assets/bd48fda92d54.svg",sleeping:"/dsh-claude-style/assets/c94f98071b0f.svg",waking:"/dsh-claude-style/assets/aee0b9809ae6.svg","poke-left":"/dsh-claude-style/assets/5ff45ccd6396.svg","poke-right":"/dsh-claude-style/assets/6cda22c8c355.svg",tickle:"/dsh-claude-style/assets/192fda8da55a.svg",drag:"/dsh-claude-style/assets/3b6d7b199795.svg"};var hi=0;function Va(){let e=document.querySelectorAll(Al);for(let t of e)t.id!==yn&&(t.dataset.plugin=Br)}function pi(){let e=++hi,t=document.getElementById(yn);return t===null&&(t=document.createElement("style"),t.id=yn,document.head.appendChild(t)),t.dataset.plugin=mt,t.dataset.pluginCss=zr,t.dataset.skinChrome=yn,t.textContent!==xs&&(t.textContent=xs),()=>{hi===e&&t.remove()}}var fi="dsh-chat-ux",Gh="dsh-chat-ux-style",Ts=!1,mi=!1,Ss=null,Nn=[],Fn=null;function Rs(){if(document.getElementById(Gh)!==null)return!0;if(mi)return Ts;mi=!0;let e=window.__DSH_BOOT__?.entries;return Ts=Array.isArray(e)&&e.some(t=>typeof t?.id=="string"&&t.id.includes(fi)),Ts}function Ua(e){if(e===fi)return Rs();throw new Error(`peer-plugin: no presence check for ${e}`)}function Wh(){Va();let e=Rs();e!==Ss&&(Ss=e,qe(Nn,e),Dl())}function gi(e){return Nn.push(e),Fn===null&&(Fn=ge(document.head,{childList:!0},Wh),Ss=Rs()),()=>{let t=Nn.indexOf(e);t>=0&&Nn.splice(t,1),!(Nn.length>0||Fn===null)&&(Fn(),Fn=null)}}function Ga(){return document.documentElement.hasAttribute(Ko)}function bi(e){let t=Ga();return ge(document.documentElement,{attributeFilter:[Ko]},()=>{let n=Ga();n!==t&&(t=n,e(n))})}function Wa(e){return e.handle===void 0?e.id:e.handle}var _s=[];function yi(e){_s=e}function vi(e){return _s.filter(t=>t.switchRow?.tab===e)}function qa(e){return _s.some(t=>t.pref===e&&t.yieldsTo!==void 0&&Ua(t.yieldsTo))}function wi(){let e=document.body;function t(){document.hasFocus()?e.removeAttribute(ca):e.setAttribute(ca,"")}return window.addEventListener("focus",t,!0),window.addEventListener("blur",t,!0),t(),()=>{window.removeEventListener("focus",t,!0),window.removeEventListener("blur",t,!0),e.removeAttribute(ca)}}var Ai=new Set(["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "]);function yt(){return document.querySelector(Ie)}function zn(){let e=document.querySelector(je),t=e===null||e.parentElement===null?null:e.parentElement.parentElement;return t===null||t.nextElementSibling===null?null:t.nextElementSibling.querySelector("button")}function xi(e){let t=e.target;return t instanceof Element&&t.closest($t)!==null?!1:e.type!=="keydown"?!0:e instanceof KeyboardEvent&&Ai.has(e.key)}var Ms=28,ki=2400,Ei=24e3,Bn=1200,qh=.5,jh=10,Ci=.001,Ti=1.5,Yh=64,Kh=16.7,at=new Map,Ya=!1,ja=0;function Qh(e,t,n,a){for(let o=0;o<a;o+=Ci){let s=Math.min(Ci,a-o),l=Ms*Ms*(n-e)-2*Ms*t;l=Math.max(-Ei,Math.min(Ei,l)),t=Math.max(-ki,Math.min(ki,t+l*s)),e+=t*s}return{position:e,velocity:t}}function Xh(e,t,n){return Math.abs(n-e)<=qh&&Math.abs(t)<=jh}function Ls(e){return e.scrollHeight-e.clientHeight}function Ri(e,t,n,a=Bn){let o=at.get(e);at.set(e,{destination:t,wanted:n,lead:a,velocity:o===void 0?0:o.velocity,position:o===void 0?null:o.position,lastWritten:o===void 0?null:o.lastWritten}),!Ya&&(ja=0,Ya=!0,he({write:_i}))}function Ka(e){at.delete(e)}function Hs(e){return at.has(e)}function Os(e){let t=at.get(e);return t===void 0?null:t.lastWritten}function Si(e,t,n){return t.position=n,e.scrollTop=n,t.lastWritten=e.scrollTop,t.lastWritten}function _i(e){Ya=!1;let t=ja===0?Kh:Math.min(Yh,Math.max(0,e-ja));ja=e;let n=t/1e3;for(let[a,o]of at){if(!a.isConnected||!o.wanted()){at.delete(a);continue}let s=Ls(a),l=Math.max(0,Math.min(s,o.destination(a))),r=o.position;(r===null||o.lastWritten===null||Math.abs(a.scrollTop-o.lastWritten)>Ti)&&(r=a.scrollTop),Math.abs(l-r)>o.lead&&(r=l-Math.sign(l-r)*o.lead);let g=Qh(r,o.velocity,l,n),c=g.velocity;if(r=Math.max(0,Math.min(s,g.position)),Xh(r,c,l)){Si(a,o,l),at.delete(a);continue}o.velocity=c;let u=Si(a,o,r);Math.abs(u-r)>Ti&&at.delete(a)}at.size!==0&&(Ya=!0,he({write:_i}))}var $a={process:1,stream:2,follow:2,composer:3,fold:5,jump:6},Pi=new Set(["follow","stream","process"]),$h=4,Mi=`[${Ht}="${ma}"], ${pa}`,Jh=1200,Zh=1,e1=5,Ps=100,Li=["wheel","touchstart","touchmove","pointerdown","keydown","beforematch"],t1=new Set(["wheel","touchstart","pointerdown","keydown"]),Ja=new Map,zt=new WeakSet,Ii=0,Fi=0,Vn=null,Un=null,Dn=null,Qa=0,Xa=null;function Is(e){if(!Hs(e)){Ja.delete(e);return}return Ja.get(e)}function Ni(e,t){let n=Is(e);return!(n!==void 0&&$a[t]<$a[n]||Pi.has(t)&&Bt(e)||t==="stream"&&Za())}function Bt(e){if(!zt.has(e))return!1;let t=e.matches(tt)?$h:Lt;return e.scrollHeight-e.clientHeight-e.scrollTop>t?!0:(zt.delete(e),!1)}function Fs(e){zt.delete(e)}function zi(e){zt.add(e)}function Bi(e){return Ii>e}function Za(){return performance.now()<Fi}function n1(){return(Dn===null||!Dn.isConnected)&&(Dn=yt()),Dn}function Hi(e){if(!xi(e))return;if(t1.has(e.type)&&(Ii=performance.now()),e.type!=="touchmove"){let a=n1();a!==null&&a.scrollHeight-a.clientHeight>0&&zt.add(a)}if(e.type==="beforematch")return;let t=e.target;if(!(t instanceof Element))return;let n=t.closest(tt);n!==null&&(e.type==="pointerdown"&&t!==n||e.type==="keydown"&&e.defaultPrevented||zt.add(n))}function Oi(e){let t=e.target;t instanceof Element&&zt.has(t)&&Bt(t),t instanceof HTMLElement&&t.matches(Ie)&&(Vn={element:t,top:t.scrollTop})}function a1(e){for(let t of e)for(let n of[...t.addedNodes,...t.removedNodes])if(n instanceof Element&&(n.matches(Mi)||n.querySelector(Mi)!==null)){Fi=performance.now()+Jh;return}}function o1(e){a1(e)}function cn(){if(Qa+=1,Qa===1){for(let t of Li)document.addEventListener(t,Hi,{capture:!0,passive:!0});window.addEventListener("scroll",Oi,{capture:!0,passive:!0}),Xa=ge(document.body,{childList:!0,subtree:!0},o1)}let e=!1;return()=>{if(!e&&(e=!0,Qa-=1,!(Qa>0))){for(let t of Li)document.removeEventListener(t,Hi,!0);window.removeEventListener("scroll",Oi,!0),Xa!==null&&Xa(),Xa=null,dn(),Dn=null,Vn=null}}}function Dt(e,t,n){if(!Ni(e,n))return!1;let a=Is(e);return a!==void 0&&$a[a]<$a[n]&&Ka(e),e.scrollTop=t,!0}function Ns(e,t,n,a,o=Bn){if(!Ni(e,t))return!1;if(Re())return Ka(e),e.scrollTop=n(e),!0;let s=Pi.has(t);return Ri(e,n,()=>a()&&!(s&&Bt(e))&&!(t==="stream"&&Za()),o),Ja.set(e,t),!0}function Gn(e,t,n){return Ns(e,t,Ls,n)}function Wn(e,t){let n=Is(e);n!==void 0&&(t!==void 0&&n!==t||(Ka(e),Ja.delete(e)))}function Di(e){return Os(e)}function Vi(e,t){let n=e.scrollHeight-e.clientHeight,a=Os(e);a===null&&Vn!==null&&Vn.element===e&&(a=Vn.top),a===null&&typeof t=="number"&&t>0&&(a=Math.max(0,n-t)),a!==null&&e.scrollTop-a>Zh&&Dt(e,a,"stream")}function Ui(){if(document.querySelector(ts)!==null){dn();return}let e=zn();e!==Un&&(dn(),e!==null&&(e.setAttribute(zo,""),Un=e))}function dn(){Un!==null&&(Un.removeAttribute(zo),Un=null)}function eo(e,t){let n=t?.stillWanted??(()=>!0),a=t?.onSettled??null,o=yt();if(o===null){a!==null&&a();return}o.scrollHeight-o.clientHeight-o.scrollTop>.5&&Gn(o,e,n);let s=0,l=()=>{if(!n()||s>=e1){a!==null&&a();return}if(s+=1,Hs(o)){window.setTimeout(l,Ps);return}if(document.querySelector(ts)===null){let r=zn();if(r!==null){r.click(),a!==null&&a();return}}window.setTimeout(l,Ps)};window.setTimeout(l,Ps)}function Gi(e,t){let n=!1,a=!1,o=!1,s=null;function l(){n=document.querySelector(`[${_n}="hero"]`)!==null;let L=le().composerScope;a=!hs&&(L==="all"||(n?L==="hero":L==="conversation")),o=n&&le().homeLayout===ze}function r(L){let D=n&&!o?"hero":"inline",V=new Set;for(let Y of L){ye(Y,"data-composer-variant",D);let B=Y.closest(tn);B!==null&&V.add(B)}for(let Y of V)ye(Y,"data-composer-variant",D)}let g='[class*="_rail"]',c=`[class*="_imageItem"], [class*="_thumbnail"], ${g} :is([class*="_item"], img, [class*="_card"])`,u=`${g} :is([class*="_imageItem"], [class*="_thumbnail"], [class*="_item"]:has(img), [class*="_card"]:has(img))`,y="data-dsh-claude-attachment";function x(L){let D=new Set;for(let V of L)if(a&&V.querySelector(c)!==null){ye(V,"data-has-attachments","true");for(let B of V.querySelectorAll(u))D.add(B)}else V.removeAttribute("data-has-attachments");for(let V of document.querySelectorAll(`[${y}]`))D.has(V)||V.removeAttribute(y);for(let V of D)V.toggleAttribute(y,!0)}let m="data-dsh-claude-control";function C(L){for(let V of L){let Y=V.querySelector('[class*="_tools"] button[aria-haspopup="listbox"]');Y!==null&&ye(Y,m,"commands");for(let B of V.querySelectorAll('[class*="_trailing"] button[class*="_primary"]'))ye(B,m,B.querySelector("svg rect")!==null?"stop":"send")}let D=_a();D!==null&&ye(D,m,"access")}let b="data-dsh-claude-draft-empty";function h(L){for(let D of L)D.toggleAttribute(b,Ha(D)!==null)}function A(L){return L.nextElementSibling}function w(L){if(L===null)return null;for(let D of L.querySelectorAll(Mn)){if(D.querySelector(":scope > svg > circle")===null)continue;let V=D;for(;V.parentElement!==null&&V.parentElement!==L;)V=V.parentElement;return V}return null}let d="",i=null,p="",f=!1,v=0;function k(L){i!==null&&!i.isConnected&&(i=null,p="",v=0);let D=i;L===void 0?D=null:D===null&&(D=w(A(L)));let V="";if(D!==null){D.toggleAttribute("data-dsh-claude-context-meter",!0);let B=D.textContent||"";if(B!==p||a!==f){let _=a?D.offsetWidth:0;(!a||_>0)&&(p=B,f=a,v=_)}a&&(V=v>0?`${v+8}px`:d)}i=D;let Y=document.body.style.getPropertyValue("--dsh-claude-meter-room");if(V===Y){d=V;return}d=V,V===""?document.body.style.removeProperty("--dsh-claude-meter-room"):document.body.style.setProperty("--dsh-claude-meter-room",V)}function E(){let L=fe(Oa(),`[${_n}]`),D=L===null?null:L.querySelector('[role="tablist"]'),V=D===null?null:D.querySelector('[role="tab"]'),Y=V===null||V.getAttribute("aria-selected")==="true";document.body.toggleAttribute(En,a&&!Y)}function T(){l();let L=Ma();s=n&&L.length>0?L[0]:null,r(L),document.body.toggleAttribute(kn,a),x(L),h(L),C(L),k(L[0]),E()}function R(L){let D=La(L,"inline");if(!D||fe(L,'button, [role="button"], [role="menu"], [role="radiogroup"], input, select'))return;let V=D.querySelector("[data-composer-input]");V&&document.activeElement!==V&&V.focus()}function N(){let L=Yl();if(L===null)return;L.scrollHeight-L.scrollTop-L.clientHeight<150&&Dt(L,L.scrollHeight,"composer")}return t.composer={sync:T,isHero(){return n},heroCard(){return s},isActive(){return a},onCopyChange:l,onPointerDown:R,reposition(L){L==="composer"&&N()}},l(),()=>{a=!1,s=null,document.body.removeAttribute(kn),document.body.removeAttribute(En);let L=["data-composer-variant","data-has-attachments",y,b,m,"data-dsh-claude-context-meter"];for(let D of L)for(let V of document.querySelectorAll(`[${D}]`))V.removeAttribute(D);d!==""&&(d="",document.body.style.removeProperty("--dsh-claude-meter-room")),i=null,p="",f=!1,v=0}}var Le=Se(require("react"),1),$i=Se(require("react-dom/client"),1);function Vt(e){let t=(e||ws)?.get("locale")?.getSnapshot().active;return typeof t=="string"&&t?t:ie===null?"en":ie.fallback}function zs(e,t){return t?e.replace(/\{(\w+)\}/g,(n,a)=>Object.prototype.hasOwnProperty.call(t,a)?String(t[a]):n):e}function qn(e,t){if(!e||typeof e!="object")return"";let n=Vt(t),a=e[n];if(typeof a=="string"&&a)return a;let o=typeof n=="string"&&n.includes("-")?n.split("-")[0]:typeof n=="string"&&n.includes("_")?n.split("_")[0]:"",s=e[o];if(o&&typeof s=="string"&&s)return s;let l=ie===null?"en":ie.fallback,r=e[l];if(typeof r=="string"&&r)return r;let g=typeof l=="string"&&l.includes("-")?l.split("-")[0]:"",c=e[g];return g&&typeof c=="string"&&c?c:""}function se(e,t,n){let a=ie===null||!ie.ui?"":qn(ie.ui[e]);return zs(a||t,n)}function oe(e,t,n){let a=ie===null||!ie.settings?"":qn(ie.settings[e]);return zs(a||t,n)}function Te(e,t,n){let a=ie===null||!ie.ban?null:ie.ban[e],o=le().banLocale,s=a&&typeof a=="object"?a[o]:void 0,l=typeof s=="string"?s:"";return l||(l=qn(a)),zs(l||t,n)}function Ut(e){return e<10?`0${e}`:String(e)}function un(e){return e==null?"":String(e)}function Xe(e){let t=Number(e)||0,n=[[1e9,"B"],[1e6,"M"],[1e3,"k"]];for(let a=0;a<n.length;a++){let o=Math.round(t/n[a][0]*10)/10;if(o>=1)return String(o)+n[a][1]}return String(Math.round(t))}var s1=800,r1=15,l1=26,Wi=4,to=[{key:"homeBookTaoTeChing",title:"Tao Te Ching",tokens:7607},{key:"homeBookYellowWallpaper",title:"The Yellow Wallpaper",tokens:7778},{key:"homeBookMetamorphosis",title:"Metamorphosis",tokens:27557},{key:"homeBookJekyllAndHyde",title:"The Strange Case of Dr Jekyll and Mr Hyde",tokens:34713},{key:"homeBookAlice",title:"Alice's Adventures in Wonderland",tokens:37248},{key:"homeBookAnimalFarm",title:"Animal Farm",tokens:39e3},{key:"homeBookChristmasCarol",title:"A Christmas Carol",tokens:40306},{key:"homeBookCallOfTheWild",title:"The Call of the Wild",tokens:42383},{key:"homeBookTimeMachine",title:"The Time Machine",tokens:42817},{key:"homeBookWizardOfOz",title:"The Wonderful Wizard of Oz",tokens:51004},{key:"homeBookHeartOfDarkness",title:"Heart of Darkness",tokens:52163},{key:"homeBookFaust",title:"Faust",tokens:53930},{key:"homeBookTurnOfTheScrew",title:"The Turn of the Screw",tokens:57484},{key:"homeBookAesopsFables",title:"Aesop's Fables",tokens:60707},{key:"homeBookPeterPan",title:"Peter Pan",tokens:63821},{key:"homeBookGatsby",title:"The Great Gatsby",tokens:65763},{key:"homeBookPrince",title:"The Prince",tokens:66670},{key:"homeBookInvisibleMan",title:"The Invisible Man",tokens:68163},{key:"homeBookAndersensFairyTales",title:"Andersen's Fairy Tales",tokens:73931},{key:"homeBookWarOfTheWorlds",title:"The War of the Worlds",tokens:80168},{key:"homeBookBeyondGoodAndEvil",title:"Beyond Good and Evil",tokens:89836},{key:"homeBookWhiteFang",title:"White Fang",tokens:96418},{key:"homeBookMeditations",title:"Meditations",tokens:96973},{key:"homeBookFrankenstein",title:"Frankenstein",tokens:97886},{key:"homeBookPhilosophersStone",title:"Harry Potter and the Philosopher's Stone",tokens:1e5},{key:"homeBookDorianGray",title:"The Picture of Dorian Gray",tokens:106339},{key:"homeBookToLive",title:"To Live",tokens:115e3},{key:"homeBookHobbit",title:"The Hobbit",tokens:123e3},{key:"homeBookGrimmsFairyTales",title:"Grimms' Fairy Tales",tokens:132467},{key:"homeBook1984",title:"Nineteen Eighty-Four",tokens:136278},{key:"homeBookSherlockHolmes",title:"The Adventures of Sherlock Holmes",tokens:138725},{key:"homeBookGulliversTravels",title:"Gulliver's Travels",tokens:138958},{key:"homeBookWalden",title:"Walden",tokens:152659},{key:"homeBookRobinsonCrusoe",title:"Robinson Crusoe",tokens:153596},{key:"homeBookHuckleberryFinn",title:"Adventures of Huckleberry Finn",tokens:154263},{key:"homeBookDivineComedy",title:"The Divine Comedy",tokens:157765},{key:"homeBookMadameBovary",title:"Madame Bovary",tokens:159575},{key:"homeBookZarathustra",title:"Thus Spoke Zarathustra",tokens:161488},{key:"homeBookPride",title:"Pride and Prejudice",tokens:171701},{key:"homeBookOdyssey",title:"The Odyssey",tokens:173150},{key:"homeBookTaleOfTwoCities",title:"A Tale of Two Cities",tokens:187333},{key:"homeBookThreeBody",title:"The Three-Body Problem",tokens:202e3},{key:"homeBookDracula",title:"Dracula",tokens:213648},{key:"homeBookGreatExpectations",title:"Great Expectations",tokens:252176},{key:"homeBookJaneEyre",title:"Jane Eyre",tokens:256179},{key:"homeBookRepublic",title:"The Republic",tokens:279539},{key:"homeBookCrimeAndPunishment",title:"Crime and Punishment",tokens:285009},{key:"homeBookLeviathan",title:"Leviathan",tokens:304696},{key:"homeBookMobyDick",title:"Moby-Dick",tokens:306522},{key:"homeBookDarkForest",title:"The Dark Forest",tokens:307e3},{key:"homeBookDeathsEnd",title:"Death's End",tokens:336e3},{key:"homeBookAnnaKarenina",title:"Anna Karenina",tokens:481659},{key:"homeBookBrothersKaramazov",title:"The Brothers Karamazov",tokens:487590},{key:"homeBookDonQuixote",title:"Don Quixote",tokens:574243},{key:"homeBookLordOfTheRings",title:"The Lord of the Rings",tokens:625e3},{key:"homeBookThreeKingdoms",title:"Romance of the Three Kingdoms",tokens:638009},{key:"homeBookCountOfMonteCristo",title:"The Count of Monte Cristo",tokens:651128},{key:"homeBookWarAndPeace",title:"War and Peace",tokens:769001},{key:"homeBookJourneyWest",title:"Journey to the West",tokens:783200},{key:"homeBookLesMiserables",title:"Les Misérables",tokens:801791},{key:"homeBookRedChamber",title:"Dream of the Red Chamber",tokens:903956},{key:"homeBookWaterMargin",title:"Water Margin",tokens:958242},{key:"homeBookOrdinaryWorld",title:"Ordinary World",tokens:998e3},{key:"homeBookHarryPotter",title:"the whole Harry Potter series",tokens:1409e3},{key:"homeBookLostTime",title:"In Search of Lost Time",tokens:1647e3}],qi=30,Ds=6,jn=[{id:"all",labelKey:"homeRangeAll",fallback:"All",days:0},{id:"30d",labelKey:"homeRange30d",fallback:"30d",days:30},{id:"7d",labelKey:"homeRange7d",fallback:"7d",days:7}];function Vs(e){return`${e.getFullYear()}-${Ut(e.getMonth()+1)}-${Ut(e.getDate())}`}function no(){return new Intl.DateTimeFormat(Vt(),{month:"short",day:"numeric"})}function Yn(e,t){let n=t.split("-");return e.format(new Date(Number(n[0]),Number(n[1])-1,Number(n[2])))}function ji(e){if(!e)return null;let t=new Date;return t.setHours(0,0,0,0),t.setDate(t.getDate()-(e-1)),Vs(t)}function vt(e){let t=Math.round(Number(e)||0);return String(t).replace(/\B(?=(\d{3})+(?!\d))/g,",")}function i1(e){let t=e%12===0?12:e%12;return se(e<12?"homeHourAm":"homeHourPm",e<12?"{hour} AM":"{hour} PM",{hour:t})}function Bs(e){return e==null?0:e.total!==void 0?Number(e.total)||0:(e.input||0)+(e.output||0)+(e.cacheRead||0)+(e.cacheWrite||0)}function d1(e){return e.tokens!==void 0?Number(e.tokens)||0:(e.input||0)+(e.output||0)+(e.cacheRead||0)+(e.cacheWrite||0)}function Yi(e){let t={value:null,computing:!1,error:null,loading:!1,polls:0},n=null,a=!1,o=[],s=null,l=!1;function r(){qe(o)}function g(m){return o.push(m),()=>{let C=o.indexOf(m);C!==-1&&o.splice(C,1)}}function c(){s!==null&&(clearTimeout(s),s=null)}function u(m){if(l||t.loading||!m&&t.value!==null&&!t.computing)return;t.loading=!0,fetch(Eo,{credentials:"same-origin",headers:{accept:"application/json"}}).then(b=>b!==null&&b.ok===!0?b.json():null).then(b=>{if(t.loading=!1,!l){if(b===null||b.ok!==!0){t.error="unavailable",r();return}if(t.value=b.value===void 0?null:b.value,t.computing=b.computing===!0,t.error=b.error===void 0?null:b.error,r(),t.computing){if(t.polls>=r1)return;t.polls+=1,c(),s=setTimeout(()=>{s=null,u(!0)},s1)}}}).catch(()=>{t.loading=!1,!l&&(t.error="unavailable",r())})}function y(m){let C=0,b={},h={},A={},w=[];for(let v=0;v<m.length;v++){let k=m[v],E=k!=null&&k.projections!==void 0&&k.projections!==null?k.projections.values:null;if(E==null)continue;let T=E.sessionListMetadata;if(T!=null&&T.blank===!0)continue;let R=E.tokenUsage,N=R==null?0:(R.uncachedInputTokens||0)+(R.outputTokens||0)+(R.cacheReadTokens||0)+(R.cacheWriteTokens||0);C+=N;let L=T!=null&&typeof T.lastPromptAt=="number"?T.lastPromptAt:k.updatedAt,D=E.modelSelection,V=D!=null?D.next||D.lastUsed:null,Y=V!=null&&typeof V.model=="string"?V.model:null;if(w.push({at:typeof L=="number"?L:0,tokens:N,model:Y}),typeof L=="number"){let B=Vs(new Date(L));b[B]=!0,h[B]=(h[B]||0)+N}if(Y!==null){let B=A[Y];B===void 0&&(B={tokens:0,sessions:0,lastAt:0},A[Y]=B),B.tokens+=N,B.sessions+=1,typeof L=="number"&&L>B.lastAt&&(B.lastAt=L)}}let d=null,i=0,p=[];for(let v in A)p.push({id:v,tokens:A[v].tokens,sessions:A[v].sessions,lastAt:A[v].lastAt}),A[v].sessions>i&&(i=A[v].sessions,d=v);p.sort((v,k)=>k.tokens-v.tokens);let f=[];for(let v in h)f.push({date:v,total:h[v]});return{tokens:C,sessions:w.length,activeDays:Object.keys(b).length,model:d,models:p,days:f,entries:w}}function x(){if(l||a||n!==null)return;let m=e.get("remote.session");m==null||typeof m.list!="function"||(a=!0,m.list({}).then(C=>{if(a=!1,l)return;let b=C!=null&&C.ok===!0&&C.value!==null&&C.value!==void 0&&Array.isArray(C.value.items)?C.value.items:null;b!==null&&(n=y(b),r())}).catch(()=>{a=!1}))}return{state(){return t},list(){return n},listLoading(){return a},subscribe:g,notify:r,load:u,loadList:x,stop(){l=!0,c(),o.length=0}}}function c1(e){let t={},n={},a=e??[],o=!0;for(let c=0;c<a.length;c++){t[a[c].date]=Bs(a[c]);let u=a[c].calls;typeof u=="number"?n[a[c].date]=u:o=!1}let s=new Date;s.setHours(0,0,0,0);let l=new Date(s);l.setDate(l.getDate()-(l1*7-1)),l.setDate(l.getDate()-l.getDay());let r=[],g=0;for(let c=new Date(l);c<=s;c.setDate(c.getDate()+1)){let u=Vs(c),y=t[u]||0;y>g&&(g=y),r.push({date:u,tokens:y,messages:o?n[u]||0:null,level:0})}for(let c=0;c<r.length;c++)r[c].tokens===0||g===0||(r[c].level=Math.max(1,Math.min(Wi,Math.ceil(r[c].tokens/g*Wi))));return{cells:r,peak:g}}function u1(e,t){return e!==null&&Array.isArray(e.models)&&e.models.length>0?e.models.map(n=>({id:n.id,input:n.input||0,output:n.output||0,cacheRead:n.cacheRead||0,cacheWrite:n.cacheWrite||0,tokens:d1(n),sessions:n.sessions,lastAt:n.lastAt})):t===null?null:t.models.map(n=>({id:n.id,tokens:n.tokens,sessions:n.sessions,lastAt:n.lastAt}))}function h1(e,t){if(e===null||!Array.isArray(e.days))return null;let n=t>0&&t<qi?t:qi,a=ji(n),o=[];for(let s=0;s<e.days.length;s++){let l=e.days[s];l.date<a||l.models===void 0||l.models===null||o.push({date:l.date,models:l.models})}return o.length===0?null:(o.sort((s,l)=>s.date<l.date?-1:1),o)}function Ki(e,t,n,a){let o=e.value,s=o!==null&&o.totals!==void 0,l=s?o.totals:null,r=s||t!==null,g=0;for(let f=0;f<jn.length;f++)jn[f].id===n&&(g=jn[f].days);let c=ji(g),u=c===null?null:new Date(`${c}T00:00:00`).getTime(),y=f=>c===null||f>=c,x=0,m=null,C=null,b=null;if(s&&c===null&&l!==null)x=Bs(l),m=l.calls??null,C=l.sessions??null,b=l.activeDays??null;else if(s){let f={},v=!0,k=0;m=0,C=0,b=0;for(let E=0;E<o.days.length;E++){let T=o.days[E];if(y(T.date)){if(x+=Bs(T),m+=T.calls||0,b+=1,Array.isArray(T.sessionIds))for(let R=0;R<T.sessionIds.length;R++)f[T.sessionIds[R]]=!0;else v=!1;k+=T.sessions||0}}C=v?Object.keys(f).length:k}else if(t!==null){C=0,b=0;for(let f=0;f<t.entries.length;f++){let v=t.entries[f];u!==null&&v.at<u||(x+=v.tokens,C+=1)}for(let f=0;f<t.days.length;f++)y(t.days[f].date)&&(b+=1)}let h=null;if(s&&c===null&&Array.isArray(o.hours))h=o.hours;else if(s&&c!==null&&Array.isArray(o.days))for(let f=0;f<o.days.length;f++){let v=o.days[f];if(!(!y(v.date)||!Array.isArray(v.hours))){h===null&&(h=new Array(24).fill(0));for(let k=0;k<24;k++)h[k]+=Number(v.hours[k])||0}}let A=null;if(h!==null){let f=0,v=0;for(let k=0;k<24;k++){let E=Number(h[k])||0;v+=E,E>(Number(h[f])||0)&&(f=k)}v>0&&(A=i1(f))}let w=null;if(t!==null)if(u===null)w=t.model;else{let f=0;for(let v=0;v<t.models.length;v++){let k=t.models[v];k.lastAt<u||k.sessions<=f||(f=k.sessions,w=k.id)}}w===null&&s&&typeof o.model=="string"&&(w=o.model);let d=null,i=Math.min(to.length-1,Math.floor(a*to.length));for(;i>=0&&x<to[i].tokens;)i-=1;if(i>=0){let f=to[i];d=se("homeFunBook","You've used ~{count}× the tokens in {book}.",{count:vt(Math.round(x/f.tokens)),book:se(f.key,f.title)})}let p=u1(o,t);return{listed:t,known:r,tokens:x,calls:m,sessions:C,activeDays:b,peakHour:A,model:w,grid:c1(s?o.days:t===null?null:t.days),fun:d,models:p,modelDays:h1(o,g)}}var me=Se(require("react"),1);function Qi(){function e(r,g){return g>0?`${(Math.round(r/g*1e3)/10).toFixed(1)}%`:"—"}function t(r){if(!(r>0))return 0;let g=Math.pow(10,Math.floor(Math.log(r)/Math.LN10)),c=r/g;return(c<=1?1:c<=2?2:c<=2.5?2.5:c<=5?5:10)*g}function n(r){return{input:(r.input||0)+(r.cacheRead||0)+(r.cacheWrite||0),output:r.output||0}}function a(r){return r.input!==void 0||r.output!==void 0||r.cacheRead!==void 0||r.cacheWrite!==void 0}let o=7;function s(r,g,c){let u=0,y=r===null?[]:r;for(let b=0;b<y.length;b++){let h=0,A=y[b].models;for(let w in A)h+=A[w];h>u&&(u=h)}let x=t(u),m=no();return me.createElement("div",{className:"dsh-claude-home-chart","data-skeleton":c?"":void 0},me.createElement("div",{className:"dsh-claude-home-chart-plot"},[1,.75,.5,.25,0].map(b=>me.createElement("span",{key:b,className:"dsh-claude-home-chart-tick",style:{bottom:`${b*100}%`}},c||x===0?"":Xe(x*b))),me.createElement("div",{className:"dsh-claude-home-chart-bars"},y.map(b=>{let h=0,A=[],w=b.models;for(let d in w){h+=w[d];let i=g[d];A.push({id:d,tokens:w[d],rank:i===void 0?Number.MAX_VALUE:i})}return A.sort((d,i)=>d.rank-i.rank),me.createElement("span",{key:b.date,className:"dsh-claude-home-chart-col",title:`${Yn(m,b.date)} · ${Xe(h)}`,style:{height:`${x>0?h/x*100:0}%`}},A.map(d=>me.createElement("span",{key:d.id,className:"dsh-claude-home-chart-seg","data-rank":Math.min(d.rank,o),style:{height:`${h>0?d.tokens/h*100:0}%`}})))}))),me.createElement("div",{className:"dsh-claude-home-chart-axis"},y.map((b,h)=>{let A=h%3===0;return me.createElement("span",{key:b.date,className:"dsh-claude-home-chart-label"},A?Yn(m,b.date):"")})))}function l(r){let g=r.data,c=me.useState(!1),u=c[0],y=c[1],x=g.models,m=g.modelDays,C=!g.known;if(x===null||x.length===0)return g.listed!==null||!C?me.createElement("div",{className:"dsh-claude-home-models-empty"},se("homeModelsEmpty","No model data yet")):me.createElement(me.Fragment,null,s(null,{},!0),me.createElement("div",{className:"dsh-claude-home-models","data-skeleton":""},[0,1,2].map(d=>me.createElement("div",{key:d,className:"dsh-claude-home-model"},me.createElement("span",{className:"dsh-claude-home-model-swatch"}),me.createElement("span",{className:"dsh-claude-home-model-name"},""),me.createElement("span",{className:"dsh-claude-home-model-split"},""),me.createElement("span",{className:"dsh-claude-home-model-share"},"")))));let b=0,h={};for(let d=0;d<x.length;d++)b+=x[d].tokens,h[x[d].id]=d;let A=u?x:x.slice(0,Ds),w=x.length-A.length;return me.createElement(me.Fragment,null,m===null&&!C?null:s(m,h,C),me.createElement("div",{className:"dsh-claude-home-models"},A.map((d,i)=>{let p=n(d);return me.createElement("div",{key:d.id,className:"dsh-claude-home-model",title:d.sessions===void 0?d.id:`${d.id} · ${se("homeModelSessions","{count} sessions",{count:vt(d.sessions)})}`},me.createElement("span",{className:"dsh-claude-home-model-swatch","data-rank":Math.min(i,o)}),me.createElement("span",{className:"dsh-claude-home-model-name"},d.id),me.createElement("span",{className:"dsh-claude-home-model-split"},a(d)?`${Xe(p.input)} in · ${Xe(p.output)} out`:Xe(d.tokens)),me.createElement("span",{className:"dsh-claude-home-model-share"},e(d.tokens,b)))}),x.length<=Ds?null:me.createElement("button",{type:"button",className:"dsh-claude-home-models-more","aria-expanded":u,onClick(){y(!u)}},u?se("homeModelsLess","Show less"):se("homeModelsMore","Show {count} more",{count:w}))))}return{component:l}}var $e=Se(require("react"),1);function Xi(){function e(o,s,l,r){return $e.createElement("div",{key:o,className:"dsh-claude-home-stat","data-stat":o,"data-skeleton":r?"":void 0},$e.createElement("span",{className:"dsh-claude-home-stat-label"},s),$e.createElement("span",{className:"dsh-claude-home-stat-value",title:r?void 0:l},r?"":l))}let t=3;function n(o,s){let l=Yn(o,s.date);return s.messages!==null?`${l} — ${vt(s.messages)}`:se("homeHeatTipTokens","{date} — {tokens} tokens",{date:l,tokens:Xe(s.tokens)})}function a(o){let s=!o.known,l=no(),r=Math.ceil(o.grid.cells.length/7);return $e.createElement($e.Fragment,null,$e.createElement("div",{className:"dsh-claude-home-stats"},e("sessions",se("homeSessions","Sessions"),o.sessions===null?"—":vt(o.sessions),s),e("calls",se("homeCalls","Messages"),o.calls===null?"—":vt(o.calls),s),e("tokens",se("homeTokens","Total tokens"),Xe(o.tokens),s),e("days",se("homeActiveDays","Active days"),o.activeDays===null?"—":vt(o.activeDays),s),e("peak",se("homePeakHour","Peak hour"),o.peakHour===null?"—":o.peakHour,s),e("model",se("homeTopModel","Favorite model"),o.model===null?"—":o.model,s)),$e.createElement("div",{className:"dsh-claude-home-heat","data-skeleton":o.known?void 0:""},o.grid.cells.map((g,c)=>{let u=s?void 0:n(l,g),y=Math.floor(c/7);return $e.createElement("span",{key:g.date,className:"dsh-claude-home-heat-cell","data-level":g.level,"data-tip":u,"aria-label":u,"data-edge":y<t?"start":y>=r-t?"end":void 0})})),o.fun===null?null:$e.createElement("span",{className:"dsh-claude-home-fun"},o.fun))}return{view:a}}function Ji(e,t){let n="conversation.input.dock",a=ft.homeLayout,o=!1,s=Math.random(),l=null,r=null,g=Yi(e),c=Xi(),u=Qi();function y(){return document.querySelector(`[class*="_root"][${_n}="hero"]`)!==null}function x(i){let p=a===ze&&i;p!==document.body.hasAttribute(Xt)&&(p?document.body.setAttribute(Xt,""):document.body.removeAttribute(Xt))}function m(i){a=i,o=y(),i===ze?document.body.setAttribute(ua,ze):document.body.removeAttribute(ua),x(o),i===ze&&g.load(!1),g.notify()}function C(){let p=Le.useState(0)[1];return Le.useEffect(()=>g.subscribe(()=>{p(f=>f+1)}),[]),g.state()}function b(){let i=C(),p=Le.useState("overview"),f=p[0],v=p[1],k=Le.useState("all"),E=k[0],T=k[1];if(a!==ze||!y())return null;let R=Ki(i,g.list(),E,s);function N(L,D){return Le.createElement("button",{key:L,type:"button",className:"dsh-claude-home-tab","data-active":f===L?"":void 0,"aria-pressed":f===L,onClick(){v(L)}},D)}return Le.createElement("section",{className:"dsh-claude-home-panel","data-dsh-claude-home-panel":"","data-computing":i.computing?"":void 0,"aria-busy":i.computing||!R.known?"true":"false"},Le.createElement("div",{className:"dsh-claude-home-panel-head"},Le.createElement("div",{className:"dsh-claude-home-tabs"},N("overview",se("homeTabOverview","Overview")),N("models",se("homeTabModels","Models"))),Le.createElement("div",{className:"dsh-claude-home-panel-side"},Le.createElement("div",{className:"dsh-claude-home-ranges"},jn.map(L=>Le.createElement("button",{key:L.id,type:"button",className:"dsh-claude-home-range","data-active":E===L.id?"":void 0,"aria-pressed":E===L.id,onClick(){T(L.id)}},se(L.labelKey,L.fallback)))))),f==="models"?Le.createElement(u.component,{data:R}):c.view(R))}function h(){typeof e.inject=="function"&&(l=e.inject(["slots"],i=>{let p=i.get("slots");p==null||typeof p.inject!="function"||i.effect(()=>p.inject(n,()=>p.register({name:n,id:"claude-style-usage",order:40},b)),"dsh-claude-style: home usage panel")}))}function A(){r!==null&&(r.root.unmount(),r.element.parentElement!==null&&r.element.parentElement.removeChild(r.element),r=null)}function w(){let i=document.body.hasAttribute(Xt)?document.querySelector(`${tn}[class*="_composerHero"]`):null;if(i===null||i.querySelector(`:scope > [data-slot="${n}"]`)!==null){A();return}if(r!==null&&r.stack===i&&r.element.parentElement===i)return;A();let p=U("div","dsh-claude-home-seat");i.appendChild(p);let f=$i.createRoot(p);f.render(Le.createElement(b)),r={stack:i,element:p,root:f}}function d(){let i=le().homeLayout;if(i!==a){m(i),w();return}let p=y();x(p),p!==o&&(o=p,p&&(s=Math.random()),g.notify()),w(),i===ze&&(g.load(!1),g.loadList())}return t.homeLayout={sync:d},h(),m(le().homeLayout),()=>{A(),g.stop(),document.body.removeAttribute(ua),document.body.removeAttribute(Xt),l!==null&&(typeof l.dispose=="function"&&l.dispose(),l=null),delete t.homeLayout}}var Zi={idle:{frames:48,box:[12,26,36,24],still:0},"idle-look":{frames:68,box:[11,11,37,39],still:0},"idle-spout":{frames:64,box:[8,17,39,33],still:0},thinking:{frames:48,box:[0,6,47,44],still:20},typing:{frames:48,box:[0,17,52,33],still:16},music:{frames:32,box:[2,10,48,40],still:0},conducting:{frames:48,box:[1,0,51,50],still:6},building:{frames:48,box:[2,0,50,50],still:0},error:{frames:48,box:[4,17,45,33],still:24},happy:{frames:52,box:[0,5,52,45],still:44},notification:{frames:32,box:[3,7,47,43],still:12},compacting:{frames:56,box:[2,14,46,36],still:20},sleeping:{frames:64,box:[2,2,44,48],still:10},waking:{frames:30,box:[8,4,44,46],still:29},"poke-left":{frames:40,box:[1,16,50,34],still:0},"poke-right":{frames:40,box:[8,16,44,34],still:0},tickle:{frames:48,box:[9,17,43,33],still:0},drag:{frames:24,box:[10,4,41,46],still:0}},ed=80,td={idle:{frames:24,box:[24,20,24,16],still:0},"idle-look":{frames:31,box:[24,20,24,16],still:0},"idle-wave":{frames:12,box:[24,15,24,21],still:0},"idle-laptop":{frames:43,box:[14,13,34,23],still:0},thinking:{frames:32,box:[14,4,34,32],still:18},typing:{frames:6,box:[15,22,28,14],still:0},music:{frames:16,box:[22,1,30,35],still:0},conducting:{frames:24,box:[24,12,27,24],still:0},building:{frames:6,box:[15,19,28,17],still:0},error:{frames:24,box:[23,11,26,25],still:4},happy:{frames:32,box:[18,6,34,30],still:3},notification:{frames:16,box:[24,8,24,28],still:0},compacting:{frames:20,box:[21,20,30,16],still:3},sleeping:{frames:32,box:[23,3,29,33],still:0},waking:{frames:12,box:[24,4,24,32],still:11},"poke-left":{frames:10,box:[24,20,27,16],still:0},"poke-right":{frames:10,box:[21,20,27,16],still:0},tickle:{frames:16,box:[23,18,26,18],still:0},drag:{frames:8,box:[23,12,26,22],still:0}};var nd={state:"idle",animation:"idle",priority:1},p1={state:"thinking",animation:"thinking",priority:2},Us={state:"notification",animation:"notification",priority:7},m1={state:"sweeping",animation:"compacting",priority:6};function Gs(e,t,n){return((t===null?void 0:t.get(e)?.running)??n?.byId[e]?.running)===!0}function f1(e,t){if(t===null)return 0;let n=0;for(let a=0;a<t.ids.length;a++){let o=t.ids[a];t.byId[o]?.origin!=="subagent"&&Gs(o,e,t)&&n++}return n}function g1(e,t){let n=t?.projectionsBySession[e]?.values?.subagentCatalog;return Array.isArray(n)?n:[]}function ad(e){return{state:"working",animation:e>=3?"building":e===2?"music":"typing",priority:3}}function b1(e){let{sessionId:t,status:n,list:a}=e,o=f1(n,a);if(t===null){if(n!==null){for(let r of n.values())if(r.pendingInteraction!==void 0)return Us}return o>0?ad(o):nd}let s=g1(t,a);if(n!==null){if(n.get(t)?.pendingInteraction!==void 0)return Us;for(let r=0;r<s.length;r++)if(n.get(s[r].id)?.pendingInteraction!==void 0)return Us}if(e.compacting)return m1;let l=0;for(let r=0;r<s.length;r++)Gs(s[r].id,n,a)&&l++;return l>0?{state:"juggling",animation:l>=2?"conducting":"music",priority:4}:e.phase==="working"?ad(Math.max(1,o)):e.phase==="thinking"||Gs(t,n,a)?p1:nd}function od(e,t,n){let a,o=null,s=null,l=null,r=new Set,g=null,c,u=null;function y(){let f=e.get("uiSession")?.sessionStatus;return f!==c&&(u!==null&&u(),c=f,u=typeof f?.subscribe=="function"?f.subscribe(d):null),typeof f?.getSnapshot=="function"?f.getSnapshot():null}function x(){let f=e.get("sessions")?.list;return typeof f?.getSnapshot=="function"?f.getSnapshot():null}function m(){return s===null?null:s.getSnapshot()??null}function C(f){let v=f.timeline.turnOrder,k=v.length===0?void 0:f.timeline.turns.get(v[v.length-1]);if(k===void 0||k.status!=="open")return null;let E=Fa(f,k);return E===null?"thinking":E.kind==="tools"?"working":E.newest===null||E.newest==="reasoning"?"thinking":"working"}function b(f){let v=f===null?null:m();return b1({sessionId:f,status:y(),list:x(),compacting:r.size>0,phase:v===null?null:C(v)})}function h(f){if(f.type==="turn/end"){let v=f.data.reason.kind;v==="completed"||v==="max-tokens"?t("attention"):(v==="error"||v==="blocked")&&t("error")}else f.type==="tool/result"?f.data.message.isError===!0&&f.data.error?.name!=="AbortError"&&t("error"):f.type==="compaction/start"?(r.add(f.data.compactionId),n()):f.type==="compaction/end"&&(r.delete(f.data.compactionId),n(),t(f.data.error===void 0?"attention":"error"))}function A(f){r.clear();for(let v=0;v<f.length;v++){let k=f[v];k.type==="event"&&(k.event.type==="compaction/start"?r.add(k.event.data.compactionId):k.event.type==="compaction/end"&&r.delete(k.event.data.compactionId))}}function w(f){if(f===a||(i(),a=f,f===null))return;let v=e.get("sessions")?.binding(f)?.eventSource;if(typeof v?.subscribe!="function"){a=void 0;return}let k=nn(e,f);k!==null&&(s=k,l=s.subscribe(n)),A(v.getSnapshot().entries),o=v.subscribe(()=>{let E=v.getSnapshot(),T=E.change;if(T.kind==="replace"){A(E.entries),n();return}if(T.kind==="append")for(let R=0;R<T.entries.length;R++)T.entries[R].type==="event"&&h(T.entries[R].event)})}function d(){let f=y();if(f===null)return;let v=new Set;for(let[k,E]of f)E.completionUnread===!0&&v.add(k);if(g!==null&&a===null){for(let k of v)if(!g.has(k)){t("attention");break}}g=v,n()}function i(){o!==null&&o(),o=null,l!==null&&l(),l=null,s=null,r.clear(),a=void 0}function p(){i(),u!==null&&u()}return d(),{follow:w,read:b,dispose:p}}var sd={error:{state:"error",animation:"error",priority:8,holdMs:4800},attention:{state:"attention",animation:"happy",priority:5,holdMs:5200}},rd=10;function Ws(e){return{sessionId:null,level:null,moment:null,queued:null,reaction:null,extra:null,waking:!1,asleep:!1,quietSince:e,nextExtraAt:0,current:null,animation:null,timer:null,clicks:[],press:null}}function ld(e,t,n){let a=sd[t];e.moment={state:a.state,animation:a.animation,priority:a.priority,until:n+a.holdMs}}function id(e,t,n){return e.moment!==null&&n<e.moment.until&&e.moment.priority>sd[t].priority?(e.queued=t,!1):(ld(e,t,n),!0)}function dd(e,t,n,a){if(e.moment!==null&&t>=e.moment.until&&(e.moment=null,e.queued!==null&&ld(e,e.queued,t),e.queued=null),e.reaction!==null)return{key:e.reaction.key,mode:e.reaction.mode,priority:rd};let o=e.moment,s=o!==null&&o.priority>=n.priority?o:n;return s.state!=="idle"?(e.asleep=!1,e.waking=!1,e.extra=null,e.nextExtraAt=0,e.quietSince=t,{key:s.animation,mode:"loop",priority:s.priority}):(!e.asleep&&t-e.quietSince>=6e4&&(e.asleep=!0,e.extra=null),e.asleep?{key:"sleeping",mode:"loop",priority:1}:e.waking?{key:"waking",mode:"once",priority:1}:(e.extra===null&&a.extrasAllowed&&(e.nextExtraAt===0?e.nextExtraAt=t+2e4+a.random()*2e4:t>=e.nextExtraAt&&(e.extra=a.extras[Math.floor(a.random()*a.extras.length)])),e.extra!==null?{key:e.extra,mode:"once",priority:1}:{key:"idle",mode:"loop",priority:1}))}function cd(e,t,n,a){e.reaction!==null&&e.reaction.key===t&&!e.reaction.fresh&&(e.reaction=null),e.extra===t&&(e.extra=null,e.nextExtraAt=n+2e4+a()*2e4),t==="waking"&&(e.waking=!1)}function ud(e,t,n){let a=e.current;return a===null||a.mode!=="loop"||a.priority===rd||t.priority>a.priority||n-a.start>=1e3}function hd(e,t,n,a){let o=1/0;return e.moment!==null&&(o=Math.min(o,e.moment.until)),n&&e.current!==null&&(o=Math.min(o,e.current.start+1e3)),e.current!==null&&e.current.mode==="once"&&e.current.done!==!0&&(o=Math.min(o,e.current.start+a(e.current.key))),!e.asleep&&e.level!==null&&e.level.state==="idle"&&(o=Math.min(o,e.quietSince+6e4)),e.extra===null&&e.nextExtraAt>t&&(o=Math.min(o,e.nextExtraAt)),o}function ao(e,t,n){let l=`dsh-claude-${n.name}`,r=n.gutter??0,g=`data-${l}-anchor`,c=Ae(g),u=n.sheets,y=n.frameMs,x=null,m=null,C=null,b=null,h=Ws(Date.now()),A=()=>({extras:n.extras,extrasAllowed:!Re()&&!document.hidden,random:Math.random}),w=z=>u[z].frames*y,d=n.createSheets(i);function i(){x!==null&&V()}function p(){let z=U("span",l);z.setAttribute("aria-hidden","true"),m=U("span",`${l}-sprite`),C=U("span",`${l}-strip`),m.appendChild(C),z.appendChild(m);let O=U("span",`${l}-hit`);return O.addEventListener("pointerdown",F),O.addEventListener("pointermove",W),O.addEventListener("pointerup",Z),O.addEventListener("pointercancel",S),O.addEventListener("click",j=>{j.stopPropagation()}),z.appendChild(O),z}function f(z){let O=t.composer?t.composer.heroCard():null;if(O!==null)return{element:O,session:null,place:"card"};if(!z||document.body.hasAttribute(En))return null;let j=Ke(),ne=j===null?null:Oa(j);if(ne===null)return null;let G=Qe(j),$=ne.querySelector('[data-chain-overlay-fallback="conversation.composer"]');if($!==null&&$.style.display==="none"){let J=$.nextElementSibling;return J===null?null:{element:J,session:G,place:"panel"}}let K=ne.querySelector(tn);return K===null?null:{element:K,session:G,place:"stack"}}function v(z){let O=f(z);if(O===null){H();return}x===null&&(x=p()),b===null&&(h.quietSince=Date.now(),b=od(e,E,k)),x.parentNode!==O.element&&O.element.appendChild(x),c.mark(O.element,O.place),O.session!==h.sessionId&&(h.sessionId=O.session,h.moment=null,h.queued=null),b.follow(h.sessionId),k()}function k(){b!==null&&(h.level=b.read(h.sessionId),V())}function E(z){id(h,z,Date.now())&&V()}function T(z,O){cd(h,z,O,Math.random)}function R(){return Re()&&h.reaction===null}function N(z){return[z.box[2]+r*2,z.box[3]+r*2]}function L(z,O){let[j,ne]=N(z);return`translate(${-(O%8*j+r)*2}px, ${-(Math.floor(O/8)*ne+r)*2}px)`}function D(z,O,j){h.animation!==null&&(h.animation.cancel(),h.animation=null);let ne=u[O];if(R()){z.style.transform=L(ne,ne.still);return}z.style.transform="";let G=[];for(let K=0;K<ne.frames;K++)G.push({offset:K/ne.frames,transform:L(ne,K),easing:"steps(1)"});G.push({offset:1,transform:L(ne,j==="loop"?0:ne.frames-1)});let $=z.animate(G,{duration:ne.frames*y,iterations:j==="loop"?1/0:1,fill:"forwards"});h.animation=$,j==="once"&&$.finished.then(()=>{h.animation!==$||h.current===null||h.current.key!==O||h.current.done===!0||(h.current.done=!0,T(O,Date.now()),V())},()=>{})}function V(){if(x===null||C===null||h.level===null)return;let z=Date.now();h.current!==null&&h.current.mode==="once"&&h.current.done!==!0&&z-h.current.start>=w(h.current.key)&&(h.current.done=!0,T(h.current.key,z));let O=dd(h,z,h.level,A()),j=h.current===null||O.key!==h.current.key||h.reaction!==null&&h.reaction.fresh,ne=ud(h,O,z);if(j&&ne)d.ready(O.key)?Y(x,C,O,z):O.mode==="once"&&d.failed(O.key)&&(h.reaction!==null&&(h.reaction.fresh=!1),T(O.key,z));else if(!j&&h.current!==null){if(R()&&h.animation!==null)h.animation.cancel(),h.animation=null,C.style.transform=L(u[h.current.key],u[h.current.key].still);else if(!R()&&h.animation===null){D(C,h.current.key,h.current.mode);let G=h.animation;G!==null&&h.current.mode==="loop"&&(G.currentTime=(z-h.current.start)%w(h.current.key))}}B(z,j&&!ne)}function Y(z,O,j,ne){let G=u[j.key],[$,K]=N(G);h.current={key:j.key,mode:j.mode,priority:j.priority,start:ne},h.reaction!==null&&h.reaction.key===j.key&&(h.reaction.fresh=!1);let J=z.style;d.paint(J,j.key),J.setProperty(`--${l}-x`,String(G.box[0])),J.setProperty(`--${l}-y`,String(G.box[1])),J.setProperty(`--${l}-w`,String(G.box[2])),J.setProperty(`--${l}-h`,String(G.box[3])),J.setProperty(`--${l}-cell-w`,String($)),J.setProperty(`--${l}-strip-h`,String(K*Math.ceil(G.frames/8))),ye(z,"data-animation",j.key),D(O,j.key,j.mode),z.hasAttribute("data-ready")||z.setAttribute("data-ready","")}function B(z,O){h.timer!==null&&clearTimeout(h.timer),h.timer=null;let j=hd(h,z,O,w);j!==1/0&&(h.timer=setTimeout(()=>{h.timer=null,V()},Math.max(j-z,0)))}function _(z,O){h.reaction={key:z,mode:O,fresh:!0},V()}function F(z){z.button===0&&(h.press={id:z.pointerId,x:z.clientX,y:z.clientY,lifted:!1},z.currentTarget.setPointerCapture(z.pointerId))}function W(z){h.press===null||h.press.lifted||z.pointerId!==h.press.id||Math.hypot(z.clientX-h.press.x,z.clientY-h.press.y)<4||(h.press.lifted=!0,h.clicks=[],_("drag","loop"))}function Z(z){if(h.press===null||z.pointerId!==h.press.id)return;let O=h.press.lifted;if(h.press=null,O){h.reaction=null,V();return}let j=Date.now();if(h.clicks.length>0&&j-h.clicks[h.clicks.length-1]>450&&(h.clicks=[]),h.clicks.push(j),h.clicks.length>=4){h.clicks=[],_("tickle","once");return}let ne=z.currentTarget.getBoundingClientRect();_(z.clientX-ne.left<ne.width/2?"poke-left":"poke-right","once")}function S(z){if(h.press===null||z.pointerId!==h.press.id)return;let O=h.press.lifted;h.press=null,O&&(h.reaction=null,V())}function P(){h.quietSince=Date.now(),h.asleep&&(h.asleep=!1,h.waking=!Re(),V())}function H(){h.timer!==null&&clearTimeout(h.timer),h.animation!==null&&h.animation.cancel(),x!==null&&x.parentNode!==null&&x.parentNode.removeChild(x),c.release(),b!==null&&b.dispose(),b=null,h=Ws(Date.now())}function q(){H(),d.dispose(),x=null,m=null,C=null}return{sync:v,release:H,onActivity:P,dispose:q}}function pd(e,t){return ao(e,t,{name:"crab",sheets:td,frameMs:ed,extras:["idle-look","idle-wave","idle-laptop"],createSheets(){return{ready:n=>Object.prototype.hasOwnProperty.call(Da,n),failed:()=>!1,paint(n,a){n.setProperty("--dsh-claude-crab-sheet",`url("${Da[a].body}")`),n.setProperty("--dsh-claude-crab-ink",`url("${Da[a].ink}")`)},dispose(){}}}})}function md(e){let t=new Map,n=!0;function a(r){let g=t.get(r);if(g!==void 0)return g==="ready";let c=Cs[r];if(c===void 0)throw new Error(`dsh-claude-style: no sheet for "${r}"`);t.set(r,"loading");let u=new Image;u.src=c;let y=x=>{t.get(r)==="loading"&&(t.set(r,x?"ready":"failed"),x&&n&&e(r),x||console.warn(`[dsh-claude-style] Deepy's "${r}" sheet did not load from ${c}; the host half serves it, so restart the host after an update.`))};return u.decode().then(()=>y(!0),()=>y(!1)),!1}function o(r){return t.get(r)==="failed"}function s(r){return Cs[r]}function l(){n=!1,t.clear()}return{ready:a,failed:o,url:s,dispose:l}}function fd(e,t){return ao(e,t,{name:"deepy",sheets:Zi,frameMs:50,gutter:1,extras:["idle-look","idle-spout"],createSheets(n){let a=md(n);return{ready:a.ready,failed:a.failed,paint(o,s){o.setProperty("--dsh-claude-deepy-sheet",`url("${a.url(s)}")`)},dispose:a.dispose}}})}function gd(e,t){let n=pd(e,t),a=fd(e,t);function o(){let l=le(),r=Hn(l),g=l.mascotScope===An;r===Rt?n.sync(g):n.release(),r===_t?a.sync(g):a.release()}function s(){n.onActivity(),a.onActivity()}return t.mascot={sync:o,onActivity:s},()=>{n.dispose(),a.dispose(),delete t.mascot}}var w1=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],bd=[{from:5,to:12,lines:["Good morning, {name}!","Happy {weekday}, {name}.","What are you working on?","Morning, {name}. What’s first?","Fresh start, {name}?"]},{from:12,to:14,lines:["What’s on the agenda today?","Good afternoon, {name}.","Midday check-in, {name}?"]},{from:14,to:18,lines:["Coffee and Claude time?","Good afternoon, {name}.","How’s the day going, {name}?","Afternoon, {name}. What’s next?"]},{from:18,to:22,lines:["Evening, how are things?","Good evening, {name}.","How was your day, {name}?","Winding down, or just getting started?"]},{from:22,to:29,lines:["You are here!","Hello, night owl.","Burning the midnight oil, {name}?","Still up, {name}?"]}],yd=["Back at it, {name}?","Welcome back, {name}.","Hey there, {name}.","What shall we build?"];function vd(e,t){let n=new Date,a=n.getHours(),o=a<5?a+24:a,s=yd;for(let r=0;r<bd.length;r++){let g=bd[r];o>=g.from&&o<g.to&&(s=g.lines.concat(yd))}return s[Math.min(s.length-1,Math.floor(t*s.length))].replace("{name}",e||"User").replace("{weekday}",w1[n.getDay()])}function wd(e){return`What's up next, ${e||"User"}?`}var hn=8;function qs(e,t,n,a={}){let o=a.margin||hn;if(a.side==="right"){let r=e.right+o;r+t>window.innerWidth-o&&(r=Math.max(o,e.left-o-t));let g=Math.min(Math.max(o,e.bottom-n),Math.max(o,window.innerHeight-n-o));return{x:r,y:g}}if(a.side==="above-left"){let r=Math.max(o,Math.min(e.left,window.innerWidth-t-o)),g=e.top-(a.gap||0)-n;return g<o&&(g=Math.min(e.bottom+(a.gap||0),Math.max(o,window.innerHeight-n-o))),{x:r,y:g}}let s=Math.max(o,Math.min(e.right-t,window.innerWidth-t-o)),l=e.top-(a.gap||0)-n;return l<o&&(l=Math.min(e.bottom+(a.gap||0),Math.max(o,window.innerHeight-n-o))),{x:s,y:l}}function Je(e,t,n={}){let a=e.getBoundingClientRect(),{x:o,y:s}=qs(a,t.offsetWidth,t.offsetHeight,n),l=`${Math.round(o)}px`,r=`${Math.round(s)}px`;return n.important?(t.style.left!==l&&t.style.setProperty("left",l,"important"),t.style.top!==r&&t.style.setProperty("top",r,"important")):(t.style.left!==l&&(t.style.left=l),t.style.top!==r&&(t.style.top=r)),{x:o,y:s}}var pn='<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>',Be=100,Ve=100;function He(e,t,n,a){let o=null,s=null;return{cancel(){o&&(clearTimeout(o),o=null),s&&(clearTimeout(s),s=null)},scheduleOpen(){o&&clearTimeout(o),o=setTimeout(()=>{o=null,e()},n)},scheduleClose(){o&&(clearTimeout(o),o=null),s&&clearTimeout(s),s=setTimeout(()=>{s=null,t()},a)}}}var ot=[];function Oe(e,t){for(let n=0;n<ot.length;n++)if(ot[n].name===e){ot[n].close=t;return}ot.push({name:e,close:t})}function Pe(e){for(let t=0;t<ot.length;t++)if(ot[t].name===e){ot.splice(t,1);return}}function _e(e){for(let t=0;t<ot.length;t++)ot[t].name!==e&&ot[t].close()}function Ce(e,t){t?(e.setAttribute("data-open","true"),e.setAttribute("role","menu")):(e.setAttribute("data-open","false"),e.removeAttribute("role"))}function wt(e={}){let t=U("button",e.className?`dsh-claude-popover-item ${e.className}`:"dsh-claude-popover-item");t.type="button",e.role&&t.setAttribute("role",e.role);let n=e.icon?U("span","dsh-claude-popover-item-icon"):null;n!==null&&t.appendChild(n);let a,o=null;if(e.lines===2){let r=U("div","dsh-claude-popover-item-col");a=U("span","dsh-claude-popover-item-text"),o=U("span","dsh-claude-popover-item-desc"),r.appendChild(a),r.appendChild(o),t.appendChild(r)}else a=U("span",e.textClass||"dsh-claude-popover-item-text"),t.appendChild(a);let s=e.badge?U("span","dsh-claude-popover-item-badge"):null;s!==null&&t.appendChild(s);let l=e.check?U("span","dsh-claude-popover-check"):null;return l!==null&&t.appendChild(l),{row:t,icon:n,text:a,desc:o,badge:s,check:l}}function ve(e,t,n){let a=e.querySelectorAll(t);for(let o=0;o<a.length;o++)n.includes(a[o])||a[o].parentElement?.removeChild(a[o])}var js="How can I help you today?",Ys="Type / for commands";function Ad(e,t){let n=["描述你想要构建的内容","发消息或创建任务","Describe what you want to build","Message or run a task",js,Ys];function a(c){for(let u=0;u<n.length;u++)if(c.indexOf(n[u])===0)return!0;return!1}let o=Math.random(),s=!1;function l(){let c=t.composer.isHero();c&&!s&&(o=Math.random()),s=c;let u=le().homeLayout===ze?wd(Ft()):vd(Ft(),o),y=document.querySelectorAll('[class*="titleGroup"]');for(let x=0;x<y.length;x++){let m=y[x].children;for(let C=0;C<m.length;C++){let b=m[C];if(!(b.getAttribute("class")||"").includes("previewBadge")){b.textContent!==u&&(b.textContent=u);break}}}}function r(){if(!t.composer.isActive())return;let c=t.composer.isHero()?js:Ys,u=Wl();for(let y=0;y<u.length;y++){let x=u[y],m=x.textContent||"";a(m)&&m!==c&&(x.textContent=c)}}function g(){if(!t.composer.isActive()){ve(document,"[data-dsh-synthetic-placeholder]",[]);return}let c=t.composer.isHero()?js:Ys,u=Ma();for(let y=0;y<u.length;y++){let x=u[y],m=jl(x);if(!m)continue;let b=(m.textContent||"").replace(/[\u200B-\u200D\uFEFF]/g,"").trim().length===0,h=Ha(x),A=m.closest?m.closest('[class*="_grow"]'):m.parentElement;if(b){if(!h&&A)h=document.createElement("div"),h.setAttribute("data-composer-placeholder",""),h.setAttribute("data-dsh-synthetic-placeholder","true"),h.textContent=c,A.appendChild(h);else if(h){h.style.display==="none"&&(h.style.display="");let w=h.textContent||"";a(w)&&w!==c&&(h.textContent=c)}}else h&&h.hasAttribute("data-dsh-synthetic-placeholder")&&h.parentElement&&h.parentElement.removeChild(h)}}return t.copy={sync(){l(),r(),g()},onInput(){g()}},()=>{ve(document,"[data-dsh-synthetic-placeholder]",[])}}var Ks={"read-only":{label:"Read only",desc:"仅读取文件与分析，不修改代码"},"workspace-write":{label:"Accept edits",desc:"允许编辑工作区文件"},"auto-mode":{label:"Auto mode",desc:"规则放行常规操作，其余由分类器裁决"},auto:{label:"Auto review",desc:"无沙箱运行，调用前由模型审查"},"danger-full-access":{label:"Full access",desc:"自动执行，无需反复确认"}},Qs=[{label:"Read",presets:["read-only"]},{label:"Edit",presets:["workspace-write"]},{label:"Auto",presets:["auto-mode","auto"]},{label:"Yolo",presets:["danger-full-access"]}],oo=["read-only","workspace-write","auto-mode","auto","danger-full-access"],Xs=["read-only","workspace-write","danger-full-access"],xd={custom:"Custom"},Gt="dsh-claude-segments",Wt="dsh-claude-segment";function st(e){let t="data-dsh-claude-pill",n=null,a=null,o=null,s=null;function l(u){u.removeAttribute(t),u.style.removeProperty("--dsh-claude-pill-x"),u.style.removeProperty("--dsh-claude-pill-w"),a=null,o=null}function r(u){let y=u.querySelector(e),x=u.getBoundingClientRect(),m=y===null?null:y.getBoundingClientRect();if(x.width===0||m===null||m.width===0){u.hasAttribute(t)&&l(u);return}let C=Math.round((m.left-x.left-u.clientLeft)*100)/100,b=Math.round(m.width*100)/100;C===a&&b===o&&u.hasAttribute(t)||(a=C,o=b,u.style.setProperty("--dsh-claude-pill-x",`${C}px`),u.style.setProperty("--dsh-claude-pill-w",`${b}px`),u.hasAttribute(t)||u.setAttribute(t,""))}function g(u){if(u!==n){if(s!==null&&s(),s=null,n!==null&&l(n),n=u,n===null)return;s=De(n,()=>{n!==null&&r(n)})}n!==null&&r(n)}function c(){s!==null&&s(),s=null,n!==null&&l(n),n=null}return{sync:g,release:c}}function kd(e,t){let n=null,a=st("[data-active]"),o=null,s=null,l=null,r=null,g=null,c=null,u={side:"above-left",gap:6,important:!0},y=null,x=null,m=!1,C=null,b=null,h=null,A="",w=null,d="";function i(G){if(y===null)return null;for(let $=0;$<y.length;$++){let K=y[$];if(K!==null&&typeof K=="object"&&K.value===G)return K}return null}function p(G){return y===null?Xs.includes(G):i(G)!==null}function f(G){let $=Ks[G];if($!==void 0)return $.label;let K=i(G);if(K!==null&&typeof K.name=="string"&&K.name!=="")return K.name;let J=xd[G];return J===void 0?G:J}function v(G){let $=Ks[G];if($!==void 0)return $.desc;let K=i(G);return K!==null&&typeof K.description=="string"?K.description:""}function k(){let G;if(y===null)return Xs.slice();let $=[];for(G=0;G<y.length;G++){let J=y[G];J===null||typeof J!="object"||typeof J.value!="string"||J.value===""||$.includes(J.value)||$.push(J.value)}let K=[];for(G=0;G<oo.length;G++)$.includes(oo[G])&&K.push(oo[G]);for(G=0;G<$.length;G++)K.includes($[G])||K.push($[G]);return K}function E(){let G=[];for(let $=0;$<Qs.length;$++){let K=Qs[$];for(let J=0;J<K.presets.length;J++)if(p(K.presets[J])){G.push({label:K.label,preset:K.presets[J]});break}}return G}let T=[1e3,5e3],R=0,N=0,L=null;function D(){N++,L!==null&&(clearTimeout(L),L=null)}function V(){let G=e.get("remote.permissionPresets");if(typeof G?.catalog!="function"){typeof e.inject!="function"&&(C=new Error("permission: the host exposes no remote.permissionPresets catalog"),t.schedule());return}D();let $=N;G.catalog().then(K=>{if($===N){if(K===null||typeof K!="object"||K.ok!==!0||K.value===null||typeof K.value!="object"||!Array.isArray(K.value.options)||typeof K.value.defaultPreset!="string"){C=new Error("permission: unexpected permissionPresets catalog shape"),t.schedule();return}R=0,C=null,y=K.value.options.slice(),x=K.value.defaultPreset,t.schedule()}},()=>{if($===N){if(R>=T.length){C=new Error(`permission: the permissionPresets catalog read failed ${T.length+1} times`),t.schedule();return}L=setTimeout(()=>{L=null,V()},T[R++])}})}function Y(){typeof e.inject=="function"?b=e.inject(["remote.permissionPresets"],$=>{$.effect(()=>(V(),()=>{}),"dsh-claude-style: permission catalog")}):V();let G=e.get("remote");typeof G?.$on=="function"&&(h=G.$on("permission-presets/catalog-changed",()=>{V()}))}function B(G,$){let K=U("div",Gt);K.setAttribute("role","radiogroup"),K.setAttribute("aria-label","Permission"),K.setAttribute("data-composer-segments","");for(let J=0;J<$.length;J++){let re=$[J],de=document.createElement("button");de.type="button",de.className=Wt,de.setAttribute("role","radio"),de.setAttribute("data-preset",re.preset),de.textContent=re.label,K.appendChild(de)}return K.addEventListener("click",J=>{let re=fe(J.target,`.${Wt}`);re===null||!K.contains(re)||G(re.getAttribute("data-preset"))}),K}let _=null,F=null;function W(){s===null||r===null||(s.removeAttribute("data-open"),s.setAttribute("aria-expanded","false"),Ce(r,!1))}function Z(G){let $=wt({role:"menuitem",lines:2,check:!0}),K=$.row;return K.setAttribute("data-preset",G),$.text.textContent=f(G),$.desc.textContent=v(G),$.check.textContent="✓",$.check.hidden=!0,K.addEventListener("click",J=>{J.stopPropagation(),W(),c!==null&&c(G)}),K}function S(){if(r===null)return;let G=k(),$=G.join("|");if(!($===A&&w===r)){for(A=$,w=r;r.firstChild!==null;)r.removeChild(r.firstChild);for(let K=0;K<G.length;K++)r.appendChild(Z(G[K]))}}Oe("permission",W);function P(){s===null||r===null||s.getAttribute("data-open")==="true"&&Je(s,r,u)}function H(G){c=G;let $=U("div","dsh-claude-perm-container"),K=document.createElement("button");K.type="button",K.className="dsh-claude-perm-btn",K.setAttribute("aria-haspopup","menu"),K.setAttribute("aria-expanded","false");let J=U("span","dsh-claude-perm-label","Accept edits");K.appendChild(J);let re=U("div","dsh-claude-popover-card dsh-claude-perm-popover");Ce(re,!1);function de(){g&&g.cancel(),_e("permission"),Je(K,re,u),K.setAttribute("data-open","true"),K.setAttribute("aria-expanded","true"),Ce(re,!0)}return g=He(de,W,Be,Ve),K.addEventListener("mouseenter",()=>{le().autoPopover===Ee&&g.scheduleOpen()}),K.addEventListener("mouseleave",()=>{le().autoPopover===Ee&&g.scheduleClose()}),re.addEventListener("mouseenter",()=>{g.cancel()}),re.addEventListener("mouseleave",()=>{g.scheduleClose()}),K.addEventListener("click",ue=>{ue.stopPropagation(),K.getAttribute("data-open")==="true"?W():de()}),_||(_=ue=>{r&&s&&r.getAttribute("data-open")==="true"&&!s.contains(ue.target)&&!r.contains(ue.target)&&W()},document.addEventListener("pointerdown",_)),F||(F=()=>{r&&s&&r.getAttribute("data-open")==="true"&&W()},window.addEventListener("resize",F),window.addEventListener("scroll",F,!0)),$.appendChild(K),ve(document,".dsh-claude-perm-popover",[]),document.body.appendChild(re),{container:$,btn:K,label:J,popover:re}}function q(G){if(!l||!r)return;S();let $=G===null?"Accept edits":f(G);l.textContent!==$&&(l.textContent=$);let K=r.querySelectorAll("[data-preset]");for(let J=0;J<K.length;J++){let re=K[J],de=re.getAttribute("data-preset")===G,ue=re.querySelector(".dsh-claude-popover-check");ue&&(ue.hidden=!de),re.toggleAttribute("data-active",de)}}let z=null;function O(G){let $=Ia(e);if($===null)return;let K=$.command(`/permission ${G}`);K?.then(J=>{J===null||typeof J!="object"||J.ok!==!0?z=new Error(`permission: the /permission ${G} command was refused`):J.value===null||typeof J.value!="object"||J.value.matched!==!0?z=new Error("permission: the host offers no /permission command"):z=null,t.schedule()},()=>{z=new Error(`permission: the /permission ${G} command failed`),t.schedule()})}function j(G){let $=Ia(e);$===null||G===null||G!==ms($)&&O(G)}function ne(){let G=t.composer.isHero(),$=t.composer.isActive(),K=document.querySelectorAll(".dsh-claude-perm-container"),J=document.querySelectorAll(`.${Gt}[data-composer-segments]`);if(!$){for(let ae=0;ae<K.length;ae++)K[ae].remove();r&&r.parentElement&&r.parentElement.removeChild(r),o=null,s=null,l=null,r=null;for(let ae=0;ae<J.length;ae++)J[ae].remove();n=null,a.sync(null),m=!1;return}let re=Ia(e),de=_a(),ue=de===null&&G&&re===null,pe=ue?document.querySelector(`${dt}[class*="_cardWorkspaceTrigger"] [class*="_modes"]`):de===null?null:de.parentElement;if(ue&&!m&&y!==null&&V(),m=ue,pe===null)return;let X=ue?x:re===null?null:ms(re);if(G){for(let M=0;M<K.length;M++)K[M].remove();r&&r.parentElement&&r.parentElement.removeChild(r),o=null,s=null,l=null,r=null;let ae=E(),I=ae.map(M=>`${M.label}=${M.preset}`).join("|");if(J.length>1)for(let M=1;M<J.length;M++)J[M].remove();let ee;if(I===d&&J.length===1&&pe.contains(J[0]))ee=J[0];else{d=I;for(let M=0;M<J.length;M++)J[M].remove();ee=B(j,ae),pe.insertBefore(ee,pe.firstChild)}n=ee;for(let M=0;M<ee.children.length;M++){let Q=ee.children[M];Q.disabled!==ue&&(Q.disabled=ue);let te=Q.getAttribute("data-preset")===X;Q.toggleAttribute("data-active",te),ye(Q,"aria-checked",String(te))}a.sync(ee)}else{for(let I=0;I<J.length;I++)J[I].remove();n=null,a.sync(null);let ae=document.querySelectorAll(".dsh-claude-perm-container");if(ae.length>0){let I=ae[0];o=I;for(let ee=1;ee<ae.length;ee++)ae[ee].remove();I.parentElement!==pe&&pe.insertBefore(I,pe.firstChild),s=I.querySelector(".dsh-claude-perm-btn"),l=I.querySelector(".dsh-claude-perm-label"),r===null&&(r=document.querySelector(".dsh-claude-perm-popover"))}else{let I=H(j);o=I.container,s=I.btn,l=I.label,r=I.popover,pe.insertBefore(o,pe.firstChild)}q(X)}}return t.permissions={sync(){if(C!==null)throw C;if(z!==null)throw z;ne(),P()},close(){W()},reposition(){P()}},document.body.setAttribute(Wo,""),Y(),()=>{Pe("permission"),g&&g.cancel(),D(),b!==null&&typeof b.dispose=="function"&&(b.dispose(),b=null),h!==null&&(h(),h=null),_&&(document.removeEventListener("pointerdown",_),_=null),F&&(window.removeEventListener("resize",F),window.removeEventListener("scroll",F,!0),F=null),a.release(),ve(document,`.${Gt}[data-composer-segments], .dsh-claude-perm-container, .dsh-claude-perm-popover`,[]),n=null,r=null,s=null,l=null,o=null,document.body.removeAttribute(Wo)}}var At="data-dsh-claude-context-stats",xt="data-dsh-claude-context-panel",$s="data-dsh-claude-context-aligned",A1="[data-session-stats-details], [data-session-stats-usage], [data-turn-usage-details]";function Kn(){return document.querySelector("[data-dsh-claude-context-meter]")}function so(){let e=Kn();return e===null?null:e.querySelector("button")}function ht(){let e=document.querySelectorAll('[role="dialog"]');for(let t=0;t<e.length;t++){let n=e[t];if(n.getAttribute("aria-modal")!=="true"&&n.querySelector(A1)===null&&n.querySelector(":scope > dl")!==null)return n}return null}function Ed(){let e=ht(),t=e===null?null:e.querySelector(`[${At}]`);ve(document,`[${At}]`,[t]);let n=document.querySelectorAll(`[${xt}]`);for(let a=0;a<n.length;a++)n[a]!==e&&(n[a].removeAttribute(xt),n[a].removeAttribute($s))}function Cd(e){let t=e.querySelectorAll(ba);if(t.length>0){for(let a=0;a<t.length;a++)if(t[a].querySelector(Mn)!==null)return!0;return!1}if(e.querySelector(Mn)!==null)return!0;let n=e.children;for(let a=0;a<n.length;a++)if(n[a].querySelector("button, span")!==null)return!0;return!1}var x1="--dsh-claude-context-panel-left",Td=12;function Sd(){let e={},t=null;function n(){let u=so();u===null||u.getAttribute("aria-expanded")==="true"||u.click()}function a(){let u=so();if(u===null||u.getAttribute("aria-expanded")!=="true")return;let y=ht();y!==null&&y.matches(":hover")||u.click()}let o=He(n,a,Be,Ve);function s(){return le().autoPopover===Ee}function l(u){u.__dshContextMeterToken!==e&&(u.__dshContextMeterToken=e,u.addEventListener("mouseenter",()=>{s()&&o.scheduleOpen()}),u.addEventListener("mouseleave",()=>{s()&&o.scheduleClose()}))}function r(u){let y=Kn();if(y===null)return;let x=y.getBoundingClientRect(),m=u.offsetWidth;if(m===0)return;let C=window.innerWidth-m-Td,b=Math.round(Math.min(Math.max(x.right-m,Td),C));u.style.setProperty(x1,`${b}px`),u.setAttribute($s,"")}function g(u){u.hasAttribute(xt)||u.setAttribute(xt,""),u.__dshContextPanelToken!==e&&(u.__dshContextPanelToken=e,u.addEventListener("mouseenter",()=>{o.cancel()}),u.addEventListener("mouseleave",()=>{s()&&o.scheduleClose()}),t!==null&&t(),t=De(u,()=>{let y=ht();y!==null&&r(y)}),r(u))}function c(){o.cancel();let u=so();u===null||u.getAttribute("aria-expanded")!=="true"||u.click()}return{bindMeter:l,bindPanel:g,align:r,close:c,cancelHover(){o.cancel()},releaseSize(){t!==null&&(t(),t=null)}}}function Qn(e,t){let n=e/1e3;if(n<60)return t("duration.compactSeconds",{seconds:Math.round(n*10)/10});let a=Math.round(n);return t("duration.compactMinutes",{minutes:Math.floor(a/60),seconds:a%60})}function Rd(e){let t=Math.max(0,e);return t>=10?String(Math.round(t)):String(Math.round(t*10)/10)}function k1(e,t){let n=String(e),a=[];for(let o=n.length;o>0;o-=3)a.unshift(n.slice(Math.max(0,o-3),o));return a.join(t("number.groupSeparator"))}function Xn(e,t){return t("message.turnUsage.count",{count:k1(e,t)})}function E1(e,t){let o=Math.floor(t/200),s=t%200,l=0,r=100;for(;l<r;){let g=Math.floor((l+r+1)/2),c=g*2-1,u=c*o+Math.ceil(c*s/200);e>=u?l=g:r=g-1}return l}function Js(e,t){if(t===0)return null;let n=t-e;if(n===0)return"100";let a=E1(e,t);if(a<100)return String(a);let o=1,s=n*200,l=Math.floor(t/10);for(;s<=l;)s*=10,o+=1;let r=t%10,g=5;for(let c=1;c<5;c+=1){let u=c*2+1;if(s<=u*l+Math.floor(u*r/10)){g=c;break}}return`99.${"9".repeat(o-1)}${10-g}`}function _d(e,t,n){let a=[];if(n){let o=(e.llmMs>0?e.llmMs:0)+(e.toolMs>0?e.toolMs:0);o>0&&a.push({label:se("contextTotalTime","Total time"),value:Qn(o,t)})}else e.llmMs>0&&a.push({label:t("stats.dialog.llmTime"),value:Qn(e.llmMs,t)}),e.toolMs>0&&a.push({label:t("stats.dialog.toolTime"),value:Qn(e.toolMs,t)});return e.ttftSteps>0&&a.push({label:t("stats.dialog.ttft"),value:Qn(e.ttftMs/e.ttftSteps,t)}),e.decodeMs>0&&a.push({label:t("stats.dialog.speed"),value:t("message.tokensPerSecond",{tps:Rd(e.decodeTokens/(e.decodeMs/1e3))})}),a}function Md(e,t,n){let a=[],o=e("sessionStats");if(n){let l=[];if(o!=null){let g=_d(o,t,!0);for(let c=0;c<g.length;c++)l.push(g[c])}let r=e("tokenUsage");if(r!=null){let g=r.uncachedInputTokens+r.cacheReadTokens+r.cacheWriteTokens;if(g>0||r.outputTokens>0){let c=Js(r.cacheReadTokens,g);c!==null&&l.push({label:t("message.turnUsage.cacheHit"),value:`${c}%`})}}return l.length>0&&a.push({title:"",rows:l}),a}if(o!=null){let l=_d(o,t,!1);l.length>0&&a.push({title:t("stats.dialog.title"),rows:l})}let s=e("tokenUsage");if(s!=null){let l=s.uncachedInputTokens+s.cacheReadTokens+s.cacheWriteTokens;if(l>0||s.outputTokens>0){let r=[],g=Js(s.cacheReadTokens,l);g!==null&&r.push({label:t("message.turnUsage.cacheHit"),value:`${g}%`}),r.push({label:t("message.turnUsage.input"),value:Xn(s.uncachedInputTokens,t)}),r.push({label:t("message.turnUsage.cacheRead"),value:Xn(s.cacheReadTokens,t)}),s.cacheWriteTokens!==0&&r.push({label:t("message.turnUsage.cacheWrite"),value:Xn(s.cacheWriteTokens,t)}),r.push({label:t("message.turnUsage.output"),value:Xn(s.outputTokens,t)}),r.length>0&&a.push({title:t("stats.dialog.usageTitle"),rows:r})}}return a}var Ld="data-dsh-claude-context-skeleton",Hd=2e3,C1=4,T1=4;function Od(e,t){let n="",a=!1,o=0,s=null;function l(){a=!1,o=0,s!==null&&(clearTimeout(s),s=null)}function r(x){let m=x.querySelector(`[${At}]`);return m===null&&(m=document.createElement("div"),m.className="dsh-claude-context-stats",m.setAttribute(At,""),x.appendChild(m)),m}function g(x){let m=x.querySelector(`[${At}]`);m!==null&&m.parentElement!==null&&m.parentElement.removeChild(m),n=""}function c(x,m,C){a||(a=!0,o=Date.now());let b=Date.now()-o;if(b>=Hd){l(),g(x);return}s===null&&(s=setTimeout(()=>{s=null,l(),y()},Hd-b));let h=C?"skeleton-compact":"skeleton",A=C?null:[m("stats.dialog.title"),m("stats.dialog.usageTitle")];if(A!==null)for(let d of A)h+=`${d}`;let w=r(x);if(!(h===n&&w.childElementCount>0))if(n=h,w.setAttribute(Ld,""),C)w.replaceChildren(u(T1));else{let d=[];for(let i of A)d.push(U("div","dsh-claude-context-stats-section",i),u(C1));w.replaceChildren(...d)}}function u(x){let m=U("div","dsh-claude-context-stats-grid");for(let C=0;C<x;C++){let b=U("div","dsh-claude-context-stats-item");b.append(U("span","dsh-claude-context-stats-skeleton-label"),U("span","dsh-claude-context-stats-skeleton-value")),m.appendChild(b)}return m}function y(){let x=ht();if(x===null)return;let m=ql();if(m===null)return;let C=t();if(C===null)return;let b=!Cd(m),h=e("sessionStats")===void 0&&e("tokenUsage")===void 0,A=h?[]:Md(e,C,b);if(A.length===0){h?c(x,C,b):g(x);return}l();let w=b?"compact":"";for(let p of A){p.title&&(w+=`${p.title}`);for(let f of p.rows)w+=`${f.label}${f.value}`}let d=r(x);if(d.removeAttribute(Ld),w===n&&d.childElementCount>0)return;n=w;let i=[];for(let p of A){p.title&&i.push(U("div","dsh-claude-context-stats-section",p.title));let f=U("div","dsh-claude-context-stats-grid");for(let v of p.rows){let k=U("div","dsh-claude-context-stats-item");k.append(U("div","dsh-claude-context-stats-label",v.label),U("div","dsh-claude-context-stats-value",v.value)),f.appendChild(k)}i.push(f)}d.replaceChildren(...i)}return{render:y,stopSkeleton:l,resetContent(){n=""}}}function Pd(e){let t=["sessionStats","tokenUsage"],n=null;function a(){let m=Qe(Ke());return m===null?"":m}function o(m){let C=e.get("sessions"),h=(typeof C?.binding=="function"?C.binding(m):void 0)?.session?.projections;if(typeof h?.faceOf!="function")return null;let A={};for(let w=0;w<t.length;w++)A[t[w]]=h.faceOf(t[w]);return A}function s(m){let C=n===null?void 0:n.faces[m];return typeof C?.getSnapshot=="function"?C.getSnapshot():void 0}function l(){let m=e.get("locale");return typeof m?.bind=="function"?m.bind("chat"):null}let r=Od(s,l),g=Sd();function c(){if(n!==null){for(let m=0;m<n.off.length;m++)n.off[m]();n=null,r.stopSkeleton()}}function u(){r.render()}function y(){let m=a();if(n!==null&&n.sessionId===m||(c(),r.resetContent(),m===""))return;let C=o(m);if(C===null)return;let b=[];for(let h=0;h<t.length;h++){let A=C[t[h]];typeof A?.subscribe=="function"&&b.push(A.subscribe(u))}n={sessionId:m,faces:C,off:b}}function x(){y();let m=Kn();m!==null&&g.bindMeter(m);let C=ht();C!==null&&(g.bindPanel(C),r.render())}return Ed(),{sync(){x()},close(){g.close()},reposition(m){if(m!=="viewport")return;let C=ht();C!==null&&g.align(C)},teardown(){g.cancelHover(),c(),g.releaseSize();let m=document.querySelectorAll(`[${At}]`);for(let b=0;b<m.length;b++)m[b].remove();let C=document.querySelectorAll(`[${xt}]`);for(let b=0;b<C.length;b++)C[b].removeAttribute(xt);r.resetContent()}}}function Id(e,t){let n=Pd(e);return t.contextStats={sync:n.sync,reposition:n.reposition,close(a){a==="composer"&&n.close()}},document.body.setAttribute(qo,""),()=>{n.teardown(),document.body.removeAttribute(qo)}}function ro(e){if(ie!==null){let t=String(e??"").toLowerCase();for(let n=0;n<ie.brandRules.length;n++)if(ie.brandRules[n].re.test(t))return ie.brandRules[n].brand}return null}function S1(e,t){if(e===null||!ks[e])return null;let n=ci[e],a=n===void 0?-1:t.toLowerCase().indexOf(n.toLowerCase());return{id:e,word:n,svg:ks[e],at:a}}function lo(e,t){let n=U("span","dsh-claude-model-name"),a=typeof e=="string"?e:"",o=S1(t,a);if(o===null)return n.textContent=a,n;let s=U("span","dsh-claude-model-combine");s.setAttribute("aria-hidden","true"),s.innerHTML=o.svg;let l=o.at===-1?"":a.slice(0,o.at),r=o.at===-1?a:a.slice(o.at+o.word.length).replace(/^[\s\-–—]+/,"");return l&&n.appendChild(document.createTextNode(l)),n.appendChild(s),n.appendChild(document.createTextNode(r)),n.appendChild(U("span","dsh-claude-model-combine-alt",r?`${o.word} `:o.word)),n}function Fd(e){let t=e.ctx,n=e.schedule,a=null,o=null,s=null,l=!1,r=[];function g(){let i=t.get("sessions");return i==null?null:Pn(t,i)??null}function c(){a&&a(),a=null}function u(){let i=g();if(i===null)return c(),o=null,s=null,null;if(s===i&&o!==null)return o;c(),o=null,s=null;let p=t.get("modelDirectories");if(typeof p?.directoryFor=="function")try{o=p.directoryFor(i)}catch{o=null}return s=i,typeof o?.store?.subscribe=="function"&&(a=o.store.subscribe(()=>{m(),n&&n()})),o}function y(){return o===null||!o.store?null:o.store.getSnapshot()}function x(){u(),C();let i=y(),p=i&&i.groups||[],f=[];for(let v=0;v<p.length;v++)p[v].models.length!==0&&f.push({id:p[v].id,name:p[v].name||p[v].id,count:p[v].models.length});return f}function m(){r.length!==0&&qe(r,x())}function C(){if(l||o===null||typeof o.load!="function")return;l=!0;let i=o.load();i&&typeof i.catch=="function"&&i.catch(()=>{})}function b(i){if(!i||i.current===null)return null;for(let p=0;p<i.groups.length;p++){let f=i.groups[p];if(f.id===i.current.provider){for(let v=0;v<f.models.length;v++)if(f.models[v].id===i.current.model)return{group:f,model:f.models[v]}}}return null}function h(i){let p=b(i);if(p===null||!p.model.reasoning||i===null||i.current===null)return null;let f=p.model.reasoning,v=i.current,k=v.reasoningEffort!==void 0?v.reasoningEffort:f.defaultEffort,E=Aa;if(k!==void 0){E=k;for(let T=0;T<f.efforts.length;T++)if(f.efforts[T].id===k){E=f.efforts[T].name;break}}return{reasoning:f,effective:k,label:E}}function A(i){return r.push(i),()=>{let p=r.indexOf(i);p!==-1&&r.splice(p,1)}}function w(){c(),o=null,s=null}function d(){l=!1}return{directory:u,snapshot:y,providers:x,notifyProviders:m,warm:C,current:b,effort:h,onProviders:A,reset:w,resetWarm:d}}function R1(e,t){if(ie===null)return null;let n=un(e).toLowerCase(),a=un(t),o=a.toLowerCase(),s=ie.exact[`${e}/${a}`]||ie.exact[`${n}/${o}`];if(s)return s;if(ie.exact[a])return ie.exact[a];if(ie.exact[o])return ie.exact[o];let l=In(a);if(ie.folded[l])return ie.folded[l];let r=ie.aliases[a]||ie.aliases[o]||ie.aliases[l]||ie.foldedAliases&&ie.foldedAliases[l];if(r){if(ie.exact[r])return ie.exact[r];let g=In(r);if(ie.folded[g])return ie.folded[g]}return null}function _1(e,t){if(ie===null)return null;let n=un(t).toLowerCase(),a=[n,`${un(e).toLowerCase()}/${n}`];for(let o=0;o<a.length;o++)for(let s=0;s<ie.families.length;s++){let l=ie.families[s];if(l.re.test(a[o]))return l.key?ie.exact[l.key]||null:l.text}return null}function M1(e){if(ie===null)return null;let t=un(e).toLowerCase();for(let n=0;n<ie.tiers.length;n++)if(ie.tiers[n].re.test(t))return ie.tiers[n].text;return null}function io(e,t,n){let a=typeof n.id=="string"?n.id:"",o=R1(t,a)||_1(t,a)||M1(a),s=qn(o,e);return s||(typeof n.description=="string"?n.description:"")}var L1='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';function Zs(e,t){let n=String(e.id),a=String(t.id);return n<a?-1:n>a?1:0}function Nd(e){let t=e.ctx,n=e.pickModel,a=e.subHoverIntent,o=e.isSubOpen,s=e.closeSub,l=e.openSub;function r(x){let m=U("div","dsh-claude-model-rule");return x&&m.appendChild(U("span","dsh-claude-model-rule-name",x)),m}function g(x,m,C,b){let h=wt({className:"dsh-claude-model-option",role:"menuitemradio",textClass:"dsh-claude-model-copy",check:!0}),A=h.row;A.setAttribute("aria-checked",C?"true":"false");let w=ro(m.id);w&&A.setAttribute("data-brand",w);let d=h.text;d.appendChild(lo(m.name,w));let i=b?io(t,x.id,m):"";return i&&d.appendChild(U("span","dsh-claude-model-desc",i)),h.check.innerHTML=C?pn:"",A.addEventListener("click",((p,f)=>v=>{v.stopPropagation(),n(p,f)})(x.id,m.id)),A}function c(x){let m=U("button","dsh-claude-model-cell");m.type="button",m.setAttribute("role","menuitem"),m.appendChild(U("span","dsh-claude-model-cell-label",x));let C=U("span","dsh-claude-model-cell-chevron");return C.innerHTML=L1,m.appendChild(C),m.addEventListener("mouseenter",()=>{le().autoPopover===Ee&&a.scheduleOpen()}),m.addEventListener("mouseleave",()=>{a.cancel()}),m.addEventListener("click",b=>{b.stopPropagation(),o()?s():l()}),m}function u(x){let m=[],C=le().quickProviders;for(let b=0;b<x.length;b++)if(x[b].id===Ye&&x[b].models.length>0){m.push(x[b]);break}for(let b=0;b<x.length;b++)!C.includes(x[b].id)||x[b].id===Ye||x[b].models.length===0||m.push(x[b]);if(m.length===0)for(let b=0;b<x.length;b++)x[b].models.length>0&&m.push(x[b]);return m}function y(x,m){let C={};for(let h=0;h<m.length;h++)C[m[h].id]=!0;let b=[];for(let h=0;h<x.length;h++)x[h].models.length===0||C[x[h].id]===!0||b.push(x[h]);return b}return{buildProviderRule:r,buildModelOption:g,buildModelCell:c,levelOneSections:u,remainingGroups:y}}function zd(e,t){let n=null,a=null,o=null,s=null,l=null,r=null,g=null,c=150,u=null,y=He(R,E,Be,c),x=He(N,E,Be,c),m="",C="",b=Fd({ctx:e,schedule(){t.schedule&&t.schedule()}}),h=Nd({ctx:e,pickModel:L,subHoverIntent:x,isSubOpen(){return o!==null&&o.getAttribute("data-open")==="true"},closeSub:T,openSub:N});function A(){y.cancel(),u!==null&&(clearTimeout(u),u=null)}function w(){y.scheduleClose()}let d=null,i=!1;function p(S){d={x:S.clientX,y:S.clientY}}function f(){let S=a!==null&&a.getAttribute("data-open")==="true";S!==i&&(i=S,S?document.addEventListener("mousemove",p,!0):(document.removeEventListener("mousemove",p,!0),d=null))}function v(S){if(d===null||S===null||S.getAttribute("data-open")!=="true")return!1;let P=S.getBoundingClientRect();return d.x>=P.left-8&&d.x<=P.right+8&&d.y>=P.top-8&&d.y<=P.bottom+8}function k(){return v(a)||v(o)}function E(){if(k()){w();return}T()}function T(){A(),a&&Ce(a,!1),o&&Ce(o,!1)}function R(){A(),_e("model");let S=b.directory();if(S&&typeof S.load=="function"){let P=S.load();P&&typeof P.catch=="function"&&P.catch(()=>{})}o&&Ce(o,!1),Y(),_(),a&&Ce(a,!0)}function N(){A(),B(),o&&Ce(o,!0),_()}function L(S,P){let H=b.directory();if(H===null)return;let q=H.select({provider:S,model:P});q&&typeof q.catch=="function"&&q.catch(()=>{}),T()}function D(S){let P=b.directory(),H=b.snapshot();if(P===null||!H||H.current===null)return;let q={provider:H.current.provider,model:H.current.model};S!==void 0&&(q.reasoningEffort=S);let z=P.select(q);z&&typeof z.catch=="function"&&z.catch(()=>{})}function V(S){if(!l)return;let P=[];for(let H=l.firstChild;H!==null;H=H.nextSibling)P.push(H);for(let H=0;H<P.length;H++)l.removeChild(P[H]);S&&(l.appendChild(U("div","dsh-claude-model-divider")),l.appendChild(h.buildModelCell(se("moreLabel",Sl))))}function Y(){if(!s)return;let S=b.snapshot(),P=S?S.status:"idle",H=S&&S.groups||[],q=b.current(S),z=[P,Vt(),q?`${q.group.id}/${q.model.id}`:"",le().quickProviders.join(",")].join("|");for(let j=0;j<H.length;j++)z+=`;${H[j].id}:${H[j].models.length}`;if(z===m)return;for(m=z;s.firstChild;)s.removeChild(s.firstChild);if(!(H.length>0&&q!==null)&&(P==="idle"||P==="loading"||P==="selecting"))s.appendChild(U("div","dsh-claude-popover-status",se("loading",El))),V(!1);else{let j=h.levelOneSections(H);if(j.length===0)s.appendChild(U("div","dsh-claude-popover-status",se("empty",cs)));else for(let G=0;G<j.length;G++){let $=j[G],K=$.id===Ye?"":$.name||$.id;(K!==""||G>0)&&s.appendChild(h.buildProviderRule(K));let J=$.models.slice().sort(Zs);for(let re=0;re<J.length;re++){let de=q!==null&&q.group.id===$.id&&q.model.id===J[re].id;s.appendChild(h.buildModelOption($,J[re],de,!0))}}let ne=!1;for(let G=0;G<j.length;G++)q!==null&&j[G].id===q.group.id&&(ne=!0);if(q!==null&&!ne){let G=q.group.id===Ye?"":q.group.name||q.group.id;G!==""&&s.appendChild(h.buildProviderRule(G));let $=U("button","dsh-claude-model-option");$.type="button",$.setAttribute("role","menuitemradio"),$.setAttribute("aria-checked","true");let K=ro(q.model.id),J=q.model.name||q.model.id;K&&$.setAttribute("data-brand",K);let re=U("span","dsh-claude-model-copy"),de=lo(J,K);re.appendChild(de);let ue=io(e,q.group.id,q.model);ue&&re.appendChild(U("span","dsh-claude-model-desc",ue)),$.appendChild(re);let pe=U("span","dsh-claude-popover-check");pe.innerHTML=pn,$.appendChild(pe),$.addEventListener("click",X=>{X.stopPropagation(),T()}),s.appendChild($)}if(l){let G=h.remainingGroups(H,j).length>0;V(G)}}}function B(){if(!r)return;let S=b.snapshot(),P=S&&S.groups||[],H=b.current(S),q=h.levelOneSections(P),z=[];for(let ne=0;ne<q.length;ne++)z.push(q[ne].id);let O=`more|${z.join(",")}`;for(let ne=0;ne<P.length;ne++)O+=`;${P[ne].id}:${P[ne].models.length}`;if(H&&(O+=`#${H.group.id}/${H.model.id}`),O===C)return;for(C=O;r.firstChild;)r.removeChild(r.firstChild);let j=h.remainingGroups(P,q);for(let ne=0;ne<j.length;ne++){let G=j[ne];if(G.models.length===0)continue;let $=U("div","dsh-claude-model-group-section"),K=U("div","dsh-claude-model-group-row"),J=U("div","dsh-claude-model-group");J.appendChild(U("span","dsh-claude-model-group-name",G.name)),K.appendChild(J),$.appendChild(K);let re=G.models.slice().sort(Zs);for(let de=0;de<re.length;de++){let ue=H!==null&&H.group.id===G.id&&H.model.id===re[de].id;$.appendChild(h.buildModelOption(G,re[de],ue,!1))}r.appendChild($)}r.firstChild===null&&r.appendChild(U("div","dsh-claude-popover-status",se("empty",cs)))}function _(){if(f(),!n||!a)return;let S=Je(n,a,{side:"above",gap:6});if(o&&o.getAttribute("data-open")==="true"){let P=o.offsetWidth,H=o.offsetHeight,q=a.offsetHeight,z=S.x+a.offsetWidth+2;z+P>window.innerWidth-hn&&(z=Math.max(hn,S.x-4-P));let O=S.y+Math.max(0,q-H);O=Math.max(hn,Math.min(O,window.innerHeight-H-hn)),o.style.left=`${z}px`,o.style.top=`${O}px`}}function F(){(a===null||a.parentElement===null)&&(a=document.createElement("div"),a.className="dsh-claude-popover-card dsh-claude-model-popover",Ce(a,!1),s=document.createElement("div"),s.className="dsh-claude-popover-body",a.appendChild(s),l=document.createElement("div"),l.className="dsh-claude-model-footer",a.appendChild(l),a.addEventListener("mouseenter",A),a.addEventListener("mouseover",S=>{o===null||o.getAttribute("data-open")!=="true"||fe(S.target,".dsh-claude-model-cell")||(u!==null&&clearTimeout(u),u=setTimeout(()=>{u=null,!v(o)&&o!==null&&Ce(o,!1)},c))}),a.addEventListener("mouseleave",w),document.body.appendChild(a),m=""),(o===null||o.parentElement===null)&&(o=document.createElement("div"),o.className="dsh-claude-popover-card dsh-claude-model-popover dsh-claude-model-popover-sub",Ce(o,!1),r=document.createElement("div"),r.className="dsh-claude-popover-body",o.appendChild(r),o.addEventListener("mouseenter",A),o.addEventListener("mouseleave",w),document.body.appendChild(o),C="")}function W(){let S=document.querySelectorAll("[data-dsh-claude-model-host]");for(let P=0;P<S.length;P++)S[P].removeAttribute("data-dsh-claude-model-host");ve(document,".dsh-claude-model-btn",[]),n=null,ve(document,".dsh-claude-model-popover",[]),a=null,o=null,s=null,l=null,r=null,m="",C="",A(),b.reset()}function Z(){if(!t.composer.isActive()||!le().modelPicker){W();return}an(),b.directory(),b.warm();let S=document.querySelector('[data-slot="conversation.input.model"]');if(g=S,S===null)return;ve(S,".dsh-claude-model-btn",[n]),ve(document,"body > .dsh-claude-model-popover",[a,o]);let P=S.firstElementChild;P!==null&&P.toggleAttribute("data-dsh-claude-model-host",!0),(n===null||n.parentElement!==S)&&(n!==null&&n.parentElement!==null&&n.parentElement.removeChild(n),n=document.createElement("button"),n.type="button",n.className="dsh-claude-model-btn",n.setAttribute("aria-haspopup","menu"),n.innerHTML='<span class="dsh-claude-model-btn-label"></span>',n.addEventListener("mouseenter",()=>{le().autoPopover===Ee&&y.scheduleOpen()}),n.addEventListener("mouseleave",()=>{le().autoPopover===Ee&&w()}),n.addEventListener("click",$=>{$.stopPropagation(),a&&a.getAttribute("data-open")==="true"?T():R()}),S.appendChild(n)),F();let H=b.snapshot(),q=b.current(H),z=H&&H.groups||[],O=q?q.model.name:se("fallbackLabel",kl),j=n.querySelector(".dsh-claude-model-btn-label");if(j){j.textContent!==O&&(j.textContent=O);let $=!!(H&&(H.status==="loading"||H.status==="idle"||H.status==="selecting"))&&!(z.length>0&&q!==null);j.classList.toggle("dsh-claude-model-btn-loading",$)}let ne=n.querySelector(".dsh-claude-model-btn-effort");ne!==null&&ne.remove();let G=se("triggerLabel",Rl,{model:O});ye(n,"aria-label",G),n.disabled=!1,Y(),o&&o.getAttribute("data-open")==="true"?(B(),_()):a&&a.getAttribute("data-open")==="true"&&_()}return Oe("model",T),t.model={sync:Z,close(){T()},seat(){return g},trigger(){return n!==null&&n.isConnected?n:null},effort(){return b.effort(b.snapshot())},named(){return b.current(b.snapshot())!==null},settled(){let S=b.snapshot();if(!S)return!0;let P=S.status==="loading"||S.status==="idle"||S.status==="selecting",H=S.groups||[];return!P||H.length>0&&b.current(S)!==null},pickEffort:D,owns(S){return S?n!==null&&n.contains(S)||a!==null&&a.contains(S)||o!==null&&o.contains(S):!1},reposition:_,providers:b.providers,onProviders:b.onProviders,onCopyChange(){m="",C=""},teardown(){W(),b.resetWarm(),g=null,Pe("model")}},t.model.teardown}function Bd(e,t){let n="";function a(g,c,u){let y=Math.imul(g+1,2654435761)^Math.imul(c+1,2246822507)^Math.imul(u+1,668265263);return y=Math.imul(y^y>>>15,625341585),y^=y>>>13,(y>>>0)/4294967296}function o(g){if(g<=.05)return 0;if(g>=.75)return 1;let c=(g-.05)/.7;return c*c*(3-2*c)}function s(g,c){let y=Math.max(1,Math.round(1*c)),x=Math.max(1,Math.round(.5*c)),m=Math.round(26*c),C=Math.max(3,Math.floor((m-2*x-4*y)/5)),b=Math.max(1,Math.floor((g+y)/(C+y))),h=g-(b*C+(b-1)*y),A=m-(5*C+4*y);return{cols:b,rows:5,sq:C/c,gap:y/c,padTop:Math.floor(A/2)/c,padBottom:(A-Math.floor(A/2))/c,padLeft:Math.floor(h/2)/c,padRight:(h-Math.floor(h/2))/c}}function l(g,c,u){g.setAttribute("data-tone",String(Math.floor(a(c,u,1)*8)%8)),g.style.setProperty("animation-delay",`${(a(c,u,2)*1.38+.3).toFixed(3)}s`,"important"),g.style.setProperty("animation-duration",`${(1.45*(.92+a(c,u,3)*.16)).toFixed(3)}s`,"important")}function r(){let g=e.clientWidth;if(!g)return!1;let c=window.devicePixelRatio>0?window.devicePixelRatio:1,u=`${Math.round(g*c)}@${c}`;if(u===n)return!0;let y=s(Math.round(g*c),c);for(;t.firstChild;)t.removeChild(t.firstChild);t.style.gap=`${y.gap}px`,t.style.padding=`${y.padTop}px ${y.padRight}px ${y.padBottom}px ${y.padLeft}px`,t.style.gridTemplateColumns=`repeat(${y.cols}, ${y.sq}px)`,t.style.gridAutoRows=`${y.sq}px`;for(let x=0;x<y.rows;x++)for(let m=0;m<y.cols;m++){let C=y.cols>1?m/(y.cols-1):1,b=U("div","dsh-claude-effort-matrix-cell");b.style.setProperty("animation-delay",`${((1-C)*.45+a(x,m,4)*.08).toFixed(3)}s`,"important");let h=U("div","dsh-claude-effort-matrix-sq");h.style.opacity=o(C).toFixed(3),l(h,x,m),b.appendChild(h),t.appendChild(b)}return n=u,!0}return{ensure:r}}function Dd(e){let t=U("div","dsh-claude-effort"),n=U("div","dsh-claude-effort-head"),a=U("span","dsh-claude-effort-label"),o=U("span","dsh-claude-effort-value"),s=U("span","dsh-claude-effort-value-ghost"),l=U("div","dsh-claude-effort-ends"),r=U("span","dsh-claude-effort-end"),g=U("span","dsh-claude-effort-end"),c=U("div","dsh-claude-effort-track"),u=U("div","dsh-claude-effort-fill"),y=U("div","dsh-claude-effort-ticks"),x=U("div","dsh-claude-effort-matrix"),m=U("div","dsh-claude-effort-knob");n.appendChild(a),n.appendChild(o),n.appendChild(s),l.appendChild(r),l.appendChild(g),c.appendChild(u),c.appendChild(y),c.appendChild(x),c.appendChild(m),t.appendChild(n),t.appendChild(l),t.appendChild(c),c.setAttribute("role","slider"),c.setAttribute("tabindex","0");let C=Bd(c,x),b=[],h=-1,A=-1,w=!1,d=!1,i=!1,p=!1,f=null,v="",k=!1,E=-1,T=!1,R,N=0,L=12e3;function D(){let M=e.read(),Q=[],te=-1;if(M!==null){M.reasoning.defaultEffort===void 0&&Q.push({id:void 0,name:Aa});for(let ce=0;ce<M.reasoning.efforts.length;ce++)Q.push({id:M.reasoning.efforts[ce].id,name:M.reasoning.efforts[ce].name});te=0;for(let ce=0;ce<Q.length;ce++)if(Q[ce].id===M.effective){te=ce;break}}return{steps:Q,index:te,labels:{label:se("effortLabel",wa),faster:se("effortFaster",Cl),smarter:se("effortSmarter",Tl),none:"—"}}}function V(){let M=m.offsetWidth||16;return{size:M,span:Math.max(0,c.clientWidth-M)}}function Y(M){let Q=V();return M<0||b.length<2?Q.span:M/(b.length-1)*Q.span}let B="",_="";function F(M,Q){let te=Math.round(M),ce=`${te}px`,be=b.length===0?"0px":`${te+8}px`;if(!(ce===B&&be===_)){if(B=ce,_=be,Q||d){m.style.translate=ce,u.style.width=be;return}m.style.transition="none",u.style.transition="none",m.style.translate=ce,u.style.width=be,m.offsetWidth,m.style.transition="",u.style.transition=""}}function W(M){let Q=V(),te=M-c.getBoundingClientRect().left-Q.size/2;return Math.max(0,Math.min(Q.span,te))}let Z=.8;function S(M){if(b.length<2)return M;let Q=V();if(Q.span===0)return M;let te=Q.span/(b.length-1),ce=Math.floor(M/te);if(ce>=b.length-1)return M;let be=(M-ce*te)/te;return(ce+be-Z*Math.sin(2*Math.PI*be)/(2*Math.PI))*te}function P(M){if(b.length===0)return-1;if(b.length===1)return 0;let Q=V(),te=Q.span===0?0:M/Q.span;return Math.max(0,Math.min(b.length-1,Math.round(te*(b.length-1))))}function H(M){let Q=b.length>1&&M===b.length-1;Q!==k&&(Q&&!C.ensure()||(k=Q,Q?t.setAttribute("data-apex",""):t.removeAttribute("data-apex")))}function q(){let M=c.clientWidth;if(!M||M===E)return;for(E=M;y.firstChild;)y.removeChild(y.firstChild);let Q=V();for(let te=0;te<b.length;te++){let ce=U("span","dsh-claude-effort-tick");ce.style.left=`${Math.round(Y(te)+Q.size/2)}px`,y.appendChild(ce)}}function z(M){M.style.setProperty("animation","none","important"),M.offsetWidth,M.style.removeProperty("animation")}function O(){let M=w?A:h,Q=M>=0&&b[M]?b[M].name:v;if(o.textContent!==Q){let te=o.textContent;te!==""&&(s.textContent=te,s.style.left=`${o.offsetLeft}px`,z(s)),o.textContent=Q,z(o)}H(M)}function j(M){if(v=M.none,a.textContent!==M.label&&(a.textContent=M.label),r.textContent!==M.faster&&(r.textContent=M.faster),g.textContent!==M.smarter&&(g.textContent=M.smarter),ye(c,"aria-label",M.label),b.length===0){t.setAttribute("data-empty",""),c.setAttribute("aria-disabled","true"),c.removeAttribute("aria-valuemin"),c.removeAttribute("aria-valuemax"),c.removeAttribute("aria-valuenow"),c.removeAttribute("aria-valuetext");return}let Q=Math.max(0,h);t.removeAttribute("data-empty"),c.removeAttribute("aria-disabled"),c.setAttribute("aria-valuemin","0"),c.setAttribute("aria-valuemax",String(b.length-1)),c.setAttribute("aria-valuenow",String(Q)),c.setAttribute("aria-valuetext",b[Q]?b[Q].name:"")}function ne(){N!==0&&(clearTimeout(N),N=0),T=!1,R=void 0}function G(M){M<0||M>=b.length||M===h||(h=M,T=!0,R=b[M].id,N!==0&&clearTimeout(N),N=setTimeout(ne,L),e.onPick(b[M].id))}function $(){f!==null&&c.hasPointerCapture(f)&&c.releasePointerCapture(f),f=null}function K(){if(!w||ue&&(de!==null&&de(),ue=!1,de=null,ae(),!w))return;w=!1,d=!1,t.removeAttribute("data-dragging"),$();let M=A;A=-1,G(M),F(Y(h),!0),O()}function J(M){M.pointerId===f&&(i=!1,document.removeEventListener("pointerup",J,!0),document.removeEventListener("pointercancel",J,!0),typeof e.onDragEnd=="function"&&e.onDragEnd(M))}function re(M){if(M.button!==0)return;M.preventDefault(),M.stopPropagation(),p=!0,f=M.pointerId,i=!0,document.addEventListener("pointerup",J,!0),document.addEventListener("pointercancel",J,!0),c.setPointerCapture(M.pointerId),typeof e.onDragStart=="function"&&e.onDragStart();let Q=W(M.clientX);w=!0,F(S(Q),!0),A=P(Q),O()}let de=null,ue=!1,pe=0,X=0;function ae(){if(!w)return;let M=t.getBoundingClientRect();if(pe<M.left-6||pe>M.right+6||X<M.top-6||X>M.bottom+6){K();return}let Q=W(pe);F(S(Q),!1),A=P(Q),O()}function I(M){w&&(d||(d=!0,t.setAttribute("data-dragging","")),pe=M.clientX,X=M.clientY,!ue&&(ue=!0,de=he({write(){ue=!1,de=null,ae()}})))}c.addEventListener("pointerdown",re),c.addEventListener("pointermove",I),c.addEventListener("pointerup",()=>{K()}),c.addEventListener("pointercancel",()=>{K()}),c.addEventListener("keydown",M=>{if(b.length===0)return;let Q=h<0?0:h,te=Q;if(M.key==="ArrowLeft"||M.key==="ArrowDown")te=Math.max(0,Q-1);else if(M.key==="ArrowRight"||M.key==="ArrowUp")te=Math.min(b.length-1,Q+1);else if(M.key==="Home")te=0;else if(M.key==="End")te=b.length-1;else return;M.preventDefault(),M.stopPropagation(),G(te),F(Y(te),!0),j(D().labels),O()});function ee(){let M=D(),Q=M.steps.length!==b.length;if(!Q){for(let te=0;te<M.steps.length;te++)if(M.steps[te].id!==b[te].id){Q=!0;break}}if(Q&&(b=M.steps.slice(),E=-1,ne()),T&&M.index>=0&&M.steps[M.index]!==void 0&&M.steps[M.index].id===R&&ne(),!w&&!T){let te=p&&!Q&&h!==M.index;h=M.index,F(Y(h),te),p=!0}q(),j(M.labels),O()}return{el:t,update:ee,isHeld(){return i}}}function Vd(e,t){let n=null,a=null,o=null,s=null,l=He(()=>{b()},()=>{C()},Be,Ve);function r(){return typeof t.model?.effort=="function"?t.model.effort():null}function g(){return typeof t.model?.settled=="function"&&!t.model.settled()}function c(){let E=r();return E!==null?(s=E,E):g()?s:null}function u(){return typeof t.model?.seat=="function"?t.model.seat():null}function y(){return typeof t.model?.trigger=="function"?t.model.trigger():null}function x(){let E=y();E!==null&&E.style.marginRight!==""&&(E.style.marginRight="")}function m(){l.cancel()}function C(){l.cancel(),a!==null&&Ce(a,!1)}function b(){l.cancel(),i(),_e("effort"),o!==null&&o.update(),h(),a!==null&&Ce(a,!0)}function h(){n===null||a===null||Je(n,a,{side:"above",gap:6})}let A={left:-1,top:-1,need:0,widthLabel:"",height:0};function w(){if(n===null)return;let E=y();if(E===null){n.style.display="none";return}let T=E.getBoundingClientRect();if(T.width===0||T.height===0){p();return}n.style.display!=="inline-flex"&&(n.style.display="inline-flex");let R=n.querySelector(".dsh-claude-effort-btn-label"),N=R===null?"":R.textContent;N!==A.widthLabel&&(A.widthLabel=N,A.need=Math.max(0,n.offsetWidth-6),A.height=n.offsetHeight);let L=A.need,D=E.style.marginRight!==`${L}px`;D&&(E.style.marginRight=`${L}px`);let V=D?E.getBoundingClientRect():T,Y=Math.round(V.right+2),B=Math.round(V.top+(V.height-A.height)/2);Y!==A.left&&(A.left=Y,n.style.left=`${Y}px`),B!==A.top&&(A.top=B,n.style.top=`${B}px`)}function d(){return o===null&&(o=Dd({read:c,onPick(E){typeof t.model?.pickEffort=="function"&&t.model.pickEffort(E)},onDragStart:m,onDragEnd(E){if(a===null||a.getAttribute("data-open")!=="true")return;let T=E&&typeof E.clientX=="number"?document.elementFromPoint(E.clientX,E.clientY):null;T!==null&&a.contains(T)||C()}})),o.el}function i(){let E=u();E!==null&&ve(E,".dsh-claude-effort-btn",[n]),ve(document,"body > .dsh-claude-effort-popover",[a]),(a===null||a.parentElement===null)&&(a=document.createElement("div"),a.className="dsh-claude-popover-card dsh-claude-effort-popover",Ce(a,!1),a.addEventListener("mouseenter",m),a.addEventListener("mouseleave",()=>{o!==null&&o.isHeld()||l.scheduleClose()}),document.body.appendChild(a));let T=d();T.parentElement!==a&&a.appendChild(T)}function p(){A.widthLabel="",A.left=-1,A.top=-1,n!==null&&(n.parentElement!==null&&n.parentElement.removeChild(n),n=null),x(),C()}function f(){if(u()===null||y()===null){p();return}if(g()){o!==null&&o.update();return}let T=r();if(T===null){if(typeof t.model?.named=="function"&&!t.model.named())return;p();return}i(),(n===null||n.parentElement!==document.body)&&(n!==null&&n.parentElement!==null&&n.parentElement.removeChild(n),n=document.createElement("button"),n.type="button",n.className="dsh-claude-effort-btn",n.setAttribute("aria-haspopup","menu"),n.innerHTML='<span class="dsh-claude-effort-btn-label"></span>',n.addEventListener("mouseenter",()=>{le().autoPopover===Ee&&l.scheduleOpen()}),n.addEventListener("mouseleave",()=>{le().autoPopover===Ee&&l.scheduleClose()}),n.addEventListener("click",L=>{L.stopPropagation(),a!==null&&a.getAttribute("data-open")==="true"?C():b()}),document.body.appendChild(n));let R=n.querySelector(".dsh-claude-effort-btn-label");R!==null&&R.textContent!==T.label&&(R.textContent=T.label);let N=`${se("effortLabel",wa)} ${T.label}`;ye(n,"aria-label",N),o!==null&&o.update(),w(),a!==null&&a.getAttribute("data-open")==="true"&&h()}function v(E){return E?n!==null&&n.contains(E)||a!==null&&a.contains(E):!1}function k(){l.cancel(),n!==null&&n.parentElement!==null&&n.parentElement.removeChild(n),a!==null&&a.parentElement!==null&&a.parentElement.removeChild(a),n=null,a=null,o=null,A.left=-1,A.top=-1,A.widthLabel="",x(),Pe("effort")}return Oe("effort",C),t.effort={sync:f,close(E){E!=="composer"&&C()},owns:v,reposition(){w(),h()},teardown:k},k}function Ud(e,t){let a='[class*="heroWorkspaceRow"] [aria-haspopup="menu"]',o=`[${jo}]`,s=Ae(jo),l=null,r=!1,g=null,c=null,u=null,y=He(()=>{let R=u;u=null,R!==null&&x(R)},()=>{C()},Be,Ve);function x(R){h()&&R.getAttribute("aria-expanded")!=="true"&&(b(R),_e("hero"),R.click(),r=!0,g=R)}function m(){y.cancel(),u=null,r=!1,g=null;let R=f();for(let N=0;N<R.length;N++)R[N].click()}function C(){if(!r)return;let R=g;r=!1,g=null,!(R===null||R.getAttribute("aria-expanded")!=="true")&&R.click()}function b(R){let N=f();for(let L=0;L<N.length;L++)N[L]!==R&&N[L].click()}function h(){return le().autoPopover===Ee&&t.composer!==void 0&&t.composer.isActive()}function A(R){if(!h())return;let N=R.target;if(fe(N,o)!==null){y.cancel();return}let L=fe(N,a);L!==null&&(c=L,y.cancel(),L.getAttribute("aria-expanded")!=="true"&&(u=L,y.scheduleOpen()))}function w(R){if(!h())return;let N=R.target;if(fe(N,o)===null&&fe(N,a)===null)return;let L=R.relatedTarget;fe(L,o)!==null||fe(L,a)!==null||(u=null,y.scheduleClose())}document.addEventListener("mouseover",A,!0),document.addEventListener("mouseout",w,!0);function d(R){return R.querySelector('[class*="_workspaceLabel"]')!==null||fe(R,'[class*="cardWorkspaceTrigger"]')!==null?"workspace":"preset"}function i(){s.release(),l=null}function p(){let R=document.querySelectorAll('[class*="heroWorkspaceRow"] [aria-haspopup="menu"][aria-expanded="true"]'),N=[];for(let L=0;L<R.length;L++)N.push(R[L]);return N}function f(){let R=p();if(R.length>0)return R;let N=document.querySelector('[class*="cardWorkspaceTrigger"] [aria-expanded="true"]');return N===null?[]:[N]}function v(){let R=f();return R.length===0?null:R[0]}function k(R,N){let L=R.getBoundingClientRect(),D=N.offsetWidth,V=N.offsetHeight;if(D===0||V===0)return;let{x:Y,y:B}=qs(L,D,V,{gap:6});N.style.setProperty("--dsh-claude-hero-menu-x",`${Math.round(Y)}px`),N.style.setProperty("--dsh-claude-hero-menu-y",`${Math.round(B)}px`)}function E(){let R=s.current();R===null||l===null||k(l,R)}function T(){let R=v();if(R===null){r=!1,g=null,y.cancel(),i();return}let N=f();if(N.length>1){b(c!==null&&N.includes(c)?c:R),i();return}let L=document.querySelectorAll(`body > ${ya}:not([class*="dsh-claude"])`);if(L.length!==1){i();return}s.current()!==L[0]&&(l=R),s.mark(L[0],d(R)),k(R,L[0])}return Oe("hero",m),t.heroMenu={sync:T,reposition:E},()=>{y.cancel(),r=!1,g=null,c=null,i(),Pe("hero"),document.removeEventListener("mouseover",A,!0),document.removeEventListener("mouseout",w,!0),delete t.heroMenu}}function Gd(e,t){let n=null,a=null,o=null,s=null,l=[],r=null;function g(){n!==null&&n.parentElement&&n.parentElement.removeChild(n),o!==null&&o.setAttribute("aria-expanded","false"),n=null,a=null,o=null,s=null,document.removeEventListener("pointerdown",c,!0),document.removeEventListener("keydown",u,!0)}function c(h){if(n===null)return;let A=h.target;n.contains(A)||o!==null&&o.contains(A)||g()}function u(h){h.key==="Escape"&&g()}function y(h,A,w){let d=wt({role:"menuitemcheckbox",badge:!0,check:!0}),i=d.row;return w&&i.classList.add("dsh-claude-popover-item-stale"),i.setAttribute("aria-checked",A?"true":"false"),d.text.textContent=h.name,d.badge.textContent=w?oe("quickRemoved","Removed"):String(h.count),d.check.innerHTML=A?pn:"",i.addEventListener("click",p=>{p.stopPropagation();let f=le().quickProviders.slice(),v=f.indexOf(h.id);v===-1?f.push(h.id):f.splice(v,1),typeof s=="function"&&s(f),x()}),i}function x(){if(a===null)return;for(;a.firstChild;)a.removeChild(a.firstChild);if(l.length===0){a.appendChild(U("div","dsh-claude-popover-status",oe("quickLoading","Loading providers…")));return}let h=le().quickProviders,A={};for(let w=0;w<l.length;w++)l[w].id!==Ye&&(A[l[w].id]=!0,a.appendChild(y(l[w],h.includes(l[w].id),!1)));for(let w=0;w<h.length;w++)h[w]===Ye||A[h[w]]||a.appendChild(y({id:h[w],name:h[w],count:0},!0,!0))}function m(h,A){_e("quickProviders"),o=h,o.setAttribute("aria-expanded","true"),s=A,l=typeof t.model?.providers=="function"?t.model.providers():[],n=U("div","dsh-claude-popover-card dsh-claude-quick-popover"),Ce(n,!0),a=U("div","dsh-claude-popover-body"),n.appendChild(a),x(),document.body.appendChild(n),Je(h,n,{side:"above",gap:6,important:!0}),document.addEventListener("pointerdown",c,!0),document.addEventListener("keydown",u,!0)}function C(h,A){n===null?m(h,A):g()}typeof t.model?.onProviders=="function"&&(r=t.model.onProviders(h=>{l=h,n!==null&&x()})),Oe("quickProviders",g);let b={toggle:C,close(h){h==="escape"||h==="outside"||g()},isOpen(){return n!==null}};return t.quickProviders=b,()=>{g(),Pe("quickProviders"),r!==null&&(r(),r=null),delete t.quickProviders}}function Wd(e){function t(){let A=e.body();if(A===null)throw new Error("dsh-claude-style: the footer mirror has no popover body");return A}function n(A){if(!A)return[];let w=a(A);for(let d=0;d<w.length;d++){let i=w[d];i.setAttribute("data-dsh-claude-footer-entry","");let p=i.querySelectorAll("*");for(let f=0;f<p.length;f++){let v=p[f];if(v.hasAttribute("data-dsh-claude-footer-overlay"))continue;let k=v.getAttribute("role")||"",E=k==="dialog"||k==="menu"||k==="listbox";E||(E=window.getComputedStyle(v).position==="fixed"),E&&v.setAttribute("data-dsh-claude-footer-overlay","")}o(i)}return w}function a(A){let w=[],d=A.children;for(let i=0;i<d.length;i++){let p=d[i];if(!p.hasAttribute("data-slot-error"))if(p.hasAttribute("data-slot")){let f=p.children;for(let v=0;v<f.length;v++)f[v].hasAttribute("data-slot-error")||w.push(f[v])}else w.push(p)}return w}function o(A){if(A.hasAttribute("data-dsh-claude-footer-overlay")){A.removeAttribute("data-dsh-claude-footer-hidden");return}if(A.querySelector("[data-dsh-claude-footer-overlay]")!==null){A.removeAttribute("data-dsh-claude-footer-hidden");let w=A.children;for(let d=0;d<w.length;d++)o(w[d]);return}A.setAttribute("data-dsh-claude-footer-hidden","")}function s(A,w,d,i){let p=A.querySelector(".dsh-claude-popover-item-icon"),f=w?w.outerHTML:"";if(p!==null&&p.__dshIconHtml!==f){for(p.__dshIconHtml=f;p.firstChild;)p.removeChild(p.firstChild);w&&p.appendChild(w.cloneNode(!0))}let v=A.querySelector(".dsh-claude-popover-item-text");v!==null&&v.textContent!==d&&(v.textContent=d);let k=A.querySelector(".dsh-claude-popover-item-badge");i?(k===null&&(k=document.createElement("span"),k.className="dsh-claude-popover-item-badge",A.appendChild(k)),k.textContent!==i&&(k.textContent=i)):k!==null&&A.removeChild(k)}function l(A){let w=t().querySelector(`[data-action-index="${A}"]`);w&&w.parentElement&&w.parentElement.removeChild(w)}function r(A){let w=t().querySelector(`[data-embed-index="${A}"]`);w&&w.parentElement&&w.parentElement.removeChild(w)}function g(A,w){if(w===null)return!1;if(w===A){let p=A.tagName,f=A.getAttribute("role")||"";return p==="BUTTON"||p==="A"||f==="button"}if(A.querySelector('[role="progressbar"], [role="meter"], meter, progress')!==null)return!1;let d=c(A),i=(w.textContent||"").trim();return d.length-i.length<=2}function c(A){let w="",d=document.createTreeWalker(A,4,{acceptNode(i){let p=i.parentElement;for(;p&&p!==A;){if(p.hasAttribute("data-dsh-claude-footer-overlay"))return 2;p=p.parentElement}return 1}});for(;d.nextNode();)w+=d.currentNode.nodeValue;return w.trim()}function u(A,w,d){let i=t().querySelector(`[data-embed-index="${w}"]`);if(!i){let E=document.createElement("div");E.className="dsh-claude-popover-embed",E.setAttribute("data-embed-index",String(w)),E.addEventListener("click",T=>{if(!E.__dshEntry)return;T.stopPropagation();let R=x(T.target,E);R&&R.click()}),t().insertBefore(E,e.anchor()),i=E}i.__dshEntry=A,i.__dshForward=d||null,d?i.setAttribute("data-clickable",""):i.removeAttribute("data-clickable");let p=A.cloneNode(!0);p.removeAttribute("id"),p.removeAttribute("data-dsh-claude-footer-entry"),p.removeAttribute("data-dsh-claude-footer-hidden"),p.removeAttribute("data-dsh-claude-footer-overlay");let f=p.querySelectorAll("[data-dsh-claude-footer-overlay]");for(let E=0;E<f.length;E++)f[E].remove();let v=p.querySelectorAll("[id], [data-dsh-claude-footer-hidden]");for(let E=0;E<v.length;E++)v[E].removeAttribute("id"),v[E].removeAttribute("data-dsh-claude-footer-hidden");let k=p.outerHTML;if(i.getAttribute("data-embed-html")!==k){for(i.setAttribute("data-embed-html",k);i.firstChild;)i.removeChild(i.firstChild);i.appendChild(p)}}let y='button, [role="button"], a[href], [tabindex], input, select, summary';function x(A,w){let d=w.__dshEntry,i=w.firstElementChild;if(!d||!i||!(A instanceof Element)||A===w||A===i)return w.__dshForward;let p=[],f=A;for(;f&&f!==i;){let T=f.parentElement;if(!T)return w.__dshForward;p.unshift(Array.prototype.indexOf.call(T.children,f)),f=T}let v=d,k=i;for(let T=0;T<p.length;T++){let R=k.children[p[T]],N=v.children[p[T]];if(!R||!N||R.tagName!==N.tagName)return w.__dshForward;k=R,v=N}let E=v;for(;E;){if(E!==d&&E instanceof HTMLElement&&E.matches(y)&&!m(E,d))return E;if(E===d)break;E=E.parentElement}return w.__dshForward}function m(A,w){let d=A;for(;d&&d!==w;){if(d.hasAttribute("data-dsh-claude-footer-overlay"))return!0;d=d.parentElement}return!1}function C(A){let w=y;if(A instanceof HTMLElement&&A.matches(w)&&!A.hasAttribute("data-dsh-claude-footer-overlay"))return A;let d=A.querySelectorAll(w);for(let i=0;i<d.length;i++){let p=d[i],f=p,v=!1;for(;f&&f!==A;){if(f.hasAttribute("data-dsh-claude-footer-overlay")){v=!0;break}f=f.parentElement}if(!v)return p}return null}function b(A){let w=A.querySelector(ls),d=n(w),i=e.body();if(i===null||e.isOpen())return;let p=i.querySelectorAll("[data-action-index], [data-embed-index]");for(let k=0;k<p.length;k++){let E=parseInt(p[k].getAttribute("data-action-index")||p[k].getAttribute("data-embed-index")||"",10);(isNaN(E)||E>=d.length)&&p[k].remove()}for(let k=0;k<d.length;k++)try{((E,T)=>{if(E.getAttribute("aria-haspopup")==="menu"||E.querySelector('[aria-haspopup="menu"]')!==null||E.querySelector('svg[viewBox="0 0 13.664 13.571"]')!==null)return;let R=C(E),N=(E.textContent||"").trim()!==""||E.querySelector("svg, img, canvas")!==null;if(!g(E,R)){l(T),N?u(E,T,R):r(T);return}r(T);let L=R,D=i.querySelector(`[data-action-index="${T}"]`),V=R&&R.querySelector("svg")||E.querySelector("svg"),Y=L.getAttribute("aria-label")||(L.textContent||"").trim()||"插件",B=L.getAttribute("data-cordis-badge")||E.getAttribute("data-cordis-badge")||"";if(!D){let _=wt({icon:!0}).row;_.setAttribute("data-action-index",String(T)),_.addEventListener("click",F=>{F.stopPropagation(),e.close();let W=_.__dshActivator;if(!W||typeof W.click!="function"){let Z=ut(),S=Z?Z.querySelector(ls):null,H=(S?a(S):[])[T]||null;W=H?C(H):null}W&&typeof W.click=="function"&&W.click()}),i.insertBefore(_,e.anchor()),D=_}s(D,V,Y,B),D.__dshActivator=L})(d[k],k)}catch(E){reportError(E)}let f=[];for(let k=0;k<i.children.length;k++){let E=i.children[k];E!==e.anchor()&&(E.hasAttribute("data-action-index")||E.hasAttribute("data-embed-index"))&&f.push(E)}f.sort((k,E)=>{let T=parseInt(k.getAttribute("data-action-index")||k.getAttribute("data-embed-index")||"",10)||0,R=parseInt(E.getAttribute("data-action-index")||E.getAttribute("data-embed-index")||"",10)||0;return T-R});let v=e.anchor();for(let k=f.length-1;k>=0;k--)f[k].nextSibling!==v&&i.insertBefore(f[k],v),v=f[k]}function h(A){let w=A.querySelectorAll("[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay]");for(let d=0;d<w.length;d++)w[d].removeAttribute("data-dsh-claude-footer-entry"),w[d].removeAttribute("data-dsh-claude-footer-hidden"),w[d].removeAttribute("data-dsh-claude-footer-overlay")}return{sync:b,clear:h}}var qd=40,O1=20;function jd(e){function t(c){if(c==null)return;let u=c.getBoundingClientRect(),y={bubbles:!0,cancelable:!0,composed:!0,button:0,buttons:1,clientX:Math.round(u.left+u.width/2),clientY:Math.round(u.top+u.height/2)};c.dispatchEvent(new PointerEvent("pointerdown",y)),c.dispatchEvent(new MouseEvent("mousedown",y)),c.dispatchEvent(new PointerEvent("pointerup",y)),c.dispatchEvent(new MouseEvent("mouseup",y)),c.click()}function n(){let u=[ut(),document];for(let y of u){if(y===null)continue;let x=y.querySelector('[aria-haspopup="menu"][data-signed-out]');if(x!==null&&!String(x.className||"").includes("dsh-claude-"))return x}return null}function a(){let c=ut();return c===null?null:c.querySelector(ul)}function o(){let c=n();if(c===null||c.getAttribute("aria-expanded")!=="true")return null;let u=document.querySelectorAll(ya);for(let y=0;y<u.length;y++)if(!String(u[y].className||"").includes("dsh-claude-"))return u[y];return null}function s(c){return c.querySelector('[role="menuitem"][aria-keyshortcuts]')}function l(c){return c.querySelector('[role="presentation"]')}function r(){e.close();let c=a();if(c!==null){c.click();return}let u=n();if(u===null)return;t(u);let y=0;function x(){let m=o();if(m!==null){let C=s(m);if(C===null){t(u);return}let b=m.style.visibility;m.style.visibility="hidden",t(C),m.style.visibility=b;return}y++>O1||setTimeout(x,qd)}setTimeout(x,qd)}function g(){let c=n();c!==null&&c.click()}return{trigger:n,settingsTrigger:a,findMenu:o,menuViewport:l,openMenu:g,openSettings:r}}function Yd(e,t){let n=null,a=null,o=[2e3,1e4,3e4],s=0,l=null,r=0;function g(){return e.get("remote.account")??null}function c(){return{version:ui,locale:Vt(e),timezoneOffsetSeconds:-new Date().getTimezoneOffset()*60}}function u(p,f){p===n&&f===a||(n=p,a=f,$l(p,f),t())}function y(){s++,l!==null&&(clearTimeout(l),l=null)}function x(){r>=o.length||(l=setTimeout(()=>{l=null,m()},o[r++]))}function m(){let p=g();if(p===null||typeof p.getProfile!="function")return;y();let f=s;p.getProfile(c()).then(v=>{if(f!==s)return;if(!v||v.ok!==!0){x();return}if(!v.value){C!==null&&C!=="signed-out"?x():u(null,null);return}let k=v.value.profile||v.value;if(!k||k.status!=="ready"||!k.value){x();return}r=0,u(k.value.name||k.value.contact||null,k.value.avatarUrl||k.avatarUrl||null)},()=>{f===s&&x()})}let C=null,b=null;function h(p){if(p===null||typeof p!="object")return;let f=p.status==="credential-stored",v=p.attempt;f?v&&(v.phase==="committing"||v.phase==="succeeded")&&(b=v.id??null):b=null;let k=f?`signed-in:${b||""}`:"signed-out";k!==C&&(C=k,r=0,f?m():(y(),u(null,null)))}let A=null;function w(){if(y(),A===null)return;let p=A;A=null,document.body.__dshAccountStream===p&&(document.body.__dshAccountStream=null),p.dispose()}function d(){let p=g(),f=e.get("remote");if(p===null||typeof p.watch!="function"||typeof f?.$stream!="function")return!1;let v=f.$stream({name:"dsh-claude-style account",open(T){return p.watch(T)},ended(){return new Error("account stream ended")}}),k=v[Symbol.asyncIterator]();A=v,document.body.__dshAccountStream=v;function E(){k.next().then(T=>{if(!(A!==v||T.done)){if(document.body.__dshAccountStream!==v){w();return}h(T.value.value),typeof T.value.accept=="function"&&T.value.accept(),E()}},()=>{A===v&&C===null&&m()})}return E(),!0}let i=null;return typeof e.inject=="function"?i=e.inject(["remote.account"],p=>{p.effect(()=>(d()||m(),w),"dsh-claude-style: account")}):d()||m(),{stop(){i!==null&&typeof i.dispose=="function"&&i.dispose(),w()}}}function Kd(e){let t=e.hostMenu;function n(d){if(d===Ct)return d;if(typeof d!="string"||d===""||!URL.canParse(d,window.location.href))return null;let i=new URL(d,window.location.href);return i.protocol==="https:"||i.protocol==="http:"?i.href:null}let a=null,o=!1,s=!1;function l(d,i){let p=d.width,f=i.naturalWidth/64,v=d.getContext("2d");if(v===null||f<1||f!==Math.floor(f))return!1;let k=Math.round(p/18);return v.clearRect(0,0,p,p),v.imageSmoothingEnabled=!1,v.drawImage(i,8*f,8*f,8*f,8*f,k,k,p-2*k,p-2*k),v.drawImage(i,40*f,8*f,8*f,8*f,0,0,p,p),!0}function r(){o=!0;let d=new Image;d.decoding="async",d.addEventListener("load",()=>{if(d.naturalWidth!==d.naturalHeight||d.naturalWidth<64){s=!0,g();return}let i=a;i===null&&(i=document.createElement("canvas"),i.className="dsh-claude-account-skin",i.width=64,i.height=64,i.setAttribute("aria-hidden","true"),a=i),l(i,d)||(s=!0),g()}),d.addEventListener("error",()=>{s=!0,g()}),d.src=Ct}function g(){typeof e.onChange=="function"&&e.onChange()}function c(d){let i=d.querySelector(".dsh-claude-account-photo");i!==null&&(d.removeChild(i),d.hasAttribute("data-dsh-claude-photo")&&d.removeAttribute("data-dsh-claude-photo"))}function u(d){a!==null&&a.parentElement===d&&d.removeChild(a),d.hasAttribute("data-dsh-claude-skin")&&d.removeAttribute("data-dsh-claude-skin")}function y(d){o||r(),!(a===null||s)&&(a.parentElement!==d&&(a.remove(),d.appendChild(a)),d.toggleAttribute("data-dsh-claude-skin",!0))}function x(d){if(d===null)return;let i=n(ai());if(i===Ct){c(d),y(d);return}u(d);let p=d.querySelector(".dsh-claude-account-photo");if(i===null){c(d);return}if(p===null){let f=document.createElement("img");f.className="dsh-claude-account-photo",f.alt="",f.decoding="async",f.draggable=!1,f.referrerPolicy="no-referrer",f.addEventListener("load",()=>{f.hidden=!1}),f.addEventListener("error",()=>{f.hidden=!0}),d.appendChild(f),p=f}p.getAttribute("src")!==i&&(p.src=i),d.hasAttribute("data-dsh-claude-photo")||d.setAttribute("data-dsh-claude-photo","")}function m(d){let i=U("div","dsh-claude-account-popover-header");i.setAttribute("data-dsh-claude-ban-row","");let p=U("div","dsh-claude-account-popover-row");p.setAttribute("role","button"),p.setAttribute("tabindex","0"),p.setAttribute("aria-haspopup","dialog");let f=U("div","dsh-claude-account-popover-name",d),v=U("div","dsh-claude-account-popover-divider");return p.appendChild(f),i.appendChild(p),i.appendChild(v),i}function C(d){let i=vs();if(i)return i;if(d!==null){let p=(d.textContent||"").trim();if(p)return p}return"User"}function b(d,i){if(d===null)return;let p=d.querySelector(".dsh-claude-account-popover-name"),f=C(i);p&&p.textContent!==f&&(p.textContent=f);let v=d.querySelector("[data-dsh-claude-ban-row]");v&&!v.__dshBanBound&&(v.__dshBanBound=!0,v.addEventListener("click",k=>{k.preventDefault(),k.stopPropagation(),e.openBan()}),v.addEventListener("keydown",k=>{k.key!=="Enter"&&k.key!==" "||(k.preventDefault(),k.stopPropagation(),e.openBan())}))}function h(){let d=U("div","dsh-claude-account-inject");return d.appendChild(m(C(t.trigger()))),d}function A(){let d=document.createElement("button");return d.type="button",d.className="dsh-claude-popover-item",d.setAttribute("data-action","settings"),d.innerHTML='<span class="dsh-claude-popover-item-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span><span class="dsh-claude-popover-item-text"></span>',d.addEventListener("click",i=>{i.stopPropagation(),t.openSettings()}),d}function w(d){if(d===null)return;let i="设置",p=t.settingsTrigger();if(p){let v=(p.textContent||"").trim();v||(v=p.getAttribute("aria-label")||""),v&&(i=v)}let f=d.querySelector(".dsh-claude-popover-item-text");f&&f.textContent!==i&&(f.textContent=i)}return{syncAvatar:x,buildHeader:m,syncHeader:b,buildHostContainer:h,buildSettingsItem:A,syncSettingsItem:w}}function Qd(e){let t=null,n=null,a=Ae(Gr);function o(){return e.hostTrigger()!==null?"host":"synthetic"}function s(){return t==="host"?n:e.syntheticContainer()}function l(u){a.current()!==u&&(a.mark(u),e.onMenu&&e.onMenu(u))}function r(u){if(u.hasAttribute(da))return;let y=null,x=0,m=0,C=()=>{if(!u.isConnected||u.hasAttribute(da))return;let b=n!==null&&n.isConnected&&n.childElementCount>0,h=u.style.top;if(x=b&&h!==""&&h===y?x+1:0,y=h,x>=1||b&&h===""||m>=10){u.setAttribute(da,"");return}m+=1,he({write:C})};he({write:C})}function g(){let u=e.findMenu();if(u===null){l(null),n=null;return}l(u);let y=e.menuViewport(u);if(y===null){n=null,r(u);return}n===null&&(n=e.buildContainer()),y.firstChild!==n&&y.insertBefore(n,y.firstChild),r(u)}function c(){let u=o();u!==t&&(t=u,n=null,e.onMode(t)),t==="host"&&g()}return{mode(){return t},container:s,clearMenu(){l(null)},sync:c}}function Xd(e,t){let n="data-dsh-claude-account-host-row",a=Yd(e,()=>{typeof t.schedule=="function"&&t.schedule()}),o=null,s=null,l=null,r=null,g=He(m,C,Be,Ve),c=He(Y,B,Be,Ve),u={},y=!1;function x(){return!!(s&&s.getAttribute("data-open")==="true")}function m(){if(!(!s||!o)){h(),_e("account");try{let H=ut();H&&f.sync(H)}catch(H){reportError(H)}w(),s.setAttribute("data-open","true"),o.setAttribute("data-open","true"),o.setAttribute("aria-expanded","true")}}function C(){!s||!o||(h(),y=!1,s.setAttribute("data-open","false"),o.setAttribute("data-open","false"),o.setAttribute("aria-expanded","false"))}function b(){s&&(x()?C():(y=!0,m()))}function h(){g.cancel()}function A(){g.scheduleClose()}function w(){if(!(!s||!o)){if(o.closest('[class*="_collapsed"]')===null){s.style.removeProperty("left"),s.style.removeProperty("top");return}Je(o,s,{side:"right",important:!0})}}let d=jd({close:C}),i=Kd({hostMenu:d,onChange(){typeof t.schedule=="function"&&t.schedule()},openBan(){y=!0,t.ban&&t.ban.open()}}),p=Qd({hostTrigger:d.trigger,findMenu:d.findMenu,menuViewport:d.menuViewport,buildContainer:i.buildHostContainer,syntheticContainer(){return l},onMode:W,onMenu:F}),f=Wd({body(){return p.container()},anchor(){return r},isOpen(){return p.mode()==="synthetic"&&x()},close:N});Oe("account",L);let v=0,k=-1,E=-1;function T(H){let q=Ft();ve(H,".dsh-claude-account-btn",[o]),ve(document,".dsh-claude-account-popover",[s]),(o===null||!H.contains(o))&&(o&&o.parentElement&&o.parentElement.removeChild(o),o=document.createElement("div"),o.className="dsh-claude-account-btn",o.setAttribute("role","button"),o.setAttribute("tabindex","0"),o.setAttribute("aria-haspopup","menu"),o.setAttribute("aria-expanded","false"),o.innerHTML='<span class="dsh-claude-account-avatar"></span><span class="dsh-claude-account-label"><span class="dsh-claude-account-user"></span></span><span class="dsh-claude-account-chevron"></span>',o.addEventListener("mouseenter",()=>{le().autoPopover!==Ge&&g.scheduleOpen()}),o.addEventListener("mouseleave",()=>{le().autoPopover!==Ge&&!y&&A()}),o.addEventListener("click",j=>{j.stopPropagation(),b()}),H.appendChild(o));let z=o.querySelector(".dsh-claude-account-user");z&&z.textContent!==q&&(z.textContent=q),i.syncAvatar(o.querySelector(".dsh-claude-account-avatar")),(s===null||!H.contains(s))&&(s&&s.parentElement&&s.parentElement.removeChild(s),s=document.createElement("div"),s.id="dsh-claude-account-popover",s.className="dsh-claude-popover-card dsh-claude-account-popover",s.setAttribute("data-open","false"),s.addEventListener("mouseenter",()=>{h()}),s.addEventListener("mouseleave",()=>{t.ban?.isOpen()!==!0&&A()}),s.appendChild(i.buildHeader(q)),l=document.createElement("div"),l.className="dsh-claude-account-popover-body",s.appendChild(l),r=null,H.appendChild(s));let O=l;return(r===null||!O.contains(r))&&(r=i.buildSettingsItem(),O.appendChild(r)),i.syncSettingsItem(r),O}function R(){h(),ve(document,".dsh-claude-account-btn, .dsh-claude-account-popover",[]),o=null,s=null,l=null,r=null}function N(){if(p.mode()==="host"){let H=d.findMenu();if(H!==null){let q=new KeyboardEvent("keydown",{key:"Escape",bubbles:!0,cancelable:!0});q.__dshHostMenuEscape=!0,H.dispatchEvent(q)}return}C()}function L(){p.mode()==="host"?N():C()}function D(){document.body.hasAttribute(Cn)||document.body.setAttribute(Cn,"")}function V(){document.body.hasAttribute(Cn)&&document.body.removeAttribute(Cn)}function Y(){p.mode()==="host"&&d.findMenu()===null&&(_e("account"),D(),d.openMenu())}function B(){if(t.ban?.isOpen()===!0)return;let H=d.trigger();if(H!==null&&H.matches(":hover"))return;let q=d.findMenu();q!==null&&q.matches(":hover")||N()}function _(H){H.__dshHostRowToken!==u&&(H.__dshHostRowToken=u,H.addEventListener("mouseenter",()=>{le().autoPopover!==Ge&&c.scheduleOpen()}),H.addEventListener("mouseleave",()=>{le().autoPopover!==Ge&&c.scheduleClose()}),H.addEventListener("click",()=>{D()}))}function F(H){if(H===null){V();return}H.__dshHostHoverBound||(H.__dshHostHoverBound=!0,H.addEventListener("mouseenter",()=>{le().autoPopover!==Ge&&c.cancel()}),H.addEventListener("mouseleave",()=>{le().autoPopover!==Ge&&c.scheduleClose()}))}function W(H){H==="host"&&R()}function Z(H){h(),c.cancel(),V(),v!==0&&(v=0,document.body.style.removeProperty("--dsh-claude-account-width")),(k!==-1||E!==-1)&&(k=-1,E=-1,document.body.style.removeProperty("--dsh-claude-account-inset-left"),document.body.style.removeProperty("--dsh-claude-account-inset-right")),R(),p.clearMenu();let q=document.querySelectorAll(".dsh-claude-account-inject");for(let O=0;O<q.length;O++)q[O].remove();let z=document.querySelectorAll(`[${n}]`);for(let O=0;O<z.length;O++)z[O].removeAttribute(n);H&&f.clear(H)}function S(H,q){if(H===null)return;let z=H.getBoundingClientRect(),O=Math.round(z.width);if(O>0&&O!==v&&(v=O,document.body.style.setProperty("--dsh-claude-account-width",`${O}px`)),p.mode()!=="synthetic")return;let j=q.getBoundingClientRect(),ne=Math.round(z.left-j.left),G=Math.round(j.right-z.right);ne!==k&&(k=ne,document.body.style.setProperty("--dsh-claude-account-inset-left",`${ne}px`)),G!==E&&(E=G,document.body.style.setProperty("--dsh-claude-account-inset-right",`${G}px`))}function P(){let H=ut();if(H===null)return;if(!le().collapseFooter){Z(H);return}p.sync(),p.mode()==="host"?R():T(H);let q=d.trigger();q!==null&&!q.hasAttribute(n)&&q.setAttribute(n,"");let z=p.mode()==="host"?q:o;S(z,H),q!==null&&_(q),f.sync(H);let O=p.mode()==="host"?p.container():s;O!==null&&(i.syncHeader(O,q),x()&&w())}return t.footer={sync:P,close(H){H==="outside"&&!x()||C()},openSettings:d.openSettings,onKey(H){!(H.ctrlKey||H.metaKey)||H.key!==","||(H.preventDefault(),d.openSettings())},owns(H){if(!H)return!1;if(o!==null&&o.contains(H)||s!==null&&s.contains(H))return!0;let q=p.container();return q!==null&&q.contains(H)},isOpen(){return x()},reposition(){x()&&w()}},()=>{a.stop(),Pe("account"),Z(ut())}}var P1=88,I1=48,F1=140,N1=40;function $d(e){let t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(yl));return isFinite(t)&&t>0?Math.round(t):e}function co(){let e=document.documentElement;if(e.hasAttribute(va)){let t=navigator.windowControlsOverlay;if(!t||t.visible!==!0)return null;let n=typeof t.getTitlebarAreaRect=="function"?t.getTitlebarAreaRect():null;return n&&n.width>0&&n.height>0?{platform:"win32",height:Math.round(n.height),controls:{side:"right",size:Math.max(0,Math.round(window.innerWidth-n.right))}}:{platform:"win32",height:$d(N1),controls:{side:"right",size:F1}}}return e.dataset.platform==="darwin"?e.hasAttribute(bl)?null:{platform:"darwin",height:$d(I1),controls:{side:"left",size:P1}}:null}function Jd(e,t){let n=null,a=!1;ve(document,".dsh-claude-ban",[]),document.body.style.removeProperty("--dsw-specific-sidebar-fill");function o(){l(),n!==null&&n.parentElement!==null&&n.parentElement.removeChild(n),n=null}function s(){if(n===null)return;let C=getComputedStyle(n).getPropertyValue("--dsh-ban-canvas").trim();C!==""&&(document.body.style.setProperty("--dsw-specific-sidebar-fill",C),a=!0)}function l(){a&&(a=!1,document.body.style.removeProperty("--dsw-specific-sidebar-fill"))}function r(C){let b=C instanceof Node?C:null;for(;b&&b!==n;){if(b instanceof Element&&b.hasAttribute("data-dsh-ban-dismiss"))return!0;b=b.parentElement}return!1}function g(C,b){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${b===void 0?1.6:b}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${C}</svg>`}let c={lock:g('<path d="M4.412 9.025 C9.287 8.894 14.136 9.077 19.379 9.182 C19.379 11.541 19.379 13.638 19.405 14.949 C19.667 15.735 19.641 16.784 19.457 17.57 C19.379 18.619 19.379 20.191 19.379 21.659 C14.923 21.764 9.156 21.764 4.674 21.659 C4.7 19.405 4.7 16.26 4.674 14.163 C4.621 13.114 4.516 12.066 4.438 11.279 C4.385 10.231 4.385 9.444 4.412 9.025 Z"></path><path d="M8.081 8.972 C7.95 7.872 7.95 6.561 8.081 5.25 C8.212 3.94 8.789 2.734 9.837 2.341 C10.676 2.105 12.721 2.131 13.507 2.315 C14.503 2.603 15.29 3.258 15.394 4.071 C15.499 5.25 15.499 6.561 15.526 9.156 M9.89 9.025 C9.785 7.609 9.785 6.299 9.89 5.25 C9.995 4.359 10.519 3.861 11.567 3.861 C12.537 3.809 13.324 4.097 13.664 4.988 C13.796 5.644 13.796 7.085 13.796 9.13"></path><path d="M10.021 14.634 C9.864 14.32 9.811 14.11 9.811 13.9 C9.759 13.245 9.916 12.485 10.729 12.092 C11.253 11.882 12.197 11.882 12.695 12.092 C13.271 12.301 13.691 12.983 13.664 13.9 C13.664 14.11 13.612 14.32 13.35 14.634 C13.166 14.844 12.773 15.001 12.695 15.316 C12.668 15.84 13.455 17.046 13.927 18.383 C12.433 18.592 10.86 18.566 9.68 18.435 C10.152 17.151 10.702 16.417 10.598 15.683 C10.519 15.263 10.257 14.949 10.021 14.634 Z"></path>',.5),warning:g('<path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4.2"></path><path d="M12 16.8h.01"></path>'),close:g('<path d="M6.4 6.4 17.6 17.6"></path><path d="M17.6 6.4 6.4 17.6"></path>'),download:g('<path d="M12 3.5v11"></path><path d="m7.5 10 4.5 4.5 4.5-4.5"></path><path d="M4.5 19.5h15"></path>'),trash:g('<path d="M4.5 6.8h15"></path><path d="M9.5 6.8V5.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2v1.6"></path><path d="M6.8 6.8 7.7 19a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.9-12.2"></path><path d="M10.3 10.4v6.2"></path><path d="M13.7 10.4v6.2"></path>'),chevron:g('<path d="m9.5 5.5 7 6.5-7 6.5"></path>'),minimize:g('<path d="M4 12h16"></path>'),maximize:g('<rect x="4.5" y="4.5" width="15" height="15" rx="2"></rect>'),restore:g('<rect x="4.5" y="8.5" width="11" height="11" rx="2"></rect><path d="M8.5 8.5V6a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 19.5 6v8a1.5 1.5 0 0 1-1.5 1.5h-2.5"></path>')},u=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function y(C){let b=`${u[C.getMonth()]} ${C.getDate()}, ${C.getFullYear()}`,h;if(le().banLocale===xn){let A=C.getHours(),w=C.getMinutes();h=`${A<10?`0${A}`:String(A)}:${w<10?`0${w}`:String(w)}`}else{let A=C.getHours(),w=A%12;w===0&&(w=12);let d=C.getMinutes();h=`${w}:${d<10?`0${d}`:String(d)} ${A<12?"AM":"PM"}`}return`${b}, ${h}`}let x=null;function m(C){if(o(),typeof document>"u"||document.body===null)return;let b=U("div","dsh-claude-ban");b.setAttribute("role","dialog"),b.setAttribute("aria-modal","true"),b.setAttribute("data-dsh-ban",""),x=C instanceof Date?C:new Date;let h=y(x),A=Ft();b.innerHTML=`<div class="dsh-claude-ban-bar"><div class="dsh-claude-ban-brand"><span class="dsh-claude-ban-mark"></span><span class="dsh-claude-ban-word"></span></div><div class="dsh-claude-ban-bar-actions"><button type="button" class="dsh-claude-ban-signout" data-dsh-ban-dismiss>${Te("signOut","Sign out")}</button><div class="dsh-claude-ban-window" aria-hidden="true"><button type="button" class="dsh-claude-ban-win" tabindex="-1" data-dsh-ban-dismiss>${c.minimize}</button><button type="button" class="dsh-claude-ban-win" tabindex="-1" data-dsh-ban-dismiss>${c.restore}</button><button type="button" class="dsh-claude-ban-win" tabindex="-1" data-dsh-ban-dismiss>${c.close}</button></div></div></div><div class="dsh-claude-ban-toast" data-dsh-ban-dismiss role="status"><span class="dsh-claude-ban-toast-icon">${c.warning}</span><span class="dsh-claude-ban-toast-text"></span><span class="dsh-claude-ban-toast-close">${c.close}</span></div><div class="dsh-claude-ban-scroll"><div class="dsh-claude-ban-column"><span class="dsh-claude-ban-lock">${c.lock}</span><h1 class="dsh-claude-ban-title">${Te("title","Your account is on hold")}</h1><p class="dsh-claude-ban-lead">${Te("lead","We put your account on hold on <strong>{time}</strong> because of unusual activity. Your chats and data are safe.",{time:h})}</p><p class="dsh-claude-ban-lead">${Te("leadError","If you think this hold is an error, you can request an account review.")}</p><p class="dsh-claude-ban-next">${Te("nextLabel","What happens next:")}</p><div class="dsh-claude-ban-card"><div class="dsh-claude-ban-step"><span class="dsh-claude-ban-step-num">1</span><span class="dsh-claude-ban-step-body"><span class="dsh-claude-ban-step-title">${Te("step1Title","Request a review")}</span><span class="dsh-claude-ban-step-desc">${Te("step1Desc","Tell us more about what happened.")}</span></span></div><div class="dsh-claude-ban-step"><span class="dsh-claude-ban-step-num">2</span><span class="dsh-claude-ban-step-body"><span class="dsh-claude-ban-step-title">${Te("step2Title","We’ll review your account")}</span><span class="dsh-claude-ban-step-desc">${Te("step2Desc","A team member will review your request and account activity together.")}</span></span></div><div class="dsh-claude-ban-step"><span class="dsh-claude-ban-step-num">3</span><span class="dsh-claude-ban-step-body"><span class="dsh-claude-ban-step-title">${Te("step3Title","We’ll email you the outcome")}</span><span class="dsh-claude-ban-step-desc">${Te("step3Desc","Reviews take about 10 days.")}</span></span></div></div><button type="button" class="dsh-claude-ban-primary" data-dsh-ban-dismiss>${Te("review","Request a review")}</button><h2 class="dsh-claude-ban-subtitle">${Te("whatYouCanDo","What you can do")}</h2><div class="dsh-claude-ban-card dsh-claude-ban-actions"><button type="button" class="dsh-claude-ban-action" data-dsh-ban-dismiss><span class="dsh-claude-ban-action-icon">${c.download}</span><span class="dsh-claude-ban-action-text"><span class="dsh-claude-ban-action-title">${Te("exportTitle","Export your data")}</span><span class="dsh-claude-ban-action-desc">${Te("exportDesc","We’ll package up your conversations, projects, and settings for download. This might take some time to complete.")}</span></span><span class="dsh-claude-ban-action-chevron">${c.chevron}</span></button><button type="button" class="dsh-claude-ban-action" data-dsh-ban-dismiss><span class="dsh-claude-ban-action-icon">${c.trash}</span><span class="dsh-claude-ban-action-text"><span class="dsh-claude-ban-action-title dsh-claude-ban-action-title-danger">${Te("deleteTitle","Delete your account")}</span><span class="dsh-claude-ban-action-desc">${Te("deleteDesc","You can permanently delete your account and data. This can’t be undone.")}</span></span><span class="dsh-claude-ban-action-chevron">${c.chevron}</span></button></div></div></div>`,b.querySelector(".dsh-claude-ban-toast-text").textContent=`${A}: account_banned`,b.addEventListener("click",d=>{r(d.target)&&o()}),n=b,document.body.appendChild(b);let w=co();w!==null&&(b.setAttribute("data-dsh-ban-titlebar",""),b.setAttribute("data-dsh-ban-controls",w.controls.side),b.style.setProperty("--dsh-ban-caption-height",`${w.height}px`),b.style.setProperty("--dsh-ban-caption-controls",`${w.controls.size}px`),w.platform==="win32"&&s())}return t.ban={open:m,close(C){C==="composer"||C==="outside"||o()},isOpen(){return n!==null},onCopyChange(){n!==null&&m(x===null?new Date:x)}},o}var Zd="data-dsh-theme-transitioning",z1=300,B1={"border-color":!0,border:!0,"border-top-color":!0,"border-right-color":!0,"border-bottom-color":!0,"border-left-color":!0,"box-shadow":!0,color:!0,"background-color":!0,background:!0,"background-image":!0,"outline-color":!0,fill:!0,stroke:!0,"text-decoration-color":!0,"caret-color":!0};function ec(){let e=document.body,t=document.documentElement,n=null,a=null;function o(g){t.toggleAttribute(Zd,g),e.toggleAttribute(Zd,g)}function s(){let g=document.getAnimations();for(let c=0;c<g.length;c++){let u=g[c];u instanceof CSSTransition&&B1[u.transitionProperty]&&u.cancel()}}function l(){o(!0),t.offsetHeight,s(),a!==null&&a(),a=he({write(){s(),a=he({write(){a=null,s()}})}}),n!==null&&clearTimeout(n),n=setTimeout(()=>{o(!1),n=null},z1)}let r=ge(e,{attributeFilter:[vl]},l);return()=>{r(),a!==null&&a(),n!==null&&clearTimeout(n),o(!1)}}var mn=Se(require("react"),1),rt=Se(require("@deepseek-ai/dsh-client-ui-primitives"),1),er=Se(require("react-dom/client"),1);function tc(e,t){let n=[],a=null,o=0,s=Ae("data-dsh-claude-ws-view"),l=Ae("data-dsh-claude-ws-label"),r=Ae("data-dsh-claude-ws-tree"),g=[{id:"active",key:"archiveActive",fallback:"Active"},{id:"archived",key:"archiveArchived",fallback:"Archived"}],c="active",u=null,y=st('[aria-checked="true"]'),x=null,m=null,C,b={},h=null,A=null,w=null,d=!1;function i(S){return e.get(S)}function p(){let S=document.querySelectorAll('[class*="sectionLabel"]');for(let P=0;P<S.length;P++){let H=S[P],q=/([^\s]+)_sectionLabel(?:\s|$)/.exec(H.className||"");if(q===null)continue;let z=H.closest(`[class*="${q[1]}_root"]`);if(z!==null&&z.querySelector(`[class*="${q[1]}_listArea"]`)!==null)return H}return null}let f='[data-row-key], [class*="sessionRow"], [class*="projectRow"]';function v(S){let P=S.parentElement;for(;P!==null&&P!==document.body;){let H=P.querySelector('[role="tree"], [class*="_list"]');if(H!==null&&H.querySelector(f)!==null)return H;P=P.parentElement}return null}function k(S){if(typeof S!="number"||!isFinite(S))return"";let P=Math.floor((Date.now()-S)/6e4);if(P<1)return se("archiveJustNow","Just now");if(P<60)return se("archiveMinutes","{count} min",{count:P});let H=Math.floor(P/60);return H<24?se("archiveHours","{count} h",{count:H}):se("archiveDays","{count} d",{count:Math.floor(H/24)})}function E(){if(w!==null)return!0;let S=i("workspaces"),P=i("sessions");if(S==null||S.list===void 0||P==null||P.list===void 0)return!1;h=S,A=P;let H=S.list.subscribe(T),q=P.list.subscribe(T);return w=()=>{H(),q()},T(),!0}function T(){if(d)return;let S=h,P=A;if(S===null||P===null)return;let H=S.list.getSnapshot(),q=P.list.getSnapshot();if(H.phase!=="ready"||q.phase!=="ready")m=null;else{m=[];for(let O=0;O<H.archivedSessionIds.length;O++){let j=H.archivedSessionIds[O],ne=q.byId[j];ne===void 0||ne.origin==="subagent"||ne.blank||b[j]===!0||m.push({id:j,title:ne.displayTitle,at:ne.updatedAt})}m.sort((O,j)=>j.at-O.at)}let z=m===null?null:m.map(O=>`${O.id}
${O.title}
${O.at}`).join(`
`);z!==C&&(C=z,_())}function R(S){a===null&&(a=er.createRoot(document.createElement("div"))),o++,a.render(mn.createElement(rt.Toast,{key:`toast-${o}`,text:S,icon:mn.createElement(rt.IconWarningOutlineRegular),onDone(){a!==null&&a.render(null)}}))}function N(){let S=e.get("locale").bind("workspace");R(S("toast.archivedNotOpenable"))}function L(S){fetch(ko,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:S})}).then(P=>P.json().then(H=>({status:P.status,result:H}))).then(({status:P,result:H})=>{if(H?.ok===!0||P===404&&H?.error==="session not found"){b[S]=!0,T(),D();return}let q=new Error(String(H?.error||`HTTP ${P}`));throw q.status=P,q}).catch(P=>{console.warn("dsh-claude-style: session delete rejected:",P),R(P?.status===409?se("archiveDeleteOpen","The conversation is still held open by this app; restart it, then delete again"):se("archiveDeleteFailed","Delete failed: {detail}",{detail:P?.message??String(P)}))})}function D(){let S=A;S===null||typeof S.refresh!="function"||S.refresh().catch(P=>{console.warn("dsh-claude-style: session baseline refresh rejected:",P)})}function V(S){let P=h;P!==null&&Promise.resolve(P.unarchiveSession(S)).catch(H=>{console.warn("dsh-claude-style: session unarchive rejected:",H)})}function Y(S,P,H){let q=U("span","dsh-claude-archive-action"),z=S==="restore"?"dsh-claude-archive-restore":"dsh-claude-archive-delete",O=S==="restore"?rt.IconUnarchiveOutlineRegular:rt.IconTrashOutlineRegular,j=er.createRoot(q);return n.push(j),j.render(mn.createElement(rt.Tooltip,{label:P,side:"top",delayMs:500,children:mn.createElement("button",{type:"button",className:z,"aria-label":P,title:P,onClick:H},mn.createElement(O,{size:14}))})),q}function B(S){let P=U("div","dsh-claude-archive-row");return P.setAttribute("role","button"),P.setAttribute("tabindex","0"),P.setAttribute("data-session-id",S.id),P.appendChild(U("span","dsh-claude-archive-title",S.title)),P.appendChild(U("span","dsh-claude-archive-time",k(S.at))),P.appendChild(Y("restore",se("archiveRestore","Unarchive conversation"),H=>{H.stopPropagation(),V(S.id)})),P.appendChild(Y("delete",se("archiveDelete","Delete conversation"),H=>{H.stopPropagation(),L(S.id)})),P.addEventListener("click",N),P}function _(){if(x!==null){for(let S=0;S<n.length;S++)n[S].unmount();for(n=[];x.firstChild;)x.removeChild(x.firstChild);if(m===null){x.appendChild(U("div","dsh-claude-archive-status",se("archiveLoading","Loading…")));return}if(m.length===0){x.appendChild(U("div","dsh-claude-archive-status",se("archiveEmpty","No archived conversations")));return}for(let S=0;S<m.length;S++)x.appendChild(B(m[S]))}}function F(){let S=U("div","dsh-claude-ws-segments");S.setAttribute("role","radiogroup");for(let P=0;P<g.length;P++){let H=U("button","dsh-claude-ws-segment","");H.type="button",H.setAttribute("role","radio"),H.setAttribute("data-view",g[P].id),S.appendChild(H)}return S.addEventListener("click",P=>{let H=fe(P.target,".dsh-claude-ws-segment");H!==null&&(P.stopPropagation(),P.preventDefault(),W(H.getAttribute("data-view")))}),S}function W(S){S!=="active"&&S!=="archived"||S!==c&&(c=S,Z())}function Z(){let S=p();if(S===null||S.parentElement===null)return;let P=S.parentElement;if(!E())return;l.mark(S),(u===null||u.parentElement!==P)&&(u!==null&&u.parentElement!==null&&u.parentElement.removeChild(u),u=F(),P.insertBefore(u,P.firstChild));for(let z=0;z<u.children.length;z++){let O=u.children[z],j=O.getAttribute("data-view");for(let G=0;G<g.length;G++){if(g[G].id!==j)continue;let $=se(g[G].key,g[G].fallback);O.textContent!==$&&(O.textContent=$)}let ne=j===c;O.getAttribute("aria-checked")!==(ne?"true":"false")&&O.setAttribute("aria-checked",ne?"true":"false")}y.sync(u);let H=v(S);if(H===null)return;r.mark(H);let q=H.parentElement;q!==null&&((x===null||x.parentElement!==q)&&(x!==null&&x.parentElement!==null&&x.parentElement.removeChild(x),x=U("div","dsh-claude-archive-list"),q.insertBefore(x,H.nextSibling),_()),ve(document,".dsh-claude-archive-list",[x]),s.mark(q,c))}return t.workspace={sync:Z},()=>{d=!0;for(let S=0;S<n.length;S++)n[S].unmount();n=[],a!==null&&(a.unmount(),a=null),w!==null&&(w(),w=null),y.release(),u!==null&&u.parentElement!==null&&u.parentElement.removeChild(u),x!==null&&x.parentElement!==null&&x.parentElement.removeChild(x),l.release(),r.release(),s.release(),u=null,x=null,delete t.workspace}}var tr=Se(require("react"),1),ac=Se(require("@deepseek-ai/dsh-client-ui-primitives"),1),oc=Se(require("react-dom/client"),1);function nc(e){let t={session:6,project:3,plugin:3,skill:3,shortcut:3},n=60,a=5,o=null,s=null,l=null,r=0;function g(_){return e.get(_)}function c(_){let F=g("shortcuts");if(!F)return[];let W=F.catalog.getSnapshot();for(let Z=0;Z<W.length;Z++)if(W[Z].id===_)return W[Z].keys;return[]}function u(_,F){let W=g("slots");if(!W)return null;let Z=W.entries(_);for(let S=0;S<Z.length;S++){let P=Z[S];if(!(F!==void 0&&P.options.id!==F)&&P.store)return P.store.create()}return null}function y(_){let F=u("shell.overlay","shortcuts");if(F===null)throw new Error("search: the shortcut reference is not registered");F.actions.open(),_&&F.actions.search(_)}function x(_){let F={};for(let W=0;W<_.items.length;W++){let Z=_.items[W];for(let S=0;S<Z.sessionIds.length;S++)F[Z.sessionIds[S]]===void 0&&(F[Z.sessionIds[S]]=Z.title)}return F}function m(){let _=g("sessions"),F=g("workspaces");if(!_||!F)return[];let W=_.list.getSnapshot(),Z=F.list.getSnapshot(),S=new Set(Z.archivedSessionIds),P=x(Z),H=[];for(let q=0;q<W.ids.length;q++){let z=W.byId[W.ids[q]];z===void 0||z.blank||z.origin==="subagent"||S.has(z.id)||H.push({summary:z,workspace:P[z.id]||""})}return H.sort((q,z)=>z.summary.updatedAt-q.summary.updatedAt),H}function C(_,F){let W=_.summary.id;return{kind:"session",id:`session:${W}`,title:_.summary.displayTitle,detail:_.workspace,snippet:F===void 0?"":F.snippet,snippetMatch:F===void 0?null:F.match,run(){g("uiWorkspace").openSession(W)}}}function b(){return m().slice(0,a).map(_=>C(_))}function h(_,F){let W=_.toLowerCase(),Z=m(),S={},P={};for(let z=0;z<F.length;z++)P[F[z].sessionId]=F[z];let H=[],q=new Set;for(let z=0;z<Z.length;z++){let O=Z[z];S[O.summary.id]=O,(O.summary.displayTitle.toLowerCase().includes(W)||O.workspace.toLowerCase().includes(W))&&(q.add(O.summary.id),H.push(C(O,P[O.summary.id])))}for(let z=0;z<F.length;z++){let O=F[z],j=S[O.sessionId];j===void 0||q.has(O.sessionId)||(q.add(O.sessionId),H.push(C(j,O)))}return H}function A(_,F){let W=_===""?aa:`${aa}?q=${encodeURIComponent(_)}`;return fetch(W,{credentials:"same-origin",headers:{accept:"application/json"},signal:F}).then(Z=>Z.json().then(S=>{if(!Z.ok||!S.ok)throw new Error(`session search answered ${Z.status}: ${S.error}`);return S.sessions??[]}))}function w(){let _=g("workspaces");return _?_.list.getSnapshot().items.map(W=>({kind:"project",id:`project:${W.workspaceId}`,title:W.title,detail:W.path,label:W.path,run(){g("uiWorkspace").startSession(W.workspaceId)}})):[]}function d(_){let F=g("locale");return _===void 0||!F?"":F.resolveText(_)}function i(_){let F=_.lastIndexOf("/");return F===-1?_:_.slice(F+1)}function p(){return o===null?[]:o.map(_=>{let F=_.meta&&d(_.meta.title)||i(_.name);return{kind:"plugin",id:`plugin:${_.name}`,title:F,detail:_.meta&&d(_.meta.description)||_.description||"",image:_.meta&&typeof _.meta.icon=="string"?_.meta.icon:"",label:_.name,run(){g("pluginNavigation").openBundle(_.name)}}})}function f(_){let F=g("remote.pluginInventory"),W=g("remote.pluginManager");return!F||!W||!g("pluginNavigation")?(o=[],Promise.resolve()):F.list().then(Z=>{if(!Z.ok)throw new Error(Z.error?.message??"the plugin inventory answered without a reason");return Z.value.managementAvailable!==!0?[]:W.listBundles().then(S=>{if(!S.ok)throw new Error(S.error?.message??"the plugin manager answered without a reason");return S.value.filter(P=>P.error===void 0)})}).then(Z=>{_===r&&(o=Z.slice().sort((S,P)=>i(S.name).localeCompare(i(P.name))))})}function v(){let _=g("sessions");if(!_)return null;let F=Pn(e,_);if(typeof F!="string")return null;let W=_.binding(F);return!W||!W.session||W.session.getSnapshot().openState!=="open"?null:{id:F,binding:W}}function k(_,F){let W=_.ctx.get("conversation");if(!W)throw new Error("search: the conversation service is not available");let Z=W.input.for(_.ctx),S=Z.state.getSnapshot().draft;Z.setDraft(`/${F} ${S.replace(/^\s+/,"")}`),Z.focus()}function E(){if(s===null||l===null)return[];let _=g("sessions"),F=_?_.binding(l):null;return F?s.map(W=>({kind:"skill",id:`skill:${W.name}`,title:`/${W.name}`,detail:W.description||"",label:W.description||"",run(){k(F,W.name)}})):[]}function T(_){let F=v(),W=g("remote.skills");return F===null||!W?(s=[],l=null,Promise.resolve()):W.list({sessionId:F.id}).then(Z=>{if(!Z.ok)throw new Error(Z.error?.message??"the skill catalog answered without a reason");_===r&&(s=Z.value.skills,l=F.id)})}function R(){let _=g("shortcuts");if(!_)return[];let F=[],W=new Set,Z=S=>{let P=S.label;W.has(S.id)||P===void 0||P===""||(W.add(S.id),F.push({kind:"shortcut",id:`shortcut:${S.id}`,title:P,keys:S.keys,label:(S.aliases||[]).join(" "),run(){y(P)}}))};return _.catalog.getSnapshot().forEach(Z),_.fixedCatalog.getSnapshot().forEach(Z),F}function N(){let _=[{kind:"action",id:"action:new-session",icon:"newSession",title:se("searchActionNewSession","New session"),keys:c("session.new"),run(){g("uiWorkspace").startSession()}}];return g("pluginNavigation")&&_.push({kind:"action",id:"action:plugins",icon:"plugin",title:se("searchActionPlugins","Plugins"),run(){g("layout").selectPanel("plugins")}}),u("sidebar.settings")!==null&&_.push({kind:"action",id:"action:settings",icon:"settings",title:se("searchActionSettings","Settings"),keys:c("settings.open"),run(){u("sidebar.settings")?.actions.open()}}),u("shell.overlay","shortcuts")!==null&&_.push({kind:"action",id:"action:shortcuts",icon:"shortcut",title:se("searchActionShortcuts","Keyboard shortcuts"),keys:c("shortcuts.open"),run(){y("")}}),_}function L(_,F){if(F==="")return _;let W=F.toLowerCase(),Z=[];for(let S=0;S<_.length;S++){let P=_[S].title.toLowerCase(),H=P.indexOf(W),q=-1;H===0?q=0:H>0&&/[\s\-_/.:]/.test(P.charAt(H-1))?q=1:H>0?q=2:_[S].label?.toLowerCase().includes(W)&&(q=3),q!==-1&&Z.push({row:_[S],score:q,index:S})}return Z.sort((S,P)=>S.score-P.score||S.index-P.index),Z.map(S=>S.row)}function D(_){r++;let F=r;o=null,s=null,l=null;let W=()=>{F===r&&_()};A("",void 0).then(()=>{},Z=>{console.warn("dsh-claude-style: session content search could not prepare:",Z)}),f(F).then(W,Z=>{console.warn("dsh-claude-style: search could not list plugins:",Z),F===r&&(o=[]),W()}),T(F).then(W,Z=>{console.warn("dsh-claude-style: search could not list skills:",Z),F===r&&(s=[]),W()})}function V(){r++}function Y(_,F,W){let Z=[],S=(H,q,z)=>{z.length>0&&Z.push({kind:H,title:q,rows:z})},P=H=>F==="all"?t[H]:n;if(_===""&&F==="all")return S("session",se("searchRecents","Recents"),b()),S("action",se("searchActions","Actions"),N()),Z;if(F==="all"||F==="session"){let H=_===""?m().map(q=>C(q)):h(_,W);S("session",se("searchSessions","Sessions"),H.slice(0,P("session")))}return(F==="all"||F==="project")&&S("project",se("searchProjects","Projects"),L(w(),_).slice(0,P("project"))),(F==="all"||F==="plugin")&&S("plugin",se("searchPlugins","Plugins"),L(p(),_).slice(0,P("plugin"))),(F==="all"||F==="skill")&&S("skill",se("searchSkills","Skills"),L(E(),_).slice(0,P("skill"))),(F==="all"||F==="shortcut")&&S("shortcut",se("searchShortcuts","Shortcuts"),L(R(),_).slice(0,P("shortcut"))),F==="all"&&S("action",se("searchActions","Actions"),L(N(),_)),Z}function B(_){return _==="plugin"?o===null:_==="skill"?s===null:_==="all"?o===null||s===null:!1}return{open:D,close:V,sections:Y,searchContent:A,pending:B}}function sc(e,t){let n=nc(e),a=[{id:"all",key:"searchFilterAll",fallback:"All"},{id:"session",key:"searchFilterSessions",fallback:"Sessions"},{id:"project",key:"searchFilterProjects",fallback:"Projects"},{id:"plugin",key:"searchFilterPlugins",fallback:"Plugins"},{id:"skill",key:"searchFilterSkills",fallback:"Skills"},{id:"shortcut",key:"searchFilterShortcuts",fallback:"Shortcuts"}],o=250,s='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',l={search:`${s}<circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 13.5 13.5"/></svg>`,session:`${s}<path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.2 3 6.8 13"/></svg>`,project:`${s}<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6l1.4 1.5h5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"/></svg>`,plugin:`${s}<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/></svg>`,skill:`${s}<path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8 6.7 6.7z"/></svg>`,shortcut:`${s}<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4.2 6.6h.1M6.7 6.6h.1M9.2 6.6h.1M11.7 6.6h.1M4.8 9.4h6.4"/></svg>`,newSession:`${s}<circle cx="8" cy="8" r="6"/><path d="M8 5.5v5M5.5 8h5"/></svg>`,settings:`${s}<path d="M2.5 5h6.2M11.8 5h1.7M2.5 11h1.7M7.3 11h6.2"/><circle cx="10.2" cy="5" r="1.5"/><circle cx="5.8" cy="11" r="1.5"/></svg>`,close:`${s}<path d="M4 4l8 8M12 4l-8 8"/></svg>`,enter:`${s}<path d="M13 3.5v4a2 2 0 0 1-2 2H3.5M6 7 3.5 9.5 6 12"/></svg>`},r=null,g=Ae("data-dsh-claude-search-row"),c=null,u=!1,y=!1,x=0,m=null,C=140,b=Ae("data-dsh-claude-search-closing"),h='[data-slot="sidebar"] [class*="_searchSlot"]',A=null,w=null,d=null,i=null,p=st('[aria-checked="true"]'),f="",v="all",k=[],E=0,T=[],R="",N=null,L=0,D=!1;function V(){let I=U("button","dsh-claude-search-trigger");I.type="button";let ee=U("span","dsh-claude-search-trigger-icon");return ee.innerHTML=l.search,I.appendChild(ee),I.appendChild(U("span","dsh-claude-search-trigger-label")),I.appendChild(U("span","dsh-claude-search-keys")),I.addEventListener("click",M=>{M.preventDefault(),M.stopPropagation(),ue()}),I}function Y(){let I=document.querySelector('[data-slot="sidebar"] [class*="_logoRow"] > [class*="_brand"]'),ee=I===null?null:I.parentElement;if(I===null||ee===null){r!==null&&r.parentElement!==null&&r.parentElement.removeChild(r),g.release();return}r===null&&(r=V()),r.parentElement!==ee&&ee.insertBefore(r,I.nextSibling),g.mark(ee);let M=se("searchPlaceholder","Search"),Q=r.children[1];Q.textContent!==M&&(Q.textContent=M),ye(r,"aria-label",M),_(r.children[2])}let B=null;function _(I){let ee=e.get("shortcuts"),M=[];if(ee){let te=ee.catalog.getSnapshot();for(let ce=0;ce<te.length;ce++)te[ce].id==="session.search"&&(M=te[ce].keys.filter(be=>be!=="+"))}let Q=M.join(`
`);if(!(Q===B&&I.childNodes.length===M.length)){for(B=Q;I.firstChild;)I.removeChild(I.firstChild);for(let te=0;te<M.length;te++)I.appendChild(U("kbd","dsh-claude-search-key",M[te]))}}function F(){Y()}function W(I){I.tagName!=="INPUT"||I.closest(h)===null||(I.blur(),u?w.focus():ue(),Z(3))}function Z(I){he({write(){if(D)return;let ee=document.querySelector(`${h} [class*="_clearButton"]`);if(ee!==null){ee.click();return}I>1&&Z(I-1)}})}function S(){c===null&&(c=oc.createRoot(document.createElement("div"))),c.render(tr.createElement(ac.Modal,{open:u||y,onClose:pe,title:se("searchPlaceholder","Search"),headless:!0,shortcutModal:"dsh-claude-search",className:"dsh-claude-search-dialog"},tr.createElement("div",{className:"dsh-claude-search",ref:P})))}function P(I){if(I===null){p.sync(null),A=null,w=null,d=null,i=null;return}if(I===A)return;A=I;let ee=H(I);re(),ee.focus()}function H(I){let ee=U("div","dsh-claude-search-head"),M=U("input","dsh-claude-search-input");w=M,M.type="text",M.spellcheck=!1,M.setAttribute("autocomplete","off"),M.setAttribute("data-modal-autofocus",""),M.placeholder=se("searchPlaceholder","Search"),M.value=f,M.addEventListener("input",()=>{u&&(f=M.value,E=0,$(),re())}),M.addEventListener("keydown",ne),ee.appendChild(M);let Q=U("button","dsh-claude-search-close");Q.type="button",Q.setAttribute("aria-label",se("searchClose","Close")),Q.innerHTML=l.close,Q.addEventListener("click",pe),ee.appendChild(Q),I.appendChild(ee);let te=U("div","dsh-claude-search-filters");d=te,te.setAttribute("role","radiogroup");for(let we=0;we<a.length;we++){let Ne=U("button","dsh-claude-search-filter",se(a[we].key,a[we].fallback));Ne.type="button",Ne.tabIndex=-1,Ne.setAttribute("role","radio"),Ne.setAttribute("data-filter",a[we].id),Ne.addEventListener("click",()=>{O(a[we].id),M.focus()}),te.appendChild(Ne)}I.appendChild(te);let ce=U("div","dsh-claude-search-list");i=ce,ce.setAttribute("role","listbox"),I.appendChild(ce);let be=U("div","dsh-claude-search-foot");return be.appendChild(q(se("searchClose","Close"),["Esc"])),be.appendChild(q(se("searchFilterHint","Filters"),["Tab"])),be.appendChild(q(se("searchOpenHint","Open"),["↵"])),I.appendChild(be),M}function q(I,ee){let M=U("span","dsh-claude-search-hint",I);return M.appendChild(z(ee)),M}function z(I){let ee=U("span","dsh-claude-search-keys");for(let M=0;M<I.length;M++)I[M]!=="+"&&ee.appendChild(U("kbd","dsh-claude-search-key",I[M]));return ee}function O(I){I!==v&&(v=I,E=0,$(),re())}function j(I){let ee=0;for(let M=0;M<a.length;M++)a[M].id===v&&(ee=M);O(a[(ee+I+a.length)%a.length].id)}function ne(I){if(!(!u||I.isComposing||I.keyCode===229)){if(I.key==="ArrowDown"||I.key==="ArrowUp"){if(I.preventDefault(),k.length===0)return;E=(E+(I.key==="ArrowDown"?1:-1)+k.length)%k.length,J(!0);return}if(I.key==="Tab"){I.preventDefault(),j(I.shiftKey?-1:1);return}I.key==="Enter"&&(I.preventDefault(),!I.repeat&&k[E]!==void 0&&de(k[E]))}}function G(){return f.trim()}function $(){let I=G(),ee=I!==""&&(v==="all"||v==="session");ee&&I===R||(window.clearTimeout(L),N!==null&&N.abort(),N=null,T=[],R="",ee&&(L=window.setTimeout(()=>{let M=new AbortController;N=M,n.searchContent(I,M.signal).then(Q=>{M.signal.aborted||(T=Q,R=I,re())},Q=>{M.signal.aborted||(console.warn("dsh-claude-style: session content search failed:",Q),T=[],R=I,re())})},o)))}function K(I,ee){let M=U("div","dsh-claude-search-item");M.setAttribute("role","option"),M.setAttribute("data-kind",I.kind),M.setAttribute("data-index",String(ee));let Q=U("span","dsh-claude-search-item-icon");if(I.image){let we=U("img","dsh-claude-search-item-image");we.alt="",we.src=I.image,Q.appendChild(we)}else{let we=(I.icon===void 0?void 0:l[I.icon])??l[I.kind];we!==void 0&&(Q.innerHTML=we)}M.appendChild(Q);let te=U("span","dsh-claude-search-item-text"),ce=U("span","dsh-claude-search-item-line");if(ce.appendChild(U("span","dsh-claude-search-item-name",I.title)),I.detail&&ce.appendChild(U("span","dsh-claude-search-item-detail",I.detail)),te.appendChild(ce),I.snippet){let we=U("span","dsh-claude-search-item-snippet");if(I.snippetMatch){let[Ne,pt]=I.snippetMatch;we.append(I.snippet.slice(0,Ne),U("mark","dsh-claude-search-item-match",I.snippet.slice(Ne,pt)),I.snippet.slice(pt))}else we.textContent=I.snippet;te.appendChild(we)}M.appendChild(te),I.keys&&I.keys.length>0&&M.appendChild(z(I.keys));let be=U("span","dsh-claude-search-item-enter");return be.innerHTML=l.enter,M.appendChild(be),M.addEventListener("mousemove",()=>{E!==ee&&(E=ee,J(!1))}),M.addEventListener("click",()=>de(I)),M}function J(I){if(i===null)return;let ee=i.querySelectorAll(".dsh-claude-search-item");for(let M=0;M<ee.length;M++){let Q=M===E;ee[M].hasAttribute("data-active")!==Q&&ee[M].toggleAttribute("data-active",Q),Q&&I&&ee[M].scrollIntoView({block:"nearest"})}}function re(){if(A===null||d===null||i===null)return;for(let M=0;M<d.children.length;M++){let Q=d.children[M],te=Q.getAttribute("data-filter")===v;Q.getAttribute("aria-checked")!==String(te)&&Q.setAttribute("aria-checked",String(te))}p.sync(d);let I=G(),ee=n.sections(I,v,R===I?T:[]);for(k=[];i.firstChild;)i.removeChild(i.firstChild);for(let M=0;M<ee.length;M++){let Q=ee[M];i.appendChild(U("div","dsh-claude-search-section",Q.title));for(let te=0;te<Q.rows.length;te++)i.appendChild(K(Q.rows[te],k.length)),k.push(Q.rows[te])}if(k.length===0){let M=n.pending(v)||I!==""&&R!==I&&(v==="all"||v==="session");i.appendChild(U("div","dsh-claude-search-status",M?se("searchLoading","Searching…"):se("searchEmpty","No results")))}E>=k.length&&(E=Math.max(0,k.length-1)),J(!0)}function de(I){pe(I.run)}function ue(){if(!u){if(_e("search"),f="",v="all",E=0,T=[],R="",n.open(()=>{u&&re()}),u=!0,y){let I=X();b.release(),I!==null&&I(),w.value="",re(),w.focus();return}S()}}function pe(I){u&&(u=!1,y=!0,m=typeof I=="function"?I:null,window.clearTimeout(L),N!==null&&N.abort(),N=null,n.close(),b.mark(A===null||A.parentElement===null?null:A.parentElement.parentElement),x=window.setTimeout(ae,C))}function X(){window.clearTimeout(x),y=!1;let I=m;return m=null,I}function ae(){let I=X();S(),he({write(){b.release(),I!==null&&!D&&I()}})}return Oe("search",pe),t.search={sync:F,onFocusIn:W},()=>{D=!0,Pe("search"),X(),b.release(),window.clearTimeout(L),N!==null&&N.abort(),n.close(),p.release(),c!==null&&(c.unmount(),c=null),r!==null&&r.parentElement!==null&&r.parentElement.removeChild(r),r=null,g.release(),delete t.search}}function rc(e,t){let n="data-dsh-claude-turn-state",a="data-dsh-claude-turn-status",o="--dsh-claude-turn-order",l=new Map,r=new Map,g=new Map;function c(w,d){l.forEach((i,p)=>{let f=w.get(p);i.forEach((v,k)=>{(f===void 0||!f.has(k))&&p.removeAttribute(k)})}),w.forEach((i,p)=>{i.forEach((f,v)=>{ye(p,v,f)})}),r.forEach((i,p)=>{d.has(p)||(p.style.removeProperty(o),p.style.length===0&&p.removeAttribute("style"))}),d.forEach((i,p)=>{let f=String(i);p.style.getPropertyValue(o)!==f&&p.style.setProperty(o,f)}),l=w,r=d}function u(w){let d=nn(e,w);return d===null?null:d.getSnapshot()??null}function y(w,d,i){let p=Math.max(0,Math.floor(w/1e3)),f=Math.floor(p/3600),v=Math.floor(p/60)%60,k=p%60;return f>0?d("duration.hours",{hours:f,minutes:Ut(v),seconds:i?Ut(k):String(k)}):v>0?d("duration.minutes",{minutes:v,seconds:i?Ut(k):String(k)}):d("duration.seconds",{seconds:k})}function x(w){let d=0;for(let i=0;i<w.steps.length;i++){let p=w.steps[i].data.get("assistant-step"),f=p===void 0?void 0:p.usage;f&&typeof f.outputTokens=="number"&&(d+=f.outputTokens)}return d}function m(w){if(w===void 0)return null;if(w.status==="open")return"live";let d=w.status==="closed"&&w.end!==void 0?w.end.data.reason.kind:null;return d==="aborted"?"stopped":d==="error"?"failed":null}function C(w,d,i,p,f){let v=Fa(d,i);if(v!==null&&v.kind==="assistant"){let k=v.assistant,E=g.get(w);(E===void 0||E.step!==k.step)&&(E={step:k.step,from:null,until:null},g.set(w,E));let T=v.newest;return T==="reasoning"?(E.from===null&&(E.from=p),E.until=null,se("turnStatusThinking","Thinking…")):(E.from!==null&&E.until===null&&(E.until=p),T===null?se("turnStatusWaiting","Waiting for the model…"):E.from!==null?se("turnStatusThought","Thought for {duration}",{duration:y(Math.max(1e3,E.until-E.from),f,!1)}):T==="tool-call"?se("turnStatusToolCall","Preparing a tool call…"):se("turnStatusWriting","Writing…"))}return v!==null&&v.kind==="tools"?se("turnStatusTools","Running tools…"):se("turnStatusWaiting","Waiting for the model…")}function b(w,d,i,p,f){let v=[],k=x(i),E=k>0?se("turnStatusTokens","{count} tokens",{count:Xe(k)}):null;if(p==="live"){let T=Date.now();i.start!==void 0&&v.push(y(Math.max(1e3,T-i.start.time),f,!1)),E!==null&&v.push(E),v.push(C(w,d,i,T,f))}else v.push(f(p==="stopped"?"message.stopped":"message.turnProcess.failed")),i.start!==void 0&&i.end!==void 0&&v.push(y(Math.max(1e3,i.end.time-i.start.time),f,!0)),E!==null&&v.push(E);return v.join(" · ")}function h(w,d,i,p,f){let v=Qe(Pa(w));if(!v)return;let k=w.children,E,T=new Map;for(let L=0;L<k.length;L++){if(k[L].getAttribute(Ht)!=="turn-process")continue;let D=Ql(k[L]);if(D===null)continue;if(E===void 0&&(E=u(v)),E===null)return;let V=k[L].getAttribute(Rn),Y=E.timeline.turns.get(Number(V)),B=m(Y);if(B===null||Y===void 0)continue;let _=`${v}:${V}`;B==="live"&&p.add(_),d.set(D,new Map([[n,B],[a,b(_,E,Y,B,f)]]));let F=-1;for(let W=L+1;W<k.length;W++)k[W].getAttribute(Rn)===V&&k[W].getAttribute(Ht)!=="turn-tail"&&(F=W);F!==-1&&T.set(F,k[L])}if(T.size===0)return;let R=new Set(T.values()),N=0;for(let L=0;L<k.length;L++){if(R.has(k[L]))continue;N>0&&i.set(k[L],2*N);let D=T.get(L);D!==void 0&&(i.set(D,2*N+1),N++)}}function A(){let w=new Map,d=new Map,i=new Set,p=e.get("locale");if(p){let f=p.bind("chat"),v=Kl();for(let k=0;k<v.length;k++)h(v[k],w,d,i,f)}c(w,d),g.forEach((f,v)=>{i.has(v)||g.delete(v)})}return t.turnStatus={sync:A},()=>{c(new Map,new Map),g.clear(),delete t.turnStatus}}function lc(e){let n=null,a=null,o=[],s=0,l=null,r=!1;function g(){let A=Ke();return n!==null&&n.isConnected&&Pa(n)===A||(n=A===null?null:A.querySelector(Zr)),n}function c(A){return A.getClientRects().length>0}function u(A){let w=A.querySelector(ns);return w===null?-1:Math.round((w.scrollHeight-2*(as-ga/2))/ga)}function y(A,w){let d=A.querySelector(fa);return d===null||u(A)!==w.length?-1:Number(d.dataset.index)}function x(A){let w=e.get("sessions")?.binding(A)?.session?.projections?.faceOf("turnOutline");return typeof w?.getSnapshot=="function"?w.getSnapshot():void 0}function m(A){let w=nn(e,A),d=w===null?void 0:w.getSnapshot()?.navigation;return typeof d?.items=="function"?d.items():[]}function C(A){let w=x(A),d=m(A);if(a!==null&&a.sessionId===A&&a.outline===w&&a.loaded===d)return o;let i=new Map;if(Array.isArray(w))for(let p of w)typeof p!="object"||p===null||!Number.isSafeInteger(p.turn)||p.turn<0||!Number.isSafeInteger(p.seq)||p.seq<0||Object.is(p.seq,-0)||i.set(p.turn,{turn:p.turn,prompt:typeof p.prompt=="string"?p.prompt:"",loaded:!1});for(let p of d){let f=i.get(p.turn);i.set(p.turn,{turn:p.turn,prompt:p.prompt!==""?p.prompt:f?.prompt??"",loaded:!0})}return a={sessionId:A,outline:w,loaded:d},o=[...i.values()].sort((p,f)=>p.turn-f.turn),o}function b(){let A=e.get("locale");return typeof A?.bind=="function"?A.bind("chat"):null}function h(A,w){let d=++s;l!==null&&l(),l=null;let i=0,p=!1,f=()=>{if(l=null,r||d!==s)return;let v=g(),k=Qe(Ke());if(v===null||k===null)return;let E=C(k),T=E.findIndex(R=>R.turn===A);if(!(T<0)){if(u(v)===E.length){let R=v.querySelector(`${el}[data-index="${T}"]`);if(R!==null){let N=fe(v,Ie),L=N===null?null:N.scrollTop;R.click(),w(N,L);return}if(!p){let N=v.querySelector(ns);N.scrollTop=T*ga+as-N.clientHeight/2,p=!0}}if(++i>30)throw new Error(`dsh-claude-style: the turn rail never rendered mark ${T} of ${E.length} (it holds ${u(v)})`);l=he({write:f})}};f()}return{findRail:g,railShown:c,turnItems:C,currentIndex:y,jumpToTurn:h,chatText:b,stop(){r=!0,l!==null&&l(),l=null,n=null}}}function ic(e,t){let n="data-dsh-claude-turn-nav-replaced",a="data-dsh-claude-turn-nav-open",o="data-dsh-claude-turn-nav-landed",s="turnNav",y=wl,x=lc(e),m=null,C=null,b=null,h=null,A=0,w=null,d=-1,i=null,p=null,f=null,v=!1,k=null,E=null,T=null,R=null,N=null,L=!1;function D(){if(m!==null)return m;let X=U("div","dsh-claude-turn-rail");return X.setAttribute("aria-hidden","true"),X.setAttribute(Ue,""),C=U("div","dsh-claude-turn-rail-track"),X.appendChild(C),X.addEventListener("pointerenter",j),m=X,X}function V(X){let ae=D();b!==X&&(b!==null&&b.removeAttribute(n),b=X,X.setAttribute(n,""),w=null,d=-1),ae.parentElement!==X.parentElement&&X.parentElement.appendChild(ae)}function Y(){ne(),b!==null&&b.removeAttribute(n),b=null,m!==null&&m.parentElement!==null&&m.remove(),h=null,w=null,d=-1}function B(X){if(h===X)return;h=X;let ae=document.createDocumentFragment();for(let I=0;I<X.length;I++){let ee=U("span","dsh-claude-turn-rail-mark");ee.style.top=`${I*24}px`,X[I].loaded||ee.setAttribute("data-unloaded",""),ae.appendChild(ee)}C.replaceChildren(ae),C.style.height=`${X.length*24}px`,m.style.setProperty("--dsh-claude-turn-rail-height",`${X.length*24}px`),d=-1,w=null}function _(X){let ae=m.clientHeight,I=Math.max(0,h.length*24-ae);A=Math.round(Math.min(Math.max(X,0),I)),C.style.transform=`translateY(${-A}px)`,m.toggleAttribute("data-fade-top",A>0),m.toggleAttribute("data-fade-bottom",A<I)}function F(){if(d<0||v||m===null)return;let X=m.clientHeight,ae=d*24;ae>=A+24&&ae+48<=A+X||_(ae-(X-24)/2)}function W(X,ae){let I=X.querySelector(fa);if(I===w&&(I===null||Number(I.dataset.index)===d))return;w=I;let ee=x.currentIndex(X,ae);ee!==d&&(Z(C,d,ee),v&&Z(p,d,ee),d=ee,F())}function Z(X,ae,I){let ee=ae<0?void 0:X.children[ae];ee!==void 0&&ee.removeAttribute("data-current");let M=I<0?void 0:X.children[I];M!==void 0&&M.setAttribute("data-current","")}function S(){k===null&&(k=he({write(){k=null,!(b===null||h===null)&&(W(b,h),v&&O())}}))}function P(){if(m===null)throw new Error("dsh-claude-style: the turn rail is not built");return m}function H(){if(i===null)throw new Error("dsh-claude-style: the turn card is not built");return i}function q(){if(i!==null)return;let X=U("div","dsh-claude-popover-card dsh-claude-turn-nav");X.setAttribute("data-open","false"),X.setAttribute(Ue,"");let ae=U("div","dsh-claude-turn-nav-list");X.appendChild(ae),X.addEventListener("mouseenter",()=>{G.cancel()}),X.addEventListener("mouseleave",()=>{G.scheduleClose()}),ae.addEventListener("click",$),ae.addEventListener("scroll",()=>{v&&_(ae.scrollTop)},{passive:!0}),i=X,p=ae}function z(X,ae,I){if(f===ae)return;f=ae;let ee=document.createDocumentFragment();for(let M=0;M<ae.length;M++){let Q=ae[M],te=U("button","dsh-claude-turn-nav-row");te.type="button",te.dataset.index=String(M),te.setAttribute("aria-label",I("chat.turnNavigation.jump",{turn:Q.turn})),Q.loaded||te.setAttribute("data-unloaded",""),M===d&&te.setAttribute("data-current",""),te.appendChild(U("span","dsh-claude-turn-nav-text",Q.prompt!==""?Q.prompt:I("chat.turnNavigation.turn",{turn:Q.turn}))),te.appendChild(U("span","dsh-claude-turn-nav-dash")),ee.appendChild(te)}X.replaceChildren(ee)}function O(){let X=P(),ae=H(),I=ae.querySelector(":scope > .dsh-claude-turn-nav-list"),ee=X.parentElement;ae.parentElement!==ee&&ee.appendChild(ae);let M=ee.getBoundingClientRect(),Q=X.getBoundingClientRect(),te=getComputedStyle(ae),ce=I.firstElementChild,be=ce===null?0:parseFloat(getComputedStyle(ce).paddingRight),we=`${M.right-Q.right-parseFloat(te.borderRightWidth)-parseFloat(te.paddingRight)-be}px`,Ne=`${Q.top-M.top-parseFloat(te.borderTopWidth)-parseFloat(te.paddingTop)}px`,pt=`${Q.height}px`;ae.style.right!==we&&(ae.style.right=we),ae.style.top!==Ne&&(ae.style.top=Ne),I.style.height!==pt&&(I.style.height=pt),I.scrollTop!==A&&(I.scrollTop=A)}function j(){if(G.cancel(),v||b===null||h===null)return;let X=x.chatText();X!==null&&(_e(s),q(),z(p,h,X),v=!0,P().setAttribute(a,""),H().setAttribute("data-open","true"),O())}function ne(){G.cancel(),v&&(v=!1,H().setAttribute("data-open","false"),m!==null&&(m.removeAttribute(a),F()))}let G=He(j,ne,0,Ve);function $(X){let ae=fe(X.target,".dsh-claude-turn-nav-row");if(ae===null||f===null)return;let I=f[Number(ae.dataset.index)];I!==void 0&&J(I.turn)}function K(X,ae){if(X===null||ae===null||Re())return;let I=X.scrollTop;Math.abs(I-ae)<=1||Dt(X,ae,"jump")&&Ns(X,"jump",()=>I,()=>{if(L)return!1;let ee=Di(X);return ee===null||Math.abs(X.scrollTop-ee)<=1.5},480)}function J(X){x.jumpToTurn(X,(ae,I)=>{ae!==null&&zi(ae),K(ae,I),T={turn:X,since:Date.now()},de(),S()})}function re(){N!==null&&(clearTimeout(N),N=null),R!==null&&(R.removeAttribute(o),R=null)}function de(){if(T===null)return;if(Date.now()-T.since>1e4){T=null;return}let X=Ke(),ae=X===null?null:X.querySelector(`[${Rn}="${T.turn}"]:not([hidden]):not([hidden] *)`);ae!==null&&(T=null,re(),ae.setAttribute(o,""),R=ae,N=setTimeout(re,1500))}function ue(X){return X instanceof Element?X.tagName==="SELECT"?!0:X instanceof HTMLInputElement||X instanceof HTMLTextAreaElement?X.value!=="":X instanceof HTMLElement&&X.isContentEditable?(X.textContent||"").trim()!=="":!1:!1}function pe(X){if(X.key!=="ArrowUp"&&X.key!=="ArrowDown"||!X.altKey||X.ctrlKey||X.metaKey||X.shiftKey||X.isComposing||document.head.querySelector(y)!==null||ue(X.target)||document.querySelector(cl)!==null)return;let ae=x.findRail(),I=Qe(Ke());if(ae===null||I===null||!x.railShown(ae))return;let ee=x.turnItems(I),M=Date.now(),Q=E,te=Q!==null&&Q.sessionId===I&&M-Q.at<1200?ee.findIndex(be=>be.turn===Q.turn):x.currentIndex(ae,ee),ce=X.key==="ArrowDown"?te<0?0:te+1:te-1;ce<0||ce>=ee.length||(X.preventDefault(),E={sessionId:I,turn:ee[ce].turn,at:M},J(ee[ce].turn))}return Oe(s,ne),t.turnNav={sync(){let X=x.findRail(),ae=Qe(Ke()),I=x.chatText();if(X===null||ae===null||I===null)Y();else{let ee=x.turnItems(ae);V(X);let M=h!==ee;B(ee),M&&_(A),W(X,ee),v&&M&&(z(p,ee,I),S())}de()},owns(X){return i!==null&&i.contains(X)||m!==null&&m.contains(X)},close(){ne()},onKey:pe,onCopyChange(){f=null},reposition(){b!==null&&S()}},()=>{L=!0,x.stop(),k!==null&&k(),k=null,Y(),m=null,C=null,re(),T=null,i!==null&&i.remove(),i=null,p=null,f=null,Pe(s),delete t.turnNav}}var D1=40,V1=500;function dc(){let e=cn(),t=new Map,n=!1,a=c=>c.hasAttribute("hidden")||c.closest("["+Sn+"]")!==null?!1:c.scrollHeight-c.clientHeight>0,o=c=>c.scrollHeight-c.clientHeight-c.scrollTop,s=c=>{Bt(c)||a(c)&&(o(c)<=D1||Gn(c,"process",()=>!n&&a(c)))},l=c=>{for(let u of c){let y=u.target;if(!(y instanceof HTMLElement))continue;let x=y.closest(tt);x!==null&&s(x)}},r=()=>{let c=new Set(document.querySelectorAll(tt));for(let u of c){let y=u.querySelector(Jr),x=t.get(u);if(x===void 0)x={content:null,stopBody:De(u,l),stopContent:null},t.set(u,x);else if(x.content===y)continue;x.stopContent!==null&&x.stopContent(),x.content=y,x.stopContent=y===null?null:De(y,l)}for(let[u,y]of[...t]){if(c.has(u)){u.hasAttribute("hidden")&&Fs(u);continue}t.delete(u),Fs(u),y.stopBody(),y.stopContent!==null&&y.stopContent(),Wn(u,"process")}},g=window.setInterval(r,V1);return r(),()=>{n=!0,window.clearInterval(g);for(let[c,u]of t)u.stopBody(),u.stopContent!==null&&u.stopContent(),Wn(c,"process");t.clear(),e()}}var cc=Yr+", "+Kr,uc=We+", "+Tn,U1=200,G1=2e3,W1=150,q1=4,j1="data-dsh-claude-follow-tail",Y1=12,hc="--dsh-claude-follow-tail-left",pc="--dsh-claude-follow-tail-bottom";function K1(){let e=null,t=-1/0;for(let n of document.querySelectorAll(dt)){let a=n.getBoundingClientRect();a.width===0&&a.height===0||a.top>t&&(t=a.top,e=n)}return e}function mc(e){let t=zn(),n=t===null?null:K1(),a=t===null?null:yt();if(t===null||n===null||a===null){e.release();return}e.mark(t);let o=n.getBoundingClientRect(),s=a.getBoundingClientRect(),l=`${Math.round(s.left+s.width/2)}px`,r=`${Math.round(window.innerHeight-o.top+Y1)}px`;t.style.getPropertyValue(hc)!==l&&t.style.setProperty(hc,l),t.style.getPropertyValue(pc)!==r&&t.style.setProperty(pc,r)}function Q1(e){let t=cn(),n=0,a=0,o=!1,s=!1,l=!1,r=()=>{let T=yt();return T!==null&&Bt(T)},g=()=>document.querySelector(uc)!==null||performance.now()-a<=G1,c=null,u=null,y=null,x=0,m=!1,C=()=>document.querySelector(uc)!==null,b=()=>!(Re()||Za()||!C()||r()||e()),h=()=>!Re()&&!e(),A=()=>{let T=document.querySelector(je);if(T===u||(y!==null&&y(),y=null,u=T,T===null))return;x=T.offsetHeight;let R=[T],N=T.closest(Ie);if(N!==null){R.push(N);let L=N.querySelector($t);L!==null&&R.push(L)}y=De(R,d,{afterHost:!0})},w=T=>{if(!b()){m&&(m=!1,dn());return}A();let R=yt();R!==null&&(m=!0,c=R,Ui(),Vi(R,T),R.scrollHeight-R.clientHeight-R.scrollTop>.5&&Gn(R,"stream",h))},d=T=>{let R=0;for(let N of T){if(N.target!==u)continue;let L=N.borderBoxSize,D=L!==void 0&&L.length>0?L[0].blockSize:N.contentRect.height,V=D-x;x=D,V>0&&V<=Bn&&(R=V)}w(R)},i=T=>{if(r())return;let R=yt();if(R===null||b()||R.scrollHeight-R.clientHeight-R.scrollTop>R.clientHeight)return;if(e()){let L=typeof T=="number"?T:0;if(L>=q1)return;window.setTimeout(()=>i(L+1),W1);return}let N=performance.now();N-n<U1||(n=N,eo("follow",{stillWanted:()=>!r()}))},p=()=>{let T=s,R=l;s=!1,l=!1,!(!T&&!(R&&g()))&&i(0)},f=()=>{o||(o=!0,he({write(){o=!1,p()}}))},v=T=>T instanceof Element?T.matches(cc)||T.querySelector(cc)!==null:!1,k=T=>{for(let N of T){if(N.type==="attributes"){if(N.attributeName===ha){N.target instanceof Element&&!N.target.hasAttribute(ha)&&(l=!0);continue}N.oldValue===gt&&N.target instanceof Element&&N.target.matches(et)&&N.target.getAttribute("data-state")!==gt&&(a=performance.now(),s=!0);continue}for(let L of N.addedNodes)v(L)&&(a=performance.now(),s=!0)}(s||l)&&f(),T.some(N=>N.type==="characterData"||N.addedNodes.length>0||N.removedNodes.length>0)&&w()},E=ge(document.body,{subtree:!0,childList:!0,characterData:!0,attributeFilter:["data-state",ha],attributeOldValue:!0},k);return()=>{E(),y!==null&&y(),y=null,dn(),c!==null&&Wn(c,"stream"),c=null,u=null,t()}}function fc(e,t){let a=Q1(()=>t.chatFold!==void 0&&t.chatFold!==null&&t.chatFold.isBusy()),o=dc(),s=Ae(j1);return document.body.setAttribute(No,""),t.chatFollow={sync(){mc(s)},reposition(){mc(s)}},()=>{document.body.removeAttribute(No),s.release(),delete t.chatFollow,a(),o()}}var fn=200,nr=.9,bc=500,yc="[aria-haspopup]",X1=3,$1=50,J1=25,Z1=16.7,ar=0;function vc(){return performance.now()<ar}function or(){ar=performance.now()+fn+$1}function sr(e){let t=e.getBoundingClientRect(),n=Math.min(t.bottom,window.innerHeight);for(let a=e.parentElement;a!==null;a=a.parentElement){let o=window.getComputedStyle(a);o.overflowX==="visible"&&o.overflowY==="visible"||(n=Math.min(n,a.getBoundingClientRect().bottom))}return Math.max(0,Math.min(t.height,n-t.top))}function rr(e){let t=e.getAttribute("aria-controls");if(t!==null){let o=document.getElementById(t);return o instanceof HTMLElement?o:null}let n=e.parentElement,a=n===null?null:n.lastElementChild;return a instanceof HTMLElement&&a!==e?a:null}function wc(e){let t=e.getAttribute("aria-controls");if(t===null)return null;let n=document.getElementById(t);return n instanceof HTMLElement&&n.matches(tt)?n:null}function lr(e){let t=e.closest(Ie);return t===null?!1:t.scrollHeight-t.scrollTop-t.clientHeight<=Lt}function ir(e){let t=performance.now();return{atBottom:e,moved:()=>Bi(t)}}function gc(e){e.atBottom&&eo("fold",{stillWanted:()=>!e.moved()})}function $n(e,t){if(t==null){window.setTimeout(()=>{gc(e)},fn);return}let n=()=>{gc(e)};t.finished.then(n,n)}function dr(e){let t=0,n=0,a=Z1,o=()=>{let l=e.currentTime;return typeof l=="number"?l:0},s=l=>{if(e.playState!=="running")return;let r=t===0?0:l-t;if(r>J1){let g=n+a,c=o()-g;c>0&&(e.currentTime=g,ar+=c)}else r>0&&(a=r);t=l,n=o(),he({write:s})};he({write:s})}function cr(e,t,n){let a=typeof n=="number"?n:0;if(e()||a>=X1){t();return}he({write(){cr(e,t,a+1)}})}function ur(e){let t=e.style.overflow,n=e.style.boxSizing;return e.style.overflow="hidden",e.style.boxSizing="border-box",e.setAttribute(Bo,""),()=>{e.style.overflow=t,e.style.boxSizing=n,e.removeAttribute(Bo)}}var uo=0;function ho(){uo+=1}function po(){uo=Math.max(0,uo-1)}function kt(){return uo>0}var e0=200;function Ac(){let e=null,t=!1,n=!1,a=()=>Re(),o=y=>{t=!1,n=!0;try{y.click()}finally{n=!1}},s=(y,x)=>{or();let m=y.getBoundingClientRect().height;if(m<=x)return null;let C=Math.max(x,sr(y)),b=ur(y),h=y.animate(C>=m?[{height:String(x)+"px"},{height:String(m)+"px"}]:[{height:String(x)+"px",offset:0,easing:"ease-out"},{height:String(C)+"px",offset:nr,easing:"linear"},{height:String(m)+"px",offset:1}],{duration:fn,easing:"ease-out"});return dr(h),h.onfinish=()=>{h.cancel(),b()},h},l=y=>{or();let x=y.target.getBoundingClientRect().height,m=window.setTimeout(()=>{t=!1},fn+e0);if(x<=y.floor){window.clearTimeout(m),o(y.control),$n(y.watch);return}let C=Math.max(y.floor,sr(y.target)),b=ur(y.target),h=y.target.animate(C>=x?[{height:String(x)+"px"},{height:String(y.floor)+"px"}]:[{height:String(x)+"px",offset:0,easing:"linear"},{height:String(C)+"px",offset:1-nr,easing:"ease-out"},{height:String(y.floor)+"px",offset:1}],{duration:fn,easing:"ease-out",fill:"forwards"});dr(h),h.onfinish=()=>{window.clearTimeout(m),o(y.control),cr(y.collapsed,()=>{h.cancel(),b()}),$n(y.watch)}},r=()=>{let y=e;if(e=null,y===null)return;let x=y.watch;if(Date.now()-y.takenAt>bc||a())return;if(y.groupRoot!==null&&y.groupBody!==null){if(y.groupBody.hasAttribute("hidden"))return;$n(x,s(y.groupRoot,y.collapsedHeight));return}let m=rr(y.control);m!==null&&$n(x,s(m,0))},g=y=>{if(n)return;let x=y.target;if(!(x instanceof Element)||kt()&&x.closest(et)===null||x.closest(je)===null||x.closest(yc)!==null)return;if(t){y.stopPropagation(),y.preventDefault();return}e=null;let m=x.closest(os),C=m!==null?m:x.closest(ss);if(C===null||C.closest(rs)!==null)return;let b=wc(C),h=b===null?null:b.parentElement,A=h===null?null:h.closest(bt),w=b!==null?b:rr(C);if(w===null||w.hasAttribute("hidden")){e={control:C,groupBody:b,groupRoot:A,collapsedHeight:A===null?0:A.getBoundingClientRect().height,watch:ir(lr(C)),takenAt:Date.now()};return}if(a())return;y.stopPropagation(),y.preventDefault(),t=!0;let d=ir(lr(C)),i=b!==null?()=>b.hasAttribute("hidden"):()=>!w.isConnected;l({target:A!==null?A:w,floor:A===null?0:Math.max(0,A.getBoundingClientRect().height-w.getBoundingClientRect().height),collapsed:i,control:C,watch:d})},c=cn();document.addEventListener("click",g,!0);let u=ge(document.body,{childList:!0,subtree:!0,attributeFilter:["hidden"]},r);return()=>{document.removeEventListener("click",g,!0),u(),e=null,c()}}var xc="button[data-process-activity]",t0=" · ",n0="data-dsh-claude-live-detail",a0="data-dsh-claude-open",kc="data-dsh-claude-label",Ec="--dsh-claude-label-spread",hr="aria-label",o0=8,pr="closed";function Cc(){let e=new WeakMap,t=new WeakMap,n=!1,a=new Set,o=c=>{for(let u of c){if(!u.isConnected||u.hasAttribute(Sn))continue;let y=u.querySelector(xc),x=u.querySelector(tt);if(!(y instanceof HTMLElement)||x===null)continue;let m=y.querySelector(Tn)===null?pr:gt,C=y.textContent??"",b=C.indexOf(t0),h=b>=0;if(u.toggleAttribute(n0,h),u.toggleAttribute(a0,!x.hasAttribute("hidden")),h){let p=C.slice(0,b);y.getAttribute(kc)!==p&&y.setAttribute(kc,p),y.getAttribute(hr)!==p&&y.setAttribute(hr,p);let f=p.length*o0+"px";y.style.getPropertyValue(Ec)!==f&&y.style.setProperty(Ec,f)}else y.removeAttribute(hr);if(e.get(u)===m||x.hasAttribute("hidden")===(m===pr)||t.get(u)===m)continue;t.set(u,m);let A=document.activeElement,w=y.closest(Ie),d=w===null?null:w.scrollTop,i=w!==null&&w.scrollHeight-w.scrollTop-w.clientHeight<=Lt;ho();try{y.click()}finally{po()}w!==null&&d!==null&&w.scrollTop!==d&&Dt(w,i?w.scrollHeight:d,"fold"),A instanceof HTMLElement&&A.isConnected&&A.focus({preventScroll:!0}),document.activeElement===y&&y.blur()}},s=()=>{o(document.querySelectorAll(bt))},l=c=>{if(kt())return;let u=c.target;if(!(u instanceof Element))return;let y=u.closest(bt);if(y===null)return;let x=y.querySelector(xc);e.set(y,x!==null&&x.querySelector(Tn)!==null?gt:pr)},r=c=>{let u=a.size;for(let y of c){let x=y.target,C=(x instanceof Element?x:x.parentElement)?.closest(bt)??null;C!==null&&a.add(C);for(let b of y.addedNodes)if(b instanceof HTMLElement){b.matches(bt)&&a.add(b);for(let h of b.querySelectorAll(bt))a.add(h)}}a.size!==u&&(n||(n=!0,he({write(){n=!1;let y=[...a];a.clear(),o(y)}})))},g=ge(document.body,{subtree:!0,childList:!0,attributes:!0,attributeFilter:[Zo,es,"hidden",Sn],characterData:!0},r);return document.addEventListener("click",l,!0),document.addEventListener("keydown",l,!0),s(),()=>{g(),document.removeEventListener("click",l,!0),document.removeEventListener("keydown",l,!0)}}function Tc(){let e=new WeakMap,t=new WeakMap,n=!1,a=new Set,o=c=>{for(let u of c){if(!u.isConnected)continue;let y=u.getAttribute("data-state")??"";if(y===""||e.get(u)===y||u.hasAttribute("data-expanded")===(y===gt)||t.get(u)===y)continue;t.set(u,y);let x=u.querySelector('[role="button"], button');if(x instanceof HTMLElement){ho();try{x.click()}finally{po()}}}},s=()=>{o(document.querySelectorAll(et))},l=c=>{if(kt())return;let u=c.target;if(!(u instanceof Element))return;let y=u.closest(et);y!==null&&e.set(y,y.getAttribute("data-state")??"")},r=c=>{let u=a.size;for(let y of c){let x=y.target;if(x instanceof Element){let m=x.closest(et);m!==null&&a.add(m)}for(let m of y.addedNodes)if(m instanceof HTMLElement){m.matches(et)&&a.add(m);for(let C of m.querySelectorAll(et))a.add(C)}}a.size!==u&&(n||(n=!0,he({write(){n=!1;let y=[...a];a.clear(),o(y)}})))},g=ge(document.body,{subtree:!0,childList:!0,attributes:!0,attributeFilter:["data-state","data-expanded"]},r);return document.addEventListener("click",l,!0),document.addEventListener("keydown",l,!0),s(),()=>{g(),document.removeEventListener("click",l,!0),document.removeEventListener("keydown",l,!0)}}function Sc(e,t){document.body.setAttribute(Uo,"");let n=Tc(),a=Cc(),o=Ac();return t.chatFold={isBusy:vc},()=>{delete t.chatFold,n(),a(),o(),document.body.removeAttribute(Uo)}}var mo="dsh-claude-tok-",fo="--dsh-claude-run-color";function Ic(e,t){let{paint:n,publishRunColor:a}=t;return o=>{let s=performance.now(),l;if(o===null){l=[...document.querySelectorAll(We)];for(let c of e.liveContainers)if(!l.includes(c)){e.textSnapshots.delete(c);for(let u=e.liveRuns.length-1;u>=0;u-=1)e.liveRuns[u]?.container===c&&e.liveRuns.splice(u,1)}e.liveContainers=l}else{l=[...o].filter(c=>c.isConnected&&c.matches(We));for(let c of l)e.liveContainers.includes(c)||e.liveContainers.push(c)}if(l.length===0)return;let r=s<e.yieldUntil,g=[];for(let c of l){let u=g.length,y=document.createTreeWalker(c,NodeFilter.SHOW_TEXT),x=[],m="",C=y.nextNode();for(;C!==null;){let B=C;x.push({node:B,start:m.length}),m+=B.data,C=y.nextNode()}let b=e.textSnapshots.get(c)?.text;if(e.textSnapshots.set(c,{text:m,entries:x}),b===void 0&&(e.historyContainers.has(c)||m.length>200))continue;let h=b??"",A=Math.min(h.length,m.length),w=0;for(;w<A&&h.charCodeAt(w)===m.charCodeAt(w);)w+=1;let d=0;for(;d<A-w&&h.charCodeAt(h.length-1-d)===m.charCodeAt(m.length-1-d);)d+=1;let i=h.length-d,p=m.length-h.length;for(let B=e.liveRuns.length-1;B>=0;B-=1){let _=e.liveRuns[B];if(_!==void 0&&_.container===c&&!(_.start+_.length<=w)){if(_.start>=i){e.liveRuns[B]={..._,start:_.start+p};continue}e.liveRuns.splice(B,1)}}if(r)continue;let f=e.foldQuietUntil.get(c);if(f!==void 0&&s<=f)continue;let v=h.slice(w,h.length-d),k=m.slice(w,m.length-d);if(k.length===0||v.length>0&&v.length*k.length>4096)continue;let E=new Uint8Array(k.length);if(v.length>0){let B=k.length+1,_=new Uint16Array((v.length+1)*B);for(let S=v.length-1;S>=0;S-=1)for(let P=k.length-1;P>=0;P-=1){let H=v.charCodeAt(S)===k.charCodeAt(P);_[S*B+P]=H?(_[(S+1)*B+P+1]??0)+1:Math.max(_[(S+1)*B+P]??0,_[S*B+P+1]??0)}let F=0,W=0,Z=0;for(;W<v.length&&Z<k.length;){if(v.charCodeAt(W)===k.charCodeAt(Z)){E[Z]=1,F+=1,W+=1,Z+=1;continue}let S=_[(W+1)*B+Z]??0,P=_[W*B+Z+1]??0,H=S>=P;H&&(W+=1),H||(Z+=1)}if(F===0||k.length-F>64)continue}let T=[],R=-1;for(let B=0;B<k.length;B+=1){if(E[B]===1){R>=0&&T.push({start:R+w,end:B+w}),R=-1;continue}R<0&&(R=B)}if(R>=0&&T.push({start:R+w,end:k.length+w}),T.length===0)continue;let N=0;for(let B of T)N+=B.end-B.start;if(N>1e4)continue;let L=new Set;for(let B of T)for(let _ of x){if(_.start+_.node.data.length<=B.start)continue;if(_.start>=B.end)break;let F=Math.max(B.start,_.start),W=Math.min(B.end,_.start+_.node.data.length),Z=_.node.parentElement,S=F;for(let P of _.node.data.slice(F-_.start,W-_.start)){if(P.trim().length===0){S+=P.length;continue}Z!==null&&!L.has(Z)&&(L.add(Z),a(Z));let H={container:c,start:S,length:P.length,bornAt:s,delay:0,colorElement:Z};e.liveRuns.push(H),g.push(H),S+=P.length}}let D=g.length-u,V=Math.min(8,Math.max(1,120/50)),Y=D<=1?0:Math.min(V,120/(D-1));for(let B=u;B<g.length;B+=1){let _=g[B];_===void 0||Y===0||(_.delay=(B-u)*Y)}}g.length!==0&&(e.cancelPaintFrame!==null&&(e.cancelPaintFrame(),e.cancelPaintFrame=null),n(performance.now(),!1))}}function Fc(e,t){let n=new Array(24).fill(null);return{clearHighlights:()=>{for(let s=0;s<24;s+=1)n[s]!==null&&(e.delete(mo+s),n[s]=null)},showStep:(s,l)=>{let r=n[s]??null;if(l.length===0){r!==null&&r.size>0&&r.clear();return}r===null?(r=new t,n[s]=r,e.set(mo+s,r)):r.clear();for(let g of l)r.add(g)}}}function Nc(){let e=new WeakMap;return t=>{if(t===null)return;let n=window.getComputedStyle(t),a=n.color;e.get(t)!==a&&(e.set(t,a),n.getPropertyValue(fo).trim()!==a&&t.style.setProperty(fo,a))}}function Wc(e,t){let{clearHighlights:n,publishRunColor:a,showStep:o}=t,s=()=>{e.yieldUntil=performance.now()+3e3,e.slowFrames=0,e.lastFrameAt=0,e.liveRuns.length=0,n()},l=()=>{e.cancelPaintFrame=he({write(g){r(g,!0)}})},r=(g,c)=>{if(e.cancelPaintFrame=null,e.liveRuns.length===0){n();return}let u=e.lastFrameAt;e.lastFrameAt=g;let y=u===0?0:g-u;if(c&&y>50&&y<1e3?e.slowFrames+=1:c&&y>0&&(e.slowFrames=0),e.slowFrames>=4){s();return}if(y>40){let b=y-16.7;for(let h of e.liveRuns)h.bornAt=h.bornAt<=u?h.bornAt+b:g}let x=new Array(24).fill(null),m=[];for(let b=0;b<24;b+=1)m.push([]);let C=0;for(let b=0;b<e.liveRuns.length;b+=1){let h=e.liveRuns[b];if(h===void 0)continue;let A=g-h.bornAt-h.delay;if(A>=120)continue;e.liveRuns[C]=h,C+=1;let w=e.textSnapshots.get(h.container);if(w===void 0)continue;let d=h.start+h.length,i=0,p=w.entries.length-1,f=-1;for(;i<=p;){let Y=i+p>>1,B=w.entries[Y];if(B===void 0)break;if(B.start+B.node.data.length<=h.start){i=Y+1;continue}f=Y,p=Y-1}let v=w.entries[f];if(v===void 0||v.start>=d)continue;let k=Math.max(0,h.start-v.start),E=v.node,T=Math.min(v.node.data.length,d-v.start);for(let Y=f+1;Y<w.entries.length;Y+=1){let B=w.entries[Y];if(B===void 0||B.start>=d)break;E=B.node,T=Math.min(B.node.data.length,d-B.start)}let R=v.node.parentElement;R!==h.colorElement&&(a(R),h.colorElement=R);let N=A<=0?0:Math.floor(A/120*24),L=m[N];if(L===void 0)continue;let D=x[N]??null;if(D!==null&&E===v.node&&D.node===v.node&&D.end===k){D.end=T;continue}let V={node:v.node,start:k,end:T};x[N]=V,L.push(V)}e.liveRuns.length=C;for(let b=0;b<24;b+=1){let A=(m[b]??[]).map(w=>new StaticRange({startContainer:w.node,startOffset:w.start,endContainer:w.node,endOffset:w.end}));o(b,A)}e.liveRuns.length>0?l():n()};return r}function jc(){let e=globalThis.CSS?.highlights,t=globalThis.Highlight;if(e==null||typeof t!="function")return null;let n={liveRuns:[],historyContainers:new WeakSet,textSnapshots:new WeakMap,foldQuietUntil:new WeakMap,liveContainers:[],lastFrameAt:0,slowFrames:0,yieldUntil:0,cancelPaintFrame:null};for(let y of document.querySelectorAll(We))n.historyContainers.add(y);let{clearHighlights:a,showStep:o}=Fc(e,t),s=Nc(),l=Wc(n,{clearHighlights:a,showStep:o,publishRunColor:s}),r=Ic(n,{publishRunColor:s,paint:l}),g=y=>{if(kt())return;let x=y.target;if(!(x instanceof Element))return;let m=performance.now()+400,C=x.closest(We);if(C!==null&&n.foldQuietUntil.set(C,m),y.type==="click")for(let b of x.querySelectorAll(We))n.foldQuietUntil.set(b,m)},c=y=>{let x=!1,m=new Set;for(let C of y){if(C.type==="attributes"){x=!0;continue}let b=C.target,A=(b instanceof Element?b:b.parentElement)?.closest(We)??null;if(A!==null&&m.add(A),!(C.type!=="childList"||x)){for(let w of C.addedNodes)w instanceof Element&&(w.matches(We)||w.querySelector(We)!==null)&&(x=!0);for(let w of C.removedNodes)n.liveContainers.some(d=>d===w||w.contains(d))&&(x=!0)}}x?r(null):m.size>0&&r(m)},u=ge(document.body,{subtree:!0,childList:!0,characterData:!0,attributeFilter:[Qr]},c);return document.addEventListener("click",g,!0),document.addEventListener("keydown",g,!0),r(null),()=>{u(),document.removeEventListener("click",g,!0),document.removeEventListener("keydown",g,!0),n.cancelPaintFrame!==null&&n.cancelPaintFrame(),n.cancelPaintFrame=null,n.liveRuns.length=0,a()}}function Yc(e,t){let n=null,a=()=>{if(!Re()){if(n!==null)return;n=jc(),n!==null&&document.body.setAttribute(la,"");return}document.body.removeAttribute(la),n!==null&&(n(),n=null)};a();let o=nt(a);return()=>{o(),document.body.removeAttribute(la),n!==null&&(n(),n=null)}}var Fe=Se(require("@deepseek-ai/dsh-client-ui-primitives"),1),Ze=Se(require("react"),1);var Qc="dsh-claude-file-root",Xc="dsh-claude-file-row",$c="dsh-claude-file-leading",Jc="dsh-claude-file-chevron",Zc="dsh-claude-file-title",eu="dsh-claude-file-sep",mr="dsh-claude-file-summary",s0="dsh-claude-file-error",r0="dsh-claude-file-stopped",tu="dsh-claude-file-link",nu="dsh-claude-file-suffix",fr="dsh-claude-file-stat",au="dsh-claude-file-add",ou="dsh-claude-file-del",su="dsh-claude-file-body",ru="dsh-claude-file-diff",lu="dsh-claude-file-io",gr="dsh-claude-file-io-section",iu="dsh-claude-file-io-divider",br="dsh-claude-file-io-label",yr="dsh-claude-file-io-text",du="dsh-claude-file-inspect",cu="dsh-claude-file-hidden",vr="tool.call.toolview";function wr(e){return"kind"in e?e.call??null:e.phase!=="start"?null:{name:e.name??"",argsRaw:e.argsRaw??""}}function uu(e){let t;try{t=JSON.parse(e)}catch{return null}return typeof t!="object"||t===null||Array.isArray(t)?null:t}function hu(e,t){for(let n of t){let a=e[n];if(typeof a=="string"&&a!=="")return a}}function l0(e){let t=e.sandbox_permissions,n=e.justification;return t===void 0&&n===void 0?!0:t!=="workspace-write"&&t!=="danger-full-access"?!1:typeof n=="string"&&n.trim()!==""}function i0(e,t,n){if(t!==void 0&&t!==""&&e.startsWith(t)){let a=e.slice(t.length).replace(/^[\\/]+/,"");if(a!=="")return a}if(n!==void 0&&n!==""&&e.startsWith(n)){let a=e.slice(n.length);if(a===""||a.startsWith("/")||a.startsWith("\\"))return"~"+a.replace(/\\/g,"/")}return e}function d0(e){let t=e.indexOf(`
`);return t===-1?e:e.slice(0,t)}function Kc(e,t){if(t===null)return null;let n=hu(t,["path","file_path"]);if(n===void 0||!l0(t))return null;if(e==="write"){let l=t.content;return typeof l=="string"?[{path:n,oldText:null,newText:l}]:null}if(e!=="edit")return null;let a=t.old_string,o=t.new_string;if(typeof a!="string"||typeof o!="string")return null;let s=t.replace_all;return s!==void 0&&typeof s!="boolean"?null:[{path:n,oldText:a===""?null:a,newText:o}]}function c0(e){if(typeof e!="object"||e===null||Array.isArray(e))return null;let t=e.diffs;if(!Array.isArray(t))return null;if(t.length===0)return"empty";let n=[];for(let a of t){if(typeof a!="object"||a===null)return null;let{path:o,oldText:s,newText:l}=a;if(typeof o!="string"||s!=null&&typeof s!="string"||typeof l!="string")return null;n.push({path:o,oldText:s??null,newText:l})}return n}function pu(e,t){if(!("kind"in e))return e.phase==="preparing"?null:Kc(e.name??"",t);if(e.isError)return null;let n=c0(e.meta);return n!==null&&n!=="empty"?n:e.call===void 0||e.call===null?null:Kc(e.call.name,t)}function mu(e,t,n,a,o){let s="kind"in t,l=wr(t),r=s?t.error?.code==="interrupted"?"stopped":t.isError?"error":"ok":t.phase==="preparing"?"preparing":"running",g=n===null?void 0:hu(n,["path","file_path"]),c=s&&u0(t)||null;return{titleKey:e==="write"?"tool.title.write":"tool.title.edit",variant:e==="write"?"write":"edit",summary:g===void 0?"":i0(g,a,o),filePath:g,bodyRaw:l===null||l.argsRaw===""?null:l.argsRaw,output:c,errorSummary:r==="error"&&c!==null?d0(c):null,state:r}}function u0(e){let t=[];for(let n of e.content??[]){if(n.type==="text"&&typeof n.text=="string"){t.push(n.text);continue}t.push(JSON.stringify(n,null,2))}return t.length===0&&e.error!==void 0&&t.push(`${e.error.name??""}: ${e.error.code??""}`),t.join(`
`)}function fu(e){return e==="error"?mr+" "+s0:e==="stopped"?mr+" "+r0:mr}function gu(e,t){return e==="running"?t("row.running"):e==="error"?t("row.failed"):e==="stopped"?t("row.stopped"):null}function bu(e){return{codeLabel:e("codeBlock.title"),wrapLabel:e("codeBlock.wrap"),unwrapLabel:e("codeBlock.unwrap"),copy:e("copy"),copied:e("copied"),collapseAria:e("diff.collapseAria"),expandAria:t=>e("diff.expandAria",{count:t}),collapse:e("collapse"),expand:t=>e("diff.expandRest",{count:t})}}function yu(e,t){let n=Ze.createElement,a=s=>{let{t:l,toolName:r,block:g,cwd:c,home:u,openFile:y,inspect:x,useDisclosure:m}=s,{expanded:C,toggle:b}=m(),h=Ze.useMemo(()=>{let B=wr(g);return B===null?null:uu(B.argsRaw)},[g]),A=Ze.useMemo(()=>mu(r,g,h,c,u),[h,g,c,u,r]),w=Ze.useMemo(()=>pu(g,h),[h,g]),d=Ze.useMemo(()=>bu(l),[l]),i=A.state==="running",p=Ze.useMemo(()=>w===null?null:Fe.diffTotals(w),[w]),f=w!==null||A.output!==null||A.bodyRaw!==null,v=C&&f,k=A.errorSummary??A.summary,E=gu(A.state,l),T=A.filePath!==void 0&&A.state!=="error"&&A.state!=="stopped",R=Ze.useCallback(B=>{B.stopPropagation(),A.filePath!==void 0&&y(A.filePath)},[A.filePath,y]),N=Ze.useCallback(B=>{(B.key==="Enter"||B.key===" ")&&B.stopPropagation()},[]),L=k===""?null:[n("span",{key:"sep",className:eu,"aria-hidden":!0}),T?n("button",{key:"path",type:"button",className:tu,onClick:R,onKeyDown:N},n(Fe.TextShimmer,{active:i,children:k})):n("span",{key:"path",className:fu(A.state)},n(Fe.TextShimmer,{active:i,children:k})),p===null?null:n("span",{key:"totals",className:nu},n(Fe.TextShimmer,{className:fr+" "+au,active:i,children:"+"+p.added}),n(Fe.TextShimmer,{className:fr+" "+ou,active:i,children:"-"+p.removed}))],D=A.bodyRaw===null?null:n("div",{className:gr},n("span",{className:br},l("row.input")),n("span",{className:yr},A.bodyRaw)),V=A.output===null?null:n("div",{className:gr},n("span",{className:br},l("row.output")),n("span",{className:yr,"data-error":A.state==="error"||void 0},A.output)),Y=v?n("div",{className:su},w!==null?n(Fe.DiffBlock,{diffs:w,labels:d,maxLines:9,className:ru}):n("div",{className:lu},D,A.bodyRaw!==null&&A.output!==null?n("span",{className:iu,"aria-hidden":!0}):null,V),x===void 0?null:n("button",{type:"button",className:du,onClick:x},n(Fe.IconInspectOutlineRegular,null),l("row.inspect"))):void 0;return n("div",{className:Qc,"data-variant":A.variant,"data-tool":r,"data-state":A.state},E!==null?n("span",{className:cu},E):null,n(Fe.DisclosureRow,{rowClassName:Xc,leadingClassName:$c,titleClassName:Zc,chevronClassName:Jc,icon:n(Fe.IconEditOutlineRegular,{size:14}),title:l(A.titleKey),running:i,open:v,expandable:f,expandOnRowClick:!0,keepContentWhenOpen:!0,onToggle:b,collapsedContent:L},Y))},o=null;return typeof e.inject=="function"&&(o=e.inject(["slots"],s=>{let l=s.get("slots");if(l==null||typeof l.inject!="function")return;let r=null,g=()=>{if(r!==null)return;let u={name:vr,priority:-1,locale:"conversation"},y=l.register({...u,key:"edit"},a),x=l.register({...u,key:"write"},a),m=!1;r=()=>{m||(m=!0,y(),x())}},c=()=>{r!==null&&(r(),r=null)};s.effect(()=>{let u=l.inject(vr,()=>(g(),c));return()=>{c(),typeof u=="function"&&u()}},"dsh-claude-style: file change row")})),()=>{o!==null&&(typeof o.dispose=="function"&&o.dispose(),o=null)}}var Ar="data-dsh-claude-send-ghost",p0=24,m0=["color","font-family","font-size","font-weight","font-style","font-stretch","font-feature-settings","font-variation-settings","font-kerning","line-height","letter-spacing","word-spacing","text-rendering","-webkit-font-smoothing","direction"],f0=["id","contenteditable","data-lexical-editor","data-dsh-claude-caret","tabindex","autofocus"];function Me(e){let t=Number.parseFloat(e);return Number.isFinite(t)?t:0}function g0(e){let t=/^rgba?\(([^)]+)\)$/.exec(e.trim());if(t===null)return null;let n=t[1];if(n===void 0)return null;let a=n.split(",").map(o=>Number.parseFloat(o));return a.length<3||a.some(o=>!Number.isFinite(o))?null:a}function Jn(e){let t=g0(e);return t===null?0:t[3]??1}function b0(e,t){if(Jn(t.backgroundColor)>0)return{element:e,path:[]};let n=Array.from(e.children);for(;n.length>0;){let a=n.shift();if(a===void 0)break;if(a instanceof HTMLElement){if(Jn(window.getComputedStyle(a).backgroundColor)>0){let o=[];for(let s=a;s!==e&&s.parentElement!==null;s=s.parentElement)o.unshift(Array.from(s.parentElement.children).indexOf(s));return{element:a,path:o}}for(let o of a.children)n.push(o)}}return{element:e,path:[]}}function y0(e){let t=[],n=e.boxShadow;return n!==""&&n!=="none"&&t.push(n),Me(e.borderTopWidth)>0&&Jn(e.borderTopColor)>0&&t.push("0 0 0 "+e.borderTopWidth+" "+e.borderTopColor),t.join(", ")}function vu(e,t){let n=e;for(let a of t)n=n?.children[a];return n instanceof HTMLElement?n:null}function v0(e,t){for(let[n,a]of t)e.style.setProperty(n,a,"important")}function xr(e){let t=[e,...e.querySelectorAll("*")];for(let n of t)for(let a of f0)n.removeAttribute(a);for(let n of e.querySelectorAll("[data-dsh-claude-caret-layer]"))n.remove()}function kr(){return document.body}function wu(e,t){let n=t.getBoundingClientRect();if(n.width===0||n.height===0)return null;let a=e.closest(Xr);if(a===null||a.parentElement!==t)return null;let o=window.getComputedStyle(t),s=window.getComputedStyle(e),l=e.getBoundingClientRect(),r={left:l.left-n.left+e.clientLeft+Me(s.paddingLeft),top:l.top-n.top+e.clientTop+Me(s.paddingTop),right:n.right-(l.right-Me(s.borderRightWidth)-Me(s.paddingRight)),lineHeight:Me(s.lineHeight)},g=b0(t,o),c=g.element===t?o:window.getComputedStyle(g.element),u=g.element.getBoundingClientRect(),y={left:u.left-n.left,top:u.top-n.top,width:u.width,height:u.height,radius:Me(c.borderTopLeftRadius)},x=[],m=k=>{let E=k.getBoundingClientRect();return[E.left-n.left,E.top-n.top,E.width,E.height]},C=(k,E)=>{let T=m(k)[2],R=m(k)[3];if(T*R===0){if(window.getComputedStyle(k).display!=="contents")return;Array.from(k.children).forEach((L,D)=>{C(L,[...E,D])});return}let N=Array.from(k.children).filter(L=>{let D=m(L);return D[2]*D[3]>0});if(T>=n.width*.9&&N.length>=2){Array.from(k.children).forEach((L,D)=>{let V=m(L);V[2]*V[3]>0&&x.push({path:[...E,D],rect:V})});return}x.push({path:E,rect:m(k)})};Array.from(t.children).forEach((k,E)=>{k!==a&&C(k,[E])});let b=window.getComputedStyle(kr()),h=[];for(let k=0;k<o.length;k+=1){let E=o[k];if(E===void 0||!E.startsWith("--"))continue;let T=o.getPropertyValue(E);T!==b.getPropertyValue(E)&&h.push([E,T])}for(let k of m0)h.push([k,o.getPropertyValue(k)]);let A=[],w=!1;for(let k=t.parentElement;k!==null&&k!==document.body;k=k.parentElement){if(k.hasAttribute(Ar)){w=!0;break}A.push({tag:k.tagName.toLowerCase(),className:k.getAttribute("class")??""})}A.reverse();let d=t.cloneNode(!0);xr(d),v0(d,[["position","absolute"],["left","0px"],["top","0px"],["right","auto"],["bottom","auto"],["margin","0px"],["width",n.width+"px"],["max-width","none"],["height",n.height+"px"],["box-sizing","border-box"],["transform","none"],["float","none"],["background","transparent"],["box-shadow","none"]]);let i=d.children[Array.from(t.children).indexOf(a)],p=a.getBoundingClientRect();i.style.height=p.height+"px",i.style.minHeight="0px",i.style.maxHeight="none";let f=vu(d,g.path);f!==null&&f!==d&&(f.style.setProperty("background-color","transparent","important"),f.style.setProperty("border-color","transparent","important"),f.style.setProperty("box-shadow","none","important"));let v=[];for(let{path:k,rect:E}of x){let T=vu(d,k);T!==null&&v.push({element:T,rect:E})}return{box:n,surface:y,radius:Me(o.borderTopLeftRadius),shadow:y0(c),clone:d,draft:i,draftScrollTop:a.scrollTop,chrome:v,text:r,context:h,ancestors:w||A.length>p0?null:A}}var Zn=400,Er=160,Au=16,xu=.75,ku=7.5,lt=.45,Cr=.5,Eu=.02,Tr=60,Tu=.8,Su=.55,Ru=.9,w0=.5,Cu=.5,A0=14,x0=["color","font-family","font-size","font-weight","font-style","font-stretch","font-feature-settings","font-variation-settings","font-kerning","letter-spacing","word-spacing","text-rendering","-webkit-font-smoothing","direction","text-align","text-transform","text-indent","tab-size","white-space","word-break","overflow-wrap","line-break","hyphens"];function go(e,t,n){if(t>=1)return 1-(1+n*e)*Math.exp(-n*e);let a=n*Math.sqrt(1-t*t);return 1-Math.exp(-t*n*e)*(Math.cos(a*e)+t*n/a*Math.sin(a*e))}function _u(e){let t=go(1,xu,ku)-1;return go(e,xu,ku)-t*e*e*e}function Mu(e){return e>=lt?1:go(e/lt,1,Au)/go(1,1,Au)}function Sr(e,t,n){return e/Math.max(t,Eu)+"px / "+e/Math.max(n,Eu)+"px"}function Lu(e){if(e===""||e==="none")return 0;let t=0;for(let n of e.split(/,(?![^()]*\))/)){let o=n.replace(/[a-z-]+\([^)]*\)/gi," ").match(/-?\d*\.?\d+px/g);if(o===null)continue;let s=o.map(Number.parseFloat);t=Math.max(t,(s[2]??0)+(s[3]??0))}return t}function Rr(e,t){let n=[];return e>0&&n.push({offset:0,opacity:"0"},{offset:e,opacity:"0"}),n.push({offset:e,opacity:"1"},{offset:t,opacity:"1"}),t<1&&n.push({offset:t,opacity:"0"},{offset:1,opacity:"0"}),n}function _r(e,t){let n=document.createElement("div");n.style.cssText="position:absolute;left:0;top:0;margin:0;padding:0;border:0;box-sizing:content-box;will-change:transform,opacity";for(let a of x0)n.style.setProperty(a,t.getPropertyValue(a));for(let a of e.childNodes){let o=a.cloneNode(!0);o instanceof Element&&xr(o),n.appendChild(o)}return n}function Hu(e,t,n,a,o){let s=document.createElement("div");s.setAttribute(Ue,""),s.style.cssText="position:fixed;left:-100000px;top:0;visibility:hidden;contain:layout style;pointer-events:none";let l=_r(e,t);l.style.position="static",s.appendChild(l),document.body.appendChild(s);let r=new Map,g=A=>{let w=A,d=r.get(w);if(d!==void 0)return d;l.style.width=w+"px";let i=document.createRange();i.selectNodeContents(l);let p=new Set,f=[];for(let k of i.getClientRects())p.add(Math.round(k.top)),f.push(Math.round(k.top)+":"+Math.round(k.right));let v={signature:f.join(","),lines:p.size};return r.set(w,v),v},c=n.map((A,w)=>{let d=n[w+1];return w===0||d===void 0?A.content:Math.min(A.content,d.content)}),u=new Array(c.length),y=(A,w)=>{if(w-A<=1)return;let d=u[A],i=u[w];if(d!==void 0&&i!==void 0&&d.signature===i.signature){for(let f=A+1;f<w;f+=1)u[f]=d;return}let p=A+w>>1;u[p]=g(c[p]??0),y(A,p),y(p,w)},x=c.length-1;u[0]=g(c[0]??0),u[x]=g(c[x]??0),y(0,x);let m=[];n.forEach((A,w)=>{let d=c[w]??A.content,i=u[w]??g(d),p=A.top+i.lines*A.lineHeight+o;p>A.height&&(A.height=p);let f=i.lines>1?Math.round(A.lineHeight/Cu)*Cu:a,v=i.signature+"|"+f,k=m.at(-1);k!==void 0&&(k.until=A.u),!(k!==void 0&&k.key===v)&&m.push({key:v,from:A.u,until:A.u,width:d,lineHeight:f})}),s.remove();let C=m.at(-1);C!==void 0&&(C.until=1);let b=n.find(A=>A.m>=w0)?.u??1,h=m[0];for(h!==void 0&&h.until>b&&(m.splice(1,0,{key:h.key,from:b,until:h.until,width:h.width,lineHeight:h.lineHeight}),h.until=b);m.length>A0;){let A=2;for(let i=3;i<m.length-1;i+=1){let p=m[i],f=m[A];p===void 0||f===void 0||p.until-p.from<f.until-f.from&&(A=i)}let w=m[A],d=m[A+1];if(w===void 0||d===void 0)break;d.from=w.from,m.splice(A,1)}return m}function k0(e,t,n,a,o,s,l,r,g,c,u){let y=t.right-e.left,x=[];for(let m=0;m<=Tr;m+=1){let C=m/Tr,b=Mu(C),h=o+(l-o)*b,A=n.left+(a.left-n.left)*b,w=n.right+(a.right-n.right)*b;x.push({u:C,m:b,width:h,visible:Math.max(0,Math.min(h,y-u*b)),height:s+(r-s)*b,radius:g+(c-g)*b,left:A,top:n.top+(a.top-n.top)*b,content:Math.max(1,h-A-w),lineHeight:n.lineHeight+(a.lineHeight-n.lineHeight)*b})}return x}function Ou(e,t,n){if(n.width===0||n.height===0)return null;let a=e.box,o=window.getComputedStyle(t),s=a.width,l=a.height,r=n.width,g=n.height,c=e.radius,u=Me(o.borderTopLeftRadius),y=e.text,x={left:t.clientLeft+Me(o.paddingLeft),top:t.clientTop+Me(o.paddingTop),right:Me(o.borderRightWidth)+Me(o.paddingRight),lineHeight:Me(o.lineHeight)},m=Math.max(s,r),C=Math.max(l,g),b=n.left-a.left,h=n.top-a.top,A=k0(a,n,y,x,s,l,r,g,c,u,b),w=document.createElement("div");w.setAttribute(Ar,""),w.setAttribute("aria-hidden","true"),w.inert=!0,w.style.cssText="position:fixed;margin:0;width:0;height:0;pointer-events:none;z-index:2147483000",w.style.left=a.left+"px",w.style.top=a.top+"px";let d=document.createElement("div");d.style.cssText="position:absolute;left:0;top:0;width:0;height:0;will-change:transform";let i=e.surface,p=document.createElement("div");p.style.cssText="position:absolute;transform-origin:0 0;background:transparent;will-change:transform,opacity",p.style.left=i.left+"px",p.style.top=i.top+"px",p.style.width=i.width+"px",p.style.height=i.height+"px",p.style.borderRadius=i.radius+"px",p.style.boxShadow=e.shadow;let f=document.createElement("div");f.style.cssText="position:absolute;left:0;top:0;overflow:hidden;transform-origin:0 0;will-change:transform",f.style.width=m+"px",f.style.height=C+"px",f.style.backgroundColor=o.backgroundColor;for(let[O,j]of e.context)f.style.setProperty(O,j);let v=document.createElement("div");v.style.cssText="position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform",v.style.width=m+"px",v.style.height=C+"px",f.style.borderRadius=Sr(c,s/m,l/C),f.appendChild(v);let k=v;for(let O of e.ancestors??[]){let j=document.createElement(O.tag);j.style.setProperty("display","contents","important"),j.setAttribute("aria-hidden","true"),O.className!==""&&(j.className=O.className),k.appendChild(j),k=j}k.appendChild(e.clone);let E=Me(o.paddingBottom)+Me(o.borderBottomWidth),T=Hu(t,o,A,x.lineHeight,E),R=T[0],N=T.slice(1).map(O=>{let j=_r(t,o);return j.style.width=O.width+"px",j.style.lineHeight=O.lineHeight+"px",v.appendChild(j),{layer:j,window:O}});d.appendChild(p),d.appendChild(f),w.appendChild(d),kr().appendChild(w),e.draftScrollTop>0&&(e.draft.scrollTop=e.draftScrollTop);let L={duration:Zn,easing:"linear",fill:"forwards"},D=[],V=(O,j)=>{let ne=O.animate(j,L);return D.push(ne),ne},Y=(O,j,ne,G)=>{let $=G??1,K=A.filter(pe=>pe.u>=O&&pe.u<=j),J=[];K.forEach((pe,X)=>{X%$===0&&J.push({...ne(pe),offset:pe.u})});let re=K.at(-1);re!==void 0&&(J.at(-1)?.offset??-1)!==re.u&&J.push({...ne(re),offset:re.u});let de=J[0],ue=J.at(-1);return de!==void 0&&(de.offset??0)>0&&J.unshift({...de,offset:0}),ue!==void 0&&(ue.offset??1)<1&&J.push({...ue,offset:1}),J},B=V(d,A.map(O=>({offset:O.u,transform:"translate("+b*O.m+"px, "+h*_u(O.u)+"px)"}))),_=V(f,Y(0,lt,O=>({transform:"scale("+O.visible/m+", "+O.height/C+")"}))),F=V(v,Y(0,lt,O=>({transform:"scale("+m/Math.max(O.visible,Cr)+", "+C/Math.max(O.height,Cr)+")"}))),W=V(f,Y(0,lt,O=>({borderRadius:Sr(O.radius,O.visible/m,O.height/C)}),2)),Z=()=>{let O=B.currentTime;if(typeof O!="number")return 0;let j=O/Zn;return j>0?j>1?1:j:0},S=!1,P=[],H=O=>{if(S||O<lt)return;let j=A.find(ne=>ne.u>=lt)??A.at(-1);if(j!==void 0){S=!0,_.cancel(),F.cancel(),W.cancel(),f.style.width=j.visible+"px",f.style.height=j.height+"px",f.style.transform="none",f.style.borderRadius=j.radius+"px",v.style.transform="none",p.style.opacity="0";for(let ne of P)ne.cancel()}},q=Lu(e.shadow);P.push(V(p,Y(0,lt,O=>({transform:"scale("+O.visible/(i.left+i.width+q)+", "+O.height/(i.top+i.height+q)+")",opacity:String(Math.max(0,1-O.m/Ru))}),2)));for(let O of e.chrome){let j=O.rect[0],ne=O.rect[1],G=O.rect[2],$=O.rect[3],K=j+G/2>s/2,J=ne+$/2>l/2;O.element.style.transformOrigin=(K?"100%":"0%")+" "+(J?"100%":"0%"),V(O.element,Y(0,lt,re=>{let de=Math.min(1,re.m/Tu),ue=K?re.visible-s:0,pe=J?re.height-l:0;return{transform:"translate("+ue+"px, "+pe+"px) scale("+(1-(1-Su)*de)+")",opacity:String(1-de)}},2))}let z=R===void 0?1:R.until;V(e.draft,Y(0,z,O=>({transform:"translate("+(O.left-y.left)+"px, "+(O.top-y.top+(O.lineHeight-y.lineHeight)/2)+"px)"}))),V(e.draft,Rr(0,z));for(let{layer:O,window:j}of N)V(O,Y(j.from,j.until,ne=>({transform:"translate("+ne.left+"px, "+(ne.top+(ne.lineHeight-j.lineHeight)/2)+"px)"}))),V(O,Rr(j.from,j.until));return{wrapper:w,compact:H,progress:Z,animations:D}}var E0=1500,C0=900,T0=400,S0=2500,bo=je+" "+pa,Bu=`${je} [${Ht}="${ma}"]`,Pu=Bu+", "+bo;function Du(e,t){let n=null,a=new WeakSet,o=null,s=0;for(let d of document.querySelectorAll(bo))a.add(d);let l=d=>{let i=o;if(i===null||!M0(d))return;let p=_0(i.previous);p===null||p===i.hidden||p===i.landedRow||(i.landing?i.landedRow=p:(i.hidden?.removeAttribute(Qt),p.setAttribute(Qt,""),i.hidden=p),i.bubble=Fu(p),Iu(i))},r=null,g=()=>{r!==null&&r(),r=null},c=()=>{let d=o;if(d===null||d.landing)return;let i=d.hidden;if(i===null||!i.isConnected){d.waiting||(d.waiting=!0,window.clearTimeout(s),s=window.setTimeout(u,S0));return}d.landing=!0,i.removeAttribute(Qt),d.hidden=null,d.landedRow=i;let p=d.morph.wrapper.animate([{opacity:1},{opacity:0}],{duration:Er,easing:"ease-out",fill:"forwards"});d.morph.animations.push(p),p.onfinish=()=>{o===d&&u()}},u=()=>{let d=o;if(d!==null){o=null,g(),window.clearTimeout(s),s=0,d.hidden?.removeAttribute(Qt),d.morph.wrapper.remove();for(let i of d.morph.animations)i.cancel()}},y=()=>{let d=o;if(d===null)return;let i=d.morph.progress();d.morph.compact(i),i>=1&&c(),Iu(d),he({write:y})},x=(d,i)=>{u();let p=Fu(d);if(p===null)return;let f=p.getBoundingClientRect(),v=i.snapshot.box;if(!(zu(v.left,f.left,window.innerWidth)&&zu(v.top,f.top,window.innerHeight)))return;let E=Ou(i.snapshot,p,f);E!==null&&(d.setAttribute(Qt,""),o={morph:E,targetAt:{left:f.left,top:f.top},shiftedX:0,shiftedY:0,previous:Vu(),hidden:d,landing:!1,waiting:!1,landedRow:null,bubble:p},r===null&&(r=ge(document.body,{childList:!0,subtree:!0},l)),s=window.setTimeout(u,Zn+Er+T0),he({write:y}))},m=null,C=()=>{m!==null&&m(),m=null},b=()=>{let d=n;if(d===null){C();return}if(performance.now()-d.capturedAt>E0){n=null,C();return}let i=R0(a);i!==null&&(n=null,C(),x(i,d))},h=()=>{if(Re())return;let d=document.querySelector(Jt);if(!(d instanceof HTMLElement))return;let i=d.closest(dt);if(!(i instanceof HTMLElement)||(d.textContent??"").trim()==="")return;let p=wu(d,i);p!==null&&(n={capturedAt:performance.now(),snapshot:p},m===null&&(m=ge(document.body,{childList:!0,subtree:!0},b)))},A=d=>{d.key!=="Enter"||d.shiftKey||d.altKey||d.ctrlKey||d.metaKey||d.isComposing||h()},w=d=>{d.target instanceof Element&&d.target.closest(dt)!==null&&h()};return document.addEventListener("keydown",A,!0),document.addEventListener("click",w,!0),()=>{document.removeEventListener("keydown",A,!0),document.removeEventListener("click",w,!0),C(),g(),n=null,u()}}function Iu(e){let t=e.bubble;if(t===null)return;let n=t.getBoundingClientRect();if(n.width===0)return;let a=n.left-e.targetAt.left,o=n.top-e.targetAt.top;a===e.shiftedX&&o===e.shiftedY||(e.shiftedX=a,e.shiftedY=o,e.morph.wrapper.style.transform="translate("+a+"px, "+o+"px)")}function R0(e){let t=[];for(let a of document.querySelectorAll(bo))e.has(a)||t.push(a);if(t.length===0)return null;for(let a of t)e.add(a);let n=t.at(-1);return n instanceof HTMLElement?n:null}function _0(e){let t=document.querySelector(bo);if(t instanceof HTMLElement&&t!==e)return t;let n=Vu();return n===e?null:n}function Vu(){let e=document.querySelectorAll(Bu),t=e.item(e.length-1);return t instanceof HTMLElement?t:null}function Fu(e){let t=Array.from(e.children);for(;t.length>0;){let n=t.shift();if(n===void 0)break;if(n instanceof HTMLElement&&Jn(window.getComputedStyle(n).backgroundColor)>0)return n;for(let a of n.children)t.push(a)}return null}function M0(e){for(let t of e){for(let n of t.addedNodes)if(Nu(n))return!0;for(let n of t.removedNodes)if(Nu(n))return!0}return!1}function Nu(e){return e instanceof HTMLElement&&(e.matches(Pu)||e.querySelector(Pu)!==null)}function zu(e,t,n){return Math.abs(e-t)<=Math.max(C0,n)}var L0=["direction","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","font-feature-settings","font-variation-settings","font-kerning","letter-spacing","word-spacing","line-height","text-align","text-indent","text-transform","tab-size","white-space","word-break","overflow-wrap","hyphens","padding-top","padding-right","padding-bottom","padding-left"];function H0(e,t){let n=0;for(let a=e.firstChild;a!==null;a=a.nextSibling){if(a===t)return n;n+=1}return-1}function O0(e){let t=e.startContainer,n=e.startOffset;if(t instanceof HTMLBRElement)return{lineBreak:t,before:n===0};if(t instanceof Text){let s=t.parentNode;if(s===null)return null;let l=H0(s,t);if(l<0)return null;if(n===t.data.length){let r=s.childNodes[l+1];if(r instanceof HTMLBRElement)return{lineBreak:r,before:!0}}if(n===0){let r=s.childNodes[l-1];if(r instanceof HTMLBRElement)return{lineBreak:r,before:!1}}return null}let a=t.childNodes[n];if(a instanceof HTMLBRElement)return{lineBreak:a,before:!0};let o=t.childNodes[n-1];return o instanceof HTMLBRElement?{lineBreak:o,before:!1}:null}function P0(e,t){if(t===null)return null;let n=getComputedStyle(e),a=document.createElement("div");a.style.cssText="position:fixed;top:0;left:0;visibility:hidden;pointer-events:none",a.style.padding=n.padding,a.style.whiteSpace="pre-wrap",a.style.fontFamily=n.fontFamily,a.style.fontSize=n.fontSize,a.style.fontWeight=n.fontWeight,a.style.fontStyle=n.fontStyle,a.style.lineHeight=n.lineHeight,a.appendChild(document.createElement("br")),t.appendChild(a);let o=a.getBoundingClientRect(),s=a.firstElementChild,l=s===null?null:s.getBoundingClientRect();if(a.remove(),l===null)return null;let r=e.getBoundingClientRect();return{left:r.left+(l.left-o.left),top:r.top+(l.top-o.top),height:l.height}}function Uu(e,t,n){let a=t.getBoundingClientRect();if(a.height>0)return{left:a.left,top:a.top,height:a.height};let o=O0(t);if(o===null)return e.firstChild!==null?null:P0(e,n);let s=o.lineBreak.getBoundingClientRect();if(o.before)return{left:s.left,top:s.top,height:s.height};let l=o.lineBreak.parentElement;if(l===null)return null;let r=Number.parseFloat(getComputedStyle(l).lineHeight);return{left:l.getBoundingClientRect().left,top:s.top+(Number.isFinite(r)?r:s.height),height:s.height}}function Gu(e,t,n){if(n===null)return null;let a=getComputedStyle(e),o=document.createElement("div");o.style.cssText="position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;margin:0;border:0;box-sizing:content-box;height:auto;overflow:hidden";for(let m of L0)o.style.setProperty(m,a.getPropertyValue(m));let s=Number.parseFloat(a.paddingLeft)+Number.parseFloat(a.paddingRight);o.style.width=String(Math.max(0,e.clientWidth-(Number.isFinite(s)?s:0)))+"px";let l=e.selectionEnd,r=document.createElement("span");o.textContent=e.value.slice(0,l),r.textContent=e.value.slice(l)||"​",o.appendChild(r),n.appendChild(o);let g=o.getBoundingClientRect(),c=r.getClientRects()[0],u=c===void 0?void 0:c.left,y=o.firstChild;if(t&&c!==void 0&&y instanceof Text&&l>0&&e.value[l-1]!==`
`){let m=document.createRange();m.setStart(y,l-1),m.setEnd(y,l);let C=m.getClientRects(),b=C[C.length-1];b!==void 0&&b.top<c.top-1&&(c=b,u=b.right)}if(o.remove(),c===void 0||u===void 0)return null;let x=e.getBoundingClientRect();return{left:x.left+e.clientLeft+(u-g.left)-e.scrollLeft,top:x.top+e.clientTop+(c.top-g.top)-e.scrollTop,height:c.height}}function Wu(e,t){let a=e.getBoundingClientRect().top+e.clientTop,o=a+e.clientHeight,s=Math.max(t.top,a),l=Math.min(t.top+t.height,o);return l-s<1?null:{left:t.left,top:s,height:l-s}}var I0="dsh-claude-caret-blink",F0="--dsh-claude-caret-color",N0=120;function qu(e){return e.matches(Jt)?"rich":e instanceof HTMLTextAreaElement&&e.matches($r)?e.disabled||e.readOnly?null:"plain":null}function z0(e){let t=new Map,n=!1,a=null,o=null,s=!1,l=!1,r=!1,g=document.createElement("div");g.setAttribute(Ue,""),document.body.appendChild(g);let c=()=>{s||n||(n=!0,a=he({write(){if(a=null,n=!1,s)return;let E=l;l=!1,k(E)}}))},u=()=>{l=!0,r=!1},y=E=>{E.key==="Shift"||E.key==="Control"||E.key==="Meta"||E.key==="Alt"||(r=E.key==="End"&&!E.shiftKey)},x=()=>{r=!1},m=E=>{let T=E.target;!(T instanceof HTMLTextAreaElement)||!t.has(T)||c()},C=()=>{e()!==Kt&&c()},b=new Map,h=E=>{for(let[T,R]of b)T.isConnected||(R(),b.delete(T));b.has(E)||b.set(E,ge(E,{childList:!0,subtree:!0,characterData:!0,attributeFilter:["contenteditable","data-composer-input"]},C))},A=()=>{let E=document.activeElement;return!(E instanceof HTMLElement)||qu(E)===null?!1:!E.hasAttribute(Mt)},w=()=>{c(),window.setTimeout(()=>{A()&&c()},N0)},d=E=>{E.caret.removeAttribute(Do),E.visible=!1},i=(E,T)=>{T.caret.remove(),E.removeAttribute(Mt),T.markedHost&&T.host.removeAttribute(Vo)},p=E=>{let T=E.parentElement;if(T===null)return null;let R=t.get(E);if(R!==void 0&&R.host===T)return R.caret.isConnected||(T.appendChild(R.caret),R.visible=!1),R;R!==void 0&&(i(E,R),t.delete(E));let N=getComputedStyle(T);if(N.display==="contents")return null;let L=N.position==="static";L&&T.setAttribute(Vo,"");let D=document.createElement("div");D.setAttribute(Ur,""),D.setAttribute(Ue,""),T.appendChild(D),E.isContentEditable&&h(E);let V={caret:D,visible:!1,host:T,markedHost:L};return t.set(E,V),V},f=(E,T)=>{let R=getComputedStyle(E),N=R.caretColor==="auto"||R.caretColor==="rgba(0, 0, 0, 0)"?R.color:R.caretColor;T.caret.style.setProperty(F0,N)},v=(E,T,R)=>{let N=E.host.getBoundingClientRect(),L=Math.round(T.left-N.left-E.host.clientLeft+E.host.scrollLeft),D=Math.round(T.top-N.top-E.host.clientTop+E.host.scrollTop),V=!E.visible,Y=V||R;Y&&(E.caret.style.transitionProperty="none"),E.caret.style.transform="translate("+L+"px, "+D+"px)",E.caret.style.height=T.height+"px",Y&&(o!==null&&o(),o=he({write(){o=null,!s&&(E.caret.style.transitionProperty="")}})),V&&(E.visible=!0,E.caret.setAttribute(Do,""));for(let B of E.caret.getAnimations())B instanceof CSSAnimation&&B.animationName===I0&&(B.currentTime=0)},k=E=>{let T=e();if(T===Kt){for(let[F,W]of t)i(F,W);t.clear();return}let R=document.getSelection(),N=document.activeElement,L=N instanceof HTMLElement?qu(N):null;L==="rich"&&N instanceof HTMLElement&&h(N);let D=null,V=null;if(L==="rich"&&N instanceof HTMLElement&&N.isContentEditable&&R!==null&&R.isCollapsed&&R.rangeCount>0){let F=R.getRangeAt(0);N.contains(F.startContainer)&&(D=N,V=F)}L==="plain"&&N instanceof HTMLTextAreaElement&&N.selectionStart===N.selectionEnd&&(D=N);for(let[F,W]of t){if(!F.isConnected){i(F,W),t.delete(F);continue}F!==D&&(d(W),F.removeAttribute(Mt))}if(D===null)return;let Y=p(D);if(Y===null)return;let B=D instanceof HTMLTextAreaElement?Gu(D,r,g):V===null?null:Uu(D,V,g);if(B===null){D.removeAttribute(Mt),d(Y);return}D.hasAttribute(Mt)||f(D,Y);let _=D instanceof HTMLTextAreaElement?Wu(D,B):B;_===null?d(Y):v(Y,_,T===vn&&E),D.setAttribute(Mt,"")};return document.addEventListener("selectionchange",c),document.addEventListener("focusin",w),document.addEventListener("focusout",w),document.addEventListener("beforeinput",u),document.addEventListener("keydown",y,!0),document.addEventListener("pointerdown",x,!0),document.addEventListener("scroll",m,{capture:!0,passive:!0}),window.addEventListener("resize",c),document.fonts.addEventListener("loadingdone",c),{resync:c,dispose:()=>{s=!0,a!==null&&a(),a=null,o!==null&&o(),o=null,document.removeEventListener("selectionchange",c),document.removeEventListener("focusin",w),document.removeEventListener("focusout",w),document.removeEventListener("beforeinput",u),document.removeEventListener("keydown",y,!0),document.removeEventListener("pointerdown",x,!0),document.removeEventListener("scroll",m,!0),window.removeEventListener("resize",c),document.fonts.removeEventListener("loadingdone",c);for(let E of b.values())E();b.clear();for(let[E,T]of t)i(E,T);t.clear(),g.remove()}}}function ju(e,t){let n=z0(()=>le().caretMotion),a=nt(()=>n.resync());return()=>{a(),n.dispose()}}function Yu(e,t){let n='[class*="_header"]:has([class*="_tabs"])',a='[class*="crumbCurrent"], [class*="_crumb"], [class*="titleCluster"]',o='[class*="headerActions"], [class*="headerUtilities"]',g=null,c=null,u="data-dsh-titlebar-tabs",y=!1,x=Ae("data-dsh-view-tabs"),m=st('[aria-selected="true"]');function C(){let d=document.documentElement.hasAttribute(va);d!==y&&(y=d,d?document.body.setAttribute(u,""):document.body.removeAttribute(u))}function b(d){if(d==null)return null;let i=d.getBoundingClientRect();return i.width===0&&i.height===0?null:i}function h(d){let i=[],p=A(d),f=b(d.querySelector(o));return p!==null&&i.push(p),f!==null&&i.push(f),i}function A(d){let i=d.querySelectorAll(a),p=null;for(let f=0;f<i.length;f++){let v=b(i[f]);v!==null&&(p===null||v.width<=p.width)&&(p=v)}return p}function w(){C();let d=document.querySelector(n),i=d===null?null:d.querySelector('[class*="_tabs"]');if(x.mark(i),m.sync(i),d===null||i===null||y)return;let p=b(i);if(p===null)return;let f=b(d);if(f===null)return;let v=parseFloat(i.style.getPropertyValue("--dsh-view-tabs-shift"));isFinite(v)||(v=-10);let k=p.top-v,E=A(d),T=-10;if(E!==null){let R=E.top+E.height/2-k-p.height/2;k+R<f.top+8&&(R=f.top+8-k);let L=p.left,D=p.right,V=!1,Y=h(d);for(let B=0;B<Y.length;B++){let _=Y[B];_!==null&&D>_.left-6&&L<_.right+6&&(V=!0)}V||(T=Math.round(R))}T===g&&i===c||(g=T,c=i,i.style.setProperty("--dsh-view-tabs-shift",`${T}px`))}return t.viewTabs={sync:w},()=>{y&&(document.body.removeAttribute(u),y=!1);let d=document.querySelector(n),i=d===null?null:d.querySelector('[class*="_tabs"]');i!==null&&i.style.removeProperty("--dsh-view-tabs-shift"),m.release(),x.release(),g=null,c=null,delete t.viewTabs}}function Ku(e,t){let n="data-dsh-header-band",a="data-dsh-header-title",o="--dsh-header-band-left",s="--dsh-header-band-max",l="--dsh-header-band-title-top",g="data-dsh-header-row",c="--dsh-header-band-row-lift",u="data-dsh-header-actions",y="data-dsh-header-corner",x="--dsh-header-band-right",m="data-dsh-header-band-tabs",C="--dsh-header-band-tabs-left",b="title",h="actions",p=Ae(g),f=Ae(a),v=Ae(u),k=Ae(y),E=Ae(m),T=null,R=null;function N(){for(let _ of document.querySelectorAll(hl))if(_.querySelector(is)!==null||_.querySelector(ds)!==null)return _;return null}function L(_){if(_===null)return null;let F=_.getBoundingClientRect();return F.width===0&&F.height===0?null:F}function D(_,F,W){_.style.getPropertyValue(F)!==W&&_.style.setProperty(F,W)}function V(){p.release(),f.release(),v.release(),k.release(),E.release(),document.body.removeAttribute(n)}function Y(_){_!==T&&(R!==null&&R(),R=null,T=_,_!==null&&(R=De(_,()=>{t.schedule?.()})))}function B(){let _=co(),F=_===null||_.platform!=="win32"?null:N();if(_===null||_.platform!=="win32"||F===null){Y(null),V();return}Y(F);let W=L(F);if(W===null){V();return}let Z=F.closest(ml),S=F.querySelector(is),P=F.querySelector(ds),H=F.querySelector(pl),q=Z===null?null:Z.querySelector(fl),z=L(q),O=z!==null&&z.top<_.height,j=z===null||!O?0:z.width,ne=j===0?0:document.documentElement.clientWidth/2+j/2,G=L(document.querySelector(gl)),$=G===null?48:Math.max(48,G.right),K=L(P),J=L(H),re=K===null?0:K.width,de=J===null?0:J.width,ue=re+de+(K===null||J===null?0:8),pe=document.documentElement.clientWidth-_.controls.size-8,X=_.controls.size+8,ae=ue>0&&pe-ue>=Math.max($,ne)+8,I=Math.max(W.left,$+8),ee=ae?pe-ue:document.documentElement.clientWidth-_.controls.size,M=ee-8-(O?j+8:0)-I,Q=L(S),te=S!==null&&M>=120,ce=Q===null?0:Q.height,be=_.height/2+2,we=parseFloat(F.style.getPropertyValue(c)),Ne=te?Math.max(0,Math.round(W.top-(isFinite(we)?we:0)-(be+ce/2-2))):0;if(p.mark(te?F:null),te&&D(F,c,`${-Ne}px`),f.mark(te?S:null),te&&S!==null&&(D(S,o,`${Math.round(I)}px`),D(S,s,`${Math.round(M)}px`),D(S,l,`${Math.round(be)}px`)),v.mark(ae&&K!==null?P:null),k.mark(ae&&J!==null?H:null),ae){let wo=X+(J===null?0:de+8);P!==null&&K!==null&&D(P,x,`${Math.round(wo)}px`),H!==null&&J!==null&&D(H,x,`${Math.round(X)}px`)}let pt=O&&q!==null;if(pt&&q!==null){let wo=te&&Q!==null?I+Q.width:$;D(q,C,`${Math.round((wo+ee)/2)}px`)}E.mark(pt?q:null);let Pr=`${te?b:""} ${ae?h:""}`.trim();Pr===""?document.body.removeAttribute(n):ye(document.body,n,Pr)}return t.headerBand={sync:B},()=>{let _=p.current(),F=f.current(),W=v.current(),Z=k.current(),S=E.current();_!==null&&_.style.removeProperty(c),F!==null&&(F.style.removeProperty(o),F.style.removeProperty(s),F.style.removeProperty(l)),W!==null&&W.style.removeProperty(x),Z!==null&&Z.style.removeProperty(x),S!==null&&S.style.removeProperty(C),V(),Y(null),delete t.headerBand}}var ke=Se(require("react"),1);var xe=Se(require("react"),1);function Qu(e,t){return[...e.rows(t),...B0(e.id,t)].sort((a,o)=>a.rank-o.rank).map(a=>a.node)}function B0(e,t){let n=t.controls;return vi(e).map(a=>{let o=a.pref,s=a.switchRow,l=qa(o);return{rank:s.rank,node:n.row(o,oe(s.title.key,s.title.fallback),Mr(oe(s.desc.key,s.desc.fallback),l),n.toggle(t.prefs[o]!==!1,r=>{t.write({[o]:r})},l))}})}function Mr(e,t){return t?[e,xe.createElement("span",{key:"managed",className:"dsh-claude-settings-row-managed"},oe("chatUxManaged","Managed by dsh-chat-ux"))]:e}function yo(e){let t=xe.useRef(null),n=xe.useRef(null);xe.useLayoutEffect(()=>(n.current=st("[data-active]"),()=>{n.current.release(),n.current=null}),[]),xe.useLayoutEffect(()=>{n.current.sync(t.current)});let a=e.className?`${Gt} ${e.className}`:Gt;return xe.createElement("div",{ref:t,className:a,role:e.role||"group"},e.children)}function Xu(){function e(o,s,l,r){let g=[];for(let c=0;c<o.length;c++)g.push(xe.createElement("button",{key:o[c].value,type:"button",className:Wt,disabled:r===!0,"data-active":o[c].value===s?"":void 0,"aria-pressed":o[c].value===s?"true":"false",onClick:(u=>()=>{u!==s&&l(u)})(o[c].value)},o[c].label));return xe.createElement(yo,null,g)}function t(o,s,l){return xe.createElement("button",{type:"button",className:"dsh-claude-settings-switch",role:"switch",disabled:l===!0,"aria-checked":o?"true":"false","data-on":o?"":void 0,onClick(){s(!o)}},xe.createElement("span",{className:"dsh-claude-settings-switch-knob"}))}function n(o,s,l,r,g){let c=["dsh-claude-settings-row"];return g?c.push("dsh-claude-settings-row-block"):xe.isValidElement(r)&&r.type===yo&&c.push("dsh-claude-settings-row-segment"),xe.createElement("div",{className:c.join(" "),key:o},xe.createElement("div",{className:"dsh-claude-settings-row-text"},xe.createElement("div",{className:"dsh-claude-settings-row-title"},s),xe.createElement("div",{className:"dsh-claude-settings-row-desc"},l)),r)}function a(o,s,l,r,g){return xe.createElement("div",{className:"dsh-claude-settings-row dsh-claude-settings-row-sub",key:o,"aria-disabled":g?void 0:"true","data-disabled":g?void 0:""},xe.createElement("div",{className:"dsh-claude-settings-row-text"},xe.createElement("div",{className:"dsh-claude-settings-row-title"},s),xe.createElement("div",{className:"dsh-claude-settings-row-desc"},l)),r)}return{segment:e,toggle:t,row:n,subRow:a}}var ea=Se(require("react"),1);function $u(){function e(n,a){let o=[{value:jt,label:oe("brandDeepseek","DeepSeek")},{value:sa,label:oe("brandClaude","Claude")}];return ea.createElement("div",{className:"dsh-claude-brand-picker",role:"group"},o.map(s=>ea.createElement("button",{key:s.value,type:"button",className:"dsh-claude-brand-card","data-active":s.value===n.brand?"":void 0,"aria-pressed":s.value===n.brand?"true":"false",onClick:()=>{s.value!==n.brand&&a({brand:s.value})}},ea.createElement("span",{className:"dsh-claude-brand-card-logo","data-brand":s.value}),ea.createElement("span",{className:"dsh-claude-brand-card-name"},s.label))))}function t(n){let a=n.prefs,o=n.write,s=n.controls,l=[{value:_o,label:oe("paletteClaude","Claude")},{value:Mo,label:oe("paletteHost","Follow the host")}],r=[{value:Ho,label:oe("typefaceClaude","Claude")},{value:Oo,label:oe("typefaceHost","Follow the host")}],g=[{value:wn,label:oe("mascotBrand","Follow the brand")},{value:Rt,label:oe("mascotCrab","Crab")},{value:_t,label:oe("mascotDeepy","Deepy")},{value:ra,label:oe("mascotOff","Off")}],c=[{value:Fo,label:oe("mascotScopeHome","Home")},{value:An,label:oe("mascotScopeAll","Home and conversation")}],u=Hn(a)!==ra;return[{rank:10,node:s.row("brand",oe("brandTitle","Brand mark"),oe("brandDesc","The brand mark in the sidebar and on the home page, and its colour family: warm for Claude, blue for DeepSeek. While Colours is set to Follow the host, only the mark changes."),e(a,o),!0)},{rank:20,node:s.row("palette",oe("paletteTitle","Colours"),oe("paletteDesc","Claude uses the skin's own colours; Follow the host leaves the colours to DSH and to other theme plugins (a wallpaper plugin, say), and the skin keeps only its layout and controls."),s.segment(l,a.palette,y=>{o({palette:y})}))},{rank:30,node:s.row("typeface",oe("typefaceTitle","Typefaces"),oe("typefaceDesc","Claude uses the Anthropic faces (or the lookalike Inter and Noto Serif when they are missing) and JetBrains Mono for code; Follow the host keeps the fonts DSH or another plugin sets."),s.segment(r,a.typeface,y=>{o({typeface:y})}))},{rank:40,node:s.row("mascot",oe("mascotTitle","Mascot"),oe("mascotDesc","The pixel companion on the input area's top edge, animated by what the agent is doing. Follow the brand shows the pixel crab under Claude and Deepy the whale under DeepSeek."),s.segment(g,a.mascot,y=>{o({mascot:y})}))},{rank:50,node:s.subRow("mascotScope",oe("mascotScopeTitle","Where it appears"),oe("mascotScopeDesc","The new-conversation page alone, or the new-conversation page and the conversation."),s.segment(c,a.mascotScope,y=>{o({mascotScope:y})},!u),u)}]}return{id:"appearance",label:()=>oe("tabAppearance","Appearance"),rows:t}}var Ju=Se(require("react"),1);function Zu(){function e(n){return n.length===0?oe("quickNone","None"):oe("quickCount","{count} providers",{count:n.length})}function t(n){let a=n.prefs,o=n.write,s=n.controls,l=[{value:"off",label:oe("scopeOff","Off")},{value:"hero",label:oe("scopeHero","Home only")},{value:"conversation",label:oe("scopeConversation","Conversation only")},{value:"all",label:oe("scopeAll","All")}],r=[{value:Xo,label:oe("homeClassic","Classic")},{value:ze,label:oe("homeStudio","Studio")}],g=n.quickTrigger;return[{rank:10,node:s.row("composerScope",oe("composerTitle","Composer restyle"),oe("composerDesc","Which input area the skin restyles: the new-conversation page, the conversation, or both. Off restores the host's composer."),s.segment(l,a.composerScope,c=>{o({composerScope:c})}))},{rank:20,node:s.row("homeLayout",oe("homeTitle","Home layout"),oe("homeDesc","The new-conversation page layout. Classic is the centered hero with the input card; Studio moves the greeting to the top left, pins the composer to the bottom and shows usage in between."),s.segment(r,a.homeLayout,c=>{o({homeLayout:c})}))},{rank:40,node:s.subRow("quickProviders",oe("quickTitle","Quick providers"),oe("quickDesc",`Picked providers follow the official service in the picker's first level, one rule between providers. A provider removed from the catalog stays in the list marked "Removed"; uncheck it to clear it.`),Ju.createElement("button",{type:"button",ref:g,className:"dsh-claude-settings-picker",disabled:!a.modelPicker,"aria-haspopup":"menu","aria-expanded":"false",onClick(){let c=n.quickProviderApi();c===null||g.current===null||c.toggle(g.current,u=>{o({quickProviders:u})})}},e(a.quickProviders)),a.modelPicker)}]}return{id:"composer",label:()=>oe("tabComposer","Composer"),rows:t}}function eh(){function e(t){let n=t.prefs,a=t.write,o=t.controls,s=[{value:Ro,label:oe("caretTyping","Every move")},{value:vn,label:oe("caretMove","Explicit moves")},{value:Kt,label:oe("caretOff","Off")}],l=qa("caretMotion");return[{rank:40,node:o.row("caretMotion",oe("caretTitle","Composer caret motion"),Mr(oe("caretDesc","The composer's caret is drawn by the plugin and glides between positions instead of jumping. Explicit moves glides only on an arrow key or a click, and lands instantly while typing."),l),o.segment(s,n.caretMotion,r=>{a({caretMotion:r})},l))}]}return{id:"conversation",label:()=>oe("tabConversation","Conversation"),rows:e}}var th=Se(require("react"),1);function nh(){function e(t){let n=t.prefs,a=t.write,o=t.controls,s=[{value:So,label:oe("motionSystem","Follow the system")},{value:Tt,label:oe("motionReduced","Reduced")},{value:St,label:oe("motionFull","Always")}],l=[{value:Ge,label:oe("autoPopoverOff","Off")},{value:$o,label:oe("autoPopoverAccount","Account only")},{value:Ee,label:oe("autoPopoverAll","All")}],r=[{value:xn,label:oe("banLocaleZh","中文")},{value:Go,label:oe("banLocaleEn","English")}],g=t.username;return[{rank:10,node:o.row("username",oe("usernameTitle","Username"),oe("usernameDesc","The name shown in the new-conversation greeting and the account row. Leave empty to use the signed-in account name, then the HDSL launcher name, then the local system user."),th.createElement("input",{type:"text",className:"dsh-claude-settings-input",value:g.value,maxLength:it,placeholder:oe("usernamePlaceholder","Auto-detect account or host user"),spellCheck:!1,autoComplete:"off",onChange:g.onChange,onBlur:g.onBlur,onKeyDown:g.onKeyDown}))},{rank:20,node:o.row("motion",oe("motionTitle","Animation"),oe("motionDesc","Follow the system keeps the system's animation setting in charge; Reduced holds animations on their still frame; Always plays them. The background-work ring turns in every setting."),o.segment(s,n.motion,c=>{a({motion:c})}))},{rank:30,node:o.row("autoPopover",oe("autoPopoverTitle","Open popovers on hover"),oe("autoPopoverDesc",'Which popovers open on hover. "Account only" keeps it to the sidebar account popover; "All" adds the permission, model, session-stats and home-page pickers. Off leaves every popover click-to-open.'),o.segment(l,n.autoPopover,c=>{a({autoPopover:c})}))},{rank:40,node:o.row("banLocale",oe("banLocaleTitle","Account-hold easter egg language"),oe("banLocaleDesc","The language of the account-hold easter egg page (open it from the account row at the top of the sidebar footer popover). It does not follow the interface language."),o.segment(r,n.banLocale,c=>{a({banLocale:c})}))}]}return{id:"general",label:()=>oe("tabGeneral","General"),rows:e}}function ah(){return{id:"sidebar",label:()=>oe("tabSidebar","Sidebar"),rows:()=>[]}}var D0=600,Lr=null,ta=null,vo="claude-style",Hr=[nh(),$u(),Zu(),ah(),eh()],V0=Xu();function U0(e){let t=Hr.map(n=>ke.createElement("button",{key:n.id,type:"button",role:"tab",className:Wt,"data-active":n.id===e.active?"":void 0,"aria-selected":n.id===e.active?"true":"false",onClick(){n.id!==e.active&&e.onPick(n.id)}},n.label()));return ke.createElement(yo,{role:"tablist",className:"dsh-claude-settings-tabs"},t)}function oh(e){let t=ke.useState(le()),n=t[0],a=t[1],o=ke.useState(null),s=o[0],l=o[1],r=ke.useState(n.username),g=r[0],c=r[1],u=ke.useState(Hr[0].id),y=u[0],x=u[1],m=ke.useRef(null),C=ke.useRef(null),b=ke.useRef(null);ke.useLayoutEffect(()=>{let v=b.current===null?null:b.current.parentElement;for(;v!==null&&!/(auto|scroll)/.test(getComputedStyle(v).overflowY);)v=v.parentElement;if(v!==null)return v.setAttribute(Qo,""),()=>{v.removeAttribute(Qo)}},[]),ke.useEffect(()=>{Or();let v=!0,k=nt(T=>{v&&(a(T),c(T.username))}),E=za(()=>{v&&a(T=>Object.assign({},T))});return()=>{v=!1,k(),E&&E(),m.current&&clearTimeout(m.current)}},[]);let h=v=>{l(null),a(Object.assign({},n,v)),Ea(v).then(k=>{k===null&&l(oe("unavailable","The settings store is unavailable, so changes will not be saved."))})},A=v=>{let k=v.trim().slice(0,it);k!==le().username&&(l(null),a(Object.assign({},le(),{username:k})),Ea({username:k}).then(E=>{E===null&&l(oe("unavailable","The settings store is unavailable, so changes will not be saved."))}))},w=v=>{m.current&&clearTimeout(m.current),m.current=setTimeout(()=>{m.current=null,A(v)},D0)},d=()=>{m.current&&(clearTimeout(m.current),m.current=null),A(g)},i={prefs:n,write:h,controls:V0,quickTrigger:C,quickProviderApi:()=>Lr,username:{value:g,onChange(v){c(v.target.value),w(v.target.value)},onBlur:d,onKeyDown(v){v.key==="Enter"?(v.preventDefault(),d(),v.currentTarget&&v.currentTarget.blur&&v.currentTarget.blur()):v.key==="Escape"&&(c(n.username),v.currentTarget&&v.currentTarget.blur&&v.currentTarget.blur())}}},p=Hr.find(v=>v.id===y),f=!!(e&&e.embed);return ke.createElement("div",{ref:b,className:f?"dsh-claude-settings dsh-claude-settings-embedded":"dsh-claude-settings"},f?null:ke.createElement("div",{className:"dsh-claude-settings-title"},oe("title","Claude Style")),ke.createElement(U0,{active:y,onPick:x}),ke.createElement("div",{className:"dsh-claude-settings-rows",role:"tabpanel",key:p.id},Qu(p,i)),s===null?null:ke.createElement("div",{className:"dsh-claude-settings-error"},s))}function G0(e){return e&&e.view==="summary"?ke.createElement("span",null,oe("title","Claude Style")):ke.createElement(oh,{embed:!0})}function Or(){let e=document.querySelector(':is([class*="settingsArea"], [class*="_overlay"], [class*="SettingsRoot"]) [class*="_navList"]');if(!e||e.querySelector(`[data-dsh-section="${vo}"]`)!==null)return;let t=W0();if(t<0)return;let n=e.querySelectorAll("button");t>=n.length||n[t].setAttribute("data-dsh-section",vo)}function W0(){if(ta===null||typeof ta.entries!="function")return-1;let e=ta.entries(oa);for(let t=0;t<e.length;t++){let n=e[t]===null||e[t]===void 0?null:e[t].options;if(n!=null&&n.id===vo)return t}return-1}function sh(e,t){if(an(),Ln(e),t&&(t.settingsNav={sync:Or,onPointerDown(){Or()}},Lr=t.quickProviders||null),typeof e.inject!="function")return()=>{};let n=e.inject(["slots"],a=>{let o=a.get("slots");o==null||typeof o.inject!="function"||(ta=o,a.effect(()=>o.inject(Co,()=>o.register({name:Co,key:mt,label(){return oe("title","Claude Style")}},G0)),"dsh-claude-style: plugin page"),a.effect(()=>o.inject(oa,()=>o.register({name:oa,id:vo,order:22,label(){return oe("title","Claude Style")}},oh)),"dsh-claude-style: settings section"))});return()=>{t&&t.settingsNav&&delete t.settingsNav,Lr=null,ta=null,n&&typeof n.dispose=="function"&&n.dispose()}}var bn=[{id:"selection",order:10,ungated:"修宿主失焦时的选区颜色，不改变功能",install:wi},{id:"composer",order:20,pref:"composerScope",install:Gi},{id:"homeLayout",order:30,pref:"homeLayout",install:Ji},{id:"mascot",order:40,pref:"mascot",install:gd},{id:"copy",order:50,ungated:"提示语跟随输入框改造的范围，问候语跟随首页版面",install:Ad},{id:"permissions",order:60,pref:"permissionsControl",switchRow:{tab:"composer",rank:50,title:{key:"permissionsTitle",fallback:"Redraw the permission control"},desc:{key:"permissionsDesc",fallback:"Replace the composer's permission menu with a segmented control and move the session numbers into the context popover. Off restores the host's permission menu and statistics dialogs."}},install:kd},{id:"contextStats",order:70,pref:"permissionsControl",install:Id},{id:"model",order:80,pref:"modelPicker",switchRow:{tab:"composer",rank:30,title:{key:"pickerTitle",fallback:"Redraw the model picker"},desc:{key:"pickerDesc",fallback:"Replace the composer's model menu with the two-level Claude-style menu. Off restores the host's model menu."}},install:zd},{id:"effort",order:90,pref:"modelPicker",install:Vd},{id:"heroMenu",order:100,ungated:"跟随输入框改造的首页范围",install:Ud},{id:"quickProviders",order:110,ungated:"模型选择器的设置项，不在界面上出现",install:Gd},{id:"footer",order:120,pref:"collapseFooter",switchRow:{tab:"sidebar",rank:10,title:{key:"collapseTitle",fallback:"Collapse the sidebar settings area"},desc:{key:"collapseDesc",fallback:"Fold the sidebar footer's settings entry into the account popover. Off restores the host's footer."}},install:Xd},{id:"ban",order:130,ungated:"彩蛋页只在点击账号行时出现",install:Jd},{id:"themeFlip",order:140,ungated:"修主题切换瞬间的颜色跳变，不改变功能",install:ec},{id:"workspace",order:150,pref:"workspaceView",switchRow:{tab:"sidebar",rank:30,title:{key:"workspaceTitle",fallback:"In progress / Archived view"},desc:{key:"workspaceDesc",fallback:"Split the sidebar's workspace section into In progress and Archived; archived conversations can be restored or deleted. Off restores the host's workspace list."}},install:tc},{id:"search",order:160,pref:"sidebarSearch",switchRow:{tab:"sidebar",rank:20,title:{key:"searchTitle",fallback:"Sidebar search"},desc:{key:"searchDesc",fallback:"A search box in the sidebar's brand row that finds sessions, projects, plugins, Skills and shortcuts. Off restores the host's brand row."}},install:sc},{id:"turnStatus",order:170,pref:"turnStatus",switchRow:{tab:"conversation",rank:10,title:{key:"turnStatusTitle",fallback:"Turn status line"},desc:{key:"turnStatusDesc",fallback:"Move the status of a running, stopped or failed turn to the end of the turn's work, with the elapsed time, the output tokens and what the model is doing; while a turn runs that line is pinned above the composer, so appended content does not drag it around. Off restores the host's turn status."}},install:rc},{id:"turnNav",order:180,pref:"turnNav",switchRow:{tab:"conversation",rank:20,title:{key:"turnNavTitle",fallback:"Conversation navigator"},desc:{key:"turnNavDesc",fallback:"Rest the pointer on the turn marks at the conversation's right edge and they open into a list of every turn, one line each with the message that started it; the wheel scrolls the list and a click jumps to that turn. Alt+↑ and Alt+↓ jump to the previous or the next turn, and the turn you land on is marked with a short line. Off restores the host's turn marks."}},install:ic},{id:"chatFollow",order:190,pref:"chatAnimations",yieldsTo:"dsh-chat-ux",switchRow:{tab:"conversation",rank:30,title:{key:"chatAnimationsTitle",fallback:"Chat-area animations"},desc:{key:"chatAnimationsDesc",fallback:"The conversation area's animations in one switch: the view follows the newest line as an answer grows, gliding there and catching up the same way inside a scrolling work log; the thinking row and a running step open and fold back by themselves, and a press rolls a height open or shut; new text fades in as it arrives; a write or edit run from inside a program is shown as a row carrying its +n -m count; and the composer lifts into the message bubble on send. Off stops all of them and the host's own behaviour returns."}},install:fc},{id:"chatFold",order:200,pref:"chatAnimations",yieldsTo:"dsh-chat-ux",install:Sc},{id:"chatReveal",order:210,pref:"chatAnimations",yieldsTo:"dsh-chat-ux",install:Yc},{id:"chatFiles",order:220,pref:"chatAnimations",yieldsTo:"dsh-chat-ux",install:yu},{id:"chatSend",order:230,pref:"chatAnimations",yieldsTo:"dsh-chat-ux",install:Du},{id:"caret",order:240,pref:"caretMotion",yieldsTo:"dsh-chat-ux",install:ju},{id:"viewTabs",order:250,pref:"viewTabs",switchRow:{tab:"conversation",rank:50,title:{key:"viewTabsTitle",fallback:"Chat / Trajectory tabs"},desc:{key:"viewTabsDesc",fallback:"Redraw the Chat / Trajectory tab strip at the top of the conversation, lifted onto the title's line when it fits. Off restores the host's tab strip."}},install:Yu},{id:"headerBand",order:255,pref:"headerBand",switchRow:{tab:"conversation",rank:60,title:{key:"headerBandTitle",fallback:"Header in the title bar"},desc:{key:"headerBandDesc",fallback:"Lift the conversation's title and its header controls into the desktop title bar when they fit, and let the rest of the title row close up to the left. Off leaves the header as the host draws it."}},install:Ku},{id:"settings",handle:"settingsNav",order:260,ungated:"设置页本身",install:sh}];Va();var lh=e=>Object.hasOwn(Vr,e.pref??""),rh=e=>lh(e)||e.yieldsTo!==void 0;function q0(e){return lh(e)&&le()[e.pref]===!1?!1:e.yieldsTo===void 0||!Ua(e.yieldsTo)}function j0(e){let t=document.body,n={retire:m},a=[],o=new Set,s=null,l=null,r=null,g=null,c=!1,u=Ga();function y(i=[]){s!==null&&(s(),s=null);let p=[];for(let f=a.length-1;f>=0;f--){if(i.includes(a[f].id)){p.push(a[f]);continue}try{a[f].stop()}catch(v){reportError(v)}}a=p.reverse(),Fl(),t.removeAttribute("data-dsh-claude-style"),t.removeAttribute(Yo),g!==null&&(g(),g=null)}function x(){c||(c=!0,r!==null&&(r(),r=null),y(),l!==null&&(l(),l=null),As(null),Hl())}e.effect(()=>x,"dsh-claude-style: Claude Code desktop theme");function m(i){o.add(i);let p=a.findIndex(f=>f.id===i||f.handle===i);if(p!==-1&&a[p].id===i){let f=a[p].stop;a.splice(p,1);try{f()}catch(v){reportError(v)}}i==="footer"&&Pl(),i==="composer"&&Il()}function C(i,p,f){try{let v=f();return typeof v=="function"&&a.push({id:i,handle:p,stop:v}),!0}catch(v){return Ba(i,v),m(i),!1}}let b=i=>C(i.id,Wa(i),()=>i.install(e,n));function h(i){let p=Wa(i),f=q0(i),v=a.findIndex(E=>E.id===i.id);if(f&&v===-1&&!o.has(i.id)){b(i);return}if(f||v===-1)return;let k=a[v].stop;a.splice(v,1),delete n[p];try{k()}catch(E){Ba(i.id,E),o.add(i.id)}}function A(){t.setAttribute("data-dsh-claude-style",Es),t.setAttribute(Yo,Es),ka(ct),g===null&&(g=pi());for(let i of bn)o.has(i.id)||a.some(p=>p.id===i.id)||(rh(i)?h(i):b(i));s===null&&(s=nt(()=>{for(let i of w)h(i);typeof n.schedule=="function"&&n.schedule()})),!a.some(i=>i.id==="scheduler")&&(C("scheduler",null,()=>di(e,n,d))||x())}As(e),Ln(e),typeof e.inject=="function"&&e.inject(["configForms"],()=>{Ln(e)}),an(),ei(),ni(),ka(ct),yi(bn);let w=bn.filter(rh),d=bn.map(Wa);if(l=gi(()=>{}),r=bi(i=>{i!==u&&(u=i,i?y(["settings"]):A())}),u){b(bn.find(i=>i.id==="settings")),y(["settings"]);return}A()}
    return module.exports
  },
})
//# sourceMappingURL=client.js.map
