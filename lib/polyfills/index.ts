import { h, Fragment } from "preact";
/** @ts-ignore */
global.h = h;
/** @ts-ignore */
global.Fragment = Fragment;

global.process = process;
export * from './fetch'