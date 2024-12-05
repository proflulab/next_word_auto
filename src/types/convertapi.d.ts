declare module 'convertapi' {
    interface ConvertAPIParams {
        File?: string | Buffer;
        [key: string]: any;
    }

    interface ConvertAPIResult {
        file: {
            url: string;
            size: number;
            filename: string;
        };
    }

    export default class ConvertAPI {
        constructor(apiSecret: string);
        convert(to: string, params: ConvertAPIParams, from?: string): Promise<ConvertAPIResult>;
    }
} 