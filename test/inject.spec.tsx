/* tslint:disable:no-unused-expression no-unused-variable max-classes-per-file ban-types no-construct*/
import 'mocha';
import 'sinon';
import { Composite, CompositeProperties } from 'tabris';
import { restoreSandbox, expect, spy } from './test';
import { injector, inject, injectable, shared,  InjectionHandler, Injection, injectionHandler } from '../src';
import * as tabrisMock from './tabris-mock';
import { SinonSpy } from 'sinon';
import { Constructor } from '../src/utils';

const create = injector.create;

class MyServiceClass {
  constructor(readonly param: string | undefined) { }
}

@injectable({shared: true}) class MySingletonClass {}

@shared class MyOtherSingletonClass {}

class BaseClass {
  public saySomething() { return 'baz1'; }
}

@injectable
class SubClass extends BaseClass {
  public saySomething() { return 'baz2'; }
}

class CompatibleClass {
  public saySomething() { return 'baz3'; }
}

class ConstructorWithInjection {

  public service: MyServiceClass;
  public number: number;
  public str: string;

  constructor(
    str: string | undefined,
    @inject('foo2') service: MyServiceClass,
    @inject number: number,
    @inject public otherService: MyServiceClass,
    @inject public singleton1?: MySingletonClass,
    @inject public singleton2?: MyOtherSingletonClass
  ) {
    this.str = str || '';
    this.number = number || 0;
    this.service = service;
  }

}

