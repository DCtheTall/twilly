import { twilly } from '.';
import FlowController from './Flows/Controller';
import TwilioController from './twllio/Controller';


jest.mock('./Flows/Controller');
jest.mock('./twllio/Controller');


const fcMock = {};
const tcMock = {};

const fcConstructorMock = jest.fn();
const tcConstructorMock = jest.fn();


const args = <any>{

};


beforeEach(() => {
  fcConstructorMock.mockReturnValue(fcMock);
  tcConstructorMock.mockReturnValue(tcMock);

  (<jest.Mock>(<any>FlowController)).mockImplementation(fcConstructorMock);
  (<jest.Mock>(<any>TwilioController)).mockImplementation(tcConstructorMock);
});

afterEach(() => {
  fcConstructorMock.mockRestore();
  tcConstructorMock.mockRestore();

  (<jest.Mock>(<any>FlowController)).mockRestore();
  (<jest.Mock>(<any>TwilioController)).mockRestore();
});
