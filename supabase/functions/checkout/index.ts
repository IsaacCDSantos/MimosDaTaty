import { criarHandlerCheckout } from './handler.js'
import { dependencias } from './runtime.ts'
Deno.serve(criarHandlerCheckout(dependencias))
