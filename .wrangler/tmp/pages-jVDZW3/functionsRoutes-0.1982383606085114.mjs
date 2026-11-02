import { onRequestGet as __api_config_js_onRequestGet } from "/Users/jedai/Documents/NetworkLink/Code/All-line-POC/POC-line-message/functions/api/config.js"
import { onRequestPost as __api_notify_js_onRequestPost } from "/Users/jedai/Documents/NetworkLink/Code/All-line-POC/POC-line-message/functions/api/notify.js"
import { onRequestPost as __webhook_js_onRequestPost } from "/Users/jedai/Documents/NetworkLink/Code/All-line-POC/POC-line-message/functions/webhook.js"

export const routes = [
    {
      routePath: "/api/config",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_config_js_onRequestGet],
    },
  {
      routePath: "/api/notify",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_notify_js_onRequestPost],
    },
  {
      routePath: "/webhook",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__webhook_js_onRequestPost],
    },
  ]