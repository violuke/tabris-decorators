# TypeScript Decorators for Tabris.js

This module provides [TypeScript decorators](http://www.typescriptlang.org/docs/handbook/decorators.html) to use with [Tabris.js](http://tabrisjs.com). Below you find a description of the various decorators available. Have a look at the unit tests for examples and edge cases.

## Setup

TODOC

## finders

These decorators are meant to be attached to properties of custom UI components and will make them return specific descendants of that widget. For example:

```js
class CustomComponent extends Composite {

  @findFirst('.bar')
  private readonly firstBar: Composite;

  constructor() {
    super();
    this.append(
      new Composite({class: 'foo'}),
      new Composite({class: 'bar'}), // firstBar will return this widget
      new Composite({class: 'bar'})
    );
  }

}
```
> :exclamation: The finder  decorators that do not take a widget type as the first argument will infer the type from the property type. If the property type can not be inferred, the  decorator will throw an error when parsing the class. This may be the case for for a type like "`Composite | null`", which you may want to use  if the TypeScript [compiler option "strictNullChecks"](https://www.typescriptlang.org/docs/handbook/basic-types.html#null-and-undefined) (or "strict") is enabled. In this case you should use the decorators that do take the widget type as an argument.

### @findFirst

Decorating a widget property declaration with this will make it return the _current_ first descendant matching the property type, or null.

This is the equivalent of:

```js
get someChild(): WidgetType {
  return this.find('*').first(WidgetType) || null;
}
```

### @findFirst(selector)

Decorating a widget property declaration with this will make it return the _current_ first descendant matching the given selector, or null. The type of the property is also be part of the matcher, so the result is guarenteed to be of the correct type.

This is the equivalent of:

```js
get someChild(): WidgetType {
  return this.find(selector).first(WidgetType) || null;
}
```

### @findFirst(WidgetType)

Decorating a widget property declaration with this will make it return the _current_ first descendant matching the given type, or null. The actual type of the property will not be considered, so make sure that `WidgetType` is assignable to the property type.

This is the equivalent of:

```js
get someChild(): any {
  return this.find('*').first(WidgetType) || null;
}
```

### @findFirst(WidgetType, selector)

Decorating a widget property declaration with this will make it return the _current_ first descendant matching the given type and selector, or null. The actual type of the property will not be considered, so make sure that `WidgetType` is assignable to the property type.

This is the equivalent of:

```js
get someChild(): any {
  return this.find('*').first(WidgetType) || null;
}
```
### @findLast

Like `@findFirst`, only returning the last found widget instead:

### @findLast(selector)

Like `@findFirst(selector)`, only returning the last found widget instead:

### @findLast(WidgetType)

Like `@findFirst(WidgetType)`, only returning the last found widget instead.

### @findLast(WidgetType, selector)

Like `@findFirst(WidgetType, selector)`, only returning the last found widget instead.

### @findAll(WidgetType)

Lets the property return an instance of `WidgetCollection` with all descendants matching the given type. If the property type is a parameterized collection (e.g. `WidgetCollection<Composite>), it is the developers responsibility to ensure that the parameter matches the type given in the decorator.

```js
get someChildren(): any {
  return this.find('*').filter(WidgetType);
}
```

### @findAll(WidgetType, selector)

Lets the property return an instance of `WidgetCollection` with all descendants matching the given type and selector. If the property type is a parameterized collection (e.g. `WidgetCollection<Composite>), it is the developers responsibility to ensure that the parameter matches the type given in the decorator.

```js
get someChildren(): any {
  return this.find(selector).filter(WidgetType);
}
```

## getters

### @getById

Lets the property return the descendant with the same id as the property name. Unlike the finder decorators, `getById` is very strict.

 * It can only be applied on widget classes that (directly or indirectly) extend `Composite`.
 * It will search for a matching child exactly once, after `append` is called the first time on the widget instance.
 * It will always return the same child, even if it is disposed or removed.
 * It will throw if there is no match, more than one, or if the type is not correct.

### @getByType

Like `@getById`, but ignored the id and looks by return type only. Useful if there is only one widget of a specific type in your widget tree anyway, so you don't have to assign it an id.