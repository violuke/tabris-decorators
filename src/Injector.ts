import { Constructor, getParamInfo, BaseConstructor } from './utils';
import DefaultInjectionHandler, { InjectableConfig } from './DefaultInjectionHandler';
import { injectionHandler as unboundInjectionHandler } from './injectionHandler';
import { inject as unboundInject } from './inject';
import { injectable as unboundInjectable, shared as unboundShared } from './injectable';
import { ExtendedJSX } from './ExtendedJSX';

export class Injector {

  // tslint:disable:typedef
  public readonly injectionHandler = unboundInjectionHandler;
  public readonly inject = unboundInject;
  public readonly injectable = unboundInjectable;
  public readonly shared = unboundShared;
  // tslint:enable:typedef
  public readonly JSX: ExtendedJSX = new ExtendedJSX(this);
  private handlers: HandlersMap = new Map();

  constructor() {
    this.injectionHandler = this.injectionHandler.bind(this);
    this.injectable = this.injectable.bind(this);
    this.shared = this.shared.bind(this);
    this.inject = this.inject.bind(this);
  }

  public addInjectable = (type: Constructor<any>, config: InjectableConfig = {}) => {
    this.addHandler(type, new DefaultInjectionHandler(type, config));
  }

  // TODO check targetType
  public addHandler = <T, U extends T>(targetType: BaseConstructor<T>, handler: InjectionHandler<U>) => {
    this.forEachPrototype(targetType, (prototype: object) => {
      let targetTypeHandlers = this.handlers.get(prototype);
      if (!targetTypeHandlers) {
        this.handlers.set(prototype, targetTypeHandlers = []);
      }
      let handlerObject: InjectionHandlerObject<T>
        = handler instanceof Function ? {handleInjection: handler} : handler;
      targetTypeHandlers.unshift(handlerObject);
    });
  }

  public reset() {
    this.handlers.clear();
  }

  public resolve = <T>(type: BaseConstructor<T>, injection?: Injection) => {
    if (injection && injection.injector !== this) {
      throw new Error('@inject belongs to a different injector');
    }
    let handlers = this.findCompatibleHandlers(type);
    if (!handlers.length) {
      throw new Error(
        `Could not inject value of type ${type.name} since no compatible injection handler exists for this type.`
      );
    }
    let unbox = this.getUnboxer(type);
    for (let handler of handlers) {
      let result = unbox(handler.handleInjection(injection || {injector: this}, this));
      if (result !== null && result !== undefined) {
        return result;
      }
    }
    throw new Error(
      `Could not inject value of type ${type.name} since no compatible injection handler returned a value.`
    );
  }

  public create = <T, U, V, W>(
    type: {new(arg1?: U, arg2?: V, arg3?: W, ...args: any[]): T; },
    args: {0?: U, 1?: V, 2?: W, [index: number]: any, length: number} = []
  ): T => {
    if (!type) {
      throw new Error('No type to create was given');
    }
    try {
      let finalArgs: any[] = [];
      let paramInfo = getParamInfo(type) || [];
      let paramCount = Math.max(type.length, args.length, paramInfo.length);
      for (let i = 0; i < paramCount; i++) {
        finalArgs[i] = args[i];
        if (paramInfo[i]) {
          let injection = {type, index: i, param: paramInfo[i].injectParam, injector: paramInfo[i].injector};
          finalArgs[i] = this.resolve(paramInfo[i].type, injection);
        }
      }
      return new type(...finalArgs);
    } catch (ex) {
      throw new Error(`Could not create instance of ${type.name}:\n${ex.message}`);
    }
  }

  private findCompatibleHandlers<T>(type: BaseConstructor<T>): Array<InjectionHandlerObject<T>> {
    if (!type) {
      throw new Error(
        `Could not inject value since type is ${type}. Do you have circular module dependencies?`
      );
    }
    return this.handlers.get(type.prototype) || [];
  }

  private getUnboxer(type: any) {
    if (type === Number || type === String || type === Boolean) {
      return this.unboxValue;
    }
    return this.passValue;
  }

  private passValue(value: any) {
    return value;
  }

  private unboxValue(box: any) {
    return box !== null && box !== undefined ? box.valueOf() : box;
  }

  private forEachPrototype(type: BaseConstructor<any>, cb: (prototype: object) => void) {
    let currentProto = type.prototype;
    while (currentProto !== Object.prototype) {
      cb(currentProto);
      currentProto = Object.getPrototypeOf(currentProto);
    }
  }

}

export const injector = new Injector();
export const { inject, injectable, shared, injectionHandler } = injector;
(JSX as any) = injector.JSX;

export interface Injection {
  type?: Constructor<any>;
  instance?: object;
  param?: string;
  name?: string;
  index?: number;
  injector: Injector;
}

export type InjectionHandlerFunction<T> = (injection: Injection, injector: Injector) => T | null | undefined;

export interface InjectionHandlerObject<T> {
  handleInjection: InjectionHandlerFunction<T>;
}

export type InjectionHandler<T> = InjectionHandlerFunction<T> | InjectionHandlerObject<T>;

type HandlersMap = Map<object, Array<InjectionHandlerObject<any>>>;
