
// @ts-expect-error untyped js
import { CryptoJS as crjs } from './crypto-js-bundle.js'

export type CryptoJSType = {
  SHA512: (txt: string) => object
  AES: {
    encrypt: (...args: string[]) => object
    decrypt: (...args: string[]) => {toString: (o: object) => string}
  }
  enc: {
    Utf8: object,
  }
}
export const CryptoJS = crjs as CryptoJSType
