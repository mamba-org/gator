import * as React from 'react';
import { Dialog } from '@jupyterlab/apputils';
import { classes, style } from 'typestyle';
import { NestedCSSProperties } from 'typestyle/lib/types';
import { Conda } from '../tokens';
import { ReactWidget } from '../utils';

export interface ICondaActionPackage {
  name: string;
  version: string;
  build_string?: string;
  build?: string;
  channel?: string;
  base_url?: string;
  dist_name?: string;
  platform?: string;
}

export interface ICondaActions {
  LINK?: ICondaActionPackage[];
  UNLINK?: ICondaActionPackage[];
  FETCH?: ICondaActionPackage[];
}

/** Case-insensitive key for matching LINK ↔ UNLINK rows from conda/mamba JSON. */
function transactionMatchKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Coerce dry-run JSON rows to comparable shapes (conda may use numbers, mixed case names,
 * and `build` instead of `build_string`).
 */
function sanitizePreviewPackageRow(
  raw: Conda.IPreviewPkgRow | Record<string, unknown>
): ICondaActionPackage {
  const r = raw as Record<string, unknown>;
  const name = String(r.name ?? '').trim();
  const version =
    r.version !== undefined && r.version !== null ? String(r.version) : '';
  const build_string =
    r.build_string !== null
      ? String(r.build_string)
      : r.build !== null
        ? String(r.build)
        : undefined;
  const channel =
    r.channel !== undefined && r.channel !== null
      ? String(r.channel)
      : undefined;
  const base_url =
    r.base_url !== undefined && r.base_url !== null
      ? String(r.base_url)
      : undefined;
  return {
    name,
    version,
    build_string,
    channel,
    base_url,
    dist_name:
      r.dist_name !== undefined && r.dist_name !== null
        ? String(r.dist_name)
        : undefined,
    platform:
      r.platform !== undefined && r.platform !== null
        ? String(r.platform)
        : undefined
  };
}

export interface ITransactionPreviewProps {
  actions: ICondaActions;
  isLoading?: boolean;
  title?: string;
  /**
   * Optional package names explicitly requested by the user,
   * shown first for context.
   */
  requestedPackages?: string[];
  /** When true, render as a subsection (e.g. multiple previews in one dialog). */
  embedded?: boolean;
}

/** Map server dry-run payload to UI actions shape. */
export function previewTransactionToActions(
  p: Conda.IPreviewTransactionActions
): ICondaActions {
  return {
    LINK: (p.LINK ?? []).map(sanitizePreviewPackageRow),
    UNLINK: (p.UNLINK ?? []).map(sanitizePreviewPackageRow),
    FETCH: (p.FETCH ?? []).map(sanitizePreviewPackageRow)
  };
}

export interface ITransactionPreviewSection {
  id: string;
  title: string;
  actions: ICondaActions;
  requestedPackages?: string[];
}

