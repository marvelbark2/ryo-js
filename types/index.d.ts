/// <reference path="./api.d.ts" />
/// <reference path="./config.d.ts" />

export type { GetApiPayload, ApiPayload } from "RyoApi"
export type { Config as RyoConfig } from "RyoConfig"


type RyoDataObjectRunner = {
    runner: (s: () => void, oldValue: any) => any,
}
type RyoDataObjectLoader = {
    source: {
        file: string
        parser?: (data: any) => Promise<any> | any,
        onChangeData?: (s: () => void, oldValue: any, currentValue: any) => void
    }
}
type RyoDataObjectRunnerLoader = RyoDataObjectRunner | RyoDataObjectLoader
export type RyoDataObject = RyoDataObjectRunnerLoader & {
    invalidate?: number,
    shouldUpdate?: (oldValue: any, currentValue: any) => boolean
}