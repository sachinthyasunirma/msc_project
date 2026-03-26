import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const targets = [".next", ".next-dev"];

const devRoutesManifest = {
  version: 3,
  pages404: true,
  caseSensitive: false,
  basePath: "",
  redirects: [],
  headers: [],
  rewrites: {
    beforeFiles: [],
    afterFiles: [],
    fallback: [],
  },
  dynamicRoutes: [],
  staticRoutes: [
    {
      page: "/favicon.ico",
      regex: "^/favicon\\.ico(?:/)?$",
      routeKeys: {},
      namedRegex: "^/favicon\\.ico(?:/)?$",
    },
  ],
  dataRoutes: [],
  rsc: {
    header: "rsc",
    varyHeader:
      "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch",
    prefetchHeader: "next-router-prefetch",
    didPostponeHeader: "x-nextjs-postponed",
    contentTypeHeader: "text/x-component",
    suffix: ".rsc",
    prefetchSuffix: ".prefetch.rsc",
    prefetchSegmentHeader: "next-router-segment-prefetch",
    prefetchSegmentSuffix: ".segment.rsc",
    prefetchSegmentDirSuffix: ".segments",
  },
  rewriteHeaders: {
    pathHeader: "x-nextjs-rewritten-path",
    queryHeader: "x-nextjs-rewritten-query",
  },
};

await Promise.all(
  targets.map(async (target) => {
    const fullPath = path.join(projectRoot, target);
    await rm(fullPath, {
      recursive: true,
      force: true,
      maxRetries: 2,
      retryDelay: 100,
    });
  })
);

const devDir = path.join(projectRoot, ".next-dev");
await mkdir(devDir, { recursive: true });
await writeFile(
  path.join(devDir, "routes-manifest.json"),
  `${JSON.stringify(devRoutesManifest, null, 2)}\n`,
  "utf8"
);
