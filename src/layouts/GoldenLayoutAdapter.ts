import {
  GoldenLayout,
  LayoutConfig,
  ResolvedLayoutConfig,
  ComponentContainer,
} from 'golden-layout';
import { createApp, Component, App, reactive } from 'vue';

interface MountedComponent {
  app: App;
  container: ComponentContainer;
  wrapper: HTMLElement;
}

/**
 * Adapter to bind Vue 3 components into Golden Layout 2.x panels.
 *
 * Uses registerComponentFactoryFunction which creates a plain HTML element
 * per component — simpler and more stable than the virtual component API.
 */
export class GoldenLayoutAdapter {
  readonly layout: GoldenLayout;
  private mounted: MountedComponent[] = [];
  private sharedState: Record<string, unknown>;

  constructor(
    rootElement: HTMLElement,
    sharedState: Record<string, unknown> = {},
  ) {
    this.sharedState = reactive(sharedState);
    this.layout = new GoldenLayout(rootElement);
  }

  registerComponent(name: string, component: Component) {
    const sharedState = this.sharedState;
    const mounted = this.mounted;
    this.layout.registerComponentFactoryFunction(
      name,
      (
        container: ComponentContainer,
      ): ComponentContainer.Component | undefined => {
        const wrapper = document.createElement('div');
        wrapper.style.height = '100%';
        wrapper.style.width = '100%';
        wrapper.style.overflow = 'hidden';
        container.element.appendChild(wrapper);

        const app = createApp(component, {
          glContainer: container,
          sharedState,
        });
        app.mount(wrapper);
        mounted.push({ app, container, wrapper });

        container.stateRequestEvent = () => undefined;

        return {
          component,
          virtual: false,
        } as unknown as ComponentContainer.Component;
      },
    );
  }

  loadLayout(config: LayoutConfig) {
    this.layout.loadLayout(config);
  }

  saveLayout(): ResolvedLayoutConfig {
    return this.layout.saveLayout();
  }

  destroy() {
    for (const m of this.mounted) {
      m.app.unmount();
    }
    this.mounted = [];
    this.layout.destroy();
  }
}
