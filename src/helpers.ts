import { Buffer } from "node:buffer";

export const decode = (
    fileContent: string,
    encoding: BufferEncoding = "base64"
): string => {
    return Buffer.from(fileContent, encoding).toString();
};
