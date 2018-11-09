export interface RequestHeader {
  [index: string]: string;
  'Content-Type'?: string;
  'Set-Cookie'?: string;
}


export const XmlContentTypeHeader = <RequestHeader>{
  'Content-Type': 'text/xml',
};
