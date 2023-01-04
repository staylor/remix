import compression from "compression";
import express from "express";
import getPort, { makeRange } from "get-port";
import { createProxyMiddleware } from "http-proxy-middleware";
import os from "os";
import path from "node:path";
import prettyMs from "pretty-ms";

import * as Compiler from "../compiler";
import type { RemixConfig } from "../config";
import { loadEnv } from "../env";
import * as Socket from "./utils/socket";

let relativePath = (file: string) => path.relative(process.cwd(), file);

let getHost = () =>
  process.env.HOST ??
  Object.values(os.networkInterfaces())
    .flat()
    .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address;

let findPort = async (portPreference?: number) =>
  getPort({
    port:
      // prettier-ignore
      portPreference ? Number(portPreference) :
        process.env.PORT ? Number(process.env.PORT) :
          makeRange(3001, 3100),
  });

let sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export let serve = async (config: RemixConfig, proxyPort: number) => {
  let { default: waitForLocalhost } = await import("wait-for-localhost");
  await loadEnv(config.rootDirectory);

  // watch and live reload on rebuilds
  let socket = Socket.serve({
    port: config.devServerPort,
    delayMs: config.devServerBroadcastDelay,
  });
  let dispose = await Compiler.watch(config, {
    mode: "development",
    onInitialBuild: (durationMs) =>
      console.info(`💿 Built in ${prettyMs(durationMs)}`),
    onRebuildStart: () => socket.log("Rebuilding..."),
    onRebuildFinish: async (durationMs: number) => {
      socket.log(`Rebuilt in ${prettyMs(durationMs)}`);
      await sleep(100) // TODO: race condition. need to retry proxy when `/*` requests are sent until server is up
      await waitForLocalhost({ port: proxyPort })
      socket.reload();
    },
    onFileCreated: (file) => socket.log(`File created: ${relativePath(file)}`),
    onFileChanged: (file) => socket.log(`File changed: ${relativePath(file)}`),
    onFileDeleted: (file) => socket.log(`File deleted: ${relativePath(file)}`),
  });

  let app = express();
  app.disable("x-powered-by");
  app.use(compression());

  // for public path requests, statically serve assets
  app.use(
    config.publicPath,
    express.static(config.assetsBuildDirectory, {
      // fingerprinted assets
      immutable: true,
      maxAge: "1y",
    })
  );

  // proxy everything else to the user-defined server
  let host = getHost();
  let port = await findPort();
  let proxy = createProxyMiddleware({
    target: `http://${host ?? "localhost"}:${proxyPort}`,
    changeOrigin: true,
  });
  app.use("/*", proxy);

  let onListen = () => {
    let message = `Remix Dev Server started at http://localhost:${port}`;
    if (host) message += ` (http://${host}:${port})`;
    console.info(message);
  };
  // TODO why does setting host cause things to break? try again...
  // devServer = host
  //   ? app.listen(port, host, onListen)
  //   : app.listen(port, onListen);
  let devServer = app.listen(port, onListen);

  // TODO exit hook: clean up assetsBuildDirectory and serverBuildPath?

  return async () => {
    await dispose();
    devServer.close();
    socket.close();
  };
};
