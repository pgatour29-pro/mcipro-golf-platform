var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/@netlify/blobs/dist/main.cjs
var require_main = __commonJS({
  "node_modules/@netlify/blobs/dist/main.cjs"(exports2, module2) {
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var main_exports = {};
    __export(main_exports, {
      BlobsServer: () => BlobsServer,
      getDeployStore: () => getDeployStore,
      getStore: () => getStore2
    });
    module2.exports = __toCommonJS(main_exports);
    var BlobsConsistencyError = class extends Error {
      constructor() {
        super(
          `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
        );
        this.name = "BlobsConsistencyError";
      }
    };
    var import_node_buffer = require("buffer");
    var import_node_process = require("process");
    var getEnvironmentContext = () => {
      const context = globalThis.netlifyBlobsContext || import_node_process.env.NETLIFY_BLOBS_CONTEXT;
      if (typeof context !== "string" || !context) {
        return {};
      }
      const data = import_node_buffer.Buffer.from(context, "base64").toString();
      try {
        return JSON.parse(data);
      } catch {
      }
      return {};
    };
    var MissingBlobsEnvironmentError = class extends Error {
      constructor(requiredProperties) {
        super(
          `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
            ", "
          )}`
        );
        this.name = "MissingBlobsEnvironmentError";
      }
    };
    var import_node_buffer2 = require("buffer");
    var BASE64_PREFIX = "b64;";
    var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
    var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
    var METADATA_MAX_SIZE = 2 * 1024;
    var encodeMetadata = (metadata) => {
      if (!metadata) {
        return null;
      }
      const encodedObject = import_node_buffer2.Buffer.from(JSON.stringify(metadata)).toString("base64");
      const payload = `b64;${encodedObject}`;
      if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
        throw new Error("Metadata object exceeds the maximum size");
      }
      return payload;
    };
    var decodeMetadata = (header) => {
      if (!header || !header.startsWith(BASE64_PREFIX)) {
        return {};
      }
      const encodedData = header.slice(BASE64_PREFIX.length);
      const decodedData = import_node_buffer2.Buffer.from(encodedData, "base64").toString();
      const metadata = JSON.parse(decodedData);
      return metadata;
    };
    var getMetadataFromResponse = (response) => {
      if (!response.headers) {
        return {};
      }
      const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
      try {
        return decodeMetadata(value);
      } catch {
        throw new Error(
          "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
        );
      }
    };
    var DEFAULT_RETRY_DELAY = 5e3;
    var MIN_RETRY_DELAY = 1e3;
    var MAX_RETRY = 5;
    var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
    var fetchAndRetry = async (fetch, url, options, attemptsLeft = MAX_RETRY) => {
      try {
        const res = await fetch(url, options);
        if (attemptsLeft > 0 && (res.status === 429 || res.status >= 500)) {
          const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
          await sleep(delay);
          return fetchAndRetry(fetch, url, options, attemptsLeft - 1);
        }
        return res;
      } catch (error) {
        if (attemptsLeft === 0) {
          throw error;
        }
        const delay = getDelay();
        await sleep(delay);
        return fetchAndRetry(fetch, url, options, attemptsLeft - 1);
      }
    };
    var getDelay = (rateLimitReset) => {
      if (!rateLimitReset) {
        return DEFAULT_RETRY_DELAY;
      }
      return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
    };
    var sleep = (ms) => new Promise((resolve2) => {
      setTimeout(resolve2, ms);
    });
    var Client = class {
      constructor({ apiURL, consistency, edgeURL, fetch, siteID, token, uncachedEdgeURL }) {
        this.apiURL = apiURL;
        this.consistency = consistency ?? "eventual";
        this.edgeURL = edgeURL;
        this.fetch = fetch ?? globalThis.fetch;
        this.siteID = siteID;
        this.token = token;
        this.uncachedEdgeURL = uncachedEdgeURL;
        if (!this.fetch) {
          throw new Error(
            "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
          );
        }
      }
      async getFinalRequest({
        consistency: opConsistency,
        key,
        metadata,
        method,
        parameters = {},
        storeName
      }) {
        const encodedMetadata = encodeMetadata(metadata);
        const consistency = opConsistency ?? this.consistency;
        if (this.edgeURL) {
          if (consistency === "strong" && !this.uncachedEdgeURL) {
            throw new BlobsConsistencyError();
          }
          const headers = {
            authorization: `Bearer ${this.token}`
          };
          if (encodedMetadata) {
            headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
          }
          const path = key ? `/${this.siteID}/${storeName}/${key}` : `/${this.siteID}/${storeName}`;
          const url2 = new URL(path, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
          for (const key2 in parameters) {
            url2.searchParams.set(key2, parameters[key2]);
          }
          return {
            headers,
            url: url2.toString()
          };
        }
        const apiHeaders = { authorization: `Bearer ${this.token}` };
        const url = new URL(`/api/v1/sites/${this.siteID}/blobs`, this.apiURL ?? "https://api.netlify.com");
        for (const key2 in parameters) {
          url.searchParams.set(key2, parameters[key2]);
        }
        url.searchParams.set("context", storeName);
        if (key === void 0) {
          return {
            headers: apiHeaders,
            url: url.toString()
          };
        }
        url.pathname += `/${key}`;
        if (encodedMetadata) {
          apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
        }
        if (method === "head") {
          return {
            headers: apiHeaders,
            url: url.toString()
          };
        }
        const res = await this.fetch(url.toString(), { headers: apiHeaders, method });
        if (res.status !== 200) {
          throw new Error(`Netlify Blobs has generated an internal error: ${res.status} response`);
        }
        const { url: signedURL } = await res.json();
        const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
        return {
          headers: userHeaders,
          url: signedURL
        };
      }
      async makeRequest({
        body,
        consistency,
        headers: extraHeaders,
        key,
        metadata,
        method,
        parameters,
        storeName
      }) {
        const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
          consistency,
          key,
          metadata,
          method,
          parameters,
          storeName
        });
        const headers = {
          ...baseHeaders,
          ...extraHeaders
        };
        if (method === "put") {
          headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
        }
        const options = {
          body,
          headers,
          method
        };
        if (body instanceof ReadableStream) {
          options.duplex = "half";
        }
        return fetchAndRetry(this.fetch, url, options);
      }
    };
    var getClientOptions = (options, contextOverride) => {
      const context = contextOverride ?? getEnvironmentContext();
      const siteID = context.siteID ?? options.siteID;
      const token = context.token ?? options.token;
      if (!siteID || !token) {
        throw new MissingBlobsEnvironmentError(["siteID", "token"]);
      }
      const clientOptions = {
        apiURL: context.apiURL ?? options.apiURL,
        consistency: options.consistency,
        edgeURL: context.edgeURL ?? options.edgeURL,
        fetch: options.fetch,
        siteID,
        token,
        uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
      };
      return clientOptions;
    };
    var import_node_buffer3 = require("buffer");
    var BlobsInternalError = class extends Error {
      constructor(statusCode) {
        super(`Netlify Blobs has generated an internal error: ${statusCode} response`);
        this.name = "BlobsInternalError";
      }
    };
    var collectIterator = async (iterator) => {
      const result = [];
      for await (const item of iterator) {
        result.push(item);
      }
      return result;
    };
    var isNodeError = (error) => error instanceof Error;
    var Store = class _Store {
      constructor(options) {
        this.client = options.client;
        this.consistency = options.consistency ?? "eventual";
        if ("deployID" in options) {
          _Store.validateDeployID(options.deployID);
          this.name = `deploy:${options.deployID}`;
        } else {
          _Store.validateStoreName(options.name);
          this.name = options.name;
        }
      }
      async delete(key) {
        const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
        if (![200, 204, 404].includes(res.status)) {
          throw new BlobsInternalError(res.status);
        }
      }
      async get(key, options) {
        const { consistency, type } = options ?? {};
        const res = await this.client.makeRequest({ consistency, key, method: "get", storeName: this.name });
        if (res.status === 404) {
          return null;
        }
        if (res.status !== 200) {
          throw new BlobsInternalError(res.status);
        }
        if (type === void 0 || type === "text") {
          return res.text();
        }
        if (type === "arrayBuffer") {
          return res.arrayBuffer();
        }
        if (type === "blob") {
          return res.blob();
        }
        if (type === "json") {
          return res.json();
        }
        if (type === "stream") {
          return res.body;
        }
        throw new BlobsInternalError(res.status);
      }
      async getMetadata(key, { consistency } = {}) {
        const res = await this.client.makeRequest({ consistency, key, method: "head", storeName: this.name });
        if (res.status === 404) {
          return null;
        }
        if (res.status !== 200 && res.status !== 304) {
          throw new BlobsInternalError(res.status);
        }
        const etag = res?.headers.get("etag") ?? void 0;
        const metadata = getMetadataFromResponse(res);
        const result = {
          etag,
          metadata
        };
        return result;
      }
      async getWithMetadata(key, options) {
        const { consistency, etag: requestETag, type } = options ?? {};
        const headers = requestETag ? { "if-none-match": requestETag } : void 0;
        const res = await this.client.makeRequest({
          consistency,
          headers,
          key,
          method: "get",
          storeName: this.name
        });
        if (res.status === 404) {
          return null;
        }
        if (res.status !== 200 && res.status !== 304) {
          throw new BlobsInternalError(res.status);
        }
        const responseETag = res?.headers.get("etag") ?? void 0;
        const metadata = getMetadataFromResponse(res);
        const result = {
          etag: responseETag,
          metadata
        };
        if (res.status === 304 && requestETag) {
          return { data: null, ...result };
        }
        if (type === void 0 || type === "text") {
          return { data: await res.text(), ...result };
        }
        if (type === "arrayBuffer") {
          return { data: await res.arrayBuffer(), ...result };
        }
        if (type === "blob") {
          return { data: await res.blob(), ...result };
        }
        if (type === "json") {
          return { data: await res.json(), ...result };
        }
        if (type === "stream") {
          return { data: res.body, ...result };
        }
        throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
      }
      list(options = {}) {
        const iterator = this.getListIterator(options);
        if (options.paginate) {
          return iterator;
        }
        return collectIterator(iterator).then(
          (items) => items.reduce(
            (acc, item) => ({
              blobs: [...acc.blobs, ...item.blobs],
              directories: [...acc.directories, ...item.directories]
            }),
            { blobs: [], directories: [] }
          )
        );
      }
      async set(key, data, { metadata } = {}) {
        _Store.validateKey(key);
        const res = await this.client.makeRequest({
          body: data,
          key,
          metadata,
          method: "put",
          storeName: this.name
        });
        if (res.status !== 200) {
          throw new BlobsInternalError(res.status);
        }
      }
      async setJSON(key, data, { metadata } = {}) {
        _Store.validateKey(key);
        const payload = JSON.stringify(data);
        const headers = {
          "content-type": "application/json"
        };
        const res = await this.client.makeRequest({
          body: payload,
          headers,
          key,
          metadata,
          method: "put",
          storeName: this.name
        });
        if (res.status !== 200) {
          throw new BlobsInternalError(res.status);
        }
      }
      static formatListResultBlob(result) {
        if (!result.key) {
          return null;
        }
        return {
          etag: result.etag,
          key: result.key
        };
      }
      static validateKey(key) {
        if (key === "") {
          throw new Error("Blob key must not be empty.");
        }
        if (key.startsWith("/") || key.startsWith("%2F")) {
          throw new Error("Blob key must not start with forward slash (/).");
        }
        if (import_node_buffer3.Buffer.byteLength(key, "utf8") > 600) {
          throw new Error(
            "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
          );
        }
      }
      static validateDeployID(deployID) {
        if (!/^\w{1,24}$/.test(deployID)) {
          throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
        }
      }
      static validateStoreName(name) {
        if (name.startsWith("deploy:") || name.startsWith("deploy%3A1")) {
          throw new Error("Store name must not start with the `deploy:` reserved keyword.");
        }
        if (name.includes("/") || name.includes("%2F")) {
          throw new Error("Store name must not contain forward slashes (/).");
        }
        if (import_node_buffer3.Buffer.byteLength(name, "utf8") > 64) {
          throw new Error(
            "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
          );
        }
      }
      getListIterator(options) {
        const { client, name: storeName } = this;
        const parameters = {};
        if (options?.prefix) {
          parameters.prefix = options.prefix;
        }
        if (options?.directories) {
          parameters.directories = "true";
        }
        return {
          [Symbol.asyncIterator]() {
            let currentCursor = null;
            let done = false;
            return {
              async next() {
                if (done) {
                  return { done: true, value: void 0 };
                }
                const nextParameters = { ...parameters };
                if (currentCursor !== null) {
                  nextParameters.cursor = currentCursor;
                }
                const res = await client.makeRequest({
                  method: "get",
                  parameters: nextParameters,
                  storeName
                });
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                const blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                return {
                  done: false,
                  value: {
                    blobs,
                    directories: page.directories ?? []
                  }
                };
              }
            };
          }
        };
      }
    };
    var getDeployStore = (options = {}) => {
      const context = getEnvironmentContext();
      const deployID = options.deployID ?? context.deployID;
      if (!deployID) {
        throw new MissingBlobsEnvironmentError(["deployID"]);
      }
      const clientOptions = getClientOptions(options, context);
      const client = new Client(clientOptions);
      return new Store({ client, deployID });
    };
    var getStore2 = (input) => {
      if (typeof input === "string") {
        const clientOptions = getClientOptions({});
        const client = new Client(clientOptions);
        return new Store({ client, name: input });
      }
      if (typeof input?.name === "string") {
        const { name } = input;
        const clientOptions = getClientOptions(input);
        if (!name) {
          throw new MissingBlobsEnvironmentError(["name"]);
        }
        const client = new Client(clientOptions);
        return new Store({ client, name });
      }
      if (typeof input?.deployID === "string") {
        const clientOptions = getClientOptions(input);
        const { deployID } = input;
        if (!deployID) {
          throw new MissingBlobsEnvironmentError(["deployID"]);
        }
        const client = new Client(clientOptions);
        return new Store({ client, deployID });
      }
      throw new Error(
        "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
      );
    };
    var import_node_crypto = require("crypto");
    var import_node_fs = require("fs");
    var import_node_http = __toESM(require("http"), 1);
    var import_node_os = require("os");
    var import_node_path = require("path");
    var import_node_process2 = require("process");
    var import_node_stream = __toESM(require("stream"), 1);
    var import_node_util = require("util");
    var API_URL_PATH = /\/api\/v1\/sites\/(?<site_id>[^/]+)\/blobs\/?(?<key>[^?]*)/;
    var DEFAULT_STORE = "production";
    var pipeline = (0, import_node_util.promisify)(import_node_stream.default.pipeline);
    var BlobsServer = class _BlobsServer {
      constructor({ debug, directory, logger, onRequest, port, token }) {
        this.address = "";
        this.debug = debug === true;
        this.directory = directory;
        this.logger = logger ?? console.log;
        this.onRequest = onRequest ?? (() => {
        });
        this.port = port || 0;
        this.token = token;
        this.tokenHash = (0, import_node_crypto.createHmac)("sha256", Math.random.toString()).update(token ?? Math.random.toString()).digest("hex");
      }
      logDebug(...message) {
        if (!this.debug) {
          return;
        }
        this.logger("[Netlify Blobs server]", ...message);
      }
      async delete(req, res) {
        const apiMatch = this.parseAPIRequest(req);
        if (apiMatch) {
          return this.sendResponse(req, res, 200, JSON.stringify({ url: apiMatch.url.toString() }));
        }
        const url = new URL(req.url ?? "", this.address);
        const { dataPath, key, metadataPath } = this.getLocalPaths(url);
        if (!dataPath || !key) {
          return this.sendResponse(req, res, 400);
        }
        try {
          await import_node_fs.promises.rm(metadataPath, { force: true, recursive: true });
        } catch {
        }
        try {
          await import_node_fs.promises.rm(dataPath, { force: true, recursive: true });
        } catch (error) {
          if (!isNodeError(error) || error.code !== "ENOENT") {
            return this.sendResponse(req, res, 500);
          }
        }
        return this.sendResponse(req, res, 204);
      }
      async get(req, res) {
        const apiMatch = this.parseAPIRequest(req);
        const url = apiMatch?.url ?? new URL(req.url ?? "", this.address);
        if (apiMatch?.key) {
          return this.sendResponse(req, res, 200, JSON.stringify({ url: apiMatch.url.toString() }));
        }
        const { dataPath, key, metadataPath, rootPath } = this.getLocalPaths(url);
        if (!dataPath || !metadataPath) {
          return this.sendResponse(req, res, 400);
        }
        if (!key) {
          return this.list({ dataPath, metadataPath, rootPath, req, res, url });
        }
        this.onRequest({
          type: "get"
          /* GET */
        });
        const headers = {};
        try {
          const rawData = await import_node_fs.promises.readFile(metadataPath, "utf8");
          const metadata = JSON.parse(rawData);
          const encodedMetadata = encodeMetadata(metadata);
          if (encodedMetadata) {
            headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
          }
        } catch (error) {
          if (!isNodeError(error) || error.code !== "ENOENT") {
            this.logDebug("Could not read metadata file:", error);
          }
        }
        for (const name in headers) {
          res.setHeader(name, headers[name]);
        }
        const stream2 = (0, import_node_fs.createReadStream)(dataPath);
        stream2.on("error", (error) => {
          if (error.code === "EISDIR" || error.code === "ENOENT") {
            return this.sendResponse(req, res, 404);
          }
          return this.sendResponse(req, res, 500);
        });
        stream2.pipe(res);
      }
      async head(req, res) {
        const url = this.parseAPIRequest(req)?.url ?? new URL(req.url ?? "", this.address);
        const { dataPath, key, metadataPath } = this.getLocalPaths(url);
        if (!dataPath || !metadataPath || !key) {
          return this.sendResponse(req, res, 400);
        }
        try {
          const rawData = await import_node_fs.promises.readFile(metadataPath, "utf8");
          const metadata = JSON.parse(rawData);
          const encodedMetadata = encodeMetadata(metadata);
          if (encodedMetadata) {
            res.setHeader(METADATA_HEADER_INTERNAL, encodedMetadata);
          }
        } catch (error) {
          if (isNodeError(error) && (error.code === "ENOENT" || error.code === "ISDIR")) {
            return this.sendResponse(req, res, 404);
          }
          this.logDebug("Could not read metadata file:", error);
          return this.sendResponse(req, res, 500);
        }
        res.end();
      }
      async list(options) {
        this.onRequest({
          type: "list"
          /* LIST */
        });
        const { dataPath, rootPath, req, res, url } = options;
        const directories = url.searchParams.get("directories") === "true";
        const prefix = url.searchParams.get("prefix") ?? "";
        const result = {
          blobs: [],
          directories: []
        };
        try {
          await _BlobsServer.walk({ directories, path: dataPath, prefix, rootPath, result });
        } catch (error) {
          if (!isNodeError(error) || error.code !== "ENOENT") {
            this.logDebug("Could not perform list:", error);
            return this.sendResponse(req, res, 500);
          }
        }
        res.setHeader("content-type", "application/json");
        return this.sendResponse(req, res, 200, JSON.stringify(result));
      }
      async put(req, res) {
        const apiMatch = this.parseAPIRequest(req);
        if (apiMatch) {
          return this.sendResponse(req, res, 200, JSON.stringify({ url: apiMatch.url.toString() }));
        }
        const url = new URL(req.url ?? "", this.address);
        const { dataPath, key, metadataPath } = this.getLocalPaths(url);
        if (!dataPath || !key || !metadataPath) {
          return this.sendResponse(req, res, 400);
        }
        const metadataHeader = req.headers[METADATA_HEADER_INTERNAL];
        const metadata = decodeMetadata(Array.isArray(metadataHeader) ? metadataHeader[0] : metadataHeader ?? null);
        try {
          const tempDirectory = await import_node_fs.promises.mkdtemp((0, import_node_path.join)((0, import_node_os.tmpdir)(), "netlify-blobs"));
          const relativeDataPath = (0, import_node_path.relative)(this.directory, dataPath);
          const tempDataPath = (0, import_node_path.join)(tempDirectory, relativeDataPath);
          await import_node_fs.promises.mkdir((0, import_node_path.dirname)(tempDataPath), { recursive: true });
          await pipeline(req, (0, import_node_fs.createWriteStream)(tempDataPath));
          await import_node_fs.promises.mkdir((0, import_node_path.dirname)(dataPath), { recursive: true });
          await import_node_fs.promises.copyFile(tempDataPath, dataPath);
          await import_node_fs.promises.rm(tempDirectory, { force: true, recursive: true });
          await import_node_fs.promises.mkdir((0, import_node_path.dirname)(metadataPath), { recursive: true });
          await import_node_fs.promises.writeFile(metadataPath, JSON.stringify(metadata));
        } catch (error) {
          this.logDebug("Error when writing data:", error);
          return this.sendResponse(req, res, 500);
        }
        return this.sendResponse(req, res, 200);
      }
      /**
       * Parses the URL and returns the filesystem paths where entries and metadata
       * should be stored.
       */
      getLocalPaths(url) {
        if (!url) {
          return {};
        }
        const [, siteID, rawStoreName, ...key] = url.pathname.split("/");
        if (!siteID || !rawStoreName) {
          return {};
        }
        const storeName = import_node_process2.platform === "win32" ? encodeURIComponent(rawStoreName) : rawStoreName;
        const rootPath = (0, import_node_path.resolve)(this.directory, "entries", siteID, storeName);
        const dataPath = (0, import_node_path.resolve)(rootPath, ...key);
        const metadataPath = (0, import_node_path.resolve)(this.directory, "metadata", siteID, storeName, ...key);
        return { dataPath, key: key.join("/"), metadataPath, rootPath };
      }
      handleRequest(req, res) {
        if (!req.url || !this.validateAccess(req)) {
          return this.sendResponse(req, res, 403);
        }
        switch (req.method?.toLowerCase()) {
          case "delete": {
            this.onRequest({
              type: "delete"
              /* DELETE */
            });
            return this.delete(req, res);
          }
          case "get": {
            return this.get(req, res);
          }
          case "put": {
            this.onRequest({
              type: "set"
              /* SET */
            });
            return this.put(req, res);
          }
          case "head": {
            this.onRequest({
              type: "getMetadata"
              /* GET_METADATA */
            });
            return this.head(req, res);
          }
          default:
            return this.sendResponse(req, res, 405);
        }
      }
      /**
       * Tries to parse a URL as being an API request and returns the different
       * components, such as the store name, site ID, key, and signed URL.
       */
      parseAPIRequest(req) {
        if (!req.url) {
          return null;
        }
        const apiURLMatch = req.url.match(API_URL_PATH);
        if (!apiURLMatch) {
          return null;
        }
        const fullURL = new URL(req.url, this.address);
        const storeName = fullURL.searchParams.get("context") ?? DEFAULT_STORE;
        const key = apiURLMatch.groups?.key;
        const siteID = apiURLMatch.groups?.site_id;
        const urlPath = [siteID, storeName, key].filter(Boolean);
        const url = new URL(`/${urlPath.join("/")}?signature=${this.tokenHash}`, this.address);
        return {
          key,
          siteID,
          storeName,
          url
        };
      }
      sendResponse(req, res, status, body) {
        this.logDebug(`${req.method} ${req.url} ${status}`);
        res.writeHead(status);
        res.end(body);
      }
      async start() {
        await import_node_fs.promises.mkdir(this.directory, { recursive: true });
        const server = import_node_http.default.createServer((req, res) => this.handleRequest(req, res));
        this.server = server;
        return new Promise((resolve2, reject) => {
          server.listen(this.port, () => {
            const address = server.address();
            if (!address || typeof address === "string") {
              return reject(new Error("Server cannot be started on a pipe or Unix socket"));
            }
            this.address = `http://localhost:${address.port}`;
            resolve2(address);
          });
        });
      }
      async stop() {
        if (!this.server) {
          return;
        }
        await new Promise((resolve2, reject) => {
          this.server?.close((error) => {
            if (error) {
              return reject(error);
            }
            resolve2(null);
          });
        });
      }
      validateAccess(req) {
        if (!this.token) {
          return true;
        }
        const { authorization = "" } = req.headers;
        const parts = authorization.split(" ");
        if (parts.length === 2 || parts[0].toLowerCase() === "bearer" && parts[1] === this.token) {
          return true;
        }
        if (!req.url) {
          return false;
        }
        const url = new URL(req.url, this.address);
        const signature = url.searchParams.get("signature");
        if (signature === this.tokenHash) {
          return true;
        }
        return false;
      }
      /**
       * Traverses a path and collects both blobs and directories into a `result`
       * object, taking into account the `directories` and `prefix` parameters.
       */
      static async walk(options) {
        const { directories, path, prefix, result, rootPath } = options;
        const entries = await import_node_fs.promises.readdir(path);
        for (const entry of entries) {
          const entryPath = (0, import_node_path.join)(path, entry);
          const stat = await import_node_fs.promises.stat(entryPath);
          let key = (0, import_node_path.relative)(rootPath, entryPath);
          if (import_node_path.sep !== "/") {
            key = key.split(import_node_path.sep).join("/");
          }
          const mask = key.slice(0, prefix.length);
          const isMatch = prefix.startsWith(mask);
          if (!isMatch) {
            continue;
          }
          if (!stat.isDirectory()) {
            const etag = Math.random().toString().slice(2);
            result.blobs?.push({
              etag,
              key,
              last_modified: stat.mtime.toISOString(),
              size: stat.size
            });
            continue;
          }
          if (directories && key.startsWith(prefix)) {
            result.directories?.push(key);
            continue;
          }
          await _BlobsServer.walk({ directories, path: entryPath, prefix, rootPath, result });
        }
      }
    };
  }
});

