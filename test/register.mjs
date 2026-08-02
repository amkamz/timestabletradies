/** Entry point for `node --import ./test/register.mjs --test`. */

import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);
