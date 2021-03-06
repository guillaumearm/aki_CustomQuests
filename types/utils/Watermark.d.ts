import { ICoreConfig } from "../models/spt/config/ICoreConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
export declare class WatermarkLocale {
    protected locales: {
        "en-US": {
            description: string[];
            warning: string[];
            modding: string[];
        };
        "zh-CN": {
            description: string[];
            warning: string[];
            modding: string[];
        };
    };
    getLocale(): string;
    getDescription(): string[];
    getWarning(): string[];
    getModding(): string[];
}
export declare class Watermark {
    protected logger: ILogger;
    protected configServer: ConfigServer;
    protected watermarkLocale?: WatermarkLocale;
    protected akiConfig: ICoreConfig;
    constructor(logger: ILogger, configServer: ConfigServer, watermarkLocale?: WatermarkLocale);
    protected text: string[];
    protected versionLabel: string;
    initialize(): void;
    getVersionTag(): string;
    getVersionLabel(): string;
    /** Set window title */
    setTitle(): void;
    /** Reset console cursor to top */
    resetCursor(): void;
    /** Draw the watermark */
    draw(): void;
    /** Caculate text length */
    protected textLength(s: string): number;
}
