export interface RequestHeader {
  [index: string]: string;
  'Content-Type'?: string;
}

export const XmlContentTypeHeader = <RequestHeader>{
  'Content-Type': 'text/xml',
};