// netlify/functions/bookings-FIXED.js
var { getStore } = require_main();
async function getStorage() {
  const store = getStore("mcipro-data");
  const data = await store.get("storage", { type: "json" });
  if (!data) {
    return {
      bookings: [],
      user_profiles: [],
      schedule_items: [],
      emergency_alerts: [],
      caddies: [],
      waitlist: [],
      tombstones: {},
      version: 0,
      updatedAt: Date.now()
    };
  }
  return data;
}
async function setStorage(storage2) {
  const store = getStore("mcipro-data");
  await store.setJSON("storage", storage2);
  return storage2;
}
function mergeArrayWithTombstones(currentArray, incomingArray, entityType, idField = "id") {
  const tombstoneMap = storage.tombstones[entityType] || {};
  const merged = /* @__PURE__ */ new Map();
  currentArray.forEach((item) => {
    const id = item[idField];
    if (id) {
      const tombstone = tombstoneMap[id];
      if (!tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt) {
        merged.set(id, item);
      }
    }
  });
  incomingArray.forEach((item) => {
    const id = item[idField];
    if (!id) return;
    item.updatedAt = Date.now();
    if (item.deleted) {
      if (!storage.tombstones[entityType]) storage.tombstones[entityType] = {};
      storage.tombstones[entityType][id] = {
        deleted: true,
        updatedAt: item.updatedAt
      };
      merged.delete(id);
      console.log(`[MERGE] Tombstoned ${entityType} ${id}`);
    } else {
      const tombstone = tombstoneMap[id];
      const existing = merged.get(id);
      if (tombstone && tombstone.deleted && item.updatedAt <= tombstone.updatedAt) {
        console.log(`[MERGE] Rejected ${entityType} ${id} - tombstoned`);
        return;
      }
      if (!existing || item.updatedAt >= existing.updatedAt) {
        merged.set(id, item);
        console.log(`[MERGE] Updated ${entityType} ${id} (${item.updatedAt})`);
      } else {
        console.log(`[MERGE] Kept existing ${entityType} ${id} (${existing.updatedAt} > ${item.updatedAt})`);
      }
    }
  });
  return Array.from(merged.values());
}
exports.handler = async (event) => {
  try {
    const origin = event.headers.origin || "";
    const allowOrigin = /^(https:\/\/(www\.)?mcipro(-golf-platform)?\.netlify\.app|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/.test(origin) ? origin : "";
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowOrigin || "https://mcipro-golf-platform.netlify.app",
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "3600"
    };
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }
    const siteKey = event.headers.authorization || event.headers.Authorization || "";
    const expectedKey = `Bearer ${process.env.SITE_WRITE_KEY || "mcipro-site-key-2024"}`;
    if (siteKey !== expectedKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }
    if (event.httpMethod === "GET") {
      const storage2 = await getStorage();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1e3;
      Object.keys(storage2.tombstones).forEach((entityType) => {
        Object.keys(storage2.tombstones[entityType]).forEach((id) => {
          if (storage2.tombstones[entityType][id].updatedAt < thirtyDaysAgo) {
            delete storage2.tombstones[entityType][id];
          }
        });
      });
      console.log("GET request - returning storage:", {
        bookings: storage2.bookings.length,
        profiles: storage2.user_profiles.length,
        version: storage2.version,
        tombstones: Object.keys(storage2.tombstones).length
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(storage2)
      };
    }
    if (event.httpMethod === "PUT") {
      const storage2 = await getStorage();
      let clientData;
      try {
        clientData = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid JSON" })
        };
      }
      ["bookings", "user_profiles", "schedule_items", "emergency_alerts", "caddies", "waitlist"].forEach((k) => {
        if (clientData[k] && !Array.isArray(clientData[k])) clientData[k] = [];
      });
      const baseVersion = clientData.baseVersion;
      if (!Number.isFinite(baseVersion)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing or invalid baseVersion" })
        };
      }
      if (baseVersion !== storage2.version) {
        console.log(`[CONFLICT] Client baseVersion ${baseVersion} != server version ${storage2.version}`);
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: "Conflict",
            message: "Data has been modified by another client",
            currentVersion: storage2.version,
            serverData: storage2
          })
        };
      }
      console.log("[MERGE] Starting server-side merge...");
      const serverNow = Date.now();
      storage2.bookings = mergeArrayWithTombstones(storage2.bookings, clientData.bookings || [], "bookings", "id");
      storage2.user_profiles = mergeArrayWithTombstones(storage2.user_profiles, clientData.user_profiles || [], "user_profiles", "userId");
      storage2.schedule_items = mergeArrayWithTombstones(storage2.schedule_items, clientData.schedule_items || [], "schedule_items", "id");
      storage2.emergency_alerts = mergeArrayWithTombstones(storage2.emergency_alerts, clientData.emergency_alerts || [], "emergency_alerts", "id");
      storage2.caddies = mergeArrayWithTombstones(storage2.caddies, clientData.caddies || [], "caddies", "id");
      storage2.waitlist = mergeArrayWithTombstones(storage2.waitlist, clientData.waitlist || [], "waitlist", "id");
      const deletedBookingIds = /* @__PURE__ */ new Set();
      Object.keys(storage2.tombstones.bookings || {}).forEach((id) => {
        if (storage2.tombstones.bookings[id].deleted) {
          deletedBookingIds.add(id);
        }
      });
      if (deletedBookingIds.size > 0) {
        console.log(`[CASCADE] Checking ${deletedBookingIds.size} deleted bookings for cascades`);
        storage2.schedule_items.forEach((item) => {
          if (item.bookingId && deletedBookingIds.has(item.bookingId)) {
            console.log(`[CASCADE] Tombstoning schedule item ${item.id} (orphaned by booking ${item.bookingId})`);
            if (!storage2.tombstones.schedule_items) storage2.tombstones.schedule_items = {};
            storage2.tombstones.schedule_items[item.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });
        storage2.caddies.forEach((caddy) => {
          if (caddy.bookingId && deletedBookingIds.has(caddy.bookingId)) {
            console.log(`[CASCADE] Tombstoning caddy ${caddy.id} (orphaned by booking ${caddy.bookingId})`);
            if (!storage2.tombstones.caddies) storage2.tombstones.caddies = {};
            storage2.tombstones.caddies[caddy.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });
        storage2.waitlist.forEach((item) => {
          if (item.bookingId && deletedBookingIds.has(item.bookingId)) {
            console.log(`[CASCADE] Tombstoning waitlist item ${item.id} (orphaned by booking ${item.bookingId})`);
            if (!storage2.tombstones.waitlist) storage2.tombstones.waitlist = {};
            storage2.tombstones.waitlist[item.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });
        storage2.schedule_items = storage2.schedule_items.filter((item) => {
          const tombstone = storage2.tombstones.schedule_items?.[item.id];
          return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
        });
        storage2.caddies = storage2.caddies.filter((item) => {
          const tombstone = storage2.tombstones.caddies?.[item.id];
          return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
        });
        storage2.waitlist = storage2.waitlist.filter((item) => {
          const tombstone = storage2.tombstones.waitlist?.[item.id];
          return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
        });
      }
      storage2.version = (storage2.version || 0) + 1;
      storage2.updatedAt = serverNow;
      storage2.serverUpdatedAt = new Date(serverNow).toISOString();
      const dataSize = JSON.stringify(storage2).length;
      const MAX_SIZE = 1024 * 1024;
      if (dataSize > MAX_SIZE) {
        console.log(`[SIZE] Data size ${dataSize} bytes exceeds limit ${MAX_SIZE}`);
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({
            error: "Data too large",
            message: `Data size ${Math.round(dataSize / 1024)}KB exceeds ${Math.round(MAX_SIZE / 1024)}KB limit`,
            suggestion: "Archive old bookings or reduce data volume"
          })
        };
      }
      const validBookingIds = new Set(storage2.bookings.map((b) => b.id));
      [
        { array: storage2.schedule_items, type: "schedule_items" },
        { array: storage2.caddies, type: "caddies" },
        { array: storage2.waitlist, type: "waitlist" }
      ].forEach(({ array, type }) => {
        array.forEach((item) => {
          if (item.bookingId && !validBookingIds.has(item.bookingId)) {
            console.log(`[INTEGRITY] Orphaned ${type} item ${item.id} references missing booking ${item.bookingId}`);
            if (!storage2.tombstones[type]) storage2.tombstones[type] = {};
            storage2.tombstones[type][item.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });
      });
      storage2.schedule_items = storage2.schedule_items.filter((item) => {
        const tombstone = storage2.tombstones.schedule_items?.[item.id];
        return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
      });
      storage2.caddies = storage2.caddies.filter((item) => {
        const tombstone = storage2.tombstones.caddies?.[item.id];
        return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
      });
      storage2.waitlist = storage2.waitlist.filter((item) => {
        const tombstone = storage2.tombstones.waitlist?.[item.id];
        return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
      });
      await setStorage(storage2);
      console.log("PUT request - merged data:", {
        bookings: storage2.bookings.length,
        profiles: storage2.user_profiles.length,
        schedules: storage2.schedule_items.length,
        alerts: storage2.emergency_alerts.length,
        version: storage2.version
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          version: storage2.version,
          updatedAt: storage2.updatedAt,
          mergedData: storage2
          // Return full merged state
        })
      };
    }
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Function error",
        message: err && err.message ? err.message : String(err)
      })
    };
  }
};
//# sourceMappingURL=bookings-FIXED.js.map
