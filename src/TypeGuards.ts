import { BaseConstructor } from './utils';

export type Guard<T> = (value: any) => value is T;

export default class TypeGuards {

  private map: Map<BaseConstructor<any>, Guard<any>> = new Map();

  public set<T>(type: BaseConstructor<T>, guard: Guard<T>) {
    this.map.set(type, guard);
  }

  public get<T>(type: BaseConstructor<T>): Guard<T> | undefined {
    return this.map.get(type);
  }

}

export const instance = new TypeGuards();
