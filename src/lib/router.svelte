<script lang="ts">
  import { onDestroy, untrack, type Component } from "svelte";
  import { createSpan, traceEvent, Span } from "./helpers/tracing.svelte";
  import { registry } from "./registry.svelte";
  import { type RouteResult } from "./route.svelte";
  import { RouterInstanceConfig } from "./router-instance-config";
  import type { RouterInstance } from "./router-instance.svelte";

  let { instance = $bindable(), ...rest } = $props<
    { instance?: RouterInstance } & Partial<RouterInstanceConfig> & Record<string, any>
  >();

  // Props are read once at mount: the router instance is created here and lives
  // for the component's lifetime. `untrack` makes that initial-value intent
  // explicit (and silences Svelte's state_referenced_locally warning).
  const initial = untrack(() => ({ ...rest }));

  const span = createSpan(initial.id ? `[${initial.id}]` : "router");

  let RenderableComponent = $state<Component | null>(null);
  let router: RouterInstance;
  let route: RouteResult | undefined = $state();
  let additionalProps = $state<Record<string, any> | undefined>({});

  const apply = async (r: RouteResult, span?: Span) => {
    route = r;
    traceEvent(span, {
      prefix: "✅",
      name: "apply",
      description: `<Router${router.config.id ? ` id="${router.config.id}"` : ""}/> applying route ${r.result.path.original} (${r.result.path.condition})`,
      location: "/src/lib/router.svelte:apply()",
      router: {
        id: router.config.id,
        basePath: router.config.basePath
      },
      metadata: {
        result: r
      }
    });
    
    // The {#key} block handles component lifecycle automatically
    // No manual unmounting needed - Svelte manages this for us

    if (typeof r.result.component === "function" && r.result.component.constructor.name === "AsyncFunction") {
      // Handle async component by first awaiting the import:
      const module = await r.result.component();
      RenderableComponent = module.default || module;
    } else {
      // Handle regular component by directly assigning the component:
      RenderableComponent = r.result.component;
    }
    
    // Force reactivity by updating route state after component assignment
    route = { ...r };
    additionalProps = route.route?.props;
  };

  router = registry.register(new RouterInstanceConfig(initial), apply, span);

  traceEvent(span, {
    prefix: "✅",
    name: "<Router/> Component",
    description: "new component mounted",
    location: "/src/lib/router.svelte:mount()",
    router: {
      id: router.config.id,
      basePath: router.config.basePath
    }
  });

  instance = router;

  if (span) {
    span.metadata = {
      router: router.config.id
    };
  }

  router.handleStateChange(location.toString(), span);

  onDestroy(() => {
    router.deregister(span);
  });

  const restWithoutRoutes = $derived.by(() => {
    const { routes, basePath, ...restProps } = rest;
    return restProps;
  });
</script>

{#key route?.result?.path?.original || Math.random()}
  <RenderableComponent
    {route}
    {...additionalProps}
    {...restWithoutRoutes} />
{/key}