describe('inject', () => {

  let serviceHandler: (injection: Injection) => MyServiceClass;
  let numberHandler: (injection: Injection) => number | Number;
  let stringHandler: (injection: Injection) => string | String;
  let booleanHandler: (injection: Injection) => boolean | Boolean;
  let instance: ConstructorWithInjection;

  class MyServiceClassInjectionHandler {

    @injectionHandler(MyServiceClass)
    public static createMyServiceClass(injection: Injection) {
      return serviceHandler(injection);
    }

    @injectionHandler(CompatibleClass)
    public createMyServiceClass(injection: Injection) {
      return {saySomething: () => 'baz4'};
    }

  }

  injector.addHandler(Number, {handleInjection: (injection: Injection) => numberHandler(injection)});
  injector.addHandler(String, {handleInjection: (injection: Injection) => stringHandler(injection)});
  injector.addHandler(Boolean, {handleInjection: (injection: Injection) => booleanHandler(injection)});

  beforeEach(() => {
    serviceHandler = spy(({param}) => new MyServiceClass(param));
    numberHandler = (injection) => 0;
    stringHandler = (injection) => '';
    booleanHandler = (injection) => false;
    instance = injector.create(ConstructorWithInjection);
  });

  afterEach(() => {
    restoreSandbox();
  });

  it('ignored on direct constructor call', () => {
    let instance2 = new ConstructorWithInjection('foo', new MyServiceClass('bar'), 23, new MyServiceClass('foo'));
    expect(instance2.number).to.equal(23);
    expect(instance2.str).to.equal('foo');
    expect(instance2.service.param).equal('bar');
    expect(instance2.otherService.param).equal('foo');
  });

  it('injects when used with create', () => {
    numberHandler = (injection) => 44;

    let instance2 = create(ConstructorWithInjection);

    expect(instance2.number).to.equal(44);
  });

  it('fails for unsupported type', () => {
    // tslint:disable-next-line:no-empty-interface
    interface UndefinedService { }
    const UndefinedService: Constructor<UndefinedService> = undefined as any;
    expect(() => {
      class HasMissingType {
        constructor(
          @inject service: UndefinedService
        ) { /* should not go here */ }
      }
    }).to.throw(
        'Could not apply decorator "inject" to parameter 0 of HasMissingType constructor: '
      + 'Parameter type could not be inferred. Only classes and primitive types are supported.'
    );
  });

  it('fails for undefined type', () => {
    // tslint:disable-next-line:no-empty-interface
    class UndefinedService {}
    (UndefinedService as any) = null;
    expect(() => {
      class HasMissingType {
        constructor(
          @inject service: UndefinedService
        ) { /* should not go here */ }
      }
    }).to.throw(
        'Could not apply decorator "inject" to parameter 0 of HasMissingType constructor: '
      + 'Parameter type is undefined: Do you have circular dependency issues?'
    );
  });

  it('injects with injection parameter', () => {
    let instance2 = create(ConstructorWithInjection, ['foo']);
    expect(instance2.service.param).to.equal('foo2');
  });

  it('gives Injection infos to handler', () => {
    let fooInjection: Injection = (serviceHandler as SinonSpy).args[0][0];
    let otherInjection: Injection = (serviceHandler as SinonSpy).args[1][0];
    expect(fooInjection.name).to.be.undefined;
    expect(fooInjection.index).to.equal(1);
    expect(fooInjection.instance).to.be.undefined;
    expect(fooInjection.param).to.equal('foo2');
    expect(fooInjection.type).to.equal(ConstructorWithInjection);
    expect(otherInjection.name).to.be.undefined;
    expect(otherInjection.index).to.equal(3);
    expect(otherInjection.instance).to.be.undefined;
    expect(otherInjection.param).to.be.undefined;
    expect(otherInjection.type).to.equal(ConstructorWithInjection);
  });

  it('does not inject when not decorated', () => {
    let instance2 = create(ConstructorWithInjection, ['foo3', undefined, 34]);
    expect(instance2.str).to.equal('foo3');
    expect(instance2.service).to.be.instanceOf(MyServiceClass);
    expect(instance2.number).to.equal(0);
  });

  it('create passes explicit construction parameter to super constructor', () => {
    class ExtendedConstrutorWithInjection extends ConstructorWithInjection {}
    let instance2 = create(ExtendedConstrutorWithInjection, ['foo3', undefined, 34]);
    expect(instance2.str).to.equal('foo3');
    expect(instance2.service).to.be.instanceOf(MyServiceClass);
    expect(instance2.number).to.equal(0);
  });

  it('injects implicit field', () => {
    expect(instance.otherService).to.be.instanceOf(MyServiceClass);
  });

  it('does not share non-singletons', () => {
    let instance2 = create(ConstructorWithInjection);
    expect(instance2.otherService).not.to.equal(instance.otherService);
  });

  it('shares singletons', () => {
    let instance2 = create(ConstructorWithInjection);
    expect(instance2.singleton1).to.equal(instance.singleton1);
    expect(instance2.singleton2).to.equal(instance.singleton2);
  });

  describe('via JSX', () => {

    class MyCustomWidget extends Composite {

      public service: MyServiceClass;
      public foo: string;
      public nonInjected: number;

      private jsxProperties: CompositeProperties;

      constructor(
        properties: CompositeProperties,
        @inject service: MyServiceClass,
        @inject('foo') foo: string,
        nothingToInject: number,
        @inject('bar') public implicitField: string
      ) {
        super(properties);
        this.foo = foo;
        this.service = service;
        this.nonInjected = nothingToInject;
      }

    }

    let widget: MyCustomWidget;

    beforeEach(() => {
      stringHandler = injection => new String(injection.param);
      widget = (
      <MyCustomWidget left={3} top={4}>
        <composite/>
      </MyCustomWidget>
      );
    });

    afterEach(() => {
      tabrisMock.reset();
    });

    it('injects parameterless', () => {
      expect(widget.service).to.be.instanceOf(MyServiceClass);
    });

    it('injects with injection parameter', () => {
      expect(widget.foo).to.equal('foo');
    });

    it('does not inject when not decorated', () => {
      expect(widget.nonInjected).to.be.undefined;
    });

    it('injects implicit field', () => {
      expect(widget.foo).to.equal('foo');
    });

    it('passes attributes', () => {
      expect(widget.left).to.equal(3);
      expect(widget.top).to.equal(4);
    });

    it('passes children', () => {
      expect(widget.children().length).to.equal(1);
    });

  });

});
