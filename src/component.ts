import 'reflect-metadata';
import { Widget } from 'tabris';
import { WidgetCollection } from 'tabris';
import { checkBindingType, checkPropertyExists, getOneWayBindings, OneWayBinding } from './data-binding';
import { applyClassDecorator, BaseConstructor, checkType, ClassDecoratorFactory, postAppendHandlers } from './utils';

export function component(type: BaseConstructor<Widget>) {
  isolate(type);
  addBindingProcessor(type);
}

function isolate(type: BaseConstructor<Widget>) {
  if (type.prototype.children !== returnEmptyCollection) {
    type.prototype.children = returnEmptyCollection;
  }
}

export function addBindingProcessor(type: BaseConstructor<Widget>): void;
export function addBindingProcessor(...args: any[]): void | ClassDecoratorFactory<Widget> {
  return applyClassDecorator('bindingBase', args, (type: BaseConstructor<Widget>) => {
    postAppendHandlers(type.prototype).push(base => {
      base._find().forEach(child => processBindings(base, child, getOneWayBindings(child)));
    });
  });
}

function processBindings(base: Widget, target: Widget, bindings: OneWayBinding[]) {
  if (bindings) {
    for (let binding of bindings) {
      initOneWayBinding(base, binding);
    }
  }
}

function initOneWayBinding(base: Widget, binding: OneWayBinding) {
  try {
    checkPropertyExists(base, binding.sourceProperty, 'Base');
    checkType(base[binding.sourceProperty], binding.targetPropertyType);
    base.on(binding.sourceChangeEvent, ({value}) => {
      checkBindingType(binding.path, value, binding.targetPropertyType);
      binding.target[binding.targetProperty] = value;
    });
    binding.target[binding.targetProperty] = base[binding.sourceProperty];
  } catch (ex) {
    throw new Error(`Could not bind property "${binding.targetProperty}" to "${binding.path}": ${ex.message}`);
  }
}

function returnEmptyCollection() {
  return new WidgetCollection([]);
}
