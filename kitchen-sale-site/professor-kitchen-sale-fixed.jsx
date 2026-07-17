import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, SITE, STATUSES } from "./config.js";

const DRAFT_KEY = "kitchen-catalog-draft-v2";
const currency = new Intl.NumberFormat("en-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function imageUrl(folder, filename) {
  if (!filename) return "";
  if (/^(https?:|data:|blob:)/i.test(filename)) return filename;
  return `${SITE.imageBase}/${folder}/${encodeURIComponent(filename)}`;
}

function priceValue(value) {
  if (value === "" || value == null) return Number.POSITIVE_INFINITY;
  const parsed = Number(String(value).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function formatPrice(value) {
  const parsed = priceValue(value);
  return Number.isFinite(parsed) ? currency.format(parsed) : "Price on request";
}

function normalizeItem(item, index = 0) {
  return {
    id: item.id || `item-${Date.now()}-${index}`,
    nome: item.nome || "Unnamed item",
    categoria: item.categoria || CATEGORIES[0],
    foto: item.foto || "",
    altre: Array.isArray(item.altre) ? item.altre.filter(Boolean) : [],
    prezzo: item.prezzo ?? "",
    stato: STATUSES.includes(item.stato) ? item.stato : "Available",
    note: item.note || "",
    nascosto: Boolean(item.nascosto),
  };
}

function normalizeCatalog(value) {
  if (!Array.isArray(value)) throw new Error("The catalogue must contain a JSON array.");
  return value.map(normalizeItem);
}

export default function App() {
  const [published, setPublished] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [hideSold, setHideSold] = useState(false);
  const [sort, setSort] = useState("catalogue");
  const [selected, setSelected] = useState(null);
  const [manage, setManage] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState(null);
  const [draftChanged, setDraftChanged] = useState(false);
  const importRef = useRef(null);

  async function loadPublished({ discardDraft = false } = {}) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}catalog.json?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      const loaded = normalizeCatalog(await response.json());
      setPublished(loaded);

      if (!discardDraft) {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          try {
            setItems(normalizeCatalog(JSON.parse(saved)));
            setDraftChanged(true);
          } catch {
            localStorage.removeItem(DRAFT_KEY);
            setItems(loaded);
          }
        } else {
          setItems(loaded);
        }
      } else {
        localStorage.removeItem(DRAFT_KEY);
        setItems(loaded);
        setDraftChanged(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublished();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const found = items.find((item) => item.id === hash && !item.nascosto);
    if (found) setSelected(found);
  }, [items]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setSelected(null);
        setEditing(null);
        setLoginOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function commit(nextItems) {
    const normalized = normalizeCatalog(nextItems);
    setItems(normalized);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(normalized));
    setDraftChanged(true);
  }

  function patchItem(id, patch) {
    commit(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setSelected((current) => (current?.id === id ? { ...current, ...patch } : current));
  }

  function removeItem(id) {
    patchItem(id, { nascosto: true });
    setEditing(null);
    setSelected(null);
  }

  function restoreItem(id) {
    patchItem(id, { nascosto: false });
  }

  function saveEditor(form) {
    const clean = normalizeItem({
      ...form,
      nome: form.nome.trim() || "Unnamed item",
      altre: Array.isArray(form.altre)
        ? form.altre
        : String(form.altre || "")
            .split(/\n|,/)
            .map((name) => name.trim())
            .filter(Boolean),
    });

    if (form.isNew) {
      commit([clean, ...items]);
    } else {
      commit(items.map((item) => (item.id === clean.id ? clean : item)));
    }
    setEditing(null);
  }

  function exportCatalog() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "catalog.json";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function importCatalog(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const next = normalizeCatalog(JSON.parse(await file.text()));
      commit(next);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "This is not a valid catalogue file.");
    }
  }

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (item.nascosto) return false;
      if (category !== "All" && item.categoria !== category) return false;
      if (hideSold && item.stato === "Sold") return false;
      if (!normalizedQuery) return true;
      return [item.nome, item.categoria, item.note]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    if (sort === "price-low") return [...filtered].sort((a, b) => priceValue(a.prezzo) - priceValue(b.prezzo));
    if (sort === "price-high") return [...filtered].sort((a, b) => priceValue(b.prezzo) - priceValue(a.prezzo));
    if (sort === "name") return [...filtered].sort((a, b) => a.nome.localeCompare(b.nome));
    return filtered;
  }, [items, category, query, hideSold, sort]);

  const counts = useMemo(() => {
    const active = items.filter((item) => !item.nascosto);
    return {
      total: active.length,
      available: active.filter((item) => item.stato === "Available").length,
      reserved: active.filter((item) => item.stato === "Reserved").length,
      sold: active.filter((item) => item.stato === "Sold").length,
    };
  }, [items]);

  const categoryCounts = useMemo(() => {
    const result = Object.fromEntries(CATEGORIES.map((name) => [name, 0]));
    for (const item of items) {
      if (!item.nascosto && result[item.categoria] != null) result[item.categoria] += 1;
    }
    return result;
  }, [items]);

  function openItem(item) {
    setSelected(item);
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${item.id}`);
  }

  function closeItem() {
    setSelected(null);
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  async function shareItem(item) {
    const url = `${window.location.origin}${window.location.pathname}#${item.id}`;
    const data = {
      title: item.nome,
      text: `${item.nome} — ${formatPrice(item.prezzo)} — ${item.stato}`,
      url,
    };
    if (navigator.share) {
      await navigator.share(data).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(url);
      window.alert("Item link copied.");
    }
  }

  function openNewItem() {
    setEditing({
      id: `item-${Date.now()}`,
      nome: "",
      categoria: category === "All" ? CATEGORIES[0] : category,
      foto: "",
      altre: [],
      prezzo: "",
      stato: "Available",
      note: "",
      nascosto: false,
      isNew: true,
    });
  }

  return (
    <div className="site-shell">
      <header className="hero">
        <div className="container hero-layout">
          <div>
            <p className="eyebrow">{SITE.eyebrow}</p>
            <h1>{SITE.title}</h1>
            <p className="hero-copy">{SITE.intro}</p>
            <div className="hero-meta">
              <span>{SITE.pickup}</span>
              <span aria-hidden="true">•</span>
              <span>{counts.available} available</span>
              {counts.reserved > 0 && <span>• {counts.reserved} reserved</span>}
            </div>
          </div>
          <div className="hero-actions">
            <button className="button button-ghost" onClick={() => loadPublished()}>
              Refresh
            </button>
            {manage ? (
              <button className="button button-light" onClick={() => setManage(false)}>
                Exit owner mode
              </button>
            ) : (
              <button className="button button-ghost" onClick={() => setLoginOpen(true)}>
                Owner mode
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="toolbar-wrap">
        <div className="container toolbar">
          <label className="search-box">
            <span className="sr-only">Search catalogue</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pots, glasses, appliances…"
            />
          </label>
          <label className="compact-field">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="catalogue">Catalogue order</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="check-field">
            <input type="checkbox" checked={hideSold} onChange={(event) => setHideSold(event.target.checked)} />
            Hide sold
          </label>
        </div>
        <div className="container category-row" aria-label="Product categories">
          {['All', ...CATEGORIES].map((name) => (
            <button
              key={name}
              className={`category-chip ${category === name ? 'is-active' : ''}`}
              onClick={() => setCategory(name)}
            >
              <span>{name}</span>
              <small>{name === 'All' ? counts.total : categoryCounts[name] || 0}</small>
            </button>
          ))}
        </div>
      </section>

      {manage && (
        <section className="owner-bar">
          <div className="container owner-layout">
            <div>
              <strong>Owner mode</strong>
              <p>
                Changes are kept as a local draft. Export <code>catalog.json</code> and replace
                <code> public/catalog.json</code> in GitHub to publish them for everyone.
              </p>
            </div>
            <div className="owner-actions">
              <button className="button button-primary" onClick={openNewItem}>Add item</button>
              <button className="button button-secondary" onClick={exportCatalog}>Export catalogue</button>
              <button className="button button-secondary" onClick={() => importRef.current?.click()}>Import catalogue</button>
              <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importCatalog} />
              <button
                className="button button-danger-text"
                onClick={() => {
                  if (window.confirm('Discard the local draft and reload the published catalogue?')) {
                    loadPublished({ discardDraft: true });
                  }
                }}
                disabled={!draftChanged}
              >
                Discard draft
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="container alert alert-error" role="alert">
          <strong>Catalogue unavailable.</strong> {error}
          <button onClick={() => loadPublished()}>Try again</button>
        </div>
      )}

      <main className="container main-content">
        <div className="result-heading">
          <div>
            <p className="eyebrow dark">Catalogue</p>
            <h2>{category === 'All' ? 'All items' : category}</h2>
          </div>
          <p>{visibleItems.length} result{visibleItems.length === 1 ? '' : 's'}</p>
        </div>

        {loading ? (
          <div className="loading-grid" aria-label="Loading catalogue">
            {Array.from({ length: 8 }).map((_, index) => <div className="skeleton" key={index} />)}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="empty-state">
            <h3>No matching items</h3>
            <p>Change the category or remove the search filter.</p>
            <button className="button button-primary" onClick={() => { setCategory('All'); setQuery(''); setHideSold(false); }}>
              Reset filters
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {visibleItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                manage={manage}
                onOpen={() => openItem(item)}
                onPatch={(patch) => patchItem(item.id, patch)}
                onEdit={() => setEditing({ ...item })}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-layout">
          <div>
            <strong>{SITE.title}</strong>
            <p>Private second-hand sale. Availability may change quickly.</p>
          </div>
          <p>{counts.available} available · {counts.reserved} reserved · {counts.sold} sold</p>
        </div>
      </footer>

      {selected && (
        <Modal title={selected.categoria} onClose={closeItem} wide>
          <div className="detail-layout">
            <Gallery item={selected} />
            <div className="detail-copy">
              <span className={`status-badge status-${selected.stato.toLowerCase()}`}>{selected.stato}</span>
              <h2>{selected.nome}</h2>
              <p className="detail-price">{formatPrice(selected.prezzo)}</p>
              {selected.note && <p className="detail-notes">{selected.note}</p>}
              <div className="detail-actions">
                {SITE.contactUrl && selected.stato !== 'Sold' && (
                  <a
                    className="button button-primary"
                    href={`${SITE.contactUrl}${SITE.contactUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(`Hi! I am interested in ${selected.nome}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {SITE.contactLabel}
                  </a>
                )}
                <button className="button button-secondary" onClick={() => shareItem(selected)}>Share item</button>
                {manage && <button className="button button-secondary" onClick={() => { setEditing({ ...selected }); closeItem(); }}>Edit</button>}
              </div>
              {!SITE.contactUrl && (
                <p className="contact-hint">Seller contact details have not been added yet.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {loginOpen && (
        <Modal title="Owner mode" onClose={() => { setLoginOpen(false); setPassword(''); }}>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (password === SITE.adminPassword) {
                setManage(true);
                setLoginOpen(false);
                setPassword('');
              }
            }}
          >
            <p className="muted">
              This password only hides the editing interface; it is not a secure server login.
            </p>
            <label>
              <span>Password</span>
              <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {password && password !== SITE.adminPassword && <p className="field-error">Wrong password.</p>}
            <button className="button button-primary" type="submit">Enter</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Editor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={saveEditor}
          onRemove={() => removeItem(editing.id)}
          onRestore={() => restoreItem(editing.id)}
        />
      )}
    </div>
  );
}

function ProductCard({ item, manage, onOpen, onPatch, onEdit }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className={`product-card ${item.stato === 'Sold' ? 'is-sold' : ''}`}>
      <button className="product-image-button" onClick={onOpen} aria-label={`Open ${item.nome}`}>
        {!imageFailed && item.foto ? (
          <img
            src={imageUrl('thumbs', item.foto)}
            alt={item.nome}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="image-placeholder">Photo unavailable</div>
        )}
        {item.stato !== 'Available' && (
          <span className={`status-ribbon status-${item.stato.toLowerCase()}`}>{item.stato}</span>
        )}
        {(item.altre?.length || 0) > 0 && (
          <span className="photo-count">{item.altre.length + 1} photos</span>
        )}
      </button>
      <div className="product-copy">
        <p className="product-category">{item.categoria}</p>
        <button className="product-title" onClick={onOpen}>{item.nome}</button>
        <p className="product-price">{formatPrice(item.prezzo)}</p>
      </div>
      {manage && (
        <div className="quick-editor">
          <label>
            <span className="sr-only">Price for {item.nome}</span>
            <input value={item.prezzo} onChange={(event) => onPatch({ prezzo: event.target.value })} placeholder="Price" />
          </label>
          <label>
            <span className="sr-only">Status for {item.nome}</span>
            <select value={item.stato} onChange={(event) => onPatch({ stato: event.target.value })}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button onClick={onEdit}>Edit details</button>
        </div>
      )}
    </article>
  );
}

function Gallery({ item }) {
  const photos = [item.foto, ...(item.altre || [])].filter(Boolean);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [item.id]);

  return (
    <div className="gallery">
      <div className="gallery-main">
        {!failed && photos[index] ? (
          <img src={imageUrl('full', photos[index])} alt={`${item.nome}, photo ${index + 1}`} onError={() => setFailed(true)} />
        ) : (
          <div className="image-placeholder">Photo unavailable</div>
        )}
        {photos.length > 1 && (
          <>
            <button
              className="gallery-arrow gallery-prev"
              onClick={() => { setFailed(false); setIndex((index - 1 + photos.length) % photos.length); }}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              className="gallery-arrow gallery-next"
              onClick={() => { setFailed(false); setIndex((index + 1) % photos.length); }}
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="thumbnail-row">
          {photos.map((photo, photoIndex) => (
            <button
              key={`${photo}-${photoIndex}`}
              className={photoIndex === index ? 'is-active' : ''}
              onClick={() => { setFailed(false); setIndex(photoIndex); }}
              aria-label={`View photo ${photoIndex + 1}`}
            >
              <img src={imageUrl('thumbs', photo)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ initial, onClose, onSave, onRemove, onRestore }) {
  const [form, setForm] = useState({ ...initial, altreText: (initial.altre || []).join('\n') });
  return (
    <Modal title={initial.isNew ? 'Add item' : 'Edit item'} onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...form,
            altre: form.altreText
              .split(/\n|,/)
              .map((value) => value.trim())
              .filter(Boolean),
          });
        }}
      >
        <label>
          <span>Name</span>
          <input autoFocus required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
        </label>
        <div className="form-grid">
          <label>
            <span>Category</span>
            <select value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })}>
              {CATEGORIES.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <span>Price in euros</span>
            <input inputMode="decimal" value={form.prezzo} onChange={(event) => setForm({ ...form, prezzo: event.target.value })} placeholder="15" />
          </label>
        </div>
        <label>
          <span>Status</span>
          <select value={form.stato} onChange={(event) => setForm({ ...form, stato: event.target.value })}>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span>Main photo filename or URL</span>
          <input value={form.foto} onChange={(event) => setForm({ ...form, foto: event.target.value })} placeholder="IMG_….webp" />
        </label>
        <label>
          <span>Other photos, one filename per line</span>
          <textarea rows="4" value={form.altreText} onChange={(event) => setForm({ ...form, altreText: event.target.value })} />
        </label>
        <label>
          <span>Notes</span>
          <textarea rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Condition, dimensions, quantity…" />
        </label>
        <div className="form-actions">
          <button className="button button-primary" type="submit">Save draft</button>
          {!initial.isNew && !initial.nascosto && <button className="button button-danger-text" type="button" onClick={onRemove}>Remove from catalogue</button>}
          {!initial.isNew && initial.nascosto && <button className="button button-secondary" type="button" onClick={onRestore}>Restore item</button>}
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <p>{title}</p>
          <button onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
