var I=Object.create;var m=Object.defineProperty;var A=Object.getOwnPropertyDescriptor;var P=Object.getOwnPropertyNames;var S=Object.getPrototypeOf,K=Object.prototype.hasOwnProperty;var k=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports);var F=(t,e,n,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of P(e))!K.call(t,s)&&s!==n&&m(t,s,{get:()=>e[s],enumerable:!(r=A(e,s))||r.enumerable});return t};var U=(t,e,n)=>(n=t!=null?I(S(t)):{},F(e||!t||!t.__esModule?m(n,"default",{value:t,enumerable:!0}):n,t));var T=k(C=>{"use strict";var c=typeof Reflect=="object"?Reflect:null,y=c&&typeof c.apply=="function"?c.apply:function(e,n,r){return Function.prototype.apply.call(e,n,r)},h;c&&typeof c.ownKeys=="function"?h=c.ownKeys:Object.getOwnPropertySymbols?h=function(e){return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))}:h=function(e){return Object.getOwnPropertyNames(e)};function W(t){console&&console.warn&&console.warn(t)}var L=Number.isNaN||function(e){return e!==e};function o(){o.init.call(this)}o.EventEmitter=o;o.prototype._events=void 0;o.prototype._eventsCount=0;o.prototype._maxListeners=void 0;var g=10;function p(t){if(typeof t!="function")throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof t)}Object.defineProperty(o,"defaultMaxListeners",{enumerable:!0,get:function(){return g},set:function(t){if(typeof t!="number"||t<0||L(t))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+t+".");g=t}});o.init=function(){(this._events===void 0||this._events===Object.getPrototypeOf(this)._events)&&(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0};o.prototype.setMaxListeners=function(e){if(typeof e!="number"||e<0||L(e))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+e+".");return this._maxListeners=e,this};function w(t){return t._maxListeners===void 0?o.defaultMaxListeners:t._maxListeners}o.prototype.getMaxListeners=function(){return w(this)};o.prototype.emit=function(e){for(var n=[],r=1;r<arguments.length;r++)n.push(arguments[r]);var s=e==="error",u=this._events;if(u!==void 0)s=s&&u.error===void 0;else if(!s)return!1;if(s){var i;if(n.length>0&&(i=n[0]),i instanceof Error)throw i;var f=new Error("Unhandled error."+(i?" ("+i.message+")":""));throw f.context=i,f}var a=u[e];if(a===void 0)return!1;if(typeof a=="function")y(a,this,n);else for(var l=a.length,j=x(a,l),r=0;r<l;++r)y(j[r],this,n);return!0};function b(t,e,n,r){var s,u,i;if(p(n),u=t._events,u===void 0?(u=t._events=Object.create(null),t._eventsCount=0):(u.newListener!==void 0&&(t.emit("newListener",e,n.listener?n.listener:n),u=t._events),i=u[e]),i===void 0)i=u[e]=n,++t._eventsCount;else if(typeof i=="function"?i=u[e]=r?[n,i]:[i,n]:r?i.unshift(n):i.push(n),s=w(t),s>0&&i.length>s&&!i.warned){i.warned=!0;var f=new Error("Possible EventEmitter memory leak detected. "+i.length+" "+String(e)+" listeners added. Use emitter.setMaxListeners() to increase limit");f.name="MaxListenersExceededWarning",f.emitter=t,f.type=e,f.count=i.length,W(f)}return t}o.prototype.addListener=function(e,n){return b(this,e,n,!1)};o.prototype.on=o.prototype.addListener;o.prototype.prependListener=function(e,n){return b(this,e,n,!0)};function D(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,arguments.length===0?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function _(t,e,n){var r={fired:!1,wrapFn:void 0,target:t,type:e,listener:n},s=D.bind(r);return s.listener=n,r.wrapFn=s,s}o.prototype.once=function(e,n){return p(n),this.on(e,_(this,e,n)),this};o.prototype.prependOnceListener=function(e,n){return p(n),this.prependListener(e,_(this,e,n)),this};o.prototype.removeListener=function(e,n){var r,s,u,i,f;if(p(n),s=this._events,s===void 0)return this;if(r=s[e],r===void 0)return this;if(r===n||r.listener===n)--this._eventsCount===0?this._events=Object.create(null):(delete s[e],s.removeListener&&this.emit("removeListener",e,r.listener||n));else if(typeof r!="function"){for(u=-1,i=r.length-1;i>=0;i--)if(r[i]===n||r[i].listener===n){f=r[i].listener,u=i;break}if(u<0)return this;u===0?r.shift():J(r,u),r.length===1&&(s[e]=r[0]),s.removeListener!==void 0&&this.emit("removeListener",e,f||n)}return this};o.prototype.off=o.prototype.removeListener;o.prototype.removeAllListeners=function(e){var n,r,s;if(r=this._events,r===void 0)return this;if(r.removeListener===void 0)return arguments.length===0?(this._events=Object.create(null),this._eventsCount=0):r[e]!==void 0&&(--this._eventsCount===0?this._events=Object.create(null):delete r[e]),this;if(arguments.length===0){var u=Object.keys(r),i;for(s=0;s<u.length;++s)i=u[s],i!=="removeListener"&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if(n=r[e],typeof n=="function")this.removeListener(e,n);else if(n!==void 0)for(s=n.length-1;s>=0;s--)this.removeListener(e,n[s]);return this};function E(t,e,n){var r=t._events;if(r===void 0)return[];var s=r[e];return s===void 0?[]:typeof s=="function"?n?[s.listener||s]:[s]:n?Y(s):x(s,s.length)}o.prototype.listeners=function(e){return E(this,e,!0)};o.prototype.rawListeners=function(e){return E(this,e,!1)};o.listenerCount=function(t,e){return typeof t.listenerCount=="function"?t.listenerCount(e):O.call(t,e)};o.prototype.listenerCount=O;function O(t){var e=this._events;if(e!==void 0){var n=e[t];if(typeof n=="function")return 1;if(n!==void 0)return n.length}return 0}o.prototype.eventNames=function(){return this._eventsCount>0?h(this._events):[]};function x(t,e){for(var n=new Array(e),r=0;r<e;++r)n[r]=t[r];return n}function J(t,e){for(;e+1<t.length;e++)t[e]=t[e+1];t.pop()}function Y(t){for(var e=new Array(t.length),n=0;n<e.length;++n)e[n]=t[n].listener||t[n];return e}var d=class extends o{constructor(){super(),this.ws=null,this.tries=0}async connect(){let e=6463+this.tries%10;this.tries+=1,this.ws=new WebSocket(`ws://127.0.0.1:${e}/?v=1&client_id=1130698654987067493`),this.ws.onopen=this.onOpen.bind(this),this.ws.onclose=this.onClose.bind(this),this.ws.onerror=this.onError.bind(this),this.ws.onmessage=this.onMessage.bind(this)}onOpen(){this.emit("open")}onClose(e){e.wasClean&&this.emit("close",e)}onError(e){try{this.ws.close()}catch{}this.tries>20?this.emit("error",e.error):setTimeout(()=>{this.connect()},250)}onMessage(e){this.emit("message",JSON.parse(e.data))}send(e){this.ws.send(JSON.stringify(e))}ping(){}close(){return new Promise(e=>{this.once("close",e),this.ws.close()})}};C=d});var N=U(T());import{store as $,intercept as G,currentMediaItem as H}from"@neptune";import{getMediaURLFromID as V}from"@neptune/utils";var M=[],v=t=>t.length>=128?t.slice(0,125)+"...":t,R=new N.default;M.push(G("playbackControls/TIME_UPDATE",([t])=>{let e=$.getState(),{item:n,type:r}=H;if(r!="track")return;let s=V(n.album.cover),u=new Date,i=u.getTime()/1e3|0,f=u.setSeconds(u.getSeconds()+(n.duration-t)),a=e.playbackControls.playbackState=="NOT_PLAYING";R.send({cmd:"SET_ACTIVITY",args:{pid:2094112,activity:{...a?{smallImageKey:"paused-icon",smallImageText:"Paused"}:{startTimestamp:i,endTimestamp:f},type:2,name:v(n.title),details:v("by "+n.artists.map(l=>l.name).join(", ")),largeImageKey:s,largeImageText:`on ${v(n.album.title)}`}}})}));async function X(){M.forEach(t=>t());try{R.close()}catch{}}export{X as onUnload};
