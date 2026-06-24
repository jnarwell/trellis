/**
 * Trellis Demo Shell
 *
 * A thin chrome around DynamicProductApp that turns the demo into a guided,
 * self-explanatory tour:
 *  - switch between every product (tool) without editing the URL
 *  - switch roles (admin / editor / viewer) to see RBAC live
 *  - open the exact YAML config that generated the current app
 *
 * The point it makes: every "tool" below is the same engine reading a
 * different config file.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { load as yamlLoad } from 'js-yaml';
import { expandRoles, isRoleName, type RoleName } from '@trellis/kernel';
import { DynamicProductApp } from './runtime/DynamicProductApp.js';
import type { LoadedProductConfig } from './runtime/ProductConfigLoader.js';
import type { UserContext } from './binding/scope.js';

// =============================================================================
// PRODUCT METADATA — friendly labels for the raw product ids
// =============================================================================

interface ProductMeta {
  label: string;
  icon: string;
  tagline: string;
}

const PRODUCT_META: Record<string, ProductMeta> = {
  crm: { label: 'CRM', icon: '💼', tagline: 'Sales pipeline · Salesforce / HubSpot' },
  'bug-tracker': { label: 'Bug Tracker', icon: '🐛', tagline: 'Issues · Linear / Jira' },
  recruiting: { label: 'Recruiting', icon: '🧑‍💼', tagline: 'Hiring pipeline · Greenhouse / Lever' },
  inventory: { label: 'Inventory', icon: '📦', tagline: 'Stock & assets' },
  helpdesk: { label: 'Help Desk', icon: '🎧', tagline: 'Support tickets · Zendesk' },
  plm: { label: 'PLM', icon: '🔧', tagline: 'Hardware part lifecycle' },
  'kitchen-sink': { label: 'Kitchen Sink', icon: '🧩', tagline: 'All 14 block types' },
};

const PRODUCT_ORDER = ['crm', 'bug-tracker', 'recruiting', 'inventory', 'helpdesk', 'plm', 'kitchen-sink'];

const ROLES: { value: RoleName; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Full access' },
  { value: 'editor', label: 'Editor', hint: 'Create / edit / delete' },
  { value: 'viewer', label: 'Viewer', hint: 'Read-only' },
];

function metaFor(id: string): ProductMeta {
  return PRODUCT_META[id] ?? { label: id, icon: '📄', tagline: id };
}

function buildUser(role: RoleName): UserContext {
  return {
    id: 'demo-user',
    name: `Demo ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
    role,
    roles: [role],
    permissions: expandRoles([role]),
  };
}

// =============================================================================
// CONFIG PANEL — slide-over showing the YAML behind the current app
// =============================================================================

function ConfigPanel({
  productId,
  initialSource,
  isOverridden,
  onApply,
  onRevert,
  onClose,
}: {
  productId: string;
  initialSource: string | null;
  isOverridden: boolean;
  onApply: (config: LoadedProductConfig, source: string) => void;
  onRevert: () => void;
  onClose: () => void;
}): React.ReactElement {
  const [source, setSource] = useState<string>(initialSource ?? 'Loading…');
  const [parseError, setParseError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Already have edited source in hand — don't refetch the file.
    if (initialSource != null) {
      setSource(initialSource);
      return;
    }
    let active = true;
    fetch(`/api/config/products/${productId}/source`)
      .then((r) => r.json())
      .then((j: { source?: string; error?: string }) => {
        if (active) {
          setSource(j.source ?? j.error ?? 'Not found');
          setDirty(false);
          setParseError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setSource(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
      });
    return () => {
      active = false;
    };
  }, [productId, initialSource]);

  const apply = useCallback(() => {
    try {
      const parsed = yamlLoad(source) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        setParseError('Config must be a YAML object');
        return;
      }
      if (!Array.isArray(parsed['views'])) {
        setParseError("Config needs a 'views:' list");
        return;
      }
      setParseError(null);
      onApply(parsed as unknown as LoadedProductConfig, source);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  }, [source, onApply]);

  const lineCount = source.split('\n').length;

  return (
    <div className="demo-overlay" onClick={onClose}>
      <aside className="demo-config-panel" onClick={(e) => e.stopPropagation()}>
        <header className="demo-config-head">
          <div>
            <div className="demo-config-title">
              {`products/${productId}.yaml`}
              {isOverridden && <span className="demo-config-edited">edited</span>}
            </div>
            <div className="demo-config-sub">
              {lineCount} lines · edit and Apply to re-render the app live
            </div>
          </div>
          <button className="demo-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <textarea
          className="demo-config-editor"
          spellCheck={false}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setDirty(true);
          }}
        />

        {parseError && <div className="demo-config-error">⚠ {parseError}</div>}

        <footer className="demo-config-foot">
          <button className="demo-apply-btn" onClick={apply} disabled={!dirty}>
            ▶ Apply changes
          </button>
          {isOverridden && (
            <button className="demo-revert-btn" onClick={onRevert}>
              ↺ Revert to file
            </button>
          )}
          <span className="demo-config-foot-hint">
            Try: change a column <code>label</code>, add a kanban column, or edit the header.
          </span>
        </footer>
      </aside>
    </div>
  );
}

// =============================================================================
// TOASTS — listens for 'trellis:toast' events from the mutation hooks
// =============================================================================

interface Toast {
  id: number;
  kind: 'success' | 'info' | 'danger';
  message: string;
}

const TOAST_ICON: Record<Toast['kind'], string> = {
  success: '✓',
  info: '🗑',
  danger: '⚠',
};

function ToastHost(): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let counter = 0;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind?: Toast['kind']; message?: string };
      const toast: Toast = {
        id: ++counter,
        kind: detail.kind ?? 'info',
        message: detail.message ?? '',
      };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 2600);
    };
    window.addEventListener('trellis:toast', onToast);
    return () => window.removeEventListener('trellis:toast', onToast);
  }, []);

  if (!toasts.length) return <></>;

  return (
    <div className="demo-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`demo-toast demo-toast--${t.kind}`}>
          <span className="demo-toast-icon">{TOAST_ICON[t.kind]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// SHELL
// =============================================================================

function readParams(): { product: string; role: RoleName } {
  const params = new URLSearchParams(window.location.search);
  const product = params.get('product') ?? 'crm';
  const roleParam = params.get('role') ?? 'admin';
  const role = isRoleName(roleParam) ? roleParam : 'admin';
  return { product, role };
}

export function DemoShell(): React.ReactElement {
  const initial = readParams();
  const [product, setProduct] = useState(initial.product);
  const [role, setRole] = useState<RoleName>(initial.role);
  const [products, setProducts] = useState<string[]>(PRODUCT_ORDER);
  const [showConfig, setShowConfig] = useState(false);
  // Live-editor override: an edited config rendered instead of the file.
  const [override, setOverride] = useState<LoadedProductConfig | null>(null);
  const [editedSource, setEditedSource] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);

  // Discover available products from the API; keep the curated order first.
  useEffect(() => {
    fetch('/api/config/products')
      .then((r) => r.json())
      .then((j: { products?: { id: string }[] }) => {
        const ids = (j.products ?? []).map((p) => p.id);
        const ordered = [
          ...PRODUCT_ORDER.filter((id) => ids.includes(id)),
          ...ids.filter((id) => !PRODUCT_ORDER.includes(id)),
        ];
        if (ordered.length) setProducts(ordered);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  // Reflect selection in the URL so it's shareable / refresh-safe.
  const syncUrl = useCallback((nextProduct: string, nextRole: RoleName) => {
    const url = new URL(window.location.href);
    url.searchParams.set('product', nextProduct);
    url.searchParams.set('role', nextRole);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const onProduct = useCallback(
    (id: string) => {
      setProduct(id);
      setShowConfig(false);
      setOverride(null); // edits are per-product; drop them on switch
      setEditedSource(null);
      syncUrl(id, role);
    },
    [role, syncUrl]
  );

  const applyConfig = useCallback((config: LoadedProductConfig, source: string) => {
    setOverride(config);
    setEditedSource(source);
    setConfigVersion((v) => v + 1);
    setShowConfig(false);
  }, []);

  const revertConfig = useCallback(() => {
    setOverride(null);
    setEditedSource(null);
    setConfigVersion((v) => v + 1);
  }, []);

  const onRole = useCallback(
    (r: RoleName) => {
      setRole(r);
      syncUrl(product, r);
    },
    [product, syncUrl]
  );

  const user = useMemo(() => buildUser(role), [role]);
  const meta = metaFor(product);

  return (
    <div className="demo-root">
      <header className="demo-topbar">
        <div className="demo-brand">
          <span className="demo-brand-mark">▰</span>
          <span className="demo-brand-name">Trellis</span>
          <span className="demo-brand-tag">config&nbsp;→&nbsp;app</span>
        </div>

        <div className="demo-controls">
          <label className="demo-control">
            <span className="demo-control-label">Tool</span>
            <select
              className="demo-select"
              value={product}
              onChange={(e) => onProduct(e.target.value)}
            >
              {products.map((id) => {
                const m = metaFor(id);
                return (
                  <option key={id} value={id}>
                    {m.icon}  {m.label}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="demo-control">
            <span className="demo-control-label">Role</span>
            <select
              className="demo-select"
              value={role}
              onChange={(e) => onRole(e.target.value as RoleName)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>
          </label>

          <button className="demo-config-btn" onClick={() => setShowConfig(true)}>
            {'</>'}&nbsp; View config
          </button>

          <div className="demo-live">
            <span className="demo-live-dot" />
            Live
          </div>

          <a
            className="demo-gh"
            href="https://github.com/jnarwell/trellis"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <div className="demo-subbar">
        <span className="demo-subbar-icon">{meta.icon}</span>
        <span className="demo-subbar-label">{meta.label}</span>
        <span className="demo-subbar-tag">{meta.tagline}</span>
        <span className="demo-subbar-spacer" />
        {override ? (
          <span className="demo-subbar-hint demo-subbar-hint--edited">
            ● Rendering your edited config (not the file)
          </span>
        ) : (
          <span className="demo-subbar-hint">
            Same engine · only <code>products/{product}.yaml</code> differs
          </span>
        )}
      </div>

      <main className="demo-stage">
        {/* key remounts the app cleanly when product, role, or config changes */}
        <DynamicProductApp
          key={`${product}:${role}:${configVersion}`}
          productId={product}
          apiBaseUrl="/api"
          user={user}
          configOverride={override}
        />
      </main>

      {showConfig && (
        <ConfigPanel
          productId={product}
          initialSource={editedSource}
          isOverridden={override !== null}
          onApply={applyConfig}
          onRevert={revertConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
      <ToastHost />
    </div>
  );
}
