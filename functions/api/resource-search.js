import {resourceResponse} from '../../lib/resource-proxy.mjs';
export function onRequest(context){
  return resourceResponse(context.request,{cache:caches.default,waitUntil:promise=>context.waitUntil(promise)});
}