export function MultiCondaTransactionPreview(props: {
  sections: ITransactionPreviewSection[];
  /** When true, drop max-height so a parent can own scrolling (e.g. dialog). */
  noMaxHeight?: boolean;
}): JSX.Element {
  const { sections, noMaxHeight = false } = props;
  const multi = sections.length > 1;

  return (
    <div
      className={classes(
        Style.MultiOuter,
        noMaxHeight ? Style.MultiOuterUnbounded : null
      )}
    >
      {multi && (
        <div className={Style.Disclaimer}>
          Several operation types are shown below. Each preview reflects your
          environment as it is now; running remove, then update, then install in
          order can produce a slightly different final transaction than these
          sections combined.
        </div>
      )}
      {sections.map(s => (
        <div key={s.id} className={Style.MultiBlock}>
          <CondaTransactionPreview
            title={s.title}
            actions={s.actions}
            requestedPackages={s.requestedPackages ?? []}
            embedded={multi}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Dry-run job: section metadata plus the preview promise (started when the dialog opens).
 */
export interface IPreviewJob {
  section: Omit<ITransactionPreviewSection, 'actions'>;
  promise: Promise<Conda.IPreviewTransactionActions>;
}

function ensureSpinnerKeyframes(): void {
  if (
    typeof document !== 'undefined' &&
    !document.getElementById('gator-spinner-keyframes')
  ) {
    const el = document.createElement('style');
    el.id = 'gator-spinner-keyframes';
    el.textContent = `
      @keyframes gator-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(el);
  }
}

/**
 * Dialog body: spinner while dry-run resolves, then transaction preview.
 * The dialog footer Apply/Delete button (provided by `Dialog.okButton`) is enabled
 * via `onReadyChange(true)` only after a successful preview.
 */
export function PackagePreviewDialogBody(props: {
  jobs: IPreviewJob[];
  onReadyChange: (ready: boolean) => void;
}): JSX.Element {
  const { jobs, onReadyChange } = props;
  const jobsRef = React.useRef(jobs);
  jobsRef.current = jobs;
  const onReadyChangeRef = React.useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;

  const [sections, setSections] = React.useState<
    ITransactionPreviewSection[] | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    ensureSpinnerKeyframes();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const run = jobsRef.current;
    setSections(null);
    setError(null);
    onReadyChangeRef.current(false);

    (async () => {
      try {
        const results = await Promise.all(run.map(j => j.promise));
        if (cancelled) {
          return;
        }
        setSections(
          run.map((j, i) => ({
            ...j.section,
            actions: previewTransactionToActions(results[i])
          }))
        );
        onReadyChangeRef.current(true);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message ?? String(e));
          onReadyChangeRef.current(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={Style.DialogBodyShell}>
      <div className={Style.DialogBodyScroll}>
        {error !== null ? (
          <div className={Style.PreviewLoadError}>{error}</div>
        ) : sections === null ? (
          <div className={Style.PreviewLoadingWrap}>
            <div className={Style.PreviewSpinner} />
            <div className={Style.PreviewLoadingText}>
              Resolving package changes…
            </div>
          </div>
        ) : (
          <MultiCondaTransactionPreview sections={sections} noMaxHeight />
        )}
      </div>
    </div>
  );
}

/**
 * Opens a dialog immediately with a loading state, then shows the dry-run preview.
 */
function setDialogAcceptButtonEnabled(
  dialog: Dialog<any>,
  enabled: boolean
): void {
  const btn = dialog.node.querySelector(
    '.jp-Dialog-footer button.jp-mod-accept'
  ) as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = !enabled;
  }
}

export async function openPackagePreviewDialog(options: {
  title: string;
  jobs: IPreviewJob[];
  acceptLabel: string;
  dialogClass?: string;
}): Promise<boolean> {
  let dialog: Dialog<any> | null = null;

  const onReadyChange = (ready: boolean) => {
    if (dialog) {
      setDialogAcceptButtonEnabled(dialog, ready);
    }
  };

  const body = ReactWidget.create(
    <PackagePreviewDialogBody
      jobs={options.jobs}
      onReadyChange={onReadyChange}
    />
  );

  dialog = new Dialog({
    title: options.title,
    body,
    buttons: [
      Dialog.cancelButton({ label: 'Cancel' }),
      Dialog.okButton({ label: options.acceptLabel })
    ],
    /**
     * Cancel is the default so Enter from the body does not resolve as Accept
     * while the accept button is still disabled.
     */
    defaultButton: 0
  });

  setDialogAcceptButtonEnabled(dialog, false);

  if (options.dialogClass) {
    dialog.addClass(options.dialogClass);
  }

  try {
    const result = await dialog.launch();
    return Boolean(result.button.accept);
  } catch {
    return false;
  }
}

type ChangeKind = 'changed' | 'rebuild' | 'channel-change';

interface IChangedPackage {
  name: string;
  oldPkg: ICondaActionPackage;
  newPkg: ICondaActionPackage;
  kind: ChangeKind;
}

interface ITransactionDiff {
  removed: ICondaActionPackage[];
  installed: ICondaActionPackage[];
  changed: IChangedPackage[];
}

function packageBuild(pkg: ICondaActionPackage): string {
  return String(pkg.build_string ?? pkg.build ?? '');
}

function packageVersion(pkg: ICondaActionPackage): string {
  return pkg.version !== null && pkg.version !== '' ? String(pkg.version) : '';
}

function packageChannel(pkg: ICondaActionPackage): string {
  return pkg.channel ?? pkg.base_url ?? '';
}

/** Compare channels loosely (trim + case) to avoid false "channel-change" from formatting. */
function channelComparable(pkg: ICondaActionPackage): string {
  return packageChannel(pkg).trim().toLowerCase();
}

function classifyChangedPackage(
  oldPkg: ICondaActionPackage,
  newPkg: ICondaActionPackage
): ChangeKind {
  const sameVersion = packageVersion(oldPkg) === packageVersion(newPkg);
  const sameBuild = packageBuild(oldPkg) === packageBuild(newPkg);
  const sameChannel = channelComparable(oldPkg) === channelComparable(newPkg);

  if (sameVersion && !sameBuild) {
    return 'rebuild';
  }

  if (sameVersion && sameBuild && !sameChannel) {
    return 'channel-change';
  }

  return 'changed';
}

function normalizeTransaction(actions: ICondaActions): ITransactionDiff {
  const linked = (actions.LINK ?? []).map(sanitizePreviewPackageRow);
  const unlinked = (actions.UNLINK ?? []).map(sanitizePreviewPackageRow);

  const linkedByKey = new Map<string, ICondaActionPackage>();
  for (const pkg of linked) {
    linkedByKey.set(transactionMatchKey(pkg.name), pkg);
  }
  const unlinkedByKey = new Map<string, ICondaActionPackage>();
  for (const pkg of unlinked) {
    unlinkedByKey.set(transactionMatchKey(pkg.name), pkg);
  }

  const allKeys = Array.from(
    new Set([...linkedByKey.keys(), ...unlinkedByKey.keys()])
  ).sort((a, b) => a.localeCompare(b));

  const removed: ICondaActionPackage[] = [];
  const installed: ICondaActionPackage[] = [];
  const changed: IChangedPackage[] = [];

  for (const key of allKeys) {
    const oldPkg = unlinkedByKey.get(key);
    const newPkg = linkedByKey.get(key);
    const displayName = newPkg?.name ?? oldPkg?.name ?? key;

    if (oldPkg && newPkg) {
      changed.push({
        name: displayName,
        oldPkg,
        newPkg,
        kind: classifyChangedPackage(oldPkg, newPkg)
      });
    } else if (oldPkg) {
      removed.push(oldPkg);
    } else if (newPkg) {
      installed.push(newPkg);
    }
  }

  return { removed, installed, changed };
}

function renderPackageLabel(pkg: ICondaActionPackage): string {
  const build = packageBuild(pkg);
  const ver = packageVersion(pkg) || '?';
  return build ? `${pkg.name} ${ver} (${build})` : `${pkg.name} ${ver}`;
}

// function renderChannel(pkg: ICondaActionPackage): string | null {
//   const channel = packageChannel(pkg);
//   return channel || null;
// }

function RequestedPackagesSection(props: {
  requestedPackages: string[];
  diff: ITransactionDiff;
}): JSX.Element | null {
  const { requestedPackages, diff } = props;

  if (!requestedPackages.length) {
    return null;
  }

  const requestedSet = new Set(
    requestedPackages.map(n => transactionMatchKey(n))
  );

  const matches = [
    ...diff.removed
      .filter(pkg => requestedSet.has(transactionMatchKey(pkg.name)))
      .map(pkg => ({
        name: pkg.name,
        label: 'Remove',
        detail: renderPackageLabel(pkg)
      })),
    ...diff.changed
      .filter(item => requestedSet.has(transactionMatchKey(item.name)))
      .map(item => ({
        name: item.name,
        label: 'Change',
        detail: `${renderPackageLabel(item.oldPkg)} -> ${renderPackageLabel(
          item.newPkg
        )}`
      })),
    ...diff.installed
      .filter(pkg => requestedSet.has(transactionMatchKey(pkg.name)))
      .map(pkg => ({
        name: pkg.name,
        label: 'Install',
        detail: renderPackageLabel(pkg)
      }))
  ];

  if (!matches.length) {
    return null;
  }

  return (
    <section className={Style.Section}>
      <div className={Style.SectionTitle}>Requested changes</div>
      <div className={Style.List}>
        {matches.map(item => (
          <div key={`${item.label}-${item.name}`} className={Style.Row}>
            <div className={classes(Style.Badge, Style.BadgeNeutral)}>
              {item.label}
            </div>
            <div className={Style.MainCell}>
              <div className={Style.PackageName}>{item.name}</div>
              <div className={Style.PackageMeta}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
interface IPreviewRow {
  kind: 'remove' | 'change' | 'install';
  name: string;
  badgeClass: string;
  badgeText: string;
  metaLines: string[];
}

function TransactionPreviewListSection(props: {
  title: string;
  emptyText: string;
  rows: IPreviewRow[];
}): JSX.Element {
  const { title, emptyText, rows } = props;

  return (
    <section className={Style.Section}>
      <div className={Style.SectionTitle}>{title}</div>
      {rows.length === 0 ? (
        <div className={Style.EmptyState}>{emptyText}</div>
      ) : (
        <div className={Style.List}>
          {rows.map(row => (
            <div key={`${row.kind}-${row.name}`} className={Style.Row}>
              <div className={classes(Style.Badge, row.badgeClass)}>
                {row.badgeText}
              </div>
              <div className={Style.MainCell}>
                <div className={Style.PackageName}>{row.name}</div>
                {row.metaLines.map((line, i) => (
                  <div
                    key={i}
                    className={
                      i === 0 ? Style.PackageMeta : Style.SecondaryMeta
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function CondaTransactionPreview(
  props: ITransactionPreviewProps
): JSX.Element {
  const {
    actions,
    isLoading = false,
    title = 'Transaction preview',
    requestedPackages = [],
    embedded = false
  } = props;

  const diff = React.useMemo(() => normalizeTransaction(actions), [actions]);

  const removed = diff.removed.map(pkg => ({
    kind: 'remove' as const,
    name: pkg.name,
    badgeClass: Style.BadgeDanger,
    badgeText: 'remove',
    metaLines: [renderPackageLabel(pkg)]
  }));

  const changed = diff.changed.map(pkg => ({
    kind: 'change' as const,
    name: pkg.name,
    badgeClass: Style.BadgeWarning,
    badgeText: 'change',
    metaLines: [
      renderPackageLabel(pkg.oldPkg) + ' -> ' + renderPackageLabel(pkg.newPkg)
    ]
  }));

  const installed = diff.installed.map(pkg => ({
    kind: 'install' as const,
    name: pkg.name,
    badgeClass: Style.BadgeSuccess,
    badgeText: 'install',
    metaLines: [renderPackageLabel(pkg)]
  }));

  const all = [...removed, ...changed, ...installed];
  const shellClass = embedded ? Style.EmbeddedContainer : Style.Container;

  if (isLoading) {
    return (
      <div className={shellClass}>
        <div className={Style.Title}>{title}</div>
        <div className={Style.EmptyState}>Loading transaction preview...</div>
      </div>
    );
  }
  return (
    <div className={shellClass}>
      <div className={Style.Title}>{title}</div>

      <div className={Style.SummaryGrid}>
        <div className={Style.SummaryCard}>
          <div className={Style.SummaryValue}>{diff.removed.length}</div>
          <div className={Style.SummaryLabel}>Removed</div>
        </div>
        <div className={Style.SummaryCard}>
          <div className={Style.SummaryValue}>{diff.changed.length}</div>
          <div className={Style.SummaryLabel}>Changed</div>
        </div>
        <div className={Style.SummaryCard}>
          <div className={Style.SummaryValue}>{diff.installed.length}</div>
          <div className={Style.SummaryLabel}>Installed</div>
        </div>
      </div>

      <RequestedPackagesSection
        requestedPackages={requestedPackages}
        diff={diff}
      />

      <TransactionPreviewListSection
        title="Transaction preview"
        emptyText="No packages changes will be made."
        rows={all}
      />
    </div>
  );
}

namespace Style {
  export const MultiOuter = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 'min(560px, 90vw)',
    maxHeight: '480px',
    overflowY: 'auto',
    color: 'var(--jp-ui-font-color1)'
  });

  export const MultiOuterUnbounded = style({
    maxHeight: 'none'
  });

  export const DialogBodyShell = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 'min(560px, 86vw)',
    maxHeight: 'min(520px, 80vh)',
    color: 'var(--jp-ui-font-color1)'
  });

  export const DialogBodyScroll = style({
    flex: '1 1 auto',
    minHeight: '200px',
    maxHeight: 'min(440px, 72vh)',
    overflowY: 'auto',
    overflowX: 'hidden'
  });

  export const PreviewLoadingWrap = style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    minHeight: '220px',
    padding: '24px 16px',
    color: 'var(--jp-ui-font-color1)'
  });

  export const PreviewSpinner = style({
    width: '40px',
    height: '40px',
    border: '4px solid var(--jp-layout-color3)',
    borderTop: '4px solid var(--jp-brand-color1)',
    borderRadius: '50%',
    flexShrink: 0,
    animation: 'gator-spin 1s linear infinite'
  });

  export const PreviewLoadingText = style({
    fontSize: 'var(--jp-ui-font-size1)',
    fontWeight: 500,
    color: 'var(--jp-ui-font-color2)',
    textAlign: 'center'
  });

  export const PreviewLoadError = style({
    padding: '12px',
    color: 'var(--jp-error-color1)',
    fontSize: 'var(--jp-ui-font-size1)',
    lineHeight: 1.45
  });

  export const Disclaimer = style({
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color2)',
    lineHeight: 1.45,
    padding: '8px 10px',
    background: 'var(--jp-layout-color2)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '6px'
  });

  export const MultiBlock = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  });

  export const Container = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    color: 'var(--jp-ui-font-color1)',
    background: 'var(--jp-layout-color1)',
    minHeight: 0,
    overflowY: 'auto'
  });

  export const EmbeddedContainer = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '10px 12px',
    color: 'var(--jp-ui-font-color1)',
    background: 'var(--jp-layout-color2)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '8px',
    minHeight: 0
  });

  export const Title = style({
    fontSize: 'var(--jp-ui-font-size2)',
    fontWeight: 600
  });

  export const SummaryGrid = style({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '8px'
  });

  export const SummaryCard = style({
    background: 'var(--jp-layout-color2)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '6px',
    padding: '10px 12px'
  });

  export const SummaryValue = style({
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--jp-ui-font-color0)'
  });

  export const SummaryLabel = style({
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color2)',
    marginTop: '2px'
  });

  export const Section = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  });

  export const SectionTitle = style({
    fontSize: 'var(--jp-ui-font-size1)',
    fontWeight: 600,
    color: 'var(--jp-ui-font-color0)'
  });

  export const List = style({
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '6px',
    overflow: 'hidden'
  });

  const rowBase: NestedCSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    borderBottom: '1px solid var(--jp-border-color3)',
    $nest: {
      '&:last-child': {
        borderBottom: 'none'
      }
    }
  };

  export const Row = style(rowBase, {
    background: 'var(--jp-layout-color1)'
  });

  export const MainCell = style({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: '2px',
    flex: '1 1 auto'
  });

  export const PackageName = style({
    fontWeight: 600,
    color: 'var(--jp-ui-font-color0)',
    wordBreak: 'break-word'
  });

  export const PackageMeta = style({
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color1)',
    wordBreak: 'break-word'
  });

  export const SecondaryMeta = style({
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color2)',
    wordBreak: 'break-word'
  });

  export const EmptyState = style({
    padding: '10px 12px',
    color: 'var(--jp-ui-font-color2)',
    background: 'var(--jp-layout-color2)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '6px'
  });

  export const Badge = style({
    flex: '0 0 auto',
    minWidth: '64px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '999px',
    border: '1px solid transparent'
  });

  export const BadgeDanger = style({
    color: 'var(--jp-error-color1)',
    background: 'var(--jp-error-color3)',
    borderColor: 'var(--jp-error-color2)'
  });

  export const BadgeWarning = style({
    color: 'var(--jp-warn-color2)',
    background: 'var(--jp-warn-color3)',
    borderColor: 'var(--jp-warn-color2)'
  });

  export const BadgeSuccess = style({
    color: 'var(--jp-success-color1)',
    background: 'var(--jp-success-color3)',
    borderColor: 'var(--jp-success-color2)'
  });

  export const BadgeNeutral = style({
    color: 'var(--jp-ui-font-color1)',
    background: 'var(--jp-layout-color2)',
    borderColor: 'var(--jp-border-color2)'
  });
}
