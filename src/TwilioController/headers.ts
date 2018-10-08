type field = string | number | Date;


export type Serializeable<T> =
  field | { [index: string]: field | T };


export type DeepSerializeable =
  field | { [index: string]: Serializeable<DeepSerializeable> };


export interface RequestHeader {
  [index: string]: string;
  'Content-Type'?: string;
  'Set-Cookie'?: string;
}


export const XmlContentTypeHeader = <RequestHeader>{
  'Content-Type': 'text/xml',
};
