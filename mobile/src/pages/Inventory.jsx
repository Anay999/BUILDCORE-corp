import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmt } from "../api.js";

export default function InventoryPage() {
  const { showToast } = useApp();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", qty_in_stock: "", min_stock: "", unit: "Nos", unit_cost: "", location: "" });

  function load() {
    api.get("/inventory").then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.qty_in_stock <= (i.min_stock || 0));

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/inventory", form); showToast("Item added", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  return (
    <>
      <div className="top-bar">
        <h1>Inventory</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        {lowStock.length > 0 && (
          <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <Ic.AlertTriangle s={16} style={{ color: "#f87171", flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "#fca5a5" }}><strong>{lowStock.length} items</strong> below minimum stock level</p>
          </div>
        )}

        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}><Ic.Search s={16} /></span>
          <input style={{ width: "100%", background: "#1e293b", border: "1.5px solid #334155", borderRadius: 10, padding: "10px 12px 10px 38px", color: "#f1f5f9", fontSize: 15, outline: "none" }}
            placeholder="Search inventory…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.Layers s={40} /><p>No inventory items</p></div> :
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((item, i) => {
              const isLow = item.qty_in_stock <= (item.min_stock || 0);
              return (
                <div key={item.id} className="list-item" style={{ padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #334155" : "none" }}>
                  <div className="list-item-icon" style={{ background: isLow ? "#450a0a" : "#0c2a5e", color: isLow ? "#f87171" : "#60a5fa" }}>
                    <Ic.Layers s={18} />
                  </div>
                  <div className="list-item-body">
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{item.category} · {item.location || "Warehouse"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: isLow ? "#ef4444" : "#f1f5f9" }}>{item.qty_in_stock} <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>{item.unit}</span></div>
                    {isLow && <div style={{ fontSize: 10, color: "#f87171" }}>LOW STOCK</div>}
                  </div>
                </div>
              );
            })}
          </div>
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header"><h2>Add Item</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Item Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Category</label><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
                  <div className="field"><label>Unit</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      {["Nos","Kg","Ton","L","m","m²","m³","Bag","Box","Roll"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Qty in Stock</label><input type="number" min="0" value={form.qty_in_stock} onChange={e => setForm(f => ({ ...f, qty_in_stock: e.target.value }))} /></div>
                  <div className="field"><label>Min Stock</label><input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Unit Cost (₹)</label><input type="number" min="0" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
                  <div className="field"><label>Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Warehouse" /></div>
                </div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Add Item</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
