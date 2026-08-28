import { secureHeaders } from "hono/secure-headers";

export const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
  crossOriginResourcePolicy: "same-site",
  referrerPolicy: "no-referrer",
  xFrameOptions: "DENY",
});
