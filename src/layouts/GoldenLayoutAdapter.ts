import {
  GoldenLayout,
  LayoutConfig,
  ResolvedLayoutConfig,
  ComponentContainer,
  JsonValue,
} from 'golden-layout';
import { createApp, Component, App, reactive } from 'vue';

interface MountedComponent {
  app: App;
  container: ComponentContainer;
}

/**
 * Adapter to bind Vue 3 components into Golden Layout 2.x panels.
 *
 * Usage:
 *   const adapter = new GoldenLayoutAdapter(rootEl, sharedState);
 *   adapter.registerComponent('Terminal', TerminalPanel);
 *   adapter.loadLayout(config);
 */
export class GoldenLayoutAdapter {
  readonly layout: GoldenLayout;
  private components = new Map<string, Component>();
  private mounted: MountedComponent[] = [];
  private sharedState: Record<string, unknown>;

  constructor(
    rootElement: HTMLElement,
    sharedState: Record<string, unknown> = {},
  ) {
    this.sharedState = reactive(sharedState);
    this.layout = new GoldenLayout(rootElement);

    this.layout.getComponentEvent = (
      container: ComponentContainer,
      state: JsonValue | undefined,
    ) => {
      this.onBind(container, state);
    };

    this.layout.releaseComponentEvent = (container: ComponentContainer) => {
      this.onUnbind(container);
    };
  }

  registerComponent(name: string, component: Component) {
    this.components.set(name, component);
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

  private onBind(container: ComponentContainer, state: JsonValue | undefined) {
    const typeName = container.componentType as string;
    const Comp = this.components.get(typeName);
    if (!Comp) {
      container.element.textContent = `Unknown panel: ${typeName}`;
      return;
    }

    const app = createApp(Comp, {
      glContainer: container,
      glState: state,
      sharedState: this.sharedState,
    });

    app.mount(container.element);
    this.mounted.push({ app, container });
  }

  private onUnbind(container: ComponentContainer) {
    const idx = this.mounted.findIndex((m) => m.container === container);
    if (idx !== -1) {
      this.mounted[idx].app.unmount();
      this.mounted.splice(idx, 1);
    }
  }
}
