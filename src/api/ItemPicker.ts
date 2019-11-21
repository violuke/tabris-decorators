import { ChangeListeners, EventObject, JSXAttributes, Listeners, Picker, PickerSelectEvent, Properties, PropertyChangedEvent } from 'tabris';
import { checkType } from './checkType';
import { List, ListLike, Mutation } from './List';
import { Binding } from './to';
import { event } from '../decorators/event';
import { ListLikeObvserver } from '../internals/ListLikeObserver';
import { subscribe } from '../internals/subscribe';
import { checkPathSyntax } from '../internals/utils-databinding';

export class ItemPickerSelectEvent<ItemType> extends EventObject<ItemPicker<ItemType>> {

  constructor(
    public readonly item: ItemType,
    public readonly itemIndex: number,
    public readonly itemText: string
  ) {
    super();
  }

}

// Note: The latest TypeScript compiler can complain if a mapped type (e.g. Properties<T>) becomes
// too complex (error 2589). By defining the constructor parameters explicitly this is avoided.
export type TextSource<T> = string | Binding | null;
export type ItemPickerProperties<ItemType>
  = Properties<Picker> & {items?: ListLike<ItemType>, textSource?: TextSource<ItemType>};

export class ItemPicker<ItemType> extends Picker {

  public jsxAttributes: JSXAttributes<this> & {children?: ListLike<ItemType> | string};
  @event public onItemSelect: Listeners<ItemPickerSelectEvent<ItemType>>;
  @event public onItemsChanged: Listeners<PropertyChangedEvent<this, ListLike<ItemType>>>;
  @event public onSelectionChanged: Listeners<PropertyChangedEvent<this, ItemType>>;
  @event public onTextSourceChanged: ChangeListeners<this, 'textSource'>;

  private _observer: ListLikeObvserver<ItemType>;
  private _textSource: TextSource<ItemType> | null;
  private _texts: string[];
  private _unsubsribers: Array<(() => void)>;
  private _inRefresh: boolean = false;

  constructor({items, textSource, ...properties}: ItemPickerProperties<ItemType> = {}) {
    super();
    this._observer = new ListLikeObvserver(this._handleListMutation);
    this.textSource = textSource || null;
    this.items = items || null;
    this.set<any>(properties);
    this.onSelect(this._handleSelect);
    this.onSelectionIndexChanged(this._handleSelectionIndexChanged);
  }

  public set items(value: ListLike<ItemType>) {
    if (value === this._observer.source) {
      return;
    }
    this._observer.source = value;
    this.onItemsChanged.trigger({value});
  }

  public get items() {
    return this._observer.source;
  }

  public set selection(value: ItemType) {
    this.selectionIndex = (this.items || []).indexOf(value);
  }

  public get selection() {
    return (this.items || [])[this.selectionIndex] || null;
  }

  public set textSource(value: TextSource<ItemType>) {
    if (value === this._textSource) {
      return;
    }
    let binding = null;
    if (value instanceof Object) {
      const {path, converter} = value;
      binding = {path, converter: converter || String};
    } else if (value && typeof value === 'string') {
      binding = {path: value, converter: String};
    }
    if (binding) {
      checkPathSyntax(binding.path);
      if (binding.path.startsWith('.') || binding.path.startsWith('#')) {
        throw new Error('textSource path starts with invalid character');
      }
    }
    this._textSource = binding;
    this.onTextSourceChanged.trigger({value});
    this._computeTexts();
  }

  public get textSource() {
    return this._textSource;
  }

  protected _handleListMutation = (ev: Mutation<ItemType>) => {
    this.itemCount = ev.target.length;
    this._computeTexts();
    if (!ev.target || !ev.target.length) {
      this.selectionIndex = -1;
    } else if (ev.items.length === ev.target.length) {
      this.selectionIndex = 0;
    } else if (ev.deleteCount === ev.items.length) {
      this.onSelectionChanged.trigger({value: this.selection});
    } else if (ev.start <= this.selectionIndex) {
      this.selectionIndex = -1;
    }
  }

  protected _computeTexts() {
    this._unbindItems();
    if (!this.items) {
      this._texts = null;
    } else if (this._textSource) {
      this._texts = this._bindItems(this._textSource as Binding);
    } else {
      this._texts = Array.from(this.items, String);
    }
    this._refresh();
  }

  protected _bindItems(binding: Binding) {
    let initial = true;
    const path = binding.path.split('.');
    const texts = [];
    this._unsubsribers = Array.from(this.items).map((item, index) => {
      try {
        return subscribe(item, path, value => {
          try {
            const textValue = value != null ? binding.converter(value) : value;
            checkType(textValue, String, true);
            texts[index] = textValue;
          } catch (ex) {
            // tslint:disable-next-line: no-console
            console.warn(`ItemPicker can not compute value of ${binding.path} for item ${index}: ${ex.message}`);
            texts[index] = 'undefined';
          }
          if (!initial) {
            this._refresh();
          }
        });
      } catch(ex) {
        // tslint:disable-next-line: no-console
        console.warn(`ItemPicker can not compute value of ${binding.path} for item ${index}: ${ex.message}`);
        texts[index] = 'undefined';
        return () => undefined;
      }
    });
    initial = false;
    return texts;
  }

  protected _unbindItems() {
    (this._unsubsribers || []).forEach(unsubscribe => unsubscribe());
    this._unsubsribers = null;
  }

  protected _handleSelectionIndexChanged = () => {
    if (!this._inRefresh) {
      this.onSelectionChanged.trigger({value: this.selection});
    }
  }

  protected _handleSelect = ({index}: PickerSelectEvent) => {
    this.onItemSelect.trigger(new ItemPickerSelectEvent(
      this.items[index], index, this.itemText(index)
    ));
  }

  protected _refresh() {
    if (this._inRefresh) {
      return;
    }
    this._inRefresh = true;
    this.itemText = index => this._texts[index];
    const selectionIndex = this.selectionIndex;
    this.selectionIndex = -1;
    this.selectionIndex = selectionIndex;
    this._inRefresh = false;
  }

  protected _reorderProperties(properties: string[]) {
    const reOrdrered = properties.concat();
    const selectionPos = reOrdrered.indexOf('selection');
    if (selectionPos !== -1) {
      reOrdrered.splice(selectionPos, 1);
      reOrdrered.push('selection');
    }
    const selectionIndexPos = reOrdrered.indexOf('selectionIndex');
    if (selectionIndexPos !== -1) {
      reOrdrered.splice(selectionIndexPos, 1);
      reOrdrered.push('selectionIndex');
    }
    return super._reorderProperties(reOrdrered);
  }

  // tslint:disable-next-line
  public [JSX.jsxFactory](Type, attributes) {
    const {children, selection, selectionIndex, ...pureAttributes} = attributes;
    const content = children ? children[0] : null;
    const result: ItemPicker<any>
      = Picker.prototype[JSX.jsxFactory].call(this, Type, pureAttributes);
    if (content instanceof Array || content instanceof List) {
      result.items = content;
    } else if (typeof content === 'string') {
      result.items = List.from(content.split(',').map(str => str.trim()));
    }
    if (selection !== undefined) {
      result.selection = selection;
    }
    if (selectionIndex !== undefined) {
      result.selectionIndex = selectionIndex;
    }
    return result;
  }

}
