import {
  DEFAULT_RESPONSE_CODE,
  EMPTY_TWIML_RESPONSE,
  TwimlResponse,
  XmlContentTypeHeader,
} from '../../src/twllio';
import { uniqueString, randInt } from '../../src/util';


jest.mock('twilio/lib/twiml/MessagingResponse');


const messagingResponseMock = {
  message: jest.fn(),
  toString: jest.fn(),
};
const messagingResponseContructorMock = jest.fn();
const xmlMock = uniqueString();
const resMock = <any>{
  end: jest.fn(),
  writeHead: jest.fn(),
};


let MessagingResponse: jest.Mock;


beforeEach(() => {
  MessagingResponse = <jest.Mock>require('twilio/lib/twiml/MessagingResponse');
  MessagingResponse.mockImplementation(messagingResponseContructorMock);
  messagingResponseContructorMock.mockReturnValue(messagingResponseMock);
  messagingResponseMock.toString.mockReturnValue(xmlMock);
});
afterEach(() => {
  messagingResponseMock.message.mockRestore();
  messagingResponseMock.toString.mockRestore();
  messagingResponseContructorMock.mockRestore();
  resMock.end.mockRestore();
  resMock.writeHead.mockRestore();
});


test('TwimlResponse constructor test', () => {
  const tr = new TwimlResponse(resMock);
  expect(tr.xml).toBe(EMPTY_TWIML_RESPONSE);
});


test('TwimlResponse setMessage test', () => {
  const tr = new TwimlResponse(resMock);
  const body = uniqueString();

  tr.setMessage(body);

  expect(messagingResponseContructorMock).toBeCalledTimes(1);
  expect(messagingResponseContructorMock).toBeCalledWith();

  expect(messagingResponseMock.message).toBeCalledTimes(1);
  expect(messagingResponseMock.message).toBeCalledWith(body);

  expect(messagingResponseMock.toString).toBeCalledTimes(1);
  expect(messagingResponseMock.toString).toBeCalledWith();

  expect(tr.xml).toBe(xmlMock);
});


test('TwimlResponse send test default behavior', () => {
  const tr = new TwimlResponse(resMock);

  tr.send();

  expect(resMock.writeHead).toBeCalledTimes(1);
  expect(resMock.writeHead).toBeCalledWith(DEFAULT_RESPONSE_CODE, XmlContentTypeHeader);

  expect(resMock.end).toBeCalledTimes(1);
  expect(resMock.end).toBeCalledWith(tr.xml);
});


test('TwimlResponse send test code provided', () => {
  const code = randInt();
  const tr = new TwimlResponse(resMock);

  tr.send(code);

  expect(resMock.writeHead).toBeCalledTimes(1);
  expect(resMock.writeHead).toBeCalledWith(code, XmlContentTypeHeader);

  expect(resMock.end).toBeCalledTimes(1);
  expect(resMock.end).toBeCalledWith(tr.xml);
});
