import {Widget} from 'tabris';
import {
  applyDecorator, WidgetInterface, getPropertyStore, ChangeEvent, getPropertyType, checkType, Constructor
} from './utils';

export default function property(targetProto: Widget, property: string): void;
export default function property(...args: any[]): void {
  applyDecorator('property', args, (widgetProto: any, propertyName: string) => {
    const changeEvent = propertyName + 'Changed';
    const targetType = getPropertyType(widgetProto, propertyName);
    Object.defineProperty(widgetProto, propertyName, {
      get(this: WidgetInterface) {
        return getPropertyStore(this).get(propertyName);
      },
      set(this: WidgetInterface, value: any) {
        let currentValue = getPropertyStore(this).get(propertyName);
        if (currentValue !== value) {
          setterTypeCheck(propertyName, value, targetType);
          getPropertyStore(this).set(propertyName, value);
          this.trigger(changeEvent, new ChangeEvent(this, changeEvent, value));
        }
      },
      enumerable: true,
      configurable: true
    });
  });
}

function setterTypeCheck(propertyName: string, value: any, targetType: Constructor<any>) {
  try {
    checkType(value, targetType);
  } catch (ex) {
    throw new Error(`Failed to set property "${propertyName}": ${ex.message}`);
  }
}
