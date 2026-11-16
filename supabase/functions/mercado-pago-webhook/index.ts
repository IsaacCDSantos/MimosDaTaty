import { dependencias } from '../checkout/runtime.ts'
import { criarHandlerWebhook } from './handler.js'
Deno.serve(criarHandlerWebhook(dependencias))
