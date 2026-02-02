import { buildBinary } from "@pablozaiden/terminatui";
import { MyCLIPrettierApp } from "./app";

const rootDir = import.meta.dir + "/..";
const entrypoint = rootDir + "/src/index.ts";

buildBinary(rootDir, entrypoint, MyCLIPrettierApp.appName);