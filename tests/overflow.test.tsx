import { act, fireEvent, render } from '@testing-library/react';
import KeyCode from '@rc-component/util/lib/KeyCode';
import { spyElementPrototypes } from '@rc-component/util/lib/test/domHook';
import React from 'react';
import type { TabsProps } from '../src';
import Tabs from '../src';
import type { HackInfo } from './common/util';
import {
  btnOffsetPosition,
  getOffsetSizeFunc,
  getTabs,
  getTransformX,
  getTransformY,
  triggerResize,
} from './common/util';

describe('Tabs.Overflow', () => {
  let domSpy: ReturnType<typeof spyElementPrototypes>;

  const hackOffsetInfo: HackInfo = {};

  let mockGetBoundingClientRect: (
    ele: HTMLElement,
  ) => { left: number; top: number; width: number; height: number } | void = null;

  beforeEach(() => {
    mockGetBoundingClientRect = null;

    Object.keys(hackOffsetInfo).forEach(key => {
      delete hackOffsetInfo[key];
    });
  });

  beforeEach(() => {
    domSpy = spyElementPrototypes(HTMLElement, {
      scrollIntoView: () => {},
      offsetWidth: {
        get: getOffsetSizeFunc(hackOffsetInfo),
      },
      offsetHeight: {
        get: getOffsetSizeFunc(hackOffsetInfo),
      },
      offsetLeft: {
        get: btnOffsetPosition,
      },
      offsetTop: {
        get: btnOffsetPosition,
      },
      getBoundingClientRect() {
        return (
          mockGetBoundingClientRect?.(this) || {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          }
        );
      },
    });
  });

  afterEach(() => {
    domSpy.mockRestore();
  });

  it('should collapse', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const { container, unmount } = render(getTabs({ onChange }));

    triggerResize(container);
    act(() => {
      jest.runAllTimers();
    });
    expect(container.querySelector('.rc-tabs-nav-more')).toMatchSnapshot();

    // Click to open
    fireEvent.mouseEnter(container.querySelector('.rc-tabs-nav-more'));

    act(() => {
      jest.runAllTimers();
    });

    expect(document.querySelector('.rc-tabs-dropdown li').textContent).toEqual('cute');

    // Click to select
    fireEvent.click(document.querySelector('.rc-tabs-dropdown-menu-item'));
    expect(onChange).toHaveBeenCalledWith('cute');

    unmount();

    jest.useRealTimers();
  });

  it('should open dropdown on click when moreTrigger is set to click', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const { container, unmount } = render(
      getTabs({ onChange, more: { icon: '...', trigger: 'click' } }),
    );
    triggerResize(container);
    act(() => {
      jest.runAllTimers();
    });
    const button = container.querySelector('.rc-tabs-nav-more');
    fireEvent.click(button);
    act(() => {
      jest.runAllTimers();
    });
    const dropdownOpen = container.querySelector('.rc-tabs-dropdown-open');
    expect(dropdownOpen).not.toBeNull();
    unmount();
  });

  [KeyCode.SPACE, KeyCode.ENTER].forEach(code => {
    it(`keyboard with select keycode: ${code}`, () => {
      jest.useFakeTimers();
      const onChange = jest.fn();
      const { container, unmount } = render(getTabs({ onChange }));

      triggerResize(container);
      act(() => {
        jest.runAllTimers();
      });

      // Open
      fireEvent.keyDown(container.querySelector('.rc-tabs-nav-more'), {
        which: KeyCode.DOWN,
        keyCode: KeyCode.DOWN,
        charCode: KeyCode.DOWN,
      });

      // key selection
      function keyMatch(which: number, match: string) {
        fireEvent.keyDown(container.querySelector('.rc-tabs-nav-more'), {
          which,
          keyCode: which,
          charCode: which,
        });

        expect(
          document.querySelector('li.rc-tabs-dropdown-menu-item-selected').textContent,
        ).toEqual(match);
      }

      keyMatch(KeyCode.DOWN, 'cute');
      keyMatch(KeyCode.DOWN, 'miu');
      keyMatch(KeyCode.UP, 'cute');

      // Select
      fireEvent.keyDown(container.querySelector('.rc-tabs-nav-more'), {
        which: code,
        keyCode: code,
        charCode: code,
      });
      expect(onChange).toHaveBeenCalledWith('cute');

      // Open
      fireEvent.keyDown(container.querySelector('.rc-tabs-nav-more'), {
        which: KeyCode.DOWN,
        keyCode: KeyCode.DOWN,
        charCode: KeyCode.DOWN,
      });

      expect(document.querySelector('.rc-tabs-dropdown')).not.toHaveClass(
        'rc-tabs-dropdown-hidden',
      );

      // ESC
      fireEvent.keyDown(container.querySelector('.rc-tabs-nav-more'), {
        which: KeyCode.ESC,
        keyCode: KeyCode.ESC,
        charCode: KeyCode.ESC,
      });

      expect(document.querySelector('.rc-tabs-dropdown')).toHaveClass('rc-tabs-dropdown-hidden');

      unmount();

      jest.useRealTimers();
    });
  });

  describe('wheel', () => {
    const list: { name: string; x1: number; y1: number; x2: number; y2: number }[] = [
      {
        name: 'deltaX',
        x1: 20,
        y1: 5,
        x2: 3,
        y2: -3,
      },
      {
        name: 'deltaY',
        y1: 20,
        x1: 5,
        y2: 3,
        x2: -3,
      },
    ];

    ['top', 'left'].forEach((tabPosition: any) => {
      list.forEach(({ name, x1, y1, x2, y2 }) => {
        it(`should tab pos '${tabPosition}' work for ${name}`, () => {
          jest.useFakeTimers();
          const { container, unmount } = render(getTabs({ tabPosition }));

          triggerResize(container);
          act(() => {
            jest.runAllTimers();
          });

          // Wheel to move
          const node = container.querySelector('.rc-tabs-nav-wrap');

          act(() => {
            const wheel = new WheelEvent('wheel', {
              deltaX: x1,
              deltaY: y1,
            });
            node.dispatchEvent(wheel);
            jest.runAllTimers();
          });

          act(() => {
            const wheel = new WheelEvent('wheel', {
              deltaX: x2,
              deltaY: y2,
            });
            node.dispatchEvent(wheel);
            jest.runAllTimers();
          });

          if (tabPosition === 'top') {
            expect(getTransformX(container)).toEqual(-23);
          } else {
            expect(getTransformY(container)).toEqual(-23);
          }

          unmount();
          jest.useRealTimers();
        });
      });
    });

    ['top', 'left'].forEach((tabPosition: any) => {
      it(`no need if place is enough: ${tabPosition}`, () => {
        jest.useFakeTimers();
        const { container } = render(
          getTabs({
            items: [
              {
                key: 'yo',
                children: 'Yo',
              } as any,
            ],
            tabPosition,
          }),
        );

        triggerResize(container);
        act(() => {
          jest.runAllTimers();
        });

        // Wheel to move
        const node = container.querySelector('.rc-tabs-nav-wrap');
        const wheel = new WheelEvent('wheel', {
          deltaX: 20,
          deltaY: 20,
        });
        wheel.preventDefault = jest.fn();

        act(() => {
          node.dispatchEvent(wheel);
          jest.runAllTimers();
        });

        expect(wheel.preventDefault).not.toHaveBeenCalled();
        expect(getTransformX(container)).toEqual(0);

        jest.useRealTimers();
      });
    });
  });

  describe('overflow to scroll', () => {
    it('top', () => {
      jest.useFakeTimers();
      const onTabScroll = jest.fn();
      // light bamboo [cute disabled] miu
      const { container, rerender } = render(getTabs({ activeKey: 'disabled', onTabScroll }));

      triggerResize(container);
      act(() => {
        jest.runAllTimers();
      });
      expect(getTransformX(container)).toEqual(-40);

      // light [bamboo cute] disabled miu
      onTabScroll.mockReset();
      // wrapper.setProps({ activeKey: 'bamboo' });
      rerender(getTabs({ activeKey: 'bamboo', onTabScroll }));
      act(() => {
        jest.runAllTimers();
      });
      expect(getTransformX(container)).toEqual(-20);
      expect(onTabScroll).toHaveBeenCalledWith({ direction: 'left' });

      // scroll to 0 when activeKey is null
      onTabScroll.mockReset();
      // wrapper.setProps({ activeKey: null });
      rerender(getTabs({ activeKey: null, onTabScroll }));
      act(() => {
        jest.runAllTimers();
      });
      expect(getTransformX(container)).toEqual(0);

      jest.useRealTimers();
    });

    it('left', () => {
      jest.useFakeTimers();
      const onTabScroll = jest.fn();
      /**
       *    light        light
       *    bamboo      --------
       *   --------      bamboo
       *     cute         cute
       *   disabled     --------
       *   --------     disabled
       *     miu          miu
       */
      const { container, rerender } = render(
        getTabs({ activeKey: 'disabled', tabPosition: 'left', onTabScroll }),
      );

      triggerResize(container);
      act(() => {
        jest.runAllTimers();
      });
      expect(getTransformY(container)).toEqual(-40);

      // light [bamboo cute] disabled miu
      onTabScroll.mockReset();
      rerender(getTabs({ activeKey: 'bamboo', tabPosition: 'left', onTabScroll }));
      act(() => {
        jest.runAllTimers();
      });
      expect(getTransformY(container)).toEqual(-20);
      expect(onTabScroll).toHaveBeenCalledWith({ direction: 'top' });

      jest.useRealTimers();
    });
  });

  describe('editable dropdown menu', () => {
    const list: { name: string; trigger: (node: HTMLElement) => void }[] = [
      {
        name: 'click',
        trigger: node => {
          fireEvent.click(node);
        },
      },
    ];

    list.forEach(({ name, trigger }) => {
      it(`remove by ${name} in dropdown menu`, () => {
        jest.useFakeTimers();
        const onEdit = jest.fn();
        const { container, unmount } = render(getTabs({ editable: { onEdit } }));

        triggerResize(container);
        act(() => {
          jest.runAllTimers();
        });

        // Click to open
        fireEvent.mouseEnter(container.querySelector('.rc-tabs-nav-more'));
        act(() => {
          jest.runAllTimers();
        });

        const first = document.querySelector<HTMLElement>('.rc-tabs-dropdown-menu-item-remove');
        trigger(first);

        // Should be button to enable press SPACE key to trigger
        expect(first instanceof HTMLButtonElement).toBeTruthy();

        expect(onEdit).toHaveBeenCalledWith(
          'remove',
          expect.objectContaining({
            key: 'bamboo',
          }),
        );

        unmount();
        jest.useRealTimers();
      });
    });

    it('auto hidden Dropdown', async () => {
      jest.useFakeTimers();

      domSpy = spyElementPrototypes(HTMLElement, {
        scrollIntoView: () => {},
        offsetWidth: {
          get: getOffsetSizeFunc({ ...hackOffsetInfo, container: 45 }),
        },
        offsetHeight: {
          get: getOffsetSizeFunc(hackOffsetInfo),
        },
        offsetLeft: {
          get: btnOffsetPosition,
        },
        offsetTop: {
          get: btnOffsetPosition,
        },
      });

      const originItems: TabsProps['items'] = new Array(2).fill(0).map((_, index) => ({
        key: `${index}`,
        label: `Tab ${index + 1}`,
        children: `Tab Content${index + 1}`,
      }));

      const Demo = () => {
        const [items, setItems] = React.useState(originItems);

        return (
          <Tabs
            editable={{
              onEdit(type, { key }) {
                if (type === 'remove') {
                  const nextItems = items.filter(ele => {
                    return ele.key !== key.toString();
                  });
                  setItems(nextItems);
                }
              },
            }}
            items={items}
          />
        );
      };

      const { container, unmount } = render(<Demo />);

      triggerResize(container);

      act(() => {
        jest.runAllTimers();
      });

      // Click to open
      fireEvent.mouseEnter(container.querySelector('.rc-tabs-nav-more'));
      act(() => {
        jest.runAllTimers();
      });

      const remove = document.querySelector('.rc-tabs-dropdown-menu-item-remove');

      act(() => {
        fireEvent.click(remove);
      });

      expect(document.querySelector('.rc-tabs-dropdown-hidden')).toBeTruthy();

      unmount();
    });
  });

  it('should calculate hidden tabs correctly', () => {
    jest.useFakeTimers();
    const onEdit = jest.fn();
    const { container } = render(getTabs({ editable: { onEdit }, activeKey: 'miu' }));

    triggerResize(container);
    act(() => {
      jest.runAllTimers();
    });

    fireEvent.mouseEnter(container.querySelector('.rc-tabs-nav-more'));
    act(() => {
      jest.runAllTimers();
    });
    expect(document.querySelector('.rc-tabs-dropdown-menu').textContent).not.toContain('miu');
  });

  it('should support getPopupContainer', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(div.childNodes.length).toBeFalsy();

    const getPopupContainer = () => div;
    const { container } = render(getTabs({ getPopupContainer }));
    fireEvent.mouseEnter(container.querySelector('.rc-tabs-nav-more'));
    act(() => {
      jest.runAllTimers();
    });

    expect(div.childNodes.length).toBeTruthy();

    document.body.removeChild(div);
  });

  it('should support popupClassName', () => {
    jest.useFakeTimers();
    const { container } = render(
      getTabs({
        popupClassName: 'custom-popup',
        classNames: { popup: 'classnames-popup' },
        styles: { popup: { color: 'red' } },
      }),
    );

    triggerResize(container);
    act(() => {
      jest.runAllTimers();
    });

    fireEvent.mouseEnter(container.querySelector('.rc-tabs-nav-more'));
    act(() => {
      jest.runAllTimers();
    });
    expect(document.querySelector('.rc-tabs-dropdown')).toHaveClass('custom-popup');
    expect(document.querySelector('.rc-tabs-dropdown')).toHaveClass('classnames-popup');
    expect(document.querySelector('.rc-tabs-dropdown')).toHaveStyle('color: red');
  });

  it('correct handle decimal', () => {
    hackOffsetInfo.container = 29;
    hackOffsetInfo.tabNodeList = 29;
    hackOffsetInfo.tabNode = 15;

    mockGetBoundingClientRect = ele => {
      if (ele.classList.contains('rc-tabs-tab')) {
        const sharedRect = {
          left: 0,
          top: 0,
          width: 14.5,
          height: 14.5,
        };

        return ele.getAttribute('data-node-key') === 'bamboo'
          ? {
              ...sharedRect,
            }
          : {
              ...sharedRect,
              left: 14.5,
            };
      }
      // console.log('ele!!!', ele.className);
    };

    jest.useFakeTimers();
    const { container } = render(
      getTabs({
        defaultActiveKey: 'little',
        items: [
          {
            label: 'bamboo',
            key: 'bamboo',
            children: 'Bamboo',
          },
          {
            label: 'little',
            key: 'little',
            children: 'Little',
          },
        ],
      }),
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(container.querySelector('.rc-tabs-nav-operations-hidden')).toBeTruthy();
    expect(container.querySelector('.rc-tabs-ink-bar')).toHaveStyle({
      left: '21.75px',
    });

    jest.useRealTimers();
  });

  it('should handle no visible tabs when container is too small', () => {
    jest.useFakeTimers();

    // 设置极小的容器空间，无法显示任何tab
    // 可用空间 = container - more - add - extra - tabNode = 40 - 10 - 10 - 10 - 20 = -10
    hackOffsetInfo.container = 40;
    hackOffsetInfo.more = 10;
    hackOffsetInfo.add = 10;
    hackOffsetInfo.extra = 10;
    hackOffsetInfo.tabNode = 20;

    const { container, unmount } = render(
      getTabs({
        editable: { onEdit: () => {} },
        tabBarExtraContent: 'Extra',
      }),
    );

    triggerResize(container);

    act(() => {
      jest.runAllTimers();
    });

    // 验证关键行为：当startIndex > endIndex时（返回[0,-1]），容器太小无法显示任何tab

    // 1. "更多"按钮存在（在operations区域，用于访问隐藏的tab）
    const dropdownTrigger = container.querySelector('.rc-tabs-nav-operations .rc-tabs-nav-more');
    expect(dropdownTrigger).toBeTruthy();

    // 2. 验证添加按钮（operations区域的添加按钮应该可见）
    const operationsAddButton = container.querySelector('.rc-tabs-nav-operations .rc-tabs-nav-add');
    expect(operationsAddButton).toBeTruthy();

    // 3. Extra内容存在
    const extraTrigger = container.querySelector('.rc-tabs-extra-content');
    expect(extraTrigger).toBeTruthy();

    // 4. transform会是负值，将所有tab移出可视区域
    const transformX = getTransformX(container);
    expect(transformX).toBe(-10); // 实际测量值，说明组件正确处理了无tab可见的情况

    // 5. 获取实际的tab数量（动态计算，不硬编码）
    const allTabs = container.querySelectorAll('.rc-tabs-nav-list .rc-tabs-tab');
    const expectedTabCount = allTabs.length;

    // 6. 触发下拉菜单打开，验证所有tab都在dropdown中
    fireEvent.mouseEnter(dropdownTrigger);

    act(() => {
      jest.runAllTimers();
    });

    // 验证下拉菜单包含所有tab
    const moreDropdownItems = document.querySelectorAll('.rc-tabs-dropdown-menu-item');
    expect(moreDropdownItems.length).toBe(expectedTabCount);

    unmount();
    jest.useRealTimers();
  });
});
